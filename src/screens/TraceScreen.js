import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors, fonts, radius } from '../theme';

const WAYPOINTS = [
  { id: 1, label: 'Production',    city: 'Shenzhen, China',       lat: 22.5431, lng: 114.0579 },
  { id: 2, label: 'Distribution',  city: 'Dubai, UAE',            lat: 25.2048, lng:  55.2708 },
  { id: 3, label: 'European Hub',  city: 'Frankfurt, Germany',    lat: 50.1109, lng:   8.6821 },
  { id: 4, label: 'Your Pharmacy', city: 'Lausanne, Switzerland', lat: 46.5197, lng:   6.6323 },
];


export default function TraceScreen({ navigation, route }) {
  const { result, scanReward } = route.params ?? {};

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

  const polylineCoords = WAYPOINTS.map(p => ({ latitude: p.lat, longitude: p.lng }));


  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 38,
            longitude: 62,
            latitudeDelta: 52,
            longitudeDelta: 130,
          }}
          userInterfaceStyle="dark"
          showsUserLocation={false}
        >
          <Polyline
            coordinates={polylineCoords}
            strokeColor={colors.accent}
            strokeWidth={4}
          />

          {WAYPOINTS.map(p => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[styles.markerOuter, { borderColor: colors.accent }]}>
                <View style={[styles.markerInner, { backgroundColor: colors.accent }]} />
              </View>
            </Marker>
          ))}

        </MapView>

        {/* Top info card */}
        <View style={styles.topOverlay}>
          <Text style={styles.title}>Product Journey</Text>
          <Text style={styles.subtitle}>Supply chain traced across 3 continents</Text>
          <View style={styles.chain}>
            {WAYPOINTS.map((p, i) => (
              <React.Fragment key={p.id}>
                <View style={styles.chainItem}>
                  <View style={styles.chainDot} />
                  <Text style={styles.chainLabel}>{p.label}</Text>
                  <Text style={styles.chainCity}>{p.city.split(',')[0]}</Text>
                </View>
                {i < WAYPOINTS.length - 1 && (
                  <Text style={styles.chainArrow}>›</Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Continue button */}
        <View style={styles.bottomOverlay}>
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.8}>
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mapWrapper: { flex: 1, position: 'relative' },
  map: { flex: 1 },

  markerOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    backgroundColor: 'rgba(8,12,24,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: colors.overlay,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bgCardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  title: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: fonts.tiny,
    color: colors.textSecondary,
  },
  chain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  chainItem: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  chainDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  chainLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  chainCity: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chainArrow: {
    fontSize: fonts.label,
    color: colors.accent,
    opacity: 0.7,
    marginBottom: 6,
  },

  bottomOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
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
});
