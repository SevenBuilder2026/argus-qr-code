import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius } from '../theme';
import { setForceMode } from '../mock/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_W = SCREEN_W * 0.72;
const FRAME_H = FRAME_W * 1.15;
const VIGNETTE_TOP = 160;
const VIGNETTE_BOTTOM = 220;
// Calibrated for iPhone 13 mini + 2 cm × 2 cm QR code:
//   areaFrac(D) = 4.884 / D²  (D in cm, portrait mode with screen-fill crop)
//   IDEAL_MIN = 2%  →  D ≈ 15.6 cm  (comfortable, well inside focus limit)
//   IDEAL_MAX = 3.5%  →  D ≈ 11.8 cm  (just at the ~12 cm min-focus limit)
// The old value of 0.18 required D ≈ 5.2 cm — physically below the focus limit.
const IDEAL_MIN_AREA_FRAC = 0.02;
const IDEAL_MAX_AREA_FRAC = 0.035;
const TRIGGER_THRESHOLD = 82;
const TRIGGER_HOLD_MS = 500;
// Maximum zoom value passed to CameraView (0–1 scale).
// 0.1 reaches roughly 1.5× on most phones.
const ZOOM_MAX = 0.1;
// How much zoom to add per barcode callback when QR is still too small.
const ZOOM_STEP = 0.012;
// Zoom kicks in when QR is at 1/1.4 of IDEAL_MIN (≈ 18.7 cm).
const ZOOM_START_FRAC = IDEAL_MIN_AREA_FRAC / 1.4;

function scoreToInterval(score) {
  if (score < 10) return 0;
  return Math.round(600 - score * 5.2);
}

function computeQuality(bounds, screenW, screenH) {
  if (!bounds) return { score: 0, areaFrac: 0 };
  const { origin, size } = bounds;
  if (!size || size.width <= 0 || size.height <= 0) return { score: 0, areaFrac: 0 };

  const screenArea = screenW * screenH;
  const bboxArea = size.width * size.height;
  const areaFrac = bboxArea / screenArea;

  let distScore = 0;
  if (areaFrac >= IDEAL_MIN_AREA_FRAC && areaFrac <= IDEAL_MAX_AREA_FRAC) {
    distScore = 100;
  } else if (areaFrac < IDEAL_MIN_AREA_FRAC) {
    distScore = Math.max(0, (areaFrac / IDEAL_MIN_AREA_FRAC) * 80);
  } else {
    // Too close: hard cap so trigger is unreachable past IDEAL_MAX_AREA_FRAC.
    // max = 55*0.5 + 100*0.3 + 100*0.2 = 77.5 < TRIGGER_THRESHOLD (82)
    const over = (areaFrac - IDEAL_MAX_AREA_FRAC) / 0.08;
    distScore = Math.max(0, 55 - over * 55);
  }

  const aspect = size.width / size.height;
  const squareScore = Math.max(0, 100 - Math.abs(1 - aspect) * 120);

  const cx = origin.x + size.width / 2;
  const cy = origin.y + size.height / 2;
  const dx = Math.abs(cx - screenW / 2) / (screenW / 2);
  const dy = Math.abs(cy - screenH / 2) / (screenH / 2);
  const centreScore = Math.max(0, 100 - (dx + dy) * 70);

  return {
    score: Math.round(distScore * 0.5 + squareScore * 0.3 + centreScore * 0.2),
    areaFrac,
  };
}

