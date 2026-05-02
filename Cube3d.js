/**
 * Xoretex Xhaos Cube — cube3d.js
 * Three.js 3D Cube Engine
 * 60 Procedural Patterns, Morphing, Reflection, Edge Glow,
 * Shatter Effect, Cube Interaction, Audio Reactivity
 * Part 1: Setup, patterns, face textures
 */

'use strict';

// ============================================================
// SAFE GUARD — do not break 2D engine if Three.js missing
// ============================================================
if (typeof THREE === 'undefined') {
  console.warn('[cube3d] Three.js not loaded — 3D engine disabled');
  window.setCubeVisible = function() {};
  window.nextCubePattern = function() {};
} else {
  initCube3D();
}

// ============================================================
// CUBE STATE
// ============================================================
function initCube3D() {
  const CUBE = {
    scene: null,
    camera: null,
    renderer: null,
    cube: null,
    edges: null,
    reflectionCube: null,
    reflectionFloor: null,
    floorGrid: null,
    materials: [],
    faceCanvases: [],
    faceCtxs: [],
    faceTextures: [],
    patternIndex: 0,
    patternTarget: 0,
    morphProgress: 1.0,
    morphSpeed: 0.03,
    autoSpin: true,
    zenOrbit: false,
    autoPattern: false,
    autoInterval: 8,
    autoTimer: 0,
    rotX: 0.3,
    rotY: 0.5,
    rotVX: 0,
    rotVY: 0.003,
    dragging: false,
    lastMX: 0,
    lastMY: 0,
    momentum: { x: 0, y: 0 },
    zenAngle: 0,
    shattered: false,
    shards: [],
    edgeGlow: 0.8,
    emissive: 0.3,
    reflection: true,
    showFloorGrid: false,
    running: true,
    animID: null,
    time: 0,
    lastTime: 0,
    faceSize: 512,
  };

  // ============================================================
  // 60 PATTERN NAMES
  // ============================================================
  const PATTERN_NAMES = [
    'Fiber Optics','Digital Silk','Wave Turbulence','Dynamic Vortex','Neural Grid',
    'Data Blocks','Sand Waves','Galactic River','Radial Drift','Geometric Repeat',
    'Magnetic Field','Ordered Chaos','Fractal Spiral','Electric Storm','DNA Helix',
    'Coral Growth','Quantum Field','Topographic Map','Mirror Flow','Smoke Simulation',
    'Crystal Lattice','Nebula','Woven Fabric','Black Hole','Aurora Borealis',
    'Voronoi Flow','Interference Rings','Tornado','Neural Network','Galaxy Arm',
    'Liquid Marble','Solar Flare','Frozen Veins','Velvet Fold','Band Current',
    'Sonic Ripples','Plasma Mesh','Marble Vein','Hyper Tunnel','Biofilm Drift',
    'Grid Stream','Cloud Chamber','Ink Diffusion','Luminous Web','Harmonic Tiles',
    'Spiral Garden','Mercury Flow','Prism Wave','Orbit Net','Ember Drift',
    'Glass Refraction','Ocean Current','Silk Bloom','Flux Rings','Industrial Flow',
    'Star Nursery','Wave Lattice','Moire Pulse','Orbital Current','Phantom Field',
  ];

  // ============================================================
  // 60 PATTERN DRAW FUNCTIONS
  // Each receives (ctx, size, t, faceIndex)
  // ============================================================
  const PATTERNS = [

    // 0 Fiber Optics
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000814';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 24; i++) {
        const y = (i / 24) * S;
        const amp = 30 + Math.sin(t * 0.7 + i) * 20;
        const freq = 0.015 + i * 0.001;
        ctx.beginPath();
        ctx.strokeStyle = `hsl(${160 + i * 8},100%,${50 + Math.sin(t + i) * 20}%)`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 6;
        for (let x = 0; x <= S; x += 2) {
          const py = y + Math.sin(x * freq + t + i) * amp;
          x === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    },

    // 1 Digital Silk
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#030010';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < S; i += 4) {
        const v = Math.sin(i * 0.02 + t) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(0,${Math.floor(v * 255)},${Math.floor((1 - v) * 200)},0.6)`;
        ctx.fillRect(i, 0, 3, S);
      }
      for (let j = 0; j < S; j += 4) {
        const v = Math.cos(j * 0.02 + t * 1.3) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(${Math.floor(v * 180)},0,${Math.floor(v * 255)},0.3)`;
        ctx.fillRect(0, j, S, 3);
      }
    },

    // 2 Wave Turbulence
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const nx = x / S * 6;
          const ny = y / S * 6;
          const v = Math.sin(nx + t) * Math.cos(ny + t * 0.7) +
                    Math.sin((nx + ny) * 1.5 + t * 0.5) * 0.5;
          const c = Math.floor((v * 0.5 + 0.5) * 255);
          const idx = (y * S + x) * 4;
          img.data[idx]   = 0;
          img.data[idx+1] = c;
          img.data[idx+2] = Math.floor(c * 0.8);
          img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 3 Dynamic Vortex
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let r = S * 0.02; r < S * 0.55; r += 3) {
        const hue = (r / S * 360 + t * 60) % 360;
        const alpha = 0.6 - r / S;
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hue},100%,60%,${Math.max(0, alpha)})`;
        ctx.lineWidth = 2;
        const startAngle = t + r * 0.04;
        const endAngle = startAngle + Math.PI * 1.5;
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.stroke();
      }
    },

    // 4 Neural Grid
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000a0a';
      ctx.fillRect(0, 0, S, S);
      const nodes = [];
      for (let i = 0; i < 16; i++) {
        nodes.push({
          x: (Math.sin(i * 2.4 + t * 0.3) * 0.45 + 0.5) * S,
          y: (Math.cos(i * 1.7 + t * 0.2) * 0.45 + 0.5) * S,
        });
      }
      nodes.forEach((a, i) => {
        nodes.forEach((b, j) => {
          if (j <= i) return;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < S * 0.4) {
            const alpha = 1 - d / (S * 0.4);
            ctx.strokeStyle = `rgba(0,255,180,${alpha * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        });
        ctx.fillStyle = '#00ffc8';
        ctx.shadowColor = '#00ffc8'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.shadowBlur = 0;
    },

    // 5 Data Blocks
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cols = 12;
      const bw = S / cols;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < cols; j++) {
          const v = Math.sin(i * 0.5 + j * 0.5 + t) * 0.5 + 0.5;
          const h = Math.floor(v * bw);
          const hue = (i * 30 + j * 20 + t * 30) % 360;
          ctx.fillStyle = `hsla(${hue},100%,50%,${0.3 + v * 0.5})`;
          ctx.fillRect(i * bw + 1, j * bw + bw - h, bw - 2, h);
        }
      }
    },

    // 6 Sand Waves
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#100800';
      ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 2) {
        const shift = Math.sin(y * 0.03 + t) * 40 + Math.sin(y * 0.07 + t * 0.5) * 20;
        const bright = 40 + Math.sin(y * 0.05 + t * 0.3) * 30;
        ctx.fillStyle = `hsl(36,${70 + bright * 0.3}%,${bright}%)`;
        ctx.fillRect(shift % S, y, S - (shift % S), 2);
        ctx.fillRect(0, y, shift % S, 2);
      }
    },

    // 7 Galactic River
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#00000f';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 200; i++) {
        const angle = (i / 200) * Math.PI * 2 + t * 0.1;
        const r = (i / 200) * S * 0.5;
        const x = S / 2 + Math.cos(angle + Math.sin(r * 0.02) * 2) * r;
        const y = S / 2 + Math.sin(angle + Math.cos(r * 0.02) * 2) * r * 0.6;
        const alpha = 0.4 + Math.sin(i * 0.3 + t) * 0.3;
        ctx.fillStyle = `rgba(${80 + i * 0.5},${100 + i * 0.3},255,${alpha})`;
        ctx.fillRect(x, y, 2, 2);
      }
    },

    // 8 Radial Drift
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let a = 0; a < Math.PI * 2; a += 0.08) {
        for (let r = 10; r < S * 0.5; r += 8) {
          const drift = Math.sin(r * 0.05 + t + a * 3) * 10;
          const x = cx + Math.cos(a + drift * 0.01) * (r + drift);
          const y = cy + Math.sin(a + drift * 0.01) * (r + drift);
          const alpha = 0.3 + Math.sin(r * 0.1 + t) * 0.2;
          const hue = (a / (Math.PI * 2) * 360 + t * 40) % 360;
          ctx.fillStyle = `hsla(${hue},100%,60%,${alpha})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    },

    // 9 Geometric Repeat
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, S, S);
      const n = 6;
      const step = S / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const cx = i * step + step / 2;
          const cy = j * step + step / 2;
          const rot = t + (i + j) * 0.4;
          const sz = step * 0.35;
          const hue = ((i * n + j) * 25 + t * 20) % 360;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          ctx.strokeStyle = `hsl(${hue},100%,60%)`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
          ctx.rotate(rot * 0.5);
          ctx.strokeStyle = `hsl(${(hue + 60) % 360},100%,70%)`;
          ctx.strokeRect(-sz * 0.6 / 2, -sz * 0.6 / 2, sz * 0.6, sz * 0.6);
          ctx.restore();
        }
      }
    },

    // 10 Magnetic Field
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const poles = [
        { x: S * 0.3, y: S * 0.5, sign: 1 },
        { x: S * 0.7, y: S * 0.5, sign: -1 },
      ];
      for (let y = 0; y < S; y += 10) {
        for (let x = 0; x < S; x += 10) {
          let fx = 0, fy = 0;
          poles.forEach(p => {
            const dx = x - p.x, dy = y - p.y;
            const d2 = dx * dx + dy * dy + 1;
            fx += p.sign * dx / d2 * 1000;
            fy += p.sign * dy / d2 * 1000;
          });
          const len = Math.sqrt(fx * fx + fy * fy);
          if (len > 0) {
            const nx = fx / len * 5, ny = fy / len * 5;
            const hue = (Math.atan2(fy, fx) / Math.PI * 180 + 180 + t * 10) % 360;
            ctx.strokeStyle = `hsla(${hue},100%,60%,0.6)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - nx, y - ny);
            ctx.lineTo(x + nx, y + ny);
            ctx.stroke();
          }
        }
      }
    },

    // 11 Ordered Chaos
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#010108';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 80; i++) {
        const x = (Math.sin(i * 1.3 + t * 0.5) * 0.5 + 0.5) * S;
        const y = (Math.cos(i * 0.9 + t * 0.3) * 0.5 + 0.5) * S;
        const r = 2 + Math.sin(i + t) * 4;
        const hue = (i * 15 + t * 30) % 360;
        ctx.fillStyle = `hsl(${hue},100%,60%)`;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    },

    // 12 Fractal Spiral
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      ctx.save();
      ctx.translate(cx, cy);
      for (let depth = 0; depth < 6; depth++) {
        const scale = Math.pow(0.6, depth);
        const rot = t * (depth % 2 === 0 ? 1 : -1) * 0.5 + depth;
        ctx.save();
        ctx.rotate(rot);
        ctx.scale(scale, scale);
        const hue = (depth * 40 + t * 20) % 360;
        ctx.strokeStyle = `hsl(${hue},100%,60%)`;
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.05) {
          const r2 = a * S * 0.04;
          const x = Math.cos(a) * r2;
          const y = Math.sin(a) * r2;
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    },

    // 13 Electric Storm
    function(ctx, S, t, fi) {
      ctx.fillStyle = 'rgba(0,0,10,0.7)';
      ctx.fillRect(0, 0, S, S);
      for (let b = 0; b < 5; b++) {
        const startX = (Math.sin(b * 1.4 + t * 0.2) * 0.5 + 0.5) * S;
        let x = startX, y = 0;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.strokeStyle = `rgba(${150 + b * 20},${150 + b * 10},255,0.9)`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#8080ff'; ctx.shadowBlur = 12;
        while (y < S) {
          x += (Math.random() - 0.5) * 30;
          y += 10 + Math.random() * 10;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    },

    // 14 DNA Helix
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000a05';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2;
      for (let y = 0; y < S; y += 3) {
        const phase = y * 0.04 + t;
        const x1 = cx + Math.sin(phase) * 80;
        const x2 = cx + Math.sin(phase + Math.PI) * 80;
        const alpha = 0.4 + Math.sin(phase) * 0.3;
        ctx.fillStyle = `rgba(0,255,160,${alpha})`;
        ctx.fillRect(x1, y, 4, 3);
        ctx.fillStyle = `rgba(255,0,200,${alpha})`;
        ctx.fillRect(x2, y, 4, 3);
        if (Math.floor(y / 3) % 5 === 0) {
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x1 + 2, y + 1); ctx.lineTo(x2 + 2, y + 1); ctx.stroke();
        }
      }
    },

    // 15 Coral Growth
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000510';
      ctx.fillRect(0, 0, S, S);
      function branch(x, y, angle, length, depth) {
        if (depth === 0 || length < 1) return;
        const ex = x + Math.cos(angle) * length;
        const ey = y + Math.sin(angle) * length;
        const hue = depth * 30 + t * 20;
        ctx.strokeStyle = `hsl(${hue % 360},100%,${40 + depth * 8}%)`;
        ctx.lineWidth = depth * 0.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        const spread = 0.4 + Math.sin(t + depth) * 0.1;
        branch(ex, ey, angle - spread, length * 0.7, depth - 1);
        branch(ex, ey, angle + spread, length * 0.7, depth - 1);
      }
      branch(S / 2, S, -Math.PI / 2 + Math.sin(t * 0.3) * 0.2, S * 0.22, 7);
    },

    // 16 Quantum Field
    function(ctx, S, t, fi) {
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const nx = x / S * 8, ny = y / S * 8;
          const v = Math.sin(nx + t) * Math.sin(ny + t * 0.8) *
                    Math.cos((nx + ny) * 0.5 + t * 0.6);
          const c = Math.floor((v * 0.5 + 0.5) * 255);
          const idx = (y * S + x) * 4;
          img.data[idx]   = Math.floor(c * 0.1);
          img.data[idx+1] = c;
          img.data[idx+2] = Math.floor(c * 0.6);
          img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 17 Topographic Map
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#001008';
      ctx.fillRect(0, 0, S, S);
      const levels = 14;
      for (let lv = 0; lv < levels; lv++) {
        const threshold = lv / levels;
        ctx.beginPath();
        const hue = 120 + lv * 15;
        ctx.strokeStyle = `hsl(${hue},80%,${30 + lv * 3}%)`;
        ctx.lineWidth = 1;
        let first = true;
        for (let x = 0; x <= S; x += 3) {
          const h = Math.sin(x * 0.015 + t) * 0.3 +
                    Math.sin(x * 0.03 + t * 0.7) * 0.2 + 0.5;
          const y = h * S;
          if (Math.abs(h - threshold) < 0.04) {
            first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            first = false;
          } else { first = true; }
        }
        ctx.stroke();
      }
    },

    // 18 Mirror Flow
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const half = S / 2;
      for (let y = 0; y < half; y += 3) {
        for (let x = 0; x < half; x += 3) {
          const v = Math.sin(x * 0.02 + y * 0.015 + t) * 0.5 + 0.5;
          const hue = (v * 200 + t * 20) % 360;
          const a = 0.2 + v * 0.5;
          ctx.fillStyle = `hsla(${hue},100%,60%,${a})`;
          ctx.fillRect(x, y, 3, 3);
          ctx.fillRect(S - x - 3, y, 3, 3);
          ctx.fillRect(x, S - y - 3, 3, 3);
          ctx.fillRect(S - x - 3, S - y - 3, 3, 3);
        }
      }
    },

    // 19 Smoke Simulation
    function(ctx, S, t, fi) {
      ctx.fillStyle = 'rgba(5,5,10,0.25)';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(i * 0.7 + t * 0.3) * 0.45 + 0.5) * S;
        const y = S - (((t * 30 + i * 20) % S));
        const r = 20 + Math.sin(i + t) * 10;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, `rgba(150,160,180,0.15)`);
        grd.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    },
  ]; // end first 20 patterns

  // ============================================================
  // PATTERNS 20-59
  // ============================================================
  const PATTERNS2 = [

    // 20 Crystal Lattice
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000510';
      ctx.fillRect(0, 0, S, S);
      const cell = 40;
      for (let y = 0; y < S + cell; y += cell) {
        for (let x = 0; x < S + cell; x += cell) {
          const ox = x + Math.sin(y * 0.05 + t) * 8;
          const oy = y + Math.cos(x * 0.05 + t) * 8;
          const hue = (x + y + t * 30) % 360;
          ctx.strokeStyle = `hsl(${hue},100%,55%)`;
          ctx.lineWidth = 1;
          ctx.save();
          ctx.translate(ox, oy);
          ctx.rotate(t * 0.2);
          ctx.beginPath();
          ctx.moveTo(-cell * 0.4, 0); ctx.lineTo(cell * 0.4, 0);
          ctx.moveTo(0, -cell * 0.4); ctx.lineTo(0, cell * 0.4);
          ctx.stroke();
          ctx.restore();
        }
      }
    },

    // 21 Nebula
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#00000f';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 60; i++) {
        const x = (Math.sin(i * 2.1 + t * 0.15) * 0.45 + 0.5) * S;
        const y = (Math.cos(i * 1.7 + t * 0.12) * 0.45 + 0.5) * S;
        const r = 15 + Math.sin(i + t) * 8;
        const hue = (i * 12 + t * 10) % 360;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, `hsla(${hue},100%,70%,0.4)`);
        grd.addColorStop(1, `hsla(${hue},100%,40%,0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    },

    // 22 Woven Fabric
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#050010';
      ctx.fillRect(0, 0, S, S);
      const w = 8;
      for (let i = 0; i < S / w; i++) {
        const phase = i * 0.4 + t;
        ctx.fillStyle = `hsl(${(i * 20 + t * 15) % 360},80%,50%)`;
        ctx.fillRect(i * w, 0, w * 0.7, S);
      }
      ctx.globalCompositeOperation = 'multiply';
      for (let j = 0; j < S / w; j++) {
        const phase = j * 0.4 + t;
        const alpha = 0.4 + Math.sin(phase) * 0.3;
        ctx.fillStyle = `hsla(${(j * 15 + t * 20 + 120) % 360},80%,60%,${alpha})`;
        ctx.fillRect(0, j * w, S, w * 0.7);
      }
      ctx.globalCompositeOperation = 'source-over';
    },

    // 23 Black Hole
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let r = S * 0.5; r > 2; r -= 2) {
        const hue = (r + t * 60) % 360;
        const alpha = (1 - r / (S * 0.5)) * 0.6;
        const warp = Math.sin(r * 0.05 + t) * 6;
        ctx.beginPath();
        ctx.arc(cx + warp, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue},100%,${20 + (1 - r / (S * 0.5)) * 60}%,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.12);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.12, 0, Math.PI * 2); ctx.fill();
    },

    // 24 Aurora Borealis
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000510';
      ctx.fillRect(0, 0, S, S);
      for (let band = 0; band < 5; band++) {
        const baseY = S * (0.2 + band * 0.12);
        const hue = 100 + band * 40 + t * 15;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= S; x += 4) {
          const y = baseY + Math.sin(x * 0.01 + t + band) * 30 +
                    Math.sin(x * 0.03 + t * 0.7 + band * 1.3) * 15;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(S, S); ctx.lineTo(0, S); ctx.closePath();
        const grd = ctx.createLinearGradient(0, baseY - 40, 0, baseY + 40);
        grd.addColorStop(0, `hsla(${hue % 360},100%,70%,0)`);
        grd.addColorStop(0.5, `hsla(${hue % 360},100%,60%,0.3)`);
        grd.addColorStop(1, `hsla(${hue % 360},100%,40%,0)`);
        ctx.fillStyle = grd;
        ctx.fill();
      }
    },

    // 25 Voronoi Flow
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const seeds = [];
      for (let i = 0; i < 12; i++) {
        seeds.push({
          x: (Math.sin(i * 2.3 + t * 0.2) * 0.45 + 0.5) * S,
          y: (Math.cos(i * 1.8 + t * 0.15) * 0.45 + 0.5) * S,
          hue: (i * 30 + t * 10) % 360,
        });
      }
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          let minD = Infinity, closest = 0;
          for (let i = 0; i < seeds.length; i++) {
            const d = (x - seeds[i].x) ** 2 + (y - seeds[i].y) ** 2;
            if (d < minD) { minD = d; closest = i; }
          }
          const hue = seeds[closest].hue;
          const f = 1 - Math.sqrt(minD) / (S * 0.4);
          const r2 = Math.floor(Math.sin(hue / 60 * Math.PI) * 80 * f + 20);
          const g2 = Math.floor(Math.sin(hue / 60 * Math.PI + 2) * 80 * f + 20);
          const b2 = Math.floor(Math.sin(hue / 60 * Math.PI + 4) * 80 * f + 20);
          const idx = (y * S + x) * 4;
          img.data[idx] = Math.max(0, Math.min(255, r2));
          img.data[idx+1] = Math.max(0, Math.min(255, g2));
          img.data[idx+2] = Math.max(0, Math.min(255, b2));
          img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 26 Interference Rings
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const sources = [
        { x: S * 0.35, y: S * 0.5 },
        { x: S * 0.65, y: S * 0.5 },
        { x: S * 0.5,  y: S * 0.3 },
      ];
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          let sum = 0;
          sources.forEach(src => {
            const d = Math.sqrt((x - src.x) ** 2 + (y - src.y) ** 2);
            sum += Math.sin(d * 0.08 - t * 3);
          });
          const v = (sum / sources.length) * 0.5 + 0.5;
          const idx = (y * S + x) * 4;
          img.data[idx]   = Math.floor(v * 50);
          img.data[idx+1] = Math.floor(v * 255);
          img.data[idx+2] = Math.floor(v * 200);
          img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 27 Tornado
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#050010';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2;
      for (let y = S; y > 0; y -= 2) {
        const progress = 1 - y / S;
        const radius = progress * progress * S * 0.45 + 2;
        const angle = progress * Math.PI * 8 + t * 2;
        const x = cx + Math.sin(angle) * radius * 0.1;
        const hue = (progress * 200 + t * 30) % 360;
        const alpha = 0.3 + progress * 0.4;
        ctx.strokeStyle = `hsla(${hue},80%,60%,${alpha})`;
        ctx.lineWidth = radius * 0.08;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    },

    // 28 Neural Network
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000a08';
      ctx.fillRect(0, 0, S, S);
      const layers2d = [4, 6, 6, 4];
      const lx = [S*0.15, S*0.38, S*0.62, S*0.85];
      const nodes = [];
      layers2d.forEach((count, li) => {
        for (let ni = 0; ni < count; ni++) {
          const y = S * (ni + 1) / (count + 1);
          nodes.push({ x: lx[li], y, li, ni, act: Math.sin(t + li * 2 + ni * 1.3) });
        }
      });
      nodes.forEach(a => {
        nodes.forEach(b => {
          if (b.li !== a.li + 1) return;
          const alpha = 0.1 + Math.abs(a.act * b.act) * 0.3;
          ctx.strokeStyle = `rgba(0,255,160,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        });
        const r2 = 4 + Math.abs(a.act) * 4;
        const alpha = 0.5 + a.act * 0.5;
        ctx.fillStyle = `rgba(0,255,${Math.floor(alpha * 200)},${Math.abs(a.act)})`;
        ctx.shadowColor = '#00ffa0'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(a.x, a.y, r2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.shadowBlur = 0;
    },

    // 29 Galaxy Arm
    function(ctx, S, t, fi) {
      ctx.fillStyle = 'rgba(0,0,8,0.85)';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let arm = 0; arm < 3; arm++) {
        for (let i = 0; i < 150; i++) {
          const r2 = (i / 150) * S * 0.45;
          const angle = i * 0.12 + arm * Math.PI * 2 / 3 + t * 0.08;
          const x = cx + Math.cos(angle) * r2;
          const y = cy + Math.sin(angle) * r2 * 0.7;
          const scatter = r2 * 0.08;
          const sx = x + (Math.random() - 0.5) * scatter;
          const sy = y + (Math.random() - 0.5) * scatter;
          const bright = 1 - i / 150;
          const hue = (arm * 120 + t * 8 + i * 0.5) % 360;
          ctx.fillStyle = `hsla(${hue},80%,80%,${bright * 0.6})`;
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
    },
  ]; // end patterns 20-29

  // Patterns 30-59 — continued set
  const PATTERNS3 = [

    // 30 Liquid Marble
    function(ctx, S, t, fi) {
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const nx = x / S * 4, ny = y / S * 4;
          const v = Math.sin(nx * 3 + Math.sin(ny * 2 + t) * 2 + t * 0.5) * 0.5 + 0.5;
          const r2 = Math.floor(v * 120 + 20);
          const g2 = Math.floor(v * 100 + 10);
          const b2 = Math.floor(v * 180 + 40);
          const idx = (y * S + x) * 4;
          img.data[idx] = r2; img.data[idx+1] = g2;
          img.data[idx+2] = b2; img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 31 Solar Flare
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#0a0000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2 + S * 0.15;
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + t * 0.3;
        const len = S * (0.2 + Math.sin(i * 0.7 + t) * 0.15);
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy + Math.sin(angle) * len * 0.6;
        const hue = 15 + i * 3;
        ctx.strokeStyle = `hsl(${hue},100%,60%)`;
        ctx.lineWidth = 2 + Math.sin(i + t) * 2;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.stroke();
      }
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.15);
      grd.addColorStop(0, 'rgba(255,220,100,1)');
      grd.addColorStop(0.5, 'rgba(255,100,0,0.5)');
      grd.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    },

    // 32 Frozen Veins
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000510';
      ctx.fillRect(0, 0, S, S);
      function vein(x, y, angle, len, depth) {
        if (depth === 0 || len < 2) return;
        const ex = x + Math.cos(angle) * len;
        const ey = y + Math.sin(angle) * len;
        ctx.strokeStyle = `rgba(${150 + depth * 15},${200 + depth * 8},255,${0.3 + depth * 0.1})`;
        ctx.lineWidth = depth * 0.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        const wobble = 0.3 + Math.sin(t + depth) * 0.1;
        vein(ex, ey, angle - wobble, len * 0.65, depth - 1);
        vein(ex, ey, angle + wobble, len * 0.65, depth - 1);
        if (depth > 2) vein(ex, ey, angle, len * 0.5, depth - 2);
      }
      vein(S * 0.2, S * 0.8, -Math.PI / 3 + Math.sin(t * 0.2) * 0.1, S * 0.18, 6);
      vein(S * 0.8, S * 0.8, -Math.PI * 2 / 3 + Math.sin(t * 0.2) * 0.1, S * 0.18, 6);
    },

    // 33 Velvet Fold
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#080008';
      ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 2) {
        const fold = Math.sin(y * 0.02 + t) * 0.5 + Math.sin(y * 0.05 + t * 0.6) * 0.3;
        const hue = (fold * 120 + 280 + t * 10) % 360;
        const bright = 30 + fold * 40;
        ctx.fillStyle = `hsl(${hue},80%,${bright}%)`;
        ctx.fillRect(0, y, S, 2);
      }
    },

    // 34 Band Current
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 20; i++) {
        const y = (i / 20) * S;
        const speed = (i % 3 === 0 ? 1 : -0.6) * (0.5 + (i % 4) * 0.25);
        const offset = (t * speed * 60) % S;
        const hue = (i * 18 + t * 15) % 360;
        const alpha = 0.4 + Math.sin(i + t) * 0.2;
        ctx.fillStyle = `hsla(${hue},100%,55%,${alpha})`;
        for (let x = -S + offset; x < S; x += S * 0.15) {
          ctx.fillRect(x, y, S * 0.1, S / 20 - 1);
        }
      }
    },

    // 35 Sonic Ripples
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let r2 = 0; r2 < S * 0.7; r2 += 8) {
        const phase = r2 * 0.06 - t * 4;
        const alpha = (0.5 + Math.sin(phase) * 0.4) * (1 - r2 / (S * 0.7));
        if (alpha < 0) continue;
        const hue = (r2 * 0.5 + t * 30) % 360;
        ctx.strokeStyle = `hsla(${hue},100%,65%,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke();
      }
    },

    // 36 Plasma Mesh
    function(ctx, S, t, fi) {
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const nx = x / S, ny = y / S;
          const v1 = Math.sin(nx * 10 + t);
          const v2 = Math.sin(ny * 10 + t * 0.9);
          const v3 = Math.sin((nx + ny) * 7 + t * 1.2);
          const v4 = Math.sin(Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 12 - t * 2);
          const v = (v1 + v2 + v3 + v4) / 4;
          const hue = v * 180 + 160;
          const r2 = Math.floor((Math.sin(hue) * 0.5 + 0.5) * 200);
          const g2 = Math.floor((Math.sin(hue + 2) * 0.5 + 0.5) * 100);
          const b2 = Math.floor((Math.sin(hue + 4) * 0.5 + 0.5) * 255);
          const idx = (y * S + x) * 4;
          img.data[idx] = r2; img.data[idx+1] = g2;
          img.data[idx+2] = b2; img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 37 Marble Vein
    function(ctx, S, t, fi) {
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const nx = x / S * 5, ny = y / S * 5;
          let val = Math.abs(Math.sin(nx + Math.sin(ny + t) * 3 + t * 0.3) * Math.PI);
          val = val / Math.PI;
          const r2 = Math.floor(200 * val + 30);
          const g2 = Math.floor(220 * val + 10);
          const b2 = Math.floor(255 * val);
          const idx = (y * S + x) * 4;
          img.data[idx] = r2; img.data[idx+1] = g2;
          img.data[idx+2] = b2; img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 38 Hyper Tunnel
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let ring = 20; ring > 0; ring--) {
        const progress = ring / 20;
        const r2 = progress * S * 0.48;
        const twist = t * 2 + progress * Math.PI * 4;
        const hue = (progress * 360 + t * 40) % 360;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(twist);
        ctx.strokeStyle = `hsl(${hue},100%,${30 + progress * 40}%)`;
        ctx.lineWidth = 2;
        const sides = 6;
        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
          const a = (s / sides) * Math.PI * 2;
          const px = Math.cos(a) * r2;
          const py = Math.sin(a) * r2;
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
        ctx.restore();
      }
    },

    // 39 Biofilm Drift
    function(ctx, S, t, fi) {
      ctx.fillStyle = 'rgba(0,8,4,0.3)';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 40; i++) {
        const x = (Math.sin(i * 1.9 + t * 0.15) * 0.4 + 0.5) * S;
        const y = (Math.cos(i * 1.3 + t * 0.12) * 0.4 + 0.5) * S;
        const r2 = 8 + Math.sin(i + t) * 4;
        const hue = (100 + i * 5 + t * 10) % 360;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r2);
        grd.addColorStop(0, `hsla(${hue},80%,60%,0.6)`);
        grd.addColorStop(1, `hsla(${hue},80%,40%,0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.fill();
      }
    },

    // 40 Grid Stream
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000a08';
      ctx.fillRect(0, 0, S, S);
      const grid = 32;
      const cell = S / grid;
      for (let gy = 0; gy < grid; gy++) {
        for (let gx = 0; gx < grid; gx++) {
          const cx2 = gx * cell + cell / 2;
          const cy2 = gy * cell + cell / 2;
          const angle = Math.sin(gx * 0.3 + t) * Math.cos(gy * 0.3 + t * 0.8) * Math.PI;
          const len = cell * 0.35;
          const hue = (gx * 10 + gy * 8 + t * 20) % 360;
          const ex = cx2 + Math.cos(angle) * len;
          const ey = cy2 + Math.sin(angle) * len;
          ctx.strokeStyle = `hsl(${hue},100%,55%)`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    },

    // 41 Cloud Chamber
    function(ctx, S, t, fi) {
      ctx.fillStyle = 'rgba(2,0,8,0.2)';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 12; i++) {
        const startX = (Math.random() + Math.sin(i + t)) * S * 0.5;
        const startY = (Math.random() + Math.cos(i + t)) * S * 0.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        let x = startX, y = startY;
        const hue = (i * 30 + t * 20) % 360;
        ctx.strokeStyle = `hsla(${hue},100%,70%,0.5)`;
        ctx.lineWidth = 0.8;
        for (let step = 0; step < 40; step++) {
          x += (Math.random() - 0.48) * 12;
          y += (Math.random() - 0.52) * 12;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },

    // 42 Ink Diffusion
    function(ctx, S, t, fi) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 8; i++) {
        const x = (Math.sin(i * 2 + t * 0.1) * 0.4 + 0.5) * S;
        const y = (Math.cos(i * 1.5 + t * 0.08) * 0.4 + 0.5) * S;
        const r2 = 30 + Math.sin(t + i) * 15;
        const hue = (i * 45 + t * 5) % 360;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r2);
        grd.addColorStop(0, `hsla(${hue},60%,15%,0.8)`);
        grd.addColorStop(0.5, `hsla(${hue},80%,30%,0.4)`);
        grd.addColorStop(1, `hsla(${hue},100%,50%,0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.fill();
      }
    },

    // 43 Luminous Web
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const pts = [];
      for (let i = 0; i < 20; i++) {
        pts.push({
          x: (Math.sin(i * 2.1 + t * 0.2) * 0.45 + 0.5) * S,
          y: (Math.cos(i * 1.8 + t * 0.15) * 0.45 + 0.5) * S,
        });
      }
      pts.forEach((a, i) => {
        pts.forEach((b, j) => {
          if (j <= i) return;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < S * 0.35) {
            const alpha = (1 - d / (S * 0.35)) * 0.5;
            const hue = (i * 18 + j * 12 + t * 15) % 360;
            ctx.strokeStyle = `hsla(${hue},100%,65%,${alpha})`;
            ctx.lineWidth = alpha * 2;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        });
      });
    },

    // 44 Harmonic Tiles
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const n = 8;
      const cell = S / n;
      for (let gy = 0; gy < n; gy++) {
        for (let gx = 0; gx < n; gx++) {
          const phase = (gx + gy) * 0.5 + t;
          const hue = (gx * 30 + gy * 20 + t * 20) % 360;
          const sz = cell * (0.3 + Math.sin(phase) * 0.2);
          const cx2 = gx * cell + cell / 2;
          const cy2 = gy * cell + cell / 2;
          ctx.save();
          ctx.translate(cx2, cy2);
          ctx.rotate(phase);
          ctx.strokeStyle = `hsl(${hue},100%,60%)`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
      }
    },

    // 45 Spiral Garden
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000a05';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let arm = 0; arm < 5; arm++) {
        const baseAngle = (arm / 5) * Math.PI * 2 + t * 0.3;
        for (let i = 0; i < 80; i++) {
          const r2 = (i / 80) * S * 0.44;
          const a = baseAngle + i * 0.1;
          const x = cx + Math.cos(a) * r2;
          const y = cy + Math.sin(a) * r2;
          const hue = (arm * 72 + i * 2 + t * 20) % 360;
          const sz = 1.5 + (i / 80) * 3;
          ctx.fillStyle = `hsl(${hue},100%,60%)`;
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    },

    // 46 Mercury Flow
    function(ctx, S, t, fi) {
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const nx = x / S * 6, ny = y / S * 6;
          const v = Math.sin(nx + Math.sin(ny * 1.2 + t) * 2 + t) * 0.5 + 0.5;
          const metal = Math.floor(160 + v * 80);
          const idx = (y * S + x) * 4;
          img.data[idx] = metal; img.data[idx+1] = metal;
          img.data[idx+2] = Math.floor(metal * 1.1); img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 47 Prism Wave
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 2) {
        for (let y = 0; y < S; y += 2) {
          const v = Math.sin(x * 0.02 + t) + Math.cos(y * 0.02 + t * 0.7);
          const hue = (v * 90 + 180 + t * 20) % 360;
          const bright = 30 + Math.abs(v) * 25;
          ctx.fillStyle = `hsl(${hue},100%,${bright}%)`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    },

    // 48 Orbit Net
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000a12';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      const orbits = [80, 140, 190, 230];
      orbits.forEach((r2, oi) => {
        ctx.strokeStyle = `rgba(0,200,255,0.15)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke();
        const np = 3 + oi;
        for (let p = 0; p < np; p++) {
          const angle = (p / np) * Math.PI * 2 + t * (0.3 + oi * 0.15);
          const x = cx + Math.cos(angle) * r2;
          const y = cy + Math.sin(angle) * r2;
          const hue = (oi * 60 + p * 40 + t * 20) % 360;
          ctx.fillStyle = `hsl(${hue},100%,65%)`;
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(x, y, 4 + oi, 0, Math.PI * 2); ctx.fill();
          // trail
          for (let tr = 1; tr <= 5; tr++) {
            const ta = angle - tr * 0.1;
            const tx = cx + Math.cos(ta) * r2;
            const ty = cy + Math.sin(ta) * r2;
            ctx.globalAlpha = 0.4 / tr;
            ctx.fillStyle = `hsl(${hue},100%,65%)`;
            ctx.beginPath(); ctx.arc(tx, ty, (4 + oi) * (1 - tr * 0.15), 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      });
      ctx.shadowBlur = 0;
    },

    // 49 Ember Drift
    function(ctx, S, t, fi) {
      ctx.fillStyle = 'rgba(5,0,0,0.3)';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 60; i++) {
        const life = ((t * 0.4 + i * 0.17) % 1);
        const x = (Math.sin(i * 2.3 + t * 0.1) * 0.4 + 0.5) * S;
        const y = S - life * S;
        const r2 = 2 + (1 - life) * 4;
        const hue = 15 + life * 30;
        const alpha = (1 - life) * 0.8;
        ctx.fillStyle = `hsla(${hue},100%,${50 + life * 20}%,${alpha})`;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    },

    // 50 Glass Refraction
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000814';
      ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 3) {
        for (let x = 0; x < S; x += 3) {
          const refX = x + Math.sin(y * 0.04 + t) * 12 + Math.sin(x * 0.03 + t * 0.7) * 8;
          const refY = y + Math.cos(x * 0.04 + t) * 12;
          const nx = (refX / S) % 1;
          const ny = (refY / S) % 1;
          const hue = (nx * 120 + ny * 240 + t * 10) % 360;
          const v = Math.sin(nx * Math.PI * 3) * Math.sin(ny * Math.PI * 3);
          const bright = 20 + Math.abs(v) * 50;
          ctx.fillStyle = `hsl(${hue},80%,${bright}%)`;
          ctx.fillRect(x, y, 3, 3);
        }
      }
    },

    // 51 Ocean Current
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000820';
      ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 4) {
        const wave = Math.sin(y * 0.03 + t) * 0.5 + Math.sin(y * 0.07 + t * 0.6) * 0.25;
        const speed = (t * 40 * (1 + wave)) % S;
        const hue = 180 + wave * 60;
        const alpha = 0.3 + Math.abs(wave) * 0.4;
        const gradient = ctx.createLinearGradient(0, y, S, y);
        gradient.addColorStop(0, `hsla(${hue},100%,40%,0)`);
        gradient.addColorStop(0.5, `hsla(${hue},100%,60%,${alpha})`);
        gradient.addColorStop(1, `hsla(${hue},100%,40%,0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y, S, 4);
      }
    },

    // 52 Silk Bloom
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#080008';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let petal = 0; petal < 8; petal++) {
        const baseAngle = (petal / 8) * Math.PI * 2 + t * 0.2;
        ctx.beginPath();
        const r2 = S * 0.35;
        const px = cx + Math.cos(baseAngle) * r2 * 0.5;
        const py = cy + Math.sin(baseAngle) * r2 * 0.5;
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(
          cx + Math.cos(baseAngle - 0.4) * r2,
          cy + Math.sin(baseAngle - 0.4) * r2,
          px, py
        );
        ctx.quadraticCurveTo(
          cx + Math.cos(baseAngle + 0.4) * r2,
          cy + Math.sin(baseAngle + 0.4) * r2,
          cx, cy
        );
        const hue = (petal * 45 + t * 20) % 360;
        ctx.fillStyle = `hsla(${hue},100%,55%,0.4)`;
        ctx.fill();
      }
    },

    // 53 Flux Rings
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let i = 0; i < 12; i++) {
        const r2 = (i + 1) * S * 0.04;
        const thickness = 3 + Math.sin(i + t * 2) * 2;
        const hue = (i * 25 + t * 40) % 360;
        const offset = Math.sin(t + i * 0.5) * r2 * 0.15;
        ctx.strokeStyle = `hsl(${hue},100%,60%)`;
        ctx.lineWidth = thickness;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx + offset, cy, r2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    },

    // 54 Industrial Flow
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 8; i++) {
        const y = (i / 8) * S + (S / 16);
        const dir = i % 2 === 0 ? 1 : -1;
        const speed2 = 0.3 + (i % 3) * 0.2;
        const offset = (t * dir * speed2 * 80) % S;
        const w2 = S * 0.06;
        const gap = S * 0.02;
        const hue = (i * 20 + 30) % 60;
        ctx.fillStyle = `hsl(${hue},70%,${30 + i * 3}%)`;
        for (let x = -S + offset; x < S * 2; x += w2 + gap) {
          ctx.fillRect(x, y - S / 20, w2, S / 10 - 2);
        }
      }
      // pipes
      for (let i = 0; i < 8; i++) {
        const y = (i / 8) * S + (S / 16);
        ctx.strokeStyle = 'rgba(255,180,50,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
      }
    },

    // 55 Star Nursery
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#00000f';
      ctx.fillRect(0, 0, S, S);
      // nebula cloud
      for (let c = 0; c < 5; c++) {
        const cx2 = (Math.sin(c * 1.8 + t * 0.05) * 0.3 + 0.5) * S;
        const cy2 = (Math.cos(c * 1.3 + t * 0.04) * 0.3 + 0.5) * S;
        const r2 = 60 + Math.sin(c + t * 0.1) * 20;
        const hue = (c * 60 + t * 5) % 360;
        const grd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2);
        grd.addColorStop(0, `hsla(${hue},80%,40%,0.3)`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, Math.PI * 2); ctx.fill();
      }
      // stars
      for (let i = 0; i < 100; i++) {
        const x = (Math.sin(i * 1.7 + t * 0.01) * 0.48 + 0.5) * S;
        const y = (Math.cos(i * 2.1 + t * 0.008) * 0.48 + 0.5) * S;
        const bright = 0.4 + Math.sin(i + t * 2) * 0.3;
        const r2 = 0.5 + Math.sin(i * 0.5 + t) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${bright})`;
        ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.fill();
      }
    },

    // 56 Wave Lattice
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const step = 20;
      for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
          const v = Math.sin(x * 0.02 + t) * Math.cos(y * 0.02 + t * 0.8);
          const hue = (v * 120 + 180 + t * 15) % 360;
          const sz = step * 0.3 * (0.5 + v * 0.5);
          ctx.save();
          ctx.translate(x + step / 2, y + step / 2);
          ctx.rotate(v * Math.PI);
          ctx.strokeStyle = `hsl(${hue},100%,55%)`;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-sz, -sz, sz * 2, sz * 2);
          ctx.restore();
        }
      }
    },

    // 57 Moire Pulse
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      const freq = 0.04;
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const d1 = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          const d2 = Math.sqrt((x - cx * 1.2) ** 2 + (y - cy * 0.8) ** 2);
          const v1 = Math.sin(d1 * freq - t * 2);
          const v2 = Math.sin(d2 * freq + t * 1.5);
          const v = (v1 + v2) * 0.5 * 0.5 + 0.5;
          const c = Math.floor(v * 255);
          const idx = (y * S + x) * 4;
          img.data[idx] = 0; img.data[idx+1] = c;
          img.data[idx+2] = Math.floor(c * 0.7); img.data[idx+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },

    // 58 Orbital Current
    function(ctx, S, t, fi) {
      ctx.fillStyle = '#000810';
      ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      for (let i = 0; i < 120; i++) {
        const angle = (i / 120) * Math.PI * 2 + t * 0.5;
        const r2 = S * 0.1 + (i / 120) * S * 0.35;
        const drift = Math.sin(i * 0.2 + t * 2) * 20;
        const x = cx + Math.cos(angle + drift * 0.01) * (r2 + drift);
        const y = cy + Math.sin(angle + drift * 0.01) * (r2 + drift) * 0.7;
        const hue = (i * 3 + t * 30) % 360;
        const alpha = 0.3 + Math.sin(i * 0.15 + t) * 0.2;
        ctx.fillStyle = `hsla(${hue},100%,60%,${alpha})`;
        ctx.fillRect(x, y, 2, 2);
      }
    },

    // 59 Phantom Field
    function(ctx, S, t, fi) {
      ctx.fillStyle = 'rgba(0,0,5,0.4)';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 16; i++) {
        const x = (Math.sin(i * 1.6 + t * 0.08) * 0.45 + 0.5) * S;
        const y = (Math.cos(i * 2.1 + t * 0.06) * 0.45 + 0.5) * S;
        const r2 = 20 + Math.sin(i * 0.7 + t) * 10;
        const hue = (i * 22 + t * 8) % 360;
        ctx.strokeStyle = `hsla(${hue},80%,60%,0.4)`;
        ctx.lineWidth = 1;
        ctx.shadowColor = `hsl(${hue},100%,60%)`;
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r2 * 0.5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.shadowBlur = 0;
    },
  ]; // end patterns 30-59

  // Merge all pattern arrays
  const ALL_PATTERNS = [...PATTERNS, ...PATTERNS2, ...PATTERNS3];

  // ============================================================
  // CONTINUE TO PART 2
  // ============================================================
  window._cubePatterns = ALL_PATTERNS;
  window._cubePatternNames = PATTERN_NAMES;
  window._CUBE = CUBE;
  window._initCubeRenderer = function() { initCubeRenderer(CUBE, ALL_PATTERNS, PATTERN_NAMES); };
  window._initCubeRenderer();

} // end initCube3D// ============================================================
// CUBE RENDERER INIT
// ============================================================
function initCubeRenderer(CUBE, ALL_PATTERNS, PATTERN_NAMES) {
  try {
    const canvas = document.getElementById('cubeCan');
    if (!canvas) throw new Error('cubeCan not found');

    // Renderer
    CUBE.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    CUBE.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    CUBE.renderer.setSize(window.innerWidth, window.innerHeight);
    CUBE.renderer.shadowMap.enabled = true;
    CUBE.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    CUBE.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    CUBE.renderer.toneMappingExposure = 1.2;

    // Scene
    CUBE.scene = new THREE.Scene();
    CUBE.scene.fog = new THREE.FogExp2(0x000008, 0.018);

    // Camera
    CUBE.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    CUBE.camera.position.set(0, 1.5, 4.5);
    CUBE.camera.lookAt(0, 0, 0);

    // Lighting
    setupLighting(CUBE);

    // Face canvases + textures
    setupFaceTextures(CUBE);

    // Build cube geometry
    buildCubeMesh(CUBE);

    // Reflection floor
    buildReflectionFloor(CUBE);

    // Floor grid
    buildFloorGrid(CUBE);

    // Shards pool
    buildShards(CUBE);

    // Controls bindings
    bindCubeControls(CUBE, ALL_PATTERNS, PATTERN_NAMES);

    // Populate pattern select
    populatePatternSelect(CUBE, PATTERN_NAMES);

    // Handle resize
    window.addEventListener('resize', () => onCubeResize(CUBE));

    // Expose global API
    window.setCubeVisible = function(v) {
      if (CUBE.cube) CUBE.cube.visible = v;
      if (CUBE.edges) CUBE.edges.visible = v;
      if (CUBE.reflectionCube) CUBE.reflectionCube.visible = v && CUBE.reflection;
      if (CUBE.reflectionFloor) CUBE.reflectionFloor.visible = v && CUBE.reflection;
      if (CUBE.floorGrid) CUBE.floorGrid.visible = v && CUBE.showFloorGrid;
    };

    window.nextCubePattern = function() {
      CUBE.patternTarget = (CUBE.patternIndex + 1) % ALL_PATTERNS.length;
      CUBE.morphProgress = 0;
      updatePatternDisplay(CUBE, PATTERN_NAMES);
    };

    // Start render loop
    CUBE.lastTime = performance.now();
    cubLoop(CUBE, ALL_PATTERNS);

  } catch (err) {
    console.error('[cube3d] initCubeRenderer failed:', err);
    const errEl = document.getElementById('errorOverlay');
    if (errEl) {
      errEl.style.display = 'block';
      errEl.innerHTML += '<div style="margin-bottom:6px;"><b>⚠ 3D Engine:</b> ' + String(err) + '</div>';
    }
  }
}

