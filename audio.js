/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — audio.js
 *
 *  Web Audio API Reactive Engine
 *  · Microphone input via getUserMedia
 *  · FFT frequency analysis (2048-point)
 *  · Band energy extraction (Bass / Mid / High / Presence)
 *  · Advanced beat detection (spectral flux + variance)
 *  · BPM estimation (inter-beat interval tracking)
 *  · Smooth output metrics → SyncController & UI
 *  · File / microphone source switching
 *  · Graceful fallback when audio is unavailable
 *
 *  Architecture: IIFE Module Pattern
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.AudioEngine = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PRIVATE STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* ── Web Audio Objects ── */
  let audioCtx      = null;   // AudioContext
  let analyser      = null;   // AnalyserNode
  let sourceNode    = null;   // MediaStreamSource or MediaElementSource
  let gainNode      = null;   // GainNode (input level control)
  let mediaStream   = null;   // active MediaStream (mic)

  /* ── FFT Buffers ── */
  const FFT_SIZE    = 2048;
  const SMOOTH      = 0.80;   // analyser smoothingTimeConstant
  let freqData      = null;   // Uint8Array  — frequency domain [0..255]
  let timeData      = null;   // Uint8Array  — time domain (waveform)

  /* ── Engine Status ── */
  let isActive      = false;
  let sourceType    = 'none'; // 'mic' | 'file' | 'none'

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     BEAT DETECTION STATE
     Uses spectral flux method:
     Compare current frame energy to
     rolling average of recent frames.
     A beat occurs when current >> average.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* History window — 43 frames ≈ ~700ms at 60fps */
  const HISTORY_SIZE    = 43;
  const bassHistory     = new Float32Array(HISTORY_SIZE);
  const energyHistory   = new Float32Array(HISTORY_SIZE);
  let   historyIndex    = 0;

  /* Beat state */
  let beatCooldown      = 0;    // frames until next beat allowed
  const BEAT_COOLDOWN   = 15;   // minimum frames between beats (~250ms)
  const BEAT_THRESHOLD  = 1.60; // energy must exceed avg × this factor

  /* BPM Estimation */
  const BPM_HISTORY_MAX = 16;   // store last N inter-beat intervals
  let   bpmHistory      = [];
  let   lastBeatTime    = 0;
  let   estimatedBPM    = 0;

  /* Onset detection (high-frequency content change) */
  let   prevHighSum     = 0;

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SMOOTHED OUTPUT METRICS
     All values smoothed with exponential filter
     to avoid jittery sync responses.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let metrics = {
    /* Status */
    active:       false,
    sourceType:   'none',

    /* Raw energy bands [0..1] */
    amplitude:    0,    // overall RMS
    bassEnergy:   0,    // sub-bass + bass (20–250 Hz)
    midEnergy:    0,    // mid-range (250–2000 Hz)
    presEnergy:   0,    // presence (2000–6000 Hz)
    highEnergy:   0,    // brilliance (6000–20000 Hz)

    /* Smoothed versions (for visual output) */
    bassSmooth:   0,
    midSmooth:    0,
    highSmooth:   0,

    /* Beat */
    beatDetect:   false,   // true for exactly one frame per beat
    beatStrength: 0,       // [0..1] how strong the beat was
    bpm:          0,       // estimated beats per minute

    /* Waveform peak */
    waveformPeak: 0,       // [0..1] current waveform max amplitude

    /* Spectral centroid [0..1] — "brightness" of the sound */
    centroid:     0
  };


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — AUDIO CONTEXT SETUP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * createContext — initialises the AudioContext and
   * shared AnalyserNode. Safe to call multiple times.
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

      /* Gain node (input volume) */
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 1.0;

      /* Routing: source → gain → analyser (→ NOT speakers) */
      gainNode.connect(analyser);
      /* Note: do NOT connect analyser to destination
         (prevents feedback when using microphone) */

      /* Allocate FFT buffers */
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);

      return true;

    } catch (e) {
      console.error('[AudioEngine] AudioContext creation failed:', e);
      return false;
    }
  }

  /**
   * resumeContext — iOS/Chrome require a user gesture
   * before the AudioContext can run.
   */
  async function resumeContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {
        console.warn('[AudioEngine] Could not resume AudioContext:', e);
      }
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — SOURCE MANAGEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * disconnectSource — safely disconnect and release
   * any existing audio source node.
   */
  function disconnectSource() {
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch (e) { /* ignore */ }
      sourceNode = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
  }

  /**
   * init — request microphone access and start analysis.
   * @returns {Promise<boolean>} true on success
   */
  async function init() {
    if (!createContext()) return false;
    await resumeContext();

    disconnectSource();

    try {
      /* Request microphone */
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:   false,  // keep raw signal
          noiseSuppression:   false,
          autoGainControl:    false,
          channelCount:       1
        },
        video: false
      });

      sourceNode = audioCtx.createMediaStreamSource(mediaStream);
      sourceNode.connect(gainNode);

      isActive            = true;
      sourceType          = 'mic';
      metrics.active      = true;
      metrics.sourceType  = 'mic';

      console.info('[AudioEngine] Microphone active. ' +
                   `Sample rate: ${audioCtx.sampleRate} Hz`);
      return true;

    } catch (err) {
      /* Handle specific error types */
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access denied by user.'
        : err.name === 'NotFoundError'
          ? 'No microphone device found.'
          : `Microphone error: ${err.message}`;

      console.warn(`[AudioEngine] ${msg}`);
      metrics.active     = false;
      metrics.sourceType = 'none';
      isActive           = false;
      return false;
    }
  }

  /**
   * initFromElement — connect an existing <audio> or <video>
   * element as the audio source (file playback mode).
   *
   * @param {HTMLMediaElement} element
   * @returns {boolean}
   */
  function initFromElement(element) {
    if (!createContext()) return false;
    resumeContext();
    disconnectSource();

    try {
      sourceNode = audioCtx.createMediaElementSource(element);
      sourceNode.connect(gainNode);
      /* Also connect to speakers so user hears playback */
      sourceNode.connect(audioCtx.destination);

      isActive            = true;
      sourceType          = 'file';
      metrics.active      = true;
      metrics.sourceType  = 'file';
      return true;

    } catch (e) {
      console.error('[AudioEngine] Element source failed:', e);
      return false;
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — FREQUENCY BAND EXTRACTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * getBandEnergy — compute RMS energy for a frequency range.
   *
   * Converts FFT bin indices to Hz:
   *   hz = bin × (sampleRate / fftSize)
   *
   * @param {number} startHz
   * @param {number} endHz
   * @returns {number} [0..1]
   */
  function getBandEnergy(startHz, endHz) {
    const sampleRate  = audioCtx ? audioCtx.sampleRate : 44100;
    const binCount    = freqData.length;
    const hzPerBin    = sampleRate / (FFT_SIZE);

    const startBin    = Math.max(0,
                          Math.floor(startHz / hzPerBin));
    const endBin      = Math.min(binCount - 1,
                          Math.ceil(endHz  / hzPerBin));

    if (startBin >= endBin) return 0;

    /* RMS over the band */
    let sumSq = 0;
    for (let i = startBin; i <= endBin; i++) {
      const norm = freqData[i] / 255.0;
      sumSq += norm * norm;
    }

    return Math.sqrt(sumSq / (endBin - startBin + 1));
  }

  /**
   * getSpectralCentroid — weighted average frequency.
   * High centroid = bright/harsh sound.
   * Low centroid  = deep/warm sound.
   * @returns {number} [0..1]
   */
  function getSpectralCentroid() {
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < freqData.length; i++) {
      const magnitude  = freqData[i] / 255.0;
      weightedSum     += i * magnitude;
      totalWeight     += magnitude;
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
     SECTION 4 — BEAT DETECTION
     Algorithm: Spectral Flux with Adaptive Threshold
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * detectBeat — compare current bass energy
   * to rolling average. Fire if significantly above.
   *
   * Also runs an onset detector on high-frequency
   * content change (for percussive sounds without bass).
   *
   * @param {number} bassEnergy  current frame bass [0..1]
   * @param {number} highSum     current high-band sum
   * @returns {{beat: boolean, strength: number}}
   */
  function detectBeat(bassEnergy, highSum) {

    /* Store in circular history buffer */
    bassHistory[historyIndex]   = bassEnergy;
    energyHistory[historyIndex] = bassEnergy;
    historyIndex = (historyIndex + 1) % HISTORY_SIZE;

    /* Rolling average */
    let avg = 0;
    for (let i = 0; i < HISTORY_SIZE; i++) {
      avg += energyHistory[i];
    }
    avg /= HISTORY_SIZE;

    /* Variance (for adaptive threshold) */
    let variance = 0;
    for (let i = 0; i < HISTORY_SIZE; i++) {
      const diff = energyHistory[i] - avg;
      variance  += diff * diff;
    }
    variance /= HISTORY_SIZE;

    /* Adaptive threshold:
       - High variance (dynamic music) → lower threshold
       - Low variance (quiet/steady)   → higher threshold */
    const adaptiveThreshold = BEAT_THRESHOLD - (variance * 1.5);
    const threshold         = Math.max(1.3, adaptiveThreshold);

    /* High-frequency onset detection (spectral flux) */
    const highFlux = Math.max(0, highSum - prevHighSum);
    prevHighSum    = highSum;

    /* Beat condition */
    let isBeat    = false;
    let strength  = 0;

    if (beatCooldown === 0) {
      const bassBeat  = bassEnergy > avg * threshold && bassEnergy > 0.12;
      const onsetBeat = highFlux > 0.08 && bassEnergy > avg * 1.2;

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
          /* Only track realistic BPM (40–220) */
          if (interval > 272 && interval < 1500) {
            bpmHistory.push(interval);
            if (bpmHistory.length > BPM_HISTORY_MAX) {
              bpmHistory.shift();
            }
            /* BPM = 60000ms / median interval */
            const sorted = bpmHistory.slice().sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            estimatedBPM = Math.round(60000 / median);
          }
        }
        lastBeatTime = now;
      }
    }

    /* Count down cooldown */
    if (beatCooldown > 0) beatCooldown--;

    return { beat: isBeat, strength };
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — EXPONENTIAL SMOOTHING
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * smooth — exponential moving average
   * Fast rise (attack) / slow fall (release) filter.
   * Mimics VU meter ballistics.
   *
   * @param {number} current   previous smoothed value
   * @param {number} target    new raw value
   * @param {number} attack    rise coefficient  [0..1]
   * @param {number} release   fall coefficient  [0..1]
   * @returns {number}
   */
  function smooth(current, target, attack, release) {
    const coeff = target > current ? attack : release;
    return current + (target - current) * coeff;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — MAIN UPDATE FUNCTION
     Called every animation frame from main.js
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * update — pull latest FFT data from the analyser
   * and compute all output metrics.
   * Must be called inside a requestAnimationFrame loop.
   */
  function update() {
    /* Early exit if not active */
    if (!isActive || !analyser) {
      /* Decay all metrics to zero gracefully */
      metrics.amplitude  = smooth(metrics.amplitude,  0, 0.1, 0.05);
      metrics.bassEnergy = smooth(metrics.bassEnergy, 0, 0.1, 0.05);
      metrics.midEnergy  = smooth(metrics.midEnergy,  0, 0.1, 0.05);
      metrics.highEnergy = smooth(metrics.highEnergy, 0, 0.1, 0.05);
      metrics.beatDetect = false;
      return;
    }

    /* Resume context if browser suspended it */
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
      return;
    }

    /* ── Pull FFT Data ── */
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    /* ── Band Energy Extraction ──
       Frequency bands tuned for music reactivity:
       Sub-bass  20–80   Hz  (kick drum thud)
       Bass      80–250  Hz  (bass guitar, kick body)
       Low-mid   250–500 Hz  (vocals, snare body)
       Mid       500–2k  Hz  (instruments, vocals)
       Presence  2k–6k   Hz  (attack, clarity)
       Brilliance 6k–20k Hz  (air, cymbals, hi-hats)  */

    const subBass    = getBandEnergy(20,   80  );
    const bass       = getBandEnergy(80,   250 );
    const lowMid     = getBandEnergy(250,  500 );
    const mid        = getBandEnergy(500,  2000);
    const pres       = getBandEnergy(2000, 6000);
    const high       = getBandEnergy(6000, 20000);

    /* Combined bands */
    const bassTotal  = subBass * 0.4 + bass * 0.6;
    const midTotal   = lowMid  * 0.3 + mid  * 0.7;
    const highTotal  = pres    * 0.5 + high * 0.5;

    /* Overall RMS amplitude (full spectrum) */
    let sumSq = 0;
    for (let i = 0; i < freqData.length; i++) {
      const n = freqData[i] / 255.0;
      sumSq += n * n;
    }
    const rms = Math.sqrt(sumSq / freqData.length);

    /* ── Beat Detection ── */
    /* Pass high sum for onset detection */
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

    /* ── Apply Smoothing (attack/release model) ──
       Attack  = fast rise  (responsive to hits)
       Release = slow fall  (sustain glow)        */
    metrics.amplitude  = smooth(metrics.amplitude,  rms,       0.7, 0.12);
    metrics.bassEnergy = smooth(metrics.bassEnergy, bassTotal, 0.8, 0.10);
    metrics.midEnergy  = smooth(metrics.midEnergy,  midTotal,  0.7, 0.12);
    metrics.presEnergy = smooth(metrics.presEnergy, pres,      0.7, 0.15);
    metrics.highEnergy = smooth(metrics.highEnergy, highTotal, 0.6, 0.15);

    /* Slower smoothed versions for visual output */
    metrics.bassSmooth = smooth(metrics.bassSmooth, bassTotal, 0.4, 0.06);
    metrics.midSmooth  = smooth(metrics.midSmooth,  midTotal,  0.4, 0.08);
    metrics.highSmooth = smooth(metrics.highSmooth, highTotal, 0.35,0.08);

    /* Spectral features */
    metrics.centroid     = smooth(metrics.centroid,     centroid, 0.3, 0.1);
    metrics.waveformPeak = smooth(metrics.waveformPeak, waveformPk, 0.8, 0.1);

    /* Beat output — true for exactly one frame */
    metrics.beatDetect   = beat;
    metrics.beatStrength = beat ? strength : smooth(metrics.beatStrength,
                                                    0, 0.1, 0.08);
    metrics.bpm          = estimatedBPM;
    metrics.active       = true;
    metrics.sourceType   = sourceType;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — UTILITY FUNCTIONS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * setGain — adjust input volume [0..4]
   * @param {number} value
   */
  function setGain(value) {
    if (gainNode) {
      gainNode.gain.setTargetAtTime(
        Math.max(0, Math.min(4, value)),
        audioCtx.currentTime,
        0.01   /* 10ms smooth ramp */
      );
    }
  }

  /**
   * setSmoothing — change analyser time-constant [0..1]
   * Lower = more responsive, higher = smoother
   * @param {number} value
   */
  function setSmoothing(value) {
    if (analyser) {
      analyser.smoothingTimeConstant = Math.max(0, Math.min(0.99, value));
    }
  }

  /**
   * getFrequencyArray — returns a copy of the raw
   * frequency data for custom visualisations.
   * @returns {Uint8Array|null}
   */
  function getFrequencyArray() {
    if (!freqData) return null;
    return new Uint8Array(freqData);
  }

  /**
   * getWaveformArray — returns a copy of the raw
   * time-domain data.
   * @returns {Uint8Array|null}
   */
  function getWaveformArray() {
    if (!timeData) return null;
    return new Uint8Array(timeData);
  }

  /**
   * stop — disconnect all sources and close context.
   */
  function stop() {
    disconnectSource();

    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }

    analyser  = null;
    gainNode  = null;
    freqData  = null;
    timeData  = null;
    isActive  = false;

    /* Reset metrics */
    metrics.active       = false;
    metrics.sourceType   = 'none';
    metrics.amplitude    = 0;
    metrics.bassEnergy   = 0;
    metrics.midEnergy    = 0;
    metrics.presEnergy   = 0;
    metrics.highEnergy   = 0;
    metrics.bassSmooth   = 0;
    metrics.midSmooth    = 0;
    metrics.highSmooth   = 0;
    metrics.beatDetect   = false;
    metrics.beatStrength = 0;
    metrics.bpm          = 0;
    metrics.centroid     = 0;
    metrics.waveformPeak = 0;

    /* Reset beat state */
    bassHistory.fill(0);
    energyHistory.fill(0);
    historyIndex = 0;
    bpmHistory   = [];
    lastBeatTime = 0;
    estimatedBPM = 0;
    prevHighSum  = 0;
    beatCooldown = 0;

    console.info('[AudioEngine] Stopped and context closed.');
  }

  /**
   * isSupported — check browser capability
   * @returns {boolean}
   */
  function isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext) &&
           !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * getMetrics — return current output metrics object.
   * Called each frame by main.js SyncController.
   * @returns {Object}
   */
  function getMetrics() {
    return metrics;
  }

  /**
   * getStatus — detailed engine status for UI display.
   * @returns {Object}
   */
  function getStatus() {
    return {
      active:       isActive,
      sourceType,
      contextState: audioCtx ? audioCtx.state : 'none',
      sampleRate:   audioCtx ? audioCtx.sampleRate : 0,
      fftSize:      analyser ? analyser.fftSize : 0,
      supported:    isSupported()
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

    /* Per-frame */
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

})(); // end AudioEngine
