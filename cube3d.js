/**
 * ═══════════════════════════════════════════════════════════════
 *  GeoZakhraf Xhaos Engine v2.0 — cube3d.js
 *
 *  CORE INTEGRATION: Live 2D → 3D Texture Mapping
 *  ─────────────────────────────────────────────
 *  The 2D particle canvas (canvas2d) is read every frame
 *  and applied directly onto the cube faces as a live skin.
 *
 *  This means:
 *  · Every particle trail painted by engine2d.js appears
 *    on the cube surface in real time
 *  · The cube IS the 2D field — wrapped in 3D space
 *  · All 60 formulas automatically manifest on the cube
 *    without any GLSL re-implementation needed
 *  · Post-processing (Bloom, Chroma, Grain) is applied
 *    ON TOP of the live texture for the cyber aesthetic
 *
 *  Modes:
 *  · LIVE TEXTURE MODE (default) — CanvasTexture from canvas2d
 *  · SHADER OVERLAY MODE         — GLSL ShaderMaterial fallback
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
  let cubeGroup     = null;   // parent group
  let mainMesh      = null;   // the cube with live texture
  let edgeMesh      = null;   // wireframe edge accent
  let innerGroup    = null;   // internal constellation
  let instanceMesh  = null;   // instanced internal particles
  let shardGroup    = null;   // shatter shards

  /* ── LIVE TEXTURE SYSTEM ── */
  let canvas2dEl    = null;   // reference to canvas2d DOM element
  let liveTexture   = null;   // THREE.CanvasTexture wrapping canvas2d
  let textureMat    = null;   // MeshBasicMaterial using liveTexture
  let shaderMat     = null;   // fallback ShaderMaterial
  let useTexMode    = true;   // true = live texture, false = shader

  /* Engine State */
  let animId        = null;
  let clock         = null;
  let isShattered   = false;
  let shatterCooldown = 0;
  let isPOV         = false;
  let isDragging    = false;

  /* Interaction */
  let prevMouse     = { x: 0, y: 0 };
  let flickVel      = { x: 0, y: 0 };

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
    texOpacity:   1.0    /* NEW: texture depth/opacity */
  };

  /* Internal particle orbital data */
  const INSTANCE_COUNT = 500;
  const instanceData   = [];

  /* Texture update metrics */
  let texUpdateCount   = 0;
  let texSyncActive    = true;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 2 — LIVE TEXTURE MATERIAL
     MeshBasicMaterial reading canvas2d in real time
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * createLiveTextureMaterial
   *
   * Reads the 2D particle canvas directly and wraps it
   * in a THREE.CanvasTexture. This texture is set as
   * the map of a MeshBasicMaterial applied to the cube.
   *
   * THREE.CanvasTexture automatically marks itself dirty
   * when we set needsUpdate = true each frame, causing
   * Three.js to re-upload the canvas pixel data to the GPU.
   *
   * The result: every particle drawn on canvas2d by
   * engine2d.js appears on the cube face in the same frame.
   *
   * @param  {HTMLCanvasElement} sourceCanvas  the canvas2d element
   * @return {THREE.MeshBasicMaterial}
   */
  function createLiveTextureMaterial(sourceCanvas) {
    canvas2dEl = sourceCanvas;

    /* Create CanvasTexture from the 2D canvas element */
    liveTexture = new THREE.CanvasTexture(sourceCanvas);

    /* Texture filtering settings
       LinearFilter gives smooth interpolation across cube faces
       rather than pixelated nearest-neighbour */
    liveTexture.minFilter    = THREE.LinearFilter;
    liveTexture.magFilter    = THREE.LinearFilter;

    /* Wrapping — ClampToEdge prevents texture bleeding
       at cube seams */
    liveTexture.wrapS        = THREE.ClampToEdgeWrapping;
    liveTexture.wrapT        = THREE.ClampToEdgeWrapping;

    /* Encoding — keep as Linear for HDR bloom pipeline */
    liveTexture.encoding     = THREE.LinearEncoding;

    /* Generate mipmaps false — we update every frame so
       mipmaps would just waste GPU time */
    liveTexture.generateMipmaps = false;

    /* Build the material */
    textureMat = new THREE.MeshBasicMaterial({
      map:         liveTexture,
      transparent: false,
      side:        THREE.DoubleSide,
      /* toneMapped false lets bloom see the bright
         particle trails at full HDR value */
      toneMapped:  false
    });

    return textureMat;
  }

  /**
   * updateLiveTexture — called every frame in the render loop.
   *
   * Setting needsUpdate = true tells Three.js to re-upload
   * the canvas pixel data to the GPU texture buffer.
   * This is the key call that makes the cube skin update
   * in sync with the 2D particle animation.
   *
   * Performance note: CanvasTexture upload is a gl.texImage2D
   * call which copies canvas pixels to GPU memory. At 60 FPS
   * this is acceptable for modern hardware. On low-end mobile
   * this can be throttled to every 2nd frame.
   */
  function updateLiveTexture() {
    if (!liveTexture || !useTexMode) return;

    /* Mark texture dirty — Three.js will re-upload on next render */
    liveTexture.needsUpdate = true;
    texUpdateCount++;
    texSyncActive = true;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 3 — FALLBACK GLSL SHADER MATERIAL
     Used when useTexMode = false
     Allows independent 3D formula rendering
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

    float hash(vec2 p) {
      p = fract(p * vec2(127.1, 311.7));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(
        mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), u.x),
        mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x),
        u.y
      ) * 2.0 - 1.0;
    }

    float fBm(vec2 p, int oct) {
      float v=0.0, a=0.5;
      for(int i=0;i<8;i++){
        if(i>=oct) break;
        v+=a*noise(p); p*=2.0; a*=0.5;
      }
      return v;
    }

    float turb(vec2 p, int oct) {
      float v=0.0, a=0.5;
      for(int i=0;i<8;i++){
        if(i>=oct) break;
        v+=a*abs(noise(p)); p*=2.0; a*=0.5;
      }
      return v;
    }

    vec2 warp(vec2 p, float t, int iters) {
      for(int i=0;i<6;i++){
        if(i>=iters) break;
        float s=1.0/float(i+1);
        p += s*0.8*vec2(
          noise(p+vec2(0.3*t+float(i)*3.7, 1.7+float(i)*2.1)),
          noise(p+vec2(3.1+0.2*t+float(i)*1.9, 2.3+float(i)*4.3))
        );
      }
      return p;
    }

    /* Cybernetic colour gradient */
    vec3 cyberColor(float v) {
      v = fract(v * 0.5 + 0.5);
      vec3 a = vec3(0.0,  0.94, 1.0 );
      vec3 b = vec3(0.545,0.0,  1.0 );
      vec3 c = vec3(1.0,  0.843,0.0 );
      vec3 d = vec3(1.0,  0.133,0.267);
      if(v < 0.25) return mix(a, b, v/0.25);
      if(v < 0.50) return mix(b, c, (v-0.25)/0.25);
      if(v < 0.75) return mix(c, d, (v-0.50)/0.25);
      return mix(d, a, (v-0.75)/0.25);
    }

    /* Formula dispatcher — subset for overlay mode */
    float formula(vec2 uv, float t, float s) {
      float x = uv.x * s, y = uv.y * s;
      vec2  p = vec2(x, y);

      if(uMode==0)  return (sin(0.3*x+t)+cos(0.3*y+t))*2.2+fBm(0.3*p,4)*3.0;
      if(uMode==1)  { vec2 w=warp(0.4*p,t,2); return sin(w.x+0.7*t)*cos(w.y-0.5*t)*4.0; }
      if(uMode==2)  { float tb=turb(0.2*p,5); return (sin(0.3*(x+y)+t+tb*4.0)-cos(0.3*(x-y)-t))*2.5; }
      if(uMode==3)  { float r=length(uv-0.5)*s; return atan(uv.y-0.5,uv.x-0.5)+0.6*t+sin(0.8*r-t)*0.5; }
      if(uMode==4)  { float gx=floor(x/4.0),gy=floor(y/4.0),cell=noise(vec2(0.5*gx,0.5*gy+0.3*t)); return (gx+gy)*0.5*cell+0.1*t+sin(cell*TAU)*2.0; }
      if(uMode==5)  { float bx=round(x/7.0),by=round(y/7.0),nn=noise(vec2(bx+0.2*t,by)); return (bx+by)*0.22+sin(t+nn*8.0)+cos(nn*PI)*2.0; }
      if(uMode==6)  { float nn=fBm(0.3*p+vec2(0.2*t,0.0),6); return sin(0.5*(x+y)+t+nn*5.0)+cos(0.5*(x-y)-t+nn*3.0); }
      if(uMode==7)  { vec2 w=warp(0.2*p,t,4); return sin(w.x+t)*cos(w.y+t)*5.0+turb(0.1*p,3)*3.0; }
      if(uMode==8)  { float r=length(uv-0.5)*s; return sin(0.02*r+t)*2.2+0.35*cos(0.4*y-0.5*t); }
      if(uMode==9)  { float nn=noise(0.5*p+vec2(0.0,0.1*t)); return sin(0.9*x+sin(0.6*y+t))+cos(0.9*y+cos(0.6*x+t))+nn*2.0; }
      if(uMode==10) { float sum=0.0; vec2 poles[4]; poles[0]=vec2(0.25,0.5);poles[1]=vec2(0.75,0.5);poles[2]=vec2(0.5,0.25);poles[3]=vec2(0.5,0.75); float signs[4]; signs[0]=1.0;signs[1]=-1.0;signs[2]=1.0;signs[3]=-1.0; for(int i=0;i<4;i++) sum+=atan(uv.y-poles[i].y,uv.x-poles[i].x)*signs[i]; return sum/4.0+0.3*sin(t); }
      if(uMode==11) { float nn=turb(0.3*p+vec2(0.1*t,0.0),6); return sin(0.3*x)*cos(0.3*y)*TAU+sin(t)+nn*4.0; }
      if(uMode==12) { float r=length(uv-0.5)*s,th=atan(uv.y-0.5,uv.x-0.5); return log(r+1.0)*0.5*s+th+0.4*t+fBm(vec2(2.0*th,0.005*r),4)*3.0; }
      if(uMode==13) { float n1=noise(0.5*p+vec2(t,0.0)),n2=noise(p-vec2(0.0,0.5*t)); return sin(n1*20.0)*cos(n2*15.0)*3.0+atan(uv.y-0.5,uv.x-0.5)*0.2; }
      if(uMode==14) { float wave=sin(y+2.0*t)*0.15; return atan(sin(2.0*y+t),(uv.x-0.5-wave)*0.05)+cos(0.8*y+t)*2.0; }
      if(uMode==15) { vec2 w=warp(0.3*p,0.3*t,6); return fBm(w,6)*8.0+sin(0.5*t)*2.0; }
      if(uMode==16) { float n1=noise(0.8*p+vec2(0.3*t,0.0)),n2=noise(0.4*p+vec2(0.0,0.2*t)); return sin(n1*12.0+n2*8.0+t)*2.0+sin(0.6*x)*cos(0.6*y)*3.0; }
      if(uMode==17) { float h=fBm(0.2*p+vec2(0.05*t,0.0),8),gx=fBm(0.2*(p+vec2(0.01,0.0))+vec2(0.05*t,0.0),8)-h,gy=fBm(0.2*(p+vec2(0.0,0.01))+vec2(0.05*t,0.0),8)-h; return atan(gy,gx)+sin(30.0*h)*0.5; }
      if(uMode==18) { vec2 mp=abs(uv-0.5)*s; return fBm(0.5*mp+vec2(0.2*t,0.0),4)*6.0+0.8*sin(mp.x-0.8*mp.y+t); }
      if(uMode==19) { vec2 w1=warp(0.2*p,0.5*t,3),w2=warp(w1,0.3*t,2); return fBm(w2,5)*6.0+(-0.5+(1.0-uv.y)*0.8)*2.0+1.5*PI; }
      /* modes 20-59 follow same pattern — abbreviated for length */
      vec2 w=warp(0.3*p,0.15*t,4);
      return fBm(w,6)*7.0+atan(uv.y-0.5,uv.x-0.5)*0.2;
    }

    void main() {
      float f       = formula(vUv, uTime, uScale * 10.0);
      float v       = f / (PI * 2.0);
      vec3  col     = cyberColor(v);

      /* Fresnel rim */
      float fresnel = pow(1.0-abs(dot(normalize(vNormal),vec3(0,0,1))),2.2);
      col += vec3(0.0,0.9,1.0)*fresnel*0.55;

      /* Grid overlay */
      vec2  gr  = abs(fract(vUv*22.0)-0.5);
      float gl2 = 1.0-smoothstep(0.0,0.045,min(gr.x,gr.y));
      col = mix(col, col*1.7+vec3(0.0,0.5,0.8)*0.25, gl2*0.28);

      /* Energy pulse */
      col *= 1.0 + uEnergy*0.35*sin(uTime*8.0+vUv.x*6.0);

      /* Chaos speckle */
      col += noise(vUv*90.0+vec2(uTime*0.7,uTime*0.3))*uChaos*0.07;

      col = clamp(col, 0.0, 3.0);
      gl_FragColor = vec4(col, 0.96);
    }
  `;

  /**
   * createShaderMaterial — fallback GLSL material
   * used in overlay mode when useTexMode = false
   */
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
     SECTION 4 — POST-PROCESSING SHADERS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* Chromatic Aberration — edge-weighted */
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
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
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
        float offset = uOffset*(0.5+edge*1.5);
        float drift  = sin(uTime*0.4)*0.0003;
        float r = texture2D(tDiffuse, vUv+vec2( offset+drift, 0.0)).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv+vec2(-offset-drift, 0.0)).b;
        gl_FragColor = vec4(r,g,b,1.0);
      }
    `
  };

  /* Film Grain + Vignette */
  const GrainShader = {
    uniforms: {
      tDiffuse:  { value: null },
      uTime:     { value: 0.0 },
      uGrain:    { value: 0.038 },
      uVignette: { value: 0.45 }
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float     uTime;
      uniform float     uGrain;
      uniform float     uVignette;
      varying vec2      vUv;
      float rand(vec2 co){
        return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453123);
      }
      void main() {
        vec4  col   = texture2D(tDiffuse, vUv);
        float grain = rand(vUv+fract(uTime*0.017))*2.0-1.0;
        col.rgb    += grain*uGrain;
        vec2  ctr   = vUv-0.5;
        float vig   = 1.0-dot(ctr,ctr)*uVignette*3.2;
        col.rgb    *= clamp(vig,0.0,1.0);
        gl_FragColor = col;
      }
    `
  };

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 5 — EDGE GLOW SHADER
     Applied to edge lines — makes them pulse
     with the energy of the live texture
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  const EdgeGlowMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:   { value: 0.0 },
      uEnergy: { value: 0.0 },
      uColor:  { value: new THREE.Color(0x00f0ff) }
    },
    vertexShader: /* glsl */`
      void main() {
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float     uTime;
      uniform float     uEnergy;
      uniform vec3      uColor;
      void main() {
        float pulse   = 0.4+0.35*sin(uTime*2.2)+uEnergy*0.35;
        gl_FragColor  = vec4(uColor*pulse, pulse);
      }
    `,
    transparent: true
  });


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 6 — CUBE CONSTRUCTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * buildCube — constructs the main cube mesh.
   *
   * In LIVE TEXTURE MODE:
   *   Uses MeshBasicMaterial with liveTexture (CanvasTexture).
   *   The cube literally wears the 2D canvas as its skin.
   *   UV mapping is automatic — BoxGeometry maps each face
   *   to the full [0,1]×[0,1] UV space, so each face shows
   *   the complete 2D particle field.
   *
   * In SHADER OVERLAY MODE:
   *   Uses ShaderMaterial with independent GLSL formula.
   */
  function buildCube() {
    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    /* High-poly geometry for smooth texture display */
    const geo = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1);
    /*
      Note: We use 1,1,1 segments here (not 48,48,48)
      because the texture mapping only needs the 6 face quads.
      Higher segment counts would subdivide the faces but since
      MeshBasicMaterial doesn't do lighting calculations,
      sub-division adds no visual benefit for texture display.
      This also saves GPU vertex processing time.
    */

    /* Get the active material based on current mode */
    const mat = useTexMode ? textureMat : shaderMat;
    mainMesh  = new THREE.Mesh(geo, mat);
    mainMesh.castShadow    = false;
    mainMesh.receiveShadow = false;
    cubeGroup.add(mainMesh);

    /* Edge accent lines */
    const edgeGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(2.012, 2.012, 2.012)
    );
    edgeMesh = new THREE.LineSegments(edgeGeo, EdgeGlowMat);
    cubeGroup.add(edgeMesh);

    /* Corner marker spheres */
    const cornerGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const cornerMat = new THREE.MeshBasicMaterial({
      color:       0x00f0ff,
      transparent: true,
      opacity:     0.85
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
   * switchMaterial — toggle between live texture and shader mode.
   * Called by the UI "LIVE TEX" button or T key.
   */
  function switchMaterial() {
    useTexMode = !useTexMode;

    if (!mainMesh) return;

    if (useTexMode) {
      /* Switch to live texture */
      mainMesh.material = textureMat;
      texSyncActive     = true;
    } else {
      /* Switch to GLSL shader overlay */
      mainMesh.material = shaderMat;
      texSyncActive     = false;
    }

    return useTexMode;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 7 — INTERNAL INSTANCED PARTICLES
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildInternalParticles() {
    innerGroup  = new THREE.Group();
    scene.add(innerGroup);

    const geo = new THREE.SphereGeometry(0.022, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });

    instanceMesh = new THREE.InstancedMesh(geo, mat, INSTANCE_COUNT);
    instanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instanceMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(INSTANCE_COUNT * 3), 3
    );

    const dummy    = new THREE.Object3D();
    const colors   = [
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
      dummy.scale.setScalar(instanceData[i].size * 0.6);
      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);

      const col = colors[i % colors.length];
      instanceMesh.instanceColor.setXYZ(i, col.r, col.g, col.b);
    }

    instanceMesh.instanceMatrix.needsUpdate = true;
    instanceMesh.instanceColor.needsUpdate  = true;
    innerGroup.add(instanceMesh);
  }

  function updateInternalParticles(elapsed) {
    if (!instanceMesh) return;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const d = instanceData[i];
      d.angle += d.speed * 0.012 * params.speed;

      const cosA = Math.cos(d.angle);
      const sinA = Math.sin(d.angle);

      dummy.position.set(
        d.radius * (cosA * Math.sin(d.phase) + sinA * d.axis.z),
        d.radius * (cosA * Math.cos(d.phase) - sinA * d.axis.x),
        d.radius * (sinA * d.axis.y + Math.cos(d.angle + d.phase) * 0.3)
      );
      dummy.position.clampScalar(-0.88, 0.88);

      const sz = d.size * (0.8 + 0.2 * Math.sin(elapsed * 2.0 + i));
      dummy.scale.setScalar(sz * 0.5);
      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);
    }

    instanceMesh.instanceMatrix.needsUpdate = true;
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 8 — POST-PROCESSING STACK
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function buildPostProcessing() {
    composer = new THREE.EffectComposer(renderer);

    /* Pass 1 — Render scene (cube with live texture) */
    composer.addPass(new THREE.RenderPass(scene, camera));

    /* Pass 2 — Unreal Bloom
       Applied AFTER the live texture is rendered,
       so the bright particle trails on the cube faces
       receive the neon glow effect */
    bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      params.bloom,
      0.60,
      0.18   /* lower threshold so particle trails bloom */
    );
    composer.addPass(bloomPass);

    /* Pass 3 — Chromatic Aberration */
    chromaPass = new THREE.ShaderPass(ChromaShader);
    chromaPass.uniforms.uOffset.value = 0.0028;
    composer.addPass(chromaPass);

    /* Pass 4 — Film Grain + Vignette (final output) */
    grainPass = new THREE.ShaderPass(GrainShader);
    grainPass.renderToScreen = true;
    composer.addPass(grainPass);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 9 — VORONOI SHATTER SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function shatter() {
    if (isShattered || shatterCooldown > 0) return;

    isShattered     = true;
    shatterCooldown = 180;

    scene.remove(cubeGroup);

    shardGroup = new THREE.Group();
    scene.add(shardGroup);

    const SHARDS = 32;

    for (let i = 0; i < SHARDS; i++) {
      const w   = 0.25 + Math.random() * 0.65;
      const h   = 0.25 + Math.random() * 0.65;
      const d   = 0.25 + Math.random() * 0.65;
      const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);

      /*
        CRITICAL: Each shard also uses the live texture material.
        This means the 2D particle animation continues to play
        on every broken fragment simultaneously.
        The cube shatters but the formula keeps flowing.
      */
      let shardMat;
      if (useTexMode) {
        /* Share the same CanvasTexture across all shards —
           no extra GPU memory, all shards update together */
        shardMat = new THREE.MeshBasicMaterial({
          map:        liveTexture,
          transparent: false,
          side:       THREE.DoubleSide,
          toneMapped: false
        });
      } else {
        shardMat = createShaderMaterial();
        shardMat.uniforms.uMode.value  = params.presetIndex;
        shardMat.uniforms.uScale.value = params.scale;
        shardMat.uniforms.uChaos.value = params.chaos;
      }

      const mesh = new THREE.Mesh(geo, shardMat);
      mesh.position.set(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2
      );
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      const str = 0.04 + Math.random() * 0.06;
      mesh.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * str * 2,
        (Math.random() - 0.5) * str * 2,
        (Math.random() - 0.5) * str * 2
      );
      mesh.userData.vel.add(
        mesh.position.clone().normalize().multiplyScalar(str)
      );
      mesh.userData.angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.06,
        (Math.random() - 0.5) * 0.06,
        (Math.random() - 0.5) * 0.06
      );

      /* Edge lines on each shard */
      const eg  = new THREE.EdgesGeometry(geo);
      const em  = new THREE.LineBasicMaterial({
        color: 0x00f0ff, transparent: true, opacity: 0.7
      });
      mesh.add(new THREE.LineSegments(eg, em));

      shardGroup.add(mesh);
    }

    setTimeout(reassemble, 3500);
  }

  function reassemble() {
    if (!isShattered) return;

    if (shardGroup) {
      shardGroup.children.forEach(s => {
        s.userData.imploding = true;
        s.userData.vel.set(0, 0, 0);
        s.userData.angVel.multiplyScalar(0.3);
      });
    }

    setTimeout(() => {
      if (shardGroup) {
        scene.remove(shardGroup);
        shardGroup.children.forEach(s => {
          s.geometry.dispose();
          /* Don't dispose shared liveTexture material */
          if (!useTexMode) s.material.dispose();
        });
        shardGroup = null;
      }
      isShattered = false;
      buildCube();
    }, 600);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 10 — POV MODE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function enablePOV() {
    isPOV = true;
    camera.position.set(0, 0, 0);
    camera.fov  = 110;
    camera.near = 0.01;
    camera.updateProjectionMatrix();

    /*
      In POV mode with live texture, we switch the
      material side to BackSide so the 2D particle field
      is visible from inside the cube looking outward.
      The experience: standing inside a living mathematical space.
    */
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
     SECTION 11 — MAIN RENDER LOOP
     Frame-perfect sync between 2D canvas and 3D texture
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function render() {
    animId = requestAnimationFrame(render);

    const delta   = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();
    const time    = elapsed * params.speed;

    /* ── STEP 1: Update Cooldowns ── */
    if (shatterCooldown > 0) shatterCooldown--;

    /* ── STEP 2: LIVE TEXTURE UPDATE ─────────────────
       This is the core integration call.

       At this point in the frame:
       · engine2d.js has already rendered its particles
         onto canvas2d for this frame
       · We now mark the CanvasTexture as needing update
       · Three.js will re-upload canvas2d pixels to GPU
         during the composer.render() call below
       · The result: cube faces show this frame's
         particle state — perfect frame sync

       Execution order guaranteed by script load order:
       engine2d render → cube3d updateLiveTexture → composer.render
    ─────────────────────────────────────────────── */
    updateLiveTexture();

    /* ── STEP 3: Update Shader Mode Uniforms ── */
    if (!useTexMode && shaderMat && shaderMat.uniforms) {
      shaderMat.uniforms.uTime.value   = time;
      shaderMat.uniforms.uScale.value  = params.scale;
      shaderMat.uniforms.uChaos.value  = params.chaos;
      shaderMat.uniforms.uMode.value   = params.presetIndex;
      shaderMat.uniforms.uEnergy.value = syncData.energy;
    }

    /* ── STEP 4: Auto-Rotation with Inversion ──
       syncData.rotationDir is set by SyncController:
       +1 if 2D is CCW, -1 if 2D is CW
       This ensures 3D always rotates opposite to 2D */
    if (!isDragging && !isShattered && cubeGroup) {
      cubeGroup.rotation.y +=
        0.003 * params.rotation * syncData.rotationDir;
      cubeGroup.rotation.x +=
        0.0012 * params.rotation * syncData.rotationDir;
    }

    /* ── STEP 5: Scale Inversion ──
       syncData.scaleMult < 1 when 2D flows outward
       (cube implodes as 2D expands — inversion symmetry) */
    if (cubeGroup) {
      const target = params.scale * syncData.scaleMult;
      cubeGroup.scale.lerp(
        new THREE.Vector3(target, target, target),
        0.04
      );
    }

    /* ── STEP 6: Shard Physics ── */
    if (isShattered && shardGroup) {
      shardGroup.children.forEach(shard => {
        if (shard.userData.imploding) {
          shard.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
        } else {
          shard.position.add(shard.userData.vel);
          shard.userData.vel.multiplyScalar(0.965);
        }
        shard.rotation.x += shard.userData.angVel.x;
        shard.rotation.y += shard.userData.angVel.y;
        shard.rotation.z += shard.userData.angVel.z;
        shard.userData.angVel.multiplyScalar(0.975);

        /* Fade shard edges */
        shard.children.forEach(child => {
          if (child.material && child.material.opacity > 0) {
            child.material.opacity -= 0.005;
          }
        });
      });
    }

    /* ── STEP 7: Internal Particles ── */
    updateInternalParticles(elapsed);

    /* ── STEP 8: POV Camera Drift ── */
    if (isPOV) {
      camera.rotation.y = Math.sin(elapsed * 0.08) * 0.28;
      camera.rotation.x = Math.cos(elapsed * 0.06) * 0.14;
      camera.rotation.z = Math.sin(elapsed * 0.04) * 0.06;
    }

    /* ── STEP 9: Edge Glow Update ── */
    if (edgeMesh && EdgeGlowMat.uniforms) {
      EdgeGlowMat.uniforms.uTime.value   = elapsed;
      EdgeGlowMat.uniforms.uEnergy.value = syncData.energy;
    }

    /* ── STEP 10: Post-Processing Uniforms ── */
    if (bloomPass) {
      bloomPass.strength = params.bloom;
    }
    if (chromaPass) {
      chromaPass.uniforms.uTime.value   = elapsed;
      chromaPass.uniforms.uOffset.value =
        0.0018 + params.chaos * 0.004;
    }
    if (grainPass) {
      grainPass.uniforms.uTime.value  = elapsed;
      grainPass.uniforms.uGrain.value = 0.022 + params.chaos * 0.028;
    }

    /* ── STEP 11: Render Frame ──
       composer.render() internally calls:
       1. RenderPass     → draws cube with live texture
       2. UnrealBloomPass → adds glow to bright particle trails
       3. ChromaPass     → chromatic aberration
       4. GrainPass      → film grain + vignette → screen
    ── */
    composer.render(delta);
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 12 — INTERACTION SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function setupInteraction(el) {

    /* Mouse drag */
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
      if (Math.hypot(flickVel.x, flickVel.y) > 20) shatter();
    });

    el.addEventListener('mouseleave', () => { isDragging = false; });

    /* Double-click → switch texture/shader mode */
    let lastClick = 0;
    el.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastClick < 300) switchMaterial();
      lastClick = now;
    });

    /* Touch */
    let lastPinchDist = 0;

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse  = { x: e.touches[0].clientX,
                       y: e.touches[0].clientY };
        flickVel   = { x: 0, y: 0 };
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
      if (e.touches.length === 1 && isDragging && cubeGroup) {
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        cubeGroup.rotation.y += dx * 0.007;
        cubeGroup.rotation.x += dy * 0.007;
        flickVel  = { x: dx, y: dy };
        prevMouse = { x: e.touches[0].clientX,
                      y: e.touches[0].clientY };
      }
      if (e.touches.length === 2 && lastPinchDist > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        camera.position.z = THREE.MathUtils.clamp(
          camera.position.z * (lastPinchDist / dist),
          2.0, 14.0
        );
        lastPinchDist = dist;
      }
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      isDragging    = false;
      lastPinchDist = 0;
      if (Math.hypot(flickVel.x, flickVel.y) > 22 &&
          e.touches.length === 0) shatter();
    }, { passive: false });
  }


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SECTION 13 — INIT & RESIZE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /**
   * init — bootstrap the 3D engine.
   *
   * @param {HTMLCanvasElement} canvas3dEl  the 3D rendering canvas
   * @param {HTMLCanvasElement} canvas2dEl  the 2D source canvas
   *                                        used as live texture
   */
  function init(canvas3dEl, canvas2dEl) {

    clock = new THREE.Clock();

    /* ── Renderer ── */
    renderer = new THREE.WebGLRenderer({
      canvas:          canvas3dEl,
      antialias:       true,
      alpha:           true,    /* transparent bg — 2D canvas glows through */
      powerPreference: 'high-performance',
      stencil:         false,
      depth:           true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    /* ── Lighting (for internal particles) ── */
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

    /* ── CREATE LIVE TEXTURE FROM canvas2d ──
       This is the integration handshake.
       We pass the 2D canvas element to createLiveTextureMaterial()
       which wraps it in a THREE.CanvasTexture and builds
       the MeshBasicMaterial. From this point forward,
       every call to liveTexture.needsUpdate = true will
       cause the 2D particle state to appear on the cube. */
    createLiveTextureMaterial(canvas2dEl);

    /* Also create the shader fallback (not displayed yet) */
    shaderMat = createShaderMaterial();

    /* ── Build Scene Objects ── */
    buildCube();
    buildInternalParticles();

    /* ── Post-Processing ── */
    buildPostProcessing();

    /* ── Interaction ── */
    setupInteraction(canvas3dEl);

    /* ── Resize ── */
    window.addEventListener('resize', onResize);

    console.info(
      '[Cube3D] Initialised. Mode: LIVE TEXTURE. ' +
      'Source: canvas2d → CanvasTexture → MeshBasicMaterial'
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

  function start() { if (!animId) render(); }

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function setPreset(index) {
    params.presetIndex = Math.max(0, Math.min(59, index | 0));
    /* In live tex mode the preset change is already visible
       on canvas2d — no extra action needed here.
       In shader mode, update the uniform. */
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
      if (textureMat) textureMat.opacity = p.texOpacity;
    }
  }

  function setSyncData(data) {
    if (data.rotationDir !== undefined) syncData.rotationDir = data.rotationDir;
    if (data.scaleMult   !== undefined) syncData.scaleMult   = data.scaleMult;
    if (data.energy      !== undefined) syncData.energy      = data.energy;
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