// ============================================================
// LIGHTING
// ============================================================
function setupLighting(CUBE) {
  // Ambient
  const ambient = new THREE.AmbientLight(0x001020, 0.8);
  CUBE.scene.add(ambient);

  // Main directional
  const dir = new THREE.DirectionalLight(0x00ffc8, 1.2);
  dir.position.set(3, 6, 4);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 1024;
  dir.shadow.mapSize.height = 1024;
  CUBE.scene.add(dir);

  // Accent point lights
  const p1 = new THREE.PointLight(0xff00ff, 1.5, 12);
  p1.position.set(-3, 2, 2);
  CUBE.scene.add(p1);

  const p2 = new THREE.PointLight(0x00e5ff, 1.2, 12);
  p2.position.set(3, -1, 3);
  CUBE.scene.add(p2);

  const p3 = new THREE.PointLight(0xffb800, 0.8, 10);
  p3.position.set(0, -3, -2);
  CUBE.scene.add(p3);

  CUBE.lights = { ambient, dir, p1, p2, p3 };
}

// ============================================================
// FACE TEXTURES
// ============================================================
function setupFaceTextures(CUBE) {
  const S = CUBE.faceSize;
  CUBE.faceCanvases = [];
  CUBE.faceCtxs = [];
  CUBE.faceTextures = [];

  for (let i = 0; i < 6; i++) {
    const fc = document.createElement('canvas');
    fc.width = S; fc.height = S;
    const ctx = fc.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, S);
    CUBE.faceCanvases.push(fc);
    CUBE.faceCtxs.push(ctx);

    const tex = new THREE.CanvasTexture(fc);
    tex.needsUpdate = true;
    CUBE.faceTextures.push(tex);
  }
}

