/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — main.js
 *
 *  Application Bootstrap & Master Orchestrator
 *
 *  · Loader sequence with staged progress simulation
 *  · SyncController — Inversion Symmetry brain
 *      ↳ Rotation Inversion  (CW 2D → CCW 3D)
 *      ↳ Scale Inversion     (outward 2D → implode 3D)
 *      ↳ Audio Reactivity    (beat → shatter, energy → bloom)
 *      ↳ Frequency Coupling  (high 2D chaos → shrink 3D)
 *  · Master RAF loop — ties all engines together
 *  · Performance monitor — adaptive quality scaling
 *  · Error boundary — graceful degradation
 *  · Visibility API — pause when tab is hidden
 *  · Mobile orientation handler
 *
 *  Architecture: IIFE + top-level DOMContentLoaded
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 1 — SYNC CONTROLLER
   The mathematical "brain" that links
   Engine2D and Cube3D with inversion logic.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SyncController = (function () {

  /* ── Internal State ── */
  let shatterArmed    = false;
  let shatterCooldown = 0;     // frames
  const SHATTER_COOLDOWN = 150; // ~2.5s at 60fps

  /* ── Smoothed sync values ──
     We smooth the raw metrics before passing to
     Cube3D to avoid jittery scale/bloom changes. */
  let smoothedScale  = 1.0;
  let smoothedBloom  = 1.2;
  let smoothedEnergy = 0.0;

  /* ── History for frequency analysis ── */
  const FREQ_HISTORY  = 30;
  const freqHistory   = new Float32Array(FREQ_HISTORY);
  let   freqHistIdx   = 0;

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     tick — called every frame from master loop
     Returns sync data object for Cube3D.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * tick — compute inversion sync for this frame.
   *
   * Inversion Rules:
   *  1. CW 2D rotation  → CCW 3D rotation  (dir = -1)
   *  2. Outward 2D flow → 3D implodes      (scale < 1)
   *  3. High 2D energy  → 3D shrinks more  (stronger scale reduction)
   *  4. Audio beat      → trigger shatter
   *  5. Audio high-freq → drive bloom up
   *  6. Audio amplitude → modulate speed
   *
   * @param {Object} m2d    Engine2D.getMetrics()
   * @param {Object} mAudio AudioEngine.getMetrics()
   * @returns {Object} syncData for Cube3D.setSyncData()
   */
  function tick(m2d, mAudio) {

    /* ── 1. ROTATION INVERSION ────────────────────
       2D clockwise  → 3D counter-clockwise
       2D CCW        → 3D clockwise

       The visual result: the two systems always
       spin in opposite directions, creating a
       "balanced tension" aesthetic.
    ─────────────────────────────────────────── */
    const rotationDir = m2d.clockwise ? -1 : 1;

    /* ── 2. SCALE INVERSION ───────────────────────
       outwardFlow > 0 = 2D expanding outward
       → 3D should IMPLODE (scale shrinks)

       outwardFlow < 0 = 2D collapsing inward
       → 3D should EXPAND (scale grows)

       Formula: scaleMult = 1.0 - (outward × factor)
       Clamped to [0.35 .. 1.65] for stability.
    ─────────────────────────────────────────── */
    const outward   = Math.max(-1, Math.min(1, m2d.outwardFlow || 0));
    let   scaleMult = 1.0 - (outward * 0.38);
    scaleMult       = Math.max(0.35, Math.min(1.65, scaleMult));

    /* ── 3. ENERGY-REACTIVE FREQUENCY COUPLING ────
       High 2D particle energy (fast-moving chaos)
       additionally reduces 3D scale, creating a
       "containment" effect where wild 2D activity
       compresses the 3D cube further.
    ─────────────────────────────────────────── */
    const energy2d  = Math.max(0, Math.min(1, m2d.energy || 0));

    /* Track frequency history for smoothed reading */
    freqHistory[freqHistIdx] = m2d.frequency || 0;
    freqHistIdx = (freqHistIdx + 1) % FREQ_HISTORY;

    let freqAvg = 0;
    for (let i = 0; i < FREQ_HISTORY; i++) freqAvg += freqHistory[i];
    freqAvg /= FREQ_HISTORY;

    /* High sustained frequency → additional shrink */
    if (freqAvg > 0.7) {
      const shrinkFactor = (freqAvg - 0.7) / 0.3; // 0..1
      scaleMult -= shrinkFactor * 0.25;
      scaleMult  = Math.max(0.28, scaleMult);
    }

    /* ── 4. SMOOTH ALL VALUES ─────────────────────
       Prevent jitter from frame-to-frame noise.
       Different rates: scale is slow, energy is fast.
    ─────────────────────────────────────────── */
    smoothedScale  = lerp(smoothedScale,  scaleMult, 0.055);
    smoothedEnergy = lerp(smoothedEnergy, energy2d,  0.12);

    /* ── 5. AUDIO PROCESSING ──────────────────────
       Only active when AudioEngine is running.
    ─────────────────────────────────────────── */
    let audioBloom  = null;
    let audioSpeed  = null;

    if (mAudio && mAudio.active) {

      /* ── 5a. Bloom driven by high-frequency energy ──
         Brilliance/presence → more bloom glow
         Range: [0.6 .. 3.5] */
      const targetBloom = 0.6 +
        mAudio.highEnergy  * 1.4 +
        mAudio.presEnergy  * 0.8 +
        mAudio.bassSmooth  * 0.5;
      smoothedBloom = lerp(smoothedBloom, targetBloom, 0.08);
      audioBloom    = Math.max(0.4, Math.min(3.5, smoothedBloom));

      /* ── 5b. Speed driven by mid energy ──
         Mid-range energy makes both engines
         run faster, creating reactive urgency. */
      audioSpeed = 1.0 +
        mAudio.midEnergy  * 1.8 +
        mAudio.amplitude  * 1.2;
      audioSpeed = Math.max(0.3, Math.min(4.5, audioSpeed));

      /* ── 5c. Additional scale modulation from bass ──
         Strong bass → momentary cube pulse outward
         (inverse to normal rule — bass "pushes" the cube) */
      const bassPulse = mAudio.bassSmooth * 0.2;
      smoothedScale  += bassPulse * 0.4;
      smoothedScale   = Math.max(0.28, Math.min(1.8, smoothedScale));

      /* ── 5d. Beat → shatter trigger ──
         With adaptive cooldown to prevent
         shattering on every single kick drum.
         Only fires if beat strength is significant. */
      shatterCooldown = Math.max(0, shatterCooldown - 1);

      if (mAudio.beatDetect        &&
          mAudio.beatStrength > 0.55 &&
          !shatterArmed            &&
          shatterCooldown === 0) {

        shatterArmed    = true;
        shatterCooldown = SHATTER_COOLDOWN;

        Cube3D.triggerShatter();
        UI.triggerShatterVFX();

        /* Disarm after a frame */
        setTimeout(() => { shatterArmed = false; }, 100);
      }

      /* ── 5e. Apply audio-driven speed to engines ── */
      Engine2D.setParams({ speed: audioSpeed });
      Cube3D.setParams({   speed: audioSpeed });

      /* ── 5f. Apply bloom to 3D ── */
      Cube3D.setBloom(audioBloom);

      /* ── 5g. BPM-sync auto-rotation ──
         Gently nudge rotation speed toward BPM rhythm. */
      if (mAudio.bpm > 0) {
        const bpmFactor = mAudio.bpm / 120.0; // normalise around 120 BPM
        Cube3D.setParams({
          rotation: 0.3 * bpmFactor * (0.8 + mAudio.amplitude * 0.4)
        });
      }
    }

    /* ── 6. BUILD & RETURN SYNC DATA ────────────── */
    return {
      rotationDir,
      scaleMult: smoothedScale,
      energy:    smoothedEnergy
    };
  }

  /* ── Utility: linear interpolation ── */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ── Reset smooth state (e.g. on preset change) ── */
  function reset() {
    smoothedScale  = 1.0;
    smoothedBloom  = 1.2;
    smoothedEnergy = 0.0;
    freqHistory.fill(0);
    freqHistIdx    = 0;
    shatterCooldown = 0;
    shatterArmed   = false;
  }

  return { tick, reset };

})();


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 2 — PERFORMANCE MONITOR
   Tracks FPS and adaptively reduces quality
   if the device can't sustain 60 FPS.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const PerformanceMonitor = (function () {

  const SAMPLE_WINDOW = 90;        // frames to average
  const TARGET_FPS    = 60;
  const LOW_FPS       = 28;        // quality reduction threshold
  const OK_FPS        = 50;        // quality restoration threshold

  let fpsBuffer       = new Float32Array(SAMPLE_WINDOW);
  let bufferIdx       = 0;
  let frameCount      = 0;
  let lastTs          = 0;
  let qualityReduced  = false;
  let qualityCheckTimer = 0;

  const CHECK_INTERVAL = 180;     // check quality every N frames

  /**
   * update — call every frame with current timestamp.
   * Returns smoothed FPS.
   */
  function update(ts) {
    if (lastTs === 0) { lastTs = ts; return TARGET_FPS; }

    const delta    = ts - lastTs;
    lastTs         = ts;
    frameCount++;
    qualityCheckTimer++;

    /* Instantaneous FPS from delta */
    const instFPS = delta > 0 ? 1000 / delta : TARGET_FPS;

    /* Store in circular buffer */
    fpsBuffer[bufferIdx] = instFPS;
    bufferIdx = (bufferIdx + 1) % SAMPLE_WINDOW;

    /* Average FPS over window */
    let sum = 0;
    const filled = Math.min(frameCount, SAMPLE_WINDOW);
    for (let i = 0; i < filled; i++) sum += fpsBuffer[i];
    const avgFPS = sum / filled;

    /* Adaptive quality adjustment every CHECK_INTERVAL frames */
    if (qualityCheckTimer >= CHECK_INTERVAL) {
      qualityCheckTimer = 0;
      adaptQuality(avgFPS);
    }

    return Math.round(avgFPS);
  }

  /**
   * adaptQuality — reduce or restore particle density
   * based on sustained FPS.
   */
  function adaptQuality(avgFPS) {
    if (avgFPS < LOW_FPS && !qualityReduced) {
      /* Reduce density to recover FPS */
      qualityReduced = true;
      Engine2D.setParams({ density: 1200 });
      console.info(
        `[PerfMonitor] FPS dropped to ${avgFPS}. ` +
        'Reducing particle density to 1200.'
      );
      UI.showToast('Performance mode: density reduced', 'info', 3000);

    } else if (avgFPS >= OK_FPS && qualityReduced) {
      /* Restore quality */
      qualityReduced = false;
      Engine2D.setParams({ density: 2800 });
      console.info(
        `[PerfMonitor] FPS restored to ${avgFPS}. ` +
        'Restoring particle density to 2800.'
      );
    }
  }

  function getFrameCount() { return frameCount; }
  function isReduced()     { return qualityReduced; }

  return { update, getFrameCount, isReduced };

})();


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 3 — LOADER SEQUENCE
   Staged progress bar with realistic status messages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * runLoader — animate the loading screen.
 * Returns a Promise that resolves when complete.
 *
 * @returns {Promise<void>}
 */
