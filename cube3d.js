/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — cube3d.js
 *
 *  Three.js 3D Xhaos Cube System
 *  · GLSL ShaderMaterial — 60 formula modes on cube faces
 *  · InstancedMesh — internal particle constellation
 *  · EffectComposer — Bloom · Chromatic Aberration · Film Grain
 *  · Voronoi-style Shatter with physics drift
 *  · POV Mode — first-person interior camera
 *  · Inversion Sync interface for SyncController
 *  · Touch / Mouse interaction (drag, pinch-zoom, flick)
 *
 *  Architecture: IIFE Module Pattern
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.Cube3D = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PRIVATE STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  let renderer      = null;
  let scene         = null;
  let camera        = null;
  let composer      = null;
  let bloomPass     = null;
  let chromaPass    = null;
  let grainPass     = null;

  let cubeGroup     = null;   // parent group for main cube + edges
  let mainMesh      = null;   // the ShaderMaterial cube
  let edgeMesh      = null;   // wireframe accent lines
  let instanceMesh  = null;   // internal constellation particles
  let shardGroup    = null;   // shatter shards parent

  let animId        = null;
  let clock         = null;

  /* ── Engine State Flags ── */
  let isShattered    = false;
  let shatterTimer   = 0;
  let shatterCooldown = 0;    // frames
  let isPOV          = false;
  let isDragging     = false;

  /* ── Interaction ── */
  let prevMouse    = { x: 0, y: 0 };
  let flickVel     = { x: 0, y: 0 };
  let autoRotVel   = { x: 0.0012, y: 0.003 };  // base auto-rotation speeds

  /* ── Sync data from SyncController ── */
  let syncData = {
    rotationDir: 1,       // +1 or -1
    scaleMult:   1.0,     // [0.4 .. 1.6]
    energy:      0.0      // [0 .. 1]
  };

  /* ── Engine Parameters ── */
  let params = {
    speed:        1.0,
    scale:        1.0,
    chaos:        0.5,
    bloom:        1.2,
    rotation:     0.3,
    presetIndex:  0
  };

  /* ── Internal particle orbital data ── */
  const INSTANCE_COUNT  = 500;
  const instanceData    = [];   // {angle, radius, speed, axis, phase}


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — GLSL VERTEX SHADER
     Shared by all face materials
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const VERT_SHADER = /* glsl */`
    precision highp float;

    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vWorldPos;
    varying float vDepth;

    void main() {
      vUv      = uv;
      vNormal  = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vDepth     = -mvPos.z;

      gl_Position = projectionMatrix * mvPos;
    }
  `;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — GLSL FRAGMENT SHADER
     60-mode formula dispatcher + colour pipeline
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const FRAG_SHADER = /* glsl */`
    precision highp float;

    /* ── Uniforms ── */
    uniform float uTime;
    uniform float uScale;
    uniform float uChaos;
    uniform int   uMode;
    uniform float uEnergy;    /* from SyncController [0..1] */
    uniform float uPalette;   /* [0..4] colour set index    */

    /* ── Varyings ── */
    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vWorldPos;
    varying float vDepth;

    /* ══════════════════════════════════════════
       MATH UTILITIES
    ══════════════════════════════════════════ */
    #define PI  3.14159265358979323846
    #define TAU 6.28318530717958647692

    /* Hash function — deterministic pseudo-random */
    float hash(vec2 p) {
      p = fract(p * vec2(127.1, 311.7));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    /* Value noise — smooth bilinear */
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f); /* smoothstep */

      float a = hash(i + vec2(0.0, 0.0));
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, u.x),
                 mix(c, d, u.x), u.y) * 2.0 - 1.0;
    }

    /* fBm — Fractional Brownian Motion (max 8 octaves) */
    float fBm(vec2 p, int oct) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    /* Turbulence — absolute-value fBm */
    float turb(vec2 p, int oct) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        v += a * abs(noise(p));
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    /* Domain Warp — iterative noise offset */
    vec2 warp(vec2 p, float t, int iters) {
      for (int i = 0; i < 6; i++) {
        if (i >= iters) break;
        float s  = 1.0 / float(i + 1);
        float nx = noise(p + vec2(0.3 * t + float(i) * 3.7,
                                  1.7   + float(i) * 2.1));
        float ny = noise(p + vec2(3.1 + 0.2 * t + float(i) * 1.9,
                                  2.3   + float(i) * 4.3));
        p += s * 0.8 * vec2(nx, ny);
      }
      return p;
    }

    /* Ridge noise */
    float ridge(vec2 p, int oct) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        float n = 1.0 - abs(noise(p));
        v += a * n * n;
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    /* ══════════════════════════════════════════
       COLOUR SYSTEM — 5 Cybernetic Palettes
    ══════════════════════════════════════════ */
    vec3 palette(float t, int idx) {
      t = fract(t * 0.5 + 0.5);

      /* Palette 0 — Cyber Neon (default) */
      if (idx == 0) {
        vec3 a = vec3(0.0,  0.940, 1.0  ); /* cyan   */
        vec3 b = vec3(0.545,0.0,   1.0  ); /* violet */
        vec3 c = vec3(1.0,  0.843, 0.0  ); /* gold   */
        vec3 d = vec3(1.0,  0.133, 0.267); /* red    */
        if (t < 0.25) return mix(a, b, t / 0.25);
        if (t < 0.50) return mix(b, c, (t-0.25)/0.25);
        if (t < 0.75) return mix(c, d, (t-0.50)/0.25);
        return mix(d, a, (t-0.75)/0.25);
      }

      /* Palette 1 — Ice Storm */
      if (idx == 1) {
        vec3 a = vec3(0.0,  0.784, 1.0  );
        vec3 b = vec3(0.196,0.392, 1.0  );
        vec3 c = vec3(0.0,  1.0,   0.784);
        vec3 d = vec3(0.784,0.941, 1.0  );
        if (t < 0.25) return mix(a, b, t / 0.25);
        if (t < 0.50) return mix(b, c, (t-0.25)/0.25);
        if (t < 0.75) return mix(c, d, (t-0.50)/0.25);
        return mix(d, a, (t-0.75)/0.25);
      }

      /* Palette 2 — Solar Flare */
      if (idx == 2) {
        vec3 a = vec3(1.0,  0.392, 0.0  );
        vec3 b = vec3(1.0,  0.784, 0.0  );
        vec3 c = vec3(1.0,  0.196, 0.196);
        vec3 d = vec3(0.784,0.0,   0.392);
        if (t < 0.25) return mix(a, b, t / 0.25);
        if (t < 0.50) return mix(b, c, (t-0.25)/0.25);
        if (t < 0.75) return mix(c, d, (t-0.50)/0.25);
        return mix(d, a, (t-0.75)/0.25);
      }

      /* Palette 3 — Deep Void */
      if (idx == 3) {
        vec3 a = vec3(0.314, 0.0,   1.0  );
        vec3 b = vec3(0.0,   0.314, 1.0  );
        vec3 c = vec3(1.0,   0.0,   0.784);
        vec3 d = vec3(0.0,   0.784, 0.588);
        if (t < 0.25) return mix(a, b, t / 0.25);
        if (t < 0.50) return mix(b, c, (t-0.25)/0.25);
        if (t < 0.75) return mix(c, d, (t-0.50)/0.25);
        return mix(d, a, (t-0.75)/0.25);
      }

      /* Palette 4 — Toxic Grid */
      vec3 a = vec3(0.0,  1.0,   0.392);
      vec3 b = vec3(0.392,1.0,   0.0  );
      vec3 c = vec3(0.0,  0.784, 0.314);
      vec3 d = vec3(0.784,1.0,   0.0  );
      if (t < 0.25) return mix(a, b, t / 0.25);
      if (t < 0.50) return mix(b, c, (t-0.25)/0.25);
      if (t < 0.75) return mix(c, d, (t-0.50)/0.25);
      return mix(d, a, (t-0.75)/0.25);
    }

    /* ══════════════════════════════════════════
       60-MODE FORMULA DISPATCHER
       Returns a raw float value.
       Normalised later in main().
    ══════════════════════════════════════════ */
    float formula(vec2 uv, float t, float s) {
      float x  = uv.x * s;
      float y  = uv.y * s;
      vec2  p  = vec2(x, y);
      float cx = 0.5 * s;   /* uv centre */
      float cy = 0.5 * s;

      /* 01 — Fiber Optics */
      if (uMode == 0) {
        return (sin(0.3*x + t) + cos(0.3*y + t)) * 2.2
               + fBm(0.3 * p, 4) * 3.0;
      }

      /* 02 — Digital Silk */
      if (uMode == 1) {
        vec2 w = warp(0.4 * p, t, 2);
        return sin(w.x + 0.7*t) * cos(w.y - 0.5*t) * 4.0;
      }

      /* 03 — Wave Turbulence */
      if (uMode == 2) {
        float tb = turb(0.2 * p, 5);
        return (sin(0.3*(x+y) + t + tb*4.0)
               - cos(0.3*(x-y) - t)) * 2.5;
      }

      /* 04 — Dynamic Vortex */
      if (uMode == 3) {
        float r    = length(uv - 0.5) * s;
        float pull = sin(0.8*r - t) * 0.5;
        return atan(uv.y-0.5, uv.x-0.5) + 0.6*t + pull;
      }

      /* 05 — Neural Grid */
      if (uMode == 4) {
        float gx   = floor(x / 4.0);
        float gy   = floor(y / 4.0);
        float cell = noise(vec2(0.5*gx, 0.5*gy + 0.3*t));
        return (gx + gy)*0.5*cell + 0.1*t + sin(cell*TAU)*2.0;
      }

      /* 06 — Data Blocks */
      if (uMode == 5) {
        float bx = round(x / 7.0);
        float by = round(y / 7.0);
        float nn = noise(vec2(bx + 0.2*t, by));
        return (bx+by)*0.22 + sin(t + nn*8.0) + cos(nn*PI)*2.0;
      }

      /* 07 — Sand Waves */
      if (uMode == 6) {
        float nn = fBm(0.3*p + vec2(0.2*t, 0.0), 6);
        return sin(0.5*(x+y) + t + nn*5.0)
             + cos(0.5*(x-y) - t + nn*3.0);
      }

      /* 08 — Galactic River */
      if (uMode == 7) {
        vec2  w  = warp(0.2 * p, t, 4);
        float tb = turb(0.1 * p, 3);
        return sin(w.x + t) * cos(w.y + t) * 5.0 + tb * 3.0;
      }

      /* 09 — Radial Drift */
      if (uMode == 8) {
        float r = length(uv - 0.5) * s;
        return sin(0.02*r + t)*2.2 + 0.35*cos(0.4*y - 0.5*t);
      }

      /* 10 — Geometric Repeat */
      if (uMode == 9) {
        float nn = noise(0.5*p + vec2(0.0, 0.1*t));
        return sin(0.9*x + sin(0.6*y + t))
             + cos(0.9*y + cos(0.6*x + t))
             + nn * 2.0;
      }

      /* 11 — Magnetic Field */
      if (uMode == 10) {
        vec2 poles[4];
        poles[0] = vec2(0.25, 0.5);
        poles[1] = vec2(0.75, 0.5);
        poles[2] = vec2(0.5,  0.25);
        poles[3] = vec2(0.5,  0.75);
        float signs[4];
        signs[0] =  1.0; signs[1] = -1.0;
        signs[2] =  1.0; signs[3] = -1.0;
        float sum = 0.0;
        for (int i = 0; i < 4; i++)
          sum += atan(uv.y - poles[i].y, uv.x - poles[i].x) * signs[i];
        return sum / 4.0 + 0.3*sin(t);
      }

      /* 12 — Ordered Chaos */
      if (uMode == 11) {
        float nn = turb(0.3*p + vec2(0.1*t, 0.0), 6);
        return sin(0.3*x)*cos(0.3*y)*TAU + sin(t) + nn*4.0;
      }

      /* 13 — Fractal Spiral */
      if (uMode == 12) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        return log(r + 1.0)*0.5*s + th + 0.4*t
               + fBm(vec2(2.0*th, 0.005*r), 4)*3.0;
      }

      /* 14 — Electric Storm */
      if (uMode == 13) {
        float n1   = noise(0.5*p + vec2(t, 0.0));
        float n2   = noise(p - vec2(0.0, 0.5*t));
        float bolt = sin(n1*20.0) * cos(n2*15.0);
        return bolt*3.0 + atan(uv.y-0.5, uv.x-0.5)*0.2;
      }

      /* 15 — DNA Helix */
      if (uMode == 14) {
        float wave = sin(y + 2.0*t) * 0.15;
        float col  = (uv.x - 0.5 - wave) * 0.05;
        return atan(sin(2.0*y + t), col) + cos(0.8*y + t)*2.0;
      }

      /* 16 — Coral Growth */
      if (uMode == 15) {
        vec2 w = warp(0.3*p, 0.3*t, 6);
        return fBm(w, 6)*8.0 + sin(0.5*t)*2.0;
      }

      /* 17 — Quantum Field */
      if (uMode == 16) {
        float n1   = noise(0.8*p + vec2(0.3*t, 0.0));
        float n2   = noise(0.4*p + vec2(0.0, 0.2*t));
        float intf = sin(n1*12.0 + n2*8.0 + t);
        float wave = sin(0.6*x) * cos(0.6*y);
        return intf*2.0 + wave*3.0;
      }

      /* 18 — Topographic Map */
      if (uMode == 17) {
        float eps  = 0.01;
        float h00  = fBm(0.2*p + vec2(0.05*t, 0.0), 8);
        float h10  = fBm(0.2*(p+vec2(eps,0.0)) + vec2(0.05*t,0.0), 8);
        float h01  = fBm(0.2*(p+vec2(0.0,eps)) + vec2(0.05*t,0.0), 8);
        float cnt  = sin(30.0 * h00) * 0.5;
        return atan(h01-h00, h10-h00) + cnt;
      }

      /* 19 — Mirror Flow */
      if (uMode == 18) {
        vec2 mp = abs(uv - 0.5) * s;
        return fBm(0.5*mp + vec2(0.2*t, 0.0), 4)*6.0
               + 0.8*sin(mp.x - 0.8*mp.y + t);
      }

      /* 20 — Smoke Simulation */
      if (uMode == 19) {
        vec2 w1   = warp(0.2*p, 0.5*t, 3);
        vec2 w2   = warp(w1, 0.3*t, 2);
        float rise = -0.5 + (1.0 - uv.y)*0.8;
        return fBm(w2, 5)*6.0 + rise*2.0 + 1.5*PI;
      }

      /* 21 — Crystal Lattice */
      if (uMode == 20) {
        float ax = sin(x*4.0 + t)*cos(y*3.0);
        float ay = cos(x*3.0 - t)*sin(y*4.0);
        float nn = noise(p + vec2(0.1*t, 0.0))*2.0;
        return atan(ay + nn, ax + nn);
      }

      /* 22 — Nebula */
      if (uMode == 21) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        vec2  w  = warp(0.1*p, 0.2*t, 5);
        return fBm(vec2(3.0*th + 0.1*t, 0.5*r), 6)*5.0
               + sin(3.0*(w.x + w.y))*2.0 + 0.3*th;
      }

      /* 23 — Woven Fabric */
      if (uMode == 22) {
        float wx2 = sin(2.0*x + t)*2.0;
        float wy2 = cos(2.0*y - 0.7*t)*2.0;
        float nn  = noise(0.3*p + vec2(0.0, 0.1*t));
        return atan(sin(y + wx2), cos(x + wy2)) + nn*2.0;
      }

      /* 24 — Black Hole */
      if (uMode == 23) {
        float r    = length(uv - 0.5) * s;
        float th   = atan(uv.y - 0.5, uv.x - 0.5);
        float pull = 1.0 / (0.03*r + 0.1);
        float wp   = sin(0.1*r - 2.0*t)*0.5;
        return th + pull*2.0 + 0.3*t + wp;
      }

      /* 25 — Aurora Borealis */
      if (uMode == 24) {
        float fy   = uv.y;
        float curt = sin(0.5*x + t + sin(8.0*fy + t)*2.0)*3.0;
        float drft = fBm(0.1*p + vec2(0.1*t, 0.0), 5);
        return curt + drft*4.0 - PI/2.0;
      }

      /* 26 — Voronoi Flow */
      if (uMode == 25) {
        float minD = 99.0;
        vec2  np   = vec2(0.0);
        for (int i = 0; i < 8; i++) {
          float a  = TAU * float(i) / 8.0 + t * 0.3;
          vec2  sd = vec2(0.5 + 0.4*cos(a), 0.5 + 0.4*sin(a));
          float d  = length(uv - sd);
          if (d < minD) { minD = d; np = sd; }
        }
        return atan(0.5 - np.y, 0.5 - np.x) + 0.3*sin(0.5*t);
      }

      /* 27 — Interference Rings */
      if (uMode == 26) {
        vec2 srcs[3];
        srcs[0] = vec2(0.3, 0.5);
        srcs[1] = vec2(0.7, 0.5);
        srcs[2] = vec2(0.5, 0.3);
        float sum = 0.0;
        for (int i = 0; i < 3; i++) {
          float d = length(uv - srcs[i]) * s;
          sum += sin(0.2*d - t*(1.0 + 0.3*float(i)));
        }
        return sum;
      }

      /* 28 — Tornado */
      if (uMode == 27) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        float yN = uv.y;
        float w2 = (1.0 - yN)*0.3 + 0.05;
        float sp = 3.0 / (r/s + 0.1) * w2;
        float tb = turb(vec2(2.0*th, 5.0*yN + t), 4);
        return th + sp + 0.5*t + tb*2.0;
      }

      /* 29 — Neural Network */
      if (uMode == 28) {
        float sum = 0.0;
        for (int i = 0; i < 6; i++) {
          float a = TAU * float(i) / 6.0 + 0.4*t;
          vec2  n = vec2(0.5 + 0.35*cos(a), 0.5 + 0.35*sin(a));
          float d = length(uv - n) * s;
          sum += sin(0.1*d + t + float(i)) * exp(-0.05*d);
        }
        return sum * 3.0;
      }

      /* 30 — Galaxy Arm */
      if (uMode == 29) {
        float r      = length(uv - 0.5) * s;
        float th     = atan(uv.y - 0.5, uv.x - 0.5);
        float spiral = th - 0.6*log(r + 1.0);
        float arm    = sin(spiral*2.0 + 0.3*t)*0.5;
        float fb     = fBm(vec2(th*s, 0.003*r + 0.05*t), 4);
        return th + arm + fb*2.0 + PI/2.0;
      }

      /* 31 — Liquid Marble */
      if (uMode == 30) {
        return sin(6.0 * fBm(0.4*p + vec2(t, -t), 4))
             + cos(4.0 * fBm(0.6*p + vec2(0.0, t), 3));
      }

      /* 32 — Solar Flare */
      if (uMode == 31) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        return th + 4.0*sin(0.03*r - 2.0*t)
               + 2.0*noise(p + vec2(t, 0.0));
      }

      /* 33 — Frozen Veins */
      if (uMode == 32) {
        float eps = 0.01;
        float nn  = noise(p);
        float dx2 = noise(p + vec2(eps, 0.0)) - nn;
        float dy2 = noise(p + vec2(0.0, eps)) - nn;
        return atan(dy2, dx2) + 0.4*sin(18.0*nn);
      }

      /* 34 — Velvet Fold */
      if (uMode == 33) {
        float fold = sin(0.4*x + 3.0*fBm(vec2(0.3*y, 0.3*x + t), 4));
        return fold * cos(0.4*y - t);
      }

      /* 35 — Band Current */
      if (uMode == 34) {
        return sin(1.2*x + t)
             + 0.7*cos(1.8*y - 0.6*t)
             + 0.4*sin(x - y);
      }

      /* 36 — Sonic Ripples */
      if (uMode == 35) {
        float r = length(uv - 0.5) * s;
        return sin(0.03*r - 3.0*t) + 0.5*sin(0.05*r + 2.0*t);
      }

      /* 37 — Plasma Mesh */
      if (uMode == 36) {
        return sin(x + t) + sin(y - t) + sin(x + y + 0.5*t);
      }

      /* 38 — Marble Vein */
      if (uMode == 37) {
        return sin(x + 5.0*fBm(0.6*p + vec2(0.0, t), 5));
      }

      /* 39 — Hyper Tunnel */
      if (uMode == 38) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        return th + 8.0/(r + 1.0) + sin(0.05*r - 2.0*t);
      }

      /* 40 — Biofilm Drift */
      if (uMode == 39) {
        vec2 w = warp(0.4*p, t, 3);
        return fBm(w, 5)*6.0 + 0.8*sin(0.2*t);
      }

      /* 41 — Grid Stream */
      if (uMode == 40) {
        float gx = floor(x / 6.0);
        float gy = floor(y / 6.0);
        return noise(vec2(0.4*gx + 0.1*t, 0.4*gy))*TAU
               + 0.3*sin(gx + gy + t);
      }

      /* 42 — Cloud Chamber */
      if (uMode == 41) {
        float eps = 0.01;
        float fb  = fBm(0.3*p + vec2(0.05*t, 0.0), 6);
        float gx2 = fBm(0.3*(p + vec2(eps, 0.0)) + vec2(0.05*t,0.0), 6) - fb;
        float gy2 = fBm(0.3*(p + vec2(0.0, eps)) + vec2(0.05*t,0.0), 6) - fb;
        return atan(gy2, gx2) + 0.6*sin(x + y + t);
      }

      /* 43 — Ink Diffusion */
      if (uMode == 42) {
        vec2 w = warp(0.2*p, 0.2*t, 4);
        return fBm(w, 6) + 0.3*sin(t);
      }

      /* 44 — Luminous Web */
      if (uMode == 43) {
        float sum = 0.0;
        for (int i = 0; i < 8; i++) {
          float a  = TAU * float(i) / 8.0 + 0.1*t;
          vec2  an = vec2(0.5 + 0.4*cos(a), 0.5 + 0.4*sin(a));
          float d  = length(uv - an);
          sum += atan(uv.y - an.y, uv.x - an.x) / (d*10.0 + 1.0);
        }
        return sum;
      }

      /* 45 — Harmonic Tiles */
      if (uMode == 44) {
        float fx = x / 8.0 + t;
        float fy = y / 8.0 - t;
        return sin(TAU * fract(fx)) + cos(TAU * fract(fy));
      }

      /* 46 — Spiral Garden */
      if (uMode == 45) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        return th + 0.004*r + sin(5.0*th - t);
      }

      /* 47 — Mercury Flow */
      if (uMode == 46) {
        float n1 = noise(0.6*p + vec2(t, 0.0));
        float n2 = noise(0.6*p.yx - vec2(0.0, t));
        return sin(0.5*x + 4.0*n1) + cos(0.5*y - 4.0*n2);
      }

      /* 48 — Prism Wave */
      if (uMode == 47) {
        return sin(0.8*x + t)*sin(0.8*y - t) + cos(1.2*(x - y));
      }

      /* 49 — Orbit Net */
      if (uMode == 48) {
        float sum = 0.0;
        for (int i = 0; i < 5; i++) {
          float a = TAU * float(i) / 5.0 + t*0.22;
          vec2  o = vec2(0.5 + 0.3*cos(a), 0.5 + 0.3*sin(a));
          float d = length(uv - o) * s;
          sum += atan(uv.y - o.y, uv.x - o.x) + 0.2*sin(0.02*d - t);
        }
        return sum;
      }

      /* 50 — Ember Drift */
      if (uMode == 49) {
        return fBm(0.4*p + vec2(0.1*t, 0.0), 4)*5.0
               + 0.7*(1.0 - uv.y);
      }

      /* 51 — Glass Refraction */
      if (uMode == 50) {
        float n1 = noise(p + vec2(0.0, t));
        float n2 = noise(p.yx - vec2(0.0, t));
        return atan(sin(2.0*x + 3.0*n1), cos(2.0*y - 3.0*n2));
      }

      /* 52 — Ocean Current */
      if (uMode == 51) {
        return fBm(0.2*p + vec2(0.05*t, -0.03*t), 5)*4.0
               + 0.4*sin(0.6*y + t);
      }

      /* 53 — Silk Bloom */
      if (uMode == 52) {
        return sin(0.3*x + t)*cos(0.3*y - t)
               + fBm(0.5*p + vec2(0.0, t), 3)*2.0;
      }

      /* 54 — Flux Rings */
      if (uMode == 53) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        return sin(0.04*r - t) * cos(6.0*th + 0.5*t);
      }

      /* 55 — Industrial Flow */
      if (uMode == 54) {
        float n1 = noise(p + vec2(0.0, t));
        float n2 = noise(p.yx - vec2(0.0, t));
        return atan(sin(2.0*x + 2.0*n1), cos(2.0*y - 2.0*n2));
      }

      /* 56 — Star Nursery */
      if (uMode == 55) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        return fBm(0.2*p + vec2(0.0, 0.04*t), 5)*6.0
               + sin(0.02*r + th - t);
      }

      /* 57 — Wave Lattice */
      if (uMode == 56) {
        return sin(x + t) + cos(y - t) + sin(x - y);
      }

      /* 58 — Moiré Pulse */
      if (uMode == 57) {
        return sin(3.0*x + t) + sin(3.1*y - 0.8*t);
      }

      /* 59 — Orbital Current */
      if (uMode == 58) {
        float r  = length(uv - 0.5) * s;
        float th = atan(uv.y - 0.5, uv.x - 0.5);
        return th + 0.6*sin(0.025*r - t)
               + 0.25*noise(p + vec2(0.0, 0.1*t));
      }

      /* 60 — Phantom Field (default) */
      vec2 w = warp(0.3*p, 0.15*t, 4);
      return fBm(w, 6)*7.0 + atan(uv.y - 0.5, uv.x - 0.5)*0.2;
    }

    /* ══════════════════════════════════════════
       MAIN
    ══════════════════════════════════════════ */
    void main() {
      float t = uTime;
      float s = uScale * 10.0;

      /* Raw formula value */
      float f = formula(vUv, t, s);

      /* Normalise to [0,1] for colour lookup */
      float v = f / (PI * 2.0);

      /* Colour from active palette */
      int palIdx = int(clamp(uPalette, 0.0, 4.0));
      vec3 col   = palette(v, palIdx);

      /* ── Edge Fresnel Rim ── */
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal),
                                        vec3(0.0, 0.0, 1.0))), 2.2);
      col += vec3(0.0, 0.9, 1.0) * fresnel * 0.55;

      /* ── Scan-Line Overlay ── */
      float scan = 0.5 + 0.5 * sin(vUv.y * 380.0 + t * 2.8);
      col *= 0.93 + 0.07 * scan;

      /* ── Hex Grid Overlay ── */
      vec2  gridUV = vUv * 22.0;
      vec2  grid   = abs(fract(gridUV) - 0.5);
      float gLine  = 1.0 - smoothstep(0.0, 0.045, min(grid.x, grid.y));
      col = mix(col, col * 1.7 + vec3(0.0, 0.5, 0.8)*0.25,
                gLine * 0.28);

      /* ── Energy-Reactive Pulse ── */
      float pulse = 1.0 + uEnergy * 0.35 * sin(t * 8.0 + vUv.x * 6.0);
      col *= pulse;

      /* ── Chaos Speckle ── */
      float speck = noise(vUv * 90.0 + vec2(t * 0.7, t * 0.3));
      col += speck * uChaos * 0.07;

      /* ── Depth Fog (subtle) ── */
      float fog = 1.0 - smoothstep(3.0, 12.0, vDepth);
      col *= fog;

      /* ── Clamp & Output ── */
      col = clamp(col, 0.0, 3.0); /* allow HDR for bloom */
      gl_FragColor = vec4(col, 0.96);
    }
  `;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — POST-PROCESSING SHADERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* ── Chromatic Aberration ── */
  const ChromaShader = {
    uniforms: {
      tDiffuse: { value: null },
      uOffset:  { value: 0.003 },
      uTime:    { value: 0.0 }
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix
                      * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float     uOffset;
      uniform float     uTime;
      varying vec2      vUv;

      void main() {
        /* Offset increases toward screen edges */
        vec2  center   = vUv - 0.5;
        float edgeDist = length(center);
        float offset   = uOffset * (0.5 + edgeDist * 1.5);

        /* Slight animated drift */
        float drift = sin(uTime * 0.4) * 0.0003;

        float r = texture2D(tDiffuse,
                    vUv + vec2( offset + drift,  0.0)).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse,
                    vUv + vec2(-offset - drift,  0.0)).b;

        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `
  };

  /* ── Film Grain + Vignette ── */
  const GrainShader = {
    uniforms: {
      tDiffuse:   { value: null },
      uTime:      { value: 0.0 },
      uGrain:     { value: 0.038 },
      uVignette:  { value: 0.45 }
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix
                      * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float     uTime;
      uniform float     uGrain;
      uniform float     uVignette;
      varying vec2      vUv;

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233)))
                     * 43758.5453123);
      }

      void main() {
        vec4 col = texture2D(tDiffuse, vUv);

        /* Animated film grain */
        float grain = rand(vUv + fract(uTime * 0.017)) * 2.0 - 1.0;
        col.rgb += grain * uGrain;

        /* Radial vignette */
        vec2  center = vUv - 0.5;
        float vig    = 1.0 - dot(center, center) * uVignette * 3.2;
        col.rgb     *= clamp(vig, 0.0, 1.0);

        gl_FragColor = col;
      }
    `
  };


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — MATERIAL FACTORY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * createFaceMaterial — builds a ShaderMaterial
   * with all required uniforms pre-populated.
   */
  function createFaceMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader:   VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      uniforms: {
        uTime:    { value: 0.0 },
        uScale:   { value: params.scale },
        uChaos:   { value: params.chaos },
        uMode:    { value: params.presetIndex },
        uEnergy:  { value: 0.0 },
        uPalette: { value: 0.0 }
      },
      transparent: true,
      side:        THREE.DoubleSide,
      /* Allow HDR values for bloom to pick up */
      toneMapped:  false
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — CUBE CONSTRUCTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildCube() {
    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    /* ── Main Cube (high-poly for smooth shading) ── */
    const geo  = new THREE.BoxGeometry(2, 2, 2, 48, 48, 48);
    const mat  = createFaceMaterial();
    mainMesh   = new THREE.Mesh(geo, mat);
    mainMesh.castShadow    = false;
    mainMesh.receiveShadow = false;
    cubeGroup.add(mainMesh);

    /* ── Edge Accent Lines ── */
    const edgeGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(2.008, 2.008, 2.008)
    );
    const edgeMat = new THREE.LineBasicMaterial({
      color:       0x00f0ff,
      transparent: true,
      opacity:     0.50,
      linewidth:   1      /* WebGL limitation: always 1 on most GPUs */
    });
    edgeMesh = new THREE.LineSegments(edgeGeo, edgeMat);
    cubeGroup.add(edgeMesh);

    /* ── Corner Marker Spheres ── */
    const cornerGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const cornerMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8
    });

    const corners = [
      [-1,-1,-1],[-1,-1, 1],[-1, 1,-1],[-1, 1, 1],
      [ 1,-1,-1],[ 1,-1, 1],[ 1, 1,-1],[ 1, 1, 1]
    ];
    corners.forEach(c => {
      const mesh = new THREE.Mesh(cornerGeo, cornerMat);
      mesh.position.set(c[0], c[1], c[2]);
      cubeGroup.add(mesh);
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — INTERNAL PARTICLE CONSTELLATION
     InstancedMesh — single draw call for 500 nodes
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildInternalParticles() {
    const geo = new THREE.SphereGeometry(0.022, 7, 7);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });

    instanceMesh = new THREE.InstancedMesh(geo, mat, INSTANCE_COUNT);
    instanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instanceMesh.instanceColor  = new THREE.InstancedBufferAttribute(
      new Float32Array(INSTANCE_COUNT * 3), 3
    );

    const dummy   = new THREE.Object3D();
    const colorPalette = [
      new THREE.Color(0x00f0ff),   // cyan
      new THREE.Color(0x8b00ff),   // violet
      new THREE.Color(0xffd700),   // gold
      new THREE.Color(0x00ff88),   // green
      new THREE.Color(0xff2244)    // red
    ];

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      /* Orbital parameters */
      instanceData.push({
        angle:  Math.random() * Math.PI * 2,
        radius: 0.15 + Math.random() * 0.75,
        speed:  (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1),
        axis:   new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        phase:  Math.random() * Math.PI * 2,
        size:   0.5 + Math.random() * 1.0
      });

      /* Initial position */
      dummy.position.set(
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6
      );
      dummy.scale.setScalar(instanceData[i].size);
      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);

      /* Colour */
      const col = colorPalette[i % colorPalette.length];
      instanceMesh.instanceColor.setXYZ(i, col.r, col.g, col.b);
    }

    instanceMesh.instanceMatrix.needsUpdate = true;
    instanceMesh.instanceColor.needsUpdate  = true;
    scene.add(instanceMesh);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — POST-PROCESSING STACK
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildPostProcessing() {
    composer = new THREE.EffectComposer(renderer);

    /* Pass 1 — Standard scene render */
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    /* Pass 2 — Unreal Bloom */
    bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      params.bloom,   // strength
      0.60,           // radius
      0.22            // threshold (low = more elements glow)
    );
    composer.addPass(bloomPass);

    /* Pass 3 — Chromatic Aberration */
    chromaPass = new THREE.ShaderPass(ChromaShader);
    chromaPass.uniforms.uOffset.value = 0.0028;
    composer.addPass(chromaPass);

    /* Pass 4 — Film Grain + Vignette (renders to screen) */
    grainPass = new THREE.ShaderPass(GrainShader);
    grainPass.renderToScreen = true;
    composer.addPass(grainPass);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — VORONOI SHATTER SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * shatter — splits the cube into physics-driven shards.
   * Each shard keeps the same ShaderMaterial so
   * formula animation continues on all fragments.
   */
  function shatter() {
    if (isShattered || shatterCooldown > 0) return;

    isShattered      = true;
    shatterCooldown  = 180;   // ~3s at 60fps
    shatterTimer     = 0;

    /* Remove main cube from scene */
    scene.remove(cubeGroup);

    /* Create shard group */
    shardGroup = new THREE.Group();
    scene.add(shardGroup);

    const SHARD_COUNT = 32;

    for (let i = 0; i < SHARD_COUNT; i++) {
      /* Random asymmetric shard geometry */
      const w   = 0.25 + Math.random() * 0.65;
      const h   = 0.25 + Math.random() * 0.65;
      const d   = 0.25 + Math.random() * 0.65;
      const seg = 2 + Math.floor(Math.random() * 3);

      const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
      const mat = createFaceMaterial();
      /* Inherit current mode */
      mat.uniforms.uMode.value  = params.presetIndex;
      mat.uniforms.uScale.value = params.scale;
      mat.uniforms.uChaos.value = params.chaos;

      const mesh = new THREE.Mesh(geo, mat);

      /* Start position — slightly inside cube volume */
      mesh.position.set(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2
      );

      /* Initial random rotation */
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      /* Physics velocity — explode outward */
      const explosionStr = 0.04 + Math.random() * 0.06;
      mesh.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * explosionStr * 2,
        (Math.random() - 0.5) * explosionStr * 2,
        (Math.random() - 0.5) * explosionStr * 2
      );
      /* Ensure net outward direction */
      mesh.userData.vel.add(
        mesh.position.clone().normalize().multiplyScalar(explosionStr)
      );

      /* Angular velocity */
      mesh.userData.angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.06,
        (Math.random() - 0.5) * 0.06,
        (Math.random() - 0.5) * 0.06
      );

      /* Edge lines on shards */
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMt  = new THREE.LineBasicMaterial({
        color: 0x00f0ff, transparent: true, opacity: 0.6
      });
      mesh.add(new THREE.LineSegments(edgeGeo, edgeMt));

      shardGroup.add(mesh);
    }

    /* Auto-reassemble after 3.5 seconds */
    setTimeout(reassemble, 3500);
  }

  /**
   * reassemble — fade shards and rebuild the cube.
   */
  function reassemble() {
    if (!isShattered) return;

    /* Animate shards imploding back */
    if (shardGroup) {
      shardGroup.children.forEach(shard => {
        shard.userData.imploding = true;
        shard.userData.vel.set(0, 0, 0);
        shard.userData.angVel.multiplyScalar(0.3);
      });
    }

    /* After short delay, hard-reset */
    setTimeout(() => {
      if (shardGroup) {
        scene.remove(shardGroup);
        shardGroup.children.forEach(s => {
          s.geometry.dispose();
          s.material.dispose();
        });
        shardGroup = null;
      }

      isShattered = false;

      /* Rebuild clean cube */
      buildCube();

    }, 600);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — POV MODE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function enablePOV() {
    isPOV = true;

    /* Move camera inside the cube */
    camera.position.set(0, 0, 0);
    camera.fov = 110;
    camera.near = 0.01;
    camera.updateProjectionMatrix();

    /* Make cube faces render from inside (DoubleSide already set) */
    if (mainMesh) {
      mainMesh.material.side = THREE.BackSide;
    }
  }

  function disablePOV() {
    isPOV = false;

    camera.position.set(0, 0, 4.5);
    camera.fov  = 55;
    camera.near = 0.1;
    camera.updateProjectionMatrix();

    if (mainMesh) {
      mainMesh.material.side = THREE.DoubleSide;
    }
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — INTERNAL PARTICLE UPDATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function updateInternalParticles(elapsed) {
    if (!instanceMesh) return;

    const dummy = new THREE.Object3D();
    const quat  = new THREE.Quaternion();

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const d = instanceData[i];

      /* Advance orbital angle */
      d.angle += d.speed * 0.012 * params.speed;

      /* Position on arbitrary orbital plane */
      /* Use Rodrigues rotation around d.axis */
      const cosA  = Math.cos(d.angle);
      const sinA  = Math.sin(d.angle);
      const phase = d.phase;

      /* Parametric orbital ellipse on the axis plane */
      dummy.position.set(
        d.radius * (cosA * Math.sin(phase) + sinA * d.axis.z),
        d.radius * (cosA * Math.cos(phase) - sinA * d.axis.x),
        d.radius * (sinA * d.axis.y + Math.cos(d.angle + phase) * 0.3)
      );

      /* Clamp inside cube */
      dummy.position.clampScalar(-0.90, 0.90);

      /* Slight size pulse */
      const pulseSz = d.size * (0.8 + 0.2 * Math.sin(elapsed * 2.0 + i));
      dummy.scale.setScalar(pulseSz * 0.6);

      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);
    }

    instanceMesh.instanceMatrix.needsUpdate = true;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 11 — MAIN RENDER LOOP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function render() {
    animId = requestAnimationFrame(render);

    const delta   = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();
    const time    = elapsed * params.speed;

    /* ── Update Shatter Cooldown ── */
    if (shatterCooldown > 0) shatterCooldown--;

    /* ── Update Cube Face Shader Uniforms ── */
    if (mainMesh && mainMesh.material.uniforms) {
      const u          = mainMesh.material.uniforms;
      u.uTime.value    = time;
      u.uScale.value   = params.scale;
      u.uChaos.value   = params.chaos;
      u.uMode.value    = params.presetIndex;
      u.uEnergy.value  = syncData.energy;
    }

    /* ── Auto-Rotation (Inversion Sync Applied) ── */
    if (!isDragging && !isShattered && cubeGroup) {
      /* rotationDir from SyncController: +1 or -1 */
      cubeGroup.rotation.y +=
        autoRotVel.y * params.rotation * syncData.rotationDir;
      cubeGroup.rotation.x +=
        autoRotVel.x * params.rotation * syncData.rotationDir;
    }

    /* ── Scale Sync (Inversion: outward 2D → shrink 3D) ── */
    if (cubeGroup) {
      const targetScale = params.scale * syncData.scaleMult;
      /* Smooth lerp to target */
      cubeGroup.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.04
      );
    }

    /* ── Update Shard Physics ── */
    if (isShattered && shardGroup) {
      shatterTimer++;
      shardGroup.children.forEach(shard => {
        if (shard.userData.imploding) {
          /* Pull toward center */
          shard.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
          shard.rotation.x += shard.userData.angVel.x;
          shard.rotation.y += shard.userData.angVel.y;
          shard.rotation.z += shard.userData.angVel.z;
        } else {
          /* Explode outward with drag */
          shard.position.add(shard.userData.vel);
          shard.rotation.x += shard.userData.angVel.x;
          shard.rotation.y += shard.userData.angVel.y;
          shard.rotation.z += shard.userData.angVel.z;

          /* Drag */
          shard.userData.vel.multiplyScalar(0.965);
          shard.userData.angVel.multiplyScalar(0.975);

          /* Fade edge opacity */
          shard.children.forEach(child => {
            if (child.material) {
              child.material.opacity =
                Math.max(0, child.material.opacity - 0.006);
            }
          });
        }

        /* Update shader uniforms on shards too */
        if (shard.material && shard.material.uniforms) {
          shard.material.uniforms.uTime.value   = time;
          shard.material.uniforms.uEnergy.value = syncData.energy;
        }
      });
    }

    /* ── POV Camera Drift ── */
    if (isPOV) {
      camera.rotation.y = Math.sin(elapsed * 0.08) * 0.28;
      camera.rotation.x = Math.cos(elapsed * 0.06) * 0.14;
      camera.rotation.z = Math.sin(elapsed * 0.04) * 0.06;
    }

    /* ── Internal Particles ── */
    updateInternalParticles(elapsed);

    /* ── Post-Processing Uniform Updates ── */
    if (bloomPass)  bloomPass.strength = params.bloom;

    if (chromaPass) {
      chromaPass.uniforms.uTime.value   = elapsed;
      /* Chaos drives aberration amount */
      chromaPass.uniforms.uOffset.value =
        0.0018 + params.chaos * 0.004;
    }

    if (grainPass) {
      grainPass.uniforms.uTime.value    = elapsed;
      grainPass.uniforms.uGrain.value   = 0.025 + params.chaos * 0.03;
    }

    /* ── Edge Pulse ── */
    if (edgeMesh) {
      edgeMesh.material.opacity =
        0.35 + 0.25 * Math.sin(elapsed * 2.0) + syncData.energy * 0.3;
    }

    /* ── Render Frame ── */
    composer.render(delta);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 12 — INTERACTION SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function setupInteraction(el) {

    /* ── Mouse ── */
    el.addEventListener('mousedown', e => {
      isDragging = true;
      prevMouse  = { x: e.clientX, y: e.clientY };
      flickVel   = { x: 0, y: 0 };
    });

    el.addEventListener('mousemove', e => {
      if (!isDragging || !cubeGroup) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      cubeGroup.rotation.y += dx * 0.007;
      cubeGroup.rotation.x += dy * 0.007;

      flickVel  = { x: dx, y: dy };
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener('mouseup', () => {
      isDragging = false;
      const speed = Math.hypot(flickVel.x, flickVel.y);
      if (speed > 20) shatter();
    });

    el.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    /* ── Touch ── */
    let lastTouches  = null;
    let lastPinchDist = 0;

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      lastTouches = e.touches;

      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse  = { x: e.touches[0].clientX,
                       y: e.touches[0].clientY };
        flickVel   = { x: 0, y: 0 };
      }

      if (e.touches.length === 2) {
        isDragging   = false;
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: false });

    el.addEventListener('touchmove', e => {
      e.preventDefault();

      /* Single finger — rotate */
      if (e.touches.length === 1 && isDragging && cubeGroup) {
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;

        cubeGroup.rotation.y += dx * 0.007;
        cubeGroup.rotation.x += dy * 0.007;

        flickVel  = { x: dx, y: dy };
        prevMouse = { x: e.touches[0].clientX,
                      y: e.touches[0].clientY };
      }

      /* Two fingers — pinch zoom */
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        if (lastPinchDist > 0) {
          const factor = dist / lastPinchDist;
          camera.position.z = THREE.MathUtils.clamp(
            camera.position.z / factor,
            2.0, 14.0
          );
        }
        lastPinchDist = dist;
      }

      lastTouches = e.touches;
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      isDragging    = false;
      lastPinchDist = 0;

      const speed = Math.hypot(flickVel.x, flickVel.y);
      if (speed > 22 && e.touches.length === 0) shatter();
    }, { passive: false });

    /* ── Double Click / Double Tap — cycle palette ── */
    let lastTap = 0;
    el.addEventListener('click', () => {
      const now  = Date.now();
      const diff = now - lastTap;
      lastTap    = now;
      if (diff < 300) {
        /* Double click/tap — next palette */
        const u = mainMesh && mainMesh.material.uniforms;
        if (u) {
          u.uPalette.value = (u.uPalette.value + 1) % 5;
        }
      }
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 13 — INIT & RESIZE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function init(canvasEl) {

    /* ── Renderer ── */
    renderer = new THREE.WebGLRenderer({
      canvas:               canvasEl,
      antialias:            true,
      alpha:                true,
      powerPreference:      'high-performance',
      stencil:              false,
      depth:                true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding     = THREE.LinearEncoding;
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    /* ── Clock ── */
    clock = new THREE.Clock();

    /* ── Scene ── */
    scene = new THREE.Scene();
    scene.background = null; /* transparent — 2D canvas shows through */

    /* ── Camera ── */
    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 4.5);

    /* ── Lighting ── */
    const ambient = new THREE.AmbientLight(0x001a30, 0.6);
    scene.add(ambient);

    const pointCyan = new THREE.PointLight(0x00f0ff, 3.0, 25);
    pointCyan.position.set(4, 4, 6);
    scene.add(pointCyan);

    const pointViolet = new THREE.PointLight(0x8b00ff, 2.5, 25);
    pointViolet.position.set(-4, -3, 5);
    scene.add(pointViolet);

    const pointGold = new THREE.PointLight(0xffd700, 1.2, 20);
    pointGold.position.set(0, -5, -3);
    scene.add(pointGold);

    /* ── Build Scene Objects ── */
    buildCube();
    buildInternalParticles();

    /* ── Post-Processing ── */
    buildPostProcessing();

    /* ── Interaction ── */
    setupInteraction(canvasEl);

    /* ── Resize Handler ── */
    window.addEventListener('resize', onResize);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    composer.setSize(w, h);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     PUBLIC API
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function start() {
    if (!animId) render();
  }

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  /** Set active formula index [0..59] */
  function setPreset(index) {
    params.presetIndex = Math.max(0, Math.min(59, index | 0));
  }

  /** Set multiple engine parameters */
  function setParams(p) {
    if (p.speed    !== undefined) params.speed    = p.speed;
    if (p.scale    !== undefined) params.scale    = p.scale;
    if (p.chaos    !== undefined) params.chaos    = p.chaos;
    if (p.bloom    !== undefined) params.bloom    = p.bloom;
    if (p.rotation !== undefined) params.rotation = p.rotation;
  }

  /** Receive sync data from SyncController */
  function setSyncData(data) {
    if (data.rotationDir !== undefined) syncData.rotationDir = data.rotationDir;
    if (data.scaleMult   !== undefined) syncData.scaleMult   = data.scaleMult;
    if (data.energy      !== undefined) syncData.energy      = data.energy;
  }

  /** Directly set bloom strength */
  function setBloom(v) {
    params.bloom = Math.max(0, Math.min(4, v));
    if (bloomPass) bloomPass.strength = params.bloom;
  }

  /** Set colour palette index [0..4] */
  function setPalette(index) {
    if (mainMesh && mainMesh.material.uniforms) {
      mainMesh.material.uniforms.uPalette.value =
        Math.max(0, Math.min(4, index | 0));
    }
  }

  /** Trigger shatter from external source */
  function triggerShatter() { shatter(); }

  /** Toggle POV mode */
  function setPOV(enabled) {
    enabled ? enablePOV() : disablePOV();
  }

  /** Capture current frame as data URL (for screenshot) */
  function captureFrame() {
    /* Must render one frame first */
    composer.render(0);
    return renderer.domElement.toDataURL('image/png');
  }

  return {
    init,
    start,
    stop,
    setPreset,
    setParams,
    setSyncData,
    setBloom,
    setPalette,
    triggerShatter,
    setPOV,
    captureFrame
  };

})(); // end Cube3D
