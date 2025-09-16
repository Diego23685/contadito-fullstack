import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView } from 'react-native';
import { api } from '../../api';

type Customer = { id: number; name: string; email?: string | null; phone?: string | null; documentId?: string | null; address?: string | null; };

const CustomerForm: React.FC<any> = ({ route, navigation }) => {
  const id: number | undefined = route?.params?.id;
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<Customer>(`/customers/${id}`);
        const c = res.data;
        setName(c.name || '');
        setEmail(c.email || '');
        setPhone(c.phone || '');
        setDocumentId(c.documentId || '');
        setAddress(c.address || '');
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
      const payload = { name, email, phone, documentId, address };
      if (isEdit) await api.put(`/customers/${id}`, payload);
      else await api.post('/customers', payload);
      Alert.alert('OK', 'Cliente guardado');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

      <Text style={styles.label}>Telefono</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.label}>Documento</Text>
      <TextInput style={styles.input} value={documentId} onChangeText={setDocumentId} />

      <Text style={styles.label}>Direccion</Text>
      <TextInput style={[styles.input, { height: 80 }]} multiline value={address} onChangeText={setAddress} />

      <View style={{ height: 12 }} />
      <Button title={loading ? 'Guardando...' : 'Guardar'} onPress={save} disabled={loading || !name} />
    </ScrollView>
  );
};

export default CustomerForm;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, minHeight: 40 },
});
