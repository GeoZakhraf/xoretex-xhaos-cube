// ═══════════════════════════════════════════════════════════
// XORETEX XHAOS LIVE v7.0 — COMPLETE ENGINE
// All features: i18n, WebGL, Games, SVG, GLSL, Audio 32-band,
// Beat Detection, Palettes, Force Fields, Physics, etc.
// ═══════════════════════════════════════════════════════════

// ═══════════ CANVAS REFERENCES ═══════════
const mainCan = document.getElementById('mainCan');
const ctx = mainCan.getContext('2d');
const bgCan = document.getElementById('bgCan');
const bgCtx = bgCan.getContext('2d');
const glowCan = document.getElementById('glowCan');
const glowCtx = glowCan.getContext('2d');
const connCan = document.getElementById('connCan');
const connCtx = connCan.getContext('2d');
const glCan = document.getElementById('glCan');

// ═══════════ GLOBAL STATE ═══════════
let W, H, time = 0;
let paused = false;
let panelOpen = true;
let layerCounter = 0;
let placingFieldType = null;
let focusedLayerIndex = -1;
let motionBlurEnabled = false;
let fieldPulseEnabled = false;
let currentLang = 'en';
let glowFrameCount = 0;
let draggingField = null;
let sculptorDrawing = false;

// Particle & layer arrays
let particles = [];
let layers = [];
let forceFields = [];
let stars = [];
let obstacles = [];

// Pointer state
const pointer = { x: -9999, y: -9999, on: false, repel: false };

// FPS tracking
let fpsCounter = 0;
let fpsLastTime = performance.now();
let fpsValue = 60;

// Audio state
let audioCtx = null;
let audioAnalyser = null;
let audioDataArray = null;
let audioActive = false;
let audioElement = null;
let audioFreqs = { bass: 0, mid: 0, high: 0, overall: 0 };
let audioBands = new Float32Array(32);
let beatDetected = false;
let prevBassEnergy = 0;
let bpm = 0;
let beatTimes = [];

// Recording state
let mediaRecorder = null;
let isRecording = false;
let recordChunks = [];
let recordFormat = 'webm';
let recordTimerInterval = null;
let recordStartTime = 0;

// WebGL state
let glMode = false;
let gl = null;
let glProgram = null;
let glBuffer = null;
let glReady = false;

// Game state
let gameMode = null;
let paintCanvas = null;
let paintCtx = null;
let colorWarData = null;

// ═══════════ CONFIG ═══════════
const config = {
    trail: 0.08,
    speed: 1.5,
    particleCount: 3000,
    lineWidth: 1.2,
    timeSpeed: 1.0,
    turbulence: 0,
    blendMode: 'lighter',
    mouseForce: 2.0,
    mouseRadius: 180,
    glowIntensity: 0.6,
    glowRadius: 8,
    audioSens: 1.0,
    audioBass: 0.5,
    colorCycle: 0,
    depth3d: 0,
    connections: 0,
    trailShape: 'line',
    symmetry: 1,
    recDuration: 10,
    friction: 0.94,
    pulseSpeed: 1.0
};

// ═══════════ CONSTANTS ═══════════
const LAYER_COLORS = [
    '#00ff88', '#00ccff', '#ff00aa', '#ffaa00',
    '#aa44ff', '#ff4466', '#44ffcc', '#ffff44'
];

const PALETTES = {
    mono:   (c) => [c, c, c, c],
    cool:   () => ['#00ff88', '#00ccff', '#4488ff', '#aa44ff'],
    warm:   () => ['#ff4400', '#ffaa00', '#ffff44', '#ff0066'],
    neon:   () => ['#00ffff', '#ff00ff', '#ffff00', '#00ff88'],
    ocean:  () => ['#0044ff', '#0088ff', '#00ccff', '#00ffcc'],
    fire:   () => ['#ff0000', '#ff4400', '#ffaa00', '#ffff00'],
    sunset: () => ['#ff4466', '#ff8844', '#ffcc22', '#aa44ff'],
    forest: () => ['#006633', '#00aa44', '#44cc66', '#88ff88']
};

const FORMULA_LIBRARY = [
    { name: '🌀 Swirly Nebula',   code: 'return atan2(y-cy,x-cx)+sin(r*0.02-t*2)*1.5;' },
    { name: '📐 Grid Wave',       code: 'return sin(x*0.02)*cos(y*0.02)*PI+t;' },
    { name: '🌊 Sine Ocean',      code: 'return sin(x*0.005+t)*0.8+PI/2;' },
    { name: '🔮 Crystal Lattice', code: 'return sin(x*0.015+y*0.015+t)*PI*2;' },
    { name: '🧬 DNA Helix',       code: 'return sin(y*0.02+t*2)*2+PI/2;' },
    { name: '💫 Spiral Arms',     code: 'return atan2(y-cy,x-cx)+0.5/Math.max(r*0.01,0.1)+t*0.3;' },
    { name: '🌪️ Turbulent Flow',  code: 'return noise(x*0.006+t,y*0.006)*PI*2+sin(r*0.01)*0.5;' },
    { name: '⚡ Electric Arc',    code: 'return atan2(sin(y*0.02+t*3),cos(x*0.02-t*2));' },
    { name: '🪐 Orbital Ring',    code: 'var a=atan2(y-cy,x-cx);return a+PI/2+sin(r*0.03-t*2)*1.5;' },
    { name: '🌸 Flower Bloom',    code: 'var a=atan2(y-cy,x-cx);return a+sin(a*5+t)*0.5+sin(r*0.02)*0.3;' }
];

// ═══════════ NOISE GENERATOR ═══════════
class NoiseGenerator {
    constructor() {
        this.perm = new Uint8Array(512);
        const base = new Uint8Array(256);
        for (let i = 0; i < 256; i++) base[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [base[i], base[j]] = [base[j], base[i]];
        }
        for (let i = 0; i < 512; i++) this.perm[i] = base[i & 255];
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y) {
        return ((hash & 1) ? -x : x) + ((hash & 2) ? -y : y);
    }
    noise2D(x, y) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x), v = this.fade(y);
        const A = this.perm[X] + Y, B = this.perm[X + 1] + Y;
        return this.lerp(v,
            this.lerp(u, this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y)),
            this.lerp(u, this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1))
        );
    }
}
const noise = new NoiseGenerator();

// ═══════════ COLOR UTILITIES ═══════════
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? {
        r: parseInt(m[1], 16),
        g: parseInt(m[2], 16),
        b: parseInt(m[3], 16)
    } : { r: 0, g: 255, b: 136 };
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return `#${[f(0), f(8), f(4)].map(x =>
        Math.round(x * 255).toString(16).padStart(2, '0')
    ).join('')}`;
}

