// src/screens/warehouses/WarehouseForm.tsx — con fuente Apoka y UI mejorada
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Alert, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../../api';

type Warehouse = { id: number; name: string; address?: string | null };

// ====== Fuente Apoka (igual que en Receivables) ======
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

// ====== Tema rápido
const theme = {
  brand: '#7C3AED',
  brandDark: '#5B21B6',
  canvas: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E5E7EB',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
};

const MAX_ADDR = 240;

const WarehouseForm: React.FC<any> = ({ route, navigation }) => {
  const id: number | undefined = route?.params?.id;
  const isEdit = !!id;

  // Carga de fuente (no bloquea UI; aplica cuando está lista)
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Carga inicial si es edición
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

  const validate = () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return false;
    }
    setError(null);
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = { name: name.trim(), address: address.trim() || null };
      if (isEdit) await api.put(`/warehouses/${id}`, payload);
      else await api.post('/warehouses', payload);
      Alert.alert('Listo', 'Almacén guardado');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isEdit) return;
    Alert.alert(
      'Eliminar almacén',
      'Esta acción no se puede deshacer. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await api.delete(`/warehouses/${id}`);
              Alert.alert('Eliminado', 'El almacén fue eliminado.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', String(e?.response?.data || e?.message));
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.canvas }} contentContainerStyle={styles.wrapper}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{isEdit ? 'Editar almacén' : 'Nuevo almacén'}</Text>
            <Text style={styles.sub}>
              {isEdit ? 'Actualiza los datos del almacén.' : 'Completa la información para crear un almacén.'}
            </Text>
          </View>
          <Text style={[styles.badge, isEdit ? styles.badgeEdit : styles.badgeNew]}>
            {isEdit ? 'Edición' : 'Nuevo'}
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {/* Campo: nombre */}
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={name}
              onChangeText={(t) => { setName(t); if (error) setError(null); }}
              placeholder="Ej. Bodega Central"
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* Campo: dirección */}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Dirección</Text>
              <TextInput
                style={[styles.input, { height: 96, textAlignVertical: 'top' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Calle, número, referencias…"
                multiline
                maxLength={MAX_ADDR}
              />
              <Text style={styles.hint}>{address.length}/{MAX_ADDR} caracteres</Text>
            </View>

            {/* Botones */}
            <View style={styles.actionsRow}>
              <Pressable onPress={() => navigation.goBack()} style={[styles.btn, styles.btnGhost]} disabled={saving}>
                <Text style={[styles.btnText, styles.btnGhostText]}>Cancelar</Text>
              </Pressable>

              <Pressable onPress={save} style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.8 }]} disabled={saving || !name.trim()}>
                <Text style={styles.btnPrimaryText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </Pressable>
            </View>

            {isEdit && (
              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Zona peligrosa</Text>
                <Text style={styles.dangerText}>Eliminar este almacén permanentemente.</Text>
                <Pressable onPress={remove} style={[styles.btn, styles.btnDanger]} disabled={saving}>
                  <Text style={styles.btnDangerText}>{saving ? 'Procesando…' : 'Eliminar almacén'}</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default WarehouseForm;

const styles = StyleSheet.create({
  wrapper: { padding: 16 },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { ...F, fontSize: 20, color: theme.text },
  sub: { ...F, color: theme.muted, marginTop: 2 },
  badge: { ...F, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  badgeNew: { backgroundColor: '#ECFEFF', color: '#155E75' },
  badgeEdit: { backgroundColor: '#FEF3C7', color: '#92400E' },

  // Labels & Inputs
  label: { ...F, color: theme.text, marginTop: 14, marginBottom: 6 },
  input: {
    ...F,
    borderWidth: 1, borderColor: theme.border, borderRadius: 10,
    paddingHorizontal: 12, minHeight: 44, backgroundColor: '#fff',
  },
  inputError: { borderColor: '#FCA5A5' },
  hint: { ...F, color: theme.muted, fontSize: 12, marginTop: 6 },
  errorText: { ...F, color: theme.danger, marginTop: 6 },

  // Buttons
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: {
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flex: 1,
  },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.border },
  btnGhostText: { ...F, color: theme.text },

  btnPrimary: { backgroundColor: theme.brand },
  btnPrimaryText: { ...F, color: '#fff' },

  btnDanger: { backgroundColor: theme.danger },
  btnDangerText: { ...F, color: '#fff' },

  // Danger zone
  dangerZone: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 8,
  },
  dangerTitle: { ...F, color: theme.text },
  dangerText: { ...F, color: theme.muted },
});
