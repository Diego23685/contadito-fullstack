// src/screens/RegisterScreen.tsx
// Estilo a juego con Login (tarjeta blanca + panel azul con burbujas)
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
import { useNavigation } from '@react-navigation/native';

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
  text: '#0F172A',
  sub: '#64748B',
  border: '#E6EBFF',
  danger: '#EF4444',
  white: '#FFFFFF',
  pageTop: '#0B1020',
  pageBottom: '#101733',
};

// Mensajes que rotan en el panel izquierdo
const WELCOMES: Array<[string, string]> = [
  ['Crea tu cuenta en minutos', 'Empieza gratis y configura tu negocio.'],
  ['Crecemos contigo', 'Planes flexibles y paneles que se adaptan a tu pyme.'],
  ['Hecho para Nicaragua y C.A.', 'Pagos locales e integraciones regionales.'],
  ['Tu equipo, un mismo lugar', 'Ventas, inventario y finanzas conectadas.'],
  ['Decide con confianza', 'Alertas inteligentes y métricas claras.'],
];

const SmallBtn: React.FC<{ title: string; onPress: () => void }> = ({ title, onPress }) => (
  <Pressable onPress={onPress} style={styles.smallBtn}>
    <Text style={styles.smallBtnText}>{title}</Text>
  </Pressable>
);

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { login } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isWide = width >= 980; // dos columnas en tarjeta

  // Fuente Apoka
  useFonts({ Apoka: require('../../assets/fonts/apokaregular.ttf') });

  // Form state
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

  // Animaciones (rotación mensajes + flotación)
  const [welcomeIdx, setWelcomeIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => { setBaseUrl(base); }, [base]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true })
        .start(() => {
          setWelcomeIdx(i => (i + 1) % WELCOMES.length);
          Animated.timing(fade, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
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

      {/* Fondo de página (distinto al contenedor) */}
      <LinearGradient colors={[P.pageTop, P.pageBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pageBg} />

      {/* ===== Tarjeta contenedora (panel izq + form) ===== */}
      <View style={styles.center}>
        <View style={[styles.card, { flexDirection: isWide ? 'row' : 'column' }]}>
          {/* Panel izquierdo (Welcome) */}
          <Animated.View
            style={[
              styles.leftWrap,
              {
                borderTopLeftRadius: 20,
                borderBottomLeftRadius: isWide ? 20 : 0,
                borderTopRightRadius: isWide ? 0 : 20,
                transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
              },
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
                <Circle cx="18%" cy="20%" r="64" fill="url(#bubble)" />
                <Circle cx="72%" cy="28%" r="88" fill="url(#bubble)" />
                <Circle cx="32%" cy="70%" r="72" fill="url(#bubble)" />
              </Svg>

              <Animated.View style={[styles.welcomeBox, { opacity: fade }]}>
                <Text style={styles.welcomeTitle}>{WELCOMES[welcomeIdx][0]}</Text>
                <Text style={styles.welcomeSub}>{WELCOMES[welcomeIdx][1]}</Text>
              </Animated.View>
              <Text style={styles.site}>PapuThink · Contadito</Text>
            </LinearGradient>
          </Animated.View>

          {/* Panel derecho (Formulario) */}
          <KeyboardAvoidingView
            style={[
              styles.right,
              {
                borderTopRightRadius: 20,
                borderBottomRightRadius: isWide ? 20 : 0,
                borderBottomLeftRadius: isWide ? 0 : 20,
              },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={styles.formCard}>
                {/* Encabezado */}
                <Text style={styles.signInOverline}>Create account</Text>
                <Text style={styles.signInTitle}>Welcome!</Text>
                <Text style={styles.signInSub}>Tenant + Owner</Text>

                {/* Tenant */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Nombre del negocio (Tenant)</Text>
                  <TextInput
                    style={[styles.inputField, !tenantName.trim() && styles.inputErr]}
                    value={tenantName}
                    onChangeText={setTenantName}
                    placeholder="Mi Empresa S.A."
                    returnKeyType="next"
                    placeholderTextColor="#9aa7c2"
                  />
                </View>

                {/* Owner name */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Tu nombre</Text>
                  <TextInput
                    style={[styles.inputField, !ownerName.trim() && styles.inputErr]}
                    value={ownerName}
                    onChangeText={setOwnerName}
                    placeholder="Juan Pérez"
                    returnKeyType="next"
                    placeholderTextColor="#9aa7c2"
                  />
                </View>

                {/* Email */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Correo</Text>
                  <TextInput
                    style={[styles.inputField, !emailOk && styles.inputErr]}
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="tucorreo@dominio.com"
                    returnKeyType="next"
                    placeholderTextColor="#9aa7c2"
                  />
                </View>

                {/* Password */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={[styles.inputField, !passOk && styles.inputErr]}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                      placeholder="••••••••"
                      returnKeyType="next"
                      placeholderTextColor="#9aa7c2"
                    />
                    <Pressable onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}><Text style={styles.eyeEmoji}>{showPass ? '🙈' : '👁️'}</Text></Pressable>
                  </View>
                </View>

                {/* Confirm */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Confirmar contraseña</Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={[styles.inputField, !confirmOk && styles.inputErr]}
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showConfirm}
                      placeholder="••••••••"
                      returnKeyType="go"
                      onSubmitEditing={handleRegister}
                      placeholderTextColor="#9aa7c2"
                    />
                    <Pressable onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}><Text style={styles.eyeEmoji}>{showConfirm ? '🙈' : '👁️'}</Text></Pressable>
                  </View>
                </View>

                {!!error && <Text style={styles.error}>{error}</Text>}

                {/* Submit */}
                <Pressable onPress={handleRegister} disabled={loading || !formValid} style={[styles.primaryBtn, (!formValid || loading) && { opacity: 0.6 }]}>
                  {loading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color={P.white} />
                      <Text style={styles.primaryBtnText}>Creando cuenta…</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>Crear cuenta</Text>
                  )}
                </Pressable>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>o</Text>
                  <View style={styles.divider} />
                </View>

                {/* Link a Login */}
                <View style={{ marginTop: 8, alignItems: 'center' }}>
                  <Text style={styles.signupText}>
                    ¿Ya tienes una cuenta?{' '}
                    <Text style={styles.signupLink} onPress={() => navigation.navigate('Login')}>Inicia sesión</Text>
                  </Text>
                </View>

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
                    placeholderTextColor="#94A3B8"
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <SmallBtn title="10.0.2.2" onPress={useAndroidLocalhost} />
                    <SmallBtn title="127.0.0.1" onPress={useLoopback} />
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageBg: { ...StyleSheet.absoluteFillObject },

  // Centrado de la tarjeta
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },

  // Tarjeta contenedora
  card: {
    width: '100%',
    maxWidth: 1080,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(14,30,80,0.06)',
    shadowColor: '#0b1020',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: Platform.select({ android: 8, default: 0 }),
  },

  // Panel izquierdo
  leftWrap: { flex: 1.2, minHeight: 320 },
  left: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  welcomeBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 16,
    maxWidth: 380,
  },
  welcomeTitle: { ...F, color: '#fff', fontSize: 26 },
  welcomeSub: { ...F, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  site: { ...F, color: 'rgba(255,255,255,0.9)', position: 'absolute', bottom: 18 },

  // Panel derecho (form)
  right: { flex: 1, backgroundColor: P.white },
  formWrap: { padding: 28, alignItems: 'center', minHeight: '100%', justifyContent: 'center' },
  formCard: { width: '100%', maxWidth: 460, padding: 6 },

  // Encabezado
  signInOverline: { ...F, color: '#1e293b', opacity: 0.7, marginBottom: 4 },
  signInTitle:    { ...F, color: '#0f172a', fontSize: 22, marginBottom: 4 },
  signInSub:      { ...F, color: '#64748b', marginBottom: 16 },

  // Inputs estilo tarjeta
  inputBox: { marginTop: 10 },
  inputLabel: { ...F, color: '#475569', marginBottom: 6, fontSize: 13 },
  inputField: {
    ...F,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingRight: 44,
    fontSize: 16,
    color: '#0f172a',
  },
  inputErr: { backgroundColor: '#FEF2F2' },

  // Botón primario
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    shadowColor: 'rgba(37,99,235,0.35)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  primaryBtnText: { ...F, color: '#FFFFFF', fontSize: 16 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  divider: { flex: 1, height: 1, backgroundColor: P.border },
  dividerText: { ...F, color: '#64748B' },

  // Eye toggle
  eyeBtn: { position: 'absolute', right: 4, top: 6, padding: 8, borderRadius: 10 },
  eyeEmoji: { ...F },

  // Errores
  error: { ...F, color: P.danger, marginTop: 10 },

  // API box (se conserva)
  apiBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: P.border, paddingTop: 12 },
  apiTitle: { ...F, color: P.text },
  apiInput: { ...F, borderWidth: 1, borderColor: P.border, borderRadius: 12, padding: 10, marginTop: 6, color: P.text },

  // Small buttons
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: P.border, backgroundColor: '#fff' },
  smallBtnText: { ...F, color: P.text },

  // Sign up / links
  signupText: { ...F, color: '#475569' },
  signupLink: { ...F, color: '#2563EB' },
});
