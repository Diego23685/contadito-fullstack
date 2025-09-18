// src/screens/purchases/PurchaseCreate.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { api } from '../../api';

type Product = { id: number; name: string; sku: string; stdCost?: number | null };
type CartLine = { productId: number; name: string; sku: string; qty: number; unitCost: number };

export default function PurchaseCreate({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isWide = width >= 820;
  const isXL = width >= 1100;

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [taxRateStr, setTaxRateStr] = useState('');      // % opcional (cabecera)
  const [discRateStr, setDiscRateStr] = useState('');    // % opcional (cabecera)
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
    const n = Number(String(v).replace(',', '.'));
    setCart(prev => prev[id] ? { ...prev, [id]: { ...prev[id], unitCost: isFinite(n) ? n : 0 } } : prev);
  };
  const clear = () => setCart({});

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  }, [q, products]);

  const numColumns = isXL ? 4 : isWide ? 3 : 1;

  const cartItems = useMemo(() => Object.values(cart), [cart]);

  const subtotal = useMemo(
    () => cartItems.reduce((s, l) => s + l.qty * l.unitCost, 0),
    [cartItems]
  );
  const taxRate = Number((taxRateStr || '0').replace(',', '.')) || 0;   // %
  const discRate = Number((discRateStr || '0').replace(',', '.')) || 0; // %
  const discountAmt = Math.round((subtotal * discRate) as number) / 100; // mostramos % directo? mejor calcular bien:
  const _disc = Math.round((subtotal * (discRate / 100)) * 100) / 100;
  const baseAfterDisc = subtotal - _disc;
  const taxAmt = Math.round((baseAfterDisc * (taxRate / 100)) * 100) / 100;
  const total = Math.round((baseAfterDisc + taxAmt) * 100) / 100;

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
          // Puedes pasar por línea taxRate/discountRate si quieres sobreescribir la cabecera
        })),
      };
      // solo enviamos tasas si el usuario escribió algo
      if (taxRateStr.trim() !== '') payload.taxRate = Number((taxRateStr || '0').replace(',', '.'));
      if (discRateStr.trim() !== '') payload.discountRate = Number((discRateStr || '0').replace(',', '.'));

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
          <Button title="Agregar" onPress={() => add(item)} />
        ) : (
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => dec(item.id)}>
              <Text style={styles.stepTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyTxt}>{line.qty}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => add(item)}>
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
            />
          </View>
        </View>
      </View>

      {/* Líneas */}
      <View style={{ borderTopWidth: 1, borderTopColor: '#eef0f4', paddingTop: 10, gap: 8 }}>
        {cartItems.length === 0 ? (
          <Text style={{ color: '#6b7280' }}>No hay productos en el carrito.</Text>
        ) : cartItems.map(l => (
          <View key={l.productId} style={styles.cartRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text numberOfLines={1} style={{ fontWeight: '600' }}>{l.name}</Text>
              <Text style={styles.prodSub}>{l.sku}</Text>
              <Text style={styles.linePrice}>{money(l.unitCost)} · {money(l.unitCost * l.qty)}</Text>
            </View>

            <View style={styles.stepperSm}>
              <TouchableOpacity style={styles.stepBtnSm} onPress={() => dec(l.productId)}>
                <Text style={styles.stepTxt}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyTxt}>{l.qty}</Text>
              <TouchableOpacity style={styles.stepBtnSm} onPress={() => add({ id: l.productId, name: l.name, sku: l.sku, stdCost: l.unitCost })}>
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
        <View style={styles.rowBetween}><Text style={styles.muted}>Subtotal</Text><Text style={styles.totalNum}>{money(subtotal)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Descuento ({discRate}%)</Text><Text style={styles.totalNum}>− {money(_disc)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Impuesto ({taxRate}%)</Text><Text style={styles.totalNum}>{money(taxAmt)}</Text></View>
        <View style={[styles.rowBetween, { borderTopWidth: 1, borderTopColor: '#eef0f4', paddingTop: 8 }]}>
          <Text style={{ fontWeight: '800' }}>Total</Text>
          <Text style={[styles.totalNum, { fontSize: 18 }]}>{money(total)}</Text>
        </View>
      </View>

      <Button
        title={loading ? 'Guardando...' : 'Guardar compra'}
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
            returnKeyType="search"
          />
          <View style={{ width: 8 }} />
          <Button title="Limpiar" onPress={() => setQ('')} />
        </View>
      </View>

      {/* Main responsive */}
      <View style={[styles.main, isWide && styles.mainWide]}>
        {/* IZQ: grid de productos */}
        <View style={[styles.leftCol, isWide && styles.leftColWide]}>
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
              <Text style={{ color: '#6b7280', padding: 12 }}>
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  main: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  mainWide: { flexDirection: 'row', gap: 16 },
  leftCol: { flex: 1 },
  leftColWide: { flex: 7 },
  rightCol: { marginTop: 12 },
  rightColWide: { flex: 5, marginTop: 0 },

  // Textos
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  label: { marginBottom: 6, fontWeight: '600' },
  smallLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  muted: { color: '#6b7280' },

  // Búsqueda
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  search: {
    flex: 1,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, minHeight: 42,
  },

  // Cards
  card: {
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eef0f4',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  // Producto
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prodTitle: { fontSize: 16, fontWeight: '600' },
  prodSub: { fontSize: 12, color: '#6b7280' },
  prodMeta: { marginTop: 6, color: '#374151' },

  // Stepper (grid)
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 4,
  },
  stepBtn: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6',
  },
  stepTxt: { fontSize: 18, fontWeight: '800' },
  qtyTxt: { minWidth: 28, textAlign: 'center', fontWeight: '700' },

  // Carrito (sidebar)
  cartPanel: { gap: 10 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartTitle: { fontSize: 16, fontWeight: '800' },
  clearLink: { color: '#b91c1c', fontWeight: '700' },

  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1, borderColor: '#eef0f4', backgroundColor: '#fff',
    borderRadius: 10, padding: 8, gap: 8,
  },

  // Stepper chico para carrito
  stepperSm: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtnSm: {
    width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6',
  },

  removeBtn: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2',
  },
  removeTxt: { color: '#991b1b', fontWeight: '800' },

  // Inputs
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 10, minHeight: 40, backgroundColor: '#fff',
  },

  // Totales
  totals: { marginTop: 8, marginBottom: 8, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalNum: { fontWeight: '800' },
});
