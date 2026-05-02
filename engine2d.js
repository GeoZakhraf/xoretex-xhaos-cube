/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — engine2d.js
 *
 *  Dual-Purpose 2D Engine:
 *
 *  PURPOSE 1 — VISUAL RENDERER
 *  Draws 60 mathematical flow-field formulas as
 *  particle trails onto canvas2d. Visible as the
 *  background layer beneath the 3D cube.
 *
 *  PURPOSE 2 — LIVE TEXTURE SOURCE
 *  canvas2d is read every frame by cube3d.js via
 *  THREE.CanvasTexture. Every particle trail painted
 *  here appears on the 3D cube faces in real time.
 *  The cube literally wears this canvas as its skin.
 *
 *  PURPOSE 3 — METRICS PROVIDER
 *  Exports live flow-field metrics to SyncController
 *  for inversion symmetry logic.
 *
 *  Architecture: IIFE Module Pattern
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.Engine2D = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — PRIVATE STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let canvas      = null;
  let ctx         = null;
  let W           = 0;
  let H           = 0;
  let cx          = 0;
  let cy          = 0;
  let animId      = null;
  let t           = 0;
  let lastTs      = 0;
  let frameCount  = 0;
  let currentFPS  = 60;
  let fpsAccum    = 0;
  let fpsFrames   = 0;

  /* Parameters */
  let params = {
    speed:       1.0,
    scale:       1.0,
    chaos:       0.5,
    presetIndex: 0,
    density:     2800
  };

  /* Particle pool */
  let particles = [];

  /* Output metrics for SyncController */
  let metrics = {
    frequency:   0,
    outwardFlow: 0,
    clockwise:   true,
    energy:      0,
    fps:         60
  };

  /* Colour palettes — brighter for stronger bloom */
  const PALETTES = [
    /* 0 — Cyber Neon */
    [[0,240,255],[180,0,255],[255,220,0],[255,50,80],[0,255,140]],
    /* 1 — Ice Storm */
    [[0,210,255],[60,120,255],[0,255,210],[140,180,255],[210,245,255]],
    /* 2 — Solar Flare */
    [[255,120,0],[255,210,0],[255,60,60],[220,0,120],[255,160,50]],
    /* 3 — Deep Void */
    [[100,0,255],[0,100,255],[255,0,220],[0,220,160],[100,255,210]],
    /* 4 — Toxic Grid */
    [[0,255,110],[120,255,0],[0,210,90],[60,255,160],[220,255,0]]
  ];

  let paletteIndex = 0;

  /* Trail length — longer = richer texture on cube */
  const TRAIL_LENGTH = 35;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — MATHEMATICS CORE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * hash2 — deterministic pseudo-random [0,1)
   */
  function hash2(x, y) {
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return v - Math.floor(v);
  }

  /**
   * noise2 — smooth value noise [-1, 1]
   * Bicubic interpolation of hash values
   */
  function noise2(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);
    return (
      hash2(ix,   iy  ) * (1 - ux) * (1 - uy) +
      hash2(ix+1, iy  ) * ux       * (1 - uy) +
      hash2(ix,   iy+1) * (1 - ux) * uy       +
      hash2(ix+1, iy+1) * ux       * uy
    ) * 2.0 - 1.0;
  }

  /**
   * fBm — Fractional Brownian Motion
   * Sums octaves of noise at increasing frequency
   */
  function fBm(x, y, octaves, lacunarity, gain) {
    lacunarity = lacunarity || 2.0;
    gain       = gain       || 0.5;
    let value     = 0.0;
    let amplitude = 0.5;
    let frequency = 1.0;
    for (let i = 0; i < octaves; i++) {
      value     += amplitude * noise2(x * frequency, y * frequency);
      frequency *= lacunarity;
      amplitude *= gain;
    }
    return value;
  }

  /**
   * turb — Turbulence (absolute-value fBm)
   * Sharp ridges — good for lightning, cracks
   */
  function turb(x, y, octaves) {
    let value     = 0.0;
    let amplitude = 0.5;
    let frequency = 1.0;
    for (let i = 0; i < octaves; i++) {
      value     += amplitude * Math.abs(
                     noise2(x * frequency, y * frequency)
                   );
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  /**
   * warp — iterative domain warping
   * Warps input coordinates using noise offsets
   * Returns { x, y }
   */
  function warp(x, y, t, iters) {
    let px = x;
    let py = y;
    for (let i = 0; i < iters; i++) {
      const s  = 0.8 / (i + 1);
      const ox = px + s * noise2(
        px + 0.3 * t + i * 3.7,
        py + 1.7   + i * 2.1
      );
      const oy = py + s * noise2(
        px + 3.1 + 0.2 * t + i * 1.9,
        py + 2.3 + i * 4.3
      );
      px = ox;
      py = oy;
    }
    return { x: px, y: py };
  }

  /**
   * ridge — ridge noise (sharp peaks)
   */
  function ridge(x, y, octaves) {
    let value     = 0.0;
    let amplitude = 0.5;
    let frequency = 1.0;
    for (let i = 0; i < octaves; i++) {
      const n = 1.0 - Math.abs(
        noise2(x * frequency, y * frequency)
      );
      value     += amplitude * n * n;
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — 60 FORMULA LIBRARY
     Each formula(x, y, t, s) returns angle (radians)
     which drives particle flow direction.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const FORMULAS = [

    /* 01 — Fiber Optics */
    function fiberOptics(x, y, t, s) {
      const base   = (Math.sin(0.003*s*x + t) +
                      Math.cos(0.003*s*y + t)) * 2.2;
      const detail = fBm(0.003*s*x, 0.003*s*y, 4) * 3.0;
      return base + detail;
    },

    /* 02 — Digital Silk */
    function digitalSilk(x, y, t, s) {
      const w = warp(0.004*s*x, 0.004*s*y, t, 2);
      return Math.sin(w.x + 0.7*t) *
             Math.cos(w.y - 0.5*t) * 4.0;
    },

    /* 03 — Wave Turbulence */
    function waveTurbulence(x, y, t, s) {
      const tb = turb(0.002*s*x, 0.002*s*y, 5);
      return (Math.sin(0.003*s*(x+y) + t + tb*4.0) -
              Math.cos(0.003*s*(x-y) - t)) * 2.5;
    },

    /* 04 — Dynamic Vortex */
    function dynamicVortex(x, y, t, s) {
      const r    = Math.hypot(x - cx, y - cy);
      const pull = Math.sin(0.008*s*r - t) * 0.5;
      return Math.atan2(y - cy, x - cx) + 0.6*t + pull;
    },

    /* 05 — Neural Grid */
    function neuralGrid(x, y, t, s) {
      const sz   = 40.0 / s;
      const gx   = Math.floor(x / sz);
      const gy   = Math.floor(y / sz);
      const cell = noise2(0.5*gx, 0.5*gy + 0.3*t);
      return (gx + gy) * 0.5 * cell +
              0.1*t +
              Math.sin(cell * 2.0 * Math.PI) * 2.0;
    },

    /* 06 — Data Blocks */
    function dataBlocks(x, y, t, s) {
      const bx = Math.round(x / (70.0/s));
      const by = Math.round(y / (70.0/s));
      const nn = noise2(bx + 0.2*t, by);
      return (bx + by) * 0.22 +
              Math.sin(t + nn*8.0) +
              Math.cos(nn * Math.PI) * 2.0;
    },

    /* 07 — Sand Waves */
    function sandWaves(x, y, t, s) {
      const nn = fBm(0.003*s*x + 0.2*t, 0.003*s*y, 6);
      return Math.sin(0.005*s*(x+y) + t + nn*5.0) +
             Math.cos(0.005*s*(x-y) - t + nn*3.0);
    },

    /* 08 — Galactic River */
    function galacticRiver(x, y, t, s) {
      const w  = warp(0.002*s*x, 0.002*s*y, t, 4);
      const tb = turb(0.001*s*x, 0.001*s*y, 3);
      return Math.sin(w.x + t) *
             Math.cos(w.y + t) * 5.0 + tb * 3.0;
    },

    /* 09 — Radial Drift */
    function radialDrift(x, y, t) {
      const r = Math.hypot(x - cx, y - cy);
      return Math.sin(0.02*r + t) * 2.2 +
             0.35 * Math.cos(0.004*y - 0.5*t);
    },

    /* 10 — Geometric Repeat */
    function geometricRepeat(x, y, t, s) {
      const nn = noise2(0.005*s*x, 0.005*s*y + 0.1*t);
      return Math.sin(0.009*s*x +
                      Math.sin(0.006*s*y + t)) +
             Math.cos(0.009*s*y +
                      Math.cos(0.006*s*x + t)) +
             nn * 2.0;
    },

    /* 11 — Magnetic Field */
    function magneticField(x, y, t) {
      const poles = [
        { px: cx - W*0.25, py: cy,          sign:  1 },
        { px: cx + W*0.25, py: cy,          sign: -1 },
        { px: cx,          py: cy - H*0.25, sign:  1 },
        { px: cx,          py: cy + H*0.25, sign: -1 }
      ];
      let sum = 0.0;
      poles.forEach(p => {
        sum += Math.atan2(y - p.py, x - p.px) * p.sign;
      });
      return sum / poles.length + 0.3 * Math.sin(t);
    },

    /* 12 — Ordered Chaos */
    function orderedChaos(x, y, t, s) {
      const nn = turb(0.003*s*x + 0.1*t, 0.003*s*y, 6);
      return Math.sin(0.003*s*x) *
             Math.cos(0.003*s*y) *
             2.0 * Math.PI + Math.sin(t) + nn * 4.0;
    },

    /* 13 — Fractal Spiral */
    function fractalSpiral(x, y, t, s) {
      const dx     = x - cx;
      const dy     = y - cy;
      const r      = Math.hypot(dx, dy);
      const theta  = Math.atan2(dy, dx);
      const spiral = Math.log(r + 1.0) * 0.5 * s + theta;
      return spiral + 0.4*t +
             fBm(2.0*theta, 0.005*r, 4) * 3.0;
    },

    /* 14 — Electric Storm */
    function electricStorm(x, y, t, s) {
      const n1   = noise2(0.005*s*x + t, 0.005*s*y);
      const n2   = noise2(0.01*s*x, 0.01*s*y - 0.5*t);
      const bolt = Math.sin(n1 * 20.0) * Math.cos(n2 * 15.0);
      return bolt * 3.0 +
             Math.atan2(y - cy, x - cx) * 0.2;
    },

    /* 15 — DNA Helix */
    function dnaHelix(x, y, t, s) {
      const wave = Math.sin(0.01*s*y + 2.0*t) * W * 0.15;
      return Math.atan2(
               Math.sin(0.02*s*y + t),
               (x - cx - wave) * 0.005
             ) + Math.cos(0.008*s*y + t) * 2.0;
    },

    /* 16 — Coral Growth */
    function coralGrowth(x, y, t, s) {
      const w = warp(0.003*s*x, 0.003*s*y, 0.3*t, 6);
      return fBm(w.x, w.y, 6) * 8.0 +
             Math.sin(0.5*t) * 2.0;
    },

    /* 17 — Quantum Field */
    function quantumField(x, y, t, s) {
      const n1   = noise2(0.008*s*x + 0.3*t, 0.008*s*y);
      const n2   = noise2(0.004*s*x, 0.004*s*y + 0.2*t);
      const intf = Math.sin(n1*12.0 + n2*8.0 + t);
      return intf * 2.0 +
             Math.sin(0.006*s*x) *
             Math.cos(0.006*s*y) * 3.0;
    },

    /* 18 — Topographic Map */
    function topographicMap(x, y, t, s) {
      const eps = 1.0;
      const h00 = fBm(0.002*s*x       + 0.05*t,
                       0.002*s*y,       8);
      const h10 = fBm(0.002*s*(x+eps) + 0.05*t,
                       0.002*s*y,       8);
      const h01 = fBm(0.002*s*x       + 0.05*t,
                       0.002*s*(y+eps), 8);
      return Math.atan2(h01 - h00, h10 - h00) +
             Math.sin(30.0 * h00) * 0.5;
    },

    /* 19 — Mirror Flow */
    function mirrorFlow(x, y, t) {
      const mx = Math.abs(x - cx);
      const my = Math.abs(y - cy);
      return 6.0 * fBm(0.005*mx + 0.2*t, 0.005*my, 4) +
             0.8 * Math.sin(0.01*mx - 0.008*my + t);
    },

    /* 20 — Smoke Simulation */
    function smokeSimulation(x, y, t, s) {
      const w1   = warp(0.002*s*x, 0.002*s*y, 0.5*t, 3);
      const w2   = warp(w1.x, w1.y, 0.3*t, 2);
      const rise = -0.5 + (1.0 - y / H) * 0.8;
      return fBm(w2.x, w2.y, 5) * 6.0 +
             rise * 2.0 + 1.5 * Math.PI;
    },

    /* 21 — Crystal Lattice */
    function crystalLattice(x, y, t, s) {
      const ax = Math.sin(0.01*s*x*4.0 + t) *
                 Math.cos(0.01*s*y*3.0);
      const ay = Math.cos(0.01*s*x*3.0 - t) *
                 Math.sin(0.01*s*y*4.0);
      const nn = noise2(0.01*s*x + 0.1*t, 0.01*s*y) * 2.0;
      return Math.atan2(ay + nn, ax + nn);
    },

    /* 22 — Nebula */
    function nebula(x, y, t, s) {
      const dx    = x - cx;
      const dy    = y - cy;
      const r     = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      const rNorm = r / W;
      const w     = warp(0.001*s*x, 0.001*s*y, 0.2*t, 5);
      return fBm(3.0*theta + 0.1*t, 5.0*s*rNorm, 6) * 5.0 +
             Math.sin(3.0*w.x + 3.0*w.y) * 2.0 +
             0.3 * theta;
    },

    /* 23 — Woven Fabric */
    function wovenFabric(x, y, t, s) {
      const wx = Math.sin(0.02*s*x + t) * 20.0;
      const wy = Math.cos(0.02*s*y - 0.7*t) * 20.0;
      const nn = noise2(0.003*s*x, 0.003*s*y + 0.1*t);
      return Math.atan2(
               Math.sin(0.01*s*(y + wx)),
               Math.cos(0.01*s*(x + wy))
             ) + nn * 2.0;
    },

    /* 24 — Black Hole */
    function blackHole(x, y, t, s) {
      const dx    = x - cx;
      const dy    = y - cy;
      const r     = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      const pull  = 1.0 / (0.003*r + 0.1);
      const wp    = Math.sin(0.01*s*r - 2.0*t) * 0.5;
      return theta + pull * 2.0 + 0.3*t + wp;
    },

    /* 25 — Aurora Borealis */
    function auroraBorealis(x, y, t, s) {
      const fy      = y / H;
      const curtain = Math.sin(
        0.005*s*x + t + Math.sin(8.0*fy + t) * 2.0
      ) * 3.0;
      return curtain +
             fBm(0.001*s*x + 0.1*t, 0.003*s*y, 5) * 4.0 -
             Math.PI / 2.0;
    },

    /* 26 — Voronoi Flow */
    function voronoiFlow(x, y, t) {
      let minDist = Infinity;
      let nearPx  = 0;
      let nearPy  = 0;
      for (let i = 0; i < 8; i++) {
        const angle = 2.0 * Math.PI * i / 8;
        const px    = cx + W * 0.38 *
                      Math.cos(angle + t*0.25 + i*0.7);
        const py    = cy + H * 0.38 *
                      Math.sin(angle + t*0.18 + i*0.5);
        const dist  = Math.hypot(x - px, y - py);
        if (dist < minDist) {
          minDist = dist; nearPx = px; nearPy = py;
        }
      }
      return Math.atan2(cy - nearPy, cx - nearPx) +
             0.3 * Math.sin(0.5*t);
    },

    /* 27 — Interference Rings */
    function interferenceRings(x, y, t, s) {
      const srcs = [
        { px: cx - W*0.22, py: cy           },
        { px: cx + W*0.22, py: cy           },
        { px: cx,          py: cy - H*0.22  }
      ];
      return srcs.reduce((sum, src, i) => {
        const d = Math.hypot(x - src.px, y - src.py);
        return sum +
               Math.sin(0.02*s*d - t * (1.0 + 0.3*i));
      }, 0.0);
    },

    /* 28 — Tornado */
    function tornado(x, y, t, s) {
      const dx    = x - cx;
      const dy    = y - cy;
      const r     = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      const yN    = y / H;
      const width = (1.0 - yN) * 0.3 + 0.05;
      const spin  = 3.0 / (r / H + 0.1) * width;
      const tb    = turb(2.0*s*theta, 5.0*s*yN + t, 4);
      return theta + spin + 0.5*t + tb * 2.0;
    },

    /* 29 — Neural Network */
    function neuralNetwork(x, y, t, s) {
      let sum = 0.0;
      for (let i = 0; i < 6; i++) {
        const angle  = 2.0 * Math.PI * i / 6;
        const nx     = cx + W * 0.32 *
                       Math.cos(angle + 0.4*t);
        const ny     = cy + H * 0.32 *
                       Math.sin(angle + 0.3*t + i);
        const d      = Math.hypot(x - nx, y - ny);
        const weight = Math.exp(-0.005*s*d);
        sum += Math.sin(0.01*s*d + t + i) * weight;
      }
      return sum * 3.0;
    },

    /* 30 — Galaxy Arm */
    function galaxyArm(x, y, t, s) {
      const dx     = x - cx;
      const dy     = y - cy;
      const r      = Math.hypot(dx, dy);
      const theta  = Math.atan2(dy, dx);
      const spiral = theta - 0.6*s * Math.log(r + 1.0);
      const arm    = Math.sin(spiral * 2.0 + 0.3*t) * 0.5;
      return theta + arm +
             fBm(theta*s, 0.003*s*r + 0.05*t, 4) * 2.0 +
             Math.PI / 2.0;
    },

    /* 31 — Liquid Marble */
    function liquidMarble(x, y, t) {
      return Math.sin(
               6.0 * fBm(0.004*x + t, 0.004*y - t, 4)
             ) +
             Math.cos(
               4.0 * fBm(0.006*x, 0.006*y + t, 3)
             );
    },

    /* 32 — Solar Flare */
    function solarFlare(x, y, t) {
      const r     = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      return theta +
             4.0 * Math.sin(0.03*r - 2.0*t) +
             2.0 * noise2(0.01*x + t, 0.01*y);
    },

    /* 33 — Frozen Veins */
    function frozenVeins(x, y) {
      const eps = 1.0;
      const n   = noise2(0.01*x, 0.01*y);
      const dx2 = noise2(0.01*(x+eps), 0.01*y) - n;
      const dy2 = noise2(0.01*x, 0.01*(y+eps)) - n;
      return Math.atan2(dy2, dx2) +
             0.4 * Math.sin(18.0 * n);
    },

    /* 34 — Velvet Fold */
    function velvetFold(x, y, t) {
      return Math.sin(
               0.004*x +
               3.0 * fBm(0.003*y, 0.003*x + t, 4)
             ) * Math.cos(0.004*y - t);
    },

    /* 35 — Band Current */
    function bandCurrent(x, y, t) {
      return Math.sin(0.012*x + t) +
             0.7 * Math.cos(0.018*y - 0.6*t) +
             0.4 * Math.sin(0.01*(x - y));
    },

    /* 36 — Sonic Ripples */
    function sonicRipples(x, y, t) {
      const r = Math.hypot(x - cx, y - cy);
      return Math.sin(0.03*r - 3.0*t) +
             0.5 * Math.sin(0.05*r + 2.0*t);
    },

    /* 37 — Plasma Mesh */
    function plasmaMesh(x, y, t) {
      return Math.sin(0.01*x + t) +
             Math.sin(0.01*y - t) +
             Math.sin(0.01*(x+y) + 0.5*t);
    },

    /* 38 — Marble Vein */
    function marbleVein(x, y, t) {
      return Math.sin(
               0.01*x +
               5.0 * fBm(0.006*x, 0.006*y + t, 5)
             );
    },

    /* 39 — Hyper Tunnel */
    function hyperTunnel(x, y, t) {
      const r     = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      return theta + 8.0 / (r + 1.0) +
             Math.sin(0.05*r - 2.0*t);
    },

    /* 40 — Biofilm Drift */
    function biofilmDrift(x, y, t) {
      const w = warp(0.004*x, 0.004*y, t, 3);
      return 6.0 * fBm(w.x, w.y, 5) +
             0.8 * Math.sin(0.2*t);
    },

    /* 41 — Grid Stream */
    function gridStream(x, y, t) {
      const gx = Math.floor(x / 60.0);
      const gy = Math.floor(y / 60.0);
      return noise2(0.4*gx + 0.1*t, 0.4*gy) *
             2.0 * Math.PI +
             0.3 * Math.sin(gx + gy + t);
    },

    /* 42 — Cloud Chamber */
    function cloudChamber(x, y, t) {
      const eps = 1.0;
      const fb  = fBm(0.003*x + 0.05*t, 0.003*y, 6);
      const gx  = fBm(0.003*(x+eps) + 0.05*t,
                       0.003*y, 6) - fb;
      const gy  = fBm(0.003*x + 0.05*t,
                       0.003*(y+eps), 6) - fb;
      return Math.atan2(gy, gx) +
             0.6 * Math.sin(0.01*x + 0.01*y + t);
    },

    /* 43 — Ink Diffusion */
    function inkDiffusion(x, y, t) {
      const w = warp(0.002*x, 0.002*y, 0.2*t, 4);
      return fBm(w.x, w.y, 6) + 0.3 * Math.sin(t);
    },

    /* 44 — Luminous Web */
    function luminousWeb(x, y, t) {
      let sum = 0.0;
      for (let i = 0; i < 8; i++) {
        const angle = 2.0 * Math.PI * i / 8 + 0.1*t;
        const ax    = cx + W * 0.4 * Math.cos(angle);
        const ay    = cy + H * 0.4 * Math.sin(angle);
        const d     = Math.hypot(x - ax, y - ay);
        sum += Math.atan2(y - ay, x - ax) /
               (d * 0.01 + 1.0);
      }
      return sum;
    },

    /* 45 — Harmonic Tiles */
    function harmonicTiles(x, y, t, s) {
      const sz   = 80.0 / s;
      const fx   = x / sz + t;
      const fy   = y / sz - t;
      return Math.sin(2.0 * Math.PI * (fx - Math.floor(fx))) +
             Math.cos(2.0 * Math.PI * (fy - Math.floor(fy)));
    },

    /* 46 — Spiral Garden */
    function spiralGarden(x, y, t) {
      const dx    = x - cx;
      const dy    = y - cy;
      const r     = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      return theta + 0.004*r + Math.sin(5.0*theta - t);
    },

    /* 47 — Mercury Flow */
    function mercuryFlow(x, y, t) {
      const nx = noise2(0.006*x + t, 0.006*y);
      const ny = noise2(0.006*y, 0.006*x - t);
      return Math.sin(0.005*x + 4.0*nx) +
             Math.cos(0.005*y - 4.0*ny);
    },

    /* 48 — Prism Wave */
    function prismWave(x, y, t) {
      return Math.sin(0.008*x + t) *
             Math.sin(0.008*y - t) +
             Math.cos(0.012*(x - y));
    },

    /* 49 — Orbit Net */
    function orbitNet(x, y, t) {
      let sum = 0.0;
      for (let i = 0; i < 5; i++) {
        const angle = 2.0 * Math.PI * i / 5 + t * 0.22;
        const ox    = cx + W * 0.28 * Math.cos(angle);
        const oy    = cy + H * 0.28 * Math.sin(angle);
        const d     = Math.hypot(x - ox, y - oy);
        sum += Math.atan2(y - oy, x - ox) +
               0.2 * Math.sin(0.02*d - t);
      }
      return sum;
    },

    /* 50 — Ember Drift */
    function emberDrift(x, y, t) {
      return 5.0 * fBm(0.004*x + 0.1*t, 0.004*y, 4) +
             0.7 * (1.0 - y / H);
    },

    /* 51 — Glass Refraction */
    function glassRefraction(x, y, t) {
      const n1 = noise2(0.01*x, 0.01*y + t);
      const n2 = noise2(0.01*y, 0.01*x - t);
      return Math.atan2(
               Math.sin(0.02*x + 3.0*n1),
               Math.cos(0.02*y - 3.0*n2)
             );
    },

    /* 52 — Ocean Current */
    function oceanCurrent(x, y, t) {
      return 4.0 * fBm(
               0.002*x + 0.05*t,
               0.002*y - 0.03*t, 5
             ) + 0.4 * Math.sin(0.006*y + t);
    },

    /* 53 — Silk Bloom */
    function silkBloom(x, y, t) {
      return Math.sin(0.003*x + t) *
             Math.cos(0.003*y - t) +
             2.0 * fBm(0.005*x, 0.005*y + t, 3);
    },

    /* 54 — Flux Rings */
    function fluxRings(x, y, t) {
      const r     = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      return Math.sin(0.04*r - t) *
             Math.cos(6.0*theta + 0.5*t);
    },

    /* 55 — Industrial Flow */
    function industrialFlow(x, y, t) {
      const n1 = noise2(0.01*x, 0.01*y + t);
      const n2 = noise2(0.01*y, 0.01*x - t);
      return Math.atan2(
               Math.sin(0.02*x + 2.0*n1),
               Math.cos(0.02*y - 2.0*n2)
             );
    },

    /* 56 — Star Nursery */
    function starNursery(x, y, t) {
      const r     = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      return 6.0 * fBm(0.002*x, 0.002*y + 0.04*t, 5) +
             Math.sin(0.02*r + theta - t);
    },

    /* 57 — Wave Lattice */
    function waveLattice(x, y, t) {
      return Math.sin(0.01*x + t) +
             Math.cos(0.01*y - t) +
             Math.sin(0.01*(x - y));
    },

    /* 58 — Moiré Pulse */
    function moirePulse(x, y, t) {
      return Math.sin(0.03*x  + t) +
             Math.sin(0.031*y - 0.8*t);
    },

    /* 59 — Orbital Current */
    function orbitalCurrent(x, y, t) {
      const dx = x - cx;
      const dy = y - cy;
      const r  = Math.hypot(dx, dy);
      return Math.atan2(dy, dx) +
             0.6 * Math.sin(0.025*r - t) +
             0.25 * noise2(0.006*x, 0.006*y + 0.1*t);
    },

    /* 60 — Phantom Field */
    function phantomField(x, y, t) {
      const w = warp(0.003*x, 0.003*y, 0.15*t, 4);
      return 7.0 * fBm(w.x, w.y, 6) +
             Math.atan2(y - cy, x - cx) * 0.2;
    }

  ]; // end FORMULAS


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — COLOR ENGINE
     Brighter output for stronger Bloom on cube faces
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * valueToColor — maps normalised value to rgba string.
   * Linear interpolation between adjacent palette stops.
   * Alpha raised in v2.0 so trails read clearly
   * through THREE.CanvasTexture upload.
   */
  function valueToColor(v, alpha) {
    v = ((v % 1.0) + 1.0) % 1.0;

    const palette = PALETTES[paletteIndex];
    const count   = palette.length;
    const scaled  = v * count;
    const idx     = Math.floor(scaled) % count;
    const next    = (idx + 1) % count;
    const f       = scaled - Math.floor(scaled);

    const ca = palette[idx];
    const cb = palette[next];

    const r = Math.round(ca[0] + (cb[0] - ca[0]) * f);
    const g = Math.round(ca[1] + (cb[1] - ca[1]) * f);
    const b = Math.round(ca[2] + (cb[2] - ca[2]) * f);

    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — PARTICLE CLASS
     Float32Array trail — zero GC per frame
     Brighter alpha for CanvasTexture visibility
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  class Particle {

    constructor() {
      this.trail      = new Float32Array(TRAIL_LENGTH * 2);
      this.trailCount = 0;
      this.hueOffset  = Math.random();
      this.speed      = 0;
      this.vx         = 0;
      this.vy         = 0;
      this.age        = 0;
      this.maxAge     = 0;
      this.x          = 0;
      this.y          = 0;
      this.lineWidth  = 0;
      this.reset(true);
    }

    /**
     * reset — reinitialise particle position and state
     * @param {boolean} randomPos  true = random position
     */
    reset(randomPos) {
      if (randomPos) {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
      } else {
        this.x = cx + (Math.random() - 0.5) * W * 0.35;
        this.y = cy + (Math.random() - 0.5) * H * 0.35;
      }
      this.vx         = 0.0;
      this.vy         = 0.0;
      this.age        = 0;
      this.maxAge     = 130 + Math.random() * 220;
      this.speed      = 1.0 + Math.random() * 2.5;
      this.trailCount = 0;
      this.hueOffset  = Math.random();
      /* Slightly thicker for texture visibility */
      this.lineWidth  = 0.9 + Math.random() * 1.1;
    }

    /**
     * update — advance particle one step
     */
    update(formula, speed, scale, t) {
      const angle    = formula(this.x, this.y, t, scale);
      const targetVx = Math.cos(angle) * this.speed * speed;
      const targetVy = Math.sin(angle) * this.speed * speed;

      /* Exponential velocity smoothing */
      const smooth = 0.82;
      this.vx = this.vx * smooth + targetVx * (1.0 - smooth);
      this.vy = this.vy * smooth + targetVy * (1.0 - smooth);

      /* Shift trail buffer — most recent at index 0 */
      if (this.trailCount < TRAIL_LENGTH) this.trailCount++;
      for (let i = this.trailCount - 1; i > 0; i--) {
        this.trail[i * 2    ] = this.trail[(i-1) * 2    ];
        this.trail[i * 2 + 1] = this.trail[(i-1) * 2 + 1];
      }
      this.trail[0] = this.x;
      this.trail[1] = this.y;

      this.x   += this.vx;
      this.y   += this.vy;
      this.age += 1;

      /* Reset when out of bounds or expired */
      if (this.age > this.maxAge ||
          this.x   < -20         ||
          this.x   > W + 20      ||
          this.y   < -20         ||
          this.y   > H + 20) {
        this.reset(false);
      }
    }

    /**
     * draw — render trail with gradient fade
     * Alpha tuned high for CanvasTexture clarity
     */
    draw(ctx) {
      if (this.trailCount < 2) return;

      const lifeRatio = this.age / this.maxAge;
      /* v2.0: minimum alpha 0.55 for texture readability */
      const baseAlpha = (1.0 - lifeRatio) * 0.85;
      if (baseAlpha < 0.04) return;

      const hue = (this.hueOffset + this.age * 0.0025) % 1.0;

      /* Gradient from head (bright) to tail (dim) */
      const gradient = ctx.createLinearGradient(
        this.trail[0],
        this.trail[1],
        this.trail[(this.trailCount-1) * 2],
        this.trail[(this.trailCount-1) * 2 + 1]
      );
      gradient.addColorStop(0.0,
        valueToColor(hue,          baseAlpha));
      gradient.addColorStop(1.0,
        valueToColor(hue + 0.15,   baseAlpha * 0.15));

      ctx.beginPath();
      ctx.moveTo(this.trail[0], this.trail[1]);
      for (let i = 1; i < this.trailCount; i++) {
        ctx.lineTo(
          this.trail[i * 2],
          this.trail[i * 2 + 1]
        );
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth   = this.lineWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();

      /* Bright head node — larger for bloom pickup */
      ctx.beginPath();
      ctx.arc(
        this.x, this.y,
        this.lineWidth * 1.9,
        0, Math.PI * 2
      );
      ctx.fillStyle = valueToColor(
        hue,
        Math.min(baseAlpha * 2.2, 1.0)
      );
      ctx.fill();
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — POOL MANAGEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * syncPool — grow or shrink particle array
   * to match params.density without GC spikes
   */
  function syncPool() {
    const target = params.density | 0;
    while (particles.length < target) {
      particles.push(new Particle());
    }
    if (particles.length > target) {
      particles.length = target;
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — METRICS COMPUTATION
     Feeds SyncController for inversion logic
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function computeMetrics() {
    let outSum    = 0.0;
    let cwSum     = 0.0;
    let energySum = 0.0;

    /* Sample every 4th particle for performance */
    const SAMPLE = 4;
    let   count  = 0;

    for (let i = 0; i < particles.length; i += SAMPLE) {
      const p      = particles[i];
      const dx     = p.x - cx;
      const dy     = p.y - cy;
      const radLen = Math.hypot(dx, dy) + 0.001;

      /* Radial dot product → outward flow */
      outSum    += (p.vx * dx + p.vy * dy) / radLen;

      /* Cross product z-component → clockwise */
      cwSum     += p.vx * dy - p.vy * dx;

      /* Speed for energy */
      energySum += Math.hypot(p.vx, p.vy);
      count++;
    }

    if (count > 0) {
      metrics.outwardFlow = outSum    / (count * 4.0);
      metrics.clockwise   = cwSum     > 0;
      metrics.energy      = Math.min(energySum / (count * 4.0), 1.0);
    }

    metrics.frequency = Math.abs(Math.sin(t * 0.5)) *
                        params.speed;
    metrics.fps       = currentFPS;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — BACKGROUND RENDERING
     Semi-transparent fill creates motion blur trail.
     Alpha tuned for CanvasTexture: not too faint
     (trails vanish) not too opaque (muddy texture).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function drawBackground() {
    /* chaos [0..1] → alpha [0.10..0.28] */
    const fadeAlpha = 0.10 + params.chaos * 0.18;
    ctx.fillStyle   = `rgba(0,0,8,${fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — MAIN RENDER LOOP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function render(timestamp) {
    animId = requestAnimationFrame(render);

    /* Delta time — frame-rate independent */
    const delta = Math.min(
      (timestamp - lastTs) / 16.67,
      3.0  /* cap at 3x slow */
    );
    lastTs = timestamp;

    /* FPS tracking — update every 30 frames */
    fpsAccum += delta;
    fpsFrames++;
    if (fpsFrames >= 30) {
      currentFPS = Math.round(30.0 / (fpsAccum * 0.01667));
      fpsAccum   = 0;
      fpsFrames  = 0;
    }

    /* Advance global time */
    t          += 0.008 * params.speed * delta;
    frameCount++;

    /* Sync particle pool every 60 frames */
    if (frameCount % 60 === 0) syncPool();

    /* Draw background fade */
    drawBackground();

    /* Get active formula */
    const formula = FORMULAS[params.presetIndex];

    /* Update and draw all particles */
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      particles[i].update(
        formula,
        params.speed,
        params.scale,
        t
      );
      particles[i].draw(ctx);
    }

    /* Compute metrics for SyncController */
    computeMetrics();

    /*
      At this point canvas2d holds fresh particle data.
      cube3d.js will call liveTexture.needsUpdate = true
      in its own render loop, uploading this frame to GPU.
    */
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — INIT & RESIZE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function init(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d', {
      alpha:              true,
      /*
        willReadFrequently: false — correct here.
        cube3d.js reads via WebGL texImage2D which
        does NOT use getImageData(), so the browser
        does not need a CPU-readable copy.
      */
      willReadFrequently: false
    });

    resize();
    window.addEventListener('resize', resize);
    syncPool();

    console.info(
      `[Engine2D] Initialised. ` +
      `${params.density} particles. ` +
      `Canvas ready for CanvasTexture mapping.`
    );
  }

  function resize() {
    W  = canvas.width  = window.innerWidth;
    H  = canvas.height = window.innerHeight;
    cx = W * 0.5;
    cy = H * 0.5;

    /* Reset trails on resize to prevent streaks */
    particles.forEach(p => {
      p.trailCount = 0;
      p.reset(true);
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 11 — PRESET NAME DATA
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const PRESET_NAMES = [
    'Fiber Optics',     'Digital Silk',       'Wave Turbulence',
    'Dynamic Vortex',   'Neural Grid',         'Data Blocks',
    'Sand Waves',       'Galactic River',      'Radial Drift',
    'Geometric Repeat', 'Magnetic Field',      'Ordered Chaos',
    'Fractal Spiral',   'Electric Storm',      'DNA Helix',
    'Coral Growth',     'Quantum Field',       'Topographic Map',
    'Mirror Flow',      'Smoke Simulation',    'Crystal Lattice',
    'Nebula',           'Woven Fabric',        'Black Hole',
    'Aurora Borealis',  'Voronoi Flow',        'Interference Rings',
    'Tornado',          'Neural Network',      'Galaxy Arm',
    'Liquid Marble',    'Solar Flare',         'Frozen Veins',
    'Velvet Fold',      'Band Current',        'Sonic Ripples',
    'Plasma Mesh',      'Marble Vein',         'Hyper Tunnel',
    'Biofilm Drift',    'Grid Stream',         'Cloud Chamber',
    'Ink Diffusion',    'Luminous Web',        'Harmonic Tiles',
    'Spiral Garden',    'Mercury Flow',        'Prism Wave',
    'Orbit Net',        'Ember Drift',         'Glass Refraction',
    'Ocean Current',    'Silk Bloom',          'Flux Rings',
    'Industrial Flow',  'Star Nursery',        'Wave Lattice',
    'Moiré Pulse',      'Orbital Current',     'Phantom Field'
  ];


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PUBLIC API
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /** Start the render loop */
  function start() {
    if (!animId) {
      lastTs = performance.now();
      render(lastTs);
    }
  }

  /** Stop the render loop */
  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  /** Set active formula [0..59] */
  function setPreset(index) {
    const idx = Math.max(0, Math.min(59, index | 0));
    params.presetIndex = idx;
    console.info(
      `[Engine2D] Preset → ${idx} "${PRESET_NAMES[idx]}"`
    );
  }

  /** Update multiple parameters at once */
  function setParams(p) {
    if (p.speed   !== undefined) params.speed   = p.speed;
    if (p.scale   !== undefined) params.scale   = p.scale;
    if (p.chaos   !== undefined) params.chaos   = p.chaos;
    if (p.density !== undefined) {
      params.density = Math.max(
        100, Math.min(8000, p.density | 0)
      );
      syncPool();
    }
  }

  /** Set colour palette index [0..4] */
  function setPalette(index) {
    paletteIndex = Math.max(
      0, Math.min(PALETTES.length - 1, index | 0)
    );
  }

  /** Get live metrics for SyncController */
  function getMetrics() { return metrics; }

  /** Get preset name array */
  function getPresetNames() { return PRESET_NAMES; }

  /** Get current particle count */
  function getParticleCount() { return particles.length; }

  /**
   * resetParticles — clear all trails.
   * Called on preset change and orientation change.
   */
  function resetParticles() {
    particles.forEach(p => {
      p.trailCount = 0;
      p.reset(true);
    });
  }

  /**
   * selectPresetRelative — advance by delta.
   * Called by keyboard arrow keys via ui.js.
   * @param {number} delta  +1 or -1
   * @returns {number} new index
   */
  function selectPresetRelative(delta) {
    const next = (params.presetIndex + delta + 60) % 60;
    setPreset(next);
    return next;
  }

  /* Expose public API */
  return {
    init,
    start,
    stop,
    setPreset,
    setParams,
    setPalette,
    getMetrics,
    getPresetNames,
    getParticleCount,
    resetParticles,
    selectPresetRelative
  };

})();
