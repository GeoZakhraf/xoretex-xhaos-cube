// ═══════════════════════════════════════════════════════════
// CUBE3D.JS — 3D Cyber Pattern Cube Engine
// Integrated with Xoretex Xhaos particle system
// Uses same equations from engine2d.js on cube faces
// ═══════════════════════════════════════════════════════════

(function() {
'use strict';

// Wait for Three.js
if (typeof THREE === 'undefined') {
    console.warn('⚠️ Three.js not loaded — 3D cube disabled');
    return;
}

// ═══════════ CUBE STATE ═══════════
const FACE_RES = 512; // Resolution per face
let cubeActive = true;
let currentPattern = 0;
let patternTimer = 0;
let morphFrom = 0, morphTo = 0, morphProgress = 1;
let globalTime = 0;

// Cube interaction
let cubeDragging = false;
let cubeRotX = 0, cubeRotY = 0, cubeRotZ = 0;
let cubeVelX = 0, cubeVelY = 0, cubeVelZ = 0;
let dragPrevX = 0, dragPrevY = 0, dragPrevTime = 0;
let velocitySamples = [];
let isShattered = false;
let zenMode = false;

// ═══════════ CUBE CONFIG ═══════════
const cubeConfig = {
    size: 2.0,
    roundness: 0,
    edgeGlow: true,
    outerGlow: true,
    faceDensity: 3000,
    faceSpeed: 1.0,
    faceTrail: 82,
    dotSize: 1.8,
    bloom: true,
    rgbCycle: true,
    cycleSpeed: 15,
    saturation: 85,
    brightness: 50,
    hue: 0,
    autoSpin: true,
    spinSpeed: 1.0,
    momentum: 0.975,
    emissive: 0.8,
    ambient: 0.8,
    lights: true,
    fog: true,
    autoSwitch: true,
    switchInterval: 10,
    shatter: true,
    shatterSens: 5.0,
    shatterReturn: 2.0,
    reflection: true,
    reflOpacity: 0.3,
    reflDistance: 1.2,
    floorGrid: true,
    morph: true,
    morphDuration: 2.0,
    zenSpeed: 0.3,
    zenRadius: 6.0
};

// ═══════════ PATTERN NAMES ═══════════
const PATTERN_NAMES = [
    "FIBER OPTICS","DIGITAL SILK","WAVE TURBULENCE","DYNAMIC VORTEX","NEURAL GRID",
    "DATA BLOCKS","SAND WAVES","GALACTIC RIVER","RADIAL DRIFT","GEOMETRIC REPEAT",
    "MAGNETIC FIELD","ORDERED CHAOS","FRACTAL SPIRAL","ELECTRIC STORM","DNA HELIX",
    "CORAL GROWTH","QUANTUM FIELD","TOPOGRAPHIC MAP","MIRROR FLOW","SMOKE SIMULATION",
    "CRYSTAL LATTICE","NEBULA","WOVEN FABRIC","BLACK HOLE","AURORA BOREALIS",
    "VORONOI FLOW","INTERFERENCE RINGS","TORNADO","NEURAL NETWORK","GALAXY ARM",
    "LIQUID MARBLE","SOLAR FLARE","FROZEN VEINS","VELVET FOLD","BAND CURRENT",
    "SONIC RIPPLES","PLASMA MESH","MARBLE VEIN","HYPER TUNNEL","BIOFILM DRIFT",
    "GRID STREAM","CLOUD CHAMBER","INK DIFFUSION","LUMINOUS WEB","HARMONIC TILES",
    "SPIRAL GARDEN","MERCURY FLOW","PRISM WAVE","ORBIT NET","EMBER DRIFT",
    "GLASS REFRACTION","OCEAN CURRENT","SILK BLOOM","FLUX RINGS","INDUSTRIAL FLOW",
    "STAR NURSERY","WAVE LATTICE","MOIRE PULSE","ORBITAL CURRENT","PHANTOM FIELD"
];

// ═══════════ NOISE (reuse from engine2d if available) ═══════════
const cubePerm = new Uint8Array(512);
(function() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) cubePerm[i] = p[i & 255];
})();

function cubeFade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function cubeLerp(a, b, t) { return a + t * (b - a); }
function cubeGrad(h, x, y) {
    const hh = h & 3;
    const u = hh < 2 ? x : y;
    const v = hh < 2 ? y : x;
    return ((hh & 1) ? -u : u) + ((hh & 2) ? -v : v);
}
function cubeNoise2D(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = cubeFade(x), v = cubeFade(y);
    const A = cubePerm[X] + Y, B = cubePerm[X + 1] + Y;
    return cubeLerp(
        cubeLerp(cubeGrad(cubePerm[A], x, y), cubeGrad(cubePerm[B], x - 1, y), u),
        cubeLerp(cubeGrad(cubePerm[A + 1], x, y - 1), cubeGrad(cubePerm[B + 1], x - 1, y - 1), u),
        v
    );
}

function fbm(x, y, octaves) {
    octaves = octaves || 4;
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        val += amp * cubeNoise2D(x * freq, y * freq);
        freq *= 2; amp *= 0.5;
    }
    return val;
}

function turbulence(x, y, octaves) {
    octaves = octaves || 4;
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        val += amp * Math.abs(cubeNoise2D(x * freq, y * freq));
        freq *= 2; amp *= 0.5;
    }
    return val;
}

function warp(x, y, t, iterations) {
    iterations = iterations || 2;
    let px = x, py = y;
    for (let i = 0; i < iterations; i++) {
        px += cubeNoise2D(px + t * 0.7 + i * 1.3, py) * 2 - 0.5;
        py += cubeNoise2D(px + i * 2.1, py + t * 0.5) * 2 - 0.5;
    }
    return [px, py];
}

