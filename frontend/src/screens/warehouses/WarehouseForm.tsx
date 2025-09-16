import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView } from 'react-native';
import { api } from '../../api';

type Warehouse = { id: number; name: string; address?: string | null; };

const WarehouseForm: React.FC<any> = ({ route, navigation }) => {
  const id: number | undefined = route?.params?.id;
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<Warehouse>(`/warehouses/${id}`);
        const w = res.data;
        setName(w.name || '');
        setAddress(w.address || '');
      } catch (e: any) {
        Alert.alert('Error', String(e?.response?.data || e?.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const save = async () => {
    try {
      setLoading(true);
      const payload = { name, address };
      if (isEdit) await api.put(`/warehouses/${id}`, payload);
      else await api.post('/warehouses', payload);
      Alert.alert('OK', 'Almacen guardado');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isEdit ? 'Editar almacen' : 'Nuevo almacen'}</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Direccion</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={address} onChangeText={setAddress} multiline />

      <View style={{ height: 12 }} />
      <Button title={loading ? 'Guardando...' : 'Guardar'} onPress={save} disabled={loading || !name} />
    </ScrollView>
  );
};

export default WarehouseForm;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, minHeight: 40 },
});
