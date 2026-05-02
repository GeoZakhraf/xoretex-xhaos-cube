/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — ui.js
 *
 *  Professional UI Controller
 *  · Bilingual Interface (Arabic RTL / English LTR)
 *  · Glassmorphism Preset Library (60 formulas)
 *  · Parameter Sliders with live value display
 *  · Audio reactive HUD updates
 *  · Screenshot capture & download
 *  · Keyboard shortcut system
 *  · Mobile panel drawer
 *  · Sync HUD with direction indicators
 *  · FPS display & beat indicator
 *  · Toast notification system
 *
 *  Architecture: IIFE Module Pattern
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.UI = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PRIVATE STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let lang           = 'en';      // 'en' | 'ar'
  let activePreset2D = 0;         // current 2D formula index
  let activePreset3D = 0;         // current 3D formula index
  let activeTab      = '2d';      // '2d' | '3d'
  let panelOpen      = true;      // side panel state
  let povActive      = false;     // POV mode flag
  let audioActive    = false;     // audio engine flag
  let currentFilter  = '';        // search filter string

  /* FPS tracking */
  let fpsFrames      = 0;
  let fpsLastTime    = performance.now();
  let smoothFPS      = 60;

  /* Toast queue */
  let toastQueue     = [];
  let toastActive    = false;

  /* Beat flash state */
  let beatFlashTimer = 0;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — PRESET DATA
     60 English names + 60 Arabic translations
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
    'ألياف ضوئية',       'حرير رقمي',          'اضطراب موجي',
    'دوامة ديناميكية',   'شبكة عصبية',          'كتل البيانات',
    'أمواج الرمل',       'نهر المجرة',          'انجراف شعاعي',
    'تكرار هندسي',       'حقل مغناطيسي',        'فوضى منظمة',
    'حلزون كسوري',       'عاصفة كهربائية',      'حلزون الحمض النووي',
    'نمو المرجان',       'حقل كمي',             'خريطة طبوغرافية',
    'تدفق المرآة',       'محاكاة الدخان',       'شبكة بلورية',
    'سديم',              'نسيج منسوج',           'ثقب أسود',
    'الشفق القطبي',      'تدفق فورونوي',        'حلقات التداخل',
    'إعصار',             'شبكة عصبونية',        'ذراع المجرة',
    'رخام سائل',         'شعلة شمسية',          'أوردة مجمدة',
    'طية المخمل',        'تيار شريطي',          'تموجات صوتية',
    'شبكة بلازما',       'وريد رخامي',          'نفق خارق',
    'انجراف طحلبي',      'تيار شبكي',           'غرفة السحاب',
    'انتشار الحبر',      'شبكة مضيئة',          'بلاط توافقي',
    'حديقة حلزونية',     'تدفق الزئبق',         'موجة المنشور',
    'شبكة مدارية',       'انجراف الجمر',        'انكسار زجاجي',
    'تيار المحيط',       'زهرة حريرية',         'حلقات التدفق',
    'تدفق صناعي',        'مشتل النجوم',         'شبكة موجية',
    'نبض التداخل',       'تيار مداري',          'حقل خفي'
  ];

  /* Formula short description (shown in tooltip) */
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
    'Structured turbulence that breaks down',
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
    'Coronal mass ejection from a star',
    'Noise-gradient dendritic ice growth',
    'Soft fBm-folded textile crease',
    'Three laminar sinusoid bands',
    'Radial acoustic membrane vibration',
    'Classic three-component plasma screen',
    'fBm-displaced geological stone vein',
    'Infinite tunnel perspective distortion',
    'Shallow warp organic biofilm drift',
    'Circuit board routing grid stream',
    'Cloud chamber particle track detector',
    'Ink drop diffusing through water',
    '8-anchor bioluminescent web field',
    'Fractional harmonic wave tiling',
    'Phyllotaxis-inspired spiral arms',
    'Noise-displaced liquid metal surface',
    'Multiplicative prism light refraction',
    '5 orbital center gravitational field',
    'fBm hot ember buoyancy column',
    'Noise-displaced curved glass bending',
    'Drifting ocean gyre circulation',
    'Sine×cosine silk scarf in wind',
    'Radial × angular magnetic flux tube',
    'Noise-displaced heavy flow channel',
    'Slow-drifting interstellar gas cloud',
    'Three-component standing wave lattice',
    'Near-frequency optical moiré pattern',
    'Angular + radial charged particle orbit',
    'Deep warp fBm invisible force field'
  ];


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — ELEMENT CACHE
     Cache all DOM references once on init
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const el = {};

  function cacheElements() {
    /* Header */
    el.btnLang        = document.getElementById('btn-lang');
    el.btnPov         = document.getElementById('btn-pov');
    el.btnAudio       = document.getElementById('btn-audio');
    el.btnScreenshot  = document.getElementById('btn-screenshot');
    el.btnFullscreen  = document.getElementById('btn-fullscreen');
    el.fpsValue       = document.getElementById('fps-value');
    el.beatDot        = document.getElementById('beat-dot');
    el.formulaDisplay = document.getElementById('formula-index-display');
    el.brandTag       = document.getElementById('brand-tag');

    /* Panel */
    el.panelPresets   = document.getElementById('panel-presets');
    el.btnTogglePanel = document.getElementById('btn-toggle-panel');
    el.presetSearch   = document.getElementById('preset-search');
    el.presetList     = document.getElementById('preset-list');
    el.panelCount     = document.getElementById('panel-count');
    el.tabBtns        = document.querySelectorAll('.tab-btn');

    /* Bottom bar sliders */
    el.sliders = {
      speed:    { range: document.getElementById('param-speed'),
                  val:   document.getElementById('val-speed')   },
      scale:    { range: document.getElementById('param-scale'),
                  val:   document.getElementById('val-scale')   },
      chaos:    { range: document.getElementById('param-chaos'),
                  val:   document.getElementById('val-chaos')   },
      bloom:    { range: document.getElementById('param-bloom'),
                  val:   document.getElementById('val-bloom')   },
      rotation: { range: document.getElementById('param-rotation'),
                  val:   document.getElementById('val-rotation')},
      density:  { range: document.getElementById('param-density'),
                  val:   document.getElementById('val-density') }
    };

    /* Action buttons */
    el.btnShatter    = document.getElementById('btn-shatter');
    el.btnRandomize  = document.getElementById('btn-randomize');

    /* Sync HUD */
    el.sync2dFill    = document.getElementById('sync-2d-fill');
    el.sync3dFill    = document.getElementById('sync-3d-fill');
    el.syncOmegaFill = document.getElementById('sync-omega-fill');
    el.sync2dNum     = document.getElementById('sync-2d-num');
    el.sync3dNum     = document.getElementById('sync-3d-num');
    el.syncOmegaNum  = document.getElementById('sync-omega-num');
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
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — PRESET LIST BUILDER
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * buildPresetList — renders filtered preset items
   * into the scrollable list panel.
   *
   * @param {string} filter  optional search string
   */
  function buildPresetList(filter) {
    filter = (filter || '').toLowerCase().trim();
    currentFilter = filter;

    const list      = el.presetList;
    const isAr      = lang === 'ar';
    const names     = isAr ? PRESET_NAMES_AR : PRESET_NAMES_EN;
    const descs     = PRESET_DESC_EN;
    const activeIdx = activeTab === '2d' ? activePreset2D : activePreset3D;

    /* Build fragment for batch DOM update */
    const frag    = document.createDocumentFragment();
    let   visible = 0;

    names.forEach((name, i) => {
      /* Filter check — always search English names too */
      const enName = PRESET_NAMES_EN[i].toLowerCase();
      const arName = PRESET_NAMES_AR[i];

      if (filter) {
        const matchEn = enName.includes(filter);
        const matchAr = arName.includes(filter);
        const matchNum = String(i + 1).includes(filter);
        if (!matchEn && !matchAr && !matchNum) return;
      }

      visible++;

      const item = document.createElement('div');
      item.className    = 'preset-item';
      item.dataset.index = i;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
      if (i === activeIdx) item.classList.add('active');

      /* Tooltip — English description always */
      item.title = descs[i] || '';

      item.innerHTML = `
        <span class="preset-num"
              aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <span class="preset-name">${name}</span>
      `;

      /* Click handler */
      item.addEventListener('click', () => {
        selectPreset(i);
        /* On mobile, close panel after selection */
        if (window.innerWidth <= 768) {
          closeMobilePanel();
        }
      });

      frag.appendChild(item);
    });

    /* Swap content in one operation */
    list.innerHTML = '';
    list.appendChild(frag);

    /* Update count badge */
    if (el.panelCount) {
      el.panelCount.textContent =
        filter ? `${visible}/60` : '60';
    }
  }

  /**
   * selectPreset — activate a formula preset
   * on the appropriate engine (2D or 3D).
   *
   * @param {number} index  [0..59]
   */
  function selectPreset(index) {
    const clampedIndex = Math.max(0, Math.min(59, index | 0));

    if (activeTab === '2d') {
      activePreset2D = clampedIndex;
      Engine2D.setPreset(clampedIndex);
      Engine2D.resetParticles();
    } else {
      activePreset3D = clampedIndex;
      Cube3D.setPreset(clampedIndex);
    }

    /* Update active label */
    updateActiveLabel(clampedIndex, activeTab);

    /* Update formula index display in header */
    if (el.formulaDisplay) {
      el.formulaDisplay.textContent =
        String(clampedIndex + 1).padStart(2, '0');
    }

    /* Rebuild list to update active state */
    buildPresetList(currentFilter);

    /* Scroll active item into view */
    requestAnimationFrame(() => {
      const activeItem = el.presetList
                           .querySelector('.preset-item.active');
      if (activeItem) {
        activeItem.scrollIntoView({
          block:    'nearest',
          behavior: 'smooth'
        });
      }
    });

    /* Show toast notification */
    const name = lang === 'ar'
      ? PRESET_NAMES_AR[clampedIndex]
      : PRESET_NAMES_EN[clampedIndex];
    showToast(`${String(clampedIndex + 1).padStart(2, '0')} · ${name}`);
  }

  /**
   * updateActiveLabel — animate the floating
   * active preset badge at bottom-left.
   */
  function updateActiveLabel(index, tab) {
    const name = lang === 'ar'
      ? PRESET_NAMES_AR[index]
      : PRESET_NAMES_EN[index];

    const engineLabel = tab === '2d'
      ? (lang === 'ar' ? 'المحرك ثنائي الأبعاد' : '2D ENGINE')
      : (lang === 'ar' ? 'المحرك ثلاثي الأبعاد' : '3D ENGINE');

    if (el.activePresetNum)  el.activePresetNum.textContent  =
      String(index + 1).padStart(2, '0');
    if (el.activePresetName) el.activePresetName.textContent = name;
    if (el.activeEngineTag)  el.activeEngineTag.textContent  = engineLabel;

    /* Trigger CSS flash animation */
    if (el.activeLabel) {
      el.activeLabel.classList.remove('flash');
      /* Force reflow to restart animation */
      void el.activeLabel.offsetWidth;
      el.activeLabel.classList.add('flash');
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — PARAMETER SLIDERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * bindSliders — wire up all parameter range inputs
   * with live value display and engine updates.
   */
  function bindSliders() {

    /* Slider configuration table */
    const sliderConfig = [
      {
        key:      'speed',
        decimals: 2,
        onChange: v => {
          Engine2D.setParams({ speed: v });
          Cube3D.setParams({ speed: v });
        }
      },
      {
        key:      'scale',
        decimals: 2,
        onChange: v => {
          Engine2D.setParams({ scale: v });
          Cube3D.setParams({ scale: v });
        }
      },
      {
        key:      'chaos',
        decimals: 2,
        onChange: v => {
          Engine2D.setParams({ chaos: v });
          Cube3D.setParams({ chaos: v });
        }
      },
      {
        key:      'bloom',
        decimals: 2,
        onChange: v => {
          Cube3D.setBloom(v);
        }
      },
      {
        key:      'rotation',
        decimals: 2,
        onChange: v => {
          Cube3D.setParams({ rotation: v });
        }
      },
      {
        key:      'density',
        decimals: 0,
        onChange: v => {
          Engine2D.setParams({ density: v });
        }
      }
    ];

    sliderConfig.forEach(cfg => {
      const slider = el.sliders[cfg.key];
      if (!slider || !slider.range) return;

      /* Input event — fires continuously while dragging */
      slider.range.addEventListener('input', () => {
        const v = parseFloat(slider.range.value);

        /* Update display */
        slider.val.textContent = cfg.decimals > 0
          ? v.toFixed(cfg.decimals)
          : Math.round(v).toString();

        /* Update ARIA */
        slider.range.setAttribute('aria-valuenow', v);

        /* Notify engines */
        cfg.onChange(v);
      });

      /* Touch-specific: prevent panel scroll while adjusting slider */
      slider.range.addEventListener('touchstart', e => {
        e.stopPropagation();
      }, { passive: true });
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — HEADER BUTTON HANDLERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindHeaderButtons() {

    /* ── Language Toggle ── */
    if (el.btnLang) {
      el.btnLang.addEventListener('click', () => {
        lang = lang === 'en' ? 'ar' : 'en';
        applyLanguage();
        buildPresetList(currentFilter);

        /* Update active label language */
        const idx = activeTab === '2d' ? activePreset2D : activePreset3D;
        updateActiveLabel(idx, activeTab);

        showToast(lang === 'ar' ? 'تم التبديل إلى العربية' : 'Switched to English');
      });
    }

    /* ── POV Mode ── */
    if (el.btnPov) {
      el.btnPov.addEventListener('click', () => {
        povActive = !povActive;
        Cube3D.setPOV(povActive);

        /* Toggle app class for CSS transitions */
        document.getElementById('app')
                .classList.toggle('pov-mode', povActive);

        el.btnPov.classList.toggle('active', povActive);
        el.btnPov.setAttribute('aria-pressed', povActive);

        showToast(
          povActive
            ? (lang === 'ar' ? 'وضع POV نشط — اضغط للخروج' : 'POV Mode — tap to exit')
            : (lang === 'ar' ? 'خرجت من وضع POV' : 'Exited POV Mode')
        );
      });

      /* Clicking 3D canvas in POV mode exits POV */
      const canvas3d = document.getElementById('canvas3d');
      if (canvas3d) {
        canvas3d.addEventListener('click', () => {
          if (povActive) el.btnPov.click();
        });
      }
    }

    /* ── Audio Toggle ── */
    if (el.btnAudio) {
      el.btnAudio.addEventListener('click', async () => {
        if (!AudioEngine.isSupported()) {
          showToast(
            lang === 'ar'
              ? 'المتصفح لا يدعم الصوت'
              : 'Audio not supported in this browser',
            'error'
          );
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
            showToast(
              lang === 'ar'
                ? 'المايكروفون نشط'
                : 'Microphone active — reacting to audio'
            );
          } else {
            el.btnAudio.textContent = lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
            showToast(
              lang === 'ar'
                ? 'تعذّر الوصول للمايكروفون'
                : 'Microphone access denied',
              'error'
            );
          }

        } else {
          /* Stop audio */
          AudioEngine.stop();
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
      el.btnScreenshot.addEventListener('click', () => {
        takeScreenshot();
      });
    }

    /* ── Fullscreen ── */
    if (el.btnFullscreen) {
      el.btnFullscreen.addEventListener('click', () => {
        toggleFullscreen();
      });

      /* Update button text on fullscreen change */
      document.addEventListener('fullscreenchange', () => {
        const isFull = !!document.fullscreenElement;
        el.btnFullscreen.textContent =
          isFull
            ? (lang === 'ar' ? '⛶ خروج' : '⛶ EXIT')
            : (lang === 'ar' ? '⛶ كامل' : '⛶ FULL');
      });
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — BOTTOM BAR ACTION BUTTONS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindActionButtons() {

    /* ── Shatter ── */
    if (el.btnShatter) {
      el.btnShatter.addEventListener('click', () => {
        Cube3D.triggerShatter();
        triggerShatterVFX();
        showToast(lang === 'ar' ? 'تحطيم!' : 'SHATTERING!', 'beat');
      });
    }

    /* ── Randomize ── */
    if (el.btnRandomize) {
      el.btnRandomize.addEventListener('click', () => {
        randomizeBoth();
      });
    }
  }

  /**
   * randomizeBoth — pick random formulas for both engines
   * simultaneously, with different indices for variety.
   */
  function randomizeBoth() {
    const i2d = Math.floor(Math.random() * 60);
    let   i3d = Math.floor(Math.random() * 60);
    /* Ensure they are different */
    while (i3d === i2d) {
      i3d = Math.floor(Math.random() * 60);
    }

    Engine2D.setPreset(i2d);
    Engine2D.resetParticles();
    Cube3D.setPreset(i3d);

    activePreset2D = i2d;
    activePreset3D = i3d;

    /* Update label based on active tab */
    const showIdx = activeTab === '2d' ? i2d : i3d;
    updateActiveLabel(showIdx, activeTab);

    if (el.formulaDisplay) {
      el.formulaDisplay.textContent =
        String(showIdx + 1).padStart(2, '0');
    }

    buildPresetList(currentFilter);

    showToast(
      lang === 'ar'
        ? `2D: ${String(i2d+1).padStart(2,'0')} · 3D: ${String(i3d+1).padStart(2,'0')}`
        : `2D: #${i2d+1} · 3D: #${i3d+1} randomized`
    );
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — PANEL & TAB CONTROLS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindPanelControls() {

    /* ── Toggle Panel (desktop collapse) ── */
    if (el.btnTogglePanel) {
      el.btnTogglePanel.addEventListener('click', () => {
        panelOpen = !panelOpen;

        if (window.innerWidth <= 768) {
          /* Mobile — use open/close drawer */
          el.panelPresets.classList.toggle('open', panelOpen);
        } else {
          /* Desktop — collapse/expand */
          el.panelPresets.classList.toggle('collapsed', !panelOpen);
        }

        /* Update button icon */
        updatePanelToggleIcon();

        el.btnTogglePanel.setAttribute('aria-expanded', panelOpen);
      });
    }

    /* ── Tab Buttons (2D / 3D) ── */
    if (el.tabBtns) {
      el.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          /* Deactivate all tabs */
          el.tabBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });

          /* Activate clicked tab */
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          activeTab = btn.dataset.tab;

          /* Rebuild list showing active preset for this tab */
          buildPresetList(currentFilter);

          /* Update active label */
          const idx = activeTab === '2d' ? activePreset2D : activePreset3D;
          updateActiveLabel(idx, activeTab);

          showToast(
            activeTab === '2d'
              ? (lang === 'ar' ? 'محرك الخلفية ثنائية الأبعاد' : '2D Background Engine')
              : (lang === 'ar' ? 'محرك المكعب ثلاثي الأبعاد'  : '3D Cube Face Engine')
          );
        });
      });
    }

    /* ── Search Input ── */
    if (el.presetSearch) {
      el.presetSearch.addEventListener('input', () => {
        buildPresetList(el.presetSearch.value);
      });

      /* Clear on Escape */
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

    if (panelOpen) {
      el.btnTogglePanel.textContent = isRTL ? '›' : '‹';
    } else {
      el.btnTogglePanel.textContent = isRTL ? '‹' : '›';
    }
  }

  function closeMobilePanel() {
    panelOpen = false;
    el.panelPresets.classList.remove('open');
    updatePanelToggleIcon();
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — KEYBOARD SHORTCUTS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindKeyboard() {
    document.addEventListener('keydown', e => {

      /* Ignore if typing in search field */
      if (e.target === el.presetSearch) return;

      switch (e.key) {

        /* SPACE — Shatter */
        case ' ':
          e.preventDefault();
          Cube3D.triggerShatter();
          triggerShatterVFX();
          break;

        /* R — Randomize */
        case 'r':
        case 'R':
          randomizeBoth();
          break;

        /* P — POV Mode */
        case 'p':
        case 'P':
          if (el.btnPov) el.btnPov.click();
          break;

        /* A — Audio */
        case 'a':
        case 'A':
          if (el.btnAudio) el.btnAudio.click();
          break;

        /* F — Fullscreen */
        case 'f':
        case 'F':
          toggleFullscreen();
          break;

        /* L — Language */
        case 'l':
        case 'L':
          if (el.btnLang) el.btnLang.click();
          break;

        /* ? — Show shortcuts overlay */
        case '?':
          toggleShortcutsOverlay(true);
          break;

        /* Escape — close overlays / exit POV */
        case 'Escape':
          toggleShortcutsOverlay(false);
          if (povActive) el.btnPov.click();
          break;

        /* ArrowRight — next 2D preset */
        case 'ArrowRight':
          e.preventDefault();
          selectPresetRelative('2d', +1);
          break;

        /* ArrowLeft — previous 2D preset */
        case 'ArrowLeft':
          e.preventDefault();
          selectPresetRelative('2d', -1);
          break;

        /* ArrowUp — next 3D preset */
        case 'ArrowUp':
          e.preventDefault();
          selectPresetRelative('3d', +1);
          break;

        /* ArrowDown — previous 3D preset */
        case 'ArrowDown':
          e.preventDefault();
          selectPresetRelative('3d', -1);
          break;

        /* Number keys 1–9 — quick preset jump */
        default:
          if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
            const idx = parseInt(e.key) - 1;
            const prevTab = activeTab;
            activeTab = '2d';
            selectPreset(idx);
            activeTab = prevTab;
          }
          break;
      }
    });
  }

  /**
   * selectPresetRelative — advance preset by delta
   * on the specified engine tab.
   */
  function selectPresetRelative(tab, delta) {
    const prevTab = activeTab;
    activeTab = tab;

    const current = tab === '2d' ? activePreset2D : activePreset3D;
    const next    = (current + delta + 60) % 60;
    selectPreset(next);

    activeTab = prevTab;
    buildPresetList(currentFilter);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — SHORTCUTS OVERLAY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindShortcutsOverlay() {
    if (el.btnCloseShortcuts) {
      el.btnCloseShortcuts.addEventListener('click', () => {
        toggleShortcutsOverlay(false);
      });
    }

    /* Click backdrop to close */
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

    if (show) {
      /* Trap focus inside overlay */
      el.btnCloseShortcuts && el.btnCloseShortcuts.focus();
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — SCREENSHOT SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function takeScreenshot() {
    try {
      /* White flash VFX */
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

      /* Capture 3D canvas frame */
      const dataURL = Cube3D.captureFrame();

      /* Create download link */
      const link      = document.createElement('a');
      const timestamp = new Date().toISOString()
                                  .replace(/[:.]/g, '-')
                                  .slice(0, 19);
      link.download = `geozakhraf-xhaos-${timestamp}.png`;
      link.href     = dataURL;
      link.click();

      showToast(
        lang === 'ar' ? 'تم حفظ اللقطة' : 'Screenshot saved'
      );

    } catch (e) {
      console.error('[UI] Screenshot failed:', e);
      showToast(
        lang === 'ar' ? 'فشل حفظ اللقطة' : 'Screenshot failed',
        'error'
      );
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 11 — FULLSCREEN
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement
              .requestFullscreen({ navigationUI: 'hide' })
              .catch(err => {
                showToast(
                  lang === 'ar'
                    ? 'تعذّر تفعيل الشاشة الكاملة'
                    : 'Fullscreen not available',
                  'error'
                );
              });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 12 — SHATTER VFX
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * triggerShatterVFX — adds the full-screen
   * red radial flash overlay and pulses the shatter button.
   */
  function triggerShatterVFX() {
    /* Overlay flash */
    const overlay    = document.createElement('div');
    overlay.className = 'shatter-overlay';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 750);

    /* Button pulse */
    if (el.btnShatter) {
      el.btnShatter.classList.add('beat-active');
      setTimeout(() => {
        el.btnShatter.classList.remove('beat-active');
      }, 350);
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 13 — TOAST NOTIFICATION SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * showToast — display a brief notification message.
   *
   * @param {string} message   text to display
   * @param {string} type      'info' | 'error' | 'beat'
   * @param {number} duration  ms to show (default 2000)
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

    /* Create toast element */
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    /* RTL support */
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
     SECTION 14 — LANGUAGE SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * applyLanguage — switch all UI text between
   * Arabic (RTL) and English (LTR).
   */
  function applyLanguage() {
    const html  = document.getElementById('html-root');
    const isAr  = lang === 'ar';

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

    /* All data-en / data-ar labeled elements */
    document.querySelectorAll('[data-en]').forEach(elem => {
      const enText = elem.dataset.en;
      const arText = elem.dataset.ar;
      if (arText !== undefined) {
        elem.textContent = isAr ? arText : enText;
      }
    });

    /* Search placeholder */
    if (el.presetSearch) {
      el.presetSearch.placeholder =
        isAr ? 'البحث عن صيغة…' : 'Search formula…';
    }

    /* Action buttons */
    if (el.btnShatter) {
      el.btnShatter.textContent = isAr ? '⚡ تحطيم' : '⚡ SHATTER';
    }
    if (el.btnRandomize) {
      el.btnRandomize.textContent = isAr ? '⚄ عشوائي' : '⚄ RANDOMIZE';
    }

    /* Header buttons */
    if (el.btnPov) {
      el.btnPov.textContent =
        isAr ? '⊙ منظور' : '⊙ POV';
    }
    if (el.btnAudio) {
      el.btnAudio.textContent =
        isAr ? '♫ صوت' : '♫ AUDIO';
    }
    if (el.btnScreenshot) {
      el.btnScreenshot.textContent =
        isAr ? '⬡ التقاط' : '⬡ CAPTURE';
    }
    if (el.btnFullscreen) {
      el.btnFullscreen.textContent =
        !!document.fullscreenElement
          ? (isAr ? '⛶ خروج' : '⛶ EXIT')
          : (isAr ? '⛶ كامل' : '⛶ FULL');
    }

    /* Slider labels */
    const sliderLabels = {
      speed:    { en: 'SPEED',    ar: 'السرعة'  },
      scale:    { en: 'SCALE',    ar: 'النطاق'  },
      chaos:    { en: 'CHAOS',    ar: 'الفوضى'  },
      bloom:    { en: 'BLOOM',    ar: 'الإضاءة' },
      rotation: { en: 'ROTATION', ar: 'الدوران' },
      density:  { en: 'DENSITY',  ar: 'الكثافة' }
    };

    Object.entries(sliderLabels).forEach(([key, labels]) => {
      const slider = el.sliders[key];
      if (slider && slider.range) {
        const label = slider.range.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
          label.textContent = isAr ? labels.ar : labels.en;
        }
      }
    });

    /* Panel toggle direction */
    updatePanelToggleIcon();

    /* Tab labels */
    if (el.tabBtns) {
      el.tabBtns.forEach(btn => {
        const tabKey = btn.dataset.tab;
        if (tabKey === '2d') {
          btn.textContent = isAr ? 'خلفية ثنائية' : '2D BG';
        } else {
          btn.textContent = isAr ? 'وجه المكعب' : '3D FACE';
        }
      });
    }

    /* Sync HUD title */
    const syncTitle = document.querySelector('.sync-title');
    if (syncTitle) {
      syncTitle.textContent = isAr ? 'تزامن الانعكاس' : 'INVERSION SYNC';
    }

    /* Direction label */
    const dirLabel = document.querySelector('.dir-label');
    if (dirLabel) {
      dirLabel.textContent = isAr ? 'الدوران' : 'ROTATION';
    }

    /* Shortcuts overlay */
    const shortcutsHeader = document.querySelector('.shortcuts-header span');
    if (shortcutsHeader) {
      shortcutsHeader.textContent =
        isAr ? 'اختصارات لوحة المفاتيح' : 'KEYBOARD SHORTCUTS';
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 15 — SYNC HUD UPDATER
     Called every frame from main.js
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * updateSyncHUD — update all sync visualisation
   * elements from live engine metrics.
   *
   * @param {Object} m2d    Engine2D metrics
   * @param {Object} sync   SyncController output
   * @param {Object} mAudio AudioEngine metrics
   */
  function updateSyncHUD(m2d, sync, mAudio) {

    /* ── Sync Bars ── */
    const freq2d   = Math.min(Math.abs(m2d.frequency || 0), 1.0);
    const scale3d  = Math.min(Math.abs(1.0 - (sync.scaleMult || 1)), 1.0);
    const omega    = mAudio ? Math.min(mAudio.bassSmooth || 0, 1.0) : 0;

    const pct2d    = Math.round(freq2d  * 100);
    const pct3d    = Math.round(scale3d * 100);
    const pctOmega = Math.round(omega   * 100);

    if (el.sync2dFill)    el.sync2dFill.style.width    = pct2d    + '%';
    if (el.sync3dFill)    el.sync3dFill.style.width    = pct3d    + '%';
    if (el.syncOmegaFill) el.syncOmegaFill.style.width = pctOmega + '%';

    if (el.sync2dNum)    el.sync2dNum.textContent    = pct2d    + '%';
    if (el.sync3dNum)    el.sync3dNum.textContent    = pct3d    + '%';
    if (el.syncOmegaNum) el.syncOmegaNum.textContent = pctOmega + '%';

    /* ── Rotation Direction Arrows ── */
    if (el.dir2d && el.dir3d) {
      const cw2d = m2d.clockwise;
      /* Inversion: 3D is opposite of 2D */
      el.dir2d.textContent = cw2d  ? '↻' : '↺';
      el.dir3d.textContent = !cw2d ? '↻' : '↺';
    }

    /* ── FPS Display ── */
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLastTime >= 500) {
      /* Update every 500ms */
      smoothFPS = Math.round(fpsFrames / ((now - fpsLastTime) / 1000));
      smoothFPS = Math.min(smoothFPS, 999);
      fpsFrames   = 0;
      fpsLastTime = now;

      if (el.fpsValue) {
        el.fpsValue.textContent = smoothFPS;
        /* Colour-code: green 50+, yellow 30+, red below */
        el.fpsValue.style.color =
          smoothFPS >= 50 ? '#00ff88' :
          smoothFPS >= 30 ? '#ffd700' : '#ff2244';
      }
    }

    /* ── Beat Indicator ── */
    if (mAudio && el.beatDot) {
      if (mAudio.beatDetect) {
        el.beatDot.classList.add('active');
        beatFlashTimer = 6; /* hold for 6 frames */

        /* Pulse shatter button on beat */
        if (el.btnShatter) {
          el.btnShatter.classList.add('beat-active');
          setTimeout(() =>
            el.btnShatter.classList.remove('beat-active'), 250);
        }
      } else {
        beatFlashTimer = Math.max(0, beatFlashTimer - 1);
        if (beatFlashTimer === 0) {
          el.beatDot.classList.remove('active');
        }
      }

      /* BPM display alongside beat dot */
      if (mAudio.bpm > 0 && el.beatDot) {
        el.beatDot.title = `${mAudio.bpm} BPM`;
      }
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 16 — TOAST STYLES INJECTION
     Inject toast CSS dynamically (keeps styles.css clean)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function injectToastStyles() {
    if (document.getElementById('toast-styles')) return;

    const style = document.createElement('style');
    style.id    = 'toast-styles';
    style.textContent = `
      .toast {
        position:       fixed;
        bottom:         calc(var(--bar-h, 76px) + 16px);
        left:           50%;
        transform:      translateX(-50%) translateY(20px);
        z-index:        1000;
        padding:        9px 20px;
        border-radius:  var(--r-md, 8px);
        font-family:    var(--font-mono, monospace);
        font-size:      0.70rem;
        letter-spacing: 0.10em;
        color:          var(--text-bright, #f0f8ff);
        background:     rgba(0, 8, 28, 0.90);
        border:         1px solid rgba(0, 200, 255, 0.25);
        backdrop-filter: blur(12px);
        pointer-events: none;
        white-space:    nowrap;
        opacity:        0;
        transition:     opacity 0.25s ease,
                        transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        max-width:      80vw;
        overflow:       hidden;
        text-overflow:  ellipsis;
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
     SECTION 17 — INIT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * init — bootstrap all UI systems.
   * Called once from main.js after engines are ready.
   */
  function init() {
    /* 1. Inject dynamic styles */
    injectToastStyles();

    /* 2. Cache all DOM references */
    cacheElements();

    /* 3. Build initial preset list */
    buildPresetList();

    /* 4. Wire up all controls */
    bindSliders();
    bindHeaderButtons();
    bindActionButtons();
    bindPanelControls();
    bindKeyboard();
    bindShortcutsOverlay();

    /* 5. Apply initial language */
    applyLanguage();

    /* 6. Set initial active label */
    updateActiveLabel(0, '2d');

    /* 7. Welcome toast */
    setTimeout(() => {
      showToast(
        lang === 'ar'
          ? 'مرحباً بك في محرك جيو زخرف'
          : 'Welcome to GeoZakhraf Xhaos Engine'
      );
    }, 600);

    console.info('[UI] Initialised. Language:', lang);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PUBLIC API
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  return {
    init,
    updateSyncHUD,
    showToast,
    selectPreset,
    randomizeBoth,
    triggerShatterVFX,
    applyLanguage
  };

})(); // end UI
