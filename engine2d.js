/**
 * Xoretex Xhaos Cube — engine2d.js
 * FINAL VERSION — Compatible with latest index.html + cube3d.js
 * Features: Particles, Layers, Audio, Force Fields, Game Modes,
 * Export, Localization EN/AR, Fight mode sync with cube
 */

'use strict';

// ============================================================
// ERROR REPORTER
// ============================================================
function reportError(msg, err) {
  var el = document.getElementById('errorOverlay');
  if (el) { el.style.display = 'block'; el.innerHTML += '<div><b>\u26A0</b> ' + msg + (err ? '<br><span style="color:#f88">' + String(err) + '</span>' : '') + '</div>'; }
  console.error('[engine2d]', msg, err || '');
}

// ============================================================
// LOCALIZATION
// ============================================================
var TRANSLATIONS = {
  en: {
    presets:'Presets',liveInjection:'Live Injection',formulaCode:'Formula Code',
    apply:'Apply',valid:'Valid',invalid:'Invalid',snippetLibrary:'Snippet Library',
    layers:'Layers',addLayer:'+ Add Layer',audio:'Audio',microphone:'\uD83C\uDFA4 Mic',
    audioFile:'\uD83C\uDFB5 File',stopAudio:'\u23F9 Stop',bpm:'BPM',beat:'Beat',audioGain:'Audio Gain',
    forceFields:'Force Fields',addField:'+ Add',pulsate:'Pulsate',pulseSpeed:'Pulse Speed',
    effects:'Effects',trailFade:'Trail Fade',motionBlur:'Motion Blur',glowBloom:'Glow / Bloom',
    connections:'Connections',connDist:'Connection Distance',symmetry:'Symmetry',
    depth3d:'3D Depth Illusion',trailShape:'Trail Shape',controls:'Controls',
    particleCount:'Particle Count',speed:'Speed',friction:'Friction',turbulence:'Turbulence',
    mouseForce:'Mouse Force',interaction:'Interaction',mouseMode:'Mouse Mode',
    gameModes:'Game Modes',painter:'\uD83C\uDFA8 Painter',sculptor:'\uD83D\uDDFF Sculptor',
    battle:'\u2694 Battle',colorWar:'\uD83C\uDF08 Color War',exitGame:'\u2715 Exit Game',
    cubeControls:'Cube Controls',cubePattern:'Pattern',random:'Random',autoSwitch:'Auto Switch',
    autoInterval:'Auto Interval (s)',autoSpin:'Auto Spin',zenOrbit:'Zen Orbit',
    reflection:'Reflection',floorGrid:'Floor Grid',edgeGlow:'Edge Glow',
    emissive:'Emissive',shatter:'\uD83D\uDCA5 Shatter',actions:'Actions',
    export4k:'\uD83D\uDCD0 4K Export',exportSvg:'\uD83D\uDDBC SVG',exportGlsl:'\uD83D\uDD27 GLSL',
    saveConfig:'\uD83D\uDCBE Save Config',loadConfig:'\uD83D\uDCC2 Load Config',
    shortcuts:'Shortcuts',scPause:'Pause / Resume',scFull:'Fullscreen',
    scScreen:'Screenshot',scRecord:'Record',scHelp:'Help',
    scPanel:'Toggle Panel',scLang:'Language',scMode:'View Mode',scNextPat:'Next Pattern',
    helpTitle:'Welcome to Xoretex Xhaos Cube',
    svgExportTitle:'SVG Export',glslExportTitle:'GLSL Approximation',
    copy:'Copy',download:'Download',dontShowAgain:"Don't show on startup",
    stopRec:'Stop',layerColor:'Color',layerPalette:'Palette',layerOpacity:'Opacity',
    layerWeight:'Weight',layerEquation:'Equation',removeLayer:'Remove',
    toastCopied:'Copied!',toastSaved:'Config saved!',toastLoaded:'Config loaded!',
    toastRecStart:'Recording started',toastRecStop:'Recording stopped',
    toastScreenshot:'Screenshot saved',toast4K:'4K screenshot saved',
    toastShatter:'Shatter!',paused:'Paused',resumed:'Resumed',
    helpStep1Title:'1. View Modes',
    helpStep1:'Use BOTH / 2D Flow / 3D Cube tabs to switch views. In BOTH mode, particles and cube render together.',
    helpStep2Title:'2. Live Formula Injection',
    helpStep2:'Type JavaScript expressions. Variables: x, y, t, r, cx, cy, PI, sin, cos, tan, atan2, sqrt, abs, noise, audio.',
    helpStep3Title:'3. Layers',
    helpStep3:'Add multiple formula layers with color, palette, opacity, weight. Click title to focus.',
    helpStep4Title:'4. Force Fields',
    helpStep4:'Add attract/repel/vortex/gravity fields. Drag markers on canvas. Enable Pulsate.',
    helpStep5Title:'5. Audio Reactive',
    helpStep5:'Use microphone or audio file. Engine reacts to bass/mid/high. Beat detection drives visuals.',
    helpStep6Title:'6. Game Modes',
    helpStep6:'Painter: persistent trails. Sculptor: place obstacles. Battle: layers compete. Color War: territory painting. Cube Fight: particles attack the 3D cube!',
    helpStep7Title:'7. Export & POV',
    helpStep7:'Export PNG/4K/SVG/GLSL/WebM/JSON. Enter POV mode to look around inside the cube!',
  },
  ar: {
    presets:'\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A',liveInjection:'\u0627\u0644\u062D\u0642\u0646 \u0627\u0644\u0645\u0628\u0627\u0634\u0631',
    formulaCode:'\u0643\u0648\u062F \u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0629',apply:'\u062A\u0637\u0628\u064A\u0642',
    valid:'\u0635\u0627\u0644\u062D',invalid:'\u063A\u064A\u0631 \u0635\u0627\u0644\u062D',
    snippetLibrary:'\u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u0645\u0642\u062A\u0637\u0641\u0627\u062A',
    layers:'\u0627\u0644\u0637\u0628\u0642\u0627\u062A',addLayer:'+ \u0625\u0636\u0627\u0641\u0629 \u0637\u0628\u0642\u0629',
    audio:'\u0627\u0644\u0635\u0648\u062A',microphone:'\uD83C\uDFA4 \u0645\u064A\u0643',
    audioFile:'\uD83C\uDFB5 \u0645\u0644\u0641',stopAudio:'\u23F9 \u0625\u064A\u0642\u0627\u0641',
    bpm:'\u0646\u0628\u0636/\u062F',beat:'\u0625\u064A\u0642\u0627\u0639',audioGain:'\u0643\u0633\u0628 \u0627\u0644\u0635\u0648\u062A',
    forceFields:'\u062D\u0642\u0648\u0644 \u0627\u0644\u0642\u0648\u0629',addField:'+ \u0625\u0636\u0627\u0641\u0629',
    pulsate:'\u0646\u0628\u0636',pulseSpeed:'\u0633\u0631\u0639\u0629 \u0627\u0644\u0646\u0628\u0636',
    effects:'\u0627\u0644\u0645\u0624\u062B\u0631\u0627\u062A',trailFade:'\u062A\u0644\u0627\u0634\u064A',
    motionBlur:'\u0636\u0628\u0627\u0628\u064A\u0629',glowBloom:'\u062A\u0648\u0647\u062C',
    connections:'\u062A\u0648\u0635\u064A\u0644\u0627\u062A',connDist:'\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644',
    symmetry:'\u062A\u0646\u0627\u0633\u0642',depth3d:'\u0639\u0645\u0642 3D',trailShape:'\u0634\u0643\u0644 \u0627\u0644\u0623\u062B\u0631',
    controls:'\u062A\u062D\u0643\u0645',particleCount:'\u0639\u062F\u062F \u0627\u0644\u062C\u0633\u064A\u0645\u0627\u062A',
    speed:'\u0633\u0631\u0639\u0629',friction:'\u0627\u062D\u062A\u0643\u0627\u0643',turbulence:'\u0627\u0636\u0637\u0631\u0627\u0628',
    mouseForce:'\u0642\u0648\u0629 \u0627\u0644\u0645\u0627\u0648\u0633',interaction:'\u062A\u0641\u0627\u0639\u0644',
    mouseMode:'\u0648\u0636\u0639 \u0627\u0644\u0645\u0627\u0648\u0633',gameModes:'\u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u0644\u0639\u0628',
    painter:'\uD83C\uDFA8 \u0631\u0633\u0627\u0645',sculptor:'\uD83D\uDDFF \u0646\u062D\u0627\u062A',
    battle:'\u2694 \u0645\u0639\u0631\u0643\u0629',colorWar:'\uD83C\uDF08 \u062D\u0631\u0628 \u0623\u0644\u0648\u0627\u0646',
    exitGame:'\u2715 \u062E\u0631\u0648\u062C',cubeControls:'\u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u0643\u0639\u0628',
    cubePattern:'\u0646\u0645\u0637',random:'\u0639\u0634\u0648\u0627\u0626\u064A',
    autoSwitch:'\u062A\u0628\u062F\u064A\u0644 \u062A\u0644\u0642\u0627\u0626\u064A',autoInterval:'\u0641\u062A\u0631\u0629 (\u062B)',
    autoSpin:'\u062F\u0648\u0631\u0627\u0646',zenOrbit:'\u0645\u062F\u0627\u0631 \u0632\u0646',
    reflection:'\u0627\u0646\u0639\u0643\u0627\u0633',floorGrid:'\u0634\u0628\u0643\u0629',
    edgeGlow:'\u062A\u0648\u0647\u062C \u062D\u0648\u0627\u0641',emissive:'\u0625\u0634\u0639\u0627\u0639',
    shatter:'\uD83D\uDCA5 \u062A\u062D\u0637\u064A\u0645',actions:'\u0625\u062C\u0631\u0627\u0621\u0627\u062A',
    export4k:'\uD83D\uDCD0 4K',exportSvg:'\uD83D\uDDBC SVG',exportGlsl:'\uD83D\uDD27 GLSL',
    saveConfig:'\uD83D\uDCBE \u062D\u0641\u0638',loadConfig:'\uD83D\uDCC2 \u062A\u062D\u0645\u064A\u0644',
    shortcuts:'\u0627\u062E\u062A\u0635\u0627\u0631\u0627\u062A',scPause:'\u0625\u064A\u0642\u0627\u0641/\u0627\u0633\u062A\u0626\u0646\u0627\u0641',
    scFull:'\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629',scScreen:'\u0644\u0642\u0637\u0629',
    scRecord:'\u062A\u0633\u062C\u064A\u0644',scHelp:'\u0645\u0633\u0627\u0639\u062F\u0629',
    scPanel:'\u0644\u0648\u062D\u0629',scLang:'\u0644\u063A\u0629',scMode:'\u0648\u0636\u0639',scNextPat:'\u0627\u0644\u062A\u0627\u0644\u064A',
    helpTitle:'Xoretex Xhaos Cube \u0645\u0631\u062D\u0628\u0627',
    svgExportTitle:'\u062A\u0635\u062F\u064A\u0631 SVG',glslExportTitle:'\u062A\u0642\u0631\u064A\u0628 GLSL',
    copy:'\u0646\u0633\u062E',download:'\u062A\u062D\u0645\u064A\u0644',dontShowAgain:'\u0639\u062F\u0645 \u0627\u0644\u0625\u0638\u0647\u0627\u0631',
    stopRec:'\u0625\u064A\u0642\u0627\u0641',layerColor:'\u0644\u0648\u0646',layerPalette:'\u0644\u0648\u062D\u0629',
    layerOpacity:'\u0634\u0641\u0627\u0641\u064A\u0629',layerWeight:'\u0648\u0632\u0646',
    layerEquation:'\u0645\u0639\u0627\u062F\u0644\u0629',removeLayer:'\u0625\u0632\u0627\u0644\u0629',
    toastCopied:'\u062A\u0645!',toastSaved:'\u062A\u0645 \u0627\u0644\u062D\u0641\u0638!',
    toastLoaded:'\u062A\u0645 \u0627\u0644\u062A\u062D\u0645\u064A\u0644!',toastRecStart:'\u0628\u062F\u0623 \u0627\u0644\u062A\u0633\u062C\u064A\u0644',
    toastRecStop:'\u062A\u0648\u0642\u0641',toastScreenshot:'\u062A\u0645 \u0627\u0644\u062D\u0641\u0638',
    toast4K:'\u062A\u0645 4K',toastShatter:'\u062A\u062D\u0637\u064A\u0645!',
    paused:'\u0645\u062A\u0648\u0642\u0641',resumed:'\u0627\u0633\u062A\u0626\u0646\u0627\u0641',
    helpStep1Title:'\u0661. \u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u0639\u0631\u0636',
    helpStep1:'\u0627\u0633\u062A\u062E\u062F\u0645 BOTH / 2D / 3D \u0644\u0644\u062A\u0628\u062F\u064A\u0644.',
    helpStep2Title:'\u0662. \u0627\u0644\u062D\u0642\u0646',helpStep2:'\u0627\u0643\u062A\u0628 \u062A\u0639\u0627\u0628\u064A\u0631 JavaScript.',
    helpStep3Title:'\u0663. \u0627\u0644\u0637\u0628\u0642\u0627\u062A',helpStep3:'\u0623\u0636\u0641 \u0637\u0628\u0642\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629.',
    helpStep4Title:'\u0664. \u062D\u0642\u0648\u0644 \u0627\u0644\u0642\u0648\u0629',helpStep4:'\u0623\u0636\u0641 \u062D\u0642\u0648\u0644 \u062C\u0630\u0628/\u0637\u0631\u062F/\u062F\u0648\u0627\u0645\u0629.',
    helpStep5Title:'\u0665. \u0627\u0644\u0635\u0648\u062A',helpStep5:'\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646 \u0623\u0648 \u0645\u0644\u0641 \u0635\u0648\u062A\u064A.',
    helpStep6Title:'\u0666. \u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u0644\u0639\u0628',helpStep6:'\u0631\u0633\u0627\u0645/\u0646\u062D\u0627\u062A/\u0645\u0639\u0631\u0643\u0629/\u062D\u0631\u0628 \u0623\u0644\u0648\u0627\u0646/\u0642\u062A\u0627\u0644 \u0627\u0644\u0645\u0643\u0639\u0628!',
    helpStep7Title:'\u0667. \u0627\u0644\u062A\u0635\u062F\u064A\u0631',helpStep7:'\u0635\u062F\u0651\u0631 PNG/4K/SVG/GLSL/WebM/JSON.',
  }
};

