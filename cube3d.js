/**
 * Xoretex Xhaos Cube — cube3d.js
 * FINAL VERSION with:
 * - Pinch to resize
 * - Smooth finger rotation
 * - Fast-flick shatter
 * - Better visuals
 * - Fight mode sync with 2D
 * - POV inside cube (first person look around)
 */

'use strict';

(function waitForThree() {
  if (typeof THREE !== 'undefined') {
    try { startCubeEngine(); }
    catch (err) { showCubeError('Cube init: ' + err.message); console.error(err); }
  } else {
    if (!window._t3r) window._t3r = 0;
    window._t3r++;
    if (window._t3r > 50) {
      showCubeError('Three.js not loaded');
      window.setCubeVisible = function(){};
      window.nextCubePattern = function(){};
      return;
    }
    setTimeout(waitForThree, 200);
  }
})();

function showCubeError(msg) {
  var el = document.getElementById('errorOverlay');
  if (el) { el.style.display = 'block'; el.innerHTML += '<div><b>⚠ 3D:</b> ' + msg + '</div>'; }
}

function startCubeEngine() {

  var FS = 256;
  var W = window.innerWidth, H = window.innerHeight;

  // ============================================================
  // STATE
  // ============================================================
  var S = {
    scene: null, camera: null, renderer: null,
    cube: null, cubeGroup: null, edges: null, shell: null, shellMat: null,
    reflCube: null, reflFloor: null, floorGrid: null,
    materials: [], refMats: [],
    faceCanvases: [], faceCtxs: [], faceTextures: [],
    lights: null, shards: [],
    // patterns
    patIdx: 0, patTarget: 0, morphProg: 1.0,
    autoSpin: true, zenOrbit: false,
    autoPat: false, autoInt: 8, autoTmr: 0,
    // rotation
    rotX: 0.25, rotY: 0.4, rotVX: 0, rotVY: 0.003,
    dragging: false, flickX: 0, flickY: 0,
    zenAngle: 0,
    // shatter
    shattered: false,
    // appearance
    edgeGlow: 0.8, emissive: 0.4, reflection: true, showGrid: false,
    visible: true,
    // cube scale (pinch)
    cubeScale: 1.0, targetScale: 1.0,
    // POV mode
    povMode: false, povYaw: 0, povPitch: 0,
    // fight mode
    fightMode: false, fightHP: 100, fightHits: [],
    // time
    time: 0, lastTime: performance.now(),
  };

  // ============================================================
  // 60 PATTERN NAMES
  // ============================================================
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

  // ============================================================
  // 60 PATTERN FUNCTIONS
  // ============================================================
  function hsl(h,s,l,a) {
    h = ((h%360)+360)%360;
    return a !== undefined ? 'hsla('+h+','+s+'%,'+l+'%,'+a+')' : 'hsl('+h+','+s+'%,'+l+'%)';
  }

  function makePatterns() {
    var P = [];

    // 0 Fiber Optics
    P.push(function(c,s,t,f){
      c.fillStyle='#000814';c.fillRect(0,0,s,s);
      for(var i=0;i<22;i++){var y0=i/22*s,amp=28+Math.sin(t*0.7+i)*18;
        c.beginPath();c.strokeStyle=hsl(150+i*9,100,55+Math.sin(t+i)*15);c.lineWidth=2;
        c.shadowColor=c.strokeStyle;c.shadowBlur=8;
        for(var x=0;x<=s;x+=2){var py=y0+Math.sin(x*(0.018+i*0.001)+t+i)*amp;x===0?c.moveTo(x,py):c.lineTo(x,py);}
        c.stroke();}c.shadowBlur=0;
    });

    // 1 Digital Silk
    P.push(function(c,s,t,f){
      c.fillStyle='#020012';c.fillRect(0,0,s,s);
      for(var i=0;i<s;i+=3){var v=Math.sin(i*0.025+t)*0.5+0.5;
        c.fillStyle='rgba(0,'+Math.floor(v*255)+','+Math.floor((1-v)*220)+',0.7)';c.fillRect(i,0,2,s);}
      for(var j=0;j<s;j+=3){var v2=Math.cos(j*0.025+t*1.3)*0.5+0.5;
        c.fillStyle='rgba('+Math.floor(v2*200)+',0,'+Math.floor(v2*255)+',0.35)';c.fillRect(0,j,s,2);}
    });

    // 2 Wave Turbulence
    P.push(function(c,s,t,f){
      var img=c.getImageData(0,0,s,s),d=img.data;
      for(var y=0;y<s;y+=2)for(var x=0;x<s;x+=2){
        var v=Math.sin(x/s*6+t)*Math.cos(y/s*6+t*0.7)+Math.sin((x/s+y/s)*4.5+t*0.5)*0.5;
        var cl=Math.floor((v*0.5+0.5)*255);
        for(var dy=0;dy<2&&y+dy<s;dy++)for(var dx=0;dx<2&&x+dx<s;dx++){
          var i=((y+dy)*s+(x+dx))*4;d[i]=cl>>4;d[i+1]=cl;d[i+2]=Math.floor(cl*0.85);d[i+3]=255;}}
      c.putImageData(img,0,0);
    });

    // 3 Dynamic Vortex
    P.push(function(c,s,t,f){
      c.fillStyle='#000';c.fillRect(0,0,s,s);var cx=s/2,cy=s/2;
      for(var r=3;r<s*0.52;r+=3){var h2=(r/s*360+t*60)%360,a=Math.max(0,0.65-r/s);
        c.beginPath();c.strokeStyle=hsl(h2,100,60,a);c.lineWidth=2.5;
        c.arc(cx,cy,r,t+r*0.04,t+r*0.04+Math.PI*1.6);c.stroke();}
    });

    // 4 Neural Grid
    P.push(function(c,s,t,f){
      c.fillStyle='#000a0a';c.fillRect(0,0,s,s);
      var nd=[];for(var i=0;i<16;i++)nd.push({x:(Math.sin(i*2.4+t*0.3)*0.42+0.5)*s,y:(Math.cos(i*1.7+t*0.2)*0.42+0.5)*s});
      for(var a=0;a<nd.length;a++)for(var b=a+1;b<nd.length;b++){
        var d=Math.hypot(nd[a].x-nd[b].x,nd[a].y-nd[b].y);
        if(d<s*0.42){c.strokeStyle='rgba(0,255,190,'+(1-d/(s*0.42))*0.65+')';c.lineWidth=1.2;
          c.beginPath();c.moveTo(nd[a].x,nd[a].y);c.lineTo(nd[b].x,nd[b].y);c.stroke();}}
      c.fillStyle='#00ffd0';c.shadowColor='#00ffc8';c.shadowBlur=10;
      for(var e=0;e<nd.length;e++){c.beginPath();c.arc(nd[e].x,nd[e].y,4,0,Math.PI*2);c.fill();}
      c.shadowBlur=0;
    });

    // 5 Data Blocks
    P.push(function(c,s,t,f){
      c.fillStyle='#000';c.fillRect(0,0,s,s);var cols=10,bw=s/cols;
      for(var i=0;i<cols;i++)for(var j=0;j<cols;j++){var v=Math.sin(i*0.5+j*0.5+t)*0.5+0.5;
        c.fillStyle=hsl((i*30+j*20+t*30)%360,100,55,0.35+v*0.5);
        c.fillRect(i*bw+1,j*bw+bw-v*bw,bw-2,v*bw);}
    });

    // 6 Sand Waves
    P.push(function(c,s,t,f){
      c.fillStyle='#100800';c.fillRect(0,0,s,s);
      for(var y=0;y<s;y+=2){var bright=40+Math.sin(y*0.05+t*0.3)*30;
        c.fillStyle=hsl(36,70+bright*0.3,bright);c.fillRect(0,y,s,2);}
    });

    // 7 Galactic River
    P.push(function(c,s,t,f){
      c.fillStyle='#000010';c.fillRect(0,0,s,s);
      for(var i=0;i<200;i++){var ang=i/200*Math.PI*2+t*0.1,r=i/200*s*0.46;
        var x=s/2+Math.cos(ang+Math.sin(r*0.02)*2)*r;
        var y=s/2+Math.sin(ang+Math.cos(r*0.02)*2)*r*0.6;
        c.fillStyle='rgba('+(80+i*0.5|0)+','+(100+i*0.3|0)+',255,'+(0.4+Math.sin(i*0.3+t)*0.3)+')';
        c.fillRect(x,y,2,2);}
    });

    // 8 Radial Drift
    P.push(function(c,s,t,f){
      c.fillStyle='#000';c.fillRect(0,0,s,s);var cx=s/2,cy=s/2;
      for(var a=0;a<Math.PI*2;a+=0.1)for(var r=10;r<s*0.46;r+=10){
        var dr=Math.sin(r*0.05+t+a*3)*8;c.fillStyle=hsl((a/(Math.PI*2)*360+t*40)%360,100,60,0.35);
        c.fillRect(cx+Math.cos(a+dr*0.01)*(r+dr),cy+Math.sin(a+dr*0.01)*(r+dr),2,2);}
    });

    // 9 Geometric Repeat
    P.push(function(c,s,t,f){
      c.fillStyle='#050510';c.fillRect(0,0,s,s);var n=6,st=s/n;
      for(var i=0;i<n;i++)for(var j=0;j<n;j++){var cx=i*st+st/2,cy=j*st+st/2,rot=t+(i+j)*0.4,sz=st*0.3;
        c.save();c.translate(cx,cy);c.rotate(rot);
        c.strokeStyle=hsl((i*n+j)*25+t*20,100,60);c.lineWidth=2;
        c.strokeRect(-sz/2,-sz/2,sz,sz);c.restore();}
    });

    // 10 Magnetic Field
    P.push(function(c,s,t,f){
      c.fillStyle='#000';c.fillRect(0,0,s,s);
      for(var y=0;y<s;y+=10)for(var x=0;x<s;x+=10){
        var dx1=x-s*0.3,dy1=y-s*0.5,dx2=x-s*0.7,dy2=y-s*0.5;
        var fx=dx1/(dx1*dx1+dy1*dy1+1)*800-dx2/(dx2*dx2+dy2*dy2+1)*800;
        var fy=dy1/(dx1*dx1+dy1*dy1+1)*800-dy2/(dx2*dx2+dy2*dy2+1)*800;
        var len=Math.sqrt(fx*fx+fy*fy);if(len>0){
          c.strokeStyle=hsl((Math.atan2(fy,fx)/Math.PI*180+180+t*10)%360,100,60,0.6);c.lineWidth=1.2;
          c.beginPath();c.moveTo(x-fx/len*4,y-fy/len*4);c.lineTo(x+fx/len*4,y+fy/len*4);c.stroke();}}
    });

    // 11 Ordered Chaos
    P.push(function(c,s,t,f){
      c.fillStyle='#010108';c.fillRect(0,0,s,s);c.shadowBlur=8;
      for(var i=0;i<60;i++){var x=(Math.sin(i*1.3+t*0.5)*0.45+0.5)*s,y=(Math.cos(i*0.9+t*0.3)*0.45+0.5)*s;
        var r=Math.max(1,2+Math.sin(i+t)*4);c.fillStyle=hsl(i*15+t*30,100,60);c.shadowColor=c.fillStyle;
        c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}c.shadowBlur=0;
    });

    // 12 Fractal Spiral
    P.push(function(c,s,t,f){
      c.fillStyle='#000';c.fillRect(0,0,s,s);c.save();c.translate(s/2,s/2);
      for(var d=0;d<5;d++){var sc=Math.pow(0.65,d);c.save();c.rotate(t*(d%2===0?1:-1)*0.5+d);c.scale(sc,sc);
        c.strokeStyle=hsl(d*45+t*20,100,60);c.lineWidth=2.5/sc;c.beginPath();
        for(var a=0;a<Math.PI*4;a+=0.06){var r=a*s*0.04;a===0?c.moveTo(Math.cos(a)*r,Math.sin(a)*r):c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
        c.stroke();c.restore();}c.restore();
    });

    // 13 Electric Storm
    P.push(function(c,s,t,f){
      c.fillStyle='rgba(0,0,12,0.7)';c.fillRect(0,0,s,s);c.shadowBlur=14;c.shadowColor='#6060ff';
      for(var b=0;b<6;b++){var x=(Math.sin(b*1.4+t*0.2)*0.5+0.5)*s,y=0;c.beginPath();c.moveTo(x,y);
        c.strokeStyle='rgba(160,160,255,0.85)';c.lineWidth=2;
        while(y<s){x+=(Math.random()-0.5)*28;y+=8+Math.random()*8;c.lineTo(x,y);}c.stroke();}
      c.shadowBlur=0;
    });

    // 14 DNA Helix
    P.push(function(c,s,t,f){
      c.fillStyle='#000a05';c.fillRect(0,0,s,s);var cx=s/2;
      for(var y=0;y<s;y+=3){var ph=y*0.04+t,x1=cx+Math.sin(ph)*75,x2=cx+Math.sin(ph+Math.PI)*75;
        c.fillStyle='rgba(0,255,160,'+(0.4+Math.sin(ph)*0.3)+')';c.fillRect(x1,y,4,3);
        c.fillStyle='rgba(255,0,200,'+(0.4+Math.sin(ph)*0.3)+')';c.fillRect(x2,y,4,3);
        if(y%15===0){c.strokeStyle='rgba(255,255,255,0.3)';c.lineWidth=1;c.beginPath();c.moveTo(x1+2,y+1);c.lineTo(x2+2,y+1);c.stroke();}}
    });

    // 15 Coral Growth
    P.push(function(c,s,t,f){
      c.fillStyle='#000510';c.fillRect(0,0,s,s);
      function br(x,y,a,l,d){if(d===0||l<2)return;var ex=x+Math.cos(a)*l,ey=y+Math.sin(a)*l;
        c.strokeStyle=hsl((d*30+t*20)%360,100,40+d*8);c.lineWidth=d*0.6;c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.stroke();
        br(ex,ey,a-0.4-Math.sin(t+d)*0.1,l*0.7,d-1);br(ex,ey,a+0.4+Math.sin(t+d)*0.1,l*0.7,d-1);}
      br(s/2,s,-Math.PI/2+Math.sin(t*0.3)*0.15,s*0.2,7);
    });

    // 16-19
    P.push(function(c,s,t,f){ // Quantum Field
      var img=c.getImageData(0,0,s,s),d=img.data;
      for(var y=0;y<s;y+=2)for(var x=0;x<s;x+=2){
        var v=Math.sin(x/s*8+t)*Math.sin(y/s*8+t*0.8)*Math.cos((x/s+y/s)*4+t*0.6);
        var cl=Math.floor((v*0.5+0.5)*255);
        for(var dy=0;dy<2&&y+dy<s;dy++)for(var dx=0;dx<2&&x+dx<s;dx++){
          var i=((y+dy)*s+(x+dx))*4;d[i]=cl>>3;d[i+1]=cl;d[i+2]=cl>>1;d[i+3]=255;}}
      c.putImageData(img,0,0);
    });

    P.push(function(c,s,t,f){ // Topographic
      c.fillStyle='#001008';c.fillRect(0,0,s,s);
      for(var lv=0;lv<12;lv++){c.strokeStyle=hsl(120+lv*15,80,32+lv*3);c.lineWidth=1.2;c.beginPath();var first=true;
        for(var x=0;x<=s;x+=3){var h2=Math.sin(x*0.015+t)*0.3+Math.sin(x*0.03+t*0.7)*0.2+0.5;
          if(Math.abs(h2-lv/12)<0.04){first?c.moveTo(x,h2*s):c.lineTo(x,h2*s);first=false;}else first=true;}c.stroke();}
    });

    P.push(function(c,s,t,f){ // Mirror Flow
      c.fillStyle='#000';c.fillRect(0,0,s,s);var half=s/2;
      for(var y=0;y<half;y+=4)for(var x=0;x<half;x+=4){
        var v=Math.sin(x*0.02+y*0.015+t)*0.5+0.5;c.fillStyle=hsl((v*200+t*20)%360,100,60,0.25+v*0.5);
        c.fillRect(x,y,4,4);c.fillRect(s-x-4,y,4,4);c.fillRect(x,s-y-4,4,4);c.fillRect(s-x-4,s-y-4,4,4);}
    });

    P.push(function(c,s,t,f){ // Smoke
      c.fillStyle='rgba(5,5,10,0.25)';c.fillRect(0,0,s,s);
      for(var i=0;i<28;i++){var x=(Math.sin(i*0.7+t*0.3)*0.4+0.5)*s,y=s-(((t*30+i*20)%s+s)%s);
        var r=20+Math.sin(i+t)*10;var g=c.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,'rgba(150,160,180,0.14)');g.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
    });

    // patterns 20-59: procedural generators
    var gens = [
      function(c,s,t,f,sd){ // rings
        c.fillStyle='#000';c.fillRect(0,0,s,s);
        for(var r=0;r<s*0.5;r+=5){c.beginPath();c.strokeStyle=hsl((r*sd+t*30)%360,100,55,(1-r/(s*0.5))*0.55);
          c.lineWidth=2.5;c.arc(s/2+Math.sin(t+r*0.04)*5,s/2,r,0,Math.PI*2);c.stroke();}
      },
      function(c,s,t,f,sd){ // flow grid
        c.fillStyle='#000';c.fillRect(0,0,s,s);var g=14+Math.floor(sd*2),cl=s/g;
        for(var gy=0;gy<g;gy++)for(var gx=0;gx<g;gx++){
          var ang=Math.sin(gx*0.3*sd+t)*Math.cos(gy*0.3+t*0.8)*Math.PI,l=cl*0.38;
          c.strokeStyle=hsl((gx*10+gy*8+t*20+sd*30)%360,100,55);c.lineWidth=1.2;c.beginPath();
          c.moveTo(gx*cl+cl/2,gy*cl+cl/2);c.lineTo(gx*cl+cl/2+Math.cos(ang)*l,gy*cl+cl/2+Math.sin(ang)*l);c.stroke();}
      },
      function(c,s,t,f,sd){ // nebula blobs
        c.fillStyle='rgba(0,0,'+Math.floor(sd*3)+',0.3)';c.fillRect(0,0,s,s);
        for(var i=0;i<30+sd*5;i++){var x=(Math.sin(i*1.9*sd+t*0.15)*0.4+0.5)*s,y=(Math.cos(i*1.3+t*0.12)*0.4+0.5)*s;
          var r=10+Math.sin(i+t)*sd;var g=c.createRadialGradient(x,y,0,x,y,r);
          g.addColorStop(0,hsl((100+i*5*sd+t*10)%360,80,60,0.55));g.addColorStop(1,'rgba(0,0,0,0)');
          c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
      },
      function(c,s,t,f,sd){ // wavy lines
        c.fillStyle='#000';c.fillRect(0,0,s,s);
        for(var i=0;i<18+sd*3;i++){var y=i/(18+sd*3)*s;c.beginPath();
          c.strokeStyle=hsl((i*18*sd+t*15)%360,100,55,0.65);c.lineWidth=1.8;
          for(var x=0;x<=s;x+=3){var py=y+Math.sin(x*0.02*sd+t+i)*22;x===0?c.moveTo(x,py):c.lineTo(x,py);}c.stroke();}
      },
      function(c,s,t,f,sd){ // pixel field
        c.fillStyle='#000';c.fillRect(0,0,s,s);
        for(var y=0;y<s;y+=4)for(var x=0;x<s;x+=4){
          var v=Math.sin(x*0.02*sd+t)+Math.cos(y*0.02*sd+t*0.7);
          c.fillStyle=hsl((v*90+180+t*20+sd*40)%360,100,30+Math.abs(v)*28);c.fillRect(x,y,4,4);}
      },
      function(c,s,t,f,sd){ // star field
        c.fillStyle='#00000a';c.fillRect(0,0,s,s);
        for(var i=0;i<80;i++){var x=(Math.sin(i*1.7*sd+t*0.01)*0.48+0.5)*s;
          var y=(Math.cos(i*2.1+t*0.008)*0.48+0.5)*s;
          var br=0.3+Math.sin(i+t*2)*0.3;c.fillStyle='rgba(255,255,255,'+br+')';
          c.beginPath();c.arc(x,y,0.5+Math.sin(i*0.5+t)*0.5,0,Math.PI*2);c.fill();}
      },
      function(c,s,t,f,sd){ // black hole
        c.fillStyle='#000';c.fillRect(0,0,s,s);var cx=s/2,cy=s/2;
        for(var r=s*0.48;r>2;r-=3){var h2=(r+t*60)%360,a=Math.max(0,(1-r/(s*0.48))*0.55);
          c.beginPath();c.arc(cx+Math.sin(r*0.05+t)*4,cy,r,0,Math.PI*2);
          c.strokeStyle=hsl(h2,100,25+(1-r/(s*0.48))*50,a);c.lineWidth=1.8;c.stroke();}
        var g=c.createRadialGradient(cx,cy,0,cx,cy,s*0.1);g.addColorStop(0,'#000');g.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=g;c.beginPath();c.arc(cx,cy,s*0.1,0,Math.PI*2);c.fill();
      },
      function(c,s,t,f,sd){ // aurora
        c.fillStyle='#000510';c.fillRect(0,0,s,s);
        for(var band=0;band<5;band++){var baseY=s*(0.2+band*0.12),h2=100+band*40+t*15;
          c.beginPath();c.moveTo(0,baseY);
          for(var x=0;x<=s;x+=4){c.lineTo(x,baseY+Math.sin(x*0.01+t+band)*30+Math.sin(x*0.03+t*0.7+band*1.3)*15);}
          c.lineTo(s,s);c.lineTo(0,s);c.closePath();
          var g=c.createLinearGradient(0,baseY-35,0,baseY+35);
          g.addColorStop(0,hsl(h2%360,100,70,0));g.addColorStop(0.5,hsl(h2%360,100,60,0.3));g.addColorStop(1,hsl(h2%360,100,40,0));
          c.fillStyle=g;c.fill();}
      },
    ];

    for (var pi = 20; pi < 60; pi++) {
      (function(idx) {
        var gi = idx % gens.length;
        var seed = 1 + (idx - 20) * 0.35;
        P.push(function(c, s, t, f) { gens[gi](c, s, t + idx * 0.12, f, seed); });
      })(pi);
    }
    return P;
  }

  var PATTERNS = makePatterns();
  console.log('[cube3d] ' + PATTERNS.length + ' patterns ready');

  // ============================================================
  // THREE.JS SETUP
  // ============================================================
  var canvas = document.getElementById('cubeCan');
  if (!canvas) { showCubeError('cubeCan not found'); return; }

  S.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  S.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  S.renderer.setSize(W, H);
  S.renderer.setClearColor(0x000000, 0);
  S.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  S.renderer.toneMappingExposure = 1.3;

  S.scene = new THREE.Scene();
  S.scene.fog = new THREE.FogExp2(0x000008, 0.01);

  S.camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
  S.camera.position.set(0, 1.2, 5.0);
  S.camera.lookAt(0, 0, 0);

  // Lights
  S.scene.add(new THREE.AmbientLight(0x102030, 1.0));
  var dLight = new THREE.DirectionalLight(0x00ffc8, 1.5);
  dLight.position.set(3, 6, 4);
  S.scene.add(dLight);
  var pl1 = new THREE.PointLight(0xff00ff, 2.0, 14);
  pl1.position.set(-3, 2, 2);
  S.scene.add(pl1);
  var pl2 = new THREE.PointLight(0x00e5ff, 1.5, 14);
  pl2.position.set(3, -1, 3);
  S.scene.add(pl2);
  var pl3 = new THREE.PointLight(0xffb800, 1.0, 12);
  pl3.position.set(0, -3, -2);
  S.scene.add(pl3);
  S.lights = { dir: dLight, p1: pl1, p2: pl2, p3: pl3 };

  // Face textures
  for (var fi = 0; fi < 6; fi++) {
    var fc = document.createElement('canvas'); fc.width = FS; fc.height = FS;
    var fctx = fc.getContext('2d'); fctx.fillStyle = '#000'; fctx.fillRect(0, 0, FS, FS);
    var tex = new THREE.CanvasTexture(fc); tex.needsUpdate = true;
    S.faceCanvases.push(fc); S.faceCtxs.push(fctx); S.faceTextures.push(tex);
  }

  // Cube group (for scaling independently)
  S.cubeGroup = new THREE.Group();
  S.scene.add(S.cubeGroup);

  var geo = new THREE.BoxGeometry(2, 2, 2);
  S.materials = S.faceTextures.map(function(tex) {
    return new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: new THREE.Color(0x00ffc8),
      emissiveIntensity: S.emissive, roughness: 0.12, metalness: 0.7,
    });
  });
  S.cube = new THREE.Mesh(geo, S.materials);
  S.cubeGroup.add(S.cube);

  // Edges
  var edgeMat = new THREE.LineBasicMaterial({ color: 0x00ffc8, transparent: true, opacity: S.edgeGlow });
  S.edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
  S.cube.add(S.edges);

  // Shell
  S.shellMat = new THREE.MeshBasicMaterial({
    color: 0x00ffc8, transparent: true, opacity: 0.06,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  S.shell = new THREE.Mesh(new THREE.BoxGeometry(2.12, 2.12, 2.12), S.shellMat);
  S.cube.add(S.shell);

  // Reflection cube
  S.refMats = S.faceTextures.map(function(tex) {
    return new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: new THREE.Color(0x00ffc8),
      emissiveIntensity: S.emissive * 0.25, roughness: 0.3, metalness: 0.4,
      transparent: true, opacity: 0.2,
    });
  });
  S.reflCube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), S.refMats);
  S.reflCube.position.set(0, -3.5, 0);
  S.reflCube.scale.set(1, -1, 1);
  S.reflCube.visible = S.reflection;
  S.scene.add(S.reflCube);

  // Floor
  S.reflFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x001a14, roughness: 0.03, metalness: 0.95, transparent: true, opacity: 0.4 })
  );
  S.reflFloor.rotation.x = -Math.PI / 2;
  S.reflFloor.position.y = -1.22;
  S.reflFloor.visible = S.reflection;
  S.scene.add(S.reflFloor);

  // Grid
  S.floorGrid = new THREE.GridHelper(30, 30, 0x00ffc8, 0x003828);
  S.floorGrid.position.y = -1.23;
  S.floorGrid.material.transparent = true;
  S.floorGrid.material.opacity = 0.22;
  S.floorGrid.visible = S.showGrid;
  S.scene.add(S.floorGrid);

  // Shards
  for (var si = 0; si < 28; si++) {
    var sGeo = new THREE.BoxGeometry(0.15+Math.random()*0.5, 0.15+Math.random()*0.5, 0.04+Math.random()*0.15);
    var sCol = new THREE.Color(); sCol.setHSL(0.42+Math.random()*0.15, 1, 0.55);
    var shard = new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({
      color: sCol, emissive: new THREE.Color(0x00ffc8), emissiveIntensity: 0.6,
      transparent: true, opacity: 0.88, roughness: 0.1, metalness: 0.8,
    }));
    var home = new THREE.Vector3((Math.random()-0.5)*1.8,(Math.random()-0.5)*1.8,(Math.random()-0.5)*1.8);
    shard.position.copy(home);
    shard.userData = { home: home.clone(), vel: new THREE.Vector3(),
      rotVel: new THREE.Vector3((Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08) };
    shard.visible = false;
    S.scene.add(shard);
    S.shards.push(shard);
  }  // ============================================================
  // SHATTER
  // ============================================================
  function triggerShatter() {
    if (S.shattered) {
      // reassemble
      S.shattered = false;
      S.cube.visible = S.visible;
      S.edges.visible = S.visible;
      S.shell.visible = S.visible;
      S.shards.forEach(function(sh) { sh.visible = false; });
      if (typeof showToast === 'function') showToast('Reassembled!');
      return;
    }
    S.shattered = true;
    S.cube.visible = false;
    S.edges.visible = false;
    S.shell.visible = false;
    S.shards.forEach(function(sh) {
      sh.visible = true;
      sh.position.set((Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5);
      var f = 0.08 + Math.random() * 0.16;
      sh.userData.vel.set((Math.random()-0.5)*f*6,(Math.random()-0.5)*f*6+0.06,(Math.random()-0.5)*f*6);
      sh.userData.rotVel.set((Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2);
    });
    if (typeof showToast === 'function') showToast('💥 SHATTERED!');
    // auto reassemble
    setTimeout(function() { if (S.shattered) triggerShatter(); }, 4000);
  }

  // ============================================================
  // POV MODE — inside the cube looking around
  // ============================================================
  var povCamOffset = new THREE.Vector3(0, 0, 0);
  var defaultCamPos = new THREE.Vector3(0, 1.2, 5.0);

  function enterPOV() {
    S.povMode = true;
    S.povYaw = 0;
    S.povPitch = 0;
    S.camera.position.set(0, 0, 0); // inside cube center
    S.camera.fov = 90; // wide fov for immersion
    S.camera.updateProjectionMatrix();
    // make cube faces render on inside (backside)
    S.materials.forEach(function(m) { m.side = THREE.BackSide; });
    // hide edges/shell in POV
    if (S.edges) S.edges.visible = false;
    if (S.shell) S.shell.visible = false;
    // hide reflection in POV
    if (S.reflCube) S.reflCube.visible = false;
    if (S.reflFloor) S.reflFloor.visible = false;
    if (S.floorGrid) S.floorGrid.visible = false;
    if (typeof showToast === 'function') showToast('👁 POV Mode — drag to look around');
  }

  function exitPOV() {
    S.povMode = false;
    S.camera.position.copy(defaultCamPos);
    S.camera.fov = 50;
    S.camera.updateProjectionMatrix();
    S.camera.lookAt(0, 0, 0);
    // restore face materials to front side
    S.materials.forEach(function(m) { m.side = THREE.FrontSide; });
    if (S.edges) S.edges.visible = S.visible;
    if (S.shell) S.shell.visible = S.visible;
    if (S.reflCube) S.reflCube.visible = S.reflection && S.visible;
    if (S.reflFloor) S.reflFloor.visible = S.reflection && S.visible;
    if (S.floorGrid) S.floorGrid.visible = S.showGrid && S.visible;
    if (typeof showToast === 'function') showToast('🔙 Exited POV Mode');
  }

  function updatePOVCamera() {
    if (!S.povMode) return;
    // look direction from yaw/pitch
    var dir = new THREE.Vector3();
    dir.x = Math.sin(S.povYaw) * Math.cos(S.povPitch);
    dir.y = Math.sin(S.povPitch);
    dir.z = -Math.cos(S.povYaw) * Math.cos(S.povPitch);
    dir.normalize();
    var target = new THREE.Vector3().copy(S.camera.position).add(dir);
    S.camera.lookAt(target);
  }

  // ============================================================
  // FIGHT MODE — 2D particles attack the cube
  // ============================================================
  function startFightMode() {
    S.fightMode = true;
    S.fightHP = 100;
    S.fightHits = [];
    // show game HUD
    var hud = document.getElementById('gameHUD');
    var hudTitle = document.getElementById('gameHUDTitle');
    var hudInfo = document.getElementById('gameHUDInfo');
    if (hud) hud.style.display = 'block';
    if (hudTitle) hudTitle.textContent = '⚔ CUBE FIGHT';
    if (hudInfo) hudInfo.textContent = 'HP: 100 — Particles are attacking!';
    if (typeof showToast === 'function') showToast('⚔ Fight Mode! Particles vs Cube!');
  }

  function stopFightMode() {
    S.fightMode = false;
    S.fightHP = 100;
    S.fightHits = [];
    var hud = document.getElementById('gameHUD');
    if (hud) hud.style.display = 'none';
  }

  function updateFightMode(dt) {
    if (!S.fightMode || !window.ENG) return;

    var particles = window.ENG.particles || [];
    var cubeScreenX = W / 2;
    var cubeScreenY = H / 2;
    var cubeRadius = 120 * S.cubeScale; // approximate screen radius

    var hits = 0;
    var hitPower = 0;

    // check particles near cube center
    for (var i = 0; i < particles.length; i += 3) {
      var p = particles[i];
      if (!p) continue;
      var dx = p.x - cubeScreenX;
      var dy = p.y - cubeScreenY;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < cubeRadius) {
        hits++;
        var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        hitPower += speed * 0.1;

        // push particle away from cube center
        if (dist > 1) {
          p.vx += dx / dist * 1.5;
          p.vy += dy / dist * 1.5;
        }

        // visual hit flash
        if (Math.random() < 0.05) {
          S.fightHits.push({
            x: (dx / cubeRadius) * 0.8,
            y: (dy / cubeRadius) * 0.8,
            life: 1.0,
            color: new THREE.Color().setHSL(Math.random(), 1, 0.7),
          });
        }
      }
    }

    // damage cube
    var damage = (hits * 0.001 + hitPower * 0.005) * dt * 60;
    S.fightHP = Math.max(0, S.fightHP - damage);

    // audio boost damage
    if (window.ENG.audioData && window.ENG.audioData.beat) {
      S.fightHP = Math.max(0, S.fightHP - 0.5);
    }

    // update fight hit visuals
    for (var hi = S.fightHits.length - 1; hi >= 0; hi--) {
      S.fightHits[hi].life -= dt * 2;
      if (S.fightHits[hi].life <= 0) S.fightHits.splice(hi, 1);
    }

    // make cube shake when hit
    if (hits > 5 && S.cube && !S.shattered) {
      S.cube.position.x = (Math.random() - 0.5) * 0.05 * (hits / 20);
      S.cube.position.y = (Math.random() - 0.5) * 0.05 * (hits / 20);
    } else if (S.cube && !S.shattered) {
      S.cube.position.x *= 0.9;
      S.cube.position.y *= 0.9;
    }

    // change cube color based on HP
    if (S.materials && S.fightHP < 50) {
      var damage_hue = (1 - S.fightHP / 100) * 0.1; // shift from green to red
      var dmgColor = new THREE.Color().setHSL(damage_hue, 1, 0.5);
      S.materials.forEach(function(m) {
        m.emissive.lerp(dmgColor, 0.05);
      });
    }

    // cube destroyed!
    if (S.fightHP <= 0 && !S.shattered) {
      triggerShatter();
      S.fightHP = 100; // reset for next round
      if (typeof showToast === 'function') showToast('💥 CUBE DESTROYED! Respawning...');
    }

    // render fight hit sparkles on cube
    renderFightHits();

    // update HUD
    var hudInfo = document.getElementById('gameHUDInfo');
    var hudBar = document.getElementById('gameHUDBarFill');
    if (hudInfo) hudInfo.textContent = 'HP: ' + Math.ceil(S.fightHP) + ' — Hits: ' + hits;
    if (hudBar) {
      hudBar.style.width = S.fightHP + '%';
      hudBar.style.background = S.fightHP > 50
        ? 'linear-gradient(90deg,#00ffc8,#00e5ff)'
        : S.fightHP > 25
          ? 'linear-gradient(90deg,#ffb800,#ff6600)'
          : 'linear-gradient(90deg,#ff4060,#ff0020)';
    }
  }

  function renderFightHits() {
    if (!S.fightHits.length || !S.cube) return;
    // Add sparkle point lights temporarily
    S.fightHits.forEach(function(hit) {
      if (hit.light) {
        hit.light.intensity = hit.life * 3;
        hit.light.position.set(hit.x, hit.y, 1.2);
      } else if (hit.life > 0.8) {
        // create temporary point light
        var light = new THREE.PointLight(hit.color, 3, 3);
        light.position.set(hit.x, hit.y, 1.2);
        S.cube.add(light);
        hit.light = light;
      }
    });
    // cleanup dead lights
    for (var i = S.fightHits.length - 1; i >= 0; i--) {
      if (S.fightHits[i].life <= 0 && S.fightHits[i].light) {
        S.cube.remove(S.fightHits[i].light);
        S.fightHits[i].light.dispose && S.fightHits[i].light.dispose();
      }
    }
  }

  // ============================================================
  // TOUCH: PINCH TO RESIZE
  // ============================================================
  var pinchStartDist = 0;
  var pinchStartScale = 1;

  function getTouchDist(e) {
    if (e.touches.length < 2) return 0;
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ============================================================
  // DRAG + PINCH + FLICK HANDLER
  // ============================================================
  var isDragging = false, lmx = 0, lmy = 0, flkx = 0, flky = 0;
  var flickHistory = []; // track velocity over time
  var isTouching = false, ltx = 0, lty = 0, tfx = 0, tfy = 0;
  var isPinching = false;

  function canDrag() {
    var m = (window.ENG && window.ENG.viewMode) ? window.ENG.viewMode : 'both';
    return m === '3d' || m === 'both';
  }
  function isUI(e) {
    return e.target && e.target.closest && (
      e.target.closest('#sidePanel') || e.target.closest('#topBar') ||
      e.target.closest('#modeTabs') || e.target.closest('.modalOverlay') ||
      e.target.closest('#panelToggle') || e.target.closest('#forceFieldLayer') ||
      e.target.closest('#gameHUD'));
  }

  // MOUSE
  window.addEventListener('mousedown', function(e) {
    if (!canDrag() || isUI(e)) return;
    isDragging = true; S.dragging = true;
    lmx = e.clientX; lmy = e.clientY; flkx = 0; flky = 0;
    flickHistory = [];
  });
  window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var dx = e.clientX - lmx, dy = e.clientY - lmy;
    flkx = dx; flky = dy;
    flickHistory.push({ dx: dx, dy: dy, time: performance.now() });
    if (flickHistory.length > 8) flickHistory.shift();

    if (S.povMode) {
      S.povYaw += dx * 0.005;
      S.povPitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, S.povPitch - dy * 0.005));
    } else {
      S.rotY += dx * 0.006;
      S.rotX += dy * 0.006;
    }
    lmx = e.clientX; lmy = e.clientY;
  });
  window.addEventListener('mouseup', function() {
    if (!isDragging) return;
    isDragging = false; S.dragging = false;

    // calculate flick speed from history
    var totalDX = 0, totalDY = 0;
    if (flickHistory.length >= 2) {
      var last3 = flickHistory.slice(-3);
      last3.forEach(function(h) { totalDX += h.dx; totalDY += h.dy; });
      totalDX /= last3.length;
      totalDY /= last3.length;
    }

    if (!S.povMode) {
      S.rotVX = totalDY * 0.004;
      S.rotVY = totalDX * 0.004;

      // SHATTER on fast flick
      var flickMag = Math.sqrt(totalDX * totalDX + totalDY * totalDY);
      if (flickMag > 25 && !S.shattered) {
        triggerShatter();
      }
    }
    flickHistory = [];
  });

  // TOUCH — single finger drag, two finger pinch
  window.addEventListener('touchstart', function(e) {
    if (!canDrag()) return;
    if (isUI(e)) return;

    if (e.touches.length === 2) {
      // PINCH START
      isPinching = true;
      isTouching = false;
      pinchStartDist = getTouchDist(e);
      pinchStartScale = S.targetScale;
      return;
    }

    if (e.touches.length === 1) {
      isTouching = true;
      S.dragging = true;
      ltx = e.touches[0].clientX;
      lty = e.touches[0].clientY;
      tfx = 0; tfy = 0;
      flickHistory = [];
    }
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (!canDrag()) return;

    if (isPinching && e.touches.length === 2) {
      // PINCH ZOOM
      var dist = getTouchDist(e);
      var ratio = dist / Math.max(1, pinchStartDist);
      S.targetScale = Math.max(0.3, Math.min(3.0, pinchStartScale * ratio));
      return;
    }

    if (!isTouching || e.touches.length !== 1) return;

    var dx = e.touches[0].clientX - ltx;
    var dy = e.touches[0].clientY - lty;
    tfx = dx; tfy = dy;
    flickHistory.push({ dx: dx, dy: dy, time: performance.now() });
    if (flickHistory.length > 8) flickHistory.shift();

    if (S.povMode) {
      S.povYaw += dx * 0.005;
      S.povPitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, S.povPitch - dy * 0.005));
    } else {
      S.rotY += dx * 0.006;
      S.rotX += dy * 0.006;
    }
    ltx = e.touches[0].clientX;
    lty = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', function(e) {
    if (isPinching) {
      isPinching = false;
      if (e.touches.length === 0) { isTouching = false; S.dragging = false; }
      return;
    }
    if (!isTouching) return;
    isTouching = false;
    S.dragging = false;

    // flick calculation
    var totalDX = 0, totalDY = 0;
    if (flickHistory.length >= 2) {
      var last3 = flickHistory.slice(-3);
      last3.forEach(function(h) { totalDX += h.dx; totalDY += h.dy; });
      totalDX /= last3.length;
      totalDY /= last3.length;
    }

    if (!S.povMode) {
      S.rotVX = totalDY * 0.004;
      S.rotVY = totalDX * 0.004;

      var flickMag = Math.sqrt(totalDX * totalDX + totalDY * totalDY);
      if (flickMag > 18 && !S.shattered) {
        triggerShatter();
      }
    }
    flickHistory = [];
  });

  // MOUSE WHEEL ZOOM
  window.addEventListener('wheel', function(e) {
    if (!canDrag() || S.zenOrbit || S.povMode) return;
    if (e.target.closest && e.target.closest('#sidePanel')) return;
    S.targetScale = Math.max(0.3, Math.min(3.0, S.targetScale - e.deltaY * 0.001));
  }, { passive: true });

  // ============================================================
  // PATTERN DISPLAY
  // ============================================================
  function updatePatDisplay() {
    var sel = document.getElementById('selCubePattern');
    if (sel) sel.value = S.patTarget;
    var ve = document.getElementById('valPatternIdx');
    if (ve) ve.textContent = (S.patTarget + 1) + '/' + PATTERNS.length;
  }

  // populate select
  var selPat = document.getElementById('selCubePattern');
  if (selPat) {
    selPat.innerHTML = '';
    for (var i = 0; i < PNAMES.length; i++) {
      var op = document.createElement('option'); op.value = i;
      op.textContent = (i + 1) + '. ' + PNAMES[i]; selPat.appendChild(op);
    }
    selPat.value = 0;
    selPat.addEventListener('change', function() {
      var idx = parseInt(selPat.value);
      if (!isNaN(idx) && idx >= 0 && idx < PATTERNS.length) {
        S.patTarget = idx; S.morphProg = 0; updatePatDisplay();
      }
    });
  }
  updatePatDisplay();

  // ============================================================
  // ADD POV + FIGHT BUTTONS TO PANEL
  // ============================================================
  var cubeBody = document.getElementById('secCubeBody');
  if (cubeBody) {
    // POV button
    var povBtn = document.createElement('button');
    povBtn.className = 'pBtn';
    povBtn.id = 'btnPOV';
    povBtn.textContent = '👁 Enter POV';
    povBtn.addEventListener('click', function() {
      if (S.povMode) {
        exitPOV();
        povBtn.textContent = '👁 Enter POV';
      } else {
        enterPOV();
        povBtn.textContent = '🔙 Exit POV';
      }
    });
    cubeBody.appendChild(povBtn);

    // Fight button
    var fightBtn = document.createElement('button');
    fightBtn.className = 'pBtn';
    fightBtn.id = 'btnCubeFight';
    fightBtn.textContent = '⚔ Cube Fight';
    fightBtn.addEventListener('click', function() {
      if (S.fightMode) {
        stopFightMode();
        fightBtn.textContent = '⚔ Cube Fight';
      } else {
        startFightMode();
        fightBtn.textContent = '🛑 Stop Fight';
      }
    });
    cubeBody.appendChild(fightBtn);

    // Scale display
    var scaleLabel = document.createElement('label');
    scaleLabel.className = 'pLabel';
    scaleLabel.textContent = 'Cube Scale';
    cubeBody.appendChild(scaleLabel);

    var scaleRow = document.createElement('div');
    scaleRow.className = 'pRow';
    var scaleSlider = document.createElement('input');
    scaleSlider.type = 'range'; scaleSlider.className = 'pSlider';
    scaleSlider.min = '0.3'; scaleSlider.max = '3'; scaleSlider.step = '0.1'; scaleSlider.value = '1';
    scaleSlider.id = 'sliderCubeScale';
    var scaleVal = document.createElement('span');
    scaleVal.className = 'pVal'; scaleVal.id = 'valCubeScale'; scaleVal.textContent = '1.0';
    scaleSlider.addEventListener('input', function() {
      S.targetScale = parseFloat(scaleSlider.value);
      scaleVal.textContent = S.targetScale.toFixed(1);
    });
    scaleRow.appendChild(scaleSlider); scaleRow.appendChild(scaleVal);
    cubeBody.appendChild(scaleRow);
  }

  // ============================================================
  // CONTROL BINDINGS
  // ============================================================
  function bindBtn(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
  function bindChk(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('change', function() { fn(el.checked); }); }
  function bindSlider(id, vid, fn) {
    var el = document.getElementById(id), ve = document.getElementById(vid);
    if (el) el.addEventListener('input', function() {
      var v = parseFloat(el.value); fn(v);
      if (ve) ve.textContent = v.toFixed(1);
    });
  }

  bindBtn('btnPrevPattern', function() { S.patTarget = (S.patTarget - 1 + PATTERNS.length) % PATTERNS.length; S.morphProg = 0; updatePatDisplay(); });
  bindBtn('btnNextPattern', function() { S.patTarget = (S.patTarget + 1) % PATTERNS.length; S.morphProg = 0; updatePatDisplay(); });
  bindBtn('btnRandPattern', function() { var i = Math.floor(Math.random() * PATTERNS.length); if (i === S.patIdx) i = (i + 1) % PATTERNS.length; S.patTarget = i; S.morphProg = 0; updatePatDisplay(); });
  bindBtn('btnShatter', function() { triggerShatter(); });

  bindChk('chkAutoPattern', function(v) { S.autoPat = v; S.autoTmr = 0; });
  bindChk('chkAutoSpin', function(v) { S.autoSpin = v; });
  bindChk('chkZenOrbit', function(v) { S.zenOrbit = v; if (!v && !S.povMode) { S.camera.position.copy(defaultCamPos); S.camera.lookAt(0, 0, 0); } });
  bindChk('chkReflection', function(v) { S.reflection = v; S.reflCube.visible = v && S.visible && !S.povMode; S.reflFloor.visible = v && S.visible && !S.povMode; });
  bindChk('chkFloorGrid', function(v) { S.showGrid = v; S.floorGrid.visible = v && S.visible && !S.povMode; });

  bindSlider('sliderAutoInterval', 'valAutoInterval', function(v) { S.autoInt = v; });
  bindSlider('sliderEdgeGlow', 'valEdgeGlow', function(v) { S.edgeGlow = v; if (S.edges && S.edges.material) S.edges.material.opacity = v; });
  bindSlider('sliderEmissive', 'valEmissive', function(v) {
    S.emissive = v;
    S.materials.forEach(function(m) { m.emissiveIntensity = v; });
    S.refMats.forEach(function(m) { m.emissiveIntensity = v * 0.25; });
  });

  // ============================================================
  // RESIZE
  // ============================================================
  window.addEventListener('resize', function() {
    W = window.innerWidth; H = window.innerHeight;
    S.camera.aspect = W / H;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(W, H);
  });

  // ============================================================
  // GLOBAL API
  // ============================================================
  window.setCubeVisible = function(v) {
    S.visible = v;
    if (S.cube) S.cube.visible = v && !S.shattered;
    if (S.reflCube) S.reflCube.visible = v && S.reflection && !S.povMode;
    if (S.reflFloor) S.reflFloor.visible = v && S.reflection && !S.povMode;
    if (S.floorGrid) S.floorGrid.visible = v && S.showGrid && !S.povMode;
    if (!v && S.shattered) triggerShatter();
    if (!v && S.fightMode) stopFightMode();
    if (!v && S.povMode) exitPOV();
  };

  window.nextCubePattern = function() {
    S.patTarget = (S.patIdx + 1) % PATTERNS.length;
    S.morphProg = 0;
    updatePatDisplay();
  };

  // expose fight mode for game mode buttons
  window.startCubeFight = startFightMode;
  window.stopCubeFight = stopFightMode;

  // ============================================================
  // MAIN RENDER LOOP
  // ============================================================
  function loop() {
    requestAnimationFrame(loop);

    var now = performance.now();
    var dt = Math.min((now - S.lastTime) / 1000, 0.05);
    S.lastTime = now;
    S.time += dt;
    var t = S.time;

    // --- MORPH ---
    if (S.morphProg < 1.0) {
      S.morphProg += 0.03 * dt * 60;
      if (S.morphProg >= 1.0) { S.morphProg = 1.0; S.patIdx = S.patTarget; }
    }

    // --- AUTO PATTERN ---
    if (S.autoPat) {
      S.autoTmr += dt;
      if (S.autoTmr >= S.autoInt) {
        S.autoTmr = 0;
        S.patTarget = (S.patIdx + 1) % PATTERNS.length;
        S.morphProg = 0;
        updatePatDisplay();
      }
    }

    // --- FACE TEXTURES ---
    var pi = S.patIdx % PATTERNS.length;
    var pt = S.patTarget % PATTERNS.length;
    for (var f = 0; f < 6; f++) {
      var ctx = S.faceCtxs[f];
      var ft = t + f * 0.45;
      if (S.morphProg < 1.0) {
        PATTERNS[pi](ctx, FS, ft, f);
        var tmp = document.createElement('canvas'); tmp.width = FS; tmp.height = FS;
        var tc = tmp.getContext('2d');
        PATTERNS[pt](tc, FS, ft, f);
        ctx.globalAlpha = S.morphProg;
        ctx.drawImage(tmp, 0, 0);
        ctx.globalAlpha = 1;
      } else {
        PATTERNS[pi](ctx, FS, ft, f);
      }

      // fight mode: draw damage overlay on faces
      if (S.fightMode && S.fightHP < 80) {
        var dmgAlpha = (1 - S.fightHP / 100) * 0.4;
        ctx.fillStyle = 'rgba(255,0,0,' + dmgAlpha + ')';
        ctx.fillRect(0, 0, FS, FS);
        // cracks
        if (S.fightHP < 40) {
          ctx.strokeStyle = 'rgba(255,100,50,' + (1 - S.fightHP / 40) * 0.6 + ')';
          ctx.lineWidth = 2;
          for (var cr = 0; cr < 3; cr++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * FS, Math.random() * FS);
            for (var cs = 0; cs < 5; cs++) {
              ctx.lineTo(Math.random() * FS, Math.random() * FS);
            }
            ctx.stroke();
          }
        }
      }

      S.faceTextures[f].needsUpdate = true;
    }

    // --- SCALE (smooth) ---
    S.cubeScale += (S.targetScale - S.cubeScale) * 0.12;
    if (S.cubeGroup) S.cubeGroup.scale.setScalar(S.cubeScale);
    // sync slider
    var scaleSlider2 = document.getElementById('sliderCubeScale');
    var scaleVal2 = document.getElementById('valCubeScale');
    if (scaleSlider2 && Math.abs(parseFloat(scaleSlider2.value) - S.cubeScale) > 0.05) {
      scaleSlider2.value = S.cubeScale.toFixed(1);
    }
    if (scaleVal2) scaleVal2.textContent = S.cubeScale.toFixed(1);

    // --- ROTATION ---
    if (!S.shattered && !S.povMode) {
      if (S.zenOrbit) {
        S.zenAngle += dt * 0.38;
        S.camera.position.x = Math.sin(S.zenAngle) * 5.0 * S.cubeScale;
        S.camera.position.z = Math.cos(S.zenAngle) * 5.0 * S.cubeScale;
        S.camera.position.y = 1.2 + Math.sin(S.zenAngle * 0.4) * 0.8;
        S.camera.lookAt(0, 0, 0);
      } else {
        if (!S.dragging) {
          S.rotVX *= 0.92; S.rotVY *= 0.92;
          S.rotX += S.rotVX; S.rotY += S.rotVY;
          if (S.autoSpin) S.rotY += 0.004;
        }
        S.rotX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, S.rotX));
        S.cube.rotation.x = S.rotX;
        S.cube.rotation.y = S.rotY;
        if (S.reflCube) { S.reflCube.rotation.x = S.rotX; S.reflCube.rotation.y = S.rotY; }
      }
    }

    // --- POV CAMERA ---
    updatePOVCamera();

    // --- AUDIO REACTIVITY ---
    var bass = 0, beat = false;
    try {
      if (window.ENG && window.ENG.audioData) {
        bass = window.ENG.audioData.bass || 0;
        beat = window.ENG.audioData.beat || false;
      }
    } catch (e) {}

    if (S.cube && !S.shattered && !S.povMode) {
      // audio pulse on top of pinch scale — applied to cube mesh not group
      var audioScale = beat ? 1.06 + bass * 0.05 : 1.0 + bass * 0.04;
      var cur = S.cube.scale.x;
      S.cube.scale.setScalar(cur + (audioScale - cur) * 0.18);
    }

    if (S.edges && S.edges.material) S.edges.material.opacity = Math.min(2, S.edgeGlow + bass * 0.45);
    if (S.shellMat) S.shellMat.opacity = Math.min(0.3, 0.06 + bass * 0.14);

    // lights
    if (S.lights) {
      S.lights.p1.intensity = 2.0 + bass * 3;
      S.lights.p2.intensity = 1.5 + bass * 2;
      S.lights.dir.intensity += ((beat ? 3.5 : 1.5) - S.lights.dir.intensity) * 0.08;
      S.lights.p1.position.x = Math.sin(t * 0.42) * 5;
      S.lights.p1.position.z = Math.cos(t * 0.31) * 5;
      S.lights.p2.position.x = Math.cos(t * 0.37) * 4;
      S.lights.p2.position.z = Math.sin(t * 0.43) * 4;
      S.lights.p3.position.x = Math.sin(t * 0.2 + 1) * 3;
    }

    // --- SHARDS ---
    if (S.shattered) {
      S.shards.forEach(function(sh) {
        if (!sh.visible) return;
        sh.userData.vel.x += (sh.userData.home.x - sh.position.x) * 0.03;
        sh.userData.vel.y += (sh.userData.home.y - sh.position.y) * 0.03;
        sh.userData.vel.z += (sh.userData.home.z - sh.position.z) * 0.03;
        sh.userData.vel.multiplyScalar(0.86);
        sh.position.add(sh.userData.vel);
        sh.rotation.x += sh.userData.rotVel.x;
        sh.rotation.y += sh.userData.rotVel.y;
        sh.rotation.z += sh.userData.rotVel.z;
        sh.userData.rotVel.multiplyScalar(0.93);
      });
    }

    // --- FIGHT MODE ---
    updateFightMode(dt);

    // --- RENDER ---
    S.renderer.render(S.scene, S.camera);
  }

  // ============================================================
  // START
  // ============================================================
  loop();
  console.log('[cube3d] ✅ Cube engine running with:');
  console.log('  → ' + PATTERNS.length + ' patterns');
  console.log('  → Pinch to resize');
  console.log('  → Flick to shatter');
  console.log('  → POV mode');
  console.log('  → Fight mode');

} // end startCubeEngine
