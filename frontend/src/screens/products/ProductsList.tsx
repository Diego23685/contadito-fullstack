import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, StyleSheet, RefreshControl,
  ActivityIndicator, Pressable, useWindowDimensions, Platform
} from 'react-native';
import { api } from '../../api';
import { AuthContext } from '../../providers/AuthContext';

type Product = {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  isService?: boolean;
  trackStock?: boolean;
  listPrice?: number;
};
type ProductsResponse = { total: number; page: number; pageSize: number; items: Product[] };

const PAGE_SIZE = 12;

type FilterKind = 'all' | 'product' | 'service';
type SortKey = 'name' | 'price';

const currency = (v?: number) =>
  new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(Number(v ?? 0));

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

const ProductsList: React.FC<any> = ({ navigation }) => {
  const { logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const columns = width >= 1280 ? 3 : width >= 900 ? 2 : 1;
  const isGrid = columns > 1;

  const [q, setQ] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<FilterKind>('all');
  const [onlyStock, setOnlyStock] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const debounceRef = useRef<any>(null);

  const params = useMemo(() => ({
    q: q || undefined,
    kind: filter,
    onlyStock,
    sort: sortKey,
    dir: sortAsc ? 'asc' : 'desc'
  }), [q, filter, onlyStock, sortKey, sortAsc]);

  const serverParams = useMemo(() => {
    return { q: params.q, sort: params.sort, dir: params.dir, filter: params.kind, onlyStock: params.onlyStock };
  }, [params]);

  const load = useCallback(async (reset: boolean) => {
    if (loading) return;
    try {
      setLoading(true);
      const nextPage = reset ? 1 : page + 1;
      const res = await api.get<ProductsResponse>('/products', {
        params: { page: nextPage, pageSize: PAGE_SIZE, ...serverParams }
      });
      setTotal(res.data.total || 0);
      setPage(nextPage);
      setItems(reset ? res.data.items : [...items, ...res.data.items]);
    } catch (e: any) {
      if (e?.response?.status === 401) logout();
      const msg = e?.response?.data || e?.message || 'Error cargando productos';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  }, [loading, page, items, logout, serverParams]);

  useEffect(() => { load(true); }, []); // primera carga

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(true), 350);
    return () => clearTimeout(debounceRef.current);
  }, [q, filter, onlyStock, sortKey, sortAsc]); // eslint-disable-line

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (!loading && items.length < total) load(false);
  };

  const doRemove = async (id: number) => {
    try {
      await api.delete(`/products/${id}`);
      setItems((prev) => prev.filter(p => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo eliminar'));
    }
  };

  const confirmRemove = (id: number) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('¿Seguro que deseas eliminar este producto?');
      if (ok) doRemove(id);
      return;
    }
    Alert.alert('Eliminar', '¿Seguro que deseas eliminar este producto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doRemove(id) },
    ]);
  };

  const renderItem = ({ item }: { item: Product }) => {
    if (isGrid) {
      return (
        <Card style={{ flex: 1, margin: 6 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.name}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {item.isService ? (
                  <View style={[styles.badge, styles.badgeInfo]}><Text style={styles.badgeText}>Servicio</Text></View>
                ) : (
                  <View style={[styles.badge, styles.badgeSuccess]}><Text style={styles.badgeText}>Producto</Text></View>
                )}
                {!item.isService && item.trackStock && (
                  <View style={[styles.badge, styles.badgeNeutral]}><Text style={styles.badgeText}>Stock</Text></View>
                )}
              </View>
            </View>
            <Text style={styles.itemSub}>{item.sku}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.price}>{currency(item.listPrice)}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <ActionBtn title="Editar" kind="secondary" onPress={() => navigation.navigate('ProductForm', { id: item.id })} />
                <ActionBtn title="Eliminar" kind="danger" onPress={() => confirmRemove(item.id)} />
              </View>
            </View>
          </View>
        </Card>
      );
    }
    return (
      <View style={styles.rowItem}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>{item.sku} · {currency(item.listPrice)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {item.isService ? (
            <View style={[styles.badge, styles.badgeInfo]}><Text style={styles.badgeText}>Serv.</Text></View>
          ) : (
            <View style={[styles.badge, styles.badgeSuccess]}><Text style={styles.badgeText}>Prod.</Text></View>
          )}
          {!item.isService && item.trackStock && (
            <View style={[styles.badge, styles.badgeNeutral]}><Text style={styles.badgeText}>Stock</Text></View>
          )}
          <ActionBtn title="Editar" kind="secondary" onPress={() => navigation.navigate('ProductForm', { id: item.id })} />
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
            placeholder="Buscar por nombre o SKU"
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
        <ActionBtn title="Nuevo" onPress={() => navigation.navigate('ProductForm')} />
      </View>
      <View style={styles.toolbarRow}>
        <Chip label="Todos" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Productos" active={filter === 'product'} onPress={() => setFilter('product')} />
        <Chip label="Servicios" active={filter === 'service'} onPress={() => setFilter('service')} />
        <Chip label={onlyStock ? 'Con Stock ✓' : 'Con Stock'} active={onlyStock} onPress={() => setOnlyStock(s => !s)} />
        <View style={{ width: 12 }} />
        <Text style={styles.toolbarLabel}>Ordenar por</Text>
        <Chip label={`Nombre ${sortKey === 'name' ? (sortAsc ? '↑' : '↓') : ''}`}
              active={sortKey === 'name'}
              onPress={() => { setSortKey('name'); setSortAsc(k => sortKey === 'name' ? !k : true); }} />
        <Chip label={`Precio ${sortKey === 'price' ? (sortAsc ? '↑' : '↓') : ''}`}
              active={sortKey === 'price'}
              onPress={() => { setSortKey('price'); setSortAsc(k => sortKey === 'price' ? !k : true); }} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{items.length} de {total} resultados</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
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
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyText}>Intenta ajustar la búsqueda o crea un nuevo producto.</Text>
              <View style={{ height: 8 }} />
              <ActionBtn title="Crear producto" onPress={() => navigation.navigate('ProductForm')} />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

export default ProductsList;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7F9' },
  toolbarContainer: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 10, backgroundColor: '#F6F7F9' },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  toolbarLabel: { color: '#6B7280' },
  searchBox: { position: 'relative', flex: 1 },
  searchInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, height: 42, backgroundColor: '#fff' },
  clearBtn: { position: 'absolute', right: 8, top: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#EEF2FF' },
  clearText: { fontSize: 18, lineHeight: 18, color: '#374151' },
  chip: { borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFF' },
  chipActive: { backgroundColor: '#0EA5E922', borderColor: '#0EA5E9' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#0369A1' },
  btn: { minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0EA5E9' },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  btnDanger: { backgroundColor: '#DC2626' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
  btnTextPrimary: { color: '#FFFFFF', fontWeight: '700' },
  btnTextSecondary: { color: '#111827', fontWeight: '700' },
  card: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: Platform.select({ android: 2, default: 0 }) },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  itemSub: { color: '#6B7280', fontSize: 12 },
  price: { fontSize: 16, fontWeight: '800', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  badgeInfo: { backgroundColor: '#3B82F6' },
  badgeSuccess: { backgroundColor: '#10B981' },
  badgeNeutral: { backgroundColor: '#6B7280' },
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomColor: '#E5E7EB', borderBottomWidth: 1, backgroundColor: '#fff', gap: 10 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  rowSub: { color: '#6B7280', fontSize: 12 },
  metaRow: { paddingHorizontal: 12, paddingBottom: 8 },
  metaText: { color: '#6B7280' },
  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#6B7280', textAlign: 'center' },
});