// ═══════════ COMPLETE i18n SYSTEM ═══════════
const LANG = {
    en: {
        brand: "XORETEX XHAOS",
        subtitle: "LIVE ENGINE v7.0",
        fps: "FPS",
        particles_lbl: "PTS",
        layers_lbl: "LYR",
        time_lbl: "TIME",
        fields_lbl: "FLD",
        presets_title: "⚡ PRESETS",
        select_preset: "— Select Preset —",
        injection_title: "💉 LIVE INJECTION",
        formula_lib: "📚 Formula Library",
        layers_title: "📐 LAYERS",
        add_layer: "+ Add Layer",
        apply_btn: "▶ APPLY",
        audio_title: "🎵 AUDIO",
        mic_btn: "🎤 Mic",
        file_btn: "📁 File",
        sensitivity: "Sensitivity",
        bass_speed: "Bass → Speed",
        fields_title: "🧲 FORCE FIELDS",
        pulsating: "Pulsating",
        pulse_speed: "Pulse Speed",
        effects_title: "🪞 EFFECTS",
        color_cycle: "Color Cycle",
        depth_3d: "3D Depth",
        connections: "Connections",
        trail_shape: "Trail Shape",
        shape_line: "Line",
        shape_dot: "Dot",
        shape_tri: "Triangle",
        shape_glow: "Glow",
        motion_blur: "Motion Blur",
        controls_title: "🎛️ CONTROLS",
        trail_fade: "Trail",
        speed: "Speed",
        particle_count: "Particles",
        line_width: "Line Width",
        time_speed: "Time Speed",
        turbulence: "Turbulence",
        friction: "Friction",
        glow: "Glow",
        glow_radius: "Glow Radius",
        interact_title: "🖱️ INTERACT",
        force: "Force",
        radius: "Radius",
        blend: "Blend",
        games_title: "🎮 GAME MODES",
        game_painter: "Painter",
        game_sculptor: "Sculptor",
        game_battle: "Battle",
        game_colorwar: "Colors",
        actions_title: "⚙️ ACTIONS",
        rec_duration: "Rec (sec)",
        act_shot: "Shot",
        act_4k: "4K",
        act_rec: "Rec",
        act_pause: "Pause",
        act_svg: "SVG",
        act_glsl: "GLSL",
        act_save: "Save",
        act_load: "Load",
        act_random: "Random",
        act_clear: "Clear",
        keys_title: "⌨️ SHORTCUTS",
        dont_show: "Don't show again",
        ok_btn: "OK",
        layer_label: "LAYER",
        pal_mono: "🎨 Mono",
        pal_cool: "❄️ Cool",
        pal_warm: "🔥 Warm",
        pal_neon: "💡 Neon",
        pal_ocean: "🌊 Ocean",
        pal_fire: "🔥 Fire",
        pal_sunset: "🌅 Sunset",
        pal_forest: "🌲 Forest",
        help_title: "🚀 Welcome to Xoretex Xhaos Live",
        help_steps: [
            { t: "Choose a Preset", d: "Pick from ⚡ PRESETS or click 📚 Formula Library for ready-made equations." },
            { t: "Multi-Layer System", d: "Add layers with unique colors and palettes. Click the layer header to focus its particles." },
            { t: "Physics Engine", d: "Control Friction, Particle Mass, and Pulsating Force Fields for realistic motion." },
            { t: "Game Modes", d: "🖌️ Painter — draw with particles. 🗿 Sculptor — place obstacles. ⚔️ Battle — two forces compete. 🎨 Color War — territory control." },
            { t: "WebGL Mode", d: "Press G to switch to GPU rendering. Supports 500K+ particles at 60fps!" },
            { t: "SVG & Shader Export", d: "Export your creation as SVG vector art or GLSL shader code for Shadertoy." },
            { t: "Audio Reactive", d: "Enable mic or load audio. 32 frequency bands, beat detection, and auto BPM." }
        ],
        t_ready: "⚡ Xoretex v7 Ready!",
        t_paused: "⏸ Paused",
        t_resumed: "▶ Playing",
        t_cleared: "🗑️ Canvas Cleared",
        t_random: "🎲 Randomized!",
        t_screenshot: "📷 Screenshot Saved!",
        t_4k: "🖼️ 4K Exported!",
        t_cloned: "📋 Layer Cloned",
        t_rec_start: "🔴 Recording...",
        t_rec_saved: "🎥 Video Saved!",
        t_saved: "💾 Config Saved!",
        t_loaded: "📂 Config Loaded!",
        t_mic: "🎤 Microphone Connected!",
        t_err: "❌ Error: ",
        t_lang: "🌐 Switched to English",
        t_field_place: "🧲 Click canvas to place: ",
        t_fields_cleared: "🧲 All Fields Cleared",
        t_focus_on: "🎯 Layer Focused",
        t_focus_off: "🎯 Focus Cleared",
        t_webgl_on: "🖥️ WebGL Mode ON",
        t_webgl_off: "🖥️ Canvas 2D Mode",
        t_svg: "📐 SVG Exported!",
        t_glsl: "🖥️ Shader Generated!",
        gl_painter: "🖌️ PARTICLE PAINTER",
        gl_sculptor: "🗿 FLOW SCULPTOR",
        gl_battle: "⚔️ EQUATION BATTLE",
        gl_colorwar: "🎨 COLOR WAR"
    },
    ar: {
        brand: "زوريتكس كايوس",
        subtitle: "المحرك المباشر v7.0",
        fps: "إطار/ث",
        particles_lbl: "جسيمات",
        layers_lbl: "طبقات",
        time_lbl: "الوقت",
        fields_lbl: "حقول",
        presets_title: "⚡ القوالب الجاهزة",
        select_preset: "— اختر قالب —",
        injection_title: "💉 الحقن المباشر",
        formula_lib: "📚 مكتبة المعادلات",
        layers_title: "📐 الطبقات",
        add_layer: "+ إضافة طبقة",
        apply_btn: "▶ تطبيق",
        audio_title: "🎵 الصوت التفاعلي",
        mic_btn: "🎤 مايكروفون",
        file_btn: "📁 ملف صوتي",
        sensitivity: "الحساسية",
        bass_speed: "البيس ← السرعة",
        fields_title: "🧲 حقول القوى",
        pulsating: "نابض",
        pulse_speed: "سرعة النبض",
        effects_title: "🪞 المؤثرات البصرية",
        color_cycle: "دوران الألوان",
        depth_3d: "عمق ثلاثي الأبعاد",
        connections: "الروابط",
        trail_shape: "شكل المسار",
        shape_line: "خط",
        shape_dot: "نقطة",
        shape_tri: "مثلث",
        shape_glow: "توهج",
        motion_blur: "ضبابية الحركة",
        controls_title: "🎛️ أدوات التحكم",
        trail_fade: "التلاشي",
        speed: "السرعة",
        particle_count: "عدد الجسيمات",
        line_width: "عرض الخط",
        time_speed: "سرعة الزمن",
        turbulence: "الاضطراب",
        friction: "الاحتكاك",
        glow: "التوهج",
        glow_radius: "نصف قطر التوهج",
        interact_title: "🖱️ التفاعل",
        force: "القوة",
        radius: "نصف القطر",
        blend: "وضع الدمج",
        games_title: "🎮 أوضاع اللعب",
        game_painter: "رسّام",
        game_sculptor: "نحّات",
        game_battle: "معركة",
        game_colorwar: "حرب ألوان",
        actions_title: "⚙️ الإجراءات والتصدير",
        rec_duration: "مدة التسجيل (ث)",
        act_shot: "لقطة",
        act_4k: "4K",
        act_rec: "تسجيل",
        act_pause: "إيقاف",
        act_svg: "SVG",
        act_glsl: "شيدر",
        act_save: "حفظ",
        act_load: "تحميل",
        act_random: "عشوائي",
        act_clear: "مسح",
        keys_title: "⌨️ اختصارات لوحة المفاتيح",
        dont_show: "لا تظهر مرة أخرى",
        ok_btn: "حسناً",
        layer_label: "طبقة",
        pal_mono: "🎨 أحادي",
        pal_cool: "❄️ بارد",
        pal_warm: "🔥 دافئ",
        pal_neon: "💡 نيون",
        pal_ocean: "🌊 محيط",
        pal_fire: "🔥 نار",
        pal_sunset: "🌅 غروب",
        pal_forest: "🌲 غابة",
        help_title: "🚀 مرحباً بك في زوريتكس كايوس لايف",
        help_steps: [
            { t: "اختر قالباً جاهزاً", d: "اختر من ⚡ القوالب الجاهزة أو انقر 📚 مكتبة المعادلات لمعادلات جاهزة." },
            { t: "نظام الطبقات المتعددة", d: "أضف طبقات بألوان ولوحات فريدة. انقر عنوان الطبقة لتركيز جسيماتها." },
            { t: "محرك الفيزياء", d: "تحكم بالاحتكاك وكتلة الجسيمات وحقول القوى النابضة لحركة واقعية." },
            { t: "أوضاع اللعب", d: "🖌️ رسّام — ارسم بالجسيمات. 🗿 نحّات — ضع عوائق. ⚔️ معركة — قوتان تتصارعان. 🎨 حرب ألوان — سيطرة على المناطق." },
            { t: "وضع WebGL", d: "اضغط G للتبديل لعرض GPU. يدعم أكثر من 500 ألف جسيم!" },
            { t: "تصدير SVG وشيدر", d: "صدّر إبداعك كرسم SVG متجه أو كود GLSL لموقع Shadertoy." },
            { t: "التفاعل الصوتي", d: "فعّل المايك أو حمّل ملف صوتي. 32 نطاق تردد مع كشف الإيقاع وقياس BPM تلقائياً." }
        ],
        t_ready: "⚡ زوريتكس كايوس جاهز!",
        t_paused: "⏸ إيقاف مؤقت",
        t_resumed: "▶ تشغيل",
        t_cleared: "🗑️ تم مسح الشاشة",
        t_random: "🎲 تم التعشير!",
        t_screenshot: "📷 تم حفظ اللقطة!",
        t_4k: "🖼️ تم تصدير 4K!",
        t_cloned: "📋 تم نسخ الطبقة",
        t_rec_start: "🔴 بدأ التسجيل...",
        t_rec_saved: "🎥 تم حفظ الفيديو!",
        t_saved: "💾 تم حفظ الإعدادات!",
        t_loaded: "📂 تم تحميل الإعدادات!",
        t_mic: "🎤 تم توصيل المايكروفون!",
        t_err: "❌ خطأ: ",
        t_lang: "🌐 تم التبديل للعربية",
        t_field_place: "🧲 انقر على الشاشة لوضع: ",
        t_fields_cleared: "🧲 تم مسح جميع الحقول",
        t_focus_on: "🎯 تم تركيز الطبقة",
        t_focus_off: "🎯 تم إلغاء التركيز",
        t_webgl_on: "🖥️ وضع WebGL مفعّل",
        t_webgl_off: "🖥️ وضع Canvas 2D",
        t_svg: "📐 تم تصدير SVG!",
        t_glsl: "🖥️ تم توليد الشيدر!",
        gl_painter: "🖌️ الرسّام بالجسيمات",
        gl_sculptor: "🗿 نحت التدفق",
        gl_battle: "⚔️ معركة المعادلات",
        gl_colorwar: "🎨 حرب الألوان"
    }
};

function T(key) {
    return LANG[currentLang]?.[key] || LANG.en[key] || key;
}

function applyLanguage() {
    const isAr = currentLang === 'ar';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = isAr ? 'ar' : 'en';

    // Update all data-t elements
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        const val = T(key);
        if (val && typeof val === 'string') {
            if (el.tagName === 'OPTION') el.textContent = val;
            else el.textContent = val;
        }
    });

    // Update layer names
    layers.forEach((layer, idx) => {
        const nm = document.getElementById('nm-' + layer.id);
        if (nm) nm.textContent = T('layer_label') + ' ' + (idx + 1);
    });

    // Update palette selects
    const palKeys = ['pal_mono','pal_cool','pal_warm','pal_neon','pal_ocean','pal_fire','pal_sunset','pal_forest'];
    layers.forEach(layer => {
        const sel = document.getElementById('palsel-' + layer.id);
        if (sel) {
            sel.querySelectorAll('option').forEach((opt, i) => {
                if (palKeys[i]) opt.textContent = T(palKeys[i]);
            });
        }
    });

    // Update inject placeholder
    const injEl = document.getElementById('liveCode');
    if (injEl) injEl.placeholder = isAr
        ? 'اكتب معادلة... مثلاً sin(r*0.02-t)*2'
        : 'Type equation... e.g. sin(r*0.02-t)*2';

    // Rebuild help
    buildHelp();

    try { localStorage.setItem('xoretex_lang', currentLang); } catch (e) {}
}

function toggleLang() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    applyLanguage();
    toast(T('t_lang'));
}

// ═══════════ HELP SYSTEM ═══════════
function buildHelp() {
    const steps = T('help_steps') || [];
    document.getElementById('helpTitle').textContent = T('help_title');
    document.getElementById('helpBody').innerHTML = steps.map((s, i) =>
        `<div class="helpStep"><div class="helpNum">${i + 1}</div><div class="helpTxt"><h4>${s.t}</h4><p>${s.d}</p></div></div>`
    ).join('');
}

function showHelp() {
    buildHelp();
    document.getElementById('helpModal').classList.add('active');
}

function closeHelp() {
    document.getElementById('helpModal').classList.remove('active');
}

// ═══════════ UI HELPERS ═══════════
function toggleSection(el) {
    el.classList.toggle('shut');
    const content = el.nextElementSibling;
    content.style.maxHeight = el.classList.contains('shut') ? '0' : '3000px';
    content.style.opacity = el.classList.contains('shut') ? '0' : '1';
}

