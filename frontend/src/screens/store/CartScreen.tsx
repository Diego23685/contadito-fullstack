// src/screens/cart/CartScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  useWindowDimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { useCart } from '../../providers/CartContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFonts } from 'expo-font';

// ===== Paleta de marca (misma que el resto) =====
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

// Helper de tipografía Apoka (peso uniforme en Android)
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

const money = (n: number) =>
  new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: 'NIO',
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

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
      <Text style={[tStyle, styles.btnTextWeight, F]}>{title}</Text>
    </Pressable>
  );
};

export default function CartScreen() {
  // Cargar fuente Apoka (no bloquea el render inicial)
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;   // 2 columnas de cards
  const isXL = width >= 1180;    // layout 2-panel (lista + resumen lateral)

  const tenantRef: string = String(
    route.params?.tenantRef ??
      route.params?.tenantId ??
      route.params?.slug ??
      route.params?.slugOrName ??
      'DemoPyme'
  );

  const cartApi: any = useCart();
  const { items, removeByKey, total, clear } = cartApi;

  const increase = (lineId: string, qty: number) => {
    if (typeof cartApi.incrementByKey === 'function') return cartApi.incrementByKey(lineId);
    if (typeof cartApi.incByKey === 'function') return cartApi.incByKey(lineId);
    if (typeof cartApi.inc === 'function') return cartApi.inc(lineId);
    if (typeof cartApi.updateQtyByKey === 'function') return cartApi.updateQtyByKey(lineId, qty + 1);
  };
  const decrease = (lineId: string, qty: number) => {
    if (typeof cartApi.decrementByKey === 'function') return cartApi.decrementByKey(lineId);
    if (typeof cartApi.decByKey === 'function') return cartApi.decByKey(lineId);
    if (typeof cartApi.dec === 'function') return cartApi.dec(lineId);
    if (typeof cartApi.updateQtyByKey === 'function') {
      const next = Math.max(0, qty - 1);
      if (next === 0) return removeByKey(lineId);
      return cartApi.updateQtyByKey(lineId, next);
    }
    if (qty <= 1) return removeByKey(lineId);
  };

  const renderItem = ({ item }: any) => {
    const lineSubtotal = Number(item.qty) * Number(item.price || 0);
    return (
      <View style={[styles.card, isWide && styles.cardWide, isXL && styles.cardDense]}>
        {/* Imagen */}
        {item.image ? (
          <Image source={{ uri: item.image }} style={[styles.img, isXL && styles.imgXL]} />
        ) : (
          <View style={[styles.img, styles.imgPh, isXL && styles.imgXL]}>
            <Text style={{ ...F, color: '#64748B' }}>🛍️</Text>
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {!!item.variant && (
            <Text style={styles.badge} numberOfLines={1}>{String(item.variant)}</Text>
          )}
          <Text style={styles.sub} numberOfLines={1}>
            {money(item.price)} · <Text style={styles.subStrong}>Subtotal:</Text> {money(lineSubtotal)}
          </Text>

          {/* Stepper de cantidad */}
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityLabel="Disminuir"
              onPress={() => decrease(item.lineId, item.qty)}
              style={[styles.stepBtn, styles.stepBtnLeft]}
            >
              <Text style={styles.stepTxt}>−</Text>
            </Pressable>
            <View style={styles.qtyBox}>
              <Text style={styles.qtyTxt}>{item.qty}</Text>
            </View>
            <Pressable
              accessibilityLabel="Aumentar"
              onPress={() => increase(item.lineId, item.qty)}
              style={[styles.stepBtn, styles.stepBtnRight]}
            >
              <Text style={styles.stepTxt}>＋</Text>
            </Pressable>

            <Pressable onPress={() => removeByKey(item.lineId)} style={styles.rm}>
              <Text style={styles.rmTxt}>Quitar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const keyExtractor = (it: any) => it.lineId;

  // ==== Vista para pantallas XL: 2 paneles (lista + resumen fijo) ====
  if (isXL) {
    return (
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Carrito</Text>
          <View style={styles.headerStats}>
            <Text style={styles.hPill}>Ítems: {items.length}</Text>
            <Text style={[styles.hPill, styles.hTotal]}>{money(Number(total))}</Text>
          </View>
        </View>

        <View style={styles.twoPane}>
          {/* IZQUIERDA: Lista */}
          <View style={styles.leftPane}>
            {items.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>🛒</Text>
                <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
                <Text style={styles.emptyText}>
                  Explora productos y vuelve aquí cuando estés listo para pagar.
                </Text>
                <AButton
                  title="Explorar productos"
                  variant="secondary"
                  onPress={() => nav.goBack()}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                contentContainerStyle={{ paddingVertical: 10, paddingBottom: 24 }}
                // En XL dejamos 1 columna, tarjetas más anchas/densas
              />
            )}
          </View>

          {/* DERECHA: Resumen (sidebar) */}
          <View style={styles.rightPane}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumen</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{money(Number(total))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Envío</Text>
                <Text style={styles.summaryValue}>—</Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 6 }]}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>{money(Number(total))}</Text>
              </View>

              <View style={{ height: 12 }} />
              <AButton
                title="Vaciar carrito"
                variant="secondary"
                onPress={() => clear(tenantRef)}
                style={{ width: '100%' }}
              />
              <AButton
                title="Ir a pagar"
                onPress={() => nav.navigate('Checkout', { slug: tenantRef })}
                style={{ width: '100%', marginTop: 8 }}
              />

              <Text style={styles.summaryHint}>
                Los productos quedan reservados por 15 minutos al iniciar el pago.
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ==== Vista estándar (angosta / wide) ====
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Carrito</Text>

      {!items.length ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptyText}>
            Explora productos y vuelve aquí cuando estés listo para pagar.
          </Text>
          <AButton
            title="Explorar productos"
            variant="secondary"
            onPress={() => nav.goBack()}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 120 }}
            numColumns={isWide ? 2 : 1}
            columnWrapperStyle={isWide ? { gap: 12 } : undefined}
            extraData={items.map((i: any) => `${i.lineId}:${i.qty}:${i.price}`).join('|')}
          />

          {/* Footer de Checkout fijo (solo en anchas < XL y móviles) */}
          <View style={styles.checkoutBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{money(Number(total))}</Text>
            </View>
            <AButton
              title="Vaciar"
              variant="secondary"
              onPress={() => clear(tenantRef)}
              style={{ minWidth: 120 }}
            />
            <AButton
              title="Pagar"
              onPress={() => nav.navigate('Checkout', { slug: tenantRef })}
              style={{ minWidth: 160 }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.surfaceTint, padding: 12 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...F, fontSize: 20, color: BRAND.hanBlue },
  headerStats: { flexDirection: 'row', gap: 6 },
  hPill: {
    ...F,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: BRAND.surfaceSubtle, borderWidth: 1, borderColor: BRAND.borderSofter, color: '#0f172a'
  },
  hTotal: { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF', color: BRAND.hanBlue },

  // Empty state
  emptyWrap: { alignItems: 'center', marginTop: 40, paddingHorizontal: 16 },
  emptyEmoji: { ...F, fontSize: 50, marginBottom: 8 },
  emptyTitle: { ...F, fontSize: 18, color: '#0f172a' },
  emptyText: { ...F, color: '#6B7280', textAlign: 'center' },

  // Card item
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    padding: 12,
    alignItems: 'center',
    shadowColor: BRAND.hanBlue,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },
  cardWide: { flex: 1 },
  cardDense: { padding: 10, gap: 10 },

  img: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#FFF' },
  imgXL: { width: 72, height: 72 },
  imgPh: {
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  name: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  sub: { ...F, color: '#6B7280', fontSize: 12 },
  subStrong: { ...F, fontWeight: Platform.OS === 'ios' ? '800' : 'bold', color: '#0f172a' },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: BRAND.surfaceSubtle,
    borderWidth: 1,
    borderColor: BRAND.borderSofter,
    color: BRAND.hanBlue,
    fontSize: 11,
    ...F,
    fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
  },

  // Stepper & remove
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.borderSofter,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.surfaceSubtle,
  },
  stepBtnLeft: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  stepBtnRight: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  stepTxt: { ...F, fontSize: 18, color: BRAND.hanBlue, fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

  qtyBox: {
    minWidth: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.borderSofter,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.surfacePanel,
  },
  qtyTxt: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

  rm: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rmTxt: { ...F, color: '#991b1b', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

  // Layout 2-panel (XL)
  twoPane: { flex: 1, flexDirection: 'row', gap: 12, marginTop: 10 },
  leftPane: {
    flex: 2,
    backgroundColor: 'transparent',
  },
  rightPane: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Summary card (sidebar)
  summaryCard: {
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    padding: 14,
    shadowColor: BRAND.hanBlue,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },
  summaryTitle: { ...F, fontSize: 16, color: '#0f172a', marginBottom: 8, fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { ...F, color: '#6B7280' },
  summaryValue: { ...F, color: '#0f172a' },
  summaryTotalLabel: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  summaryTotalValue: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold', fontSize: 18 },
  summaryHint: { ...F, color: '#6B7280', fontSize: 12, marginTop: 10 },

  // Checkout bar (solo no-XL)
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
  totalLabel: { ...F, color: '#6B7280', fontSize: 12 },
  totalValue: { ...F, fontSize: 18, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

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
  btnTextLight: { ...F, color: '#FFFFFF' },
  btnTextDark: { ...F, color: '#0f172a' },
  btnTextWeight: { fontWeight: Platform.OS === 'ios' ? '900' : 'bold' },
});
