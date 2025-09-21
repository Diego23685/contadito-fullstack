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
} from 'react-native';
import { useCart } from '../../providers/CartContext';
import { useNavigation, useRoute } from '@react-navigation/native';

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
  new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: 'NIO',
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

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

export default function CartScreen() {
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

  // Intentamos leer funciones comunes del CartContext de forma segura
  const cartApi: any = useCart();
  const { items, removeByKey, total, clear } = cartApi;

  // Helpers de cantidad (con fallback si el contexto no trae inc/dec/setQty)
  const increase = (lineId: string, qty: number) => {
    if (typeof cartApi.incrementByKey === 'function') return cartApi.incrementByKey(lineId);
    if (typeof cartApi.incByKey === 'function') return cartApi.incByKey(lineId);
    if (typeof cartApi.inc === 'function') return cartApi.inc(lineId);
    if (typeof cartApi.updateQtyByKey === 'function') return cartApi.updateQtyByKey(lineId, qty + 1);
    // Si no hay API de qty, no hacemos nada (evitamos desincronizar totals)
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
            <Text style={{ color: apoka.muted }}>🛍️</Text>
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
            {money(item.price)} · <Text style={{ fontWeight: '800' }}>Subtotal:</Text>{' '}
            {money(lineSubtotal)}
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
  root: { flex: 1, backgroundColor: apoka.canvas, padding: 12 },
  title: { fontSize: 20, fontWeight: '900', color: apoka.text },

  // Empty state
  emptyWrap: { alignItems: 'center', marginTop: 40, paddingHorizontal: 16 },
  emptyEmoji: { fontSize: 50, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: apoka.text, marginBottom: 4 },
  emptyText: { color: apoka.muted, textAlign: 'center' },

  // Card item
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: apoka.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: apoka.border,
    padding: 12,
    alignItems: 'center',
  },
  cardWide: { flex: 1 },

  img: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#FFF' },
  imgPh: {
    borderWidth: 1,
    borderColor: apoka.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  name: { fontWeight: '900', color: apoka.text },
  sub: { color: apoka.muted, fontSize: 12 },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: apoka.brandSoftBg,
    borderWidth: 1,
    borderColor: apoka.brandSoftBorder,
    color: apoka.brandStrong,
    fontSize: 11,
    fontWeight: '800',
  },

  // Stepper & remove
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: apoka.brandSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: apoka.brandSoftBg,
  },
  stepBtnLeft: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  stepBtnRight: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  stepTxt: { fontSize: 18, fontWeight: '900', color: apoka.brandStrong },

  qtyBox: {
    minWidth: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: apoka.brandSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qtyTxt: { fontWeight: '900', color: apoka.text },

  rm: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: apoka.dangerBg,
    borderWidth: 1,
    borderColor: apoka.dangerBorder,
  },
  rmTxt: { color: '#991b1b', fontWeight: '900' },

  // Checkout bar
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
  totalLabel: { color: apoka.muted, fontSize: 12 },
  totalValue: { fontSize: 18, fontWeight: '900', color: apoka.text },

  // Botones base
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
});