function setConfig(el) {
    config[el.id] = parseFloat(el.value);
    const valEl = document.getElementById('val-' + el.id);
    if (valEl) valEl.textContent = el.value;
    if (el.id === 'particleCount') initParticles();
}

function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function togglePanel() {
    panelOpen = !panelOpen;
    document.getElementById('panel').classList.toggle('hid');
    document.getElementById('togBtn').classList.toggle('shifted');
    document.getElementById('togBtn').textContent = panelOpen ? '⚡' : '☰';
}

function togglePause() {
    paused = !paused;
    document.getElementById('pauseBtn').textContent = paused ? '▶' : '⏸';
    toast(paused ? T('t_paused') : T('t_resumed'));
}

function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
}

function updateStats() {
    document.getElementById('s-fps').textContent = fpsValue;
    document.getElementById('s-pts').textContent = particles.length;
    document.getElementById('s-lyr').textContent = layers.filter(l => l.enabled).length;
    document.getElementById('s-time').textContent = time.toFixed(1);
    document.getElementById('s-fields').textContent = forceFields.length;
}

function setSymmetry(n, el) {
    config.symmetry = n;
    document.querySelectorAll('.symChip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
}

function toggleMotionBlur() {
    motionBlurEnabled = !motionBlurEnabled;
    document.getElementById('motionBlurTog').classList.toggle('on', motionBlurEnabled);
    mainCan.classList.toggle('mblur', motionBlurEnabled);
}

function toggleFieldPulse() {
    fieldPulseEnabled = !fieldPulseEnabled;
    document.getElementById('pulseToggle').classList.toggle('on', fieldPulseEnabled);
    renderFieldMarkers();
}

function setRecFormat(fmt, el) {
    recordFormat = fmt;
    document.querySelectorAll('.recOpt').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
}

// ═══════════ FORMULA LIBRARY ═══════════
function toggleFormulaLib() {
    const grid = document.getElementById('formulaGrid');
    grid.classList.toggle('open');
    if (grid.classList.contains('open') && !grid.children.length) {
        grid.innerHTML = FORMULA_LIBRARY.map((f, i) =>
            `<div class="flibItem" onclick="injectFormula(${i})">
                <span class="flName">${f.name}</span>
                <span class="flCode">${f.code.substring(7, 42)}…</span>
            </div>`
        ).join('');
    }
}

function injectFormula(index) {
    const f = FORMULA_LIBRARY[index];
    if (!f) return;
    document.getElementById('liveCode').value = f.code;
    if (!layers.length) addLayer(f.code);
    else {
        const codeEl = document.getElementById('code-' + layers[0].id);
        if (codeEl) codeEl.value = f.code;
    }
    document.getElementById('injectDot').className = 'injDot ok';
    applyAll();
    toast('📚 ' + f.name);
}

// ═══════════ LAYER FOCUS ═══════════
function focusLayer(index) {
    if (focusedLayerIndex === index) {
        focusedLayerIndex = -1;
        document.querySelectorAll('.layerBox').forEach(b => b.classList.remove('focused'));
        toast(T('t_focus_off'));
    } else {
        focusedLayerIndex = index;
        document.querySelectorAll('.layerBox').forEach(b => b.classList.remove('focused'));
        if (layers[index]) {
            const box = document.getElementById('box-' + layers[index].id);
            if (box) box.classList.add('focused');
        }
        toast(T('t_focus_on'));
    }
}

// ═══════════ FUNCTION BUILDER ═══════════
function buildFunction(code) {
    let c = code.trim();
    if (!c) return () => 0;
    if (!c.startsWith('return') && !c.includes('return ')) c = 'return ' + c;
    if (!c.endsWith(';')) c += ';';
    return new Function(
        'x', 'y', 't', 'r', 'cx', 'cy', 'PI',
        'sin', 'cos', 'tan', 'atan2', 'sqrt', 'abs',
        'noise', 'audio', c
    );
}

function executeFunction(fn, x, y, t, r, cx, cy) {
    return fn(x, y, t, r, cx, cy, Math.PI,
        Math.sin, Math.cos, Math.tan, Math.atan2, Math.sqrt, Math.abs,
        (a, b) => noise.noise2D(a, b), audioFreqs.overall
    );
}// ═══════════════════════════════════════════════════════════
// ENGINE.JS — PART 2/2
// Presets, Layers, Particles, Audio, WebGL, Games,
// SVG/GLSL Export, Recording, Events, Boot
// ═══════════════════════════════════════════════════════════

// ═══════════ PRESETS ═══════════
const PRESETS = {
    blackhole: {
        name: 'Black Hole',
        layers: [
            { code: "return atan2(y-cy,x-cx)+PI/2-3.0/Math.max(r*0.008,0.01);", color: '#ff6600' },
            { code: "var a=atan2(y-cy,x-cx);return a+sin(r*0.015-t*3)*0.8;", color: '#ffcc00' },
            { code: "return atan2(y-cy,x-cx)+PI/2-1.5/Math.max(r*0.01,0.1)+cos(t)*0.3;", color: '#ff2200' }
        ],
        config: { trail: 0.012, speed: 2.5, particleCount: 6000, lineWidth: 0.7, timeSpeed: 0.8, glowIntensity: 0.9, glowRadius: 12 }
    },
    storm: {
        name: 'Cosmic Storm',
        layers: [
            { code: "return sin(x*0.008+t)*cos(y*0.008+t)*PI*2;", color: '#ffffff' },
            { code: "return atan2(y-cy,x-cx)+sin(r*0.04-t*3)*2.5;", color: '#00ccff' },
            { code: "return cos(r*0.025)*sin(t*2+x*0.004)*PI+noise(x*0.003,y*0.003+t)*2;", color: '#9944ff' }
        ],
        config: { trail: 0.035, speed: 3.5, particleCount: 7000, lineWidth: 0.6, timeSpeed: 1.5, turbulence: 0.5, glowIntensity: 0.7, glowRadius: 10 }
    },
    dna: {
        name: 'DNA Helix',
        layers: [
            { code: "return sin(y*0.018+t*2)*1.8+PI/2;", color: '#00ff88' },
            { code: "return sin(y*0.018+t*2+PI)*1.8+PI/2;", color: '#ff4488' }
        ],
        config: { trail: 0.025, speed: 2.0, particleCount: 5000, lineWidth: 1.5, timeSpeed: 1.2, glowIntensity: 0.5, glowRadius: 6 }
    },
    galaxy: {
        name: 'Galaxy',
        layers: [
            { code: "return atan2(y-cy,x-cx)+0.6/Math.max(r*0.008,0.1)+t*0.3;", color: '#00ccff' },
            { code: "return sin(r*0.015-t*2)*PI+atan2(y-cy,x-cx);", color: '#ff00aa' }
        ],
        config: { trail: 0.015, speed: 2.0, particleCount: 6000, lineWidth: 0.8, timeSpeed: 0.7, glowIntensity: 0.7, glowRadius: 10 }
    },
    aurora: {
        name: 'Aurora',
        layers: [
            { code: "return sin(x*0.003+t*0.5)*2+PI/2+noise(x*0.002,y*0.002+t*0.3)*1.5;", color: '#00ff88' },
            { code: "return sin(x*0.005+t*0.8)*1.8+PI/2+noise(x*0.001+t,y*0.001)*2;", color: '#aa44ff' }
        ],
        config: { trail: 0.02, speed: 1.5, particleCount: 5000, turbulence: 0.3, glowIntensity: 0.8, glowRadius: 14 }
    },
    phoenix: {
        name: 'Phoenix',
        layers: [
            { code: "var a=atan2(y-cy,x-cx);return a-PI/2+sin(r*0.03+t*4)*1.5;", color: '#ff4400' },
            { code: "return -PI/2+sin(x*0.01+t*3)*0.5+cos(y*0.015)*0.3;", color: '#ffaa00' }
        ],
        config: { trail: 0.05, speed: 4.0, particleCount: 5000, timeSpeed: 2.0, glowIntensity: 0.9, glowRadius: 15 }
    },
    quantum: {
        name: 'Quantum',
        layers: [
            { code: "return sin(x*0.025)*cos(y*0.025)*PI+sin(t+r*0.008)*2;", color: '#00ffff' },
            { code: "return sin(x*y*0.00008+t)*PI*2;", color: '#ff00ff' }
        ],
        config: { trail: 0.025, speed: 1.8, particleCount: 5000, glowIntensity: 0.6, glowRadius: 8 }
    },
    ocean: {
        name: 'Ocean',
        layers: [
            { code: "return sin(x*0.004+t)*0.6+sin(y*0.006+t*0.8)*0.4+PI*0.5;", color: '#0066ff' },
            { code: "return cos(x*0.006-t*1.2)*0.5+sin(y*0.004)*0.5+PI*0.55;", color: '#00aaff' }
        ],
        config: { trail: 0.03, speed: 1.8, particleCount: 5000, turbulence: 0.2, glowIntensity: 0.5, glowRadius: 8 }
    },
    neural: {
        name: 'Neural',
        layers: [
            { code: "return noise(x*0.008+t*0.5,y*0.008)*PI*2;", color: '#ff00aa' },
            { code: "return noise(x*0.005-t*0.3,y*0.005+t*0.2)*PI*2+sin(r*0.01)*0.5;", color: '#00ff88' }
        ],
        config: { trail: 0.03, speed: 2.0, particleCount: 5000, turbulence: 0.8, glowIntensity: 0.7, glowRadius: 10 }
    },
    tornado: {
        name: 'Tornado',
        layers: [
            { code: "var a=atan2(y-cy,x-cx);return a+PI/2+sin(y*0.01-t*3)*2-1.0/Math.max(r*0.005,0.01);", color: '#cccccc' },
            { code: "var a=atan2(y-cy,x-cx);return a+PI/2+cos(y*0.008+t*2)*1.5;", color: '#88aacc' }
        ],
        config: { trail: 0.04, speed: 3.0, particleCount: 6000, timeSpeed: 1.8, turbulence: 0.4, glowIntensity: 0.5, glowRadius: 8 }
    }
};

function loadPreset(name) {
    if (!name) return;
    const preset = PRESETS[name];
    if (!preset) return;

    // Clear existing layers
    layers.forEach(l => {
        const el = document.getElementById('box-' + l.id);
        if (el) el.remove();
    });
    layers = [];
    focusedLayerIndex = -1;

    // Apply config
    if (preset.config) {
        Object.entries(preset.config).forEach(([key, val]) => {
            config[key] = val;
            const slider = document.getElementById(key);
            if (slider) {
                slider.value = val;
                const valEl = document.getElementById('val-' + key);
                if (valEl) valEl.textContent = val;
            }
        });
    }

    // Add layers
    preset.layers.forEach(l => addLayer(l.code, l.color));

    // Sync injection
    if (preset.layers[0]) {
        document.getElementById('liveCode').value = preset.layers[0].code;
        document.getElementById('injectDot').className = 'injDot ok';
    }

    applyAll();
    document.getElementById('presetDD').value = name;
    toast('⚡ ' + preset.name);
}

// ═══════════ LAYER MANAGEMENT ═══════════
function addLayer(code, color) {
    code = code || '';
    color = color || LAYER_COLORS[layers.length % LAYER_COLORS.length];
    const id = 'L' + (++layerCounter);
    const num = layers.length + 1;
    const idx = layers.length;
    const palette = PALETTES.mono(color);

    document.getElementById('layersBox').insertAdjacentHTML('beforeend', `
        <div class="layerBox" id="box-${id}">
            <div class="layHead">
                <div class="layId" onclick="focusLayer(${idx})">
                    <div class="layDot" id="dot-${id}" style="background:${color};box-shadow:0 0 5px ${color}"></div>
                    <span class="layName" id="nm-${id}" style="color:${color}">${T('layer_label')} ${num}</span>
                </div>
                <div class="layBtns">
                    <div class="layBtn on" id="vis-${id}" onclick="toggleLayerVis('${id}')">👁</div>
                    <div class="layBtn" onclick="duplicateLayer('${id}')">📋</div>
                    <div class="layBtn del" onclick="removeLayer('${id}')">✕</div>
                </div>
            </div>
            <textarea class="layCode" id="code-${id}" spellcheck="false" oninput="liveEdit()">${code || 'return sin(0.02*r-t);'}</textarea>
            <div class="layOpts">
                <input type="color" class="colorPick" id="clr-${id}" value="${color}" onchange="updateLayerDot('${id}',this.value);updatePalette('${id}')">
                <div class="miniCtrl">
                    <div class="miniLbl"><span>Op</span><span class="miniVal" id="opv-${id}">1.0</span></div>
                    <input type="range" id="op-${id}" min="0.05" max="1" step="0.05" value="1" oninput="document.getElementById('opv-${id}').textContent=this.value">
                </div>
                <div class="miniCtrl">
                    <div class="miniLbl"><span>Wt</span><span class="miniVal" id="wtv-${id}">1.0</span></div>
                    <input type="range" id="wt-${id}" min="0.1" max="4" step="0.1" value="1" oninput="document.getElementById('wtv-${id}').textContent=this.value">
                </div>
            </div>
            <div class="palRow" id="pal-${id}">${palette.map(c => `<div class="palSw" style="background:${c}"></div>`).join('')}</div>
            <select class="palSel" id="palsel-${id}" onchange="changePalette('${id}',this.value)">
                <option value="mono">${T('pal_mono')}</option>
                <option value="cool">${T('pal_cool')}</option>
                <option value="warm">${T('pal_warm')}</option>
                <option value="neon">${T('pal_neon')}</option>
                <option value="ocean">${T('pal_ocean')}</option>
                <option value="fire">${T('pal_fire')}</option>
                <option value="sunset">${T('pal_sunset')}</option>
                <option value="forest">${T('pal_forest')}</option>
            </select>
        </div>
    `);

    layers.push({
        id, enabled: true, fn: null, color,
        opacity: 1, weight: 1,
        palette, paletteName: 'mono'
    });
    updateStats();
}

function changePalette(id, palName) {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    layer.paletteName = palName;
    layer.palette = palName === 'mono'
        ? PALETTES.mono(layer.color)
        : (PALETTES[palName] ? PALETTES[palName]() : PALETTES.mono(layer.color));
    const row = document.getElementById('pal-' + id);
    if (row) row.innerHTML = layer.palette.map(c => `<div class="palSw" style="background:${c}"></div>`).join('');
}

function updatePalette(id) {
    const layer = layers.find(l => l.id === id);
    if (!layer || layer.paletteName !== 'mono') return;
    layer.color = document.getElementById('clr-' + id)?.value || '#00ff88';
    layer.palette = PALETTES.mono(layer.color);
    const row = document.getElementById('pal-' + id);
    if (row) row.innerHTML = layer.palette.map(c => `<div class="palSw" style="background:${c}"></div>`).join('');
}

function removeLayer(id) {
    const el = document.getElementById('box-' + id);
    if (!el) return;
    el.style.transition = 'all .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    setTimeout(() => {
        el.remove();
        layers = layers.filter(l => l.id !== id);
        focusedLayerIndex = -1;
        applyAll();
    }, 300);
}

