// src/screens/sales/SaleCreate.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';

type Customer = { id: number; name: string };
type Product = { id: number; name: string; sku: string; listPrice?: number };

export default function SaleCreate({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({}); // productId -> qty

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const custRes = await api.get('/customers', { params: { page: 1, pageSize: 50 } });
      // customers endpoint devuelve { total, page, pageSize, items } o lista directa según tu backend
      setCustomers(custRes.data?.items ?? custRes.data ?? []);
      const prodRes = await api.get('/products', { params: { page: 1, pageSize: 100 } });
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

  const addToCart = (productId: number) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  };
  const removeFromCart = (productId: number) => {
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

  const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const prod = products.find(p => p.id === Number(id));
    const price = prod?.listPrice ?? 0;
    return sum + price * Number(qty);
  }, 0);

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

      const payload = {
        customerId: selectedCustomer.id,
        currency: 'NIO',
        items,
        // Puedes setear tasas globales aqui si quieres:
        // taxRate: 15,
        // discountRate: 0,
      };

      const { data } = await api.post('/sales', payload);
      Alert.alert('Venta guardada', `Factura ${data.number} · Total C$ ${data.total}`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar la venta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nueva venta</Text>

      {/* Cliente */}
      <Text style={styles.sub}>Selecciona cliente:</Text>
      <FlatList
        data={customers}
        keyExtractor={(c) => String(c.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.customerBtn,
              selectedCustomer?.id === item.id && styles.customerBtnSelected,
            ]}
            onPress={() => setSelectedCustomer(item)}
          >
            <Text style={{ color: selectedCustomer?.id === item.id ? '#fff' : '#111' }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Productos */}
      <Text style={styles.sub}>Productos (toca para agregar):</Text>
      <FlatList
        data={products}
        keyExtractor={(p) => String(p.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => {
          const qty = cart[item.id] ?? 0;
          return (
            <TouchableOpacity style={styles.productItem} onPress={() => addToCart(item.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodTitle}>{item.name}</Text>
                <Text style={styles.prodSub}>{item.sku} · C${item.listPrice ?? 0}</Text>
              </View>
              {qty > 0 && (
                <View style={styles.qtyBox}>
                  <Button title="-" onPress={() => removeFromCart(item.id)} />
                  <Text style={{ marginHorizontal: 8 }}>{qty}</Text>
                  <Button title="+" onPress={() => addToCart(item.id)} />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={{ color: '#666', padding: 12 }}>No hay productos.</Text>}
        style={{ flexGrow: 0, maxHeight: 250 }}
      />

      {/* Subtotal y acciones */}
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700' }}>Subtotal: C${subtotal.toFixed(2)}</Text>
        <Button title={loading ? 'Guardando...' : 'Guardar venta'} onPress={saveSale} disabled={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#374151', marginTop: 12, marginBottom: 4, fontWeight: '600' },
  customerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginRight: 8,
  },
  customerBtnSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  prodTitle: { fontSize: 16, fontWeight: '500' },
  prodSub: { fontSize: 12, color: '#6b7280' },
  qtyBox: { flexDirection: 'row', alignItems: 'center' },
});