// ═══════════ 60 PATTERNS ═══════════
function getPatternAngle(pat, x, y, t, W, H) {
    const cx = W * 0.5, cy = H * 0.5;
    const dx = x - cx, dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy) + 0.001;
    const th = Math.atan2(dy, dx);
    let F = 0;
    pat = ((pat % 60) + 60) % 60;

    switch (pat) {
        case 0: F = (Math.sin(0.003*x+t)+Math.cos(0.003*y+t))*2.2+fbm(0.003*x,0.003*y,4)*3; break;
        case 1: { const w=warp(0.004*x,0.004*y,t,2); F=Math.sin(w[0]+0.7*t)*Math.cos(w[1]-0.5*t)*4; } break;
        case 2: F=(Math.sin(0.003*(x+y)+t+turbulence(0.002*x,0.002*y,4)*4)-Math.cos(0.003*(x-y)-t))*2.5; break;
        case 3: F=th+0.6*t+Math.sin(0.008*r-t)*0.5; break;
        case 4: { const gx=Math.floor(x/40),gy=Math.floor(y/40); F=(gx+gy)*0.5*cubeNoise2D(0.5*gx,0.5*gy+0.3*t)+0.1*t; } break;
        case 5: F=cubeNoise2D(Math.round(x/70)+0.2*t,Math.round(y/70))*6; break;
        case 6: F=Math.sin(0.005*(x+y)+t+fbm(0.003*x+0.2*t,0.003*y,4)*5); break;
        case 7: { const w=warp(0.002*x,0.002*y,t,2); F=Math.sin(w[0]+t)*Math.cos(w[1]+t)*5; } break;
        case 8: F=Math.sin(0.02*r+t)*2.2; break;
        case 9: F=Math.sin(0.009*x+Math.sin(0.006*y+t))+Math.cos(0.009*y+Math.cos(0.006*x+t)); break;
        case 10: { let sum=0; for(let i=0;i<4;i++){const a=i*1.5708+t*0.2;sum+=Math.atan2(y-(cy+Math.sin(a)*80),x-(cx+Math.cos(a)*80))*((i&1)?-1:1);} F=sum*0.25; } break;
        case 11: F=Math.sin(0.003*x)*Math.cos(0.003*y)*6.28+turbulence(0.003*x+0.1*t,0.003*y,3)*4; break;
        case 12: F=Math.log(r+1)*0.5+th+0.4*t+fbm(2*th,0.005*r,4)*3; break;
        case 13: F=Math.sin(cubeNoise2D(0.005*x+t,0.005*y)*20)*3+th*0.2; break;
        case 14: F=Math.atan2(Math.sin(0.02*y+t),(x-cx)*0.005)+Math.cos(0.008*y+t)*2; break;
        case 15: { const w=warp(0.003*x,0.003*y,0.3*t,2); F=fbm(w[0],w[1],4)*8; } break;
        case 16: F=Math.sin(cubeNoise2D(0.008*x+0.3*t,0.008*y)*12+t)*2+Math.sin(0.006*x)*3; break;
        case 17: { const hv=fbm(0.002*x+0.05*t,0.002*y,4); F=Math.atan2(fbm(0.002*x+0.05*t,0.002*(y+1),4)-hv,fbm(0.002*(x+1)+0.05*t,0.002*y,4)-hv); } break;
        case 18: F=6*fbm(0.005*Math.abs(x-cx)+0.2*t,0.005*Math.abs(y-cy),4); break;
        case 19: { const w=warp(0.002*x,0.002*y,0.5*t,2); F=fbm(w[0],w[1],4)*6+(1-y/H)*1.6; } break;
        case 20: F=Math.atan2(Math.cos(0.03*x-t)*Math.sin(0.04*y)+cubeNoise2D(0.01*x+0.1*t,0.01*y)*2,Math.sin(0.04*x+t)*Math.cos(0.03*y)); break;
        case 21: F=fbm(3*th+0.1*t,5*r/(W+1),4)*5+0.3*th; break;
        case 22: F=Math.atan2(Math.sin(0.01*(y+Math.sin(0.02*x+t)*20)),Math.cos(0.01*(x+Math.cos(0.02*y-0.7*t)*20))); break;
        case 23: F=th+2/(0.003*r+0.1)+0.3*t; break;
        case 24: { const fy=y/H; F=Math.sin(0.005*x+t+Math.sin(8*fy+t)*2)*3; } break;
        case 25: { let minD=1e9,np0=cx,np1=cy; for(let i=0;i<8;i++){const c0=cx+Math.sin(i*1.7+t*0.3)*120,c1=cy+Math.cos(i*2.3+t*0.2)*120,d=(x-c0)**2+(y-c1)**2;if(d<minD){minD=d;np0=c0;np1=c1;}} F=Math.atan2(y-np1,x-np0); } break;
        case 26: { F=0; for(let i=0;i<4;i++){const c0=cx+Math.sin(i*2.1+t*0.4)*100,c1=cy+Math.cos(i*1.7+t*0.3)*100,d=Math.sqrt((x-c0)**2+(y-c1)**2);F+=Math.sin(0.02*d-t*(1+0.3*i));} } break;
        case 27: { const fy=y/H; F=th+3/(r/H+0.1)*((1-fy)*0.3+0.05)+0.5*t; } break;
        case 28: { F=0; for(let i=0;i<4;i++){const c0=cx+Math.sin(i*1.3+0.5*t)*120,c1=cy+Math.cos(i*1.9+0.3*t)*120,d=Math.sqrt((x-c0)**2+(y-c1)**2);F+=Math.sin(0.01*d+t+i)*Math.exp(-0.005*d);}F*=3; } break;
        case 29: F=th+Math.sin((th-0.6*Math.log(r+1))*3+0.3*t)*0.5+fbm(th,0.003*r+0.05*t,4)*2+1.57; break;
        case 30: F=Math.sin(6*fbm(0.004*x+t,0.004*y-t,3))+Math.cos(4*fbm(0.006*x,0.006*y+t,3)); break;
        case 31: F=th+4*Math.sin(0.03*r-2*t)+2*cubeNoise2D(0.01*x+t,0.01*y); break;
        case 32: { const nn=cubeNoise2D(0.01*x,0.01*y); F=Math.atan2(cubeNoise2D(0.01*x,0.01*(y+0.5))-nn,cubeNoise2D(0.01*(x+0.5),0.01*y)-nn); } break;
        case 33: F=Math.sin(0.004*x+3*fbm(0.003*y,0.003*x+t,3))*Math.cos(0.004*y-t); break;
        case 34: F=Math.sin(0.012*x+t)+0.7*Math.cos(0.018*y-0.6*t); break;
        case 35: F=Math.sin(0.03*r-3*t)+0.5*Math.sin(0.05*r+2*t); break;
        case 36: F=Math.sin(0.01*x+t)+Math.sin(0.01*y-t)+Math.sin(0.01*(x+y)+0.5*t); break;
        case 37: F=Math.sin(0.01*x+5*fbm(0.006*x,0.006*y+t,4)); break;
        case 38: F=th+8/(r+1)+Math.sin(0.05*r-2*t); break;
        case 39: { const w=warp(0.004*x,0.004*y,t,2); F=6*fbm(w[0],w[1],4); } break;
        case 40: { const gx=Math.floor(x/60),gy=Math.floor(y/60); F=cubeNoise2D(0.4*gx+0.1*t,0.4*gy)*6.28; } break;
        case 41: { const nn=fbm(0.003*x+0.05*t,0.003*y,4); F=Math.atan2(fbm(0.003*x+0.05*t,0.003*(y+1),4)-nn,fbm(0.003*(x+1)+0.05*t,0.003*y,4)-nn); } break;
        case 42: { const w=warp(0.002*x,0.002*y,0.2*t,2); F=fbm(w[0],w[1],4); } break;
        case 43: { F=0; for(let i=0;i<4;i++){const c0=cx+Math.sin(i*2.5+t*0.4)*130,c1=cy+Math.cos(i*1.8+t*0.3)*130,d=Math.sqrt((x-c0)**2+(y-c1)**2)+1;F+=Math.atan2(y-c1,x-c0)/d;}F*=40; } break;
        case 44: F=Math.sin(6.28*((x/50+t)%1))+Math.cos(6.28*((y/50-t)%1)); break;
        case 45: F=th+0.004*r+Math.sin(5*th-t); break;
        case 46: F=Math.sin(0.005*x+4*cubeNoise2D(0.006*x+t,0.006*y)); break;
        case 47: F=Math.sin(0.008*x+t)*Math.sin(0.008*y-t)+Math.cos(0.012*(x-y)); break;
        case 48: { F=0; for(let i=0;i<4;i++){const c0=cx+Math.sin(i*1.4+t*0.5)*100,c1=cy+Math.cos(i*2.2+t*0.4)*100;F+=Math.atan2(y-c1,x-c0);} } break;
        case 49: F=5*fbm(0.004*x+0.1*t,0.004*y,4)+0.7*(1-y/H); break;
        case 50: F=Math.atan2(Math.sin(0.02*x+3*cubeNoise2D(0.01*x,0.01*y+t)),Math.cos(0.02*y-3*cubeNoise2D(0.01*y,0.01*x-t))); break;
        case 51: F=4*fbm(0.002*x+0.05*t,0.002*y-0.03*t,4); break;
        case 52: F=Math.sin(0.003*x+t)*Math.cos(0.003*y-t)+2*fbm(0.005*x,0.005*y+t,3); break;
        case 53: F=Math.sin(0.04*r-t)*Math.cos(6*th+0.5*t); break;
        case 54: F=Math.atan2(Math.sin(0.02*x+2*cubeNoise2D(0.01*x,0.01*y+t)),Math.cos(0.02*y-2*cubeNoise2D(0.01*y,0.01*x-t))); break;
        case 55: F=6*fbm(0.002*x,0.002*y+0.04*t,4)+Math.sin(0.02*r+th-t); break;
        case 56: F=Math.sin(0.01*x+t)+Math.cos(0.01*y-t); break;
        case 57: F=Math.sin(0.03*x+t)+Math.sin(0.031*y-0.8*t); break;
        case 58: F=th+0.6*Math.sin(0.025*r-t); break;
        case 59: { const w=warp(0.003*x,0.003*y,0.15*t,3); F=7*fbm(w[0],w[1],4)+th*0.2; } break;
        default: F = th + t;
    }
    return F;
}

