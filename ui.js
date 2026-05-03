/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — ui.js
 *
 *  Complete UI Controller — POV Exit Button Fix
 *  ─────────────────────────────────────────────
 *  KEY CHANGE: POV mode now uses a visible ✕ EXIT POV
 *  button in the corner instead of a full-screen
 *  invisible overlay. This allows the user to freely
 *  drag and rotate the cube inside POV mode without
 *  accidentally triggering an exit.
 *
 *  The button appears via CSS:
 *    .app.pov-mode .pov-exit-btn { display: flex }
 *  No JavaScript needed to show/hide it.
 *
 *  Both click and touchend are wired with
 *  stopPropagation() so the touch does not
 *  reach canvas3d drag handlers.
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.UI = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let lang           = 'en';
  let activePreset2D = 0;
  let activePreset3D = 0;
  let activeTab      = '2d';
  let panelOpen      = true;
  let povActive      = false;
  let audioActive    = false;
  let currentFilter  = '';

  /* FPS tracking */
  let fpsFrames      = 0;
  let fpsLastTime    = performance.now();
  let smoothFPS      = 60;

  /* Toast queue */
  let toastQueue     = [];
  let toastActive    = false;

  /* Beat flash hold */
  let beatFlashTimer = 0;

  /* Mobile panel elements */
  let mobileMenuBtn  = null;
  let panelBackdrop  = null;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — PRESET DATA
     60 EN names · 60 AR translations · 60 descriptions
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const PRESET_NAMES_EN = [
    'Fiber Optics',      'Digital Silk',       'Wave Turbulence',
    'Dynamic Vortex',    'Neural Grid',         'Data Blocks',
    'Sand Waves',        'Galactic River',      'Radial Drift',
    'Geometric Repeat',  'Magnetic Field',      'Ordered Chaos',
    'Fractal Spiral',    'Electric Storm',      'DNA Helix',
    'Coral Growth',      'Quantum Field',       'Topographic Map',
    'Mirror Flow',       'Smoke Simulation',    'Crystal Lattice',
    'Nebula',            'Woven Fabric',        'Black Hole',
    'Aurora Borealis',   'Voronoi Flow',        'Interference Rings',
    'Tornado',           'Neural Network',      'Galaxy Arm',
    'Liquid Marble',     'Solar Flare',         'Frozen Veins',
    'Velvet Fold',       'Band Current',        'Sonic Ripples',
    'Plasma Mesh',       'Marble Vein',         'Hyper Tunnel',
    'Biofilm Drift',     'Grid Stream',         'Cloud Chamber',
    'Ink Diffusion',     'Luminous Web',        'Harmonic Tiles',
    'Spiral Garden',     'Mercury Flow',        'Prism Wave',
    'Orbit Net',         'Ember Drift',         'Glass Refraction',
    'Ocean Current',     'Silk Bloom',          'Flux Rings',
    'Industrial Flow',   'Star Nursery',        'Wave Lattice',
    'Moiré Pulse',       'Orbital Current',     'Phantom Field'
  ];

  const PRESET_NAMES_AR = [
    'ألياف ضوئية',       'حرير رقمي',           'اضطراب موجي',
    'دوامة ديناميكية',   'شبكة عصبية',           'كتل البيانات',
    'أمواج الرمل',       'نهر المجرة',           'انجراف شعاعي',
    'تكرار هندسي',       'حقل مغناطيسي',         'فوضى منظمة',
    'حلزون كسوري',       'عاصفة كهربائية',       'حلزون الحمض النووي',
    'نمو المرجان',       'حقل كمي',              'خريطة طبوغرافية',
    'تدفق المرآة',       'محاكاة الدخان',        'شبكة بلورية',
    'سديم',              'نسيج منسوج',            'ثقب أسود',
    'الشفق القطبي',      'تدفق فورونوي',         'حلقات التداخل',
    'إعصار',             'شبكة عصبونية',         'ذراع المجرة',
    'رخام سائل',         'شعلة شمسية',           'أوردة مجمدة',
    'طية المخمل',        'تيار شريطي',           'تموجات صوتية',
    'شبكة بلازما',       'وريد رخامي',           'نفق خارق',
    'انجراف طحلبي',      'تيار شبكي',            'غرفة السحاب',
    'انتشار الحبر',      'شبكة مضيئة',           'بلاط توافقي',
    'حديقة حلزونية',     'تدفق الزئبق',          'موجة المنشور',
    'شبكة مدارية',       'انجراف الجمر',         'انكسار زجاجي',
    'تيار المحيط',       'زهرة حريرية',          'حلقات التدفق',
    'تدفق صناعي',        'مشتل النجوم',          'شبكة موجية',
    'نبض التداخل',       'تيار مداري',           'حقل خفي'
  ];

  const PRESET_DESC_EN = [
    'Layered sine/cosine with fBm fiber trails',
    'Domain-warped flowing silk texture',
    'Turbulence-displaced wave interference',
    'Angular vortex with radial pull force',
    'Quantised cellular grid flow field',
    'Rounded block data-matrix pattern',
    'fBm-displaced diagonal sand ripples',
    'Deep domain warp + turbulence overlay',
    'Concentric radar pulse rings',
    'Self-referential recursive geometry',
    'Superposition of 4 magnetic poles',
    'Structured turbulence breaking down',
    'Logarithmic spiral with fBm arms',
    'High-frequency lightning bolt noise',
    'Sinusoidal double-helix column',
    'Iterative deep warp coral structure',
    'Two-noise quantum interference field',
    'fBm heightfield gradient contours',
    'Bilaterally symmetric mirror streams',
    'Double-warp smoke with buoyancy',
    'Quadrature crystalline lattice',
    'Polar fBm nebula gas cloud',
    'Interlocking textile thread crossing',
    'Gravitational lens spacetime warp',
    'Atmospheric plasma ribbon curtain',
    '8-seed Voronoi cellular territory',
    '3-source constructive/destructive rings',
    'Tapered angular vortex column',
    '6-node neural axon signal field',
    'Multi-arm logarithmic galaxy spiral',
    'fBm-shell liquid marble veining',
    'Coronal mass ejection from star',
    'Noise-gradient dendritic ice growth',
    'Soft fBm-folded textile crease',
    'Three laminar sinusoid bands',
    'Radial acoustic membrane vibration',
    'Three-component plasma screen',
    'fBm-displaced geological stone vein',
    'Infinite tunnel perspective distortion',
    'Shallow warp organic biofilm drift',
    'Circuit board signal routing grid',
    'Cloud chamber particle track detector',
    'Ink drop diffusing in water',
    '8-anchor bioluminescent web field',
    'Fractional harmonic wave tiling',
    'Phyllotaxis-inspired spiral arms',
    'Noise-displaced liquid metal surface',
    'Multiplicative prism light refraction',
    '5 orbital center gravitational field',
    'fBm hot ember buoyancy column',
    'Noise-displaced curved glass bending',
    'Drifting ocean gyre circulation',
    'Sine x cosine silk scarf in wind',
    'Radial x angular magnetic flux tube',
    'Noise-displaced heavy flow channel',
    'Slow-drifting interstellar gas cloud',
    'Three-component standing wave lattice',
    'Near-frequency optical moire pattern',
    'Angular + radial charged particle orbit',
    'Deep warp fBm invisible force field'
  ];


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — DOM ELEMENT CACHE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const el = {};

  function cacheElements() {

    /* Header */
    el.btnLang        = document.getElementById('btn-lang');
    el.btnPov         = document.getElementById('btn-pov');
    el.btnTexMode     = document.getElementById('btn-tex-mode');
    el.btnAudio       = document.getElementById('btn-audio');
    el.btnScreenshot  = document.getElementById('btn-screenshot');
    el.btnFullscreen  = document.getElementById('btn-fullscreen');
    el.fpsValue       = document.getElementById('fps-value');
    el.beatDot        = document.getElementById('beat-dot');
    el.texDot         = document.getElementById('tex-dot');
    el.formulaDisplay = document.getElementById('formula-index-display');
    el.brandTag       = document.getElementById('brand-tag');

    /* POV exit button — the fix */
    el.btnPovExit = document.getElementById('btn-pov-exit');

    /* Panel */
    el.panelPresets   = document.getElementById('panel-presets');
    el.btnTogglePanel = document.getElementById('btn-toggle-panel');
    el.presetSearch   = document.getElementById('preset-search');
    el.presetList     = document.getElementById('preset-list');
    el.panelCount     = document.getElementById('panel-count');
    el.tabBtns        = document.querySelectorAll('.tab-btn');

    /* Sliders */
    el.sliders = {
      speed: {
        range: document.getElementById('param-speed'),
        val:   document.getElementById('val-speed')
      },
      scale: {
        range: document.getElementById('param-scale'),
        val:   document.getElementById('val-scale')
      },
      chaos: {
        range: document.getElementById('param-chaos'),
        val:   document.getElementById('val-chaos')
      },
      bloom: {
        range: document.getElementById('param-bloom'),
        val:   document.getElementById('val-bloom')
      },
      rotation: {
        range: document.getElementById('param-rotation'),
        val:   document.getElementById('val-rotation')
      },
      density: {
        range: document.getElementById('param-density'),
        val:   document.getElementById('val-density')
      },
      texOpacity: {
        range: document.getElementById('param-tex-opacity'),
        val:   document.getElementById('val-tex-opacity')
      }
    };

    /* Action buttons */
    el.btnShatter   = document.getElementById('btn-shatter');
    el.btnRandomize = document.getElementById('btn-randomize');

    /* Sync HUD */
    el.sync2dFill    = document.getElementById('sync-2d-fill');
    el.sync3dFill    = document.getElementById('sync-3d-fill');
    el.syncOmegaFill = document.getElementById('sync-omega-fill');
    el.syncTexFill   = document.getElementById('sync-tex-fill');
    el.sync2dNum     = document.getElementById('sync-2d-num');
    el.sync3dNum     = document.getElementById('sync-3d-num');
    el.syncOmegaNum  = document.getElementById('sync-omega-num');
    el.syncTexNum    = document.getElementById('sync-tex-num');
    el.dir2d         = document.getElementById('dir-2d');
    el.dir3d         = document.getElementById('dir-3d');

    /* Active label */
    el.activeLabel      = document.getElementById('active-label');
    el.activePresetNum  = document.getElementById('active-preset-num');
    el.activePresetName = document.getElementById('active-preset-name');
    el.activeEngineTag  = document.getElementById('active-engine-tag');

    /* Overlays */
    el.shortcutsOverlay  = document.getElementById('shortcuts-overlay');
    el.btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
    el.screenshotFlash   = document.getElementById('screenshot-flash');

    /* Mobile */
    mobileMenuBtn = document.getElementById('btn-mobile-menu');
    panelBackdrop = document.getElementById('panel-backdrop');
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — POV EXIT BUTTON (THE FIX)
     Replaces the full-screen invisible overlay.
     Only the ✕ button exits POV.
     The rest of the screen remains free for
     drag-to-rotate interaction on canvas3d.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * bindPOVExitButton — wire the dedicated exit button.
   * The button is shown/hidden automatically by CSS:
   *   .app.pov-mode .pov-exit-btn { display: flex }
   * JavaScript only handles the click/touch events.
   */
  function bindPOVExitButton() {
    const exitBtn = document.getElementById('btn-pov-exit');

    if (!exitBtn) {
      console.warn(
        '[UI] #btn-pov-exit not found in DOM. ' +
        'Make sure it exists in index.html.'
      );
      return;
    }

    /*
      Mouse click — stopPropagation prevents the click
      from also being processed by canvas3d handlers.
    */
    exitBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      exitPOV();
    });

    /*
      Touch end — stopPropagation AND preventDefault.
      preventDefault stops the ghost click that would
      fire 300ms later on canvas3d after touchend.
      stopPropagation prevents cube3d drag handler
      from receiving the touch event.
    */
    exitBtn.addEventListener('touchend', e => {
      e.stopPropagation();
      e.preventDefault();
      exitPOV();
    }, { passive: false });

    /*
      Also stop touchstart on the button so cube3d
      doesn't begin a drag operation when user taps it.
    */
    exitBtn.addEventListener('touchstart', e => {
      e.stopPropagation();
    }, { passive: true });

    console.info('[UI] POV exit button wired successfully.');
  }

  /**
   * exitPOV — shared exit logic.
   * Called by: exit button · header POV button · ESC key
   */
  function exitPOV() {
    if (!povActive) return;
    povActive = false;

    /* Restore camera to external position */
    try { Cube3D.setPOV(false); } catch (e) {}

    /* Remove POV class — CSS transitions UI back in */
    const app = document.getElementById('app');
    if (app) app.classList.remove('pov-mode');

    /* Reset header POV button */
    if (el.btnPov) {
      el.btnPov.classList.remove('active');
      el.btnPov.setAttribute('aria-pressed', 'false');
      el.btnPov.textContent = lang === 'ar'
        ? '⊙ منظور' : '⊙ POV';
    }

    /*
      Note: The .pov-exit-btn hides automatically
      because .app.pov-mode is removed above.
      CSS rule: .app.pov-mode .pov-exit-btn { display: flex }
      No extra JS needed to hide the button.
    */

    showToast(lang === 'ar'
      ? 'خرجت من وضع POV'
      : 'Exited POV Mode');

    console.info('[UI] POV exited.');
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — PRESET LIST BUILDER
     Uses for loop with IIFE closure to guarantee
     correct index capture per item.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildPresetList(filter) {
    filter        = (filter || '').toLowerCase().trim();
    currentFilter = filter;

    if (!el.presetList) {
      console.warn('[UI] #preset-list not found in DOM');
      return;
    }

    const isAr     = lang === 'ar';
    const names    = isAr ? PRESET_NAMES_AR : PRESET_NAMES_EN;
    const activeIdx = activePreset2D;

    const frag    = document.createDocumentFragment();
    let   visible = 0;

    for (let i = 0; i < names.length; i++) {
      const name   = names[i];
      const enName = PRESET_NAMES_EN[i].toLowerCase();
      const arName = PRESET_NAMES_AR[i];

      /* Filter check */
      if (filter) {
        const mEn  = enName.includes(filter);
        const mAr  = arName.includes(filter);
        const mNum = String(i + 1).includes(filter);
        if (!mEn && !mAr && !mNum) continue;
      }

      visible++;

      const item = document.createElement('div');
      item.className = 'preset-item';
      item.setAttribute('role', 'option');
      item.setAttribute(
        'aria-selected',
        i === activeIdx ? 'true' : 'false'
      );
      item.setAttribute('data-preset-index', i);
      item.title = PRESET_DESC_EN[i] || '';
      if (i === activeIdx) item.classList.add('active');

      const numSpan = document.createElement('span');
      numSpan.className   = 'preset-num';
      numSpan.textContent = String(i + 1).padStart(2, '0');
      numSpan.setAttribute('aria-hidden', 'true');

      const nameSpan = document.createElement('span');
      nameSpan.className   = 'preset-name';
      nameSpan.textContent = name;

      item.appendChild(numSpan);
      item.appendChild(nameSpan);

      /*
        IIFE captures `i` correctly for each iteration.
        Using forEach would NOT guarantee correct closure.
      */
      item.addEventListener('click', (function (capturedIndex) {
        return function handleClick(e) {
          e.stopPropagation();
          selectPreset(capturedIndex);
          if (window.innerWidth <= 768) {
            closeMobilePanel();
          }
        };
      }(i)));

      frag.appendChild(item);
    }

    /* Single DOM operation */
    el.presetList.innerHTML = '';
    el.presetList.appendChild(frag);

    if (el.panelCount) {
      el.panelCount.textContent =
        filter ? `${visible}/60` : '60';
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — SELECT PRESET
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function selectPreset(index) {
    const idx = Math.max(0, Math.min(59, index | 0));

    console.info(
      `[UI] selectPreset(${idx}) ` +
      `"${PRESET_NAMES_EN[idx]}" [tab:${activeTab}]`
    );

    activePreset2D = idx;

    if (window.Engine2D) {
      try {
        Engine2D.setPreset(idx);
        Engine2D.resetParticles();
      } catch (e) {
        console.error('[UI] Engine2D.setPreset failed:', e);
      }
    }

    if (activeTab === '3d' && window.Cube3D) {
      activePreset3D = idx;
      try { Cube3D.setPreset(idx); } catch (e) {}
    }

    updateActiveLabel(idx);

    if (el.formulaDisplay) {
      el.formulaDisplay.textContent =
        String(idx + 1).padStart(2, '0');
    }

    buildPresetList(currentFilter);

    requestAnimationFrame(() => {
      if (!el.presetList) return;
      const activeItem = el.presetList
        .querySelector('.preset-item.active');
      if (activeItem) {
        activeItem.scrollIntoView({
          block:    'nearest',
          behavior: 'smooth'
        });
      }
    });

    const name = lang === 'ar'
      ? PRESET_NAMES_AR[idx]
      : PRESET_NAMES_EN[idx];
    showToast(`${String(idx + 1).padStart(2, '0')} · ${name}`);
  }

  function selectPresetRelative(engine, delta) {
    const next = (activePreset2D + delta + 60) % 60;
    selectPreset(next);
    return next;
  }

  function updateActiveLabel(index) {
    const name = lang === 'ar'
      ? PRESET_NAMES_AR[index]
      : PRESET_NAMES_EN[index];

    const engineLabel = lang === 'ar'
      ? 'ثنائي ← ثلاثي مباشر'
      : '2D → 3D LIVE';

    if (el.activePresetNum) {
      el.activePresetNum.textContent =
        String(index + 1).padStart(2, '0');
    }
    if (el.activePresetName) {
      el.activePresetName.textContent = name;
    }
    if (el.activeEngineTag) {
      el.activeEngineTag.textContent = engineLabel;
    }

    if (el.activeLabel) {
      el.activeLabel.classList.remove('flash');
      void el.activeLabel.offsetWidth;
      el.activeLabel.classList.add('flash');
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — PARAMETER SLIDERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindSliders() {
    const configs = [
      {
        key: 'speed', dec: 2,
        fn: v => {
          if (window.Engine2D) Engine2D.setParams({ speed: v });
          if (window.Cube3D)   Cube3D.setParams({   speed: v });
        }
      },
      {
        key: 'scale', dec: 2,
        fn: v => {
          if (window.Engine2D) Engine2D.setParams({ scale: v });
          if (window.Cube3D)   Cube3D.setParams({   scale: v });
        }
      },
      {
        key: 'chaos', dec: 2,
        fn: v => {
          if (window.Engine2D) Engine2D.setParams({ chaos: v });
          if (window.Cube3D)   Cube3D.setParams({   chaos: v });
        }
      },
      {
        key: 'bloom', dec: 2,
        fn: v => { if (window.Cube3D) Cube3D.setBloom(v); }
      },
      {
        key: 'rotation', dec: 2,
        fn: v => { if (window.Cube3D) Cube3D.setParams({ rotation: v }); }
      },
      {
        key: 'density', dec: 0,
        fn: v => { if (window.Engine2D) Engine2D.setParams({ density: v }); }
      },
      {
        key: 'texOpacity', dec: 2,
        fn: v => { if (window.Cube3D) Cube3D.setParams({ texOpacity: v }); }
      }
    ];

    configs.forEach(cfg => {
      const s = el.sliders[cfg.key];
      if (!s || !s.range) return;

      s.range.addEventListener('input', () => {
        const v = parseFloat(s.range.value);
        if (s.val) {
          s.val.textContent = cfg.dec > 0
            ? v.toFixed(cfg.dec)
            : Math.round(v).toString();
        }
        s.range.setAttribute('aria-valuenow', v);
        try { cfg.fn(v); } catch (e) {}
      });

      s.range.addEventListener('touchstart', e => {
        e.stopPropagation();
      }, { passive: true });
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — HEADER BUTTON HANDLERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindHeaderButtons() {

    /* ── Language ── */
    if (el.btnLang) {
      el.btnLang.addEventListener('click', () => {
        lang = lang === 'en' ? 'ar' : 'en';
        applyLanguage();
        buildPresetList(currentFilter);
        updateActiveLabel(activePreset2D);
        showToast(lang === 'ar'
          ? 'تم التبديل إلى العربية'
          : 'Switched to English');
      });
    }

    /* ── POV Mode ── */
    if (el.btnPov) {
      el.btnPov.addEventListener('click', () => {
        if (!povActive) {

          /* ── ENTER POV ── */
          povActive = true;

          try { Cube3D.setPOV(true); } catch (e) {}

          const app = document.getElementById('app');
          if (app) app.classList.add('pov-mode');

          el.btnPov.classList.add('active');
          el.btnPov.setAttribute('aria-pressed', 'true');
          el.btnPov.textContent = lang === 'ar'
            ? '⊙ خروج' : '⊙ EXIT';

          showToast(lang === 'ar'
            ? 'وضع POV — اسحب للنظر · اضغط ✕ للخروج'
            : 'POV Mode — drag to look · tap ✕ to exit');

          /*
            The .pov-exit-btn becomes visible automatically
            via CSS: .app.pov-mode .pov-exit-btn { display:flex }
            No JavaScript needed here.
          */

        } else {

          /* ── EXIT POV via header button ── */
          exitPOV();
        }
      });
    }

    /* ── Texture Mode Toggle ── */
    if (el.btnTexMode) {
      el.btnTexMode.addEventListener('click', () => {
        let isNowTex = true;
        try {
          isNowTex = Cube3D.toggleTextureMode();
        } catch (e) {
          console.error('[UI] toggleTextureMode:', e);
        }

        el.btnTexMode.classList.toggle('active', isNowTex);
        el.btnTexMode.setAttribute('aria-pressed', isNowTex);

        const isAr = lang === 'ar';
        el.btnTexMode.textContent = isNowTex
          ? (isAr ? '⬡ نسيج حي' : '⬡ TEX')
          : (isAr ? '⬡ شيدر'    : '⬡ GLSL');

        if (el.texDot) {
          el.texDot.classList.toggle('inactive', !isNowTex);
        }

        showToast(isNowTex
          ? (isAr
             ? 'النسيج الحي — المكعب يرتدي الجسيمات'
             : 'Live Texture Mode')
          : (isAr
             ? 'وضع الشيدر — صيغ GLSL مستقلة'
             : 'Shader Overlay Mode'));
      });
    }

    /* ── Audio ── */
    if (el.btnAudio) {
      el.btnAudio.addEventListener('click', async () => {

        if (!window.AudioEngine || !AudioEngine.isSupported()) {
          showToast(lang === 'ar'
            ? 'الصوت غير مدعوم'
            : 'Audio not supported', 'error');
          return;
        }

        if (!audioActive) {
          el.btnAudio.textContent =
            lang === 'ar' ? '⏳ انتظر' : '⏳ WAIT';
          el.btnAudio.disabled = true;

          const ok = await AudioEngine.init();
          el.btnAudio.disabled = false;

          if (ok) {
            audioActive = true;
            el.btnAudio.classList.add('active');
            el.btnAudio.setAttribute('aria-pressed', 'true');
            el.btnAudio.textContent =
              lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
            showToast(lang === 'ar'
              ? 'المايكروفون نشط'
              : 'Microphone active');
          } else {
            el.btnAudio.textContent =
              lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
            showToast(lang === 'ar'
              ? 'تعذّر الوصول للمايكروفون'
              : 'Microphone access denied', 'error');
          }

        } else {
          try { AudioEngine.stop(); } catch (e) {}
          audioActive = false;
          el.btnAudio.classList.remove('active');
          el.btnAudio.setAttribute('aria-pressed', 'false');
          el.btnAudio.textContent =
            lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
          showToast(lang === 'ar'
            ? 'تم إيقاف الصوت' : 'Audio stopped');
        }
      });
    }

    /* ── Screenshot ── */
    if (el.btnScreenshot) {
      el.btnScreenshot.addEventListener('click', takeScreenshot);
    }

    /* ── Fullscreen ── */
    if (el.btnFullscreen) {
      el.btnFullscreen.addEventListener('click', toggleFullscreen);
      document.addEventListener('fullscreenchange', () => {
        const full = !!document.fullscreenElement;
        if (el.btnFullscreen) {
          el.btnFullscreen.textContent = full
            ? (lang === 'ar' ? '⛶ خروج' : '⛶ EXIT')
            : (lang === 'ar' ? '⛶ كامل' : '⛶ FULL');
        }
      });
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — ACTION BUTTONS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindActionButtons() {

    if (el.btnShatter) {
      el.btnShatter.addEventListener('click', () => {
        try { Cube3D.triggerShatter(); } catch (e) {}
        triggerShatterVFX();
        showToast(
          lang === 'ar' ? '⚡ تحطيم!' : '⚡ SHATTERING!',
          'beat'
        );
      });
    }

    if (el.btnRandomize) {
      el.btnRandomize.addEventListener('click', randomizeBoth);
    }
  }

  function randomizeBoth() {
    let i2d = Math.floor(Math.random() * 60);
    let i3d = Math.floor(Math.random() * 60);
    while (i3d === i2d) {
      i3d = Math.floor(Math.random() * 60);
    }

    try { Engine2D.setPreset(i2d); Engine2D.resetParticles(); }
    catch (e) {}
    try { Cube3D.setPreset(i3d); } catch (e) {}

    activePreset2D = i2d;
    activePreset3D = i3d;

    updateActiveLabel(i2d);

    if (el.formulaDisplay) {
      el.formulaDisplay.textContent =
        String(i2d + 1).padStart(2, '0');
    }

    buildPresetList(currentFilter);

    showToast(lang === 'ar'
      ? `نسيج: ${String(i2d+1).padStart(2,'0')} · طبقة: ${String(i3d+1).padStart(2,'0')}`
      : `Texture: #${i2d+1} · Overlay: #${i3d+1}`);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — MOBILE MENU & PANEL CONTROLS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindMobileMenu() {
    if (!mobileMenuBtn) return;

    mobileMenuBtn.addEventListener('click', () => {
      panelOpen = !panelOpen;
      openMobilePanel(panelOpen);
    });

    if (panelBackdrop) {
      panelBackdrop.addEventListener('click', () => {
        closeMobilePanel();
      });
    }
  }

  function openMobilePanel(open) {
    if (!el.panelPresets) return;
    el.panelPresets.classList.toggle('open', open);
    if (panelBackdrop) {
      panelBackdrop.classList.toggle('visible', open);
    }
    if (mobileMenuBtn) {
      mobileMenuBtn.classList.toggle('panel-open', open);
      mobileMenuBtn.textContent = open ? '✕' : '☰';
      mobileMenuBtn.setAttribute('aria-expanded', open);
    }
  }

  function closeMobilePanel() {
    panelOpen = false;
    if (el.panelPresets) el.panelPresets.classList.remove('open');
    if (panelBackdrop)   panelBackdrop.classList.remove('visible');
    if (mobileMenuBtn) {
      mobileMenuBtn.classList.remove('panel-open');
      mobileMenuBtn.textContent = '☰';
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
    updatePanelToggleIcon();
  }

  function bindPanelControls() {

    if (el.btnTogglePanel) {
      el.btnTogglePanel.addEventListener('click', () => {
        panelOpen = !panelOpen;
        if (window.innerWidth <= 768) {
          openMobilePanel(panelOpen);
        } else {
          if (el.panelPresets) {
            el.panelPresets.classList.toggle(
              'collapsed', !panelOpen
            );
          }
        }
        updatePanelToggleIcon();
        el.btnTogglePanel.setAttribute(
          'aria-expanded', panelOpen
        );
      });
    }

    if (el.tabBtns) {
      el.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          el.tabBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          activeTab = btn.dataset.tab;
          buildPresetList(currentFilter);
          updateActiveLabel(activePreset2D);
          showToast(activeTab === '2d'
            ? (lang === 'ar'
               ? 'مصدر النسيج — يتحكم في الجسيمات والمكعب'
               : 'Texture Source — drives particles & cube')
            : (lang === 'ar'
               ? 'طبقة GLSL فوق النسيج الحي'
               : 'GLSL Overlay over live texture'));
        });
      });
    }

    if (el.presetSearch) {
      el.presetSearch.addEventListener('input', () => {
        buildPresetList(el.presetSearch.value);
      });
      el.presetSearch.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          el.presetSearch.value = '';
          buildPresetList('');
          el.presetSearch.blur();
        }
      });
    }
  }

  function updatePanelToggleIcon() {
    if (!el.btnTogglePanel) return;
    const isRTL = lang === 'ar';
    el.btnTogglePanel.textContent = panelOpen
      ? (isRTL ? '›' : '‹')
      : (isRTL ? '‹' : '›');
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 11 — SHORTCUTS OVERLAY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindShortcutsOverlay() {
    if (el.btnCloseShortcuts) {
      el.btnCloseShortcuts.addEventListener('click', () => {
        toggleShortcutsOverlay(false);
      });
    }
    if (el.shortcutsOverlay) {
      el.shortcutsOverlay.addEventListener('click', e => {
        if (e.target === el.shortcutsOverlay) {
          toggleShortcutsOverlay(false);
        }
      });
    }
  }

  function toggleShortcutsOverlay(show) {
    if (!el.shortcutsOverlay) return;
    el.shortcutsOverlay.classList.toggle('hidden', !show);
    if (show && el.btnCloseShortcuts) {
      el.btnCloseShortcuts.focus();
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 12 — SCREENSHOT & FULLSCREEN
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function takeScreenshot() {
    try {
      if (el.screenshotFlash) {
        el.screenshotFlash.classList.remove('hidden');
        el.screenshotFlash.classList.add('active');
        setTimeout(() => {
          el.screenshotFlash.classList.remove('active');
          setTimeout(() => {
            el.screenshotFlash.classList.add('hidden');
          }, 450);
        }, 50);
      }

      const dataURL = Cube3D.captureFrame();
      const link    = document.createElement('a');
      link.download = `geozakhraf-v2-${Date.now()}.png`;
      link.href     = dataURL;
      link.click();

      showToast(lang === 'ar'
        ? 'تم حفظ اللقطة' : 'Screenshot saved');

    } catch (e) {
      console.error('[UI] Screenshot failed:', e);
      showToast(lang === 'ar'
        ? 'فشل حفظ اللقطة' : 'Screenshot failed', 'error');
    }
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


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 13 — SHATTER VFX
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function triggerShatterVFX() {
    const overlay     = document.createElement('div');
    overlay.className = 'shatter-overlay';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 750);

    if (el.btnShatter) {
      el.btnShatter.classList.add('beat-active');
      setTimeout(() => {
        el.btnShatter.classList.remove('beat-active');
      }, 350);
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 14 — TOAST NOTIFICATION SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function showToast(message, type, duration) {
    type     = type     || 'info';
    duration = duration || 2000;
    toastQueue.push({ message, type, duration });
    if (!toastActive) processToastQueue();
  }

  function processToastQueue() {
    if (toastQueue.length === 0) {
      toastActive = false;
      return;
    }

    toastActive = true;
    const { message, type, duration } = toastQueue.shift();

    const toast     = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    if (lang === 'ar') toast.dir = 'rtl';

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    setTimeout(() => {
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        toast.remove();
        processToastQueue();
      }, 350);
    }, duration);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 15 — LANGUAGE SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function applyLanguage() {
    const html = document.getElementById('html-root');
    const isAr = lang === 'ar';

    html.lang = lang;
    html.dir  = isAr ? 'rtl' : 'ltr';

    if (el.btnLang) {
      el.btnLang.textContent = isAr ? 'EN' : 'AR';
      el.btnLang.title = isAr
        ? 'Switch to English' : 'التبديل إلى العربية';
    }

    if (el.brandTag) {
      el.brandTag.textContent = isAr
        ? 'محرك الفوضى' : 'XHAOS ENGINE';
    }

    document.querySelectorAll('[data-en]').forEach(elem => {
      const arText = elem.dataset.ar;
      if (arText !== undefined) {
        elem.textContent = isAr ? arText : elem.dataset.en;
      }
    });

    if (el.presetSearch) {
      el.presetSearch.placeholder = isAr
        ? 'البحث عن صيغة…' : 'Search formula…';
    }

    if (el.btnShatter) {
      el.btnShatter.textContent =
        isAr ? '⚡ تحطيم' : '⚡ SHATTER';
    }
    if (el.btnRandomize) {
      el.btnRandomize.textContent =
        isAr ? '⚄ عشوائي' : '⚄ RANDOMIZE';
    }
    if (el.btnPov) {
      el.btnPov.textContent = povActive
        ? (isAr ? '⊙ خروج' : '⊙ EXIT')
        : (isAr ? '⊙ منظور' : '⊙ POV');
    }
    if (el.btnAudio) {
      el.btnAudio.textContent =
        isAr ? '♫ صوت' : '♫ AUDIO';
    }
    if (el.btnScreenshot) {
      el.btnScreenshot.textContent =
        isAr ? '⬡ التقاط' : '⬡ CAP';
    }
    if (el.btnFullscreen) {
      el.btnFullscreen.textContent =
        !!document.fullscreenElement
          ? (isAr ? '⛶ خروج' : '⛶ EXIT')
          : (isAr ? '⛶ كامل' : '⛶ FULL');
    }
    if (el.btnTexMode) {
      const isTex = el.btnTexMode.classList.contains('active');
      el.btnTexMode.textContent = isTex
        ? (isAr ? '⬡ نسيج حي' : '⬡ TEX')
        : (isAr ? '⬡ شيدر'    : '⬡ GLSL');
    }

    /* POV exit button text */
    if (el.btnPovExit) {
      el.btnPovExit.textContent = isAr
        ? '✕ خروج POV' : '✕ EXIT POV';
    }

    /* Slider labels */
    const sliderLabels = {
      speed:      ['SPEED',    'السرعة'    ],
      scale:      ['SCALE',    'النطاق'    ],
      chaos:      ['CHAOS',    'الفوضى'    ],
      bloom:      ['BLOOM',    'الإضاءة'   ],
      rotation:   ['ROTATION', 'الدوران'   ],
      density:    ['DENSITY',  'الكثافة'   ],
      texOpacity: ['TEX',      'نسيج'      ]
    };

    Object.entries(sliderLabels).forEach(([key, [en, ar]]) => {
      const s = el.sliders[key];
      if (!s || !s.range) return;
      const label = s.range.previousElementSibling;
      if (label && label.tagName === 'LABEL') {
        label.textContent = isAr ? ar : en;
      }
    });

    if (el.tabBtns) {
      el.tabBtns.forEach(btn => {
        btn.textContent = btn.dataset.tab === '2d'
          ? (isAr ? 'مصدر النسيج' : '2D SOURCE')
          : (isAr ? 'طبقة ثلاثية'  : '3D OVERLAY');
      });
    }

    const syncTitle = document.querySelector('.sync-title');
    if (syncTitle) {
      syncTitle.textContent = isAr
        ? 'تزامن الانعكاس' : 'INVERSION SYNC';
    }

    const dirLabel = document.querySelector('.dir-label');
    if (dirLabel) {
      dirLabel.textContent = isAr ? 'الدوران' : 'ROTATION';
    }

    const shHeader =
      document.querySelector('.shortcuts-header span');
    if (shHeader) {
      shHeader.textContent = isAr
        ? 'اختصارات لوحة المفاتيح'
        : 'KEYBOARD SHORTCUTS';
    }

    if (mobileMenuBtn) {
      mobileMenuBtn.setAttribute(
        'aria-label',
        isAr ? 'فتح قائمة الصيغ' : 'Open formula panel'
      );
    }

    updatePanelToggleIcon();
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 16 — SYNC HUD UPDATER
     Called every frame from main.js
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function updateSyncHUD(m2d, sync, mAudio) {

    const freq2d   = Math.min(Math.abs(m2d.frequency   || 0), 1.0);
    const scale3d  = Math.min(Math.abs(1.0 - (sync.scaleMult || 1.0)), 1.0);
    const omega    = mAudio ? Math.min(mAudio.bassSmooth || 0, 1.0) : 0;

    const pct2d    = Math.round(freq2d  * 100);
    const pct3d    = Math.round(scale3d * 100);
    const pctOmega = Math.round(omega   * 100);

    if (el.sync2dFill)    el.sync2dFill.style.width    = pct2d    + '%';
    if (el.sync3dFill)    el.sync3dFill.style.width    = pct3d    + '%';
    if (el.syncOmegaFill) el.syncOmegaFill.style.width = pctOmega + '%';
    if (el.sync2dNum)     el.sync2dNum.textContent     = pct2d    + '%';
    if (el.sync3dNum)     el.sync3dNum.textContent     = pct3d    + '%';
    if (el.syncOmegaNum)  el.syncOmegaNum.textContent  = pctOmega + '%';

    /* Texture sync row */
    let isLiveTex = true;
    try {
      const ts  = Cube3D.getTexSyncStatus();
      isLiveTex = ts.mode === 'LIVE_TEXTURE';
    } catch (e) {}

    if (el.syncTexFill) {
      el.syncTexFill.style.width =
        isLiveTex ? '100%' : '22%';
      el.syncTexFill.style.background = isLiveTex
        ? 'linear-gradient(90deg,rgba(0,240,255,.3),#00ff88)'
        : 'linear-gradient(90deg,rgba(139,0,255,.3),#8b00ff)';
    }
    if (el.syncTexNum) {
      el.syncTexNum.textContent =
        isLiveTex ? 'LIVE' : 'GLSL';
      el.syncTexNum.style.color = isLiveTex
        ? 'var(--green)' : 'var(--violet)';
    }

    /* Direction arrows */
    if (el.dir2d) el.dir2d.textContent = m2d.clockwise ? '↻' : '↺';
    if (el.dir3d) el.dir3d.textContent = m2d.clockwise ? '↺' : '↻';

    /* FPS counter */
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLastTime >= 500) {
      smoothFPS = Math.round(
        fpsFrames / ((now - fpsLastTime) / 1000)
      );
      smoothFPS   = Math.min(smoothFPS, 999);
      fpsFrames   = 0;
      fpsLastTime = now;

      if (el.fpsValue) {
        el.fpsValue.textContent = smoothFPS;
        el.fpsValue.style.color =
          smoothFPS >= 50 ? '#00ff88' :
          smoothFPS >= 30 ? '#ffd700' : '#ff2244';
      }
    }

    /* Beat indicator */
    if (mAudio && el.beatDot) {
      if (mAudio.beatDetect) {
        el.beatDot.classList.add('active');
        beatFlashTimer = 6;
        if (el.btnShatter) {
          el.btnShatter.classList.add('beat-active');
          setTimeout(() => {
            el.btnShatter.classList.remove('beat-active');
          }, 250);
        }
      } else {
        beatFlashTimer = Math.max(0, beatFlashTimer - 1);
        if (beatFlashTimer === 0) {
          el.beatDot.classList.remove('active');
        }
      }
      if (mAudio.bpm > 0) {
        el.beatDot.title = `${mAudio.bpm} BPM`;
      }
    }

    /* Tex dot */
    if (el.texDot) {
      el.texDot.classList.toggle('inactive', !isLiveTex);
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 17 — TOAST CSS INJECTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function injectToastStyles() {
    if (document.getElementById('toast-styles')) return;

    const style   = document.createElement('style');
    style.id      = 'toast-styles';
    style.textContent = `
      .toast {
        position:        fixed;
        bottom:          calc(var(--bar-h, 72px) + var(--safe-bottom, 0px) + 12px);
        left:            50%;
        transform:       translateX(-50%) translateY(20px);
        z-index:         1000;
        padding:         8px 20px;
        border-radius:   var(--r-md, 8px);
        font-family:     var(--font-mono, monospace);
        font-size:       0.68rem;
        letter-spacing:  0.08em;
        color:           var(--text-bright, #f0f8ff);
        background:      rgba(0, 8, 28, 0.92);
        border:          1px solid rgba(0, 200, 255, 0.25);
        backdrop-filter: blur(14px);
        pointer-events:  none;
        white-space:     nowrap;
        opacity:         0;
        max-width:       85vw;
        overflow:        hidden;
        text-overflow:   ellipsis;
        transition:      opacity 0.24s ease,
                         transform 0.24s
                         cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .toast-visible {
        opacity:   1;
        transform: translateX(-50%) translateY(0);
      }
      .toast-hiding {
        opacity:   0;
        transform: translateX(-50%) translateY(-8px);
      }
      .toast-error {
        border-color: rgba(255, 34, 68, 0.45);
        background:   rgba(40, 0, 8, 0.94);
        color:        #ff8899;
      }
      .toast-beat {
        border-color: rgba(255, 215, 0, 0.45);
        background:   rgba(20, 15, 0, 0.94);
        color:        var(--gold, #ffd700);
      }
    `;
    document.head.appendChild(style);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 18 — INIT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function init() {
    /* 1. Toast CSS */
    injectToastStyles();

    /* 2. Cache DOM */
    cacheElements();

    /* 3. Wire POV exit button — MUST be before
       bindHeaderButtons so exitPOV() is defined */
    bindPOVExitButton();

    /* 4. Build preset list */
    buildPresetList();

    /* 5. Wire all controls */
    bindSliders();
    bindHeaderButtons();
    bindActionButtons();
    bindMobileMenu();
    bindPanelControls();
    bindShortcutsOverlay();

    /* 6. Apply language */
    applyLanguage();

    /* 7. Initial active label */
    updateActiveLabel(0);

    /* 8. Verify */
    const itemCount = el.presetList
      ? el.presetList.querySelectorAll('.preset-item').length
      : 0;

    console.info(
      `[UI] v2.0 ready. ` +
      `Presets: ${itemCount}. ` +
      `POV exit btn: ${el.btnPovExit ? 'OK' : 'MISSING'}. ` +
      `Mobile menu: ${mobileMenuBtn ? 'OK' : 'MISSING'}.`
    );

    if (itemCount === 0) {
      console.error('[UI] No preset items created!');
    }

    /* 9. Welcome toast */
    setTimeout(() => {
      showToast(lang === 'ar'
        ? 'اختر صيغة من القائمة ☰'
        : 'Pick a formula from the panel ☰',
        'info', 3500);
    }, 900);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PUBLIC API
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  return {
    init,
    updateSyncHUD,
    showToast,
    selectPreset,
    selectPresetRelative,
    randomizeBoth,
    triggerShatterVFX,
    applyLanguage,
    toggleShortcutsOverlay
  };

})();
