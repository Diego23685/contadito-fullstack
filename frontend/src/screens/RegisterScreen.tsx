// src/screens/RegisterScreen.tsx — Estilo mock a juego con Login (degradado + formulario)
// Requiere las mismas libs que Login:
// Expo: expo install expo-linear-gradient react-native-svg
// Bare RN: yarn add react-native-linear-gradient react-native-svg && cd ios && pod install

import React, { useContext, useMemo, useState, useEffect } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// Si no usas Expo:
// import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';

import { api, setBaseUrl } from '../api';
import { AuthContext } from '../providers/AuthContext';

// ---------------- Config ----------------
const ANDROID_LOCALHOST = 'http://10.0.2.2:5000';
const LOOPBACK = 'http://127.0.0.1:5000';
const DEFAULT_BASE = Platform.OS === 'android' ? ANDROID_LOCALHOST : LOOPBACK;
setBaseUrl(DEFAULT_BASE);

// Paleta compartida
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
  <Pressable onPress={onPress} style={styles.smallBtn} android_ripple={{ color: '#e5e7eb' }}>
    <Text style={styles.smallBtnText}>{title}</Text>
  </Pressable>
);

const Field: React.FC<{ label: string; children: React.ReactNode }>=({ label, children }) => (
  <View style={{ marginTop: 14 }}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

export default function RegisterScreen() {
  const { login } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const stack = width < 1024;

  const [tenantName, setTenantName] = useState('DemoPyme');
  const [ownerName, setOwnerName] = useState('Owner');
  const [ownerEmail, setOwnerEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('pass123');
  const [confirm, setConfirm] = useState('pass123');

  const [base, setBase] = useState(DEFAULT_BASE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setBaseUrl(base); }, [base]);

  // Validaciones básicas (sin URL)
  const emailOk = useMemo(() => /.+@.+\..+/.test(ownerEmail.trim()), [ownerEmail]);
  const passOk = useMemo(() => password.trim().length >= 3, [password]);
  const confirmOk = useMemo(() => confirm === password, [confirm, password]);
  const formValid = tenantName.trim() && ownerName.trim() && emailOk && passOk && confirmOk;

  const handleRegister = async () => {
    if (!formValid) { setError('Revisa los campos resaltados'); return; }
    try {
      setLoading(true); setError(null); Keyboard.dismiss();
      const payload = { tenantName, ownerName, ownerEmail, password };
      const res = await api.post('/auth/register-tenant', payload);
      const token = res.data?.token as string | undefined;
      if (!token) { Alert.alert('Registro', 'Se registró, pero no se recibió token. Inicia sesión manualmente.'); return; }
      await login(token);
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo registrar';
      setError(String(msg)); Alert.alert('Error', String(msg));
    } finally { setLoading(false); }
  };

  const useAndroidLocalhost = () => setBase(ANDROID_LOCALHOST);
  const useLoopback = () => setBase(LOOPBACK);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.split, stack && { flexDirection: 'column' }]}>
        {/* Panel izquierdo (Welcome) */}
        <LinearGradient colors={[P.violet, P.blue, P.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.left, stack && { height: 420, flex: 0 }]}>
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="bubble" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
              </SvgLinearGradient>
            </Defs>
            <Circle cx="18%" cy="22%" r="40" fill="url(#bubble)" opacity={0.75} />
            <Circle cx="62%" cy="26%" r="64" fill="url(#bubble)" opacity={0.7} />
            <Circle cx="26%" cy="72%" r="58" fill="url(#bubble)" opacity={0.7} />
          </Svg>

          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSub}>Start your free workspace</Text>
          </View>
          <Text style={styles.site}>www.yoursite.com</Text>
        </LinearGradient>

        {/* Panel derecho (Formulario) */}
        <KeyboardAvoidingView style={[styles.right, stack && { flex: 1 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={styles.formCard}>
              <Text style={styles.hello}>Welcome 👋</Text>
              <Text style={styles.morning}>Create your account</Text>
              <Text style={styles.lead}>Tenant + Owner</Text>

              {/* Tenant */}
              <Field label="Business / Tenant Name">
                <TextInput
                  style={[styles.input, !tenantName.trim() && styles.inputErr]}
                  value={tenantName}
                  onChangeText={setTenantName}
                  placeholder="Mi Empresa S.A."
                  returnKeyType="next"
                />
                <LinearGradient colors={[P.violet, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.underline} />
              </Field>

              {/* Owner name */}
              <Field label="Your Name">
                <TextInput
                  style={[styles.input, !ownerName.trim() && styles.inputErr]}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Juan Pérez"
                  returnKeyType="next"
                />
                <LinearGradient colors={[P.violet, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.underline} />
              </Field>

              {/* Email */}
              <Field label="Email">
                <TextInput
                  style={[styles.input, !emailOk && styles.inputErr]}
                  value={ownerEmail}
                  onChangeText={setOwnerEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="tucorreo@dominio.com"
                  returnKeyType="next"
                />
                <LinearGradient colors={[P.violet, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.underline} />
              </Field>

              {/* Password */}
              <Field label="Password">
                <View>
                  <TextInput
                    style={[styles.input, !passOk && styles.inputErr]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    placeholder="••••••••"
                    returnKeyType="next"
                  />
                  <LinearGradient colors={[P.blue, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.underline} />
                  <Pressable onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}><Text style={{ fontWeight: '700' }}>{showPass ? '🙈' : '👁️'}</Text></Pressable>
                </View>
              </Field>

              {/* Confirm */}
              <Field label="Confirm Password">
                <View>
                  <TextInput
                    style={[styles.input, !confirmOk && styles.inputErr]}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showConfirm}
                    placeholder="••••••••"
                    returnKeyType="go"
                    onSubmitEditing={handleRegister}
                  />
                  <LinearGradient colors={[P.blue, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.underline} />
                  <Pressable onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}><Text style={{ fontWeight: '700' }}>{showConfirm ? '🙈' : '👁️'}</Text></Pressable>
                </View>
              </Field>

              {!!error && <Text style={styles.error}>{error}</Text>}

              {/* Submit */}
              <Pressable onPress={handleRegister} disabled={loading || !formValid} style={[styles.submit, (!formValid||loading)&&{opacity:0.6}]}> 
                <LinearGradient colors={[P.blue, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.submitBG} />
                {loading ? (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <ActivityIndicator color={P.white} />
                    <Text style={styles.submitText}>CREATE ACCOUNT</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>CREATE ACCOUNT</Text>
                )}
              </Pressable>

              {/* API controls */}
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
  welcomeBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
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
  inputErr: { backgroundColor: 'rgba(254, 242, 242, 0.6)' },
  underline: { height: 3, borderRadius: 2 },

  eyeBtn: { position: 'absolute', right: 0, top: 2, height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },

  error: { color: P.danger, marginTop: 10, fontWeight: '700' },

  submit: { marginTop: 18, borderRadius: 10, overflow: 'hidden', alignItems: 'center', paddingVertical: 14 },
  submitBG: { ...StyleSheet.absoluteFillObject },
  submitText: { color: P.white, fontWeight: '900', letterSpacing: 1 },

  apiBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: P.border, paddingTop: 12 },
  apiTitle: { fontWeight: '700', color: P.text },
  apiInput: { borderWidth: 1, borderColor: P.border, borderRadius: 10, padding: 10, marginTop: 6 },

  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: P.border, backgroundColor: '#fff' },
  smallBtnText: { fontWeight: '700', color: P.text },
});