// Morphed pattern angle
function getMorphedAngle(x, y, t, W, H) {
    if (!cubeConfig.morph || morphProgress >= 1) {
        return getPatternAngle(morphTo, x, y, t, W, H);
    }
    const a1 = getPatternAngle(morphFrom, x, y, t, W, H);
    const a2 = getPatternAngle(morphTo, x, y, t, W, H);
    let diff = a2 - a1;
    while (diff > Math.PI) diff -= 6.283;
    while (diff < -Math.PI) diff += 6.283;
    return a1 + diff * morphProgress;
}

// HSL to packed int
function hslToInt(h, s, l) {
    h = h % 1; if (h < 0) h += 1;
    if (s === 0) { const v = (l * 255) | 0; return (0xFF000000) | (v << 16) | (v << 8) | v; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    function hue2rgb(t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        return t < 1/6 ? p+(q-p)*6*t : t < 0.5 ? q : t < 2/3 ? p+(q-p)*(2/3-t)*6 : p;
    }
    return (0xFF000000) | (((hue2rgb(h - 1/3) * 255) | 0) << 16) | (((hue2rgb(h) * 255) | 0) << 8) | ((hue2rgb(h + 1/3) * 255) | 0);
}// ═══════════════════════════════════════════════════════════
// CUBE3D.JS — PART 2/2
// Three.js Setup, Face Renderer, Shatter, Animation, Integration
// ═══════════════════════════════════════════════════════════

// ═══════════ FACE RENDERER (Pixel-level particle flow on each cube face) ═══════════
function createFace(faceIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = FACE_RES;
    canvas.height = FACE_RES;
    const faceCtx = canvas.getContext('2d', { willReadFrequently: true });
    const imgData = faceCtx.createImageData(FACE_RES, FACE_RES);
    const pixelBuffer = new Uint32Array(imgData.data.buffer);
    const W = FACE_RES, H = FACE_RES, total = W * H;

    // Clear to black
    for (let i = 0; i < total; i++) pixelBuffer[i] = 0xFF000000;
    faceCtx.putImageData(imgData, 0, 0);

    // Face particles
    let faceParticles = [];
    let faceTime = faceIndex * 10;

    function initParticles(count) {
        faceParticles = [];
        for (let i = 0; i < count; i++) {
            faceParticles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                speed: 0.3 + Math.random() * 1.8,
                hueOffset: Math.random(),
                life: 100 + Math.random() * 200,
                age: Math.random() * 200
            });
        }
    }

    initParticles(cubeConfig.faceDensity);

    function rebuild() {
        initParticles(cubeConfig.faceDensity);
        for (let i = 0; i < total; i++) pixelBuffer[i] = 0xFF000000;
        faceCtx.putImageData(imgData, 0, 0);
    }

    function update(dt, gt) {
        faceTime += dt;

        // Trail fade
        const fadeAmount = Math.max(1, ((100 - cubeConfig.faceTrail) / 100 * 12 + 0.3) | 0);
        for (let i = 0; i < total; i++) {
            const px = pixelBuffer[i];
            pixelBuffer[i] = (0xFF000000) |
                (Math.max(0, ((px >> 16) & 0xFF) - fadeAmount) << 16) |
                (Math.max(0, ((px >> 8) & 0xFF) - fadeAmount) << 8) |
                Math.max(0, (px & 0xFF) - fadeAmount);
        }

        // Color base
        const hueBase = cubeConfig.rgbCycle
            ? ((gt * cubeConfig.cycleSpeed + faceIndex * 60) / 360)
            : cubeConfig.hue / 360;
        const spd = cubeConfig.faceSpeed;
        const dotSize = Math.max(1, Math.ceil(cubeConfig.dotSize));
        const sat = cubeConfig.saturation / 100;
        const bri = cubeConfig.brightness / 100;

        // Update & draw each particle
        for (let pi = 0; pi < faceParticles.length; pi++) {
            const p = faceParticles[pi];

            // Get flow angle from current pattern
            const angle = getMorphedAngle(p.x, p.y, faceTime, W, H);

            // Move
            p.x += Math.cos(angle) * p.speed * spd;
            p.y += Math.sin(angle) * p.speed * spd;
            p.age += dt * 30;

            // Wrap
            if (p.x < 0) p.x += W; else if (p.x >= W) p.x -= W;
            if (p.y < 0) p.y += H; else if (p.y >= H) p.y -= H;

            // Reset if dead
            if (p.age > p.life) {
                p.x = Math.random() * W;
                p.y = Math.random() * H;
                p.age = 0;
                p.life = 100 + Math.random() * 200;
                p.hueOffset = Math.random();
                continue;
            }

            // Life ratio for fade in/out
            const lifeRatio = p.age / p.life;
            const alpha = lifeRatio < 0.05 ? lifeRatio / 0.05 : lifeRatio > 0.9 ? (1 - lifeRatio) / 0.1 : 1;

            // Color
            const hue = cubeConfig.rgbCycle
                ? (hueBase + p.hueOffset + faceTime * 0.022)
                : (cubeConfig.hue / 360 + p.hueOffset * 0.3);
            const color = hslToInt(hue, sat, Math.min(1, bri + Math.sin(faceTime + pi * 0.05) * 0.06));

            // Extract RGB with alpha
            const cr = (color & 0xFF) * alpha | 0;
            const cg = ((color >> 8) & 0xFF) * alpha | 0;
            const cb = ((color >> 16) & 0xFF) * alpha | 0;

            // Plot pixel(s)
            const px0 = p.x | 0, py0 = p.y | 0;
            for (let dy = 0; dy < dotSize; dy++) {
                const yy = (py0 + dy) % H;
                const rowOffset = yy * W;
                for (let dx = 0; dx < dotSize; dx++) {
                    const xx = (px0 + dx) % W;
                    const idx = rowOffset + xx;
                    const existing = pixelBuffer[idx];
                    pixelBuffer[idx] = (0xFF000000) |
                        (Math.min(255, ((existing >> 16) & 0xFF) + cb) << 16) |
                        (Math.min(255, ((existing >> 8) & 0xFF) + cg) << 8) |
                        Math.min(255, (existing & 0xFF) + cr);
                }
            }

            // Bloom glow
            if (cubeConfig.bloom && (pi & 7) === 0 && alpha > 0.4) {
                const glowRadius = dotSize * 2;
                const glowAlpha = alpha * 0.05;
                for (let gy = -glowRadius; gy <= glowRadius; gy++) {
                    const yy2 = (py0 + gy + H) % H;
                    for (let gx = -glowRadius; gx <= glowRadius; gx++) {
                        if (gx * gx + gy * gy > glowRadius * glowRadius) continue;
                        const xx2 = (px0 + gx + W) % W;
                        const gi = yy2 * W + xx2;
                        const gp = pixelBuffer[gi];
                        pixelBuffer[gi] = (0xFF000000) |
                            (Math.min(255, ((gp >> 16) & 0xFF) + (cb * glowAlpha | 0)) << 16) |
                            (Math.min(255, ((gp >> 8) & 0xFF) + (cg * glowAlpha | 0)) << 8) |
                            Math.min(255, (gp & 0xFF) + (cr * glowAlpha | 0));
                    }
                }
            }
        }

        faceCtx.putImageData(imgData, 0, 0);
    }

    return { canvas, rebuild, update };
}