var currentLang = localStorage.getItem('xoretex_lang') || 'en';
function t(key) { return (TRANSLATIONS[currentLang]||{})[key] || TRANSLATIONS.en[key] || key; }

function applyLocalization() {
  var html = document.documentElement;
  html.setAttribute('lang', currentLang);
  html.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n'), val = t(key);
    var childInput = el.querySelector('input[type="file"]');
    if (childInput) {
      el.childNodes.forEach(function(n) { if (n.nodeType === 3) n.textContent = ''; });
      el.insertBefore(document.createTextNode(val), childInput);
    } else { el.textContent = val; }
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
// NOISE
// ============================================================
var _nT = new Float32Array(512);
(function(){ for(var i=0;i<256;i++) _nT[i]=_nT[i+256]=Math.random(); })();
function noise2D(x,y) {
  var xi=Math.floor(x)&255,yi=Math.floor(y)&255,xf=x-Math.floor(x),yf=y-Math.floor(y);
  var u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=_nT[xi]+yi,b=_nT[xi+1]+yi;
  return _nT[a&255]*(1-u)*(1-v)+_nT[b&255]*u*(1-v)+_nT[(a+1)&255]*(1-u)*v+_nT[(b+1)&255]*u*v;
}

// ============================================================
// PALETTES
// ============================================================
var PALETTES = {
  mono:['#00ffc8','#00e0b0','#00c090','#00a070','#00ff99'],
  cool:['#00e5ff','#0080ff','#8000ff','#00ffc8','#4040ff'],
  warm:['#ff8800','#ff4400','#ffcc00','#ff0044','#ff6600'],
  neon:['#ff00ff','#00ffff','#ff0080','#00ff80','#8000ff'],
  ocean:['#006080','#00a8cc','#00e5ff','#0040a0','#40e0d0'],
  fire:['#ff2200','#ff6600','#ffaa00','#ffee00','#ff0044'],
  sunset:['#ff6b35','#ff8c42','#f9c74f','#ff4d6d','#c77dff'],
  forest:['#1a6b1a','#2ecc71','#00a86b','#228b22','#7fff00'],
};
function getPalColor(pal,i,n){var p=PALETTES[pal]||PALETTES.mono;return p[Math.floor(i/Math.max(n,1)*p.length)%p.length];}
function hexRgb(h){return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)};}

// ============================================================
// SNIPPETS + PRESETS
// ============================================================
var SNIPPETS = [
  {name:'Swirly Nebula',code:'sin(r*0.01-t)*cos(atan2(y-cy,x-cx)+t)*3'},
  {name:'Grid Wave',code:'sin(x*0.04+t)*sin(y*0.04+t)*2'},
  {name:'Sine Ocean',code:'sin(x*0.03+t*1.5)*2+cos(y*0.02-t)*1.5'},
  {name:'Crystal Lattice',code:'sin(x*0.05)*cos(y*0.05)*sin(t+r*0.005)*3'},
  {name:'DNA Helix',code:'sin(y*0.05+t)*3+cos(x*0.02)*noise(x*0.01,y*0.01+t)*2'},
  {name:'Spiral Arms',code:'sin(atan2(y-cy,x-cx)*4-r*0.008+t)*3'},
  {name:'Turbulent Flow',code:'noise(x*0.008+t*0.4,y*0.008+t*0.3)*6-3'},
  {name:'Electric Arc',code:'sin(x*0.03+noise(x*0.02,t)*4)*3+cos(y*0.02)*2'},
  {name:'Orbital Ring',code:'sin(r*0.015-t*2)*3*cos(atan2(y-cy,x-cx)+t*0.5)'},
  {name:'Flower Bloom',code:'sin(atan2(y-cy,x-cx)*6+t)*cos(r*0.01-t)*3'},
];

