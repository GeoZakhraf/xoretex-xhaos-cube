/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — main.js
 *
 *  Master Orchestrator & Bootstrap
 *  ────────────────────────────────
 *  Core Integration Changes from v1.0:
 *
 *  1. ENGINE INIT ORDER (Critical)
 *     Engine2D must fully initialise and begin rendering
 *     canvas2d BEFORE Cube3D.init() is called.
 *     Cube3D.init() receives canvas2d as its second argument
 *     and immediately wraps it in THREE.CanvasTexture.
 *     Order: Engine2D.init() → Engine2D.start() → Cube3D.init()
 *
 *  2. FRAME EXECUTION ORDER (Critical)
 *     Within each animation frame the sequence must be:
 *     a. Engine2D renders particles onto canvas2d
 *     b. Cube3D.updateLiveTexture() marks texture dirty
 *     c. Cube3D composer.render() uploads canvas2d to GPU
 *     d. AudioEngine.update() reads microphone FFT
 *     e. SyncController.tick() computes inversion values
 *     f. UI.updateSyncHUD() refreshes the interface
 *     Engine2D and Cube3D have independent RAF loops for
 *     rendering. The master loop handles sync + audio + UI.
 *
 *  3. SYNC CONTROLLER — Inversion Symmetry Brain
 *     Reads Engine2D metrics and computes the mathematically
 *     inverted response for Cube3D:
 *     · CW 2D rotation   → CCW 3D rotation
 *     · Outward 2D flow  → 3D implosion (scale < 1)
 *     · High 2D energy   → additional 3D compression
 *     · Audio beat       → trigger shatter
 *     · High audio freq  → bloom intensity
 *     · BPM              → rotation speed modulation
 *
 *  4. TEXTURE MODE BUTTON
 *     New "LIVE TEX" toggle button in header wired here.
 *     T key also toggles between live texture and shader mode.
 *
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 1 — SYNC CONTROLLER
   The mathematical inversion brain.
   Links Engine2D metrics to Cube3D responses
   with mathematically opposite values.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SyncController = (function () {

  /* ── Smooth State ── */
  let smoothedScale   = 1.0;
  let smoothedBloom   = 1.2;
  let smoothedEnergy  = 0.0;
  let smoothedSpeed   = 1.0;

  /* ── Beat / Shatter State ── */
  let shatterArmed    = false;
  let shatterCooldown = 0;
  const SHATTER_COOLDOWN   = 150;   // ~2.5s at 60fps
  const BEAT_STRENGTH_MIN  = 0.55;  // minimum beat strength to shatter

  /* ── Frequency History ──
     Track 2D frequency over 30 frames to detect
     sustained high-chaos states that compress 3D further */
  const FREQ_HIST_SIZE = 30;
  const freqHistory    = new Float32Array(FREQ_HIST_SIZE);
  let   freqHistIdx    = 0;

  /* ── Rotation Smoothing ──
     Prevent direction flip jitter when 2D
     oscillates near the CW/CCW boundary */
  let   lastRotDir     = 1;
  let   rotDirHoldFrames = 0;
  const ROT_DIR_HOLD   = 20;  // hold direction for N frames before switching

  /* ── BPM Rotation Modulation ── */
  let   bpmRotFactor   = 1.0;

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     LINEAR INTERPOLATION UTILITY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     TICK — called every master loop frame
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * tick — compute full inversion sync for this frame.
   *
   * @param  {Object} m2d     Engine2D.getMetrics()
   * @param  {Object} mAudio  AudioEngine.getMetrics()
   * @returns {Object} syncData pushed to Cube3D.setSyncData()
   */
  function tick(m2d, mAudio) {

    /* ════════════════════════════════════════════
       RULE 1 — ROTATION INVERSION
       ────────────────────────────────────────────
       If 2D particles rotate clockwise  → 3D rotates CCW (dir = -1)
       If 2D particles rotate CCW        → 3D rotates CW  (dir = +1)

       The 2D clockwise metric is boolean. We apply a hold
       timer before switching direction to prevent jitter
       when the 2D field oscillates near the boundary.
    ════════════════════════════════════════════ */
    let rotationDir;

    if (rotDirHoldFrames > 0) {
      /* Hold current direction during transition window */
      rotationDir = lastRotDir;
      rotDirHoldFrames--;
    } else {
      /* Compute new direction — opposite of 2D */
      const newDir = m2d.clockwise ? -1 : 1;
      if (newDir !== lastRotDir) {
        /* Direction changed — start hold window */
        rotDirHoldFrames = ROT_DIR_HOLD;
      }
      rotationDir = newDir;
      lastRotDir  = newDir;
    }

    /* ════════════════════════════════════════════
       RULE 2 — SCALE INVERSION
       ────────────────────────────────────────────
       2D outwardFlow > 0 = particles expanding outward
       → 3D cube implodes (scaleMult < 1.0)

       2D outwardFlow < 0 = particles collapsing inward
       → 3D cube expands (scaleMult > 1.0)

       Formula: scaleMult = 1.0 - (outward × 0.38)
       Clamped to [0.35 .. 1.65]
    ════════════════════════════════════════════ */
    const outward = Math.max(-1.0, Math.min(1.0, m2d.outwardFlow || 0));
    let scaleMult = 1.0 - (outward * 0.38);
    scaleMult     = Math.max(0.35, Math.min(1.65, scaleMult));

    /* ════════════════════════════════════════════
       RULE 3 — FREQUENCY-ENERGY COUPLING
       ────────────────────────────────────────────
       High sustained 2D energy (fast chaotic motion)
       additionally compresses the 3D cube.
       This creates a "containment pressure" effect:
       the more chaotic the 2D field, the more the
       3D cube is squeezed inward.
    ════════════════════════════════════════════ */
    const energy2d = Math.max(0, Math.min(1, m2d.energy || 0));

    /* Update frequency history */
    freqHistory[freqHistIdx] = m2d.frequency || 0;
    freqHistIdx = (freqHistIdx + 1) % FREQ_HIST_SIZE;

    /* Rolling average frequency */
    let freqAvg = 0;
    for (let i = 0; i < FREQ_HIST_SIZE; i++) freqAvg += freqHistory[i];
    freqAvg /= FREQ_HIST_SIZE;

    /* High sustained frequency → additional compression */
    if (freqAvg > 0.65) {
      const pressure = (freqAvg - 0.65) / 0.35; // normalised 0..1
      scaleMult -= pressure * 0.22;
      scaleMult  = Math.max(0.28, scaleMult);
    }

    /* ════════════════════════════════════════════
       RULE 4 — SMOOTH ALL VALUES
       ────────────────────────────────────────────
       Exponential smoothing prevents jitter from
       frame-to-frame metric fluctuations.
       Different rates per channel:
       · Scale  — slow (0.055) — prevents size jitter
       · Energy — medium (0.12) — responsive glow
    ════════════════════════════════════════════ */
    smoothedScale  = lerp(smoothedScale,  scaleMult, 0.055);
    smoothedEnergy = lerp(smoothedEnergy, energy2d,  0.12);

    /* ════════════════════════════════════════════
       RULE 5 — AUDIO REACTIVITY
       ────────────────────────────────────────────
       Only active when AudioEngine has microphone.
       Multiple channels drive different 3D parameters.
    ════════════════════════════════════════════ */
    if (mAudio && mAudio.active) {

      /* ── 5a. Bloom from high frequencies ──
         Brilliance + presence energy → neon glow intensity
         Range: [0.5 .. 3.8] */
      const targetBloom =
        0.5 +
        mAudio.highEnergy  * 1.6 +
        mAudio.presEnergy  * 0.9 +
        mAudio.bassSmooth  * 0.4;
      smoothedBloom = lerp(smoothedBloom, targetBloom, 0.08);
      Cube3D.setBloom(Math.max(0.4, Math.min(3.8, smoothedBloom)));

      /* ── 5b. Speed from mid + amplitude ──
         Mid-range energy drives tempo reactivity */
      const targetSpeed =
        1.0 +
        mAudio.midEnergy  * 1.8 +
        mAudio.amplitude  * 1.2;
      smoothedSpeed = lerp(smoothedSpeed, targetSpeed, 0.10);
      const clampedSpeed = Math.max(0.2, Math.min(4.5, smoothedSpeed));
      Engine2D.setParams({ speed: clampedSpeed });
      Cube3D.setParams({   speed: clampedSpeed });

      /* ── 5c. Bass pulse — momentary cube push ──
         Strong bass briefly expands the cube
         (against the normal inversion rule)
         creating a "thump" physical response */
      const bassPulse   = mAudio.bassSmooth * 0.18;
      smoothedScale    += bassPulse * 0.35;
      smoothedScale     = Math.max(0.28, Math.min(1.85, smoothedScale));

      /* ── 5d. BPM rotation modulation ──
         BPM above 120 speeds up rotation
         BPM below 120 slows it down */
      if (mAudio.bpm > 30) {
        bpmRotFactor = lerp(
          bpmRotFactor,
          mAudio.bpm / 120.0,
          0.02
        );
        bpmRotFactor = Math.max(0.3, Math.min(2.5, bpmRotFactor));
        Cube3D.setParams({
          rotation: 0.3 * bpmRotFactor *
                    (0.8 + mAudio.amplitude * 0.5)
        });
      }

      /* ── 5e. Beat → shatter trigger ──
         Fires on significant audio beats only.
         Strong cooldown prevents shatter spam. */
      if (shatterCooldown > 0) shatterCooldown--;

      if (mAudio.beatDetect         &&
          mAudio.beatStrength > BEAT_STRENGTH_MIN &&
          !shatterArmed             &&
          shatterCooldown === 0) {

        shatterArmed    = true;
        shatterCooldown = SHATTER_COOLDOWN;

        Cube3D.triggerShatter();

        /* UI flash VFX */
        if (window.UI && UI.triggerShatterVFX) {
          UI.triggerShatterVFX();
        }

        /* Disarm after one frame gap */
        setTimeout(() => { shatterArmed = false; }, 100);
      }
    }

    /* ════════════════════════════════════════════
       BUILD & RETURN SYNC PACKAGE
    ════════════════════════════════════════════ */
    return {
      rotationDir,               // +1 or -1 — opposite of 2D
      scaleMult:  smoothedScale, // [0.28..1.85] — inverted from outward flow
      energy:     smoothedEnergy // [0..1] — 2D energy level
    };
  }

  /**
   * reset — clear all smooth state.
   * Called on preset change or engine restart.
   */
  function reset() {
    smoothedScale    = 1.0;
    smoothedBloom    = 1.2;
    smoothedEnergy   = 0.0;
    smoothedSpeed    = 1.0;
    bpmRotFactor     = 1.0;
    shatterCooldown  = 0;
    shatterArmed     = false;
    rotDirHoldFrames = 0;
    lastRotDir       = 1;
    freqHistory.fill(0);
    freqHistIdx = 0;
  }

  return { tick, reset };

})();


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 2 — PERFORMANCE MONITOR
   Adaptive quality scaling for mobile devices
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const PerformanceMonitor = (function () {

  const SAMPLE_WINDOW  = 90;
  const LOW_FPS        = 28;
  const OK_FPS         = 50;
  const CHECK_INTERVAL = 180;

  let fpsBuffer        = new Float32Array(SAMPLE_WINDOW);
  let bufIdx           = 0;
  let totalFrames      = 0;
  let lastTs           = 0;
  let qualityReduced   = false;
  let checkTimer       = 0;

  /* Texture update throttle for low-end devices */
  let texThrottle      = 1;   // update texture every N frames
  let texFrameCounter  = 0;

  function update(ts) {
    if (lastTs === 0) { lastTs = ts; return 60; }

    const delta  = ts - lastTs;
    lastTs       = ts;
    totalFrames++;
    checkTimer++;

    const instFPS        = delta > 0 ? 1000 / delta : 60;
    fpsBuffer[bufIdx]    = instFPS;
    bufIdx               = (bufIdx + 1) % SAMPLE_WINDOW;

    const filled = Math.min(totalFrames, SAMPLE_WINDOW);
    let   sum    = 0;
    for (let i = 0; i < filled; i++) sum += fpsBuffer[i];
    const avgFPS = sum / filled;

    if (checkTimer >= CHECK_INTERVAL) {
      checkTimer = 0;
      adaptQuality(avgFPS);
    }

    return Math.round(avgFPS);
  }

  function adaptQuality(avgFPS) {
    if (avgFPS < LOW_FPS && !qualityReduced) {
      qualityReduced = true;
      texThrottle    = 2;   // update texture every 2nd frame
      Engine2D.setParams({ density: 1200 });
      console.info(
        `[PerfMonitor] Low FPS (${Math.round(avgFPS)}). ` +
        'Reducing density → 1200, texture throttle → 2.'
      );
      if (window.UI) {
        UI.showToast('Performance mode active', 'info', 3000);
      }

    } else if (avgFPS >= OK_FPS && qualityReduced) {
      qualityReduced = false;
      texThrottle    = 1;   // restore full texture update rate
      Engine2D.setParams({ density: 2800 });
      console.info(
        `[PerfMonitor] FPS restored (${Math.round(avgFPS)}). ` +
        'Restoring density → 2800, texture throttle → 1.'
      );
    }
  }

  /* Returns true if texture should update this frame */
  function shouldUpdateTexture() {
    texFrameCounter++;
    if (texFrameCounter >= texThrottle) {
      texFrameCounter = 0;
      return true;
    }
    return false;
  }

  function getFrameCount()  { return totalFrames; }
  function isReduced()      { return qualityReduced; }
  function getTexThrottle() { return texThrottle; }

  return {
    update,
    shouldUpdateTexture,
    getFrameCount,
    isReduced,
    getTexThrottle
  };

})();


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 3 — LOADER SEQUENCE
   9-stage animated progress with formula preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function runLoader() {
  return new Promise(resolve => {

    const barFill = document.getElementById('loader-bar-fill');
    const barGlow = document.getElementById('loader-bar-glow');
    const percent = document.getElementById('loader-percent');
    const status  = document.getElementById('loader-status');
    const formula = document.getElementById('loader-formula');
    const isAr    = document.getElementById('html-root').lang === 'ar';

    const stages = [
      {
        target:    8,
        duration:  200,
        message:   'Bootstrapping engine core…',
        messageAr: 'تهيئة النواة الأساسية…',
        formula:   'n(x,y) = hash(x·127.1 + y·311.7) · 43758.5'
      },
      {
        target:    20,
        duration:  350,
        message:   'Loading 60 mathematical formulas…',
        messageAr: 'تحميل 60 صيغة رياضية…',
        formula:   'fBm(x,y,8) = Σ 0.5ⁱ · noise(2ⁱ·x, 2ⁱ·y)'
      },
      {
        target:    34,
        duration:  380,
        message:   'Initialising 2D particle engine…',
        messageAr: 'تهيئة محرك الجسيمات ثنائي الأبعاد…',
        formula:   'v(t+1) = v(t)·0.82 + cos(F(x,y,t))·speed·0.18'
      },
      {
        target:    48,
        duration:  360,
        message:   'Building live texture bridge…',
        messageAr: 'بناء جسر النسيج الحي…',
        formula:   'THREE.CanvasTexture(canvas2d) → MeshBasicMaterial.map'
      },
      {
        target:    60,
        duration:  340,
        message:   'Initialising 3D cube engine…',
        messageAr: 'تهيئة محرك المكعب ثلاثي الأبعاد…',
        formula:   'cube.material.map.needsUpdate = true @ 60fps'
      },
      {
        target:    72,
        duration:  320,
        message:   'Configuring post-processing stack…',
        messageAr: 'إعداد معالجة ما بعد التصيير…',
        formula:   'Bloom(1.2) → ChromaAberration → FilmGrain → Screen'
      },
      {
        target:    83,
        duration:  300,
        message:   'Activating inversion sync…',
        messageAr: 'تفعيل التزامن المعكوس…',
        formula:   'scaleMult = 1.0 − (outwardFlow × 0.38)'
      },
      {
        target:    93,
        duration:  280,
        message:   'Calibrating audio beat detector…',
        messageAr: 'معايرة كاشف الإيقاع الصوتي…',
        formula:   'beat = bassEnergy > avg × (1.6 − variance·1.5)'
      },
      {
        target:    100,
        duration:  240,
        message:   'GeoZakhraf Xhaos Engine v2.0 ready.',
        messageAr: 'محرك جيو زخرف الفوضوي الإصدار 2.0 جاهز.',
        formula:   '2D FLOW FIELD → LIVE TEXTURE → 3D CUBE SKIN'
      }
    ];

    let currentPct = 0;
    let stageIdx   = 0;

    function animateStage(stage) {
      const startPct  = currentPct;
      const startTime = performance.now();
      const dur       = stage.duration;

      if (status)  status.textContent  =
        isAr ? stage.messageAr : stage.message;
      if (formula) formula.textContent = stage.formula;

      function step(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / dur, 1.0);

        /* Ease-out cubic */
        const eased  = 1 - Math.pow(1 - progress, 3);
        const pct    = startPct + (stage.target - startPct) * eased;
        currentPct   = pct;

        const pctStr = pct.toFixed(1) + '%';
        if (barFill)  barFill.style.width  = pctStr;
        if (barGlow)  barGlow.style.width  = pctStr;
        if (percent)  percent.textContent  = Math.floor(pct) + '%';

        const pb = document.getElementById('loader-progress-bar');
        if (pb) pb.setAttribute('aria-valuenow', Math.floor(pct));

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          stageIdx++;
          if (stageIdx < stages.length) {
            setTimeout(() => animateStage(stages[stageIdx]), 80);
          } else {
            setTimeout(() => fadeOutLoader(resolve), 300);
          }
        }
      }

      requestAnimationFrame(step);
    }

    animateStage(stages[stageIdx]);
  });
}

