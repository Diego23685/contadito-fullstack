import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../../api';

type Product = { id: number; name: string; sku: string; stdCost?: number | null };
type CartLine = { productId: number; name: string; qty: number; unitCost: number };

export default function PurchaseCreate({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [cart, setCart] = useState<Record<number, CartLine>>({}); // id -> line

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', { params: { page: 1, pageSize: 100 } });
      const items: Product[] = res.data?.items ?? res.data ?? [];
      setProducts(items);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo cargar productos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = (p: Product) => {
    setCart(prev => {
      const line = prev[p.id] ?? { productId: p.id, name: p.name, qty: 0, unitCost: Number(p.stdCost ?? 0) };
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
  const setCost = (id: number, v: string) => {
    const n = Number(v.replace(',', '.'));
    setCart(prev => prev[id] ? { ...prev, [id]: { ...prev[id], unitCost: isFinite(n) ? n : 0 } } : prev);
  };

  const subtotal = useMemo(() =>
    Object.values(cart).reduce((s, l) => s + l.qty * l.unitCost, 0), [cart]);

  const save = async () => {
    if (Object.keys(cart).length === 0) {
      Alert.alert('Carrito vacío', 'Agrega al menos un producto.');
      return;
    }
    try {
      const payload = {
        supplierName: supplierName || null,
        currency: 'NIO',
        items: Object.values(cart).map(l => ({
          productId: l.productId,
          description: l.name,
          quantity: l.qty,
          unitCost: l.unitCost,
        }))
      };
      const { data } = await api.post('/purchases', payload);
      Alert.alert('Compra registrada', `#${data.number ?? data.Number} · Total C$ ${data.total ?? data.Total}`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar la compra'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nueva compra</Text>

      <Text style={styles.label}>Proveedor (opcional)</Text>
      <TextInput style={styles.input} value={supplierName} onChangeText={setSupplierName} placeholder="Nombre del proveedor" />

      <Text style={styles.sub}>Productos (toca para agregar):</Text>
      <FlatList
        data={products}
        keyExtractor={(p) => String(p.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => {
          const line = cart[item.id];
          return (
            <TouchableOpacity style={styles.productItem} onPress={() => add(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodTitle}>{item.name}</Text>
                <Text style={styles.prodSub}>{item.sku}</Text>
              </View>
              {line && (
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={styles.row}>
                    <Button title="-" onPress={() => dec(item.id)} />
                    <Text style={{ marginHorizontal: 8 }}>{line.qty}</Text>
                    <Button title="+" onPress={() => add(item)} />
                  </View>
                  <View style={{ height: 6 }} />
                  <View style={styles.row}>
                    <Text style={{ marginRight: 6 }}>Costo:</Text>
                    <TextInput
                      style={[styles.input, { width: 100, height: 36 }]}
                      keyboardType="decimal-pad"
                      value={String(line.unitCost)}
                      onChangeText={(v) => setCost(item.id, v)}
                    />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={{ color: '#666', padding: 12 }}>No hay productos.</Text>}
        style={{ flexGrow: 0, maxHeight: 280 }}
      />

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700' }}>Subtotal: C${subtotal.toFixed(2)}</Text>
        <Button title="Guardar compra" onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#374151', marginTop: 12, marginBottom: 4, fontWeight: '600' },
  label: { marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, minHeight: 40 },
  row: { flexDirection: 'row', alignItems: 'center' },
  productItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomColor: '#eee', borderBottomWidth: 1 },
  prodTitle: { fontSize: 16, fontWeight: '500' },
  prodSub: { fontSize: 12, color: '#6b7280' },
});
