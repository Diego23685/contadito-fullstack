// src/screens/customers/CustomerForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../../api';

type Customer = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  address?: string | null;
};

const isEmail = (v: string) =>
  !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const onlyDigits = (v: string) => v.replace(/[^\d+]/g, '');

const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

// ===== Paleta de marca (alineada con Home) =====
const BRAND = {
  primary: '#2563EB',
  primary600: '#2563EB',
  primary700: '#1D4ED8',
  purple600: '#6D28D9',
  green: '#10B981',

  hanBlue: '#4458C7',
  verdigris: '#43BFB7',

  surfaceTint: '#EEF2FF',
  surfaceSubtle: '#F7F9FF',
  surfacePanel: '#FFFFFF',

  borderSoft: '#E6EBFF',
  borderSofter: '#EDF1FF',
  cardShadow: 'rgba(37, 99, 235, 0.16)',
} as const;

const Helper = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.helper}>{children}</Text>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

const Card: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Divider = () => <View style={styles.divider} />;

/** Botón pequeño reutilizable (mismo patrón que en Home) */
const SmallBtn: React.FC<{
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'purple' | 'gray' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ title, onPress, variant = 'gray', disabled, loading, style }) => {
  const isColor = variant === 'primary' || variant === 'purple' || variant === 'gray';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: '#e5e7eb' }}
      style={[
        styles.smallBtn,
        variant === 'primary' && styles.btnBlue,
        variant === 'purple' && styles.btnPurple,
        variant === 'gray' && styles.btnGray,
        variant === 'danger' && styles.smallBtnDanger,
        (disabled || loading) && ({ opacity: 0.7 } as ViewStyle),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={isColor ? styles.smallBtnTextAlt : styles.smallBtnText}>{title}</Text>
      )}
    </Pressable>
  );
};