function duplicateLayer(id) {
    const codeEl = document.getElementById('code-' + id);
    const colorEl = document.getElementById('clr-' + id);
    if (codeEl) addLayer(codeEl.value, colorEl?.value);
    applyAll();
    toast(T('t_cloned'));
}

function toggleLayerVis(id) {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    layer.enabled = !layer.enabled;
    const btn = document.getElementById('vis-' + id);
    btn.classList.toggle('on');
    btn.textContent = layer.enabled ? '👁' : '🚫';
    document.getElementById('box-' + id).classList.toggle('off');
    initParticles();
}

function updateLayerDot(id, color) {
    const dot = document.getElementById('dot-' + id);
    const name = document.getElementById('nm-' + id);
    if (dot) { dot.style.background = color; dot.style.boxShadow = '0 0 5px ' + color; }
    if (name) name.style.color = color;
}

// ═══════════ LIVE INJECTION ═══════════
let liveInjectTimer = null;

function liveInject(el) {
    clearTimeout(liveInjectTimer);
    liveInjectTimer = setTimeout(() => {
        const code = el.value.trim();
        const dot = document.getElementById('injectDot');
        if (!code) { dot.className = 'injDot'; return; }

        if (!layers.length) addLayer(code);
        else {
            const codeEl = document.getElementById('code-' + layers[0].id);
            if (codeEl) codeEl.value = code;
        }

        try {
            const fn = buildFunction(code);
            executeFunction(fn, 0, 0, 0, 0, 0, 0);
            el.classList.remove('err');
            dot.className = 'injDot ok';
            applyAll();
        } catch (e) {
            el.classList.add('err');
            dot.className = 'injDot err';
        }
    }, 180);
}

function liveEdit() {
    clearTimeout(liveInjectTimer);
    liveInjectTimer = setTimeout(() => applyAll(), 250);
}

function insertVar(v) {
    const el = document.getElementById('liveCode');
    const start = el.selectionStart;
    el.value = el.value.substring(0, start) + v + el.value.substring(el.selectionEnd);
    el.selectionStart = el.selectionEnd = start + v.length;
    el.focus();
    liveInject(el);
}

// ═══════════ APPLY ALL LAYERS ═══════════
function applyAll() {
    layers.forEach(layer => {
        const codeEl = document.getElementById('code-' + layer.id);
        if (!codeEl) return;
        layer.color = document.getElementById('clr-' + layer.id)?.value || '#00ff88';
        layer.opacity = parseFloat(document.getElementById('op-' + layer.id)?.value || 1);
        layer.weight = parseFloat(document.getElementById('wt-' + layer.id)?.value || 1);
        try {
            layer.fn = buildFunction(codeEl.value);
            executeFunction(layer.fn, 100, 100, 0, 50, W / 2, H / 2);
            codeEl.classList.remove('err');
        } catch (e) {
            layer.fn = () => 0;
            codeEl.classList.add('err');
        }
    });
    initParticles();
    updateStats();
}

// ═══════════ PARTICLE CLASS ═══════════
class Particle {
    constructor(layerIndex) {
        this.li = layerIndex;
        this.mass = 0.5 + Math.random() * 1.5;
        this.paletteIndex = Math.floor(Math.random() * 4);
        this.brightness = 0.4 + Math.random() * 0.6;
        this.size = 0.5 + Math.random() * 0.5;
        this.z = Math.random();
        this.reset();
    }

    reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.prevX = this.x;
        this.prevY = this.y;
        this.life = 60 + Math.random() * 140;
        this.maxLife = this.life;
        this.vx = 0;
        this.vy = 0;
        this.z = Math.random();
    }

    update() {
        this.prevX = this.x;
        this.prevY = this.y;

        const layer = layers[this.li];
        if (!layer || !layer.fn || !layer.enabled) return;

        const cx = W * 0.5, cy = H * 0.5;
        const dx = this.x - cx, dy = this.y - cy;
        const r = Math.sqrt(dx * dx + dy * dy);

        // Execute equation
        let angle = 0;
        try { angle = executeFunction(layer.fn, this.x, this.y, time, r, cx, cy); }
        catch (e) { angle = 0; }
        if (!isFinite(angle)) angle = 0;

        // Mass affects responsiveness
        const massInverse = 1.0 / this.mass;
        let speed = config.speed * (layer.weight || 1) * massInverse;

        // Audio modulation
        if (audioActive) {
            speed += audioFreqs.bass * config.audioBass * 3 * massInverse;
            if (beatDetected) speed *= 1.5;
        }

        // Turbulence
        if (config.turbulence > 0) {
            angle += noise.noise2D(this.x * 0.004 + time, this.y * 0.004) * config.turbulence;
        }

        // Mouse/Touch force
        if (config.mouseForce > 0 && pointer.on) {
            const mx = this.x - pointer.x, my = this.y - pointer.y;
            const md = Math.sqrt(mx * mx + my * my);
            if (md < config.mouseRadius && md > 0.5) {
                const force = (1 - md / config.mouseRadius) * config.mouseForce * (pointer.repel ? 1 : -1) * massInverse;
                this.vx += (mx / md) * force;
                this.vy += (my / md) * force;
            }
        }

        // Force fields
        for (let i = 0; i < forceFields.length; i++) {
            const ff = forceFields[i];
            const fx = this.x - ff.x, fy = this.y - ff.y;
            const fd = Math.sqrt(fx * fx + fy * fy);
            if (fd > ff.radius || fd < 1) continue;

            let strength = ff.strength;
            if (fieldPulseEnabled) {
                strength *= 0.5 + 0.5 * Math.sin(time * config.pulseSpeed * 3 + ff.x * 0.01);
            }

            const fs = (1 - fd / ff.radius) * strength * 0.3 * massInverse;
            switch (ff.type) {
                case 'attract': this.vx -= (fx / fd) * fs; this.vy -= (fy / fd) * fs; break;
                case 'repel':   this.vx += (fx / fd) * fs; this.vy += (fy / fd) * fs; break;
                case 'vortex':
                    this.vx += (-fy / fd) * fs; this.vy += (fx / fd) * fs;
                    this.vx -= (fx / fd) * fs * 0.2; this.vy -= (fy / fd) * fs * 0.2;
                    break;
                case 'gravity':
                    const g = fs * 2 / (fd * 0.01 + 1);
                    this.vx -= (fx / fd) * g; this.vy -= (fy / fd) * g;
                    break;
            }
        }

        // Obstacle collision
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const ox = this.x - obs.x, oy = this.y - obs.y;
            const od = Math.sqrt(ox * ox + oy * oy);
            if (od < obs.r && od > 0) {
                const push = (obs.r - od) / obs.r * 5;
                this.vx += (ox / od) * push;
                this.vy += (oy / od) * push;
            }
        }

        // Velocity with friction
        this.vx = this.vx * config.friction + Math.cos(angle) * speed * 0.15;
        this.vy = this.vy * config.friction + Math.sin(angle) * speed * 0.15;
        this.x += this.vx;
        this.y += this.vy;

        // Boundary check
        if (this.x < -60 || this.x > W + 60 || this.y < -60 || this.y > H + 60 || --this.life < 0) {
            this.reset();
        }

        // Game: Painter mode
        if (gameMode === 'painter' && paintCtx) {
            const pal = layers[this.li]?.palette || ['#fff'];
            const rgb = hexToRgb(pal[this.paletteIndex % pal.length]);
            paintCtx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.02)`;
            paintCtx.fillRect(this.x - 1, this.y - 1, 2, 2);
        }

        // Game: Color War (smooth gradient)
        if (gameMode === 'colorwar' && paintCtx) {
            const pal = layers[this.li]?.palette || ['#fff'];
            const col = pal[this.paletteIndex % pal.length];
            const rgb = hexToRgb(col);
            const radius = 8 + this.size * 4;
            const grad = paintCtx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
            grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.012)`);
            grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.006)`);
            grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
            paintCtx.fillStyle = grad;
            paintCtx.beginPath();
            paintCtx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            paintCtx.fill();
        }
    }

    draw(renderCtx) {
        const layer = layers[this.li];
        if (!layer || !layer.enabled) return;

        const lifeRatio = this.life / this.maxLife;
        let alpha = Math.min(1, lifeRatio * 3) * (layer.opacity || 1) * this.brightness;
        if (alpha < 0.01) return;

        // Focus effect
        if (focusedLayerIndex >= 0) {
            alpha = this.li === focusedLayerIndex ? Math.min(1, alpha * 1.8) : alpha * 0.15;
        }

        // Get color from palette
        const palette = layer.palette || [layer.color];
        const baseHex = palette[this.paletteIndex % palette.length];
        let rgb;

        if (config.colorCycle > 0) {
            const hue = (time * config.colorCycle * 50 + this.x * 0.1 + this.y * 0.1) % 360;
            const base = hexToRgb(baseHex);
            const mix = Math.min(config.colorCycle, 1);
            const cycleRgb = hexToRgb(hslToHex(hue, 100, 60));
            rgb = {
                r: Math.round(base.r * (1 - mix) + cycleRgb.r * mix),
                g: Math.round(base.g * (1 - mix) + cycleRgb.g * mix),
                b: Math.round(base.b * (1 - mix) + cycleRgb.b * mix)
            };
        } else {
            rgb = hexToRgb(baseHex);
        }

        // 3D depth
        let sz = config.lineWidth * this.size;
        if (config.depth3d > 0) {
            const zFactor = 0.3 + this.z * 0.7 * config.depth3d;
            alpha *= zFactor;
            sz *= zFactor;
        }

        const colorStr = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        const shape = config.trailShape;

        if (shape === 'line') {
            renderCtx.strokeStyle = colorStr;
            renderCtx.lineWidth = sz;
            renderCtx.beginPath();
            renderCtx.moveTo(this.prevX, this.prevY);
            renderCtx.lineTo(this.x, this.y);
            renderCtx.stroke();
        } else if (shape === 'dot') {
            renderCtx.fillStyle = colorStr;
            renderCtx.beginPath();
            renderCtx.arc(this.x, this.y, sz * 0.8, 0, Math.PI * 2);
            renderCtx.fill();
        } else if (shape === 'triangle') {
            renderCtx.fillStyle = colorStr;
            const s = sz * 2, ang = Math.atan2(this.vy, this.vx);
            renderCtx.beginPath();
            renderCtx.moveTo(this.x + Math.cos(ang) * s, this.y + Math.sin(ang) * s);
            renderCtx.lineTo(this.x + Math.cos(ang + 2.3) * s * 0.5, this.y + Math.sin(ang + 2.3) * s * 0.5);
            renderCtx.lineTo(this.x + Math.cos(ang - 2.3) * s * 0.5, this.y + Math.sin(ang - 2.3) * s * 0.5);
            renderCtx.fill();
        } else {
            const grad = renderCtx.createRadialGradient(this.x, this.y, 0, this.x, this.y, sz * 3);
            grad.addColorStop(0, colorStr);
            grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
            renderCtx.fillStyle = grad;
            renderCtx.beginPath();
            renderCtx.arc(this.x, this.y, sz * 3, 0, Math.PI * 2);
            renderCtx.fill();
        }
    }
}

function initParticles() {
    particles = [];
    const activeLayers = layers.filter(l => l.enabled && l.fn);
    if (!activeLayers.length) return;
    const perLayer = Math.floor(config.particleCount / activeLayers.length);
    activeLayers.forEach(layer => {
        const idx = layers.indexOf(layer);
        for (let i = 0; i < perLayer; i++) particles.push(new Particle(idx));
    });
    updateStats();
}

// ═══════════ FORCE FIELDS ═══════════
function addField(type) {
    placingFieldType = type;
    mainCan.style.cursor = 'crosshair';
    toast(T('t_field_place') + type);
}

function placeField(x, y, type) {
    const colors = { attract: '#00aaff', repel: '#ff4444', vortex: '#aa44ff', gravity: '#ffaa00' };
    forceFields.push({ id: 'F' + Date.now(), type, x, y, strength: 3, radius: 200, color: colors[type] });
    renderFieldMarkers();
    updateStats();
    mainCan.style.cursor = 'default';
    placingFieldType = null;
}

function removeField(id) {
    forceFields = forceFields.filter(f => f.id !== id);
    renderFieldMarkers();
    updateStats();
}

function clearFields() {
    forceFields = [];
    renderFieldMarkers();
    updateStats();
    toast(T('t_fields_cleared'));
}

function renderFieldMarkers() {
    const emojis = { attract: '🔵', repel: '🔴', vortex: '🟣', gravity: '⚫' };
    const bgs = { attract: 'rgba(0,170,255,.3)', repel: 'rgba(255,68,68,.3)', vortex: 'rgba(170,68,255,.3)', gravity: 'rgba(255,170,0,.3)' };

    document.getElementById('forceList').innerHTML = forceFields.map(f =>
        `<div class="ffItem"><span>${emojis[f.type]}</span><span style="flex:1;opacity:.5"><strong>${f.type}</strong>${fieldPulseEnabled ? ' ⚡' : ''}</span><div class="layBtn del" onclick="removeField('${f.id}')" style="font-size:8px">✕</div></div>`
    ).join('');

    document.getElementById('fieldMarkers').innerHTML = forceFields.map(f =>
        `<div class="fieldMark" style="left:${f.x}px;top:${f.y}px;border:2px solid ${f.color};background:${bgs[f.type]};width:${f.radius * 0.3}px;height:${f.radius * 0.3}px"></div>`
    ).join('');
}

// ═══════════ AUDIO SYSTEM (32-band + beat detection) ═══════════
function toggleAudio() {
    if (audioActive) {
        audioActive = false;
        if (audioElement) { audioElement.pause(); audioElement = null; }
        if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
        audioAnalyser = null;
        audioFreqs = { bass: 0, mid: 0, high: 0, overall: 0 };
        return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        audioAnalyser = audioCtx.createAnalyser();
        audioAnalyser.fftSize = 512;
        audioAnalyser.smoothingTimeConstant = 0.85;
        src.connect(audioAnalyser);
        audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
        audioActive = true;
        initAudioViz();
        toast(T('t_mic'));
    }).catch(() => toast('❌ Mic denied'));
}

function loadAudioFile(input) {
    const file = input.files[0];
    if (!file) return;
    if (audioCtx) audioCtx.close().catch(() => {});
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioElement = new Audio(URL.createObjectURL(file));
    audioElement.crossOrigin = 'anonymous';
    audioElement.loop = true;
    audioElement.addEventListener('canplay', () => {
        const src = audioCtx.createMediaElementSource(audioElement);
        audioAnalyser = audioCtx.createAnalyser();
        audioAnalyser.fftSize = 512;
        src.connect(audioAnalyser);
        audioAnalyser.connect(audioCtx.destination);
        audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
        audioActive = true;
        audioElement.play();
        initAudioViz();
        toast('🎵 ' + file.name);
    }, { once: true });
}

function initAudioViz() {
    const viz = document.getElementById('audioViz');
    viz.innerHTML = '';
    for (let i = 0; i < 32; i++) {
        const bar = document.createElement('div');
        bar.className = 'audBar';
        bar.style.height = '2px';
        viz.appendChild(bar);
    }
}

function updateAudio() {
    if (!audioActive || !audioAnalyser) return;
    audioAnalyser.getByteFrequencyData(audioDataArray);
    const len = audioDataArray.length;
    let bass = 0, mid = 0, high = 0;
    const bassEnd = Math.floor(len * 0.15), midEnd = Math.floor(len * 0.5);
    const bandSize = Math.floor(len / 32);

    // 32-band analysis
    for (let b = 0; b < 32; b++) {
        let sum = 0;
        for (let i = b * bandSize; i < (b + 1) * bandSize && i < len; i++) sum += audioDataArray[i];
        audioBands[b] = sum / (bandSize * 255) * config.audioSens;
    }

    for (let i = 0; i < len; i++) {
        if (i < bassEnd) bass += audioDataArray[i];
        else if (i < midEnd) mid += audioDataArray[i];
        else high += audioDataArray[i];
    }

    const sens = config.audioSens;
    audioFreqs.bass = (bass / (bassEnd * 255)) * sens;
    audioFreqs.mid = (mid / ((midEnd - bassEnd) * 255)) * sens;
    audioFreqs.high = (high / ((len - midEnd) * 255)) * sens;
    audioFreqs.overall = (audioFreqs.bass + audioFreqs.mid + audioFreqs.high) / 3;

    // Beat detection
    beatDetected = false;
    if (audioFreqs.bass > prevBassEnergy * 1.4 && audioFreqs.bass > 0.3) {
        beatDetected = true;
        const now = performance.now();
        beatTimes.push(now);
        if (beatTimes.length > 8) beatTimes.shift();
        if (beatTimes.length >= 4) {
            let avg = 0;
            for (let i = 1; i < beatTimes.length; i++) avg += beatTimes[i] - beatTimes[i - 1];
            bpm = Math.round(60000 / (avg / (beatTimes.length - 1)));
        }
    }
    prevBassEnergy = audioFreqs.bass * 0.7 + prevBassEnergy * 0.3;

    // Update visualization
    const bars = document.querySelectorAll('.audBar');
    bars.forEach((bar, i) => {
        const val = audioBands[i] || 0;
        bar.style.height = Math.max(2, val * 26) + 'px';
        bar.style.background = `hsl(${120 - val * 120},100%,${beatDetected ? '80' : '60'}%)`;
    });
}

// ═══════════ EFFECTS ═══════════
function drawConnections() {
    if (config.connections <= 0) { connCtx.clearRect(0, 0, W, H); return; }
    connCtx.clearRect(0, 0, W, H);
    const maxDist = config.connections, maxDistSq = maxDist * maxDist;
    const step = Math.max(1, Math.floor(particles.length / 400));
    connCtx.lineWidth = 0.3;
    for (let i = 0; i < particles.length; i += step) {
        for (let j = i + step; j < particles.length; j += step) {
            const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
            if (dx * dx + dy * dy < maxDistSq) {
                const alpha = 1 - Math.sqrt(dx * dx + dy * dy) / maxDist;
                const layer = layers[particles[i].li];
                if (!layer) continue;
                const rgb = hexToRgb((layer.palette || [layer.color])[0]);
                connCtx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.3})`;
                connCtx.beginPath();
                connCtx.moveTo(particles[i].x, particles[i].y);
                connCtx.lineTo(particles[j].x, particles[j].y);
                connCtx.stroke();
            }
        }
    }
}

