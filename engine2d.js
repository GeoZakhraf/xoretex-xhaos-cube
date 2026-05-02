/**
 * Xoretex Xhaos Cube — engine2d.js
 * 2D Particle Flow Engine, Localization, Panel Logic,
 * Force Fields, Audio, Game Modes, Export Tools
 * Part 1: Core setup, localization, panel, presets, snippets
 */

'use strict';

// ============================================================
// GLOBAL ERROR REPORTER
// ============================================================
function reportError(msg, err) {
  const el = document.getElementById('errorOverlay');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML += '<div style="margin-bottom:6px;"><b>⚠</b> ' + msg +
    (err ? '<br><span style="color:#f88">' + String(err) + '</span>' : '') + '</div>';
  console.error('[XoretexEngine2D]', msg, err || '');
}

// ============================================================
// LOCALIZATION
// ============================================================
const TRANSLATIONS = {
  en: {
    presets: 'Presets', liveInjection: 'Live Injection', formulaCode: 'Formula Code',
    apply: 'Apply', valid: 'Valid', invalid: 'Invalid', snippetLibrary: 'Snippet Library',
    layers: 'Layers', addLayer: '+ Add Layer', audio: 'Audio', microphone: '🎤 Mic',
    audioFile: '🎵 File', stopAudio: '⏹ Stop', bpm: 'BPM', beat: 'Beat', audioGain: 'Audio Gain',
    forceFields: 'Force Fields', addField: '+ Add', pulsate: 'Pulsate', pulseSpeed: 'Pulse Speed',
    effects: 'Effects', trailFade: 'Trail Fade', motionBlur: 'Motion Blur', glowBloom: 'Glow / Bloom',
    connections: 'Connections', connDist: 'Connection Distance', symmetry: 'Symmetry',
    depth3d: '3D Depth Illusion', trailShape: 'Trail Shape', controls: 'Controls',
    particleCount: 'Particle Count', speed: 'Speed', friction: 'Friction', turbulence: 'Turbulence',
    mouseForce: 'Mouse Force', interaction: 'Interaction', mouseMode: 'Mouse Mode',
    gameModes: 'Game Modes', painter: '🎨 Painter', sculptor: '🗿 Sculptor', battle: '⚔ Battle',
    colorWar: '🌈 Color War', exitGame: '✕ Exit Game', cubeControls: 'Cube Controls',
    cubePattern: 'Pattern', random: 'Random', autoSwitch: 'Auto Switch',
    autoInterval: 'Auto Interval (s)', autoSpin: 'Auto Spin', zenOrbit: 'Zen Orbit',
    reflection: 'Reflection', floorGrid: 'Floor Grid', edgeGlow: 'Edge Glow',
    emissive: 'Emissive', shatter: '💥 Shatter', actions: 'Actions', export4k: '📐 4K Export',
    exportSvg: '🖼 SVG', exportGlsl: '🔧 GLSL', saveConfig: '💾 Save Config',
    loadConfig: '📂 Load Config', shortcuts: 'Shortcuts', scPause: 'Pause / Resume',
    scFull: 'Fullscreen', scScreen: 'Screenshot', scRecord: 'Record', scHelp: 'Help',
    scPanel: 'Toggle Panel', scLang: 'Language', scMode: 'View Mode', scNextPat: 'Next Pattern',
    helpTitle: 'Welcome to Xoretex Xhaos Cube',
    svgExportTitle: 'SVG Export', glslExportTitle: 'GLSL Approximation',
    copy: 'Copy', download: 'Download', dontShowAgain: "Don't show on startup",
    stopRec: 'Stop', layerColor: 'Color', layerPalette: 'Palette', layerOpacity: 'Opacity',
    layerWeight: 'Weight', layerEquation: 'Equation', removeLayer: 'Remove',
    removeField: 'Remove', noAudio: 'No audio source', toastCopied: 'Copied!',
    toastSaved: 'Config saved!', toastLoaded: 'Config loaded!',
    toastRecStart: 'Recording started', toastRecStop: 'Recording stopped',
    toastScreenshot: 'Screenshot saved', toast4K: '4K screenshot saved',
    toastShatter: 'Shatter!', paused: 'Paused', resumed: 'Resumed',
    helpStep1Title: '1. View Modes', helpStep1: 'Use the BOTH / 2D Flow / 3D Cube tabs to switch between the particle engine and the 3D cube renderer.',
    helpStep2Title: '2. Live Formula Injection', helpStep2: 'Type any JavaScript expression into the Formula Code box. Variables: x, y, t, r, cx, cy, PI, sin, cos, tan, atan2, sqrt, abs, noise, audio. The result steers particle velocity.',
    helpStep3Title: '3. Layers', helpStep3: 'Add multiple formula layers. Each has its own color, palette, opacity, and weight. Click a layer title to focus it.',
    helpStep4Title: '4. Force Fields', helpStep4: 'Add attract, repel, vortex, or gravity fields. Drag their markers on the canvas. Enable Pulsate for animated strength.',
    helpStep5Title: '5. Audio', helpStep5: 'Click Mic to use your microphone or load an audio file. The engine reacts to bass, mid, and high frequencies.',
    helpStep6Title: '6. Game Modes', helpStep6: 'Try Painter, Sculptor, Battle, or Color War modes. Exit with the Exit Game button.',
    helpStep7Title: '7. Export', helpStep7: 'Export PNG screenshots, 4K images, SVG paths, GLSL shaders, WebM video, or save/load the full config as JSON.',
  },
  ar: {
    presets: 'الإعدادات المسبقة', liveInjection: 'الحقن المباشر', formulaCode: 'كود المعادلة',
    apply: 'تطبيق', valid: 'صالح', invalid: 'غير صالح', snippetLibrary: 'مكتبة المقتطفات',
    layers: 'الطبقات', addLayer: '+ إضافة طبقة', audio: 'الصوت', microphone: '🎤 ميكروفون',
    audioFile: '🎵 ملف', stopAudio: '⏹ إيقاف', bpm: 'النبض/د', beat: 'الإيقاع',
    audioGain: 'كسب الصوت', forceFields: 'حقول القوة', addField: '+ إضافة',
    pulsate: 'نبض', pulseSpeed: 'سرعة النبض', effects: 'المؤثرات', trailFade: 'تلاشي الأثر',
    motionBlur: 'ضبابية الحركة', glowBloom: 'توهج / إشعاع', connections: 'التوصيلات',
    connDist: 'مسافة التوصيل', symmetry: 'التناسق', depth3d: 'وهم العمق ثلاثي الأبعاد',
    trailShape: 'شكل الأثر', controls: 'عناصر التحكم', particleCount: 'عدد الجسيمات',
    speed: 'السرعة', friction: 'الاحتكاك', turbulence: 'الاضطراب', mouseForce: 'قوة الماوس',
    interaction: 'التفاعل', mouseMode: 'وضع الماوس', gameModes: 'أوضاع اللعبة',
    painter: '🎨 رسام', sculptor: '🗿 نحات', battle: '⚔ معركة', colorWar: '🌈 حرب ألوان',
    exitGame: '✕ الخروج من اللعبة', cubeControls: 'تحكم المكعب', cubePattern: 'النمط',
    random: 'عشوائي', autoSwitch: 'تبديل تلقائي', autoInterval: 'فترة التبديل (ث)',
    autoSpin: 'دوران تلقائي', zenOrbit: 'مدار زن', reflection: 'الانعكاس',
    floorGrid: 'شبكة الأرضية', edgeGlow: 'توهج الحواف', emissive: 'الإشعاع',
    shatter: '💥 تحطيم', actions: 'الإجراءات', export4k: '📐 تصدير 4K',
    exportSvg: '🖼 SVG', exportGlsl: '🔧 GLSL', saveConfig: '💾 حفظ الإعدادات',
    loadConfig: '📂 تحميل الإعدادات', shortcuts: 'الاختصارات', scPause: 'إيقاف / استئناف',
    scFull: 'ملء الشاشة', scScreen: 'لقطة شاشة', scRecord: 'تسجيل', scHelp: 'مساعدة',
    scPanel: 'إظهار/إخفاء اللوحة', scLang: 'اللغة', scMode: 'وضع العرض',
    scNextPat: 'النمط التالي', helpTitle: 'مرحباً بك في Xoretex Xhaos Cube',
    svgExportTitle: 'تصدير SVG', glslExportTitle: 'تقريب GLSL',
    copy: 'نسخ', download: 'تحميل', dontShowAgain: 'عدم الإظهار عند البدء',
    stopRec: 'إيقاف', layerColor: 'اللون', layerPalette: 'اللوحة', layerOpacity: 'الشفافية',
    layerWeight: 'الوزن', layerEquation: 'المعادلة', removeLayer: 'إزالة',
    removeField: 'إزالة', noAudio: 'لا مصدر صوتي', toastCopied: 'تم النسخ!',
    toastSaved: 'تم حفظ الإعدادات!', toastLoaded: 'تم تحميل الإعدادات!',
    toastRecStart: 'بدأ التسجيل', toastRecStop: 'توقف التسجيل',
    toastScreenshot: 'تم حفظ الصورة', toast4K: 'تم حفظ صورة 4K',
    toastShatter: 'تحطيم!', paused: 'متوقف', resumed: 'استُؤنف',
    helpStep1Title: '١. أوضاع العرض', helpStep1: 'استخدم أزرار BOTH / 2D Flow / 3D Cube للتبديل بين محرك الجسيمات ومحرك المكعب ثلاثي الأبعاد.',
    helpStep2Title: '٢. الحقن المباشر للمعادلة', helpStep2: 'اكتب أي تعبير JavaScript في خانة كود المعادلة. المتغيرات المتاحة: x, y, t, r, cx, cy, PI, sin, cos, tan, atan2, sqrt, abs, noise, audio.',
    helpStep3Title: '٣. الطبقات', helpStep3: 'أضف طبقات معادلة متعددة. لكل طبقة لونها ولوحتها وشفافيتها ووزنها. انقر على عنوان الطبقة لتركيزها.',
    helpStep4Title: '٤. حقول القوة', helpStep4: 'أضف حقول جذب أو طرد أو دوامة أو جاذبية. اسحب علاماتها على اللوحة. فعّل النبض للقوة المتحركة.',
    helpStep5Title: '٥. الصوت', helpStep5: 'انقر على الميكروفون لاستخدام الميكروفون أو حمّل ملف صوتي. يتفاعل المحرك مع الترددات العالية والمتوسطة والمنخفضة.',
    helpStep6Title: '٦. أوضاع اللعبة', helpStep6: 'جرّب أوضاع الرسام والنحات والمعركة وحرب الألوان. اخرج بزر الخروج من اللعبة.',
    helpStep7Title: '٧. التصدير', helpStep7: 'صدّر صور PNG أو صور 4K أو مسارات SVG أو شيدرز GLSL أو فيديو WebM أو احفظ وحمّل الإعدادات بصيغة JSON.',
  }
};