var PRESETS = [
  {name:'Nebula Storm',config:{particleCount:8000,speed:1.2,friction:0.97,turbulence:0.4,trailFade:0.06},
    layers:[{eq:'sin(r*0.01-t)*cos(atan2(y-cy,x-cx)+t)*3',color:'#00ffc8',palette:'cool',opacity:1,weight:1},
            {eq:'noise(x*0.008+t*0.4,y*0.008)*6-3',color:'#ff00ff',palette:'neon',opacity:0.7,weight:0.7}]},
  {name:'Ocean Pulse',config:{particleCount:6000,speed:0.8,friction:0.975,turbulence:0.2,trailFade:0.05},
    layers:[{eq:'sin(x*0.03+t*1.5)*2+cos(y*0.02-t)*1.5',color:'#00e5ff',palette:'ocean',opacity:1,weight:1}]},
  {name:'Fire Spiral',config:{particleCount:7000,speed:1.5,friction:0.965,turbulence:0.6,trailFade:0.1},
    layers:[{eq:'sin(atan2(y-cy,x-cx)*4-r*0.008+t)*3',color:'#ff4400',palette:'fire',opacity:1,weight:1},
            {eq:'cos(r*0.015-t*2)*3',color:'#ffaa00',palette:'warm',opacity:0.6,weight:0.5}]},
  {name:'Crystal Grid',config:{particleCount:5000,speed:0.7,friction:0.98,turbulence:0.1,trailFade:0.04},
    layers:[{eq:'sin(x*0.05)*cos(y*0.05)*sin(t+r*0.005)*3',color:'#8000ff',palette:'cool',opacity:1,weight:1}]},
  {name:'DNA Flow',config:{particleCount:9000,speed:1.0,friction:0.972,turbulence:0.35,trailFade:0.07},
    layers:[{eq:'sin(y*0.05+t)*3+cos(x*0.02)*noise(x*0.01,y*0.01+t)*2',color:'#00ffc8',palette:'forest',opacity:1,weight:1},
            {eq:'sin(atan2(y-cy,x-cx)*6+t)*cos(r*0.01-t)*3',color:'#ff00ff',palette:'neon',opacity:0.5,weight:0.4}]},
  {name:'Sunset Dream',config:{particleCount:6500,speed:0.9,friction:0.976,turbulence:0.25,trailFade:0.06},
    layers:[{eq:'sin(x*0.03+t)*sin(y*0.03+t)*2.5',color:'#ff6b35',palette:'sunset',opacity:1,weight:1}]},
];

// ============================================================
// ENGINE STATE — GLOBAL
// ============================================================
var ENG = {
  running:true,viewMode:'both',particles:[],layers:[],forceFields:[],obstacles:[],
  gameMode:null,paintCanvas:null,paintCtx:null,colorWarCanvas:null,colorWarCtx:null,
  audioData:{bass:0,mid:0,high:0,spectrum:[],bpm:0,beat:false,gain:1},
  mouse:{x:-9999,y:-9999,down:false,mode:'push'},
  time:0,lastTime:0,frameCount:0,fps:60,
  config:{particleCount:6000,speed:1.0,friction:0.97,turbulence:0.3,trailFade:0.08,
    motionBlur:false,glow:true,connections:false,connDist:60,symmetry:0,depth3D:false,
    trailShape:'line',mouseForce:100,ffPulse:false,pulseSpeed:1.0},
  mediaRecorder:null,recChunks:[],recStartTime:0,recTimerID:null,animID:null,focusedLayer:-1,
};
window.ENG = ENG;

var bgCan,flowCan,glowCan,connCan,bgCtx,flowCtx,glowCtx,connCtx,W=0,H=0;

// ============================================================
// INIT
// ============================================================
function initEngine2D() {
  try {
    bgCan=document.getElementById('bgCan');flowCan=document.getElementById('flowCan');
    glowCan=document.getElementById('glowCan');connCan=document.getElementById('connCan');
    if(!bgCan||!flowCan||!glowCan||!connCan) throw new Error('Canvas missing');
    bgCtx=bgCan.getContext('2d');flowCtx=flowCan.getContext('2d');
    glowCtx=glowCan.getContext('2d');connCtx=connCan.getContext('2d');
    resizeCanvases();
    window.addEventListener('resize',resizeCanvases);
    buildDefaultLayers();buildPanel();applyLocalization();
    bindTopBar();bindKeyboard();bindMouse();bindTouch();initAudioBars();
    applyPreset(PRESETS[0]);spawnParticles();
    ENG.lastTime=performance.now();loop();
    if(!localStorage.getItem('xoretex_help_seen')) showModal('helpModal');
  } catch(err) { reportError('engine2d init failed',err); }
}

function resizeCanvases() {
  W=window.innerWidth;H=window.innerHeight;
  [bgCan,flowCan,glowCan,connCan].forEach(function(c){if(c){c.width=W;c.height=H;}});
  if(ENG.paintCanvas){ENG.paintCanvas.width=W;ENG.paintCanvas.height=H;}
  if(ENG.colorWarCanvas){ENG.colorWarCanvas.width=W;ENG.colorWarCanvas.height=H;}
  drawBg();
}

function drawBg(){
  if(!bgCtx)return;bgCtx.fillStyle='#0a0a0f';bgCtx.fillRect(0,0,W,H);
  var g=bgCtx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.6);
  g.addColorStop(0,'rgba(0,60,40,0.12)');g.addColorStop(1,'rgba(0,0,0,0)');
  bgCtx.fillStyle=g;bgCtx.fillRect(0,0,W,H);
}

// ============================================================
// LAYERS
// ============================================================
function buildDefaultLayers(){ENG.layers=[createLayer('sin(r*0.01-t)*cos(atan2(y-cy,x-cx)+t)*3','#00ffc8','cool',1,1)];}
function createLayer(eq,color,pal,op,wt){
  return{id:Date.now()+Math.random(),eq:eq||'sin(x*0.02+t)*cos(y*0.02+t)*2',
    color:color||'#00ffc8',palette:pal||'mono',opacity:op!==undefined?op:1,
    weight:wt!==undefined?wt:1,enabled:true,fn:null,valid:true};
}
function compileFn(l){
  try{l.fn=new Function('x','y','t','r','cx','cy','PI','sin','cos','tan','atan2','sqrt','abs','noise','audio','return('+l.eq+');');l.valid=true;return true;}
  catch(e){l.fn=null;l.valid=false;return false;}
}
function evalLayer(l,x,y,t2){
  if(!l.fn||!l.enabled)return 0;
  try{var r=Math.sqrt((x-W/2)*(x-W/2)+(y-H/2)*(y-H/2));
    var v=l.fn(x,y,t2,r,W/2,H/2,Math.PI,Math.sin,Math.cos,Math.tan,Math.atan2,Math.sqrt,Math.abs,noise2D,ENG.audioData.bass);
    return isFinite(v)?v:0;}catch(e){return 0;}
}
function compileAll(){ENG.layers.forEach(function(l){compileFn(l);});}

// ============================================================
// PARTICLES
// ============================================================
function createP(li){
  var px=Math.random()*W,py=Math.random()*H,life=60+Math.random()*200;
  return{x:px,y:py,px:px,py:py,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,
    life:life,maxLife:life,mass:0.5+Math.random()*1.5,size:0.8+Math.random()*2.2,
    brightness:0.5+Math.random()*0.5,palIndex:Math.random(),depth:0.3+Math.random()*0.7,layerIndex:li};
}
function spawnParticles(){
  ENG.particles=[];var n=ENG.config.particleCount,nl=ENG.layers.length||1;
  for(var i=0;i<n;i++)ENG.particles.push(createP(i%nl));compileAll();
}
function resetP(p){
  p.x=Math.random()*W;p.y=Math.random()*H;p.px=p.x;p.py=p.y;
  p.vx=(Math.random()-0.5)*0.5;p.vy=(Math.random()-0.5)*0.5;
  var l=60+Math.random()*200;p.life=l;p.maxLife=l;p.palIndex=Math.random();p.depth=0.3+Math.random()*0.7;
}

