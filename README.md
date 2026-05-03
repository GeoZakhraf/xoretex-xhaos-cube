```markdown
<div align="center">
# GeoZakhraf Xhaos Engine v2.0
> **Pure Mathematical Generative Art · Live 2D → 3D Texture Integration**
> 
> **فن توليدي رياضي خالص · تكامل النسيج الحي ثنائي الأبعاد إلى ثلاثي الأبعاد**
[![GeoZakhraf](https://img.shields.io/badge/GeoZakhraf-Xhaos%20Engine-00f0ff?style=for-the-badge&labelColor=000008)](https://github.com/GeoZakhraf/xoretex-xhaos-cube)
[![Version](https://img.shields.io/badge/version-2.0-8b00ff?style=for-the-badge&labelColor=000008)](#)
[![License](https://img.shields.io/badge/license-MIT-ffd700?style=for-the-badge&labelColor=000008)](#)
[![Language](https://img.shields.io/badge/AR%20%2F%20EN-bilingual-00ff88?style=for-the-badge&labelColor=000008)](#)
<br>
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
| </details> |  |  |  | <br> ### 🎛️ Parameters
| Slider | Range | Effect | Slider | Range | Effect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Speed** | 0 – 3 | Time advance rate | **Rotation** | -2 – 2 | Cube auto-rotation |
| **Scale** | 0.1 – 5 | Formula zoom level | **Density** | 500 – 5000 | Particle count |
| **Chaos** | 0 – 1 | Trail length · aberration | **Tex Depth** | 0 – 1 | Texture opacity |
| **Bloom** | 0 – 3 | Neon glow intensity |  |  |  |

### 🧮 Mathematics Core
```javascript
// Value Noise & Fractional Brownian Motion
noise2(x, y) → [-1, 1]
fBm(x, y, octaves) = Σ 0.5ⁱ · noise(2ⁱ·x, 2ⁱ·y)
// Domain Warp
warp(x, y, t, iters) → distorted (x, y)
// Example: Formula 60 — Phantom Field
w        = warp(0.003x, 0.003y, 0.15t, 4)
F(x,y,t) = 7·fBm(w.x, w.y, 6) + atan2(y-cy, x-cx)·0.2
```
## 🇸🇦 العربية
### ما هذا المشروع
**محرك جيو زخرف الفوضوي** هو منصة فن توليدي في الوقت الفعلي، مبنية من الصفر باستخدام JavaScript الخالص و Three.js وشيدرات GLSL.
يعمل المحرك على تشغيل محركَين متزامنَين في آنٍ واحد:
 1. **حقل جسيمات ثنائي الأبعاد** يُصيّر 60 صيغة رياضية.
 2. **مكعب ثلاثي الأبعاد تفاعلي** يرتدي لوحة الرسم ثنائية الأبعاد كجلدٍ حيٍّ له.
يرتبط المحركان بـ **تماثل الانعكاس** — يتفاعل كلٌّ منهما دائمًا مع الآخر في الاتجاه الرياضي المعاكس.
### ✨ الميزات
 * **60 صيغة رياضية:** fBm · تشويه المجال · فورونوي · قطبي
 * **نسيج حي 2D ← 3D:** رسم canvas2d على وجوه المكعب كل إطار
 * **تماثل الانعكاس:** عقارب الساعة 2D → عكس 3D · توسع → انهيار
 * **معالجة ما بعد التصيير:** Bloom · انحراف لوني · حبوب فيلمية
 * **تحطيم فورونوي:** 32 شظية فيزيائية عند اللمس أو الإيقاع
 * **وضع POV:** منظور الشخص الأول داخل المكعب
 * **تفاعل صوتي:** كشف الإيقاع · BPM · تحليل 6 نطاقات ترددية
 * **ثنائي اللغة:** العربية RTL + الإنجليزية LTR
 * **جاهز للجوال:** لمس · تكبير بأصبعين · سحب · مناطق آمنة
### ⚙️ كيف يعمل التكامل
```javascript
كل إطار:
  engine2d.js     يُصيّر حقل الجسيمات → canvas2d
                                              │
  cube3d.js       THREE.CanvasTexture(canvas2d) ◄────┘
                  liveTexture.needsUpdate = true
                  composer.render() → وجوه المكعب تعرض الجسيمات
                                              │
  main.js         Engine2D.getMetrics()  ◄────┘
                  SyncController.tick()
                  ├─ rotationDir   عقارب 2D → عكس 3D
                  ├─ scaleMult     توسع → انهيار
                  └─ energy        فوضى → ضغط
                  Cube3D.setSyncData()
```
### 🪞 قواعد تماثل الانعكاس

| حالة المحرك الثنائي (2D) | تفاعل المحرك الثلاثي (3D) |
| :--- | :--- |
| دوران مع عقارب الساعة | دوران عكس عقارب الساعة |
| توسع (Expanding) | انهيار للداخل (Imploding) |
| فوضى عالية | يُضغط بشكل أكبر |
| **المؤثر الصوتي** | **تفاعل النظام** |
| إيقاع صوتي (Beat) | المكعب يتحطم |
| تردد عالٍ | إضاءة Bloom تشتد |
| BPM أعلى من 120 | الدوران يتسارع | <br> ### 🕹️ أدوات التحكم <br> <details> <br> <summary><strong>⌨️ اختصارات لوحة المفاتيح</strong></summary>
| المفتاح | الوظيفة | المفتاح | الوظيفة |
| :--- | :--- | :--- | :--- |
| SPACE | تحطيم المكعب | F | ملء الشاشة |
| R | صيغ عشوائية | L | تغيير اللغة |
| P | وضع POV | ← → | التنقل بين الصيغ |
| T | تبديل النسيج / الشيدر | ? | عرض الاختصارات |
| A | تفعيل الصوت | ESC | الخروج من POV / إغلاق |
| </details> |  |  |  | <br> <details> <br> <summary><strong>🖱️ الماوس والجوال</strong></summary>
| الإجراء (الماوس) | النتيجة | الإجراء (الجوال) | النتيجة |
| :--- | :--- | :--- | :--- |
| سحب | تدوير المكعب | سحب بإصبع واحد | تدوير المكعب |
| رمي سريع | تحطيم | قرص بإصبعين | تكبير / تصغير |
| نقر مزدوج | تغيير لوحة الألوان | رمي سريع | تحطيم |
|  |  | سحب من الحافة / ☰ | فتح لوحة الصيغ |
| </details> |  |  |  |

### 🧮 النواة الرياضية
```javascript
// الحركة البراونية الكسورية & ضوضاء القيمة
noise2(x, y) → [-1, 1]
fBm(x, y, octaves) = Σ 0.5ⁱ · noise(2ⁱ·x, 2ⁱ·y)
// تشويه المجال
warp(x, y, t, iters) → إحداثيات مشوهة
// مثال: الصيغة 60 — حقل خفي
w        = warp(0.003x, 0.003y, 0.15t, 4)
F(x,y,t) = 7·fBm(w.x, w.y, 6) + atan2(y-cy, x-cx)·0.2
```
## 🛠️ Tech Stack · المكدس التقني
 * **Three.js r128:** 3D rendering · EffectComposer
 * **GLSL:** 60-mode fragment shader · face material
 * **Web Audio API:** Microphone · FFT · beat detection
 * **Canvas 2D API:** Particle flow-field renderer
 * **Vanilla JavaScript:** Zero frameworks · zero build tools
## 🚀 Quick Start · البدء السريع
```bash
# استنساخ المستودع | Clone repository
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
