/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — engine2d.js
 *
 *  2D Flow-Field Particle Renderer
 *  · 60 Mathematical Formula Presets
 *  · Fractional Brownian Motion (fBm) Math Core
 *  · Domain Warping System
 *  · 2800+ GPU-optimised Particles with Trail System
 *  · Live Metrics Output → SyncController
 *  · Dynamic Density Control
 *  · Color Palette Engine (Cybernetic Gradients)
 *
 *  Architecture: IIFE Module Pattern (no global pollution)
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.Engine2D = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PRIVATE STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let canvas      = null;
  let ctx         = null;
  let W           = 0;      // canvas width
  let H           = 0;      // canvas height
  let cx          = 0;      // center X
  let cy          = 0;      // center Y
  let animId      = null;   // requestAnimationFrame id
  let t           = 0;      // global time accumulator
  let lastTs      = 0;      // last timestamp (for delta)
  let frameCount  = 0;      // total frames rendered
  let fpsAccum    = 0;      // FPS accumulator
  let currentFPS  = 60;     // smoothed FPS output

  /* ── Engine Parameters (set via setParams) ── */
  let params = {
    speed:        1.0,
    scale:        1.0,
    chaos:        0.5,
    presetIndex:  0,
    density:      2800    // target particle count
  };

  /* ── Particle Pool ── */
  let particles   = [];

  /* ── Output Metrics → SyncController ── */
  let metrics = {
    frequency:    0,    // [0..1]  oscillation speed estimate
    outwardFlow:  0,    // [-1..1] negative = inward, positive = outward
    clockwise:    true, // boolean rotation direction
    energy:       0,    // [0..1]  overall motion energy
    fps:          60
  };

  /* ── Color palette index cycles ── */
  const PALETTES = [
    // Cyber Neon
    [[0,240,255],[139,0,255],[255,215,0],[255,34,68],[0,255,136]],
    // Ice Storm
    [[0,200,255],[50,100,255],[0,255,200],[100,150,255],[200,240,255]],
    // Solar Flare
    [[255,100,0],[255,200,0],[255,50,50],[200,0,100],[255,150,50]],
    // Deep Void
    [[80,0,255],[0,80,255],[255,0,200],[0,200,150],[80,255,200]],
    // Toxic Grid
    [[0,255,100],[100,255,0],[0,200,80],[50,255,150],[200,255,0]]
  ];
  let paletteIndex = 0;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — MATHEMATICS CORE
     All noise, fBm, warp, and helper functions
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * hash2 — deterministic pseudo-random from 2 inputs
   * Uses sin-based hash (fast, good distribution for visuals)
   * @param  {number} x
   * @param  {number} y
   * @return {number} [0, 1)
   */
  function hash2(x, y) {
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return v - Math.floor(v);
  }

  /**
   * noise2 — smooth value noise
   * Bicubic interpolation of corner hashes
   * Returns [-1, 1]
   */
  function noise2(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    // Cubic smoothstep
    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);

    // Four corner hashes
    const ll = hash2(ix,     iy    );
    const lr = hash2(ix + 1, iy    );
    const ul = hash2(ix,     iy + 1);
    const ur = hash2(ix + 1, iy + 1);

    // Bilinear interpolation
    return (
      ll * (1 - ux) * (1 - uy) +
      lr * ux       * (1 - uy) +
      ul * (1 - ux) * uy       +
      ur * ux       * uy
    ) * 2.0 - 1.0;
  }

  /**
   * fBm — Fractional Brownian Motion
   * Sums multiple octaves of noise at increasing frequency
   * Returns approximately [-1, 1]
   *
   * @param {number} x
   * @param {number} y
   * @param {number} octaves  integer, typically 4–8
   * @param {number} [lacunarity=2.0]  frequency multiplier per octave
   * @param {number} [gain=0.5]        amplitude multiplier per octave
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
   * Creates sharp ridges. Good for lightning, cracks, fire.
   * Returns [0, ~1]
   */
  function turb(x, y, octaves) {
    let value     = 0.0;
    let amplitude = 0.5;
    let frequency = 1.0;

    for (let i = 0; i < octaves; i++) {
      value     += amplitude * Math.abs(noise2(x * frequency, y * frequency));
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  /**
   * warp — Iterative Domain Warping
   * Warps input coordinates using noise-based offsets.
   * Creates organic, fluid-like distortions.
   *
   * @param  {number} x
   * @param  {number} y
   * @param  {number} t    time
   * @param  {number} iters  warp depth (1–6 recommended)
   * @return {{x: number, y: number}}
   */
  function warp(x, y, t, iters) {
    let px = x;
    let py = y;

    for (let i = 0; i < iters; i++) {
      const strength = 0.8 / (i + 1); // weakens with depth
      const ox = px + strength * noise2(px + 0.3 * t + i * 3.7,
                                         py + 1.7  + i * 2.1);
      const oy = py + strength * noise2(px + 3.1 + 0.2 * t + i * 1.9,
                                         py + 2.3  + i * 4.3);
      px = ox;
      py = oy;
    }
    return { x: px, y: py };
  }

  /**
   * ridge — Ridge noise (inverted turb, sharp peaks)
   * Good for mountain-like or crystal structures.
   */
  function ridge(x, y, octaves) {
    let value     = 0.0;
    let amplitude = 0.5;
    let frequency = 1.0;

    for (let i = 0; i < octaves; i++) {
      const n = 1.0 - Math.abs(noise2(x * frequency, y * frequency));
      value     += amplitude * (n * n);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  /**
   * smoothstep — GLSL-style polynomial smoothstep
   */
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — 60 FORMULA LIBRARY
     Each formula(x, y, t, s) → angle (radians)
     x, y  = particle screen position
     t     = global time
     s     = scale parameter
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const FORMULAS = [

    /* ── 01 · Fiber Optics ──────────────────────────
       Layered sine/cosine waves with fBm turbulence.
       Creates streaming light-fiber trails.
    ─────────────────────────────────────────────── */
    function fiberOptics(x, y, t, s) {
      const base = (Math.sin(0.003 * s * x + t) +
                    Math.cos(0.003 * s * y + t)) * 2.2;
      const detail = fBm(0.003 * s * x, 0.003 * s * y, 4) * 3.0;
      return base + detail;
    },

    /* ── 02 · Digital Silk ──────────────────────────
       Domain-warped sine×cosine product.
       Smooth, flowing fabric-like motion.
    ─────────────────────────────────────────────── */
    function digitalSilk(x, y, t, s) {
      const w = warp(0.004 * s * x, 0.004 * s * y, t, 2);
      return Math.sin(w.x + 0.7 * t) * Math.cos(w.y - 0.5 * t) * 4.0;
    },

    /* ── 03 · Wave Turbulence ───────────────────────
       Turbulence-displaced interference of diagonal waves.
       Creates chaotic crashing-wave patterns.
    ─────────────────────────────────────────────── */
    function waveTurbulence(x, y, t, s) {
      const tb = turb(0.002 * s * x, 0.002 * s * y, 5);
      const a  = Math.sin(0.003 * s * (x + y) + t + tb * 4.0);
      const b  = Math.cos(0.003 * s * (x - y) - t);
      return (a - b) * 2.5;
    },

    /* ── 04 · Dynamic Vortex ────────────────────────
       Angular field + radial pull function.
       Particles orbit a dynamic attractor.
    ─────────────────────────────────────────────── */
    function dynamicVortex(x, y, t, s) {
      const r    = Math.hypot(x - cx, y - cy);
      const pull = Math.sin(0.008 * s * r - t) * 0.5;
      return Math.atan2(y - cy, x - cx) + 0.6 * t + pull;
    },

    /* ── 05 · Neural Grid ───────────────────────────
       Cell-based noise grid. Quantised flow field.
       Each grid cell has its own flow direction.
    ─────────────────────────────────────────────── */
    function neuralGrid(x, y, t, s) {
      const cellSize = 40.0 / s;
      const gx       = Math.floor(x / cellSize);
      const gy       = Math.floor(y / cellSize);
      const cell     = noise2(0.5 * gx, 0.5 * gy + 0.3 * t);
      return (gx + gy) * 0.5 * cell +
              0.1 * t +
              Math.sin(cell * 2.0 * Math.PI) * 2.0;
    },

    /* ── 06 · Data Blocks ───────────────────────────
       Rounded grid coordinates with noise modulation.
       Creates a pixelated data-matrix aesthetic.
    ─────────────────────────────────────────────── */
    function dataBlocks(x, y, t, s) {
      const bx = Math.round(x / (70.0 / s));
      const by = Math.round(y / (70.0 / s));
      const nn = noise2(bx + 0.2 * t, by);
      return (bx + by) * 0.22 +
              Math.sin(t + nn * 8.0) +
              Math.cos(nn * Math.PI) * 2.0;
    },

    /* ── 07 · Sand Waves ────────────────────────────
       fBm-displaced diagonal sinusoids.
       Evokes windswept desert dune ripples.
    ─────────────────────────────────────────────── */
    function sandWaves(x, y, t, s) {
      const nn = fBm(0.003 * s * x + 0.2 * t, 0.003 * s * y, 6);
      const a  = Math.sin(0.005 * s * (x + y) + t + nn * 5.0);
      const b  = Math.cos(0.005 * s * (x - y) - t + nn * 3.0);
      return a + b;
    },

    /* ── 08 · Galactic River ────────────────────────
       Deep domain warp + turbulence overlay.
       Simulates stellar gas streams.
    ─────────────────────────────────────────────── */
    function galacticRiver(x, y, t, s) {
      const w  = warp(0.002 * s * x, 0.002 * s * y, t, 4);
      const tb = turb(0.001 * s * x, 0.001 * s * y, 3);
      return Math.sin(w.x + t) * Math.cos(w.y + t) * 5.0 + tb * 3.0;
    },

    /* ── 09 · Radial Drift ──────────────────────────
       Radial sine rings with horizontal cosine drift.
       Clean radar-pulse aesthetic.
    ─────────────────────────────────────────────── */
    function radialDrift(x, y, t) {
      const r = Math.hypot(x - cx, y - cy);
      return Math.sin(0.02 * r + t) * 2.2 +
              0.35 * Math.cos(0.004 * y - 0.5 * t);
    },

    /* ── 10 · Geometric Repeat ──────────────────────
       Self-referential sine/cosine with noise offset.
       Produces recursive geometric tiling.
    ─────────────────────────────────────────────── */
    function geometricRepeat(x, y, t, s) {
      const nn = noise2(0.005 * s * x, 0.005 * s * y + 0.1 * t);
      return Math.sin(0.009 * s * x + Math.sin(0.006 * s * y + t)) +
             Math.cos(0.009 * s * y + Math.cos(0.006 * s * x + t)) +
             nn * 2.0;
    },

    /* ── 11 · Magnetic Field ────────────────────────
       Superposition of atan2 fields from 4 poles.
       Simulates electromagnetic field lines.
    ─────────────────────────────────────────────── */
    function magneticField(x, y, t) {
      const poles = [
        { px: cx - W * 0.25, py: cy,          sign:  1 },
        { px: cx + W * 0.25, py: cy,          sign: -1 },
        { px: cx,            py: cy - H * 0.25, sign:  1 },
        { px: cx,            py: cy + H * 0.25, sign: -1 }
      ];

      let sum = 0.0;
      poles.forEach(p => {
        sum += Math.atan2(y - p.py, x - p.px) * p.sign;
      });

      return sum / poles.length + 0.3 * Math.sin(t);
    },

    /* ── 12 · Ordered Chaos ─────────────────────────
       Sine×cosine grid modulated by turbulence.
       Structured patterns that break down.
    ─────────────────────────────────────────────── */
    function orderedChaos(x, y, t, s) {
      const nn = turb(0.003 * s * x + 0.1 * t, 0.003 * s * y, 6);
      return Math.sin(0.003 * s * x) *
             Math.cos(0.003 * s * y) *
             2.0 * Math.PI +
             Math.sin(t) +
             nn * 4.0;
    },

    /* ── 13 · Fractal Spiral ────────────────────────
       Logarithmic spiral with fBm angle displacement.
       Galaxy-like arms that fragment into detail.
    ─────────────────────────────────────────────── */
    function fractalSpiral(x, y, t, s) {
      const dx     = x - cx;
      const dy     = y - cy;
      const r      = Math.hypot(dx, dy);
      const theta  = Math.atan2(dy, dx);
      const spiral = Math.log(r + 1.0) * 0.5 * s + theta;
      const fb     = fBm(2.0 * theta, 0.005 * r, 4);
      return spiral + 0.4 * t + fb * 3.0;
    },

    /* ── 14 · Electric Storm ────────────────────────
       Dual-noise bolt function + angular base field.
       High-frequency lightning discharge aesthetic.
    ─────────────────────────────────────────────── */
    function electricStorm(x, y, t, s) {
      const n1   = noise2(0.005 * s * x + t, 0.005 * s * y);
      const n2   = noise2(0.01  * s * x,     0.01  * s * y - 0.5 * t);
      const bolt = Math.sin(n1 * 20.0) * Math.cos(n2 * 15.0);
      return bolt * 3.0 + Math.atan2(y - cy, x - cx) * 0.2;
    },

    /* ── 15 · DNA Helix ─────────────────────────────
       Sinusoidal column with atan2 wrap.
       Produces double-helix strand motion.
    ─────────────────────────────────────────────── */
    function dnaHelix(x, y, t, s) {
      const wave = Math.sin(0.01 * s * y + 2.0 * t) * W * 0.15;
      const col  = (x - cx - wave) * 0.005;
      return Math.atan2(Math.sin(0.02 * s * y + t), col) +
             Math.cos(0.008 * s * y + t) * 2.0;
    },

    /* ── 16 · Coral Growth ──────────────────────────
       Deep iterative warp + high-octave fBm.
       Organic branching coral-reef structure.
    ─────────────────────────────────────────────── */
    function coralGrowth(x, y, t, s) {
      const w = warp(0.003 * s * x, 0.003 * s * y, 0.3 * t, 6);
      return fBm(w.x, w.y, 6) * 8.0 + Math.sin(0.5 * t) * 2.0;
    },

    /* ── 17 · Quantum Field ─────────────────────────
       Two noise layers interfere via sinusoids.
       Simulates quantum probability wave overlap.
    ─────────────────────────────────────────────── */
    function quantumField(x, y, t, s) {
      const n1  = noise2(0.008 * s * x + 0.3 * t, 0.008 * s * y);
      const n2  = noise2(0.004 * s * x,            0.004 * s * y + 0.2 * t);
      const intf = Math.sin(n1 * 12.0 + n2 * 8.0 + t);
      const wave = Math.sin(0.006 * s * x) * Math.cos(0.006 * s * y);
      return intf * 2.0 + wave * 3.0;
    },

    /* ── 18 · Topographic Map ───────────────────────
       fBm heightfield gradient direction + contour lines.
       Simulates elevation map flow.
    ─────────────────────────────────────────────── */
    function topographicMap(x, y, t, s) {
      const eps  = 1.0;
      const h00  = fBm(0.002 * s * x       + 0.05 * t, 0.002 * s * y,       8);
      const h10  = fBm(0.002 * s * (x+eps) + 0.05 * t, 0.002 * s * y,       8);
      const h01  = fBm(0.002 * s * x       + 0.05 * t, 0.002 * s * (y+eps), 8);
      const gx   = h10 - h00;
      const gy   = h01 - h00;
      const contour = Math.sin(30.0 * h00) * 0.5;
      return Math.atan2(gy, gx) + contour;
    },

    /* ── 19 · Mirror Flow ───────────────────────────
       Folded coordinates create bilateral symmetry.
       Data streams that reflect across center axis.
    ─────────────────────────────────────────────── */
    function mirrorFlow(x, y, t) {
      const mx = Math.abs(x - cx);
      const my = Math.abs(y - cy);
      return 6.0 * fBm(0.005 * mx + 0.2 * t, 0.005 * my, 4) +
             0.8 * Math.sin(0.01 * mx - 0.008 * my + t);
    },

    /* ── 20 · Smoke Simulation ──────────────────────
       Double-warp with upward buoyancy vector.
       Thermal convection column simulation.
    ─────────────────────────────────────────────── */
    function smokeSimulation(x, y, t, s) {
      const w1   = warp(0.002 * s * x, 0.002 * s * y, 0.5 * t, 3);
      const w2   = warp(w1.x, w1.y, 0.3 * t, 2);
      const rise = -0.5 + (1.0 - y / H) * 0.8;
      return fBm(w2.x, w2.y, 5) * 6.0 + rise * 2.0 + 1.5 * Math.PI;
    },

    /* ── 21 · Crystal Lattice ───────────────────────
       Quadrature sine/cosine lattice + noise jitter.
       Angular crystalline structure.
    ─────────────────────────────────────────────── */
    function crystalLattice(x, y, t, s) {
      const ax = Math.sin(0.01 * s * x * 4.0 + t) * Math.cos(0.01 * s * y * 3.0);
      const ay = Math.cos(0.01 * s * x * 3.0 - t) * Math.sin(0.01 * s * y * 4.0);
      const nn = noise2(0.01 * s * x + 0.1 * t, 0.01 * s * y) * 2.0;
      return Math.atan2(ay + nn, ax + nn);
    },

    /* ── 22 · Nebula ────────────────────────────────
       Polar fBm + domain warp + angle bias.
       Deep-space gas cloud formation.
    ─────────────────────────────────────────────── */
    function nebula(x, y, t, s) {
      const dx    = x - cx;
      const dy    = y - cy;
      const r     = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      const rNorm = r / W;
      const w     = warp(0.001 * s * x, 0.001 * s * y, 0.2 * t, 5);
      const fb    = fBm(3.0 * theta + 0.1 * t, 5.0 * s * rNorm, 6);
      return fb * 5.0 + Math.sin(3.0 * w.x + 3.0 * w.y) * 2.0 + 0.3 * theta;
    },

    /* ── 23 · Woven Fabric ──────────────────────────
       Interlocking sine/cosine offsets + noise weft.
       Simulates thread crossings in textile.
    ─────────────────────────────────────────────── */
    function wovenFabric(x, y, t, s) {
      const wx = Math.sin(0.02 * s * x + t) * 20.0;
      const wy = Math.cos(0.02 * s * y - 0.7 * t) * 20.0;
      const nn = noise2(0.003 * s * x, 0.003 * s * y + 0.1 * t);
      return Math.atan2(
        Math.sin(0.01 * s * (y + wx)),
        Math.cos(0.01 * s * (x + wy))
      ) + nn * 2.0;
    },

    /* ── 24 · Black Hole ────────────────────────────
       Angular + inverse-radial pull + wave warp.
       Gravitational lens spacetime distortion.
    ─────────────────────────────────────────────── */
    function blackHole(x, y, t, s) {
      const dx    = x - cx;
      const dy    = y - cy;
      const r     = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      const pull  = 1.0 / (0.003 * r + 0.1);
      const spin  = theta + pull * 2.0 + 0.3 * t;
      const wp    = Math.sin(0.01 * s * r - 2.0 * t) * 0.5;
      return spin + wp;
    },

    /* ── 25 · Aurora Borealis ───────────────────────
       Vertical curtain sine + horizontal fBm drift.
       Atmospheric plasma ribbon simulation.
    ─────────────────────────────────────────────── */
    function auroraBorealis(x, y, t, s) {
      const fy      = y / H;
      const curtain = Math.sin(0.005 * s * x + t +
                               Math.sin(8.0 * fy + t) * 2.0) * 3.0;
      const drift   = fBm(0.001 * s * x + 0.1 * t, 0.003 * s * y, 5);
      return curtain + drift * 4.0 - Math.PI / 2.0;
    },

    /* ── 26 · Voronoi Flow ──────────────────────────
       8 moving seed points, angle toward nearest.
       Cellular automata-like territory flow.
    ─────────────────────────────────────────────── */
    function voronoiFlow(x, y, t) {
      const COUNT = 8;
      let minDist  = Infinity;
      let nearPx   = 0;
      let nearPy   = 0;

      for (let i = 0; i < COUNT; i++) {
        const angle = (2.0 * Math.PI * i / COUNT);
        const px    = cx + W * 0.38 * Math.cos(angle + t * 0.25 + i * 0.7);
        const py    = cy + H * 0.38 * Math.sin(angle + t * 0.18 + i * 0.5);
        const dist  = Math.hypot(x - px, y - py);
        if (dist < minDist) { minDist = dist; nearPx = px; nearPy = py; }
      }

      return Math.atan2(cy - nearPy, cx - nearPx) +
             0.3 * Math.sin(0.5 * t);
    },

    /* ── 27 · Interference Rings ────────────────────
       3 ripple sources summed.
       Constructive/destructive wave interference.
    ─────────────────────────────────────────────── */
    function interferenceRings(x, y, t, s) {
      const sources = [
        { px: cx - W * 0.22, py: cy           },
        { px: cx + W * 0.22, py: cy           },
        { px: cx,            py: cy - H * 0.22 }
      ];

      return sources.reduce((sum, src, i) => {
        const d = Math.hypot(x - src.px, y - src.py);
        return sum + Math.sin(0.02 * s * d - t * (1.0 + 0.3 * i));
      }, 0.0);
    },

    /* ── 28 · Tornado ───────────────────────────────
       Angular + inverse-radial spin + turbulence.
       Tapered vortex column.
    ─────────────────────────────────────────────── */
    function tornado(x, y, t, s) {
      const dx    = x - cx;
      const dy    = y - cy;
      const r     = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      const yNorm = y / H;
      const width = (1.0 - yNorm) * 0.3 + 0.05;
      const spin  = 3.0 / (r / H + 0.1) * width;
      const tb    = turb(2.0 * s * theta, 5.0 * s * yNorm + t, 4);
      return theta + spin + 0.5 * t + tb * 2.0;
    },

    /* ── 29 · Neural Network ────────────────────────
       6 orbital nodes emit weighted sine waves.
       Simulates axon signal propagation.
    ─────────────────────────────────────────────── */
    function neuralNetwork(x, y, t, s) {
      const NODE_COUNT = 6;
      let sum = 0.0;

      for (let i = 0; i < NODE_COUNT; i++) {
        const angle  = (2.0 * Math.PI * i / NODE_COUNT);
        const nx     = cx + W * 0.32 * Math.cos(angle + 0.4 * t);
        const ny     = cy + H * 0.32 * Math.sin(angle + 0.3 * t + i);
        const d      = Math.hypot(x - nx, y - ny);
        const weight = Math.exp(-0.005 * s * d);
        sum += Math.sin(0.01 * s * d + t + i) * weight;
      }

      return sum * 3.0;
    },

    /* ── 30 · Galaxy Arm ────────────────────────────
       Multi-arm logarithmic spiral + fBm texture.
       Barred spiral galaxy simulation.
    ─────────────────────────────────────────────── */
    function galaxyArm(x, y, t, s) {
      const dx     = x - cx;
      const dy     = y - cy;
      const r      = Math.hypot(dx, dy);
      const theta  = Math.atan2(dy, dx);
      const spiral = theta - 0.6 * s * Math.log(r + 1.0);
      const arm    = Math.sin(spiral * 2.0 + 0.3 * t) * 0.5;
      const fb     = fBm(theta * s, 0.003 * s * r + 0.05 * t, 4);
      return theta + arm + fb * 2.0 + Math.PI / 2.0;
    },

    /* ── 31 · Liquid Marble ─────────────────────────
       fBm inside sin/cos shells, two layers.
       Marble stone veining simulation.
    ─────────────────────────────────────────────── */
    function liquidMarble(x, y, t) {
      const a = Math.sin(6.0 * fBm(0.004 * x + t, 0.004 * y - t, 4));
      const b = Math.cos(4.0 * fBm(0.006 * x,     0.006 * y + t, 3));
      return a + b;
    },

    /* ── 32 · Solar Flare ───────────────────────────
       Angular + radial sine ejection + noise corona.
       Coronal mass ejection from a star.
    ─────────────────────────────────────────────── */
    function solarFlare(x, y, t) {
      const r     = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      return theta +
             4.0 * Math.sin(0.03 * r - 2.0 * t) +
             2.0 * noise2(0.01 * x + t, 0.01 * y);
    },

    /* ── 33 · Frozen Veins ──────────────────────────
       Noise gradient direction + contour snap.
       Ice crystal dendritic growth.
    ─────────────────────────────────────────────── */
    function frozenVeins(x, y, t) {
      const eps = 1.0;
      const n   = noise2(0.01 * x, 0.01 * y);
      const dx  = noise2(0.01 * (x + eps), 0.01 * y) - n;
      const dy  = noise2(0.01 * x, 0.01 * (y + eps)) - n;
      return Math.atan2(dy, dx) + 0.4 * Math.sin(18.0 * n);
    },

    /* ── 34 · Velvet Fold ───────────────────────────
       fBm-folded sine × cosine product.
       Soft textile crease simulation.
    ─────────────────────────────────────────────── */
    function velvetFold(x, y, t) {
      const fold = Math.sin(0.004 * x +
                   3.0 * fBm(0.003 * y, 0.003 * x + t, 4));
      return fold * Math.cos(0.004 * y - t);
    },

    /* ── 35 · Band Current ──────────────────────────
       Three additive sinusoid bands.
       Laminar flow in parallel streams.
    ─────────────────────────────────────────────── */
    function bandCurrent(x, y, t) {
      return Math.sin(0.012 * x + t) +
             0.7 * Math.cos(0.018 * y - 0.6 * t) +
             0.4 * Math.sin(0.01 * (x - y));
    },

    /* ── 36 · Sonic Ripples ─────────────────────────
       Two concentric radial sine waves.
       Audio speaker membrane vibration.
    ─────────────────────────────────────────────── */
    function sonicRipples(x, y, t) {
      const r = Math.hypot(x - cx, y - cy);
      return Math.sin(0.03 * r - 3.0 * t) +
             0.5 * Math.sin(0.05 * r + 2.0 * t);
    },

    /* ── 37 · Plasma Mesh ───────────────────────────
       Three additive sinusoids (x, y, diagonal).
       Classic plasma screen effect.
    ─────────────────────────────────────────────── */
    function plasmaMesh(x, y, t) {
      return Math.sin(0.01 * x + t) +
             Math.sin(0.01 * y - t) +
             Math.sin(0.01 * (x + y) + 0.5 * t);
    },

    /* ── 38 · Marble Vein ───────────────────────────
       fBm-displaced horizontal sine.
       Stone marble geological veining.
    ─────────────────────────────────────────────── */
    function marbleVein(x, y, t) {
      return Math.sin(0.01 * x + 5.0 * fBm(0.006 * x, 0.006 * y + t, 5));
    },

    /* ── 39 · Hyper Tunnel ──────────────────────────
       Angular + inverse-radius + radial sine.
       Infinite tunnel perspective distortion.
    ─────────────────────────────────────────────── */
    function hyperTunnel(x, y, t) {
      const r     = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      return theta + 8.0 / (r + 1.0) + Math.sin(0.05 * r - 2.0 * t);
    },

    /* ── 40 · Biofilm Drift ─────────────────────────
       Shallow warp + high-amplitude fBm.
       Microscopic organism colony motion.
    ─────────────────────────────────────────────── */
    function biofilmDrift(x, y, t) {
      const w = warp(0.004 * x, 0.004 * y, t, 3);
      return 6.0 * fBm(w.x, w.y, 5) + 0.8 * Math.sin(0.2 * t);
    },

    /* ── 41 · Grid Stream ───────────────────────────
       Coarse grid noise × 2π + sine modulation.
       Circuit board signal routing.
    ─────────────────────────────────────────────── */
    function gridStream(x, y, t) {
      const gx = Math.floor(x / 60.0);
      const gy = Math.floor(y / 60.0);
      return noise2(0.4 * gx + 0.1 * t, 0.4 * gy) * 2.0 * Math.PI +
             0.3 * Math.sin(gx + gy + t);
    },

    /* ── 42 · Cloud Chamber ─────────────────────────
       fBm gradient angle + additive sine.
       Particle physics detector track simulation.
    ─────────────────────────────────────────────── */
    function cloudChamber(x, y, t) {
      const eps = 1.0;
      const fb  = fBm(0.003 * x + 0.05 * t, 0.003 * y, 6);
      const gx  = fBm(0.003 * (x + eps) + 0.05 * t, 0.003 * y, 6) - fb;
      const gy  = fBm(0.003 * x + 0.05 * t, 0.003 * (y + eps), 6) - fb;
      return Math.atan2(gy, gx) + 0.6 * Math.sin(0.01 * x + 0.01 * y + t);
    },

    /* ── 43 · Ink Diffusion ─────────────────────────
       Warped fBm with slow drift.
       Ink drop spreading in water.
    ─────────────────────────────────────────────── */
    function inkDiffusion(x, y, t) {
      const w = warp(0.002 * x, 0.002 * y, 0.2 * t, 4);
      return fBm(w.x, w.y, 6) + 0.3 * Math.sin(t);
    },

    /* ── 44 · Luminous Web ──────────────────────────
       8 moving anchors, inverse-distance atan sum.
       Bioluminescent spider web structure.
    ─────────────────────────────────────────────── */
    function luminousWeb(x, y, t) {
      const ANCHORS = 8;
      let sum = 0.0;

      for (let i = 0; i < ANCHORS; i++) {
        const angle = (2.0 * Math.PI * i / ANCHORS) + 0.1 * t;
        const ax    = cx + W * 0.4 * Math.cos(angle);
        const ay    = cy + H * 0.4 * Math.sin(angle);
        const d     = Math.hypot(x - ax, y - ay);
        sum += Math.atan2(y - ay, x - ax) / (d * 0.01 + 1.0);
      }

      return sum;
    },

    /* ── 45 · Harmonic Tiles ────────────────────────
       Fractional coordinate sine + cosine tiling.
       Repeating harmonic wave tessellation.
    ─────────────────────────────────────────────── */
    function harmonicTiles(x, y, t, s) {
      const sz = 80.0 / s;
      const fx = x / sz + t;
      const fy = y / sz - t;
      const fracFx = fx - Math.floor(fx);
      const fracFy = fy - Math.floor(fy);
      return Math.sin(2.0 * Math.PI * fracFx) +
             Math.cos(2.0 * Math.PI * fracFy);
    },

    /* ── 46 · Spiral Garden ─────────────────────────
       Angular + linear-radial + multi-arm sine.
       Phyllotaxis-inspired spiral arms.
    ─────────────────────────────────────────────── */
    function spiralGarden(x, y, t) {
      const dx    = x - cx;
      const dy    = y - cy;
      const r     = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      return theta + 0.4 * r * 0.01 + Math.sin(5.0 * theta - t);
    },

    /* ── 47 · Mercury Flow ──────────────────────────
       Noise-displaced sinusoids on both axes.
       Liquid metal surface tension ripple.
    ─────────────────────────────────────────────── */
    function mercuryFlow(x, y, t) {
      const nx = noise2(0.006 * x + t, 0.006 * y);
      const ny = noise2(0.006 * y,     0.006 * x - t);
      return Math.sin(0.005 * x + 4.0 * nx) +
             Math.cos(0.005 * y - 4.0 * ny);
    },

    /* ── 48 · Prism Wave ────────────────────────────
       Multiplicative sine×sine + diagonal cosine.
       Light refraction through geometric prism.
    ─────────────────────────────────────────────── */
    function prismWave(x, y, t) {
      return Math.sin(0.008 * x + t) * Math.sin(0.008 * y - t) +
             Math.cos(0.012 * (x - y));
    },

    /* ── 49 · Orbit Net ─────────────────────────────
       5 orbital centers, angular sum + ripple.
       Planetary gravitational field lines.
    ─────────────────────────────────────────────── */
    function orbitNet(x, y, t) {
      const ORBITS = 5;
      let sum = 0.0;

      for (let i = 0; i < ORBITS; i++) {
        const angle = (2.0 * Math.PI * i / ORBITS) + t * 0.22;
        const ox    = cx + W * 0.28 * Math.cos(angle);
        const oy    = cy + H * 0.28 * Math.sin(angle);
        const d     = Math.hypot(x - ox, y - oy);
        sum += Math.atan2(y - oy, x - ox) +
               0.2 * Math.sin(0.02 * d - t);
      }

      return sum;
    },

    /* ── 50 · Ember Drift ───────────────────────────
       fBm + vertical buoyancy gradient.
       Hot ember particle rising in heat column.
    ─────────────────────────────────────────────── */
    function emberDrift(x, y, t) {
      return 5.0 * fBm(0.004 * x + 0.1 * t, 0.004 * y, 4) +
             0.7 * (1.0 - y / H);
    },

    /* ── 51 · Glass Refraction ──────────────────────
       atan2 of noise-displaced sine/cosine.
       Light bending through curved glass.
    ─────────────────────────────────────────────── */
    function glassRefraction(x, y, t) {
      const n1 = noise2(0.01 * x, 0.01 * y + t);
      const n2 = noise2(0.01 * y, 0.01 * x - t);
      return Math.atan2(
        Math.sin(0.02 * x + 3.0 * n1),
        Math.cos(0.02 * y - 3.0 * n2)
      );
    },

    /* ── 52 · Ocean Current ─────────────────────────
       Drifting fBm + sinusoidal latitude flow.
       Ocean gyre circulation pattern.
    ─────────────────────────────────────────────── */
    function oceanCurrent(x, y, t) {
      return 4.0 * fBm(0.002 * x + 0.05 * t,
                       0.002 * y - 0.03 * t, 5) +
             0.4 * Math.sin(0.006 * y + t);
    },

    /* ── 53 · Silk Bloom ────────────────────────────
       Sine×cosine product + fBm overlay.
       Thin silk scarf billowing in wind.
    ─────────────────────────────────────────────── */
    function silkBloom(x, y, t) {
      return Math.sin(0.003 * x + t) * Math.cos(0.003 * y - t) +
             2.0 * fBm(0.005 * x, 0.005 * y + t, 3);
    },

    /* ── 54 · Flux Rings ────────────────────────────
       Radial × angular product.
       Magnetic flux tube cross-section.
    ─────────────────────────────────────────────── */
    function fluxRings(x, y, t) {
      const r     = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      return Math.sin(0.04 * r - t) * Math.cos(6.0 * theta + 0.5 * t);
    },

    /* ── 55 · Industrial Flow ───────────────────────
       atan2 of noise-displaced sine/cosine (coarser).
       Heavy machinery coolant channel flow.
    ─────────────────────────────────────────────── */
    function industrialFlow(x, y, t) {
      const n1 = noise2(0.01 * x, 0.01 * y + t);
      const n2 = noise2(0.01 * y, 0.01 * x - t);
      return Math.atan2(
        Math.sin(0.02 * x + 2.0 * n1),
        Math.cos(0.02 * y - 2.0 * n2)
      );
    },

    /* ── 56 · Star Nursery ──────────────────────────
       Slow-drifting fBm + polar ripple.
       Interstellar cloud collapsing into stars.
    ─────────────────────────────────────────────── */
    function starNursery(x, y, t) {
      const r     = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      return 6.0 * fBm(0.002 * x, 0.002 * y + 0.04 * t, 5) +
             Math.sin(0.02 * r + theta - t);
    },

    /* ── 57 · Wave Lattice ──────────────────────────
       Three-component additive wave grid.
       Standing wave interference lattice.
    ─────────────────────────────────────────────── */
    function waveLattice(x, y, t) {
      return Math.sin(0.01 * x + t) +
             Math.cos(0.01 * y - t) +
             Math.sin(0.01 * (x - y));
    },

    /* ── 58 · Moiré Pulse ───────────────────────────
       Two near-frequency sinusoids beating.
       Optical moiré interference pattern.
    ─────────────────────────────────────────────── */
    function moirePulse(x, y, t) {
      return Math.sin(0.03  * x + t) +
             Math.sin(0.031 * y - 0.8 * t);
    },

    /* ── 59 · Orbital Current ───────────────────────
       Angular + radial sine + noise jitter.
       Charged particle in magnetic field orbit.
    ─────────────────────────────────────────────── */
    function orbitalCurrent(x, y, t) {
      const dx = x - cx;
      const dy = y - cy;
      const r  = Math.hypot(dx, dy);
      return Math.atan2(dy, dx) +
             0.6 * Math.sin(0.025 * r - t) +
             0.25 * noise2(0.006 * x, 0.006 * y + 0.1 * t);
    },

    /* ── 60 · Phantom Field ─────────────────────────
       Deep warp fBm + angular bias.
       Invisible force field made visible.
    ─────────────────────────────────────────────── */
    function phantomField(x, y, t) {
      const w = warp(0.003 * x, 0.003 * y, 0.15 * t, 4);
      return 7.0 * fBm(w.x, w.y, 6) +
             Math.atan2(y - cy, x - cx) * 0.2;
    }

  ]; // end FORMULAS


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — COLOR ENGINE
     Maps normalised [0..1] value to RGBA string
     using the active cybernetic palette
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * valueToColor
   * @param  {number} v     normalised value (any range, will be wrapped)
   * @param  {number} alpha opacity [0..1]
   * @return {string}       'rgba(r,g,b,a)'
   */
  function valueToColor(v, alpha) {
    // Wrap to [0, 1]
    v = ((v % 1.0) + 1.0) % 1.0;

    const palette = PALETTES[paletteIndex];
    const count   = palette.length;
    const scaled  = v * count;
    const idx     = Math.floor(scaled) % count;
    const next    = (idx + 1) % count;
    const f       = scaled - Math.floor(scaled);

    const ca = palette[idx];
    const cb = palette[next];

    // Linear interpolation between adjacent palette colours
    const r = Math.round(ca[0] + (cb[0] - ca[0]) * f);
    const g = Math.round(ca[1] + (cb[1] - ca[1]) * f);
    const b = Math.round(ca[2] + (cb[2] - ca[2]) * f);

    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — PARTICLE CLASS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const TRAIL_LENGTH = 30;  // maximum trail points per particle

  class Particle {

    constructor() {
      this.trail      = new Float32Array(TRAIL_LENGTH * 2); // [x0,y0,x1,y1,...]
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
     * reset — re-initialise particle at random or center position
     * @param {boolean} randomPos  true on first spawn, false on rebirth
     */
    reset(randomPos) {
      // Spread initial positions across full canvas
      if (randomPos) {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
      } else {
        // Rebirth near center with small jitter
        this.x = cx + (Math.random() - 0.5) * W * 0.3;
        this.y = cy + (Math.random() - 0.5) * H * 0.3;
      }

      this.vx         = 0.0;
      this.vy         = 0.0;
      this.age        = 0;
      this.maxAge     = 120 + Math.random() * 200;
      this.speed      = 0.8 + Math.random() * 2.2;
      this.trailCount = 0;
      this.hueOffset  = Math.random();
      this.lineWidth  = 0.6 + Math.random() * 0.8;
    }

    /**
     * update — advance particle one frame
     * @param {Function} formula  active formula function
     * @param {number}   speed    global speed multiplier
     * @param {number}   scale    global scale multiplier
     * @param {number}   t        global time
     */
    update(formula, speed, scale, t) {
      // Sample the flow field angle at current position
      const angle = formula(this.x, this.y, t, scale);

      // Smooth velocity (steering toward flow direction)
      const targetVx = Math.cos(angle) * this.speed * speed;
      const targetVy = Math.sin(angle) * this.speed * speed;

      // Exponential smoothing (reduces jitter, keeps motion fluid)
      const smooth = 0.82;
      this.vx = this.vx * smooth + targetVx * (1.0 - smooth);
      this.vy = this.vy * smooth + targetVy * (1.0 - smooth);

      // Store current position in trail buffer
      // Shift trail array by inserting at beginning
      if (this.trailCount < TRAIL_LENGTH) {
        this.trailCount++;
      }
      // Move existing trail back one slot
      for (let i = this.trailCount - 1; i > 0; i--) {
        this.trail[i * 2    ] = this.trail[(i - 1) * 2    ];
        this.trail[i * 2 + 1] = this.trail[(i - 1) * 2 + 1];
      }
      // Insert current position at front
      this.trail[0] = this.x;
      this.trail[1] = this.y;

      // Advance position
      this.x  += this.vx;
      this.y  += this.vy;
      this.age += 1;

      // Reset if out of bounds or too old
      if (this.age > this.maxAge  ||
          this.x   < -20          ||
          this.x   > W + 20       ||
          this.y   < -20          ||
          this.y   > H + 20) {
        this.reset(false);
      }
    }

    /**
     * draw — render trail to canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
      if (this.trailCount < 2) return;

      const lifeRatio = this.age / this.maxAge;
      const baseAlpha = (1.0 - lifeRatio) * 0.70;
      if (baseAlpha < 0.01) return;

      // Hue drifts gently over time
      const hue = (this.hueOffset + this.age * 0.0025) % 1.0;

      ctx.beginPath();
      ctx.moveTo(this.trail[0], this.trail[1]);

      for (let i = 1; i < this.trailCount; i++) {
        ctx.lineTo(this.trail[i * 2], this.trail[i * 2 + 1]);
      }

      // Trail fades toward tail
      const tailAlpha = baseAlpha * 0.25;
      const gradient  = ctx.createLinearGradient(
        this.trail[0],                             // head x
        this.trail[1],                             // head y
        this.trail[(this.trailCount-1) * 2],       // tail x
        this.trail[(this.trailCount-1) * 2 + 1]   // tail y
      );
      gradient.addColorStop(0.0, valueToColor(hue,           baseAlpha));
      gradient.addColorStop(1.0, valueToColor(hue + 0.15,    tailAlpha));

      ctx.strokeStyle = gradient;
      ctx.lineWidth   = this.lineWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();

      // Bright head node (data packet)
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.lineWidth * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = valueToColor(hue, Math.min(baseAlpha * 2.0, 1.0));
      ctx.fill();
    }

  } // end class Particle


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — POOL MANAGEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * syncPool — grow or shrink the particle array
   * to match params.density without GC thrashing.
   */
  function syncPool() {
    const target = params.density | 0; // integer

    // Grow
    while (particles.length < target) {
      particles.push(new Particle());
    }

    // Shrink (just truncate — no GC needed immediately)
    if (particles.length > target) {
      particles.length = target;
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — METRICS COMPUTATION
     Feeds the SyncController with live data
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * computeMetrics — called once per frame
   * Samples every Nth particle for performance.
   */
  function computeMetrics() {
    let outSum   = 0.0;
    let cwSum    = 0.0;
    let energySum = 0.0;
    const SAMPLE = 4; // sample every 4th particle
    let count    = 0;

    for (let i = 0; i < particles.length; i += SAMPLE) {
      const p  = particles[i];
      const dx = p.x - cx;
      const dy = p.y - cy;
      const speed = Math.hypot(p.vx, p.vy);

      // Outward flow: dot product of velocity with radial direction
      const radialLen = Math.hypot(dx, dy) + 0.001;
      outSum    += (p.vx * dx + p.vy * dy) / radialLen;

      // Clockwise: cross product z-component
      cwSum     += p.vx * dy - p.vy * dx;

      energySum += speed;
      count++;
    }

    if (count > 0) {
      metrics.outwardFlow = outSum  / (count * 4.0);   // normalise approx
      metrics.clockwise   = cwSum   > 0;
      metrics.energy      = Math.min(energySum / (count * 4.0), 1.0);
    }

    // Frequency estimate: how fast t oscillates
    metrics.frequency = Math.abs(Math.sin(t * 0.5)) * params.speed;
    metrics.fps       = currentFPS;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — BACKGROUND RENDERING
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * drawBackground — semi-transparent fade overlay.
   * Instead of ctx.clearRect, we paint a dark translucent
   * rectangle each frame → creates the "temporal tail"
   * motion blur that defines the flow-field aesthetic.
   *
   * Alpha tuned to params.chaos:
   *   low chaos  → longer tails (slower fade)
   *   high chaos → shorter tails (faster fade)
   */
  function drawBackground() {
    // Map chaos [0..1] to alpha [0.08..0.30]
    const fadeAlpha = 0.08 + params.chaos * 0.22;
    ctx.fillStyle   = `rgba(0, 0, 8, ${fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — MAIN RENDER LOOP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function render(timestamp) {
    animId = requestAnimationFrame(render);

    /* ── Delta Time ── */
    const delta = Math.min((timestamp - lastTs) / 16.67, 3.0); // cap at 3× slow
    lastTs = timestamp;

    /* ── FPS Counter ── */
    fpsAccum  += delta;
    frameCount++;
    if (frameCount % 30 === 0) {
      // Update FPS every 30 frames
      currentFPS = Math.round(30.0 / (fpsAccum * 0.01667));
      fpsAccum   = 0;
    }

    /* ── Advance Global Time ── */
    t += 0.008 * params.speed * delta;

    /* ── Sync Particle Pool to Density ── */
    if (frameCount % 60 === 0) syncPool();

    /* ── Draw Background Fade ── */
    drawBackground();

    /* ── Get Active Formula ── */
    const formula = FORMULAS[params.presetIndex];

    /* ── Update & Draw Particles ── */
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      particles[i].update(formula, params.speed, params.scale, t);
      particles[i].draw(ctx);
    }

    /* ── Compute Sync Metrics ── */
    computeMetrics();
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — INIT & RESIZE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function init(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d', {
      alpha:             true,
      willReadFrequently: false
    });

    resize();
    window.addEventListener('resize', resize);

    // Initial pool
    syncPool();
  }

  function resize() {
    W  = canvas.width  = window.innerWidth;
    H  = canvas.height = window.innerHeight;
    cx = W * 0.5;
    cy = H * 0.5;

    // Reset all trails on resize to avoid streaks
    particles.forEach(p => {
      p.trailCount = 0;
      p.reset(true);
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — PRESET NAME DATA
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

  /** Start the animation loop */
  function start() {
    if (!animId) {
      lastTs = performance.now();
      render(lastTs);
    }
  }

  /** Stop the animation loop */
  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  /** Set active formula by index [0..59] */
  function setPreset(index) {
    params.presetIndex = Math.max(0, Math.min(59, index | 0));
  }

  /**
   * Set multiple parameters at once
   * @param {Object} p  partial params object
   */
  function setParams(p) {
    if (p.speed   !== undefined) params.speed   = p.speed;
    if (p.scale   !== undefined) params.scale   = p.scale;
    if (p.chaos   !== undefined) params.chaos   = p.chaos;
    if (p.density !== undefined) {
      params.density = Math.max(100, Math.min(8000, p.density | 0));
      syncPool();
    }
  }

  /** Set colour palette [0..4] */
  function setPalette(index) {
    paletteIndex = Math.max(0, Math.min(PALETTES.length - 1, index | 0));
  }

  /** Get live sync metrics for SyncController */
  function getMetrics() {
    return metrics;
  }

  /** Get the English preset name array */
  function getPresetNames() {
    return PRESET_NAMES;
  }

  /** Get current particle count */
  function getParticleCount() {
    return particles.length;
  }

  /** Force-reset all particles (e.g. after preset change) */
  function resetParticles() {
    particles.forEach(p => p.reset(true));
  }

  /* ── Expose public surface ── */
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
    resetParticles
  };

})(); // end Engine2D
