// src/screens/warehouses/WarehouseForm.tsx — UI mejorada + Apoka theme + fuente Apoka
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../../api';

type Warehouse = { id: number; name: string; address?: string | null };

/** ====== Fuente Apoka (igual que Receivables) ====== */
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

/** ====== Tema Apoka (colores) ====== */
const apoka = {
  brand: '#7C3AED',
  brandStrong: '#5B21B6',
  brandSoftBg: '#F5F3FF',
  brandSoftBorder: '#DDD6FE',

  text: '#0F172A',
  muted: '#64748B',
  border: '#E5E7EB',

  card: '#FFFFFF',
  canvas: '#F8FAFC',

  successBg: '#ECFDF5',
  successText: '#065F46',

  warnBg: '#FEF3C7',
  warnText: '#92400E',

  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  dangerBorder: '#FECACA',
};

const MAX_ADDR = 240;

const WarehouseForm: React.FC<any> = ({ route, navigation }) => {
  const id: number | undefined = route?.params?.id;
  const isEdit = !!id;

  // Carga no bloqueante de la fuente
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [errorName, setErrorName] = useState<string | null>(null);

  // Estado de pista para hints
  const charsLeft = useMemo(() => Math.max(0, MAX_ADDR - address.length), [address]);

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
      setErrorName('El nombre es obligatorio.');
      return false;
    }
    setErrorName(null);
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

  // Header badge
  const badgeTone = isEdit
    ? { bg: apoka.warnBg, fg: apoka.warnText, label: 'Edición' }
    : { bg: apoka.brandSoftBg, fg: apoka.brandStrong, label: 'Nuevo' };

  return (
    <View style={{ flex: 1, backgroundColor: apoka.canvas }}>
      {/* ===== Top bar ===== */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEdit ? 'Editar almacén' : 'Nuevo almacén'}</Text>
          <Text style={styles.subtitle}>
            {isEdit ? 'Actualiza los datos del almacén.' : 'Completa la información para crearlo.'}
          </Text>
        </View>

        <View style={styles.topRight}>
          <Text style={[styles.badge, { backgroundColor: badgeTone.bg, color: badgeTone.fg }]}>
            {badgeTone.label}
          </Text>

          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.btnSm, styles.btnGhost]}
            disabled={saving}
          >
            <Text style={[styles.btnGhostText, styles.btnSmText]}>Cancelar</Text>
          </Pressable>

          <Pressable
            onPress={save}
            style={[styles.btnSm, styles.btnPrimary, (saving || !name.trim()) && { opacity: 0.8 }]}
            disabled={saving || !name.trim()}
          >
            <Text style={[styles.btnPrimaryText, styles.btnSmText]}>{saving ? 'Guardando…' : 'Guardar'}</Text>
          </Pressable>
        </View>
      </View>

      {/* ===== Body ===== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, isWide && styles.containerWide]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Columna principal */}
        <View style={[styles.col, isWide && styles.colLeft]}>
          <View style={styles.card}>
            {loading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : (
              <>
                {/* Nombre */}
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={[styles.input, errorName && styles.inputError]}
                  value={name}
                  onChangeText={(t) => { setName(t); if (errorName) setErrorName(null); }}
                  placeholder="Ej. Bodega Central"
                />
                {!!errorName && <Text style={styles.errorText}>{errorName}</Text>}

                {/* Dirección */}
                <View style={{ marginTop: 12 }}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Dirección</Text>
                    <Text style={styles.hintSmall}>{address.length}/{MAX_ADDR}</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Calle, número, referencias…"
                    multiline
                    maxLength={MAX_ADDR}
                  />
                  <Text style={styles.hint}>
                    {charsLeft === 0 ? 'Límite alcanzado' : 'Opcional · Ayuda a tus repartidores a encontrar el lugar'}
                  </Text>
                </View>

                {/* Acciones locales (para pantallas medianas) */}
                {!isWide && (
                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => navigation.goBack()}
                      style={[styles.btn, styles.btnGhost]}
                      disabled={saving}
                    >
                      <Text style={styles.btnGhostText}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                      onPress={save}
                      style={[styles.btn, styles.btnPrimary, (saving || !name.trim()) && { opacity: 0.8 }]}
                      disabled={saving || !name.trim()}
                    >
                      <Text style={styles.btnPrimaryText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Danger zone — solo edición en columna principal si no hay panel lateral */}
          {!isWide && isEdit && (
            <View style={[styles.card, styles.dzCard]}>
              <Text style={styles.dangerTitle}>Zona peligrosa</Text>
              <Text style={styles.dangerText}>Eliminar este almacén permanentemente.</Text>
              <Pressable onPress={remove} style={[styles.btn, styles.btnDanger]} disabled={saving}>
                <Text style={styles.btnDangerText}>{saving ? 'Procesando…' : 'Eliminar almacén'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Panel lateral (solo en amplio) */}
        {isWide && (
          <View style={[styles.col, styles.colRight]}>
            {/* Tarjeta de ayuda / tips */}
            <View style={styles.sideCard}>
              <Text style={styles.sideTitle}>Consejos rápidos</Text>
              <Text style={styles.tip}>• Usa nombres cortos y claros (ej. “Central”, “Sucursal León”).</Text>
              <Text style={styles.tip}>• La dirección es opcional, pero mejora la logística.</Text>
              <Text style={styles.tip}>• Puedes editar o eliminar el almacén más adelante.</Text>
            </View>

            {/* Danger zone en lateral */}
            {isEdit && (
              <View style={[styles.sideCard, styles.dzCard]}>
                <Text style={styles.dangerTitle}>Zona peligrosa</Text>
                <Text style={styles.dangerText}>Eliminar este almacén permanentemente.</Text>
                <Pressable onPress={remove} style={[styles.btn, styles.btnDanger]} disabled={saving}>
                  <Text style={styles.btnDangerText}>{saving ? 'Procesando…' : 'Eliminar almacén'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer pegajoso (móvil/chico) */}
      {!isWide && (
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <Text style={styles.footerText}>
              {isEdit ? 'Editando almacén' : 'Nuevo almacén'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={[styles.btnSm, styles.btnGhost]}
                disabled={saving}
              >
                <Text style={[styles.btnGhostText, styles.btnSmText]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={save}
                style={[styles.btnSm, styles.btnPrimary, (saving || !name.trim()) && { opacity: 0.8 }]}
                disabled={saving || !name.trim()}
              >
                <Text style={[styles.btnPrimaryText, styles.btnSmText]}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default WarehouseForm;

const styles = StyleSheet.create({
  // Top bar
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: apoka.card,
    borderBottomWidth: 1,
    borderBottomColor: apoka.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { ...F, fontSize: 20, color: apoka.text },
  subtitle: { ...F, color: apoka.muted, marginTop: 2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  badge: {
    ...F,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: apoka.brandSoftBorder,
    marginRight: 6,
  },

  container: { padding: 16, gap: 16 },
  containerWide: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  col: { gap: 16, flex: 1 },
  colLeft: { flex: 2, minWidth: 0 },
  colRight: { flex: 1, minWidth: 320 },

  card: {
    backgroundColor: apoka.card,
    borderWidth: 1,
    borderColor: apoka.border,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  sideCard: {
    backgroundColor: apoka.card,
    borderWidth: 1,
    borderColor: apoka.border,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  sideTitle: { ...F, color: apoka.text, fontSize: 14, marginBottom: 4 },
  tip: { ...F, color: apoka.muted },

  // Labels & Inputs
  label: { ...F, color: apoka.text, marginTop: 6, marginBottom: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hintSmall: { ...F, color: apoka.muted, fontSize: 12 },

  input: {
    ...F,
    borderWidth: 1,
    borderColor: apoka.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#FCA5A5' },
  hint: { ...F, color: apoka.muted, fontSize: 12, marginTop: 6 },
  errorText: { ...F, color: apoka.danger, marginTop: 6 },

  // Buttons (grandes)
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: apoka.border },
  btnGhostText: { ...F, color: apoka.text },

  btnPrimary: { backgroundColor: apoka.brand },
  btnPrimaryText: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },

  btnDanger: { backgroundColor: apoka.danger },
  btnDangerText: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },

  // Buttons (pequeños del header/footer)
  btnSm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: apoka.border,
    backgroundColor: '#fff',
  },
  btnSmText: { ...F, fontSize: 13 },
  btnPrimarySm: { backgroundColor: apoka.brand, borderColor: apoka.brand },
  btnPrimarySmText: { ...F, color: '#fff' },

  // Danger zone
  dzCard: {
    borderColor: apoka.dangerBorder,
    backgroundColor: apoka.dangerBg,
  },
  dangerTitle: { ...F, color: apoka.text, fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },
  dangerText: { ...F, color: apoka.muted, marginBottom: 8 },

  // Footer pegajoso (móvil)
  footer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: apoka.card,
    borderTopWidth: 1, borderTopColor: apoka.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  footerInner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: { ...F, color: apoka.muted },
});
