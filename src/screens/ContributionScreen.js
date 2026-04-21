import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius } from '../theme';

export default function ContributionScreen({ navigation, route }) {
  const { store, status } = route.params ?? {};
  const storeName = store?.name ?? 'Pharmacie du Maupas';
  const trustScore = store?.trust_score ?? 94;
  const totalScans = store?.total_scans ?? 1247;

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    Animated.timing(scoreAnim, {
      toValue: trustScore / 100,
      duration: 1200,
      useNativeDriver: false,
    }).start(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const arcWidth = scoreAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const scoreColor = trustScore >= 85 ? colors.authentic : trustScore >= 60 ? colors.suspicious : colors.fake;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

        {/* Contribution notice */}
        <View style={styles.noticeCard}>
          <Animated.View style={[styles.dot, { opacity: dotAnim }]} />
          <Text style={styles.noticeText}>
            Your scan was added to the{'\n'}community trust network
          </Text>
        </View>

        {/* Store trust score */}
        <View style={styles.scoreCard}>
          <Text style={styles.storeName}>{storeName}</Text>
          <Text style={styles.storeLabel}>Community Trust Score</Text>

          {/* Score ring / bar */}
          <View style={styles.scoreRingWrap}>
            <View style={styles.scoreTrack}>
              <Animated.View style={[styles.scoreFill, { width: arcWidth, backgroundColor: scoreColor }]} />
            </View>
            <Animated.Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {trustScore}%
            </Animated.Text>
          </View>

          <Text style={styles.scanCount}>
            Based on{' '}
            <Text style={{ color: colors.accent, fontWeight: '700' }}>
              {totalScans.toLocaleString()}
            </Text>{' '}
            scans
          </Text>
        </View>

        {/* Explanation */}
        <View style={styles.explainCard}>
          <Text style={styles.explainTitle}>Why this matters</Text>
          <Text style={styles.explainBody}>
            Every scan anonymously contributes to a store's trust profile.
            People who don't scan — including elderly family members — benefit
            from the collective intelligence of those who do.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Capture')}>
          <Text style={styles.scanAgainText}>Scan another product</Text>
        </TouchableOpacity>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 20,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  noticeText: {
    fontSize: fonts.small,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },

  scoreCard: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bgCardBorder,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  storeName: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  storeLabel: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  scoreRingWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  scoreTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.bgCardBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreFill: {
    height: 8,
    borderRadius: 4,
  },
  scoreNumber: {
    fontSize: fonts.display,
    fontWeight: '800',
    letterSpacing: -2,
  },
  scanCount: {
    fontSize: fonts.small,
    color: colors.textSecondary,
  },

  explainCard: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bgCardBorder,
    padding: 20,
    gap: 8,
  },
  explainTitle: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  explainBody: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  doneBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginTop: 4,
  },
  doneBtnText: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.bg,
  },
  scanAgainText: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