// ============================================================
// PHYSICS
// ============================================================
function updateParticles(dt){
  var cfg=ENG.config,speed=cfg.speed*(1+ENG.audioData.bass*2),friction=cfg.friction,
    turb=cfg.turbulence,t2=ENG.time,mf=cfg.mouseForce,mx=ENG.mouse.x,my=ENG.mouse.y,
    mDown=ENG.mouse.down,mMode=ENG.mouse.mode,nl=ENG.layers.length,dt60=dt*60;

  for(var i=0,n=ENG.particles.length;i<n;i++){
    var p=ENG.particles[i];p.life-=dt60*0.5;
    if(p.life<=0){resetP(p);continue;}
    var layer=ENG.layers[p.layerIndex%nl];
    if(!layer||!layer.enabled){p.px=p.x;p.py=p.y;continue;}

    var angle=evalLayer(layer,p.x,p.y,t2)*layer.weight;
    var fa=0.04*speed/p.mass;
    p.vx+=Math.cos(angle)*fa;p.vy+=Math.sin(angle)*fa;

    if(turb>0){p.vx+=(Math.random()-0.5)*turb*0.1;p.vy+=(Math.random()-0.5)*turb*0.1;}

    for(var fi=0;fi<ENG.forceFields.length;fi++){
      var ff=ENG.forceFields[fi],dx=ff.x-p.x,dy=ff.y-p.y,d2=dx*dx+dy*dy;
      var str=ff.strength;if(cfg.ffPulse)str*=0.5+0.5*Math.sin(t2*cfg.pulseSpeed*2+fi);
      if(d2<ff.radius*ff.radius&&d2>1){var d=Math.sqrt(d2),f=str/(d*p.mass)*0.5;
        switch(ff.type){case'attract':p.vx+=dx/d*f;p.vy+=dy/d*f;break;case'repel':p.vx-=dx/d*f;p.vy-=dy/d*f;break;
          case'vortex':p.vx-=dy/d*f;p.vy+=dx/d*f;break;case'gravity':p.vx+=dx/d*f*0.5;p.vy+=dy/d*f*0.5+0.02;break;}}}

    if(mx>-9000){var dx2=mx-p.x,dy2=my-p.y,d2m=dx2*dx2+dy2*dy2;
      if(d2m<mf*mf&&d2m>1){var dm=Math.sqrt(d2m),fm=(mDown?2:0.5)*mf/(dm*p.mass*100);
        switch(mMode){case'push':p.vx-=dx2/dm*fm;p.vy-=dy2/dm*fm;break;case'attract':p.vx+=dx2/dm*fm;p.vy+=dy2/dm*fm;break;
          case'swirl':p.vx-=dy2/dm*fm;p.vy+=dx2/dm*fm;break;}}}

    if(ENG.gameMode==='sculptor')for(var oi=0;oi<ENG.obstacles.length;oi++){
      var ob=ENG.obstacles[oi],odx=p.x-ob.x,ody=p.y-ob.y,od2=odx*odx+ody*ody;
      if(od2<ob.r*ob.r&&od2>0){var od=Math.sqrt(od2);p.vx+=odx/od*2;p.vy+=ody/od*2;}}

    p.vx*=Math.pow(friction,dt60);p.vy*=Math.pow(friction,dt60);
    var spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy),maxS=4*speed;
    if(spd>maxS){p.vx=p.vx/spd*maxS;p.vy=p.vy/spd*maxS;}
    p.px=p.x;p.py=p.y;p.x+=p.vx*dt60;p.y+=p.vy*dt60;
    if(p.x<0||p.x>W||p.y<0||p.y>H){
      if(p.x<0)p.x=W;else if(p.x>W)p.x=0;if(p.y<0)p.y=H;else if(p.y>H)p.y=0;p.px=p.x;p.py=p.y;}
  }
}// ============================================================
// RENDER 2D
// ============================================================
function render2D(){
  if(!flowCtx)return;var cfg=ENG.config;
  flowCtx.globalAlpha=cfg.trailFade;flowCtx.globalCompositeOperation='destination-out';
  flowCtx.fillRect(0,0,W,H);flowCtx.globalCompositeOperation='source-over';flowCtx.globalAlpha=1;

  if(ENG.gameMode==='colorwar'&&ENG.colorWarCtx) renderColorWar();

  var nl=ENG.layers.length,focL=ENG.focusedLayer;
  for(var i=0,n=ENG.particles.length;i<n;i++){
    var p=ENG.particles[i],li=p.layerIndex%nl,layer=ENG.layers[li];
    if(!layer||!layer.enabled)continue;
    var lifeR=p.life/p.maxLife,alpha=lifeR*p.brightness*layer.opacity;
    if(focL>=0&&li!==focL)alpha*=0.08;if(alpha<0.005)continue;
    var pc=getPalColor(layer.palette,Math.floor(p.palIndex*100),100),rgb=hexRgb(pc);
    var gB=1+ENG.audioData.bass*0.5,dS=cfg.depth3D?(0.5+p.depth*0.5):1,sz=p.size*dS*gB;
    flowCtx.globalAlpha=alpha;
    var colStr='rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
    switch(cfg.trailShape){
      case'dot':flowCtx.fillStyle=colStr;flowCtx.beginPath();flowCtx.arc(p.x,p.y,sz*0.8,0,Math.PI*2);flowCtx.fill();break;
      case'triangle':flowCtx.fillStyle=colStr;flowCtx.beginPath();flowCtx.moveTo(p.x,p.y-sz);
        flowCtx.lineTo(p.x-sz*0.8,p.y+sz*0.5);flowCtx.lineTo(p.x+sz*0.8,p.y+sz*0.5);flowCtx.closePath();flowCtx.fill();break;
      case'glow-dot':var grd=flowCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*3);
        grd.addColorStop(0,'rgba('+rgb.r+','+rgb.g+','+rgb.b+',1)');grd.addColorStop(1,'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0)');
        flowCtx.fillStyle=grd;flowCtx.beginPath();flowCtx.arc(p.x,p.y,sz*3,0,Math.PI*2);flowCtx.fill();break;
      default:var tdx=p.x-p.px,tdy=p.y-p.py;if(Math.sqrt(tdx*tdx+tdy*tdy)<0.1)break;
        flowCtx.strokeStyle=colStr;flowCtx.lineWidth=sz*0.8;flowCtx.beginPath();
        flowCtx.moveTo(p.px,p.py);flowCtx.lineTo(p.x,p.y);flowCtx.stroke();break;
    }
    // symmetry
    var sym=cfg.symmetry;
    if(sym>=2){var cx2=W/2,cy2=H/2,rdx=p.x-cx2,rdy=p.y-cy2,step=Math.PI*2/sym;
      for(var s=1;s<sym;s++){var ang=step*s,cosA=Math.cos(ang),sinA=Math.sin(ang);
        var nx=cx2+rdx*cosA-rdy*sinA,ny=cy2+rdx*sinA+rdy*cosA;
        flowCtx.fillStyle=colStr;flowCtx.beginPath();flowCtx.arc(nx,ny,sz*0.8,0,Math.PI*2);flowCtx.fill();}}
    // painter
    if(ENG.gameMode==='painter'&&ENG.paintCtx){
      ENG.paintCtx.globalAlpha=alpha*0.3;ENG.paintCtx.fillStyle=colStr;
      ENG.paintCtx.beginPath();ENG.paintCtx.arc(p.x,p.y,sz*1.5,0,Math.PI*2);ENG.paintCtx.fill();}
  }
  flowCtx.globalAlpha=1;
  if(cfg.connections)renderConn();
  if(cfg.glow)renderGlow();
}

function renderConn(){
  if(!connCtx)return;var cd=ENG.config.connDist,cd2=cd*cd;connCtx.clearRect(0,0,W,H);
  var ps=ENG.particles,nl=ENG.layers.length,stride=Math.max(1,Math.floor(ps.length/500));
  for(var i=0;i<ps.length;i+=stride){var pi=ps[i],lI=ENG.layers[pi.layerIndex%nl];
    if(!lI||!lI.enabled)continue;var rgb=hexRgb(getPalColor(lI.palette,Math.floor(pi.palIndex*100),100));
    for(var j=i+stride;j<Math.min(i+20*stride,ps.length);j+=stride){var pj=ps[j];
      var ddx=pi.x-pj.x,ddy=pi.y-pj.y,dd2=ddx*ddx+ddy*ddy;
      if(dd2<cd2){connCtx.globalAlpha=(1-dd2/cd2)*0.3;connCtx.strokeStyle='rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
        connCtx.lineWidth=0.5;connCtx.beginPath();connCtx.moveTo(pi.x,pi.y);connCtx.lineTo(pj.x,pj.y);connCtx.stroke();}}}
  connCtx.globalAlpha=1;
}

function renderGlow(){
  if(!glowCtx)return;glowCtx.clearRect(0,0,W,H);
  glowCtx.globalAlpha=0.18+ENG.audioData.bass*0.1;glowCtx.filter='blur(8px)';
  glowCtx.drawImage(flowCan,0,0);glowCtx.filter='none';glowCtx.globalAlpha=1;
}

// ============================================================
// MAIN LOOP
// ============================================================
function loop(){
  if(!ENG.running){ENG.animID=requestAnimationFrame(loop);return;}
  var now=performance.now(),dt=Math.min((now-ENG.lastTime)/1000,0.05);
  ENG.lastTime=now;ENG.time+=dt;ENG.frameCount++;
  if(ENG.frameCount%30===0){ENG.fps=Math.round(1/dt);
    var fpsDom=document.getElementById('fpsDisplay');if(fpsDom)fpsDom.textContent='FPS: '+ENG.fps;}
  updateAudio();
  if(ENG.viewMode!=='3d'){updateParticles(dt);updateGameMode(dt);render2D();
    if(ENG.gameMode==='painter'&&ENG.paintCanvas&&flowCtx){flowCtx.globalAlpha=1;flowCtx.drawImage(ENG.paintCanvas,0,0);}}
  ENG.animID=requestAnimationFrame(loop);
}

// ============================================================
// AUDIO
// ============================================================
var audioCtx=null,analyser=null,audioSource=null,audioElement=null,micStream=null;
var beatHistory=[],lastBeat=0,bpmSamples=[];

function initAudioBars(){var w=document.getElementById('audioBarWrap');if(!w)return;w.innerHTML='';
  for(var i=0;i<32;i++){var b=document.createElement('div');b.className='aBar';b.style.height='1px';b.id='aBar_'+i;w.appendChild(b);}}

function ensureAudioCtx(){if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  analyser=audioCtx.createAnalyser();analyser.fftSize=64;analyser.smoothingTimeConstant=0.8;}}

function startMic(){try{ensureAudioCtx();navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
  micStream=stream;if(audioSource)audioSource.disconnect();audioSource=audioCtx.createMediaStreamSource(stream);
  audioSource.connect(analyser);showToast(t('microphone'));}).catch(function(err){showToast('Mic: '+err.message);});}catch(e){reportError('mic',e);}}

function stopAudio(){if(micStream){micStream.getTracks().forEach(function(tr){tr.stop();});micStream=null;}
  if(audioSource){try{audioSource.disconnect();}catch(e){}audioSource=null;}
  if(audioElement){audioElement.pause();audioElement=null;}
  ENG.audioData={bass:0,mid:0,high:0,spectrum:[],bpm:0,beat:false,gain:ENG.audioData.gain};showToast(t('stopAudio'));}

function startAudioFile(file){try{ensureAudioCtx();if(audioElement)audioElement.pause();
  audioElement=new Audio();audioElement.src=URL.createObjectURL(file);audioElement.loop=true;
  if(audioSource)audioSource.disconnect();audioSource=audioCtx.createMediaElementSource(audioElement);
  audioSource.connect(analyser);analyser.connect(audioCtx.destination);audioElement.play();
  showToast(file.name);}catch(e){reportError('audio file',e);}}

