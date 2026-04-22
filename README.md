# ARGUS — Product Authenticity Verification

HackSummit 2026, Track 2 (SICPA sponsor). A consumer-grade smartphone app that
lets anyone verify a product's authenticity by scanning its security code — with
no account required and no knowledge of the underlying technology.

## What it does

Five-screen user journey: **Home → Guided Capture → Processing → Result → Contribution**

1. **Home** — Single "Scan a Product" CTA. No onboarding.
2. **Guided Capture** — Live camera with real-time quality scoring. The frame guide
   turns green and haptic ticks accelerate as alignment improves; the scan fires
   automatically when quality holds above threshold for 500 ms. No shutter button.
   When a code is detected but slightly too small, the camera zooms in automatically
   (up to 1.5×) so the user never needs to enter the close-up blur zone. Corner
   brackets track the live detected bounds of the code.
3. **Processing** — Mocked 1.4–1.8 s API call with step-cycling animation.
4. **Result** — AUTHENTIC (green) / SUSPICIOUS / COUNTERFEIT, with product details
   and a "scanned by N people here today" social proof line. Earned XP pops onto
   the screen center with a spring-bounce animation and heavy haptic, then flies to
   the persistent top-right XP counter.
5. **Contribution** — Animated store trust score showing how the scan fed the
   community network. Quest completion toasts slide in from the top.

A **bottom tab bar** (Scan / Me) appears from the Result screen onward. The **Me tab**
shows level progress, badges (including streaks), and quest completion history.
XP persists across sessions via AsyncStorage; scans accumulate across 10 levels.

### Optional micro-journeys (2 additional screens)

**Trace** — Accessible from the Result screen. Full-screen dark map showing the
product's supply chain route across 4 waypoints (Production → Distribution →
European Hub → Your Pharmacy), connected by a teal polyline. Continues to
Contribution.

**Explore** — Accessible from the Home screen. Full-screen dark map of nearby
pharmacies. Each pharmacy is a dot: **green** means the community has scanned
products there and found nothing suspicious; **red** means at least one fake was
detected. A summary line shows the safe / flagged / total counts.

This screen is the core of the generational trust relay argument: younger users who
scan products generate the data behind every dot. Older users — who would never
install a scanner app — benefit passively just by knowing which pharmacy to trust.
They don't need to scan anything; the people around them already did. The 1% who
scan protect the 99% who don't.

## Running in development

**Prerequisites:** Node 18+, Expo Go installed on your phone (iOS or Android).

```bash
npm install
npx expo start
```

Scan the QR code shown in the terminal with Expo Go. The app opens immediately —
no build step needed.

For iOS simulator: press `i` in the terminal. For Android emulator: press `a`.

## How to get a successful scan

Point the camera at any **QR code** (or DataMatrix / PDF417 / Aztec code). The
guided capture screen will:

- Show a hint: *Move closer* → *Zooming in…* → *Hold steady…* → *Almost there…* → *Hold…*
  (or *Move back* if the code is too close)
- Pulse the quality bar at the bottom from grey → blue → green
- Accelerate haptic ticks as quality rises (Geiger counter feel)
- Zoom in automatically (up to ~1.5×) once the code is nearly the right size —
  a zoom badge (e.g. `1.4×`) appears in the top-right corner while this is active
- Show corner brackets around the detected code once it is in frame
- Auto-trigger once the bar is fully green and holds for ~0.5 s

**Tips for a clean scan:**
- Hold the phone **15–20 cm** from the code — that is the optimal sharpness zone.
  Do **not** try to fill the screen; the code only needs to occupy a small area
  (~15% of screen width) and the app will zoom the rest of the way automatically.
- Hold steady — jitter drops the quality score
- Scan straight-on; a tilted code reduces the squareness score
- Good lighting helps the underlying camera decoder fire consistently

**Demo shortcut — force fake result:** long-press the ✕ button during capture.
Each long-press toggles between fake mode and normal. A heavy haptic confirms the toggle.

## Stack

- React Native 0.81 / Expo SDK 54
- `expo-camera` — barcode detection + camera preview
- `expo-haptics` — haptic feedback
- `@react-navigation/native-stack` + `@react-navigation/bottom-tabs` — navigation
- `@react-native-async-storage/async-storage` — persistent XP/game state
- `react-native-maps` — Explore pharmacy map + Trace supply chain map
- `expo-location` — current position for Explore map centering