// ============================================================
// CUBE MESH
// ============================================================
function buildCubeMesh(CUBE) {
  const geo = new THREE.BoxGeometry(2, 2, 2);

  CUBE.materials = CUBE.faceTextures.map((tex, i) => {
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0x00ffc8),
      emissiveIntensity: CUBE.emissive,
      roughness: 0.15,
      metalness: 0.6,
      envMapIntensity: 1.0,
    });
  });

  CUBE.cube = new THREE.Mesh(geo, CUBE.materials);
  CUBE.cube.castShadow = true;
  CUBE.cube.receiveShadow = false;
  CUBE.cube.position.set(0, 0, 0);
  CUBE.scene.add(CUBE.cube);

  // Edge glow wireframe
  const edgeGeo = new THREE.EdgesGeometry(geo);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x00ffc8,
    linewidth: 2,
    transparent: true,
    opacity: CUBE.edgeGlow,
  });
  CUBE.edges = new THREE.LineSegments(edgeGeo, edgeMat);
  CUBE.cube.add(CUBE.edges);

  // Outer glow shell
  const shellGeo = new THREE.BoxGeometry(2.08, 2.08, 2.08);
  const shellMat = new THREE.MeshBasicMaterial({
    color: 0x00ffc8,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  CUBE.cube.add(shell);
  CUBE.shell = shell;
  CUBE.shellMat = shellMat;
}

// ============================================================
// REFLECTION FLOOR
// ============================================================
function buildReflectionFloor(CUBE) {
  // Mirror cube (inverted below)
  const refGeo = new THREE.BoxGeometry(2, 2, 2);
  const refMats = CUBE.faceTextures.map(tex => {
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0x00ffc8),
      emissiveIntensity: CUBE.emissive * 0.4,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.28,
    });
  });
  CUBE.reflectionCube = new THREE.Mesh(refGeo, refMats);
  CUBE.reflectionCube.position.set(0, -3.2, 0);
  CUBE.reflectionCube.scale.set(1, -1, 1);
  CUBE.reflectionCube.visible = CUBE.reflection;
  CUBE.scene.add(CUBE.reflectionCube);
  CUBE.refMats = refMats;

  // Floor plane
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x001a14,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.5,
  });
  CUBE.reflectionFloor = new THREE.Mesh(floorGeo, floorMat);
  CUBE.reflectionFloor.rotation.x = -Math.PI / 2;
  CUBE.reflectionFloor.position.y = -1.2;
  CUBE.reflectionFloor.receiveShadow = true;
  CUBE.reflectionFloor.visible = CUBE.reflection;
  CUBE.scene.add(CUBE.reflectionFloor);
}

