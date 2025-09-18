import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, StyleSheet, RefreshControl,
  ActivityIndicator, Pressable, useWindowDimensions, Platform
} from 'react-native';
import { api } from '../../api';

type Warehouse = { id: number; name: string; address?: string | null };

const WarehousesList: React.FC<any> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const columns = width >= 1280 ? 3 : width >= 900 ? 2 : 1;
  const isGrid = columns > 1;

  const [items, setItems] = useState<Warehouse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // UI state
  const [q, setQ] = useState('');
  const [onlyWithAddress, setOnlyWithAddress] = useState(false);
  const debounceRef = useRef<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<Warehouse[]>('/warehouses');
      setItems(res.data || []);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const doRemove = async (id: number) => {
    try {
      await api.delete(`/warehouses/${id}`);
      setItems(prev => prev.filter(w => w.id !== id));
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo eliminar'));
    }
  };

  const confirmRemove = (id: number) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('¿Seguro que deseas eliminar este almacén?');
      if (ok) doRemove(id);
      return;
    }
    Alert.alert('Eliminar', '¿Seguro que deseas eliminar este almacén?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doRemove(id) },
    ]);
  };

  // Búsqueda con debounce (actualiza solo el estado de q, el filtrado es en memoria)
  const [qEffective, setQEffective] = useState('');
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQEffective(q.trim().toLowerCase()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  const filtered = useMemo(() => {
    const list = items.filter(w => {
      if (onlyWithAddress && !w.address) return false;
      if (!qEffective) return true;
      const hay = `${w.name} ${w.address ?? ''}`.toLowerCase();
      return hay.includes(qEffective);
    });
    // Orden simple: nombre asc
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, qEffective, onlyWithAddress]);

  const Chip = ({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) => (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const ActionBtn = ({ title, onPress, kind = 'primary', disabled }: {
    title: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        kind === 'secondary' && styles.btnSecondary,
        kind === 'danger' && styles.btnDanger,
        disabled && styles.btnDisabled
      ]}
    >
      <Text style={[
        styles.btnText,
        kind === 'secondary' && styles.btnTextSecondary,
        kind === 'danger' && styles.btnTextPrimary
      ]}>{title}</Text>
    </Pressable>
  );

  const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
  );

  const renderItem = ({ item }: { item: Warehouse }) => {
    if (isGrid) {
      return (
        <Card style={{ flex: 1, margin: 6 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.itemSub} numberOfLines={2}>{item.address || 'Sin dirección'}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
              <ActionBtn title="Editar" kind="secondary" onPress={() => navigation.navigate('WarehouseForm', { id: item.id })} />
              <ActionBtn title="Eliminar" kind="danger" onPress={() => confirmRemove(item.id)} />
            </View>
          </View>
        </Card>
      );
    }

    return (
      <View style={styles.rowItem}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>{item.address || 'Sin dirección'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <ActionBtn title="Editar" kind="secondary" onPress={() => navigation.navigate('WarehouseForm', { id: item.id })} />
          <ActionBtn title="Eliminar" kind="danger" onPress={() => confirmRemove(item.id)} />
        </View>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.toolbarContainer}>
      <View style={styles.toolbarRow}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o dirección"
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
          />
          {!!q && (
            <Pressable onPress={() => setQ('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          )}
        </View>

        <ActionBtn title="Nuevo" onPress={() => navigation.navigate('WarehouseForm')} />
      </View>

      <View style={styles.toolbarRow}>
        <Chip
          label={onlyWithAddress ? 'Con dirección ✓' : 'Con dirección'}
          active={onlyWithAddress}
          onPress={() => setOnlyWithAddress(s => !s)}
        />
        <View style={{ width: 12 }} />
        <Text style={styles.toolbarLabel}>{filtered.length} de {items.length} almacenes</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {loading && items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(w) => String(w.id)}
          numColumns={columns}
          key={columns}
          columnWrapperStyle={isGrid ? { paddingHorizontal: 8 } : undefined}
          ListHeaderComponent={listHeader}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏬</Text>
              <Text style={styles.emptyTitle}>Sin almacenes</Text>
              <Text style={styles.emptyText}>Crea tu primer almacén para empezar a mover inventario.</Text>
              <View style={{ height: 8 }} />
              <ActionBtn title="Crear almacén" onPress={() => navigation.navigate('WarehouseForm')} />
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
};

export default WarehousesList;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7F9' },

  // Toolbar
  toolbarContainer: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 10,
    backgroundColor: '#F6F7F9'
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  toolbarLabel: { color: '#6B7280' },

  searchBox: { position: 'relative', flex: 1 },
  searchInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, height: 42,
    backgroundColor: '#fff'
  },
  clearBtn: {
    position: 'absolute', right: 8, top: 6, width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#EEF2FF'
  },
  clearText: { fontSize: 18, lineHeight: 18, color: '#374151' },

  // Chips
  chip: {
    borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, backgroundColor: '#FFF'
  },
  chipActive: { backgroundColor: '#0EA5E922', borderColor: '#0EA5E9' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#0369A1' },

  // Botones
  btn: {
    minWidth: 96, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#0EA5E9'
  },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  btnDanger: { backgroundColor: '#DC2626' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
  btnTextPrimary: { color: '#FFFFFF', fontWeight: '700' },
  btnTextSecondary: { color: '#111827', fontWeight: '700' },

  // Card (grid)
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: Platform.select({ android: 2, default: 0 }),
  },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  itemSub: { color: '#6B7280', fontSize: 12 },

  // Row (lista)
  rowItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
    borderBottomColor: '#E5E7EB', borderBottomWidth: 1, backgroundColor: '#fff', gap: 10
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  rowSub: { color: '#6B7280', fontSize: 12 },

  // Empty
  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#6B7280', textAlign: 'center' },
});
