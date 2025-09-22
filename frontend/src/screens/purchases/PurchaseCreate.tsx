// src/screens/purchases/PurchaseCreate.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { api } from '../../api';
import { useFonts } from 'expo-font';

// ===== Paleta de marca (misma de todo el app) =====
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

// Tipografía Apoka (peso uniforme para Android)
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

type Product = { id: number; name: string; sku: string; stdCost?: number | null };
type CartLine = { productId: number; name: string; sku: string; qty: number; unitCost: number };

/** Helpers numéricos */
const toNumber = (raw: string) => {
  if (!raw) return 0;
  const s = String(raw).trim().replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = Number(s);
  return isFinite(n) ? n : 0;
};
const toPercent = (raw: string) => Math.max(-100, Math.min(1000, toNumber(raw)));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Botón con estilos de marca */
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
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.btnBase, vStyle, disabled && { opacity: 0.6 }, style]}
    >
      <Text style={[tStyle, { fontWeight: Platform.OS === 'ios' ? '800' : 'bold' }, F]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function PurchaseCreate({ navigation }: any) {
  // Carga no bloqueante de la fuente Apoka
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const { width } = useWindowDimensions();
  const isWide = width >= 820;
  const isXL = width >= 1100;

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [taxRateStr, setTaxRateStr] = useState('');      // % opcional
  const [discRateStr, setDiscRateStr] = useState('');    // % opcional
  const [cart, setCart] = useState<Record<number, CartLine>>({}); // id -> line

  const money = useCallback(
    (v?: number | null) =>
      new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(
        Number(v ?? 0)
      ),
    []
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', { params: { page: 1, pageSize: 500 } });
      const items: Product[] = (res.data?.items ?? res.data ?? []).map((p: any) => ({
        id: p.id, name: p.name, sku: p.sku, stdCost: p.stdCost ?? 0,
      }));
      setProducts(items);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo cargar productos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // --------- Carrito ----------
  const add = (p: Product) => {
    setCart(prev => {
      const line = prev[p.id] ?? { productId: p.id, name: p.name, sku: p.sku, qty: 0, unitCost: Number(p.stdCost ?? 0) };
      return { ...prev, [p.id]: { ...line, qty: line.qty + 1 } };
    });
  };
  const dec = (id: number) => {
    setCart(prev => {
      if (!prev[id]) return prev;
      const nextQty = prev[id].qty - 1;
      const copy = { ...prev };
      if (nextQty <= 0) delete copy[id];
      else copy[id] = { ...prev[id], qty: nextQty };
      return copy;
    });
  };
  const remove = (id: number) => setCart(prev => {
    const copy = { ...prev }; delete copy[id]; return copy;
  });
  const setCost = (id: number, v: string) => {
    const n = toNumber(v);
    setCart(prev => prev[id] ? { ...prev, [id]: { ...prev[id], unitCost: n } } : prev);
  };
  const clear = () => setCart({});

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  }, [q, products]);

  const numColumns = isXL ? 4 : isWide ? 3 : 1;
  const cartItems = useMemo(() => Object.values(cart), [cart]);

  // Totales (descuento -> impuesto -> total)
  const subtotal = useMemo(
    () => round2(cartItems.reduce((s, l) => s + l.qty * l.unitCost, 0)),
    [cartItems]
  );
  const taxRate = toPercent(taxRateStr);
  const discRate = toPercent(discRateStr);
  const discountAmt = round2(subtotal * (discRate / 100));
  const baseAfterDisc = round2(subtotal - discountAmt);
  const taxAmt = round2(baseAfterDisc * (taxRate / 100));
  const total = round2(baseAfterDisc + taxAmt);

  const save = async () => {
    if (!cartItems.length) {
      Alert.alert('Carrito vacío', 'Agrega al menos un producto.');
      return;
    }
    try {
      const payload: any = {
        supplierName: supplierName || null,
        currency: 'NIO',
        items: cartItems.map(l => ({
          productId: l.productId,
          description: l.name,
          quantity: l.qty,
          unitCost: l.unitCost,
        })),
      };
      if (taxRateStr.trim() !== '') payload.taxRate = taxRate;
      if (discRateStr.trim() !== '') payload.discountRate = discRate;

      const { data } = await api.post('/purchases', payload);
      Alert.alert('Compra registrada', `#${data.number ?? data.Number} · Total ${money(data.total ?? data.Total)}`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar la compra'));
    }
  };

  // --------- Render ----------
  const renderProduct = ({ item }: { item: Product }) => {
    const line = cart[item.id];
    return (
      <View style={[styles.card, styles.productCard, numColumns > 1 && { flex: 1 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.prodTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.prodSub} numberOfLines={1}>{item.sku}</Text>
          <Text style={styles.prodMeta}>Costo ref.: {money(item.stdCost ?? 0)}</Text>
        </View>
        {!line ? (
          <AButton title="Agregar" onPress={() => add(item)} />
        ) : (
          <View style={styles.stepper}>
            <TouchableOpacity accessibilityLabel="Disminuir" style={styles.stepBtn} onPress={() => dec(item.id)}>
              <Text style={styles.stepTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyTxt}>{line.qty}</Text>
            <TouchableOpacity accessibilityLabel="Aumentar" style={styles.stepBtn} onPress={() => add(item)}>
              <Text style={styles.stepTxt}>＋</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const keyExtractor = (p: Product) => String(p.id);

  const CartPanel = () => (
    <View style={[styles.card, styles.cartPanel]}>
      <View style={styles.cartHeader}>
        <Text style={styles.cartTitle}>Resumen</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={clear}><Text style={styles.clearLink}>Vaciar</Text></TouchableOpacity>
        )}
      </View>

      {/* Proveedor + tasas */}
      <View style={{ gap: 8 }}>
        <View>
          <Text style={styles.label}>Proveedor (opcional)</Text>
          <TextInput
            style={styles.input}
            value={supplierName}
            onChangeText={setSupplierName}
            placeholder="Nombre del proveedor"
            placeholderTextColor="#9aa7c2"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Descuento %</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={discRateStr}
              onChangeText={setDiscRateStr}
              placeholder="0"
              placeholderTextColor="#9aa7c2"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Impuesto %</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={taxRateStr}
              onChangeText={setTaxRateStr}
              placeholder="0"
              placeholderTextColor="#9aa7c2"
            />
          </View>
        </View>
      </View>

      {/* Líneas */}
      <View style={{ borderTopWidth: 1, borderTopColor: BRAND.borderSoft, paddingTop: 10, gap: 8 }}>
        {cartItems.length === 0 ? (
          <Text style={{ color: '#6B7280', ...F }}>No hay productos en el carrito.</Text>
        ) : cartItems.map(l => (
          <View key={l.productId} style={styles.cartRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text numberOfLines={1} style={{ fontWeight: Platform.OS === 'ios' ? '600' : 'bold', color: '#0f172a', ...F }}>{l.name}</Text>
              <Text style={styles.prodSub}>{l.sku}</Text>
              <Text style={styles.linePrice}>{money(l.unitCost)} · {money(l.unitCost * l.qty)}</Text>
            </View>

            <View style={styles.stepperSm}>
              <TouchableOpacity style={styles.stepBtnSm} onPress={() => dec(l.productId)}>
                <Text style={styles.stepTxt}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyTxt}>{l.qty}</Text>
              <TouchableOpacity
                style={styles.stepBtnSm}
                onPress={() => add({ id: l.productId, name: l.name, sku: l.sku, stdCost: l.unitCost })}
              >
                <Text style={styles.stepTxt}>＋</Text>
              </TouchableOpacity>
            </View>

            <View style={{ width: 100 }}>
              <Text style={styles.smallLabel}>Costo</Text>
              <TextInput
                style={[styles.input, { height: 36 }]}
                keyboardType="numeric"
                value={String(l.unitCost)}
                onChangeText={(v) => setCost(l.productId, v)}
              />
            </View>

            <TouchableOpacity style={styles.removeBtn} onPress={() => remove(l.productId)}>
              <Text style={styles.removeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Totales */}
      <View style={styles.totals}>
        <View style={styles.rowBetween}><Text style={styles.mutedTxt}>Subtotal</Text><Text style={styles.totalNum}>{money(subtotal)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.mutedTxt}>Descuento ({discRate}%)</Text><Text style={styles.totalNum}>− {money(discountAmt)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.mutedTxt}>Impuesto ({taxRate}%)</Text><Text style={styles.totalNum}>{money(taxAmt)}</Text></View>
        <View style={[styles.rowBetween, { borderTopWidth: 1, borderTopColor: BRAND.borderSoft, paddingTop: 8 }]}>
          <Text style={{ fontWeight: Platform.OS === 'ios' ? '800' : 'bold', color: '#0f172a', ...F }}>Total</Text>
          <Text style={[styles.totalNum, { fontSize: 18, color: BRAND.hanBlue }]}>{money(total)}</Text>
        </View>
      </View>

      <AButton
        title={loading ? 'Guardando…' : 'Guardar compra'}
        onPress={save}
        disabled={loading || cartItems.length === 0}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Encabezado + búsqueda */}
      <View style={styles.header}>
        <Text style={styles.title}>Nueva compra</Text>
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Buscar por nombre o SKU…"
            value={q}
            onChangeText={setQ}
            style={styles.search}
            placeholderTextColor="#9aa7c2"
            returnKeyType="search"
          />
          <View style={{ width: 8 }} />
          <AButton title="Limpiar" variant="secondary" onPress={() => setQ('')} />
        </View>
      </View>

      {/* Main responsive */}
      <View style={[styles.main, isWide && styles.mainWide]}>
        {/* IZQ: grid de productos */}
        <View style={[styles.leftCol, isWide && styles.leftColWide]}>
          <FlatList
            data={filteredProducts}
            key={isXL ? 4 : isWide ? 3 : 1}
            keyExtractor={keyExtractor}
            renderItem={renderProduct}
            numColumns={isXL ? 4 : isWide ? 3 : 1}
            columnWrapperStyle={(isXL || isWide) ? { gap: 12 } : undefined}
            contentContainerStyle={{ paddingVertical: 8, gap: 12 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            ListEmptyComponent={
              <Text style={{ color: '#6B7280', padding: 12, ...F }}>
                {q ? 'No hay resultados para tu búsqueda.' : 'No hay productos.'}
              </Text>
            }
            style={{ flex: 1 }}
          />
        </View>

        {/* DER: resumen/carrito */}
        <View style={[styles.rightCol, isWide && styles.rightColWide]}>
          <CartPanel />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: BRAND.surfaceTint },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  main: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  mainWide: { flexDirection: 'row', gap: 16 },
  leftCol: { flex: 1 },
  leftColWide: { flex: 7 },
  rightCol: { marginTop: 12 },
  rightColWide: { flex: 5, marginTop: 0 },

  // Textos
  title: { ...F, fontSize: 20, color: BRAND.hanBlue, marginBottom: 8 },
  label: { ...F, marginBottom: 6, color: '#0f172a' },
  smallLabel: { ...F, fontSize: 12, color: '#6B7280', marginBottom: 4 },
  mutedTxt: { ...F, color: '#6B7280' },

  // Búsqueda
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  search: {
    ...F,
    flex: 1,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingHorizontal: 12, minHeight: 42,
    color: '#0f172a', backgroundColor: BRAND.surfacePanel,
  },

  // Cards
  card: {
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    shadowColor: BRAND.hanBlue,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },

  // Producto
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prodTitle: { ...F, fontSize: 16, color: '#0f172a' },
  prodSub: { ...F, fontSize: 12, color: '#6B7280' },
  prodMeta: { ...F, marginTop: 6, color: '#374151' },
  linePrice: { ...F, color: '#0f172a' },

  // Stepper (grid)
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND.surfaceSubtle, borderRadius: 10,
    borderWidth: 1, borderColor: BRAND.borderSofter, padding: 4,
  },
  stepBtn: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: BRAND.borderSofter,
    alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.surfacePanel,
  },
  stepTxt: { ...F, fontSize: 18, color: BRAND.hanBlue, fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  qtyTxt: { ...F, minWidth: 28, textAlign: 'center', color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '700' : 'bold' },

  // Carrito (sidebar)
  cartPanel: { gap: 10 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartTitle: { ...F, fontSize: 16, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  clearLink: { ...F, color: '#991b1b', fontWeight: Platform.OS === 'ios' ? '700' : 'bold' },

  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.borderSoft, backgroundColor: BRAND.surfacePanel,
    borderRadius: 10, padding: 8, gap: 8,
  },

  // Stepper chico para carrito
  stepperSm: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtnSm: {
    width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: BRAND.borderSofter,
    alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.surfaceSubtle,
  },

  removeBtn: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2',
  },
  removeTxt: { ...F, color: '#991b1b', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

  // Inputs
  input: {
    ...F,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingHorizontal: 10, minHeight: 40, backgroundColor: BRAND.surfacePanel, color: '#0f172a',
  },

  // Totales
  totals: { marginTop: 8, marginBottom: 8, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalNum: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

  // Botones
  btnBase: {
    minWidth: 110, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  btnPrimary: { backgroundColor: BRAND.hanBlue, borderColor: BRAND.hanBlue },
  btnSecondary: { backgroundColor: BRAND.surfacePanel, borderColor: BRAND.borderSoft },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnDanger: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  btnTextLight: { ...F, color: '#FFFFFF' },
  btnTextDark: { ...F, color: '#0f172a' },
});
