/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — main.js
 *
 *  Master Orchestrator & Application Bootstrap
 *  ────────────────────────────────────────────
 *  · Ordered engine initialisation (2D first, then 3D)
 *  · SyncController — Inversion Symmetry brain
 *      ↳ Rotation inversion  (CW 2D → CCW 3D)
 *      ↳ Scale inversion     (outward 2D → implode 3D)
 *      ↳ Frequency coupling  (high 2D chaos → shrink 3D)
 *      ↳ Audio reactivity    (beat → shatter, energy → bloom)
 *      ↳ BPM sync            (BPM → rotation speed)
 *  · Master RAF loop — Audio → Sync → UI each frame
 *  · PerformanceMonitor — adaptive quality scaling
 *  · Visibility API — pause when tab is hidden
 *  · Orientation handler — mobile rotation
 *  · Swipe gesture — edge swipe opens panel on mobile
 *  · Keyboard shortcuts
 *  · Error boundary
 *  · Capability logger
 *
 *  Critical Init Order:
 *  Engine2D.init() → Engine2D.start() → Cube3D.init(canvas3d, canvas2d)
 *  canvas2d must be rendering before CanvasTexture is created.
 *
 *  Architecture: Module functions + DOMContentLoaded bootstrap
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 1 — SYNC CONTROLLER
   Mathematical inversion brain.
   Reads Engine2D metrics → computes inverted
   response → pushes to Cube3D each frame.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SyncController = (function () {

  /* ── Smoothed output values ── */
  let smoothedScale   = 1.0;
  let smoothedBloom   = 1.2;
  let smoothedEnergy  = 0.0;
  let smoothedSpeed   = 1.0;

  /* ── Beat / Shatter state ── */
  let shatterArmed     = false;
  let shatterCooldown  = 0;
  const SHATTER_COOLDOWN   = 150;   /* ~2.5s at 60fps */
  const BEAT_STRENGTH_MIN  = 0.52;  /* min beat to shatter */

  /* ── Frequency history (30 frames) ──
     Tracks sustained high-chaos states */
  const FREQ_HIST_SIZE = 30;
  const freqHistory    = new Float32Array(FREQ_HIST_SIZE);
  let   freqHistIdx    = 0;

  /* ── Rotation direction smoothing ──
     Prevents jitter when 2D oscillates
     near the CW/CCW boundary */
  let lastRotDir       = 1;
  let rotDirHoldFrames = 0;
  const ROT_DIR_HOLD   = 20;  /* hold frames before switching */

  /* ── BPM rotation modulation ── */
  let bpmRotFactor = 1.0;

  /* ── Utility ── */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     tick — called every master loop frame
     @param {Object} m2d    Engine2D.getMetrics()
     @param {Object} mAudio AudioEngine.getMetrics()
     @returns {Object} syncData → Cube3D.setSyncData()
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  function tick(m2d, mAudio) {

    /* ══════════════════════════════════════════
       RULE 1 — ROTATION INVERSION
       2D clockwise  → 3D counter-clockwise
       2D CCW        → 3D clockwise
       Hold timer prevents direction flip jitter.
    ══════════════════════════════════════════ */
    let rotationDir;

    if (rotDirHoldFrames > 0) {
      /* Hold current direction during transition */
      rotationDir = lastRotDir;
      rotDirHoldFrames--;
    } else {
      /* Compute inverted direction */
      const newDir = m2d.clockwise ? -1 : 1;
      if (newDir !== lastRotDir) {
        /* Direction changed — start hold window */
        rotDirHoldFrames = ROT_DIR_HOLD;
      }
      rotationDir = newDir;
      lastRotDir  = newDir;
    }

    /* ══════════════════════════════════════════
       RULE 2 — SCALE INVERSION
       2D outwardFlow > 0 = expanding outward
       → 3D cube IMPLODES (scaleMult < 1.0)

       2D outwardFlow < 0 = collapsing inward
       → 3D cube EXPANDS (scaleMult > 1.0)

       Formula: scaleMult = 1.0 - (outward × 0.38)
       Clamped: [0.35 .. 1.65]
    ══════════════════════════════════════════ */
    const outward = Math.max(-1.0,
                    Math.min(1.0, m2d.outwardFlow || 0));
    let scaleMult = 1.0 - (outward * 0.38);
    scaleMult     = Math.max(0.35, Math.min(1.65, scaleMult));

    /* ══════════════════════════════════════════
       RULE 3 — FREQUENCY ENERGY COUPLING
       High sustained 2D energy additionally
       compresses 3D cube — "containment pressure".
       The more chaotic the 2D field, the more
       the cube is squeezed inward.
    ══════════════════════════════════════════ */
    const energy2d = Math.max(0,
                     Math.min(1, m2d.energy || 0));

    /* Track frequency history */
    freqHistory[freqHistIdx] = m2d.frequency || 0;
    freqHistIdx = (freqHistIdx + 1) % FREQ_HIST_SIZE;

    let freqAvg = 0;
    for (let i = 0; i < FREQ_HIST_SIZE; i++) {
      freqAvg += freqHistory[i];
    }
    freqAvg /= FREQ_HIST_SIZE;

    /* High sustained frequency → extra compression */
    if (freqAvg > 0.65) {
      const pressure = (freqAvg - 0.65) / 0.35;
      scaleMult -= pressure * 0.22;
      scaleMult  = Math.max(0.28, scaleMult);
    }

    /* ══════════════════════════════════════════
       RULE 4 — SMOOTH ALL VALUES
       Prevent jitter from frame-to-frame noise.
    ══════════════════════════════════════════ */
    smoothedScale  = lerp(smoothedScale,  scaleMult, 0.055);
    smoothedEnergy = lerp(smoothedEnergy, energy2d,  0.12);

    /* ══════════════════════════════════════════
       RULE 5 — AUDIO REACTIVITY
       Only active when AudioEngine has microphone.
    ══════════════════════════════════════════ */
    if (mAudio && mAudio.active) {

      /* ── 5a. Bloom from high-frequency energy ──
         Brilliance + presence + bass → neon glow.
         Range: [0.4 .. 3.8] */
      const targetBloom =
        0.5                      +
        mAudio.highEnergy  * 1.6 +
        mAudio.presEnergy  * 0.9 +
        mAudio.bassSmooth  * 0.4;
      smoothedBloom = lerp(smoothedBloom, targetBloom, 0.08);
      const clampedBloom = Math.max(
        0.4, Math.min(3.8, smoothedBloom)
      );
      try { Cube3D.setBloom(clampedBloom); } catch (e) {}

      /* ── 5b. Speed from mid + amplitude ── */
      const targetSpeed =
        1.0 +
        mAudio.midEnergy * 1.8 +
        mAudio.amplitude * 1.2;
      smoothedSpeed = lerp(smoothedSpeed, targetSpeed, 0.10);
      const clampedSpeed = Math.max(
        0.2, Math.min(4.5, smoothedSpeed)
      );
      try { Engine2D.setParams({ speed: clampedSpeed }); }
      catch (e) {}
      try { Cube3D.setParams({   speed: clampedSpeed }); }
      catch (e) {}

      /* ── 5c. Bass pulse — momentary cube expansion ──
         Strong bass briefly counter-acts inversion,
         pushing cube outward like a physical thump. */
      const bassPulse = mAudio.bassSmooth * 0.18;
      smoothedScale  += bassPulse * 0.35;
      smoothedScale   = Math.max(
        0.28, Math.min(1.85, smoothedScale)
      );

      /* ── 5d. BPM rotation modulation ──
         BPM above 120 → faster rotation
         BPM below 120 → slower rotation */
      if (mAudio.bpm > 30) {
        bpmRotFactor = lerp(
          bpmRotFactor,
          mAudio.bpm / 120.0,
          0.02
        );
        bpmRotFactor = Math.max(0.3, Math.min(2.5, bpmRotFactor));
        try {
          Cube3D.setParams({
            rotation: 0.3 * bpmRotFactor *
                      (0.8 + mAudio.amplitude * 0.5)
          });
        } catch (e) {}
      }

      /* ── 5e. Beat → shatter trigger ──
         Only fires if beat is strong enough.
         Long cooldown prevents shatter spam. */
      if (shatterCooldown > 0) shatterCooldown--;

      if (mAudio.beatDetect                          &&
          mAudio.beatStrength > BEAT_STRENGTH_MIN    &&
          !shatterArmed                              &&
          shatterCooldown === 0) {

        shatterArmed    = true;
        shatterCooldown = SHATTER_COOLDOWN;

        try { Cube3D.triggerShatter(); } catch (e) {}

        if (window.UI && UI.triggerShatterVFX) {
          UI.triggerShatterVFX();
        }

        /* Disarm after one frame gap */
        setTimeout(() => { shatterArmed = false; }, 100);
      }
    }

    /* ══════════════════════════════════════════
       BUILD SYNC PACKAGE → Cube3D
    ══════════════════════════════════════════ */
    return {
      rotationDir,               /* +1 or -1          */
      scaleMult:  smoothedScale, /* [0.28 .. 1.85]    */
      energy:     smoothedEnergy /* [0 .. 1]          */
    };
  }

  /**
   * reset — clear all smooth state.
   * Called on randomize or engine restart.
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
    freqHistIdx      = 0;
  }

  return { tick, reset };

})();


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 2 — PERFORMANCE MONITOR
   Tracks FPS and adaptively reduces quality
   when sustained low FPS is detected.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const PerformanceMonitor = (function () {

  const SAMPLE_WINDOW  = 90;
  const LOW_FPS        = 28;
  const OK_FPS         = 50;
  const CHECK_INTERVAL = 180;  /* check every N frames */

  let fpsBuffer      = new Float32Array(SAMPLE_WINDOW);
  let bufIdx         = 0;
  let totalFrames    = 0;
  let lastTs         = 0;
  let qualityReduced = false;
  let checkTimer     = 0;

  /**
   * update — call every frame with current timestamp.
   * @param  {number} ts  performance.now() timestamp
   * @returns {number} smoothed FPS
   */
  function update(ts) {
    if (lastTs === 0) { lastTs = ts; return 60; }

    const delta = ts - lastTs;
    lastTs      = ts;
    totalFrames++;
    checkTimer++;

    const instFPS        = delta > 0 ? 1000 / delta : 60;
    fpsBuffer[bufIdx]    = Math.min(instFPS, 120);
    bufIdx               = (bufIdx + 1) % SAMPLE_WINDOW;

    /* Rolling average */
    const filled = Math.min(totalFrames, SAMPLE_WINDOW);
    let   sum    = 0;
    for (let i = 0; i < filled; i++) sum += fpsBuffer[i];
    const avgFPS = sum / filled;

    /* Adaptive quality check */
    if (checkTimer >= CHECK_INTERVAL) {
      checkTimer = 0;
      adaptQuality(avgFPS);
    }

    return Math.round(avgFPS);
  }

  function adaptQuality(avgFPS) {
    if (avgFPS < LOW_FPS && !qualityReduced) {
      qualityReduced = true;

      /* Reduce particle density */
      try {
        Engine2D.setParams({ density: 1200 });
      } catch (e) {}

      console.info(
        `[PerfMonitor] Low FPS (${Math.round(avgFPS)}). ` +
        'Density → 1200.'
      );

      if (window.UI) {
        UI.showToast(
          'Performance mode: density reduced',
          'info', 3000
        );
      }

    } else if (avgFPS >= OK_FPS && qualityReduced) {
      qualityReduced = false;

      /* Restore density */
      try {
        Engine2D.setParams({ density: 2800 });
      } catch (e) {}

      console.info(
        `[PerfMonitor] FPS restored (${Math.round(avgFPS)}). ` +
        'Density → 2800.'
      );
    }
  }

  function getFrameCount() { return totalFrames; }
  function isReduced()     { return qualityReduced; }

  return { update, getFrameCount, isReduced };

})();


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 3 — LOADER SEQUENCE
   9-stage animated progress with formula preview.
   Returns Promise that resolves when complete.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function runLoader() {
  return new Promise(resolve => {

    const barFill  = document.getElementById('loader-bar-fill');
    const barGlow  = document.getElementById('loader-bar-glow');
    const percent  = document.getElementById('loader-percent');
    const status   = document.getElementById('loader-status');
    const formula  = document.getElementById('loader-formula');

    const isAr = document.getElementById('html-root').lang === 'ar';

    const stages = [
      {
        target: 8,   dur: 200,
        msg:    'Bootstrapping engine core…',
        msgAr:  'تهيئة النواة الأساسية…',
        form:   'hash(x,y) = sin(x·127.1 + y·311.7)·43758.5'
      },
      {
        target: 20,  dur: 340,
        msg:    'Loading 60 mathematical formulas…',
        msgAr:  'تحميل 60 صيغة رياضية…',
        form:   'fBm(x,y,8) = Σ 0.5ⁱ · noise(2ⁱ·x, 2ⁱ·y)'
      },
      {
        target: 33,  dur: 360,
        msg:    'Initialising 2D particle engine…',
        msgAr:  'تهيئة محرك الجسيمات ثنائي الأبعاد…',
        form:   'v(t+1) = v(t)·0.82 + cos(F(x,y,t))·speed·0.18'
      },
      {
        target: 47,  dur: 350,
        msg:    'Building live texture bridge…',
        msgAr:  'بناء جسر النسيج الحي…',
        form:   'THREE.CanvasTexture(canvas2d) → MeshBasicMaterial.map'
      },
      {
        target: 60,  dur: 330,
        msg:    'Initialising 3D cube engine…',
        msgAr:  'تهيئة محرك المكعب ثلاثي الأبعاد…',
        form:   'liveTexture.needsUpdate = true @ 60fps'
      },
      {
        target: 72,  dur: 310,
        msg:    'Configuring post-processing…',
        msgAr:  'إعداد معالجة ما بعد التصيير…',
        form:   'Bloom → ChromaAberration → FilmGrain → Screen'
      },
      {
        target: 83,  dur: 290,
        msg:    'Activating inversion sync…',
        msgAr:  'تفعيل التزامن المعكوس…',
        form:   'scaleMult = 1.0 − (outwardFlow × 0.38)'
      },
      {
        target: 93,  dur: 270,
        msg:    'Calibrating audio detector…',
        msgAr:  'معايرة كاشف الصوت…',
        form:   'beat = bassEnergy > avg × (1.6 − variance·1.5)'
      },
      {
        target: 100, dur: 240,
        msg:    'GeoZakhraf Xhaos Engine v2.0 ready.',
        msgAr:  'محرك جيو زخرف الفوضوي v2.0 جاهز.',
        form:   '2D FLOW FIELD → CANVAS TEXTURE → 3D CUBE SKIN'
      }
    ];

    let currentPct = 0;
    let stageIdx   = 0;

    function animateStage(stage) {
      const startPct  = currentPct;
      const startTime = performance.now();

      /* Update text immediately */
      if (status)  status.textContent  =
        isAr ? stage.msgAr : stage.msg;
      if (formula) formula.textContent = stage.form;

      function step(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / stage.dur, 1.0);

        /* Ease-out cubic */
        const eased = 1.0 - Math.pow(1.0 - progress, 3.0);
        const pct   = startPct +
                      (stage.target - startPct) * eased;
        currentPct = pct;

        const pctStr = pct.toFixed(1) + '%';
        if (barFill) barFill.style.width  = pctStr;
        if (barGlow) barGlow.style.width  = pctStr;
        if (percent) percent.textContent  = Math.floor(pct) + '%';

        const pb = document.getElementById('loader-progress-bar');
        if (pb) pb.setAttribute('aria-valuenow', Math.floor(pct));

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          stageIdx++;
          if (stageIdx < stages.length) {
            setTimeout(() => animateStage(stages[stageIdx]), 75);
          } else {
            setTimeout(() => fadeOutLoader(resolve), 280);
          }
        }
      }

      requestAnimationFrame(step);
    }

    animateStage(stages[stageIdx]);
  });
}

