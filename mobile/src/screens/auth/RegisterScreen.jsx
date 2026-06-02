import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../context/AuthContext';
import { alpha, getTheme } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s = styles(theme);
  const { register, loginWithGoogle } = useAuth();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();

    if (!name || !mail || !password) {
      setError(t('auth.all_fields_required'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.password_min'));
      return;
    }

    setLoading(true);
    try {
      await register(name, mail, password);
    } catch (e) {
      setError(e.message || t('auth.registration_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      Alert.alert(t('auth.alert_google_failed'), err.message ?? t('common.try_again'));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={s.title}>{t('auth.register_title')}</Text>
            <Text style={s.sub}>{t('auth.register_sub')}</Text>
          </View>

          {/* Google Sign-In */}
          <Pressable
            style={({ pressed }) => [s.googleBtn, (pressed || googleLoading) && { opacity: 0.75 }]}
            onPress={handleGoogleRegister}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#374151" size="small" />
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
            <Text style={s.dividerText}>{t('auth.or_email_signup')}</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.form}>
            <View style={s.field}>
              <Text style={s.label}>{t('auth.full_name')}</Text>
              <TextInput
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jane Smith"
                placeholderTextColor={theme.muted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('auth.email')}</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
                onSubmitEditing={handleRegister}
              />
            </View>

            {!!error && <Text style={s.error}>{error}</Text>}

            <Pressable
              style={[s.btn, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>{t('auth.sign_up')}</Text>
              }
            </Pressable>
          </View>

          <Pressable style={s.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={s.loginLinkText}>
              {t('auth.have_account')}{' '}
              <Text style={{ color: theme.primary }}>{t('auth.sign_in')}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    content: { flexGrow: 1, padding: 28, justifyContent: 'center', gap: 20 },
    header: { gap: 6 },
    title: { color: theme.text, fontSize: 30, fontWeight: '900' },
    sub: { color: theme.muted, fontSize: 15 },
    googleBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5,
      borderRadius: 18, paddingVertical: 16,
    },
    googleIconBox: {
      width: 24, height: 24, borderRadius: 6,
      backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2,
    },
    googleG: { color: '#4285F4', fontSize: 15, fontWeight: '900' },
    googleBtnText: { color: theme.text, fontSize: 16, fontWeight: '700' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: alpha(theme.border, 0.8) },
    dividerText: { color: theme.muted, fontSize: 13, fontWeight: '600' },
    form: { gap: 16 },
    field: { gap: 6 },
    label: { color: theme.text, fontSize: 14, fontWeight: '700' },
    input: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15,
      color: theme.text, fontSize: 15,
    },
    error: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
    btn: {
      backgroundColor: theme.primary, borderRadius: 18,
      paddingVertical: 18, alignItems: 'center', marginTop: 4,
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    loginLink: { alignItems: 'center' },
    loginLinkText: { color: theme.muted, fontSize: 15 },
  });
