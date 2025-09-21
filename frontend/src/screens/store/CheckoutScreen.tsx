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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../../providers/CartContext';
import { api } from '../../api';

/** ====== APOKA THEME ====== */
const apoka = {
  brand: '#7C3AED',
  brandStrong: '#5B21B6',
  brandSoftBg: '#F5F3FF',
  brandSoftBorder: '#DDD6FE',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E5E7EB',
  cardBg: '#FFFFFF',
  canvas: '#F8FAFC',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  dangerBorder: '#FECACA',
};

const money = (n: number) =>
  new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 })
    .format(Number(n || 0));

/** Botón Apoka */
const AButton = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: any;
}) => {
  const vStyle =
    variant === 'secondary'
      ? styles.btnSecondary
      : variant === 'ghost'
      ? styles.btnGhost
      : variant === 'danger'
      ? styles.btnDanger
      : styles.btnPrimary;

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
      <Text style={[tStyle, { fontWeight: '900' }]}>{title}</Text>
    </Pressable>
  );
};

export default function CheckoutScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  // Alineado con el Carrito (lee varias posibles props)
  const slug: string =
    route.params?.slug ??
    route.params?.tenantRef ??
    route.params?.tenantId ??
    route.params?.slugOrName ??
    'DemoPyme';

  const { items, total, clear } = useCart();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string | null>>({});

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
        items: items.map((i: any) => ({ productId: i.productId, quantity: i.qty })),
      };
      const { data } = await api.post(`/store/${slug}/orders`, payload);
      clear(slug); // limpia el carrito para ese tenant si tu contexto lo soporta (si no, clear())
      Alert.alert('Pedido creado', `Número: ${data.number}\nTotal: ${money(Number(data.total))}`);
      nav.reset({ index: 0, routes: [{ name: 'StoreFront', params: { slug } }] });
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo crear el pedido'));
    } finally {
      setLoading(false);
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
            <Text style={{ color: apoka.muted }}>🛍️</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
          <Text style={styles.itemMeta}>
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
            <Field
              label="Dirección de envío"
              value={addr}
              onChangeText={setAddr}
              multiline
              placeholder="Barrio, calle, referencias"
              helper="Si prefieres recoger en tienda, déjalo en blanco y coméntalo en las notas."
            />
            <Field
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Indicaciones para la entrega, horarios, etc."
            />
          </View>
        </ScrollView>

        {/* ====== DERECHA: Resumen ====== */}
        <View style={[styles.rightCol, isWide && styles.rightColWide]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen del pedido</Text>
            <View style={{ gap: 10 }}>
              {items.map((it: any) => (
                <SummaryLine key={it.lineId ?? `${it.productId}-${it.qty}-${it.price}`} it={it} />
              ))}
            </View>

            <View style={styles.totalBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.muted}>Subtotal</Text>
                <Text style={styles.bold}>{money(items.reduce((s: number, it: any) => s + Number(it.qty) * Number(it.price || 0), 0))}</Text>
              </View>
              {/* Si manejas envío o impuestos, muéstralos aquí */}
              <View style={[styles.rowBetween, { marginTop: 6 }]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{totalFmt}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <AButton
                title="Editar carrito"
                variant="secondary"
                onPress={() => nav.goBack()}
                style={{ flex: 1 }}
              />
              <AButton
                title={loading ? 'Procesando…' : 'Confirmar pedido'}
                onPress={submit}
                disabled={loading}
                style={{ flex: 1 }}
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
          <AButton title="Confirmar" onPress={submit} disabled={loading} style={{ minWidth: 140 }} />
        </View>
      )}

      {/* Overlay de loading si quieres bloquear toda la pantalla
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={apoka.brand} />
        </View>
      )} */}
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
          error && { borderColor: apoka.dangerBorder, backgroundColor: '#FFF' },
        ]}
      />
      {!!helper && <Text style={styles.helper}>{helper}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout
  root: { flex: 1, backgroundColor: apoka.canvas, padding: 12 },
  title: { fontSize: 20, fontWeight: '900', color: apoka.text },

  main: { flex: 1, marginTop: 8 },
  mainWide: { flexDirection: 'row', gap: 12 },
  leftCol: { flex: 1 },
  leftColWide: { flex: 7 },
  rightCol: { marginTop: 12 },
  rightColWide: { flex: 5, marginTop: 0 },

  // Tarjetas
  card: {
    backgroundColor: apoka.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: apoka.border,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: apoka.text, marginBottom: 6 },

  // Campos
  label: { color: apoka.muted, fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: apoka.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    minHeight: 42,
  },
  helper: { color: apoka.muted, fontSize: 12, marginTop: 4 },
  error: { color: apoka.danger, fontSize: 12, marginTop: 4 },

  // Resumen
  lineCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: apoka.border,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  img: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#fff' },
  imgPh: { borderWidth: 1, borderColor: apoka.border, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontWeight: '800', color: apoka.text },
  itemMeta: { color: apoka.muted, fontSize: 12 },
  itemLineTotal: { fontWeight: '900', color: apoka.text },

  totalBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: apoka.border, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: apoka.muted },
  bold: { fontWeight: '800', color: apoka.text },
  totalLabel: { color: apoka.muted, fontSize: 12 },
  totalValue: { fontSize: 18, fontWeight: '900', color: apoka.text },

  // Barra de checkout móvil
  checkoutBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: apoka.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  // Empty
  emptyEmoji: { fontSize: 56, marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: apoka.text, marginBottom: 4 },
  emptyText: { color: apoka.muted, textAlign: 'center' },

  // Botones
  btnBase: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: apoka.brand, borderColor: apoka.brand },
  btnSecondary: { backgroundColor: '#FFFFFF', borderColor: apoka.border },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnDanger: { backgroundColor: apoka.danger, borderColor: apoka.danger },
  btnTextLight: { color: '#FFFFFF' },
  btnTextDark: { color: apoka.text },

  // (Opcional) Overlay de loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
