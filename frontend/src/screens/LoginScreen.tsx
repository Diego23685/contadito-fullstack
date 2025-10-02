// src/screens/LoginScreen.tsx
// Caja contenedora (panel welcome + form) con bordes redondeados sobre fondo distinto
// Requiere: expo-linear-gradient, react-native-svg, expo-font

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
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { useFonts } from 'expo-font';

import { api, setBaseUrl } from '../api';
import { AuthContext } from '../providers/AuthContext';
import { useNavigation } from '@react-navigation/native';

// ---------------- Config ----------------
const ANDROID_LOCALHOST = 'http://10.0.2.2:5000';
const LOOPBACK = 'http://127.0.0.1:5000';
const DEFAULT_BASE = Platform.OS === 'android' ? ANDROID_LOCALHOST : LOOPBACK;
setBaseUrl(DEFAULT_BASE); // 👈 por defecto localhost (sin UI)

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
  // fondo de la app (diferente al contenedor)
  pageTop: '#0B1020',
  pageBottom: '#101733',
};

// Mensajes que rotan en el panel izquierdo (título, subtítulo)
const WELCOMES: Array<[string, string]> = [
  ['Tu negocio, claro y al día', 'Paneles y alertas que te ayudan a decidir mejor.'],
  ['Finanzas simples, decisiones grandes', 'Vende, cobra y controla inventario sin dolores de cabeza.'],
  ['Hecho para Nicaragua y C.A.', 'Benchmarking regional y pagos locales integrados.'],
  ['Tu asesor de bolsillo', 'Consejos prácticos y métricas que impulsan tu pyme.'],
  ['Integrado a tu día a día', 'WhatsApp Business, facturación electrónica y más.'],
];