function updateAudio(){if(!analyser)return;var buf=new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buf);var gain=ENG.audioData.gain,spec=[];
  for(var i=0;i<Math.min(buf.length,32);i++)spec.push(Math.min(1,(buf[i]/255)*gain));
  ENG.audioData.spectrum=spec;
  var bass=0,mid=0,high=0;
  for(var b=0;b<4&&b<spec.length;b++)bass+=spec[b];bass/=4;
  for(var m=4;m<12&&m<spec.length;m++)mid+=spec[m];mid/=8;
  for(var h=12;h<24&&h<spec.length;h++)high+=spec[h];high/=12;
  ENG.audioData.bass=bass;ENG.audioData.mid=mid;ENG.audioData.high=high;
  beatHistory.push(bass);if(beatHistory.length>43)beatHistory.shift();
  var avg=0;for(var a=0;a<beatHistory.length;a++)avg+=beatHistory[a];avg/=beatHistory.length;
  var now2=ENG.time;
  if(bass>avg*1.5&&bass>0.3&&now2-lastBeat>0.25){ENG.audioData.beat=true;
    var interval=now2-lastBeat;if(interval<2){bpmSamples.push(60/interval);if(bpmSamples.length>8)bpmSamples.shift();
      var bs=0;for(var bi=0;bi<bpmSamples.length;bi++)bs+=bpmSamples[bi];ENG.audioData.bpm=Math.round(bs/bpmSamples.length);}
    lastBeat=now2;}else{ENG.audioData.beat=false;}
  for(var bi2=0;bi2<32;bi2++){var barEl=document.getElementById('aBar_'+bi2);if(barEl)barEl.style.height=Math.max(1,(spec[bi2]||0)*36)+'px';}
  var vB=document.getElementById('valBass'),vM=document.getElementById('valMid'),vH=document.getElementById('valHigh');
  var vBPM=document.getElementById('valBPM'),vBeat=document.getElementById('valBeat');
  if(vB)vB.textContent=bass.toFixed(2);if(vM)vM.textContent=mid.toFixed(2);if(vH)vH.textContent=high.toFixed(2);
  if(vBPM)vBPM.textContent=ENG.audioData.bpm||'--';if(vBeat)vBeat.textContent=ENG.audioData.beat?'\u25CF':'\u2014';
}

// ============================================================
// FORCE FIELDS
// ============================================================
var FF_COLORS={attract:'#00ffc8',repel:'#ff4060',vortex:'#ff00ff',gravity:'#ffb800'};
function addForceField(type,x,y){
  var ff={id:Date.now()+Math.random(),type:type||'attract',x:x!==undefined?x:W/2,y:y!==undefined?y:H/2,
    strength:60,radius:180,color:FF_COLORS[type]||'#00ffc8',markerEl:null};
  ENG.forceFields.push(ff);createFFMarker(ff);buildFFList();return ff;
}
function createFFMarker(ff){
  var layer=document.getElementById('forceFieldLayer');if(!layer)return;if(ff.markerEl)ff.markerEl.remove();
  var el=document.createElement('div');
  el.style.cssText='position:absolute;width:32px;height:32px;border-radius:50%;border:2px solid '+ff.color+
    ';background:'+ff.color+'22;box-shadow:0 0 14px '+ff.color+';cursor:move;transform:translate(-50%,-50%);'+
    'display:flex;align-items:center;justify-content:center;font-size:14px;pointer-events:auto;'+
    'left:'+ff.x+'px;top:'+ff.y+'px;z-index:6;-webkit-tap-highlight-color:transparent;';
  el.textContent={attract:'\u2295',repel:'\u2296',vortex:'\u229B',gravity:'\u2295'}[ff.type]||'\u25CF';
  var dragging=false,ox=0,oy=0;
  el.addEventListener('mousedown',function(e){dragging=true;ox=e.clientX-ff.x;oy=e.clientY-ff.y;e.stopPropagation();});
  window.addEventListener('mousemove',function(e){if(!dragging)return;ff.x=e.clientX-ox;ff.y=e.clientY-oy;
    el.style.left=ff.x+'px';el.style.top=ff.y+'px';});
  window.addEventListener('mouseup',function(){dragging=false;});
  el.addEventListener('touchstart',function(e){dragging=true;var t3=e.touches[0];ox=t3.clientX-ff.x;oy=t3.clientY-ff.y;e.preventDefault();},{passive:false});
  el.addEventListener('touchmove',function(e){if(!dragging)return;var t3=e.touches[0];ff.x=t3.clientX-ox;ff.y=t3.clientY-oy;
    el.style.left=ff.x+'px';el.style.top=ff.y+'px';});
  el.addEventListener('touchend',function(){dragging=false;});
  layer.appendChild(el);ff.markerEl=el;
}
function removeForceField(id){var idx=-1;for(var i=0;i<ENG.forceFields.length;i++)if(ENG.forceFields[i].id===id){idx=i;break;}
  if(idx<0)return;var ff=ENG.forceFields[idx];if(ff.markerEl)ff.markerEl.remove();ENG.forceFields.splice(idx,1);buildFFList();}
function buildFFList(){var list=document.getElementById('ffList');if(!list)return;list.innerHTML='';
  ENG.forceFields.forEach(function(ff){var row=document.createElement('div');row.className='ffItem';
    var dot=document.createElement('div');dot.className='ffDot';dot.style.background=ff.color;dot.style.boxShadow='0 0 6px '+ff.color;
    var label=document.createElement('span');label.textContent=ff.type;label.style.flex='1';
    var strS=document.createElement('input');strS.type='range';strS.min='10';strS.max='200';strS.value=ff.strength;strS.style.width='60px';
    strS.addEventListener('input',function(){ff.strength=parseFloat(strS.value);});
    var radS=document.createElement('input');radS.type='range';radS.min='40';radS.max='600';radS.value=ff.radius;radS.style.width='60px';
    radS.addEventListener('input',function(){ff.radius=parseFloat(radS.value);});
    var rm=document.createElement('button');rm.className='pBtn danger';rm.textContent='\u2715';rm.style.padding='2px 6px';
    (function(fid){rm.addEventListener('click',function(){removeForceField(fid);});})(ff.id);
    row.appendChild(dot);row.appendChild(label);row.appendChild(strS);row.appendChild(radS);row.appendChild(rm);list.appendChild(row);});}

// ============================================================
// GAME MODES
// ============================================================
function startGameMode(mode){exitGameMode();ENG.gameMode=mode;
  var hud=document.getElementById('gameHUD'),hudT=document.getElementById('gameHUDTitle'),exitBtn=document.getElementById('btnExitGame');
  if(hud)hud.style.display='block';if(exitBtn)exitBtn.style.display='inline-flex';
  switch(mode){
    case'painter':ENG.paintCanvas=document.createElement('canvas');ENG.paintCanvas.width=W;ENG.paintCanvas.height=H;
      ENG.paintCtx=ENG.paintCanvas.getContext('2d');if(hudT)hudT.textContent=t('painter');ENG.mouse.mode='paint';break;
    case'sculptor':ENG.obstacles=[];if(hudT)hudT.textContent=t('sculptor');renderObstacles();break;
    case'battle':if(ENG.layers.length<2){var l=createLayer('noise(x*0.01+t,y*0.01)*6-3','#ff00ff','neon',0.8,0.8);
      compileFn(l);ENG.layers.push(l);buildLayerCards();}if(hudT)hudT.textContent=t('battle');break;
    case'colorwar':ENG.colorWarCanvas=document.createElement('canvas');ENG.colorWarCanvas.width=W;ENG.colorWarCanvas.height=H;
      ENG.colorWarCtx=ENG.colorWarCanvas.getContext('2d');if(hudT)hudT.textContent=t('colorWar');break;
  }}
function exitGameMode(){ENG.gameMode=null;ENG.paintCanvas=null;ENG.paintCtx=null;ENG.colorWarCanvas=null;ENG.colorWarCtx=null;
  ENG.obstacles=[];var hud=document.getElementById('gameHUD'),exitBtn=document.getElementById('btnExitGame');
  if(hud)hud.style.display='none';if(exitBtn)exitBtn.style.display='none';
  var obsL=document.getElementById('obstacleLayer');if(obsL)obsL.innerHTML='';
  ENG.mouse.mode=document.getElementById('selMouseMode')?document.getElementById('selMouseMode').value:'push';
  // stop cube fight if running
  if(window.stopCubeFight)window.stopCubeFight();
}
function updateGameMode(dt){if(!ENG.gameMode)return;
  var hudI=document.getElementById('gameHUDInfo'),hudBar=document.getElementById('gameHUDBarFill');
  switch(ENG.gameMode){
    case'battle':if(ENG.layers.length<2)break;var c0=0,c1=0,nl=ENG.layers.length;
      for(var i=0;i<ENG.particles.length;i++){if(ENG.particles[i].layerIndex%nl===0)c0++;else c1++;}
      var total=c0+c1||1,pct0=Math.round(c0/total*100);
      if(hudI)hudI.textContent='Layer 1: '+pct0+'% vs Layer 2: '+(100-pct0)+'%';
      if(hudBar)hudBar.style.width=pct0+'%';break;
    case'colorwar':updateColorWar();break;
    case'sculptor':if(hudI)hudI.textContent='Obstacles: '+ENG.obstacles.length+' \u2014 Tap to place';break;
    case'painter':if(hudI)hudI.textContent='Painting... move to create trails';break;
  }}
function updateColorWar(){if(!ENG.colorWarCtx)return;var nl=ENG.layers.length;if(nl<1)return;
  for(var i=0;i<ENG.particles.length;i+=4){var p=ENG.particles[i],li=p.layerIndex%nl,layer=ENG.layers[li];
    if(!layer||!layer.enabled)continue;var rgb=hexRgb(getPalColor(layer.palette,Math.floor(p.palIndex*100),100));
    var r2=20+ENG.audioData.bass*10;var grd=ENG.colorWarCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,r2);
    grd.addColorStop(0,'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.04)');grd.addColorStop(1,'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0)');
    ENG.colorWarCtx.fillStyle=grd;ENG.colorWarCtx.beginPath();ENG.colorWarCtx.arc(p.x,p.y,r2,0,Math.PI*2);ENG.colorWarCtx.fill();}}