// ============================================================
// FLOOR GRID
// ============================================================
function buildFloorGrid(CUBE) {
  const gridHelper = new THREE.GridHelper(20, 24, 0x00ffc8, 0x004030);
  gridHelper.position.y = -1.21;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.3;
  gridHelper.visible = CUBE.showFloorGrid;
  CUBE.scene.add(gridHelper);
  CUBE.floorGrid = gridHelper;
}

// ============================================================
// SHARDS
// ============================================================
function buildShards(CUBE) {
  CUBE.shards = [];
  const count = 24;

  for (let i = 0; i < count; i++) {
    // Random shard size
    const w = 0.2 + Math.random() * 0.5;
    const h = 0.2 + Math.random() * 0.5;
    const d = 0.05 + Math.random() * 0.2;
    const geo = new THREE.BoxGeometry(w, h, d);

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.45 + Math.random() * 0.1, 1, 0.5),
      emissive: new THREE.Color(0x00ffc8),
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.8,
    });

    const shard = new THREE.Mesh(geo, mat);

    // Home position (on cube surface approximate)
    const home = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
    shard.position.copy(home);
    shard.userData.home = home.clone();
    shard.userData.vel = new THREE.Vector3();
    shard.userData.rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );
    shard.visible = false;
    CUBE.scene.add(shard);
    CUBE.shards.push(shard);
  }
}