// ═══════════ THREE.JS SETUP ═══════════
const cubeCan = document.getElementById('cubeCan');
const renderer = new THREE.WebGLRenderer({
    canvas: cubeCan,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
if (renderer.toneMapping !== undefined) renderer.toneMapping = THREE.ACESFilmicToneMapping;
if (renderer.toneMappingExposure !== undefined) renderer.toneMappingExposure = 1.4;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020208, 0.015);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.3, 5.5);

// Lights
const ambientLight = new THREE.AmbientLight(0x334466, 0.8);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xaaddff, 0.6);
dirLight.position.set(3, 5, 4);
scene.add(dirLight);
const pointLight1 = new THREE.PointLight(0x00ffff, 2, 20);
pointLight1.position.set(-3, 2, 4);
scene.add(pointLight1);
const pointLight2 = new THREE.PointLight(0xff00ff, 1.5, 20);
pointLight2.position.set(3, -2, 3);
scene.add(pointLight2);
const pointLight3 = new THREE.PointLight(0xffff00, 0.6, 15);
pointLight3.position.set(0, 3, -3);
scene.add(pointLight3);

// Create 6 faces
const faces = [];
const textures = [];
const materials = [];

for (let i = 0; i < 6; i++) {
    const face = createFace(i);
    faces.push(face);
    const tex = new THREE.CanvasTexture(face.canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    textures.push(tex);
    materials.push(new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: cubeConfig.emissive,
        roughness: 0.15,
        metalness: 0.2
    }));
}

// Build cube mesh
let cubeObj, edgeObj, glowObj, edgeMaterial, glowMaterial;

