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
3. **Processing** — Mocked 1.4–1.8 s API call with step-cycling animation.
4. **Result** — AUTHENTIC (green) / SUSPICIOUS / COUNTERFEIT, with product details
   and a "scanned by N people here today" social proof line.
5. **Contribution** — Animated store trust score showing how the scan fed the
   community network.

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

- Show a hint: *Move closer* → *Hold steady…* → *Almost there…* → *Hold…*
- Pulse the quality bar at the bottom from grey → blue → green
- Accelerate haptic ticks as quality rises (Geiger counter feel)
- Auto-trigger once the bar is fully green and holds for ~0.5 s

**Tips for a clean scan:**
- Fill roughly a third to half of the screen with the code (not too small, not
  too close/distorted)
- Hold steady — jitter drops the quality score
- Scan straight-on; a tilted code reduces the squareness score
- Good lighting helps the underlying camera decoder fire consistently

**Demo shortcut — force fake result:** long-press the ✕ button during capture.
Each long-press toggles between fake mode and normal. A heavy haptic confirms the toggle.

## Stack

- React Native 0.81 / Expo SDK 54
- `expo-camera` — barcode detection + camera preview
- `expo-haptics` — haptic feedback
- `@react-navigation/native-stack` — screen navigation
