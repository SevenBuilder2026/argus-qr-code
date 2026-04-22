import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, fonts, radius } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAP_W = SCREEN_W - 32;
const MAP_H = SCREEN_H * 0.58;

// cx/cy are 0–1 fractions of the map area (0,0 = top-left)
const PHARMACIES = [
  { id: 1,  name: 'PharmaCité',          cx: 0.50, cy: 0.50, fake: 0 },
  { id: 2,  name: 'Pharmacie du Marché', cx: 0.30, cy: 0.34, fake: 0 },
  { id: 3,  name: 'Green Cross',         cx: 0.68, cy: 0.28, fake: 0 },
  { id: 4,  name: 'MedExpress',          cx: 0.76, cy: 0.55, fake: 1 },
  { id: 5,  name: 'Santé Plus',          cx: 0.22, cy: 0.62, fake: 0 },
  { id: 6,  name: 'Centrale Pharma',     cx: 0.55, cy: 0.74, fake: 0 },
  { id: 7,  name: 'City Pharmacy',       cx: 0.40, cy: 0.18, fake: 0 },
  { id: 8,  name: 'Apotheke Léman',      cx: 0.82, cy: 0.38, fake: 2 },
  { id: 9,  name: 'QuickMed',            cx: 0.15, cy: 0.42, fake: 0 },
  { id: 10, name: 'PharmaVerte',         cx: 0.62, cy: 0.88, fake: 0 },
  { id: 11, name: 'Beaulieu Pharma',     cx: 0.35, cy: 0.80, fake: 0 },
  { id: 12, name: 'Nord Santé',          cx: 0.72, cy: 0.76, fake: 0 },
];

// Grid lines drawn across the map as subtle road-like guides
const H_LINES = [0.2, 0.35, 0.5, 0.65, 0.8];
const V_LINES = [0.2, 0.35, 0.5, 0.65, 0.8];

export default function ExploreScreen({ navigation }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <Animated.View style={[styles.container, { opacity: fadeIn }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Nearby Pharmacies</Text>
          <Text style={styles.subtitle}>Lausanne area · live trust scores</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.authentic }]} />
            <Text style={styles.legendLabel}>No fakes detected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.fake }]} />
            <Text style={styles.legendLabel}>Fake product found</Text>
          </View>
        </View>

        {/* Map canvas */}
        <View style={styles.mapContainer}>
          {/* Grid lines (simulate streets) */}
          {H_LINES.map((frac) => (
            <View
              key={`h${frac}`}
              style={[styles.gridLineH, { top: MAP_H * frac }]}
            />
          ))}
          {V_LINES.map((frac) => (
            <View
              key={`v${frac}`}
              style={[styles.gridLineV, { left: MAP_W * frac }]}
            />
          ))}

          {/* Pharmacy markers */}
          {PHARMACIES.map((p) => {
            const isFlagged = p.fake > 0;
            const dotColor = isFlagged ? colors.fake : colors.authentic;
            return (
              <View
                key={p.id}
                style={[
                  styles.markerWrap,
                  {
                    left: MAP_W * p.cx - 10,
                    top: MAP_H * p.cy - 10,
                  },
                ]}
              >
                <View style={[styles.markerOuter, { borderColor: dotColor }]}>
                  <View style={[styles.markerInner, { backgroundColor: dotColor }]} />
                </View>
              </View>
            );
          })}

          {/* Current location — center */}
          <View
            style={[
              styles.selfWrap,
              {
                left: MAP_W * 0.50 - 14,
                top: MAP_H * 0.50 - 14,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.selfPulse,
                { transform: [{ scale: pulse }], opacity: pulse.interpolate({ inputRange: [1, 1.6], outputRange: [0.5, 0] }) },
              ]}
            />
            <View style={styles.selfDot} />
          </View>

          {/* Map label */}
          <Text style={styles.mapLabel}>YOU</Text>
        </View>

        {/* Summary */}
        <Text style={styles.summary}>
          {PHARMACIES.filter((p) => p.fake === 0).length} safe ·{' '}
          {PHARMACIES.filter((p) => p.fake > 0).length} flagged ·{' '}
          {PHARMACIES.length} total
        </Text>

        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Text style={styles.backBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: fonts.title,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: fonts.small,
    color: colors.textSecondary,
  },
  mapContainer: {
    width: MAP_W,
    height: MAP_H,
    backgroundColor: '#0D1526',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bgCardBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1A2540',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#1A2540',
  },
  markerWrap: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,12,24,0.6)',
  },
  markerInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  selfWrap: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
  },
  selfDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  mapLabel: {
    position: 'absolute',
    left: MAP_W * 0.50 + 2,
    top: MAP_H * 0.50 - 22,
    fontSize: fonts.tiny,
    color: '#3B82F6',
    fontWeight: '700',
    letterSpacing: 1,
  },
  summary: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    marginTop: 14,
  },
  backBtn: {
    marginTop: 'auto',
    width: '100%',
    borderRadius: radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  backBtnText: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
});
