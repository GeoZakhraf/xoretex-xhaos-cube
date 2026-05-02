/**
 * ═══════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — main.js
 *  Application Bootstrap · SyncController
 *  Ties Engine2D ↔ Cube3D with Inversion Logic
 * ═══════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════
   SYNC CONTROLLER
   Implements the Reverse Pattern Synchronization:
   · Outward 2D flow  → 3D implosion (scale shrink)
   · CW 2D rotation   → CCW 3D rotation
   · High 2D frequency → 3D scale reduction / shatter
══════════════════════════════════════════════ */

const SyncController = (function () {

  let shatterArmed = false;
  let shatterCooldown = 0;

  function tick(m2d, mAudio) {
    const sync = {};

    /* ── 1. Inverted Rotation Direction ──
       2D clockwise  → 3D counter-clockwise (dir = -1)
       2D CCW        → 3D clockwise         (dir = +1) */
    sync.rotationDir = m2d.clockwise ? -1 : 1;

    /* ── 2. Reactive Scaling ──
       High 2D outward energy  → 3D shrinks
       Negative (inward) 2D   → 3D grows
       Range: [0.5 ... 1.5] */
    const outward   = m2d.outwardFlow;          // –∞ to +∞, normalised approx –1 to 1
    sync.scaleMult  = 1.0 - (outward * 0.35);  // outward → smaller
    sync.scaleMult  = Math.max(0.4, Math.min(1.6, sync.scaleMult));

    /* ── 3. Audio Override ──
       Bass beat   → shatter trigger
       High energy → bloom boost */
    if (mAudio && mAudio.active) {
      // Bloom driven by high frequencies
      const bloomBoost = 1.2 + mAudio.highEnergy * 2.5;
      Cube3D.setBloom(bloomBoost);

      // Beat → shatter (with cooldown)
      shatterCooldown = Math.max(0, shatterCooldown - 1);
      if (mAudio.beatDetect && !shatterArmed && shatterCooldown === 0) {
        shatterArmed    = true;
        shatterCooldown = 120; // ~2s at 60fps
        Cube3D.triggerShatter();
        shatterArmed = false;
      }

      // Amplitude modulates speed
      Engine2D.setParams({ speed: 1.0 + mAudio.amplitude * 2.5 });
      Cube3D.setParams({   speed: 1.0 + mAudio.amplitude * 2.5 });
    }

    return sync;
  }

  return { tick };

})();

/* ══════════════════════════════════════════════
   LOADER SIMULATION
══════════════════════════════════════════════ */

function simulateLoader(onComplete) {
  const bar     = document.getElementById('loader-bar');
  const percent = document.getElementById('loader-percent');
  let   pct     = 0;

  const steps = [
    { target: 25,  label: 'Loading shaders…'          },
    { target: 55,  label: 'Building formula library…'  },
    { target: 75,  label: 'Initializing 3D engine…'   },
    { target: 90,  label: 'Composing post-processing…' },
    { target: 100, label: 'GeoZakhraf ready.'           }
  ];

  let stepIdx = 0;

  function advance() {
    if (stepIdx >= steps.length) { onComplete(); return; }
    const step = steps[stepIdx++];
    const duration = 300 + Math.random() * 400;
    const startPct = pct;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      pct = startPct + (step.target - startPct) * progress;

      bar.style.width     = pct + '%';
      percent.textContent = Math.floor(pct) + '%';

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pct = step.target;
        setTimeout(advance, 100);
      }
    }
    requestAnimationFrame(animate);
  }

  advance();
}

/* ══════════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {

  simulateLoader(() => {
    /* Hide loader, show app */
    document.getElementById('loader').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');

    /* Init engines */
    Engine2D.init(document.getElementById('canvas2d'));
    Cube3D.init(document.getElementById('canvas3d'));
    UI.init();

    /* Start render loops */
    Engine2D.start();
    Cube3D.start();

    /* ── Master Loop ──
       Runs SyncController each frame at ~60fps */
    let lastSync = 0;
    function masterTick(ts) {
      requestAnimationFrame(masterTick);

      // Throttle sync to every 2nd frame for performance
      if (ts - lastSync < 16) return;
      lastSync = ts;

      AudioEngine.update();

      const m2d   = Engine2D.getMetrics();
      const mAudio = AudioEngine.getMetrics();

      const syncData = SyncController.tick(m2d, mAudio);
      Cube3D.setSyncData(syncData);

      UI.updateSyncHUD(m2d, syncData);
    }
    requestAnimationFrame(masterTick);

    /* Keyboard shortcuts */
    document.addEventListener('keydown', e => {
      switch (e.key) {
        case ' ':  Cube3D.triggerShatter();                          break;
        case 'r':  document.getElementById('btn-randomize').click(); break;
        case 'p':  document.getElementById('btn-pov').click();       break;
        case 'f':  document.getElementById('btn-fullscreen').click();break;
        case 'ArrowRight':
          Engine2D.setPreset((Engine2D.getMetrics && 0) || 0); break;
      }
    });
  });
});