export default function CaptureScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [quality, setQuality] = useState(0);
  const [areaFrac, setAreaFrac] = useState(0);
  const [qrBounds, setQrBounds] = useState(null);
  const [hint, setHint] = useState('Point at the product label');
  // Camera zoom state — updated via RAF lerp so the transition is smooth
  const [zoom, setZoom] = useState(0);

  const lastScanRef = useRef(null);
  const triggerStartRef = useRef(null);
  const hapticTimerRef = useRef(null);
  const triggeredRef = useRef(false);
  const qualityAnim = useRef(new Animated.Value(0)).current;
  const frameAnim = useRef(new Animated.Value(0)).current;
  const qrOpacity = useRef(new Animated.Value(0)).current;
  // Last known areaFrac: lets us keep "Move back" hint after scanner dropout
  const lastAreaFracRef = useRef(0);

  // Zoom animation via requestAnimationFrame lerp.
  // CameraView.zoom is not an Animated prop, so we drive it with JS state.
  const zoomRef = useRef(0);
  const zoomTargetRef = useRef(0);
  const zoomRafRef = useRef(null);

  const animateZoomTo = useCallback((target) => {
    zoomTargetRef.current = Math.max(0, Math.min(ZOOM_MAX, target));
    if (zoomRafRef.current) return; // already ticking; loop reads latest target

    const tick = () => {
      const curr = zoomRef.current;
      const tgt = zoomTargetRef.current;
      if (Math.abs(tgt - curr) < 0.002) {
        zoomRef.current = tgt;
        setZoom(tgt);
        zoomRafRef.current = null;
        return;
      }
      const next = curr + (tgt - curr) * 0.1;
      zoomRef.current = next;
      setZoom(next);
      zoomRafRef.current = requestAnimationFrame(tick);
    };
    zoomRafRef.current = requestAnimationFrame(tick);
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (zoomRafRef.current) cancelAnimationFrame(zoomRafRef.current);
    };
  }, []);

  const longPressCount = useRef(0);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  useEffect(() => {
    Animated.timing(qualityAnim, {
      toValue: quality / 100,
      duration: 150,
      useNativeDriver: false,
    }).start();
    Animated.timing(frameAnim, {
      toValue: quality > TRIGGER_THRESHOLD ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [quality]);

  useEffect(() => {
    if (hapticTimerRef.current) {
      clearInterval(hapticTimerRef.current);
      hapticTimerRef.current = null;
    }
    const interval = scoreToInterval(quality);
    if (interval > 0) {
      hapticTimerRef.current = setInterval(() => {
        Haptics.impactAsync(
          quality > 70
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
        );
      }, interval);
    }
    return () => {
      if (hapticTimerRef.current) clearInterval(hapticTimerRef.current);
    };
  }, [quality]);

  // Hint: areaFrac > IDEAL_MAX checked first — survives quality decay to 0.
  // "Zooming in…" replaces "Move closer" when auto-zoom is active.
  useEffect(() => {
    if (areaFrac > IDEAL_MAX_AREA_FRAC) setHint('Move back');
    else if (quality === 0) setHint('Point at the product label');
    else if (areaFrac < IDEAL_MIN_AREA_FRAC) {
      setHint(zoomRef.current > 0.02 ? 'Zooming in…' : 'Move closer');
    }
    else if (quality < 60) setHint('Hold steady…');
    else if (quality < TRIGGER_THRESHOLD) setHint('Almost there…');
    else setHint('Hold…');
  }, [quality, areaFrac, zoom]);

  const handleBarcode = useCallback(
    ({ data, bounds }) => {
      if (triggeredRef.current) return;
      if (Date.now() - (lastScanRef.current ?? 0) < 80) return;
      lastScanRef.current = Date.now();

      const { score: q, areaFrac: frac } = computeQuality(bounds, SCREEN_W, SCREEN_H);
      setQuality(q);
      setAreaFrac(frac);
      lastAreaFracRef.current = frac;

      // Zoom control — only zoom IN when QR is detected but too small.
      // We never zoom OUT based on areaFrac alone (that would oscillate).
      // Zoom only resets when the QR disappears (long-decay below).
      if (frac >= ZOOM_START_FRAC && frac < IDEAL_MIN_AREA_FRAC) {
        animateZoomTo(Math.min(ZOOM_MAX, zoomRef.current + ZOOM_STEP));
      }
      // If frac >= IDEAL_MIN: the QR is big enough — hold current zoom.
      // If frac > IDEAL_MAX: user is too close — don't compound with zoom.

      if (bounds?.origin && bounds?.size) {
        setQrBounds({
          x: bounds.origin.x,
          y: bounds.origin.y,
          w: bounds.size.width,
          h: bounds.size.height,
        });
        Animated.timing(qrOpacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      }

      if (q >= TRIGGER_THRESHOLD) {
        if (!triggerStartRef.current) {
          triggerStartRef.current = Date.now();
        } else if (Date.now() - triggerStartRef.current >= TRIGGER_HOLD_MS) {
          triggeredRef.current = true;
          if (hapticTimerRef.current) clearInterval(hapticTimerRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          navigation.replace('Processing', { barcodeData: data });
        }
      } else {
        triggerStartRef.current = null;
      }
    },
    [navigation, qrOpacity, animateZoomTo]
  );

  // Two-stage decay when scanner goes silent:
  // Stage 1 (400ms): quality decay + fade overlay; keep areaFrac if last seen
  //   was too-close (dropout = blurry = user too close, not moved away).
  // Stage 2 (1800ms): full reset including zoom.
  const noDetectTimer = useRef(null);
  const noDetectTimerFull = useRef(null);
  const resetDecay = useCallback(() => {
    if (noDetectTimer.current) clearTimeout(noDetectTimer.current);
    if (noDetectTimerFull.current) clearTimeout(noDetectTimerFull.current);

    noDetectTimer.current = setTimeout(() => {
      if (!triggeredRef.current) {
        setQuality((q) => Math.max(0, q - 15));
        triggerStartRef.current = null;
        Animated.timing(qrOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
          () => setQrBounds(null)
        );
        if (lastAreaFracRef.current <= IDEAL_MAX_AREA_FRAC) {
          setAreaFrac(0);
        }
      }
    }, 400);

    noDetectTimerFull.current = setTimeout(() => {
      if (!triggeredRef.current) {
        setAreaFrac(0);
        lastAreaFracRef.current = 0;
        animateZoomTo(0); // release zoom — user has walked away
      }
    }, 1800);
  }, [qrOpacity, animateZoomTo]);

  const frameBorderColor = frameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.accent + '80', colors.authentic],
  });

  const barColor = qualityAnim.interpolate({
    inputRange: [0, 0.6, 0.85, 1],
    outputRange: [colors.textMuted, colors.accent, colors.authentic, colors.authentic],
  });

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.permText}>Camera access is needed to scan products.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showZoomBadge = zoom > 0.04;
  // Approximate display multiplier: assumes 0.25 zoom ≈ 2.5× on a typical phone
  // zoom=0.1 (ZOOM_MAX) ≈ 1.5× on most phones
  const zoomDisplay = (1 + zoom * 5).toFixed(1);

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        zoom={zoom}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'datamatrix', 'pdf417', 'aztec'] }}
        onBarcodeScanned={(e) => {
          handleBarcode(e);
          resetDecay();
        }}
      />

      {/* Dark vignette overlay */}
      <View style={styles.vignetteTop} />
      <View style={styles.vignetteBottom} />

      {/* Guide frame — hidden while actively tracking a QR code */}
      {!qrBounds && (
        <View style={styles.frameWrap}>
          <Animated.View style={[styles.frame, { borderColor: frameBorderColor }]}>
            {['tl', 'tr', 'bl', 'br'].map((c) => (
              <Animated.View
                key={c}
                style={[styles.corner, styles[`corner_${c}`], { borderColor: frameBorderColor }]}
              />
            ))}
          </Animated.View>
        </View>
      )}

      {/* Live QR corner brackets at actual detected bounds */}
      {qrBounds && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: qrOpacity }]}
          pointerEvents="none"
        >
          {(() => {
            const sz = Math.max(12, Math.min(32, qrBounds.w * 0.18));
            return [
              { top: qrBounds.y,              left: qrBounds.x,              tl: true },
              { top: qrBounds.y,              left: qrBounds.x + qrBounds.w, tr: true },
              { top: qrBounds.y + qrBounds.h, left: qrBounds.x,              bl: true },
              { top: qrBounds.y + qrBounds.h, left: qrBounds.x + qrBounds.w, br: true },
            ].map((c, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: sz,
                  height: sz,
                  top: c.top + (c.bl || c.br ? -sz : 0),
                  left: c.left + (c.tr || c.br ? -sz : 0),
                  borderColor: frameBorderColor,
                  borderTopWidth:    (c.tl || c.tr) ? 2.5 : 0,
                  borderBottomWidth: (c.bl || c.br) ? 2.5 : 0,
                  borderLeftWidth:   (c.tl || c.bl) ? 2.5 : 0,
                  borderRightWidth:  (c.tr || c.br) ? 2.5 : 0,
                  borderTopLeftRadius:     c.tl ? 3 : 0,
                  borderTopRightRadius:    c.tr ? 3 : 0,
                  borderBottomLeftRadius:  c.bl ? 3 : 0,
                  borderBottomRightRadius: c.br ? 3 : 0,
                }}
              />
            ));
          })()}
        </Animated.View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          onLongPress={() => {
            longPressCount.current += 1;
            if (longPressCount.current % 2 === 1) {
              setForceMode('fake');
            } else {
              setForceMode(null);
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>ARGUS</Text>
        {/* Zoom badge — appears when auto-zoom is active */}
        {showZoomBadge ? (
          <View style={styles.zoomBadge}>
            <Text style={styles.zoomBadgeText}>{zoomDisplay}×</Text>
          </View>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {/* Bottom HUD */}
      <View style={styles.bottomHud}>
        <Text style={styles.hintText}>{hint}</Text>

        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { flex: qualityAnim, backgroundColor: barColor }]}
          />
          <Animated.View style={{ flex: Animated.subtract(1, qualityAnim) }} />
        </View>

        <Text style={styles.noShutter}>Scans automatically when aligned</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },

  vignetteTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: VIGNETTE_TOP,
    backgroundColor: 'rgba(8,12,24,0.55)',
  },
  vignetteBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: VIGNETTE_BOTTOM,
    backgroundColor: 'rgba(8,12,24,0.75)',
  },

  // Centered within the visible camera band (between vignettes), not full screen.
  frameWrap: {
    position: 'absolute',
    top: VIGNETTE_TOP,
    bottom: VIGNETTE_BOTTOM,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderWidth: 0,
    borderRadius: radius.md,
  },

  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.accent,
  },
  corner_tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.sm },
  corner_tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.sm },
  corner_bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.sm },
  corner_br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.sm },

  topBar: {
    position: 'absolute',
    top: 56,
    left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  topTitle: {
    color: colors.textPrimary,
    fontSize: fonts.small,
    fontWeight: '700',
    letterSpacing: 5,
  },
  zoomBadge: {
    width: 48, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBadgeText: {
    color: colors.textPrimary,
    fontSize: fonts.small,
    fontWeight: '700',
  },

  bottomHud: {
    position: 'absolute',
    bottom: 60,
    left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  hintText: {
    color: colors.textPrimary,
    fontSize: fonts.label,
    fontWeight: '500',
    textAlign: 'center',
  },
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },
  noShutter: {
    color: colors.textSecondary,
    fontSize: fonts.small,
    textAlign: 'center',
  },

  permText: { color: colors.textPrimary, fontSize: fonts.body, textAlign: 'center' },
  permBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: radius.full,
  },
  permBtnText: { color: colors.bg, fontWeight: '700', fontSize: fonts.body },
});
