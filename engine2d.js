/**
 * Xoretex Xhaos Cube — engine2d.js
 * 2D Particle Flow Engine, Localization, Panel Logic,
 * Force Fields, Audio, Game Modes, Export Tools
 * FIXED: ENG exposed globally, view mode pointer-events, load order
 */

'use strict';

// ============================================================
// GLOBAL ERROR REPORTER
// ============================================================
function reportError(msg, err) {
  const el = document.getElementById('errorOverlay');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML += '<div style="margin-bottom:6px;"><b>\u26A0</b> ' + msg +
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
    layers: 'Layers', addLayer: '+ Add Layer', audio: 'Audio', microphone: '\uD83C\uDFA4 Mic',
    audioFile: '\uD83C\uDFB5 File', stopAudio: '\u23F9 Stop', bpm: 'BPM', beat: 'Beat', audioGain: 'Audio Gain',
    forceFields: 'Force Fields', addField: '+ Add', pulsate: 'Pulsate', pulseSpeed: 'Pulse Speed',
    effects: 'Effects', trailFade: 'Trail Fade', motionBlur: 'Motion Blur', glowBloom: 'Glow / Bloom',
    connections: 'Connections', connDist: 'Connection Distance', symmetry: 'Symmetry',
    depth3d: '3D Depth Illusion', trailShape: 'Trail Shape', controls: 'Controls',
    particleCount: 'Particle Count', speed: 'Speed', friction: 'Friction', turbulence: 'Turbulence',
    mouseForce: 'Mouse Force', interaction: 'Interaction', mouseMode: 'Mouse Mode',
    gameModes: 'Game Modes', painter: '\uD83C\uDFA8 Painter', sculptor: '\uD83D\uDDFF Sculptor',
    battle: '\u2694 Battle', colorWar: '\uD83C\uDF08 Color War', exitGame: '\u2715 Exit Game',
    cubeControls: 'Cube Controls', cubePattern: 'Pattern', random: 'Random', autoSwitch: 'Auto Switch',
    autoInterval: 'Auto Interval (s)', autoSpin: 'Auto Spin', zenOrbit: 'Zen Orbit',
    reflection: 'Reflection', floorGrid: 'Floor Grid', edgeGlow: 'Edge Glow',
    emissive: 'Emissive', shatter: '\uD83D\uDCA5 Shatter', actions: 'Actions',
    export4k: '\uD83D\uDCD0 4K Export', exportSvg: '\uD83D\uDDBC SVG', exportGlsl: '\uD83D\uDD27 GLSL',
    saveConfig: '\uD83D\uDCBE Save Config', loadConfig: '\uD83D\uDCC2 Load Config',
    shortcuts: 'Shortcuts', scPause: 'Pause / Resume', scFull: 'Fullscreen',
    scScreen: 'Screenshot', scRecord: 'Record', scHelp: 'Help',
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
    helpStep1Title: '1. View Modes',
    helpStep1: 'Use the BOTH / 2D Flow / 3D Cube tabs to switch between the particle engine and the 3D cube renderer.',
    helpStep2Title: '2. Live Formula Injection',
    helpStep2: 'Type any JavaScript expression into the Formula Code box. Variables: x, y, t, r, cx, cy, PI, sin, cos, tan, atan2, sqrt, abs, noise, audio.',
    helpStep3Title: '3. Layers',
    helpStep3: 'Add multiple formula layers. Each has its own color, palette, opacity, and weight. Click a layer title to focus it.',
    helpStep4Title: '4. Force Fields',
    helpStep4: 'Add attract, repel, vortex, or gravity fields. Drag their markers on the canvas. Enable Pulsate for animated strength.',
    helpStep5Title: '5. Audio',
    helpStep5: 'Click Mic to use your microphone or load an audio file. The engine reacts to bass, mid, and high frequencies.',
    helpStep6Title: '6. Game Modes',
    helpStep6: 'Try Painter, Sculptor, Battle, or Color War modes. Exit with the Exit Game button.',
    helpStep7Title: '7. Export',
    helpStep7: 'Export PNG screenshots, 4K images, SVG paths, GLSL shaders, WebM video, or save/load the full config as JSON.',
  },
  ar: {
    presets: '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0633\u0628\u0642\u0629',
    liveInjection: '\u0627\u0644\u062D\u0642\u0646 \u0627\u0644\u0645\u0628\u0627\u0634\u0631',
    formulaCode: '\u0643\u0648\u062F \u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0629',
    apply: '\u062A\u0637\u0628\u064A\u0642', valid: '\u0635\u0627\u0644\u062D',
    invalid: '\u063A\u064A\u0631 \u0635\u0627\u0644\u062D',
    snippetLibrary: '\u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u0645\u0642\u062A\u0637\u0641\u0627\u062A',
    layers: '\u0627\u0644\u0637\u0628\u0642\u0627\u062A',
    addLayer: '+ \u0625\u0636\u0627\u0641\u0629 \u0637\u0628\u0642\u0629',
    audio: '\u0627\u0644\u0635\u0648\u062A',
    microphone: '\uD83C\uDFA4 \u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646',
    audioFile: '\uD83C\uDFB5 \u0645\u0644\u0641',
    stopAudio: '\u23F9 \u0625\u064A\u0642\u0627\u0641',
    bpm: '\u0627\u0644\u0646\u0628\u0636/\u062F',
    beat: '\u0627\u0644\u0625\u064A\u0642\u0627\u0639',
    audioGain: '\u0643\u0633\u0628 \u0627\u0644\u0635\u0648\u062A',
    forceFields: '\u062D\u0642\u0648\u0644 \u0627\u0644\u0642\u0648\u0629',
    addField: '+ \u0625\u0636\u0627\u0641\u0629',
    pulsate: '\u0646\u0628\u0636',
    pulseSpeed: '\u0633\u0631\u0639\u0629 \u0627\u0644\u0646\u0628\u0636',
    effects: '\u0627\u0644\u0645\u0624\u062B\u0631\u0627\u062A',
    trailFade: '\u062A\u0644\u0627\u0634\u064A \u0627\u0644\u0623\u062B\u0631',
    motionBlur: '\u0636\u0628\u0627\u0628\u064A\u0629 \u0627\u0644\u062D\u0631\u0643\u0629',
    glowBloom: '\u062A\u0648\u0647\u062C / \u0625\u0634\u0639\u0627\u0639',
    connections: '\u0627\u0644\u062A\u0648\u0635\u064A\u0644\u0627\u062A',
    connDist: '\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644',
    symmetry: '\u0627\u0644\u062A\u0646\u0627\u0633\u0642',
    depth3d: '\u0648\u0647\u0645 \u0627\u0644\u0639\u0645\u0642 \u062B\u0644\u0627\u062B\u064A \u0627\u0644\u0623\u0628\u0639\u0627\u062F',
    trailShape: '\u0634\u0643\u0644 \u0627\u0644\u0623\u062B\u0631',
    controls: '\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u062A\u062D\u0643\u0645',
    particleCount: '\u0639\u062F\u062F \u0627\u0644\u062C\u0633\u064A\u0645\u0627\u062A',
    speed: '\u0627\u0644\u0633\u0631\u0639\u0629',
    friction: '\u0627\u0644\u0627\u062D\u062A\u0643\u0627\u0643',
    turbulence: '\u0627\u0644\u0627\u0636\u0637\u0631\u0627\u0628',
    mouseForce: '\u0642\u0648\u0629 \u0627\u0644\u0645\u0627\u0648\u0633',
    interaction: '\u0627\u0644\u062A\u0641\u0627\u0639\u0644',
    mouseMode: '\u0648\u0636\u0639 \u0627\u0644\u0645\u0627\u0648\u0633',
    gameModes: '\u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u0644\u0639\u0628\u0629',
    painter: '\uD83C\uDFA8 \u0631\u0633\u0627\u0645',
    sculptor: '\uD83D\uDDFF \u0646\u062D\u0627\u062A',
    battle: '\u2694 \u0645\u0639\u0631\u0643\u0629',
    colorWar: '\uD83C\uDF08 \u062D\u0631\u0628 \u0623\u0644\u0648\u0627\u0646',
    exitGame: '\u2715 \u0627\u0644\u062E\u0631\u0648\u062C \u0645\u0646 \u0627\u0644\u0644\u0639\u0628\u0629',
    cubeControls: '\u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u0643\u0639\u0628',
    cubePattern: '\u0627\u0644\u0646\u0645\u0637',
    random: '\u0639\u0634\u0648\u0627\u0626\u064A',
    autoSwitch: '\u062A\u0628\u062F\u064A\u0644 \u062A\u0644\u0642\u0627\u0626\u064A',
    autoInterval: '\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u0628\u062F\u064A\u0644 (\u062B)',
    autoSpin: '\u062F\u0648\u0631\u0627\u0646 \u062A\u0644\u0642\u0627\u0626\u064A',
    zenOrbit: '\u0645\u062F\u0627\u0631 \u0632\u0646',
    reflection: '\u0627\u0644\u0627\u0646\u0639\u0643\u0627\u0633',
    floorGrid: '\u0634\u0628\u0643\u0629 \u0627\u0644\u0623\u0631\u0636\u064A\u0629',
    edgeGlow: '\u062A\u0648\u0647\u062C \u0627\u0644\u062D\u0648\u0627\u0641',
    emissive: '\u0627\u0644\u0625\u0634\u0639\u0627\u0639',
    shatter: '\uD83D\uDCA5 \u062A\u062D\u0637\u064A\u0645',
    actions: '\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A',
    export4k: '\uD83D\uDCD0 \u062A\u0635\u062F\u064A\u0631 4K',
    exportSvg: '\uD83D\uDDBC SVG',
    exportGlsl: '\uD83D\uDD27 GLSL',
    saveConfig: '\uD83D\uDCBE \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A',
    loadConfig: '\uD83D\uDCC2 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A',
    shortcuts: '\u0627\u0644\u0627\u062E\u062A\u0635\u0627\u0631\u0627\u062A',
    scPause: '\u0625\u064A\u0642\u0627\u0641 / \u0627\u0633\u062A\u0626\u0646\u0627\u0641',
    scFull: '\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629',
    scScreen: '\u0644\u0642\u0637\u0629 \u0634\u0627\u0634\u0629',
    scRecord: '\u062A\u0633\u062C\u064A\u0644',
    scHelp: '\u0645\u0633\u0627\u0639\u062F\u0629',
    scPanel: '\u0625\u0638\u0647\u0627\u0631/\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0644\u0648\u062D\u0629',
    scLang: '\u0627\u0644\u0644\u063A\u0629',
    scMode: '\u0648\u0636\u0639 \u0627\u0644\u0639\u0631\u0636',
    scNextPat: '\u0627\u0644\u0646\u0645\u0637 \u0627\u0644\u062A\u0627\u0644\u064A',
    helpTitle: 'Xoretex Xhaos Cube \u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u0641\u064A',
    svgExportTitle: '\u062A\u0635\u062F\u064A\u0631 SVG',
    glslExportTitle: '\u062A\u0642\u0631\u064A\u0628 GLSL',
    copy: '\u0646\u0633\u062E', download: '\u062A\u062D\u0645\u064A\u0644',
    dontShowAgain: '\u0639\u062F\u0645 \u0627\u0644\u0625\u0638\u0647\u0627\u0631 \u0639\u0646\u062F \u0627\u0644\u0628\u062F\u0621',
    stopRec: '\u0625\u064A\u0642\u0627\u0641',
    layerColor: '\u0627\u0644\u0644\u0648\u0646',
    layerPalette: '\u0627\u0644\u0644\u0648\u062D\u0629',
    layerOpacity: '\u0627\u0644\u0634\u0641\u0627\u0641\u064A\u0629',
    layerWeight: '\u0627\u0644\u0648\u0632\u0646',
    layerEquation: '\u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0629',
    removeLayer: '\u0625\u0632\u0627\u0644\u0629',
    removeField: '\u0625\u0632\u0627\u0644\u0629',
    noAudio: '\u0644\u0627 \u0645\u0635\u062F\u0631 \u0635\u0648\u062A\u064A',
    toastCopied: '\u062A\u0645 \u0627\u0644\u0646\u0633\u062E!',
    toastSaved: '\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A!',
    toastLoaded: '\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A!',
    toastRecStart: '\u0628\u062F\u0623 \u0627\u0644\u062A\u0633\u062C\u064A\u0644',
    toastRecStop: '\u062A\u0648\u0642\u0641 \u0627\u0644\u062A\u0633\u062C\u064A\u0644',
    toastScreenshot: '\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0635\u0648\u0631\u0629',
    toast4K: '\u062A\u0645 \u062D\u0641\u0638 \u0635\u0648\u0631\u0629 4K',
    toastShatter: '\u062A\u062D\u0637\u064A\u0645!',
    paused: '\u0645\u062A\u0648\u0642\u0641',
    resumed: '\u0627\u0633\u062A\u064F\u0624\u0646\u0641',
    helpStep1Title: '\u0661. \u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u0639\u0631\u0636',
    helpStep1: '\u0627\u0633\u062A\u062E\u062F\u0645 \u0623\u0632\u0631\u0627\u0631 BOTH / 2D Flow / 3D Cube \u0644\u0644\u062A\u0628\u062F\u064A\u0644 \u0628\u064A\u0646 \u0645\u062D\u0631\u0643 \u0627\u0644\u062C\u0633\u064A\u0645\u0627\u062A \u0648\u0645\u062D\u0631\u0643 \u0627\u0644\u0645\u0643\u0639\u0628.',
    helpStep2Title: '\u0662. \u0627\u0644\u062D\u0642\u0646 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0644\u0644\u0645\u0639\u0627\u062F\u0644\u0629',
    helpStep2: '\u0627\u0643\u062A\u0628 \u0623\u064A \u062A\u0639\u0628\u064A\u0631 JavaScript \u0641\u064A \u062E\u0627\u0646\u0629 \u0643\u0648\u062F \u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0629. \u0627\u0644\u0645\u062A\u063A\u064A\u0631\u0627\u062A: x, y, t, r, cx, cy, PI, sin, cos, tan, atan2, sqrt, abs, noise, audio.',
    helpStep3Title: '\u0663. \u0627\u0644\u0637\u0628\u0642\u0627\u062A',
    helpStep3: '\u0623\u0636\u0641 \u0637\u0628\u0642\u0627\u062A \u0645\u0639\u0627\u062F\u0644\u0629 \u0645\u062A\u0639\u062F\u062F\u0629. \u0644\u0643\u0644 \u0637\u0628\u0642\u0629 \u0644\u0648\u0646\u0647\u0627 \u0648\u0644\u0648\u062D\u062A\u0647\u0627 \u0648\u0634\u0641\u0627\u0641\u064A\u062A\u0647\u0627.',
    helpStep4Title: '\u0664. \u062D\u0642\u0648\u0644 \u0627\u0644\u0642\u0648\u0629',
    helpStep4: '\u0623\u0636\u0641 \u062D\u0642\u0648\u0644 \u062C\u0630\u0628 \u0623\u0648 \u0637\u0631\u062F \u0623\u0648 \u062F\u0648\u0627\u0645\u0629 \u0623\u0648 \u062C\u0627\u0630\u0628\u064A\u0629. \u0627\u0633\u062D\u0628 \u0639\u0644\u0627\u0645\u0627\u062A\u0647\u0627 \u0639\u0644\u0649 \u0627\u0644\u0644\u0648\u062D\u0629.',
    helpStep5Title: '\u0665. \u0627\u0644\u0635\u0648\u062A',
    helpStep5: '\u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646 \u0623\u0648 \u062D\u0645\u0651\u0644 \u0645\u0644\u0641 \u0635\u0648\u062A\u064A. \u064A\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0645\u062D\u0631\u0643 \u0645\u0639 \u0627\u0644\u062A\u0631\u062F\u062F\u0627\u062A.',
    helpStep6Title: '\u0666. \u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u0644\u0639\u0628\u0629',
    helpStep6: '\u062C\u0631\u0651\u0628 \u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u0631\u0633\u0627\u0645 \u0648\u0627\u0644\u0646\u062D\u0627\u062A \u0648\u0627\u0644\u0645\u0639\u0631\u0643\u0629 \u0648\u062D\u0631\u0628 \u0627\u0644\u0623\u0644\u0648\u0627\u0646.',
    helpStep7Title: '\u0667. \u0627\u0644\u062A\u0635\u062F\u064A\u0631',
    helpStep7: '\u0635\u062F\u0651\u0631 \u0635\u0648\u0631 PNG \u0623\u0648 4K \u0623\u0648 SVG \u0623\u0648 GLSL \u0623\u0648 \u0641\u064A\u062F\u064A\u0648 WebM \u0623\u0648 \u0627\u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A.',
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
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      // preserve child input elements (for label wrapping file inputs)
      var childInput = el.querySelector('input[type="file"]');
      if (childInput) {
        el.childNodes.forEach(function(n) { if (n.nodeType === 3) n.textContent = ''; });
        el.insertBefore(document.createTextNode(val), childInput);
      } else {
        el.textContent = val;
      }
    }
  });
  var langBtn = document.getElementById('btnLang');
  if (langBtn) langBtn.textContent = currentLang === 'en' ? '\u0639\u0631' : 'EN';
  buildHelpModal();
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  localStorage.setItem('xoretex_lang', currentLang);
  applyLocalization();
}

