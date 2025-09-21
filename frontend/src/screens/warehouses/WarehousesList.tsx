// src/screens/warehouses/WarehousesList.tsx — fuente Apoka + UI mejorada
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, StyleSheet, RefreshControl,
  ActivityIndicator, Pressable, useWindowDimensions, Platform
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../../api';

// ====== Theme rápido (match con otras pantallas mejoradas)
const t = {
  canvas: '#F6F7F9',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  brand: '#0EA5E9',
  brandDark: '#0369A1',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  chipBg: '#FFFFFF',
  chipBorder: '#D1D5DB',
};

// ====== Fuente Apoka (igual que Receivables)
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

type Warehouse = { id: number; name: string; address?: string | null };

function initialsOf(name?: string) {
  const s = (name || '').trim();
  if (!s) return 'A';
  const parts = s.split(/\s+/);
  return ((parts[0]?.[0] ?? 'A') + (parts[1]?.[0] ?? '')).toUpperCase();
}

const WarehousesList: React.FC<any> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const columns = width >= 1280 ? 3 : width >= 900 ? 2 : 1;
  const isGrid = columns > 1;

  // Fuente Apoka (no bloquea; se aplica al cargar)
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const [items, setItems] = useState<Warehouse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // UI state
  const [q, setQ] = useState('');
  const [onlyWithAddress, setOnlyWithAddress] = useState(false);
  const [sort, setSort] = useState<'name_asc' | 'name_desc'>('name_asc');
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
      const ok = (window as any).confirm?.('¿Seguro que deseas eliminar este almacén?');
      if (ok) doRemove(id);
      return;
    }
    Alert.alert('Eliminar', '¿Seguro que deseas eliminar este almacén?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doRemove(id) },
    ]);
  };

  // Búsqueda con debounce
  const [qEffective, setQEffective] = useState('');
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQEffective(q.trim().toLowerCase()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  const counts = useMemo(() => {
    const withAddr = items.filter(w => !!w.address?.trim()).length;
    return { total: items.length, withAddr, withoutAddr: items.length - withAddr };
  }, [items]);

  const filtered = useMemo(() => {
    const list = items.filter(w => {
      if (onlyWithAddress && !w.address) return false;
      if (!qEffective) return true;
      const hay = `${w.name} ${w.address ?? ''}`.toLowerCase();
      return hay.includes(qEffective);
    });
    list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (sort === 'name_desc') list.reverse();
    return list;
  }, [items, qEffective, onlyWithAddress, sort]);

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

  const RowCardHeader = ({ name }: { name: string }) => (
    <View style={styles.rowHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{initialsOf(name)}</Text>
      </View>
      <Text style={styles.itemTitle} numberOfLines={2}>{name}</Text>
    </View>
  );

  const AddressBadge = ({ has }: { has: boolean }) => (
    <Text style={[styles.badge, has ? styles.badgeOk : styles.badgeMuted]}>
      {has ? 'Con dirección' : 'Sin dirección'}
    </Text>
  );

  const renderItem = ({ item }: { item: Warehouse }) => {
    const hasAddr = !!item.address?.trim();

    if (isGrid) {
      return (
        <Card style={{ flex: 1, margin: 6 }}>
          <RowCardHeader name={item.name} />
          <Text style={styles.itemSub} numberOfLines={2}>{item.address || '—'}</Text>
          <View style={styles.cardFooter}>
            <AddressBadge has={hasAddr} />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <ActionBtn title="Editar" kind="secondary" onPress={() => navigation.navigate('WarehouseForm', { id: item.id })} />
              <ActionBtn title="Eliminar" kind="danger" onPress={() => confirmRemove(item.id)} />
            </View>
          </View>
        </Card>
      );
    }

    return (
      <View style={styles.rowItem}>
        <RowCardHeader name={item.name} />
        <Text style={styles.rowSub} numberOfLines={1}>{item.address || '—'}</Text>
        <View style={styles.rowFooter}>
          <AddressBadge has={hasAddr} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <ActionBtn title="Editar" kind="secondary" onPress={() => navigation.navigate('WarehouseForm', { id: item.id })} />
            <ActionBtn title="Eliminar" kind="danger" onPress={() => confirmRemove(item.id)} />
          </View>
        </View>
      </View>
    );
  };

  const cycleSort = () => setSort(s => (s === 'name_asc' ? 'name_desc' : 'name_asc'));

  const listHeader = (
    <View style={styles.toolbarContainer}>
      {/* Row 1: Búsqueda + acciones rápidas */}
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

        <Pressable onPress={cycleSort} style={styles.sortBtn}>
          <Text style={styles.sortText}>{sort === 'name_asc' ? 'A–Z' : 'Z–A'}</Text>
        </Pressable>

        <Pressable onPress={onRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>Refrescar</Text>
        </Pressable>

        <ActionBtn title="Nuevo" onPress={() => navigation.navigate('WarehouseForm')} />
      </View>

      {/* Row 2: Filtros + meta */}
      <View style={styles.toolbarRow}>
        <Chip
          label={onlyWithAddress ? 'Con dirección ✓' : 'Con dirección'}
          active={onlyWithAddress}
          onPress={() => setOnlyWithAddress(s => !s)}
        />
        <View style={{ flex: 1 }} />

        <View style={styles.statsRow}>
          <Text style={styles.statPill}>Total: {counts.total}</Text>
          <Text style={[styles.statPill, styles.statOk]}>Con dirección: {counts.withAddr}</Text>
          <Text style={[styles.statPill, styles.statMuted]}>Sin dirección: {counts.withoutAddr}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{filtered.length} de {items.length} almacenes</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {loading && items.length === 0 ? (
        <View style={{ padding: 12 }}>
          {/* Skeletons responsivos */}
          <View style={[styles.skeletonRow, isGrid && { gap: 12 }]}>
            {Array.from({ length: isGrid ? columns : 1 }).map((_, i) => (
              <View key={`sk-${i}`} style={[styles.card, { flex: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.avatar, { backgroundColor: '#EEF2F7' }]} />
                  <View style={{ height: 14, backgroundColor: '#EEF2F7', borderRadius: 6, flex: 1 }} />
                </View>
                <View style={{ height: 10 }} />
                <View style={{ height: 12, backgroundColor: '#EEF2F7', borderRadius: 6 }} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <>
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
            contentContainerStyle={{ paddingBottom: 96 }}
          />

          {/* FAB Nuevo */}
          <Pressable onPress={() => navigation.navigate('WarehouseForm')} style={styles.fab} accessibilityLabel="Nuevo almacén">
            <Text style={styles.fabText}>＋</Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

export default WarehousesList;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.canvas },

  // Toolbar
  toolbarContainer: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, gap: 10, backgroundColor: t.canvas },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },

  toolbarLabel: { ...F, color: t.muted },

  searchBox: { position: 'relative', flex: 1 },
  searchInput: { ...F, borderWidth: 1, borderColor: t.chipBorder, borderRadius: 10, paddingHorizontal: 12, height: 42, backgroundColor: '#fff', paddingRight: 34 },
  clearBtn: { position: 'absolute', right: 6, top: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  clearText: { ...F, fontSize: 18, lineHeight: 18, color: '#374151' },

  sortBtn: { paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#111827', minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  sortText: { ...F, color: '#fff', fontWeight: '800' },

  refreshBtn: { paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: t.chipBorder, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  refreshText: { ...F, color: t.text, fontWeight: '800' },

  // Stats pills
  statsRow: { flexDirection: 'row', gap: 6 },
  statPill: { ...F, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EEF2F7', color: '#0F172A' },
  statOk: { backgroundColor: '#DCFCE7', color: '#14532D' },
  statMuted: { backgroundColor: '#E5E7EB', color: '#1F2937' },

  metaRow: { paddingHorizontal: 12, paddingBottom: 8 },
  metaText: { ...F, color: t.muted },

  // Chips
  chip: { borderWidth: 1, borderColor: t.chipBorder, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: t.chipBg },
  chipActive: { backgroundColor: '#0EA5E922', borderColor: t.brand },
  chipText: { ...F, color: '#374151' },
  chipTextActive: { ...F, color: t.brandDark },

  // Botones
  btn: { minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.brand },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: t.chipBorder },
  btnDanger: { backgroundColor: t.danger },
  btnDisabled: { opacity: 0.6 },

  btnText: { ...F, color: '#FFFFFF', fontWeight: '800' },
  btnTextPrimary: { ...F, color: '#FFFFFF', fontWeight: '800' },
  btnTextSecondary: { ...F, color: '#111827', fontWeight: '800' },

  // Card (grid)
  card: {
    flex: 1,
    backgroundColor: t.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1, borderColor: t.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: Platform.select({ android: 2, default: 0 }),
    gap: 8,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E7FF' },
  avatarTxt: { ...F, fontWeight: '900', color: '#3730A3' },
  itemTitle: { ...F, fontSize: 16, fontWeight: '800', color: t.text },
  itemSub: { ...F, color: t.muted, fontSize: 12 },
  badge: { ...F, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E5E7EB', color: '#1F2937' },
  badgeOk: { backgroundColor: '#DCFCE7', color: '#14532D' },
  badgeMuted: { backgroundColor: '#F3F4F6', color: '#374151' },
  cardFooter: { marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Row (lista)
  rowItem: { gap: 6, paddingVertical: 12, paddingHorizontal: 12, borderBottomColor: t.border, borderBottomWidth: 1, backgroundColor: '#fff' },
  rowSub: { ...F, color: t.muted, fontSize: 12 },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Empty
  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { ...F, fontSize: 40 },
  emptyTitle: { ...F, fontSize: 18, fontWeight: '900', color: t.text },
  emptyText: { ...F, color: t.muted, textAlign: 'center' },

  // Skeleton
  skeletonRow: { flexDirection: 'row' },

  // FAB
  fab: { position: 'absolute', right: 16, bottom: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { ...F, color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 24 },
});