let currentLang = localStorage.getItem('xoretex_lang') || 'en';

function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) ||
         (TRANSLATIONS.en[key]) || key;
}

function applyLocalization() {
  const html = document.documentElement;
  html.setAttribute('lang', currentLang);
  html.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  const langBtn = document.getElementById('btnLang');
  if (langBtn) langBtn.textContent = currentLang === 'en' ? 'عر' : 'EN';
  buildHelpModal();
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  localStorage.setItem('xoretex_lang', currentLang);
  applyLocalization();
}

// ============================================================
// NOISE UTILITY (simple value noise)
// ============================================================
const _noiseTable = new Float32Array(512);
(function initNoise() {
  for (let i = 0; i < 256; i++) _noiseTable[i] = _noiseTable[i + 256] = Math.random();
})();

function noise2D(x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = _noiseTable[xi] + yi;
  const b = _noiseTable[xi + 1] + yi;
  return (
    _noiseTable[a & 255] * (1 - u) * (1 - v) +
    _noiseTable[b & 255] * u * (1 - v) +
    _noiseTable[(a + 1) & 255] * (1 - u) * v +
    _noiseTable[(b + 1) & 255] * u * v
  );
}

// ============================================================
// COLOR PALETTES
// ============================================================
const PALETTES = {
  mono:   ['#00ffc8','#00e0b0','#00c090','#00a070','#00ff99'],
  cool:   ['#00e5ff','#0080ff','#8000ff','#00ffc8','#4040ff'],
  warm:   ['#ff8800','#ff4400','#ffcc00','#ff0044','#ff6600'],
  neon:   ['#ff00ff','#00ffff','#ff0080','#00ff80','#8000ff'],
  ocean:  ['#006080','#00a8cc','#00e5ff','#0040a0','#40e0d0'],
  fire:   ['#ff2200','#ff6600','#ffaa00','#ffee00','#ff0044'],
  sunset: ['#ff6b35','#ff8c42','#f9c74f','#ff4d6d','#c77dff'],
  forest: ['#1a6b1a','#2ecc71','#00a86b','#228b22','#7fff00'],
};

