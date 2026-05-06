import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const AuthContext = createContext(null);

const TOKEN_KEY = 'rbt_genius_auth_token';
const API_BASE = 'https://rbtgenius.com';

GoogleSignin.configure({
  iosClientId:
    '37632251231-th4qu526qnm34f3uitq7m363dolsu1f0.apps.googleusercontent.com',
  webClientId:
    '37632251231-cc6t4d7beofa9l8h14shg14epdtpflgr.apps.googleusercontent.com',
  offlineAccess: true,
});

async function fetchDashboard(token) {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
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

        const [meRes, dashboard] = await Promise.all([
          fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${saved}` },
          }),
          fetchDashboard(saved),
        ]);

        if (!meRes.ok) {
          await AsyncStorage.removeItem(TOKEN_KEY);
          setLoading(false);
          return;
        }

        const rawUser = await meRes.json();

        setToken(saved);
        setUser(buildUser(rawUser, dashboard));
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

    const dashboard = await fetchDashboard(t);

    setToken(t);
    setUser(buildUser(rawUser, dashboard));
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

    const dashboard = await fetchDashboard(t);

    setToken(t);
    setUser(buildUser(rawUser, dashboard));
  };

  const loginWithGoogle = async () => {
    try {
      const userInfo = await GoogleSignin.signIn();

      console.log('[Google] userInfo exists:', !!userInfo);
      console.log('[Google] idToken exists:', !!userInfo?.idToken);

      const idToken = userInfo?.idToken;

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

      const dashboard = await fetchDashboard(t);

      setToken(t);
      setUser(buildUser(rawUser, dashboard));
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
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
