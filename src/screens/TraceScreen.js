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
import XpOverlay from '../components/XpOverlay';
import { colors, fonts, radius } from '../theme';

const YELLOW = '#FFD700';

const WAYPOINTS = [
  { id: 1, label: 'Production',    city: 'Shenzhen, China',       lat: 22.5431, lng: 114.0579 },
  { id: 2, label: 'Distribution',  city: 'Dubai, UAE',            lat: 25.2048, lng:  55.2708 },
  { id: 3, label: 'European Hub',  city: 'Frankfurt, Germany',    lat: 50.1109, lng:   8.6821 },
  { id: 4, label: 'Your Pharmacy', city: 'Lausanne, Switzerland', lat: 46.5197, lng:   6.6323 },
];

function midpoint(a, b) {
  return { latitude: (a.lat + b.lat) / 2, longitude: (a.lng + b.lng) / 2 };
}

// Returns bearing in degrees clockwise from North (-180 to 180).
// '▲' rotated by this value points in the direction of travel.
function bearing(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

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

  const arrows = WAYPOINTS.slice(0, -1).map((a, i) => {
    const b = WAYPOINTS[i + 1];
    return {
      id: i,
      coordinate: midpoint(a, b),
      rotation: bearing(a.lat, a.lng, b.lat, b.lng),
    };
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <XpOverlay />

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
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Polyline
            coordinates={polylineCoords}
            strokeColor={YELLOW}
            strokeWidth={2}
            lineDashPattern={[8, 5]}
          />

          {WAYPOINTS.map(p => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.dot} />
            </Marker>
          ))}

          {arrows.map(arrow => (
            <Marker
              key={`arr-${arrow.id}`}
              coordinate={arrow.coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={{ transform: [{ rotate: `${arrow.rotation}deg` }] }}>
                <Text style={styles.arrowChar}>▲</Text>
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

  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: colors.bg,
    shadowColor: YELLOW,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  arrowChar: {
    fontSize: 11,
    color: YELLOW,
    opacity: 0.85,
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
    backgroundColor: YELLOW,
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
    color: YELLOW,
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
