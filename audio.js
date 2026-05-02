/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — audio.js
 *
 *  Web Audio API Reactive Engine
 *  ─────────────────────────────
 *  Completely isolated module — no dependency on:
 *  · canvas2d or canvas3d
 *  · Three.js or CanvasTexture
 *  · Engine2D or Cube3D
 *  · UI or DOM (except navigator.mediaDevices)
 *
 *  Only interface: getMetrics() → SyncController in main.js
 *
 *  Pipeline:
 *  Microphone → AudioContext → AnalyserNode (2048 FFT)
 *      → Band Extraction (6 bands)
 *      → Beat Detection (spectral flux + adaptive threshold)
 *      → BPM Estimation (median inter-beat interval)
 *      → Attack/Release Smoothing (VU meter model)
 *      → metrics object → SyncController.tick()
 *
 *  v2.0 polish additions (no functional changes):
 *  · Improved console logging with version tag
 *  · getStatus() returns sourceType for TEX SYNC HUD
 *  · Minor JSDoc improvements
 *
 *  Architecture: IIFE Module Pattern
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.AudioEngine = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — PRIVATE STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* Web Audio Objects */
  let audioCtx    = null;   // AudioContext
  let analyser    = null;   // AnalyserNode
  let sourceNode  = null;   // MediaStreamSource or MediaElementSource
  let gainNode    = null;   // GainNode — input level control
  let mediaStream = null;   // active MediaStream from microphone

  /* FFT Configuration */
  const FFT_SIZE  = 2048;
  const SMOOTH    = 0.80;   // analyser smoothingTimeConstant

  /* FFT Data Buffers */
  let freqData    = null;   // Uint8Array — frequency domain [0..255]
  let timeData    = null;   // Uint8Array — time domain (waveform)

  /* Engine Status */
  let isActive    = false;
  let sourceType  = 'none'; // 'mic' | 'file' | 'none'

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     BEAT DETECTION STATE
     Algorithm: Spectral Flux with Adaptive Threshold

     Compares current frame bass energy to a rolling
     average of recent frames. A beat fires when
     current energy significantly exceeds the average.
     Adaptive threshold adjusts to music dynamics:
     · High variance music → lower threshold (more reactive)
     · Steady/quiet music  → higher threshold (less reactive)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* History window — 43 frames ≈ ~700ms at 60fps */
  const HISTORY_SIZE  = 43;
  const bassHistory   = new Float32Array(HISTORY_SIZE);
  const energyHistory = new Float32Array(HISTORY_SIZE);
  let   historyIndex  = 0;

  /* Beat cooldown — minimum frames between beats */
  let   beatCooldown      = 0;
  const BEAT_COOLDOWN     = 15;    // ~250ms at 60fps
  const BEAT_THRESHOLD    = 1.60;  // energy must exceed avg × this

  /* BPM Estimation */
  const BPM_HISTORY_MAX = 16;      // track last N inter-beat intervals
  let   bpmHistory      = [];
  let   lastBeatTime    = 0;
  let   estimatedBPM    = 0;

  /* Onset detection — tracks high-frequency content change */
  let prevHighSum = 0;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SMOOTHED OUTPUT METRICS
     Exponential smoothing — fast rise / slow fall
     (VU meter ballistics model)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let metrics = {
    /* Status */
    active:       false,
    sourceType:   'none',

    /* Raw energy bands [0..1] */
    amplitude:    0,    // overall RMS (full spectrum)
    bassEnergy:   0,    // sub-bass + bass  (20–250 Hz)
    midEnergy:    0,    // mid-range        (250–2000 Hz)
    presEnergy:   0,    // presence         (2000–6000 Hz)
    highEnergy:   0,    // brilliance       (6000–20000 Hz)

    /* Slower smoothed versions for visual output */
    bassSmooth:   0,    // bass with slow release
    midSmooth:    0,    // mid with slow release
    highSmooth:   0,    // high with slow release

    /* Beat detection */
    beatDetect:   false,  // true for exactly one frame per beat
    beatStrength: 0,      // [0..1] how strong the beat was
    bpm:          0,      // estimated BPM from inter-beat intervals

    /* Waveform */
    waveformPeak: 0,      // [0..1] current time-domain peak amplitude

    /* Spectral centroid [0..1]
       High = bright/harsh sound, Low = deep/warm sound */
    centroid:     0
  };


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — AUDIO CONTEXT SETUP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * createContext — initialise AudioContext and AnalyserNode.
   * Safe to call multiple times — returns false if already exists.
   * @returns {boolean}
   */
  function createContext() {
    if (audioCtx && audioCtx.state !== 'closed') return true;

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate:  44100
      });

      /* Analyser node */
      analyser                        = audioCtx.createAnalyser();
      analyser.fftSize                = FFT_SIZE;
      analyser.smoothingTimeConstant  = SMOOTH;
      analyser.minDecibels            = -90;
      analyser.maxDecibels            = -10;

      /* Gain node — adjustable input level */
      gainNode              = audioCtx.createGain();
      gainNode.gain.value   = 1.0;

      /* Route: source → gain → analyser
         Note: do NOT connect analyser → destination
         This prevents microphone feedback through speakers */
      gainNode.connect(analyser);

      /* Allocate FFT buffers */
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);

      return true;

    } catch (e) {
      console.error('[AudioEngine v2.0] AudioContext creation failed:', e);
      return false;
    }
  }

  /**
   * resumeContext — iOS and Chrome require a user gesture
   * before the AudioContext is allowed to run.
   * Call this inside any user interaction handler.
   */
  async function resumeContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {
        console.warn('[AudioEngine v2.0] Could not resume context:', e);
      }
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — SOURCE MANAGEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * disconnectSource — safely release the current audio source.
   * Stops the media stream tracks to release the microphone.
   */
  function disconnectSource() {
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch (e) { /* ignore */ }
      sourceNode = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  }

  /**
   * init — request microphone access and begin analysis.
   *
   * Audio constraints tuned for maximum raw signal fidelity:
   * · echoCancellation: false — don't process the signal
   * · noiseSuppression: false — keep transients intact for beat detection
   * · autoGainControl:  false — manual gain via gainNode
   *
   * @returns {Promise<boolean>} true on success
   */
  async function init() {
    if (!createContext()) return false;
    await resumeContext();
    disconnectSource();

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl:  false,
          channelCount:     1
        },
        video: false
      });

      sourceNode = audioCtx.createMediaStreamSource(mediaStream);
      sourceNode.connect(gainNode);

      isActive           = true;
      sourceType         = 'mic';
      metrics.active     = true;
      metrics.sourceType = 'mic';

      console.info(
        '[AudioEngine v2.0] Microphone active. ' +
        `Sample rate: ${audioCtx.sampleRate} Hz. ` +
        `FFT size: ${FFT_SIZE}. ` +
        'Beat detection: spectral flux + adaptive threshold.'
      );

      return true;

    } catch (err) {
      /* Specific error messages for different failure modes */
      const msg =
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied by user.'
          : err.name === 'NotFoundError'
            ? 'No microphone device found on this device.'
            : err.name === 'NotReadableError'
              ? 'Microphone is in use by another application.'
              : `Microphone error: ${err.message}`;

      console.warn(`[AudioEngine v2.0] ${msg}`);
      metrics.active     = false;
      metrics.sourceType = 'none';
      isActive           = false;
      return false;
    }
  }

  /**
   * initFromElement — connect an existing <audio> or <video>
   * element as the audio source (file playback mode).
   * Also connects to speakers so the user hears playback.
   *
   * @param  {HTMLMediaElement} element
   * @returns {boolean}
   */
  function initFromElement(element) {
    if (!createContext()) return false;
    resumeContext();
    disconnectSource();

    try {
      sourceNode = audioCtx.createMediaElementSource(element);
      sourceNode.connect(gainNode);
      /* Connect to output so user hears audio */
      sourceNode.connect(audioCtx.destination);

      isActive           = true;
      sourceType         = 'file';
      metrics.active     = true;
      metrics.sourceType = 'file';

      console.info('[AudioEngine v2.0] File/element source connected.');
      return true;

    } catch (e) {
      console.error('[AudioEngine v2.0] Element source failed:', e);
      return false;
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — FREQUENCY BAND EXTRACTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * getBandEnergy — compute RMS energy for a frequency range.
   *
   * Converts Hz to FFT bin index:
   *   bin = Hz × fftSize / sampleRate
   *
   * @param  {number} startHz
   * @param  {number} endHz
   * @returns {number} RMS energy [0..1]
   */
  function getBandEnergy(startHz, endHz) {
    const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
    const binCount   = freqData.length;
    const hzPerBin   = sampleRate / FFT_SIZE;

    const startBin   = Math.max(0,
                         Math.floor(startHz / hzPerBin));
    const endBin     = Math.min(binCount - 1,
                         Math.ceil(endHz   / hzPerBin));

    if (startBin >= endBin) return 0;

    let sumSq = 0;
    for (let i = startBin; i <= endBin; i++) {
      const norm = freqData[i] / 255.0;
      sumSq += norm * norm;
    }

    return Math.sqrt(sumSq / (endBin - startBin + 1));
  }

  /**
   * getSpectralCentroid — weighted frequency average.
   * High centroid = bright/harsh. Low centroid = warm/deep.
   * @returns {number} [0..1]
   */
  function getSpectralCentroid() {
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < freqData.length; i++) {
      const mag    = freqData[i] / 255.0;
      weightedSum += i * mag;
      totalWeight += mag;
    }

    if (totalWeight === 0) return 0;
    return (weightedSum / totalWeight) / freqData.length;
  }

  /**
   * getWaveformPeak — maximum absolute amplitude
   * from the time-domain signal.
   * @returns {number} [0..1]
   */
  function getWaveformPeak() {
    let peak = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = Math.abs(timeData[i] - 128) / 128.0;
      if (v > peak) peak = v;
    }
    return peak;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — BEAT DETECTION
     Spectral Flux with Adaptive Threshold
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * detectBeat — fires when bass energy significantly
   * exceeds the rolling average of recent frames.
   *
   * Two detection paths:
   * 1. Bass beat  — low-frequency energy spike
   * 2. Onset beat — high-frequency content change (hi-hats, snares)
   *    catches percussive sounds without strong bass
   *
   * @param  {number} bassEnergy  current frame bass [0..1]
   * @param  {number} highSum     current high-band average [0..1]
   * @returns {{beat: boolean, strength: number}}
   */
  function detectBeat(bassEnergy, highSum) {

    /* Store in circular history */
    bassHistory[historyIndex]   = bassEnergy;
    energyHistory[historyIndex] = bassEnergy;
    historyIndex = (historyIndex + 1) % HISTORY_SIZE;

    /* Rolling average */
    let avg = 0;
    for (let i = 0; i < HISTORY_SIZE; i++) avg += energyHistory[i];
    avg /= HISTORY_SIZE;

    /* Variance — measures dynamic range of recent energy */
    let variance = 0;
    for (let i = 0; i < HISTORY_SIZE; i++) {
      const diff = energyHistory[i] - avg;
      variance  += diff * diff;
    }
    variance /= HISTORY_SIZE;

    /* Adaptive threshold:
       · High variance → lower threshold (dynamic music → more responsive)
       · Low variance  → higher threshold (steady sound → less sensitive) */
    const adaptive  = BEAT_THRESHOLD - (variance * 1.5);
    const threshold = Math.max(1.3, adaptive);

    /* High-frequency onset (spectral flux) */
    const highFlux = Math.max(0, highSum - prevHighSum);
    prevHighSum    = highSum;

    let isBeat   = false;
    let strength = 0;

    if (beatCooldown === 0) {
      const bassBeat  = bassEnergy > avg * threshold &&
                        bassEnergy > 0.12;
      const onsetBeat = highFlux > 0.08 &&
                        bassEnergy > avg * 1.2;

      if (bassBeat || onsetBeat) {
        isBeat   = true;
        strength = Math.min(1.0,
                   (bassEnergy - avg * threshold) /
                   (avg * 0.5 + 0.001));

        beatCooldown = BEAT_COOLDOWN;

        /* BPM tracking */
        const now = performance.now();
        if (lastBeatTime > 0) {
          const interval = now - lastBeatTime;
          /* Only count intervals in realistic BPM range (40–220) */
          if (interval > 272 && interval < 1500) {
            bpmHistory.push(interval);
            if (bpmHistory.length > BPM_HISTORY_MAX) bpmHistory.shift();

            /* Median inter-beat interval → stable BPM */
            const sorted = bpmHistory.slice().sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            estimatedBPM = Math.round(60000 / median);
          }
        }
        lastBeatTime = now;
      }
    }

    if (beatCooldown > 0) beatCooldown--;

    return { beat: isBeat, strength };
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — EXPONENTIAL SMOOTHING
     Attack/release model — mimics VU meter ballistics
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * smooth — exponential moving average with
   * separate attack (rise) and release (fall) rates.
   *
   * @param {number} current  previous smoothed value
   * @param {number} target   new raw value
   * @param {number} attack   rise coefficient  [0..1]
   * @param {number} release  fall coefficient  [0..1]
   * @returns {number}
   */
  function smooth(current, target, attack, release) {
    const coeff = target > current ? attack : release;
    return current + (target - current) * coeff;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — MAIN UPDATE FUNCTION
     Called every animation frame from main.js masterLoop
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * update — pull FFT data and compute all metrics.
   *
   * Must be called inside a requestAnimationFrame loop.
   * In v2.0 this is called from masterLoop() in main.js
   * every frame before SyncController.tick().
   *
   * When not active:
   * All metrics decay to zero smoothly so the
   * SyncController and Cube3D receive clean fallback values.
   */
  function update() {

    /* Graceful decay when not active */
    if (!isActive || !analyser) {
      metrics.amplitude  = smooth(metrics.amplitude,  0, 0.1, 0.05);
      metrics.bassEnergy = smooth(metrics.bassEnergy, 0, 0.1, 0.05);
      metrics.midEnergy  = smooth(metrics.midEnergy,  0, 0.1, 0.05);
      metrics.highEnergy = smooth(metrics.highEnergy, 0, 0.1, 0.05);
      metrics.bassSmooth = smooth(metrics.bassSmooth, 0, 0.1, 0.03);
      metrics.midSmooth  = smooth(metrics.midSmooth,  0, 0.1, 0.03);
      metrics.highSmooth = smooth(metrics.highSmooth, 0, 0.1, 0.03);
      metrics.beatDetect   = false;
      metrics.beatStrength = smooth(metrics.beatStrength, 0, 0.1, 0.06);
      return;
    }

    /* Resume if browser suspended (iOS PWA requirement) */
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
      return;
    }

    /* ── Pull FFT Data from AnalyserNode ── */
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    /* ── Band Energy Extraction ──────────────────────
       6-band spectrum split tuned for music reactivity:

       Sub-bass   20–80   Hz  kick drum thud, low rumble
       Bass       80–250  Hz  bass guitar, kick drum body
       Low-mid   250–500  Hz  snare body, male vocals
       Mid       500–2k   Hz  instruments, female vocals
       Presence   2k–6k   Hz  attack clarity, consonants
       Brilliance 6k–20k  Hz  air, cymbals, hi-hats
    ──────────────────────────────────────────────── */
    const subBass = getBandEnergy(20,   80  );
    const bass    = getBandEnergy(80,   250 );
    const lowMid  = getBandEnergy(250,  500 );
    const mid     = getBandEnergy(500,  2000);
    const pres    = getBandEnergy(2000, 6000);
    const high    = getBandEnergy(6000, 20000);

    /* Weighted combinations for SyncController */
    const bassTotal = subBass * 0.4 + bass  * 0.6;
    const midTotal  = lowMid  * 0.3 + mid   * 0.7;
    const highTotal = pres    * 0.5 + high  * 0.5;

    /* Overall RMS amplitude — full spectrum */
    let sumSq = 0;
    for (let i = 0; i < freqData.length; i++) {
      const n = freqData[i] / 255.0;
      sumSq += n * n;
    }
    const rms = Math.sqrt(sumSq / freqData.length);

    /* ── Beat Detection ── */
    /* Compute high-frequency average for onset detection */
    const highBinStart = Math.floor(freqData.length * 0.5);
    let   highSum      = 0;
    for (let i = highBinStart; i < freqData.length; i++) {
      highSum += freqData[i] / 255.0;
    }
    highSum /= (freqData.length - highBinStart);

    const { beat, strength } = detectBeat(bassTotal, highSum);

    /* ── Spectral Features ── */
    const centroid   = getSpectralCentroid();
    const waveformPk = getWaveformPeak();

    /* ── Apply Smoothing ─────────────────────────────
       Attack  = fast rise  (responsive to transients)
       Release = slow fall  (sustain the visual glow)
    ──────────────────────────────────────────────── */
    metrics.amplitude  = smooth(metrics.amplitude,  rms,       0.7,  0.12);
    metrics.bassEnergy = smooth(metrics.bassEnergy, bassTotal, 0.8,  0.10);
    metrics.midEnergy  = smooth(metrics.midEnergy,  midTotal,  0.7,  0.12);
    metrics.presEnergy = smooth(metrics.presEnergy, pres,      0.7,  0.15);
    metrics.highEnergy = smooth(metrics.highEnergy, highTotal, 0.6,  0.15);

    /* Slower visual smoothing — used for bloom and sync bars */
    metrics.bassSmooth = smooth(metrics.bassSmooth, bassTotal, 0.4,  0.06);
    metrics.midSmooth  = smooth(metrics.midSmooth,  midTotal,  0.4,  0.08);
    metrics.highSmooth = smooth(metrics.highSmooth, highTotal, 0.35, 0.08);

    /* Spectral features */
    metrics.centroid     = smooth(metrics.centroid,     centroid,   0.3, 0.10);
    metrics.waveformPeak = smooth(metrics.waveformPeak, waveformPk, 0.8, 0.10);

    /* Beat — true for exactly one frame */
    metrics.beatDetect   = beat;
    metrics.beatStrength = beat
      ? strength
      : smooth(metrics.beatStrength, 0, 0.1, 0.08);

    metrics.bpm        = estimatedBPM;
    metrics.active     = true;
    metrics.sourceType = sourceType;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — CONFIGURATION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * setGain — adjust input volume [0..4].
   * Uses setTargetAtTime for smooth 10ms ramp.
   * @param {number} value
   */
  function setGain(value) {
    if (gainNode && audioCtx) {
      gainNode.gain.setTargetAtTime(
        Math.max(0, Math.min(4, value)),
        audioCtx.currentTime,
        0.01
      );
    }
  }

  /**
   * setSmoothing — change analyser time-constant [0..0.99].
   * Lower = more responsive, Higher = smoother.
   * @param {number} value
   */
  function setSmoothing(value) {
    if (analyser) {
      analyser.smoothingTimeConstant =
        Math.max(0, Math.min(0.99, value));
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — DATA ACCESS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * getFrequencyArray — copy of raw FFT frequency data.
   * Useful for custom visualisers built on top of the engine.
   * @returns {Uint8Array|null}
   */
  function getFrequencyArray() {
    if (!freqData) return null;
    return new Uint8Array(freqData);
  }

  /**
   * getWaveformArray — copy of raw time-domain data.
   * @returns {Uint8Array|null}
   */
  function getWaveformArray() {
    if (!timeData) return null;
    return new Uint8Array(timeData);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — LIFECYCLE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * stop — release microphone, close AudioContext,
   * reset all state and metrics to zero.
   */
  function stop() {
    disconnectSource();

    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }

    analyser = null;
    gainNode = null;
    freqData = null;
    timeData = null;
    isActive = false;

    /* Reset all metrics */
    Object.assign(metrics, {
      active:       false,
      sourceType:   'none',
      amplitude:    0,
      bassEnergy:   0,
      midEnergy:    0,
      presEnergy:   0,
      highEnergy:   0,
      bassSmooth:   0,
      midSmooth:    0,
      highSmooth:   0,
      beatDetect:   false,
      beatStrength: 0,
      bpm:          0,
      centroid:     0,
      waveformPeak: 0
    });

    /* Reset beat detection state */
    bassHistory.fill(0);
    energyHistory.fill(0);
    historyIndex = 0;
    bpmHistory   = [];
    lastBeatTime = 0;
    estimatedBPM = 0;
    prevHighSum  = 0;
    beatCooldown = 0;

    console.info('[AudioEngine v2.0] Stopped. Context closed.');
  }

  /**
   * isSupported — check browser Web Audio API capability.
   * @returns {boolean}
   */
  function isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext) &&
           !!(navigator.mediaDevices &&
              navigator.mediaDevices.getUserMedia);
  }

  /**
   * getMetrics — return the current output metrics object.
   * Called every frame by main.js SyncController.tick().
   * @returns {Object}
   */
  function getMetrics() {
    return metrics;
  }

  /**
   * getStatus — detailed engine status for debugging and UI.
   * @returns {Object}
   */
  function getStatus() {
    return {
      active:       isActive,
      sourceType,
      contextState: audioCtx ? audioCtx.state : 'none',
      sampleRate:   audioCtx ? audioCtx.sampleRate : 0,
      fftSize:      analyser  ? analyser.fftSize  : 0,
      binCount:     analyser  ? analyser.frequencyBinCount : 0,
      supported:    isSupported(),
      bpm:          estimatedBPM,
      beatCooldown
    };
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PUBLIC API
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  return {
    /* Lifecycle */
    init,
    initFromElement,
    stop,

    /* Per-frame (called from main.js masterLoop) */
    update,

    /* Output */
    getMetrics,
    getStatus,
    getFrequencyArray,
    getWaveformArray,

    /* Configuration */
    setGain,
    setSmoothing,

    /* Utility */
    isSupported
  };

})();