function getPaletteColor(paletteName, index, total) {
  const pal = PALETTES[paletteName] || PALETTES.mono;
  return pal[Math.floor((index / Math.max(total, 1)) * pal.length) % pal.length];
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// ============================================================
// FORMULA SNIPPETS
// ============================================================
const SNIPPETS = [
  { name: 'Swirly Nebula',   code: 'sin(r*0.01-t)*cos(atan2(y-cy,x-cx)+t)*3' },
  { name: 'Grid Wave',       code: 'sin(x*0.04+t)*sin(y*0.04+t)*2' },
  { name: 'Sine Ocean',      code: 'sin(x*0.03+t*1.5)*2+cos(y*0.02-t)*1.5' },
  { name: 'Crystal Lattice', code: 'sin(x*0.05)*cos(y*0.05)*sin(t+r*0.005)*3' },
  { name: 'DNA Helix',       code: 'sin(y*0.05+t)*3+cos(x*0.02)*noise(x*0.01,y*0.01+t)*2' },
  { name: 'Spiral Arms',     code: 'sin(atan2(y-cy,x-cx)*4-r*0.008+t)*3' },
  { name: 'Turbulent Flow',  code: 'noise(x*0.008+t*0.4,y*0.008+t*0.3)*6-3' },
  { name: 'Electric Arc',    code: 'sin(x*0.03+noise(x*0.02,t)*4)*3+cos(y*0.02)*2' },
  { name: 'Orbital Ring',    code: 'sin(r*0.015-t*2)*3*cos(atan2(y-cy,x-cx)+t*0.5)' },
  { name: 'Flower Bloom',    code: 'sin(atan2(y-cy,x-cx)*6+t)*cos(r*0.01-t)*3' },
];

// ============================================================
// PRESETS
// ============================================================
const PRESETS = [
  {
    name: 'Nebula Storm',
    config: { particleCount:8000, speed:1.2, friction:0.97, turbulence:0.4, trailFade:0.06 },
    layers: [
      { eq:'sin(r*0.01-t)*cos(atan2(y-cy,x-cx)+t)*3', color:'#00ffc8', palette:'cool', opacity:1, weight:1 },
      { eq:'noise(x*0.008+t*0.4,y*0.008)*6-3', color:'#ff00ff', palette:'neon', opacity:0.7, weight:0.7 },
    ]
  },
  {
    name: 'Ocean Pulse',
    config: { particleCount:6000, speed:0.8, friction:0.975, turbulence:0.2, trailFade:0.05 },
    layers: [
      { eq:'sin(x*0.03+t*1.5)*2+cos(y*0.02-t)*1.5', color:'#00e5ff', palette:'ocean', opacity:1, weight:1 },
    ]
  },
  {
    name: 'Fire Spiral',
    config: { particleCount:7000, speed:1.5, friction:0.965, turbulence:0.6, trailFade:0.1 },
    layers: [
      { eq:'sin(atan2(y-cy,x-cx)*4-r*0.008+t)*3', color:'#ff4400', palette:'fire', opacity:1, weight:1 },
      { eq:'cos(r*0.015-t*2)*3', color:'#ffaa00', palette:'warm', opacity:0.6, weight:0.5 },
    ]
  },
  {
    name: 'Crystal Grid',
    config: { particleCount:5000, speed:0.7, friction:0.98, turbulence:0.1, trailFade:0.04 },
    layers: [
      { eq:'sin(x*0.05)*cos(y*0.05)*sin(t+r*0.005)*3', color:'#8000ff', palette:'cool', opacity:1, weight:1 },
    ]
  },
  {
    name: 'DNA Flow',
    config: { particleCount:9000, speed:1.0, friction:0.972, turbulence:0.35, trailFade:0.07 },
    layers: [
      { eq:'sin(y*0.05+t)*3+cos(x*0.02)*noise(x*0.01,y*0.01+t)*2', color:'#00ffc8', palette:'forest', opacity:1, weight:1 },
      { eq:'sin(atan2(y-cy,x-cx)*6+t)*cos(r*0.01-t)*3', color:'#ff00ff', palette:'neon', opacity:0.5, weight:0.4 },
    ]
  },
  {
    name: 'Sunset Dream',
    config: { particleCount:6500, speed:0.9, friction:0.976, turbulence:0.25, trailFade:0.06 },
    layers: [
      { eq:'sin(x*0.03+t)*sin(y*0.03+t)*2.5', color:'#ff6b35', palette:'sunset', opacity:1, weight:1 },
    ]
  },
];

// ============================================================
// MAIN ENGINE STATE
// ============================================================
let ENG = {
  running: true,
  viewMode: 'both',
  particles: [],
  layers: [],
  forceFields: [],
  obstacles: [],
  gameMode: null,
  paintCanvas: null,
  paintCtx: null,
  colorWarCanvas: null,
  colorWarCtx: null,
  warOwnership: null,
  audioData: { bass:0, mid:0, high:0, spectrum:[], bpm:0, beat:false, gain:1 },
  mouse: { x:-9999, y:-9999, down:false, mode:'push' },
  time: 0,
  lastTime: 0,
  frameCount: 0,
  fps: 60,
  config: {
    particleCount: 6000,
    speed: 1.0,
    friction: 0.97,
    turbulence: 0.3,
    trailFade: 0.08,
    motionBlur: false,
    glow: true,
    connections: false,
    connDist: 60,
    symmetry: 0,
    depth3D: false,
    trailShape: 'line',
    mouseForce: 100,
    ffPulse: false,
    pulseSpeed: 1.0,
  },
  mediaRecorder: null,
  recChunks: [],
  recStartTime: 0,
  recTimerID: null,
  animID: null,
  focusedLayer: -1,
};

// Canvas references
let bgCan, flowCan, glowCan, connCan;
let bgCtx, flowCtx, glowCtx, connCtx;
let W = 0, H = 0;

// ============================================================
// INIT
// ============================================================
function initEngine2D() {
  try {
    bgCan   = document.getElementById('bgCan');
    flowCan = document.getElementById('flowCan');
    glowCan = document.getElementById('glowCan');
    connCan = document.getElementById('connCan');

    if (!bgCan || !flowCan || !glowCan || !connCan) {
      throw new Error('Canvas elements missing');
    }

    bgCtx   = bgCan.getContext('2d');
    flowCtx = flowCan.getContext('2d');
    glowCtx = glowCan.getContext('2d');
    connCtx = connCan.getContext('2d');

    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    buildDefaultLayers();
    buildPanel();
    applyLocalization();
    bindTopBar();
    bindKeyboard();
    bindMouse();
    bindTouch();
    initAudioBars();
    applyPreset(PRESETS[0]);

    spawnParticles();
    ENG.lastTime = performance.now();
    loop();

    // Help modal on first visit
    if (!localStorage.getItem('xoretex_help_seen')) {
      showModal('helpModal');
    }

  } catch (err) {
    reportError('engine2d init failed', err);
  }
}

function resizeCanvases() {
  W = window.innerWidth;
  H = window.innerHeight;
  [bgCan, flowCan, glowCan, connCan].forEach(c => {
    if (c) { c.width = W; c.height = H; }
  });
  const cubeCan = document.getElementById('cubeCan');
  if (cubeCan) { cubeCan.width = W; cubeCan.height = H; }

  if (ENG.paintCanvas) { ENG.paintCanvas.width = W; ENG.paintCanvas.height = H; }
  if (ENG.colorWarCanvas) {
    ENG.colorWarCanvas.width = W;
    ENG.colorWarCanvas.height = H;
    initColorWar();
  }
  drawBackground();
}

// ============================================================
// BACKGROUND
// ============================================================
function drawBackground() {
  if (!bgCtx) return;
  bgCtx.fillStyle = '#0a0a0f';
  bgCtx.fillRect(0, 0, W, H);
  // subtle radial glow at center
  const grd = bgCtx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.6);
  grd.addColorStop(0, 'rgba(0,60,40,0.12)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = grd;
  bgCtx.fillRect(0, 0, W, H);
}

// ============================================================
// LAYER MANAGEMENT
// ============================================================
function buildDefaultLayers() {
  ENG.layers = [
    createLayer('sin(r*0.01-t)*cos(atan2(y-cy,x-cx)+t)*3', '#00ffc8', 'cool', 1.0, 1.0),
  ];
}

function createLayer(eq, color, palette, opacity, weight) {
  return {
    id: Date.now() + Math.random(),
    eq: eq || 'sin(x*0.02+t)*cos(y*0.02+t)*2',
    color: color || '#00ffc8',
    palette: palette || 'mono',
    opacity: opacity !== undefined ? opacity : 1.0,
    weight: weight !== undefined ? weight : 1.0,
    enabled: true,
    fn: null,
    valid: true,
  };
}

function compileLayerFn(layer) {
  try {
    layer.fn = new Function(
      'x','y','t','r','cx','cy','PI','sin','cos','tan','atan2','sqrt','abs','noise','audio',
      'return (' + layer.eq + ');'
    );
    layer.valid = true;
    return true;
  } catch (e) {
    layer.fn = null;
    layer.valid = false;
    return false;
  }
}

function evalLayer(layer, x, y, t) {
  if (!layer.fn || !layer.enabled) return 0;
  try {
    const r = Math.sqrt((x - W/2) ** 2 + (y - H/2) ** 2);
    const val = layer.fn(
      x, y, t, r, W/2, H/2,
      Math.PI, Math.sin, Math.cos, Math.tan, Math.atan2, Math.sqrt, Math.abs,
      noise2D, ENG.audioData.bass
    );
    return isFinite(val) ? val : 0;
  } catch (e) {
    return 0;
  }
}

// Compile all layers
function compileAllLayers() {
  ENG.layers.forEach(l => compileLayerFn(l));
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================
function createParticle(layerIndex) {
  const px = Math.random() * W;
  const py = Math.random() * H;
  const life = 60 + Math.random() * 200;
  return {
    x: px, y: py, px: px, py: py,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    life: life, maxLife: life,
    mass: 0.5 + Math.random() * 1.5,
    size: 0.8 + Math.random() * 2.2,
    brightness: 0.5 + Math.random() * 0.5,
    palIndex: Math.random(),
    depth: 0.3 + Math.random() * 0.7,
    layerIndex: layerIndex,
  };
}

function spawnParticles() {
  ENG.particles = [];
  const n = ENG.config.particleCount;
  const nl = ENG.layers.length || 1;
  for (let i = 0; i < n; i++) {
    const li = i % nl;
    ENG.particles.push(createParticle(li));
  }
  compileAllLayers();
}

function resetParticle(p) {
  p.x = Math.random() * W;
  p.y = Math.random() * H;
  p.px = p.x; p.py = p.y;
  p.vx = (Math.random() - 0.5) * 0.5;
  p.vy = (Math.random() - 0.5) * 0.5;
  const life = 60 + Math.random() * 200;
  p.life = life; p.maxLife = life;
  p.palIndex = Math.random();
  p.depth = 0.3 + Math.random() * 0.7;
}

// ============================================================
// PHYSICS UPDATE
// ============================================================
function updateParticles(dt) {
  const cfg = ENG.config;
  const speed = cfg.speed * (1 + ENG.audioData.bass * 2);
  const friction = cfg.friction;
  const turb = cfg.turbulence;
  const t = ENG.time;
  const mf = cfg.mouseForce;
  const mx = ENG.mouse.x, my = ENG.mouse.y, mDown = ENG.mouse.down;
  const mouseMode = ENG.mouse.mode;
  const nl = ENG.layers.length;
  const dt60 = dt * 60;

  for (let i = 0, n = ENG.particles.length; i < n; i++) {
    const p = ENG.particles[i];
    p.life -= dt60 * 0.5;
    if (p.life <= 0) { resetParticle(p); continue; }

    const layer = ENG.layers[p.layerIndex % nl];
    if (!layer || !layer.enabled) { p.px = p.x; p.py = p.y; continue; }

    // formula force
    const angle = evalLayer(layer, p.x, p.y, t) * layer.weight;
    const fa = 0.04 * speed / p.mass;
    p.vx += Math.cos(angle) * fa;
    p.vy += Math.sin(angle) * fa;

    // turbulence
    if (turb > 0) {
      p.vx += (Math.random() - 0.5) * turb * 0.1;
      p.vy += (Math.random() - 0.5) * turb * 0.1;
    }

    // force fields
    for (let fi = 0; fi < ENG.forceFields.length; fi++) {
      const ff = ENG.forceFields[fi];
      const dx = ff.x - p.x, dy = ff.y - p.y;
      const d2 = dx * dx + dy * dy;
      let str = ff.strength;
      if (cfg.ffPulse) {
        str *= (0.5 + 0.5 * Math.sin(t * cfg.pulseSpeed * 2 + fi));
      }
      if (d2 < ff.radius * ff.radius && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = str / (d * p.mass) * 0.5;
        switch (ff.type) {
          case 'attract': p.vx += dx / d * f; p.vy += dy / d * f; break;
          case 'repel':   p.vx -= dx / d * f; p.vy -= dy / d * f; break;
          case 'vortex':  p.vx -= dy / d * f; p.vy += dx / d * f; break;
          case 'gravity': p.vx += dx / d * f * 0.5; p.vy += dy / d * f * 0.5 + 0.02; break;
        }
      }
    }

    // mouse interaction
    if (mx > -9000) {
      const dx = mx - p.x, dy = my - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < mf * mf && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = (mDown ? 2 : 0.5) * mf / (d * p.mass * 100);
        switch (mouseMode) {
          case 'push':    p.vx -= dx / d * f; p.vy -= dy / d * f; break;
          case 'attract': p.vx += dx / d * f; p.vy += dy / d * f; break;
          case 'swirl':   p.vx -= dy / d * f; p.vy += dx / d * f; break;
          case 'paint':   break;
        }
      }
    }

    // obstacles (sculptor mode)
    if (ENG.gameMode === 'sculptor') {
      for (let oi = 0; oi < ENG.obstacles.length; oi++) {
        const ob = ENG.obstacles[oi];
        const dx = p.x - ob.x, dy = p.y - ob.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < ob.r * ob.r && d2 > 0) {
          const d = Math.sqrt(d2);
          p.vx += dx / d * 2; p.vy += dy / d * 2;
        }
      }
    }

    // friction
    p.vx *= Math.pow(friction, dt60);
    p.vy *= Math.pow(friction, dt60);

    // clamp velocity
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const maxSpd = 4 * speed;
    if (spd > maxSpd) { p.vx = p.vx / spd * maxSpd; p.vy = p.vy / spd * maxSpd; }

    // update position
    p.px = p.x; p.py = p.y;
    p.x += p.vx * dt60;
    p.y += p.vy * dt60;

    // boundary
    if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
      if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
      p.px = p.x; p.py = p.y;
    }
  }
}

