// src/screens/store/CheckoutScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  useWindowDimensions,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../../providers/CartContext';
import { api } from '../../api';
import { useFonts } from 'expo-font';

// ===== Paleta de marca (misma que las demás screens) =====
const BRAND = {
  hanBlue: '#4458C7',
  iris: '#5A44C7',
  cyanBlueAzure: '#4481C7',
  maximumBlue: '#44AAC7',
  darkPastelBlue: '#8690C7',
  verdigris: '#43BFB7',

  surfaceTint:  '#F3F6FF',
  surfaceSubtle:'#F8FAFF',
  surfacePanel: '#FCFDFF',
  borderSoft:   '#E2E7FF',
  borderSofter: '#E9EEFF',
  trackSoft:    '#DEE6FB',
} as const;

// Tipografía Apoka helper
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

const money = (n: number) =>
  new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 })
    .format(Number(n || 0));

/** Botón BRAND */
const AButton = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';
  disabled?: boolean;
  style?: any;
}) => {
  let vStyle = styles.btnPrimary;
  if (variant === 'secondary') vStyle = styles.btnSecondary;
  else if (variant === 'ghost') vStyle = styles.btnGhost;
  else if (variant === 'danger') vStyle = styles.btnDanger;
  else if (variant === 'whatsapp') vStyle = styles.btnWhatsApp;

  const tStyle =
    variant === 'secondary' || variant === 'ghost'
      ? styles.btnTextDark
      : styles.btnTextLight;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btnBase, vStyle, disabled && { opacity: 0.6 }, style]}
    >
      <Text style={[tStyle, styles.btnTextWeight, F]}>{title}</Text>
    </Pressable>
  );
};

/** Checkbox simple */
const Checkbox = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <Pressable
    onPress={() => onChange(!checked)}
    style={styles.checkboxRow}
  >
    <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
      {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
    </View>
    <Text style={[F, { color: '#0f172a' }]}>{label}</Text>
  </Pressable>
);

