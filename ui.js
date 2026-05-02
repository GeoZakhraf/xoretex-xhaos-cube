/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — ui.js (COMPLETE PATCHED)
 *
 *  FIXES APPLIED:
 *  1. Pattern change — selectPreset() full verified chain
 *  2. POV exit — dedicated transparent overlay div
 *     captures click AND touchend independently
 *  3. buildPresetList() — for loop with closure-safe index
 *  4. Console logging for debug verification
 *  5. All sections complete — no omissions
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.UI = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let lang            = 'en';
  let activePreset2D  = 0;
  let activePreset3D  = 0;
  let activeTab       = '2d';
  let panelOpen       = true;
  let povActive       = false;
  let audioActive     = false;
  let currentFilter   = '';

  /* FPS tracking */
  let fpsFrames       = 0;
  let fpsLastTime     = performance.now();
  let smoothFPS       = 60;

  /* Toast queue */
  let toastQueue      = [];
  let toastActive     = false;

  /* Beat flash hold */
  let beatFlashTimer  = 0;

  /* POV exit overlay reference */
  let povExitOverlay  = null;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — PRESET DATA
     60 English names + 60 Arabic translations
     + 60 English tooltip descriptions
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
    'ألياف ضوئية',        'حرير رقمي',           'اضطراب موجي',
    'دوامة ديناميكية',    'شبكة عصبية',           'كتل البيانات',
    'أمواج الرمل',        'نهر المجرة',           'انجراف شعاعي',
    'تكرار هندسي',        'حقل مغناطيسي',         'فوضى منظمة',
    'حلزون كسوري',        'عاصفة كهربائية',       'حلزون الحمض النووي',
    'نمو المرجان',        'حقل كمي',              'خريطة طبوغرافية',
    'تدفق المرآة',        'محاكاة الدخان',        'شبكة بلورية',
    'سديم',               'نسيج منسوج',            'ثقب أسود',
    'الشفق القطبي',       'تدفق فورونوي',         'حلقات التداخل',
    'إعصار',              'شبكة عصبونية',         'ذراع المجرة',
    'رخام سائل',          'شعلة شمسية',           'أوردة مجمدة',
    'طية المخمل',         'تيار شريطي',           'تموجات صوتية',
    'شبكة بلازما',        'وريد رخامي',           'نفق خارق',
    'انجراف طحلبي',       'تيار شبكي',            'غرفة السحاب',
    'انتشار الحبر',       'شبكة مضيئة',           'بلاط توافقي',
    'حديقة حلزونية',      'تدفق الزئبق',          'موجة المنشور',
    'شبكة مدارية',        'انجراف الجمر',         'انكسار زجاجي',
    'تيار المحيط',        'زهرة حريرية',          'حلقات التدفق',
    'تدفق صناعي',         'مشتل النجوم',          'شبكة موجية',
    'نبض التداخل',        'تيار مداري',           'حقل خفي'
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
     All references stored once at init time
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const el = {};

  function cacheElements() {

    /* ── Header ── */
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

    /* ── Panel ── */
    el.panelPresets   = document.getElementById('panel-presets');
    el.btnTogglePanel = document.getElementById('btn-toggle-panel');
    el.presetSearch   = document.getElementById('preset-search');
    el.presetList     = document.getElementById('preset-list');
    el.panelCount     = document.getElementById('panel-count');
    el.tabBtns        = document.querySelectorAll('.tab-btn');

    /* ── Sliders ── */
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

    /* ── Action buttons ── */
    el.btnShatter   = document.getElementById('btn-shatter');
    el.btnRandomize = document.getElementById('btn-randomize');

    /* ── Sync HUD ── */
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

    /* ── Active label ── */
    el.activeLabel      = document.getElementById('active-label');
    el.activePresetNum  = document.getElementById('active-preset-num');
    el.activePresetName = document.getElementById('active-preset-name');
    el.activeEngineTag  = document.getElementById('active-engine-tag');

    /* ── Overlays ── */
    el.shortcutsOverlay  = document.getElementById('shortcuts-overlay');
    el.btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
    el.screenshotFlash   = document.getElementById('screenshot-flash');

    /* ── Canvases ── */
    el.canvas3d = document.getElementById('canvas3d');
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — POV EXIT OVERLAY (CREATED EARLY)
     Must exist before bindHeaderButtons() is called.
     A transparent div placed over everything at
     z-index 150 that only shows during POV mode.
     Captures both click and touchend to exit POV.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function createPOVExitOverlay() {
    povExitOverlay             = document.createElement('div');
    povExitOverlay.id          = 'pov-exit-overlay';
    povExitOverlay.setAttribute('aria-label', 'Click or tap to exit POV mode');
    povExitOverlay.style.cssText = [
      'position: fixed',
      'inset: 0',
      'z-index: 150',
      'cursor: pointer',
      'display: none',
      'background: transparent'
    ].join(';');

    document.body.appendChild(povExitOverlay);

    /* Mouse click exit */
    povExitOverlay.addEventListener('click', function () {
      exitPOV();
    });

    /* Touch tap exit — needs passive:false and preventDefault
       to prevent the touch from also firing on canvas3d */
    povExitOverlay.addEventListener('touchend', function (e) {
      e.preventDefault();
      exitPOV();
    }, { passive: false });
  }

  /* Shared POV exit function */
  function exitPOV() {
    if (!povActive) return;
    povActive = false;

    /* Tell 3D engine to restore external camera */
    try { Cube3D.setPOV(false); } catch (e) {}

    /* Remove app class — CSS transition restores UI */
    const app = document.getElementById('app');
    if (app) app.classList.remove('pov-mode');

    /* Update button state */
    if (el.btnPov) {
      el.btnPov.classList.remove('active');
      el.btnPov.setAttribute('aria-pressed', 'false');
    }

    /* Hide the exit overlay */
    if (povExitOverlay) {
      povExitOverlay.style.display = 'none';
    }

    const isAr = lang === 'ar';
    showToast(isAr ? 'خرجت من وضع POV' : 'Exited POV Mode');
    console.info('[UI] POV mode exited via overlay tap/click.');
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — PRESET LIST BUILDER (FIXED)
     Uses for loop (not forEach) to guarantee
     correct closure capture of index per item.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildPresetList(filter) {
    filter        = (filter || '').toLowerCase().trim();
    currentFilter = filter;

    if (!el.presetList) {
      console.warn('[UI] buildPresetList: #preset-list not found in DOM');
      return;
    }

    const isAr     = lang === 'ar';
    const names    = isAr ? PRESET_NAMES_AR : PRESET_NAMES_EN;
    const activeIdx = activePreset2D;

    const frag    = document.createDocumentFragment();
    let   visible = 0;

    /* ── FIXED: use for loop not forEach ──
       forEach with an inner function does NOT
       guarantee the correct `i` is captured
       when the click fires asynchronously.
       With `for (let i = ...)` the block scope
       of `let` creates a fresh binding per iteration. */
    for (let i = 0; i < names.length; i++) {

      const name   = names[i];
      const enName = PRESET_NAMES_EN[i].toLowerCase();
      const arName = PRESET_NAMES_AR[i];

      /* Apply search filter */
      if (filter) {
        const matchEn  = enName.includes(filter);
        const matchAr  = arName.includes(filter);
        const matchNum = String(i + 1).includes(filter);
        if (!matchEn && !matchAr && !matchNum) continue;
      }

      visible++;

      /* Create item element */
      const item = document.createElement('div');
      item.className = 'preset-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
      item.setAttribute('data-preset-index', i);
      item.title = PRESET_DESC_EN[i] || '';
      if (i === activeIdx) item.classList.add('active');

      /* Number badge + name */
      const numSpan  = document.createElement('span');
      numSpan.className   = 'preset-num';
      numSpan.textContent = String(i + 1).padStart(2, '0');
      numSpan.setAttribute('aria-hidden', 'true');

      const nameSpan  = document.createElement('span');
      nameSpan.className   = 'preset-name';
      nameSpan.textContent = name;

      item.appendChild(numSpan);
      item.appendChild(nameSpan);

      /* ── FIXED: `i` is safely captured by `let` block scope ── */
      item.addEventListener('click', (function (capturedIndex) {
        return function handlePresetClick(e) {
          e.stopPropagation();
          selectPreset(capturedIndex);
          if (window.innerWidth <= 768) closeMobilePanel();
        };
      }(i)));

      frag.appendChild(item);
    }

    /* Batch DOM update — single reflow */
    el.presetList.innerHTML = '';
    el.presetList.appendChild(frag);

    /* Update count badge */
    if (el.panelCount) {
      el.panelCount.textContent = filter
        ? `${visible}/60`
        : '60';
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — SELECT PRESET (FIXED + VERIFIED)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * selectPreset — activate formula on Engine2D.
   * In v2.0 the cube automatically gets the formula
   * via CanvasTexture — no extra Cube3D call needed
   * unless in shader overlay mode.
   *
   * @param {number} index  0-based formula index [0..59]
   */
  function selectPreset(index) {
    /* Clamp to valid range */
    const idx = Math.max(0, Math.min(59, index | 0));

    console.info(
      `[UI] selectPreset(${idx}) — ` +
      `"${PRESET_NAMES_EN[idx]}" ` +
      `[tab: ${activeTab}]`
    );

    /* ── Update 2D engine — this drives the texture ── */
    activePreset2D = idx;

    if (window.Engine2D) {
      try {
        Engine2D.setPreset(idx);
        Engine2D.resetParticles();
        console.info(`[UI] Engine2D preset set to ${idx}`);
      } catch (e) {
        console.error('[UI] Engine2D.setPreset failed:', e);
      }
    } else {
      console.error('[UI] Engine2D not available!');
    }

    /* ── If in 3D overlay tab also update shader ── */
    if (activeTab === '3d' && window.Cube3D) {
      activePreset3D = idx;
      try {
        Cube3D.setPreset(idx);
      } catch (e) {
        console.error('[UI] Cube3D.setPreset failed:', e);
      }
    }

    /* ── Update active label badge ── */
    updateActiveLabel(idx);

    /* ── Update formula chip in header ── */
    if (el.formulaDisplay) {
      el.formulaDisplay.textContent = String(idx + 1).padStart(2, '0');
    }

    /* ── Rebuild preset list to update active highlight ── */
    buildPresetList(currentFilter);

    /* ── Scroll active item into view ── */
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

    /* ── Toast notification ── */
    const name = lang === 'ar'
      ? PRESET_NAMES_AR[idx]
      : PRESET_NAMES_EN[idx];
    showToast(`${String(idx + 1).padStart(2, '0')} · ${name}`);
  }

  /**
   * selectPresetRelative — cycle preset by delta.
   * Called by keyboard ← → ↑ ↓ in main.js.
   */
  function selectPresetRelative(engine, delta) {
    const current = activePreset2D;
    const next    = (current + delta + 60) % 60;
    selectPreset(next);
    return next;
  }

  /**
   * updateActiveLabel — update the floating badge
   * at bottom-left showing current formula.
   */
  function updateActiveLabel(index) {
    const name = lang === 'ar'
      ? PRESET_NAMES_AR[index]
      : PRESET_NAMES_EN[index];

    const engineLabel = lang === 'ar'
      ? 'ثنائي ← ثلاثي مباشر'
      : '2D → 3D LIVE';

    if (el.activePresetNum) {
      el.activePresetNum.textContent = String(index + 1).padStart(2, '0');
    }
    if (el.activePresetName) {
      el.activePresetName.textContent = name;
    }
    if (el.activeEngineTag) {
      el.activeEngineTag.textContent = engineLabel;
    }

    /* Trigger flash animation */
    if (el.activeLabel) {
      el.activeLabel.classList.remove('flash');
      /* Force reflow to restart animation */
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
        key: 'speed',
        dec: 2,
        fn:  v => {
          Engine2D.setParams({ speed: v });
          Cube3D.setParams({   speed: v });
        }
      },
      {
        key: 'scale',
        dec: 2,
        fn:  v => {
          Engine2D.setParams({ scale: v });
          Cube3D.setParams({   scale: v });
        }
      },
      {
        key: 'chaos',
        dec: 2,
        fn:  v => {
          Engine2D.setParams({ chaos: v });
          Cube3D.setParams({   chaos: v });
        }
      },
      {
        key: 'bloom',
        dec: 2,
        fn:  v => { Cube3D.setBloom(v); }
      },
      {
        key: 'rotation',
        dec: 2,
        fn:  v => { Cube3D.setParams({ rotation: v }); }
      },
      {
        key: 'density',
        dec: 0,
        fn:  v => { Engine2D.setParams({ density: v }); }
      },
      {
        /* v2.0 — texture opacity/depth */
        key: 'texOpacity',
        dec: 2,
        fn:  v => { Cube3D.setParams({ texOpacity: v }); }
      }
    ];

    configs.forEach(cfg => {
      const s = el.sliders[cfg.key];
      if (!s || !s.range) return;

      s.range.addEventListener('input', () => {
        const v = parseFloat(s.range.value);

        /* Update display value */
        if (s.val) {
          s.val.textContent = cfg.dec > 0
            ? v.toFixed(cfg.dec)
            : Math.round(v).toString();
        }

        /* Update ARIA */
        s.range.setAttribute('aria-valuenow', v);

        /* Notify engines */
        try { cfg.fn(v); } catch (e) {}
      });

      /* Prevent panel scrolling while adjusting slider on mobile */
      s.range.addEventListener('touchstart', e => {
        e.stopPropagation();
      }, { passive: true });
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — HEADER BUTTON HANDLERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindHeaderButtons() {

    /* ── Language Toggle ── */
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

    /* ── POV Mode (FIXED) ── */
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

          const isAr = lang === 'ar';
          showToast(isAr
            ? 'وضع POV — اضغط في أي مكان للخروج'
            : 'POV Mode — tap anywhere to exit');

          /* Show exit overlay AFTER a 500ms delay.
             This prevents the same click that entered POV
             from immediately exiting it via the overlay. */
          setTimeout(() => {
            if (povExitOverlay && povActive) {
              povExitOverlay.style.display = 'block';
            }
          }, 500);

        } else {
          /* ── EXIT POV via button ── */
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
          console.error('[UI] Cube3D.toggleTextureMode failed:', e);
        }

        el.btnTexMode.classList.toggle('active', isNowTex);
        el.btnTexMode.setAttribute('aria-pressed', isNowTex);

        const isAr = lang === 'ar';
        el.btnTexMode.textContent = isNowTex
          ? (isAr ? '⬡ نسيج حي' : '⬡ LIVE TEX')
          : (isAr ? '⬡ شيدر'    : '⬡ SHADER');

        if (el.texDot) {
          el.texDot.classList.toggle('inactive', !isNowTex);
        }

        showToast(isNowTex
          ? (isAr
             ? 'النسيج الحي — المكعب يرتدي حقل الجسيمات'
             : 'Live Texture — cube wears the particle field')
          : (isAr
             ? 'وضع الشيدر — صيغ GLSL مستقلة'
             : 'Shader Mode — independent GLSL formulas'));
      });
    }

    /* ── Audio ── */
    if (el.btnAudio) {
      el.btnAudio.addEventListener('click', async () => {

        if (!AudioEngine.isSupported()) {
          showToast(lang === 'ar'
            ? 'المتصفح لا يدعم الصوت'
            : 'Audio API not supported', 'error');
          return;
        }

        if (!audioActive) {
          /* Show loading state */
          el.btnAudio.textContent = lang === 'ar' ? '⏳ انتظر' : '⏳ WAIT';
          el.btnAudio.disabled    = true;

          const ok = await AudioEngine.init();
          el.btnAudio.disabled = false;

          if (ok) {
            audioActive = true;
            el.btnAudio.classList.add('active');
            el.btnAudio.setAttribute('aria-pressed', 'true');
            el.btnAudio.textContent = lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
            showToast(lang === 'ar'
              ? 'المايكروفون نشط — ردود فعل صوتية'
              : 'Microphone active — audio reactive');
          } else {
            el.btnAudio.textContent = lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
            showToast(lang === 'ar'
              ? 'تعذّر الوصول للمايكروفون'
              : 'Microphone access denied', 'error');
          }

        } else {
          /* Stop audio */
          try { AudioEngine.stop(); } catch (e) {}
          audioActive = false;
          el.btnAudio.classList.remove('active');
          el.btnAudio.setAttribute('aria-pressed', 'false');
          el.btnAudio.textContent = lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
          showToast(lang === 'ar' ? 'تم إيقاف الصوت' : 'Audio stopped');
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
        const isFull = !!document.fullscreenElement;
        if (el.btnFullscreen) {
          el.btnFullscreen.textContent = isFull
            ? (lang === 'ar' ? '⛶ خروج' : '⛶ EXIT')
            : (lang === 'ar' ? '⛶ كامل' : '⛶ FULL');
        }
      });
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — BOTTOM BAR ACTION BUTTONS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindActionButtons() {

    /* Shatter */
    if (el.btnShatter) {
      el.btnShatter.addEventListener('click', () => {
        try { Cube3D.triggerShatter(); } catch (e) {}
        triggerShatterVFX();
        showToast(lang === 'ar' ? '⚡ تحطيم!' : '⚡ SHATTERING!', 'beat');
      });
    }

    /* Randomize */
    if (el.btnRandomize) {
      el.btnRandomize.addEventListener('click', randomizeBoth);
    }
  }

  /**
   * randomizeBoth — pick two different random formulas.
   * 2D gets one, 3D shader overlay gets another.
   * Cube texture shows the 2D result automatically.
   */
  function randomizeBoth() {
    let i2d = Math.floor(Math.random() * 60);
    let i3d = Math.floor(Math.random() * 60);

    /* Ensure the two are different */
    while (i3d === i2d) {
      i3d = Math.floor(Math.random() * 60);
    }

    try {
      Engine2D.setPreset(i2d);
      Engine2D.resetParticles();
    } catch (e) {}

    try {
      Cube3D.setPreset(i3d);
    } catch (e) {}

    activePreset2D = i2d;
    activePreset3D = i3d;

    updateActiveLabel(i2d);

    if (el.formulaDisplay) {
      el.formulaDisplay.textContent = String(i2d + 1).padStart(2, '0');
    }

    buildPresetList(currentFilter);

    showToast(lang === 'ar'
      ? `نسيج: ${String(i2d+1).padStart(2,'0')} · طبقة: ${String(i3d+1).padStart(2,'0')}`
      : `Texture: #${i2d+1} · Overlay: #${i3d+1}`);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — PANEL & TAB CONTROLS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindPanelControls() {

    /* Panel toggle (collapse/expand) */
    if (el.btnTogglePanel) {
      el.btnTogglePanel.addEventListener('click', () => {
        panelOpen = !panelOpen;

        if (window.innerWidth <= 768) {
          /* Mobile: slide drawer */
          el.panelPresets.classList.toggle('open', panelOpen);
        } else {
          /* Desktop: collapse */
          el.panelPresets.classList.toggle('collapsed', !panelOpen);
        }

        updatePanelToggleIcon();
        el.btnTogglePanel.setAttribute('aria-expanded', panelOpen);
      });
    }

    /* Tabs — 2D source / 3D overlay */
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
               : 'Texture Source — controls particles & cube')
            : (lang === 'ar'
               ? 'طبقة GLSL — فوق النسيج الحي'
               : 'GLSL Overlay — layered over live texture'));
        });
      });
    }

    /* Search field */
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

  function closeMobilePanel() {
    panelOpen = false;
    if (el.panelPresets) el.panelPresets.classList.remove('open');
    updatePanelToggleIcon();
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
      /* Flash effect */
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

      /* Capture 3D frame */
      const dataURL = Cube3D.captureFrame();
      const link    = document.createElement('a');
      link.download = `geozakhraf-xhaos-v2-${Date.now()}.png`;
      link.href     = dataURL;
      link.click();

      showToast(lang === 'ar' ? 'تم حفظ اللقطة' : 'Screenshot saved');

    } catch (e) {
      console.error('[UI] Screenshot failed:', e);
      showToast(lang === 'ar'
        ? 'فشل حفظ اللقطة'
        : 'Screenshot failed', 'error');
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
    /* Red radial flash overlay */
    const overlay     = document.createElement('div');
    overlay.className = 'shatter-overlay';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 750);

    /* Pulse the shatter button */
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

  /**
   * showToast — queue a brief notification.
   * @param {string} message
   * @param {string} type      'info' | 'error' | 'beat'
   * @param {number} duration  ms (default 2000)
   */
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

    /* Animate in */
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    /* Remove after duration */
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

    /* Document direction */
    html.lang = lang;
    html.dir  = isAr ? 'rtl' : 'ltr';

    /* Language button */
    if (el.btnLang) {
      el.btnLang.textContent = isAr ? 'EN' : 'AR';
      el.btnLang.title       = isAr
        ? 'Switch to English'
        : 'التبديل إلى العربية';
    }

    /* Brand tag */
    if (el.brandTag) {
      el.brandTag.textContent = isAr ? 'محرك الفوضى' : 'XHAOS ENGINE';
    }

    /* All data-en / data-ar elements */
    document.querySelectorAll('[data-en]').forEach(elem => {
      const arText = elem.dataset.ar;
      if (arText !== undefined) {
        elem.textContent = isAr ? arText : elem.dataset.en;
      }
    });

    /* Search placeholder */
    if (el.presetSearch) {
      el.presetSearch.placeholder = isAr
        ? 'البحث عن صيغة…'
        : 'Search formula…';
    }

    /* Button labels */
    if (el.btnShatter)    el.btnShatter.textContent    = isAr ? '⚡ تحطيم'   : '⚡ SHATTER';
    if (el.btnRandomize)  el.btnRandomize.textContent  = isAr ? '⚄ عشوائي'  : '⚄ RANDOMIZE';
    if (el.btnPov)        el.btnPov.textContent        = isAr ? '⊙ منظور'   : '⊙ POV';
    if (el.btnAudio)      el.btnAudio.textContent      = isAr ? '♫ صوت'     : '♫ AUDIO';
    if (el.btnScreenshot) el.btnScreenshot.textContent = isAr ? '⬡ التقاط'  : '⬡ CAPTURE';

    /* Texture mode button */
    if (el.btnTexMode) {
      const isTex = el.btnTexMode.classList.contains('active');
      el.btnTexMode.textContent = isTex
        ? (isAr ? '⬡ نسيج حي' : '⬡ LIVE TEX')
        : (isAr ? '⬡ شيدر'    : '⬡ SHADER');
    }

    /* Fullscreen button */
    if (el.btnFullscreen) {
      el.btnFullscreen.textContent = !!document.fullscreenElement
        ? (isAr ? '⛶ خروج' : '⛶ EXIT')
        : (isAr ? '⛶ كامل' : '⛶ FULL');
    }

    /* Slider labels */
    const sliderLabels = {
      speed:      ['SPEED',     'السرعة'    ],
      scale:      ['SCALE',     'النطاق'    ],
      chaos:      ['CHAOS',     'الفوضى'    ],
      bloom:      ['BLOOM',     'الإضاءة'   ],
      rotation:   ['ROTATION',  'الدوران'   ],
      density:    ['DENSITY',   'الكثافة'   ],
      texOpacity: ['TEX DEPTH', 'عمق النسيج']
    };

    Object.entries(sliderLabels).forEach(([key, [en, ar]]) => {
      const s = el.sliders[key];
      if (!s || !s.range) return;
      const label = s.range.previousElementSibling;
      if (label && label.tagName === 'LABEL') {
        label.textContent = isAr ? ar : en;
      }
    });

    /* Tab labels */
    if (el.tabBtns) {
      el.tabBtns.forEach(btn => {
        btn.textContent = btn.dataset.tab === '2d'
          ? (isAr ? 'مصدر النسيج' : '2D · TEXTURE SRC')
          : (isAr ? 'طبقة ثلاثية'  : '3D · OVERLAY');
      });
    }

    /* Sync HUD text */
    const syncTitle = document.querySelector('.sync-title');
    if (syncTitle) {
      syncTitle.textContent = isAr
        ? 'تزامن الانعكاس'
        : 'INVERSION SYNC';
    }

    const dirLabel = document.querySelector('.dir-label');
    if (dirLabel) {
      dirLabel.textContent = isAr ? 'الدوران' : 'ROTATION';
    }

    /* Shortcuts overlay header */
    const shortcutsHeader = document.querySelector('.shortcuts-header span');
    if (shortcutsHeader) {
      shortcutsHeader.textContent = isAr
        ? 'اختصارات لوحة المفاتيح'
        : 'KEYBOARD SHORTCUTS';
    }

    /* POV exit overlay title */
    if (povExitOverlay) {
      povExitOverlay.title = isAr
        ? 'اضغط للخروج من وضع POV'
        : 'Click or tap anywhere to exit POV';
    }

    updatePanelToggleIcon();
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 16 — SYNC HUD UPDATER
     Called every frame from main.js masterLoop
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function updateSyncHUD(m2d, sync, mAudio) {

    /* ── Sync bars ── */
    const freq2d   = Math.min(Math.abs(m2d.frequency   || 0), 1.0);
    const scale3d  = Math.min(Math.abs(1.0 - (sync.scaleMult || 1.0)), 1.0);
    const omega    = mAudio
      ? Math.min(mAudio.bassSmooth || 0, 1.0)
      : 0;

    const pct2d    = Math.round(freq2d  * 100);
    const pct3d    = Math.round(scale3d * 100);
    const pctOmega = Math.round(omega   * 100);

    if (el.sync2dFill)    el.sync2dFill.style.width    = pct2d    + '%';
    if (el.sync3dFill)    el.sync3dFill.style.width    = pct3d    + '%';
    if (el.syncOmegaFill) el.syncOmegaFill.style.width = pctOmega + '%';
    if (el.sync2dNum)     el.sync2dNum.textContent     = pct2d    + '%';
    if (el.sync3dNum)     el.sync3dNum.textContent     = pct3d    + '%';
    if (el.syncOmegaNum)  el.syncOmegaNum.textContent  = pctOmega + '%';

    /* ── Texture sync row (v2.0) ── */
    let isLiveTex = true;
    try {
      const texStatus = Cube3D.getTexSyncStatus();
      isLiveTex = texStatus.mode === 'LIVE_TEXTURE';
    } catch (e) {}

    if (el.syncTexFill) {
      el.syncTexFill.style.width      = isLiveTex ? '100%' : '22%';
      el.syncTexFill.style.background = isLiveTex
        ? 'linear-gradient(90deg, rgba(0,240,255,0.3), #00ff88)'
        : 'linear-gradient(90deg, rgba(139,0,255,0.3), #8b00ff)';
    }

    if (el.syncTexNum) {
      el.syncTexNum.textContent  = isLiveTex ? 'LIVE' : 'GLSL';
      el.syncTexNum.style.color  = isLiveTex
        ? 'var(--green)'
        : 'var(--violet)';
    }

    /* ── Rotation direction arrows ── */
    if (el.dir2d) {
      el.dir2d.textContent = m2d.clockwise ? '↻' : '↺';
    }
    if (el.dir3d) {
      /* Always opposite of 2D — inversion symmetry */
      el.dir3d.textContent = m2d.clockwise ? '↺' : '↻';
    }

    /* ── FPS counter (updated every 500ms) ── */
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLastTime >= 500) {
      smoothFPS   = Math.round(
        fpsFrames / ((now - fpsLastTime) / 1000)
      );
      smoothFPS   = Math.min(smoothFPS, 999);
      fpsFrames   = 0;
      fpsLastTime = now;

      if (el.fpsValue) {
        el.fpsValue.textContent = smoothFPS;
        /* Colour-coded: green=good, yellow=ok, red=low */
        el.fpsValue.style.color =
          smoothFPS >= 50 ? '#00ff88' :
          smoothFPS >= 30 ? '#ffd700' : '#ff2244';
      }
    }

    /* ── Beat indicator ── */
    if (mAudio && el.beatDot) {
      if (mAudio.beatDetect) {
        el.beatDot.classList.add('active');
        beatFlashTimer = 6; /* hold for 6 frames */

        /* Pulse shatter button on beat */
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

      /* Show BPM in tooltip */
      if (mAudio.bpm > 0) {
        el.beatDot.title = `${mAudio.bpm} BPM`;
      }
    }

    /* ── Tex dot state ── */
    if (el.texDot) {
      el.texDot.classList.toggle('inactive', !isLiveTex);
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 17 — TOAST STYLES (INJECTED)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function injectToastStyles() {
    if (document.getElementById('toast-styles')) return;

    const style   = document.createElement('style');
    style.id      = 'toast-styles';
    style.textContent = `
      .toast {
        position:        fixed;
        bottom:          calc(var(--bar-h, 76px) + 16px);
        left:            50%;
        transform:       translateX(-50%) translateY(20px);
        z-index:         1000;
        padding:         9px 22px;
        border-radius:   var(--r-md, 8px);
        font-family:     var(--font-mono, monospace);
        font-size:       0.70rem;
        letter-spacing:  0.10em;
        color:           var(--text-bright, #f0f8ff);
        background:      rgba(0, 8, 28, 0.90);
        border:          1px solid rgba(0, 200, 255, 0.25);
        backdrop-filter: blur(12px);
        pointer-events:  none;
        white-space:     nowrap;
        opacity:         0;
        transition:      opacity 0.25s ease,
                         transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        max-width:       80vw;
        overflow:        hidden;
        text-overflow:   ellipsis;
      }
      .toast-visible {
        opacity:   1;
        transform: translateX(-50%) translateY(0);
      }
      .toast-hiding {
        opacity:   0;
        transform: translateX(-50%) translateY(-10px);
      }
      .toast-error {
        border-color: rgba(255, 34, 68, 0.45);
        background:   rgba(40, 0, 8, 0.92);
        color:        #ff8899;
      }
      .toast-beat {
        border-color: rgba(255, 215, 0, 0.45);
        background:   rgba(20, 15, 0, 0.92);
        color:        var(--gold, #ffd700);
      }
    `;
    document.head.appendChild(style);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 18 — INIT
     Called once from main.js after engines start
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function init() {

    /* 1. Inject toast CSS */
    injectToastStyles();

    /* 2. Cache DOM references */
    cacheElements();

    /* 3. Create POV exit overlay
          MUST happen before bindHeaderButtons() */
    createPOVExitOverlay();

    /* 4. Build preset list */
    buildPresetList();

    /* 5. Wire controls */
    bindSliders();
    bindHeaderButtons();
    bindActionButtons();
    bindPanelControls();
    bindShortcutsOverlay();

    /* 6. Apply initial language */
    applyLanguage();

    /* 7. Set initial active label */
    updateActiveLabel(0);

    /* 8. Debug verification */
    const itemCount = el.presetList
      ? el.presetList.querySelectorAll('.preset-item').length
      : 0;

    console.info(
      `[UI] v2.0 initialised. ` +
      `${itemCount} preset items rendered. ` +
      `POV exit overlay: ${povExitOverlay ? 'ready' : 'MISSING'}`
    );

    if (itemCount === 0) {
      console.error(
        '[UI] CRITICAL: No preset items created. ' +
        'Check that #preset-list exists in the DOM.'
      );
    }

    /* 9. Welcome toast */
    setTimeout(() => {
      showToast(
        lang === 'ar'
          ? 'اختر صيغة من القائمة · المكعب يرتديها مباشرة'
          : 'Pick a formula — cube wears it live',
        'info',
        3500
      );
    }, 800);
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
