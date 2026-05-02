/**
 * ═══════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — ui.js
 *  Glassmorphism UI · Bilingual (AR/EN) · Presets
 *  Parameter Controls · Mobile Touch
 * ═══════════════════════════════════════════════════
 */

'use strict';

window.UI = (function () {

  /* ─── State ─── */
  let lang          = 'en';
  let activePreset2D = 0;
  let activePreset3D = 0;
  let activeTab      = '2d';

  const PRESET_NAMES = Engine2D.getPresetNames();

  // Arabic translations for preset names
  const PRESET_NAMES_AR = [
    'ألياف ضوئية','حرير رقمي','اضطراب موجي','دوامة ديناميكية','شبكة عصبية',
    'كتل البيانات','أمواج الرمل','نهر المجرة','انجراف شعاعي','تكرار هندسي',
    'حقل مغناطيسي','فوضى منظمة','حلزون كسوري','عاصفة كهربائية','حلزون DNA',
    'نمو المرجان','حقل كمي','خريطة طبوغرافية','تدفق مرآة','محاكاة دخان',
    'شبكة بلورية','سديم','نسيج منسوج','ثقب أسود','الشفق القطبي',
    'تدفق فورونوي','حلقات تداخل','إعصار','شبكة عصبية','ذراع المجرة',
    'رخام سائل','شعلة شمسية','أوردة مجمدة','طية مخمل','تيار شريطي',
    'تموجات صوتية','شبكة بلازما','وريد رخامي','نفق خارق','انجراف طحلبي',
    'تيار شبكي','غرفة سحابية','انتشار حبر','شبكة مضيئة','بلاط توافقي',
    'حديقة حلزونية','تدفق الزئبق','موجة منشور','شبكة مدارية','انجراف جمر',
    'انكسار زجاجي','تيار المحيط','زهرة حريرية','حلقات تدفق','تدفق صناعي',
    'مشتل النجوم','شبكة موجية','نبض تداخلي','تيار مداري','حقل خفي'
  ];

  /* ══════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════ */

  function init() {
    buildPresetList();
    bindParameters();
    bindHeaderButtons();
    bindTabs();
    bindSearch();
    applyLanguage();
  }

  /* ══════════════════════════════════════════════
     PRESET LIST
  ══════════════════════════════════════════════ */

  function buildPresetList(filter = '') {
    const list = document.getElementById('preset-list');
    list.innerHTML = '';

    PRESET_NAMES.forEach((name, i) => {
      const arName = PRESET_NAMES_AR[i] || name;
      const display = lang === 'ar' ? arName : name;

      if (filter && !display.toLowerCase().includes(filter.toLowerCase()) &&
          !name.toLowerCase().includes(filter.toLowerCase())) return;

      const item = document.createElement('div');
      item.className = 'preset-item';
      item.dataset.index = i;

      const isActive = activeTab === '2d' ? i === activePreset2D : i === activePreset3D;
      if (isActive) item.classList.add('active');

      item.innerHTML = `
        <span class="preset-num">${String(i+1).padStart(2,'0')}</span>
        <span class="preset-name">${display}</span>
      `;

      item.addEventListener('click', () => selectPreset(i));
      list.appendChild(item);
    });
  }

  function selectPreset(index) {
    if (activeTab === '2d') {
      activePreset2D = index;
      Engine2D.setPreset(index);
    } else {
      activePreset3D = index;
      Cube3D.setPreset(index);
    }

    // Update label
    const numEl  = document.getElementById('active-preset-num');
    const nameEl = document.getElementById('active-preset-name');
    if (numEl)  numEl.textContent  = String(index+1).padStart(2,'0');
    if (nameEl) nameEl.textContent = lang === 'ar' ? PRESET_NAMES_AR[index] : PRESET_NAMES[index];

    buildPresetList(); // refresh active state
  }

  /* ══════════════════════════════════════════════
     PARAMETER SLIDERS
  ══════════════════════════════════════════════ */

  function bindParameters() {
    const sliders = [
      { id: 'param-speed',    val: 'val-speed',    key: 'speed',    both: true  },
      { id: 'param-scale',    val: 'val-scale',    key: 'scale',    both: true  },
      { id: 'param-chaos',    val: 'val-chaos',    key: 'chaos',    both: true  },
      { id: 'param-bloom',    val: 'val-bloom',    key: 'bloom',    three: true },
      { id: 'param-rotation', val: 'val-rotation', key: 'rotation', three: true }
    ];

    sliders.forEach(cfg => {
      const el  = document.getElementById(cfg.id);
      const val = document.getElementById(cfg.val);
      if (!el) return;

      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        val.textContent = v.toFixed(2);

        if (cfg.both)  { Engine2D.setParams({ [cfg.key]: v }); Cube3D.setParams({ [cfg.key]: v }); }
        if (cfg.three) { Cube3D.setParams({ [cfg.key]: v }); }
        if (cfg.key === 'bloom') Cube3D.setBloom(v);
      });
    });
  }

  /* ══════════════════════════════════════════════
     HEADER BUTTONS
  ══════════════════════════════════════════════ */

  function bindHeaderButtons() {
    /* Language toggle */
    const btnLang = document.getElementById('btn-lang');
    if (btnLang) {
      btnLang.addEventListener('click', () => {
        lang = lang === 'en' ? 'ar' : 'en';
        btnLang.textContent = lang === 'en' ? 'AR' : 'EN';
        applyLanguage();
        buildPresetList();
      });
    }

    /* POV mode */
    const btnPov = document.getElementById('btn-pov');
    let povOn = false;
    if (btnPov) {
      btnPov.addEventListener('click', () => {
        povOn = !povOn;
        Cube3D.setPOV(povOn);
        document.getElementById('app').classList.toggle('pov-mode', povOn);
        btnPov.classList.toggle('active', povOn);
      });
    }

    /* Audio */
    const btnAudio = document.getElementById('btn-audio');
    let audioOn = false;
    if (btnAudio) {
      btnAudio.addEventListener('click', async () => {
        if (!audioOn) {
          const ok = await AudioEngine.init();
          if (ok) {
            audioOn = true;
            btnAudio.classList.add('active');
          } else {
            btnAudio.style.color = 'var(--accent-red)';
          }
        } else {
          AudioEngine.stop();
          audioOn = false;
          btnAudio.classList.remove('active');
        }
      });
    }

    /* Fullscreen */
    const btnFs = document.getElementById('btn-fullscreen');
    if (btnFs) {
      btnFs.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    /* Shatter */
    const btnShatter = document.getElementById('btn-shatter');
    if (btnShatter) {
      btnShatter.addEventListener('click', () => {
        Cube3D.triggerShatter();
        // Visual flash
        const ov = document.createElement('div');
        ov.className = 'shatter-overlay';
        document.body.appendChild(ov);
        setTimeout(() => ov.remove(), 700);
      });
    }

    /* Randomize */
    const btnRand = document.getElementById('btn-randomize');
    if (btnRand) {
      btnRand.addEventListener('click', () => {
        const i2 = Math.floor(Math.random() * 60);
        const i3 = Math.floor(Math.random() * 60);
        Engine2D.setPreset(i2);
        Cube3D.setPreset(i3);
        activePreset2D = i2; activePreset3D = i3;
        buildPresetList();
        // Update label with 3D preset
        const numEl  = document.getElementById('active-preset-num');
        const nameEl = document.getElementById('active-preset-name');
        if (numEl)  numEl.textContent  = String(i3+1).padStart(2,'0');
        if (nameEl) nameEl.textContent = lang === 'ar' ? PRESET_NAMES_AR[i3] : PRESET_NAMES[i3];
      });
    }

    /* Panel toggle */
    const btnPanel = document.getElementById('btn-toggle-panel');
    if (btnPanel) {
      btnPanel.addEventListener('click', () => {
        const panel = document.getElementById('panel-presets');
        panel.classList.toggle('collapsed');
        btnPanel.textContent = panel.classList.contains('collapsed') ? '›' : '‹';
        if (document.documentElement.dir === 'rtl') {
          btnPanel.textContent = panel.classList.contains('collapsed') ? '‹' : '›';
        }
      });
    }
  }

  /* ──────────────── Tabs ──────────────── */

  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        buildPresetList();
      });
    });
  }

  /* ──────────────── Search ──────────────── */

  function bindSearch() {
    const inp = document.getElementById('preset-search');
    if (!inp) return;
    inp.addEventListener('input', () => buildPresetList(inp.value));
  }

  /* ══════════════════════════════════════════════
     LANGUAGE
  ══════════════════════════════════════════════ */

  function applyLanguage() {
    const html  = document.getElementById('html-root');
    const isAr  = lang === 'ar';
    html.lang   = lang;
    html.dir    = isAr ? 'rtl' : 'ltr';

    // Update all data-en / data-ar elements
    document.querySelectorAll('[data-en]').forEach(el => {
      el.textContent = isAr ? (el.dataset.ar || el.dataset.en) : el.dataset.en;
    });

    // Brand tag
    const tag = document.getElementById('brand-tag');
    if (tag) tag.textContent = isAr ? 'محرك الفوضى' : 'XHAOS ENGINE';

    // Placeholders
    const search = document.getElementById('preset-search');
    if (search) search.placeholder = isAr ? 'بحث عن صيغة…' : 'Search formula…';

    // Action buttons
    const btnShatter = document.getElementById('btn-shatter');
    if (btnShatter) btnShatter.textContent = isAr ? 'تحطيم' : 'SHATTER';
    const btnRand = document.getElementById('btn-randomize');
    if (btnRand) btnRand.textContent = isAr ? 'عشوائي' : 'RANDOMIZE';
  }

  /* ══════════════════════════════════════════════
     SYNC HUD UPDATE (called from main.js)
  ══════════════════════════════════════════════ */

  function updateSyncHUD(m2d, sync) {
    const fill2d    = document.getElementById('sync-2d-fill');
    const fill3d    = document.getElementById('sync-3d-fill');
    const fillOmega = document.getElementById('sync-omega-fill');

    if (fill2d)    fill2d.style.width    = (Math.min(Math.abs(m2d.frequency), 1) * 100) + '%';
    if (fill3d)    fill3d.style.width    = (Math.min(sync.scaleMult, 2) * 50) + '%';
    if (fillOmega) fillOmega.style.width = (Math.abs(m2d.outwardFlow) * 30 + 50) + '%';
  }

  return { init, updateSyncHUD };

})();