// ============================================================
// SHATTER TRIGGER
// ============================================================
function triggerShatter(CUBE) {
  if (CUBE.shattered) {
    // Reassemble
    CUBE.shattered = false;
    CUBE.cube.visible = true;
    CUBE.edges.visible = true;
    CUBE.shards.forEach(s => { s.visible = false; });
    return;
  }

  CUBE.shattered = true;
  CUBE.cube.visible = false;
  CUBE.edges.visible = false;

  CUBE.shards.forEach(s => {
    s.visible = true;
    s.position.copy(CUBE.cube.position);
    s.position.x += (Math.random() - 0.5) * 0.5;
    s.position.y += (Math.random() - 0.5) * 0.5;
    s.position.z += (Math.random() - 0.5) * 0.5;

    const force = 0.08 + Math.random() * 0.12;
    s.userData.vel.set(
      (Math.random() - 0.5) * force * 4,
      (Math.random() - 0.5) * force * 4 + 0.04,
      (Math.random() - 0.5) * force * 4
    );
    s.userData.rotVel.set(
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15
    );
  });

  // Auto reassemble after 3 seconds
  setTimeout(() => {
    if (CUBE.shattered) triggerShatter(CUBE);
  }, 3000);
}

// ============================================================
// UPDATE SHARDS
// ============================================================
function updateShards(CUBE, dt) {
  if (!CUBE.shattered) return;
  const spring = 0.04;
  const damp = 0.88;

  CUBE.shards.forEach(s => {
    if (!s.visible) return;

    // spring back to home
    const dx = s.userData.home.x - s.position.x;
    const dy = s.userData.home.y - s.position.y;
    const dz = s.userData.home.z - s.position.z;

    s.userData.vel.x += dx * spring;
    s.userData.vel.y += dy * spring;
    s.userData.vel.z += dz * spring;

    s.userData.vel.multiplyScalar(damp);

    s.position.x += s.userData.vel.x;
    s.position.y += s.userData.vel.y;
    s.position.z += s.userData.vel.z;

    s.rotation.x += s.userData.rotVel.x;
    s.rotation.y += s.userData.rotVel.y;
    s.rotation.z += s.userData.rotVel.z;

    s.userData.rotVel.multiplyScalar(0.95);
  });
}