function renderGlow() {
    if (config.glowIntensity <= 0) { glowCtx.clearRect(0, 0, W, H); glowCan.style.opacity = 0; return; }
    glowFrameCount++;
    if (glowFrameCount % 2) return;
    glowCtx.clearRect(0, 0, W, H);
    glowCtx.save();
    glowCtx.filter = `blur(${config.glowRadius}px) brightness(${1 + config.glowIntensity})`;
    glowCtx.drawImage(mainCan, 0, 0);
    glowCtx.restore();
    glowCan.style.opacity = config.glowIntensity;
}

function initStars() {
    stars = [];
    for (let i = 0; i < 120; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.2, sp: 0.02 + Math.random() * 0.04, b: Math.random() });
}

function drawStars() {
    bgCtx.fillStyle = '#020208';
    bgCtx.fillRect(0, 0, W, H);
    for (const s of stars) {
        s.b = 0.2 + 0.8 * Math.abs(Math.sin(time * s.sp * 8 + s.x * 0.01));
        bgCtx.fillStyle = `rgba(180,190,255,${s.b * 0.25})`;
        bgCtx.beginPath();
        bgCtx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        bgCtx.fill();
    }
}

// ═══════════ WebGL RENDERER ═══════════
function initWebGL() {
    try {
        gl = glCan.getContext('webgl2') || glCan.getContext('webgl');
        if (!gl) return false;
        const vertSrc = `attribute vec2 aPos;attribute vec3 aCol;attribute float aSize;varying vec3 vCol;void main(){gl_Position=vec4(aPos*2.0-1.0,0,1);gl_Position.y*=-1.0;gl_PointSize=aSize;vCol=aCol;}`;
        const fragSrc = `precision mediump float;varying vec3 vCol;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;gl_FragColor=vec4(vCol,(1.0-d*2.0)*0.8);}`;
        function makeShader(src, type) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
        glProgram = gl.createProgram();
        gl.attachShader(glProgram, makeShader(vertSrc, gl.VERTEX_SHADER));
        gl.attachShader(glProgram, makeShader(fragSrc, gl.FRAGMENT_SHADER));
        gl.linkProgram(glProgram);
        gl.useProgram(glProgram);
        glBuffer = gl.createBuffer();
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        glReady = true;
        return true;
    } catch (e) { return false; }
}

function renderWebGL() {
    if (!glReady || !particles.length) return;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0.008, 0.008, 0.03, config.trail);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const data = new Float32Array(particles.length * 6);
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i], layer = layers[p.li];
        if (!layer?.enabled) continue;
        const pal = layer.palette || [layer.color];
        const rgb = hexToRgb(pal[p.paletteIndex % pal.length]);
        let alpha = Math.min(1, (p.life / p.maxLife) * 3) * (layer.opacity || 1) * p.brightness;
        if (focusedLayerIndex >= 0) alpha = p.li === focusedLayerIndex ? alpha * 1.5 : alpha * 0.15;
        const j = i * 6;
        data[j] = p.x / W; data[j + 1] = p.y / H;
        data[j + 2] = rgb.r / 255 * alpha; data[j + 3] = rgb.g / 255 * alpha; data[j + 4] = rgb.b / 255 * alpha;
        data[j + 5] = config.lineWidth * p.size * (config.depth3d > 0 ? 0.3 + p.z * 0.7 : 1) * 2;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(glProgram, 'aPos');
    const colLoc = gl.getAttribLocation(glProgram, 'aCol');
    const sizeLoc = gl.getAttribLocation(glProgram, 'aSize');
    gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(colLoc); gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 24, 8);
    gl.enableVertexAttribArray(sizeLoc); gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 24, 20);
    gl.drawArrays(gl.POINTS, 0, particles.length);
}

function toggleWebGL() {
    glMode = !glMode;
    if (glMode) {
        if (!glReady && !initWebGL()) { glMode = false; toast('❌ No WebGL'); return; }
        glCan.style.display = 'block'; glCan.width = W; glCan.height = H;
        mainCan.style.opacity = '0';
        document.getElementById('modeBadge').textContent = 'WebGL';
        document.getElementById('modeBadge').className = 'modeBadge modeGL';
        document.getElementById('glBtn').classList.add('on');
        toast(T('t_webgl_on'));
    } else {
        glCan.style.display = 'none'; mainCan.style.opacity = '1';
        document.getElementById('modeBadge').textContent = '2D';
        document.getElementById('modeBadge').className = 'modeBadge mode2d';
        document.getElementById('glBtn').classList.remove('on');
        toast(T('t_webgl_off'));
    }
}

// ═══════════ GAME MODES ═══════════
function startGame(mode) {
    exitGame();
    gameMode = mode;
    document.getElementById('gameBar').classList.add('active');
    const labels = { painter: T('gl_painter'), sculptor: T('gl_sculptor'), battle: T('gl_battle'), colorwar: T('gl_colorwar') };
    document.getElementById('gameLabel').textContent = labels[mode] || mode;
    document.getElementById('gameScore').textContent = '0';

    if (mode === 'painter' || mode === 'colorwar') {
        paintCanvas = document.createElement('canvas');
        paintCanvas.width = W; paintCanvas.height = H;
        paintCtx = paintCanvas.getContext('2d');
    }
    if (mode === 'sculptor') { sculptorDrawing = false; toast('🗿 Click & drag to place obstacles!'); }
    if (mode === 'battle') {
        layers.forEach(l => { const el = document.getElementById('box-' + l.id); if (el) el.remove(); });
        layers = [];
        addLayer("return atan2(y-cy,x-cx)+sin(r*0.02-t)*2;", '#00ccff');
        addLayer("return atan2(y-cy,x-cx)+PI+sin(r*0.02+t)*2;", '#ff4466');
        applyAll();
    }
    toast('🎮 ' + (labels[mode] || mode));
}

function exitGame() {
    gameMode = null; obstacles = [];
    document.getElementById('gameBar').classList.remove('active');
    document.getElementById('obsLayer').innerHTML = '';
    paintCanvas = null; paintCtx = null; colorWarData = null;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
}

function updateGameScore() {
    if (!gameMode) return;
    if (gameMode === 'painter') document.getElementById('gameScore').textContent = 'T:' + time.toFixed(0);
    if (gameMode === 'sculptor') document.getElementById('gameScore').textContent = obstacles.length + ' obs';
    if (gameMode === 'colorwar' && paintCtx) {
        const samples = 120, counts = {};
        let total = 0;
        for (let i = 0; i < samples; i++) {
            const sx = Math.floor(Math.random() * W), sy = Math.floor(Math.random() * H);
            const px = paintCtx.getImageData(sx, sy, 1, 1).data;
            if (px[3] < 10) continue;
            let best = -1, bestDist = 1e9;
            layers.forEach((l, idx) => {
                for (const c of (l.palette || [l.color])) {
                    const rgb = hexToRgb(c);
                    const d = (px[0] - rgb.r) ** 2 + (px[1] - rgb.g) ** 2 + (px[2] - rgb.b) ** 2;
                    if (d < bestDist) { bestDist = d; best = idx; }
                }
            });
            if (best >= 0 && bestDist < 20000) { counts[best] = (counts[best] || 0) + 1; total++; }
        }
        if (total > 0) {
            let txt = '';
            Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
                txt += `<span style="color:${layers[k]?.color || '#fff'};font-weight:bold">${Math.round(v / total * 100)}%</span> `;
            });
            document.getElementById('gameScore').innerHTML = txt;
        }
    }
    if (gameMode === 'battle' && particles.length > 0) {
        let left = 0, right = 0;
        particles.forEach(p => { if (p.x < W / 2) left++; else right++; });
        document.getElementById('gameScore').innerHTML =
            `<span style="color:${layers[0]?.color || '#0cf'}">${Math.round(left / particles.length * 100)}%</span> ⚔️ <span style="color:${layers[1]?.color || '#f46'}">${Math.round(right / particles.length * 100)}%</span>`;
    }
}