function renderColorWar(){if(!ENG.colorWarCanvas||!flowCtx)return;flowCtx.globalAlpha=0.35;flowCtx.drawImage(ENG.colorWarCanvas,0,0);flowCtx.globalAlpha=1;}
function renderObstacles(){var layer=document.getElementById('obstacleLayer');if(!layer)return;layer.innerHTML='';
  ENG.obstacles.forEach(function(ob){var el=document.createElement('div');
    el.style.cssText='position:absolute;left:'+(ob.x-ob.r)+'px;top:'+(ob.y-ob.r)+'px;width:'+(ob.r*2)+'px;height:'+(ob.r*2)+
      'px;border-radius:50%;background:rgba(255,180,0,0.18);border:1px solid rgba(255,180,0,0.5);pointer-events:none;';
    layer.appendChild(el);});}
function placeSculptorOb(x,y){ENG.obstacles.push({x:x,y:y,r:24+Math.random()*20});renderObstacles();}

// ============================================================
// EXPORT
// ============================================================
function exportScreenshot(){try{var off=document.createElement('canvas');off.width=W;off.height=H;var c2=off.getContext('2d');
  c2.drawImage(bgCan,0,0);c2.drawImage(flowCan,0,0);if(ENG.config.glow)c2.drawImage(glowCan,0,0);
  var cubeCan=document.getElementById('cubeCan');if(cubeCan&&ENG.viewMode!=='2d')try{c2.drawImage(cubeCan,0,0);}catch(e){}
  var link=document.createElement('a');link.download='xoretex_'+Date.now()+'.png';link.href=off.toDataURL('image/png');link.click();
  showToast(t('toastScreenshot'));}catch(e){reportError('screenshot',e);}}

function export4K(){try{var off=document.createElement('canvas');off.width=3840;off.height=2160;var c2=off.getContext('2d');
  c2.fillStyle='#0a0a0f';c2.fillRect(0,0,3840,2160);c2.drawImage(bgCan,0,0,3840,2160);c2.drawImage(flowCan,0,0,3840,2160);
  var link=document.createElement('a');link.download='xoretex_4k_'+Date.now()+'.png';link.href=off.toDataURL('image/png');link.click();
  showToast(t('toast4K'));}catch(e){reportError('4K',e);}}

function exportSVG(){try{var sample=ENG.particles.slice(0,600),nl=ENG.layers.length,lines=[];
  sample.forEach(function(p){var li=p.layerIndex%nl,layer=ENG.layers[li];if(!layer)return;
    var color=getPalColor(layer.palette,Math.floor(p.palIndex*100),100);
    var dx=p.x-p.px,dy=p.y-p.py;
    if(Math.abs(dx)<0.5&&Math.abs(dy)<0.5)lines.push('<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="1" fill="'+color+'"/>');
    else lines.push('<line x1="'+p.px.toFixed(1)+'" y1="'+p.py.toFixed(1)+'" x2="'+p.x.toFixed(1)+'" y2="'+p.y.toFixed(1)+'" stroke="'+color+'" stroke-width="1"/>');});
  var svg='<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" style="background:#0a0a0f">\n'+lines.join('\n')+'\n</svg>';
  document.getElementById('svgOutput').textContent=svg;showModal('svgModal');window._svgCache=svg;}catch(e){reportError('SVG',e);}}

function exportGLSL(){try{var eq=ENG.layers[0]?ENG.layers[0].eq:'sin(x*0.02+t)';
  var glsl='// Xoretex GLSL\nprecision mediump float;\nuniform float iTime;\nuniform vec2 iResolution;\n\nvoid main(){\n  vec2 uv=gl_FragCoord.xy;\n  float t=iTime,x=uv.x,y=uv.y;\n  float cx=iResolution.x*0.5,cy=iResolution.y*0.5;\n  float r=length(uv-vec2(cx,cy));\n  // '+eq+'\n  float angle=sin(x*0.02+t)*cos(y*0.02+t)*2.0;\n  float i=0.5+0.5*sin(dot(uv*0.01,vec2(cos(angle),sin(angle)))*6.0+t);\n  gl_FragColor=vec4(0.0,i,i*0.7,1.0);\n}';
  document.getElementById('glslOutput').textContent=glsl;showModal('glslModal');window._glslCache=glsl;}catch(e){reportError('GLSL',e);}}

function saveConfig(){try{var cfg={version:'1.0',language:currentLang,viewMode:ENG.viewMode,config:ENG.config,
  layers:ENG.layers.map(function(l){return{eq:l.eq,color:l.color,palette:l.palette,opacity:l.opacity,weight:l.weight,enabled:l.enabled};}),
  forceFields:ENG.forceFields.map(function(f){return{type:f.type,x:f.x,y:f.y,strength:f.strength,radius:f.radius};})};
  var blob=new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'});var link=document.createElement('a');
  link.download='xoretex_'+Date.now()+'.json';link.href=URL.createObjectURL(blob);link.click();showToast(t('toastSaved'));}catch(e){reportError('save',e);}}

function loadConfig(file){var reader=new FileReader();reader.onload=function(ev){try{var cfg=JSON.parse(ev.target.result);
  if(cfg.language){currentLang=cfg.language;localStorage.setItem('xoretex_lang',currentLang);}
  if(cfg.config)Object.assign(ENG.config,cfg.config);
  if(cfg.layers){ENG.layers=cfg.layers.map(function(l){var layer=createLayer(l.eq,l.color,l.palette,l.opacity,l.weight);layer.enabled=l.enabled!==undefined?l.enabled:true;compileFn(layer);return layer;});}
  if(cfg.forceFields){ENG.forceFields.forEach(function(f){if(f.markerEl)f.markerEl.remove();});ENG.forceFields=[];cfg.forceFields.forEach(function(f){addForceField(f.type,f.x,f.y);});}
  if(cfg.viewMode)setViewMode(cfg.viewMode);applyLocalization();buildLayerCards();syncControls();spawnParticles();
  showToast(t('toastLoaded'));}catch(e){reportError('load',e);}};reader.readAsText(file);}

// RECORDING
function startRec(){try{if(ENG.mediaRecorder)stopRec();var stream=flowCan.captureStream(30);ENG.recChunks=[];
  var mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  ENG.mediaRecorder=new MediaRecorder(stream,{mimeType:mime});
  ENG.mediaRecorder.ondataavailable=function(e){if(e.data.size>0)ENG.recChunks.push(e.data);};
  ENG.mediaRecorder.onstop=function(){var blob=new Blob(ENG.recChunks,{type:'video/webm'});var link=document.createElement('a');
    link.download='xoretex_'+Date.now()+'.webm';link.href=URL.createObjectURL(blob);link.click();ENG.recChunks=[];};
  ENG.mediaRecorder.start(100);ENG.recStartTime=Date.now();
  document.getElementById('recBar')&&document.getElementById('recBar').classList.add('show');
  document.getElementById('btnRecord')&&document.getElementById('btnRecord').classList.add('active');
  ENG.recTimerID=setInterval(function(){var el=Math.floor((Date.now()-ENG.recStartTime)/1000);
    var recTime=document.getElementById('recTime');if(recTime)recTime.textContent=String(Math.floor(el/60)).padStart(2,'0')+':'+String(el%60).padStart(2,'0');
    var fill=document.getElementById('recProgressFill');if(fill)fill.style.width=Math.min(100,el/120*100)+'%';},1000);
  showToast(t('toastRecStart'));}catch(e){reportError('rec',e);}}
function stopRec(){if(ENG.mediaRecorder&&ENG.mediaRecorder.state!=='inactive')ENG.mediaRecorder.stop();
  if(ENG.recTimerID){clearInterval(ENG.recTimerID);ENG.recTimerID=null;}
  document.getElementById('recBar')&&document.getElementById('recBar').classList.remove('show');
  document.getElementById('btnRecord')&&document.getElementById('btnRecord').classList.remove('active');
  ENG.mediaRecorder=null;showToast(t('toastRecStop'));}

// ============================================================
// VIEW MODE
// ============================================================
function setViewMode(mode){ENG.viewMode=mode;
  document.querySelectorAll('.modeTab').forEach(function(b){b.classList.toggle('active',b.dataset.mode===mode);});
  var fC=document.getElementById('flowCan'),gC=document.getElementById('glowCan'),coC=document.getElementById('connCan'),cuC=document.getElementById('cubeCan');
  if(mode==='3d'){if(fC)fC.style.display='none';if(gC)gC.style.display='none';if(coC)coC.style.display='none';
    if(cuC){cuC.style.display='';cuC.style.pointerEvents='auto';}if(flowCtx)flowCtx.clearRect(0,0,W,H);if(glowCtx)glowCtx.clearRect(0,0,W,H);if(connCtx)connCtx.clearRect(0,0,W,H);
  }else if(mode==='2d'){if(fC){fC.style.display='';fC.style.pointerEvents='auto';}if(gC)gC.style.display='';if(coC)coC.style.display='';
    if(cuC){cuC.style.display='none';cuC.style.pointerEvents='none';}
  }else{if(fC){fC.style.display='';fC.style.pointerEvents='none';}if(gC)gC.style.display='';if(coC)coC.style.display='';
    if(cuC){cuC.style.display='';cuC.style.pointerEvents='auto';}}
  if(window.setCubeVisible)window.setCubeVisible(mode!=='2d');}