// ============================================================
// NOISE UTILITY
// ============================================================
var _noiseTable = new Float32Array(512);
(function initNoise() {
  for (var i = 0; i < 256; i++) _noiseTable[i] = _noiseTable[i + 256] = Math.random();
})();

function noise2D(x, y) {
  var xi = Math.floor(x) & 255;
  var yi = Math.floor(y) & 255;
  var xf = x - Math.floor(x);
  var yf = y - Math.floor(y);
  var u = xf * xf * (3 - 2 * xf);
  var v = yf * yf * (3 - 2 * yf);
  var a = _noiseTable[xi] + yi;
  var b = _noiseTable[xi + 1] + yi;
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
var PALETTES = {
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
  var pal = PALETTES[paletteName] || PALETTES.mono;
  return pal[Math.floor((index / Math.max(total, 1)) * pal.length) % pal.length];
}

function hexToRgb(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return { r: r, g: g, b: b };
}

// ============================================================
// FORMULA SNIPPETS
// ============================================================
var SNIPPETS = [
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
var PRESETS = [
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
// MAIN ENGINE STATE — EXPOSED GLOBALLY
// ============================================================
var ENG = {
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

// >>> CRITICAL FIX: expose ENG globally so cube3d.js can read audio data
window.ENG = ENG;

// Canvas references
var bgCan, flowCan, glowCan, connCan;
var bgCtx, flowCtx, glowCtx, connCtx;
var W = 0, H = 0;

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
  [bgCan, flowCan, glowCan, connCan].forEach(function(c) {
    if (c) { c.width = W; c.height = H; }
  });
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
  var grd = bgCtx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.6);
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

function evalLayer(layer, x, y, t2) {
  if (!layer.fn || !layer.enabled) return 0;
  try {
    var r = Math.sqrt((x - W/2) * (x - W/2) + (y - H/2) * (y - H/2));
    var val = layer.fn(
      x, y, t2, r, W/2, H/2,
      Math.PI, Math.sin, Math.cos, Math.tan, Math.atan2, Math.sqrt, Math.abs,
      noise2D, ENG.audioData.bass
    );
    return isFinite(val) ? val : 0;
  } catch (e) {
    return 0;
  }
}

function compileAllLayers() {
  ENG.layers.forEach(function(l) { compileLayerFn(l); });
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================
function createParticle(layerIndex) {
  var px = Math.random() * W;
  var py = Math.random() * H;
  var life = 60 + Math.random() * 200;
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
  var n = ENG.config.particleCount;
  var nl = ENG.layers.length || 1;
  for (var i = 0; i < n; i++) {
    ENG.particles.push(createParticle(i % nl));
  }
  compileAllLayers();
}

function resetParticle(p) {
  p.x = Math.random() * W;
  p.y = Math.random() * H;
  p.px = p.x; p.py = p.y;
  p.vx = (Math.random() - 0.5) * 0.5;
  p.vy = (Math.random() - 0.5) * 0.5;
  var life = 60 + Math.random() * 200;
  p.life = life; p.maxLife = life;
  p.palIndex = Math.random();
  p.depth = 0.3 + Math.random() * 0.7;
}

// ============================================================
// PHYSICS UPDATE
// ============================================================
function updateParticles(dt) {
  var cfg = ENG.config;
  var speed = cfg.speed * (1 + ENG.audioData.bass * 2);
  var friction = cfg.friction;
  var turb = cfg.turbulence;
  var t2 = ENG.time;
  var mf = cfg.mouseForce;
  var mx = ENG.mouse.x, my = ENG.mouse.y, mDown = ENG.mouse.down;
  var mouseMode = ENG.mouse.mode;
  var nl = ENG.layers.length;
  var dt60 = dt * 60;

  for (var i = 0, n = ENG.particles.length; i < n; i++) {
    var p = ENG.particles[i];
    p.life -= dt60 * 0.5;
    if (p.life <= 0) { resetParticle(p); continue; }

    var layer = ENG.layers[p.layerIndex % nl];
    if (!layer || !layer.enabled) { p.px = p.x; p.py = p.y; continue; }

    var angle = evalLayer(layer, p.x, p.y, t2) * layer.weight;
    var fa = 0.04 * speed / p.mass;
    p.vx += Math.cos(angle) * fa;
    p.vy += Math.sin(angle) * fa;

    if (turb > 0) {
      p.vx += (Math.random() - 0.5) * turb * 0.1;
      p.vy += (Math.random() - 0.5) * turb * 0.1;
    }

    for (var fi = 0; fi < ENG.forceFields.length; fi++) {
      var ff = ENG.forceFields[fi];
      var dx = ff.x - p.x, dy = ff.y - p.y;
      var d2 = dx * dx + dy * dy;
      var str = ff.strength;
      if (cfg.ffPulse) {
        str *= (0.5 + 0.5 * Math.sin(t2 * cfg.pulseSpeed * 2 + fi));
      }
      if (d2 < ff.radius * ff.radius && d2 > 1) {
        var d = Math.sqrt(d2);
        var f = str / (d * p.mass) * 0.5;
        switch (ff.type) {
          case 'attract': p.vx += dx / d * f; p.vy += dy / d * f; break;
          case 'repel':   p.vx -= dx / d * f; p.vy -= dy / d * f; break;
          case 'vortex':  p.vx -= dy / d * f; p.vy += dx / d * f; break;
          case 'gravity': p.vx += dx / d * f * 0.5; p.vy += dy / d * f * 0.5 + 0.02; break;
        }
      }
    }

    if (mx > -9000) {
      var dx2 = mx - p.x, dy2 = my - p.y;
      var d2m = dx2 * dx2 + dy2 * dy2;
      if (d2m < mf * mf && d2m > 1) {
        var dm = Math.sqrt(d2m);
        var fm = (mDown ? 2 : 0.5) * mf / (dm * p.mass * 100);
        switch (mouseMode) {
          case 'push':    p.vx -= dx2 / dm * fm; p.vy -= dy2 / dm * fm; break;
          case 'attract': p.vx += dx2 / dm * fm; p.vy += dy2 / dm * fm; break;
          case 'swirl':   p.vx -= dy2 / dm * fm; p.vy += dx2 / dm * fm; break;
          case 'paint':   break;
        }
      }
    }

    if (ENG.gameMode === 'sculptor') {
      for (var oi = 0; oi < ENG.obstacles.length; oi++) {
        var ob = ENG.obstacles[oi];
        var odx = p.x - ob.x, ody = p.y - ob.y;
        var od2 = odx * odx + ody * ody;
        if (od2 < ob.r * ob.r && od2 > 0) {
          var od = Math.sqrt(od2);
          p.vx += odx / od * 2; p.vy += ody / od * 2;
        }
      }
    }

    p.vx *= Math.pow(friction, dt60);
    p.vy *= Math.pow(friction, dt60);

    var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    var maxSpd = 4 * speed;
    if (spd > maxSpd) { p.vx = p.vx / spd * maxSpd; p.vy = p.vy / spd * maxSpd; }

    p.px = p.x; p.py = p.y;
    p.x += p.vx * dt60;
    p.y += p.vy * dt60;

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
  var cfg = ENG.config;
  var fade = cfg.trailFade;

  flowCtx.globalAlpha = fade;
  flowCtx.globalCompositeOperation = 'destination-out';
  flowCtx.fillRect(0, 0, W, H);
  flowCtx.globalCompositeOperation = 'source-over';
  flowCtx.globalAlpha = 1;

  if (ENG.gameMode === 'colorwar' && ENG.colorWarCtx) {
    renderColorWar();
  }

  var nl = ENG.layers.length;
  var focL = ENG.focusedLayer;

  for (var i = 0, n = ENG.particles.length; i < n; i++) {
    var p = ENG.particles[i];
    var li = p.layerIndex % nl;
    var layer = ENG.layers[li];
    if (!layer || !layer.enabled) continue;

    var lifeRatio = p.life / p.maxLife;
    var alpha = lifeRatio * p.brightness * layer.opacity;

    if (focL >= 0 && li !== focL) alpha *= 0.08;
    if (alpha < 0.005) continue;

    var palColor = getPaletteColor(layer.palette, Math.floor(p.palIndex * 100), 100);
    var rgb = hexToRgb(palColor);
    var glowBoost = 1 + ENG.audioData.bass * 0.5;
    var dScale = cfg.depth3D ? (0.5 + p.depth * 0.5) : 1;
    var sz = p.size * dScale * glowBoost;

    flowCtx.globalAlpha = alpha;

    switch (cfg.trailShape) {
      case 'dot':
        flowCtx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
        flowCtx.beginPath();
        flowCtx.arc(p.x, p.y, sz * 0.8, 0, Math.PI * 2);
        flowCtx.fill();
        break;
      case 'triangle':
        flowCtx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
        flowCtx.beginPath();
        flowCtx.moveTo(p.x, p.y - sz);
        flowCtx.lineTo(p.x - sz * 0.8, p.y + sz * 0.5);
        flowCtx.lineTo(p.x + sz * 0.8, p.y + sz * 0.5);
        flowCtx.closePath();
        flowCtx.fill();
        break;
      case 'glow-dot':
        var grd = flowCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 3);
        grd.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',1)');
        grd.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        flowCtx.fillStyle = grd;
        flowCtx.beginPath();
        flowCtx.arc(p.x, p.y, sz * 3, 0, Math.PI * 2);
        flowCtx.fill();
        break;
      case 'line':
      default:
        var tdx = p.x - p.px, tdy = p.y - p.py;
        var tlen = Math.sqrt(tdx * tdx + tdy * tdy);
        if (tlen < 0.1) break;
        flowCtx.strokeStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
        flowCtx.lineWidth = sz * 0.8;
        flowCtx.beginPath();
        flowCtx.moveTo(p.px, p.py);
        flowCtx.lineTo(p.x, p.y);
        flowCtx.stroke();
        break;
    }

    // symmetry
    var sym = cfg.symmetry;
    if (sym >= 2) {
      var cx2 = W / 2, cy2 = H / 2;
      var rdx = p.x - cx2, rdy = p.y - cy2;
      var step = (Math.PI * 2) / sym;
      for (var s = 1; s < sym; s++) {
        var ang = step * s;
        var cosA = Math.cos(ang), sinA = Math.sin(ang);
        var nx = cx2 + rdx * cosA - rdy * sinA;
        var ny = cy2 + rdx * sinA + rdy * cosA;
        flowCtx.beginPath();
        if (cfg.trailShape === 'dot' || cfg.trailShape === 'glow-dot') {
          flowCtx.arc(nx, ny, sz * 0.8, 0, Math.PI * 2);
          flowCtx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
          flowCtx.fill();
        } else {
          var pdx2 = p.px - cx2, pdy2 = p.py - cy2;
          var npx = cx2 + pdx2 * cosA - pdy2 * sinA;
          var npy = cy2 + pdx2 * sinA + pdy2 * cosA;
          flowCtx.strokeStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
          flowCtx.lineWidth = sz * 0.8;
          flowCtx.moveTo(npx, npy);
          flowCtx.lineTo(nx, ny);
          flowCtx.stroke();
        }
      }
    }

    // painter mode
    if (ENG.gameMode === 'painter' && ENG.paintCtx) {
      ENG.paintCtx.globalAlpha = alpha * 0.3;
      ENG.paintCtx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
      ENG.paintCtx.beginPath();
      ENG.paintCtx.arc(p.x, p.y, sz * 1.5, 0, Math.PI * 2);
      ENG.paintCtx.fill();
    }
  }

  flowCtx.globalAlpha = 1;

  if (cfg.connections) renderConnections();
  if (cfg.glow) renderGlow();
}

function renderConnections() {
  if (!connCtx) return;
  var cd = ENG.config.connDist;
  var cd2 = cd * cd;
  connCtx.clearRect(0, 0, W, H);
  var particles = ENG.particles;
  var nl = ENG.layers.length;
  var stride = Math.max(1, Math.floor(particles.length / 500));

  for (var i = 0; i < particles.length; i += stride) {
    var pi = particles[i];
    var layerI = ENG.layers[pi.layerIndex % nl];
    if (!layerI || !layerI.enabled) continue;
    var rgb = hexToRgb(getPaletteColor(layerI.palette, Math.floor(pi.palIndex * 100), 100));

    for (var j = i + stride; j < Math.min(i + 20 * stride, particles.length); j += stride) {
      var pj = particles[j];
      var ddx = pi.x - pj.x, ddy = pi.y - pj.y;
      var dd2 = ddx * ddx + ddy * ddy;
      if (dd2 < cd2) {
        var alp = (1 - dd2 / cd2) * 0.3;
        connCtx.globalAlpha = alp;
        connCtx.strokeStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
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
  glowCtx.globalAlpha = 0.18 + ENG.audioData.bass * 0.1;
  glowCtx.filter = 'blur(8px)';
  glowCtx.drawImage(flowCan, 0, 0);
  glowCtx.filter = 'none';
  glowCtx.globalAlpha = 1;
}

// ============================================================
// MAIN ANIMATION LOOP
// ============================================================
function loop() {
  if (!ENG.running) {
    ENG.animID = requestAnimationFrame(loop);
    return;
  }

  var now = performance.now();
  var dt = Math.min((now - ENG.lastTime) / 1000, 0.05);
  ENG.lastTime = now;
  ENG.time += dt;
  ENG.frameCount++;

  if (ENG.frameCount % 30 === 0) {
    ENG.fps = Math.round(1 / dt);
    var fpsDom = document.getElementById('fpsDisplay');
    if (fpsDom) fpsDom.textContent = 'FPS: ' + ENG.fps;
  }

  updateAudio();

  // Only update 2D if in both or 2d mode
  if (ENG.viewMode !== '3d') {
    updateParticles(dt);
    updateGameMode(dt);
    render2D();
    if (ENG.gameMode === 'painter' && ENG.paintCanvas && flowCtx) {
      flowCtx.globalAlpha = 1;
      flowCtx.drawImage(ENG.paintCanvas, 0, 0);
    }
  }

  ENG.animID = requestAnimationFrame(loop);
}

// ============================================================
// AUDIO SYSTEM
// ============================================================
var audioCtx = null, analyser = null, audioSource = null;
var audioElement = null, micStream = null;
var beatHistory = [], lastBeat = 0, bpmSamples = [];

function initAudioBars() {
  var wrap = document.getElementById('audioBarWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (var i = 0; i < 32; i++) {
    var bar = document.createElement('div');
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
  }
}

function startMic() {
  try {
    ensureAudioCtx();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      micStream = stream;
      if (audioSource) audioSource.disconnect();
      audioSource = audioCtx.createMediaStreamSource(stream);
      audioSource.connect(analyser);
      showToast(t('microphone'));
    }).catch(function(err) {
      showToast('Mic denied: ' + err.message);
    });
  } catch (e) {
    reportError('startMic failed', e);
  }
}

function stopAudio() {
  if (micStream) { micStream.getTracks().forEach(function(tr) { tr.stop(); }); micStream = null; }
  if (audioSource) { try { audioSource.disconnect(); } catch(e){} audioSource = null; }
  if (audioElement) { audioElement.pause(); audioElement = null; }
  ENG.audioData = { bass:0, mid:0, high:0, spectrum:[], bpm:0, beat:false, gain:ENG.audioData.gain };
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
  var buf = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buf);
  var gain = ENG.audioData.gain;
  var n2 = buf.length;
  var spec = [];
  for (var i = 0; i < Math.min(n2, 32); i++) {
    spec.push(Math.min(1, (buf[i] / 255) * gain));
  }
  ENG.audioData.spectrum = spec;

  var bass = 0, mid = 0, high = 0;
  for (var b = 0; b < 4 && b < spec.length; b++) bass += spec[b];
  bass /= 4;
  for (var m = 4; m < 12 && m < spec.length; m++) mid += spec[m];
  mid /= 8;
  for (var h = 12; h < 24 && h < spec.length; h++) high += spec[h];
  high /= 12;

  ENG.audioData.bass = bass;
  ENG.audioData.mid  = mid;
  ENG.audioData.high = high;

  beatHistory.push(bass);
  if (beatHistory.length > 43) beatHistory.shift();
  var avg = 0;
  for (var a = 0; a < beatHistory.length; a++) avg += beatHistory[a];
  avg /= beatHistory.length;
  var now2 = ENG.time;
  if (bass > avg * 1.5 && bass > 0.3 && now2 - lastBeat > 0.25) {
    ENG.audioData.beat = true;
    var interval = now2 - lastBeat;
    if (interval < 2) {
      bpmSamples.push(60 / interval);
      if (bpmSamples.length > 8) bpmSamples.shift();
      var bpmSum = 0;
      for (var bs = 0; bs < bpmSamples.length; bs++) bpmSum += bpmSamples[bs];
      ENG.audioData.bpm = Math.round(bpmSum / bpmSamples.length);
    }
    lastBeat = now2;
  } else {
    ENG.audioData.beat = false;
  }

  for (var bi = 0; bi < 32; bi++) {
    var barEl = document.getElementById('aBar_' + bi);
    if (barEl) barEl.style.height = Math.max(1, (spec[bi] || 0) * 36) + 'px';
  }

  var vBass = document.getElementById('valBass');
  var vMid  = document.getElementById('valMid');
  var vHigh = document.getElementById('valHigh');
  var vBPM  = document.getElementById('valBPM');
  var vBeat = document.getElementById('valBeat');
  if (vBass) vBass.textContent = bass.toFixed(2);
  if (vMid)  vMid.textContent  = mid.toFixed(2);
  if (vHigh) vHigh.textContent = high.toFixed(2);
  if (vBPM)  vBPM.textContent  = ENG.audioData.bpm || '--';
  if (vBeat) vBeat.textContent  = ENG.audioData.beat ? '\u25CF' : '\u2014';
}

// ============================================================
// FORCE FIELDS
// ============================================================
var FF_COLORS = {
  attract: '#00ffc8', repel: '#ff4060',
  vortex: '#ff00ff', gravity: '#ffb800'
};

function addForceField(type, x, y) {
  var ff = {
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
  var layer = document.getElementById('forceFieldLayer');
  if (!layer) return;
  if (ff.markerEl) ff.markerEl.remove();

  var el = document.createElement('div');
  el.style.cssText =
    'position:absolute;width:28px;height:28px;border-radius:50%;' +
    'border:2px solid ' + ff.color + ';background:' + ff.color + '22;' +
    'box-shadow:0 0 12px ' + ff.color + ';cursor:move;' +
    'transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;' +
    'font-size:12px;user-select:none;pointer-events:auto;' +
    'left:' + ff.x + 'px;top:' + ff.y + 'px;z-index:6;';
  var icons = { attract:'\u2295', repel:'\u2296', vortex:'\u229B', gravity:'\u2295' };
  el.textContent = icons[ff.type] || '\u25CF';
  el.title = ff.type;

  var dragging = false, ox = 0, oy = 0;
  el.addEventListener('mousedown', function(e) {
    dragging = true; ox = e.clientX - ff.x; oy = e.clientY - ff.y;
    e.stopPropagation();
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    ff.x = e.clientX - ox; ff.y = e.clientY - oy;
    el.style.left = ff.x + 'px'; el.style.top = ff.y + 'px';
  });
  window.addEventListener('mouseup', function() { dragging = false; });

  el.addEventListener('touchstart', function(e) {
    dragging = true;
    var t3 = e.touches[0];
    ox = t3.clientX - ff.x; oy = t3.clientY - ff.y;
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchmove', function(e) {
    if (!dragging) return;
    var t3 = e.touches[0];
    ff.x = t3.clientX - ox; ff.y = t3.clientY - oy;
    el.style.left = ff.x + 'px'; el.style.top = ff.y + 'px';
  });
  el.addEventListener('touchend', function() { dragging = false; });

  layer.appendChild(el);
  ff.markerEl = el;
}

function removeForceField(id) {
  var idx = -1;
  for (var i = 0; i < ENG.forceFields.length; i++) {
    if (ENG.forceFields[i].id === id) { idx = i; break; }
  }
  if (idx < 0) return;
  var ff = ENG.forceFields[idx];
  if (ff.markerEl) ff.markerEl.remove();
  ENG.forceFields.splice(idx, 1);
  buildFFList();
}

function buildFFList() {
  var list = document.getElementById('ffList');
  if (!list) return;
  list.innerHTML = '';
  ENG.forceFields.forEach(function(ff) {
    var row = document.createElement('div');
    row.className = 'ffItem';
    var dot = document.createElement('div');
    dot.className = 'ffDot';
    dot.style.background = ff.color;
    dot.style.boxShadow = '0 0 6px ' + ff.color;
    var label = document.createElement('span');
    label.textContent = ff.type;
    label.style.flex = '1';

    var strSlider = document.createElement('input');
    strSlider.type = 'range'; strSlider.min = '10'; strSlider.max = '200';
    strSlider.value = ff.strength; strSlider.style.width = '60px';
    strSlider.addEventListener('input', function() { ff.strength = parseFloat(strSlider.value); });

    var radSlider = document.createElement('input');
    radSlider.type = 'range'; radSlider.min = '40'; radSlider.max = '600';
    radSlider.value = ff.radius; radSlider.style.width = '60px';
    radSlider.addEventListener('input', function() { ff.radius = parseFloat(radSlider.value); });

    var rm = document.createElement('button');
    rm.className = 'pBtn danger'; rm.textContent = '\u2715';
    rm.style.padding = '2px 6px';
    (function(ffId) {
      rm.addEventListener('click', function() { removeForceField(ffId); });
    })(ff.id);

    row.appendChild(dot); row.appendChild(label);
    row.appendChild(strSlider); row.appendChild(radSlider);
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
  var hud = document.getElementById('gameHUD');
  var hudTitle = document.getElementById('gameHUDTitle');
  var exitBtn = document.getElementById('btnExitGame');
  if (hud) hud.style.display = 'block';
  if (exitBtn) exitBtn.style.display = 'inline-flex';

  switch (mode) {
    case 'painter':
      ENG.paintCanvas = document.createElement('canvas');
      ENG.paintCanvas.width = W; ENG.paintCanvas.height = H;
      ENG.paintCtx = ENG.paintCanvas.getContext('2d');
      if (hudTitle) hudTitle.textContent = t('painter');
      ENG.mouse.mode = 'paint';
      break;
    case 'sculptor':
      ENG.obstacles = [];
      if (hudTitle) hudTitle.textContent = t('sculptor');
      renderObstacleLayer();
      break;
    case 'battle':
      if (ENG.layers.length < 2) {
        var l = createLayer('noise(x*0.01+t,y*0.01)*6-3', '#ff00ff', 'neon', 0.8, 0.8);
        compileLayerFn(l);
        ENG.layers.push(l);
        buildLayerCards();
      }
      if (hudTitle) hudTitle.textContent = t('battle');
      break;
    case 'colorwar':
      ENG.colorWarCanvas = document.createElement('canvas');
      ENG.colorWarCanvas.width = W; ENG.colorWarCanvas.height = H;
      ENG.colorWarCtx = ENG.colorWarCanvas.getContext('2d');
      initColorWar();
      if (hudTitle) hudTitle.textContent = t('colorWar');
      break;
  }
}

function exitGameMode() {
  ENG.gameMode = null;
  ENG.paintCanvas = null; ENG.paintCtx = null;
  ENG.colorWarCanvas = null; ENG.colorWarCtx = null;
  ENG.warOwnership = null;
  ENG.obstacles = [];
  var hud = document.getElementById('gameHUD');
  var exitBtn = document.getElementById('btnExitGame');
  if (hud) hud.style.display = 'none';
  if (exitBtn) exitBtn.style.display = 'none';
  var obsLayer = document.getElementById('obstacleLayer');
  if (obsLayer) obsLayer.innerHTML = '';
  var selMM = document.getElementById('selMouseMode');
  ENG.mouse.mode = selMM ? selMM.value : 'push';
}

function updateGameMode(dt) {
  if (!ENG.gameMode) return;
  var hudInfo = document.getElementById('gameHUDInfo');
  var hudBar  = document.getElementById('gameHUDBarFill');

  switch (ENG.gameMode) {
    case 'battle':
      if (ENG.layers.length < 2) break;
      var c0 = 0, c1 = 0;
      var nl = ENG.layers.length;
      for (var i = 0; i < ENG.particles.length; i++) {
        if (ENG.particles[i].layerIndex % nl === 0) c0++; else c1++;
      }
      var total = c0 + c1 || 1;
      var pct0 = Math.round(c0 / total * 100);
      if (hudInfo) hudInfo.textContent = 'Layer 1: ' + pct0 + '%  vs  Layer 2: ' + (100 - pct0) + '%';
      if (hudBar) hudBar.style.width = pct0 + '%';
      break;
    case 'colorwar':
      updateColorWar();
      break;
    case 'sculptor':
      if (hudInfo) hudInfo.textContent = 'Obstacles: ' + ENG.obstacles.length + ' \u2014 Click canvas to place';
      break;
    case 'painter':
      if (hudInfo) hudInfo.textContent = 'Painting... move mouse to create trails';
      break;
  }
}

function initColorWar() {
  if (!ENG.colorWarCtx) return;
  ENG.colorWarCtx.clearRect(0, 0, W, H);
}

function updateColorWar() {
  if (!ENG.colorWarCtx) return;
  var nl = ENG.layers.length;
  if (nl < 1) return;
  for (var i = 0; i < ENG.particles.length; i += 4) {
    var p = ENG.particles[i];
    var li = p.layerIndex % nl;
    var layer = ENG.layers[li];
    if (!layer || !layer.enabled) continue;
    var rgb = hexToRgb(getPaletteColor(layer.palette, Math.floor(p.palIndex * 100), 100));
    var r2 = 20 + ENG.audioData.bass * 10;
    var grd = ENG.colorWarCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r2);
    grd.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.04)');
    grd.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
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
  var layer = document.getElementById('obstacleLayer');
  if (!layer) return;
  layer.innerHTML = '';
  ENG.obstacles.forEach(function(ob) {
    var el = document.createElement('div');
    el.style.cssText =
      'position:absolute;left:' + (ob.x - ob.r) + 'px;top:' + (ob.y - ob.r) + 'px;' +
      'width:' + (ob.r * 2) + 'px;height:' + (ob.r * 2) + 'px;' +
      'border-radius:50%;background:rgba(255,180,0,0.18);' +
      'border:1px solid rgba(255,180,0,0.5);pointer-events:none;';
    layer.appendChild(el);
  });
}

function placeSculptorObstacle(x, y) {
  ENG.obstacles.push({ x: x, y: y, r: 24 + Math.random() * 20 });
  renderObstacleLayer();
}

// ============================================================
// EXPORT TOOLS
// ============================================================
function exportScreenshot() {
  try {
    var offscreen = document.createElement('canvas');
    offscreen.width = W; offscreen.height = H;
    var ctx2 = offscreen.getContext('2d');
    ctx2.drawImage(bgCan, 0, 0);
    ctx2.drawImage(flowCan, 0, 0);
    if (ENG.config.glow) ctx2.drawImage(glowCan, 0, 0);
    if (ENG.config.connections) ctx2.drawImage(connCan, 0, 0);
    // Include cube canvas if visible
    var cubeCan2 = document.getElementById('cubeCan');
    if (cubeCan2 && ENG.viewMode !== '2d') {
      try { ctx2.drawImage(cubeCan2, 0, 0); } catch(e) {}
    }
    var link = document.createElement('a');
    link.download = 'xoretex_' + Date.now() + '.png';
    link.href = offscreen.toDataURL('image/png');
    link.click();
    showToast(t('toastScreenshot'));
  } catch (e) { reportError('screenshot failed', e); }
}

function export4K() {
  try {
    var W4 = 3840, H4 = 2160;
    var offscreen = document.createElement('canvas');
    offscreen.width = W4; offscreen.height = H4;
    var ctx2 = offscreen.getContext('2d');
    ctx2.fillStyle = '#0a0a0f';
    ctx2.fillRect(0, 0, W4, H4);
    ctx2.drawImage(bgCan, 0, 0, W4, H4);
    ctx2.drawImage(flowCan, 0, 0, W4, H4);
    if (ENG.config.glow) ctx2.drawImage(glowCan, 0, 0, W4, H4);
    var link = document.createElement('a');
    link.download = 'xoretex_4k_' + Date.now() + '.png';
    link.href = offscreen.toDataURL('image/png');
    link.click();
    showToast(t('toast4K'));
  } catch (e) { reportError('4K export failed', e); }
}

function exportSVG() {
  try {
    var sample = ENG.particles.slice(0, 600);
    var nl = ENG.layers.length;
    var svgLines = [];
    sample.forEach(function(p) {
      var li = p.layerIndex % nl;
      var layer = ENG.layers[li];
      if (!layer) return;
      var color = getPaletteColor(layer.palette, Math.floor(p.palIndex * 100), 100);
      var dx = p.x - p.px, dy = p.y - p.py;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        svgLines.push('<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="1" fill="' + color + '" opacity="' + (p.brightness * layer.opacity).toFixed(2) + '"/>');
      } else {
        svgLines.push('<line x1="' + p.px.toFixed(1) + '" y1="' + p.py.toFixed(1) + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) + '" stroke="' + color + '" stroke-width="1" opacity="' + (p.brightness * layer.opacity).toFixed(2) + '"/>');
      }
    });
    var svg = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" style="background:#0a0a0f">\n' + svgLines.join('\n') + '\n</svg>';
    document.getElementById('svgOutput').textContent = svg;
    showModal('svgModal');
    window._svgCache = svg;
  } catch (e) { reportError('SVG export failed', e); }
}

function exportGLSL() {
  try {
    var layer = ENG.layers[0];
    var eq = layer ? layer.eq : 'sin(x*0.02+t)*cos(y*0.02+t)*2';
    var glsl = '// Xoretex Xhaos Cube \u2014 GLSL Approximation\n' +
      '// Auto-generated from formula: ' + eq + '\n\n' +
      'precision mediump float;\nuniform float iTime;\nuniform vec2 iResolution;\n\n' +
      '#define PI 3.14159265359\n\n' +
      'float noise(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n}\n\n' +
      'void main() {\n  vec2 uv = gl_FragCoord.xy;\n  float x = uv.x;\n  float y = uv.y;\n' +
      '  float t = iTime;\n  float cx = iResolution.x * 0.5;\n  float cy = iResolution.y * 0.5;\n' +
      '  float r = length(uv - vec2(cx, cy));\n\n' +
      '  // Original: ' + eq + '\n' +
      '  float angle = sin(x * 0.02 + t) * cos(y * 0.02 + t) * 2.0;\n\n' +
      '  vec2 dir = vec2(cos(angle), sin(angle));\n' +
      '  float intensity = 0.5 + 0.5 * sin(dot(uv * 0.01, dir) * 6.0 + t);\n\n' +
      '  vec3 col = vec3(0.0, intensity, intensity * 0.7);\n' +
      '  gl_FragColor = vec4(col, 1.0);\n}';
    document.getElementById('glslOutput').textContent = glsl;
    showModal('glslModal');
    window._glslCache = glsl;
  } catch (e) { reportError('GLSL export failed', e); }
}

function saveConfig() {
  try {
    var cfg = {
      version: '1.0',
      language: currentLang,
      viewMode: ENG.viewMode,
      config: ENG.config,
      layers: ENG.layers.map(function(l) {
        return {
          eq: l.eq, color: l.color, palette: l.palette,
          opacity: l.opacity, weight: l.weight, enabled: l.enabled,
        };
      }),
      forceFields: ENG.forceFields.map(function(f) {
        return {
          type: f.type, x: f.x, y: f.y,
          strength: f.strength, radius: f.radius,
        };
      }),
    };
    var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    var link = document.createElement('a');
    link.download = 'xoretex_config_' + Date.now() + '.json';
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast(t('toastSaved'));
  } catch (e) { reportError('saveConfig failed', e); }
}

function loadConfig(file) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var cfg = JSON.parse(ev.target.result);
      if (cfg.language) { currentLang = cfg.language; localStorage.setItem('xoretex_lang', currentLang); }
      if (cfg.config) Object.assign(ENG.config, cfg.config);
      if (cfg.layers) {
        ENG.layers = cfg.layers.map(function(l) {
          var layer = createLayer(l.eq, l.color, l.palette, l.opacity, l.weight);
          layer.enabled = l.enabled !== undefined ? l.enabled : true;
          compileLayerFn(layer);
          return layer;
        });
      }
      if (cfg.forceFields) {
        ENG.forceFields.forEach(function(f) { if (f.markerEl) f.markerEl.remove(); });
        ENG.forceFields = [];
        cfg.forceFields.forEach(function(f) { addForceField(f.type, f.x, f.y); });
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
    var stream = flowCan.captureStream(30);
    ENG.recChunks = [];
    var mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    ENG.mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
    ENG.mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) ENG.recChunks.push(e.data); };
    ENG.mediaRecorder.onstop = saveRecording;
    ENG.mediaRecorder.start(100);
    ENG.recStartTime = Date.now();

    var recBar = document.getElementById('recBar');
    if (recBar) recBar.classList.add('show');
    var recBtn = document.getElementById('btnRecord');
    if (recBtn) recBtn.classList.add('active');

    ENG.recTimerID = setInterval(function() {
      var elapsed = Math.floor((Date.now() - ENG.recStartTime) / 1000);
      var mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      var ss = String(elapsed % 60).padStart(2, '0');
      var recTime = document.getElementById('recTime');
      if (recTime) recTime.textContent = mm + ':' + ss;
      var fill = document.getElementById('recProgressFill');
      if (fill) fill.style.width = Math.min(100, elapsed / 120 * 100) + '%';
    }, 1000);

    showToast(t('toastRecStart'));
  } catch (e) {
    reportError('recording failed', e);
    showToast('Recording not supported');
  }
}

