/**
 * Xoretex Xhaos Cube — cube3d.js
 * COMPLETE FIXED VERSION — single file
 * Guaranteed to work with local or CDN Three.js
 */

'use strict';

// ============================================================
// BOOT: wait for Three.js to be available, then init
// ============================================================
(function waitForThree() {
  if (typeof THREE !== 'undefined') {
    console.log('[cube3d] Three.js detected, initializing...');
    try {
      startCubeEngine();
    } catch (err) {
      console.error('[cube3d] Fatal:', err);
      showCubeError('Cube init failed: ' + err.message);
    }
  } else {
    // retry up to 50 times (10 seconds)
    if (!window._threeRetries) window._threeRetries = 0;
    window._threeRetries++;
    if (window._threeRetries > 50) {
      console.warn('[cube3d] Three.js never loaded');
      showCubeError('Three.js not loaded — 3D cube disabled');
      window.setCubeVisible = function() {};
      window.nextCubePattern = function() {};
      return;
    }
    setTimeout(waitForThree, 200);
  }
})();

function showCubeError(msg) {
  var el = document.getElementById('errorOverlay');
  if (el) {
    el.style.display = 'block';
    el.innerHTML += '<div><b>⚠ 3D:</b> ' + msg + '</div>';
  }
}

// ============================================================
// MAIN ENGINE
// ============================================================
function startCubeEngine() {

  // --------------------------------------------------------
  // STATE
  // --------------------------------------------------------
  var faceSize = 256; // smaller = faster = guaranteed to work

  var state = {
    scene: null, camera: null, renderer: null,
    cube: null, edges: null, shell: null, shellMat: null,
    reflCube: null, reflFloor: null, floorGrid: null,
    materials: [], refMats: [],
    faceCanvases: [], faceCtxs: [], faceTextures: [],
    lights: null,
    shards: [],
    patternIndex: 0, patternTarget: 0,
    morphProgress: 1.0,
    autoSpin: true, zenOrbit: false,
    autoPattern: false, autoInterval: 8, autoTimer: 0,
    rotX: 0.3, rotY: 0.5,
    rotVX: 0, rotVY: 0.003,
    dragging: false,
    flickX: 0, flickY: 0,
    zenAngle: 0,
    shattered: false,
    edgeGlow: 0.8, emissive: 0.3,
    reflection: true, showFloorGrid: false,
    visible: true,
    time: 0, lastTime: performance.now(),
  };

  // --------------------------------------------------------
  // PATTERN NAMES (60)
  // --------------------------------------------------------
  var PNAMES = [
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

  // --------------------------------------------------------
  // PATTERN FUNCTIONS (60)
  // --------------------------------------------------------
  function makePatterns() {
    var P = [];
    var S = faceSize;

    // Helper: HSL to CSS
    function hsl(h,s,l,a) {
      if (a !== undefined) return 'hsla('+((h%360+360)%360)+','+s+'%,'+l+'%,'+a+')';
      return 'hsl('+((h%360+360)%360)+','+s+'%,'+l+'%)';
    }

    // 0 Fiber Optics
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000814';ctx.fillRect(0,0,S,S);
      for(var i=0;i<20;i++){
        var y0=(i/20)*S,amp=25+Math.sin(t*0.7+i)*18,freq=0.02+i*0.001;
        ctx.beginPath();ctx.strokeStyle=hsl(160+i*9,100,50+Math.sin(t+i)*20);
        ctx.lineWidth=1.5;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=5;
        for(var x=0;x<=S;x+=3){var py=y0+Math.sin(x*freq+t+i)*amp;x===0?ctx.moveTo(x,py):ctx.lineTo(x,py);}
        ctx.stroke();
      }ctx.shadowBlur=0;
    });

    // 1 Digital Silk
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#030010';ctx.fillRect(0,0,S,S);
      for(var i=0;i<S;i+=4){var v=Math.sin(i*0.02+t)*0.5+0.5;
        ctx.fillStyle='rgba(0,'+Math.floor(v*255)+','+Math.floor((1-v)*200)+',0.6)';ctx.fillRect(i,0,3,S);}
      for(var j=0;j<S;j+=4){var v2=Math.cos(j*0.02+t*1.3)*0.5+0.5;
        ctx.fillStyle='rgba('+Math.floor(v2*180)+',0,'+Math.floor(v2*255)+',0.3)';ctx.fillRect(0,j,S,3);}
    });

    // 2 Wave Turbulence
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);
      var img=ctx.getImageData(0,0,S,S);var d=img.data;
      for(var y=0;y<S;y+=2)for(var x=0;x<S;x+=2){
        var nx=x/S*6,ny=y/S*6;
        var v=Math.sin(nx+t)*Math.cos(ny+t*0.7)+Math.sin((nx+ny)*1.5+t*0.5)*0.5;
        var c=Math.floor((v*0.5+0.5)*255);
        var idx=(y*S+x)*4;d[idx]=0;d[idx+1]=c;d[idx+2]=Math.floor(c*0.8);d[idx+3]=255;
        // fill 2x2 block
        if(x+1<S){var i2=(y*S+x+1)*4;d[i2]=0;d[i2+1]=c;d[i2+2]=Math.floor(c*0.8);d[i2+3]=255;}
        if(y+1<S){var i3=((y+1)*S+x)*4;d[i3]=0;d[i3+1]=c;d[i3+2]=Math.floor(c*0.8);d[i3+3]=255;}
        if(x+1<S&&y+1<S){var i4=((y+1)*S+x+1)*4;d[i4]=0;d[i4+1]=c;d[i4+2]=Math.floor(c*0.8);d[i4+3]=255;}
      }ctx.putImageData(img,0,0);
    });

    // 3 Dynamic Vortex
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);
      var cx=S/2,cy=S/2;
      for(var r=S*0.02;r<S*0.55;r+=4){
        var h2=(r/S*360+t*60)%360,a=Math.max(0,0.6-r/S);
        ctx.beginPath();ctx.strokeStyle=hsl(h2,100,60,a);ctx.lineWidth=2;
        ctx.arc(cx,cy,r,t+r*0.04,t+r*0.04+Math.PI*1.5);ctx.stroke();}
    });

    // 4 Neural Grid
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000a0a';ctx.fillRect(0,0,S,S);
      var nd=[];for(var i=0;i<14;i++)nd.push({x:(Math.sin(i*2.4+t*0.3)*0.42+0.5)*S,y:(Math.cos(i*1.7+t*0.2)*0.42+0.5)*S});
      for(var a=0;a<nd.length;a++)for(var b=a+1;b<nd.length;b++){
        var d=Math.hypot(nd[a].x-nd[b].x,nd[a].y-nd[b].y);
        if(d<S*0.4){ctx.strokeStyle='rgba(0,255,180,'+(1-d/(S*0.4))*0.6+')';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(nd[a].x,nd[a].y);ctx.lineTo(nd[b].x,nd[b].y);ctx.stroke();}}
      ctx.fillStyle='#00ffc8';ctx.shadowColor='#00ffc8';ctx.shadowBlur=6;
      for(var c=0;c<nd.length;c++){ctx.beginPath();ctx.arc(nd[c].x,nd[c].y,3,0,Math.PI*2);ctx.fill();}
      ctx.shadowBlur=0;
    });

    // 5 Data Blocks
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);var cols=10,bw=S/cols;
      for(var i=0;i<cols;i++)for(var j=0;j<cols;j++){var v=Math.sin(i*0.5+j*0.5+t)*0.5+0.5;
        ctx.fillStyle=hsl((i*30+j*20+t*30)%360,100,50,0.3+v*0.5);
        ctx.fillRect(i*bw+1,j*bw+bw-v*bw,bw-2,v*bw);}
    });

    // 6 Sand Waves
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#100800';ctx.fillRect(0,0,S,S);
      for(var y=0;y<S;y+=2){var sh=Math.sin(y*0.03+t)*40+Math.sin(y*0.07+t*0.5)*20;
        var br=40+Math.sin(y*0.05+t*0.3)*30;ctx.fillStyle=hsl(36,70+br*0.3,br);
        ctx.fillRect(0,y,S,2);}
    });

    // 7 Galactic River
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#00000f';ctx.fillRect(0,0,S,S);
      for(var i=0;i<180;i++){var ang=(i/180)*Math.PI*2+t*0.1,r=i/180*S*0.48;
        var x=S/2+Math.cos(ang+Math.sin(r*0.02)*2)*r;
        var y=S/2+Math.sin(ang+Math.cos(r*0.02)*2)*r*0.6;
        ctx.fillStyle='rgba('+(80+i*0.5|0)+','+(100+i*0.3|0)+',255,'+(0.4+Math.sin(i*0.3+t)*0.3)+')';
        ctx.fillRect(x,y,2,2);}
    });

    // 8 Radial Drift
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);var cx=S/2,cy=S/2;
      for(var a=0;a<Math.PI*2;a+=0.1)for(var r=10;r<S*0.48;r+=10){
        var dr=Math.sin(r*0.05+t+a*3)*8;var x=cx+Math.cos(a+dr*0.01)*(r+dr);
        var y=cy+Math.sin(a+dr*0.01)*(r+dr);ctx.fillStyle=hsl((a/(Math.PI*2)*360+t*40)%360,100,60,0.3);
        ctx.fillRect(x,y,2,2);}
    });

    // 9 Geometric Repeat
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#050510';ctx.fillRect(0,0,S,S);var n=6,st=S/n;
      for(var i=0;i<n;i++)for(var j=0;j<n;j++){var cx=i*st+st/2,cy=j*st+st/2,rot=t+(i+j)*0.4,sz=st*0.32;
        ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);
        ctx.strokeStyle=hsl((i*n+j)*25+t*20,100,60);ctx.lineWidth=1.5;
        ctx.strokeRect(-sz/2,-sz/2,sz,sz);ctx.restore();}
    });

    // 10-19: simpler but visually rich patterns
    // 10 Magnetic Field
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);
      for(var y=0;y<S;y+=12)for(var x=0;x<S;x+=12){
        var fx=0,fy=0;
        var dx1=x-S*0.3,dy1=y-S*0.5,dx2=x-S*0.7,dy2=y-S*0.5;
        fx+=dx1/(dx1*dx1+dy1*dy1+1)*800-dx2/(dx2*dx2+dy2*dy2+1)*800;
        fy+=dy1/(dx1*dx1+dy1*dy1+1)*800-dy2/(dx2*dx2+dy2*dy2+1)*800;
        var len=Math.sqrt(fx*fx+fy*fy);if(len>0){
          ctx.strokeStyle=hsl((Math.atan2(fy,fx)/Math.PI*180+180+t*10)%360,100,60,0.6);
          ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-fx/len*4,y-fy/len*4);
          ctx.lineTo(x+fx/len*4,y+fy/len*4);ctx.stroke();}}
    });

    // 11 Ordered Chaos
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#010108';ctx.fillRect(0,0,S,S);
      for(var i=0;i<60;i++){var x=(Math.sin(i*1.3+t*0.5)*0.45+0.5)*S;
        var y=(Math.cos(i*0.9+t*0.3)*0.45+0.5)*S;var r=Math.max(1,2+Math.sin(i+t)*4);
        ctx.fillStyle=hsl(i*15+t*30,100,60);ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=6;
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
    });

    // 12 Fractal Spiral
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);ctx.save();ctx.translate(S/2,S/2);
      for(var d=0;d<5;d++){var sc=Math.pow(0.65,d),rot=t*(d%2===0?1:-1)*0.5+d;
        ctx.save();ctx.rotate(rot);ctx.scale(sc,sc);ctx.strokeStyle=hsl(d*40+t*20,100,60);
        ctx.lineWidth=2/sc;ctx.beginPath();
        for(var a=0;a<Math.PI*4;a+=0.06){var r=a*S*0.04;
          a===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
        ctx.stroke();ctx.restore();}ctx.restore();
    });

    // 13 Electric Storm
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='rgba(0,0,10,0.7)';ctx.fillRect(0,0,S,S);ctx.shadowBlur=10;ctx.shadowColor='#8080ff';
      for(var b=0;b<5;b++){var x=(Math.sin(b*1.4+t*0.2)*0.5+0.5)*S,y=0;ctx.beginPath();ctx.moveTo(x,y);
        ctx.strokeStyle='rgba(150,150,255,0.8)';ctx.lineWidth=1.5;
        while(y<S){x+=(Math.random()-0.5)*25;y+=8+Math.random()*8;ctx.lineTo(x,y);}ctx.stroke();}
      ctx.shadowBlur=0;
    });

    // 14 DNA Helix
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000a05';ctx.fillRect(0,0,S,S);var cx=S/2;
      for(var y=0;y<S;y+=3){var ph=y*0.04+t;var x1=cx+Math.sin(ph)*70,x2=cx+Math.sin(ph+Math.PI)*70;
        ctx.fillStyle='rgba(0,255,160,'+(0.4+Math.sin(ph)*0.3)+')';ctx.fillRect(x1,y,4,3);
        ctx.fillStyle='rgba(255,0,200,'+(0.4+Math.sin(ph)*0.3)+')';ctx.fillRect(x2,y,4,3);
        if(y%15===0){ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(x1+2,y+1);ctx.lineTo(x2+2,y+1);ctx.stroke();}}
    });

    // 15 Coral Growth
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000510';ctx.fillRect(0,0,S,S);
      function br(x,y,a,l,d){if(d===0||l<2)return;var ex=x+Math.cos(a)*l,ey=y+Math.sin(a)*l;
        ctx.strokeStyle=hsl((d*30+t*20)%360,100,40+d*8);ctx.lineWidth=d*0.5;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();
        var sp=0.4+Math.sin(t+d)*0.1;br(ex,ey,a-sp,l*0.7,d-1);br(ex,ey,a+sp,l*0.7,d-1);}
      br(S/2,S,-Math.PI/2+Math.sin(t*0.3)*0.2,S*0.2,7);
    });

    // 16 Quantum Field
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);var img=ctx.getImageData(0,0,S,S);var dat=img.data;
      for(var y=0;y<S;y+=2)for(var x=0;x<S;x+=2){
        var v=Math.sin(x/S*8+t)*Math.sin(y/S*8+t*0.8)*Math.cos((x/S+y/S)*4+t*0.6);
        var c=Math.floor((v*0.5+0.5)*255);
        for(var dy=0;dy<2&&y+dy<S;dy++)for(var dx=0;dx<2&&x+dx<S;dx++){
          var idx=((y+dy)*S+(x+dx))*4;dat[idx]=c>>3;dat[idx+1]=c;dat[idx+2]=c>>1;dat[idx+3]=255;}}
      ctx.putImageData(img,0,0);
    });

    // 17 Topographic Map
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#001008';ctx.fillRect(0,0,S,S);
      for(var lv=0;lv<12;lv++){ctx.beginPath();ctx.strokeStyle=hsl(120+lv*15,80,30+lv*3);ctx.lineWidth=1;
        var first=true;for(var x=0;x<=S;x+=3){
          var h2=Math.sin(x*0.015+t)*0.3+Math.sin(x*0.03+t*0.7)*0.2+0.5;var y=h2*S;
          if(Math.abs(h2-lv/12)<0.04){first?ctx.moveTo(x,y):ctx.lineTo(x,y);first=false;}else first=true;}
        ctx.stroke();}
    });

    // 18 Mirror Flow
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);var half=S/2;
      for(var y=0;y<half;y+=4)for(var x=0;x<half;x+=4){
        var v=Math.sin(x*0.02+y*0.015+t)*0.5+0.5;ctx.fillStyle=hsl((v*200+t*20)%360,100,60,0.2+v*0.5);
        ctx.fillRect(x,y,4,4);ctx.fillRect(S-x-4,y,4,4);ctx.fillRect(x,S-y-4,4,4);ctx.fillRect(S-x-4,S-y-4,4,4);}
    });

    // 19 Smoke
    P.push(function(ctx,S,t,fi){
      ctx.fillStyle='rgba(5,5,10,0.25)';ctx.fillRect(0,0,S,S);
      for(var i=0;i<25;i++){var x=(Math.sin(i*0.7+t*0.3)*0.4+0.5)*S;
        var y=S-(((t*30+i*20)%S+S)%S);var r=18+Math.sin(i+t)*8;
        var g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(150,160,180,0.12)');
        g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    });

    // 20-59: generate procedurally with variations
    var generators = [
      // Each generator creates a different visual feel
      function(ctx,S,t,fi,seed){ // rings
        ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);var cx=S/2,cy=S/2;
        for(var r=0;r<S*0.5;r+=6){ctx.beginPath();
          ctx.strokeStyle=hsl((r*seed+t*30)%360,100,55,(1-r/(S*0.5))*0.5);ctx.lineWidth=2;
          ctx.arc(cx+Math.sin(t+r*0.05)*5,cy,r,0,Math.PI*2);ctx.stroke();}
      },
      function(ctx,S,t,fi,seed){ // grid
        ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);var g=16+seed*2,c=S/g;
        for(var gy=0;gy<g;gy++)for(var gx=0;gx<g;gx++){
          var ang=Math.sin(gx*0.3*seed+t)*Math.cos(gy*0.3+t*0.8)*Math.PI;var l=c*0.35;
          ctx.strokeStyle=hsl((gx*10+gy*8+t*20+seed*30)%360,100,55);ctx.lineWidth=1;ctx.beginPath();
          ctx.moveTo(gx*c+c/2,gy*c+c/2);ctx.lineTo(gx*c+c/2+Math.cos(ang)*l,gy*c+c/2+Math.sin(ang)*l);ctx.stroke();}
      },
      function(ctx,S,t,fi,seed){ // blobs
        ctx.fillStyle='rgba(0,0,'+Math.floor(seed*3)+',0.3)';ctx.fillRect(0,0,S,S);
        for(var i=0;i<30+seed*5;i++){var x=(Math.sin(i*1.9*seed+t*0.15)*0.4+0.5)*S;
          var y=(Math.cos(i*1.3+t*0.12)*0.4+0.5)*S;var r=8+Math.sin(i+t)*seed;
          var g=ctx.createRadialGradient(x,y,0,x,y,r);
          g.addColorStop(0,hsl((100+i*5*seed+t*10)%360,80,60,0.5));g.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
      },
      function(ctx,S,t,fi,seed){ // lines
        ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);
        for(var i=0;i<20+seed*3;i++){var y=(i/(20+seed*3))*S;
          ctx.beginPath();ctx.strokeStyle=hsl((i*18*seed+t*15)%360,100,55,0.6);ctx.lineWidth=1.5;
          for(var x=0;x<=S;x+=3){var py=y+Math.sin(x*0.02*seed+t+i)*20;
            x===0?ctx.moveTo(x,py):ctx.lineTo(x,py);}ctx.stroke();}
      },
      function(ctx,S,t,fi,seed){ // pixels
        ctx.fillStyle='#000';ctx.fillRect(0,0,S,S);
        for(var y=0;y<S;y+=4)for(var x=0;x<S;x+=4){
          var v=Math.sin(x*0.02*seed+t)+Math.cos(y*0.02*seed+t*0.7);
          ctx.fillStyle=hsl((v*90+180+t*20+seed*40)%360,100,30+Math.abs(v)*25);ctx.fillRect(x,y,4,4);}
      },
    ];

    // Fill patterns 20-59 using generators with different seeds
    for (var pi = 20; pi < 60; pi++) {
      (function(idx) {
        var genIdx = idx % generators.length;
        var seed = 1 + (idx - 20) * 0.3;
        P.push(function(ctx, S, t, fi) {
          generators[genIdx](ctx, S, t + idx * 0.1, fi, seed);
        });
      })(pi);
    }

    return P;
  }

  var PATTERNS = makePatterns();
  console.log('[cube3d] ' + PATTERNS.length + ' patterns loaded');

  // --------------------------------------------------------
  // RENDERER
  // --------------------------------------------------------
  var canvas = document.getElementById('cubeCan');
  if (!canvas) { showCubeError('cubeCan element not found'); return; }

  state.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setClearColor(0x000000, 0);

  // --------------------------------------------------------
  // SCENE + CAMERA
  // --------------------------------------------------------
  state.scene = new THREE.Scene();
  state.scene.fog = new THREE.FogExp2(0x000008, 0.012);

  state.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  state.camera.position.set(0, 1.2, 4.8);
  state.camera.lookAt(0, 0, 0);

  // --------------------------------------------------------
  // LIGHTS
  // --------------------------------------------------------
  var ambient = new THREE.AmbientLight(0x001020, 0.9);
  state.scene.add(ambient);
  var dirLight = new THREE.DirectionalLight(0x00ffc8, 1.2);
  dirLight.position.set(3, 6, 4);
  state.scene.add(dirLight);
  var p1 = new THREE.PointLight(0xff00ff, 1.5, 12);
  p1.position.set(-3, 2, 2);
  state.scene.add(p1);
  var p2 = new THREE.PointLight(0x00e5ff, 1.2, 12);
  p2.position.set(3, -1, 3);
  state.scene.add(p2);
  var p3 = new THREE.PointLight(0xffb800, 0.8, 10);
  p3.position.set(0, -3, -2);
  state.scene.add(p3);
  state.lights = { ambient: ambient, dir: dirLight, p1: p1, p2: p2, p3: p3 };

  // --------------------------------------------------------
  // FACE TEXTURES
  // --------------------------------------------------------
  for (var fi = 0; fi < 6; fi++) {
    var fc = document.createElement('canvas');
    fc.width = faceSize; fc.height = faceSize;
    var fctx = fc.getContext('2d');
    fctx.fillStyle = '#000'; fctx.fillRect(0, 0, faceSize, faceSize);
    var tex = new THREE.CanvasTexture(fc);
    tex.needsUpdate = true;
    state.faceCanvases.push(fc);
    state.faceCtxs.push(fctx);
    state.faceTextures.push(tex);
  }

  // --------------------------------------------------------
  // CUBE MESH
  // --------------------------------------------------------
  var geo = new THREE.BoxGeometry(2, 2, 2);
  state.materials = state.faceTextures.map(function(tex) {
    return new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex,
      emissive: new THREE.Color(0x00ffc8),
      emissiveIntensity: state.emissive,
      roughness: 0.15, metalness: 0.65,
    });
  });

  state.cube = new THREE.Mesh(geo, state.materials);
  state.scene.add(state.cube);

  // Edge glow
  var edgeGeo = new THREE.EdgesGeometry(geo);
  var edgeMat = new THREE.LineBasicMaterial({ color: 0x00ffc8, transparent: true, opacity: state.edgeGlow });
  state.edges = new THREE.LineSegments(edgeGeo, edgeMat);
  state.cube.add(state.edges);

  // Shell glow
  var shellGeo = new THREE.BoxGeometry(2.1, 2.1, 2.1);
  state.shellMat = new THREE.MeshBasicMaterial({
    color: 0x00ffc8, transparent: true, opacity: 0.05,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  state.shell = new THREE.Mesh(shellGeo, state.shellMat);
  state.cube.add(state.shell);

  // --------------------------------------------------------
  // REFLECTION
  // --------------------------------------------------------
  var refGeo = new THREE.BoxGeometry(2, 2, 2);
  state.refMats = state.faceTextures.map(function(tex) {
    return new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex,
      emissive: new THREE.Color(0x00ffc8),
      emissiveIntensity: state.emissive * 0.3,
      roughness: 0.3, metalness: 0.4,
      transparent: true, opacity: 0.22,
    });
  });
  state.reflCube = new THREE.Mesh(refGeo, state.refMats);
  state.reflCube.position.set(0, -3.4, 0);
  state.reflCube.scale.set(1, -1, 1);
  state.reflCube.visible = state.reflection;
  state.scene.add(state.reflCube);

  var floorGeo = new THREE.PlaneGeometry(24, 24);
  var floorMat = new THREE.MeshStandardMaterial({
    color: 0x001a14, roughness: 0.05, metalness: 0.95,
    transparent: true, opacity: 0.4,
  });
  state.reflFloor = new THREE.Mesh(floorGeo, floorMat);
  state.reflFloor.rotation.x = -Math.PI / 2;
  state.reflFloor.position.y = -1.22;
  state.reflFloor.visible = state.reflection;
  state.scene.add(state.reflFloor);

  // Floor grid
  var grid = new THREE.GridHelper(24, 28, 0x00ffc8, 0x003828);
  grid.position.y = -1.23;
  grid.material.transparent = true;
  grid.material.opacity = 0.25;
  grid.visible = state.showFloorGrid;
  state.scene.add(grid);
  state.floorGrid = grid;

  // --------------------------------------------------------
  // SHARDS
  // --------------------------------------------------------
  for (var si = 0; si < 24; si++) {
    var sw = 0.15 + Math.random() * 0.5;
    var sh = 0.15 + Math.random() * 0.5;
    var sd = 0.04 + Math.random() * 0.15;
    var sGeo = new THREE.BoxGeometry(sw, sh, sd);
    var sCol = new THREE.Color(); sCol.setHSL(0.42 + Math.random() * 0.15, 1, 0.55);
    var sMat = new THREE.MeshStandardMaterial({
      color: sCol, emissive: new THREE.Color(0x00ffc8),
      emissiveIntensity: 0.5, transparent: true, opacity: 0.85,
      roughness: 0.1, metalness: 0.8,
    });
    var shard = new THREE.Mesh(sGeo, sMat);
    var home = new THREE.Vector3((Math.random()-0.5)*1.8,(Math.random()-0.5)*1.8,(Math.random()-0.5)*1.8);
    shard.position.copy(home);
    shard.userData = { home: home.clone(), vel: new THREE.Vector3(),
      rotVel: new THREE.Vector3((Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08) };
    shard.visible = false;
    state.scene.add(shard);
    state.shards.push(shard);
  }

  // --------------------------------------------------------
  // SHATTER FUNCTION
  // --------------------------------------------------------
  function triggerShatter() {
    if (state.shattered) {
      state.shattered = false;
      state.cube.visible = state.visible;
      state.edges.visible = state.visible;
      state.shell.visible = state.visible;
      state.shards.forEach(function(s) { s.visible = false; });
      return;
    }
    state.shattered = true;
    state.cube.visible = false;
    state.edges.visible = false;
    state.shell.visible = false;
    state.shards.forEach(function(s) {
      s.visible = true;
      s.position.set((Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5);
      var f = 0.06 + Math.random() * 0.12;
      s.userData.vel.set((Math.random()-0.5)*f*5,(Math.random()-0.5)*f*5+0.05,(Math.random()-0.5)*f*5);
      s.userData.rotVel.set((Math.random()-0.5)*0.15,(Math.random()-0.5)*0.15,(Math.random()-0.5)*0.15);
    });
    setTimeout(function() { if (state.shattered) triggerShatter(); }, 3500);
  }

  // --------------------------------------------------------
  // RENDER LOOP
  // --------------------------------------------------------
  function loop() {
    requestAnimationFrame(loop);
    var now = performance.now();
    var dt = Math.min((now - state.lastTime) / 1000, 0.05);
    state.lastTime = now;
    state.time += dt;
    var t = state.time;

    // morph
    if (state.morphProgress < 1.0) {
      state.morphProgress += 0.03 * dt * 60;
      if (state.morphProgress >= 1.0) { state.morphProgress = 1.0; state.patternIndex = state.patternTarget; }
    }

    // auto pattern
    if (state.autoPattern) {
      state.autoTimer += dt;
      if (state.autoTimer >= state.autoInterval) {
        state.autoTimer = 0;
        state.patternTarget = (state.patternIndex + 1) % PATTERNS.length;
        state.morphProgress = 0;
        updatePatDisplay();
      }
    }

    // update face textures
    var pi = state.patternIndex % PATTERNS.length;
    var pt = state.patternTarget % PATTERNS.length;
    for (var f = 0; f < 6; f++) {
      var ctx = state.faceCtxs[f];
      var ft = t + f * 0.5;
      if (state.morphProgress < 1.0) {
        PATTERNS[pi](ctx, faceSize, ft, f);
        // draw target blended
        var tmp = document.createElement('canvas'); tmp.width = faceSize; tmp.height = faceSize;
        var tc = tmp.getContext('2d');
        PATTERNS[pt](tc, faceSize, ft, f);
        ctx.globalAlpha = state.morphProgress;
        ctx.drawImage(tmp, 0, 0);
        ctx.globalAlpha = 1;
      } else {
        PATTERNS[pi](ctx, faceSize, ft, f);
      }
      state.faceTextures[f].needsUpdate = true;
    }

    // rotation
    if (!state.shattered) {
      if (state.zenOrbit) {
        state.zenAngle += dt * 0.38;
        state.camera.position.x = Math.sin(state.zenAngle) * 4.8;
        state.camera.position.z = Math.cos(state.zenAngle) * 4.8;
        state.camera.position.y = 1.2 + Math.sin(state.zenAngle * 0.4) * 0.8;
        state.camera.lookAt(0, 0, 0);
      } else {
        if (!state.dragging) {
          state.rotVX *= 0.91; state.rotVY *= 0.91;
          state.rotX += state.rotVX; state.rotY += state.rotVY;
          if (state.autoSpin) state.rotY += 0.004;
        }
        state.rotX = Math.max(-Math.PI*0.48, Math.min(Math.PI*0.48, state.rotX));
        state.cube.rotation.x = state.rotX;
        state.cube.rotation.y = state.rotY;
        if (state.reflCube) { state.reflCube.rotation.x = state.rotX; state.reflCube.rotation.y = state.rotY; }
      }
    }

    // audio reactivity
    var bass = 0, beat = false;
    try { if (window.ENG && window.ENG.audioData) { bass = window.ENG.audioData.bass||0; beat = window.ENG.audioData.beat||false; } } catch(e){}
    if (state.cube && !state.shattered) {
      var ts = beat ? 1.08+bass*0.06 : 1.0+bass*0.05;
      var cs = state.cube.scale.x + (ts - state.cube.scale.x) * 0.18;
      state.cube.scale.setScalar(cs);
    }
    if (state.edges && state.edges.material) state.edges.material.opacity = Math.min(2, state.edgeGlow + bass * 0.4);
    if (state.shellMat) state.shellMat.opacity = Math.min(0.3, 0.05 + bass * 0.12);
    if (state.lights) {
      state.lights.p1.intensity = 1.5 + bass * 2.5;
      state.lights.p2.intensity = 1.2 + bass * 1.8;
      state.lights.dir.intensity += ((beat ? 3 : 1.2) - state.lights.dir.intensity) * 0.08;
      state.lights.p1.position.x = Math.sin(t * 0.42) * 4.5;
      state.lights.p1.position.z = Math.cos(t * 0.31) * 4.5;
      state.lights.p2.position.x = Math.cos(t * 0.37) * 3.5;
      state.lights.p2.position.z = Math.sin(t * 0.43) * 3.5;
    }

    // shards
    if (state.shattered) {
      state.shards.forEach(function(s) {
        if (!s.visible) return;
        s.userData.vel.x += (s.userData.home.x - s.position.x) * 0.035;
        s.userData.vel.y += (s.userData.home.y - s.position.y) * 0.035;
        s.userData.vel.z += (s.userData.home.z - s.position.z) * 0.035;
        s.userData.vel.multiplyScalar(0.87);
        s.position.add(s.userData.vel);
        s.rotation.x += s.userData.rotVel.x; s.rotation.y += s.userData.rotVel.y; s.rotation.z += s.userData.rotVel.z;
        s.userData.rotVel.multiplyScalar(0.94);
      });
    }

    state.renderer.render(state.scene, state.camera);
  }

  // --------------------------------------------------------
  // PATTERN DISPLAY UPDATE
  // --------------------------------------------------------
  function updatePatDisplay() {
    var sel = document.getElementById('selCubePattern');
    if (sel) sel.value = state.patternTarget;
    var valEl = document.getElementById('valPatternIdx');
    if (valEl) valEl.textContent = (state.patternTarget + 1) + '/' + PATTERNS.length;
  }

  // --------------------------------------------------------
  // POPULATE PATTERN SELECT
  // --------------------------------------------------------
  var selPat = document.getElementById('selCubePattern');
  if (selPat) {
    selPat.innerHTML = '';
    for (var i = 0; i < PNAMES.length; i++) {
      var op = document.createElement('option');
      op.value = i; op.textContent = (i+1) + '. ' + PNAMES[i];
      selPat.appendChild(op);
    }
    selPat.value = 0;
    selPat.addEventListener('change', function() {
      var idx = parseInt(selPat.value);
      if (!isNaN(idx) && idx >= 0 && idx < PATTERNS.length) {
        state.patternTarget = idx; state.morphProgress = 0; updatePatDisplay();
      }
    });
  }
  updatePatDisplay();

  // --------------------------------------------------------
  // CONTROL BINDINGS
  // --------------------------------------------------------
  function bindBtn(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
  function bindChk(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('change', function() { fn(el.checked); }); }
  function bindSlider(id, vid, fn) {
    var el = document.getElementById(id), ve = document.getElementById(vid);
    if (el) el.addEventListener('input', function() { fn(parseFloat(el.value)); if (ve) ve.textContent = parseFloat(el.value).toFixed(1); });
  }

  bindBtn('btnPrevPattern', function() { state.patternTarget = (state.patternTarget-1+PATTERNS.length)%PATTERNS.length; state.morphProgress=0; updatePatDisplay(); });
  bindBtn('btnNextPattern', function() { state.patternTarget = (state.patternTarget+1)%PATTERNS.length; state.morphProgress=0; updatePatDisplay(); });
  bindBtn('btnRandPattern', function() { var i=Math.floor(Math.random()*PATTERNS.length); if(i===state.patternIndex)i=(i+1)%PATTERNS.length; state.patternTarget=i; state.morphProgress=0; updatePatDisplay(); });
  bindBtn('btnShatter', function() { triggerShatter(); if(typeof showToast==='function')showToast(typeof t==='function'?t('toastShatter'):'Shatter!'); });

  bindChk('chkAutoPattern', function(v) { state.autoPattern=v; state.autoTimer=0; });
  bindChk('chkAutoSpin', function(v) { state.autoSpin=v; });
  bindChk('chkZenOrbit', function(v) { state.zenOrbit=v; if(!v){state.camera.position.set(0,1.2,4.8);state.camera.lookAt(0,0,0);} });
  bindChk('chkReflection', function(v) { state.reflection=v; state.reflCube.visible=v&&state.visible; state.reflFloor.visible=v&&state.visible; });
  bindChk('chkFloorGrid', function(v) { state.showFloorGrid=v; state.floorGrid.visible=v&&state.visible; });

  bindSlider('sliderAutoInterval','valAutoInterval', function(v) { state.autoInterval=v; });
  bindSlider('sliderEdgeGlow','valEdgeGlow', function(v) { state.edgeGlow=v; if(state.edges&&state.edges.material)state.edges.material.opacity=v; });
  bindSlider('sliderEmissive','valEmissive', function(v) { state.emissive=v; state.materials.forEach(function(m){m.emissiveIntensity=v;}); state.refMats.forEach(function(m){m.emissiveIntensity=v*0.3;}); });

  // --------------------------------------------------------
  // DRAG — MOUSE
  // --------------------------------------------------------
  var isDragging = false, lmx = 0, lmy = 0, flkx = 0, flky = 0;

  function canDrag() {
    var m = (window.ENG && window.ENG.viewMode) ? window.ENG.viewMode : 'both';
    return m === '3d' || m === 'both';
  }
  function isUI(e) {
    return e.target.closest && (e.target.closest('#sidePanel') || e.target.closest('#topBar') ||
      e.target.closest('#modeTabs') || e.target.closest('.modalOverlay') ||
      e.target.closest('#panelToggle') || e.target.closest('#forceFieldLayer'));
  }

  window.addEventListener('mousedown', function(e) {
    if (!canDrag() || isUI(e)) return;
    isDragging = true; state.dragging = true;
    lmx = e.clientX; lmy = e.clientY; flkx = 0; flky = 0;
  });
  window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    flkx = e.clientX - lmx; flky = e.clientY - lmy;
    state.rotY += flkx * 0.007; state.rotX += flky * 0.007;
    lmx = e.clientX; lmy = e.clientY;
  });
  window.addEventListener('mouseup', function() {
    if (!isDragging) return;
    isDragging = false; state.dragging = false;
    state.rotVX = flky * 0.003; state.rotVY = flkx * 0.003;
    if (Math.sqrt(flkx*flkx+flky*flky) > 38 && !state.shattered) {
      triggerShatter();
      if (typeof showToast === 'function') showToast('Shatter!');
    }
  });

  // TOUCH
  var isTouching = false, ltx = 0, lty = 0, tfx = 0, tfy = 0;
  window.addEventListener('touchstart', function(e) {
    if (!canDrag() || e.touches.length !== 1) return;
    if (isUI(e)) return;
    isTouching = true; state.dragging = true;
    ltx = e.touches[0].clientX; lty = e.touches[0].clientY; tfx = 0; tfy = 0;
  }, { passive: true });
  window.addEventListener('touchmove', function(e) {
    if (!isTouching || e.touches.length !== 1) return;
    tfx = e.touches[0].clientX - ltx; tfy = e.touches[0].clientY - lty;
    state.rotY += tfx * 0.007; state.rotX += tfy * 0.007;
    ltx = e.touches[0].clientX; lty = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', function() {
    if (!isTouching) return;
    isTouching = false; state.dragging = false;
    state.rotVX = tfy * 0.003; state.rotVY = tfx * 0.003;
    if (Math.sqrt(tfx*tfx+tfy*tfy) > 28 && !state.shattered) {
      triggerShatter();
      if (typeof showToast === 'function') showToast('Shatter!');
    }
  });

  // WHEEL ZOOM
  window.addEventListener('wheel', function(e) {
    if (!canDrag() || state.zenOrbit) return;
    if (e.target.closest && e.target.closest('#sidePanel')) return;
    state.camera.position.z = Math.max(2.2, Math.min(10, state.camera.position.z + e.deltaY * 0.004));
  }, { passive: true });

  // RESIZE
  window.addEventListener('resize', function() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --------------------------------------------------------
  // GLOBAL API
  // --------------------------------------------------------
  window.setCubeVisible = function(v) {
    state.visible = v;
    if (state.cube) state.cube.visible = v;
    if (state.reflCube) state.reflCube.visible = v && state.reflection;
    if (state.reflFloor) state.reflFloor.visible = v && state.reflection;
    if (state.floorGrid) state.floorGrid.visible = v && state.showFloorGrid;
    if (!v && state.shattered) { triggerShatter(); } // reassemble if hiding
  };
  window.nextCubePattern = function() {
    state.patternTarget = (state.patternIndex + 1) % PATTERNS.length;
    state.morphProgress = 0;
    updatePatDisplay();
  };

  // --------------------------------------------------------
  // START
  // --------------------------------------------------------
  loop();
  console.log('[cube3d] Cube engine running ✓');

} // end startCubeEngine