// ============================================================
// UPDATE FACE TEXTURES
// ============================================================
function updateFaceTextures(CUBE, ALL_PATTERNS, t) {
  const S = CUBE.faceSize;
  const pi = CUBE.patternIndex;
  const pt = CUBE.patternTarget;
  const morph = CUBE.morphProgress;

  for (let fi = 0; fi < 6; fi++) {
    const ctx = CUBE.faceCtxs[fi];
    const faceT = t + fi * 0.6;

    if (morph < 1.0) {
      // Draw current pattern
      ALL_PATTERNS[pi % ALL_PATTERNS.length](ctx, S, faceT, fi);

      // Draw target pattern on temp canvas
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = S; tmpCanvas.height = S;
      const tmpCtx = tmpCanvas.getContext('2d');
      ALL_PATTERNS[pt % ALL_PATTERNS.length](tmpCtx, S, faceT, fi);

      // Blend
      ctx.globalAlpha = morph;
      ctx.drawImage(tmpCanvas, 0, 0);
      ctx.globalAlpha = 1;
    } else {
      ALL_PATTERNS[pi % ALL_PATTERNS.length](ctx, S, faceT, fi);
    }

    CUBE.faceTextures[fi].needsUpdate = true;
  }
}

// ============================================================
// MORPH PROGRESS
// ============================================================
function updateMorph(CUBE, dt) {
  if (CUBE.morphProgress < 1.0) {
    CUBE.morphProgress += CUBE.morphSpeed * dt * 60;
    if (CUBE.morphProgress >= 1.0) {
      CUBE.morphProgress = 1.0;
      CUBE.patternIndex = CUBE.patternTarget;
    }
  }
}

