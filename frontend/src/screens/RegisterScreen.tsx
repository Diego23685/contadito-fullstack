// src/screens/RegisterScreen.tsx
// Estilo mock a juego con Login + Apoka manual
// Requiere: expo-linear-gradient, react-native-svg, expo-font

import React, { useContext, useMemo, useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { useFonts } from 'expo-font';

import { api, setBaseUrl } from '../api';
import { AuthContext } from '../providers/AuthContext';

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

// Mensajes que rotan
const WELCOMES: Array<[string, string]> = [
  ['Crea tu cuenta en minutos', 'Empieza gratis y configura tu negocio.'],
  ['Crecemos contigo', 'Planes flexibles y paneles que se adaptan a tu pyme.'],
  ['Hecho para Nicaragua y C.A.', 'Pagos locales e integraciones regionales.'],
  ['Tu equipo, un mismo lugar', 'Ventas, inventario y finanzas conectadas.'],
  ['Decide con confianza', 'Alertas inteligentes y métricas claras.'],
];

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

  // Fuente Apoka
  const [_fontsLoaded] = useFonts({
    Apoka: require('../../assets/fonts/apokaregular.ttf'),
  });

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

  // Rotación de mensajes
  const [welcomeIdx, setWelcomeIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => { setBaseUrl(base); }, [base]);

  useEffect(() => {
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
    }, 6000);
    return () => clearInterval(interval);
  }, [fade]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [float]);

  // Validaciones
  const emailOk = useMemo(() => /.+@.+\..+/.test(ownerEmail.trim()), [ownerEmail]);
  const passOk = useMemo(() => password.trim().length >= 3, [password]);
  const confirmOk = useMemo(() => confirm === password, [confirm, password]);
  const formValid = Boolean(tenantName.trim() && ownerName.trim() && emailOk && passOk && confirmOk);

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
        <Animated.View
          style={[
            styles.leftFloat,
            stack && { height: 420, flex: 0 },
            { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
          ]}
        >
          <LinearGradient colors={[P.violet, P.blue, P.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.left}>
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

            <Animated.View style={[styles.welcomeBox, { opacity: fade }]}>
              <Text style={styles.welcomeTitle}>{WELCOMES[welcomeIdx][0]}</Text>
              <Text style={styles.welcomeSub}>{WELCOMES[welcomeIdx][1]}</Text>
            </Animated.View>
            <Text style={styles.site}>PapuThink · Contadito</Text>
          </LinearGradient>
        </Animated.View>

        {/* Panel derecho (Formulario) */}
        <KeyboardAvoidingView style={[styles.right, stack && { flex: 1 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={styles.formCard}>
              <Text style={styles.hello}>¡Bienvenido! 👋</Text>
              <Text style={styles.morning}>Crea tu cuenta</Text>
              <Text style={styles.lead}>Tenant + Owner</Text>

              {/* Tenant */}
              <Field label="Nombre del negocio (Tenant)">
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
              <Field label="Tu nombre">
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
              <Field label="Correo">
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
              <Field label="Contraseña">
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
                  <Pressable onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}><Text style={styles.eyeEmoji}>{showPass ? '🙈' : '👁️'}</Text></Pressable>
                </View>
              </Field>

              {/* Confirm */}
              <Field label="Confirmar contraseña">
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
                  <Pressable onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}><Text style={styles.eyeEmoji}>{showConfirm ? '🙈' : '👁️'}</Text></Pressable>
                </View>
              </Field>

              {!!error && <Text style={styles.error}>{error}</Text>}

              {/* Submit */}
              <Pressable onPress={handleRegister} disabled={loading || !formValid} style={[styles.submit, (!formValid||loading)&&{opacity:0.6}]}>
                <LinearGradient colors={[P.blue, P.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.submitBG} />
                {loading ? (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <ActivityIndicator color={P.white} />
                    <Text style={styles.submitText}>CREAR CUENTA</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>CREAR CUENTA</Text>
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

const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.dark },
  split: { flex: 1, flexDirection: 'row' },

  // wrapper animado para el panel izquierdo (flotación)
  leftFloat: { flex: 1.2 },
  left: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  welcomeBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  welcomeTitle: { ...F, color: '#fff', fontSize: 28 },
  welcomeSub: { ...F, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  site: { ...F, color: 'rgba(255,255,255,0.9)', position: 'absolute', bottom: 18 },

  right: { flex: 1, backgroundColor: P.white },
  formWrap: { padding: 24, alignItems: 'center', minHeight: '100%', justifyContent: 'center' },
  formCard: { width: '100%', maxWidth: 520, padding: 22 },

  hello: { ...F, color: P.dark, opacity: 0.7 },
  morning: { ...F, color: P.violet, marginBottom: 4 },
  lead: { ...F, color: P.sub, marginBottom: 16 },

  label: { ...F, color: P.sub, marginBottom: 6 },
  input: { ...F, backgroundColor: 'transparent', paddingVertical: 10, paddingRight: 42, fontSize: 16, color: P.text },
  inputErr: { backgroundColor: 'rgba(254, 242, 242, 0.6)' },
  underline: { height: 3, borderRadius: 2 },

  eyeBtn: { position: 'absolute', right: 0, top: 2, height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  eyeEmoji: { ...F },

  error: { ...F, color: P.danger, marginTop: 10 },

  submit: { marginTop: 18, borderRadius: 10, overflow: 'hidden', alignItems: 'center', paddingVertical: 14 },
  submitBG: { ...StyleSheet.absoluteFillObject },
  submitText: { ...F, color: P.white, letterSpacing: 1 },

  apiBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: P.border, paddingTop: 12 },
  apiTitle: { ...F, color: P.text },
  apiInput: { ...F, borderWidth: 1, borderColor: P.border, borderRadius: 10, padding: 10, marginTop: 6 },

  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: P.border, backgroundColor: '#fff' },
  smallBtnText: { ...F, color: P.text },
});
