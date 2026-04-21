import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, StatusBar, SafeAreaView } from 'react-native';
import { colors, fonts } from '../theme';
import { verifyScan } from '../mock/api';

const STEPS = [
  'Reading security signature…',
  'Decoding micro-pattern…',
  'Querying SICPATRACE® Evo…',
  'Verifying batch record…',
];

export default function ProcessingScreen({ navigation, route }) {
  const { barcodeData } = route.params ?? {};
  const spin = useRef(new Animated.Value(0)).current;
  const stepIndex = useRef(0);
  const stepAnim = useRef(new Animated.Value(0)).current;
  const [stepText, setStepText] = React.useState(STEPS[0]);

  useEffect(() => {
    // Spinner
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Step text cycling
    const stepTimer = setInterval(() => {
      stepIndex.current = (stepIndex.current + 1) % STEPS.length;
      Animated.sequence([
        Animated.timing(stepAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(stepAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setStepText(STEPS[stepIndex.current]);
    }, 420);

    // Fire mock API
    verifyScan({ image: barcodeData ?? '', location: null, product_hint: '' }).then(
      (result) => {
        clearInterval(stepTimer);
        navigation.replace('Result', { result });
      }
    );

    return () => clearInterval(stepTimer);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.container}>
        {/* Ring spinner */}
        <View style={styles.spinnerWrap}>
          <View style={styles.spinnerTrack} />
          <Animated.View style={[styles.spinnerArc, { transform: [{ rotate }] }]} />
          <View style={styles.spinnerCenter}>
            <View style={styles.eye} />
          </View>
        </View>

        <Animated.Text style={[styles.stepText, { opacity: stepAnim }]}>
          {stepText}
        </Animated.Text>
        <Text style={styles.subText}>Secured by SICPATRACE® Evo</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  spinnerWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerTrack: {
    position: 'absolute',
    width: 100, height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.bgCardBorder,
  },
  spinnerArc: {
    position: 'absolute',
    width: 100, height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: colors.accent,
    borderRightColor: colors.accent + '60',
  },
  spinnerCenter: {
    width: 36, height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.accent + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  eye: {
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  stepText: {
    fontSize: fonts.label,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  subText: {
    fontSize: fonts.small,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
