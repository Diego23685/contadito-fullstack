import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, StyleSheet, RefreshControl,
  ActivityIndicator, Pressable, useWindowDimensions, Platform
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../../api';
import { AuthContext } from '../../providers/AuthContext';

type Customer = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  address?: string | null;
};
type CustomersResponse = { total: number; page: number; pageSize: number; items: Customer[] };

const PAGE_SIZE = 12;

type FilterKind = 'all' | 'withEmail' | 'withPhone';
type SortKey = 'name' | 'recent';

const onlyDigits = (v: string) => v.replace(/[^\d+]/g, '');
const prettyPhone = (v?: string | null) => {
  const d = onlyDigits(v || '');
  if (!d) return '';
  if (d.startsWith('+')) return d.replace(/(\+\d{1,3})(\d{3,4})(\d{0,4})(\d{0,4})/, '$1 $2 $3 $4').trim();
  return d.replace(/(\d{3,4})(\d{0,4})(\d{0,4})/, '$1 $2 $3').trim();
};

// Avatar simple con iniciales (sin dependencias)
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('');
};
const colorFrom = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 70%, 85%)`;
};

// Helper de fuente (evita problemas con weights en Android)
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

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
    <Text
      style={[
        styles.btnText,
        kind === 'secondary' && styles.btnTextSecondary,
        kind === 'danger' && styles.btnTextPrimary
      ]}
    >
      {title}
    </Text>
  </Pressable>
);

const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const CustomersList: React.FC<any> = ({ navigation }) => {
  const { logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const columns = width >= 1280 ? 3 : width >= 900 ? 2 : 1;
  const isGrid = columns > 1;

  // Carga no-bloqueante de la fuente (se aplica cuando esté lista)
  useFonts({
    Apoka: require('../../../assets/fonts/apokaregular.ttf'),
  });

  const [q, setQ] = useState('');
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<FilterKind>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const debounceRef = useRef<any>(null);

  const serverParams = useMemo(() => ({
    q: q || undefined,
    filter,
    sort: sortKey,
    dir: sortAsc ? 'asc' : 'desc'
  }), [q, filter, sortKey, sortAsc]);

  const load = useCallback(async (reset: boolean) => {
    if (loading) return;
    try {
      setLoading(true);
      const nextPage = reset ? 1 : page + 1;
      const res = await api.get<CustomersResponse>('/customers', {
        params: { page: nextPage, pageSize: PAGE_SIZE, ...serverParams }
      });
      setTotal(res.data.total || 0);
      setPage(nextPage);
      setItems(reset ? res.data.items : [...items, ...res.data.items]);
    } catch (e: any) {
      if (e?.response?.status === 401) logout();
      const msg = e?.response?.data || e?.message || 'Error cargando clientes';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  }, [loading, page, items, logout, serverParams]);

  useEffect(() => { load(true); /* primera carga */ }, []); // eslint-disable-line

  // Debounce para búsqueda/filtros/orden
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(true), 350);
    return () => clearTimeout(debounceRef.current);
  }, [q, filter, sortKey, sortAsc]); // eslint-disable-line

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (!loading && items.length < total) load(false);
  };

  // --- FIX: separar doRemove y manejar web vs nativo en confirmRemove ---

  const doRemove = async (id: number) => {
    try {
      setDeletingId(id);
      await api.delete(`/customers/${id}`);
      setItems(prev => prev.filter(p => p.id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo eliminar'));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmRemove = (id: number) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('¿Seguro que deseas eliminar este cliente?');
      if (ok) doRemove(id);
      return;
    }
    Alert.alert('Eliminar', '¿Seguro que deseas eliminar este cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doRemove(id) },
    ]);
  };

  const renderItem = ({ item }: { item: Customer }) => {
    const avatarBg = colorFrom(item.name || item.email || String(item.id));
    const inits = initials(item.name || item.email || '?');
    const phoneNice = prettyPhone(item.phone);
    const isDeleting = deletingId === item.id;

    if (isGrid) {
      return (
        <Card style={{ flex: 1, margin: 6 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              <Text style={styles.avatarText}>{inits}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemSub} numberOfLines={1}>{item.email || 'sin email'}</Text>
              {!!phoneNice && <Text style={styles.itemSub} numberOfLines={1}>{phoneNice}</Text>}
            </View>
          </View>

          <View style={{ height: 10 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {!!item.documentId && <View style={[styles.badge, styles.badgeNeutral]}><Text style={styles.badgeText}>Doc.</Text></View>}
              {!!item.address && <View style={[styles.badge, styles.badgeInfo]}><Text style={styles.badgeText}>Dirección</Text></View>}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <ActionBtn title="Editar" kind="secondary" onPress={() => navigation.navigate('CustomerForm', { id: item.id })} />
              <ActionBtn title={isDeleting ? 'Eliminando…' : 'Eliminar'} kind="danger" onPress={() => confirmRemove(item.id)} disabled={isDeleting} />
            </View>
          </View>
        </Card>
      );
    }

    // Fila lista
    return (
      <View style={styles.rowItem}>
        <View style={[styles.avatar, { backgroundColor: avatarBg, marginRight: 10 }]}>
          <Text style={styles.avatarText}>{inits}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>{item.email || 'sin email'}{phoneNice ? ` · ${phoneNice}` : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {!!item.documentId && <View style={[styles.badge, styles.badgeNeutral]}><Text style={styles.badgeText}>Doc.</Text></View>}
          {!!item.address && <View style={[styles.badge, styles.badgeInfo]}><Text style={styles.badgeText}>Dir.</Text></View>}
          <ActionBtn title="Editar" kind="secondary" onPress={() => navigation.navigate('CustomerForm', { id: item.id })} />
          <ActionBtn title={isDeleting ? 'Eliminando…' : 'Eliminar'} kind="danger" onPress={() => confirmRemove(item.id)} disabled={isDeleting} />
        </View>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.toolbarContainer}>
      {/* Fila 1: Búsqueda + CTA */}
      <View style={styles.toolbarRow}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, email o teléfono"
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
        <ActionBtn title="Nuevo" onPress={() => navigation.navigate('CustomerForm')} />
      </View>

      {/* Fila 2: Filtros & Orden */}
      <View style={styles.toolbarRow}>
        <Chip label="Todos" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Con Email" active={filter === 'withEmail'} onPress={() => setFilter('withEmail')} />
        <Chip label="Con Teléfono" active={filter === 'withPhone'} onPress={() => setFilter('withPhone')} />
        <View style={{ width: 12 }} />
        <Text style={styles.toolbarLabel}>Ordenar por</Text>
        <Chip
          label={`Nombre ${sortKey === 'name' ? (sortAsc ? '↑' : '↓') : ''}`}
          active={sortKey === 'name'}
          onPress={() => { setSortKey('name'); setSortAsc(k => sortKey === 'name' ? !k : true); }}
        />
        <Chip
          label={`Recientes ${sortKey === 'recent' ? (sortAsc ? '↑' : '↓') : ''}`}
          active={sortKey === 'recent'}
          onPress={() => { setSortKey('recent'); setSortAsc(k => sortKey === 'recent' ? !k : false); }}
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{items.length} de {total} clientes</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(c) => String(c.id)}
        numColumns={columns}
        key={columns}
        columnWrapperStyle={isGrid ? { paddingHorizontal: 8 } : undefined}
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.3}
        onEndReached={onEndReached}
        ListFooterComponent={
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            {loading ? <ActivityIndicator /> : (items.length < total ? <ActionBtn title="Cargar más" kind="secondary" onPress={() => load(false)} /> : null)}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyTitle}>No hay clientes</Text>
              <Text style={styles.emptyText}>Empieza creando tu primer cliente para facturar más rápido.</Text>
              <View style={{ height: 8 }} />
              <ActionBtn title="Crear cliente" onPress={() => navigation.navigate('CustomerForm')} />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

export default CustomersList;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7F9' },

  // Header/toolbar
  toolbarContainer: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 10,
    backgroundColor: '#F6F7F9'
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  toolbarLabel: { ...F, color: '#6B7280' },

  searchBox: { position: 'relative', flex: 1 },
  searchInput: {
    ...F,
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, height: 42,
    backgroundColor: '#fff', fontSize: 16
  },
  clearBtn: {
    position: 'absolute', right: 8, top: 6, width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#EEF2FF'
  },
  clearText: { ...F, fontSize: 18, lineHeight: 18, color: '#374151' },

  chip: {
    borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, backgroundColor: '#FFF'
  },
  chipActive: { backgroundColor: '#0EA5E922', borderColor: '#0EA5E9' },
  chipText: { ...F, color: '#374151' },
  chipTextActive: { ...F, color: '#0369A1' },

  // Botones
  btn: {
    minWidth: 96, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#0EA5E9'
  },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  btnDanger: { backgroundColor: '#DC2626' },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...F, color: '#FFFFFF' },
  btnTextPrimary: { ...F, color: '#FFFFFF' },
  btnTextSecondary: { ...F, color: '#111827' },

  // Grid card
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: Platform.select({ android: 2, default: 0 }),
  },

  avatar: {
    width: 42, height: 42, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { ...F, color: '#111827' },

  itemTitle: { ...F, fontSize: 16, color: '#111827' },
  itemSub: { ...F, color: '#6B7280', fontSize: 12 },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { ...F, fontSize: 11, color: '#fff' },
  badgeInfo: { backgroundColor: '#3B82F6' },
  badgeNeutral: { backgroundColor: '#6B7280' },

  // Row list
  rowItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
    borderBottomColor: '#E5E7EB', borderBottomWidth: 1, backgroundColor: '#fff', gap: 10
  },
  rowTitle: { ...F, fontSize: 16, color: '#111827' },
  rowSub: { ...F, color: '#6B7280', fontSize: 12 },

  // Meta/empty
  metaRow: { paddingHorizontal: 12, paddingBottom: 8 },
  metaText: { ...F, color: '#6B7280' },

  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { ...F, fontSize: 18 },
  emptyText: { ...F, color: '#6B7280', textAlign: 'center' },
});