// ============================================================
// PANEL
// ============================================================
function buildPanel(){buildPresetBtns();buildSnippets();buildLayerCards();buildFFList();bindPanelControls();bindSectionToggles();}
function buildPresetBtns(){var c=document.getElementById('presetBtns');if(!c)return;c.innerHTML='';
  PRESETS.forEach(function(p,i){var b=document.createElement('button');b.className='pBtn';b.textContent=p.name;
    b.addEventListener('click',function(){applyPreset(PRESETS[i]);});c.appendChild(b);});}
function applyPreset(p){if(!p)return;if(p.config)Object.assign(ENG.config,p.config);
  if(p.layers){ENG.layers=p.layers.map(function(l){var layer=createLayer(l.eq,l.color,l.palette,l.opacity,l.weight);compileFn(layer);return layer;});}
  syncControls();buildLayerCards();spawnParticles();showToast('Preset: '+p.name);}
function buildSnippets(){var g=document.getElementById('snippetGrid');if(!g)return;g.innerHTML='';
  SNIPPETS.forEach(function(s){var b=document.createElement('button');b.className='pBtn snippetBtn';b.textContent=s.name;b.title=s.code;
    b.addEventListener('click',function(){var ta=document.getElementById('formulaInput');if(ta)ta.value=s.code;applyFormulaToLayer(s.code);});g.appendChild(b);});}

function buildLayerCards(){var c=document.getElementById('layerCards');if(!c)return;c.innerHTML='';
  ENG.layers.forEach(function(layer,idx){
    var card=document.createElement('div');card.className='layerCard'+(ENG.focusedLayer===idx?' focused':'');
    var header=document.createElement('div');header.className='layerTitle';header.style.color=layer.color;header.textContent='Layer '+(idx+1);
    (function(i){header.addEventListener('click',function(){ENG.focusedLayer=ENG.focusedLayer===i?-1:i;buildLayerCards();});})(idx);

    var enRow=document.createElement('label');enRow.className='pCheck';
    var enChk=document.createElement('input');enChk.type='checkbox';enChk.checked=layer.enabled;
    enChk.addEventListener('change',function(){layer.enabled=enChk.checked;});
    enRow.appendChild(enChk);var enSp=document.createElement('span');enSp.textContent='Enabled';enRow.appendChild(enSp);

    var eqTa=document.createElement('textarea');eqTa.className='pTextarea';eqTa.value=layer.eq;eqTa.rows=2;eqTa.spellcheck=false;
    var eqInd=document.createElement('span');eqInd.className='indicator '+(layer.valid?'valid':'invalid');
    eqTa.addEventListener('input',function(){layer.eq=eqTa.value;var ok=compileFn(layer);eqInd.className='indicator '+(ok?'valid':'invalid');});

    var colPick=document.createElement('input');colPick.type='color';colPick.className='pColor';colPick.value=layer.color;
    colPick.addEventListener('input',function(){layer.color=colPick.value;buildLayerCards();});

    var palSel=document.createElement('select');palSel.className='pSelect';
    Object.keys(PALETTES).forEach(function(pk){var op=document.createElement('option');op.value=pk;op.textContent=pk;if(pk===layer.palette)op.selected=true;palSel.appendChild(op);});
    palSel.addEventListener('change',function(){layer.palette=palSel.value;});

    var opSlider=document.createElement('input');opSlider.type='range';opSlider.className='pSlider';opSlider.min='0';opSlider.max='1';opSlider.step='0.05';opSlider.value=layer.opacity;
    var opVal=document.createElement('span');opVal.className='pVal';opVal.textContent=layer.opacity.toFixed(2);
    opSlider.addEventListener('input',function(){layer.opacity=parseFloat(opSlider.value);opVal.textContent=layer.opacity.toFixed(2);});

    var wtSlider=document.createElement('input');wtSlider.type='range';wtSlider.className='pSlider';wtSlider.min='0.1';wtSlider.max='3';wtSlider.step='0.1';wtSlider.value=layer.weight;
    var wtVal=document.createElement('span');wtVal.className='pVal';wtVal.textContent=layer.weight.toFixed(1);
    wtSlider.addEventListener('input',function(){layer.weight=parseFloat(wtSlider.value);wtVal.textContent=layer.weight.toFixed(1);});

    var rmBtn=document.createElement('button');rmBtn.className='pBtn danger';rmBtn.textContent=t('removeLayer');
    (function(i2){rmBtn.addEventListener('click',function(){ENG.layers.splice(i2,1);if(ENG.focusedLayer>=ENG.layers.length)ENG.focusedLayer=-1;buildLayerCards();reassignLayers();});})(idx);

    card.appendChild(header);card.appendChild(enRow);card.appendChild(eqTa);card.appendChild(eqInd);
    card.appendChild(colPick);card.appendChild(palSel);
    var opR=document.createElement('div');opR.className='pRow';opR.appendChild(opSlider);opR.appendChild(opVal);card.appendChild(opR);
    var wtR=document.createElement('div');wtR.className='pRow';wtR.appendChild(wtSlider);wtR.appendChild(wtVal);card.appendChild(wtR);
    card.appendChild(rmBtn);c.appendChild(card);
  });}
function reassignLayers(){var nl=ENG.layers.length||1;ENG.particles.forEach(function(p,i){p.layerIndex=i%nl;});}

function bindPanelControls(){
  var btnApply=document.getElementById('btnApplyFormula');
  if(btnApply)btnApply.addEventListener('click',function(){applyFormulaToLayer((document.getElementById('formulaInput')||{}).value||'');});
  var fInput=document.getElementById('formulaInput');
  if(fInput)fInput.addEventListener('input',function(){var ok=validateFormula(fInput.value);
    var ind=document.getElementById('formulaIndicator'),sta=document.getElementById('formulaStatus');
    if(ind)ind.className='indicator '+(ok?'valid':'invalid');if(sta)sta.textContent=ok?t('valid'):t('invalid');});

  function bSlider(id,vid,obj,key,dec){var el=document.getElementById(id),ve=document.getElementById(vid);
    if(el)el.addEventListener('input',function(){var v=parseFloat(el.value);obj[key]=v;
      if(ve)ve.textContent=dec===0?String(v):v.toFixed(dec||2);if(key==='particleCount')spawnParticles();});}
  bSlider('sliderCount','valCount',ENG.config,'particleCount',0);bSlider('sliderSpeed','valSpeed',ENG.config,'speed',1);
  bSlider('sliderFriction','valFriction',ENG.config,'friction',3);bSlider('sliderTurbulence','valTurbulence',ENG.config,'turbulence',2);
  bSlider('sliderMouseForce','valMouseForce',ENG.config,'mouseForce',0);bSlider('sliderTrailFade','valTrailFade',ENG.config,'trailFade',2);
  bSlider('sliderConnDist','valConnDist',ENG.config,'connDist',0);bSlider('sliderPulseSpeed','valPulseSpeed',ENG.config,'pulseSpeed',1);
  bSlider('sliderAudioGain','valAudioGain',ENG.audioData,'gain',1);

  function bChk(id,obj,key){var el=document.getElementById(id);if(el)el.addEventListener('change',function(){obj[key]=el.checked;});}
  bChk('chkMotionBlur',ENG.config,'motionBlur');bChk('chkGlow',ENG.config,'glow');bChk('chkConnections',ENG.config,'connections');
  bChk('chkDepth3D',ENG.config,'depth3D');bChk('chkFFPulse',ENG.config,'ffPulse');

  var selSym=document.getElementById('selSymmetry');if(selSym)selSym.addEventListener('change',function(){ENG.config.symmetry=parseInt(selSym.value);});
  var selTrail=document.getElementById('selTrailShape');if(selTrail)selTrail.addEventListener('change',function(){ENG.config.trailShape=selTrail.value;});
  var selMouse=document.getElementById('selMouseMode');if(selMouse)selMouse.addEventListener('change',function(){ENG.mouse.mode=selMouse.value;});

  document.getElementById('btnAddLayer')&&document.getElementById('btnAddLayer').addEventListener('click',function(){
    var l=createLayer('sin(x*0.02+t)*cos(y*0.02+t)*2','#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0'),'neon',1,1);
    compileFn(l);ENG.layers.push(l);buildLayerCards();reassignLayers();});
  document.getElementById('btnAddFF')&&document.getElementById('btnAddFF').addEventListener('click',function(){addForceField((document.getElementById('ffTypeSelect')||{}).value||'attract');});
  document.getElementById('btnMic')&&document.getElementById('btnMic').addEventListener('click',startMic);
  document.getElementById('btnAudioStop')&&document.getElementById('btnAudioStop').addEventListener('click',stopAudio);
  document.getElementById('audioFileInput')&&document.getElementById('audioFileInput').addEventListener('change',function(e){if(e.target.files[0])startAudioFile(e.target.files[0]);});

  document.querySelectorAll('[data-game]').forEach(function(b){b.addEventListener('click',function(){startGameMode(b.dataset.game);});});
  document.getElementById('btnExitGame')&&document.getElementById('btnExitGame').addEventListener('click',exitGameMode);
  document.getElementById('btnExport4K')&&document.getElementById('btnExport4K').addEventListener('click',export4K);
  document.getElementById('btnExportSVG')&&document.getElementById('btnExportSVG').addEventListener('click',exportSVG);
  document.getElementById('btnExportGLSL')&&document.getElementById('btnExportGLSL').addEventListener('click',exportGLSL);
  document.getElementById('btnSaveConfig')&&document.getElementById('btnSaveConfig').addEventListener('click',saveConfig);
  document.getElementById('loadConfigInput')&&document.getElementById('loadConfigInput').addEventListener('change',function(e){if(e.target.files[0])loadConfig(e.target.files[0]);});

  document.getElementById('btnSvgCopy')&&document.getElementById('btnSvgCopy').addEventListener('click',function(){if(window._svgCache)navigator.clipboard.writeText(window._svgCache).then(function(){showToast(t('toastCopied'));});});
  document.getElementById('btnSvgDownload')&&document.getElementById('btnSvgDownload').addEventListener('click',function(){if(!window._svgCache)return;
    var blob=new Blob([window._svgCache],{type:'image/svg+xml'});var link=document.createElement('a');link.download='xoretex.svg';link.href=URL.createObjectURL(blob);link.click();});
  document.getElementById('btnGlslCopy')&&document.getElementById('btnGlslCopy').addEventListener('click',function(){if(window._glslCache)navigator.clipboard.writeText(window._glslCache).then(function(){showToast(t('toastCopied'));});});

  document.getElementById('helpClose')&&document.getElementById('helpClose').addEventListener('click',function(){hideModal('helpModal');});
  document.getElementById('svgClose')&&document.getElementById('svgClose').addEventListener('click',function(){hideModal('svgModal');});
  document.getElementById('glslClose')&&document.getElementById('glslClose').addEventListener('click',function(){hideModal('glslModal');});
  document.getElementById('helpDontShowChk')&&document.getElementById('helpDontShowChk').addEventListener('change',function(){
    if(document.getElementById('helpDontShowChk').checked)localStorage.setItem('xoretex_help_seen','1');else localStorage.removeItem('xoretex_help_seen');});
  document.getElementById('btnRecStop')&&document.getElementById('btnRecStop').addEventListener('click',stopRec);
}
function bindSectionToggles(){document.querySelectorAll('.pSecHead').forEach(function(h){h.addEventListener('click',function(){
  var b=document.getElementById(h.dataset.sec);if(!b)return;var o=b.classList.contains('open');b.classList.toggle('open',!o);h.classList.toggle('open',!o);});});}