// ============================================================
// AUTO PATTERN TIMER
// ============================================================
function updateAutoPattern(CUBE, dt, ALL_PATTERNS, PATTERN_NAMES) {
  if (!CUBE.autoPattern) return;
  CUBE.autoTimer += dt;
  if (CUBE.autoTimer >= CUBE.autoInterval) {
    CUBE.autoTimer = 0;
    const next = (CUBE.patternIndex + 1) % ALL_PATTERNS.length;
    CUBE.patternTarget = next;
    CUBE.morphProgress = 0;
    updatePatternDisplay(CUBE, PATTERN_NAMES);
  }
}

// ============================================================
// CUBE ROTATION
// ============================================================
function updateCubeRotation(CUBE, dt) {
  if (CUBE.shattered) return;

  if (CUBE.zenOrbit) {
    CUBE.zenAngle += dt * 0.4;
    const radius = 4.5;
    CUBE.camera.position.x = Math.sin(CUBE.zenAngle) * radius;
    CUBE.camera.position.z = Math.cos(CUBE.zenAngle) * radius;
    CUBE.camera.position.y = 1.5 + Math.sin(CUBE.zenAngle * 0.5) * 0.8;
    CUBE.camera.lookAt(0, 0, 0);
    return;
  }

  if (!CUBE.dragging) {
    if (CUBE.autoSpin) {
      CUBE.rotY += 0.003 + Math.abs(CUBE.rotVY) * 0.1;
    }
    // Apply momentum
    CUBE.rotVX *= 0.92;
    CUBE.rotVY *= 0.92;
    CUBE.rotX += CUBE.rotVX;
    CUBE.rotY += CUBE.rotVY;
  }

  if (CUBE.cube) {
    CUBE.cube.rotation.x = CUBE.rotX;
    CUBE.cube.rotation.y = CUBE.rotY;
  }
  if (CUBE.reflectionCube) {
    CUBE.reflectionCube.rotation.x = CUBE.rotX;
    CUBE.reflectionCube.rotation.y = CUBE.rotY;
  }
}

// ============================================================
// AUDIO REACTIVITY
// ============================================================
function updateCubeAudio(CUBE) {
  // Read from engine2d audio data if available
  let bass = 0, beat = false;
  if (window.ENG && window.ENG.audioData) {
    bass = window.ENG.audioData.bass || 0;
    beat = window.ENG.audioData.beat || false;
  }

  if (CUBE.cube) {
    const scale = 1 + bass * 0.08;
    CUBE.cube.scale.setScalar(beat ? scale * 1.05 : scale);
  }

  // Pulse edge glow with audio
  if (CUBE.edges && CUBE.edges.material) {
    CUBE.edges.material.opacity = CUBE.edgeGlow + bass * 0.3;
  }

  // Pulse lights
  if (CUBE.lights) {
    CUBE.lights.p1.intensity = 1.5 + bass * 2;
    CUBE.lights.p2.intensity = 1.2 + bass * 1.5;
    if (beat) {
      CUBE.lights.dir.intensity = 2.5;
    } else {
      CUBE.lights.dir.intensity += (1.2 - CUBE.lights.dir.intensity) * 0.1;
    }
  }

  // Shell pulse
  if (CUBE.shellMat) {
    CUBE.shellMat.opacity = 0.04 + bass * 0.08;
  }
}

// ============================================================
// MAIN CUBE RENDER LOOP
// ============================================================
function cubLoop(CUBE, ALL_PATTERNS) {
  CUBE.animID = requestAnimationFrame(() => cubLoop(CUBE, ALL_PATTERNS));

  const now = performance.now();
  const dt = Math.min((now - CUBE.lastTime) / 1000, 0.05);
  CUBE.lastTime = now;
  CUBE.time += dt;

  if (!CUBE.running) return;

  const PATTERN_NAMES = window._cubePatternNames;

  updateMorph(CUBE, dt);
  updateAutoPattern(CUBE, dt, ALL_PATTERNS, PATTERN_NAMES);
  updateFaceTextures(CUBE, ALL_PATTERNS, CUBE.time);
  updateCubeRotation(CUBE, dt);
  updateCubeAudio(CUBE);
  updateShards(CUBE, dt);

  // Light animation
  if (CUBE.lights) {
    const t2 = CUBE.time;
    CUBE.lights.p1.position.x = Math.sin(t2 * 0.4) * 4;
    CUBE.lights.p1.position.z = Math.cos(t2 * 0.3) * 4;
    CUBE.lights.p2.position.x = Math.cos(t2 * 0.35) * 3;
    CUBE.lights.p2.position.z = Math.sin(t2 * 0.4) * 3;
  }

  CUBE.renderer.render(CUBE.scene, CUBE.camera);
}

// ============================================================
// RESIZE
// ============================================================
function onCubeResize(CUBE) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  CUBE.camera.aspect = W / H;
  CUBE.camera.updateProjectionMatrix();
  CUBE.renderer.setSize(W, H);
}

// ============================================================
// PATTERN SELECT UI
// ============================================================
function populatePatternSelect(CUBE, PATTERN_NAMES) {
  const sel = document.getElementById('selCubePattern');
  if (!sel) return;
  sel.innerHTML = '';
  PATTERN_NAMES.forEach((name, i) => {
    const op = document.createElement('option');
    op.value = i;
    op.textContent = (i + 1) + '. ' + name;
    sel.appendChild(op);
  });
  sel.value = 0;
  updatePatternDisplay(CUBE, PATTERN_NAMES);
}