// ============================================================
// RENDER 2D
// ============================================================
function render2D() {
  if (!flowCtx) return;
  const cfg = ENG.config;
  const fade = cfg.trailFade;

  // trail fade
  flowCtx.globalAlpha = fade;
  flowCtx.globalCompositeOperation = 'destination-out';
  flowCtx.fillRect(0, 0, W, H);
  flowCtx.globalCompositeOperation = 'source-over';
  flowCtx.globalAlpha = 1;

  // paint mode canvas
  if (ENG.gameMode === 'painter' && ENG.paintCtx) {
    ENG.paintCtx.globalCompositeOperation = 'source-over';
  }

  // color war canvas
  if (ENG.gameMode === 'colorwar' && ENG.colorWarCtx) {
    renderColorWar();
  }

  const nl = ENG.layers.length;
  const focL = ENG.focusedLayer;

  for (let i = 0, n = ENG.particles.length; i < n; i++) {
    const p = ENG.particles[i];
    const li = p.layerIndex % nl;
    const layer = ENG.layers[li];
    if (!layer || !layer.enabled) continue;

    const lifeRatio = p.life / p.maxLife;
    let alpha = lifeRatio * p.brightness * layer.opacity;

    // focus dimming
    if (focL >= 0 && li !== focL) alpha *= 0.08;

    if (alpha < 0.005) continue;

    // color from palette
    const palColor = getPaletteColor(layer.palette, Math.floor(p.palIndex * 100), 100);
    const rgb = hexToRgb(palColor);

    // audio glow boost
    const glowBoost = 1 + ENG.audioData.bass * 0.5;

    // depth scale
    const dScale = cfg.depth3D ? (0.5 + p.depth * 0.5) : 1;
    const sz = p.size * dScale * glowBoost;

    flowCtx.globalAlpha = alpha;

    switch (cfg.trailShape) {
      case 'dot': {
        flowCtx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
        flowCtx.beginPath();
        flowCtx.arc(p.x, p.y, sz * 0.8, 0, Math.PI * 2);
        flowCtx.fill();
        break;
      }
      case 'triangle': {
        flowCtx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
        flowCtx.beginPath();
        flowCtx.moveTo(p.x, p.y - sz);
        flowCtx.lineTo(p.x - sz * 0.8, p.y + sz * 0.5);
        flowCtx.lineTo(p.x + sz * 0.8, p.y + sz * 0.5);
        flowCtx.closePath();
        flowCtx.fill();
        break;
      }
      case 'glow-dot': {
        const grd = flowCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 3);
        grd.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
        grd.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        flowCtx.fillStyle = grd;
        flowCtx.beginPath();
        flowCtx.arc(p.x, p.y, sz * 3, 0, Math.PI * 2);
        flowCtx.fill();
        break;
      }
      case 'line':
      default: {
        const dx = p.x - p.px, dy = p.y - p.py;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.1) break;
        flowCtx.strokeStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
        flowCtx.lineWidth = sz * 0.8;
        flowCtx.beginPath();
        flowCtx.moveTo(p.px, p.py);
        flowCtx.lineTo(p.x, p.y);
        flowCtx.stroke();
        break;
      }
    }

    // symmetry
    const sym = cfg.symmetry;
    if (sym >= 2) {
      const cx2 = W / 2, cy2 = H / 2;
      const rdx = p.x - cx2, rdy = p.y - cy2;
      const step = (Math.PI * 2) / sym;
      for (let s = 1; s < sym; s++) {
        const ang = step * s;
        const nx = cx2 + rdx * Math.cos(ang) - rdy * Math.sin(ang);
        const ny = cy2 + rdx * Math.sin(ang) + rdy * Math.cos(ang);
        flowCtx.beginPath();
        if (cfg.trailShape === 'dot' || cfg.trailShape === 'glow-dot') {
          flowCtx.arc(nx, ny, sz * 0.8, 0, Math.PI * 2);
          flowCtx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          flowCtx.fill();
        } else {
          const pdx = p.px - cx2, pdy = p.py - cy2;
          const npx = cx2 + pdx * Math.cos(ang) - pdy * Math.sin(ang);
          const npy = cy2 + pdx * Math.sin(ang) + pdy * Math.cos(ang);
          flowCtx.strokeStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          flowCtx.lineWidth = sz * 0.8;
          flowCtx.moveTo(npx, npy);
          flowCtx.lineTo(nx, ny);
          flowCtx.stroke();
        }
      }
    }

    // painter mode persistent trail
    if (ENG.gameMode === 'painter' && ENG.paintCtx) {
      ENG.paintCtx.globalAlpha = alpha * 0.3;
      ENG.paintCtx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ENG.paintCtx.beginPath();
      ENG.paintCtx.arc(p.x, p.y, sz * 1.5, 0, Math.PI * 2);
      ENG.paintCtx.fill();
    }
  }

  flowCtx.globalAlpha = 1;

  // connections
  if (cfg.connections) renderConnections();

  // glow layer
  if (cfg.glow) renderGlow();
}

function renderConnections() {
  if (!connCtx) return;
  const cd = ENG.config.connDist;
  const cd2 = cd * cd;
  connCtx.clearRect(0, 0, W, H);
  const particles = ENG.particles;
  const nl = ENG.layers.length;

  // sample up to 500 particles for performance
  const stride = Math.max(1, Math.floor(particles.length / 500));

  for (let i = 0; i < particles.length; i += stride) {
    const pi = particles[i];
    const layerI = ENG.layers[pi.layerIndex % nl];
    if (!layerI || !layerI.enabled) continue;
    const rgb = hexToRgb(getPaletteColor(layerI.palette, Math.floor(pi.palIndex * 100), 100));

    for (let j = i + stride; j < Math.min(i + 20 * stride, particles.length); j += stride) {
      const pj = particles[j];
      const dx = pi.x - pj.x, dy = pi.y - pj.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < cd2) {
        const alpha = (1 - d2 / cd2) * 0.3;
        connCtx.globalAlpha = alpha;
        connCtx.strokeStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
        connCtx.lineWidth = 0.5;
        connCtx.beginPath();
        connCtx.moveTo(pi.x, pi.y);
        connCtx.lineTo(pj.x, pj.y);
        connCtx.stroke();
      }
    }
  }
  connCtx.globalAlpha = 1;
}

function renderGlow() {
  if (!glowCtx) return;
  glowCtx.clearRect(0, 0, W, H);
  // soft glow pass: composite from flowCan
  glowCtx.globalAlpha = 0.18 + ENG.audioData.bass * 0.1;
  glowCtx.filter = 'blur(8px)';
  glowCtx.drawImage(flowCan, 0, 0);
  glowCtx.filter = 'none';
  glowCtx.globalAlpha = 1;
}// ============================================================
// MAIN ANIMATION LOOP
// ============================================================
function loop() {
  if (!ENG.running) {
    ENG.animID = requestAnimationFrame(loop);
    return;
  }

  const now = performance.now();
  const dt = Math.min((now - ENG.lastTime) / 1000, 0.05);
  ENG.lastTime = now;
  ENG.time += dt;
  ENG.frameCount++;

  // FPS
  if (ENG.frameCount % 30 === 0) {
    ENG.fps = Math.round(1 / dt);
    const fpsDom = document.getElementById('fpsDisplay');
    if (fpsDom) fpsDom.textContent = 'FPS: ' + ENG.fps;
  }

  updateAudio();
  updateParticles(dt);
  updateGameMode(dt);
  render2D();

  // Draw painter canvas on top
  if (ENG.gameMode === 'painter' && ENG.paintCanvas && flowCtx) {
    flowCtx.globalAlpha = 1;
    flowCtx.drawImage(ENG.paintCanvas, 0, 0);
  }

  ENG.animID = requestAnimationFrame(loop);
}

// ============================================================
// AUDIO SYSTEM
// ============================================================
let audioCtx = null, analyser = null, audioSource = null;
let audioElement = null, micStream = null;
let beatHistory = [], lastBeat = 0, bpmSamples = [];

function initAudioBars() {
  const wrap = document.getElementById('audioBarWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < 32; i++) {
    const bar = document.createElement('div');
    bar.className = 'aBar';
    bar.style.height = '1px';
    bar.id = 'aBar_' + i;
    wrap.appendChild(bar);
  }
}

function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    analyser.connect(audioCtx.destination);
  }
}

function startMic() {
  try {
    ensureAudioCtx();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      micStream = stream;
      if (audioSource) audioSource.disconnect();
      audioSource = audioCtx.createMediaStreamSource(stream);
      audioSource.connect(analyser);
      showToast(t('microphone'));
    }).catch(err => {
      showToast('Mic denied: ' + err.message);
    });
  } catch (e) {
    reportError('startMic failed', e);
  }
}

function stopAudio() {
  if (micStream) { micStream.getTracks().forEach(tr => tr.stop()); micStream = null; }
  if (audioSource) { try { audioSource.disconnect(); } catch(e){} audioSource = null; }
  if (audioElement) { audioElement.pause(); audioElement = null; }
  ENG.audioData = { bass:0, mid:0, high:0, spectrum:[], bpm:0, beat:false, gain:1 };
  showToast(t('stopAudio'));
}

function startAudioFile(file) {
  try {
    ensureAudioCtx();
    if (audioElement) { audioElement.pause(); }
    audioElement = new Audio();
    audioElement.src = URL.createObjectURL(file);
    audioElement.loop = true;
    audioElement.crossOrigin = 'anonymous';
    if (audioSource) audioSource.disconnect();
    audioSource = audioCtx.createMediaElementSource(audioElement);
    audioSource.connect(analyser);
    analyser.connect(audioCtx.destination);
    audioElement.play();
    showToast(t('audioFile') + ': ' + file.name);
  } catch (e) {
    reportError('startAudioFile failed', e);
  }
}

function updateAudio() {
  if (!analyser) return;
  const buf = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buf);
  const gain = ENG.audioData.gain;
  const n = buf.length;
  const spec = [];
  for (let i = 0; i < Math.min(n, 32); i++) {
    spec.push(Math.min(1, (buf[i] / 255) * gain));
  }
  ENG.audioData.spectrum = spec;

  const bass = spec.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
  const mid  = spec.slice(4, 12).reduce((a, b) => a + b, 0) / 8;
  const high = spec.slice(12, 24).reduce((a, b) => a + b, 0) / 12;

  ENG.audioData.bass = bass;
  ENG.audioData.mid  = mid;
  ENG.audioData.high = high;

  // beat detection
  beatHistory.push(bass);
  if (beatHistory.length > 43) beatHistory.shift();
  const avg = beatHistory.reduce((a, b) => a + b, 0) / beatHistory.length;
  const now = ENG.time;
  if (bass > avg * 1.5 && bass > 0.3 && now - lastBeat > 0.25) {
    ENG.audioData.beat = true;
    const interval = now - lastBeat;
    if (interval < 2) {
      bpmSamples.push(60 / interval);
      if (bpmSamples.length > 8) bpmSamples.shift();
      ENG.audioData.bpm = Math.round(bpmSamples.reduce((a, b) => a + b, 0) / bpmSamples.length);
    }
    lastBeat = now;
  } else {
    ENG.audioData.beat = false;
  }

  // update UI bars
  for (let i = 0; i < 32; i++) {
    const bar = document.getElementById('aBar_' + i);
    if (bar) bar.style.height = Math.max(1, (spec[i] || 0) * 36) + 'px';
  }

  const vBass = document.getElementById('valBass');
  const vMid  = document.getElementById('valMid');
  const vHigh = document.getElementById('valHigh');
  const vBPM  = document.getElementById('valBPM');
  const vBeat = document.getElementById('valBeat');
  if (vBass) vBass.textContent = bass.toFixed(2);
  if (vMid)  vMid.textContent  = mid.toFixed(2);
  if (vHigh) vHigh.textContent = high.toFixed(2);
  if (vBPM)  vBPM.textContent  = ENG.audioData.bpm || '--';
  if (vBeat) vBeat.textContent  = ENG.audioData.beat ? '●' : '—';
}

// ============================================================
// FORCE FIELDS
// ============================================================
const FF_COLORS = {
  attract: '#00ffc8', repel: '#ff4060',
  vortex: '#ff00ff', gravity: '#ffb800'
};

