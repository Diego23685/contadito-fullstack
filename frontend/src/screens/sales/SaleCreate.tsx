// src/screens/sales/SaleCreate.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

type Customer = { id: number; name: string };
type Product = { id: number; name: string; sku: string; listPrice?: number };

// ===== Paleta de marca (misma del app) =====
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

/** Botón de marca */
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

export default function SaleCreate({ navigation }: any) {
  // Cargar fuente Apoka sin bloquear render
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const { width } = useWindowDimensions();
  const isWide = width >= 820;
  const isXL = width >= 1100;

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({}); // productId -> qty

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
      const custRes = await api.get('/customers', { params: { page: 1, pageSize: 50 } });
      setCustomers(custRes.data?.items ?? custRes.data ?? []);
      const prodRes = await api.get('/products', { params: { page: 1, pageSize: 500 } });
      const list = (prodRes.data?.items ?? prodRes.data ?? []).map((p: any) => ({
        id: p.id, name: p.name, sku: p.sku, listPrice: p.listPrice ?? 0,
      }));
      setProducts(list);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo cargar datos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---------- Carrito ----------
  const addToCart = (productId: number) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  };
  const decFromCart = (productId: number) => {
    setCart(prev => {
      const qty = (prev[productId] ?? 0) - 1;
      if (qty <= 0) {
        const copy: Record<number, number> = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: qty };
    });
  };
  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const copy: Record<number, number> = { ...prev };
      delete copy[productId];
      return copy;
    });
  };
  const clearCart = () => setCart({});

  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([id, qty]) => {
      const prod = products.find(p => p.id === Number(id));
      const price = prod?.listPrice ?? 0;
      return {
        id: Number(id),
        name: prod?.name ?? 'Producto',
        sku: prod?.sku ?? '',
        qty: Number(qty),
        price,
        line: price * Number(qty),
      };
    });
  }, [cart, products]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, it) => sum + it.line, 0),
    [cartItems]
  );

  // ---------- Filtro y grid ----------
  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    );
  }, [q, products]);

  const numColumns = isXL ? 4 : isWide ? 3 : 1;

  const saveSale = async () => {
    try {
      if (!selectedCustomer) {
        Alert.alert('Falta cliente', 'Selecciona un cliente antes de guardar.');
        return;
      }
      if (Object.keys(cart).length === 0) {
        Alert.alert('Carrito vacío', 'Agrega al menos un producto.');
        return;
      }
      setLoading(true);

      const items = Object.entries(cart).map(([pid, qty]) => {
        const prod = products.find(p => p.id === Number(pid));
        return {
          productId: Number(pid),
          quantity: Number(qty),
          unitPrice: prod?.listPrice ?? 0,
          description: prod?.name,
        };
      });

      const payload = { customerId: selectedCustomer.id, currency: 'NIO', items };
      const { data } = await api.post('/sales', payload);
      Alert.alert('Venta guardada', `Factura ${data.number} · Total ${money(data.total)}`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar la venta'));
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  const renderProduct = ({ item }: { item: Product }) => {
    const qty = cart[item.id] ?? 0;
    return (
      <View style={[styles.card, styles.productCard, numColumns > 1 && { flex: 1 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.prodTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.prodSub} numberOfLines={1}>{item.sku}</Text>
          <Text style={styles.prodPrice}>{money(item.listPrice ?? 0)}</Text>
        </View>
        {qty === 0 ? (
          <AButton title="Agregar" onPress={() => addToCart(item.id)} />
        ) : (
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => decFromCart(item.id)}>
              <Text style={styles.stepTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyTxt}>{qty}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => addToCart(item.id)}>
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
        {Object.keys(cart).length > 0 && (
          <TouchableOpacity onPress={clearCart}><Text style={styles.clearLink}>Vaciar</Text></TouchableOpacity>
        )}
      </View>

      <View style={{ marginBottom: 8 }}>
        <Text style={styles.sub}>Cliente</Text>
        {!selectedCustomer ? (
          <Text style={{ color: '#6B7280', ...F }}>Ninguno seleccionado.</Text>
        ) : (
          <Text style={{ fontWeight: Platform.OS === 'ios' ? '700' : 'bold', color: '#0f172a', ...F }}>
            {selectedCustomer.name}
          </Text>
        )}
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: BRAND.borderSoft, paddingTop: 8, gap: 8 }}>
        {cartItems.length === 0 ? (
          <Text style={{ color: '#6B7280', ...F }}>No hay productos en el carrito.</Text>
        ) : cartItems.map(it => (
          <View key={it.id} style={styles.cartRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text numberOfLines={1} style={{ fontWeight: Platform.OS === 'ios' ? '600' : 'bold', color: '#0f172a', ...F }}>{it.name}</Text>
              <Text style={styles.prodSub}>{it.sku}</Text>
              <Text style={styles.linePrice}>{money(it.price)} · {money(it.line)}</Text>
            </View>
            <View style={styles.stepperSm}>
              <TouchableOpacity style={styles.stepBtnSm} onPress={() => decFromCart(it.id)}>
                <Text style={styles.stepTxt}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyTxt}>{it.qty}</Text>
              <TouchableOpacity style={styles.stepBtnSm} onPress={() => addToCart(it.id)}>
                <Text style={styles.stepTxt}>＋</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(it.id)}>
              <Text style={styles.removeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <View style={styles.rowBetween}>
          <Text style={styles.mutedTxt}>Subtotal</Text>
          <Text style={styles.totalNum}>{money(subtotal)}</Text>
        </View>
      </View>

      <AButton
        title={loading ? 'Guardando…' : 'Guardar venta'}
        onPress={saveSale}
        disabled={loading || !selectedCustomer || cartItems.length === 0}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header: título y clientes como chips */}
      <View style={styles.header}>
        <Text style={styles.title}>Nueva venta</Text>
        <Text style={styles.sub}>Selecciona cliente:</Text>
        <FlatList
          data={customers}
          keyExtractor={(c) => String(c.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 8 }}
          renderItem={({ item }) => {
            const active = selectedCustomer?.id === item.id;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipSelected]}
                onPress={() => setSelectedCustomer(item)}
              >
                <Text style={{ ...F, color: active ? '#fff' : '#0f172a' }}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={{ color: '#6B7280', ...F }}>Sin clientes.</Text>}
        />
      </View>

      {/* Main responsive: izquierda productos, derecha carrito */}
      <View style={[styles.main, isWide && styles.mainWide]}>
        {/* IZQUIERDA: Búsqueda + grid de productos */}
        <View style={[styles.leftCol, isWide && styles.leftColWide]}>
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

          <FlatList
            data={filteredProducts}
            key={numColumns}
            keyExtractor={keyExtractor}
            renderItem={renderProduct}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
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

        {/* DERECHA: Resumen (sidebar). En móvil queda debajo. */}
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
  sub: { ...F, color: '#374151', marginTop: 8, marginBottom: 4 },

  // Chips cliente
  chip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    borderRadius: 999, marginRight: 8,
    backgroundColor: BRAND.surfacePanel,
  },
  chipSelected: { backgroundColor: BRAND.hanBlue, borderColor: BRAND.hanBlue },

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
    borderWidth: 1, borderColor: BRAND.borderSoft,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },

  // Producto
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prodTitle: { ...F, fontSize: 16, color: '#0f172a' },
  prodSub: { ...F, fontSize: 12, color: '#6B7280' },
  prodPrice: { ...F, marginTop: 6, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

  // Stepper grande
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
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.borderSoft, backgroundColor: BRAND.surfacePanel,
    borderRadius: 10, padding: 8, gap: 8,
  },
  linePrice: { ...F, marginTop: 2, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },

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

  // Totales
  totals: { marginTop: 8, marginBottom: 8, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mutedTxt: { ...F, color: '#6B7280' },
  totalNum: { ...F, fontSize: 16, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

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
