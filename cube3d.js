/**
 * ═══════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine — cube3d.js
 *  Three.js 3D Xhaos Cube
 *  ShaderMaterial faces · InstancedMesh internals
 *  Post-Processing: Bloom · Chromatic Aberration · Grain
 *  Voronoi Shatter System · POV Mode
 * ═══════════════════════════════════════════════════
 */

'use strict';

window.Cube3D = (function () {

  /* ─── Private State ─── */
  let renderer, scene, camera, composer;
  let bloomPass;
  let cubeGroup, faceShards = [];
  let instanceMesh;
  let animId     = null;
  let clock       = new THREE.Clock();
  let params      = { speed: 1, scale: 1, chaos: 0.5, bloom: 1.2,
                      rotation: 0.3, presetIndex: 0 };
  let povMode     = false;
  let shattered   = false;
  let shatterTime = 0;

  /* ─── Sync values injected by SyncController ─── */
  let syncData = { rotationDir: 1, scaleMult: 1 };

  /* ══════════════════════════════════════════════
     GLSL SHADERS
  ══════════════════════════════════════════════ */

  const VERT_SHADER = /* glsl */`
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vUv      = uv;
      vNormal  = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  /**
   * Fragment shader encoding all 60 formula modes.
   * Mode selection via uniform int uMode.
   */
  const FRAG_SHADER = /* glsl */`
    precision highp float;

    uniform float uTime;
    uniform float uScale;
    uniform float uChaos;
    uniform int   uMode;
    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vWorldPos;

    #define PI    3.14159265358979
    #define TAU   6.28318530717959

    /* ── Hash & Noise ── */
    float hash(vec2 p) {
      p = fract(p * vec2(127.1, 311.7));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), u.x),
                 mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y) * 2.0 - 1.0;
    }

    float fBm(vec2 p, int oct) {
      float v=0.0, a=0.5;
      for(int i=0;i<8;i++){
        if(i>=oct) break;
        v += a * noise(p); p *= 2.0; a *= 0.5;
      }
      return v;
    }

    float turb(vec2 p, int oct) {
      float v=0.0, a=0.5;
      for(int i=0;i<8;i++){
        if(i>=oct) break;
        v += a * abs(noise(p)); p *= 2.0; a *= 0.5;
      }
      return v;
    }

    vec2 warp(vec2 p, float t, int iters) {
      for(int i=0;i<6;i++){
        if(i>=iters) break;
        float nx = noise(p + vec2(0.3*t, 1.7));
        float ny = noise(p + vec2(3.1+0.2*t, 2.3));
        p += 0.8*vec2(nx, ny);
      }
      return p;
    }

    /* ── Colour Mapping ── */
    vec3 cybColor(float v) {
      v = fract(v * 0.5 + 0.5);
      vec3 a = vec3(0.0, 1.0, 1.0);   // cyan
      vec3 b = vec3(0.545, 0.0, 1.0); // violet
      vec3 c = vec3(1.0, 0.843, 0.0); // gold
      if(v < 0.33) return mix(a, b, v/0.33);
      if(v < 0.66) return mix(b, c, (v-0.33)/0.33);
      return mix(c, a, (v-0.66)/0.34);
    }

    /* ── Formula Dispatcher ── */
    float formula(vec2 uv, float t, float s) {
      float x = uv.x * s;
      float y = uv.y * s;
      vec2  p = vec2(x, y);

      if(uMode == 0) { // 01 Fiber Optics
        return (sin(0.3*x+t) + cos(0.3*y+t))*2.2 + fBm(0.3*p, 4)*3.0;
      }
      if(uMode == 1) { // 02 Digital Silk
        vec2 w = warp(0.4*p, t, 2);
        return sin(w.x+0.7*t)*cos(w.y-0.5*t)*4.0;
      }
      if(uMode == 2) { // 03 Wave Turbulence
        float tb = turb(0.2*p, 5);
        return (sin(0.3*(x+y)+t+tb*4.0) - cos(0.3*(x-y)-t)) * 2.5;
      }
      if(uMode == 3) { // 04 Dynamic Vortex
        float r    = length(uv - 0.5);
        float pull = sin(0.8*s*r - t)*0.5;
        return atan(uv.y-0.5, uv.x-0.5) + 0.6*t + pull;
      }
      if(uMode == 4) { // 05 Neural Grid
        float gx = floor(x/4.0), gy = floor(y/4.0);
        float cell = noise(vec2(0.5*gx, 0.5*gy+0.3*t));
        return (gx+gy)*0.5*cell + 0.1*t + sin(cell*TAU)*2.0;
      }
      if(uMode == 5) { // 06 Data Blocks
        float bx = round(x/7.0), by = round(y/7.0);
        float nn = noise(vec2(bx+0.2*t, by));
        return (bx+by)*0.22 + sin(t+nn*8.0) + cos(nn*PI)*2.0;
      }
      if(uMode == 6) { // 07 Sand Waves
        float nn = fBm(0.3*p+vec2(0.2*t,0.0), 6);
        return sin(0.5*(x+y)+t+nn*5.0) + cos(0.5*(x-y)-t+nn*3.0);
      }
      if(uMode == 7) { // 08 Galactic River
        vec2 w = warp(0.2*p, t, 4);
        float tb = turb(0.1*p, 3);
        return sin(w.x+t)*cos(w.y+t)*5.0 + tb*3.0;
      }
      if(uMode == 8) { // 09 Radial Drift
        float r = length(uv-0.5)*s;
        return sin(0.02*r+t)*2.2 + 0.35*cos(0.4*y-0.5*t);
      }
      if(uMode == 9) { // 10 Geometric Repeat
        float nn = noise(0.5*p+vec2(0.0, 0.1*t));
        return sin(0.9*x+sin(0.6*y+t)) + cos(0.9*y+cos(0.6*x+t)) + nn*2.0;
      }
      if(uMode == 10) { // 11 Magnetic Field
        float sum = 0.0;
        vec2 poles[4];
        poles[0]=vec2(0.25,0.5); poles[1]=vec2(0.75,0.5);
        poles[2]=vec2(0.5,0.25); poles[3]=vec2(0.5,0.75);
        float signs[4]; signs[0]=1.;signs[1]=-1.;signs[2]=1.;signs[3]=-1.;
        for(int i=0;i<4;i++) sum += atan(uv.y-poles[i].y, uv.x-poles[i].x)*signs[i];
        return sum/4.0 + 0.3*sin(t);
      }
      if(uMode == 11) { // 12 Ordered Chaos
        float nn = turb(0.3*p+vec2(0.1*t,0.0), 6);
        return sin(0.3*x)*cos(0.3*y)*TAU + sin(t) + nn*4.0;
      }
      if(uMode == 12) { // 13 Fractal Spiral
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        return log(r+1.0)*0.5*s + th + 0.4*t + fBm(vec2(2.0*th, 0.005*r), 4)*3.0;
      }
      if(uMode == 13) { // 14 Electric Storm
        float n1 = noise(0.5*p+vec2(t,0.0));
        float n2 = noise(p-vec2(0.0,0.5*t));
        float bolt = sin(n1*20.0)*cos(n2*15.0);
        return bolt*3.0 + atan(uv.y-0.5, uv.x-0.5)*0.2;
      }
      if(uMode == 14) { // 15 DNA Helix
        float wave = sin(y+2.0*t)*0.15;
        return atan(sin(2.0*y+t), (uv.x-0.5-wave)*0.05) + cos(0.8*y+t)*2.0;
      }
      if(uMode == 15) { // 16 Coral Growth
        vec2 w = warp(0.3*p, 0.3*t, 6);
        return fBm(w, 6)*8.0 + sin(0.5*t)*2.0;
      }
      if(uMode == 16) { // 17 Quantum Field
        float n1 = noise(0.8*p+vec2(0.3*t,0.0));
        float n2 = noise(0.4*p+vec2(0.0,0.2*t));
        float intf = sin(n1*12.0+n2*8.0+t);
        return intf*2.0 + sin(0.6*x)*cos(0.6*y)*3.0;
      }
      if(uMode == 17) { // 18 Topographic
        float H_val = fBm(0.2*p+vec2(0.05*t,0.0), 8);
        float cnt = sin(30.0*H_val)*0.5;
        float gx2 = fBm(0.2*(p+vec2(0.01,0.0))+vec2(0.05*t,0.0),8)-H_val;
        float gy2 = fBm(0.2*(p+vec2(0.0,0.01))+vec2(0.05*t,0.0),8)-H_val;
        return atan(gy2, gx2)+cnt;
      }
      if(uMode == 18) { // 19 Mirror Flow
        vec2 mp = abs(uv-0.5)*s;
        return fBm(0.5*mp+vec2(0.2*t,0.0),4)*6.0 + 0.8*sin(x-0.8*y+t);
      }
      if(uMode == 19) { // 20 Smoke
        vec2 w1 = warp(0.2*p, 0.5*t, 3);
        vec2 w2 = warp(w1, 0.3*t, 2);
        float rise = -0.5+(1.0-uv.y)*0.8;
        return fBm(w2,5)*6.0+rise*2.0+1.5*PI;
      }
      if(uMode == 20) { // 21 Crystal Lattice
        float ax = sin(x*4.0+t)*cos(y*3.0);
        float ay = cos(x*3.0-t)*sin(y*4.0);
        float nn = noise(p+vec2(0.1*t,0.0))*2.0;
        return atan(ay+nn, ax+nn);
      }
      if(uMode == 21) { // 22 Nebula
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        vec2 w = warp(0.1*p, 0.2*t, 5);
        return fBm(vec2(3.0*th+0.1*t, 0.5*r), 6)*5.0 + sin(3.0*(w.x+w.y))*2.0+0.3*th;
      }
      if(uMode == 22) { // 23 Woven Fabric
        float wx2 = sin(2.0*x+t)*2.0;
        float wy2 = cos(2.0*y-0.7*t)*2.0;
        float nn = noise(0.3*p+vec2(0.0,0.1*t));
        return atan(sin(y+wx2), cos(x+wy2))+nn*2.0;
      }
      if(uMode == 23) { // 24 Black Hole
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        float pull = 1.0/(0.03*r+0.1);
        return th+pull*2.0+0.3*t+sin(0.1*r-2.0*t)*0.5;
      }
      if(uMode == 24) { // 25 Aurora
        float fy = uv.y;
        float curt = sin(0.5*x+t+sin(8.0*fy+t)*2.0)*3.0;
        return curt + fBm(0.1*p+vec2(0.1*t,0.0),5)*4.0 - PI/2.0;
      }
      if(uMode == 25) { // 26 Voronoi Flow
        vec2 seeds[8];
        for(int i=0;i<8;i++){
          float a = TAU*float(i)/8.0+t*0.3;
          seeds[i] = vec2(0.5+0.4*cos(a), 0.5+0.4*sin(a));
        }
        float minD = 99.0; vec2 np = vec2(0.0);
        for(int i=0;i<8;i++){
          float d = length(uv-seeds[i]);
          if(d<minD){minD=d; np=seeds[i];}
        }
        return atan(0.5-np.y, 0.5-np.x)+0.3*sin(0.5*t);
      }
      if(uMode == 26) { // 27 Interference Rings
        vec2 srcs[3];
        srcs[0]=vec2(0.3,0.5); srcs[1]=vec2(0.7,0.5); srcs[2]=vec2(0.5,0.3);
        float sum2=0.0;
        for(int i=0;i<3;i++){
          float d2=length(uv-srcs[i])*s;
          sum2+=sin(0.2*d2-t*(1.0+0.3*float(i)));
        }
        return sum2;
      }
      if(uMode == 27) { // 28 Tornado
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        float yN = uv.y;
        float width2=(1.0-yN)*0.3+0.05;
        float spin=3.0/(r/s+0.1)*width2;
        float tb2=turb(vec2(2.0*th,5.0*yN+t),4);
        return th+spin+0.5*t+tb2*2.0;
      }
      if(uMode == 28) { // 29 Neural Network
        float sum3=0.0;
        for(int i=0;i<6;i++){
          float a = TAU*float(i)/6.0+0.4*t;
          vec2 n2=vec2(0.5+0.35*cos(a),0.5+0.35*sin(a));
          float d3=length(uv-n2)*s;
          sum3+=sin(0.1*d3+t+float(i))*exp(-0.05*d3);
        }
        return sum3*3.0;
      }
      if(uMode == 29) { // 30 Galaxy Arm
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        float spiral = th-0.6*log(r+1.0);
        float arm = sin(spiral*2.0+0.3*t)*0.5;
        return th+arm+fBm(vec2(th*s,0.003*r+0.05*t),4)*2.0+PI/2.0;
      }
      if(uMode == 30) { // 31 Liquid Marble
        return sin(6.0*fBm(0.4*p+vec2(t,-t),4))+cos(4.0*fBm(0.6*p+vec2(0.0,t),3));
      }
      if(uMode == 31) { // 32 Solar Flare
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        return th+4.0*sin(0.03*r-2.0*t)+2.0*noise(p+vec2(t,0.0));
      }
      if(uMode == 32) { // 33 Frozen Veins
        float nn = noise(p);
        float dx2 = noise(p+vec2(0.01,0.0))-nn;
        float dy2 = noise(p+vec2(0.0,0.01))-nn;
        return atan(dy2,dx2)+0.4*sin(18.0*nn);
      }
      if(uMode == 33) { // 34 Velvet Fold
        return sin(0.4*x+3.0*fBm(vec2(0.3*y,0.3*x+t),4))*cos(0.4*y-t);
      }
      if(uMode == 34) { // 35 Band Current
        return sin(1.2*x+t)+0.7*cos(1.8*y-0.6*t)+0.4*sin(x-y);
      }
      if(uMode == 35) { // 36 Sonic Ripples
        float r = length(uv-0.5)*s;
        return sin(0.03*r-3.0*t)+0.5*sin(0.05*r+2.0*t);
      }
      if(uMode == 36) { // 37 Plasma Mesh
        return sin(x+t)+sin(y-t)+sin(x+y+0.5*t);
      }
      if(uMode == 37) { // 38 Marble Vein
        return sin(x+5.0*fBm(0.6*p+vec2(0.0,t),5));
      }
      if(uMode == 38) { // 39 Hyper Tunnel
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        return th+8.0/(r+1.0)+sin(0.05*r-2.0*t);
      }
      if(uMode == 39) { // 40 Biofilm
        vec2 w = warp(0.4*p, t, 3);
        return fBm(w,5)*6.0+0.8*sin(0.2*t);
      }
      if(uMode == 40) { // 41 Grid Stream
        float gx = floor(x/6.0), gy = floor(y/6.0);
        return noise(vec2(0.4*gx+0.1*t, 0.4*gy))*TAU+0.3*sin(gx+gy+t);
      }
      if(uMode == 41) { // 42 Cloud Chamber
        float fb = fBm(0.3*p+vec2(0.05*t,0.0),6);
        float gx2 = fBm(0.3*(p+vec2(0.01,0.0))+vec2(0.05*t,0.0),6)-fb;
        float gy2 = fBm(0.3*(p+vec2(0.0,0.01))+vec2(0.05*t,0.0),6)-fb;
        return atan(gy2,gx2)+0.6*sin(x+y+t);
      }
      if(uMode == 42) { // 43 Ink Diffusion
        vec2 w = warp(0.2*p, 0.2*t, 4);
        return fBm(w,6)+0.3*sin(t);
      }
      if(uMode == 43) { // 44 Luminous Web
        float sum4=0.0;
        for(int i=0;i<8;i++){
          float a=TAU*float(i)/8.0+0.1*t;
          vec2 an=vec2(0.5+0.4*cos(a),0.5+0.4*sin(a));
          float d4=length(uv-an);
          sum4+=atan(uv.y-an.y, uv.x-an.x)/(d4*10.0+1.0);
        }
        return sum4;
      }
      if(uMode == 44) { // 45 Harmonic Tiles
        float fx = x/8.0+t, fy = y/8.0-t;
        return sin(TAU*fract(fx))+cos(TAU*fract(fy));
      }
      if(uMode == 45) { // 46 Spiral Garden
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        return th+0.4*r+sin(5.0*th-t);
      }
      if(uMode == 46) { // 47 Mercury Flow
        return sin(0.5*x+4.0*noise(0.6*p+vec2(t,0.0)))+
               cos(0.5*y-4.0*noise(0.6*p.yx-vec2(0.0,t)));
      }
      if(uMode == 47) { // 48 Prism Wave
        return sin(0.8*x+t)*sin(0.8*y-t)+cos(1.2*(x-y));
      }
      if(uMode == 48) { // 49 Orbit Net
        float sum5=0.0;
        for(int i=0;i<5;i++){
          float a=TAU*float(i)/5.0+t*0.25;
          vec2 o=vec2(0.5+0.3*cos(a),0.5+0.3*sin(a));
          float d5=length(uv-o)*s;
          sum5+=atan(uv.y-o.y,uv.x-o.x)+0.2*sin(0.02*d5-t);
        }
        return sum5;
      }
      if(uMode == 49) { // 50 Ember Drift
        return fBm(0.4*p+vec2(0.1*t,0.0),4)*5.0+0.7*(1.0-uv.y);
      }
      if(uMode == 50) { // 51 Glass Refraction
        return atan(sin(2.0*x+3.0*noise(p+vec2(0.0,t))),
                    cos(2.0*y-3.0*noise(p.yx-vec2(0.0,t))));
      }
      if(uMode == 51) { // 52 Ocean Current
        return fBm(0.2*p+vec2(0.05*t,-0.03*t),5)*4.0+0.4*sin(0.6*y+t);
      }
      if(uMode == 52) { // 53 Silk Bloom
        return sin(0.3*x+t)*cos(0.3*y-t)+fBm(0.5*p+vec2(0.0,t),3)*2.0;
      }
      if(uMode == 53) { // 54 Flux Rings
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        return sin(0.04*r-t)*cos(6.0*th+0.5*t);
      }
      if(uMode == 54) { // 55 Industrial Flow
        return atan(sin(2.0*x+2.0*noise(p+vec2(0.0,t))),
                    cos(2.0*y-2.0*noise(p.yx-vec2(0.0,t))));
      }
      if(uMode == 55) { // 56 Star Nursery
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        return fBm(0.2*p+vec2(0.0,0.04*t),5)*6.0+sin(0.02*r+th-t);
      }
      if(uMode == 56) { // 57 Wave Lattice
        return sin(x+t)+cos(y-t)+sin(x-y);
      }
      if(uMode == 57) { // 58 Moiré Pulse
        return sin(3.0*x+t)+sin(3.1*y-0.8*t);
      }
      if(uMode == 58) { // 59 Orbital Current
        float r = length(uv-0.5)*s;
        float th = atan(uv.y-0.5, uv.x-0.5);
        return th+0.6*sin(0.025*r-t)+0.25*noise(p+vec2(0.0,0.1*t));
      }
      // 60 Phantom Field (default)
      vec2 w = warp(0.3*p, 0.15*t, 4);
      return fBm(w,6)*7.0+atan(uv.y-0.5, uv.x-0.5)*0.2;
    }

    void main() {
      float t = uTime;
      float s = uScale * 10.0;
      float f = formula(vUv, t, s);

      /* Normalise formula output → colour */
      float v = f / (PI * 2.0);
      vec3 col = cybColor(v);

      /* Edge fresnel glow */
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0,0.0,1.0))), 2.0);
      col += vec3(0.0, 0.9, 1.0) * fresnel * 0.6;

      /* Scan-line effect */
      float scan = 0.5 + 0.5*sin(vUv.y * 400.0 + t * 3.0);
      col *= 0.92 + 0.08 * scan;

      /* Grid overlay */
      vec2 grid = abs(fract(vUv * 20.0) - 0.5);
      float gLine = 1.0 - smoothstep(0.0, 0.04, min(grid.x, grid.y));
      col = mix(col, col * 1.6 + vec3(0.0,0.5,0.8)*0.3, gLine * 0.25);

      /* Chaos noise speckle */
      float speck = noise(vUv * 80.0 + t);
      col += speck * uChaos * 0.08;

      gl_FragColor = vec4(col, 0.95);
    }
  `;

  /* ══════════════════════════════════════════════
     CHROMATIC ABERRATION SHADER
  ══════════════════════════════════════════════ */
  const ChromaShader = {
    uniforms: {
      tDiffuse: { value: null },
      uOffset:  { value: 0.003 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uOffset;
      varying vec2 vUv;
      void main() {
        float r = texture2D(tDiffuse, vUv + vec2( uOffset, 0.0)).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - vec2( uOffset, 0.0)).b;
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `
  };

  /* ══════════════════════════════════════════════
     FILM GRAIN SHADER
  ══════════════════════════════════════════════ */
  const GrainShader = {
    uniforms: {
      tDiffuse: { value: null },
      uTime:    { value: 0 },
      uAmount:  { value: 0.04 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uAmount;
      varying vec2 vUv;
      float rand(vec2 co){
        return fract(sin(dot(co, vec2(12.9898,78.233)))*43758.5453123);
      }
      void main() {
        vec4 col = texture2D(tDiffuse, vUv);
        float grain = rand(vUv + uTime * 0.01) * 2.0 - 1.0;
        col.rgb += grain * uAmount;
        gl_FragColor = col;
      }
    `
  };

  /* ══════════════════════════════════════════════
     SCENE SETUP
  ══════════════════════════════════════════════ */

  function init(canvasEl) {
    /* Renderer */
    renderer = new THREE.WebGLRenderer({
      canvas:    canvasEl,
      antialias: true,
      alpha:     true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping    = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    /* Scene */
    scene = new THREE.Scene();

    /* Camera */
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 4.5);

    /* Lighting (for shard reflections) */
    const ambient = new THREE.AmbientLight(0x001020, 0.5);
    scene.add(ambient);

    const point1 = new THREE.PointLight(0x00f0ff, 2.5, 20);
    point1.position.set(4, 4, 6);
    scene.add(point1);

    const point2 = new THREE.PointLight(0x8b00ff, 2.0, 20);
    point2.position.set(-4, -3, 5);
    scene.add(point2);

    /* Build cube */
    buildCube();

    /* Internal InstancedMesh particles */
    buildInternalParticles();

    /* Post-processing */
    buildPostProcessing();

    /* Resize */
    window.addEventListener('resize', onResize);

    /* Touch / mouse */
    setupInteraction(canvasEl);
  }

  /* ─── Face Material ─── */
  function createFaceMaterial(mode) {
    return new THREE.ShaderMaterial({
      vertexShader:   VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      uniforms: {
        uTime:  { value: 0 },
        uScale: { value: params.scale },
        uChaos: { value: params.chaos },
        uMode:  { value: mode }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  /* ─── Build Cube ─── */
  function buildCube() {
    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    faceShards = [];

    const geo  = new THREE.BoxGeometry(2, 2, 2, 32, 32, 32);
    const mat  = createFaceMaterial(params.presetIndex);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.isCubeMain = true;
    cubeGroup.add(mesh);
    faceShards.push(mesh);

    /* Wireframe edge accent */
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.002, 2.002, 2.002));
    const line  = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: 0x00f0ff, transparent: true, opacity: 0.4
    }));
    cubeGroup.add(line);
  }

  /* ─── Internal Instanced Particles ─── */
  function buildInternalParticles() {
    const COUNT   = 400;
    const geo     = new THREE.SphereGeometry(0.018, 6, 6);
    const mat     = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    instanceMesh  = new THREE.InstancedMesh(geo, mat, COUNT);
    instanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      dummy.position.set(
        (Math.random()-0.5) * 1.8,
        (Math.random()-0.5) * 1.8,
        (Math.random()-0.5) * 1.8
      );
      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);

      // Random color (cyan/violet/gold)
      const colors = [0x00f0ff, 0x8b00ff, 0xffd700];
      instanceMesh.setColorAt(i, new THREE.Color(colors[i % 3]));
    }
    scene.add(instanceMesh);
  }

  /* ─── Post-Processing ─── */
  function buildPostProcessing() {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));

    /* Unreal Bloom */
    bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      params.bloom, // strength
      0.55,         // radius
      0.25          // threshold
    );
    composer.addPass(bloomPass);

    /* Chromatic Aberration */
    const chromaPass = new THREE.ShaderPass(ChromaShader);
    chromaPass.uniforms.uOffset.value = 0.003;
    composer.addPass(chromaPass);

    /* Film Grain */
    const grainPass = new THREE.ShaderPass(GrainShader);
    composer.addPass(grainPass);
    composer.passes[composer.passes.length-1].renderToScreen = true;
  }

  /* ══════════════════════════════════════════════
     VORONOI SHATTER
  ══════════════════════════════════════════════ */

  function shatter() {
    if (shattered) return;
    shattered   = true;
    shatterTime = 0;

    // Remove main cube
    cubeGroup.children.slice().forEach(c => cubeGroup.remove(c));

    const SHARD_COUNT = 28;
    faceShards = [];

    for (let i = 0; i < SHARD_COUNT; i++) {
      // Random sub-box shard
      const sx = 0.3 + Math.random() * 0.6;
      const sy = 0.3 + Math.random() * 0.6;
      const sz = 0.3 + Math.random() * 0.6;

      const geo  = new THREE.BoxGeometry(sx, sy, sz, 4, 4, 4);
      const mat  = createFaceMaterial(params.presetIndex);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random()-0.5) * 0.8,
        (Math.random()-0.5) * 0.8,
        (Math.random()-0.5) * 0.8
      );
      mesh.rotation.set(
        Math.random()*Math.PI,
        Math.random()*Math.PI,
        Math.random()*Math.PI
      );

      // Store velocity for animation
      mesh.userData.vel = new THREE.Vector3(
        (Math.random()-0.5) * 0.06,
        (Math.random()-0.5) * 0.06,
        (Math.random()-0.5) * 0.06
      );
      mesh.userData.angVel = new THREE.Vector3(
        (Math.random()-0.5) * 0.05,
        (Math.random()-0.5) * 0.05,
        (Math.random()-0.5) * 0.05
      );

      cubeGroup.add(mesh);
      faceShards.push(mesh);
    }

    // Auto-reassemble after 3 seconds
    setTimeout(reassemble, 3000);
  }

  function reassemble() {
    shattered = false;
    cubeGroup.children.slice().forEach(c => cubeGroup.remove(c));
    buildCube();
  }

  /* ══════════════════════════════════════════════
     INTERACTION (Mouse / Touch)
  ══════════════════════════════════════════════ */

  let isDragging = false;
  let prevMouse  = { x: 0, y: 0 };
  let flickVel   = { x: 0, y: 0 };

  function setupInteraction(el) {
    /* Mouse */
    el.addEventListener('mousedown', e => {
      isDragging = true;
      prevMouse  = { x: e.clientX, y: e.clientY };
      flickVel   = { x: 0, y: 0 };
    });

    el.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      cubeGroup.rotation.y += dx * 0.006;
      cubeGroup.rotation.x += dy * 0.006;
      flickVel = { x: dx, y: dy };
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener('mouseup', () => {
      isDragging = false;
      // Flick detection
      if (Math.hypot(flickVel.x, flickVel.y) > 18) shatter();
    });

    /* Touch */
    let lastTouches = null;

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      lastTouches = e.touches;
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        flickVel   = { x: 0, y: 0 };
      }
    }, { passive: false });

    el.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        cubeGroup.rotation.y += dx * 0.006;
        cubeGroup.rotation.x += dy * 0.006;
        flickVel  = { x: dx, y: dy };
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      // Pinch-to-zoom
      if (e.touches.length === 2 && lastTouches && lastTouches.length === 2) {
        const prevDist = Math.hypot(
          lastTouches[0].clientX - lastTouches[1].clientX,
          lastTouches[0].clientY - lastTouches[1].clientY
        );
        const currDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = currDist / prevDist;
        camera.position.z = THREE.MathUtils.clamp(camera.position.z / factor, 2, 12);
      }
      lastTouches = e.touches;
    }, { passive: false });

    el.addEventListener('touchend', e => {
      isDragging = false;
      if (Math.hypot(flickVel.x, flickVel.y) > 20) shatter();
    });
  }

  /* ══════════════════════════════════════════════
     POV MODE
  ══════════════════════════════════════════════ */

  function enablePOV() {
    povMode = true;
    camera.position.set(0, 0, 0);
    camera.fov = 110;
    camera.updateProjectionMatrix();
  }

  function disablePOV() {
    povMode = false;
    camera.position.set(0, 0, 4.5);
    camera.fov = 55;
    camera.updateProjectionMatrix();
  }

  /* ══════════════════════════════════════════════
     RENDER LOOP
  ══════════════════════════════════════════════ */

  function render() {
    animId = requestAnimationFrame(render);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update face materials
    faceShards.forEach(mesh => {
      if (mesh.material && mesh.material.uniforms) {
        mesh.material.uniforms.uTime.value  = elapsed * params.speed;
        mesh.material.uniforms.uScale.value = params.scale;
        mesh.material.uniforms.uChaos.value = params.chaos;
        mesh.material.uniforms.uMode.value  = params.presetIndex;
      }

      // Shatter animation
      if (shattered && mesh.userData.vel) {
        mesh.position.add(mesh.userData.vel);
        mesh.rotation.x += mesh.userData.angVel.x;
        mesh.rotation.y += mesh.userData.angVel.y;
        mesh.rotation.z += mesh.userData.angVel.z;
        // Drag
        mesh.userData.vel.multiplyScalar(0.97);
        mesh.userData.angVel.multiplyScalar(0.97);
      }
    });

    // Auto-rotate cube (inversion handled by SyncController via syncData)
    if (!isDragging && !shattered && !povMode) {
      cubeGroup.rotation.y += 0.004 * params.rotation * syncData.rotationDir;
      cubeGroup.rotation.x += 0.002 * params.rotation * syncData.rotationDir;
    }

    // Scale from sync
    const targetScale = params.scale * syncData.scaleMult;
    cubeGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);

    // POV: slowly rotate camera inside
    if (povMode) {
      camera.rotation.y = Math.sin(elapsed * 0.1) * 0.3;
      camera.rotation.x = Math.cos(elapsed * 0.08) * 0.15;
    }

    // Internal particles drift
    updateInternalParticles(elapsed);

    // Bloom strength
    if (bloomPass) bloomPass.strength = params.bloom;

    // Grain time
    const grainPass = composer.passes.find(p => p.uniforms && p.uniforms.uTime);
    if (grainPass) grainPass.uniforms.uTime.value = elapsed;

    composer.render(delta);
  }

  function updateInternalParticles(t) {
    if (!instanceMesh) return;
    const dummy = new THREE.Object3D();
    const count = instanceMesh.count;

    for (let i = 0; i < count; i++) {
      instanceMesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      // Orbital drift
      const angle = (t * 0.3 + i * 0.04) % (Math.PI * 2);
      const radius = 0.3 + (i % 7) * 0.12;
      dummy.position.x += Math.cos(angle + i) * 0.002;
      dummy.position.y += Math.sin(angle + i * 1.3) * 0.002;
      dummy.position.z += Math.cos(angle * 0.7 + i) * 0.002;

      // Keep inside cube
      dummy.position.clampScalar(-0.88, 0.88);

      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);
    }
    instanceMesh.instanceMatrix.needsUpdate = true;
  }

  /* ══════════════════════════════════════════════
     RESIZE
  ══════════════════════════════════════════════ */

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }

  /* ══════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════ */

  function start() { if (!animId) render(); }
  function stop()  { if (animId) { cancelAnimationFrame(animId); animId = null; } }

  function setPreset(index) {
    params.presetIndex = Math.max(0, Math.min(59, index));
  }

  function setParams(p) {
    Object.assign(params, p);
  }

  function setSyncData(data) {
    Object.assign(syncData, data);
  }

  function triggerShatter() { shatter(); }

  function setPOV(enabled) {
    enabled ? enablePOV() : disablePOV();
  }

  function setBloom(v) {
    params.bloom = v;
    if (bloomPass) bloomPass.strength = v;
  }

  return { init, start, stop, setPreset, setParams, setSyncData, triggerShatter, setPOV, setBloom };

})();
