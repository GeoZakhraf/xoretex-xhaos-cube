```markdown
# GeoZakhraf Xhaos Engine v2.0

> **Pure Mathematical Generative Art · Live 2D → 3D Texture Integration**
>
> **فن توليدي رياضي خالص · تكامل النسيج الحي ثنائي الأبعاد إلى ثلاثي الأبعاد**

![GeoZakhraf](https://img.shields.io/badge/GeoZakhraf-Xhaos%20Engine-00f0ff?style=flat-square&labelColor=000008)
![Version](https://img.shields.io/badge/version-2.0-8b00ff?style=flat-square&labelColor=000008)
![License](https://img.shields.io/badge/license-MIT-ffd700?style=flat-square&labelColor=000008)
![Language](https://img.shields.io/badge/AR%20%2F%20EN-bilingual-00ff88?style=flat-square&labelColor=000008)

---

## 🌐 Live Demo · العرض المباشر

**[▶ Launch GeoZakhraf Xhaos Engine · تشغيل المحرك](https://GeoZakhraf.github.io/xoretex-xhaos-cube/)**

> Open on desktop or mobile — no installation required.
>
> افتح على سطح المكتب أو الجوال — لا يلزم تثبيت أي شيء.

---

## 🇬🇧 English

### What Is This

GeoZakhraf Xhaos Engine is a real-time generative art platform
built from scratch using vanilla JavaScript, Three.js, and GLSL shaders.

It runs two synchronized engines simultaneously:

- A **2D particle flow-field** that renders 60 mathematical formulas
- A **3D interactive cube** that wears the 2D canvas as its live skin

The two engines are linked by **Inversion Symmetry** — they always
react to each other in mathematically opposite directions.

### Features

```
60 Mathematical Formulas    fBm · Domain Warp · Voronoi · Polar
Live 2D → 3D Texture        canvas2d painted onto cube faces every frame
Inversion Symmetry          CW 2D → CCW 3D · Outward → Implode
Post-Processing             Bloom · Chromatic Aberration · Film Grain
Voronoi Shatter             32 physics-driven shards on flick or beat
POV Mode                    First-person inside the cube
Audio Reactive              Beat detection · BPM · 6-band FFT
Bilingual                   Arabic RTL + English LTR
Mobile Ready                Touch · Pinch-zoom · Swipe · Safe areas
```

### How The Integration Works

```
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

### Inversion Symmetry Rules

```
2D Clockwise    →   3D Counter-Clockwise
2D Expanding    →   3D Imploding
High 2D Chaos   →   3D Compressed Further
Audio Beat      →   Cube Shatters
High Frequency  →   Bloom Intensifies
BPM > 120       →   Rotation Speeds Up
```

### Controls

#### Keyboard

| Key | Action |
|-----|--------|
| `SPACE` | Shatter cube |
| `R` | Randomize formulas |
| `P` | Toggle POV mode |
| `T` | Toggle live texture / shader |
| `A` | Toggle audio |
| `F` | Fullscreen |
| `L` | Switch language |
| `← →` | Cycle formula |
| `?` | Show shortcuts |
| `ESC` | Exit POV / close panels |

#### Mouse

| Action | Result |
|--------|--------|
| Drag | Rotate cube |
| Fast flick | Shatter |
| Double-click | Cycle colour palette |

#### Mobile

| Gesture | Result |
|---------|--------|
| Single finger drag | Rotate cube |
| Pinch | Zoom in / out |
| Fast flick | Shatter |
| Edge swipe | Open formula panel |
| ☰ button | Open formula panel |
| ✕ EXIT POV | Exit POV mode |

### Parameters

| Slider | Range | Effect |
|--------|-------|--------|
| Speed | 0 – 3 | Time advance rate |
| Scale | 0.1 – 5 | Formula zoom level |
| Chaos | 0 – 1 | Trail length · aberration |
| Bloom | 0 – 3 | Neon glow intensity |
| Rotation | -2 – 2 | Cube auto-rotation |
| Density | 500 – 5000 | Particle count |
| Tex Depth | 0 – 1 | Texture opacity |

### The 60 Formulas

