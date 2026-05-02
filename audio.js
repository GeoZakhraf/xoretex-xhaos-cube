/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — audio.js
 *
 *  Web Audio API Reactive Engine
 *  ─────────────────────────────
 *  · Microphone input via getUserMedia
 *  · 2048-point FFT frequency analysis
 *  · 6-band energy extraction:
 *      Sub-bass  20–80   Hz  (kick thud)
 *      Bass      80–250  Hz  (kick body, bass guitar)
 *      Low-mid   250–500 Hz  (vocals, snare body)
 *      Mid       500–2k  Hz  (instruments, melody)
 *      Presence  2k–6k   Hz  (attack, clarity)
 *      Brilliance 6k–20k Hz  (air, cymbals, hi-hats)
 *  · Advanced beat detection (spectral flux + variance)
 *  · Adaptive threshold — works on quiet AND loud music
 *  · BPM estimation from median inter-beat interval
 *  · Attack/release smoothing (VU meter ballistics)
 *  · Spectral centroid (brightness of sound)
 *  · Waveform peak amplitude
 *  · File/element source support
 *  · Graceful degradation when unavailable
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
  let audioCtx    = null;   /* AudioContext              */
  let analyser    = null;   /* AnalyserNode              */
  let sourceNode  = null;   /* MediaStream/Element source*/
  let gainNode    = null;   /* Input level control       */
  let mediaStream = null;   /* Active microphone stream  */

  /* FFT Configuration */
  const FFT_SIZE  = 2048;
  const SMOOTHING = 0.80;   /* analyser smoothingTimeConstant */

  /* FFT Buffers — allocated once */
  let freqData  = null;     /* Uint8Array — frequency domain */
  let timeData  = null;     /* Uint8Array — time domain      */

  /* Engine Status */
  let isActive   = false;
  let sourceType = 'none';  /* 'mic' | 'file' | 'none' */

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — BEAT DETECTION STATE
     Spectral flux method:
     Beat fires when bass energy significantly
     exceeds the rolling average of recent frames.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* History window — 43 frames ≈ ~700ms at 60fps */
  const HISTORY_SIZE  = 43;
  const energyHistory = new Float32Array(HISTORY_SIZE);
  const bassHistory   = new Float32Array(HISTORY_SIZE);
  let   historyIndex  = 0;

  /* Beat state */
  let beatCooldown        = 0;
  const BEAT_COOLDOWN     = 15;    /* min frames between beats */
  const BEAT_THRESHOLD    = 1.60;  /* energy > avg × threshold */
  const BEAT_MIN_STRENGTH = 0.12;  /* minimum absolute energy  */

  /* BPM tracking */
  const BPM_HISTORY_MAX = 16;      /* store last N intervals */
  let   bpmHistory      = [];
  let   lastBeatTime    = 0;
  let   estimatedBPM    = 0;

  /* Onset detection (high-frequency flux) */
  let prevHighSum = 0;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — OUTPUT METRICS
     All values smoothed — no jitter in sync output
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let metrics = {
    /* Status */
    active:       false,
    sourceType:   'none',

    /* Raw energy bands [0..1] */
    amplitude:    0,     /* overall RMS energy           */
    bassEnergy:   0,     /* sub-bass + bass combined     */
    midEnergy:    0,     /* low-mid + mid combined       */
    presEnergy:   0,     /* presence band                */
    highEnergy:   0,     /* brilliance band              */

    /* Smoothed visual outputs */
    bassSmooth:   0,     /* slow-attack bass for visuals */
    midSmooth:    0,
    highSmooth:   0,

    /* Beat */
    beatDetect:   false, /* true for ONE frame per beat  */
    beatStrength: 0,     /* [0..1] how strong the beat   */
    bpm:          0,     /* estimated BPM                */

    /* Spectral features */
    centroid:     0,     /* [0..1] spectral brightness   */
    waveformPeak: 0      /* [0..1] time-domain peak      */
  };


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — AUDIO CONTEXT SETUP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * createContext — initialise AudioContext + nodes.
   * Safe to call multiple times — checks existing state.
   * @returns {boolean} success
   */
  function createContext() {
    /* Already open and valid */
    if (audioCtx && audioCtx.state !== 'closed') return true;

    try {
      audioCtx = new (
        window.AudioContext || window.webkitAudioContext
      )({
        latencyHint: 'interactive',
        sampleRate:  44100
      });

      /* ── Analyser Node ── */
      analyser                       = audioCtx.createAnalyser();
      analyser.fftSize               = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;
      analyser.minDecibels           = -90;
      analyser.maxDecibels           = -10;

      /* ── Gain Node (input level control) ── */
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 1.0;

      /* Signal chain: source → gain → analyser
         Note: analyser is NOT connected to destination.
         This prevents microphone feedback. */
      gainNode.connect(analyser);

      /* ── Allocate FFT buffers ── */
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);

      console.info(
        `[AudioEngine] Context created. ` +
        `Sample rate: ${audioCtx.sampleRate} Hz. ` +
        `FFT bins: ${analyser.frequencyBinCount}.`
      );

      return true;

    } catch (e) {
      console.error('[AudioEngine] Context creation failed:', e);
      return false;
    }
  }

  /**
   * resumeContext — browsers suspend AudioContext until
   * a user gesture. This must be called after any click.
   */
  async function resumeContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
        console.info('[AudioEngine] Context resumed.');
      } catch (e) {
        console.warn('[AudioEngine] Resume failed:', e);
      }
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — SOURCE MANAGEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * disconnectSource — safely tear down existing source.
   * Stops all microphone tracks to release the device.
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
   * init — request microphone and start analysis.
   * Handles all known permission/device error types.
   * @returns {Promise<boolean>} true on success
   */
  async function init() {
    if (!createContext()) return false;
    await resumeContext();
    disconnectSource();

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:  false,  /* keep raw signal    */
          noiseSuppression:  false,  /* no processing      */
          autoGainControl:   false,  /* manual gain only   */
          channelCount:      1       /* mono — saves CPU   */
        },
        video: false
      });

      sourceNode = audioCtx.createMediaStreamSource(mediaStream);
      sourceNode.connect(gainNode);

      isActive           = true;
      sourceType         = 'mic';
      metrics.active     = true;
      metrics.sourceType = 'mic';

      console.info('[AudioEngine] Microphone active.');
      return true;

    } catch (err) {
      /* Specific error messages for each failure mode */
      let msg;
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          msg = 'Microphone permission denied.';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          msg = 'No microphone device found.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          msg = 'Microphone is in use by another app.';
          break;
        case 'OverconstrainedError':
          msg = 'Microphone constraints could not be met.';
          break;
        case 'SecurityError':
          msg = 'Microphone blocked by browser security.';
          break;
        default:
          msg = `Microphone error: ${err.message}`;
      }

      console.warn(`[AudioEngine] ${msg}`);
      metrics.active     = false;
      metrics.sourceType = 'none';
      isActive           = false;
      return false;
    }
  }

  /**
   * initFromElement — use an <audio> or <video> element
   * as the audio source (file playback mode).
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
      /* Also connect to speakers so user hears audio */
      sourceNode.connect(audioCtx.destination);

      isActive           = true;
      sourceType         = 'file';
      metrics.active     = true;
      metrics.sourceType = 'file';

      console.info('[AudioEngine] File/element source active.');
      return true;

    } catch (e) {
      console.error('[AudioEngine] Element source failed:', e);
      return false;
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — FREQUENCY BAND EXTRACTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * getBandEnergy — RMS energy for a frequency range.
   *
   * Bin to Hz conversion:
   *   hz = bin × (sampleRate / fftSize)
   *   bin = hz × fftSize / sampleRate
   *
   * @param  {number} startHz
   * @param  {number} endHz
   * @returns {number} [0..1]
   */
  function getBandEnergy(startHz, endHz) {
    const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
    const hzPerBin   = sampleRate / FFT_SIZE;
    const binCount   = freqData.length;

    const startBin = Math.max(0,
      Math.floor(startHz / hzPerBin));
    const endBin   = Math.min(binCount - 1,
      Math.ceil(endHz   / hzPerBin));

    if (startBin >= endBin) return 0;

    /* Root Mean Square over the band */
    let sumSq = 0;
    const count = endBin - startBin + 1;
    for (let i = startBin; i <= endBin; i++) {
      const norm = freqData[i] / 255.0;
      sumSq += norm * norm;
    }

    return Math.sqrt(sumSq / count);
  }

  /**
   * getSpectralCentroid — weighted mean frequency.
   * High value = bright/harsh sound.
   * Low value  = warm/deep sound.
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

    if (totalWeight < 0.0001) return 0;
    return (weightedSum / totalWeight) / freqData.length;
  }

  /**
   * getWaveformPeak — max absolute amplitude
   * from time-domain data.
   * @returns {number} [0..1]
   */
  function getWaveformPeak() {
    if (!timeData) return 0;
    let peak = 0;
    for (let i = 0; i < timeData.length; i++) {
      /* timeData[i] is unsigned 0-255, centred at 128 */
      const v = Math.abs(timeData[i] - 128) / 128.0;
      if (v > peak) peak = v;
    }
    return peak;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — BEAT DETECTION
     Algorithm: Spectral Flux with Adaptive Threshold
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * detectBeat — compare current bass energy to
   * rolling average. Fire if significantly above.
   *
   * Also runs onset detection on high-frequency
   * content change (catches hi-hats, snares).
   *
   * @param  {number} bassEnergy  current frame [0..1]
   * @param  {number} highSum     high-band average
   * @returns {{ beat: boolean, strength: number }}
   */
  function detectBeat(bassEnergy, highSum) {

    /* Store current energy in circular history */
    energyHistory[historyIndex] = bassEnergy;
    bassHistory[historyIndex]   = bassEnergy;
    historyIndex = (historyIndex + 1) % HISTORY_SIZE;

    /* ── Rolling average ── */
    let avg = 0;
    for (let i = 0; i < HISTORY_SIZE; i++) {
      avg += energyHistory[i];
    }
    avg /= HISTORY_SIZE;

    /* ── Variance (measures music dynamics) ── */
    let variance = 0;
    for (let i = 0; i < HISTORY_SIZE; i++) {
      const diff = energyHistory[i] - avg;
      variance  += diff * diff;
    }
    variance /= HISTORY_SIZE;

    /* ── Adaptive threshold ──
       High variance (dynamic music) → lower threshold
       (beats are easier to distinguish from background)
       Low variance (steady noise)   → higher threshold
       (prevents false positives from constant sound)   */
    const adaptive  = BEAT_THRESHOLD - (variance * 1.5);
    const threshold = Math.max(1.28, Math.min(1.9, adaptive));

    /* ── High-frequency onset detection ──
       Spectral flux: positive change in high frequencies */
    const highFlux = Math.max(0, highSum - prevHighSum);
    prevHighSum    = highSum;

    /* ── Beat condition ── */
    let isBeat   = false;
    let strength = 0;

    if (beatCooldown === 0) {
      const bassBeat  = bassEnergy > avg * threshold &&
                        bassEnergy > BEAT_MIN_STRENGTH;
      const onsetBeat = highFlux > 0.07 &&
                        bassEnergy > avg * 1.18;

      if (bassBeat || onsetBeat) {
        isBeat   = true;
        strength = Math.min(1.0,
          (bassEnergy - avg * threshold) /
          (avg * 0.5 + 0.001)
        );

        beatCooldown = BEAT_COOLDOWN;

        /* ── BPM estimation ── */
        const now = performance.now();
        if (lastBeatTime > 0) {
          const interval = now - lastBeatTime;
          /* Only track realistic BPM: 40–220 */
          if (interval > 272 && interval < 1500) {
            bpmHistory.push(interval);
            if (bpmHistory.length > BPM_HISTORY_MAX) {
              bpmHistory.shift();
            }
            /* Median interval → stable BPM estimate */
            const sorted = bpmHistory.slice()
              .sort((a, b) => a - b);
            const median = sorted[
              Math.floor(sorted.length / 2)
            ];
            estimatedBPM = Math.round(60000 / median);
          }
        }
        lastBeatTime = now;
      }
    }

    /* Count down cooldown each frame */
    if (beatCooldown > 0) beatCooldown--;

    return { beat: isBeat, strength };
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — SMOOTHING (VU Meter Ballistics)
     Fast attack / slow release model.
     Mimics how professional audio meters work.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * smooth — exponential moving average.
   * Attack coefficient applied on rise,
   * Release coefficient applied on fall.
   *
   * @param  {number} current  previous smoothed value
   * @param  {number} target   new raw value
   * @param  {number} attack   rise speed  [0..1]
   * @param  {number} release  fall speed  [0..1]
   * @returns {number}
   */
  function smooth(current, target, attack, release) {
    const coeff = target > current ? attack : release;
    return current + (target - current) * coeff;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — MAIN UPDATE FUNCTION
     Called every animation frame from main.js.
     Reads FFT data and computes all output metrics.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function update() {

    /* ── Not active: decay metrics gracefully ── */
    if (!isActive || !analyser) {
      metrics.amplitude  = smooth(metrics.amplitude,  0, 0.1, 0.04);
      metrics.bassEnergy = smooth(metrics.bassEnergy, 0, 0.1, 0.04);
      metrics.midEnergy  = smooth(metrics.midEnergy,  0, 0.1, 0.04);
      metrics.highEnergy = smooth(metrics.highEnergy, 0, 0.1, 0.04);
      metrics.bassSmooth = smooth(metrics.bassSmooth, 0, 0.1, 0.03);
      metrics.midSmooth  = smooth(metrics.midSmooth,  0, 0.1, 0.03);
      metrics.highSmooth = smooth(metrics.highSmooth, 0, 0.1, 0.03);
      metrics.beatDetect = false;
      return;
    }

    /* ── Resume if browser suspended context ── */
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
      return;
    }

    /* ── Pull FFT data from analyser ── */
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       BAND ENERGY EXTRACTION
       Frequency bands tuned for music reactivity
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    const subBass    = getBandEnergy(20,    80  );
    const bass       = getBandEnergy(80,    250 );
    const lowMid     = getBandEnergy(250,   500 );
    const mid        = getBandEnergy(500,   2000);
    const pres       = getBandEnergy(2000,  6000);
    const brilliance = getBandEnergy(6000,  20000);

    /* Combined bands */
    const bassTotal = subBass * 0.40 + bass    * 0.60;
    const midTotal  = lowMid  * 0.30 + mid     * 0.70;
    const highTotal = pres    * 0.50 + brilliance * 0.50;

    /* ── Overall RMS amplitude (full spectrum) ── */
    let sumSq = 0;
    for (let i = 0; i < freqData.length; i++) {
      const n = freqData[i] / 255.0;
      sumSq  += n * n;
    }
    const rms = Math.sqrt(sumSq / freqData.length);

    /* ── High-band average for onset detection ── */
    const highBinStart = Math.floor(freqData.length * 0.5);
    let   highSum      = 0;
    const highCount    = freqData.length - highBinStart;
    for (let i = highBinStart; i < freqData.length; i++) {
      highSum += freqData[i] / 255.0;
    }
    highSum /= highCount;

    /* ── Beat detection ── */
    const { beat, strength } = detectBeat(bassTotal, highSum);

    /* ── Spectral features ── */
    const centroid   = getSpectralCentroid();
    const waveformPk = getWaveformPeak();

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       APPLY SMOOTHING
       Different attack/release rates per channel:
       · Fast attack: responsive to transients
       · Slow release: sustain glow effect
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    metrics.amplitude  = smooth(metrics.amplitude,  rms,       0.72, 0.11);
    metrics.bassEnergy = smooth(metrics.bassEnergy, bassTotal, 0.82, 0.10);
    metrics.midEnergy  = smooth(metrics.midEnergy,  midTotal,  0.72, 0.11);
    metrics.presEnergy = smooth(metrics.presEnergy, pres,      0.70, 0.13);
    metrics.highEnergy = smooth(metrics.highEnergy, highTotal, 0.62, 0.14);

    /* Slower smoothed versions for visual output
       (drives bloom, rotation, scale) */
    metrics.bassSmooth = smooth(metrics.bassSmooth, bassTotal, 0.38, 0.055);
    metrics.midSmooth  = smooth(metrics.midSmooth,  midTotal,  0.38, 0.065);
    metrics.highSmooth = smooth(metrics.highSmooth, highTotal, 0.34, 0.070);

    /* Spectral features */
    metrics.centroid     = smooth(metrics.centroid,     centroid,  0.28, 0.09);
    metrics.waveformPeak = smooth(metrics.waveformPeak, waveformPk,0.80, 0.10);

    /* Beat — true for exactly ONE frame */
    metrics.beatDetect   = beat;
    metrics.beatStrength = beat
      ? strength
      : smooth(metrics.beatStrength, 0, 0.1, 0.07);
    metrics.bpm          = estimatedBPM;
    metrics.active       = true;
    metrics.sourceType   = sourceType;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — CONFIGURATION UTILITIES
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * setGain — adjust input sensitivity [0..4].
   * Uses setTargetAtTime for smooth ramp (no clicks).
   * @param {number} value
   */
  function setGain(value) {
    if (!gainNode || !audioCtx) return;
    gainNode.gain.setTargetAtTime(
      Math.max(0, Math.min(4, value)),
      audioCtx.currentTime,
      0.015   /* 15ms smooth ramp */
    );
  }

  /**
   * setSmoothing — change FFT time-constant [0..0.99].
   * Lower = more responsive, higher = smoother.
   * @param {number} value
   */
  function setSmoothing(value) {
    if (!analyser) return;
    analyser.smoothingTimeConstant =
      Math.max(0, Math.min(0.99, value));
  }

  /**
   * getFrequencyArray — raw FFT data copy.
   * For custom external visualisers.
   * @returns {Uint8Array|null}
   */
  function getFrequencyArray() {
    if (!freqData) return null;
    return new Uint8Array(freqData);
  }

  /**
   * getWaveformArray — time-domain data copy.
   * @returns {Uint8Array|null}
   */
  function getWaveformArray() {
    if (!timeData) return null;
    return new Uint8Array(timeData);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 11 — STOP & CLEANUP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * stop — disconnect all sources, close context,
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

    /* Reset all output metrics */
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

    /* Reset beat detection state */
    energyHistory.fill(0);
    bassHistory.fill(0);
    historyIndex = 0;
    bpmHistory   = [];
    lastBeatTime = 0;
    estimatedBPM = 0;
    prevHighSum  = 0;
    beatCooldown = 0;

    console.info('[AudioEngine] Stopped and context closed.');
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 12 — STATUS & CAPABILITY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * isSupported — check browser Web Audio support.
   * @returns {boolean}
   */
  function isSupported() {
    return !!(
      (window.AudioContext || window.webkitAudioContext) &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * getMetrics — return current output metrics.
   * Called each frame by main.js SyncController.
   * @returns {Object}
   */
  function getMetrics() {
    return metrics;
  }

  /**
   * getStatus — detailed engine status for debugging.
   * @returns {Object}
   */
  function getStatus() {
    return {
      active:       isActive,
      sourceType,
      contextState: audioCtx ? audioCtx.state : 'none',
      sampleRate:   audioCtx ? audioCtx.sampleRate : 0,
      fftSize:      analyser ? analyser.fftSize : 0,
      binCount:     analyser ? analyser.frequencyBinCount : 0,
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

    /* Per-frame update */
    update,

    /* Output */
    getMetrics,
    getStatus,
    getFrequencyArray,
    getWaveformArray,

    /* Configuration */
    setGain,
    setSmoothing,

    /* Capability check */
    isSupported
  };

})(); // end AudioEngine
