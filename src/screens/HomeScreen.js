import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { colors, fonts, radius } from '../theme';

export default function HomeScreen({ navigation }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <Animated.View style={[styles.container, { opacity: fadeIn }]}>
        <View style={styles.logoArea}>
          <View style={styles.eyeOuter}>
            <View style={styles.eyeInner} />
          </View>
          <Text style={styles.appName}>ARGUS</Text>
          <Text style={styles.tagline}>Product authenticity, everywhere.</Text>
        </View>

        <Animated.View style={[styles.btnWrap, { transform: [{ scale: pulse }] }]}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => navigation.navigate('Capture')}
            activeOpacity={0.85}
          >
            <Text style={styles.scanBtnText}>Scan a Product</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.hint}>No account required</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 60,
  },
  logoArea: {
    alignItems: 'center',
    gap: 14,
  },
  eyeOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  eyeInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
  },
  appName: {
    fontSize: fonts.title,
    fontWeight: '700',
    letterSpacing: 8,
    color: colors.textPrimary,
  },
  tagline: {
    fontSize: fonts.body,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  btnWrap: {
    width: '100%',
  },
  scanBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  scanBtnText: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.bg,
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: fonts.small,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
