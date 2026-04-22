import React, { useState, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadState, getCurrentLevel } from '../store/xpStore';
import { colors, fonts, radius } from '../theme';

// Top-right XP pill. Pass xpTotal to use a known value (e.g. after awardScan),
// omit to load from storage. Pulses when xpTotal prop is set or changes.
export default function XpOverlay({ xpTotal: xpProp }) {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    scaleAnim.setValue(1);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.35, duration: 110, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (xpProp !== undefined) {
      const levelInfo = getCurrentLevel(xpProp);
      setInfo({ xp: xpProp, name: levelInfo.name });
      pulse();
    } else {
      loadState().then(s => {
        const levelInfo = getCurrentLevel(s.xpTotal);
        setInfo({ xp: s.xpTotal, name: levelInfo.name });
      });
    }
  }, [xpProp]);

  if (!info) return null;

  return (
    <Animated.View
      style={[
        styles.pill,
        { top: insets.top + 8, transform: [{ scale: scaleAnim }] },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{info.name} · {info.xp} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 16,
    zIndex: 50,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent + '60',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: fonts.tiny,
    color: colors.accent,
    fontWeight: '600',
  },
});
