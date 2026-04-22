import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors, fonts, radius } from '../theme';

// Real pharmacies around Lausanne (Beaulieu area is the hackathon venue)
const PHARMACIES = [
  { id: 1,  name: 'PharmaCité',          lat: 46.5197, lng: 6.6323, fake: 0 },
  { id: 2,  name: 'Pharmacie du Marché', lat: 46.5213, lng: 6.6292, fake: 0 },
  { id: 3,  name: 'Green Cross',         lat: 46.5168, lng: 6.6285, fake: 0 },
  { id: 4,  name: 'MedExpress',          lat: 46.5120, lng: 6.6290, fake: 1 },
  { id: 5,  name: 'Santé Plus',          lat: 46.5195, lng: 6.6180, fake: 0 },
  { id: 6,  name: 'Centrale Pharma',     lat: 46.5200, lng: 6.6450, fake: 0 },
  { id: 7,  name: 'City Pharmacy',       lat: 46.5252, lng: 6.6315, fake: 0 },
  { id: 8,  name: 'Apotheke Léman',      lat: 46.5178, lng: 6.6395, fake: 2 },
  { id: 9,  name: 'QuickMed',            lat: 46.5188, lng: 6.6220, fake: 0 },
  { id: 10, name: 'PharmaVerte',         lat: 46.5145, lng: 6.6380, fake: 0 },
  { id: 11, name: 'Beaulieu Pharma',     lat: 46.5225, lng: 6.6260, fake: 0 },
  { id: 12, name: 'Nord Santé',          lat: 46.5268, lng: 6.6340, fake: 0 },
];

const LAUSANNE_DEFAULT = { latitude: 46.5197, longitude: 6.6323 };
const INITIAL_DELTA = { latitudeDelta: 0.045, longitudeDelta: 0.035 };

export default function ExploreScreen({ navigation }) {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
      setLocationReady(true);
    })();
  }, []);

  const initialRegion = {
    ...(userLocation ?? LAUSANNE_DEFAULT),
    ...INITIAL_DELTA,
  };

  const flagged = PHARMACIES.filter((p) => p.fake > 0).length;
  const safe    = PHARMACIES.length - flagged;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {!locationReady ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loaderText}>Locating you…</Text>
        </View>
      ) : (
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
            userInterfaceStyle="dark"
          >
            {PHARMACIES.map((p) => {
              const isFlagged = p.fake > 0;
              const dotColor  = isFlagged ? colors.fake : colors.authentic;
              return (
                <Marker
                  key={p.id}
                  coordinate={{ latitude: p.lat, longitude: p.lng }}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  {/* Custom circular marker */}
                  <View style={[styles.markerOuter, { borderColor: dotColor }]}>
                    <View style={[styles.markerInner, { backgroundColor: dotColor }]} />
                  </View>

                  <Callout tooltip>
                    <View style={styles.callout}>
                      <Text style={styles.calloutName}>{p.name}</Text>
                      {isFlagged ? (
                        <Text style={[styles.calloutStatus, { color: colors.fake }]}>
                          {p.fake} fake{p.fake > 1 ? 's' : ''} detected
                        </Text>
                      ) : (
                        <Text style={[styles.calloutStatus, { color: colors.authentic }]}>
                          No fakes detected
                        </Text>
                      )}
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>

          {/* Top overlay: title + legend */}
          <View style={styles.topOverlay}>
            <Text style={styles.title}>Nearby Pharmacies</Text>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.authentic }]} />
                <Text style={styles.legendLabel}>No fakes detected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.fake }]} />
                <Text style={styles.legendLabel}>Fake detected</Text>
              </View>
            </View>
            <Text style={styles.summary}>
              {safe} safe · {flagged} flagged · {PHARMACIES.length} total
            </Text>
          </View>

          {/* Bottom overlay: back button */}
          <View style={styles.bottomOverlay}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <Text style={styles.backBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: fonts.body,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },

  // Markers
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

  // Callout bubble
  callout: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bgCardBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  calloutName: {
    color: colors.textPrimary,
    fontSize: fonts.small,
    fontWeight: '700',
    marginBottom: 3,
  },
  calloutStatus: {
    fontSize: fonts.tiny,
    fontWeight: '600',
  },

  // Top card overlay
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
    gap: 8,
  },
  title: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: fonts.tiny,
    color: colors.textSecondary,
  },
  summary: {
    fontSize: fonts.tiny,
    color: colors.textMuted,
  },

  // Bottom button overlay
  bottomOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  backBtn: {
    borderRadius: radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.overlay,
  },
  backBtnText: {
    fontSize: fonts.label,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
});