function stopRecording() {
  if (ENG.mediaRecorder && ENG.mediaRecorder.state !== 'inactive') {
    ENG.mediaRecorder.stop();
  }
  if (ENG.recTimerID) { clearInterval(ENG.recTimerID); ENG.recTimerID = null; }
  var recBar = document.getElementById('recBar');
  if (recBar) recBar.classList.remove('show');
  var recBtn = document.getElementById('btnRecord');
  if (recBtn) recBtn.classList.remove('active');
  ENG.mediaRecorder = null;
  showToast(t('toastRecStop'));
}

function saveRecording() {
  var blob = new Blob(ENG.recChunks, { type: 'video/webm' });
  var link = document.createElement('a');
  link.download = 'xoretex_' + Date.now() + '.webm';
  link.href = URL.createObjectURL(blob);
  link.click();
  ENG.recChunks = [];
}

// ============================================================
// VIEW MODE — CRITICAL FIX: pointer-events toggling
// ============================================================
function setViewMode(mode) {
  ENG.viewMode = mode;
  document.querySelectorAll('.modeTab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  var fCan = document.getElementById('flowCan');
  var gCan = document.getElementById('glowCan');
  var coCan = document.getElementById('connCan');
  var cuCan = document.getElementById('cubeCan');

  if (mode === '3d') {
    // Hide 2D canvases, show cube canvas with pointer events
    if (fCan)  { fCan.style.display = 'none'; }
    if (gCan)  { gCan.style.display = 'none'; }
    if (coCan) { coCan.style.display = 'none'; }
    if (cuCan) { cuCan.style.display = ''; cuCan.style.pointerEvents = 'auto'; cuCan.style.zIndex = '4'; }
    // Clear 2D canvases
    if (flowCtx) flowCtx.clearRect(0, 0, W, H);
    if (glowCtx) glowCtx.clearRect(0, 0, W, H);
    if (connCtx) connCtx.clearRect(0, 0, W, H);
  } else if (mode === '2d') {
    // Show 2D, hide cube
    if (fCan)  { fCan.style.display = ''; fCan.style.pointerEvents = 'auto'; }
    if (gCan)  { gCan.style.display = ''; }
    if (coCan) { coCan.style.display = ''; }
    if (cuCan) { cuCan.style.display = 'none'; cuCan.style.pointerEvents = 'none'; }
  } else {
    // BOTH mode
    if (fCan)  { fCan.style.display = ''; fCan.style.pointerEvents = 'auto'; }
    if (gCan)  { gCan.style.display = ''; }
    if (coCan) { coCan.style.display = ''; }
    if (cuCan) { cuCan.style.display = ''; cuCan.style.pointerEvents = 'auto'; cuCan.style.zIndex = '4'; }
    // In BOTH mode: cube canvas on top receives mouse for rotation,
    // but we also need 2D mouse. Solution: make cube transparent to mouse
    // and let flowCan handle 2D interaction — cube uses its own listeners
    if (cuCan) { cuCan.style.pointerEvents = 'auto'; }
    // flowCan below cubeCan — disable its pointer events in BOTH
    if (fCan) { fCan.style.pointerEvents = 'none'; }
  }

  // Notify cube3d if present
  if (window.setCubeVisible) {
    window.setCubeVisible(mode !== '2d');
  }
}

// ============================================================
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
  var container = document.getElementById('presetBtns');
  if (!container) return;
  container.innerHTML = '';
  PRESETS.forEach(function(preset, idx) {
    var btn = document.createElement('button');
    btn.className = 'pBtn';
    btn.textContent = preset.name;
    btn.addEventListener('click', function() { applyPreset(PRESETS[idx]); });
    container.appendChild(btn);
  });
}

