/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — cube3d.js
 *
 *  CORE INTEGRATION: Live 2D → 3D Texture Mapping
 *  ─────────────────────────────────────────────
 *  The 2D particle canvas (canvas2d) is read every frame
 *  and applied directly onto the cube faces as a live skin.
 *
 *  · MeshBasicMaterial + THREE.CanvasTexture
 *  · liveTexture.needsUpdate = true every frame
 *  · Post-processing: Bloom · Chromatic Aberration · Grain
 *  · Voronoi Shatter — shards share live texture
 *  · POV Mode — first person inside cube
 *  · Touch / Mouse / Pinch-zoom interaction
 *  · Shader overlay fallback mode
 *
 *  Architecture: IIFE Module Pattern
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

window.Cube3D = (function () {

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 1 — PRIVATE STATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* Three.js Core */
  let renderer      = null;
  let scene         = null;
  let camera        = null;
  let composer      = null;
  let bloomPass     = null;
  let chromaPass    = null;
  let grainPass     = null;

  /* Scene Objects */
  let cubeGroup     = null;
  let mainMesh      = null;
  let edgeMesh      = null;
  let instanceMesh  = null;
  let shardGroup    = null;

  /* Live Texture System */
  let canvas2dEl    = null;
  let liveTexture   = null;
  let textureMat    = null;
  let shaderMat     = null;
  let useTexMode    = true;

  /* Engine State */
  let animId          = null;
  let clock           = null;
  let isShattered     = false;
  let shatterCooldown = 0;
  let isPOV           = false;
  let isDragging      = false;

  /* Interaction */
  let prevMouse   = { x: 0, y: 0 };
  let flickVel    = { x: 0, y: 0 };
  let flickTimer  = 0;

  /* Sync data from SyncController */
  let syncData = {
    rotationDir: 1,
    scaleMult:   1.0,
    energy:      0.0
  };

  /* Engine Parameters */
  let params = {
    speed:        1.0,
    scale:        1.0,
    chaos:        0.5,
    bloom:        1.2,
    rotation:     0.3,
    presetIndex:  0,
    texOpacity:   1.0
  };

  /* Internal particle data */
  const INSTANCE_COUNT = 500;
  const instanceData   = [];

  /* Texture metrics */
  let texUpdateCount = 0;
  let texSyncActive  = true;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — LIVE TEXTURE MATERIAL
     Core integration — canvas2d → cube face skin
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * createLiveTextureMaterial
   * Wraps canvas2d in THREE.CanvasTexture and builds
   * a MeshBasicMaterial. Every frame liveTexture.needsUpdate
   * causes Three.js to re-upload canvas pixels to GPU.
   */
  function createLiveTextureMaterial(sourceCanvas) {
    canvas2dEl = sourceCanvas;

    liveTexture = new THREE.CanvasTexture(sourceCanvas);

    /* Smooth interpolation across cube faces */
    liveTexture.minFilter       = THREE.LinearFilter;
    liveTexture.magFilter       = THREE.LinearFilter;

    /* No seam bleeding at cube edges */
    liveTexture.wrapS           = THREE.ClampToEdgeWrapping;
    liveTexture.wrapT           = THREE.ClampToEdgeWrapping;

    /* Linear encoding — keep HDR for bloom */
    liveTexture.encoding        = THREE.LinearEncoding;

    /* No mipmaps — we update every frame */
    liveTexture.generateMipmaps = false;

    textureMat = new THREE.MeshBasicMaterial({
      map:         liveTexture,
      transparent: false,
      side:        THREE.DoubleSide,
      toneMapped:  false   /* allows bloom on bright trails */
    });

    return textureMat;
  }

  /**
   * updateLiveTexture — marks CanvasTexture dirty.
   * Called once per frame BEFORE composer.render().
   * This ensures cube faces show current frame particles.
   */
  function updateLiveTexture() {
    if (!liveTexture || !useTexMode) return;
    liveTexture.needsUpdate = true;
    texUpdateCount++;
    texSyncActive = true;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — GLSL VERTEX SHADER (Fallback mode)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const VERT_SHADER = /* glsl */`
    precision highp float;

    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vWorldPos;
    varying float vDepth;

    void main() {
      vUv       = uv;
      vNormal   = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vDepth     = -mvPos.z;
      gl_Position = projectionMatrix * mvPos;
    }
  `;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 4 — GLSL FRAGMENT SHADER (Fallback mode)
     Used when useTexMode = false (shader overlay)
     Implements 60 formula modes in GLSL
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const FRAG_SHADER = /* glsl */`
    precision highp float;

    uniform float uTime;
    uniform float uScale;
    uniform float uChaos;
    uniform int   uMode;
    uniform float uEnergy;

    varying vec2  vUv;
    varying vec3  vNormal;
    varying float vDepth;

    #define PI  3.14159265358979
    #define TAU 6.28318530717959

    /* ── Math Utilities ── */
    float hash(vec2 p) {
      p = fract(p * vec2(127.1, 311.7));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
        u.y
      ) * 2.0 - 1.0;
    }

    float fBm(vec2 p, int oct) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    float turb(vec2 p, int oct) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        v += a * abs(noise(p));
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    vec2 warp(vec2 p, float t, int iters) {
      for (int i = 0; i < 6; i++) {
        if (i >= iters) break;
        float s = 1.0 / float(i + 1);
        p += s * 0.8 * vec2(
          noise(p + vec2(0.3*t + float(i)*3.7,
                         1.7  + float(i)*2.1)),
          noise(p + vec2(3.1 + 0.2*t + float(i)*1.9,
                         2.3 + float(i)*4.3))
        );
      }
      return p;
    }

    /* ── Cyber Colour Gradient ── */
    vec3 cyberColor(float v) {
      v = fract(v * 0.5 + 0.5);
      vec3 a = vec3(0.0,  0.94, 1.0 );  /* cyan   */
      vec3 b = vec3(0.545,0.0,  1.0 );  /* violet */
      vec3 c = vec3(1.0,  0.843,0.0 );  /* gold   */
      vec3 d = vec3(1.0,  0.133,0.267); /* red    */
      if (v < 0.25) return mix(a, b, v / 0.25);
      if (v < 0.50) return mix(b, c, (v-0.25) / 0.25);
      if (v < 0.75) return mix(c, d, (v-0.50) / 0.25);
      return mix(d, a, (v-0.75) / 0.25);
    }

    /* ── 60-Mode Formula Dispatcher ── */
    float formula(vec2 uv, float t, float s) {
      float x = uv.x * s;
      float y = uv.y * s;
      vec2  p = vec2(x, y);

      if (uMode ==  0) return (sin(0.3*x+t)+cos(0.3*y+t))*2.2 + fBm(0.3*p,4)*3.0;
      if (uMode ==  1) { vec2 w=warp(0.4*p,t,2); return sin(w.x+0.7*t)*cos(w.y-0.5*t)*4.0; }
      if (uMode ==  2) { float tb=turb(0.2*p,5); return (sin(0.3*(x+y)+t+tb*4.0)-cos(0.3*(x-y)-t))*2.5; }
      if (uMode ==  3) { float r=length(uv-0.5)*s; return atan(uv.y-0.5,uv.x-0.5)+0.6*t+sin(0.8*r-t)*0.5; }
      if (uMode ==  4) { float gx=floor(x/4.0),gy=floor(y/4.0),cell=noise(vec2(0.5*gx,0.5*gy+0.3*t)); return (gx+gy)*0.5*cell+0.1*t+sin(cell*TAU)*2.0; }
      if (uMode ==  5) { float bx=round(x/7.0),by=round(y/7.0),nn=noise(vec2(bx+0.2*t,by)); return (bx+by)*0.22+sin(t+nn*8.0)+cos(nn*PI)*2.0; }
      if (uMode ==  6) { float nn=fBm(0.3*p+vec2(0.2*t,0.0),6); return sin(0.5*(x+y)+t+nn*5.0)+cos(0.5*(x-y)-t+nn*3.0); }
      if (uMode ==  7) { vec2 w=warp(0.2*p,t,4); return sin(w.x+t)*cos(w.y+t)*5.0+turb(0.1*p,3)*3.0; }
      if (uMode ==  8) { float r=length(uv-0.5)*s; return sin(0.02*r+t)*2.2+0.35*cos(0.4*y-0.5*t); }
      if (uMode ==  9) { float nn=noise(0.5*p+vec2(0.0,0.1*t)); return sin(0.9*x+sin(0.6*y+t))+cos(0.9*y+cos(0.6*x+t))+nn*2.0; }
      if (uMode == 10) {
        vec2 poles[4];
        poles[0]=vec2(0.25,0.5); poles[1]=vec2(0.75,0.5);
        poles[2]=vec2(0.5,0.25); poles[3]=vec2(0.5,0.75);
        float signs[4]; signs[0]=1.0; signs[1]=-1.0; signs[2]=1.0; signs[3]=-1.0;
        float sum=0.0;
        for(int i=0;i<4;i++) sum+=atan(uv.y-poles[i].y,uv.x-poles[i].x)*signs[i];
        return sum/4.0+0.3*sin(t);
      }
      if (uMode == 11) { float nn=turb(0.3*p+vec2(0.1*t,0.0),6); return sin(0.3*x)*cos(0.3*y)*TAU+sin(t)+nn*4.0; }
      if (uMode == 12) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); return log(r+1.0)*0.5*s+th+0.4*t+fBm(vec2(2.0*th,0.005*r),4)*3.0; }
      if (uMode == 13) { float n1=noise(0.5*p+vec2(t,0.0)),n2=noise(p-vec2(0.0,0.5*t)); return sin(n1*20.0)*cos(n2*15.0)*3.0+atan(uv.y-0.5,uv.x-0.5)*0.2; }
      if (uMode == 14) { float wave=sin(y+2.0*t)*0.15; return atan(sin(2.0*y+t),(uv.x-0.5-wave)*0.05)+cos(0.8*y+t)*2.0; }
      if (uMode == 15) { vec2 w=warp(0.3*p,0.3*t,6); return fBm(w,6)*8.0+sin(0.5*t)*2.0; }
      if (uMode == 16) { float n1=noise(0.8*p+vec2(0.3*t,0.0)),n2=noise(0.4*p+vec2(0.0,0.2*t)); return sin(n1*12.0+n2*8.0+t)*2.0+sin(0.6*x)*cos(0.6*y)*3.0; }
      if (uMode == 17) { float eps=0.01,h=fBm(0.2*p+vec2(0.05*t,0.0),8),gx=fBm(0.2*(p+vec2(eps,0.0))+vec2(0.05*t,0.0),8)-h,gy=fBm(0.2*(p+vec2(0.0,eps))+vec2(0.05*t,0.0),8)-h; return atan(gy,gx)+sin(30.0*h)*0.5; }
      if (uMode == 18) { vec2 mp=abs(uv-0.5)*s; return fBm(0.5*mp+vec2(0.2*t,0.0),4)*6.0+0.8*sin(mp.x-0.8*mp.y+t); }
      if (uMode == 19) { vec2 w1=warp(0.2*p,0.5*t,3),w2=warp(w1,0.3*t,2); return fBm(w2,5)*6.0+(-0.5+(1.0-uv.y)*0.8)*2.0+1.5*PI; }
      if (uMode == 20) { float ax=sin(x*4.0+t)*cos(y*3.0),ay=cos(x*3.0-t)*sin(y*4.0),nn=noise(p+vec2(0.1*t,0.0))*2.0; return atan(ay+nn,ax+nn); }
      if (uMode == 21) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); vec2 w=warp(0.1*p,0.2*t,5); return fBm(vec2(3.0*th+0.1*t,0.5*r),6)*5.0+sin(3.0*(w.x+w.y))*2.0+0.3*th; }
      if (uMode == 22) { float wx2=sin(2.0*x+t)*2.0,wy2=cos(2.0*y-0.7*t)*2.0,nn=noise(0.3*p+vec2(0.0,0.1*t)); return atan(sin(y+wx2),cos(x+wy2))+nn*2.0; }
      if (uMode == 23) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5),pull=1.0/(0.03*r+0.1); return th+pull*2.0+0.3*t+sin(0.1*r-2.0*t)*0.5; }
      if (uMode == 24) { float fy=uv.y,curt=sin(0.5*x+t+sin(8.0*fy+t)*2.0)*3.0; return curt+fBm(0.1*p+vec2(0.1*t,0.0),5)*4.0-PI/2.0; }
      if (uMode == 25) {
        float minD=99.0; vec2 np=vec2(0.0);
        for(int i=0;i<8;i++){ float a=TAU*float(i)/8.0+t*0.3; vec2 sd=vec2(0.5+0.4*cos(a),0.5+0.4*sin(a)); float d=length(uv-sd); if(d<minD){minD=d;np=sd;} }
        return atan(0.5-np.y,0.5-np.x)+0.3*sin(0.5*t);
      }
      if (uMode == 26) { vec2 srcs[3]; srcs[0]=vec2(0.3,0.5);srcs[1]=vec2(0.7,0.5);srcs[2]=vec2(0.5,0.3); float sum=0.0; for(int i=0;i<3;i++){float d=length(uv-srcs[i])*s;sum+=sin(0.2*d-t*(1.0+0.3*float(i)));} return sum; }
      if (uMode == 27) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5),yN=uv.y,w2=(1.0-yN)*0.3+0.05,sp=3.0/(r/s+0.1)*w2,tb=turb(vec2(2.0*th,5.0*yN+t),4); return th+sp+0.5*t+tb*2.0; }
      if (uMode == 28) { float sum=0.0; for(int i=0;i<6;i++){float a=TAU*float(i)/6.0+0.4*t;vec2 n2=vec2(0.5+0.35*cos(a),0.5+0.35*sin(a));float d=length(uv-n2)*s;sum+=sin(0.1*d+t+float(i))*exp(-0.05*d);} return sum*3.0; }
      if (uMode == 29) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5),spiral=th-0.6*log(r+1.0),arm=sin(spiral*2.0+0.3*t)*0.5; return th+arm+fBm(vec2(th*s,0.003*r+0.05*t),4)*2.0+PI/2.0; }
      if (uMode == 30) return sin(6.0*fBm(0.4*p+vec2(t,-t),4))+cos(4.0*fBm(0.6*p+vec2(0.0,t),3));
      if (uMode == 31) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); return th+4.0*sin(0.03*r-2.0*t)+2.0*noise(p+vec2(t,0.0)); }
      if (uMode == 32) { float nn=noise(p),dx2=noise(p+vec2(0.01,0.0))-nn,dy2=noise(p+vec2(0.0,0.01))-nn; return atan(dy2,dx2)+0.4*sin(18.0*nn); }
      if (uMode == 33) return sin(0.4*x+3.0*fBm(vec2(0.3*y,0.3*x+t),4))*cos(0.4*y-t);
      if (uMode == 34) return sin(1.2*x+t)+0.7*cos(1.8*y-0.6*t)+0.4*sin(x-y);
      if (uMode == 35) { float r=length(uv-0.5)*s; return sin(0.03*r-3.0*t)+0.5*sin(0.05*r+2.0*t); }
      if (uMode == 36) return sin(x+t)+sin(y-t)+sin(x+y+0.5*t);
      if (uMode == 37) return sin(x+5.0*fBm(0.6*p+vec2(0.0,t),5));
      if (uMode == 38) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); return th+8.0/(r+1.0)+sin(0.05*r-2.0*t); }
      if (uMode == 39) { vec2 w=warp(0.4*p,t,3); return fBm(w,5)*6.0+0.8*sin(0.2*t); }
      if (uMode == 40) { float gx=floor(x/6.0),gy=floor(y/6.0); return noise(vec2(0.4*gx+0.1*t,0.4*gy))*TAU+0.3*sin(gx+gy+t); }
      if (uMode == 41) { float eps=0.01,fb=fBm(0.3*p+vec2(0.05*t,0.0),6),gx=fBm(0.3*(p+vec2(eps,0.0))+vec2(0.05*t,0.0),6)-fb,gy=fBm(0.3*(p+vec2(0.0,eps))+vec2(0.05*t,0.0),6)-fb; return atan(gy,gx)+0.6*sin(x+y+t); }
      if (uMode == 42) { vec2 w=warp(0.2*p,0.2*t,4); return fBm(w,6)+0.3*sin(t); }
      if (uMode == 43) { float sum=0.0; for(int i=0;i<8;i++){float a=TAU*float(i)/8.0+0.1*t;vec2 an=vec2(0.5+0.4*cos(a),0.5+0.4*sin(a));float d=length(uv-an);sum+=atan(uv.y-an.y,uv.x-an.x)/(d*10.0+1.0);} return sum; }
      if (uMode == 44) { float fx=x/8.0+t,fy=y/8.0-t; return sin(TAU*fract(fx))+cos(TAU*fract(fy)); }
      if (uMode == 45) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); return th+0.004*r+sin(5.0*th-t); }
      if (uMode == 46) { float n1=noise(0.6*p+vec2(t,0.0)),n2=noise(0.6*p.yx-vec2(0.0,t)); return sin(0.5*x+4.0*n1)+cos(0.5*y-4.0*n2); }
      if (uMode == 47) return sin(0.8*x+t)*sin(0.8*y-t)+cos(1.2*(x-y));
      if (uMode == 48) { float sum=0.0; for(int i=0;i<5;i++){float a=TAU*float(i)/5.0+t*0.22;vec2 o=vec2(0.5+0.3*cos(a),0.5+0.3*sin(a));float d=length(uv-o)*s;sum+=atan(uv.y-o.y,uv.x-o.x)+0.2*sin(0.02*d-t);} return sum; }
      if (uMode == 49) return fBm(0.4*p+vec2(0.1*t,0.0),4)*5.0+0.7*(1.0-uv.y);
      if (uMode == 50) { float n1=noise(p+vec2(0.0,t)),n2=noise(p.yx-vec2(0.0,t)); return atan(sin(2.0*x+3.0*n1),cos(2.0*y-3.0*n2)); }
      if (uMode == 51) return fBm(0.2*p+vec2(0.05*t,-0.03*t),5)*4.0+0.4*sin(0.6*y+t);
      if (uMode == 52) return sin(0.3*x+t)*cos(0.3*y-t)+fBm(0.5*p+vec2(0.0,t),3)*2.0;
      if (uMode == 53) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); return sin(0.04*r-t)*cos(6.0*th+0.5*t); }
      if (uMode == 54) { float n1=noise(p+vec2(0.0,t)),n2=noise(p.yx-vec2(0.0,t)); return atan(sin(2.0*x+2.0*n1),cos(2.0*y-2.0*n2)); }
      if (uMode == 55) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); return fBm(0.2*p+vec2(0.0,0.04*t),5)*6.0+sin(0.02*r+th-t); }
      if (uMode == 56) return sin(x+t)+cos(y-t)+sin(x-y);
      if (uMode == 57) return sin(3.0*x+t)+sin(3.1*y-0.8*t);
      if (uMode == 58) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); return th+0.6*sin(0.025*r-t)+0.25*noise(p+vec2(0.0,0.1*t)); }
      /* 59 — Phantom Field (default) */
      vec2 w = warp(0.3*p, 0.15*t, 4);
      return fBm(w, 6)*7.0 + atan(uv.y-0.5, uv.x-0.5)*0.2;
    }

    void main() {
      float f   = formula(vUv, uTime, uScale * 10.0);
      float v   = f / (PI * 2.0);
      vec3  col = cyberColor(v);

      /* Fresnel rim glow */
      float fresnel = pow(1.0 - abs(dot(
        normalize(vNormal), vec3(0.0, 0.0, 1.0)
      )), 2.2);
      col += vec3(0.0, 0.9, 1.0) * fresnel * 0.5;

      /* Grid overlay */
      vec2  gr  = abs(fract(vUv * 20.0) - 0.5);
      float gl2 = 1.0 - smoothstep(0.0, 0.045, min(gr.x, gr.y));
      col = mix(col, col * 1.6 + vec3(0.0, 0.5, 0.8) * 0.22, gl2 * 0.26);

      /* Energy pulse */
      col *= 1.0 + uEnergy * 0.32 * sin(uTime * 8.0 + vUv.x * 5.0);

      /* Chaos speckle */
      col += noise(vUv * 88.0 + vec2(uTime * 0.7)) * uChaos * 0.06;

      /* Depth fog */
      float fog = 1.0 - smoothstep(3.0, 14.0, vDepth);
      col *= fog;

      col = clamp(col, 0.0, 3.0);
      gl_FragColor = vec4(col, 0.96);
    }
  `;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — POST-PROCESSING SHADERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* Chromatic Aberration — edge weighted */
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
        gl_Position = projectionMatrix *
                      modelViewMatrix *
                      vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float     uOffset;
      uniform float     uTime;
      varying vec2      vUv;
      void main() {
        vec2  c      = vUv - 0.5;
        float edge   = length(c);
        float offset = uOffset * (0.5 + edge * 1.5);
        float drift  = sin(uTime * 0.38) * 0.0003;
        float r = texture2D(tDiffuse,
          vUv + vec2( offset + drift, 0.0)).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse,
          vUv + vec2(-offset - drift, 0.0)).b;
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `
  };

  /* Film Grain + Vignette */
  const GrainShader = {
    uniforms: {
      tDiffuse:  { value: null },
      uTime:     { value: 0.0 },
      uGrain:    { value: 0.035 },
      uVignette: { value: 0.42 }
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix *
                      modelViewMatrix *
                      vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float     uTime;
      uniform float     uGrain;
      uniform float     uVignette;
      varying vec2      vUv;
      float rand(vec2 co) {
        return fract(
          sin(dot(co, vec2(12.9898, 78.233)))
          * 43758.5453123
        );
      }
      void main() {
        vec4  col   = texture2D(tDiffuse, vUv);
        float grain = rand(vUv + fract(uTime * 0.017))
                      * 2.0 - 1.0;
        col.rgb += grain * uGrain;
        vec2  ctr = vUv - 0.5;
        float vig = 1.0 - dot(ctr, ctr) * uVignette * 3.1;
        col.rgb  *= clamp(vig, 0.0, 1.0);
        gl_FragColor = col;
      }
    `
  };

  /* Edge Glow Material */
  const EdgeGlowMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:   { value: 0.0 },
      uEnergy: { value: 0.0 },
      uColor:  { value: new THREE.Color(0x00f0ff) }
    },
    vertexShader: /* glsl */`
      void main() {
        gl_Position = projectionMatrix *
                      modelViewMatrix *
                      vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uEnergy;
      uniform vec3  uColor;
      void main() {
        float pulse = 0.38 +
                      0.32 * sin(uTime * 2.1) +
                      uEnergy * 0.32;
        gl_FragColor = vec4(uColor * pulse, pulse);
      }
    `,
    transparent: true
  });


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — SHADER MATERIAL FACTORY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function createShaderMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader:   VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      uniforms: {
        uTime:    { value: 0.0 },
        uScale:   { value: params.scale },
        uChaos:   { value: params.chaos },
        uMode:    { value: params.presetIndex },
        uEnergy:  { value: 0.0 }
      },
      transparent: true,
      side:        THREE.DoubleSide,
      toneMapped:  false
    });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — CUBE CONSTRUCTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildCube() {
    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    /* Simple geometry — texture needs face quads only */
    const geo = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1);
    const mat = useTexMode ? textureMat : shaderMat;

    mainMesh = new THREE.Mesh(geo, mat);
    mainMesh.castShadow    = false;
    mainMesh.receiveShadow = false;
    cubeGroup.add(mainMesh);

    /* Edge accent lines */
    const edgeGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(2.014, 2.014, 2.014)
    );
    edgeMesh = new THREE.LineSegments(edgeGeo, EdgeGlowMat);
    cubeGroup.add(edgeMesh);

    /* Corner sphere nodes */
    const cornerGeo = new THREE.SphereGeometry(0.042, 8, 8);
    const cornerMat = new THREE.MeshBasicMaterial({
      color:       0x00f0ff,
      transparent: true,
      opacity:     0.82
    });

    const corners = [
      [-1,-1,-1],[-1,-1, 1],[-1, 1,-1],[-1, 1, 1],
      [ 1,-1,-1],[ 1,-1, 1],[ 1, 1,-1],[ 1, 1, 1]
    ];
    corners.forEach(c => {
      const m = new THREE.Mesh(cornerGeo, cornerMat);
      m.position.set(c[0], c[1], c[2]);
      cubeGroup.add(m);
    });
  }

  /**
   * switchMaterial — toggle live texture / shader overlay
   * @returns {boolean} true if now in texture mode
   */
  function switchMaterial() {
    useTexMode = !useTexMode;

    if (!mainMesh) return useTexMode;

    mainMesh.material = useTexMode ? textureMat : shaderMat;
    texSyncActive     = useTexMode;

    return useTexMode;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — INTERNAL INSTANCED PARTICLES
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildInternalParticles() {
    const geo = new THREE.SphereGeometry(0.022, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true
    });

    instanceMesh = new THREE.InstancedMesh(
      geo, mat, INSTANCE_COUNT
    );
    instanceMesh.instanceMatrix.setUsage(
      THREE.DynamicDrawUsage
    );
    instanceMesh.instanceColor =
      new THREE.InstancedBufferAttribute(
        new Float32Array(INSTANCE_COUNT * 3), 3
      );

    const dummy  = new THREE.Object3D();
    const colors = [
      new THREE.Color(0x00f0ff),
      new THREE.Color(0x8b00ff),
      new THREE.Color(0xffd700),
      new THREE.Color(0x00ff88),
      new THREE.Color(0xff2244)
    ];

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      instanceData.push({
        angle:  Math.random() * Math.PI * 2,
        radius: 0.15 + Math.random() * 0.72,
        speed:  (0.3 + Math.random() * 0.7) *
                (Math.random() > 0.5 ? 1 : -1),
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        phase: Math.random() * Math.PI * 2,
        size:  0.5 + Math.random()
      });

      dummy.position.set(
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6
      );
      dummy.scale.setScalar(instanceData[i].size * 0.55);
      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);

      const col = colors[i % colors.length];
      instanceMesh.instanceColor.setXYZ(
        i, col.r, col.g, col.b
      );
    }

    instanceMesh.instanceMatrix.needsUpdate = true;
    instanceMesh.instanceColor.needsUpdate  = true;
    scene.add(instanceMesh);
  }

  function updateInternalParticles(elapsed) {
    if (!instanceMesh) return;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const d = instanceData[i];
      d.angle += d.speed * 0.012 * params.speed;

      dummy.position.set(
        d.radius * (
          Math.cos(d.angle) * Math.sin(d.phase) +
          Math.sin(d.angle) * d.axis.z
        ),
        d.radius * (
          Math.cos(d.angle) * Math.cos(d.phase) -
          Math.sin(d.angle) * d.axis.x
        ),
        d.radius * (
          Math.sin(d.angle) * d.axis.y +
          Math.cos(d.angle + d.phase) * 0.3
        )
      );

      dummy.position.clampScalar(-0.88, 0.88);

      const sz = d.size *
                 (0.8 + 0.2 * Math.sin(elapsed * 2.0 + i));
      dummy.scale.setScalar(sz * 0.48);
      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);
    }

    instanceMesh.instanceMatrix.needsUpdate = true;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — POST-PROCESSING STACK
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildPostProcessing() {
    composer = new THREE.EffectComposer(renderer);

    /* Pass 1 — Render scene */
    composer.addPass(new THREE.RenderPass(scene, camera));

    /* Pass 2 — Unreal Bloom
       Applied after live texture render so particle
       trails on cube faces receive neon glow */
    bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(
        window.innerWidth,
        window.innerHeight
      ),
      params.bloom,  /* strength  */
      0.60,          /* radius    */
      0.18           /* threshold — low = more glows */
    );
    composer.addPass(bloomPass);

    /* Pass 3 — Chromatic Aberration */
    chromaPass = new THREE.ShaderPass(ChromaShader);
    chromaPass.uniforms.uOffset.value = 0.0026;
    composer.addPass(chromaPass);

    /* Pass 4 — Film Grain + Vignette (to screen) */
    grainPass = new THREE.ShaderPass(GrainShader);
    grainPass.renderToScreen = true;
    composer.addPass(grainPass);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — VORONOI SHATTER SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function shatter() {
    if (isShattered || shatterCooldown > 0) return;

    isShattered     = true;
    shatterCooldown = 180;

    /* Remove main cube */
    scene.remove(cubeGroup);

    /* Build shards */
    shardGroup = new THREE.Group();
    scene.add(shardGroup);

    const SHARDS = 32;

    for (let i = 0; i < SHARDS; i++) {
      const w   = 0.25 + Math.random() * 0.65;
      const h   = 0.25 + Math.random() * 0.65;
      const d   = 0.25 + Math.random() * 0.65;
      const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);

      /* Each shard shares the live CanvasTexture —
         formula keeps flowing on every fragment */
      let shardMat;
      if (useTexMode) {
        shardMat = new THREE.MeshBasicMaterial({
          map:        liveTexture,
          transparent: false,
          side:        THREE.DoubleSide,
          toneMapped:  false
        });
      } else {
        shardMat = createShaderMaterial();
        shardMat.uniforms.uMode.value  = params.presetIndex;
        shardMat.uniforms.uScale.value = params.scale;
        shardMat.uniforms.uChaos.value = params.chaos;
      }

      const mesh = new THREE.Mesh(geo, shardMat);

      /* Start position inside cube volume */
      mesh.position.set(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2
      );

      /* Initial rotation */
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      /* Physics velocity — explode outward */
      const str = 0.04 + Math.random() * 0.06;
      mesh.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * str * 2,
        (Math.random() - 0.5) * str * 2,
        (Math.random() - 0.5) * str * 2
      );
      mesh.userData.vel.add(
        mesh.position.clone()
          .normalize()
          .multiplyScalar(str)
      );

      /* Angular velocity */
      mesh.userData.angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.06,
        (Math.random() - 0.5) * 0.06,
        (Math.random() - 0.5) * 0.06
      );

      /* Edge lines */
      const eg = new THREE.EdgesGeometry(geo);
      const em = new THREE.LineBasicMaterial({
        color:       0x00f0ff,
        transparent: true,
        opacity:     0.65
      });
      mesh.add(new THREE.LineSegments(eg, em));

      shardGroup.add(mesh);
    }

    /* Auto-reassemble after 3.5 seconds */
    setTimeout(reassemble, 3500);
  }

  function reassemble() {
    if (!isShattered) return;

    /* Begin implode animation */
    if (shardGroup) {
      shardGroup.children.forEach(shard => {
        shard.userData.imploding = true;
        shard.userData.vel.set(0, 0, 0);
        shard.userData.angVel.multiplyScalar(0.3);
      });
    }

    /* Hard reset after short delay */
    setTimeout(() => {
      if (shardGroup) {
        scene.remove(shardGroup);
        shardGroup.children.forEach(s => {
          s.geometry.dispose();
          /* Don't dispose shared liveTexture */
          if (!useTexMode) s.material.dispose();
        });
        shardGroup = null;
      }
      isShattered = false;
      buildCube();
    }, 600);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 11 — POV MODE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function enablePOV() {
    isPOV = true;
    camera.position.set(0, 0, 0);
    camera.fov  = 110;
    camera.near = 0.01;
    camera.updateProjectionMatrix();

    /* BackSide so formula is visible from inside */
    if (mainMesh) mainMesh.material.side = THREE.BackSide;
  }

  function disablePOV() {
    isPOV = false;
    camera.position.set(0, 0, 4.5);
    camera.fov  = 55;
    camera.near = 0.1;
    camera.updateProjectionMatrix();

    if (mainMesh) mainMesh.material.side = THREE.DoubleSide;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 12 — MAIN RENDER LOOP
     Frame-perfect 2D → 3D texture sync
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function render() {
    animId = requestAnimationFrame(render);

    const delta   = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();
    const time    = elapsed * params.speed;

    /* ── Cooldowns ── */
    if (shatterCooldown > 0) shatterCooldown--;

    /* ── STEP 1: Update live texture ──────────────
       engine2d.js has already painted canvas2d
       this frame. Mark texture dirty → Three.js
       uploads canvas pixels to GPU on render.
    ─────────────────────────────────────────────*/
    updateLiveTexture();

    /* ── STEP 2: Shader mode uniforms ── */
    if (!useTexMode && shaderMat && shaderMat.uniforms) {
      shaderMat.uniforms.uTime.value   = time;
      shaderMat.uniforms.uScale.value  = params.scale;
      shaderMat.uniforms.uChaos.value  = params.chaos;
      shaderMat.uniforms.uMode.value   = params.presetIndex;
      shaderMat.uniforms.uEnergy.value = syncData.energy;
    }

    /* ── STEP 3: Auto-rotation (inversion applied) ──
       syncData.rotationDir = opposite of 2D direction
    ─────────────────────────────────────────────*/
    if (!isDragging && !isShattered && cubeGroup) {
      cubeGroup.rotation.y +=
        0.003 * params.rotation * syncData.rotationDir;
      cubeGroup.rotation.x +=
        0.0012 * params.rotation * syncData.rotationDir;
    }

    /* ── STEP 4: Scale inversion ──
       2D outward → scaleMult < 1 → cube implodes
    ─────────────────────────────────────────────*/
    if (cubeGroup) {
      const target = params.scale * syncData.scaleMult;
      cubeGroup.scale.lerp(
        new THREE.Vector3(target, target, target),
        0.042
      );
    }

    /* ── STEP 5: Shard physics ── */
    if (isShattered && shardGroup) {
      shardGroup.children.forEach(shard => {
        if (shard.userData.imploding) {
          shard.position.lerp(
            new THREE.Vector3(0, 0, 0),
            0.08
          );
        } else {
          shard.position.add(shard.userData.vel);
          shard.userData.vel.multiplyScalar(0.965);
        }
        shard.rotation.x += shard.userData.angVel.x;
        shard.rotation.y += shard.userData.angVel.y;
        shard.rotation.z += shard.userData.angVel.z;
        shard.userData.angVel.multiplyScalar(0.975);

        /* Fade edge opacity */
        shard.children.forEach(child => {
          if (child.material && child.material.opacity > 0) {
            child.material.opacity =
              Math.max(0, child.material.opacity - 0.005);
          }
        });

        /* Update shader uniforms on shards */
        if (!useTexMode &&
            shard.material &&
            shard.material.uniforms) {
          shard.material.uniforms.uTime.value   = time;
          shard.material.uniforms.uEnergy.value =
            syncData.energy;
        }
      });
    }

    /* ── STEP 6: Internal particle drift ── */
    updateInternalParticles(elapsed);

    /* ── STEP 7: POV camera slow drift ── */
    if (isPOV) {
      camera.rotation.y = Math.sin(elapsed * 0.08) * 0.28;
      camera.rotation.x = Math.cos(elapsed * 0.06) * 0.14;
      camera.rotation.z = Math.sin(elapsed * 0.04) * 0.05;
    }

    /* ── STEP 8: Edge glow ── */
    if (edgeMesh && EdgeGlowMat.uniforms) {
      EdgeGlowMat.uniforms.uTime.value   = elapsed;
      EdgeGlowMat.uniforms.uEnergy.value = syncData.energy;
    }

    /* ── STEP 9: Post-processing uniforms ── */
    if (bloomPass) {
      bloomPass.strength = params.bloom;
    }
    if (chromaPass) {
      chromaPass.uniforms.uTime.value   = elapsed;
      chromaPass.uniforms.uOffset.value =
        0.0016 + params.chaos * 0.004;
    }
    if (grainPass) {
      grainPass.uniforms.uTime.value  = elapsed;
      grainPass.uniforms.uGrain.value =
        0.020 + params.chaos * 0.026;
    }

    /* ── STEP 10: Render frame ──
       1. RenderPass → cube with live texture
       2. UnrealBloom → glow on particle trails
       3. ChromaPass → chromatic aberration
       4. GrainPass  → film grain + vignette → screen
    ─────────────────────────────────────────────*/
    composer.render(delta);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 13 — INTERACTION SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function setupInteraction(el) {

    /* ── Mouse ── */
    el.addEventListener('mousedown', e => {
      /* Only left button */
      if (e.button !== 0) return;
      isDragging = true;
      prevMouse  = { x: e.clientX, y: e.clientY };
      flickVel   = { x: 0, y: 0 };
      flickTimer = 0;
    });

    el.addEventListener('mousemove', e => {
      if (!isDragging || !cubeGroup) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      cubeGroup.rotation.y += dx * 0.007;
      cubeGroup.rotation.x += dy * 0.007;
      flickVel  = { x: dx, y: dy };
      prevMouse = { x: e.clientX, y: e.clientY };
      flickTimer = 3; /* frames of freshness */
    });

    el.addEventListener('mouseup', () => {
      isDragging = false;
      /* Flick detection — must be recent and fast */
      if (flickTimer > 0 &&
          Math.hypot(flickVel.x, flickVel.y) > 20) {
        shatter();
      }
    });

    el.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    /* Double-click → cycle palette */
    let lastClick = 0;
    el.addEventListener('click', e => {
      /* Skip if it was a drag */
      if (Math.hypot(flickVel.x, flickVel.y) > 4) return;
      const now = Date.now();
      if (now - lastClick < 300) {
        /* Double click — next palette */
        const u = mainMesh && mainMesh.material.uniforms;
        if (u && u.uPalette) {
          u.uPalette.value =
            (u.uPalette.value + 1) % 5;
        }
        if (window.Engine2D) {
          Engine2D.setPalette(
            (window._palIdx = (
              (window._palIdx || 0) + 1
            ) % 5)
          );
        }
      }
      lastClick = now;
    });

    /* ── Touch ── */
    let lastPinchDist = 0;
    let touchStartTime = 0;

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      touchStartTime = Date.now();

      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse  = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        flickVel   = { x: 0, y: 0 };
        flickTimer = 0;
      }

      if (e.touches.length === 2) {
        isDragging    = false;
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: false });

    el.addEventListener('touchmove', e => {
      e.preventDefault();

      /* Single finger — rotate cube */
      if (e.touches.length === 1 &&
          isDragging && cubeGroup) {
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        cubeGroup.rotation.y += dx * 0.007;
        cubeGroup.rotation.x += dy * 0.007;
        flickVel   = { x: dx, y: dy };
        prevMouse  = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        flickTimer = 3;
      }

      /* Two fingers — pinch zoom */
      if (e.touches.length === 2 &&
          lastPinchDist > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / lastPinchDist;
        camera.position.z = THREE.MathUtils.clamp(
          camera.position.z / factor,
          1.8, 14.0
        );
        lastPinchDist = dist;
      }
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      isDragging    = false;
      lastPinchDist = 0;

      /* Flick detection */
      if (e.touches.length === 0 &&
          flickTimer > 0 &&
          Math.hypot(flickVel.x, flickVel.y) > 22) {
        shatter();
      }

      flickTimer = Math.max(0, flickTimer - 1);
    }, { passive: false });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 14 — INIT & RESIZE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * init — bootstrap the 3D engine.
   * @param {HTMLCanvasElement} canvas3dEl  WebGL canvas
   * @param {HTMLCanvasElement} canvas2dEl  live texture source
   */
  function init(canvas3dEl, canvas2dEl) {

    clock = new THREE.Clock();

    /* ── Renderer ── */
    renderer = new THREE.WebGLRenderer({
      canvas:          canvas3dEl,
      antialias:       true,
      alpha:           true,     /* transparent bg */
      powerPreference: 'high-performance',
      stencil:         false,
      depth:           true
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding      = THREE.LinearEncoding;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    /* ── Scene ── */
    scene = new THREE.Scene();
    scene.background = null; /* transparent */

    /* ── Camera ── */
    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 4.5);

    /* ── Lighting ── */
    scene.add(new THREE.AmbientLight(0x001a30, 0.6));

    const pCyan = new THREE.PointLight(0x00f0ff, 3.0, 25);
    pCyan.position.set(4, 4, 6);
    scene.add(pCyan);

    const pViolet = new THREE.PointLight(0x8b00ff, 2.5, 25);
    pViolet.position.set(-4, -3, 5);
    scene.add(pViolet);

    const pGold = new THREE.PointLight(0xffd700, 1.2, 20);
    pGold.position.set(0, -5, -3);
    scene.add(pGold);

    /* ── CREATE LIVE TEXTURE ──────────────────────
       This is the core integration call.
       canvas2dEl is the 2D particle canvas.
       From this point the cube skin IS canvas2d.
    ─────────────────────────────────────────────*/
    createLiveTextureMaterial(canvas2dEl);

    /* Fallback shader material */
    shaderMat = createShaderMaterial();

    /* ── Build scene objects ── */
    buildCube();
    buildInternalParticles();

    /* ── Post-processing ── */
    buildPostProcessing();

    /* ── Interaction ── */
    setupInteraction(canvas3dEl);

    /* ── Resize handler ── */
    window.addEventListener('resize', onResize);

    console.info(
      '[Cube3D] Initialised. ' +
      'Mode: LIVE TEXTURE. ' +
      'Source: canvas2d → CanvasTexture → cube faces.'
    );
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

  function setPreset(index) {
    params.presetIndex = Math.max(0, Math.min(59, index | 0));
    if (!useTexMode && shaderMat) {
      shaderMat.uniforms.uMode.value = params.presetIndex;
    }
  }

  function setParams(p) {
    if (p.speed      !== undefined) params.speed      = p.speed;
    if (p.scale      !== undefined) params.scale      = p.scale;
    if (p.chaos      !== undefined) params.chaos      = p.chaos;
    if (p.bloom      !== undefined) params.bloom      = p.bloom;
    if (p.rotation   !== undefined) params.rotation   = p.rotation;
    if (p.texOpacity !== undefined) {
      params.texOpacity = p.texOpacity;
      if (textureMat) {
        textureMat.opacity     = p.texOpacity;
        textureMat.transparent = p.texOpacity < 1.0;
      }
    }
  }

  function setSyncData(data) {
    if (data.rotationDir !== undefined)
      syncData.rotationDir = data.rotationDir;
    if (data.scaleMult   !== undefined)
      syncData.scaleMult   = data.scaleMult;
    if (data.energy      !== undefined)
      syncData.energy      = data.energy;
  }

  function setBloom(v) {
    params.bloom = Math.max(0, Math.min(4, v));
    if (bloomPass) bloomPass.strength = params.bloom;
  }

  function triggerShatter() { shatter(); }

  function setPOV(enabled) {
    enabled ? enablePOV() : disablePOV();
  }

  function toggleTextureMode() {
    return switchMaterial();
  }

  function getTexSyncStatus() {
    return {
      active:      texSyncActive,
      updateCount: texUpdateCount,
      mode:        useTexMode ? 'LIVE_TEXTURE' : 'SHADER'
    };
  }

  function captureFrame() {
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
    setPOV,
    triggerShatter,
    toggleTextureMode,
    getTexSyncStatus,
    captureFrame
  };

})();
