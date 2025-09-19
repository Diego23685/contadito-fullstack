import React, { useContext, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Pressable, Platform } from 'react-native';
import { api } from '../../api';
import { AuthContext } from '../../providers/AuthContext';

const ActionBtn = ({ title, onPress, kind='primary', disabled }: any) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.btn,
      kind === 'secondary' && styles.btnSecondary,
      disabled && { opacity: 0.6 }
    ]}
  >
    <Text style={[styles.btnText, kind === 'secondary' && styles.btnTextSecondary]}>{title}</Text>
  </Pressable>
);

export default function ReceivableCreate({ navigation }: any) {
  const { logout } = useContext(AuthContext);

  const [customerId, setCustomerId] = useState('');     // simple: ID numérico
  const [number, setNumber] = useState('');
  const [dueAt, setDueAt] = useState('');               // 'YYYY-MM-DD' opcional
  const [total, setTotal] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cid = Number(customerId);
    const tot = Number(total);
    if (!cid || tot <= 0) {
      Alert.alert('Faltan datos', 'Cliente y Total son obligatorios (total > 0).');
      return;
    }

    try {
      setSaving(true);
      await api.post('/receivables', {
        customerId: cid,
        number: number || undefined,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        total: tot,
        notes: notes || undefined,
      });
      Alert.alert('Listo', 'Cuenta por cobrar creada.');
      navigation.goBack();
    } catch (e: any) {
      if (e?.response?.status === 401) logout();
      const msg = e?.response?.data || e?.message || 'No se pudo crear';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#F6F7F9', gap: 12 }}>
      <Text style={styles.title}>Nueva cuenta por cobrar</Text>

      <View style={styles.card}>
        <Text style={styles.label}>ID Cliente</Text>
        <TextInput value={customerId} onChangeText={setCustomerId} keyboardType="number-pad" placeholder="Ej. 1" style={styles.input} />

        <Text style={styles.label}>Número (opcional)</Text>
        <TextInput value={number} onChangeText={setNumber} placeholder="FAC-000123" style={styles.input} />

        <Text style={styles.label}>Vence (opcional, YYYY-MM-DD)</Text>
        <TextInput value={dueAt} onChangeText={setDueAt} placeholder="2025-09-30" style={styles.input} />

        <Text style={styles.label}>Total</Text>
        <TextInput value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0.00" style={styles.input} />

        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Observaciones" style={[styles.input, { height: 90, textAlignVertical: 'top' }]} multiline />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ActionBtn title="Cancelar" kind="secondary" onPress={() => navigation.goBack()} disabled={saving} />
        <ActionBtn title={saving ? 'Guardando...' : 'Guardar'} onPress={save} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: Platform.select({ android: 2, default: 0 }),
    gap: 10
  },
  label: { color: '#111827', fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, minHeight: 42, backgroundColor: '#fff'
  },
  btn: { minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0EA5E9' },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
  btnTextSecondary: { color: '#111827', fontWeight: '700' },
});
