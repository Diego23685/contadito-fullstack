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
  const isWide = width >= 900;

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
      <View style={[styles.card, isWide && styles.cardWide]}>
        {/* Imagen */}
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.img} />
        ) : (
          <View style={[styles.img, styles.imgPh]}>
            <Text style={{ ...F, color: '#64748B' }}>🛍️</Text>
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {!!item.variant && (
            <Text style={styles.badge}>{String(item.variant)}</Text>
          )}
          <Text style={styles.sub}>
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

          {/* Footer de Checkout fijo */}
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
  title: { ...F, fontSize: 20, color: BRAND.hanBlue },

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

  img: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#FFF' },
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

  // Checkout bar
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
