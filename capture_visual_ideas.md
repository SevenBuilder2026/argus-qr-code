# CaptureScreen Visual Improvement Ideas

Generated 2026-04-23. To be implemented and compared one by one.

---

## Option 1 — Directional Breathing Frame *(simplest, highest impact)*

The guide frame pulses **larger** when too far ("fill me"), **smaller** when too close ("back off").
At ideal distance it locks still and glows green.

- Complexity: low (~30 min)
- Universal: yes, pre-linguistic, no cultural prerequisite
- Brand fit: neutral

Implementation sketch:
- `frameScale` animated value driven by distance zone: far → 1.08 breathing, close → 0.92 breathing, ideal → 1.0 locked
- Use `Animated.loop` + `Animated.sequence` for the pulse
- Lock animation stops and border → green when quality ≥ TRIGGER_THRESHOLD

---

## Option 2 — Directional Chevron Arrows on Frame Edges

Four small animated arrows on each side of the guide frame:
- Too far: arrows point **inward**, looping toward center
- Too close: arrows point **outward**, looping away from center
- Ideal: arrows freeze and turn green

- Complexity: medium
- Universal: yes (parking sensor convention)
- Brand fit: technical/clean

Implementation sketch:
- Small `▲` / `▼` / `◄` / `►` glyphs (or thin SVG wedges) on each frame edge
- Translate + opacity loop animation, direction controlled by zone state

---

## Option 3 — Analog Meter / Geiger Counter Gauge *(replaces progress bar)*

Semicircular dial with a swinging needle. Needle sweeps:
- Left zone (red/grey): too far
- Center zone (green): ideal
- Right zone (red): too close

Combined with accelerating haptic ticks → full Geiger counter experience.

- Complexity: high (custom SVG arc or canvas rendering)
- Universal: strong for engineers, scientists, anyone who's seen Chernobyl/sci-fi
- Brand fit: excellent — reinforces Argus "detection" narrative
- Pitch impact: high — judges will understand the metaphor immediately

Implementation sketch:
- `Animated.Value` for needle angle (e.g. -60° far … 0° ideal … +60° close)
- Rendered with `react-native-svg` Arc + rotating needle line
- Three colored arc zones: grey (far), green (ideal), red (close)
- Replaces the 4px bar; sits above hint text

---

## Option 4 — Radar / Sonar Rings

Concentric rings pulse outward from detected QR center.
- Too far: slow rings, wide spacing
- Approaching ideal: rings speed up and tighten
- Ideal: rings collapse inward to a steady dot (locked)
- Too close: rings stop and reverse direction (push outward from center)

- Complexity: medium-high
- Universal: strong for tech, military, maritime, sci-fi audiences
- Brand fit: good (surveillance/detection theme)

Implementation sketch:
- 3–4 `Animated.View` circles, `absoluteFill`, centered on `qrBounds` center
- Each ring: scale 1→2, opacity 1→0 in loop; interval controlled by quality score
- At ideal: scale animation reverses or collapses
- At too-close: ring direction reverses

---

## Option 5 — Camera Rangefinder Split-Image *(natural for photographers)*

A thin horizontal band across the center of the viewfinder shows the QR image split into two halves with a horizontal offset. As ideal distance is approached, the halves slide together and merge. Snaps with a haptic click at trigger.

- Complexity: high (requires image compositing or a visual simulation)
- Universal: strong for photographers; others may not get it immediately
- Brand fit: neutral

Implementation sketch:
- Horizontal strip 40px tall at screen center
- Left half: clipped from left with +X offset; right half: clipped from right with -X offset
- Offset shrinks as quality improves; at trigger: offset = 0, flash white

---

## Option 6 — Sniper Scope Reticule Lock-On *(natural for gamers, action film fans)*

Circular crosshair overlaid on the detected QR:
- Too far: outer ring slowly rotates, no center dot
- Approaching: concentric rings close in
- Ideal: all rings snap to center with a flash + success haptic
- Too close: outer ring pulses red

- Complexity: medium
- Universal: extremely strong for gaming / action movie audience
- Brand fit: excellent (Argus = surveillance, precision)
- Pitch impact: very high — visceral "locked on" moment in demo

Implementation sketch:
- SVG or Animated circle components centered on `qrBounds`
- Outer ring: `rotate` animation looping when not locked
- Inner rings: scale from large to tight as quality increases
- Lock flash: opacity pulse on trigger

---

## Planned Improvements to Existing Elements (not full replacements)

### Zoom Badge
- Bump background from `rgba(255,255,255,0.15)` to `rgba(255,255,255,0.35)` so it's actually visible.

### Overflow Bar (too-close indicator)
- When `areaFrac > IDEAL_MAX_AREA_FRAC`: main bar stays capped at 100% green
- A red segment extends BEYOND the right edge of the track (`overflow: visible`)
- Width proportional to `(areaFrac - IDEAL_MAX) / 0.06`, capped at ~20% of track width
- Appears/disappears instantly (no tween — abruptness is the signal)

### Haptic Differentiation (too close vs approaching)
- Current: too close fires Medium at ~5 Hz — same feel as "approaching ideal"
- Proposed: too close → Heavy at fixed 600ms (~1.7 Hz), a slow definitive thud
- Three distinct zones by feel: silence → rapid Medium ticking → slow Heavy thud
