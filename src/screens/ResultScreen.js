import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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

export default function ResultScreen({ navigation, route }) {
  const { result } = route.params ?? {};
  const cfg = statusConfig(result?.status ?? 'authentic');
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

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
  }, []);

  const product = result?.product ?? {};

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          {/* Status badge */}
          <Animated.View
            style={[
              styles.badgeWrap,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Animated.View
              style={[
                styles.glow,
                {
                  backgroundColor: cfg.color,
                  opacity: glowAnim,
                },
              ]}
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

          {/* Social proof / trust seed */}
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

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() =>
                navigation.replace('Contribution', {
                  store: result?.store,
                  status: result?.status,
                })
              }
            >
              <Text style={styles.continueBtnText}>Continue</Text>
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
    paddingVertical: 6,
  },
  label: { fontSize: fonts.small, color: colors.textSecondary },
  value: { fontSize: fonts.small, color: colors.textPrimary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 20,
  },

  badgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  glow: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    opacity: 0.2,
  },
  badge: {
    width: 88, height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 36,
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
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  card: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bgCardBorder,
    padding: 20,
    gap: 4,
  },
  productName: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  productBrand: {
    fontSize: fonts.body,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bgCardBorder,
    marginVertical: 10,
  },

  socialRow: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  socialText: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  socialCount: {
    fontWeight: '700',
  },

  actions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  reportBtn: {
    borderWidth: 1.5,
    borderColor: colors.fake + '60',
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reportBtnText: {
    fontSize: fonts.body,
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 18,
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
});
