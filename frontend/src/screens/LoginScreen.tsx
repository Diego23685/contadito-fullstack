// src/screens/LoginScreen.tsx — estilo mock (panel welcome + form) usando librerías
// Librerías usadas:
//  - expo-linear-gradient (o react-native-linear-gradient)
//  - react-native-svg
//  - react-native-vector-icons (opcional)
// Mantiene endpoints y navegación.

import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
  Pressable,
  Keyboard,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
// Si no usas Expo, cambia la import a: import LinearGradient from 'react-native-linear-gradient';

import { api, setBaseUrl } from '../api';
import { AuthContext } from '../providers/AuthContext';
import { useNavigation } from '@react-navigation/native';

// ---------------- Config ----------------
const ANDROID_LOCALHOST = 'http://10.0.2.2:5000';
const LOOPBACK = 'http://127.0.0.1:5000';
const DEFAULT_BASE = Platform.OS === 'android' ? ANDROID_LOCALHOST : LOOPBACK;
setBaseUrl(DEFAULT_BASE);

const P = {
  violet: '#7C3AED',
  blue: '#2563EB',
  cyan: '#22D3EE',
  dark: '#0B1020',
  text: '#0F172A',
  sub: '#64748B',
  border: '#E5E7EB',
  danger: '#EF4444',
  white: '#FFFFFF',
};

const SmallBtn: React.FC<{ title: string; onPress: () => void }>=({ title, onPress }) => (
  <Pressable onPress={onPress} style={styles.smallBtn}>
    <Text style={styles.smallBtnText}>{title}</Text>
  </Pressable>
);

const Field: React.FC<{ label: string; children: React.ReactNode }>=({ label, children }) => (
  <View style={{ marginTop: 14 }}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('pass123');
  const [base, setBase] = useState(DEFAULT_BASE);
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setBaseUrl(base); }, [base]);

  const validEmail = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const validPassword = useMemo(() => password.trim().length >= 3, [password]);
  const formValid = validEmail && validPassword;

  const handleLogin = async () => {
    if (!formValid) { setError('Revisa tu correo o contraseña'); return; }
    try {
      setError(null); setLoading(true); Keyboard.dismiss();
      const res = await api.post('/auth/login', { email: email.trim(), password });
      const token = res.data?.token as string | undefined; if (!token) throw new Error('Respuesta sin token');
      await login(token);
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo iniciar sesión';
      setError(String(msg)); Alert.alert('Error', String(msg));
    } finally { setLoading(false); }
  };

  const useAndroidLocalhost = () => setBase(ANDROID_LOCALHOST);
  const useLoopback = () => setBase(LOOPBACK);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.split}>
        {/* Left panel (Welcome) */}
        <LinearGradient
          colors={[P.violet, P.blue, P.cyan]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.left}
        >
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="bubble" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
              </SvgLinearGradient>
            </Defs>
            <Circle cx="18%" cy="20%" r="36" fill="url(#bubble)" />
            <Circle cx="70%" cy="28%" r="60" fill="url(#bubble)" />
            <Circle cx="30%" cy="70%" r="54" fill="url(#bubble)" />
          </Svg>

          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeTitle}>Welcome Page</Text>
            <Text style={styles.welcomeSub}>Sign In To Your Account</Text>
          </View>
          <Text style={styles.site}>www.yoursite.com</Text>
        </LinearGradient>

        {/* Right panel (Form) */}
        <KeyboardAvoidingView style={styles.right} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              <Text style={styles.hello}>Hello !</Text>
              <Text style={styles.morning}>Good Morning</Text>
              <Text style={styles.lead}><Text style={{ color: P.text }}>Login </Text><Text style={{ fontWeight: '700' }}>Your Account</Text></Text>

              <Field label="Email Address">
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@email.com"
                  returnKeyType="next"
                />
                <LinearGradient colors={[P.violet, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.underline} />
              </Field>

              <Field label="Password">
                <View>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    placeholder="••••••••"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                  <LinearGradient colors={[P.blue, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.underline} />
                  <Pressable onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                    <Text style={{ fontWeight: '700' }}>{showPass ? '🙈' : '👁️'}</Text>
                  </Pressable>
                </View>
              </Field>

              <View style={styles.rowBetween}>
                <Pressable onPress={() => setRemember(r => !r)} style={styles.rememberRow}>
                  <View style={[styles.checkbox, remember && styles.checkboxOn]}>{remember && <Text style={styles.tick}>✓</Text>}</View>
                  <Text style={styles.rememberText}>Remember</Text>
                </Pressable>
                <Pressable onPress={() => Alert.alert('Recuperar contraseña', 'Implementa navegación a ForgotPassword')}>
                  <Text style={styles.forgot}>Forgot Password ?</Text>
                </Pressable>
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable onPress={handleLogin} disabled={loading || !formValid} style={styles.submit}>
                <LinearGradient colors={[P.blue, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.submitBG} />
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color={P.white} />
                    <Text style={styles.submitText}>SUBMIT</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>SUBMIT</Text>
                )}
              </Pressable>

              <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: 10 }}>
                <Text style={styles.create}>Create Account</Text>
              </Pressable>

              <View style={styles.apiBox}>
                <Text style={styles.apiTitle}>API URL</Text>
                <TextInput
                  style={styles.apiInput}
                  value={base}
                  onChangeText={setBase}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="http://host:puerto"
                />
                <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
                  <SmallBtn title="10.0.2.2" onPress={useAndroidLocalhost} />
                  <SmallBtn title="127.0.0.1" onPress={useLoopback} />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.dark },
  split: { flex: 1, flexDirection: 'row' },

  left: { flex: 1.2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  welcomeBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  welcomeTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },
  welcomeSub: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  site: { color: 'rgba(255,255,255,0.9)', position: 'absolute', bottom: 18 },

  right: { flex: 1, backgroundColor: P.white },
  formWrap: { padding: 24, alignItems: 'center', minHeight: '100%', justifyContent: 'center' },
  formCard: { width: '100%', maxWidth: 520, padding: 22 },

  hello: { color: P.dark, opacity: 0.7 },
  morning: { color: P.violet, fontWeight: '900', marginBottom: 4 },
  lead: { color: P.sub, marginBottom: 16 },

  label: { color: P.sub, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: 'transparent', paddingVertical: 10, paddingRight: 42, fontSize: 16, color: P.text },
  underline: { height: 2, borderRadius: 2 },

  eyeBtn: { position: 'absolute', right: 4, top: 6, padding: 8, borderRadius: 10 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' },
  tick: { color: P.blue, fontSize: 12, fontWeight: '900' },
  rememberText: { color: P.text },
  forgot: { color: P.violet, fontWeight: '700' },

  error: { color: P.danger, marginTop: 10, fontWeight: '700' },

  submit: { marginTop: 18, borderRadius: 10, overflow: 'hidden', alignItems: 'center', paddingVertical: 14 },
  submitBG: { ...StyleSheet.absoluteFillObject },
  submitText: { color: P.white, fontWeight: '900', letterSpacing: 1 },

  create: { color: P.violet, textAlign: 'center', fontWeight: '700' },

  apiBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: P.border, paddingTop: 12 },
  apiTitle: { fontWeight: '700', color: P.text },
  apiInput: { borderWidth: 1, borderColor: P.border, borderRadius: 10, padding: 10, marginTop: 6 },

  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: P.border, backgroundColor: '#fff' },
  smallBtnText: { fontWeight: '700', color: P.text },
});