| # | Name | # | Name | # | Name |
|---|------|---|------|---|------|
| 01 | Fiber Optics | 21 | Crystal Lattice | 41 | Grid Stream |
| 02 | Digital Silk | 22 | Nebula | 42 | Cloud Chamber |
| 03 | Wave Turbulence | 23 | Woven Fabric | 43 | Ink Diffusion |
| 04 | Dynamic Vortex | 24 | Black Hole | 44 | Luminous Web |
| 05 | Neural Grid | 25 | Aurora Borealis | 45 | Harmonic Tiles |
| 06 | Data Blocks | 26 | Voronoi Flow | 46 | Spiral Garden |
| 07 | Sand Waves | 27 | Interference Rings | 47 | Mercury Flow |
| 08 | Galactic River | 28 | Tornado | 48 | Prism Wave |
| 09 | Radial Drift | 29 | Neural Network | 49 | Orbit Net |
| 10 | Geometric Repeat | 30 | Galaxy Arm | 50 | Ember Drift |
| 11 | Magnetic Field | 31 | Liquid Marble | 51 | Glass Refraction |
| 12 | Ordered Chaos | 32 | Solar Flare | 52 | Ocean Current |
| 13 | Fractal Spiral | 33 | Frozen Veins | 53 | Silk Bloom |
| 14 | Electric Storm | 34 | Velvet Fold | 54 | Flux Rings |
| 15 | DNA Helix | 35 | Band Current | 55 | Industrial Flow |
| 16 | Coral Growth | 36 | Sonic Ripples | 56 | Star Nursery |
| 17 | Quantum Field | 37 | Plasma Mesh | 57 | Wave Lattice |
| 18 | Topographic Map | 38 | Marble Vein | 58 | Moiré Pulse |
| 19 | Mirror Flow | 39 | Hyper Tunnel | 59 | Orbital Current |
| 20 | Smoke Simulation | 40 | Biofilm Drift | 60 | Phantom Field |

### Mathematics Core

```javascript
// Value Noise
noise2(x, y) → [-1, 1]

// Fractional Brownian Motion
fBm(x, y, octaves) = Σ 0.5ⁱ · noise(2ⁱ·x, 2ⁱ·y)

// Turbulence
turb(x, y, octaves) = Σ 0.5ⁱ · |noise(2ⁱ·x, 2ⁱ·y)|

// Domain Warp
warp(x, y, t, iters) → distorted (x, y)

// Formula 01 — Fiber Optics
F(x,y,t) = [sin(0.003s·x + t) + cos(0.003s·y + t)] × 2.2
           + fBm(0.003s·x, 0.003s·y, 4) × 3

// Formula 24 — Black Hole
pull     = 1 / (0.003·r + 0.1)
F(x,y,t) = θ + pull·2 + 0.3t + sin(0.01s·r - 2t)·0.5

// Formula 60 — Phantom Field
w        = warp(0.003x, 0.003y, 0.15t, 4)
F(x,y,t) = 7·fBm(w.x, w.y, 6) + atan2(y-cy, x-cx)·0.2
```

### File Structure

```
xoretex-xhaos-cube/
├── index.html      Shell · canvases · UI structure · CDN imports
├── styles.css      Design system · glassmorphism · RTL · responsive
├── engine2d.js     60 JS formulas · particle system · metrics output
├── cube3d.js       Three.js · CanvasTexture · shatter · POV · bloom
├── audio.js        FFT · beat detection · BPM · 6-band analysis
├── ui.js           Bilingual UI · presets · sliders · mobile menu
└── main.js         SyncController · loader · master loop · boot
```

### Tech Stack

```
Three.js r128          3D rendering · EffectComposer
GLSL                   60-mode fragment shader · face material
Web Audio API          Microphone · FFT · beat detection
Canvas 2D API          Particle flow-field renderer
CanvasTexture          Live 2D → 3D texture bridge
UnrealBloomPass        Neon glow post-processing
Vanilla JavaScript     Zero frameworks · zero build tools
```

### Browser Support

```
Chrome  88+   ✓  Recommended
Firefox 85+   ✓  Supported
Safari  14+   ✓  Supported (iOS 14.0+)
Edge    88+   ✓  Supported
```

### Performance

- Sustains **60 FPS** on mid-range mobile devices
- Auto-reduces particle density at < 28 FPS
- Restores quality when FPS recovers above 50
- Pixel ratio capped at 2× for OLED efficiency
- Engines pause automatically when tab is hidden
- iOS safe area insets supported for notch devices

### Quick Start

```bash
# Clone
git clone https://github.com/GeoZakhraf/xoretex-xhaos-cube.git

# Open — no build step needed
cd xoretex-xhaos-cube
open index.html
```

---

## 🇸🇦 العربية

### ما هذا المشروع

محرك جيو زخرف الفوضوي هو منصة فن توليدي في الوقت الفعلي،
مبنية من الصفر باستخدام JavaScript الخالص و Three.js وشيدرات GLSL.

يعمل المحرك على تشغيل محركَين متزامنَين في آنٍ واحد:

- **حقل جسيمات ثنائي الأبعاد** يُصيّر 60 صيغة رياضية
- **مكعب ثلاثي الأبعاد تفاعلي** يرتدي لوحة الرسم ثنائية الأبعاد كجلدٍ حيٍّ له

يرتبط المحركان بـ **تماثل الانعكاس** — يتفاعل كلٌّ منهما دائمًا
مع الآخر في الاتجاه الرياضي المعاكس.