function addForceField(type, x, y) {
  const ff = {
    id: Date.now() + Math.random(),
    type: type || 'attract',
    x: x !== undefined ? x : W / 2,
    y: y !== undefined ? y : H / 2,
    strength: 60,
    radius: 180,
    color: FF_COLORS[type] || '#00ffc8',
    markerEl: null,
  };
  ENG.forceFields.push(ff);
  createFFMarker(ff);
  buildFFList();
  return ff;
}

function createFFMarker(ff) {
  const layer = document.getElementById('forceFieldLayer');
  if (!layer) return;
  if (ff.markerEl) ff.markerEl.remove();

  const el = document.createElement('div');
  el.style.cssText = `
    position:absolute;
    width:28px;height:28px;
    border-radius:50%;
    border:2px solid ${ff.color};
    background:${ff.color}22;
    box-shadow:0 0 12px ${ff.color};
    cursor:move;
    transform:translate(-50%,-50%);
    display:flex;align-items:center;justify-content:center;
    font-size:12px;user-select:none;
    left:${ff.x}px;top:${ff.y}px;
    z-index:6;
  `;
  const icons = { attract:'⊕', repel:'⊖', vortex:'⊛', gravity:'⊕' };
  el.textContent = icons[ff.type] || '●';
  el.title = ff.type;

  let dragging = false, ox = 0, oy = 0;
  el.addEventListener('mousedown', e => {
    dragging = true; ox = e.clientX - ff.x; oy = e.clientY - ff.y;
    e.stopPropagation();
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    ff.x = e.clientX - ox; ff.y = e.clientY - oy;
    el.style.left = ff.x + 'px'; el.style.top = ff.y + 'px';
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  // touch
  el.addEventListener('touchstart', e => {
    dragging = true;
    const t2 = e.touches[0];
    ox = t2.clientX - ff.x; oy = t2.clientY - ff.y;
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    if (!dragging) return;
    const t2 = e.touches[0];
    ff.x = t2.clientX - ox; ff.y = t2.clientY - oy;
    el.style.left = ff.x + 'px'; el.style.top = ff.y + 'px';
  });
  el.addEventListener('touchend', () => { dragging = false; });

  layer.appendChild(el);
  ff.markerEl = el;
}

function removeForceField(id) {
  const idx = ENG.forceFields.findIndex(f => f.id === id);
  if (idx < 0) return;
  const ff = ENG.forceFields[idx];
  if (ff.markerEl) ff.markerEl.remove();
  ENG.forceFields.splice(idx, 1);
  buildFFList();
}

function buildFFList() {
  const list = document.getElementById('ffList');
  if (!list) return;
  list.innerHTML = '';
  ENG.forceFields.forEach(ff => {
    const row = document.createElement('div');
    row.className = 'ffItem';
    const dot = document.createElement('div');
    dot.className = 'ffDot';
    dot.style.background = ff.color;
    dot.style.boxShadow = '0 0 6px ' + ff.color;
    const label = document.createElement('span');
    label.textContent = ff.type;
    label.style.flex = '1';

    const strLabel = document.createElement('input');
    strLabel.type = 'range'; strLabel.min = 10; strLabel.max = 200;
    strLabel.value = ff.strength; strLabel.style.width = '60px';
    strLabel.addEventListener('input', () => { ff.strength = parseFloat(strLabel.value); });

    const radLabel = document.createElement('input');
    radLabel.type = 'range'; radLabel.min = 40; radLabel.max = 600;
    radLabel.value = ff.radius; radLabel.style.width = '60px';
    radLabel.addEventListener('input', () => { ff.radius = parseFloat(radLabel.value); });

    const rm = document.createElement('button');
    rm.className = 'pBtn danger'; rm.textContent = '✕';
    rm.style.padding = '2px 6px';
    rm.addEventListener('click', () => removeForceField(ff.id));

    row.appendChild(dot); row.appendChild(label);
    row.appendChild(strLabel); row.appendChild(radLabel);
    row.appendChild(rm);
    list.appendChild(row);
  });
}

// ============================================================
// GAME MODES
// ============================================================
function startGameMode(mode) {
  exitGameMode();
  ENG.gameMode = mode;

  const hud = document.getElementById('gameHUD');
  const hudTitle = document.getElementById('gameHUDTitle');
  const exitBtn = document.getElementById('btnExitGame');
  if (hud) hud.style.display = 'block';
  if (exitBtn) exitBtn.style.display = 'inline-flex';

  switch (mode) {
    case 'painter': {
      ENG.paintCanvas = document.createElement('canvas');
      ENG.paintCanvas.width = W; ENG.paintCanvas.height = H;
      ENG.paintCtx = ENG.paintCanvas.getContext('2d');
      if (hudTitle) hudTitle.textContent = t('painter');
      ENG.mouse.mode = 'paint';
      break;
    }
    case 'sculptor': {
      ENG.obstacles = [];
      if (hudTitle) hudTitle.textContent = t('sculptor');
      renderObstacleLayer();
      break;
    }
    case 'battle': {
      if (ENG.layers.length < 2) {
        // add second layer
        const l = createLayer('noise(x*0.01+t,y*0.01)*6-3', '#ff00ff', 'neon', 0.8, 0.8);
        compileLayerFn(l);
        ENG.layers.push(l);
        buildLayerCards();
      }
      if (hudTitle) hudTitle.textContent = t('battle');
      break;
    }
    case 'colorwar': {
      ENG.colorWarCanvas = document.createElement('canvas');
      ENG.colorWarCanvas.width = W; ENG.colorWarCanvas.height = H;
      ENG.colorWarCtx = ENG.colorWarCanvas.getContext('2d');
      initColorWar();
      if (hudTitle) hudTitle.textContent = t('colorWar');
      break;
    }
  }
}

function exitGameMode() {
  ENG.gameMode = null;
  ENG.paintCanvas = null; ENG.paintCtx = null;
  ENG.colorWarCanvas = null; ENG.colorWarCtx = null;
  ENG.warOwnership = null;
  ENG.obstacles = [];
  const hud = document.getElementById('gameHUD');
  const exitBtn = document.getElementById('btnExitGame');
  if (hud) hud.style.display = 'none';
  if (exitBtn) exitBtn.style.display = 'none';
  const obsLayer = document.getElementById('obstacleLayer');
  if (obsLayer) obsLayer.innerHTML = '';
  // reset mouse mode
  ENG.mouse.mode = document.getElementById('selMouseMode')?.value || 'push';
}

function updateGameMode(dt) {
  if (!ENG.gameMode) return;
  const hudInfo = document.getElementById('gameHUDInfo');
  const hudBar  = document.getElementById('gameHUDBarFill');

  switch (ENG.gameMode) {
    case 'battle': {
      if (ENG.layers.length < 2) break;
      let c0 = 0, c1 = 0;
      const nl = ENG.layers.length;
      ENG.particles.forEach(p => {
        if (p.layerIndex % nl === 0) c0++;
        else c1++;
      });
      const total = c0 + c1 || 1;
      const pct0 = Math.round(c0 / total * 100);
      const pct1 = 100 - pct0;
      if (hudInfo) hudInfo.textContent = `Layer 1: ${pct0}%  vs  Layer 2: ${pct1}%`;
      if (hudBar) hudBar.style.width = pct0 + '%';
      break;
    }
    case 'colorwar': {
      updateColorWar();
      break;
    }
    case 'sculptor': {
      if (hudInfo) hudInfo.textContent = `Obstacles: ${ENG.obstacles.length} — Click canvas to place`;
      break;
    }
    case 'painter': {
      if (hudInfo) hudInfo.textContent = 'Painting... move mouse to create trails';
      break;
    }
  }
}

function initColorWar() {
  if (!ENG.colorWarCanvas) return;
  ENG.colorWarCtx.clearRect(0, 0, W, H);
}

function updateColorWar() {
  if (!ENG.colorWarCtx) return;
  const nl = ENG.layers.length;
  if (nl < 1) return;
  // paint soft radial blobs at particle positions
  for (let i = 0; i < ENG.particles.length; i += 4) {
    const p = ENG.particles[i];
    const li = p.layerIndex % nl;
    const layer = ENG.layers[li];
    if (!layer || !layer.enabled) continue;
    const rgb = hexToRgb(getPaletteColor(layer.palette, Math.floor(p.palIndex * 100), 100));
    const r2 = 20 + ENG.audioData.bass * 10;
    const grd = ENG.colorWarCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r2);
    grd.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.04)`);
    grd.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ENG.colorWarCtx.fillStyle = grd;
    ENG.colorWarCtx.beginPath();
    ENG.colorWarCtx.arc(p.x, p.y, r2, 0, Math.PI * 2);
    ENG.colorWarCtx.fill();
  }
}

function renderColorWar() {
  if (!ENG.colorWarCanvas || !flowCtx) return;
  flowCtx.globalAlpha = 0.35;
  flowCtx.drawImage(ENG.colorWarCanvas, 0, 0);
  flowCtx.globalAlpha = 1;
}

function renderObstacleLayer() {
  const layer = document.getElementById('obstacleLayer');
  if (!layer) return;
  layer.innerHTML = '';
  ENG.obstacles.forEach(ob => {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;
      left:${ob.x - ob.r}px;top:${ob.y - ob.r}px;
      width:${ob.r * 2}px;height:${ob.r * 2}px;
      border-radius:50%;
      background:rgba(255,180,0,0.18);
      border:1px solid rgba(255,180,0,0.5);
      pointer-events:none;
    `;
    layer.appendChild(el);
  });
}

// ============================================================
// SCULPTOR CLICK
// ============================================================
function placeSculptorObstacle(x, y) {
  ENG.obstacles.push({ x, y, r: 24 + Math.random() * 20 });
  renderObstacleLayer();
}

// ============================================================
// EXPORT TOOLS
// ============================================================
function exportScreenshot() {
  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = W; offscreen.height = H;
    const ctx2 = offscreen.getContext('2d');
    ctx2.drawImage(bgCan, 0, 0);
    ctx2.drawImage(flowCan, 0, 0);
    if (ENG.config.glow) ctx2.drawImage(glowCan, 0, 0);
    if (ENG.config.connections) ctx2.drawImage(connCan, 0, 0);
    const link = document.createElement('a');
    link.download = 'xoretex_' + Date.now() + '.png';
    link.href = offscreen.toDataURL('image/png');
    link.click();
    showToast(t('toastScreenshot'));
  } catch (e) { reportError('screenshot failed', e); }
}

