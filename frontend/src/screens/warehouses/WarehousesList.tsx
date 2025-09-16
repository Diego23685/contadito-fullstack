import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert, StyleSheet, RefreshControl } from 'react-native';
import { api } from '../../api';

type Warehouse = { id: number; name: string; address?: string | null; };

const WarehousesList: React.FC<any> = ({ navigation }) => {
  const [items, setItems] = useState<Warehouse[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<Warehouse[]>('/warehouses');
      setItems(res.data || []);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message));
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/warehouses/${id}`);
      setItems(prev => prev.filter(w => w.id !== id));
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.toolbar}>
        <Button title="Nuevo" onPress={() => navigation.navigate('WarehouseForm')} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(w) => String(w.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.sub}>{item.address || 'Sin direccion'}</Text>
            </View>
            <Button title="Editar" onPress={() => navigation.navigate('WarehouseForm', { id: item.id })} />
            <View style={{ width: 8 }} />
            <Button title="Eliminar" color="#b91c1c" onPress={() => remove(item.id)} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<View style={{ padding: 16 }}><Text style={{ color: '#666' }}>Sin almacenes</Text></View>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

export default WarehousesList;

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { color: '#666', fontSize: 12 },
});