function buildCube() {
    if (cubeObj) { scene.remove(cubeObj); scene.remove(edgeObj); scene.remove(glowObj); }

    const sz = cubeConfig.size;
    const rd = cubeConfig.roundness * sz;
    let geo;

    if (rd > 0.01) {
        geo = new THREE.BoxGeometry(sz, sz, sz, 4, 4, 4);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const h = sz / 2;
            const nx = x / h, ny = y / h, nz = z / h;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const maxC = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
            pos.setXYZ(i,
                cubeLerp(nx / maxC, nx / len, rd) * h,
                cubeLerp(ny / maxC, ny / len, rd) * h,
                cubeLerp(nz / maxC, nz / len, rd) * h
            );
        }
        geo.computeVertexNormals();
    } else {
        geo = new THREE.BoxGeometry(sz, sz, sz);
    }

    cubeObj = new THREE.Mesh(geo, materials);
    scene.add(cubeObj);

    // Edge glow
    edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
    edgeObj = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMaterial);
    edgeObj.visible = cubeConfig.edgeGlow;
    scene.add(edgeObj);

    // Outer glow
    glowMaterial = new THREE.MeshBasicMaterial({ color: 0x0066ff, transparent: true, opacity: 0.03, side: THREE.BackSide });
    glowObj = new THREE.Mesh(new THREE.BoxGeometry(sz * 1.1, sz * 1.1, sz * 1.1), glowMaterial);
    glowObj.visible = cubeConfig.outerGlow;
    scene.add(glowObj);

    buildReflection();
    buildShards();
}

// ═══════════ REFLECTION ═══════════
const reflectionGroup = new THREE.Group();
scene.add(reflectionGroup);
let reflectionCube;

function buildReflection() {
    while (reflectionGroup.children.length) reflectionGroup.remove(reflectionGroup.children[0]);
    if (!cubeConfig.reflection) return;

    const sz = cubeConfig.size;
    const reflMats = [];
    for (let i = 0; i < 6; i++) {
        reflMats.push(new THREE.MeshStandardMaterial({
            map: materials[i].map,
            emissiveMap: materials[i].emissiveMap,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: cubeConfig.emissive * 0.4,
            roughness: 0.4,
            transparent: true,
            opacity: cubeConfig.reflOpacity
        }));
    }

    reflectionCube = new THREE.Mesh(cubeObj.geometry.clone(), reflMats);
    reflectionCube.scale.y = -1;
    reflectionGroup.add(reflectionCube);

    // Floor plane
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x050510, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -sz * cubeConfig.reflDistance;
    reflectionGroup.add(floor);

    // Floor grid
    if (cubeConfig.floorGrid) {
        const gridPoints = [];
        for (let j = 0; j <= 40; j++) {
            const p = -10 + j * 0.5;
            gridPoints.push(-10, 0, p, 10, 0, p, p, 0, -10, p, 0, 10);
        }
        const gridGeo = new THREE.BufferGeometry();
        gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
        const gridLines = new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.02 }));
        gridLines.position.y = -sz * cubeConfig.reflDistance + 0.01;
        reflectionGroup.add(gridLines);
    }
}

// ═══════════ SHATTER EFFECT ═══════════
const shatterGroup = new THREE.Group();
scene.add(shatterGroup);
let shards = [];

function buildShards() {
    while (shatterGroup.children.length) shatterGroup.remove(shatterGroup.children[0]);
    shards = [];

    const sz = cubeConfig.size;
    const h = sz / 2;
    const segments = 3;
    const step = sz / segments;

    for (let fx = 0; fx < segments; fx++) {
        for (let fy = 0; fy < segments; fy++) {
            for (let fz = 0; fz < segments; fz++) {
                const shardGeo = new THREE.BoxGeometry(step * 0.95, step * 0.95, step * 0.95);
                const cx = (fx + 0.5) * step - h;
                const cy = (fy + 0.5) * step - h;
                const cz = (fz + 0.5) * step - h;

                // Determine which face material
                let faceIdx = 0;
                if (Math.abs(cx) >= Math.abs(cy) && Math.abs(cx) >= Math.abs(cz)) faceIdx = cx > 0 ? 0 : 1;
                else if (Math.abs(cy) >= Math.abs(cz)) faceIdx = cy > 0 ? 2 : 3;
                else faceIdx = cz > 0 ? 4 : 5;

                const shardMesh = new THREE.Mesh(shardGeo, new THREE.MeshStandardMaterial({
                    map: materials[faceIdx].map,
                    emissiveMap: materials[faceIdx].emissiveMap,
                    emissive: new THREE.Color(0xffffff),
                    emissiveIntensity: cubeConfig.emissive,
                    roughness: 0.15,
                    metalness: 0.2
                }));
                shardMesh.position.set(cx, cy, cz);
                shardMesh.userData = {
                    home: new THREE.Vector3(cx, cy, cz),
                    vel: new THREE.Vector3(),
                    rotVel: new THREE.Vector3()
                };
                shatterGroup.add(shardMesh);
                shards.push(shardMesh);
            }
        }
    }
    shatterGroup.visible = false;
}

function triggerShatter() {
    if (isShattered) return;
    isShattered = true;
    cubeObj.visible = false;
    if (edgeObj) edgeObj.visible = false;
    shatterGroup.visible = true;
    shatterGroup.rotation.copy(cubeObj.rotation);

    const rotSpeed = Math.sqrt(cubeVelX ** 2 + cubeVelY ** 2 + cubeVelZ ** 2);

    for (let i = 0; i < shards.length; i++) {
        const shard = shards[i];
        const ud = shard.userData;
        shard.position.copy(ud.home);
        shard.rotation.set(0, 0, 0);

        const dir = ud.home.clone().normalize().multiplyScalar(rotSpeed * 0.3 + Math.random() * 2);
        dir.x += (Math.random() - 0.5) * 2;
        dir.y += (Math.random() - 0.5) * 2;
        dir.z += (Math.random() - 0.5) * 2;
        ud.vel.copy(dir);
        ud.rotVel.set(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8
        );
    }
}

