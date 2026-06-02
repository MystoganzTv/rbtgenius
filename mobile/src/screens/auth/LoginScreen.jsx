import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';

// expo-apple-authentication — optional (requires native build)
let AppleAuthentication = null;
try { AppleAuthentication = require('expo-apple-authentication'); } catch { /* no-op */ }

import { useAuth } from '../../context/AuthContext';
import { alpha, getTheme } from '../../theme';

export default function LoginScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { login, loginWithApple, loginWithGoogle } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (AppleAuthentication?.isAvailableAsync) {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('auth.alert_missing_fields'), t('auth.alert_missing_fields_body'));
      return;
    }
    setLoading(true);
    try { await login(email.trim().toLowerCase(), password); }
    catch (err) { Alert.alert(t('auth.alert_login_failed'), err.message ?? t('auth.error_credentials')); }
    finally { setLoading(false); }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      await loginWithApple();
    } catch (err) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(t('auth.alert_apple_failed'), err.message ?? t('common.try_again'));
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      Alert.alert(t('auth.alert_google_failed'), err.message ?? t('common.try_again'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const s = styles(theme);
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.brandRow}>
            <View style={s.brandMark}><Text style={s.brandInitials}>RG</Text></View>
            <Text style={s.brandName}>RBT Genius</Text>
          </View>

          <Text style={s.headline}>{t('auth.login_title')}</Text>
          <Text style={s.subline}>{t('auth.login_sub')}</Text>

          {/* Apple Sign-In — only when native module available (iOS 13+) */}
          {appleAvailable && AppleAuthentication && (
            <View style={[s.appleWrapper, appleLoading && { opacity: 0.7 }]} pointerEvents={appleLoading ? 'none' : 'auto'}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={18}
                style={s.appleBtn}
                onPress={handleAppleLogin}
              />
            </View>
          )}

          {/* Google Sign-In */}
          <Pressable
            style={({ pressed }) => [s.googleBtn, (pressed || googleLoading) && { opacity: 0.75 }]}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <>
                <View style={s.googleIconBox}><Text style={s.googleG}>G</Text></View>
                <Text style={s.googleBtnText}>{t('auth.continue_google')}</Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>{t('auth.or_email_signin')}</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.form}>
            <View style={s.field}>
              <Text style={s.label}>{t('auth.email')}</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>
            <View style={s.field}>
              <Text style={s.label}>{t('auth.password')}</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.muted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>
            <Pressable style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('auth.sign_in')}</Text>}
            </Pressable>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>{t('auth.no_account')} </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={[s.footerText, { color: theme.primary, fontWeight: '700' }]}>{t('auth.sign_up_free')}</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  scroll: { flexGrow: 1, padding: 28, justifyContent: 'center', gap: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  brandMark: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16,
  },
  brandInitials: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandName: { color: theme.text, fontSize: 22, fontWeight: '800' },
  headline: { color: theme.text, fontSize: 32, fontWeight: '900', marginBottom: 4 },
  subline: { color: theme.muted, fontSize: 16, lineHeight: 24, marginBottom: 24 },
  appleWrapper: { marginBottom: 4 },
  appleBtn: { width: '100%', height: 56 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5,
    borderRadius: 18, paddingVertical: 16, marginBottom: 4, minHeight: 56,
  },
  googleIconBox: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2,
  },
  googleG: { color: '#4285F4', fontSize: 15, fontWeight: '900' },
  googleBtnText: { color: theme.text, fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: alpha(theme.border, 0.8) },
  dividerText: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { color: theme.text, fontSize: 14, fontWeight: '700' },
  input: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 16, color: theme.text, fontSize: 16 },
  btn: {
    backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', marginTop: 8,
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: theme.muted, fontSize: 15 },
});
