import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Switch, Button, Alert, StyleSheet, ScrollView } from 'react-native';
import { api } from '../../api';

type Product = { id: number; tenantId: number; sku: string; name: string; description?: string | null; unit?: string | null; isService?: boolean; trackStock?: boolean; };

const ProductForm: React.FC<any> = ({ route, navigation }) => {
  const id: number | undefined = route?.params?.id;
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [description, setDescription] = useState('');
  const [isService, setIsService] = useState(false);
  const [trackStock, setTrackStock] = useState(true);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<Product>(`/products/${id}`);
        const p = res.data;
        setSku(p.sku);
        setName(p.name);
        setUnit(p.unit || 'unidad');
        setDescription(p.description || '');
        setIsService(!!p.isService);
        setTrackStock(!!p.trackStock);
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
      if (isEdit) {
        // OJO: por tu backend, el Update NO acepta cambiar SKU
        await api.put(`/products/${id}`, {
          name, description, unit, isService, trackStock,
        });
      } else {
        await api.post('/products', {
          sku, name, description, unit, isService, trackStock,
        });
      }
      Alert.alert('OK', 'Producto guardado');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isEdit ? 'Editar producto' : 'Nuevo producto'}</Text>
      <Text style={styles.label}>SKU {isEdit ? '(no editable)' : ''}</Text>
      <TextInput style={[styles.input, isEdit && styles.disabled]} value={sku} onChangeText={setSku} editable={!isEdit} />

      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Unidad</Text>
      <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="unidad, kg, lt" />

      <Text style={styles.label}>Descripcion</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} multiline />

      <View style={styles.row}>
        <Text>Es servicio</Text>
        <Switch value={isService} onValueChange={setIsService} />
      </View>
      <View style={styles.row}>
        <Text>Controla stock</Text>
        <Switch value={trackStock} onValueChange={setTrackStock} />
      </View>

      <View style={{ height: 12 }} />
      <Button title={loading ? 'Guardando...' : 'Guardar'} onPress={save} disabled={loading || (!isEdit && !sku)} />
    </ScrollView>
  );
};

export default ProductForm;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, minHeight: 40 },
  disabled: { backgroundColor: '#f3f4f6' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
});