function addObstacle(x, y) {
    const r = 15 + Math.random() * 15;
    obstacles.push({ x, y, r });
    document.getElementById('obsLayer').insertAdjacentHTML('beforeend',
        `<div class="obstacle" style="left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px"></div>`
    );
}

// ═══════════ SVG EXPORT ═══════════
function exportSVG() {
    let paths = '';
    const step = Math.max(1, Math.floor(particles.length / 2000));
    for (let i = 0; i < particles.length; i += step) {
        const p = particles[i], layer = layers[p.li];
        if (!layer?.enabled) continue;
        const pal = layer.palette || [layer.color];
        const col = pal[p.paletteIndex % pal.length];
        const alpha = Math.min(1, (p.life / p.maxLife) * 3) * (layer.opacity || 1) * p.brightness;
        if (config.trailShape === 'dot' || config.trailShape === 'glow-dot')
            paths += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(config.lineWidth * p.size).toFixed(1)}" fill="${col}" opacity="${alpha.toFixed(2)}"/>\n`;
        else
            paths += `<line x1="${p.prevX.toFixed(1)}" y1="${p.prevY.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${col}" stroke-width="${(config.lineWidth * p.size).toFixed(1)}" opacity="${alpha.toFixed(2)}" stroke-linecap="round"/>\n`;
    }
    document.getElementById('svgOutput').value = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<rect width="100%" height="100%" fill="#020208"/>\n${paths}</svg>`;
    document.getElementById('svgModal').classList.add('active');
    toast(T('t_svg'));
}

function downloadSVG() {
    downloadBlob(new Blob([document.getElementById('svgOutput').value], { type: 'image/svg+xml' }), 'xoretex.svg');
}

// ═══════════ GLSL SHADER EXPORT ═══════════
function exportShader() {
    const code = layers[0] ? document.getElementById('code-' + layers[0].id)?.value || '' : 'sin(r*0.02-t)';
    let body = code.replace(/return\s+/g, '').replace(/;$/, '')
        .replace(/Math\./g, '').replace(/PI/g, '3.14159')
        .replace(/noise\([^)]+\)/g, 'fract(sin(dot(uv,vec2(12.9898,78.233)))*43758.5453)')
        .replace(/atan2\(/g, 'atan(')
        .replace(/\bx\b/g, 'p.x').replace(/\by\b/g, 'p.y')
        .replace(/\br\b/g, 'length(p-c)')
        .replace(/\bt\b/g, 'iTime')
        .replace(/\bcx\b/g, 'c.x').replace(/\bcy\b/g, 'c.y');

    document.getElementById('glslOutput').value =
`// Xoretex Xhaos Live — Auto-generated GLSL
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = fragCoord, c = iResolution.xy * 0.5;
    float angle = ${body};
    vec2 flow = vec2(cos(angle), sin(angle));
    vec3 col = 0.5 + 0.5 * cos(angle + vec3(0, 2.094, 4.189));
    float intensity = 0.5 + 0.5 * sin(length(p - c) * 0.01 - iTime);
    fragColor = vec4(col * intensity, 1.0);
}`;
    document.getElementById('glslModal').classList.add('active');
    toast(T('t_glsl'));
}

// ═══════════ ANIMATION LOOP ═══════════
function animate() {
    if (!paused) {
        // Update all particles
        for (let i = 0; i < particles.length; i++) particles[i].update();

        if (glMode && glReady) {
            renderWebGL();
        } else {
            // Trail fade
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(2,2,8,${config.trail})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = config.blendMode;

            // Draw with symmetry
            if (config.symmetry > 1) {
                const cx = W / 2, cy = H / 2;
                const total = particles.length;
                const perSeg = Math.floor(total / config.symmetry);
                for (let s = 0; s < config.symmetry; s++) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(Math.PI * 2 / config.symmetry * s);
                    ctx.translate(-cx, -cy);
                    for (let i = s * perSeg; i < Math.min((s + 1) * perSeg, total); i++) {
                        particles[i].draw(ctx);
                    }
                    ctx.restore();
                }
            } else {
                for (let i = 0; i < particles.length; i++) particles[i].draw(ctx);
            }

            ctx.globalCompositeOperation = 'source-over';

            // Game overlays
            if (gameMode === 'painter' && paintCanvas) {
                ctx.globalAlpha = 0.6;
                ctx.drawImage(paintCanvas, 0, 0);
                ctx.globalAlpha = 1;
            }
            if (gameMode === 'colorwar' && paintCanvas) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.85;
                ctx.drawImage(paintCanvas, 0, 0);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                paintCtx.fillStyle = 'rgba(0,0,0,0.002)';
                paintCtx.fillRect(0, 0, W, H);
            }
        }

        // Post effects
        renderGlow();
        drawConnections();
        updateAudio();

        // Color cycle preview
        const cycPrev = document.getElementById('cyclePreview');
        if (cycPrev) cycPrev.style.opacity = config.colorCycle > 0 ? '0.6' : '0';

        // Advance time
        time += 0.01 * config.timeSpeed;

        // Game score updates
        if (gameMode && fpsCounter % 30 === 0) updateGameScore();
    }

    // FPS calculation
    fpsCounter++;
    const now = performance.now();
    if (now - fpsLastTime >= 600) {
        fpsValue = Math.round(fpsCounter * 1000 / (now - fpsLastTime));
        fpsCounter = 0;
        fpsLastTime = now;
        updateStats();
    }

    requestAnimationFrame(animate);
}

// ═══════════ RECORDING ═══════════
function toggleRecord() { if (!isRecording) startRecording(); else stopRecording(); }

function startRecording() {
    let mime = 'video/webm';
    for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
        if (MediaRecorder.isTypeSupported(m)) { mime = m; break; }
    }
    try {
        const stream = mainCan.captureStream(30);
        recordChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
        mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) recordChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            if (recordChunks.length) {
                const blob = new Blob(recordChunks, { type: 'video/webm' });
                downloadBlob(blob, `xoretex-${Date.now()}.webm`);
                toast(T('t_rec_saved'));
            }
        };
        mediaRecorder.start(500);
        isRecording = true;
        recordStartTime = Date.now();
        document.getElementById('recProg').style.display = 'block';
        document.getElementById('recTotal').textContent = formatTime(config.recDuration);
        recordTimerInterval = setInterval(() => {
            const elapsed = (Date.now() - recordStartTime) / 1000;
            document.getElementById('recTimer').textContent = formatTime(elapsed);
            document.getElementById('recBar').style.width = (elapsed / config.recDuration * 100) + '%';
        }, 500);
        document.getElementById('recActBtn').classList.add('recOn');
        document.getElementById('recLabel').textContent = '⏹';
        document.getElementById('recBtnH').classList.add('on');
        toast(T('t_rec_start'));
        setTimeout(() => { if (isRecording) stopRecording(); }, config.recDuration * 1000);
    } catch (e) { toast(T('t_err') + e.message); }
}

function stopRecording() {
    if (mediaRecorder?.state !== 'inactive') mediaRecorder.stop();
    isRecording = false;
    clearInterval(recordTimerInterval);
    document.getElementById('recProg').style.display = 'none';
    document.getElementById('recActBtn').classList.remove('recOn');
    document.getElementById('recLabel').textContent = T('act_rec');
    document.getElementById('recBtnH').classList.remove('on');
}

function formatTime(seconds) {
    seconds = Math.floor(seconds);
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}

// ═══════════ EXPORT UTILITIES ═══════════
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}

function exportHiRes() {
    const exp = document.createElement('canvas');
    exp.width = W * 2; exp.height = H * 2;
    const ectx = exp.getContext('2d');
    ectx.drawImage(bgCan, 0, 0, W, H, 0, 0, exp.width, exp.height);
    ectx.drawImage(mainCan, 0, 0, W, H, 0, 0, exp.width, exp.height);
    if (config.glowIntensity > 0) {
        ectx.globalAlpha = config.glowIntensity;
        ectx.globalCompositeOperation = 'screen';
        ectx.drawImage(glowCan, 0, 0, W, H, 0, 0, exp.width, exp.height);
        ectx.globalAlpha = 1;
        ectx.globalCompositeOperation = 'source-over';
    }
    ectx.font = '18px Orbitron';
    ectx.fillStyle = 'rgba(0,255,136,0.1)';
    ectx.fillText('Xoretex Xhaos Live', 22, exp.height - 22);
    downloadBlob(dataURLToBlob(exp.toDataURL('image/png', 1)), `xoretex-${Date.now()}.png`);
    toast(T('t_screenshot'));
}

function export4K() {
    const exp = document.createElement('canvas');
    exp.width = 3840; exp.height = 2160;
    const ectx = exp.getContext('2d');
    ectx.drawImage(bgCan, 0, 0, W, H, 0, 0, 3840, 2160);
    ectx.drawImage(mainCan, 0, 0, W, H, 0, 0, 3840, 2160);
    ectx.font = '34px Orbitron';
    ectx.fillStyle = 'rgba(0,255,136,0.1)';
    ectx.fillText('Xoretex Xhaos Live', 38, 2128);
    downloadBlob(dataURLToBlob(exp.toDataURL('image/png', 1)), `xoretex-4K-${Date.now()}.png`);
    toast(T('t_4k'));
}

// ═══════════ SAVE / LOAD ═══════════
function saveConfig() {
    const data = {
        version: 7,
        lang: currentLang,
        config: { ...config },
        motionBlur: motionBlurEnabled,
        fieldPulse: fieldPulseEnabled,
        glMode: glMode,
        layers: layers.map(l => ({
            code: document.getElementById('code-' + l.id)?.value || '',
            color: document.getElementById('clr-' + l.id)?.value || '',
            opacity: parseFloat(document.getElementById('op-' + l.id)?.value || 1),
            weight: parseFloat(document.getElementById('wt-' + l.id)?.value || 1),
            palette: l.paletteName
        })),
        fields: forceFields
    };
    downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        `xoretex-${Date.now()}.json`
    );
    toast(T('t_saved'));
}

function loadConfigFile() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);

                // Clear existing
                layers.forEach(l => {
                    const el = document.getElementById('box-' + l.id);
                    if (el) el.remove();
                });
                layers = []; forceFields = []; focusedLayerIndex = -1;

                // Restore language
                if (data.lang) { currentLang = data.lang; applyLanguage(); }

                // Restore config
                if (data.config) {
                    Object.entries(data.config).forEach(([k, v]) => {
                        config[k] = v;
                        const slider = document.getElementById(k);
                        if (slider) {
                            slider.value = v;
                            const valEl = document.getElementById('val-' + k);
                            if (valEl) valEl.textContent = v;
                        }
                    });
                }

                // Restore layers
                if (data.layers) {
                    data.layers.forEach(l => {
                        addLayer(l.code, l.color);
                        if (l.palette && l.palette !== 'mono') {
                            const last = layers[layers.length - 1];
                            const sel = document.getElementById('palsel-' + last.id);
                            if (sel) { sel.value = l.palette; changePalette(last.id, l.palette); }
                        }
                    });
                }

                // Restore fields
                if (data.fields) {
                    forceFields = data.fields.map(f => ({ ...f, id: 'F' + Date.now() + Math.random() }));
                    renderFieldMarkers();
                }

                applyAll();
                toast(T('t_loaded'));
            } catch (err) {
                toast(T('t_err') + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ═══════════ RANDOMIZE ═══════════
function randomizeAll() {
    layers.forEach(l => {
        const el = document.getElementById('box-' + l.id);
        if (el) el.remove();
    });
    layers = [];
    focusedLayerIndex = -1;

    const palNames = Object.keys(PALETTES);
    const numLayers = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numLayers; i++) {
        addLayer(FORMULA_LIBRARY[Math.floor(Math.random() * FORMULA_LIBRARY.length)].code);
        const last = layers[layers.length - 1];
        const randomPal = palNames[Math.floor(Math.random() * palNames.length)];
        const sel = document.getElementById('palsel-' + last.id);
        if (sel) { sel.value = randomPal; changePalette(last.id, randomPal); }
    }

    config.speed = +(0.5 + Math.random() * 4).toFixed(1);
    config.trail = +(0.01 + Math.random() * 0.1).toFixed(3);
    config.friction = +(0.88 + Math.random() * 0.11).toFixed(3);
    config.timeSpeed = +(0.5 + Math.random() * 2).toFixed(1);

    ['speed', 'trail', 'friction', 'timeSpeed'].forEach(k => {
        const slider = document.getElementById(k);
        if (slider) {
            slider.value = config[k];
            const valEl = document.getElementById('val-' + k);
            if (valEl) valEl.textContent = config[k];
        }
    });

    applyAll();
    toast(T('t_random'));
}

// ═══════════ CLEAR ═══════════
function clearCanvas() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#020208';
    ctx.fillRect(0, 0, W, H);
    glowCtx.clearRect(0, 0, W, H);
    connCtx.clearRect(0, 0, W, H);
    if (glReady) { gl.clearColor(0.008, 0.008, 0.03, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
    particles.forEach(p => p.reset());
    toast(T('t_cleared'));
}

// ═══════════ EVENT HANDLERS ═══════════
const touchRing = document.getElementById('touchRing');

mainCan.addEventListener('mousemove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.on = true; pointer.repel = e.shiftKey;
    if (draggingField) { draggingField.x = e.clientX; draggingField.y = e.clientY; renderFieldMarkers(); }
    if (sculptorDrawing && gameMode === 'sculptor') addObstacle(e.clientX, e.clientY);
});

mainCan.addEventListener('mouseleave', () => { pointer.on = false; });

mainCan.addEventListener('mousedown', e => {
    if (placingFieldType) return;
    if (gameMode === 'sculptor') { sculptorDrawing = true; addObstacle(e.clientX, e.clientY); return; }
    forceFields.forEach(f => {
        if (Math.sqrt((e.clientX - f.x) ** 2 + (e.clientY - f.y) ** 2) < 20) draggingField = f;
    });
});

mainCan.addEventListener('mouseup', () => { draggingField = null; sculptorDrawing = false; });

mainCan.addEventListener('click', e => {
    if (draggingField || sculptorDrawing) return;
    if (placingFieldType) { placeField(e.clientX, e.clientY, placingFieldType); return; }
    if (config.mouseForce > 0) {
        for (let i = 0; i < Math.min(50, particles.length); i++) {
            const idx = Math.floor(Math.random() * particles.length);
            const p = particles[idx];
            const angle = Math.random() * Math.PI * 2;
            p.x = e.clientX; p.y = e.clientY;
            p.vx = Math.cos(angle) * (4 + Math.random() * 8);
            p.vy = Math.sin(angle) * (4 + Math.random() * 8);
            p.life = p.maxLife;
        }
    }
});

mainCan.addEventListener('touchstart', e => {
    e.preventDefault();
    const tc = e.touches[0];
    pointer.x = tc.clientX; pointer.y = tc.clientY;
    pointer.on = true; pointer.repel = e.touches.length >= 2;
    touchRing.style.left = tc.clientX + 'px';
    touchRing.style.top = tc.clientY + 'px';
    touchRing.style.width = touchRing.style.height = config.mouseRadius * 2 + 'px';
    touchRing.classList.add('on');
    touchRing.classList.toggle('repel', pointer.repel);
    if (placingFieldType) placeField(tc.clientX, tc.clientY, placingFieldType);
    if (gameMode === 'sculptor') addObstacle(tc.clientX, tc.clientY);
}, { passive: false });

mainCan.addEventListener('touchmove', e => {
    e.preventDefault();
    const tc = e.touches[0];
    pointer.x = tc.clientX; pointer.y = tc.clientY;
    pointer.repel = e.touches.length >= 2;
    touchRing.style.left = tc.clientX + 'px';
    touchRing.style.top = tc.clientY + 'px';
    touchRing.classList.toggle('repel', pointer.repel);
    if (gameMode === 'sculptor') addObstacle(tc.clientX, tc.clientY);
}, { passive: false });

mainCan.addEventListener('touchend', e => {
    if (!e.touches.length) {
        pointer.on = false;
        touchRing.classList.remove('on', 'repel');
    }
});

document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;

    switch (e.key) {
        case 'Tab': e.preventDefault(); togglePanel(); break;
        case ' ': e.preventDefault(); togglePause(); break;
        case 's': case 'S': exportHiRes(); break;
        case 'c': case 'C': clearCanvas(); break;
        case 'r': case 'R': randomizeAll(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'h': case 'H': showHelp(); break;
        case 'l': case 'L': toggleLang(); break;
        case 'm': case 'M': toggleMotionBlur(); break;
        case 'g': case 'G': toggleWebGL(); break;
        case '1': addField('attract'); break;
        case '2': addField('repel'); break;
        case '3': addField('vortex'); break;
        case '4': addField('gravity'); break;
        case '0': clearFields(); break;
        case 'Escape':
            closeHelp();
            focusedLayerIndex = -1;
            document.querySelectorAll('.layerBox').forEach(b => b.classList.remove('focused'));
            if (placingFieldType) { placingFieldType = null; mainCan.style.cursor = 'default'; }
            if (gameMode) exitGame();
            break;
    }
});

// ═══════════ RESIZE ═══════════
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        W = mainCan.width = bgCan.width = glowCan.width = connCan.width = window.innerWidth;
        H = mainCan.height = bgCan.height = glowCan.height = connCan.height = window.innerHeight;
        if (glReady) { glCan.width = W; glCan.height = H; }
        if (W <= 768 && config.particleCount > 4000) {
            config.particleCount = 3000;
            const slider = document.getElementById('particleCount');
            if (slider) { slider.value = 3000; const v = document.getElementById('val-particleCount'); if (v) v.textContent = '3000'; }
        }
        initStars(); drawStars(); renderFieldMarkers(); applyAll();
    }, 150);
});

// ═══════════ BOOT ═══════════
(function boot() {
    // Initialize canvas sizes
    W = mainCan.width = bgCan.width = glowCan.width = connCan.width = window.innerWidth;
    H = mainCan.height = bgCan.height = glowCan.height = connCan.height = window.innerHeight;
    glCan.width = W; glCan.height = H;

    // Mobile optimization
    if (W <= 768 || 'ontouchstart' in window) {
        config.particleCount = 2500;
        config.glowRadius = 5;
        const slider = document.getElementById('particleCount');
        if (slider) { slider.value = 2500; const v = document.getElementById('val-particleCount'); if (v) v.textContent = '2500'; }
    }

    // Restore saved language
    try {
        const savedLang = localStorage.getItem('xoretex_lang');
        if (savedLang && LANG[savedLang]) currentLang = savedLang;
    } catch (e) {}

    // Apply language
    applyLanguage();

    // Initialize WebGL
    initWebGL();

    // Add default layers
    addLayer("return sin(0.015*x+t)*cos(0.02*y);", '#00ff88');
    addLayer("return atan2(y-cy,x-cx)+PI/2+sin(r*0.01-t)*0.5;", '#00ccff');

    // Sync live injection
    document.getElementById('liveCode').value = "return sin(0.015*x+t)*cos(0.02*y);";
    document.getElementById('injectDot').className = 'injDot ok';

    // Initialize all systems
    initAudioViz();
    initStars();
    drawStars();
    applyAll();
    animate();

    // Background star refresh
    setInterval(() => { if (!paused) drawStars(); }, 120);

    // First visit help
    try {
        if (localStorage.getItem('xnh') !== '1') setTimeout(() => showHelp(), 800);
    } catch (e) { setTimeout(() => showHelp(), 800); }

    // Welcome
    setTimeout(() => toast(T('t_ready')), 500);

    // Console log
    console.log(
        `%c⚡ Xoretex Xhaos Live v7.0`,
        'color:#00ff88;font-size:18px;font-weight:bold',
        `\nWebGL: ${glReady ? '✅' : '❌'}  |  Lang: ${currentLang}  |  Particles: ${config.particleCount}`
    );
})();
