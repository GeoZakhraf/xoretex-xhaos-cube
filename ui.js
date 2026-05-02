/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — ui.js
 *
 *  UI Controller — v2.0 Integration Updates:
 *  · selectPresetRelative() exposed for arrow key cycling
 *    (Engine2D.selectPresetRelative() now wired here)
 *  · Texture mode button wired (LIVE TEX / SHADER toggle)
 *  · TEX SYNC row in Sync HUD updated every frame
 *  · Active engine tag shows "2D → 3D LIVE"
 *  · Tab labels updated to "2D · TEXTURE SRC" / "3D · OVERLAY"
 *  · Tex opacity slider wired to Cube3D.setParams
 *  · Both tabs now control Engine2D (cube gets it via texture)
 *  · Full bilingual coverage including new v2.0 elements
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

  /* FPS */
  let fpsFrames   = 0;
  let fpsLastTime = performance.now();
  let smoothFPS   = 60;

  /* Toast */
  let toastQueue  = [];
  let toastActive = false;

  /* Beat flash */
  let beatFlashTimer = 0;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — PRESET DATA
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
     SECTION 3 — DOM CACHE
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

    /* Panel */
    el.panelPresets   = document.getElementById('panel-presets');
    el.btnTogglePanel = document.getElementById('btn-toggle-panel');
    el.presetSearch   = document.getElementById('preset-search');
    el.presetList     = document.getElementById('preset-list');
    el.panelCount     = document.getElementById('panel-count');
    el.tabBtns        = document.querySelectorAll('.tab-btn');

    /* Sliders */
    el.sliders = {
      speed:      { range: document.getElementById('param-speed'),
                    val:   document.getElementById('val-speed')       },
      scale:      { range: document.getElementById('param-scale'),
                    val:   document.getElementById('val-scale')       },
      chaos:      { range: document.getElementById('param-chaos'),
                    val:   document.getElementById('val-chaos')       },
      bloom:      { range: document.getElementById('param-bloom'),
                    val:   document.getElementById('val-bloom')       },
      rotation:   { range: document.getElementById('param-rotation'),
                    val:   document.getElementById('val-rotation')    },
      density:    { range: document.getElementById('param-density'),
                    val:   document.getElementById('val-density')     },
      texOpacity: { range: document.getElementById('param-tex-opacity'),
                    val:   document.getElementById('val-tex-opacity') }
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
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — PRESET LIST
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildPresetList(filter) {
    filter        = (filter || '').toLowerCase().trim();
    currentFilter = filter;

    const isAr     = lang === 'ar';
    const names    = isAr ? PRESET_NAMES_AR : PRESET_NAMES_EN;
    const descs    = PRESET_DESC_EN;
    /*
      v2.0: Both tabs control Engine2D.
      The cube gets the formula via live texture automatically.
      activeIdx always reflects the 2D preset regardless of tab.
    */
    const activeIdx = activePreset2D;

    const frag    = document.createDocumentFragment();
    let   visible = 0;

    names.forEach((name, i) => {
      const enName = PRESET_NAMES_EN[i].toLowerCase();
      const arName = PRESET_NAMES_AR[i];

      if (filter) {
        const matchEn  = enName.includes(filter);
        const matchAr  = arName.includes(filter);
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
      item.title = descs[i] || '';

      item.innerHTML = `
        <span class="preset-num" aria-hidden="true">
          ${String(i + 1).padStart(2, '0')}
        </span>
        <span class="preset-name">${name}</span>
      `;

      item.addEventListener('click', () => {
        selectPreset(i);
        if (window.innerWidth <= 768) closeMobilePanel();
      });

      frag.appendChild(item);
    });

    el.presetList.innerHTML = '';
    el.presetList.appendChild(frag);

    if (el.panelCount) {
      el.panelCount.textContent = filter ? `${visible}/60` : '60';
    }
  }

  /**
   * selectPreset — activate a formula on Engine2D.
   *
   * v2.0: Always updates Engine2D regardless of which tab
   * is active, because the cube gets the formula through
   * the live CanvasTexture. If tab is "3d overlay", we
   * also update Cube3D's shader mode independently.
   */
  function selectPreset(index) {
    const idx = Math.max(0, Math.min(59, index | 0));

    /* Always update 2D engine — it drives the texture */
    activePreset2D = idx;
    Engine2D.setPreset(idx);
    Engine2D.resetParticles();

    /* Also update 3D shader mode if in shader overlay tab */
    if (activeTab === '3d') {
      activePreset3D = idx;
      Cube3D.setPreset(idx);
    }

    updateActiveLabel(idx);

    if (el.formulaDisplay) {
      el.formulaDisplay.textContent = String(idx + 1).padStart(2, '0');
    }

    buildPresetList(currentFilter);

    /* Scroll into view */
    requestAnimationFrame(() => {
      const active = el.presetList.querySelector('.preset-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    const name = lang === 'ar'
      ? PRESET_NAMES_AR[idx]
      : PRESET_NAMES_EN[idx];
    showToast(`${String(idx+1).padStart(2,'0')} · ${name}`);
  }

  /**
   * selectPresetRelative — advance by delta.
   * Called by keyboard arrow keys in main.js.
   * Also exposed on Engine2D directly.
   */
  function selectPresetRelative(engine, delta) {
    /* In v2.0 both engines share the 2D preset index */
    const current = activePreset2D;
    const next    = (current + delta + 60) % 60;
    selectPreset(next);
    return next;
  }

  function updateActiveLabel(index) {
    const name = lang === 'ar'
      ? PRESET_NAMES_AR[index]
      : PRESET_NAMES_EN[index];

    /* v2.0: engine tag always shows live integration status */
    const engineLabel = lang === 'ar'
      ? 'ثنائي الأبعاد ← ثلاثي الأبعاد مباشر'
      : '2D → 3D LIVE';

    if (el.activePresetNum)  el.activePresetNum.textContent  =
      String(index + 1).padStart(2, '0');
    if (el.activePresetName) el.activePresetName.textContent = name;
    if (el.activeEngineTag)  el.activeEngineTag.textContent  = engineLabel;

    if (el.activeLabel) {
      el.activeLabel.classList.remove('flash');
      void el.activeLabel.offsetWidth;
      el.activeLabel.classList.add('flash');
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — PARAMETER SLIDERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindSliders() {
    const configs = [
      {
        key: 'speed', dec: 2,
        onChange: v => {
          Engine2D.setParams({ speed: v });
          Cube3D.setParams({   speed: v });
        }
      },
      {
        key: 'scale', dec: 2,
        onChange: v => {
          Engine2D.setParams({ scale: v });
          Cube3D.setParams({   scale: v });
        }
      },
      {
        key: 'chaos', dec: 2,
        onChange: v => {
          Engine2D.setParams({ chaos: v });
          Cube3D.setParams({   chaos: v });
        }
      },
      {
        key: 'bloom', dec: 2,
        onChange: v => { Cube3D.setBloom(v); }
      },
      {
        key: 'rotation', dec: 2,
        onChange: v => { Cube3D.setParams({ rotation: v }); }
      },
      {
        key: 'density', dec: 0,
        onChange: v => { Engine2D.setParams({ density: v }); }
      },
      {
        /* v2.0 — texture depth/opacity */
        key: 'texOpacity', dec: 2,
        onChange: v => { Cube3D.setParams({ texOpacity: v }); }
      }
    ];

    configs.forEach(cfg => {
      const slider = el.sliders[cfg.key];
      if (!slider || !slider.range) return;

      slider.range.addEventListener('input', () => {
        const v = parseFloat(slider.range.value);
        slider.val.textContent =
          cfg.dec > 0 ? v.toFixed(cfg.dec) : Math.round(v).toString();
        slider.range.setAttribute('aria-valuenow', v);
        cfg.onChange(v);
      });

      slider.range.addEventListener('touchstart', e => {
        e.stopPropagation();
      }, { passive: true });
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — HEADER BUTTONS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindHeaderButtons() {

    /* Language */
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

    /* POV */
    if (el.btnPov) {
      el.btnPov.addEventListener('click', () => {
        povActive = !povActive;
        Cube3D.setPOV(povActive);
        document.getElementById('app')
                .classList.toggle('pov-mode', povActive);
        el.btnPov.classList.toggle('active', povActive);
        el.btnPov.setAttribute('aria-pressed', povActive);
        showToast(povActive
          ? (lang === 'ar'
             ? 'وضع POV — اضغط على المكعب للخروج'
             : 'POV Mode — click cube to exit')
          : (lang === 'ar'
             ? 'خرجت من وضع POV'
             : 'Exited POV Mode'));
      });

      const canvas3d = document.getElementById('canvas3d');
      if (canvas3d) {
        canvas3d.addEventListener('click', () => {
          if (povActive) el.btnPov.click();
        });
      }
    }

    /* Texture Mode Toggle */
    if (el.btnTexMode) {
      el.btnTexMode.addEventListener('click', () => {
        const isNowTex = Cube3D.toggleTextureMode();
        el.btnTexMode.classList.toggle('active', isNowTex);
        el.btnTexMode.setAttribute('aria-pressed', isNowTex);
        const isAr = lang === 'ar';

        el.btnTexMode.textContent = isNowTex
          ? (isAr ? '⬡ نسيج حي' : '⬡ LIVE TEX')
          : (isAr ? '⬡ شيدر'    : '⬡ SHADER');

        /* Update tex dot state */
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

    /* Audio */
    if (el.btnAudio) {
      el.btnAudio.addEventListener('click', async () => {
        if (!AudioEngine.isSupported()) {
          showToast(lang === 'ar'
            ? 'المتصفح لا يدعم الصوت'
            : 'Audio not supported', 'error');
          return;
        }

        if (!audioActive) {
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
              ? 'المايكروفون نشط'
              : 'Microphone active');
          } else {
            el.btnAudio.textContent = lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
            showToast(lang === 'ar'
              ? 'تعذّر الوصول للمايكروفون'
              : 'Microphone access denied', 'error');
          }
        } else {
          AudioEngine.stop();
          audioActive = false;
          el.btnAudio.classList.remove('active');
          el.btnAudio.setAttribute('aria-pressed', 'false');
          el.btnAudio.textContent = lang === 'ar' ? '♫ صوت' : '♫ AUDIO';
          showToast(lang === 'ar' ? 'تم إيقاف الصوت' : 'Audio stopped');
        }
      });
    }

    /* Screenshot */
    if (el.btnScreenshot) {
      el.btnScreenshot.addEventListener('click', takeScreenshot);
    }

    /* Fullscreen */
    if (el.btnFullscreen) {
      el.btnFullscreen.addEventListener('click', toggleFullscreen);

      document.addEventListener('fullscreenchange', () => {
        const isFull = !!document.fullscreenElement;
        el.btnFullscreen.textContent = isFull
          ? (lang === 'ar' ? '⛶ خروج' : '⛶ EXIT')
          : (lang === 'ar' ? '⛶ كامل' : '⛶ FULL');
      });
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — ACTION BUTTONS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindActionButtons() {
    if (el.btnShatter) {
      el.btnShatter.addEventListener('click', () => {
        Cube3D.triggerShatter();
        triggerShatterVFX();
        showToast(lang === 'ar' ? 'تحطيم!' : 'SHATTERING!', 'beat');
      });
    }

    if (el.btnRandomize) {
      el.btnRandomize.addEventListener('click', randomizeBoth);
    }
  }

  function randomizeBoth() {
    let i2d = Math.floor(Math.random() * 60);
    let i3d = Math.floor(Math.random() * 60);
    while (i3d === i2d) i3d = Math.floor(Math.random() * 60);

    /* v2.0: set 2D engine — cube gets it via texture */
    Engine2D.setPreset(i2d);
    Engine2D.resetParticles();
    Cube3D.setPreset(i3d);

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
     SECTION 8 — PANEL & TAB CONTROLS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function bindPanelControls() {

    if (el.btnTogglePanel) {
      el.btnTogglePanel.addEventListener('click', () => {
        panelOpen = !panelOpen;
        if (window.innerWidth <= 768) {
          el.panelPresets.classList.toggle('open', panelOpen);
        } else {
          el.panelPresets.classList.toggle('collapsed', !panelOpen);
        }
        updatePanelToggleIcon();
        el.btnTogglePanel.setAttribute('aria-expanded', panelOpen);
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
               : 'Texture Source — controls particles & cube')
            : (lang === 'ar'
               ? 'طبقة GLSL — مستقلة فوق النسيج الحي'
               : 'GLSL Overlay — independent over live texture'));
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
    el.btnTogglePanel.textContent =
      panelOpen
        ? (isRTL ? '›' : '‹')
        : (isRTL ? '‹' : '›');
  }

  function closeMobilePanel() {
    panelOpen = false;
    el.panelPresets.classList.remove('open');
    updatePanelToggleIcon();
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
     SECTION 10 — SCREENSHOT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function takeScreenshot() {
    try {
      if (el.screenshotFlash) {
        el.screenshotFlash.classList.remove('hidden');
        el.screenshotFlash.classList.add('active');
        setTimeout(() => {
          el.screenshotFlash.classList.remove('active');
          setTimeout(() => el.screenshotFlash.classList.add('hidden'), 450);
        }, 50);
      }

      const dataURL   = Cube3D.captureFrame();
      const link      = document.createElement('a');
      const timestamp = new Date().toISOString()
                                  .replace(/[:.]/g, '-')
                                  .slice(0, 19);
      link.download = `geozakhraf-xhaos-v2-${timestamp}.png`;
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
     SECTION 11 — SHATTER VFX
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function triggerShatterVFX() {
    const overlay     = document.createElement('div');
    overlay.className = 'shatter-overlay';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 750);

    if (el.btnShatter) {
      el.btnShatter.classList.add('beat-active');
      setTimeout(() => el.btnShatter.classList.remove('beat-active'), 350);
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 12 — TOAST SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function showToast(message, type, duration) {
    type     = type     || 'info';
    duration = duration || 2000;
    toastQueue.push({ message, type, duration });
    if (!toastActive) processToastQueue();
  }

  function processToastQueue() {
    if (toastQueue.length === 0) { toastActive = false; return; }
    toastActive = true;
    const { message, type, duration } = toastQueue.shift();

    const toast     = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    if (lang === 'ar') toast.dir = 'rtl';

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-hiding');
      setTimeout(() => { toast.remove(); processToastQueue(); }, 350);
    }, duration);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 13 — LANGUAGE SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function applyLanguage() {
    const html = document.getElementById('html-root');
    const isAr = lang === 'ar';

    html.lang = lang;
    html.dir  = isAr ? 'rtl' : 'ltr';

    if (el.btnLang) {
      el.btnLang.textContent = isAr ? 'EN' : 'AR';
      el.btnLang.title       = isAr
        ? 'Switch to English' : 'التبديل إلى العربية';
    }

    if (el.brandTag) {
      el.brandTag.textContent = isAr ? 'محرك الفوضى' : 'XHAOS ENGINE';
    }

    /* data-en / data-ar elements */
    document.querySelectorAll('[data-en]').forEach(elem => {
      const arText = elem.dataset.ar;
      if (arText !== undefined) {
        elem.textContent = isAr ? arText : elem.dataset.en;
      }
    });

    if (el.presetSearch) {
      el.presetSearch.placeholder =
        isAr ? 'البحث عن صيغة…' : 'Search formula…';
    }

    if (el.btnShatter) {
      el.btnShatter.textContent = isAr ? '⚡ تحطيم' : '⚡ SHATTER';
    }
    if (el.btnRandomize) {
      el.btnRandomize.textContent = isAr ? '⚄ عشوائي' : '⚄ RANDOMIZE';
    }
    if (el.btnPov) {
      el.btnPov.textContent = isAr ? '⊙ منظور' : '⊙ POV';
    }

    /* v2.0 texture mode button */
    if (el.btnTexMode) {
      const isTexActive = el.btnTexMode.classList.contains('active');
      el.btnTexMode.textContent = isTexActive
        ? (isAr ? '⬡ نسيج حي' : '⬡ LIVE TEX')
        : (isAr ? '⬡ شيدر'    : '⬡ SHADER');
    }

    if (el.btnAudio) {
      el.btnAudio.textContent = isAr ? '♫ صوت' : '♫ AUDIO';
    }
    if (el.btnScreenshot) {
      el.btnScreenshot.textContent = isAr ? '⬡ التقاط' : '⬡ CAPTURE';
    }
    if (el.btnFullscreen) {
      el.btnFullscreen.textContent = !!document.fullscreenElement
        ? (isAr ? '⛶ خروج' : '⛶ EXIT')
        : (isAr ? '⛶ كامل' : '⛶ FULL');
    }

    /* Slider labels */
    const sliderLabels = {
      speed:      { en: 'SPEED',     ar: 'السرعة'    },
      scale:      { en: 'SCALE',     ar: 'النطاق'    },
      chaos:      { en: 'CHAOS',     ar: 'الفوضى'    },
      bloom:      { en: 'BLOOM',     ar: 'الإضاءة'   },
      rotation:   { en: 'ROTATION',  ar: 'الدوران'   },
      density:    { en: 'DENSITY',   ar: 'الكثافة'   },
      texOpacity: { en: 'TEX DEPTH', ar: 'عمق النسيج'}
    };

    Object.entries(sliderLabels).forEach(([key, labels]) => {
      const s = el.sliders[key];
      if (s && s.range) {
        const label = s.range.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
          label.textContent = isAr ? labels.ar : labels.en;
        }
      }
    });

    /* Tab labels — v2.0 specific */
    if (el.tabBtns) {
      el.tabBtns.forEach(btn => {
        if (btn.dataset.tab === '2d') {
          btn.textContent = isAr
            ? 'مصدر النسيج' : '2D · TEXTURE SRC';
        } else {
          btn.textContent = isAr
            ? 'طبقة ثلاثية' : '3D · OVERLAY';
        }
      });
    }

    /* Sync HUD */
    const syncTitle = document.querySelector('.sync-title');
    if (syncTitle) {
      syncTitle.textContent = isAr ? 'تزامن الانعكاس' : 'INVERSION SYNC';
    }

    const dirLabel = document.querySelector('.dir-label');
    if (dirLabel) {
      dirLabel.textContent = isAr ? 'الدوران' : 'ROTATION';
    }

    /* Shortcuts */
    const sh = document.querySelector('.shortcuts-header span');
    if (sh) {
      sh.textContent = isAr
        ? 'اختصارات لوحة المفاتيح' : 'KEYBOARD SHORTCUTS';
    }

    updatePanelToggleIcon();
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 14 — SYNC HUD UPDATER
     Called every frame from main.js masterLoop
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * updateSyncHUD — refresh all sync visualisations.
   *
   * v2.0 addition: TEX row shows live texture status.
   * Green = CanvasTexture syncing at full rate.
   * Dim   = shader overlay mode active.
   */
  function updateSyncHUD(m2d, sync, mAudio) {

    /* Sync bars */
    const freq2d    = Math.min(Math.abs(m2d.frequency   || 0), 1.0);
    const scale3d   = Math.min(Math.abs(1.0 - (sync.scaleMult || 1)), 1.0);
    const omega     = mAudio ? Math.min(mAudio.bassSmooth || 0, 1.0) : 0;

    const pct2d     = Math.round(freq2d  * 100);
    const pct3d     = Math.round(scale3d * 100);
    const pctOmega  = Math.round(omega   * 100);

    if (el.sync2dFill)    el.sync2dFill.style.width    = pct2d    + '%';
    if (el.sync3dFill)    el.sync3dFill.style.width    = pct3d    + '%';
    if (el.syncOmegaFill) el.syncOmegaFill.style.width = pctOmega + '%';
    if (el.sync2dNum)     el.sync2dNum.textContent     = pct2d    + '%';
    if (el.sync3dNum)     el.sync3dNum.textContent     = pct3d    + '%';
    if (el.syncOmegaNum)  el.syncOmegaNum.textContent  = pctOmega + '%';

    /* v2.0 — Texture sync row */
    const texStatus = Cube3D.getTexSyncStatus
      ? Cube3D.getTexSyncStatus()
      : { mode: 'LIVE_TEXTURE' };

    const isLiveTex = texStatus.mode === 'LIVE_TEXTURE';

    if (el.syncTexFill) {
      el.syncTexFill.style.width      = isLiveTex ? '100%' : '22%';
      el.syncTexFill.style.background = isLiveTex
        ? 'linear-gradient(90deg, #00f0ff44, #00ff88)'
        : 'linear-gradient(90deg, #8b00ff44, #8b00ff)';
    }

    if (el.syncTexNum) {
      el.syncTexNum.textContent = isLiveTex ? 'LIVE' : 'GLSL';
      el.syncTexNum.style.color = isLiveTex
        ? 'var(--green)' : 'var(--violet)';
    }

    /* Direction arrows */
    if (el.dir2d && el.dir3d) {
      el.dir2d.textContent = m2d.clockwise  ? '↻' : '↺';
      el.dir3d.textContent = !m2d.clockwise ? '↻' : '↺';
    }

    /* FPS */
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLastTime >= 500) {
      smoothFPS   = Math.round(fpsFrames / ((now - fpsLastTime) / 1000));
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

    /* Beat dot */
    if (mAudio && el.beatDot) {
      if (mAudio.beatDetect) {
        el.beatDot.classList.add('active');
        beatFlashTimer = 6;
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
      if (mAudio.bpm > 0) {
        el.beatDot.title = `${mAudio.bpm} BPM`;
      }
    }

    /* Tex dot pulse */
    if (el.texDot) {
      el.texDot.classList.toggle('inactive', !isLiveTex);
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 15 — TOAST CSS INJECTION
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
        background:     rgba(0,8,28,0.90);
        border:         1px solid rgba(0,200,255,0.25);
        backdrop-filter: blur(12px);
        pointer-events: none;
        white-space:    nowrap;
        opacity:        0;
        transition:     opacity 0.25s ease,
                        transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
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
        border-color: rgba(255,34,68,0.45);
        background:   rgba(40,0,8,0.92);
        color:        #ff8899;
      }
      .toast-beat {
        border-color: rgba(255,215,0,0.45);
        background:   rgba(20,15,0,0.92);
        color:        var(--gold, #ffd700);
      }
    `;
    document.head.appendChild(style);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 16 — INIT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function init() {
    injectToastStyles();
    cacheElements();
    buildPresetList();
    bindSliders();
    bindHeaderButtons();
    bindActionButtons();
    bindPanelControls();
    bindShortcutsOverlay();
    applyLanguage();
    updateActiveLabel(0);

    setTimeout(() => {
      showToast(lang === 'ar'
        ? 'المكعب يرتدي الحقل الرياضي — تكامل مباشر ✓'
        : 'Cube wears the 2D field — live integration active ✓',
        'info', 3500);
    }, 700);

    console.info('[UI] v2.0 initialised. Live texture integration ready.');
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