function applyPreset(preset) {
  if (!preset) return;
  if (preset.config) Object.assign(ENG.config, preset.config);
  if (preset.layers) {
    ENG.layers = preset.layers.map(function(l) {
      var layer = createLayer(l.eq, l.color, l.palette, l.opacity, l.weight);
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
  var grid = document.getElementById('snippetGrid');
  if (!grid) return;
  grid.innerHTML = '';
  SNIPPETS.forEach(function(snip) {
    var btn = document.createElement('button');
    btn.className = 'pBtn snippetBtn';
    btn.textContent = snip.name;
    btn.title = snip.code;
    btn.addEventListener('click', function() {
      var ta = document.getElementById('formulaInput');
      if (ta) ta.value = snip.code;
      applyFormulaToLayer(snip.code);
    });
    grid.appendChild(btn);
  });
}

function buildLayerCards() {
  var container = document.getElementById('layerCards');
  if (!container) return;
  container.innerHTML = '';

  ENG.layers.forEach(function(layer, idx) {
    var card = document.createElement('div');
    card.className = 'layerCard' + (ENG.focusedLayer === idx ? ' focused' : '');

    var header = document.createElement('div');
    header.className = 'layerTitle';
    header.style.color = layer.color;
    header.textContent = 'Layer ' + (idx + 1);
    (function(i) {
      header.addEventListener('click', function() {
        ENG.focusedLayer = (ENG.focusedLayer === i) ? -1 : i;
        buildLayerCards();
      });
    })(idx);

    var enRow = document.createElement('label');
    enRow.className = 'pCheck';
    var enChk = document.createElement('input');
    enChk.type = 'checkbox'; enChk.checked = layer.enabled;
    enChk.addEventListener('change', function() { layer.enabled = enChk.checked; });
    var enSpan = document.createElement('span'); enSpan.textContent = 'Enabled';
    enRow.appendChild(enChk); enRow.appendChild(enSpan);

    var eqLabel = document.createElement('label');
    eqLabel.className = 'pLabel'; eqLabel.textContent = t('layerEquation');
    var eqTa = document.createElement('textarea');
    eqTa.className = 'pTextarea'; eqTa.value = layer.eq;
    eqTa.rows = 2; eqTa.spellcheck = false;
    var eqInd = document.createElement('span');
    eqInd.className = 'indicator ' + (layer.valid ? 'valid' : 'invalid');
    eqTa.addEventListener('input', function() {
      layer.eq = eqTa.value;
      var ok = compileLayerFn(layer);
      eqInd.className = 'indicator ' + (ok ? 'valid' : 'invalid');
    });

    var colRow = document.createElement('div'); colRow.className = 'pRow';
    var colLabel = document.createElement('span'); colLabel.className = 'pLabel';
    colLabel.style.margin = '0'; colLabel.textContent = t('layerColor');
    var colPick = document.createElement('input'); colPick.type = 'color'; colPick.className = 'pColor';
    colPick.value = layer.color;
    colPick.addEventListener('input', function() { layer.color = colPick.value; buildLayerCards(); });

    var palLabel = document.createElement('label'); palLabel.className = 'pLabel';
    palLabel.textContent = t('layerPalette');
    var palSel = document.createElement('select'); palSel.className = 'pSelect';
    Object.keys(PALETTES).forEach(function(pk) {
      var op = document.createElement('option'); op.value = pk; op.textContent = pk;
      if (pk === layer.palette) op.selected = true;
      palSel.appendChild(op);
    });
    palSel.addEventListener('change', function() { layer.palette = palSel.value; });

    var opLabel = document.createElement('label'); opLabel.className = 'pLabel';
    opLabel.textContent = t('layerOpacity');
    var opRow = document.createElement('div'); opRow.className = 'pRow';
    var opSlider = document.createElement('input'); opSlider.type = 'range'; opSlider.className = 'pSlider';
    opSlider.min = '0'; opSlider.max = '1'; opSlider.step = '0.05'; opSlider.value = layer.opacity;
    var opVal = document.createElement('span'); opVal.className = 'pVal';
    opVal.textContent = layer.opacity.toFixed(2);
    opSlider.addEventListener('input', function() {
      layer.opacity = parseFloat(opSlider.value); opVal.textContent = layer.opacity.toFixed(2);
    });

    var wtLabel = document.createElement('label'); wtLabel.className = 'pLabel';
    wtLabel.textContent = t('layerWeight');
    var wtRow = document.createElement('div'); wtRow.className = 'pRow';
    var wtSlider = document.createElement('input'); wtSlider.type = 'range'; wtSlider.className = 'pSlider';
    wtSlider.min = '0.1'; wtSlider.max = '3'; wtSlider.step = '0.1'; wtSlider.value = layer.weight;
    var wtVal = document.createElement('span'); wtVal.className = 'pVal';
    wtVal.textContent = layer.weight.toFixed(1);
    wtSlider.addEventListener('input', function() {
      layer.weight = parseFloat(wtSlider.value); wtVal.textContent = layer.weight.toFixed(1);
    });

    var rmBtn = document.createElement('button'); rmBtn.className = 'pBtn danger';
    rmBtn.textContent = t('removeLayer');
    (function(i2) {
      rmBtn.addEventListener('click', function() {
        ENG.layers.splice(i2, 1);
        if (ENG.focusedLayer >= ENG.layers.length) ENG.focusedLayer = -1;
        buildLayerCards();
        reassignParticlesLayers();
      });
    })(idx);

    opRow.appendChild(opSlider); opRow.appendChild(opVal);
    wtRow.appendChild(wtSlider); wtRow.appendChild(wtVal);
    colRow.appendChild(colLabel); colRow.appendChild(colPick);

    var eqWrap = document.createElement('div'); eqWrap.className = 'pRow';
    eqWrap.appendChild(eqTa); eqWrap.appendChild(eqInd);

    card.appendChild(header);
    card.appendChild(enRow);
    card.appendChild(eqLabel);
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
  var nl = ENG.layers.length || 1;
  ENG.particles.forEach(function(p, i) { p.layerIndex = i % nl; });
}

function bindPanelControls() {
  var btnApply = document.getElementById('btnApplyFormula');
  if (btnApply) btnApply.addEventListener('click', function() {
    var code = (document.getElementById('formulaInput') || {}).value || '';
    applyFormulaToLayer(code);
  });

  var fInput = document.getElementById('formulaInput');
  if (fInput) fInput.addEventListener('input', function() {
    var code = fInput.value;
    var ok = validateFormula(code);
    var ind = document.getElementById('formulaIndicator');
    var sta = document.getElementById('formulaStatus');
    if (ind) ind.className = 'indicator ' + (ok ? 'valid' : 'invalid');
    if (sta) sta.textContent = ok ? t('valid') : t('invalid');
  });

  function bindSlider(id, valId, obj, key, decimals) {
    var slider = document.getElementById(id);
    var valEl = document.getElementById(valId);
    if (!slider) return;
    slider.addEventListener('input', function() {
      var v = parseFloat(slider.value);
      obj[key] = v;
      if (valEl) valEl.textContent = decimals === 0 ? String(v) : v.toFixed(decimals || 2);
      if (key === 'particleCount') spawnParticles();
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

  function bindCheck(id, obj, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function() { obj[key] = el.checked; });
  }

  bindCheck('chkMotionBlur', ENG.config, 'motionBlur');
  bindCheck('chkGlow', ENG.config, 'glow');
  bindCheck('chkConnections', ENG.config, 'connections');
  bindCheck('chkDepth3D', ENG.config, 'depth3D');
  bindCheck('chkFFPulse', ENG.config, 'ffPulse');

  var selSym = document.getElementById('selSymmetry');
  if (selSym) selSym.addEventListener('change', function() { ENG.config.symmetry = parseInt(selSym.value); });

  var selTrail = document.getElementById('selTrailShape');
  if (selTrail) selTrail.addEventListener('change', function() { ENG.config.trailShape = selTrail.value; });

  var selMouse = document.getElementById('selMouseMode');
  if (selMouse) selMouse.addEventListener('change', function() { ENG.mouse.mode = selMouse.value; });

  var btnAddLayer = document.getElementById('btnAddLayer');
  if (btnAddLayer) btnAddLayer.addEventListener('click', function() {
    var l = createLayer(
      'sin(x*0.02+t)*cos(y*0.02+t)*2',
      '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
      'neon', 1, 1
    );
    compileLayerFn(l);
    ENG.layers.push(l);
    buildLayerCards();
    reassignParticlesLayers();
  });

  var btnAddFF = document.getElementById('btnAddFF');
  if (btnAddFF) btnAddFF.addEventListener('click', function() {
    var type = (document.getElementById('ffTypeSelect') || {}).value || 'attract';
    addForceField(type);
  });

  var btnMic = document.getElementById('btnMic');
  if (btnMic) btnMic.addEventListener('click', startMic);

  var btnAudioStop = document.getElementById('btnAudioStop');
  if (btnAudioStop) btnAudioStop.addEventListener('click', stopAudio);

  var audioFileInput = document.getElementById('audioFileInput');
  if (audioFileInput) audioFileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) startAudioFile(e.target.files[0]);
  });

  document.querySelectorAll('[data-game]').forEach(function(btn) {
    btn.addEventListener('click', function() { startGameMode(btn.dataset.game); });
  });

  var exitGameBtn = document.getElementById('btnExitGame');
  if (exitGameBtn) exitGameBtn.addEventListener('click', exitGameMode);

  var btn4K = document.getElementById('btnExport4K');
  if (btn4K) btn4K.addEventListener('click', export4K);

  var btnSVG = document.getElementById('btnExportSVG');
  if (btnSVG) btnSVG.addEventListener('click', exportSVG);

  var btnGLSL = document.getElementById('btnExportGLSL');
  if (btnGLSL) btnGLSL.addEventListener('click', exportGLSL);

  var btnSave = document.getElementById('btnSaveConfig');
  if (btnSave) btnSave.addEventListener('click', saveConfig);

  var loadInput = document.getElementById('loadConfigInput');
  if (loadInput) loadInput.addEventListener('change', function(e) {
    if (e.target.files[0]) loadConfig(e.target.files[0]);
  });

  var btnSvgCopy = document.getElementById('btnSvgCopy');
  if (btnSvgCopy) btnSvgCopy.addEventListener('click', function() {
    if (window._svgCache) navigator.clipboard.writeText(window._svgCache).then(function() { showToast(t('toastCopied')); });
  });
  var btnSvgDown = document.getElementById('btnSvgDownload');
  if (btnSvgDown) btnSvgDown.addEventListener('click', function() {
    if (!window._svgCache) return;
    var blob = new Blob([window._svgCache], { type: 'image/svg+xml' });
    var link = document.createElement('a');
    link.download = 'xoretex_' + Date.now() + '.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
  });

  var btnGlslCopy = document.getElementById('btnGlslCopy');
  if (btnGlslCopy) btnGlslCopy.addEventListener('click', function() {
    if (window._glslCache) navigator.clipboard.writeText(window._glslCache).then(function() { showToast(t('toastCopied')); });
  });

  var helpCloseBtn = document.getElementById('helpClose');
  if (helpCloseBtn) helpCloseBtn.addEventListener('click', function() { hideModal('helpModal'); });
  var svgCloseBtn = document.getElementById('svgClose');
  if (svgCloseBtn) svgCloseBtn.addEventListener('click', function() { hideModal('svgModal'); });
  var glslCloseBtn = document.getElementById('glslClose');
  if (glslCloseBtn) glslCloseBtn.addEventListener('click', function() { hideModal('glslModal'); });

  var helpDontChk = document.getElementById('helpDontShowChk');
  if (helpDontChk) helpDontChk.addEventListener('change', function() {
    if (helpDontChk.checked) localStorage.setItem('xoretex_help_seen', '1');
    else localStorage.removeItem('xoretex_help_seen');
  });

  var btnRecStop = document.getElementById('btnRecStop');
  if (btnRecStop) btnRecStop.addEventListener('click', stopRecording);
}

function bindSectionToggles() {
  document.querySelectorAll('.pSecHead').forEach(function(head) {
    head.addEventListener('click', function() {
      var bodyId = head.dataset.sec;
      var body = document.getElementById(bodyId);
      if (!body) return;
      var isOpen = body.classList.contains('open');
      body.classList.toggle('open', !isOpen);
      head.classList.toggle('open', !isOpen);
    });
  });
}

function syncControlsFromConfig() {
  var cfg = ENG.config;
  function setSlider(id, valId, val, decimals) {
    var el = document.getElementById(id);
    if (el) el.value = val;
    var ve = document.getElementById(valId);
    if (ve) ve.textContent = decimals === 0 ? String(parseFloat(val)) : parseFloat(val).toFixed(decimals || 2);
  }
  setSlider('sliderCount', 'valCount', cfg.particleCount, 0);
  setSlider('sliderSpeed', 'valSpeed', cfg.speed, 1);
  setSlider('sliderFriction', 'valFriction', cfg.friction, 3);
  setSlider('sliderTurbulence', 'valTurbulence', cfg.turbulence, 2);
  setSlider('sliderTrailFade', 'valTrailFade', cfg.trailFade, 2);
  setSlider('sliderMouseForce', 'valMouseForce', cfg.mouseForce, 0);
  setSlider('sliderConnDist', 'valConnDist', cfg.connDist, 0);

  var chkGlow = document.getElementById('chkGlow');
  if (chkGlow) chkGlow.checked = cfg.glow;
  var chkConn = document.getElementById('chkConnections');
  if (chkConn) chkConn.checked = cfg.connections;
  var chkBlur = document.getElementById('chkMotionBlur');
  if (chkBlur) chkBlur.checked = cfg.motionBlur;
  var chkDepth = document.getElementById('chkDepth3D');
  if (chkDepth) chkDepth.checked = cfg.depth3D;
  var selSym2 = document.getElementById('selSymmetry');
  if (selSym2) selSym2.value = cfg.symmetry;
  var selTrail2 = document.getElementById('selTrailShape');
  if (selTrail2) selTrail2.value = cfg.trailShape;
}

// ============================================================
// TOP BAR
// ============================================================
function bindTopBar() {
  var btnLang = document.getElementById('btnLang');
  if (btnLang) btnLang.addEventListener('click', toggleLang);

  var btnHelp = document.getElementById('btnHelp');
  if (btnHelp) btnHelp.addEventListener('click', function() { showModal('helpModal'); });

  var btnPause = document.getElementById('btnPause');
  if (btnPause) btnPause.addEventListener('click', togglePause);

  var btnFS = document.getElementById('btnFullscreen');
  if (btnFS) btnFS.addEventListener('click', toggleFullscreen);

  var btnSS = document.getElementById('btnScreenshot');
  if (btnSS) btnSS.addEventListener('click', exportScreenshot);

  var btnRec = document.getElementById('btnRecord');
  if (btnRec) btnRec.addEventListener('click', function() {
    if (ENG.mediaRecorder) stopRecording(); else startRecording();
  });

  document.querySelectorAll('.modeTab').forEach(function(btn) {
    btn.addEventListener('click', function() { setViewMode(btn.dataset.mode); });
  });

  var panelToggle = document.getElementById('panelToggle');
  var sidePanel = document.getElementById('sidePanel');
  if (panelToggle && sidePanel) {
    panelToggle.addEventListener('click', function() {
      var collapsed = sidePanel.classList.toggle('collapsed');
      panelToggle.classList.toggle('collapsed', collapsed);
      panelToggle.textContent = collapsed ? '\u25B8' : '\u25C2';
    });
  }
}

function togglePause() {
  ENG.running = !ENG.running;
  var btn = document.getElementById('btnPause');
  if (btn) btn.textContent = ENG.running ? '\u23F8' : '\u25B6';
  showToast(ENG.running ? t('resumed') : t('paused'));
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function() {});
  } else {
    document.exitFullscreen().catch(function() {});
  }
}

// ============================================================
// KEYBOARD
// ============================================================
function bindKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePause(); break;
      case 'KeyF': toggleFullscreen(); break;
      case 'KeyS': exportScreenshot(); break;
      case 'KeyR': if (ENG.mediaRecorder) stopRecording(); else startRecording(); break;
      case 'KeyH': showModal('helpModal'); break;
      case 'KeyP':
        var sp = document.getElementById('sidePanel');
        var pt = document.getElementById('panelToggle');
        if (sp) {
          var c = sp.classList.toggle('collapsed');
          if (pt) { pt.classList.toggle('collapsed', c); pt.textContent = c ? '\u25B8' : '\u25C2'; }
        }
        break;
      case 'KeyL': toggleLang(); break;
      case 'Digit1': setViewMode('both'); break;
      case 'Digit2': setViewMode('2d'); break;
      case 'Digit3': setViewMode('3d'); break;
      case 'KeyN': if (window.nextCubePattern) window.nextCubePattern(); break;
    }
  });
}