const CustomerForm: React.FC<any> = ({ route, navigation }) => {
  const id: number | undefined = route?.params?.id;
  const isEdit = !!id;
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [address, setAddress] = useState('');

  const [errors, setErrors] = useState<{ [k: string]: string | null }>({});

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<Customer>(`/customers/${id}`);
        const c = res.data;
        setName(c.name || '');
        setEmail(c.email || '');
        setPhone(c.phone || '');
        setDocumentId(c.documentId || '');
        setAddress(c.address || '');
      } catch (e: any) {
        Alert.alert('Error', String(e?.response?.data || e?.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'El nombre es requerido';
    if (email && !isEmail(email)) next.email = 'Email no válido';
    if (phone && !/^\+?\d{7,15}$/.test(onlyDigits(phone))) next.phone = 'Teléfono inválido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        documentId: documentId.trim() || null,
        address: address.trim() || null,
      };
      if (isEdit) await api.put(`/customers/${id}`, payload);
      else await api.post('/customers', payload);
      Alert.alert('Listo', 'Cliente guardado');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar'));
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => navigation.goBack();

  const prettyPhone = useMemo(() => {
    const d = onlyDigits(phone);
    if (!d) return '';
    if (d.startsWith('+')) return d.replace(/(\+\d{1,3})(\d{4})(\d{0,4})/, '$1 $2 $3').trim();
    return d.replace(/(\d{4})(\d{0,4})(\d{0,4})/, '$1 $2 $3').trim();
  }, [phone]);

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.title}>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SmallBtn title="Cancelar" onPress={cancel} variant="gray" />
          <SmallBtn
            title="Guardar"
            onPress={save}
            variant="primary"
            disabled={loading || !name.trim()}
            loading={loading}
          />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.container, isWide && styles.containerWide]}>
          {/* Col izquierda */}
          <View style={[styles.col, isWide && styles.colLeft]}>
            <Card>
              <SectionTitle>Datos del cliente</SectionTitle>

              <View style={styles.field}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. María Pérez"
                  placeholderTextColor="#9aa7c2"
                />
                {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}
              </View>

              <View style={styles.row2}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="persona@correo.com"
                    placeholderTextColor="#9aa7c2"
                  />
                  {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}
                  <Helper>Usa un correo válido para enviar facturas o recibos.</Helper>
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Teléfono</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="+505 8888 8888"
                    placeholderTextColor="#9aa7c2"
                  />
                  {!!errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
                  <Helper>Formato recomendado: +código país + número.</Helper>
                </View>
              </View>

              <View style={styles.row2}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Documento</Text>
                  <TextInput
                    style={styles.input}
                    value={documentId}
                    onChangeText={setDocumentId}
                    placeholder="Cédula / RUC / NIT"
                    placeholderTextColor="#9aa7c2"
                  />
                  <Helper>Identificación fiscal o personal.</Helper>
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Dirección</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    multiline
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Barrio, calle, referencia"
                    placeholderTextColor="#9aa7c2"
                  />
                </View>
              </View>
            </Card>

            <Card>
              <SectionTitle>Notas y preferencias</SectionTitle>
              <Helper>Agrega información útil para el servicio: horarios, condiciones de crédito, etc.</Helper>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top', marginTop: 8 }]}
                multiline
                placeholder="Opcional"
                placeholderTextColor="#9aa7c2"
                onChangeText={() => {}}
                editable
              />
            </Card>
          </View>

          {/* Col derecha */}
          <View style={[styles.col, isWide && styles.colRight]}>
            <Card>
              <SectionTitle>Resumen</SectionTitle>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Nombre</Text>
                <Text style={styles.summaryValue}>{name || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Email</Text>
                <Text style={styles.summaryValue}>{email || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Teléfono</Text>
                <Text style={styles.summaryValue}>{prettyPhone || phone || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Documento</Text>
                <Text style={styles.summaryValue}>{documentId || '—'}</Text>
              </View>
              <Divider />
              <Helper>Revisa que los datos estén correctos antes de guardar. Puedes editar luego.</Helper>
            </Card>

            <Card>
              <SectionTitle>Buenas prácticas</SectionTitle>
              <Text style={styles.tip}>• Usa emails reales para envío de comprobantes.</Text>
              <Text style={styles.tip}>• Estandariza el formato del teléfono (+505 #### ####).</Text>
              <Text style={styles.tip}>• Guarda el documento fiscal para facturación.</Text>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer fijo */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <Text style={styles.footerText}>{isEdit ? 'Editando cliente' : 'Creando nuevo cliente'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SmallBtn title="Cancelar" onPress={cancel} variant="gray" />
            <SmallBtn
              title="Guardar"
              onPress={save}
              variant="primary"
              disabled={loading || !name.trim()}
              loading={loading}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default CustomerForm;

// ===== Estilos =====
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND.surfaceTint },

  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.surfacePanel,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...F, fontSize: 20, color: BRAND.hanBlue },

  container: { padding: 16, gap: 16 },
  containerWide: { maxWidth: 1200, alignSelf: 'center', width: '100%', flexDirection: 'row' },
  col: { flex: 1, gap: 16 },
  colLeft: { flex: 2 },
  colRight: { flex: 1, minWidth: 320 },

  // Tarjeta con estética Home
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0,
    shadowColor: BRAND.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  sectionTitle: { ...F, fontSize: 16, marginBottom: 8, color: '#334155' },

  field: { marginBottom: 12 },
  label: { ...F, marginBottom: 6, color: '#111827' },

  input: {
    ...F,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    backgroundColor: BRAND.surfaceSubtle,
    fontSize: 16,
  },

  row2: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  flex1: { flex: 1, minWidth: 160 },

  helper: { ...F, marginTop: 6, color: '#6b7280', fontSize: 12 },
  error: { ...F, marginTop: 6, color: '#B91C1C', fontSize: 12 },

  divider: { height: 1, backgroundColor: BRAND.borderSofter, marginVertical: 12 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { ...F, color: '#6B7280' },
  summaryValue: { ...F, color: '#0f172a' },

  tip: { ...F, color: '#374151', marginBottom: 6 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BRAND.surfacePanel,
    borderTopWidth: 1,
    borderTopColor: BRAND.borderSoft,
    shadowColor: BRAND.hanBlue,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 6,
  },
  footerInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: { ...F, color: '#6B7280' },

  // Botón pequeño (chips) + variantes (como en Home)
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BRAND.surfacePanel,
    shadowColor: BRAND.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    alignSelf: 'flex-start',
  },
  btnBlue: {
    backgroundColor: BRAND.primary600,
    shadowColor: 'rgba(37,99,235,0.25)',
    elevation: 2,
  },
  btnPurple: {
    backgroundColor: BRAND.purple600,
    shadowColor: 'rgba(109,40,217,0.25)',
    elevation: 2,
  },
  btnGray: {
    backgroundColor: '#1E293B',
    shadowColor: 'rgba(30,41,59,0.25)',
    elevation: 2,
  },
  smallBtnDanger: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderWidth: 1 },

  smallBtnText: { ...F, color: BRAND.hanBlue },
  smallBtnTextAlt: { ...F, color: '#FFFFFF' },
});