/**
 * fadeOutLoader — CSS fade + remove loader.
 * @param {Function} callback  called when done
 */
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
   Order is critical for live texture integration.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function initEngines() {

  const canvas2d = document.getElementById('canvas2d');
  const canvas3d = document.getElementById('canvas3d');

  if (!canvas2d || !canvas3d) {
    console.error('[main] Canvas elements not found.');
    return;
  }

  /* ══════════════════════════════════════════════
     STEP 1 — 2D ENGINE FIRST
     Must start rendering canvas2d before Cube3D
     creates its CanvasTexture. Ensures texture has
     valid pixel data from frame 1.
  ══════════════════════════════════════════════ */
  try {
    Engine2D.init(canvas2d);
    Engine2D.start();
    console.info(
      '[main] Engine2D started. ' +
      'Rendering to canvas2d — ready for texture mapping.'
    );
  } catch (e) {
    console.error('[main] Engine2D failed:', e);
    if (window.UI) {
      UI.showToast('2D Engine error — see console', 'error', 5000);
    }
  }

  /* ══════════════════════════════════════════════
     STEP 2 — 3D ENGINE WITH canvas2d REFERENCE
     Cube3D.init() receives canvas2d as 2nd argument.
     Internally it creates THREE.CanvasTexture(canvas2d)
     and applies it as MeshBasicMaterial.map.
     From this point: cube skin = canvas2d content.
  ══════════════════════════════════════════════ */
  try {
    Cube3D.init(canvas3d, canvas2d);
    Cube3D.start();
    console.info(
      '[main] Cube3D started. ' +
      'canvas2d → CanvasTexture → cube faces. LIVE.'
    );
  } catch (e) {
    console.error('[main] Cube3D failed:', e);
    if (window.UI) {
      UI.showToast('3D Engine error — see console', 'error', 5000);
    }
  }

  /* ══════════════════════════════════════════════
     STEP 3 — UI (after both engines are running)
  ══════════════════════════════════════════════ */
  try {
    UI.init();
    console.info('[main] UI initialised.');
  } catch (e) {
    console.error('[main] UI failed:', e);
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 5 — MASTER ANIMATION LOOP
   Handles Audio → Sync → UI coordination.
   Engine2D and Cube3D have their own RAF loops
   for rendering. This loop handles sync only.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let masterAnimId   = null;
let masterPaused   = false;
let syncFrameCount = 0;

/* Compute sync every 2nd frame for performance */
const SYNC_INTERVAL = 2;

/* Last sync data (reused on skipped frames) */
let lastSyncData = {
  rotationDir: 1,
  scaleMult:   1.0,
  energy:      0.0
};

/**
 * masterLoop — the coordination RAF loop.
 * @param {number} timestamp  performance.now()
 */
function masterLoop(timestamp) {
  masterAnimId = requestAnimationFrame(masterLoop);

  if (masterPaused) return;

  syncFrameCount++;

  /* ── Performance tracking ── */
  PerformanceMonitor.update(timestamp);

  /* ── Audio update (every frame — must be responsive) ── */
  try { AudioEngine.update(); } catch (e) {}
  const mAudio = window.AudioEngine
    ? AudioEngine.getMetrics()
    : null;

  /* ── Sync computation (every SYNC_INTERVAL frames) ── */
  if (syncFrameCount % SYNC_INTERVAL === 0) {

    let m2d = {
      frequency:   0,
      outwardFlow: 0,
      clockwise:   true,
      energy:      0,
      fps:         60
    };

    try {
      m2d = Engine2D.getMetrics();
    } catch (e) {}

    /* Compute inversion sync */
    lastSyncData = SyncController.tick(m2d, mAudio);

    /* Push sync to 3D cube */
    try {
      Cube3D.setSyncData(lastSyncData);
    } catch (e) {}

    /* Update UI sync display */
    if (window.UI) {
      try {
        UI.updateSyncHUD(m2d, lastSyncData, mAudio);
      } catch (e) {}
    }
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
   SECTION 6 — KEYBOARD SHORTCUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupKeyboard() {
  document.addEventListener('keydown', e => {

    /* Skip if typing in search field */
    if (e.target &&
        e.target.id === 'preset-search') return;

    /* Skip if modifier keys held */
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {

      /* SPACE — shatter */
      case ' ':
        e.preventDefault();
        try { Cube3D.triggerShatter(); } catch (err) {}
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

      /* T — texture mode toggle */
      case 't':
      case 'T': {
        const btn = document.getElementById('btn-tex-mode');
        if (btn) btn.click();
        break;
      }

      /* A — audio toggle */
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
        if (window.UI) UI.toggleShortcutsOverlay(true);
        break;

      /* Escape — close overlays / exit POV */
      case 'Escape': {
        if (window.UI) UI.toggleShortcutsOverlay(false);
        const povBtn = document.getElementById('btn-pov');
        if (povBtn &&
            povBtn.getAttribute('aria-pressed') === 'true') {
          povBtn.click();
        }
        break;
      }

      /* Arrow Right — next 2D preset */
      case 'ArrowRight':
        e.preventDefault();
        if (window.UI) UI.selectPresetRelative('2d', +1);
        break;

      /* Arrow Left — previous 2D preset */
      case 'ArrowLeft':
        e.preventDefault();
        if (window.UI) UI.selectPresetRelative('2d', -1);
        break;

      /* Arrow Up — next preset (same as right) */
      case 'ArrowUp':
        e.preventDefault();
        if (window.UI) UI.selectPresetRelative('2d', +1);
        break;

      /* Arrow Down — previous preset */
      case 'ArrowDown':
        e.preventDefault();
        if (window.UI) UI.selectPresetRelative('2d', -1);
        break;

      /* Number keys 1-9 — jump to preset */
      default:
        if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key) - 1;
          if (window.UI) UI.selectPreset(idx);
        }
        break;
    }
  });
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


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 7 — VISIBILITY API
   Pause all engines when browser tab is hidden.
   Saves CPU, GPU, and battery — especially on mobile.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupVisibilityHandler() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      /* Tab hidden — pause everything */
      masterPaused = true;
      try { Engine2D.stop(); }    catch (e) {}
      try { Cube3D.stop(); }      catch (e) {}
      try { AudioEngine.stop(); } catch (e) {}
      console.info('[main] Tab hidden — engines paused.');

    } else {
      /* Tab visible — resume */
      masterPaused = false;
      try { Engine2D.start(); } catch (e) {}
      try { Cube3D.start(); }   catch (e) {}
      /* Note: AudioEngine requires user gesture to restart */
      console.info('[main] Tab visible — engines resumed.');
    }
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 8 — ORIENTATION HANDLER
   Handles device rotation gracefully.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupOrientationHandler() {
  /* Modern API */
  if (screen.orientation) {
    screen.orientation.addEventListener(
      'change', onOrientationChange
    );
  } else {
    /* Legacy fallback */
    window.addEventListener(
      'orientationchange', onOrientationChange
    );
  }
}

function onOrientationChange() {
  /* Delay to let browser finish resize */
  setTimeout(() => {
    /* Clear particle trails to prevent orientation streaks */
    try { Engine2D.resetParticles(); } catch (e) {}

    const isAr =
      document.getElementById('html-root').lang === 'ar';
    if (window.UI) {
      UI.showToast(
        isAr ? 'تم تحديث التخطيط' : 'Layout updated',
        'info', 1500
      );
    }
  }, 380);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 9 — MOBILE SWIPE GESTURE
   Edge swipe from left (LTR) or right (RTL)
   opens the preset panel on mobile.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupSwipeGesture() {
  /* Only needed on mobile */
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
    const isAr = document.getElementById('html-root')
                          .dir === 'rtl';

    /* Only register predominantly horizontal swipes */
    if (Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (Math.abs(dx) < 50) return;

    const panel    = document.getElementById('panel-presets');
    const menuBtn  = document.getElementById('btn-mobile-menu');
    const backdrop = document.getElementById('panel-backdrop');

    if (!panel) return;

    const isOpen = panel.classList.contains('open');

    if (!isAr) {
      /* LTR: swipe right from left edge → open */
      if (dx > 0 && startX < 28 && !isOpen) {
        panel.classList.add('open');
        if (backdrop) backdrop.classList.add('visible');
        if (menuBtn) {
          menuBtn.classList.add('panel-open');
          menuBtn.textContent = '✕';
        }
      }
      /* LTR: swipe left → close */
      if (dx < 0 && isOpen) {
        panel.classList.remove('open');
        if (backdrop) backdrop.classList.remove('visible');
        if (menuBtn) {
          menuBtn.classList.remove('panel-open');
          menuBtn.textContent = '☰';
        }
      }
    } else {
      /* RTL: swipe left from right edge → open */
      if (dx < 0 &&
          startX > window.innerWidth - 28 &&
          !isOpen) {
        panel.classList.add('open');
        if (backdrop) backdrop.classList.add('visible');
        if (menuBtn) {
          menuBtn.classList.add('panel-open');
          menuBtn.textContent = '✕';
        }
      }
      /* RTL: swipe right → close */
      if (dx > 0 && isOpen) {
        panel.classList.remove('open');
        if (backdrop) backdrop.classList.remove('visible');
        if (menuBtn) {
          menuBtn.classList.remove('panel-open');
          menuBtn.textContent = '☰';
        }
      }
    }
  }, { passive: true });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 10 — ERROR BOUNDARY
   Catches unhandled errors and reports them
   in the UI rather than silently breaking.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupErrorBoundary() {

  window.addEventListener('error', e => {
    console.error(
      '[Xhaos] Unhandled error:',
      e.message,
      `${e.filename}:${e.lineno}`
    );

    /* Only show once per session to avoid toast spam */
    if (!window._xhaosErrShown) {
      window._xhaosErrShown = true;
      if (window.UI && UI.showToast) {
        UI.showToast(
          'Engine error — open console (F12)',
          'error', 6000
        );
      }
    }
  });

  window.addEventListener('unhandledrejection', e => {
    console.error(
      '[Xhaos] Unhandled Promise rejection:',
      e.reason
    );
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 11 — CAPABILITY LOGGER
   Logs device/browser capabilities for debugging.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function logCapabilities() {
  const testCanvas = document.createElement('canvas');
  const gl2 = testCanvas.getContext('webgl2');
  const gl1 = !gl2 && testCanvas.getContext('webgl');
  const gl  = gl2 || gl1;

  const caps = {
    webGL:        gl2 ? 'WebGL 2'
                : gl1 ? 'WebGL 1'
                      : 'NONE — 3D engine will fail',
    renderer:     gl
                  ? gl.getParameter(gl.RENDERER)
                  : 'N/A',
    pixelRatio:   window.devicePixelRatio,
    screen:       `${window.innerWidth}×${window.innerHeight}`,
    audioAPI:     window.AudioEngine &&
                  AudioEngine.isSupported()
                  ? 'Supported'
                  : 'Not supported',
    touchScreen:  navigator.maxTouchPoints > 0,
    language:     navigator.language,
    platform:     navigator.userAgentData
                  ? navigator.userAgentData.platform
                  : navigator.platform || 'unknown',
    integration:  'canvas2d → CanvasTexture → MeshBasicMaterial → Bloom'
  };

  console.info('[GeoZakhraf v2.0] Capabilities:', caps);

  if (!gl) {
    console.error(
      '[main] WebGL not available. 3D engine will not work.'
    );
  }
  if (caps.audioAPI === 'Not supported') {
    console.warn(
      '[main] Web Audio API not supported. ' +
      'Audio reactivity disabled.'
    );
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 12 — BOOT SEQUENCE
   Ordered startup — every step depends on previous.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

window.addEventListener('DOMContentLoaded', async () => {

  /* ── Boot banner ── */
  console.info('╔══════════════════════════════════════════════╗');
  console.info('║   GeoZakhraf Xhaos Engine v2.0               ║');
  console.info('║   Live 2D → 3D Texture Integration           ║');
  console.info('║   60 Formulas · Inversion Symmetry           ║');
  console.info('║   canvas2d → CanvasTexture → Cube Faces      ║');
  console.info('╚══════════════════════════════════════════════╝');

  /* Step 1 — Error boundary (always first) */
  setupErrorBoundary();

  /* Step 2 — Log capabilities */
  logCapabilities();

  /* Step 3 — Run animated loader */
  await runLoader();

  /* Step 4 — Show app shell */
  const app = document.getElementById('app');
  if (app) {
    app.classList.remove('hidden');
  }

  /* Step 5 — Initialise engines in correct order:
     Engine2D first → then Cube3D (needs canvas2d) */
  initEngines();

  /* Step 6 — Start master sync loop */
  startMasterLoop();

  /* Step 7 — Auxiliary systems */
  setupKeyboard();
  setupVisibilityHandler();
  setupOrientationHandler();
  setupSwipeGesture();

  /* Step 8 — Welcome message */
  setTimeout(() => {
    const isAr =
      document.getElementById('html-root').lang === 'ar';

    if (window.UI) {
      UI.showToast(
        isAr
          ? 'المكعب يرتدي الحقل — اختر صيغة من القائمة ☰'
          : 'Cube wears the field — pick a formula ☰',
        'info',
        4000
      );
    }
  }, 1000);

  console.info('[main] Boot complete. All systems nominal.');
  console.info('[main] Tip: Press ? to see keyboard shortcuts.');

});