// ============================================================
// MOUSE & TOUCH — FIXED: only active when 2D mode
// ============================================================
function bindMouse() {
  // We listen on window and check viewMode
  window.addEventListener('mousemove', function(e) {
    if (ENG.viewMode === '3d') return;
    ENG.mouse.x = e.clientX;
    ENG.mouse.y = e.clientY;
  });
  window.addEventListener('mousedown', function(e) {
    if (ENG.viewMode === '3d') return;
    // Ignore clicks on UI elements
    if (e.target.closest('#sidePanel') || e.target.closest('#topBar') || e.target.closest('#modeTabs') ||
        e.target.closest('.modalOverlay') || e.target.closest('#panelToggle')) return;
    ENG.mouse.down = true;
    if (ENG.gameMode === 'sculptor') placeSculptorObstacle(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', function() {
    ENG.mouse.down = false;
  });
}

function bindTouch() {
  var ring = document.getElementById('touchRing');

  window.addEventListener('touchstart', function(e) {
    if (ENG.viewMode === '3d') return;
    if (e.target.closest('#sidePanel') || e.target.closest('#topBar') || e.target.closest('#modeTabs') ||
        e.target.closest('.modalOverlay') || e.target.closest('#panelToggle')) return;
    var t3 = e.touches[0];
    ENG.mouse.x = t3.clientX; ENG.mouse.y = t3.clientY; ENG.mouse.down = true;
    if (ring) { ring.style.display = 'block'; ring.style.left = t3.clientX + 'px'; ring.style.top = t3.clientY + 'px'; }
    if (ENG.gameMode === 'sculptor') placeSculptorObstacle(t3.clientX, t3.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (ENG.viewMode === '3d') return;
    var t3 = e.touches[0];
    ENG.mouse.x = t3.clientX; ENG.mouse.y = t3.clientY;
    if (ring) { ring.style.left = t3.clientX + 'px'; ring.style.top = t3.clientY + 'px'; }
  }, { passive: true });

  window.addEventListener('touchend', function() {
    ENG.mouse.down = false; ENG.mouse.x = -9999; ENG.mouse.y = -9999;
    if (ring) ring.style.display = 'none';
  });
}

// ============================================================
// MODAL / TOAST HELPERS
// ============================================================
function showModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('show');
}
function hideModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

var toastTimer = null;
function showToast(msg) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 2500);
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
    var l = createLayer(code, '#00ffc8', 'cool', 1, 1);
    compileLayerFn(l);
    ENG.layers.push(l);
    buildLayerCards();
    reassignParticlesLayers();
    return;
  }
  var fl = ENG.focusedLayer >= 0 && ENG.focusedLayer < ENG.layers.length
    ? ENG.layers[ENG.focusedLayer] : ENG.layers[0];
  fl.eq = code;
  var ok = compileLayerFn(fl);
  var ind = document.getElementById('formulaIndicator');
  var sta = document.getElementById('formulaStatus');
  if (ind) ind.className = 'indicator ' + (ok ? 'valid' : 'invalid');
  if (sta) sta.textContent = ok ? t('valid') : t('invalid');
  buildLayerCards();
}

// ============================================================
// HELP MODAL
// ============================================================
function buildHelpModal() {
  var body = document.getElementById('helpBody');
  if (!body) return;
  var steps = [
    { title: t('helpStep1Title'), text: t('helpStep1') },
    { title: t('helpStep2Title'), text: t('helpStep2') },
    { title: t('helpStep3Title'), text: t('helpStep3') },
    { title: t('helpStep4Title'), text: t('helpStep4') },
    { title: t('helpStep5Title'), text: t('helpStep5') },
    { title: t('helpStep6Title'), text: t('helpStep6') },
    { title: t('helpStep7Title'), text: t('helpStep7') },
  ];
  body.innerHTML = steps.map(function(s) {
    return '<div class="step"><h3>' + s.title + '</h3><p>' + s.text + '</p></div>';
  }).join('');
  var titleEl = document.querySelector('#helpModal .modalTitle');
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
