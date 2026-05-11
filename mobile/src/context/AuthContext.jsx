import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// RevenueCat — optional (native module, won't be available in Expo Go)
let _initRevenueCat = null;
try {
  const rc = require('../services/RevenueCatService');
  _initRevenueCat = rc.initRevenueCat;
} catch { /* no-op */ }

async function maybeInitRC(userId) {
  if (_initRevenueCat) {
    try { await _initRevenueCat(userId); } catch (e) { console.log('[RC] init error:', e?.message); }
  }
}

const AuthContext = createContext(null);

const TOKEN_KEY = 'rbt_genius_auth_token';
const API_BASE = 'https://www.rbtgenius.com';
const DASHBOARD_TIMEOUT_MS = 6000;

GoogleSignin.configure({
  webClientId:
    '37632251231-cc6t4d7beofa9l8h14shg14epdtpflgr.apps.googleusercontent.com',
  iosClientId:
    '37632251231-th4qu526qnm34f3uitq7m363dolsu1f0.apps.googleusercontent.com',
  offlineAccess: false,
});

async function fetchDashboard(token) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildUser(rawUser, dashboard = {}) {
  const progress = dashboard.progress || {};
  const entitlements = dashboard.entitlements || {};

  return {
    id: rawUser.id,
    name: rawUser.full_name ?? rawUser.name ?? 'Student',
    email: rawUser.email,
    plan: rawUser.plan ?? 'free',
    role: rawUser.role ?? 'student',
    readiness: Math.round(progress.readiness_score ?? 0),
    streak: progress.study_streak_days ?? 0,
    completedQuestions: progress.total_questions_completed ?? 0,
    accuracyRate: Math.round(progress.accuracy_rate ?? 0),
    questionsToday: progress.questions_today ?? 0,
    isPremium: entitlements.is_premium ?? false,
    dailyLimit: entitlements.practice_daily_limit ?? 15,
    flashcardLimit: entitlements.flashcard_daily_limit ?? 15,
    aiLimit: entitlements.ai_tutor_daily_limit ?? 5,
  };
}

function hydrateDashboard(rawUser, authToken, setUser) {
  fetchDashboard(authToken).then((dashboard) => {
    if (!dashboard?.progress && !dashboard?.entitlements) return;
    setUser((prev) => (prev ? buildUser(rawUser, dashboard) : prev));
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);

        if (!saved) {
          setLoading(false);
          return;
        }

        const meRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${saved}` },
        });

        if (!meRes.ok) {
          await AsyncStorage.removeItem(TOKEN_KEY);
          setLoading(false);
          return;
        }

        const rawUser = await meRes.json();

        setToken(saved);
        setUser(buildUser(rawUser));
        maybeInitRC(rawUser.id);
        hydrateDashboard(rawUser, saved, setUser);
      } catch (error) {
        console.log('[Auth] Restore session error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const { token: t, user: rawUser } = data;

    await AsyncStorage.setItem(TOKEN_KEY, t);

    setToken(t);
    setUser(buildUser(rawUser));
    maybeInitRC(rawUser.id);
    hydrateDashboard(rawUser, t, setUser);
  };

  const register = async (fullName, email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    const { token: t, user: rawUser } = data;

    await AsyncStorage.setItem(TOKEN_KEY, t);

    setToken(t);
    setUser(buildUser(rawUser));
    maybeInitRC(rawUser.id);
    hydrateDashboard(rawUser, t, setUser);
  };

  const loginWithGoogle = async () => {
    try {
      const userInfo = await GoogleSignin.signIn();

      console.log('[Google] full userInfo:', JSON.stringify(userInfo));

      const idToken = userInfo?.idToken || userInfo?.data?.idToken;

      console.log('[Google] idToken exists:', !!idToken);

      if (!idToken) {
        throw new Error('No ID token from Google');
      }

      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      const { token: t, user: rawUser } = data;

      await AsyncStorage.setItem(TOKEN_KEY, t);

      setToken(t);
      setUser(buildUser(rawUser));
      maybeInitRC(rawUser.id);
      hydrateDashboard(rawUser, t, setUser);
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[Google] User cancelled sign-in');
        return;
      }

      if (error?.code === statusCodes.IN_PROGRESS) {
        console.log('[Google] Sign-in already in progress');
        return;
      }

      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('[Google] Play services not available');
        return;
      }

      console.log('[Google] Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      GoogleSignin.signOut().catch(() => {});
    } finally {
      await AsyncStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  };

  const refreshDashboard = async () => {
    if (!token) return;

    const dashboard = await fetchDashboard(token);

    if (!dashboard.progress) return;

    setUser(prev =>
      prev
        ? {
            ...prev,
            readiness: Math.round(
              dashboard.progress.readiness_score ?? prev.readiness,
            ),
            streak: dashboard.progress.study_streak_days ?? prev.streak,
            completedQuestions:
              dashboard.progress.total_questions_completed ??
              prev.completedQuestions,
            accuracyRate: Math.round(
              dashboard.progress.accuracy_rate ?? prev.accuracyRate,
            ),
            questionsToday:
              dashboard.progress.questions_today ?? prev.questionsToday,
            isPremium: dashboard.entitlements?.is_premium ?? prev.isPremium,
            dailyLimit:
              dashboard.entitlements?.practice_daily_limit ?? prev.dailyLimit,
            flashcardLimit:
              dashboard.entitlements?.flashcard_daily_limit ??
              prev.flashcardLimit,
            aiLimit:
              dashboard.entitlements?.ai_tutor_daily_limit ?? prev.aiLimit,
          }
        : prev,
    );
  };

  const refreshSession = async () => {
    if (!token) return null;

    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!meRes.ok) return null;

    const rawUser = await meRes.json();
    const nextToken = rawUser?.token || token;

    if (nextToken !== token) {
      await AsyncStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
    }

    setUser(buildUser(rawUser));
    maybeInitRC(rawUser.id);
    hydrateDashboard(rawUser, nextToken, setUser);
    return rawUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshDashboard,
        refreshSession,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