function export4K() {
  try {
    const W4 = 3840, H4 = 2160;
    const offscreen = document.createElement('canvas');
    offscreen.width = W4; offscreen.height = H4;
    const ctx2 = offscreen.getContext('2d');
    ctx2.fillStyle = '#0a0a0f';
    ctx2.fillRect(0, 0, W4, H4);
    ctx2.drawImage(bgCan, 0, 0, W4, H4);
    ctx2.drawImage(flowCan, 0, 0, W4, H4);
    if (ENG.config.glow) ctx2.drawImage(glowCan, 0, 0, W4, H4);
    const link = document.createElement('a');
    link.download = 'xoretex_4k_' + Date.now() + '.png';
    link.href = offscreen.toDataURL('image/png');
    link.click();
    showToast(t('toast4K'));
  } catch (e) { reportError('4K export failed', e); }
}

function exportSVG() {
  try {
    const sample = ENG.particles.slice(0, 600);
    const nl = ENG.layers.length;
    let svgLines = [];
    sample.forEach(p => {
      const li = p.layerIndex % nl;
      const layer = ENG.layers[li];
      if (!layer) return;
      const color = getPaletteColor(layer.palette, Math.floor(p.palIndex * 100), 100);
      const dx = p.x - p.px, dy = p.y - p.py;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        svgLines.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1" fill="${color}" opacity="${(p.brightness * layer.opacity).toFixed(2)}"/>`);
      } else {
        svgLines.push(`<line x1="${p.px.toFixed(1)}" y1="${p.py.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${color}" stroke-width="1" opacity="${(p.brightness * layer.opacity).toFixed(2)}"/>`);
      }
    });
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#0a0a0f">\n${svgLines.join('\n')}\n</svg>`;
    document.getElementById('svgOutput').textContent = svg;
    showModal('svgModal');
    window._svgCache = svg;
  } catch (e) { reportError('SVG export failed', e); }
}

function exportGLSL() {
  try {
    const layer = ENG.layers[0];
    const eq = layer ? layer.eq : 'sin(x*0.02+t)*cos(y*0.02+t)*2';
    const glsl = `// Xoretex Xhaos Cube — GLSL Approximation
// Auto-generated from formula: ${eq}
// Paste into Shadertoy or any GLSL fragment shader

precision mediump float;
uniform float iTime;
uniform vec2 iResolution;

#define PI 3.14159265359

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy;
  float x = uv.x;
  float y = uv.y;
  float t = iTime;
  float cx = iResolution.x * 0.5;
  float cy = iResolution.y * 0.5;
  float r = length(uv - vec2(cx, cy));

  // Original JS formula adapted to GLSL:
  // ${eq}
  float angle = sin(x * 0.02 + t) * cos(y * 0.02 + t) * 2.0;

  vec2 dir = vec2(cos(angle), sin(angle));
  float intensity = 0.5 + 0.5 * sin(dot(uv * 0.01, dir) * 6.0 + t);

  vec3 col = vec3(0.0, intensity, intensity * 0.7);
  gl_FragColor = vec4(col, 1.0);
}`;
    document.getElementById('glslOutput').textContent = glsl;
    showModal('glslModal');
    window._glslCache = glsl;
  } catch (e) { reportError('GLSL export failed', e); }
}

function saveConfig() {
  try {
    const cfg = {
      version: '1.0',
      language: currentLang,
      viewMode: ENG.viewMode,
      config: ENG.config,
      layers: ENG.layers.map(l => ({
        eq: l.eq, color: l.color, palette: l.palette,
        opacity: l.opacity, weight: l.weight, enabled: l.enabled,
      })),
      forceFields: ENG.forceFields.map(f => ({
        type: f.type, x: f.x, y: f.y,
        strength: f.strength, radius: f.radius,
      })),
    };
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'xoretex_config_' + Date.now() + '.json';
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast(t('toastSaved'));
  } catch (e) { reportError('saveConfig failed', e); }
}

function loadConfig(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const cfg = JSON.parse(ev.target.result);
      if (cfg.language) { currentLang = cfg.language; localStorage.setItem('xoretex_lang', currentLang); }
      if (cfg.config) Object.assign(ENG.config, cfg.config);
      if (cfg.layers) {
        ENG.layers = cfg.layers.map(l => {
          const layer = createLayer(l.eq, l.color, l.palette, l.opacity, l.weight);
          layer.enabled = l.enabled !== undefined ? l.enabled : true;
          compileLayerFn(layer);
          return layer;
        });
      }
      if (cfg.forceFields) {
        ENG.forceFields.forEach(f => { if (f.markerEl) f.markerEl.remove(); });
        ENG.forceFields = [];
        cfg.forceFields.forEach(f => addForceField(f.type, f.x, f.y));
      }
      if (cfg.viewMode) setViewMode(cfg.viewMode);
      applyLocalization();
      buildLayerCards();
      syncControlsFromConfig();
      spawnParticles();
      showToast(t('toastLoaded'));
    } catch (e) { reportError('loadConfig parse error', e); }
  };
  reader.readAsText(file);
}

// ============================================================
// VIDEO RECORDING
// ============================================================
function startRecording() {
  try {
    if (ENG.mediaRecorder) stopRecording();
    const stream = flowCan.captureStream(30);
    ENG.recChunks = [];
    ENG.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    ENG.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) ENG.recChunks.push(e.data); };
    ENG.mediaRecorder.onstop = saveRecording;
    ENG.mediaRecorder.start(100);
    ENG.recStartTime = Date.now();

    const recBar = document.getElementById('recBar');
    if (recBar) recBar.classList.add('show');
    const recBtn = document.getElementById('btnRecord');
    if (recBtn) recBtn.classList.add('active');

    ENG.recTimerID = setInterval(() => {
      const elapsed = Math.floor((Date.now() - ENG.recStartTime) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      const recTime = document.getElementById('recTime');
      if (recTime) recTime.textContent = mm + ':' + ss;
      const fill = document.getElementById('recProgressFill');
      if (fill) fill.style.width = Math.min(100, elapsed / 120 * 100) + '%';
    }, 1000);

    showToast(t('toastRecStart'));
  } catch (e) { reportError('recording failed', e); showToast('Recording not supported in this browser'); }
}

function stopRecording() {
  if (ENG.mediaRecorder && ENG.mediaRecorder.state !== 'inactive') {
    ENG.mediaRecorder.stop();
  }
  if (ENG.recTimerID) { clearInterval(ENG.recTimerID); ENG.recTimerID = null; }
  const recBar = document.getElementById('recBar');
  if (recBar) recBar.classList.remove('show');
  const recBtn = document.getElementById('btnRecord');
  if (recBtn) recBtn.classList.remove('active');
  ENG.mediaRecorder = null;
  showToast(t('toastRecStop'));
}

function saveRecording() {
  const blob = new Blob(ENG.recChunks, { type: 'video/webm' });
  const link = document.createElement('a');
  link.download = 'xoretex_' + Date.now() + '.webm';
  link.href = URL.createObjectURL(blob);
  link.click();
  ENG.recChunks = [];
}

// ============================================================
// VIEW MODE
// ============================================================
function setViewMode(mode) {
  ENG.viewMode = mode;
  document.querySelectorAll('.modeTab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const ids2d = ['flowCan', 'glowCan', 'connCan'];
  const ids3d = ['cubeCan'];

  ids2d.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (mode === '3d') ? 'none' : '';
  });
  ids3d.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (mode === '2d') ? 'none' : '';
  });

  // notify cube3d if present
  if (window.setCubeVisible) {
    window.setCubeVisible(mode !== '2d');
  }
}// ============================================================
// PANEL BUILDING
// ============================================================
function buildPanel() {
  buildPresetButtons();
  buildSnippetGrid();
  buildLayerCards();
  buildFFList();
  bindPanelControls();
  bindSectionToggles();
}

function buildPresetButtons() {
  const container = document.getElementById('presetBtns');
  if (!container) return;
  container.innerHTML = '';
  PRESETS.forEach((preset, idx) => {
    const btn = document.createElement('button');
    btn.className = 'pBtn';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => applyPreset(PRESETS[idx]));
    container.appendChild(btn);
  });
}

function applyPreset(preset) {
  if (!preset) return;
  if (preset.config) Object.assign(ENG.config, preset.config);
  if (preset.layers) {
    ENG.layers = preset.layers.map(l => {
      const layer = createLayer(l.eq, l.color, l.palette, l.opacity, l.weight);
      compileLayerFn(layer);
      return layer;
    });
  }
  syncControlsFromConfig();
  buildLayerCards();
  spawnParticles();
  showToast('Preset: ' + preset.name);
}

function buildSnippetGrid() {
  const grid = document.getElementById('snippetGrid');
  if (!grid) return;
  grid.innerHTML = '';
  SNIPPETS.forEach(snip => {
    const btn = document.createElement('button');
    btn.className = 'pBtn snippetBtn';
    btn.textContent = snip.name;
    btn.title = snip.code;
    btn.addEventListener('click', () => {
      const ta = document.getElementById('formulaInput');
      if (ta) ta.value = snip.code;
      applyFormulaToLayer(snip.code);
    });
    grid.appendChild(btn);
  });
}