function fadeOutLoader(callback) {
  const loader = document.getElementById('loader');
  if (!loader) { callback(); return; }
  loader.classList.add('fade-out');
  setTimeout(() => {
    loader.style.display = 'none';
    callback();
  }, 520);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 4 — ENGINE INITIALISATION
   Critical: order matters for live texture integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function initEngines() {

  /* ── Get Canvas Elements ── */
  const canvas2d = document.getElementById('canvas2d');
  const canvas3d = document.getElementById('canvas3d');

  if (!canvas2d || !canvas3d) {
    console.error('[main] Canvas elements not found.');
    return;
  }

  /* ════════════════════════════════════════════════
     STEP 1 — INITIALISE 2D ENGINE FIRST
     ────────────────────────────────────────────────
     Engine2D must start rendering onto canvas2d
     before Cube3D creates its CanvasTexture.
     This ensures the texture has valid pixel data
     from frame 1 rather than a blank canvas.
  ════════════════════════════════════════════════ */
  try {
    Engine2D.init(canvas2d);
    Engine2D.start();
    console.info(
      '[main] Engine2D started. ' +
      'Rendering to canvas2d — ready for texture mapping.'
    );
  } catch (e) {
    console.error('[main] Engine2D failed to start:', e);
    if (window.UI) {
      UI.showToast('2D Engine error', 'error', 5000);
    }
  }

  /* ════════════════════════════════════════════════
     STEP 2 — INITIALISE 3D ENGINE WITH canvas2d REF
     ────────────────────────────────────────────────
     We pass canvas2d as the second argument.
     Cube3D.init() will:
     · Create THREE.CanvasTexture(canvas2d)
     · Build MeshBasicMaterial with that texture
     · Apply it to the cube faces
     From this point the cube skin IS the 2D canvas.
  ════════════════════════════════════════════════ */
  try {
    Cube3D.init(canvas3d, canvas2d);
    Cube3D.start();
    console.info(
      '[main] Cube3D started. ' +
      'Live texture: canvas2d → CanvasTexture → cube faces.'
    );
  } catch (e) {
    console.error('[main] Cube3D failed to start:', e);
    if (window.UI) {
      UI.showToast('3D Engine error', 'error', 5000);
    }
  }

  /* ════════════════════════════════════════════════
     STEP 3 — INITIALISE UI
  ════════════════════════════════════════════════ */
  try {
    UI.init();
    console.info('[main] UI initialised.');
  } catch (e) {
    console.error('[main] UI failed:', e);
  }

  /* ════════════════════════════════════════════════
     STEP 4 — WIRE TEXTURE MODE BUTTON
     New in v2.0 — toggles between live texture
     and GLSL shader mode on the cube
  ════════════════════════════════════════════════ */
  wireTextureModeButton();

  /* ════════════════════════════════════════════════
     STEP 5 — WIRE TEX OPACITY SLIDER
     New in v2.0 — controls live texture depth/opacity
  ════════════════════════════════════════════════ */
  wireTexOpacitySlider();
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 5 — TEXTURE MODE BUTTON WIRING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function wireTextureModeButton() {
  const btn = document.getElementById('btn-tex-mode');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const isNowTexMode = Cube3D.toggleTextureMode();

    /* Update button appearance */
    btn.classList.toggle('active', isNowTexMode);
    btn.setAttribute('aria-pressed', isNowTexMode);

    const isAr = document.getElementById('html-root').lang === 'ar';

    if (isNowTexMode) {
      btn.textContent = isAr ? '⬡ نسيج حي' : '⬡ LIVE TEX';
      if (window.UI) {
        UI.showToast(
          isAr
            ? 'وضع النسيج الحي — المكعب يرتدي الحقل ثنائي الأبعاد'
            : 'Live Texture Mode — cube wears the 2D field'
        );
      }
    } else {
      btn.textContent = isAr ? '⬡ شيدر' : '⬡ SHADER';
      if (window.UI) {
        UI.showToast(
          isAr
            ? 'وضع الشيدر — صيغ GLSL مستقلة'
            : 'Shader Mode — independent GLSL formulas'
        );
      }
    }

    /* Update texture sync HUD */
    updateTexSyncHUD(isNowTexMode);
  });

  /* Start in active (live texture) state */
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 6 — TEX OPACITY SLIDER WIRING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function wireTexOpacitySlider() {
  const slider = document.getElementById('param-tex-opacity');
  const valEl  = document.getElementById('val-tex-opacity');
  if (!slider) return;

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    if (valEl) valEl.textContent = v.toFixed(2);
    Cube3D.setParams({ texOpacity: v });
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 7 — TEXTURE SYNC HUD UPDATER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function updateTexSyncHUD(isTexMode) {
  const texFill = document.getElementById('sync-tex-fill');
  const texNum  = document.getElementById('sync-tex-num');
  const texDot  = document.getElementById('tex-dot');

  if (texFill) {
    texFill.style.width      = isTexMode ? '100%' : '20%';
    texFill.style.background = isTexMode
      ? 'linear-gradient(90deg, #00ff88, #00f0ff)'
      : 'linear-gradient(90deg, #ff2244, #8b00ff)';
  }

  if (texNum) {
    texNum.textContent = isTexMode ? 'LIVE' : 'GLSL';
  }

  if (texDot) {
    texDot.style.background   = isTexMode ? '#00ff88' : '#8b00ff';
    texDot.style.boxShadow    = isTexMode
      ? '0 0 8px #00ff88'
      : '0 0 8px #8b00ff';
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 8 — MASTER ANIMATION LOOP
   Orchestrates Audio → Sync → UI each frame.
   Engine2D and Cube3D have independent RAF loops
   for rendering. This loop handles coordination.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let masterAnimId    = null;
let masterPaused    = false;
let syncFrameCount  = 0;

/* Throttle sync computation to every 2nd frame */
const SYNC_INTERVAL = 2;

/* Last computed sync data (reused on skipped frames) */
let lastSyncData = {
  rotationDir: 1,
  scaleMult:   1.0,
  energy:      0.0
};

function masterLoop(timestamp) {
  masterAnimId = requestAnimationFrame(masterLoop);

  if (masterPaused) return;

  syncFrameCount++;

  /* ── Performance Monitor ── */
  const avgFPS = PerformanceMonitor.update(timestamp);

  /* ── Audio Update (every frame) ── */
  AudioEngine.update();
  const mAudio = AudioEngine.getMetrics();

  /* ── Sync Computation (every SYNC_INTERVAL frames) ── */
  if (syncFrameCount % SYNC_INTERVAL === 0) {

    /* Read 2D metrics */
    const m2d = Engine2D.getMetrics();

    /* Compute inversion sync */
    lastSyncData = SyncController.tick(m2d, mAudio);

    /* Push sync data to 3D cube */
    Cube3D.setSyncData(lastSyncData);

    /* Update UI sync displays */
    if (window.UI) {
      UI.updateSyncHUD(m2d, lastSyncData, mAudio);
    }

    /* Update texture sync HUD */
    const texStatus = Cube3D.getTexSyncStatus();
    updateTexSyncHUD(texStatus.mode === 'LIVE_TEXTURE');
  }
}

function startMasterLoop() {
  if (!masterAnimId) {
    masterAnimId = requestAnimationFrame(masterLoop);
    console.info('[main] Master loop started.');
  }
}

function stopMasterLoop() {
  if (masterAnimId) {
    cancelAnimationFrame(masterAnimId);
    masterAnimId = null;
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 9 — KEYBOARD SHORTCUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupKeyboard() {
  document.addEventListener('keydown', e => {

    /* Skip if typing in search */
    if (e.target && e.target.id === 'preset-search') return;

    switch (e.key) {

      /* SPACE — shatter */
      case ' ':
        e.preventDefault();
        Cube3D.triggerShatter();
        if (window.UI) UI.triggerShatterVFX();
        break;

      /* R — randomize */
      case 'r':
      case 'R':
        if (window.UI) UI.randomizeBoth();
        SyncController.reset();
        break;

      /* P — POV mode */
      case 'p':
      case 'P': {
        const btn = document.getElementById('btn-pov');
        if (btn) btn.click();
        break;
      }

      /* T — toggle texture mode */
      case 't':
      case 'T': {
        const btn = document.getElementById('btn-tex-mode');
        if (btn) btn.click();
        break;
      }

      /* A — audio */
      case 'a':
      case 'A': {
        const btn = document.getElementById('btn-audio');
        if (btn) btn.click();
        break;
      }

      /* F — fullscreen */
      case 'f':
      case 'F':
        toggleFullscreen();
        break;

      /* L — language */
      case 'l':
      case 'L': {
        const btn = document.getElementById('btn-lang');
        if (btn) btn.click();
        break;
      }

      /* ? — shortcuts overlay */
      case '?':
        toggleShortcutsOverlay(true);
        break;

      /* Escape — close overlays */
      case 'Escape':
        toggleShortcutsOverlay(false);
        break;

      /* Arrow keys — cycle presets */
      case 'ArrowRight':
        e.preventDefault();
        cyclePreset('2d', +1);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        cyclePreset('2d', -1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        cyclePreset('3d', +1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        cyclePreset('3d', -1);
        break;
    }
  });
}

function cyclePreset(engine, delta) {
  if (!window.UI) return;
  /* Delegate to UI which knows the current index */
  UI.selectPresetRelative
    ? UI.selectPresetRelative(engine, delta)
    : UI.randomizeBoth();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement
            .requestFullscreen({ navigationUI: 'hide' })
            .catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function toggleShortcutsOverlay(show) {
  const overlay = document.getElementById('shortcuts-overlay');
  if (overlay) overlay.classList.toggle('hidden', !show);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 10 — VISIBILITY API
   Pause all engines when tab is hidden
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupVisibilityHandler() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      masterPaused = true;
      Engine2D.stop();
      Cube3D.stop();
      AudioEngine.stop();
      console.info('[main] Tab hidden — all engines paused.');
    } else {
      masterPaused = false;
      Engine2D.start();
      Cube3D.start();
      console.info('[main] Tab visible — engines resumed.');
    }
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 11 — ORIENTATION HANDLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupOrientationHandler() {
  const target = screen.orientation || window;
  const event  = screen.orientation ? 'change' : 'orientationchange';

  target.addEventListener(event, () => {
    setTimeout(() => {
      Engine2D.resetParticles();
      const isAr = document.getElementById('html-root').lang === 'ar';
      if (window.UI) {
        UI.showToast(
          isAr ? 'تم تحديث التخطيط' : 'Layout updated',
          'info', 1500
        );
      }
    }, 350);
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 12 — MOBILE SWIPE GESTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupSwipeGesture() {
  if (window.innerWidth > 768) return;

  let startX = 0;
  let startY = 0;

  document.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx   = e.changedTouches[0].clientX - startX;
    const dy   = e.changedTouches[0].clientY - startY;
    const isAr = document.getElementById('html-root').dir === 'rtl';

    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (Math.abs(dx) < 55) return;

    const panel = document.getElementById('panel-presets');
    if (!panel) return;

    if (!isAr) {
      if (dx > 0 && startX < 30)                panel.classList.add('open');
      if (dx < 0 && panel.classList.contains('open'))
                                                 panel.classList.remove('open');
    } else {
      if (dx < 0 && startX > window.innerWidth - 30)
                                                 panel.classList.add('open');
      if (dx > 0 && panel.classList.contains('open'))
                                                 panel.classList.remove('open');
    }
  }, { passive: true });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 13 — ERROR BOUNDARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupErrorBoundary() {
  window.addEventListener('error', e => {
    console.error('[Xhaos] Error:', e.message, e.filename, e.lineno);
    if (!window._xhaosErrShown) {
      window._xhaosErrShown = true;
      if (window.UI && UI.showToast) {
        UI.showToast('Engine error — see console (F12)', 'error', 5000);
      }
    }
  });

  window.addEventListener('unhandledrejection', e => {
    console.error('[Xhaos] Unhandled promise rejection:', e.reason);
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 14 — CAPABILITY LOGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function logCapabilities() {
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2') ||
             testCanvas.getContext('webgl');

  console.info('[GeoZakhraf v2.0] Capabilities:', {
    webGL:       gl
                   ? (gl instanceof WebGL2RenderingContext
                      ? 'WebGL 2' : 'WebGL 1')
                   : 'NONE',
    renderer:    gl ? gl.getParameter(gl.RENDERER) : 'N/A',
    pixelRatio:  window.devicePixelRatio,
    screenSize:  `${window.innerWidth}×${window.innerHeight}`,
    audioAPI:    AudioEngine.isSupported()
                   ? 'Supported' : 'Not supported',
    touch:       navigator.maxTouchPoints > 0,
    language:    navigator.language,
    integration: 'canvas2d → CanvasTexture → MeshBasicMaterial → Bloom'
  });

  if (!gl) {
    console.error('[main] WebGL not available. 3D engine will fail.');
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 15 — BOOT SEQUENCE
   Ordered startup ensuring correct integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

window.addEventListener('DOMContentLoaded', async () => {

  /* Boot banner */
  console.info('╔═══════════════════════════════════════════╗');
  console.info('║   GeoZakhraf Xhaos Engine v2.0            ║');
  console.info('║   Live 2D → 3D Texture Integration        ║');
  console.info('║   60 Formulas · Inversion Symmetry        ║');
  console.info('║   canvas2d → CanvasTexture → Cube Skin    ║');
  console.info('╚═══════════════════════════════════════════╝');

  /* Step 1 — Error boundary first */
  setupErrorBoundary();

  /* Step 2 — Run loader animation */
  await runLoader();

  /* Step 3 — Show app shell */
  const app = document.getElementById('app');
  if (app) app.classList.remove('hidden');

  /* Step 4 — Log capabilities */
  logCapabilities();

  /* Step 5 — Init engines in correct order:
     Engine2D → Cube3D (needs canvas2d ready) → UI */
  initEngines();

  /* Step 6 — Start master sync loop */
  startMasterLoop();

  /* Step 7 — Auxiliary systems */
  setupKeyboard();
  setupVisibilityHandler();
  setupOrientationHandler();
  setupSwipeGesture();

  /* Step 8 — Initial texture sync HUD state */
  updateTexSyncHUD(true);

  /* Step 9 — Welcome message */
  setTimeout(() => {
    const isAr = document.getElementById('html-root').lang === 'ar';
    if (window.UI) {
      UI.showToast(
        isAr
          ? 'المكعب يرتدي الحقل الرياضي — تكامل مباشر'
          : 'Cube wears the 2D field — live integration active',
        'info',
        3500
      );
    }
  }, 800);

  console.info('[main] Boot complete. Integration active.');

});
