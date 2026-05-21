import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef } from 'react';
import { setupNotifications, addNotificationResponseListener } from '../services/NotificationService';

import { useAuth } from '../context/AuthContext';
import { getTheme } from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen, { ONBOARDING_KEY } from '../screens/auth/OnboardingScreen';
import DashboardScreen from '../screens/tabs/DashboardScreen';
import PracticeScreen from '../screens/tabs/PracticeScreen';
import MockExamScreen from '../screens/tabs/MockExamScreen';
import MoreScreen from '../screens/tabs/MoreScreen';
import FlashcardsScreen from '../screens/tabs/FlashcardsScreen';
import AnalyticsScreen from '../screens/tabs/AnalyticsScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';
import UpgradeScreen from '../screens/tabs/UpgradeScreen';
import LegalScreen from '../screens/legal/LegalScreen';

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

function MoreNavigator() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen name="Flashcards" component={FlashcardsScreen} />
      <MoreStack.Screen name="Analytics" component={AnalyticsScreen} />
      <MoreStack.Screen name="Profile" component={ProfileScreen} />
      <MoreStack.Screen name="Upgrade" component={UpgradeScreen} />
      <MoreStack.Screen name="Legal" component={LegalScreen} />
    </MoreStack.Navigator>
  );
}

function MainTabs() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
      screenListeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Practice"
        component={PracticeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="book-open" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="MockExams"
        component={MockExamScreen}
        options={{ tabBarLabel: 'Exams', tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, token, loading } = useAuth();
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const [onboardingDone, setOnboardingDone] = useState(null);
  const navigationRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Pedir permisos y activar notificaciones cuando el usuario está autenticado
  useEffect(() => {
    if (!user || !token) return;
    AsyncStorage.getItem('rbt_notifications_enabled').then(val => {
      const enabled = val === null ? true : val === 'true'; // default ON
      if (enabled) setupNotifications(true, token);
    });
  }, [user, token]);

  // Listener para cuando el usuario toca una notificación → navegar a la pantalla
  useEffect(() => {
    const sub = addNotificationResponseListener(navigationRef);
    return () => sub.remove();
  }, []);

  // Waiting for auth + onboarding check
  if (loading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  // Show onboarding only once (first install)
  if (!onboardingDone) {
    return (
      <NavigationContainer>
        <OnboardingScreen onDone={() => setOnboardingDone(true)} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? (
        <MainTabs />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
