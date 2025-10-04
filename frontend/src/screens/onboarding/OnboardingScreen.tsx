import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  FlatList,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../api';

/** ====== BRAND ====== */
const BRAND = {
  bgTop: '#0B1020',
  bgBottom: '#101734',
  primary: '#2563EB',
  primarySoft: 'rgba(37,99,235,0.12)',
  ring: 'rgba(255,255,255,0.18)',
  white: '#fff',
  text: '#0f172a',
  sub: '#64748b',
  danger: '#EF4444',
  fieldBg: '#F8FAFF',
  fieldBorder: '#E6EBFF',
  glow: 'rgba(255,255,255,0.35)',
  orbBlue: '#4458C7',
  orbTeal: '#43BFB7',
  orbPurple: '#5A44C7',
};

const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

/** ====== Datos básicos país/moneda ======
 *  (puedes ampliar la lista cuando quieras)
 */
type Country = { code: string; name: string; currency?: string };

const COUNTRIES: Country[] = [
  { code: 'NI', name: 'Nicaragua', currency: 'NIO' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC' },
  { code: 'HN', name: 'Honduras', currency: 'HNL' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ' },
  { code: 'SV', name: 'El Salvador', currency: 'USD' },
  { code: 'PA', name: 'Panamá', currency: 'USD' },
  { code: 'MX', name: 'México', currency: 'MXN' },
  { code: 'US', name: 'Estados Unidos', currency: 'USD' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'PE', name: 'Perú', currency: 'PEN' },
];

const CURRENCIES = [
  'NIO', 'USD', 'CRC', 'HNL', 'GTQ', 'MXN', 'COP', 'PEN', 'EUR'
];

/** ====== Onboarding Screen ====== */
export default function OnboardingScreen() {
  const nav = useNavigation<any>();

  // Campos
  const [tenantName, setTenantName] = useState('Mi Negocio');
  const [countryCode, setCountryCode] = useState('NI');
  const [currency, setCurrency] = useState('NIO');
  const [password, setPassword] = useState(''); // opcional

  // UI state
  const [loading, setLoading] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [currencyQuery, setCurrencyQuery] = useState('');

  // Validaciones
  const tenantErr = useMemo(
    () => (!tenantName.trim() ? 'Ingresa el nombre del negocio.' : null),
    [tenantName]
  );

  // Filtro de listas
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countryQuery]);

  const filteredCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(c => c.toLowerCase().includes(q));
  }, [currencyQuery]);

  // Auto-ajuste de moneda al elegir país (si el país define currency por defecto)
  const onSelectCountry = (c: Country) => {
    setCountryCode(c.code);
    if (c.currency) setCurrency(c.currency);
    setCountryPickerOpen(false);
  };

  const onSelectCurrency = (c: string) => {
    setCurrency(c);
    setCurrencyPickerOpen(false);
  };

  // Submit
  const submit = async () => {
    if (tenantErr) {
      Alert.alert('Datos incompletos', tenantErr);
      return;
    }
    try {
      setLoading(true);
      await authApi.completeOnboarding({
        tenantName: tenantName.trim(),
        countryCode: countryCode.trim() || undefined,
        currency: currency.trim() || undefined,
        password: password.trim() || undefined, // opcional
      });
      await AsyncStorage.removeItem('needs_onboarding');
      Alert.alert('¡Listo!', 'Configuración completada.');
      nav.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo completar el onboarding';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  // “Más tarde”: completa sin password (y con los valores actuales)
  const submitLater = async () => {
    try {
      setLoading(true);
      await authApi.completeOnboarding({
        tenantName: tenantName.trim() || 'Mi Negocio',
        countryCode: countryCode.trim() || undefined,
        currency: currency.trim() || undefined,
        password: undefined,
      });
      await AsyncStorage.removeItem('needs_onboarding');
      nav.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo completar el onboarding';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  /** ====== Animaciones decorativas ====== */
  const fadeIn = useRef(new Animated.Value(0)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatA, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(floatA, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatB, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(floatB, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, floatA, floatB]);

  // 👇 Para evitar el error TS2322 con transform animado, tipeamos como any
  const orbAStyle: any = {
    transform: [
      { translateY: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
      { translateX: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) },
    ],
    opacity: 0.18,
  };
  const orbBStyle: any = {
    transform: [
      { translateY: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) },
      { translateX: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
    ],
    opacity: 0.16,
  };

  const disabled = !!tenantErr || loading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bgTop }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[BRAND.bgTop, BRAND.bgBottom]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.pageBg}
      />
      {/* Orbes de fondo */}
      <Animated.View style={[styles.orb, { backgroundColor: BRAND.orbBlue, top: -60, left: -40 }, orbAStyle]} />
      <Animated.View style={[styles.orb, { backgroundColor: BRAND.orbTeal, bottom: -70, right: -30 }, orbBStyle]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: fadeIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Configura tu negocio</Text>
              <Text style={styles.subtitle}>
                Completa unos datos para empezar. Siempre puedes cambiarlos después.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Nombre del negocio */}
              <Text style={styles.label}>Nombre del negocio</Text>
              <TextInput
                style={[styles.input, tenantErr ? styles.inputError : null]}
                value={tenantName}
                onChangeText={setTenantName}
                placeholder="Mi Empresa S.A."
                placeholderTextColor="#9aa7c2"
              />
              {!!tenantErr && <Text style={styles.errorText}>{tenantErr}</Text>}

              {/* País */}
              <Text style={styles.label}>País</Text>
              <Pressable style={styles.select} onPress={() => { setCountryQuery(''); setCountryPickerOpen(true); }}>
                <Text style={styles.selectText}>
                  {COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode}
                </Text>
                <Text style={styles.selectHint}>{countryCode}</Text>
              </Pressable>

              {/* Moneda */}
              <Text style={styles.label}>Moneda</Text>
              <Pressable style={styles.select} onPress={() => { setCurrencyQuery(''); setCurrencyPickerOpen(true); }}>
                <Text style={styles.selectText}>{currency}</Text>
                <Text style={styles.selectHint}>ISO 4217</Text>
              </Pressable>

              {/* Password (opcional) */}
              <Text style={styles.label}>Crear contraseña (opcional)</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9aa7c2"
              />

              {/* Botones */}
              <View style={styles.actions}>
                <Pressable
                  onPress={submit}
                  disabled={disabled}
                  style={[styles.primaryBtn, disabled && { opacity: 0.6 }]}
                >
                  {loading
                    ? <ActivityIndicator color={BRAND.white} />
                    : <Text style={styles.primaryBtnText}>Finalizar</Text>}
                </Pressable>

                <Pressable
                  onPress={submitLater}
                  disabled={loading}
                  style={[styles.secondaryBtn, loading && { opacity: 0.6 }]}
                >
                  <Text style={styles.secondaryBtnText}>Más tarde</Text>
                </Pressable>
              </View>
            </View>

            {/* Footer tips */}
            <View style={styles.helperBox}>
              <Text style={styles.helper}>
                Tip: Al elegir el país, sugerimos automáticamente la moneda local (puedes cambiarla).
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ====== Country Picker ====== */}
      <Modal
        visible={countryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona tu país</Text>
            <TextInput
              style={styles.modalSearch}
              value={countryQuery}
              onChangeText={setCountryQuery}
              placeholder="Buscar país o código (NI, CR, MX...)"
              placeholderTextColor="#9aa7c2"
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(it) => it.code}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelectCountry(item)}
                  style={styles.modalItem}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  <Text style={styles.modalItemHint}>{item.code}{item.currency ? ` · ${item.currency}` : ''}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Sin resultados</Text>}
            />
            <View style={{ height: 8 }} />
            <Pressable onPress={() => setCountryPickerOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ====== Currency Picker ====== */}
      <Modal
        visible={currencyPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona tu moneda</Text>
            <TextInput
              style={styles.modalSearch}
              value={currencyQuery}
              onChangeText={setCurrencyQuery}
              placeholder="Buscar moneda (USD, NIO, MXN...)"
              placeholderTextColor="#9aa7c2"
              autoCapitalize="characters"
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(it) => it}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelectCurrency(item)}
                  style={styles.modalItem}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Sin resultados</Text>}
              ListFooterComponent={
                <Pressable
                  onPress={() => {
                    setCurrencyPickerOpen(false);
                    // Permite escribir una moneda custom
                    setTimeout(() => {
                      Alert.alert('Moneda personalizada',
                        'Escribe el código ISO-4217 manualmente en el campo de moneda.');
                    }, 100);
                  }}
                  style={[styles.modalItem, { justifyContent: 'center' }]}
                >
                  <Text style={styles.modalItemText}>Otro (escribir manualmente)</Text>
                </Pressable>
              }
            />
            <View style={{ height: 8 }} />
            <Pressable onPress={() => setCurrencyPickerOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** ====== Styles ====== */
const styles = StyleSheet.create({
  pageBg: { ...StyleSheet.absoluteFillObject },

  orb: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },

  center: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,30,80,0.06)',
    shadowColor: '#0b1020',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    padding: 18,
  },

  header: { padding: 6, paddingBottom: 10 },
  title: { ...F, color: '#0f172a', fontSize: 24 },
  subtitle: { ...F, color: '#64748b', marginTop: 4 },

  form: { marginTop: 6 },

  label: { ...F, color: '#475569', marginTop: 12, marginBottom: 6, fontSize: 13 },
  input: {
    ...F,
    backgroundColor: BRAND.fieldBg,
    borderWidth: 1,
    borderColor: BRAND.fieldBorder,
    borderRadius: 12,
    padding: 12,
    color: BRAND.text,
  },
  inputError: { borderColor: '#FCA5A5' },

  select: {
    backgroundColor: BRAND.fieldBg,
    borderWidth: 1,
    borderColor: BRAND.fieldBorder,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { ...F, color: BRAND.text },
  selectHint: { ...F, color: '#9aa7c2', marginLeft: 8 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryBtn: {
    flex: 1,
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    shadowColor: 'rgba(37,99,235,0.35)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  primaryBtnText: { ...F, color: BRAND.white, fontSize: 16 },

  secondaryBtn: {
    flex: 1,
    backgroundColor: BRAND.white,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BRAND.fieldBorder,
  },
  secondaryBtnText: { ...F, color: BRAND.text, fontSize: 16 },

  helperBox: {
    backgroundColor: BRAND.primarySoft,
    borderColor: 'rgba(37,99,235,0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  helper: { ...F, color: '#1e3a8a' },

  errorText: { ...F, color: BRAND.danger, marginTop: 6, fontSize: 12 },

  // Modal base
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,15,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { ...F, fontSize: 18, color: '#0f172a' },
  modalSearch: {
    ...F,
    backgroundColor: BRAND.fieldBg,
    borderWidth: 1,
    borderColor: BRAND.fieldBorder,
    borderRadius: 10,
    padding: 10,
    color: BRAND.text,
    marginTop: 10,
    marginBottom: 8,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(14,30,80,0.06)',
  },
  modalItemText: { ...F, color: BRAND.text, fontSize: 16 },
  modalItemHint: { ...F, color: BRAND.sub, marginTop: 2, fontSize: 12 },
  modalEmpty: { ...F, color: BRAND.sub, paddingVertical: 16, textAlign: 'center' },
  modalClose: {
    backgroundColor: '#fff',
    borderColor: BRAND.fieldBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: { ...F, color: BRAND.text },
});
