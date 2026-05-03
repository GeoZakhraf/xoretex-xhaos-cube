```markdown
<div align="center">
# GeoZakhraf Xhaos Engine v2.0
> **Pure Mathematical Generative Art · Live 2D → 3D Texture Integration**
> 
> **فن توليدي رياضي خالص · تكامل النسيج الحي ثنائي الأبعاد إلى ثلاثي الأبعاد**
<br>
<img src="https://img.shields.io/badge/GeoZakhraf-Xhaos%20Engine-00f0ff?style=for-the-badge&labelColor=000008" alt="GeoZakhraf">
<img src="https://img.shields.io/badge/version-2.0-8b00ff?style=for-the-badge&labelColor=000008" alt="Version">
<img src="https://img.shields.io/badge/license-MIT-ffd700?style=for-the-badge&labelColor=000008" alt="License">
<img src="https://img.shields.io/badge/AR%20%2F%20EN-bilingual-00ff88?style=for-the-badge&labelColor=000008" alt="Language">
<br><br>
### 🌐 Live Demo · العرض المباشر
**[🚀 Launch GeoZakhraf Xhaos Engine · تشغيل المحرك](https://GeoZakhraf.github.io/xoretex-xhaos-cube/)**
*Open on desktop or mobile — no installation required.*
*افتح على سطح المكتب أو الجوال — لا يلزم تثبيت أي شيء.*
</div>
---
## 🇬🇧 English
### What Is This
**GeoZakhraf Xhaos Engine** is a real-time generative art platform built from scratch using vanilla JavaScript, Three.js, and GLSL shaders. 
It runs two synchronized engines simultaneously:
1. A **2D particle flow-field** that renders 60 mathematical formulas.
2. A **3D interactive cube** that wears the 2D canvas as its live skin.
The two engines are linked by **Inversion Symmetry** — they always react to each other in mathematically opposite directions.
### ✨ Features
* **60 Mathematical Formulas:** fBm · Domain Warp · Voronoi · Polar
* **Live 2D → 3D Texture:** `canvas2d` painted onto cube faces every frame
* **Inversion Symmetry:** CW 2D → CCW 3D · Outward → Implode
* **Post-Processing:** Bloom · Chromatic Aberration · Film Grain
* **Voronoi Shatter:** 32 physics-driven shards on flick or beat
* **POV Mode:** First-person inside the cube
* **Audio Reactive:** Beat detection · BPM · 6-band FFT
* **Bilingual:** Arabic RTL + English LTR
* **Mobile Ready:** Touch · Pinch-zoom · Swipe · Safe areas
### ⚙️ How The Integration Works
```javascript
Every Frame:
  engine2d.js     renders 60-formula particle field → canvas2d
                                                          │
  cube3d.js       THREE.CanvasTexture(canvas2d)  ◄────────┘
                  liveTexture.needsUpdate = true
                  composer.render() → cube faces show particles
                                                          │
  main.js         Engine2D.getMetrics()           ◄────────┘
                  SyncController.tick()
                  ├─ rotationDir  CW 2D → CCW 3D
                  ├─ scaleMult    outward → implode
                  └─ energy       chaos → compress
                  Cube3D.setSyncData()
