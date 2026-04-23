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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import XpOverlay from '../components/XpOverlay';
import { colors, fonts, radius } from '../theme';

export default function ContributionScreen({ navigation, route }) {
  const {
    store,
    leveledUp = false,
    newLevel = null,
    newXpTotal = 0,
    questsCompleted = [],
  } = route.params ?? {};

  const insets = useSafeAreaInsets();

  const storeName = store?.name ?? 'Pharmacie du Maupas';
  const trustScore = store?.trust_score ?? 94;
  const totalScans = store?.total_scans ?? 1247;

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  const levelUpScaleAnim = useRef(new Animated.Value(0.8)).current;
  const levelUpFadeAnim = useRef(new Animated.Value(0)).current;
  const [showLevelUp, setShowLevelUp] = useState(false);

  const [activeToast, setActiveToast] = useState(null);
  // Start above screen (negative Y), slide down to 0
  const toastSlide = useRef(new Animated.Value(-120)).current;
  const toastFade = useRef(new Animated.Value(0)).current;
  const toastQueue = useRef([]);

  const scoreColor = trustScore >= 85 ? colors.authentic : trustScore >= 60 ? colors.suspicious : colors.fake;

  const arcWidth = scoreAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const showNextToast = () => {
    if (toastQueue.current.length === 0) return;
    const quest = toastQueue.current.shift();
    setActiveToast(quest);
    toastSlide.setValue(-120);
    toastFade.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      // Slide down from above, like an iOS notification
      Animated.parallel([
        Animated.spring(toastSlide, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(toastFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(3000),
      // Slide back up
      Animated.parallel([
        Animated.timing(toastSlide, {
          toValue: -120,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(toastFade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setActiveToast(null);
      setTimeout(showNextToast, 500);
    });
  };

  const triggerRewards = () => {
    if (questsCompleted.length > 0) {
      toastQueue.current = [...questsCompleted];
      showNextToast();
    }
  };

  const runLevelUpBanner = () => {
    setShowLevelUp(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(levelUpScaleAnim, { toValue: 1.0, duration: 350, useNativeDriver: true }),
        Animated.timing(levelUpFadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.delay(2000),
      Animated.timing(levelUpFadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setShowLevelUp(false);
      triggerRewards();
    });
  };

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    Animated.timing(scoreAnim, {
      toValue: trustScore / 100,
      duration: 1200,
      useNativeDriver: false,
    }).start(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (leveledUp) {
        runLevelUpBanner();
      } else {
        triggerRewards();
      }
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <XpOverlay xpTotal={newXpTotal} />

      {/* Level-up banner — drops from top */}
      {showLevelUp && (
        <Animated.View
          style={[
            styles.levelUpBanner,
            { paddingTop: insets.top + 14, opacity: levelUpFadeAnim, transform: [{ scale: levelUpScaleAnim }] },
          ]}
        >
          <Text style={styles.levelUpText}>
            LEVEL UP — {newLevel?.name ?? ''}
          </Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          <View style={styles.noticeCard}>
            <Animated.View style={[styles.dot, { opacity: dotAnim }]} />
            <Text style={styles.noticeText}>
              Your scan was added to the{'\n'}community trust network
            </Text>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.storeLabel}>Community Trust Score</Text>
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

          <View style={styles.explainCard}>
            <Text style={styles.explainTitle}>Why this matters</Text>
            <Text style={styles.explainBody}>
              Every scan anonymously contributes to a store's trust profile.
              People who don't scan — including elderly family members — benefit
              from the collective intelligence of those who do.
            </Text>
          </View>

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
      </ScrollView>

      {/* Quest toast — slides down from top like a notification */}
      {activeToast && (
        <Animated.View
          style={[
            styles.questToast,
            {
              top: insets.top + 46,
              opacity: toastFade,
              transform: [{ translateY: toastSlide }],
            },
          ]}
        >
          <Text style={styles.questToastText}>
            {activeToast.icon} {activeToast.name} — badge earned!
            {activeToast.completedCount > 1 ? ` ×${activeToast.completedCount}` : ''}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  container: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 32,
    gap: 16,
  },

  levelUpBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.accentDim,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
  },
  levelUpText: {
    fontSize: fonts.label,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    padding: 20,
    alignItems: 'center',
    gap: 8,
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
    gap: 10,
    marginVertical: 4,
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
    padding: 18,
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
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
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

  questToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 200,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.accent + '50',
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  questToastText: {
    fontSize: fonts.body,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
