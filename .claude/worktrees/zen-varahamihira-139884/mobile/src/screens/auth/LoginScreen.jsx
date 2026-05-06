import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { useAuth } from '../../context/AuthContext';
import { alpha, getTheme } from '../../theme';

const GOOGLE_ICON = (
  <Text style={{ fontSize: 18, lineHeight: 22 }}>G</Text>
);

export default function LoginScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Login failed', err.message ?? 'Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Linking.openURL('https://rbtgenius.com/auth/google');
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

          <Text style={s.headline}>Welcome back</Text>
          <Text style={s.subline}>Sign in to continue your study session</Text>

          {/* Google button */}
          <Pressable style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.8 }]} onPress={handleGoogleLogin}>
            <View style={s.googleIconBox}>
              <Text style={s.googleG}>G</Text>
            </View>
            <Text style={s.googleBtnText}>Continue with Google</Text>
          </Pressable>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or sign in with email</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.form}>
            <View style={s.field}>
              <Text style={s.label}>Email</Text>
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
              <Text style={s.label}>Password</Text>
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
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
            </Pressable>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={[s.footerText, { color: theme.primary, fontWeight: '700' }]}>Sign up free</Text>
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
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16,
  },
  brandInitials: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandName: { color: theme.text, fontSize: 22, fontWeight: '800' },
  headline: { color: theme.text, fontSize: 32, fontWeight: '900', marginBottom: 4 },
  subline: { color: theme.muted, fontSize: 16, lineHeight: 24, marginBottom: 24 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5,
    borderRadius: 18, paddingVertical: 16, marginBottom: 4,
  },
  googleIconBox: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  googleG: { color: '#4285F4', fontSize: 15, fontWeight: '900' },
  googleBtnText: { color: theme.text, fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: alpha(theme.border, 0.8) },
  dividerText: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { color: theme.text, fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
    borderRadius: 16, padding: 16, color: theme.text, fontSize: 16,
  },
  btn: {
    backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', marginTop: 8,
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: theme.muted, fontSize: 15 },
});