function syncControls(){var cfg=ENG.config;
  function sS(id,vid,val,dec){var el=document.getElementById(id);if(el)el.value=val;
    var ve=document.getElementById(vid);if(ve)ve.textContent=dec===0?String(parseFloat(val)):parseFloat(val).toFixed(dec||2);}
  sS('sliderCount','valCount',cfg.particleCount,0);sS('sliderSpeed','valSpeed',cfg.speed,1);
  sS('sliderFriction','valFriction',cfg.friction,3);sS('sliderTurbulence','valTurbulence',cfg.turbulence,2);
  sS('sliderTrailFade','valTrailFade',cfg.trailFade,2);sS('sliderMouseForce','valMouseForce',cfg.mouseForce,0);
  sS('sliderConnDist','valConnDist',cfg.connDist,0);
  var chkG=document.getElementById('chkGlow');if(chkG)chkG.checked=cfg.glow;
  var chkC=document.getElementById('chkConnections');if(chkC)chkC.checked=cfg.connections;}

// ============================================================
// TOP BAR + KEYBOARD + MOUSE + TOUCH
// ============================================================
function bindTopBar(){
  document.getElementById('btnLang')&&document.getElementById('btnLang').addEventListener('click',toggleLang);
  document.getElementById('btnHelp')&&document.getElementById('btnHelp').addEventListener('click',function(){showModal('helpModal');});
  document.getElementById('btnPause')&&document.getElementById('btnPause').addEventListener('click',togglePause);
  document.getElementById('btnFullscreen')&&document.getElementById('btnFullscreen').addEventListener('click',toggleFS);
  document.getElementById('btnScreenshot')&&document.getElementById('btnScreenshot').addEventListener('click',exportScreenshot);
  document.getElementById('btnRecord')&&document.getElementById('btnRecord').addEventListener('click',function(){if(ENG.mediaRecorder)stopRec();else startRec();});
  document.querySelectorAll('.modeTab').forEach(function(b){b.addEventListener('click',function(){setViewMode(b.dataset.mode);});});
  var pt=document.getElementById('panelToggle'),sp=document.getElementById('sidePanel');
  if(pt&&sp)pt.addEventListener('click',function(){var c=sp.classList.toggle('collapsed');pt.classList.toggle('collapsed',c);pt.textContent=c?'\u25B8':'\u25C2';});
}
function togglePause(){ENG.running=!ENG.running;var b=document.getElementById('btnPause');if(b)b.textContent=ENG.running?'\u23F8':'\u25B6';showToast(ENG.running?t('resumed'):t('paused'));}
function toggleFS(){if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(function(){});else document.exitFullscreen().catch(function(){});}

function bindKeyboard(){document.addEventListener('keydown',function(e){
  if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;
  switch(e.code){case'Space':e.preventDefault();togglePause();break;case'KeyF':toggleFS();break;
    case'KeyS':exportScreenshot();break;case'KeyR':if(ENG.mediaRecorder)stopRec();else startRec();break;
    case'KeyH':showModal('helpModal');break;
    case'KeyP':var sp=document.getElementById('sidePanel'),pt=document.getElementById('panelToggle');
      if(sp){var c=sp.classList.toggle('collapsed');if(pt){pt.classList.toggle('collapsed',c);pt.textContent=c?'\u25B8':'\u25C2';}}break;
    case'KeyL':toggleLang();break;case'Digit1':setViewMode('both');break;case'Digit2':setViewMode('2d');break;
    case'Digit3':setViewMode('3d');break;case'KeyN':if(window.nextCubePattern)window.nextCubePattern();break;}});}

function bindMouse(){
  window.addEventListener('mousemove',function(e){if(ENG.viewMode==='3d')return;ENG.mouse.x=e.clientX;ENG.mouse.y=e.clientY;});
  window.addEventListener('mousedown',function(e){if(ENG.viewMode==='3d')return;
    if(e.target.closest&&(e.target.closest('#sidePanel')||e.target.closest('#topBar')||e.target.closest('#modeTabs')||e.target.closest('.modalOverlay')||e.target.closest('#panelToggle')))return;
    ENG.mouse.down=true;if(ENG.gameMode==='sculptor')placeSculptorOb(e.clientX,e.clientY);});
  window.addEventListener('mouseup',function(){ENG.mouse.down=false;});}

function bindTouch(){var ring=document.getElementById('touchRing');
  window.addEventListener('touchstart',function(e){if(ENG.viewMode==='3d')return;
    if(e.target.closest&&(e.target.closest('#sidePanel')||e.target.closest('#topBar')||e.target.closest('#modeTabs')||e.target.closest('.modalOverlay')||e.target.closest('#panelToggle')))return;
    var t3=e.touches[0];ENG.mouse.x=t3.clientX;ENG.mouse.y=t3.clientY;ENG.mouse.down=true;
    if(ring){ring.style.display='block';ring.style.left=t3.clientX+'px';ring.style.top=t3.clientY+'px';}
    if(ENG.gameMode==='sculptor')placeSculptorOb(t3.clientX,t3.clientY);},{passive:true});
  window.addEventListener('touchmove',function(e){if(ENG.viewMode==='3d')return;var t3=e.touches[0];
    ENG.mouse.x=t3.clientX;ENG.mouse.y=t3.clientY;
    if(ring){ring.style.left=t3.clientX+'px';ring.style.top=t3.clientY+'px';}},{passive:true});
  window.addEventListener('touchend',function(){ENG.mouse.down=false;ENG.mouse.x=-9999;ENG.mouse.y=-9999;
    if(ring)ring.style.display='none';});}

// ============================================================
// MODALS + TOAST + HELPERS
// ============================================================
function showModal(id){var el=document.getElementById(id);if(el)el.classList.add('show');}
function hideModal(id){var el=document.getElementById(id);if(el)el.classList.remove('show');}
var toastTimer=null;
function showToast(msg){var t2=document.getElementById('toast');if(!t2)return;t2.textContent=msg;t2.classList.add('show');
  if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(function(){t2.classList.remove('show');},2500);}
function validateFormula(code){try{new Function('x','y','t','r','cx','cy','PI','sin','cos','tan','atan2','sqrt','abs','noise','audio','return('+code+');');return true;}catch(e){return false;}}
function applyFormulaToLayer(code){
  if(!ENG.layers.length){var l=createLayer(code,'#00ffc8','cool',1,1);compileFn(l);ENG.layers.push(l);buildLayerCards();reassignLayers();return;}
  var fl=ENG.focusedLayer>=0&&ENG.focusedLayer<ENG.layers.length?ENG.layers[ENG.focusedLayer]:ENG.layers[0];
  fl.eq=code;var ok=compileFn(fl);
  var ind=document.getElementById('formulaIndicator'),sta=document.getElementById('formulaStatus');
  if(ind)ind.className='indicator '+(ok?'valid':'invalid');if(sta)sta.textContent=ok?t('valid'):t('invalid');
  buildLayerCards();}
function buildHelpModal(){var body=document.getElementById('helpBody');if(!body)return;
  var steps=[{title:t('helpStep1Title'),text:t('helpStep1')},{title:t('helpStep2Title'),text:t('helpStep2')},
    {title:t('helpStep3Title'),text:t('helpStep3')},{title:t('helpStep4Title'),text:t('helpStep4')},
    {title:t('helpStep5Title'),text:t('helpStep5')},{title:t('helpStep6Title'),text:t('helpStep6')},
    {title:t('helpStep7Title'),text:t('helpStep7')}];
  body.innerHTML=steps.map(function(s){return'<div class="step"><h3>'+s.title+'</h3><p>'+s.text+'</p></div>';}).join('');
  var titleEl=document.querySelector('#helpModal .modalTitle');if(titleEl)titleEl.textContent=t('helpTitle');}

// ============================================================
// BOOT
// ============================================================
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initEngine2D);
else initEngine2D();
