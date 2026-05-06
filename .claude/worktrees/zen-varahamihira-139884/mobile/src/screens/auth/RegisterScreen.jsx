import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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

import { useAuth } from '../../context/AuthContext';
import { alpha, getTheme } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s = styles(theme);
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();

    if (!name || !mail || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(name, mail, password);
    } catch (e) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    Linking.openURL('https://rbtgenius.com/auth/google');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <Text style={s.title}>Create account</Text>
            <Text style={s.sub}>Start your RBT exam prep today</Text>
          </View>

          {/* Google button */}
          <Pressable style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.8 }]} onPress={handleGoogleRegister}>
            <View style={s.googleIconBox}>
              <Text style={s.googleG}>G</Text>
            </View>
            <Text style={s.googleBtnText}>Continue with Google</Text>
          </Pressable>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or sign up with email</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.form}>
            <View style={s.field}>
              <Text style={s.label}>Full name</Text>
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
              <Text style={s.label}>Email</Text>
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
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
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
                : <Text style={s.btnText}>Create Account</Text>
              }
            </Pressable>
          </View>

          <Pressable style={s.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={s.loginLinkText}>
              Already have an account?{' '}
              <Text style={{ color: theme.primary }}>Sign in</Text>
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
    content: { flexGrow: 1, padding: 28, justifyContent: 'center', gap: 24 },
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
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
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
