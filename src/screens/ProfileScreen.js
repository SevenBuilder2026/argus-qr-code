import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { loadState, getCurrentLevel } from '../store/xpStore';
import { QUESTS } from '../data/quests';
import { LEVELS } from '../data/levels';
import XpOverlay from '../components/XpOverlay';
import { colors, fonts, radius } from '../theme';

const STREAK_META = {
  daily:   { icon: '🔥', label: 'Daily',   unit: 'day' },
  weekly:  { icon: '📅', label: 'Weekly',  unit: 'week' },
  monthly: { icon: '🌙', label: 'Monthly', unit: 'month' },
  yearly:  { icon: '🌟', label: 'Yearly',  unit: 'year' },
};

// Daily has highest priority — it's the most active indicator
const STREAK_PRIORITY = ['daily', 'weekly', 'monthly', 'yearly'];

export default function ProfileScreen() {
  const [gameState, setGameState] = useState(null);
  const tabBarHeight = useBottomTabBarHeight();

  const refresh = useCallback(async () => {
    const s = await loadState();
    setGameState(s);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!gameState) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      </SafeAreaView>
    );
  }

  const levelInfo = getCurrentLevel(gameState.xpTotal);
  const nextLevelData = levelInfo.nextLevelXp != null
    ? LEVELS.find(l => l.minXp === levelInfo.nextLevelXp)
    : null;

  // Most significant active streak (daily > weekly > monthly > yearly)
  const bestStreakTrack = STREAK_PRIORITY.find(
    track => (gameState.streaks[track]?.currentRun ?? 0) > 0
  ) ?? null;

  const streakBadge = bestStreakTrack ? {
    meta: STREAK_META[bestStreakTrack],
    run: gameState.streaks[bestStreakTrack].currentRun,
  } : null;

  const badgeEntries = Object.entries(gameState.badges);
  const totalBadgeCount = badgeEntries.length + (streakBadge ? 1 : 0);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <XpOverlay xpTotal={gameState.xpTotal} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 20 }]} showsVerticalScrollIndicator={false}>

        {/* Identity */}
        <View style={styles.section}>
          <Text style={styles.levelName}>{levelInfo.name}</Text>
          <Text style={styles.xpCount}>{gameState.xpTotal} XP</Text>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${Math.min(levelInfo.progress * 100, 100)}%` }]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {levelInfo.nextLevelXp != null
              ? `${gameState.xpTotal} / ${levelInfo.nextLevelXp} XP to ${nextLevelData?.name ?? ''}`
              : 'Max level reached'}
          </Text>
          <Text style={styles.scanCount}>Scans: {gameState.scansTotal}</Text>
        </View>

        {/* Badges — list format, streak badge at top if active */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Badges ({totalBadgeCount})</Text>

          {totalBadgeCount === 0 ? (
            <Text style={styles.emptyText}>No badges yet. Start scanning!</Text>
          ) : (
            <>
              {streakBadge && (
                <View style={styles.badgeRow}>
                  <Text style={styles.rowIcon}>{streakBadge.meta.icon}</Text>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{streakBadge.meta.label} Streak</Text>
                  </View>
                  <Text style={styles.rowCount}>
                    {streakBadge.run}{' '}
                    {streakBadge.run === 1 ? streakBadge.meta.unit : streakBadge.meta.unit + 's'}
                  </Text>
                </View>
              )}

              {badgeEntries.map(([id, badge]) => (
                <View key={id} style={styles.badgeRow}>
                  <Text style={styles.rowIcon}>{badge.icon}</Text>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{badge.name}</Text>
                  </View>
                  {badge.count > 1 && (
                    <Text style={styles.rowCount}>×{badge.count}</Text>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        {/* Quests */}
        <View style={[styles.card, styles.lastCard]}>
          <Text style={styles.cardTitle}>Quests</Text>
          {QUESTS.map(quest => {
            const qState = gameState.quests[quest.id];
            const done = qState?.completedCount > 0;
            return (
              <View key={quest.id} style={styles.questRow}>
                <Text style={styles.rowIcon}>{quest.icon}</Text>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{quest.name}</Text>
                  {!done && <Text style={styles.questDesc}>{quest.desc}</Text>}
                </View>
                {done && (
                  <Text style={styles.questDone}>✓ ×{qState.completedCount}</Text>
                )}
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 32 },

  section: { alignItems: 'center', marginBottom: 16, gap: 8 },
  levelName: {
    fontSize: fonts.hero,
    fontWeight: '800',
    color: colors.accent,
    textAlign: 'center',
  },
  xpCount: {
    fontSize: fonts.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.bgCardBorder,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scanCount: {
    fontSize: fonts.small,
    color: colors.textMuted,
  },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bgCardBorder,
    padding: 20,
    marginBottom: 14,
    gap: 14,
  },
  lastCard: { marginBottom: 0 },
  cardTitle: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  emptyText: {
    fontSize: fonts.small,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
  },

  // Shared row layout used for both badges and quests
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  rowInfo: { flex: 1 },
  rowName: {
    fontSize: fonts.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rowCount: {
    fontSize: fonts.small,
    color: colors.accent,
    fontWeight: '700',
  },

  questDesc: {
    fontSize: fonts.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  questDone: {
    fontSize: fonts.small,
    color: colors.authentic,
    fontWeight: '700',
    marginTop: 2,
  },
});
