// src/screens/products/ProductsList.tsx
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, StyleSheet, RefreshControl,
  ActivityIndicator, Pressable, useWindowDimensions, Platform
} from 'react-native';
import { useFonts } from 'expo-font';
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
  stockQty?: number;
  lowStock?: boolean;
};
type ProductsResponse = { total: number; page: number; pageSize: number; items: Product[] };

const PAGE_SIZE = 12;

type FilterKind = 'all' | 'product' | 'service';
type SortKey = 'name' | 'price';

const currency = (v?: number) =>
  new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(Number(v ?? 0));

// ===== Paleta de marca (la que pasaste) =====
const BRAND = {
  primary:       '#2563EB',
  primary500:    '#3B82F6',
  primary600:    '#2563EB',
  primary700:    '#1D4ED8',
  purple:        '#7C3AED',
  purple600:     '#6D28D9',
  teal:          '#14B8A6',
  green:         '#10B981',
  slate900:      '#0F172A',
  slate700:      '#334155',
  slate500:      '#64748B',

  bg:            '#EEF2FF',
  surface:       '#FFFFFF',
  surfaceSubtle: '#F7F9FF',
  surfacePanel:  '#FFFFFF',

  cardShadow: 'rgba(37, 99, 235, 0.16)',   // sombra azul tenue
  cardShadowLg: 'rgba(37, 99, 235, 0.22)', // para hover/tooltip

  border:        '#E6EBFF',
  borderSoft:    '#E6EBFF',
  borderSofter:  '#EDF1FF',
  trackSoft:     '#ECF2FF',

  // compat con nombres previos
  hanBlue:       '#4458C7',
  iris:          '#5A44C7',
  maximumBlue:   '#44AAC7',
  verdigris:     '#43BFB7',
  surfaceTint:   '#EEF2FF',
  accent:        '#3B82F6',
  accentAlt:     '#5A44C7',
} as const;

// Tipografía Apoka
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
    <Text style={[
      styles.btnText,
      kind === 'secondary' && styles.btnTextSecondary,
      (kind === 'primary' || kind === 'danger') && styles.btnTextPrimary
    ]}>{title}</Text>
  </Pressable>
);

const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// Badge de stock
const StockBadge = ({ qty, unit, low }: { qty?: number; unit?: string | null; low?: boolean }) => {
  if (qty == null) return null;
  return (
    <View style={[styles.badge, low ? styles.badgeDanger : styles.badgeNeutral]}>
      <Text style={styles.badgeText}>{`Stock: ${Number(qty)}${unit ? ` ${unit}` : ''}`}</Text>
    </View>
  );
};

