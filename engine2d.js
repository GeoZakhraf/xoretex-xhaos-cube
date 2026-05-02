/**
 * ═══════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — engine2d.js
 *  2D Canvas Flow-Field Renderer
 *  60-Formula Mathematical Preset Library
 * ═══════════════════════════════════════════════════
 */

'use strict';

window.Engine2D = (function () {

  /* ─── Private State ─── */
  let canvas, ctx, W, H, cx, cy;
  let animId   = null;
  let t        = 0;
  let params   = { speed: 1, scale: 1, chaos: 0.5, presetIndex: 0 };
  let particles = [];
  const PARTICLE_COUNT = 2800;

  /* ─── Output Metrics for SyncController ─── */
  let metrics = { frequency: 0, outwardFlow: 0, clockwise: true };

  /* ══════════════════════════════════════════════
     MATH UTILITIES
  ══════════════════════════════════════════════ */

  /** Simple value noise (2D hash-based) */
  function noise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const h = (a, b) => {
      let v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    return (
      h(ix,   iy  ) * (1-ux) * (1-uy) +
      h(ix+1, iy  ) * ux     * (1-uy) +
      h(ix,   iy+1) * (1-ux) * uy     +
      h(ix+1, iy+1) * ux     * uy
    ) * 2 - 1;
  }

  /** Fractional Brownian Motion */
  function fBm(x, y, octaves) {
    let v = 0, a = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
      v += a * noise2(x * freq, y * freq);
      freq *= 2.0; a *= 0.5;
    }
    return v;
  }

  /** Turbulence (absolute fBm) */
  function turb(x, y, octaves) {
    let v = 0, a = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
      v += a * Math.abs(noise2(x * freq, y * freq));
      freq *= 2.0; a *= 0.5;
    }
    return v;
  }

  /** Domain Warp — returns {x, y} warped coordinates */
  function warp(x, y, t, iters) {
    let px = x, py = y;
    for (let i = 0; i < iters; i++) {
      const nx = px + 0.8 * noise2(px + 0.3 * t, py + 1.7);
      const ny = py + 0.8 * noise2(px + 3.1 + 0.2 * t, py + 2.3);
      px = nx; py = ny;
    }
    return { x: px, y: py };
  }

  /* ══════════════════════════════════════════════
     60 FORMULA LIBRARY
     Each formula returns an angle (radians)
     that drives particle flow direction.
  ══════════════════════════════════════════════ */

  const FORMULAS = [

    /* 01 — Fiber Optics */
    (x, y, t, s) => {
      const fb = fBm(0.003*s*x, 0.003*s*y, 4);
      return (Math.sin(0.003*s*x + t) + Math.cos(0.003*s*y + t)) * 2.2 + fb * 3;
    },

    /* 02 — Digital Silk */
    (x, y, t, s) => {
      const w = warp(0.004*s*x, 0.004*s*y, t, 2);
      return Math.sin(w.x + 0.7*t) * Math.cos(w.y - 0.5*t) * 4;
    },

    /* 03 — Wave Turbulence */
    (x, y, t, s) => {
      const tb = turb(0.002*s*x, 0.002*s*y, 5);
      return (Math.sin(0.003*s*(x+y) + t + tb*4) - Math.cos(0.003*s*(x-y) - t)) * 2.5;
    },

    /* 04 — Dynamic Vortex */
    (x, y, t, s) => {
      const r    = Math.hypot(x - cx, y - cy);
      const pull = Math.sin(0.008*s*r - t) * 0.5;
      return Math.atan2(y - cy, x - cx) + 0.6*t + pull;
    },

    /* 05 — Neural Grid */
    (x, y, t, s) => {
      const gx   = Math.floor(x / (40/s));
      const gy   = Math.floor(y / (40/s));
      const cell = noise2(0.5*gx, 0.5*gy + 0.3*t);
      return (gx + gy) * 0.5 * cell + 0.1*t + Math.sin(cell * 2*Math.PI) * 2;
    },

    /* 06 — Data Blocks */
    (x, y, t, s) => {
      const bx = Math.round(x / (70/s));
      const by = Math.round(y / (70/s));
      const nn = noise2(bx + 0.2*t, by);
      return (bx + by) * 0.22 + Math.sin(t + nn*8) + Math.cos(nn*Math.PI) * 2;
    },

    /* 07 — Sand Waves */
    (x, y, t, s) => {
      const nn = fBm(0.003*s*x + 0.2*t, 0.003*s*y, 6);
      return Math.sin(0.005*s*(x+y) + t + nn*5) + Math.cos(0.005*s*(x-y) - t + nn*3);
    },

    /* 08 — Galactic River */
    (x, y, t, s) => {
      const w  = warp(0.002*s*x, 0.002*s*y, t, 4);
      const tb = turb(0.001*s*x, 0.001*s*y, 3);
      return Math.sin(w.x + t) * Math.cos(w.y + t) * 5 + tb * 3;
    },

    /* 09 — Radial Drift */
    (x, y, t) => {
      const r = Math.hypot(x - cx, y - cy);
      return Math.sin(0.02*r + t) * 2.2 + 0.35 * Math.cos(0.004*y - 0.5*t);
    },

    /* 10 — Geometric Repeat */
    (x, y, t, s) => {
      const nn = noise2(0.005*s*x, 0.005*s*y + 0.1*t);
      return Math.sin(0.009*s*x + Math.sin(0.006*s*y + t)) +
             Math.cos(0.009*s*y + Math.cos(0.006*s*x + t)) + nn * 2;
    },

    /* 11 — Magnetic Field (4 poles) */
    (x, y, t) => {
      const poles = [
        { px: cx - W*0.25, py: cy,          sign:  1 },
        { px: cx + W*0.25, py: cy,          sign: -1 },
        { px: cx,          py: cy - H*0.25, sign:  1 },
        { px: cx,          py: cy + H*0.25, sign: -1 }
      ];
      let sum = 0;
      poles.forEach(p => { sum += Math.atan2(y - p.py, x - p.px) * p.sign; });
      return sum / poles.length + 0.3 * Math.sin(t);
    },

    /* 12 — Ordered Chaos */
    (x, y, t, s) => {
      const nn = turb(0.003*s*x + 0.1*t, 0.003*s*y, 6);
      return Math.sin(0.003*s*x) * Math.cos(0.003*s*y) * 2*Math.PI + Math.sin(t) + nn*4;
    },

    /* 13 — Fractal Spiral */
    (x, y, t, s) => {
      const dx = x - cx, dy = y - cy;
      const r  = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx);
      const spiral = Math.log(r + 1) * 0.5*s + th;
      return spiral + 0.4*t + fBm(2*th, 0.005*r, 4) * 3;
    },

    /* 14 — Electric Storm */
    (x, y, t, s) => {
      const n1   = noise2(0.005*s*x + t, 0.005*s*y);
      const n2   = noise2(0.01*s*x, 0.01*s*y - 0.5*t);
      const bolt = Math.sin(n1*20) * Math.cos(n2*15);
      return bolt * 3 + Math.atan2(y - cy, x - cx) * 0.2;
    },

    /* 15 — DNA Helix */
    (x, y, t, s) => {
      const wave = Math.sin(0.01*s*y + 2*t) * W * 0.15;
      return Math.atan2(Math.sin(0.02*s*y + t), (x - cx - wave) * 0.005) +
             Math.cos(0.008*s*y + t) * 2;
    },

    /* 16 — Coral Growth */
    (x, y, t, s) => {
      const w  = warp(0.003*s*x, 0.003*s*y, 0.3*t, 6);
      return fBm(w.x, w.y, 6) * 8 + Math.sin(0.5*t) * 2;
    },

    /* 17 — Quantum Field */
    (x, y, t, s) => {
      const n1  = noise2(0.008*s*x + 0.3*t, 0.008*s*y);
      const n2  = noise2(0.004*s*x, 0.004*s*y + 0.2*t);
      const interference = Math.sin(n1*12 + n2*8 + t);
      const wave = Math.sin(0.006*s*x) * Math.cos(0.006*s*y);
      return interference * 2 + wave * 3;
    },

    /* 18 — Topographic Map */
    (x, y, t, s) => {
      const H_val = fBm(0.002*s*x + 0.05*t, 0.002*s*y, 8);
      const contour = Math.sin(30 * H_val) * 0.5;
      const gx = fBm(0.002*s*(x+1), 0.002*s*y, 8) - H_val;
      const gy = fBm(0.002*s*x, 0.002*s*(y+1), 8) - H_val;
      return Math.atan2(gy, gx) + contour;
    },

    /* 19 — Mirror Flow */
    (x, y, t) => {
      const mx = Math.abs(x - cx), my = Math.abs(y - cy);
      return 6 * fBm(0.005*mx + 0.2*t, 0.005*my, 4) +
             0.8 * Math.sin(0.01*mx - 0.008*my + t);
    },

    /* 20 — Smoke Simulation */
    (x, y, t, s) => {
      const w1   = warp(0.002*s*x, 0.002*s*y, 0.5*t, 3);
      const w2   = warp(w1.x, w1.y, 0.3*t, 2);
      const rise = -0.5 + (1 - y/H) * 0.8;
      return fBm(w2.x, w2.y, 5) * 6 + rise * 2 + 1.5*Math.PI;
    },

    /* 21 — Crystal Lattice */
    (x, y, t, s) => {
      const ax = Math.sin(0.01*s*x*4 + t) * Math.cos(0.01*s*y*3);
      const ay = Math.cos(0.01*s*x*3 - t) * Math.sin(0.01*s*y*4);
      const nn = noise2(0.01*s*x + 0.1*t, 0.01*s*y) * 2;
      return Math.atan2(ay + nn, ax + nn);
    },

    /* 22 — Nebula */
    (x, y, t, s) => {
      const dx = x - cx, dy = y - cy;
      const r  = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx);
      const rN = r / W;
      const w  = warp(0.001*s*x, 0.001*s*y, 0.2*t, 5);
      return fBm(3*th + 0.1*t, 5*s*rN, 6) * 5 + Math.sin(3*w.x + 3*w.y) * 2 + 0.3*th;
    },

    /* 23 — Woven Fabric */
    (x, y, t, s) => {
      const wx = Math.sin(0.02*s*x + t) * 20;
      const wy = Math.cos(0.02*s*y - 0.7*t) * 20;
      const nn = noise2(0.003*s*x, 0.003*s*y + 0.1*t);
      return Math.atan2(Math.sin(0.01*s*(y + wx)), Math.cos(0.01*s*(x + wy))) + nn * 2;
    },

    /* 24 — Black Hole */
    (x, y, t, s) => {
      const dx   = x - cx, dy = y - cy;
      const r    = Math.hypot(dx, dy);
      const th   = Math.atan2(dy, dx);
      const pull = 1 / (0.003*r + 0.1);
      const spin = th + pull * 2 + 0.3*t;
      const wp   = Math.sin(0.01*s*r - 2*t) * 0.5;
      return spin + wp;
    },

    /* 25 — Aurora Borealis */
    (x, y, t, s) => {
      const fy      = y / H;
      const curtain = Math.sin(0.005*s*x + t + Math.sin(8*fy + t)*2) * 3;
      const drift   = fBm(0.001*s*x + 0.1*t, 0.003*s*y, 5);
      return curtain + drift * 4 - Math.PI/2;
    },

    /* 26 — Voronoi Flow (8 seed points) */
    (x, y, t) => {
      const seeds = Array.from({length: 8}, (_, i) => ({
        px: cx + W * 0.4 * Math.cos(2*Math.PI*i/8 + t*0.3),
        py: cy + H * 0.4 * Math.sin(2*Math.PI*i/8 + t*0.2)
      }));
      let minD = Infinity, nearPx = 0, nearPy = 0;
      seeds.forEach(s => {
        const d = Math.hypot(x - s.px, y - s.py);
        if (d < minD) { minD = d; nearPx = s.px; nearPy = s.py; }
      });
      return Math.atan2(cy - nearPy, cx - nearPx) + 0.3 * Math.sin(0.5*t);
    },

    /* 27 — Interference Rings (3 sources) */
    (x, y, t, s) => {
      const srcs = [
        { px: cx - W*0.2, py: cy },
        { px: cx + W*0.2, py: cy },
        { px: cx,         py: cy - H*0.2 }
      ];
      return srcs.reduce((sum, src, i) => {
        const d = Math.hypot(x - src.px, y - src.py);
        return sum + Math.sin(0.02*s*d - t * (1 + 0.3*i));
      }, 0);
    },

    /* 28 — Tornado */
    (x, y, t, s) => {
      const dx    = x - cx, dy = y - cy;
      const r     = Math.hypot(dx, dy);
      const th    = Math.atan2(dy, dx);
      const yN    = y / H;
      const width = (1 - yN) * 0.3 + 0.05;
      const spin  = 3.0 / (r/H + 0.1) * width;
      const tb    = turb(2*s*th, 5*s*yN + t, 4);
      return th + spin + 0.5*t + tb * 2;
    },

    /* 29 — Neural Network (6 nodes) */
    (x, y, t, s) => {
      const nodes = Array.from({length: 6}, (_, i) => ({
        nx: cx + W * 0.35 * Math.cos(2*Math.PI*i/6 + 0.4*t),
        ny: cy + H * 0.35 * Math.sin(2*Math.PI*i/6 + 0.3*t)
      }));
      let sum = 0;
      nodes.forEach((n, i) => {
        const d = Math.hypot(x - n.nx, y - n.ny);
        const w = Math.exp(-0.005*s*d);
        sum += Math.sin(0.01*s*d + t + i) * w;
      });
      return sum * 3;
    },

    /* 30 — Galaxy Arm */
    (x, y, t, s) => {
      const dx    = x - cx, dy = y - cy;
      const r     = Math.hypot(dx, dy);
      const th    = Math.atan2(dy, dx);
      const spiral= th - 0.6*s * Math.log(r + 1);
      const arm   = Math.sin(spiral * 2 + 0.3*t) * 0.5;
      const fb    = fBm(th * s, 0.003*s*r + 0.05*t, 4);
      return th + arm + fb * 2 + Math.PI/2;
    },

    /* 31 — Liquid Marble */
    (x, y, t) => {
      return Math.sin(6 * fBm(0.004*x + t, 0.004*y - t, 4)) +
             Math.cos(4 * fBm(0.006*x, 0.006*y + t, 3));
    },

    /* 32 — Solar Flare */
    (x, y, t) => {
      const r  = Math.hypot(x - cx, y - cy);
      const th = Math.atan2(y - cy, x - cx);
      return th + 4 * Math.sin(0.03*r - 2*t) + 2 * noise2(0.01*x + t, 0.01*y);
    },

    /* 33 — Frozen Veins */
    (x, y, t) => {
      const eps = 1.0;
      const nn  = noise2(0.01*x, 0.01*y);
      const dx2 = noise2(0.01*(x+eps), 0.01*y) - nn;
      const dy2 = noise2(0.01*x, 0.01*(y+eps)) - nn;
      return Math.atan2(dy2, dx2) + 0.4 * Math.sin(18*nn);
    },

    /* 34 — Velvet Fold */
    (x, y, t) => {
      return Math.sin(0.004*x + 3 * fBm(0.003*y, 0.003*x + t, 4)) *
             Math.cos(0.004*y - t);
    },

    /* 35 — Band Current */
    (x, y, t) => {
      return Math.sin(0.012*x + t) + 0.7 * Math.cos(0.018*y - 0.6*t) +
             0.4 * Math.sin(0.01*(x - y));
    },

    /* 36 — Sonic Ripples */
    (x, y, t) => {
      const r = Math.hypot(x - cx, y - cy);
      return Math.sin(0.03*r - 3*t) + 0.5 * Math.sin(0.05*r + 2*t);
    },

    /* 37 — Plasma Mesh */
    (x, y, t) => {
      return Math.sin(0.01*x + t) + Math.sin(0.01*y - t) + Math.sin(0.01*(x+y) + 0.5*t);
    },

    /* 38 — Marble Vein */
    (x, y, t) => {
      return Math.sin(0.01*x + 5 * fBm(0.006*x, 0.006*y + t, 5));
    },

    /* 39 — Hyper Tunnel */
    (x, y, t) => {
      const r  = Math.hypot(x - cx, y - cy);
      const th = Math.atan2(y - cy, x - cx);
      return th + 8/(r + 1) + Math.sin(0.05*r - 2*t);
    },

    /* 40 — Biofilm Drift */
    (x, y, t) => {
      const w = warp(0.004*x, 0.004*y, t, 3);
      return 6 * fBm(w.x, w.y, 5) + 0.8 * Math.sin(0.2*t);
    },

    /* 41 — Grid Stream */
    (x, y, t) => {
      const gx = Math.floor(x / 60);
      const gy = Math.floor(y / 60);
      return noise2(0.4*gx + 0.1*t, 0.4*gy) * 2*Math.PI + 0.3 * Math.sin(gx + gy + t);
    },

    /* 42 — Cloud Chamber */
    (x, y, t, s) => {
      const eps = 1.0;
      const fb  = fBm(0.003*x + 0.05*t, 0.003*y, 6);
      const gx  = fBm(0.003*(x+eps) + 0.05*t, 0.003*y, 6) - fb;
      const gy  = fBm(0.003*x + 0.05*t, 0.003*(y+eps), 6) - fb;
      return Math.atan2(gy, gx) + 0.6 * Math.sin(0.01*x + 0.01*y + t);
    },

    /* 43 — Ink Diffusion */
    (x, y, t) => {
      const w = warp(0.002*x, 0.002*y, 0.2*t, 4);
      return fBm(w.x, w.y, 6) + 0.3 * Math.sin(t);
    },

    /* 44 — Luminous Web (8 anchors) */
    (x, y, t) => {
      const anchors = Array.from({length: 8}, (_, i) => ({
        ax: cx + W * 0.4 * Math.cos(2*Math.PI*i/8 + 0.1*t),
        ay: cy + H * 0.4 * Math.sin(2*Math.PI*i/8)
      }));
      let sum = 0;
      anchors.forEach(a => {
        const d = Math.hypot(x - a.ax, y - a.ay);
        sum += Math.atan2(y - a.ay, x - a.ax) / (d * 0.01 + 1);
      });
      return sum;
    },

    /* 45 — Harmonic Tiles */
    (x, y, t, s) => {
      const sz = 80 / s;
      const fx = x/sz + t, fy = y/sz - t;
      return Math.sin(2*Math.PI*(fx - Math.floor(fx))) +
             Math.cos(2*Math.PI*(fy - Math.floor(fy)));
    },

    /* 46 — Spiral Garden */
    (x, y, t) => {
      const dx = x - cx, dy = y - cy;
      const r  = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx);
      return th + 0.4*r*0.01 + Math.sin(5*th - t);
    },

    /* 47 — Mercury Flow */
    (x, y, t) => {
      return Math.sin(0.005*x + 4 * noise2(0.006*x + t, 0.006*y)) +
             Math.cos(0.005*y - 4 * noise2(0.006*y, 0.006*x - t));
    },

    /* 48 — Prism Wave */
    (x, y, t) => {
      return Math.sin(0.008*x + t) * Math.sin(0.008*y - t) + Math.cos(0.012*(x - y));
    },

    /* 49 — Orbit Net (5 orbital centers) */
    (x, y, t) => {
      const orbs = Array.from({length: 5}, (_, i) => ({
        ox: cx + W * 0.3 * Math.cos(2*Math.PI*i/5 + t * 0.25),
        oy: cy + H * 0.3 * Math.sin(2*Math.PI*i/5 + t * 0.2)
      }));
      let sum = 0;
      orbs.forEach(o => {
        const d = Math.hypot(x - o.ox, y - o.oy);
        sum += Math.atan2(y - o.oy, x - o.ox) + 0.2 * Math.sin(0.02*d - t);
      });
      return sum;
    },

    /* 50 — Ember Drift */
    (x, y, t) => {
      return 5 * fBm(0.004*x + 0.1*t, 0.004*y, 4) + 0.7 * (1 - y/H);
    },

    /* 51 — Glass Refraction */
    (x, y, t) => {
      return Math.atan2(
        Math.sin(0.02*x + 3 * noise2(0.01*x, 0.01*y + t)),
        Math.cos(0.02*y - 3 * noise2(0.01*y, 0.01*x - t))
      );
    },

    /* 52 — Ocean Current */
    (x, y, t) => {
      return 4 * fBm(0.002*x + 0.05*t, 0.002*y - 0.03*t, 5) + 0.4 * Math.sin(0.006*y + t);
    },

    /* 53 — Silk Bloom */
    (x, y, t) => {
      return Math.sin(0.003*x + t) * Math.cos(0.003*y - t) +
             2 * fBm(0.005*x, 0.005*y + t, 3);
    },

    /* 54 — Flux Rings */
    (x, y, t) => {
      const r  = Math.hypot(x - cx, y - cy);
      const th = Math.atan2(y - cy, x - cx);
      return Math.sin(0.04*r - t) * Math.cos(6*th + 0.5*t);
    },

    /* 55 — Industrial Flow */
    (x, y, t) => {
      return Math.atan2(
        Math.sin(0.02*x + 2 * noise2(0.01*x, 0.01*y + t)),
        Math.cos(0.02*y - 2 * noise2(0.01*y, 0.01*x - t))
      );
    },

    /* 56 — Star Nursery */
    (x, y, t) => {
      const r  = Math.hypot(x - cx, y - cy);
      const th = Math.atan2(y - cy, x - cx);
      return 6 * fBm(0.002*x, 0.002*y + 0.04*t, 5) + Math.sin(0.02*r + th - t);
    },

    /* 57 — Wave Lattice */
    (x, y, t) => {
      return Math.sin(0.01*x + t) + Math.cos(0.01*y - t) + Math.sin(0.01*(x - y));
    },

    /* 58 — Moiré Pulse */
    (x, y, t) => {
      return Math.sin(0.03*x + t) + Math.sin(0.031*y - 0.8*t);
    },

    /* 59 — Orbital Current */
    (x, y, t) => {
      const dx = x - cx, dy = y - cy;
      const r  = Math.sqrt(dx*dx + dy*dy);
      return Math.atan2(dy, dx) +
             0.6 * Math.sin(0.025*r - t) +
             0.25 * noise2(0.006*x, 0.006*y + 0.1*t);
    },

    /* 60 — Phantom Field */
    (x, y, t) => {
      const w = warp(0.003*x, 0.003*y, 0.15*t, 4);
      return 7 * fBm(w.x, w.y, 6) + Math.atan2(y - cy, x - cx) * 0.2;
    }
  ];

  /* ══════════════════════════════════════════════
     COLOUR PALETTE ENGINE
  ══════════════════════════════════════════════ */

  /**
   * Maps a normalised value [0,1] to an RGBA string.
   * Palettes cycle through rich cybernetic gradients.
   */
  function valueToColor(v, alpha) {
    // Wrap to [0, 1]
    v = ((v % 1) + 1) % 1;
    const t6 = v * 6;
    const seg = Math.floor(t6);
    const f   = t6 - seg;

    let r, g, b;
    // Cyan → Violet → Gold → Red → Cyan cybernetic cycle
    switch (seg % 6) {
      case 0: r = 0;   g = f;   b = 1;   break; // cyan phase
      case 1: r = 0;   g = 1;   b = 1-f; break;
      case 2: r = f;   g = 1;   b = 0;   break; // gold phase
      case 3: r = 1;   g = 1-f; b = 0;   break;
      case 4: r = 1;   g = 0;   b = f;   break; // violet/red phase
      case 5: r = 1-f; g = 0;   b = 1;   break;
    }

    return `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${alpha})`;
  }

  /* ══════════════════════════════════════════════
     PARTICLE SYSTEM
  ══════════════════════════════════════════════ */

  class Particle {
    constructor() { this.reset(true); }

    reset(random = false) {
      this.x    = random ? Math.random() * W : cx + (Math.random()-0.5) * W * 0.2;
      this.y    = random ? Math.random() * H : cy + (Math.random()-0.5) * H * 0.2;
      this.vx   = 0;
      this.vy   = 0;
      this.life = Math.random() * 200 + 60;
      this.age  = 0;
      this.speed = 1.2 + Math.random() * 1.8;
      this.trail = []; // {x, y}
      this.hueOffset = Math.random();
    }

    update(formula, speed, scale, t) {
      const angle = formula(this.x, this.y, t, scale);

      // Smooth velocity
      this.vx = this.vx * 0.85 + Math.cos(angle) * this.speed * speed * 0.15;
      this.vy = this.vy * 0.85 + Math.sin(angle) * this.speed * speed * 0.15;

      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 28) this.trail.shift();

      this.x += this.vx;
      this.y += this.vy;
      this.age++;

      // Reset if out of bounds or too old
      if (this.age > this.life || this.x < -10 || this.x > W+10 ||
          this.y < -10 || this.y > H+10) {
        this.reset();
      }
    }

    draw(ctx, t) {
      if (this.trail.length < 2) return;
      const lifeRatio = Math.min(this.age / this.life, 1);
      const alpha     = (1 - lifeRatio) * 0.72;
      const hue       = ((this.hueOffset + this.age * 0.003) % 1);

      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);

      for (let i = 1; i < this.trail.length; i++) {
        const a = (i / this.trail.length) * alpha;
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }

      ctx.strokeStyle = valueToColor(hue, alpha);
      ctx.lineWidth   = 0.9 + lifeRatio * 0.4;
      ctx.lineCap     = 'round';
      ctx.stroke();

      // Bright head dot
      const head = this.trail[this.trail.length - 1];
      ctx.beginPath();
      ctx.arc(head.x, head.y, 1.2, 0, Math.PI*2);
      ctx.fillStyle = valueToColor(hue, alpha * 1.5);
      ctx.fill();
    }
  }

  /* ══════════════════════════════════════════════
     INIT & RESIZE
  ══════════════════════════════════════════════ */

  function init(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Build particle pool
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cx = W * 0.5;
    cy = H * 0.5;
  }

  /* ══════════════════════════════════════════════
     RENDER LOOP
  ══════════════════════════════════════════════ */

  function render(timestamp) {
    animId = requestAnimationFrame(render);

    t += 0.008 * params.speed;

    const formula = FORMULAS[params.presetIndex];

    // Trail fade (not full clear — creates motion blur)
    ctx.fillStyle = 'rgba(0, 0, 8, 0.18)';
    ctx.fillRect(0, 0, W, H);

    // Update & draw all particles
    let outSum = 0, cwSum = 0;
    particles.forEach(p => {
      p.update(formula, params.speed, params.scale, t);
      p.draw(ctx, t);

      // Measure outward flow
      const dx = p.x - cx, dy = p.y - cy;
      outSum += p.vx * dx + p.vy * dy;  // dot(v, radial)
      cwSum  += p.vx * dy - p.vy * dx;  // cross (cw positive)
    });

    // Compute metrics for SyncController
    const n = particles.length;
    metrics.outwardFlow = outSum / (n * W * 0.01);
    metrics.clockwise   = cwSum > 0;
    metrics.frequency   = Math.abs(t % (2*Math.PI) - Math.PI) / Math.PI; // 0→1 pulse
  }

  /* ══════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════ */

  function start() {
    if (!animId) render(0);
  }

  function stop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function setPreset(index) {
    params.presetIndex = Math.max(0, Math.min(59, index));
  }

  function setParams(p) {
    Object.assign(params, p);
  }

  function getMetrics() { return metrics; }

  function getPresetNames() {
    return [
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
      'Star Nursery','Wave Lattice','Moiré Pulse','Orbital Current','Phantom Field'
    ];
  }

  return { init, start, stop, setPreset, setParams, getMetrics, getPresetNames };

})();
