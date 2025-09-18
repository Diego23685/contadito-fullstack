import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Button, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api';

type Result = { kind: 'producto' | 'cliente'; id: number; title: string; subtitle?: string };

export default function GlobalSearch({ route, navigation }: any) {
  const initialQ: string = route?.params?.q ?? '';
  const [q, setQ] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Result[]>([]);

  const run = useCallback(async () => {
    try {
      setLoading(true);

      // Productos (filtrado client-side si backend no tiene ?search)
      const prodRes = await api.get('/products', { params: { page: 1, pageSize: 50 } });
      const prods: Result[] = (prodRes.data?.items ?? prodRes.data ?? [])
        .filter((p: any) => !q || (p.name?.toLowerCase().includes(q.toLowerCase()) || p.sku?.toLowerCase().includes(q.toLowerCase())))
        .slice(0, 25)
        .map((p: any) => ({ kind: 'producto', id: p.id, title: p.name, subtitle: p.sku }));

      // Clientes
      const custRes = await api.get('/customers', { params: { page: 1, pageSize: 50 } });
      const custs: Result[] = (custRes.data?.items ?? custRes.data ?? [])
        .filter((c: any) => !q || (c.name?.toLowerCase().includes(q.toLowerCase()) || c.email?.toLowerCase().includes(q.toLowerCase())))
        .slice(0, 25)
        .map((c: any) => ({ kind: 'cliente', id: c.id, title: c.name, subtitle: c.email }));

      setItems([...prods, ...custs]);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo buscar'));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { run(); }, [run]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.toolbar}>
        <TextInput
          placeholder="Buscar..."
          value={q}
          onChangeText={setQ}
          onSubmitEditing={run}
          style={styles.input}
          returnKeyType="search"
        />
        <Button title="Buscar" onPress={run} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => `${it.kind}-${it.id}`}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.title}</Text>
            {!!item.subtitle && <Text style={styles.sub}>{item.subtitle}</Text>}
            <View style={{ marginTop: 6, flexDirection: 'row', gap: 8 }}>
              {item.kind === 'producto' ? (
                <Button title="Ver" onPress={() => navigation.navigate('ProductForm', { id: item.id })} />
              ) : (
                <Button title="Ver" onPress={() => navigation.navigate('CustomerForm', { id: item.id })} />
              )}
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={run} />}
        ListEmptyComponent={<View style={{ padding: 16 }}><Text style={{ color: '#666' }}>Sin resultados.</Text></View>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, minHeight: 40 },
  item: { padding: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { color: '#6b7280', fontSize: 12 },
});