function runLoader() {
  return new Promise(resolve => {

    const barFill  = document.getElementById('loader-bar-fill');
    const barGlow  = document.getElementById('loader-bar-glow');
    const percent  = document.getElementById('loader-percent');
    const status   = document.getElementById('loader-status');
    const formula  = document.getElementById('loader-formula');

    /* Loading stage definitions */
    const stages = [
      {
        target:   8,
        duration: 200,
        message:  'Bootstrapping engine core…',
        messageAr:'تهيئة النواة الأساسية…',
        formula:  'n(x, y) = hash(x·127.1 + y·311.7)'
      },
      {
        target:   20,
        duration: 350,
        message:  'Loading mathematical library…',
        messageAr:'تحميل المكتبة الرياضية…',
        formula:  'fBm(x, y, 8) = Σ aⁱ · noise(fⁱ · x, fⁱ · y)'
      },
      {
        target:   35,
        duration: 400,
        message:  'Compiling 60 GLSL shaders…',
        messageAr:'تجميع 60 شيدر GLSL…',
        formula:  'warp(p, t, n) → iterative noise offset domain'
      },
      {
        target:   50,
        duration: 380,
        message:  'Initialising 3D scene…',
        messageAr:'تهيئة المشهد ثلاثي الأبعاد…',
        formula:  'F(x,y,t) = atan2(y−cy, x−cx) + 0.6t + pull'
      },
      {
        target:   63,
        duration: 320,
        message:  'Building particle system…',
        messageAr:'بناء نظام الجسيمات…',
        formula:  'v(t+1) = v(t)·0.82 + cos(angle)·speed·0.18'
      },
      {
        target:   75,
        duration: 350,
        message:  'Configuring post-processing…',
        messageAr:'إعداد معالجة ما بعد التصيير…',
        formula:  'bloom(x) = UnrealBloom(strength=1.2, radius=0.6)'
      },
      {
        target:   85,
        duration: 300,
        message:  'Activating inversion sync…',
        messageAr:'تفعيل التزامن المعكوس…',
        formula:  'scaleMult = 1.0 − (outwardFlow × 0.38)'
      },
      {
        target:   94,
        duration: 280,
        message:  'Calibrating audio analyser…',
        messageAr:'معايرة محلل الصوت…',
        formula:  'beat = bassEnergy > avg × (1.6 − variance·1.5)'
      },
      {
        target:   100,
        duration: 250,
        message:  'GeoZakhraf ready.',
        messageAr:'جيو زخرف جاهز.',
        formula:  'F(x,y,t) = 7·fBm(warp(0.003x, 0.003y, 0.15t, 4)) + atan2·0.2'
      }
    ];

    /* Detect language from HTML element */
    const isAr = document.getElementById('html-root').lang === 'ar';

    let currentPct = 0;
    let stageIdx   = 0;

    /**
     * animateToTarget — smoothly animate progress bar
     * from currentPct to stage.target over stage.duration ms.
     */
    function animateToTarget(stage) {
      const startPct   = currentPct;
      const targetPct  = stage.target;
      const startTime  = performance.now();
      const dur        = stage.duration;

      /* Update text immediately */
      if (status)  status.textContent  =
        isAr ? stage.messageAr : stage.message;
      if (formula) formula.textContent = stage.formula;

      function step(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / dur, 1.0);

        /* Ease-out cubic */
        const eased = 1 - Math.pow(1 - progress, 3);
        const pct   = startPct + (targetPct - startPct) * eased;

        currentPct = pct;

        /* Update bar */
        const pctStr = pct.toFixed(1) + '%';
        if (barFill)  barFill.style.width  = pctStr;
        if (barGlow)  barGlow.style.width  = pctStr;
        if (percent)  percent.textContent  = Math.floor(pct) + '%';

        /* ARIA */
        const progressBar = document.getElementById('loader-progress-bar');
        if (progressBar) progressBar.setAttribute('aria-valuenow', Math.floor(pct));

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          /* Advance to next stage */
          stageIdx++;
          if (stageIdx < stages.length) {
            setTimeout(() => animateToTarget(stages[stageIdx]), 80);
          } else {
            /* All stages complete — fade out loader */
            setTimeout(() => fadeOutLoader(resolve), 300);
          }
        }
      }

      requestAnimationFrame(step);
    }

    /* Begin first stage */
    animateToTarget(stages[stageIdx]);
  });
}