### الميزات

```
60 صيغة رياضية         fBm · تشويه المجال · فورونوي · قطبي
نسيج حي 2D ← 3D        رسم canvas2d على وجوه المكعب كل إطار
تماثل الانعكاس          عقارب الساعة 2D → عكس 3D · توسع → انهيار
معالجة ما بعد التصيير   Bloom · انحراف لوني · حبوب فيلمية
تحطيم فورونوي           32 شظية فيزيائية عند اللمس أو الإيقاع
وضع POV                 منظور الشخص الأول داخل المكعب
تفاعل صوتي              كشف الإيقاع · BPM · تحليل 6 نطاقات ترددية
ثنائي اللغة             العربية RTL + الإنجليزية LTR
جاهز للجوال             لمس · تكبير بأصبعين · سحب · مناطق آمنة
```

### كيف يعمل التكامل

```
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

### قواعد تماثل الانعكاس

```
2D عقارب الساعة      →   3D عكس عقارب الساعة
2D يتوسع             →   3D ينهار للداخل
فوضى 2D عالية        →   3D يُضغط أكثر
إيقاع صوتي           →   المكعب يتحطم
تردد عالٍ            →   Bloom يشتد
BPM أعلى من 120      →   الدوران يتسارع
```

### أدوات التحكم

#### لوحة المفاتيح

| المفتاح | الوظيفة |
|---------|---------|
| `SPACE` | تحطيم المكعب |
| `R` | صيغ عشوائية |
| `P` | وضع POV |
| `T` | تبديل النسيج / الشيدر |
| `A` | تفعيل الصوت |
| `F` | ملء الشاشة |
| `L` | تغيير اللغة |
| `← →` | التنقل بين الصيغ |
| `?` | عرض الاختصارات |
| `ESC` | الخروج من POV / إغلاق |

#### الماوس

| الإجراء | النتيجة |
|---------|---------|
| سحب | تدوير المكعب |
| رمي سريع | تحطيم |
| نقر مزدوج | تغيير لوحة الألوان |

#### الجوال

| الإيماءة | النتيجة |
|---------|---------|
| سحب بإصبع واحد | تدوير المكعب |
| قرص بإصبعين | تكبير / تصغير |
| رمي سريع | تحطيم |
| سحب من الحافة | فتح لوحة الصيغ |
| زر ☰ | فتح لوحة الصيغ |
| ✕ خروج POV | الخروج من وضع POV |

### المعاملات

| المتحكم | النطاق | التأثير |
|---------|--------|---------|
| السرعة | 0 – 3 | معدل تقدم الزمن |
| النطاق | 0.1 – 5 | مستوى تكبير الصيغة |
| الفوضى | 0 – 1 | طول الذيل · الانحراف اللوني |
| الإضاءة | 0 – 3 | شدة التوهج النيوني |
| الدوران | -2 – 2 | سرعة دوران المكعب |
| الكثافة | 500 – 5000 | عدد الجسيمات |
| عمق النسيج | 0 – 1 | شفافية النسيج |

### الصيغ الـ 60

| # | الاسم | # | الاسم | # | الاسم |
|---|-------|---|-------|---|-------|
| 01 | ألياف ضوئية | 21 | شبكة بلورية | 41 | تيار شبكي |
| 02 | حرير رقمي | 22 | سديم | 42 | غرفة السحاب |
| 03 | اضطراب موجي | 23 | نسيج منسوج | 43 | انتشار الحبر |
| 04 | دوامة ديناميكية | 24 | ثقب أسود | 44 | شبكة مضيئة |
| 05 | شبكة عصبية | 25 | الشفق القطبي | 45 | بلاط توافقي |
| 06 | كتل البيانات | 26 | تدفق فورونوي | 46 | حديقة حلزونية |
| 07 | أمواج الرمل | 27 | حلقات التداخل | 47 | تدفق الزئبق |
| 08 | نهر المجرة | 28 | إعصار | 48 | موجة المنشور |
| 09 | انجراف شعاعي | 29 | شبكة عصبونية | 49 | شبكة مدارية |
| 10 | تكرار هندسي | 30 | ذراع المجرة | 50 | انجراف الجمر |
| 11 | حقل مغناطيسي | 31 | رخام سائل | 51 | انكسار زجاجي |
| 12 | فوضى منظمة | 32 | شعلة شمسية | 52 | تيار المحيط |
| 13 | حلزون كسوري | 33 | أوردة مجمدة | 53 | زهرة حريرية |
| 14 | عاصفة كهربائية | 34 | طية المخمل | 54 | حلقات التدفق |
| 15 | حلزون الحمض النووي | 35 | تيار شريطي | 55 | تدفق صناعي |
| 16 | نمو المرجان | 36 | تموجات صوتية | 56 | مشتل النجوم |
| 17 | حقل كمي | 37 | شبكة بلازما | 57 | شبكة موجية |
| 18 | خريطة طبوغرافية | 38 | وريد رخامي | 58 | نبض التداخل |
| 19 | تدفق المرآة | 39 | نفق خارق | 59 | تيار مداري |
| 20 | محاكاة الدخان | 40 | انجراف طحلبي | 60 | حقل خفي |

### النواة الرياضية

```javascript
// ضوضاء القيمة
noise2(x, y) → [-1, 1]

