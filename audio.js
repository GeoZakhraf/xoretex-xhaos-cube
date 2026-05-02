/**
 * ═══════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — audio.js
 *  Web Audio API Analyser
 *  Outputs: amplitude, bassEnergy, highEnergy, beatDetect
 * ═══════════════════════════════════════════════════
 */

'use strict';

window.AudioEngine = (function () {

  let ctx, analyser, source, dataArray;
  let active     = false;
  let beatCooldown = 0;

  const FFT_SIZE  = 2048;
  const SMOOTHING = 0.82;

  /* ─── Output ─── */
  let metrics = {
    amplitude:   0,
    bassEnergy:  0,
    highEnergy:  0,
    midEnergy:   0,
    beatDetect:  false,
    active:      false
  };

  /* ─── Beat detector state ─── */
  let energyHistory = new Float32Array(43).fill(0);
  let historyIndex  = 0;

  /* ══════════════════════════════════════════════
     INIT — requests microphone
  ══════════════════════════════════════════════ */

  async function init() {
    if (active) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      ctx      = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize              = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;

      source   = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      dataArray = new Uint8Array(analyser.frequencyBinCount);
      active    = true;
      metrics.active = true;
      return true;
    } catch (e) {
      console.warn('[AudioEngine] Microphone access denied:', e);
      metrics.active = false;
      return false;
    }
  }

  /* ══════════════════════════════════════════════
     UPDATE — called each animation frame
  ══════════════════════════════════════════════ */

  function update() {
    if (!active || !analyser) return;

    analyser.getByteFrequencyData(dataArray);
    const len = dataArray.length;

    // Amplitude (overall)
    let sum = 0;
    for (let i = 0; i < len; i++) sum += dataArray[i];
    metrics.amplitude = sum / (len * 255);

    // Band energies
    const bassEnd  = Math.floor(len * 0.05);  // ~0–200 Hz
    const midEnd   = Math.floor(len * 0.3);   // ~200–3kHz
    // high: rest

    let bSum = 0, mSum = 0, hSum = 0;
    for (let i = 0;       i < bassEnd; i++) bSum += dataArray[i];
    for (let i = bassEnd; i < midEnd;  i++) mSum += dataArray[i];
    for (let i = midEnd;  i < len;     i++) hSum += dataArray[i];

    metrics.bassEnergy = bSum / (bassEnd * 255);
    metrics.midEnergy  = mSum / ((midEnd - bassEnd) * 255);
    metrics.highEnergy = hSum / ((len - midEnd) * 255);

    // Beat detection (spectral flux / variance method)
    const energy = metrics.bassEnergy;
    energyHistory[historyIndex] = energy;
    historyIndex = (historyIndex + 1) % energyHistory.length;

    let histAvg = 0;
    for (let i = 0; i < energyHistory.length; i++) histAvg += energyHistory[i];
    histAvg /= energyHistory.length;

    beatCooldown = Math.max(0, beatCooldown - 1);
    metrics.beatDetect = (energy > histAvg * 1.55 && beatCooldown === 0);
    if (metrics.beatDetect) beatCooldown = 12;
  }

  /* ─── Public ─── */

  function getMetrics() { return metrics; }

  function stop() {
    if (ctx) ctx.close();
    active = false;
    metrics.active = false;
  }

  return { init, update, getMetrics, stop };

})();
