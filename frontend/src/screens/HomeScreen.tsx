import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Button, Alert, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { api } from '../api';
import { AuthContext } from '../providers/AuthContext';

type Product = { id: number; sku: string; name: string };

type ProductsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: Product[];
};

const HomeScreen: React.FC<any> = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);

  const [refreshing, setRefreshing] = useState(false);
  const [productsTotal, setProductsTotal] = useState<number | null>(null);
  const [customersTotal, setCustomersTotal] = useState<number | null>(null);
  const [warehousesTotal, setWarehousesTotal] = useState<number | null>(null);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);

  const tokenPreview = useMemo(() => (token ? token.slice(0, 28) + '...' : '(sin token)'), [token]);

  const fetchDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const [prod1, prod5] = await Promise.all([
        api.get<ProductsResponse>('/products', { params: { page: 1, pageSize: 1 } }),
        api.get<ProductsResponse>('/products', { params: { page: 1, pageSize: 5 } }),
      ]);
      setProductsTotal(prod1.data?.total ?? 0);
      setLatestProducts(prod5.data?.items ?? []);

      const custRes = await api.get('/customers', { params: { page: 1, pageSize: 1 } });
      setCustomersTotal(custRes.data?.total ?? 0);

      const whRes = await api.get('/warehouses');
      setWarehousesTotal(Array.isArray(whRes.data) ? whRes.data.length : 0);
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo cargar el tablero';
      Alert.alert('Error', String(msg));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return (
    <FlatList
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Inicio</Text>
          <Text style={styles.meta}>Token: {tokenPreview}</Text>

          {/* Accesos rápidos al CRUD */}
          <View style={styles.row}>
            <Button title="Productos" onPress={() => navigation.navigate('ProductsList')} />
            <Button title="Clientes" onPress={() => navigation.navigate('CustomersList')} />
            <Button title="Almacenes" onPress={() => navigation.navigate('WarehousesList')} />
          </View>

          {/* Métricas */}
          <View style={styles.cards}>
            <View style={styles.card}><Text style={styles.cardLabel}>Productos</Text><Text style={styles.cardValue}>{productsTotal ?? '...'}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>Clientes</Text><Text style={styles.cardValue}>{customersTotal ?? '...'}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>Almacenes</Text><Text style={styles.cardValue}>{warehousesTotal ?? '...'}</Text></View>
          </View>

          <Text style={{ fontWeight: '600', marginTop: 8, marginBottom: 4 }}>Ultimos productos</Text>
        </View>
      }
      data={latestProducts}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSub}>{item.sku}</Text>
          <View style={styles.rowRight}>
            <Button title="Editar" onPress={() => navigation.navigate('ProductForm', { id: item.id })} />
          </View>
        </View>
      )}
      ListEmptyComponent={<View style={{ padding: 16 }}><Text style={{ color: '#666' }}>No hay productos para mostrar.</Text></View>}
      ListFooterComponent={
        <View style={{ padding: 16 }}>
          <Button title="Cerrar sesion" onPress={logout} />
          <View style={{ height: 8 }} />
          <Button title="Refrescar tablero" onPress={fetchDashboard} />
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboard} />}
      ListHeaderComponentStyle={{ padding: 16, backgroundColor: '#fff' }}
      contentContainerStyle={{ backgroundColor: '#fff', paddingBottom: 24 }}
    />
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  header: { backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  meta: { color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginBottom: 12 },
  rowRight: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 6 },
  listItem: { padding: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  itemTitle: { fontSize: 16, fontWeight: '500' },
  itemSub: { fontSize: 12, color: '#666' },
  cards: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  card: { flex: 1, backgroundColor: '#f8f9fb', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eef0f4' },
  cardLabel: { color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '700' },
});