function updateShatter(dt) {
    if (!isShattered) return;
    let allHome = true;

    for (let i = 0; i < shards.length; i++) {
        const shard = shards[i];
        const ud = shard.userData;

        shard.position.addScaledVector(ud.vel, dt);
        shard.rotation.x += ud.rotVel.x * dt;
        shard.rotation.y += ud.rotVel.y * dt;
        shard.rotation.z += ud.rotVel.z * dt;

        // Spring back to home
        const dx = ud.home.x - shard.position.x;
        const dy = ud.home.y - shard.position.y;
        const dz = ud.home.z - shard.position.z;
        ud.vel.x += dx * cubeConfig.shatterReturn * dt;
        ud.vel.y += dy * cubeConfig.shatterReturn * dt;
        ud.vel.z += dz * cubeConfig.shatterReturn * dt;
        ud.vel.multiplyScalar(1 - dt * 1.5);
        ud.rotVel.multiplyScalar(1 - dt * 2);

        if (dx * dx + dy * dy + dz * dz > 0.0001) allHome = false;
    }

    if (allHome) {
        isShattered = false;
        cubeObj.visible = true;
        if (cubeConfig.edgeGlow && edgeObj) edgeObj.visible = true;
        shatterGroup.visible = false;
    }
}

// Build initial cube
buildCube();

// ═══════════ CUBE INTERACTION ═══════════
const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();
const euler = new THREE.Euler();