export default function CheckoutScreen() {
  // Cargar fuente Apoka (no bloquea el primer render; se aplica cuando está lista)
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  // Slug solo para contexto/front (el envío por WhatsApp no depende del backend)
  const slug: string =
    route.params?.slug ??
    route.params?.slugOrName ??
    route.params?.tenantRef ??
    'DemoPyme';

  const { items, total, clear } = useCart();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // ===== Opciones “checkboxes” solicitadas =====
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [needInvoice, setNeedInvoice] = useState(false);
  const [delivery, setDelivery] = useState<'envio' | 'retiro'>('envio');
  const [payMethod, setPayMethod] = useState<'contra' | 'transferencia' | 'tarjeta'>('contra');

  const hasItems = items && items.length > 0;

  // Validaciones simples
  const isEmail = (v: string) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const onlyDigitsPlus = (v: string) => v.replace(/[^\d+]/g, '');
  const validate = () => {
    const next: Record<string, string | null> = {};
    if (!name.trim()) next.name = 'Tu nombre es requerido';
    if (!phone.trim()) next.phone = 'El teléfono es requerido';
    if (phone && !/^\+?\d{7,15}$/.test(onlyDigitsPlus(phone))) next.phone = 'Teléfono inválido';
    if (email && !isEmail(email)) next.email = 'Correo inválido';
    if (!acceptTerms) next.terms = 'Debes aceptar términos y condiciones';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!hasItems) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de continuar.');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        shippingAddress: addr.trim() || undefined,
        notes: notes.trim() || undefined,
        delivery,
        payMethod,
        needInvoice,
        items: items.map((i: any) => ({ productId: i.productId, quantity: i.qty })),
      };
      // Mantengo el submit por si quieres registrar en backend además de WhatsApp.
      const { data } = await api.post(`/store/${encodeURIComponent(slug)}/orders`, payload);
      clear(slug);
      Alert.alert('Pedido creado', `Número: ${data.number}\nTotal: ${money(Number(data.total))}`);
      nav.reset({ index: 0, routes: [{ name: 'StoreFront', params: { slug } }] });
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo crear el pedido'));
    } finally {
      setLoading(false);
    }
  };

  // ===== WhatsApp =====
  const WHATSAPP_TO = '57379929'; // número solicitado

  function normalizeWhatsAppNumber(raw: string) {
    let s = String(raw).replace(/[^\d+]/g, '');
    if (s.startsWith('00')) s = '+' + s.slice(2);
    // Si vienen 8 dígitos (Nicaragua), intenta prefijar +505
    if (!s.startsWith('+') && s.length === 8) s = '505' + s;
    // wa.me pide solo dígitos (sin +)
    return s.replace('+', '');
  }

  const buildWhatsAppMessage = () => {
    const lines: string[] = [];
    lines.push(`🧾 *Nuevo pedido desde la tienda* (${slug})`);
    lines.push('');
    lines.push(`👤 *Cliente:* ${name.trim()}`);
    if (email.trim()) lines.push(`📧 *Correo:* ${email.trim()}`);
    lines.push(`📱 *Tel:* ${phone.trim()}`);
    if (addr.trim()) lines.push(`🏠 *Dirección:* ${addr.trim()}`);
    if (notes.trim()) lines.push(`📝 *Notas:* ${notes.trim()}`);
    lines.push('');
    lines.push(`🚚 *Entrega:* ${delivery === 'envio' ? 'Envío a domicilio' : 'Retiro en tienda'}`);
    const pm =
      payMethod === 'contra' ? 'Pago contra entrega' :
      payMethod === 'transferencia' ? 'Transferencia bancaria' :
      'Tarjeta';
    lines.push(`💳 *Pago:* ${pm}`);
    lines.push(`📄 *Factura:* ${needInvoice ? 'Sí' : 'No'}`);
    lines.push('');
    lines.push('*Productos*');
    items.forEach((it: any, idx: number) => {
      const line = Number(it.qty) * Number(it.price || 0);
      lines.push(`${idx + 1}. ${it.name}  x${it.qty}  · ${money(Number(it.price || 0))}  = ${money(line)}`);
    });
    lines.push('');
    lines.push(`🟣 *Total:* ${money(Number(total))}`);
    lines.push('');
    lines.push('Gracias por su compra 🙌');

    return lines.join('\n');
  };

  const sendWhatsApp = async () => {
    if (!hasItems) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de continuar.');
      return;
    }
    // No forzamos las mismas validaciones estrictas que el submit, pero sí las básicas
    if (!name.trim()) { Alert.alert('Falta nombre', 'Ingresa tu nombre.'); return; }
    if (!phone.trim()) { Alert.alert('Falta teléfono', 'Ingresa tu teléfono.'); return; }

    const msg = buildWhatsAppMessage();
    const num = normalizeWhatsAppNumber(WHATSAPP_TO);
    const encoded = encodeURIComponent(msg);

    // Intenta app nativa, si no, wa.me (web)
    const appUrl = `whatsapp://send?phone=${num}&text=${encoded}`;
    const webUrl = `https://wa.me/${num}?text=${encoded}`;

    try {
      const canNative = await Linking.canOpenURL('whatsapp://send');
      if (canNative) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (e) {
      Alert.alert(
        'No se pudo abrir WhatsApp',
        'Verifica que WhatsApp esté instalado o que el número tenga código de país.'
      );
    }
  };

  const SummaryLine = ({ it }: { it: any }) => {
    const line = Number(it.qty) * Number(it.price || 0);
    return (
      <View style={styles.lineCard}>
        {it.image ? (
          <Image source={{ uri: it.image }} style={styles.img} />
        ) : (
          <View style={[styles.img, styles.imgPh]}>
            <Text style={{ ...F, color: '#64748B' }}>🛍️</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{it.name}</Text>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {money(Number(it.price))} · Cant. {it.qty}
          </Text>
        </View>
        <Text style={styles.itemLineTotal}>{money(line)}</Text>
      </View>
    );
  };

  const totalFmt = useMemo(() => money(Number(total)), [total]);

  if (!hasItems) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptyText}>Agrega productos y vuelve a intentarlo.</Text>
        <AButton
          title="Volver a la tienda"
          variant="secondary"
          onPress={() => nav.goBack()}
          style={{ marginTop: 12 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Checkout</Text>

      {/* Layout responsive: izquierda formulario, derecha resumen */}
      <View style={[styles.main, isWide && styles.mainWide]}>
        {/* ====== IZQUIERDA: Form ====== */}
        <ScrollView
          style={[styles.leftCol, isWide && styles.leftColWide]}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos de contacto</Text>

            <Field
              label="Nombre completo"
              value={name}
              onChangeText={(t: string) => { setName(t); if (errors.name) setErrors(s => ({ ...s, name: null })); }}
              error={errors.name}
              placeholder="Ej. María Pérez"
            />

            <Field
              label="Correo (opcional)"
              value={email}
              onChangeText={(t: string) => { setEmail(t); if (errors.email) setErrors(s => ({ ...s, email: null })); }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="persona@correo.com"
            />

            <Field
              label="Teléfono"
              value={phone}
              onChangeText={(t: string) => { setPhone(t); if (errors.phone) setErrors(s => ({ ...s, phone: null })); }}
              error={errors.phone}
              keyboardType="phone-pad"
              placeholder="+505 8888 8888"
              helper="Usa formato internacional si es posible."
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Envío</Text>
            <View style={styles.segmentWrap}>
              <Pressable
                onPress={() => setDelivery('envio')}
                style={[styles.segmentBtn, delivery === 'envio' && styles.segmentBtnActive]}
              >
                <Text style={[F, delivery === 'envio' ? styles.segmentTextActive : styles.segmentText]}>Envío a domicilio</Text>
              </Pressable>
              <Pressable
                onPress={() => setDelivery('retiro')}
                style={[styles.segmentBtn, delivery === 'retiro' && styles.segmentBtnActive]}
              >
                <Text style={[F, delivery === 'retiro' ? styles.segmentTextActive : styles.segmentText]}>Retiro en tienda</Text>
              </Pressable>
            </View>

            <Field
              label="Dirección de envío"
              value={addr}
              onChangeText={setAddr}
              multiline
              placeholder="Barrio, calle, referencias"
              helper="Si prefieres recoger en tienda, puedes dejarlo en blanco."
            />

            <Field
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Indicaciones para la entrega, horarios, etc."
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pago</Text>

            <View style={styles.segmentWrap}>
              <Pressable
                onPress={() => setPayMethod('contra')}
                style={[styles.segmentBtn, payMethod === 'contra' && styles.segmentBtnActive]}
              >
                <Text style={[F, payMethod === 'contra' ? styles.segmentTextActive : styles.segmentText]}>Contra entrega</Text>
              </Pressable>
              <Pressable
                onPress={() => setPayMethod('transferencia')}
                style={[styles.segmentBtn, payMethod === 'transferencia' && styles.segmentBtnActive]}
              >
                <Text style={[F, payMethod === 'transferencia' ? styles.segmentTextActive : styles.segmentText]}>Transferencia</Text>
              </Pressable>
              <Pressable
                onPress={() => setPayMethod('tarjeta')}
                style={[styles.segmentBtn, payMethod === 'tarjeta' && styles.segmentBtnActive]}
              >
                <Text style={[F, payMethod === 'tarjeta' ? styles.segmentTextActive : styles.segmentText]}>Tarjeta</Text>
              </Pressable>
            </View>

            <Checkbox
              label="Necesito factura a nombre de mi empresa/persona"
              checked={needInvoice}
              onChange={setNeedInvoice}
            />
            <Checkbox
              label="Acepto términos y condiciones"
              checked={acceptTerms}
              onChange={(v) => { setAcceptTerms(v); if (errors.terms) setErrors(s => ({ ...s, terms: null })); }}
            />
            {!!errors.terms && <Text style={styles.error}>{errors.terms}</Text>}
          </View>
        </ScrollView>

        {/* ====== DERECHA: Resumen ====== */}
        <View style={[styles.rightCol, isWide && styles.rightColWide]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen del pedido</Text>

            {/* Lista compacta y con alto máximo */}
            <View style={styles.itemsScrollBox}>
              <ScrollView>
                <View style={{ gap: 8 }}>
                  {items.map((it: any) => (
                    <SummaryLine key={it.lineId ?? `${it.productId}-${it.qty}-${it.price}`} it={it} />
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.totalBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.muted}>Subtotal</Text>
                <Text style={styles.bold}>
                  {money(items.reduce((s: number, it: any) => s + Number(it.qty) * Number(it.price || 0), 0))}
                </Text>
              </View>
              <View style={[styles.rowBetween, { marginTop: 6 }]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{totalFmt}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <AButton
                title="Enviar por WhatsApp"
                variant="whatsapp"
                onPress={sendWhatsApp}
                style={{ flexGrow: 1 }}
              />
              <AButton
                title="Editar carrito"
                variant="secondary"
                onPress={() => nav.goBack()}
                style={{ flexGrow: 1, minWidth: 140 }}
              />
              <AButton
                title={loading ? 'Procesando…' : 'Confirmar pedido (API)'}
                onPress={submit}
                disabled={loading}
                style={{ flexGrow: 1, minWidth: 180 }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Barra fija de total + CTA (móvil) */}
      {!isWide && (
        <View style={styles.checkoutBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{totalFmt}</Text>
          </View>
          <AButton title="WhatsApp" variant="whatsapp" onPress={sendWhatsApp} style={{ minWidth: 120 }} />
        </View>
      )}
    </View>
  );
}

function Field({
  label,
  helper,
  error,
  multiline,
  style,
  ...props
}: {
  label: string;
  helper?: string;
  error?: string | null;
  multiline?: boolean;
  style?: any;
  [k: string]: any;
}) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          multiline && { height: 100, textAlignVertical: 'top' },
          error && { borderColor: '#FECACA', backgroundColor: '#FFF' },
        ]}
        placeholderTextColor="#9aa7c2"
      />
      {!!helper && <Text style={styles.helper}>{helper}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout
  root: { flex: 1, backgroundColor: BRAND.surfaceTint, padding: 12 },
  title: { ...F, fontSize: 20, color: BRAND.hanBlue },

  main: { flex: 1, marginTop: 8 },
  mainWide: { flexDirection: 'row', gap: 12 },
  leftCol: { flex: 1 },
  leftColWide: { flex: 7, minWidth: 0 },
  rightCol: { marginTop: 12 },
  rightColWide: { flex: 5, marginTop: 0, maxWidth: 420, alignSelf: 'flex-start' },

  // Tarjetas
  card: {
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    padding: 12,
    marginBottom: 12,
    shadowColor: BRAND.hanBlue,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },
  cardTitle: { ...F, fontSize: 16, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold', marginBottom: 6 },

  // Campos
  label: { ...F, color: '#6B7280', fontSize: 12, marginBottom: 4 },
  input: {
    ...F,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderRadius: 10,
    backgroundColor: BRAND.surfacePanel,
    paddingHorizontal: 12,
    minHeight: 42,
    color: '#0f172a',
  },
  helper: { ...F, color: '#6B7280', fontSize: 12, marginTop: 4 },
  error: { ...F, color: '#DC2626', fontSize: 12, marginTop: 4 },

  // Resumen (lista compacta y scrolleable)
  itemsScrollBox: { maxHeight: 320, marginBottom: 8 },
  lineCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    backgroundColor: BRAND.surfacePanel,
    alignItems: 'center',
    minHeight: 56,
  },
  img: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#fff' },
  imgPh: { borderWidth: 1, borderColor: BRAND.borderSoft, alignItems: 'center', justifyContent: 'center' },
  itemName: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  itemMeta: { ...F, color: '#6B7280', fontSize: 11 },
  itemLineTotal: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '900' : 'bold' },

  totalBox: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: BRAND.borderSoft, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { ...F, color: '#6B7280' },
  bold: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  totalLabel: { ...F, color: '#6B7280', fontSize: 12 },
  totalValue: { ...F, fontSize: 18, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '900' : 'bold' },

  // Barra de checkout móvil
  checkoutBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: BRAND.hanBlue,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  // Empty
  emptyEmoji: { ...F, fontSize: 56, marginBottom: 6 },
  emptyTitle: { ...F, fontSize: 18, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '900' : 'bold', marginBottom: 4 },
  emptyText: { ...F, color: '#6B7280', textAlign: 'center' },

  // Botones
  btnBase: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: BRAND.hanBlue, borderColor: BRAND.hanBlue },
  btnSecondary: { backgroundColor: BRAND.surfacePanel, borderColor: BRAND.borderSoft },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnDanger: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  btnWhatsApp: { backgroundColor: '#25D366', borderColor: '#25D366' },
  btnTextLight: { ...F, color: '#FFFFFF' },
  btnTextDark: { ...F, color: '#0f172a' },
  btnTextWeight: { fontWeight: Platform.OS === 'ios' ? '900' : 'bold' },

  // Segment (píldoras)
  segmentWrap: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    backgroundColor: BRAND.surfacePanel,
  },
  segmentBtnActive: {
    backgroundColor: BRAND.hanBlue,
    borderColor: BRAND.hanBlue,
  },
  segmentText: { color: '#0f172a' },
  segmentTextActive: { color: '#fff' },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  checkboxBox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'
  },
  checkboxBoxChecked: { backgroundColor: BRAND.hanBlue, borderColor: BRAND.hanBlue },
  checkboxTick: { color: '#fff', fontSize: 12 },
});