// (Compat mini-componente)
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={{ marginTop: 14 }}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980; // caja en dos columnas; si no, stack vertical
  const { login } = useContext(AuthContext);
  const navigation = useNavigation<any>();

  // Carga de la fuente Apoka (no bloquea el render)
  useFonts({ Apoka: require('../../assets/fonts/apokaregular.ttf') });

  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('pass123');
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validación: toques de campos
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);

  // Rotación de mensajes del panel izquierdo
  const [welcomeIdx, setWelcomeIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

  // === Easter egg (5 taps en "PapuThink · Contadito") ===
  const [secretTaps, setSecretTaps] = useState(0);
  const lastTapRef = useRef<number>(0);
  const onSecretPress = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 3000) setSecretTaps(0); // resetea si tardas >3s
    lastTapRef.current = now;

    setSecretTaps((n) => {
      const next = n + 1;
      if (next >= 5) {
        setTimeout(() => setSecretTaps(0), 0);
        // 🚀 navega a la pantalla secreta (asegúrate de registrar 'EasterEgg' en tu navigator)
        navigation.navigate('EasterEgg');
      }
      return next;
    });
  };

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
    }, 6000);
    return () => clearInterval(interval);
  }, [fade]);

  useEffect(() => {
    // Micro “flotación” del panel
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [float]);

  // ---- Validaciones ----
  const emailErrorMsg = useMemo(() => {
    const v = email.trim();
    if (!v) return 'Ingresa tu correo.';
    if (!/.+@.+\..+/.test(v)) return 'Formato de correo inválido.';
    return null;
  }, [email]);

  const passErrorMsg = useMemo(() => {
    const v = password.trim();
    if (!v) return 'Ingresa tu contraseña.';
    if (v.length < 3) return 'La contraseña debe tener al menos 3 caracteres.';
    return null;
  }, [password]);

  const formValid = !emailErrorMsg && !passErrorMsg;

  // ---- Login ----
  const handleLogin = async () => {
    // marca campos como tocados antes de validar
    setEmailTouched(true);
    setPassTouched(true);

    if (!formValid) {
      setError('Revisa los campos resaltados.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      Keyboard.dismiss();

      const res = await api.post('/auth/login', { email: email.trim(), password });
      const token = res.data?.token as string | undefined;
      if (!token) throw new Error('Respuesta sin token');
      await login(token);
      // (opcional) persistir "remember" en almacenamiento seguro
    } catch (e: any) {
      const rawMsg = e?.response?.data || e?.message || '';
      const status = e?.response?.status;

      if (status === 401) {
        setError('El correo o la contraseña es incorrecta.');
        Alert.alert('No autorizado', 'El correo o la contraseña es incorrecta.');
      } else if (status === 404) {
        setError('No encontramos una cuenta con ese correo.');
        Alert.alert('Cuenta no encontrada', 'No encontramos una cuenta con ese correo.');
      } else if (status === 400) {
        setError('Solicitud inválida. Verifica los datos ingresados.');
        Alert.alert('Datos inválidos', 'Verifica los datos ingresados.');
      } else {
        const normalized = String(rawMsg).toLowerCase();
        if (
          normalized.includes('invalid credentials') ||
          normalized.includes('credenciales inválidas') ||
          normalized.includes('incorrect password') ||
          normalized.includes('usuario o contraseña') ||
          normalized.includes('correo o contraseña')
        ) {
          setError('El correo o la contraseña es incorrecta.');
          Alert.alert('Inicio de sesión', 'El correo o la contraseña es incorrecta.');
        } else {
          setError('No se pudo iniciar sesión. Intenta de nuevo.');
          Alert.alert('Error', String(rawMsg || 'No se pudo iniciar sesión. Intenta de nuevo.'));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Fondo de página distinto al contenedor */}
      <LinearGradient
        colors={[P.pageTop, P.pageBottom]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.pageBg}
      />

      {/* ===== Caja contenedora (panel izq + form) ===== */}
      <View style={styles.center}>
        <View style={[styles.card, { flexDirection: isWide ? 'row' : 'column' }]}>
          {/* Left panel (Welcome) */}
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
                <Circle cx="18%" cy="20%" r="64" fill="url(#bubble)" />
                <Circle cx="72%" cy="28%" r="88" fill="url(#bubble)" />
                <Circle cx="32%" cy="70%" r="72" fill="url(#bubble)" />
              </Svg>

              <Animated.View style={[styles.welcomeBox, { opacity: fade }]}>
                <Text style={styles.welcomeTitle}>{WELCOMES[welcomeIdx][0]}</Text>
                <Text style={styles.welcomeSub}>{WELCOMES[welcomeIdx][1]}</Text>
              </Animated.View>

              {/* Easter egg: 5 taps abre la screen secreta */}
              <Pressable
                onPress={onSecretPress}
                hitSlop={10}
                style={{ position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center' }}
              >
                <Text style={styles.site}>
                  PapuThink · Contadito{secretTaps > 0 ? ` · ${secretTaps}/5` : ''}
                </Text>
              </Pressable>

            </LinearGradient>
          </Animated.View>

          {/* Right panel (Form) */}
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
            <ScrollView contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled">
              <View style={styles.formCard}>
                {/* Header del formulario */}
                <Text style={styles.signInOverline}>Sign in</Text>
                <Text style={styles.signInTitle}>Welcome back</Text>
                <Text style={styles.signInSub}>Enter your email and password to continue</Text>

                {/* Email */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      emailTouched && emailErrorMsg ? { borderColor: P.danger, backgroundColor: '#FEF2F2' } : null,
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => setEmailTouched(true)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@email.com"
                    returnKeyType="next"
                    placeholderTextColor="#9aa7c2"
                  />
                  {emailTouched && !!emailErrorMsg && <Text style={styles.fieldError}>{emailErrorMsg}</Text>}
                </View>

                {/* Password */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={[
                        styles.inputField,
                        passTouched && passErrorMsg ? { borderColor: P.danger, backgroundColor: '#FEF2F2' } : null,
                      ]}
                      value={password}
                      onChangeText={setPassword}
                      onBlur={() => setPassTouched(true)}
                      secureTextEntry={!showPass}
                      placeholder="••••••••"
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                      placeholderTextColor="#9aa7c2"
                    />
                    <Pressable
                      onPress={() => setShowPass(s => !s)}
                      style={styles.eyeBtn}
                      accessibilityLabel={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <Text style={styles.eyeEmoji}>{showPass ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  </View>
                  {passTouched && !!passErrorMsg && <Text style={styles.fieldError}>{passErrorMsg}</Text>}
                </View>

                {/* Remember + Forgot */}
                <View style={styles.rowBetween}>
                  <Pressable onPress={() => setRemember(r => !r)} style={styles.rememberRow}>
                    <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                      {remember && <Text style={styles.tick}>✓</Text>}
                    </View>
                    <Text style={styles.rememberText}>Remember me</Text>
                  </Pressable>
                  <Pressable onPress={() => Alert.alert('Forgot password', 'Implementa navegación a ForgotPassword')}>
                    <Text style={styles.forgot}>Forgot Password?</Text>
                  </Pressable>
                </View>

                {!!error && <Text style={styles.error}>{error}</Text>}

                {/* Botón principal */}
                <Pressable
                  onPress={handleLogin}
                  disabled={loading || !formValid}
                  style={[styles.primaryBtn, (loading || !formValid) && { opacity: 0.6 }]}
                >
                  {loading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color={P.white} />
                      <Text style={styles.primaryBtnText}>Signing in…</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign in</Text>
                  )}
                </Pressable>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.divider} />
                </View>

                {/* Botón secundario */}
                <Pressable style={styles.secondaryBtn} onPress={() => Alert.alert('Other Sign in', 'Social / SSO')}>
                  <Text style={styles.secondaryBtnText}>Sign in with other</Text>
                </Pressable>

                {/* Sign up */}
                <View style={{ marginTop: 14, alignItems: 'center' }}>
                  <Text style={styles.signupText}>
                    Don’t have an account?{' '}
                    <Text style={styles.signupLink} onPress={() => navigation.navigate('Register')}>
                      Sign up
                    </Text>
                  </Text>
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

  // Centrado de la caja
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  // Caja contenedora con bordes redondeados y sombra
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

  site: {
    ...F,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },


  // Panel derecho (form)
  right: { flex: 1, backgroundColor: P.white },
  formWrap: { padding: 28, alignItems: 'center', minHeight: '100%', justifyContent: 'center' },
  formCard: { width: '100%', maxWidth: 460, padding: 6 },

  // Encabezado Sign in
  signInOverline: { ...F, color: '#1e293b', opacity: 0.7, marginBottom: 4 },
  signInTitle:    { ...F, color: '#0f172a', fontSize: 22, marginBottom: 4 },
  signInSub:      { ...F, color: '#64748b', marginBottom: 16 },

  // Inputs “card-like”
  inputBox: { marginTop: 10 },
  inputLabel: { ...F, color: '#475569', marginBottom: 6, fontSize: 13 },
  inputField: {
    ...F,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E6EBFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingRight: 44,
    fontSize: 16,
    color: '#0f172a',
  },
  fieldError: { ...F, color: '#EF4444', marginTop: 6, fontSize: 12 },

  // Botones
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

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E6EBFF',
  },
  secondaryBtnText: { ...F, color: '#0f172a', fontSize: 16 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  divider: { flex: 1, height: 1, backgroundColor: '#E6EBFF' },
  dividerText: { ...F, color: '#64748B' },

  // Elementos ya existentes / compat
  label: { ...F, color: P.sub, marginBottom: 6 }, // para Field (no usado en el nuevo layout, pero lo mantenemos)
  eyeBtn: { position: 'absolute', right: 4, top: 6, padding: 8, borderRadius: 10 },
  eyeEmoji: { ...F },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' },
  tick: { ...F, color: P.blue, fontSize: 12 },

  rememberText: { ...F, color: '#0f172a' },
  forgot: { ...F, color: '#2563EB' },

  error: { ...F, color: P.danger, marginTop: 10 },

  // Sign up
  signupText: { ...F, color: '#475569' },
  signupLink: { ...F, color: '#2563EB' },
});
