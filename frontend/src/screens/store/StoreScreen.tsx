import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../../api';

type Item = {
  id: number;
  sku: string;
  name: string;
  price: number;       // COALESCE(public_price, list_price)
  slug?: string | null;
  description?: string | null;
  images?: string[];   // opcional (URLs)
};

type RouteParams = {
  tenantId?: number | string; // 5 ó "DemoPyme"
  slugOrName?: string;        // alternativo si pasas nombre
};

type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'name_asc';

const money = (n?: number) =>
  new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n ?? 0);

export default function StoreFront() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const { tenantId, slugOrName } = (route.params ?? {}) as RouteParams;
  const tenantRef = (tenantId ?? slugOrName ?? '').toString(); // admite numérico o nombre

  // UI state
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('relevance');

  // server paging
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [total, setTotal] = useState(0);

  // data
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // grid cols
  const cols = useMemo(() => {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
  }, [width]);

  const endpointBase = useMemo(() => {
    // /store/{id|slug}/products
    return isNaN(Number(tenantRef))
      ? `/store/${tenantRef}/products`
      : `/store/${Number(tenantRef)}/products`;
  }, [tenantRef]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canLoadMore = items.length < total;

  const mapItems = (raw: any[]): Item[] =>
    (raw ?? []).map((x: any) => ({
      id: x.id ?? x.Id,
      sku: x.sku ?? x.Sku,
      name: x.name ?? x.Name,
      price: Number(x.price ?? x.Price ?? 0),
      slug: x.slug ?? x.Slug,
      description: x.description ?? x.Description,
      images: x.images ?? x.Images ?? [],
    }));

  const fetchPage = useCallback(
    async (pageNum: number, append = false) => {
      try {
        setError(null);
        if (append) setLoadingMore(true);
        else if (!refreshing) setLoading(true);

        // Nota: si tu backend implementa ?sort=..., pásalo aquí
        const { data } = await api.get(endpointBase, {
          params: { q: query, page: pageNum, pageSize /*, sort */ },
        });

        const mapped = mapItems(data?.items ?? []);
        setTotal(Number(data?.total ?? 0));
        setPage(pageNum);
        setItems((prev) => (append ? [...prev, ...mapped] : mapped));
      } catch (e: any) {
        setError(e?.response?.data || e?.message || 'No se pudieron cargar los productos');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [endpointBase, pageSize, query, refreshing]
  );

  // primer load / cambio de tenant
  useEffect(() => {
    setItems([]);
    setPage(1);
    fetchPage(1, false);
  }, [endpointBase, fetchPage]);

  // debounce search
  const onChangeQuery = (txt: string) => {
    setQuery(txt);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      fetchPage(1, false);
    }, 300);
  };

  const onSubmitSearch = () => {
    if (debounce.current) clearTimeout(debounce.current);
    fetchPage(1, false);
  };

  const onClear = () => {
    setQuery('');
    if (debounce.current) clearTimeout(debounce.current);
    fetchPage(1, false);
  };

  // sort local (por si el backend aún no implementa ?sort=)
  const sortedItems = useMemo(() => {
    if (sort === 'relevance') return items;
    const cp = [...items];
    switch (sort) {
      case 'price_asc':
        cp.sort((a, b) => a.price - b.price); break;
      case 'price_desc':
        cp.sort((a, b) => b.price - a.price); break;
      case 'name_asc':
        cp.sort((a, b) => a.name.localeCompare(b.name, 'es')); break;
    }
    return cp;
  }, [items, sort]);

  const cycleSort = () => {
    setSort((s) =>
      s === 'relevance' ? 'price_asc' :
      s === 'price_asc' ? 'price_desc' :
      s === 'price_desc' ? 'name_asc' :
      'relevance'
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPage(1, false);
  };

  const goDetail = (it: Item) => {
    navigation.navigate('ProductDetail', {
      tenantId: isNaN(Number(tenantRef)) ? undefined : Number(tenantRef),
      slugOrName: isNaN(Number(tenantRef)) ? tenantRef : undefined,
      productSlugOrId: it.slug ?? it.id,
    });
  };

  const renderCard = ({ item }: { item: Item }) => (
    <Pressable onPress={() => goDetail(item)} style={[styles.card, cols > 1 && { flex: 1 }]}>
      {item.images?.[0] ? (
        <Image source={{ uri: item.images[0] }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: '#e5e7eb' }]} />
      )}
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.price}>{money(item.price)}</Text>
      {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
      <Pressable onPress={() => goDetail(item)} style={styles.btn}>
        <Text style={styles.btnText}>Ver detalle</Text>
      </Pressable>
    </Pressable>
  );

  const keyExtractor = (it: Item) => String(it.id);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tienda</Text>

        <View style={styles.rowWrap}>
          <View style={styles.searchWrap}>
            <TextInput
              placeholder="Buscar productos…"
              value={query}
              onChangeText={onChangeQuery}
              onSubmitEditing={onSubmitSearch}
              style={styles.input}
              returnKeyType="search"
            />
            {!!query && (
              <Pressable onPress={onClear} style={styles.clearBtn} accessibilityLabel="Limpiar búsqueda">
                <Text style={{ fontWeight: '900' }}>×</Text>
              </Pressable>
            )}
          </View>

          <Pressable onPress={cycleSort} style={styles.sortBtn}>
            <Text style={styles.sortText}>
              {sort === 'relevance' ? 'Relevancia' :
               sort === 'price_asc' ? 'Precio ↑' :
               sort === 'price_desc' ? 'Precio ↓' :
               'Nombre A-Z'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.meta}>
          {loading ? 'Cargando…' : `${total} resultado${total === 1 ? '' : 's'}`}
        </Text>
      </View>

      {/* Body */}
      {error ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#b91c1c', fontWeight: '700' }}>{error}</Text>
          <Pressable onPress={() => fetchPage(1, false)} style={[styles.btn, { marginTop: 10 }]}>
            <Text style={styles.btnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : loading && !items.length ? (
        <View style={{ padding: 12 }}>
          {/* Skeletons */}
          <View style={[styles.skeletonRow, { marginBottom: 8 }]}>
            {[...Array(cols)].map((_, i) => (
              <View key={`sk-${i}`} style={[styles.card, { flex: 1 }]}>
                <View style={[styles.thumb, { backgroundColor: '#eef2f7' }]} />
                <View style={{ height: 14, backgroundColor: '#eef2f7', borderRadius: 6, marginTop: 8 }} />
                <View style={{ height: 12, width: '40%', backgroundColor: '#eef2f7', borderRadius: 6, marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>
      ) : !items.length ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#64748b' }}>No hay productos públicos.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          renderItem={renderCard}
          keyExtractor={keyExtractor}
          numColumns={cols}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          columnWrapperStyle={cols > 1 ? { gap: 12 } : undefined}
          onEndReached={() => !loadingMore && canLoadMore && fetchPage(page + 1, true)}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* FAB: Carrito */}
      <Pressable
        onPress={() => navigation.navigate('Cart')}
        style={styles.fab}
        accessibilityLabel="Ver carrito"
      >
        <Text style={styles.fabText}>🛒</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  title: { fontWeight: '900', fontSize: 18, color: '#0f172a' },
  meta: { color: '#64748b', marginTop: 6, fontSize: 12 },

  rowWrap: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },

  searchWrap: { position: 'relative', flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    backgroundColor: '#fff',
    paddingRight: 34,
  },
  clearBtn: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sortBtn: {
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortText: { color: '#fff', fontWeight: '800' },

  // cards
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eef0f4',
    borderRadius: 12,
    padding: 12,
  },
  thumb: { height: 120, borderRadius: 10, backgroundColor: '#e5e7eb', marginBottom: 8, width: '100%' },
  name: { fontWeight: '700', color: '#0f172a' },
  price: { marginTop: 4, fontWeight: '900', color: '#1e40af' },
  desc: { marginTop: 6, color: '#6b7280', fontSize: 12 },
  btn: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnText: { fontWeight: '800', color: '#111827' },

  skeletonRow: { flexDirection: 'row', gap: 12 },

  // FAB carrito
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 20 },
});
