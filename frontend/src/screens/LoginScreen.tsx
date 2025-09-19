// src/screens/LoginScreen.tsx — estilo mock (panel welcome + form) con rotación de mensajes
// Librerías usadas:
//  - expo-linear-gradient (o react-native-linear-gradient)
//  - react-native-svg
//  - (opcional) react-native-vector-icons si luego quieres íconos
// Mantiene endpoints y navegación.

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// Si no usas Expo, cambia la import a: import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';

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

// Mensajes que rotan en el panel izquierdo (título, subtítulo)
const WELCOMES: Array<[string, string]> = [
  ['Tu negocio, claro y al día', 'Paneles y alertas que te ayudan a decidir mejor.'],
  ['Finanzas simples, decisiones grandes', 'Vende, cobra y controla inventario sin dolores de cabeza.'],
  ['Hecho para Nicaragua y C.A.', 'Benchmarking regional y pagos locales integrados.'],
  ['Tu asesor de bolsillo', 'Consejos prácticos y métricas que impulsan tu pyme.'],
  ['Integrado a tu día a día', 'WhatsApp Business, facturación electrónica y más.'],
];

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

  // Rotación de mensajes del panel izquierdo
  const [welcomeIdx, setWelcomeIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current; // micro-animación opcional al panel

  useEffect(() => { setBaseUrl(base); }, [base]);

  useEffect(() => {
    // Fade out → cambia índice → fade in
    const interval = setInterval(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setWelcomeIdx(i => (i + 1) % WELCOMES.length);
        Animated.timing(fade, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, 6000); // cada 6s
    return () => clearInterval(interval);
  }, [fade]);

  useEffect(() => {
    // Micro “flotación” del panel para dar vida (opcional)
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [float]);

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
        <Animated.View
          style={[
            styles.leftFloat,
            { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
          ]}
        >
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

            {/* Mensajes rotativos */}
            <Animated.View style={[styles.welcomeBox, { opacity: fade }]}>
              <Text style={styles.welcomeTitle}>{WELCOMES[welcomeIdx][0]}</Text>
              <Text style={styles.welcomeSub}>{WELCOMES[welcomeIdx][1]}</Text>
            </Animated.View>
            <Text style={styles.site}>PapuThink · Contadito</Text>
          </LinearGradient>
        </Animated.View>

        {/* Right panel (Form) */}
        <KeyboardAvoidingView style={styles.right} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              <Text style={styles.hello}>¡Hola!</Text>
              <Text style={styles.morning}>Bienvenido de nuevo</Text>
              <Text style={styles.lead}>
                <Text style={{ color: P.text }}>Inicia sesión en </Text>
                <Text style={{ fontWeight: '700' }}>tu cuenta</Text>
              </Text>

              <Field label="Correo electrónico">
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

              <Field label="Contraseña">
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
                  <Pressable onPress={() => setShowPass(s => !s)} style={styles.eyeBtn} accessibilityLabel={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <Text style={{ fontWeight: '700' }}>{showPass ? '🙈' : '👁️'}</Text>
                  </Pressable>
                </View>
              </Field>

              <View style={styles.rowBetween}>
                <Pressable onPress={() => setRemember(r => !r)} style={styles.rememberRow}>
                  <View style={[styles.checkbox, remember && styles.checkboxOn]}>{remember && <Text style={styles.tick}>✓</Text>}</View>
                  <Text style={styles.rememberText}>Recordarme</Text>
                </Pressable>
                <Pressable onPress={() => Alert.alert('Recuperar contraseña', 'Implementa navegación a ForgotPassword')}>
                  <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
                </Pressable>
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable onPress={handleLogin} disabled={loading || !formValid} style={[styles.submit, (loading || !formValid) && { opacity: 0.6 }]}>
                <LinearGradient colors={[P.blue, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.submitBG} />
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color={P.white} />
                    <Text style={styles.submitText}>INGRESANDO…</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>INICIAR SESIÓN</Text>
                )}
              </Pressable>

              <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: 10 }}>
                <Text style={styles.create}>Crear cuenta</Text>
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

  // “float” wrapper para el panel izquierdo (animación opcional)
  leftFloat: { flex: 1.2 },

  left: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  welcomeBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
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