/**
 * fadeOutLoader — CSS fade + remove loader element.
 * @param {Function} callback  called when fade is complete
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * initEngines — start all three engines and the UI.
 * Wrapped in try/catch for graceful degradation.
 */
function initEngines() {
  try {
    /* ── 2D Flow-Field Engine ── */
    Engine2D.init(document.getElementById('canvas2d'));
    Engine2D.start();
    console.info('[main] Engine2D started.');

  } catch (e) {
    console.error('[main] Engine2D failed:', e);
    UI.showToast('2D Engine error — check console', 'error', 5000);
  }

  try {
    /* ── 3D Cube Engine ── */
    Cube3D.init(document.getElementById('canvas3d'));
    Cube3D.start();
    console.info('[main] Cube3D started.');

  } catch (e) {
    console.error('[main] Cube3D failed:', e);
    UI.showToast('3D Engine error — check console', 'error', 5000);
  }

  try {
    /* ── UI System ── */
    UI.init();
    console.info('[main] UI initialised.');

  } catch (e) {
    console.error('[main] UI failed:', e);
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 5 — MASTER ANIMATION LOOP
   Orchestrates all engines each frame.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let masterAnimId   = null;
let masterPaused   = false;

/* Throttle sync to every N frames for performance */
const SYNC_INTERVAL = 2;
let   syncFrameCount = 0;

/* Last computed sync data (reused on skipped frames) */
let lastSyncData = {
  rotationDir: 1,
  scaleMult:   1.0,
  energy:      0.0
};

/**
 * masterLoop — the single RAF loop that
 * coordinates Engine2D, Cube3D, Audio, and Sync.
 *
 * Engine2D and Cube3D have their own internal RAF loops
 * for rendering. This loop only handles:
 *  - Audio updates
 *  - SyncController computation
 *  - UI metric updates
 *  - Performance monitoring
 */
function masterLoop(timestamp) {
  masterAnimId = requestAnimationFrame(masterLoop);

  if (masterPaused) return;

  syncFrameCount++;

  /* ── Audio Update (every frame for responsiveness) ── */
  AudioEngine.update();
  const mAudio = AudioEngine.getMetrics();

  /* ── Sync Computation (every SYNC_INTERVAL frames) ── */
  if (syncFrameCount % SYNC_INTERVAL === 0) {

    const m2d      = Engine2D.getMetrics();
    lastSyncData   = SyncController.tick(m2d, mAudio);

    /* Push sync data to 3D engine */
    Cube3D.setSyncData(lastSyncData);

    /* ── UI Metric Updates ── */
    UI.updateSyncHUD(m2d, lastSyncData, mAudio);
  }

  /* ── Performance Monitor (every frame) ── */
  PerformanceMonitor.update(timestamp);
}

/**
 * startMasterLoop — begin the master orchestration loop.
 */
function startMasterLoop() {
  if (!masterAnimId) {
    masterAnimId = requestAnimationFrame(masterLoop);
    console.info('[main] Master loop started.');
  }
}

/**
 * stopMasterLoop — halt the master loop.
 */
function stopMasterLoop() {
  if (masterAnimId) {
    cancelAnimationFrame(masterAnimId);
    masterAnimId = null;
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 6 — VISIBILITY API
   Pause/resume when the browser tab is hidden.
   Saves CPU, GPU, and battery on mobile.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupVisibilityHandler() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      /* Tab hidden — pause all rendering */
      masterPaused = true;
      Engine2D.stop();
      Cube3D.stop();
      console.info('[main] Tab hidden — engines paused.');

    } else {
      /* Tab visible again — resume */
      masterPaused = false;
      Engine2D.start();
      Cube3D.start();
      console.info('[main] Tab visible — engines resumed.');
    }
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 7 — ORIENTATION HANDLER
   Handles mobile device rotation gracefully.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupOrientationHandler() {

  /* Modern API */
  if (screen.orientation) {
    screen.orientation.addEventListener('change', onOrientationChange);
  } else {
    /* Legacy fallback */
    window.addEventListener('orientationchange', onOrientationChange);
  }
}

function onOrientationChange() {
  /* Small delay to let browser finish resize */
  setTimeout(() => {
    /* Engines handle their own resize via window resize listener.
       We just reset particles to avoid orientation-change streaks. */
    Engine2D.resetParticles();

    UI.showToast(
      document.documentElement.lang === 'ar'
        ? 'تم تحديث التخطيط'
        : 'Layout updated',
      'info',
      1500
    );
  }, 350);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 8 — GLOBAL ERROR BOUNDARY
   Catches unhandled errors and shows them in the UI
   rather than silently breaking.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupErrorBoundary() {

  window.addEventListener('error', e => {
    console.error('[Xhaos] Unhandled error:', e.message, e.filename, e.lineno);

    /* Don't spam the UI — only show once per session */
    if (!window._xhaosErrorShown) {
      window._xhaosErrorShown = true;
      /* Only show if UI is initialised */
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
   SECTION 9 — MOBILE SWIPE PANEL GESTURE
   Swipe right from left edge → open panel
   Swipe left from panel → close panel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setupSwipeGesture() {
  if (window.innerWidth > 768) return; // desktop only uses click

  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    /* Only register horizontal swipes */
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (Math.abs(dx) < 55) return; // minimum swipe distance

    const panel = document.getElementById('panel-presets');
    if (!panel) return;

    const isRTL = document.documentElement.dir === 'rtl';

    if (!isRTL) {
      /* LTR: swipe right from left edge → open */
      if (dx > 0 && touchStartX < 30) {
        panel.classList.add('open');
      }
      /* LTR: swipe left → close */
      if (dx < 0 && panel.classList.contains('open')) {
        panel.classList.remove('open');
      }
    } else {
      /* RTL: swipe left from right edge → open */
      if (dx < 0 && touchStartX > window.innerWidth - 30) {
        panel.classList.add('open');
      }
      /* RTL: swipe right → close */
      if (dx > 0 && panel.classList.contains('open')) {
        panel.classList.remove('open');
      }
    }
  }, { passive: true });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 10 — BOOT SEQUENCE
   Ordered startup: loader → engines → UI → loops
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

window.addEventListener('DOMContentLoaded', async () => {

  console.info('═══════════════════════════════════════');
  console.info('  GeoZakhraf Xhaos Engine v2.0');
  console.info('  Mathematical Generative Art Platform');
  console.info('  60 Formulas · Inversion Sync Active');
  console.info('═══════════════════════════════════════');

  /* ── Step 1: Error boundary (first, always) ── */
  setupErrorBoundary();

  /* ── Step 2: Run loading sequence ── */
  await runLoader();

  /* ── Step 3: Show app shell ── */
  const app = document.getElementById('app');
  if (app) app.classList.remove('hidden');

  /* ── Step 4: Initialise all engines & UI ── */
  initEngines();

  /* ── Step 5: Start master orchestration loop ── */
  startMasterLoop();

  /* ── Step 6: Setup auxiliary systems ── */
  setupVisibilityHandler();
  setupOrientationHandler();
  setupSwipeGesture();

  /* ── Step 7: Log capability info ── */
  logCapabilities();

  console.info('[main] Boot sequence complete. All systems nominal.');
});


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION 11 — CAPABILITY LOGGER
   Logs device/browser capabilities to console
   for debugging on different devices.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function logCapabilities() {
  const gl = document.createElement('canvas')
                      .getContext('webgl2') ||
             document.createElement('canvas')
                      .getContext('webgl');

  const caps = {
    webGL:       gl ? (gl instanceof WebGL2RenderingContext
                       ? 'WebGL 2' : 'WebGL 1') : 'NONE',
    renderer:    gl ? gl.getParameter(gl.RENDERER) : 'N/A',
    pixelRatio:  window.devicePixelRatio,
    screenSize:  `${window.innerWidth}×${window.innerHeight}`,
    audioAPI:    AudioEngine.isSupported() ? 'Supported' : 'Not supported',
    touchScreen: navigator.maxTouchPoints > 0,
    language:    navigator.language,
    platform:    navigator.platform || 'unknown'
  };

  console.info('[Capabilities]', caps);

  /* Warn if WebGL 1 only */
  if (caps.webGL === 'WebGL 1') {
    console.warn('[main] WebGL 2 not available. Some effects may be limited.');
  }

  /* Warn if audio not supported */
  if (caps.audioAPI === 'Not supported') {
    console.warn('[main] Web Audio API not supported. Audio reactivity disabled.');
  }
}
