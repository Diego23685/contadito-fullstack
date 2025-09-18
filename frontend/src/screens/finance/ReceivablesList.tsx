import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';

export default function ReceivablesList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/dashboard');
      setItems(data?.receivablesDueSoon ?? []);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudieron cargar las cuentas por cobrar'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={items}
        keyExtractor={(x, i) => String(x.invoice_id ?? i)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>#{item.number} · {item.customer_name ?? 'Cliente'}</Text>
            <Text style={styles.sub}>Vence en {item.due_in_days} días · Monto: C${item.due_amount}</Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<View style={{ padding: 16 }}><Text style={{ color: '#666' }}>No hay cuentas próximas a vencer.</Text></View>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { padding: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { color: '#6b7280', fontSize: 12 },
});
