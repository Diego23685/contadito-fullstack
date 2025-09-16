import React, { useCallback, useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { api } from '../../api';
import { AuthContext } from '../../providers/AuthContext';

type Product = { id: number; sku: string; name: string; description?: string | null; unit?: string | null; isService?: boolean; trackStock?: boolean; };
type ProductsResponse = { total: number; page: number; pageSize: number; items: Product[] };

const PAGE_SIZE = 10;

const ProductsList: React.FC<any> = ({ navigation }) => {
  const { logout } = useContext(AuthContext);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (reset: boolean) => {
    if (loading) return;
    try {
      setLoading(true);
      const nextPage = reset ? 1 : page + 1;
      const res = await api.get<ProductsResponse>('/products', { params: { page: nextPage, pageSize: PAGE_SIZE, q: q || undefined } });
      setTotal(res.data.total || 0);
      setPage(nextPage);
      setItems(reset ? res.data.items : [...items, ...res.data.items]);
    } catch (e: any) {
      if (e?.response?.status === 401) logout();
      const msg = e?.response?.data || e?.message || 'Error cargando productos';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  }, [page, q, items, loading, logout]);

  useEffect(() => { load(true); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (items.length < total) load(false);
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/products/${id}`);
      setItems((prev) => prev.filter(p => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo eliminar'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Filtros / acciones */}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre o SKU"
          value={q}
          onChangeText={setQ}
        />
        <Button title="Buscar" onPress={() => load(true)} />
        <Button title="Nuevo" onPress={() => navigation.navigate('ProductForm')} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.sub}>{item.sku}</Text>
            </View>
            <Button title="Editar" onPress={() => navigation.navigate('ProductForm', { id: item.id })} />
            <View style={{ width: 8 }} />
            <Button title="Eliminar" color="#b91c1c" onPress={() => remove(item.id)} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.3}
        onEndReached={onEndReached}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 12 }} /> : null}
        ListEmptyComponent={<View style={{ padding: 16 }}><Text style={{ color: '#666' }}>Sin resultados</Text></View>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

export default ProductsList;

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { color: '#666', fontSize: 12 },
});
