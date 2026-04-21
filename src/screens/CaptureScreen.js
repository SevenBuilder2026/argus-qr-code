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
const FRAME_SIZE = SCREEN_W * 0.72;
const IDEAL_MIN_AREA_FRAC = 0.18;
const IDEAL_MAX_AREA_FRAC = 0.55;
const TRIGGER_THRESHOLD = 82;
const TRIGGER_HOLD_MS = 500;

// Map quality score 0-100 to haptic interval ms (600ms -> 80ms)
function scoreToInterval(score) {
  if (score < 10) return 0;
  return Math.round(600 - score * 5.2);
}

function computeQuality(bounds, screenW, screenH) {
  if (!bounds) return 0;
  const { origin, size } = bounds;
  if (!size || size.width <= 0 || size.height <= 0) return 0;

  const screenArea = screenW * screenH;
  const bboxArea = size.width * size.height;
  const areaFrac = bboxArea / screenArea;

  // Distance score: penalise if too close or too far
  let distScore = 0;
  if (areaFrac >= IDEAL_MIN_AREA_FRAC && areaFrac <= IDEAL_MAX_AREA_FRAC) {
    distScore = 100;
  } else if (areaFrac < IDEAL_MIN_AREA_FRAC) {
    distScore = Math.max(0, (areaFrac / IDEAL_MIN_AREA_FRAC) * 80);
  } else {
    distScore = Math.max(0, 80 - ((areaFrac - IDEAL_MAX_AREA_FRAC) / 0.2) * 80);
  }

  // Squareness score: how close to a square
  const aspect = size.width / size.height;
  const squareScore = Math.max(0, 100 - Math.abs(1 - aspect) * 120);

  // Centre score: how well centred in screen
  const cx = origin.x + size.width / 2;
  const cy = origin.y + size.height / 2;
  const dx = Math.abs(cx - screenW / 2) / (screenW / 2);
  const dy = Math.abs(cy - screenH / 2) / (screenH / 2);
  const centreScore = Math.max(0, 100 - (dx + dy) * 70);

  return Math.round(distScore * 0.5 + squareScore * 0.3 + centreScore * 0.2);
}

export default function CaptureScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [quality, setQuality] = useState(0);
  const [hint, setHint] = useState('Point at the product label');
  const lastScanRef = useRef(null);
  const triggerStartRef = useRef(null);
  const hapticTimerRef = useRef(null);
  const triggeredRef = useRef(false);
  const qualityAnim = useRef(new Animated.Value(0)).current;
  const frameAnim = useRef(new Animated.Value(0)).current;

  // Long-press top-right corner forces fake mode for demo
  const longPressCount = useRef(0);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // Animate quality bar
  useEffect(() => {
    Animated.timing(qualityAnim, {
      toValue: quality / 100,
      duration: 150,
      useNativeDriver: false,
    }).start();

    // Frame border color
    Animated.timing(frameAnim, {
      toValue: quality > TRIGGER_THRESHOLD ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [quality]);

  // Haptic ticker
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

  // Hint text
  useEffect(() => {
    if (quality === 0) setHint('Point at the product label');
    else if (quality < 35) setHint('Move closer');
    else if (quality < 60) setHint('Hold steady…');
    else if (quality < TRIGGER_THRESHOLD) setHint('Almost there…');
    else setHint('Hold…');
  }, [quality]);

  const handleBarcode = useCallback(
    ({ data, bounds }) => {
      if (triggeredRef.current) return;
      if (Date.now() - (lastScanRef.current ?? 0) < 80) return;
      lastScanRef.current = Date.now();

      const q = computeQuality(bounds, SCREEN_W, SCREEN_H);
      setQuality(q);

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
    [navigation]
  );

  // No barcode decay
  const noDetectTimer = useRef(null);
  const resetDecay = useCallback(() => {
    if (noDetectTimer.current) clearTimeout(noDetectTimer.current);
    noDetectTimer.current = setTimeout(() => {
      if (!triggeredRef.current) {
        setQuality((q) => Math.max(0, q - 15));
        triggerStartRef.current = null;
      }
    }, 400);
  }, []);

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

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'datamatrix', 'pdf417', 'aztec'] }}
        onBarcodeScanned={(e) => {
          handleBarcode(e);
          resetDecay();
        }}
      />

      {/* Dark vignette overlay */}
      <View style={styles.vignetteTop} />
      <View style={styles.vignetteBottom} />

      {/* Scan frame */}
      <View style={styles.frameWrap}>
        <Animated.View style={[styles.frame, { borderColor: frameBorderColor }]}>
          {/* Corner marks */}
          {['tl', 'tr', 'bl', 'br'].map((c) => (
            <Animated.View
              key={c}
              style={[styles.corner, styles[`corner_${c}`], { borderColor: frameBorderColor }]}
            />
          ))}
        </Animated.View>
      </View>

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
        <View style={{ width: 36 }} />
      </View>

      {/* Bottom HUD */}
      <View style={styles.bottomHud}>
        <Text style={styles.hintText}>{hint}</Text>

        {/* Quality bar */}
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              { flex: qualityAnim, backgroundColor: barColor },
            ]}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    background: 'transparent',
    // react-native gradient workaround via opacity overlay
    backgroundColor: 'rgba(8,12,24,0.55)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(8,12,24,0.75)',
  },

  frameWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderWidth: 0,
    borderRadius: radius.md,
  },

  // Corner marks
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.accent,
  },
  corner_tl: {
    top: 0, left: 0,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderTopLeftRadius: radius.sm,
  },
  corner_tr: {
    top: 0, right: 0,
    borderTopWidth: 3, borderRightWidth: 3,
    borderTopRightRadius: radius.sm,
  },
  corner_bl: {
    bottom: 0, left: 0,
    borderBottomWidth: 3, borderLeftWidth: 3,
    borderBottomLeftRadius: radius.sm,
  },
  corner_br: {
    bottom: 0, right: 0,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderBottomRightRadius: radius.sm,
  },

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
  barFill: {
    height: 4,
    borderRadius: 2,
  },
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