// الحركة البراونية الكسورية
fBm(x, y, octaves) = Σ 0.5ⁱ · noise(2ⁱ·x, 2ⁱ·y)

// الاضطراب
turb(x, y, octaves) = Σ 0.5ⁱ · |noise(2ⁱ·x, 2ⁱ·y)|

// تشويه المجال
warp(x, y, t, iters) → إحداثيات مشوهة

// الصيغة 01 — ألياف ضوئية
F(x,y,t) = [sin(0.003s·x + t) + cos(0.003s·y + t)] × 2.2
           + fBm(0.003s·x, 0.003s·y, 4) × 3

// الصيغة 24 — ثقب أسود
سحب     = 1 / (0.003·r + 0.1)
F(x,y,t) = θ + سحب·2 + 0.3t + sin(0.01s·r - 2t)·0.5

// الصيغة 60 — حقل خفي
w        = warp(0.003x, 0.003y, 0.15t, 4)
F(x,y,t) = 7·fBm(w.x, w.y, 6) + atan2(y-cy, x-cx)·0.2
```

### هيكل الملفات

```
xoretex-xhaos-cube/
├── index.html      الهيكل · اللوحات · واجهة المستخدم · CDN
├── styles.css      نظام التصميم · glassmorphism · RTL · متجاوب
├── engine2d.js     60 صيغة JS · نظام الجسيمات · إخراج المقاييس
├── cube3d.js       Three.js · CanvasTexture · تحطيم · POV · bloom
├── audio.js        FFT · كشف الإيقاع · BPM · 6 نطاقات
├── ui.js           واجهة ثنائية اللغة · إعدادات · شرائح · جوال
└── main.js         SyncController · تحميل · حلقة رئيسية · تشغيل
```

### المكدس التقني

```
Three.js r128          تصيير 3D · EffectComposer
GLSL                   شيدر مجزأ 60 وضعًا · مادة الوجه
Web Audio API          مايكروفون · FFT · كشف الإيقاع
Canvas 2D API          مُصيّر حقل الجسيمات
CanvasTexture          جسر النسيج الحي 2D → 3D
UnrealBloomPass        معالجة التوهج النيوني
Vanilla JavaScript     بدون أطر عمل · بدون أدوات بناء
```

### دعم المتصفحات

```
Chrome  88+   ✓  موصى به
Firefox 85+   ✓  مدعوم
Safari  14+   ✓  مدعوم (iOS 14.0+)
Edge    88+   ✓  مدعوم
```

### الأداء

- يُحافظ على **60 FPS** على أجهزة الجوال المتوسطة
- يخفض كثافة الجسيمات تلقائيًا عند أقل من 28 إطار
- يستعيد الجودة عند عودة الأداء فوق 50 إطار
- نسبة البكسل محدودة بـ 2× لكفاءة شاشات OLED
- يتوقف المحركان تلقائيًا عند إخفاء التبويب
- دعم مناطق الأمان لأجهزة الشق (Notch)

### البدء السريع

```bash
# استنساخ المستودع
git clone https://github.com/GeoZakhraf/xoretex-xhaos-cube.git

# الفتح في المتصفح — لا خطوات بناء
cd xoretex-xhaos-cube
open index.html
```

---

## تفعيل GitHub Pages · Enable GitHub Pages

```
GitHub Repository → Settings → Pages
  → Source: Deploy from branch
    → Branch: main
      → Folder: / (root)
        → Save
```

الرابط المباشر · Live URL:
**[https://GeoZakhraf.github.io/xoretex-xhaos-cube/](https://GeoZakhraf.github.io/xoretex-xhaos-cube/)**

---

## المؤلف · Author

**GeoZakhraf**

[github.com/GeoZakhraf](https://github.com/GeoZakhraf)
[xoretex-xhaos-cube](https://github.com/GeoZakhraf/xoretex-xhaos-cube)

---

## الرخصة · License

MIT License — استخدم بحرية، الإشارة للمصدر تُقدَّر.

MIT License — use freely, credit appreciated.

```
MIT License
Copyright (c) 2024 GeoZakhraf

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall
be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
```

---

<div align="center">

*Where mathematics becomes visible.*

*حيث تصبح الرياضيات مرئية.*

</div>
```
