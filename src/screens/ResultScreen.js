import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { awardScan } from '../store/xpStore';
import XpOverlay from '../components/XpOverlay';
import { colors, fonts, radius } from '../theme';

function statusConfig(status) {
  switch (status) {
    case 'authentic':
      return {
        label: 'AUTHENTIC',
        icon: '✓',
        color: colors.authentic,
        dimColor: colors.authenticDim,
        sub: 'This product is verified genuine.',
      };
    case 'suspicious':
      return {
        label: 'SUSPICIOUS',
        icon: '⚠',
        color: colors.suspicious,
        dimColor: colors.suspiciousDim,
        sub: 'Verification is inconclusive. Do not purchase.',
      };
    case 'fake':
      return {
        label: 'COUNTERFEIT',
        icon: '✕',
        color: colors.fake,
        dimColor: colors.fakeDim,
        sub: 'This product failed authentication. Do not use.',
      };
    default:
      return statusConfig('authentic');
  }
}

// Approximate pill dimensions for fly-target calculation
const OVERLAY_W = 140;
const OVERLAY_H = 22;
const FLY_BADGE_W = 130;
const FLY_BADGE_H = 62;

export default function ResultScreen({ navigation, route }) {
  const { result } = route.params ?? {};
  const cfg = statusConfig(result?.status ?? 'authentic');
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Badge entrance animations
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  // Flying XP badge — starts at screen center, flies to overlay
  const flyScale = useRef(new Animated.Value(0)).current;
  const flyOpacity = useRef(new Animated.Value(0)).current;
  const flyTranslateX = useRef(new Animated.Value(0)).current;
  const flyTranslateY = useRef(new Animated.Value(0)).current;
  const [showFlyBadge, setShowFlyBadge] = useState(false);
  const [flyText, setFlyText] = useState('');

  // Overlay shows OLD xp until badge lands, then pulses with new value
  const [displayedNewXp, setDisplayedNewXp] = useState(undefined);

  const hasAwarded = useRef(false);
  const [scanReward, setScanReward] = useState(null);

  // Flying badge starts at screen center (absolute coords within SafeAreaView)
  const flyStartLeft = W / 2 - FLY_BADGE_W / 2;
  const flyStartTop = H / 2 - FLY_BADGE_H / 2;

  // Delta: badge center → overlay center
  // Badge center X: W/2
  // Overlay center X: W - 16 - OVERLAY_W/2
  // Badge center Y: H/2
  // Overlay center Y: insets.top + 8 + OVERLAY_H/2
  const flyDeltaX = (W - 16 - OVERLAY_W / 2) - W / 2;
  const flyDeltaY = (insets.top + 8 + OVERLAY_H / 2) - H / 2;

  const runFlyAnimation = (reward) => {
    setFlyText(`+${reward.xpEarned} XP`);
    setShowFlyBadge(true);
    flyScale.setValue(0);
    flyOpacity.setValue(0);
    flyTranslateX.setValue(0);
    flyTranslateY.setValue(0);

    // Heavy haptic fires the instant the badge appears
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      // Explosive pop — spring overshoots then settles
      Animated.parallel([
        Animated.spring(flyScale, {
          toValue: 1,
          friction: 3,
          tension: 260,
          useNativeDriver: true,
        }),
        Animated.timing(flyOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
      ]),
      // Hold so user reads it
      Animated.delay(700),
      // Fly toward overlay in the corner
      Animated.parallel([
        Animated.timing(flyTranslateX, {
          toValue: flyDeltaX,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flyTranslateY, {
          toValue: flyDeltaY,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flyScale, {
          toValue: 0.15,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(flyOpacity, {
          toValue: 0,
          duration: 380,
          delay: 140,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setShowFlyBadge(false);
      // Overlay counter updates and pulses when badge "arrives"
      setDisplayedNewXp(reward.newXpTotal);
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    if (result?.status === 'authentic') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    if (!hasAwarded.current) {
      hasAwarded.current = true;
      awardScan(result?.status ?? 'authentic').then(reward => {
        setScanReward(reward);
        runFlyAnimation(reward);
      });
    }
  }, []);

  const product = result?.product ?? {};

  const handleContinue = () => {
    navigation.replace('Contribution', {
      store: result?.store,
      status: result?.status,
      xpEarned: scanReward?.xpEarned ?? 0,
      leveledUp: scanReward?.leveledUp ?? false,
      newLevel: scanReward?.newLevel ?? null,
      newXpTotal: scanReward?.newXpTotal ?? 0,
      badgesEarned: scanReward?.badgesEarned ?? [],
      questsCompleted: scanReward?.questsCompleted ?? [],
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Overlay shows old XP until badge lands */}
      <XpOverlay xpTotal={displayedNewXp} />

      {/* Flying +N XP badge — screen center to corner */}
      {showFlyBadge && (
        <Animated.View
          style={[
            styles.flyBadge,
            {
              top: flyStartTop,
              left: flyStartLeft,
              opacity: flyOpacity,
              transform: [
                { scale: flyScale },
                { translateX: flyTranslateX },
                { translateY: flyTranslateY },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.flyBadgeText}>{flyText}</Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim, paddingBottom: tabBarHeight + 28 }]}>

          {/* Status badge */}
          <Animated.View style={[styles.badgeWrap, { transform: [{ scale: scaleAnim }] }]}>
            <Animated.View
              style={[styles.glow, { backgroundColor: cfg.color, opacity: glowAnim }]}
            />
            <View style={[styles.badge, { backgroundColor: cfg.dimColor, borderColor: cfg.color + '50' }]}>
              <Text style={[styles.badgeIcon, { color: cfg.color }]}>{cfg.icon}</Text>
            </View>
          </Animated.View>

          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.statusSub}>{cfg.sub}</Text>

          {/* Product card */}
          <View style={styles.card}>
            <Text style={styles.productName}>{product.name ?? '—'}</Text>
            <Text style={styles.productBrand}>{product.brand ?? ''}</Text>
            <View style={styles.divider} />
            <Row label="Batch" value={product.batch ?? '—'} />
            <Row label="Manufactured" value={product.manufactured_at ?? '—'} />
            <Row
              label="Confidence"
              value={`${Math.round((result?.confidence ?? 0) * 100)}%`}
              valueColor={cfg.color}
            />
          </View>

          {/* Social proof */}
          {result?.status === 'authentic' && (
            <View style={styles.socialRow}>
              <Text style={styles.socialText}>
                Scanned by{' '}
                <Text style={[styles.socialCount, { color: colors.accent }]}>
                  {result.scan_count_here_today ?? 7}
                </Text>{' '}
                people here today
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {result?.status !== 'authentic' && (
              <TouchableOpacity style={styles.reportBtn}>
                <Text style={[styles.reportBtnText, { color: cfg.color }]}>
                  Report this product
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.traceBtn}
              onPress={() => navigation.navigate('Trace', { result, scanReward })}
            >
              <Text style={styles.traceBtnText}>Trace</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  label: { fontSize: fonts.small, color: colors.textSecondary },
  value: { fontSize: fonts.small, color: colors.textPrimary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  container: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 14,
  },

  flyBadge: {
    position: 'absolute',
    zIndex: 200,
    width: FLY_BADGE_W,
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 14,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  flyBadgeText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.bg,
    letterSpacing: -0.5,
  },

  badgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  glow: {
    position: 'absolute',
    width: 100, height: 100,
    borderRadius: 50,
    opacity: 0.2,
  },
  badge: {
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 32,
    fontWeight: '700',
  },

  statusLabel: {
    fontSize: fonts.title,
    fontWeight: '800',
    letterSpacing: 3,
  },
  statusSub: {
    fontSize: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },

  card: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bgCardBorder,
    padding: 16,
    gap: 2,
  },
  productName: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 1,
  },
  productBrand: {
    fontSize: fonts.body,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bgCardBorder,
    marginVertical: 8,
  },

  socialRow: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  socialText: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  socialCount: { fontWeight: '700' },

  actions: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  reportBtn: {
    borderWidth: 1.5,
    borderColor: colors.fake + '60',
    borderRadius: radius.full,
    paddingVertical: 13,
    alignItems: 'center',
  },
  reportBtnText: {
    fontSize: fonts.body,
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  continueBtnText: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.bg,
  },
  traceBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 13,
    alignItems: 'center',
  },
  traceBtnText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.accent,
  },
});