function hitTestCube(px, py) {
    mouseVec.set((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouseVec, camera);
    return raycaster.intersectObject(cubeObj).length > 0 || isShattered;
}

function createShockwave(x, y) {
    const el = document.createElement('div');
    el.className = 'shockwave';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
}

// Mouse events on cube canvas
cubeCan.addEventListener('mousedown', e => {
    if (!cubeActive) return;
    if (hitTestCube(e.clientX, e.clientY)) {
        cubeDragging = true;
        dragPrevX = e.clientX;
        dragPrevY = e.clientY;
        dragPrevTime = performance.now();
        velocitySamples = [];
        cubeVelX = cubeVelY = cubeVelZ = 0;
        createShockwave(e.clientX, e.clientY);
    }
});

window.addEventListener('mousemove', e => {
    if (!cubeDragging) return;
    const now = performance.now();
    const dt = Math.max(now - dragPrevTime, 1);
    const dx = e.clientX - dragPrevX;
    const dy = e.clientY - dragPrevY;
    cubeRotY += dx * 0.007;
    cubeRotX += dy * 0.007;
    velocitySamples.push({ vx: dx / dt, vy: dy / dt });
    if (velocitySamples.length > 10) velocitySamples.shift();
    dragPrevX = e.clientX;
    dragPrevY = e.clientY;
    dragPrevTime = now;
});

window.addEventListener('mouseup', () => {
    if (!cubeDragging) return;
    cubeDragging = false;
    if (velocitySamples.length) {
        let ax = 0, ay = 0;
        const n = Math.min(6, velocitySamples.length);
        const arr = velocitySamples.slice(-n);
        for (let j = 0; j < arr.length; j++) { ax += arr[j].vx; ay += arr[j].vy; }
        ax /= arr.length; ay /= arr.length;
        cubeVelY = ax * 20;
        cubeVelX = ay * 20;
        cubeVelZ = (Math.random() - 0.5) * Math.sqrt(ax * ax + ay * ay) * 8;
    }
});

// Touch events
cubeCan.addEventListener('touchstart', e => {
    if (!cubeActive || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (hitTestCube(touch.clientX, touch.clientY)) {
        e.preventDefault();
        cubeDragging = true;
        dragPrevX = touch.clientX;
        dragPrevY = touch.clientY;
        dragPrevTime = performance.now();
        velocitySamples = [];
        cubeVelX = cubeVelY = cubeVelZ = 0;
        createShockwave(touch.clientX, touch.clientY);
    }
}, { passive: false });

cubeCan.addEventListener('touchmove', e => {
    if (!cubeDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const now = performance.now();
    const dt = Math.max(now - dragPrevTime, 1);
    const dx = touch.clientX - dragPrevX;
    const dy = touch.clientY - dragPrevY;
    cubeRotY += dx * 0.007;
    cubeRotX += dy * 0.007;
    velocitySamples.push({ vx: dx / dt, vy: dy / dt });
    if (velocitySamples.length > 10) velocitySamples.shift();
    dragPrevX = touch.clientX;
    dragPrevY = touch.clientY;
    dragPrevTime = now;
}, { passive: false });

cubeCan.addEventListener('touchend', () => {
    if (!cubeDragging) return;
    cubeDragging = false;
    if (velocitySamples.length) {
        let ax = 0, ay = 0;
        const n = Math.min(6, velocitySamples.length);
        const arr = velocitySamples.slice(-n);
        for (let j = 0; j < arr.length; j++) { ax += arr[j].vx; ay += arr[j].vy; }
        ax /= arr.length; ay /= arr.length;
        cubeVelY = ax * 20;
        cubeVelX = ay * 20;
        cubeVelZ = (Math.random() - 0.5) * Math.sqrt(ax * ax + ay * ay) * 8;
    }
});

// Scroll to resize cube
cubeCan.addEventListener('wheel', e => {
    e.preventDefault();
    cubeConfig.size = Math.max(0.5, Math.min(4, cubeConfig.size + (e.deltaY > 0 ? -0.1 : 0.1)));
    buildCube();
}, { passive: false });

// ═══════════ PATTERN SWITCHING ═══════════
function switchPattern(newPattern) {
    const np = ((newPattern % 60) + 60) % 60;
    if (cubeConfig.morph && morphProgress >= 1) {
        morphFrom = currentPattern;
        morphTo = np;
        morphProgress = 0;
    } else {
        morphTo = np;
        morphProgress = 1;
    }
    currentPattern = np;
    patternTimer = 0;

    // Update stats
    const patEl = document.getElementById('s-pat');
    if (patEl) patEl.textContent = (currentPattern + 1) + '/60';
}

// ═══════════ VIEW MODE ═══════════
// Called from index.html
window.setViewMode = function(mode, tabEl) {
    // Update tabs
    document.querySelectorAll('.modeTab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');

    const flowCan = document.getElementById('flowCan');
    const glowCan2 = document.getElementById('glowCan');
    const connCan2 = document.getElementById('connCan');

    switch (mode) {
        case '2d':
            cubeActive = false;
            cubeCan.style.display = 'none';
            if (flowCan) flowCan.style.opacity = '1';
            if (glowCan2) glowCan2.style.display = '';
            if (connCan2) connCan2.style.display = '';
            break;
        case '3d':
            cubeActive = true;
            cubeCan.style.display = '';
            cubeCan.style.pointerEvents = 'auto';
            if (flowCan) flowCan.style.opacity = '0.15';
            if (glowCan2) glowCan2.style.display = 'none';
            if (connCan2) connCan2.style.display = 'none';
            break;
        case 'both':
        default:
            cubeActive = true;
            cubeCan.style.display = '';
            cubeCan.style.pointerEvents = 'auto';
            if (flowCan) flowCan.style.opacity = '0.6';
            if (glowCan2) glowCan2.style.display = '';
            if (connCan2) connCan2.style.display = '';
            break;
    }
};

// ═══════════ BUILD PANEL SECTIONS (3D specific) ═══════════
function buildCubePanel() {
    const container = document.getElementById('panelSections');
    if (!container) return;

    // Add cube-specific section after existing sections
    const cubeSection = document.createElement('div');
    cubeSection.className = 'sec';
    cubeSection.innerHTML = `
        <div class="stitle" onclick="toggleSection(this)"><span>🎲 3D CUBE</span><span class="arrow">▼</span></div>
        <div class="scontent">
            <div class="ctrl"><div class="ctrlLbl"><span>Cube Size</span><span class="ctrlVal" id="val-cubeSize">${cubeConfig.size.toFixed(1)}</span></div><input type="range" id="cubeSize" min="0.5" max="4" step="0.1" value="${cubeConfig.size}" oninput="updateCubeConfig('size',this.value)"></div>
            <div class="ctrl"><div class="ctrlLbl"><span>Roundness</span><span class="ctrlVal" id="val-cubeRound">${cubeConfig.roundness}</span></div><input type="range" id="cubeRound" min="0" max="0.4" step="0.02" value="${cubeConfig.roundness}" oninput="updateCubeConfig('roundness',this.value)"></div>
            <div class="ctrl"><div class="ctrlLbl"><span>Face Density</span><span class="ctrlVal" id="val-cubeDensity">${cubeConfig.faceDensity}</span></div><input type="range" id="cubeDensity" min="500" max="10000" step="500" value="${cubeConfig.faceDensity}" oninput="updateCubeConfig('faceDensity',this.value)"></div>
            <div class="ctrl"><div class="ctrlLbl"><span>Face Speed</span><span class="ctrlVal" id="val-cubeSpeed">${cubeConfig.faceSpeed}</span></div><input type="range" id="cubeSpeed" min="0.1" max="3" step="0.1" value="${cubeConfig.faceSpeed}" oninput="updateCubeConfig('faceSpeed',this.value)"></div>
            <div class="ctrl"><div class="ctrlLbl"><span>Spin Speed</span><span class="ctrlVal" id="val-cubeSpin">${cubeConfig.spinSpeed}</span></div><input type="range" id="cubeSpin" min="0" max="4" step="0.1" value="${cubeConfig.spinSpeed}" oninput="updateCubeConfig('spinSpeed',this.value)"></div>
            <div class="ctrl"><div class="ctrlLbl"><span>Emissive</span><span class="ctrlVal" id="val-cubeEmit">${cubeConfig.emissive}</span></div><input type="range" id="cubeEmit" min="0" max="2" step="0.05" value="${cubeConfig.emissive}" oninput="updateCubeConfig('emissive',this.value)"></div>
            <div class="togRow"><span class="togLbl">Edge Glow</span><div class="togSw ${cubeConfig.edgeGlow?'on':''}" onclick="toggleCubeOption('edgeGlow',this)"></div></div>
            <div class="togRow"><span class="togLbl">Reflection</span><div class="togSw ${cubeConfig.reflection?'on':''}" onclick="toggleCubeOption('reflection',this)"></div></div>
            <div class="togRow"><span class="togLbl">Auto Spin</span><div class="togSw ${cubeConfig.autoSpin?'on':''}" onclick="toggleCubeOption('autoSpin',this)"></div></div>
            <div class="togRow"><span class="togLbl">Auto Switch (60 patterns)</span><div class="togSw ${cubeConfig.autoSwitch?'on':''}" onclick="toggleCubeOption('autoSwitch',this)"></div></div>
            <div class="togRow"><span class="togLbl">Shatter on Flick</span><div class="togSw ${cubeConfig.shatter?'on':''}" onclick="toggleCubeOption('shatter',this)"></div></div>
            <div style="margin-top:8px">
                <div class="ctrlLbl" style="margin-bottom:5px"><span>Pattern: <strong id="cubePatName">${PATTERN_NAMES[0]}</strong></span></div>
                <div class="actGrid" style="grid-template-columns:1fr 1fr 1fr">
                    <div class="actBtn" onclick="cubePrev()">◀ Prev</div>
                    <div class="actBtn" onclick="cubeRandom()">◈ Rand</div>
                    <div class="actBtn" onclick="cubeNext()">Next ▶</div>
                </div>
            </div>
            <div class="patGrid" id="cubePatGrid" style="margin-top:8px"></div>
        </div>
    `;
    container.appendChild(cubeSection);

    // Build pattern grid
    const patGrid = document.getElementById('cubePatGrid');
    if (patGrid) {
        for (let i = 0; i < 60; i++) {
            const cell = document.createElement('div');
            cell.className = 'patCell' + (i === 0 ? ' active' : '');
            cell.textContent = i + 1;
            cell.dataset.idx = i;
            cell.addEventListener('click', function() {
                switchPattern(parseInt(this.dataset.idx));
                updatePatternGrid();
            });
            patGrid.appendChild(cell);
        }
    }
}

function updatePatternGrid() {
    const cells = document.querySelectorAll('.patCell');
    cells.forEach(c => c.classList.toggle('active', parseInt(c.dataset.idx) === currentPattern));
    const nameEl = document.getElementById('cubePatName');
    if (nameEl) nameEl.textContent = PATTERN_NAMES[currentPattern];
}

// Global functions for panel controls
window.updateCubeConfig = function(key, value) {
    value = parseFloat(value);
    cubeConfig[key] = value;
    const valEl = document.getElementById('val-cube' + key.charAt(0).toUpperCase() + key.slice(1));
    if (valEl) valEl.textContent = value;

    if (key === 'size' || key === 'roundness') buildCube();
    if (key === 'faceDensity') faces.forEach(f => f.rebuild());
    if (key === 'emissive') materials.forEach(m => { m.emissiveIntensity = value; });
};

window.toggleCubeOption = function(key, el) {
    cubeConfig[key] = !cubeConfig[key];
    el.classList.toggle('on', cubeConfig[key]);
    if (key === 'edgeGlow' && edgeObj) edgeObj.visible = cubeConfig.edgeGlow;
    if (key === 'reflection') buildReflection();
};

window.cubePrev = function() { switchPattern(currentPattern - 1); updatePatternGrid(); };
window.cubeNext = function() { switchPattern(currentPattern + 1); updatePatternGrid(); };
window.cubeRandom = function() { switchPattern(Math.floor(Math.random() * 60)); updatePatternGrid(); };

// ═══════════ CUBE ANIMATION LOOP ═══════════
let cubeLastTime = performance.now();

function cubeAnimate() {
    requestAnimationFrame(cubeAnimate);

    if (!cubeActive) {
        renderer.clear();
        return;
    }

    const now = performance.now();
    const dt = Math.min((now - cubeLastTime) * 0.001, 0.04);
    cubeLastTime = now;
    globalTime += dt;

    // Morph progress
    if (morphProgress < 1) {
        morphProgress = Math.min(1, morphProgress + dt / cubeConfig.morphDuration);
    }

    // Auto switch
    if (cubeConfig.autoSwitch) {
        patternTimer += dt;
        if (patternTimer >= cubeConfig.switchInterval) {
            switchPattern(currentPattern + 1);
            updatePatternGrid();
        }
    }

    // Update 2 faces per frame (alternating for performance)
    const f0 = (globalTime * 20 | 0) % 6;
    const f1 = (f0 + 3) % 6;
    faces[f0].update(dt * 3, globalTime);
    textures[f0].needsUpdate = true;
    faces[f1].update(dt * 3, globalTime);
    textures[f1].needsUpdate = true;

    // Rotation physics
    if (!cubeDragging) {
        cubeVelX *= cubeConfig.momentum;
        cubeVelY *= cubeConfig.momentum;
        cubeVelZ *= cubeConfig.momentum;

        const speed = Math.abs(cubeVelX) + Math.abs(cubeVelY) + Math.abs(cubeVelZ);

        if (cubeConfig.autoSpin) {
            const blend = Math.max(0, 1 - speed * 0.4);
            const ss = cubeConfig.spinSpeed;
            cubeRotX += (cubeVelX + 0.12 * ss * blend) * dt;
            cubeRotY += (cubeVelY + 0.2 * ss * blend) * dt;
            cubeRotZ += (cubeVelZ + 0.04 * ss * blend) * dt;
        } else {
            cubeRotX += cubeVelX * dt;
            cubeRotY += cubeVelY * dt;
            cubeRotZ += cubeVelZ * dt;
        }

        // Shatter trigger
        if (cubeConfig.shatter && speed > cubeConfig.shatterSens && !isShattered) {
            triggerShatter();
        }
    }

    // Apply rotation
    euler.set(cubeRotX, cubeRotY, cubeRotZ, 'XYZ');
    if (!isShattered) {
        cubeObj.setRotationFromEuler(euler);
        if (edgeObj) edgeObj.setRotationFromEuler(euler);
        if (glowObj) glowObj.setRotationFromEuler(euler);
    } else {
        shatterGroup.setRotationFromEuler(euler);
    }

    updateShatter(dt);

    // Reflection
    if (cubeConfig.reflection && reflectionCube) {
        reflectionCube.rotation.copy(cubeObj.rotation);
        reflectionCube.position.y = -cubeConfig.size * cubeConfig.reflDistance * 2;
    }

    // Edge animation
    if (edgeObj && edgeObj.visible) {
        edgeMaterial.opacity = 0.2 + 0.15 * Math.sin(globalTime * 1.8);
        edgeMaterial.color.setHSL((globalTime * 0.04) % 1, 1, 0.65);
    }

    // Glow animation
    if (glowObj && glowObj.visible) {
        glowMaterial.opacity = 0.03 + 0.02 * Math.sin(globalTime * 1.2);
        glowMaterial.color.setHSL((globalTime * 0.03) % 1, 1, 0.5);
    }

    // Lights animation
    if (cubeConfig.lights) {
        pointLight1.position.set(Math.sin(globalTime * 0.25) * 4.5, Math.cos(globalTime * 0.35) * 3.5, 3 + Math.sin(globalTime * 0.15) * 1.5);
        pointLight1.color.setHSL((globalTime * 0.06) % 1, 1, 0.55);
        pointLight2.position.set(Math.cos(globalTime * 0.2) * 4.5, Math.sin(globalTime * 0.3) * 3.5, 2);
        pointLight2.color.setHSL((globalTime * 0.06 + 0.4) % 1, 1, 0.55);
        pointLight3.position.set(Math.sin(globalTime * 0.18) * 3, 3 + Math.cos(globalTime * 0.12) * 2, -2);
    }

    // Zen mode camera
    if (zenMode) {
        const za = globalTime * cubeConfig.zenSpeed;
        camera.position.set(
            Math.sin(za) * cubeConfig.zenRadius,
            1.5 + Math.sin(za * 0.3) * 1.5,
            Math.cos(za) * cubeConfig.zenRadius
        );
        camera.lookAt(0, 0, 0);
    } else {
        // Subtle camera sway
        camera.position.x = Math.sin(globalTime * 0.06) * 0.15;
        camera.position.y = 0.3 + Math.cos(globalTime * 0.08) * 0.1;
        camera.position.z = 5.5 + Math.sin(globalTime * 0.04) * 0.2;
        camera.lookAt(0, 0, 0);
    }

    // Fog
    scene.fog = cubeConfig.fog ? new THREE.FogExp2(0x020208, 0.015) : null;

    renderer.render(scene, camera);
}

// ═══════════ RESIZE ═══════════
function onCubeResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onCubeResize);
window.addEventListener('orientationchange', () => setTimeout(onCubeResize, 200));

// ═══════════ SYNC WITH XORETEX (engine2d.js) ═══════════
// If engine2d changes equation, optionally sync to cube
window.syncCubeWithXoretex = function(equationCode) {
    // Could parse and map Xoretex equations to cube patterns
    // For now, just trigger a random pattern change
    cubeRandom();
};

// ═══════════ BOOT ═══════════
buildCubePanel();
switchPattern(0);
cubeAnimate();

console.log('%c🎲 Cube3D Engine loaded', 'color:#00ccff;font-size:14px;font-weight:bold',
    `| Faces: 6x${FACE_RES}px | Patterns: 60`);

})();
