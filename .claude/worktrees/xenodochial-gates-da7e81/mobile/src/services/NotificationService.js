import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE    = 'https://rbtgenius.com';
const HOUR_KEY    = 'rbt_notif_hour';   // stored reminder hour (default 19)
const NOTIF_KEY   = 'rbt_notifications_enabled';

// How expo-notifications handles incoming notifications while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge:  false,
  }),
});

// ── Permissions ───────────────────────────────────────────────────────────────
export async function requestPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name:      'Daily Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule daily reminder ───────────────────────────────────────────────────
export async function scheduleDailyReminder(hour = 19) {
  // Cancel any existing reminders first
  await Notifications.cancelAllScheduledNotificationsAsync();

  await AsyncStorage.setItem(HOUR_KEY, String(hour));

  const messages = [
    { title: '🎯 ¡Hora de practicar!',      body: 'Mantén tu racha y mejora tu readiness score hoy.' },
    { title: '📚 RBT Genius te espera',      body: 'Unos minutos de práctica marcan la diferencia.' },
    { title: '🔥 ¡No pierdas tu racha!',     body: 'Practica ahora y sigue avanzando hacia tu certificación.' },
    { title: '✅ Sesión de estudio pendiente', body: 'Tu examen RBT se acerca — una práctica rápida ayuda.' },
  ];

  // Schedule one notification per day cycling through messages
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    // Schedule at the given hour, rotating days
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body:  msg.body,
        data:  { screen: 'Practice' },
      },
      trigger: {
        type:       Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday:    (i % 7) + 1, // 1=Sun … 7=Sat
        hour,
        minute:     0,
        repeats:    true,
      },
    });
  }
}

// ── Cancel all ────────────────────────────────────────────────────────────────
export async function cancelReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Main setup (called from toggle + app init) ────────────────────────────────
export async function setupNotifications(enabled, authToken = null) {
  if (!enabled) {
    await cancelReminders();
    return false;
  }

  const granted = await requestPermissions();
  if (!granted) return false;

  const savedHour = await AsyncStorage.getItem(HOUR_KEY);
  await scheduleDailyReminder(savedHour ? Number(savedHour) : 19);

  // Register push token with server (best effort — doesn't block UX)
  if (authToken) {
    registerPushToken(authToken).catch(() => {});
  }

  return true;
}

// ── Push token registration ───────────────────────────────────────────────────
export async function registerPushToken(authToken) {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'caacd2e4-8b30-4ace-b81d-1e5da78e62ed',
    });
    await fetch(`${API_BASE}/api/push-tokens`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token:    tokenData.data,
        platform: Platform.OS,
      }),
    });
  } catch {
    // Endpoint may not exist yet — silent fail
  }
}

// ── Notification tap handler (navigate to right screen) ──────────────────────
export function addNotificationResponseListener(navigationRef) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const screen = response.notification.request.content.data?.screen;
    if (screen && navigationRef?.current) {
      navigationRef.current.navigate(screen);
    }
  });
}