function buildLayerCards() {
  const container = document.getElementById('layerCards');
  if (!container) return;
  container.innerHTML = '';

  ENG.layers.forEach((layer, idx) => {
    const card = document.createElement('div');
    card.className = 'layerCard' + (ENG.focusedLayer === idx ? ' focused' : '');
    card.id = 'layerCard_' + idx;

    // header
    const header = document.createElement('div');
    header.className = 'layerTitle';
    header.style.color = layer.color;
    header.textContent = 'Layer ' + (idx + 1);
    header.addEventListener('click', () => {
      ENG.focusedLayer = (ENG.focusedLayer === idx) ? -1 : idx;
      buildLayerCards();
    });

    // enabled
    const enRow = document.createElement('label');
    enRow.className = 'pCheck';
    const enChk = document.createElement('input');
    enChk.type = 'checkbox'; enChk.checked = layer.enabled;
    enChk.addEventListener('change', () => { layer.enabled = enChk.checked; });
    const enSpan = document.createElement('span'); enSpan.textContent = 'Enabled';
    enRow.appendChild(enChk); enRow.appendChild(enSpan);

    // equation
    const eqLabel = document.createElement('label');
    eqLabel.className = 'pLabel'; eqLabel.textContent = t('layerEquation');
    const eqTa = document.createElement('textarea');
    eqTa.className = 'pTextarea'; eqTa.value = layer.eq;
    eqTa.rows = 2; eqTa.spellcheck = false;
    const eqInd = document.createElement('span');
    eqInd.className = 'indicator ' + (layer.valid ? 'valid' : 'invalid');

    eqTa.addEventListener('input', () => {
      layer.eq = eqTa.value;
      const ok = compileLayerFn(layer);
      eqInd.className = 'indicator ' + (ok ? 'valid' : 'invalid');
    });

    // color
    const colRow = document.createElement('div'); colRow.className = 'pRow';
    const colLabel = document.createElement('span'); colLabel.className = 'pLabel'; colLabel.style.margin = '0'; colLabel.textContent = t('layerColor');
    const colPick = document.createElement('input'); colPick.type = 'color'; colPick.className = 'pColor'; colPick.value = layer.color;
    colPick.addEventListener('input', () => { layer.color = colPick.value; buildLayerCards(); });

    // palette
    const palLabel = document.createElement('label'); palLabel.className = 'pLabel'; palLabel.textContent = t('layerPalette');
    const palSel = document.createElement('select'); palSel.className = 'pSelect';
    Object.keys(PALETTES).forEach(pk => {
      const op = document.createElement('option'); op.value = pk; op.textContent = pk;
      if (pk === layer.palette) op.selected = true;
      palSel.appendChild(op);
    });
    palSel.addEventListener('change', () => { layer.palette = palSel.value; });

    // opacity
    const opLabel = document.createElement('label'); opLabel.className = 'pLabel'; opLabel.textContent = t('layerOpacity');
    const opRow = document.createElement('div'); opRow.className = 'pRow';
    const opSlider = document.createElement('input'); opSlider.type = 'range'; opSlider.className = 'pSlider';
    opSlider.min = 0; opSlider.max = 1; opSlider.step = 0.05; opSlider.value = layer.opacity;
    const opVal = document.createElement('span'); opVal.className = 'pVal'; opVal.textContent = layer.opacity.toFixed(2);
    opSlider.addEventListener('input', () => { layer.opacity = parseFloat(opSlider.value); opVal.textContent = layer.opacity.toFixed(2); });

    // weight
    const wtLabel = document.createElement('label'); wtLabel.className = 'pLabel'; wtLabel.textContent = t('layerWeight');
    const wtRow = document.createElement('div'); wtRow.className = 'pRow';
    const wtSlider = document.createElement('input'); wtSlider.type = 'range'; wtSlider.className = 'pSlider';
    wtSlider.min = 0.1; wtSlider.max = 3; wtSlider.step = 0.1; wtSlider.value = layer.weight;
    const wtVal = document.createElement('span'); wtVal.className = 'pVal'; wtVal.textContent = layer.weight.toFixed(1);
    wtSlider.addEventListener('input', () => { layer.weight = parseFloat(wtSlider.value); wtVal.textContent = layer.weight.toFixed(1); });

    // remove button
    const rmBtn = document.createElement('button'); rmBtn.className = 'pBtn danger'; rmBtn.textContent = t('removeLayer');
    rmBtn.addEventListener('click', () => {
      ENG.layers.splice(idx, 1);
      if (ENG.focusedLayer >= ENG.layers.length) ENG.focusedLayer = -1;
      buildLayerCards();
      reassignParticlesLayers();
    });

    opRow.appendChild(opSlider); opRow.appendChild(opVal);
    wtRow.appendChild(wtSlider); wtRow.appendChild(wtVal);
    colRow.appendChild(colLabel); colRow.appendChild(colPick);

    card.appendChild(header);
    card.appendChild(enRow);
    card.appendChild(eqLabel);
    const eqWrap = document.createElement('div'); eqWrap.className = 'pRow';
    eqWrap.appendChild(eqTa); eqWrap.appendChild(eqInd);
    card.appendChild(eqWrap);
    card.appendChild(colRow);
    card.appendChild(palLabel); card.appendChild(palSel);
    card.appendChild(opLabel); card.appendChild(opRow);
    card.appendChild(wtLabel); card.appendChild(wtRow);
    card.appendChild(rmBtn);

    container.appendChild(card);
  });
}

function reassignParticlesLayers() {
  const nl = ENG.layers.length || 1;
  ENG.particles.forEach((p, i) => { p.layerIndex = i % nl; });
}

function bindPanelControls() {
  // Formula apply button
  const btnApply = document.getElementById('btnApplyFormula');
  if (btnApply) btnApply.addEventListener('click', () => {
    const code = document.getElementById('formulaInput')?.value || '';
    applyFormulaToLayer(code);
  });

  // Formula input realtime
  const fInput = document.getElementById('formulaInput');
  if (fInput) fInput.addEventListener('input', () => {
    const code = fInput.value;
    const ok = validateFormula(code);
    const ind = document.getElementById('formulaIndicator');
    const sta = document.getElementById('formulaStatus');
    if (ind) ind.className = 'indicator ' + (ok ? 'valid' : 'invalid');
    if (sta) sta.textContent = ok ? t('valid') : t('invalid');
  });

  // Sliders helper
  function bindSlider(id, valId, cfg, key, decimals) {
    const slider = document.getElementById(id);
    const valEl = document.getElementById(valId);
    if (!slider) return;
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      ENG.config[key] = v;
      if (valEl) valEl.textContent = v.toFixed(decimals || 2);
      if (key === 'particleCount') { spawnParticles(); }
    });
  }

  bindSlider('sliderCount', 'valCount', ENG.config, 'particleCount', 0);
  bindSlider('sliderSpeed', 'valSpeed', ENG.config, 'speed', 1);
  bindSlider('sliderFriction', 'valFriction', ENG.config, 'friction', 3);
  bindSlider('sliderTurbulence', 'valTurbulence', ENG.config, 'turbulence', 2);
  bindSlider('sliderMouseForce', 'valMouseForce', ENG.config, 'mouseForce', 0);
  bindSlider('sliderTrailFade', 'valTrailFade', ENG.config, 'trailFade', 2);
  bindSlider('sliderConnDist', 'valConnDist', ENG.config, 'connDist', 0);
  bindSlider('sliderPulseSpeed', 'valPulseSpeed', ENG.config, 'pulseSpeed', 1);
  bindSlider('sliderAudioGain', 'valAudioGain', ENG.audioData, 'gain', 1);

  // Checkboxes
  function bindCheck(id, cfg, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => { cfg[key] = el.checked; });
  }

  bindCheck('chkMotionBlur', ENG.config, 'motionBlur');
  bindCheck('chkGlow', ENG.config, 'glow');
  bindCheck('chkConnections', ENG.config, 'connections');
  bindCheck('chkDepth3D', ENG.config, 'depth3D');
  bindCheck('chkFFPulse', ENG.config, 'ffPulse');

  // Selects
  const selSym = document.getElementById('selSymmetry');
  if (selSym) selSym.addEventListener('change', () => { ENG.config.symmetry = parseInt(selSym.value); });

  const selTrail = document.getElementById('selTrailShape');
  if (selTrail) selTrail.addEventListener('change', () => { ENG.config.trailShape = selTrail.value; });

  const selMouse = document.getElementById('selMouseMode');
  if (selMouse) selMouse.addEventListener('change', () => { ENG.mouse.mode = selMouse.value; });

  // Layer add button
  const btnAddLayer = document.getElementById('btnAddLayer');
  if (btnAddLayer) btnAddLayer.addEventListener('click', () => {
    const l = createLayer('sin(x*0.02+t)*cos(y*0.02+t)*2', '#' + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0'), 'neon', 1, 1);
    compileLayerFn(l);
    ENG.layers.push(l);
    buildLayerCards();
    reassignParticlesLayers();
  });

  // Force field add
  const btnAddFF = document.getElementById('btnAddFF');
  if (btnAddFF) btnAddFF.addEventListener('click', () => {
    const type = document.getElementById('ffTypeSelect')?.value || 'attract';
    addForceField(type);
  });

  // Audio buttons
  const btnMic = document.getElementById('btnMic');
  if (btnMic) btnMic.addEventListener('click', startMic);

  const btnAudioStop = document.getElementById('btnAudioStop');
  if (btnAudioStop) btnAudioStop.addEventListener('click', stopAudio);

  const audioFileInput = document.getElementById('audioFileInput');
  if (audioFileInput) audioFileInput.addEventListener('change', e => {
    if (e.target.files[0]) startAudioFile(e.target.files[0]);
  });

  // Game mode buttons
  document.querySelectorAll('[data-game]').forEach(btn => {
    btn.addEventListener('click', () => startGameMode(btn.dataset.game));
  });

  const exitGameBtn = document.getElementById('btnExitGame');
  if (exitGameBtn) exitGameBtn.addEventListener('click', exitGameMode);

  // Export buttons
  const btn4K = document.getElementById('btnExport4K');
  if (btn4K) btn4K.addEventListener('click', export4K);

  const btnSVG = document.getElementById('btnExportSVG');
  if (btnSVG) btnSVG.addEventListener('click', exportSVG);

  const btnGLSL = document.getElementById('btnExportGLSL');
  if (btnGLSL) btnGLSL.addEventListener('click', exportGLSL);

  const btnSave = document.getElementById('btnSaveConfig');
  if (btnSave) btnSave.addEventListener('click', saveConfig);

  const loadInput = document.getElementById('loadConfigInput');
  if (loadInput) loadInput.addEventListener('change', e => {
    if (e.target.files[0]) loadConfig(e.target.files[0]);
  });

  // SVG modal actions
  const btnSvgCopy = document.getElementById('btnSvgCopy');
  if (btnSvgCopy) btnSvgCopy.addEventListener('click', () => {
    if (window._svgCache) { navigator.clipboard.writeText(window._svgCache).then(() => showToast(t('toastCopied'))); }
  });
  const btnSvgDown = document.getElementById('btnSvgDownload');
  if (btnSvgDown) btnSvgDown.addEventListener('click', () => {
    if (!window._svgCache) return;
    const blob = new Blob([window._svgCache], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = 'xoretex_' + Date.now() + '.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
  });

  // GLSL modal actions
  const btnGlslCopy = document.getElementById('btnGlslCopy');
  if (btnGlslCopy) btnGlslCopy.addEventListener('click', () => {
    if (window._glslCache) { navigator.clipboard.writeText(window._glslCache).then(() => showToast(t('toastCopied'))); }
  });

  // Modal closes
  document.getElementById('helpClose')?.addEventListener('click', () => hideModal('helpModal'));
  document.getElementById('svgClose')?.addEventListener('click', () => hideModal('svgModal'));
  document.getElementById('glslClose')?.addEventListener('click', () => hideModal('glslModal'));

  // Help dont show
  const helpDontChk = document.getElementById('helpDontShowChk');
  if (helpDontChk) helpDontChk.addEventListener('change', () => {
    if (helpDontChk.checked) localStorage.setItem('xoretex_help_seen', '1');
    else localStorage.removeItem('xoretex_help_seen');
  });

  // Recording
  const btnRecStop = document.getElementById('btnRecStop');
  if (btnRecStop) btnRecStop.addEventListener('click', stopRecording);
}

function bindSectionToggles() {
  document.querySelectorAll('.pSecHead').forEach(head => {
    head.addEventListener('click', () => {
      const bodyId = head.dataset.sec;
      const body = document.getElementById(bodyId);
      if (!body) return;
      const isOpen = body.classList.contains('open');
      body.classList.toggle('open', !isOpen);
      head.classList.toggle('open', !isOpen);
    });
  });
}

function syncControlsFromConfig() {
  const cfg = ENG.config;
  function setSlider(id, valId, val, decimals) {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const ve = document.getElementById(valId);
    if (ve) ve.textContent = parseFloat(val).toFixed(decimals || 2);
  }
  setSlider('sliderCount', 'valCount', cfg.particleCount, 0);
  setSlider('sliderSpeed', 'valSpeed', cfg.speed, 1);
  setSlider('sliderFriction', 'valFriction', cfg.friction, 3);
  setSlider('sliderTurbulence', 'valTurbulence', cfg.turbulence, 2);
  setSlider('sliderTrailFade', 'valTrailFade', cfg.trailFade, 2);
  setSlider('sliderMouseForce', 'valMouseForce', cfg.mouseForce, 0);
  setSlider('sliderConnDist', 'valConnDist', cfg.connDist, 0);

  const chkGlow = document.getElementById('chkGlow');
  if (chkGlow) chkGlow.checked = cfg.glow;
  const chkConn = document.getElementById('chkConnections');
  if (chkConn) chkConn.checked = cfg.connections;
  const chkBlur = document.getElementById('chkMotionBlur');
  if (chkBlur) chkBlur.checked = cfg.motionBlur;
  const chkDepth = document.getElementById('chkDepth3D');
  if (chkDepth) chkDepth.checked = cfg.depth3D;
  const selSym = document.getElementById('selSymmetry');
  if (selSym) selSym.value = cfg.symmetry;
  const selTrail = document.getElementById('selTrailShape');
  if (selTrail) selTrail.value = cfg.trailShape;
}

// ============================================================
// TOP BAR BINDINGS
// ============================================================
function bindTopBar() {
  const btnLang = document.getElementById('btnLang');
  if (btnLang) btnLang.addEventListener('click', toggleLang);

  const btnHelp = document.getElementById('btnHelp');
  if (btnHelp) btnHelp.addEventListener('click', () => showModal('helpModal'));

  const btnPause = document.getElementById('btnPause');
  if (btnPause) btnPause.addEventListener('click', togglePause);

  const btnFS = document.getElementById('btnFullscreen');
  if (btnFS) btnFS.addEventListener('click', toggleFullscreen);

  const btnSS = document.getElementById('btnScreenshot');
  if (btnSS) btnSS.addEventListener('click', exportScreenshot);

  const btnRec = document.getElementById('btnRecord');
  if (btnRec) btnRec.addEventListener('click', () => {
    if (ENG.mediaRecorder) stopRecording(); else startRecording();
  });

  // mode tabs
  document.querySelectorAll('.modeTab').forEach(btn => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
  });

  // panel toggle
  const panelToggle = document.getElementById('panelToggle');
  const sidePanel = document.getElementById('sidePanel');
  if (panelToggle && sidePanel) {
    panelToggle.addEventListener('click', () => {
      const collapsed = sidePanel.classList.toggle('collapsed');
      panelToggle.classList.toggle('collapsed', collapsed);
      panelToggle.textContent = collapsed ? '▸' : '◂';
    });
  }
}