const ProductsList: React.FC<any> = ({ navigation }) => {
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

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

  // caché de stock
  const stockCache = useRef<Map<number, number>>(new Map());

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

  const hydrateStock = useCallback(async (prods: Product[]) => {
    const ids = prods
      .filter(p => !p.isService && p.trackStock && !stockCache.current.has(p.id))
      .map(p => p.id);

    if (ids.length === 0) return;

    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await api.get<{ productId: number; qty: number }>(`/inventory/products/${id}/stock`);
            return { id, qty: r.data?.qty ?? 0 };
          } catch {
            return { id, qty: undefined as unknown as number };
          }
        })
      );

      const incoming = new Map(results.map(x => [x.id, x.qty]));
      results.forEach(({ id, qty }) => {
        if (qty != null) stockCache.current.set(id, qty);
      });

      setItems(prev =>
        prev.map(p =>
          incoming.has(p.id)
            ? { ...p, stockQty: incoming.get(p.id) as number }
            : p
        )
      );
    } catch (err) {
      console.warn('No se pudo hidratar stock', err);
    }
  }, []);

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

      const justLoaded = res.data.items;
      const merged = reset ? justLoaded : [...items, ...justLoaded];

      const withCachedStock = merged.map(p =>
        (!p.isService && p.trackStock && stockCache.current.has(p.id))
          ? { ...p, stockQty: stockCache.current.get(p.id) }
          : p
      );

      setItems(withCachedStock);
      hydrateStock(justLoaded);
    } catch (e: any) {
      if (e?.response?.status === 401) logout();
      const msg = e?.response?.data || e?.message || 'Error cargando productos';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  }, [loading, page, items, logout, serverParams, hydrateStock]);

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
      stockCache.current.delete(id);
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

            {!item.isService && item.trackStock && (
              <StockBadge qty={item.stockQty} unit={item.unit} />
            )}

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
            <>
              <View style={[styles.badge, styles.badgeNeutral]}><Text style={styles.badgeText}>Stock</Text></View>
              <StockBadge qty={item.stockQty} unit={item.unit} />
            </>
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
            placeholderTextColor="#9aa7c2"
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
  screen: { flex: 1, backgroundColor: BRAND.bg },

  // Toolbar (fondo lechoso + sombra azul)
  toolbarContainer: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1, borderBottomColor: BRAND.borderSoft,
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
    // @ts-ignore (RNW)
    backdropFilter: 'saturate(140%) blur(6px)',
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  toolbarLabel: { color: BRAND.slate500, ...F },

  searchBox: { position: 'relative', flex: 1, minWidth: 220 },
  searchInput: {
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingHorizontal: 12, height: 42, backgroundColor: BRAND.surfacePanel, ...F, color: BRAND.slate900
  },
  clearBtn: {
    position: 'absolute', right: 8, top: 6, width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center', borderRadius: 15,
    backgroundColor: BRAND.surfaceSubtle, borderWidth: 1, borderColor: BRAND.borderSoft
  },
  clearText: { fontSize: 18, lineHeight: 18, color: BRAND.slate700, ...F },

  // Chips
  chip: {
    borderWidth: 1, borderColor: BRAND.borderSoft,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
    backgroundColor: BRAND.surfacePanel
  },
  chipActive: { backgroundColor: '#E9EDFF', borderColor: BRAND.primary600 },
  chipText: { color: BRAND.slate700, ...F },
  chipTextActive: { color: BRAND.primary600, fontWeight: Platform.OS === 'ios' ? '600' : 'bold', ...F },

  // Botones
  btn: {
    minWidth: 96, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, backgroundColor: BRAND.primary600, borderWidth: 1, borderColor: BRAND.primary600
  },
  btnSecondary: { backgroundColor: BRAND.surfacePanel, borderWidth: 1, borderColor: BRAND.borderSoft },
  btnDanger: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  btnDisabled: { opacity: 0.6 },

  btnText: { ...F },
  btnTextPrimary: { color: '#FFFFFF', fontWeight: Platform.OS === 'ios' ? '600' : 'bold', ...F },
  btnTextSecondary: { color: BRAND.slate900, fontWeight: Platform.OS === 'ios' ? '600' : 'bold', ...F },

  // Card (sombra azul y borde superior acento)
  card: {
    flex: 1,
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    borderTopWidth: 3, borderTopColor: BRAND.primary600,
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12,
    elevation: Platform.select({ android: 3, default: 0 }),
  },

  // Texto
  itemTitle: { fontSize: 16, color: BRAND.slate900, fontWeight: Platform.OS === 'ios' ? '600' : 'bold', ...F },
  itemSub: { color: BRAND.slate500, fontSize: 12, ...F },
  price: { fontSize: 16, fontWeight: Platform.OS === 'ios' ? '700' : '800', color: BRAND.primary600, ...F },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700', ...F },
  badgeInfo: { backgroundColor: BRAND.accentAlt },
  badgeSuccess: { backgroundColor: BRAND.green },
  badgeNeutral: { backgroundColor: BRAND.slate500 },
  badgeDanger: { backgroundColor: '#DC2626' },

  // Lista en filas
  rowItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderBottomColor: BRAND.borderSofter, borderBottomWidth: 1,
    backgroundColor: BRAND.surfacePanel, gap: 10
  },
  rowTitle: { fontSize: 16, color: BRAND.slate900, fontWeight: Platform.OS === 'ios' ? '600' : 'bold', ...F },
  rowSub: { color: BRAND.slate500, fontSize: 12, ...F },

  // Meta / Empty
  metaRow: { paddingHorizontal: 12, paddingBottom: 8 },
  metaText: { color: BRAND.slate500, ...F },

  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: Platform.OS === 'ios' ? '600' : 'bold', color: BRAND.slate900, ...F },
  emptyText: { color: BRAND.slate500, textAlign: 'center', ...F },
});
