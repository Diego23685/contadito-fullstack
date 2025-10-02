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
// Por solicitud: dejar 127.0.0.1 por defecto (sin UI para editar)
const DEFAULT_BASE = LOOPBACK;
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

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { login } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isWide = width >= 980; // dos columnas en tarjeta

  // Fuente Apoka
  useFonts({ Apoka: require('../../assets/fonts/apokaregular.ttf') });

  // Form state (valores demo para probar)
  const [tenantName, setTenantName] = useState('DemoPyme');
  const [ownerName, setOwnerName] = useState('Owner Demo');
  const [ownerEmail, setOwnerEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('Passw0rd!');
  const [confirm, setConfirm] = useState('Passw0rd!');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Touched flags para mostrar errores cuando el usuario interactúa
  const [tenantTouched, setTenantTouched] = useState(false);
  const [ownerTouched, setOwnerTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Animaciones (rotación mensajes + flotación)
  const [welcomeIdx, setWelcomeIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

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

  // --------- Validaciones ----------
  const emailError = useMemo(() => {
    const v = ownerEmail.trim();
    if (!v) return 'Ingresa tu correo.';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(v)) return 'Ingresa un correo válido.';
    return null;
  }, [ownerEmail]);

  const passwordError = useMemo(() => {
    const v = password;
    if (!v.trim()) return 'Ingresa una contraseña.';
    if (v.length < 8) return 'Debe tener al menos 8 caracteres.';
    if (!/[A-Za-z]/.test(v)) return 'Debe incluir al menos una letra.';
    if (!/[0-9]/.test(v)) return 'Debe incluir al menos un número.';
    return null;
  }, [password]);

  const confirmError = useMemo(() => {
    if (!confirm.trim()) return 'Confirma tu contraseña.';
    if (confirm !== password) return 'Las contraseñas no coinciden.';
    return null;
  }, [confirm, password]);

  const tenantError = useMemo(() => {
    const v = tenantName.trim();
    if (!v) return 'Ingresa el nombre del negocio.';
    if (v.length < 3) return 'Debe tener al menos 3 caracteres.';
    return null;
  }, [tenantName]);

  const ownerError = useMemo(() => {
    const v = ownerName.trim();
    if (!v) return 'Ingresa tu nombre.';
    if (v.length < 3) return 'Debe tener al menos 3 caracteres.';
    return null;
  }, [ownerName]);

  const formValid = !tenantError && !ownerError && !emailError && !passwordError && !confirmError;

  // --------- Registro ----------
  const handleRegister = async () => {
    setTenantTouched(true);
    setOwnerTouched(true);
    setEmailTouched(true);
    setPassTouched(true);
    setConfirmTouched(true);

    if (!formValid) { setError('Revisa los campos resaltados.'); return; }

    try {
      setLoading(true); setError(null); Keyboard.dismiss();
      const payload = {
        tenantName: tenantName.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        password,
      };

      const res = await api.post('/auth/register-tenant', payload);

      // 💡 El backend ahora devuelve 202 Accepted y NO token aún.
      // Si llega 202 → navegar a VerifyEmailScreen con el email.
      if (res.status === 202) {
        // Opcional: mostrar aviso
        Alert.alert('Verificación', 'Te enviamos un código a tu correo. Revísalo e ingrésalo en la siguiente pantalla.');
        navigation.navigate('VerifyEmail', { email: ownerEmail.trim() });
        return;
      }

      // Si por algún motivo el backend devolviera token (flujo legacy), se mantiene:
      const token = res.data?.token as string | undefined;
      if (token) {
        await login(token);
        return;
      }

      // Si no hubo token y tampoco 202, informar:
      Alert.alert('Registro', 'Registro realizado. Continúa con la verificación de correo.');
      navigation.navigate('VerifyEmail', { email: ownerEmail.trim() });

    } catch (e: any) {
      const status = e?.response?.status;
      const raw = e?.response?.data || e?.message || 'No se pudo registrar';
      if (status === 409) {
        setError('Ese correo o tenant ya está registrado.');
        Alert.alert('Registro', 'Ese correo o tenant ya está registrado.');
      } else if (status === 400) {
        setError('Datos inválidos. Verifica la información ingresada.');
        Alert.alert('Registro', 'Datos inválidos. Verifica la información ingresada.');
      } else {
        const msg = String(raw);
        setError('No se pudo registrar. Intenta de nuevo.');
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

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
                    style={[
                      styles.inputField,
                      tenantTouched && tenantError ? styles.inputErr : null,
                    ]}
                    value={tenantName}
                    onChangeText={setTenantName}
                    onBlur={() => setTenantTouched(true)}
                    placeholder="Mi Empresa S.A."
                    returnKeyType="next"
                    placeholderTextColor="#9aa7c2"
                  />
                  {tenantTouched && !!tenantError && <Text style={styles.fieldError}>{tenantError}</Text>}
                </View>

                {/* Owner name */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Tu nombre</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      ownerTouched && ownerError ? styles.inputErr : null,
                    ]}
                    value={ownerName}
                    onChangeText={setOwnerName}
                    onBlur={() => setOwnerTouched(true)}
                    placeholder="Juan Pérez"
                    returnKeyType="next"
                    placeholderTextColor="#9aa7c2"
                  />
                  {ownerTouched && !!ownerError && <Text style={styles.fieldError}>{ownerError}</Text>}
                </View>

                {/* Email */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Correo</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      emailTouched && emailError ? styles.inputErr : null,
                    ]}
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    onBlur={() => setEmailTouched(true)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="tucorreo@dominio.com"
                    returnKeyType="next"
                    placeholderTextColor="#9aa7c2"
                  />
                  {emailTouched && !!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
                </View>

                {/* Password */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={[
                        styles.inputField,
                        passTouched && passwordError ? styles.inputErr : null,
                      ]}
                      value={password}
                      onChangeText={setPassword}
                      onBlur={() => setPassTouched(true)}
                      secureTextEntry={!showPass}
                      placeholder="••••••••"
                      returnKeyType="next"
                      placeholderTextColor="#9aa7c2"
                    />
                    <Pressable onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                      <Text style={styles.eyeEmoji}>{showPass ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  </View>
                  {passTouched && !!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
                </View>

                {/* Confirm */}
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Confirmar contraseña</Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={[
                        styles.inputField,
                        confirmTouched && confirmError ? styles.inputErr : null,
                      ]}
                      value={confirm}
                      onChangeText={setConfirm}
                      onBlur={() => setConfirmTouched(true)}
                      secureTextEntry={!showConfirm}
                      placeholder="••••••••"
                      returnKeyType="go"
                      onSubmitEditing={handleRegister}
                      placeholderTextColor="#9aa7c2"
                    />
                    <Pressable onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}>
                      <Text style={styles.eyeEmoji}>{showConfirm ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  </View>
                  {confirmTouched && !!confirmError && <Text style={styles.fieldError}>{confirmError}</Text>}
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
  inputErr: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  fieldError: { ...F, color: P.danger, marginTop: 6, fontSize: 12 },

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

  // Sign up / links
  signupText: { ...F, color: '#475569' },
  signupLink: { ...F, color: '#2563EB' },
});