function togglePause() {
  ENG.running = !ENG.running;
  const btn = document.getElementById('btnPause');
  if (btn) btn.textContent = ENG.running ? '⏸' : '▶';
  showToast(ENG.running ? t('resumed') : t('paused'));
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePause(); break;
      case 'KeyF': toggleFullscreen(); break;
      case 'KeyS': exportScreenshot(); break;
      case 'KeyR': if (ENG.mediaRecorder) stopRecording(); else startRecording(); break;
      case 'KeyH': showModal('helpModal'); break;
      case 'KeyP': {
        const sidePanel = document.getElementById('sidePanel');
        const panelToggle = document.getElementById('panelToggle');
        if (sidePanel) {
          const c = sidePanel.classList.toggle('collapsed');
          if (panelToggle) { panelToggle.classList.toggle('collapsed', c); panelToggle.textContent = c ? '▸' : '◂'; }
        }
        break;
      }
      case 'KeyL': toggleLang(); break;
      case 'Digit1': setViewMode('both'); break;
      case 'Digit2': setViewMode('2d'); break;
      case 'Digit3': setViewMode('3d'); break;
      case 'KeyN': if (window.nextCubePattern) window.nextCubePattern(); break;
    }
  });
}

// ============================================================
// MOUSE & TOUCH
// ============================================================
function bindMouse() {
  const canvas = flowCan;
  if (!canvas) return;

  canvas.addEventListener('mousemove', e => {
    ENG.mouse.x = e.clientX;
    ENG.mouse.y = e.clientY;
  });
  canvas.addEventListener('mousedown', e => {
    ENG.mouse.down = true;
    if (ENG.gameMode === 'sculptor') placeSculptorObstacle(e.clientX, e.clientY);
  });
  canvas.addEventListener('mouseup', () => { ENG.mouse.down = false; });
  canvas.addEventListener('mouseleave', () => { ENG.mouse.x = -9999; ENG.mouse.y = -9999; ENG.mouse.down = false; });
}

function bindTouch() {
  const canvas = flowCan;
  if (!canvas) return;
  const ring = document.getElementById('touchRing');

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t2 = e.touches[0];
    ENG.mouse.x = t2.clientX; ENG.mouse.y = t2.clientY; ENG.mouse.down = true;
    if (ring) { ring.style.display = 'block'; ring.style.left = t2.clientX + 'px'; ring.style.top = t2.clientY + 'px'; }
    if (ENG.gameMode === 'sculptor') placeSculptorObstacle(t2.clientX, t2.clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t2 = e.touches[0];
    ENG.mouse.x = t2.clientX; ENG.mouse.y = t2.clientY;
    if (ring) { ring.style.left = t2.clientX + 'px'; ring.style.top = t2.clientY + 'px'; }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    ENG.mouse.down = false; ENG.mouse.x = -9999; ENG.mouse.y = -9999;
    if (ring) ring.style.display = 'none';
  });
}

// ============================================================
// MODAL HELPERS
// ============================================================
function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}
function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================================================
// FORMULA VALIDATION
// ============================================================
function validateFormula(code) {
  try {
    new Function('x','y','t','r','cx','cy','PI','sin','cos','tan','atan2','sqrt','abs','noise','audio','return (' + code + ');');
    return true;
  } catch (e) { return false; }
}

function applyFormulaToLayer(code) {
  if (!ENG.layers.length) {
    const l = createLayer(code, '#00ffc8', 'cool', 1, 1);
    compileLayerFn(l);
    ENG.layers.push(l);
    buildLayerCards();
    reassignParticlesLayers();
    return;
  }
  const fl = ENG.focusedLayer >= 0 && ENG.focusedLayer < ENG.layers.length
    ? ENG.layers[ENG.focusedLayer] : ENG.layers[0];
  fl.eq = code;
  const ok = compileLayerFn(fl);
  const ind = document.getElementById('formulaIndicator');
  const sta = document.getElementById('formulaStatus');
  if (ind) ind.className = 'indicator ' + (ok ? 'valid' : 'invalid');
  if (sta) sta.textContent = ok ? t('valid') : t('invalid');
  buildLayerCards();
}

// ============================================================
// HELP MODAL CONTENT
// ============================================================
function buildHelpModal() {
  const body = document.getElementById('helpBody');
  if (!body) return;
  const steps = [
    { title: t('helpStep1Title'), text: t('helpStep1') },
    { title: t('helpStep2Title'), text: t('helpStep2') },
    { title: t('helpStep3Title'), text: t('helpStep3') },
    { title: t('helpStep4Title'), text: t('helpStep4') },
    { title: t('helpStep5Title'), text: t('helpStep5') },
    { title: t('helpStep6Title'), text: t('helpStep6') },
    { title: t('helpStep7Title'), text: t('helpStep7') },
  ];
  body.innerHTML = steps.map(s =>
    `<div class="step"><h3>${s.title}</h3><p>${s.text}</p></div>`
  ).join('');
  const titleEl = document.querySelector('#helpModal .modalTitle');
  if (titleEl) titleEl.textContent = t('helpTitle');
}

// ============================================================
// BOOT
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEngine2D);
} else {
  initEngine2D();
}