```
### 🪞 Inversion Symmetry Rules

| 2D Engine State | 3D Engine Reaction |
| :--- | :--- |
| Clockwise Rotation | Counter-Clockwise Rotation |
| Expanding | Imploding |
| High Chaos | Compressed Further |
| **Audio Trigger** | **System Reaction** |
| Audio Beat | Cube Shatters |
| High Frequency | Bloom Intensifies |
| BPM > 120 | Rotation Speeds Up | <br> ### 🕹️ Controls <br> <details> <br> <summary><strong>⌨️ Keyboard Shortcuts</strong></summary>
| Key | Action | Key | Action |
| :--- | :--- | :--- | :--- |
| SPACE | Shatter cube | F | Fullscreen |
| R | Randomize formulas | L | Switch language |
| P | Toggle POV mode | ← → | Cycle formula |
| T | Toggle live texture/shader | ? | Show shortcuts |
| A | Toggle audio | ESC | Exit POV / close panels |
| </details> |  |  |  | <br> <details> <br> <summary><strong>🖱️ Mouse & Mobile</strong></summary>
| Action (Mouse) | Result | Action (Mobile) | Result |
| :--- | :--- | :--- | :--- |
| Drag | Rotate cube | Single finger drag | Rotate cube |
| Fast flick | Shatter | Pinch | Zoom in / out |
| Double-click | Cycle colour palette | Fast flick | Shatter |
|  |  | Edge swipe / ☰ | Open formula panel |
| </details> |  |  |  | <br> ## 🇸🇦 العربية <br> ### ما هذا المشروع <br> **محرك جيو زخرف الفوضوي** هو منصة فن توليدي في الوقت الفعلي، مبنية من الصفر باستخدام JavaScript الخالص و Three.js وشيدرات GLSL. <br> يعمل المحرك على تشغيل محركَين متزامنَين في آنٍ واحد: <br> 1. **حقل جسيمات ثنائي الأبعاد** يُصيّر 60 صيغة رياضية. <br> 2. **مكعب ثلاثي الأبعاد تفاعلي** يرتدي لوحة الرسم ثنائية الأبعاد كجلدٍ حيٍّ له. <br> يرتبط المحركان بـ **تماثل الانعكاس** — يتفاعل كلٌّ منهما دائمًا مع الآخر في الاتجاه الرياضي المعاكس. <br> ### ✨ الميزات <br> * **60 صيغة رياضية:** fBm · تشويه المجال · فورونوي · قطبي <br> * **نسيج حي 2D ← 3D:** رسم canvas2d على وجوه المكعب كل إطار <br> * **تماثل الانعكاس:** عقارب الساعة 2D → عكس 3D · توسع → انهيار <br> * **معالجة ما بعد التصيير:** Bloom · انحراف لوني · حبوب فيلمية <br> * **تحطيم فورونوي:** 32 شظية فيزيائية عند اللمس أو الإيقاع <br> * **وضع POV:** منظور الشخص الأول داخل المكعب <br> * **تفاعل صوتي:** كشف الإيقاع · BPM · تحليل 6 نطاقات ترددية <br> * **ثنائي اللغة:** العربية RTL + الإنجليزية LTR <br> * **جاهز للجوال:** لمس · تكبير بأصبعين · سحب · مناطق آمنة <br> ### 🪞 قواعد تماثل الانعكاس
| حالة المحرك الثنائي (2D) | تفاعل المحرك الثلاثي (3D) |
| :--- | :--- |
| دوران مع عقارب الساعة | دوران عكس عقارب الساعة |
| توسع (Expanding) | انهيار للداخل (Imploding) |
| فوضى عالية | يُضغط بشكل أكبر |
| **المؤثر الصوتي** | **تفاعل النظام** |
| إيقاع صوتي (Beat) | المكعب يتحطم |
| تردد عالٍ | إضاءة Bloom تشتد |
| BPM أعلى من 120 | الدوران يتسارع | <br> ## 🛠️ Tech Stack · المكدس التقني <br> * **Three.js r128:** 3D rendering · EffectComposer <br> * **GLSL:** 60-mode fragment shader · face material <br> * **Web Audio API:** Microphone · FFT · beat detection <br> * **Canvas 2D API:** Particle flow-field renderer <br> * **Vanilla JavaScript:** Zero frameworks · zero build tools <br> ## 🚀 Quick Start · البدء السريع <br> ```bash <br> # استنساخ المستودع | Clone repository

git clone [https://github.com/GeoZakhraf/xoretex-xhaos-cube.git](https://github.com/GeoZakhraf/xoretex-xhaos-cube.git)
# الفتح في المتصفح | Open — no build step needed
cd xoretex-xhaos-cube
open index.html
```
<div align="center">
**GeoZakhraf** © 2024
GitHub Profile | Repository
*Licensed under the MIT License — use freely, credit appreciated.*
*Where mathematics becomes visible.*
*حيث تصبح الرياضيات مرئية.*
</div>
```
```