function updatePatternDisplay(CUBE, PATTERN_NAMES) {
  const sel = document.getElementById('selCubePattern');
  if (sel) sel.value = CUBE.patternTarget;
  const valEl = document.getElementById('valPatternIdx');
  if (valEl) valEl.textContent = (CUBE.patternTarget + 1) + '/' + PATTERN_NAMES.length;
}// ============================================================
// CUBE CONTROL BINDINGS
// ============================================================
function bindCubeControls(CUBE, ALL_PATTERNS, PATTERN_NAMES) {

  // Pattern select dropdown
  const selPattern = document.getElementById('selCubePattern');
  if (selPattern) {
    selPattern.addEventListener('change', () => {
      const idx = parseInt(selPattern.value);
      if (!isNaN(idx) && idx >= 0 && idx < ALL_PATTERNS.length) {
        CUBE.patternTarget = idx;
        CUBE.morphProgress = 0;
        updatePatternDisplay(CUBE, PATTERN_NAMES);
      }
    });
  }

  // Prev pattern
  const btnPrev = document.getElementById('btnPrevPattern');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      CUBE.patternTarget = (CUBE.patternTarget - 1 + ALL_PATTERNS.length) % ALL_PATTERNS.length;
      CUBE.morphProgress = 0;
      updatePatternDisplay(CUBE, PATTERN_NAMES);
    });
  }

  // Next pattern
  const btnNext = document.getElementById('btnNextPattern');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      CUBE.patternTarget = (CUBE.patternTarget + 1) % ALL_PATTERNS.length;
      CUBE.morphProgress = 0;
      updatePatternDisplay(CUBE, PATTERN_NAMES);
    });
  }

  // Random pattern
  const btnRand = document.getElementById('btnRandPattern');
  if (btnRand) {
    btnRand.addEventListener('click', () => {
      let idx = Math.floor(Math.random() * ALL_PATTERNS.length);
      if (idx === CUBE.patternIndex) idx = (idx + 1) % ALL_PATTERNS.length;
      CUBE.patternTarget = idx;
      CUBE.morphProgress = 0;
      updatePatternDisplay(CUBE, PATTERN_NAMES);
    });
  }

  // Auto switch checkbox
  const chkAutoPattern = document.getElementById('chkAutoPattern');
  if (chkAutoPattern) {
    chkAutoPattern.addEventListener('change', () => {
      CUBE.autoPattern = chkAutoPattern.checked;
      CUBE.autoTimer = 0;
    });
  }

  // Auto interval slider
  const sliderAutoInterval = document.getElementById('sliderAutoInterval');
  const valAutoInterval = document.getElementById('valAutoInterval');
  if (sliderAutoInterval) {
    sliderAutoInterval.addEventListener('input', () => {
      CUBE.autoInterval = parseFloat(sliderAutoInterval.value);
      if (valAutoInterval) valAutoInterval.textContent = CUBE.autoInterval;
    });
  }

  // Auto spin checkbox
  const chkAutoSpin = document.getElementById('chkAutoSpin');
  if (chkAutoSpin) {
    chkAutoSpin.checked = CUBE.autoSpin;
    chkAutoSpin.addEventListener('change', () => {
      CUBE.autoSpin = chkAutoSpin.checked;
    });
  }

  // Zen orbit checkbox
  const chkZenOrbit = document.getElementById('chkZenOrbit');
  if (chkZenOrbit) {
    chkZenOrbit.addEventListener('change', () => {
      CUBE.zenOrbit = chkZenOrbit.checked;
      if (!CUBE.zenOrbit) {
        // Reset camera
        CUBE.camera.position.set(0, 1.5, 4.5);
        CUBE.camera.lookAt(0, 0, 0);
      }
    });
  }

  // Reflection checkbox
  const chkReflection = document.getElementById('chkReflection');
  if (chkReflection) {
    chkReflection.checked = CUBE.reflection;
    chkReflection.addEventListener('change', () => {
      CUBE.reflection = chkReflection.checked;
      if (CUBE.reflectionCube) CUBE.reflectionCube.visible = CUBE.reflection;
      if (CUBE.reflectionFloor) CUBE.reflectionFloor.visible = CUBE.reflection;
    });
  }

  // Floor grid checkbox
  const chkFloorGrid = document.getElementById('chkFloorGrid');
  if (chkFloorGrid) {
    chkFloorGrid.addEventListener('change', () => {
      CUBE.showFloorGrid = chkFloorGrid.checked;
      if (CUBE.floorGrid) CUBE.floorGrid.visible = CUBE.showFloorGrid;
    });
  }

  // Edge glow slider
  const sliderEdgeGlow = document.getElementById('sliderEdgeGlow');
  const valEdgeGlow = document.getElementById('valEdgeGlow');
  if (sliderEdgeGlow) {
    sliderEdgeGlow.addEventListener('input', () => {
      CUBE.edgeGlow = parseFloat(sliderEdgeGlow.value);
      if (CUBE.edges && CUBE.edges.material) {
        CUBE.edges.material.opacity = CUBE.edgeGlow;
      }
      if (valEdgeGlow) valEdgeGlow.textContent = CUBE.edgeGlow.toFixed(1);
    });
  }

  // Emissive slider
  const sliderEmissive = document.getElementById('sliderEmissive');
  const valEmissive = document.getElementById('valEmissive');
  if (sliderEmissive) {
    sliderEmissive.addEventListener('input', () => {
      CUBE.emissive = parseFloat(sliderEmissive.value);
      CUBE.materials.forEach(m => {
        m.emissiveIntensity = CUBE.emissive;
      });
      if (CUBE.refMats) {
        CUBE.refMats.forEach(m => {
          m.emissiveIntensity = CUBE.emissive * 0.4;
        });
      }
      if (valEmissive) valEmissive.textContent = CUBE.emissive.toFixed(2);
    });
  }

  // Shatter button
  const btnShatter = document.getElementById('btnShatter');
  if (btnShatter) {
    btnShatter.addEventListener('click', () => {
      triggerShatter(CUBE);
      // Show toast if available
      if (typeof showToast === 'function') {
        showToast(typeof t === 'function' ? t('toastShatter') : 'Shatter!');
      }
    });
  }

  // ============================================================
  // CUBE DRAG INTERACTION (mouse)
  // ============================================================
  const canvas = document.getElementById('cubeCan');
  if (!canvas) return;

  let dragStartX = 0, dragStartY = 0;
  let lastDragX = 0, lastDragY = 0;
  let flickVelX = 0, flickVelY = 0;

  canvas.addEventListener('mousedown', (e) => {
    // Only handle if in 3d or both mode
    if (window.ENG && window.ENG.viewMode === '2d') return;

    CUBE.dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    flickVelX = 0;
    flickVelY = 0;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!CUBE.dragging) return;

    const dx = e.clientX - lastDragX;
    const dy = e.clientY - lastDragY;
    flickVelX = dx;
    flickVelY = dy;

    CUBE.rotY += dx * 0.008;
    CUBE.rotX += dy * 0.008;

    // Clamp X rotation
    CUBE.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, CUBE.rotX));

    lastDragX = e.clientX;
    lastDragY = e.clientY;
  });

  window.addEventListener('mouseup', (e) => {
    if (!CUBE.dragging) return;
    CUBE.dragging = false;

    // Calculate flick momentum
    const flick = Math.sqrt(flickVelX * flickVelX + flickVelY * flickVelY);
    CUBE.rotVX = flickVelY * 0.003;
    CUBE.rotVY = flickVelX * 0.003;

    // Shatter on strong flick
    if (flick > 40 && !CUBE.shattered) {
      triggerShatter(CUBE);
      if (typeof showToast === 'function') {
        showToast(typeof t === 'function' ? t('toastShatter') : 'Shatter!');
      }
    }
  });

  // ============================================================
  // CUBE DRAG INTERACTION (touch)
  // ============================================================
  let touchStartX = 0, touchStartY = 0;
  let lastTouchX = 0, lastTouchY = 0;
  let touchFlickX = 0, touchFlickY = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (window.ENG && window.ENG.viewMode === '2d') return;
    if (e.touches.length !== 1) return;

    CUBE.dragging = true;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    touchFlickX = 0;
    touchFlickY = 0;
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!CUBE.dragging) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - lastTouchX;
    const dy = touch.clientY - lastTouchY;
    touchFlickX = dx;
    touchFlickY = dy;

    CUBE.rotY += dx * 0.008;
    CUBE.rotX += dy * 0.008;
    CUBE.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, CUBE.rotX));

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!CUBE.dragging) return;
    CUBE.dragging = false;

    const flick = Math.sqrt(touchFlickX * touchFlickX + touchFlickY * touchFlickY);
    CUBE.rotVX = touchFlickY * 0.003;
    CUBE.rotVY = touchFlickX * 0.003;

    if (flick > 30 && !CUBE.shattered) {
      triggerShatter(CUBE);
      if (typeof showToast === 'function') {
        showToast(typeof t === 'function' ? t('toastShatter') : 'Shatter!');
      }
    }
  });

  // ============================================================
  // MOUSE WHEEL ZOOM
  // ============================================================
  canvas.addEventListener('wheel', (e) => {
    if (CUBE.zenOrbit) return;
    const zoom = e.deltaY * 0.005;
    CUBE.camera.position.z = Math.max(2.5, Math.min(10, CUBE.camera.position.z + zoom));
    e.preventDefault();
  }, { passive: false });

} // end bindCubeControls

// ============================================================
// EXPOSE ENG GLOBALLY FOR CUBE AUDIO REACTIVITY
// ============================================================
// engine2d.js stores state in ENG which is module-scoped,
// but we need cube3d to read audio data. We expose ENG
// on window from here if engine2d hasn't yet.
(function() {
  // Give engine2d a chance to expose ENG
  // Check periodically for 2 seconds
  let checks = 0;
  const interval = setInterval(() => {
    if (typeof ENG !== 'undefined' && !window.ENG) {
      window.ENG = ENG;
    }
    checks++;
    if (checks > 20 || window.ENG) clearInterval(interval);
  }, 100);
})();