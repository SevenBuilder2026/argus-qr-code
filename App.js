import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from './src/screens/HomeScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import ProcessingScreen from './src/screens/ProcessingScreen';
import ResultScreen from './src/screens/ResultScreen';
import ContributionScreen from './src/screens/ContributionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import TraceScreen from './src/screens/TraceScreen';

import { colors, fonts } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_BAR_STYLE = {
  backgroundColor: colors.bg,
  borderTopColor: colors.bgCardBorder,
  paddingBottom: 6,
  height: 52,
};

const TAB_BAR_HIDDEN = {
  backgroundColor: colors.bg,
  borderTopColor: colors.bg,
  height: 0,
  overflow: 'hidden',
};

// Tab bar only appears once the user has completed a scan (Result + onward)
const SHOW_TAB_ON = ['Result', 'Contribution'];

function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Capture"
        component={CaptureScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="Processing" component={ProcessingScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="Contribution" component={ContributionScreen} />
      <Stack.Screen name="Explore" component={ExploreScreen} />
      <Stack.Screen name="Trace" component={TraceScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarLabelStyle: { fontSize: fonts.tiny, fontWeight: '600' },
          }}
        >
          <Tab.Screen
            name="ScanTab"
            component={ScanStack}
            options={({ route }) => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
              const showTab = SHOW_TAB_ON.includes(routeName);
              return {
                tabBarLabel: 'Scan',
                tabBarIcon: ({ color }) => (
                  <Text style={{ color, fontSize: 18 }}>⬡</Text>
                ),
                tabBarStyle: showTab ? TAB_BAR_STYLE : TAB_BAR_HIDDEN,
              };
            }}
          />
          <Tab.Screen
            name="MeTab"
            component={ProfileScreen}
            options={{
              tabBarLabel: 'Me',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 18 }}>◉</Text>
              ),
              tabBarStyle: TAB_BAR_STYLE,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
