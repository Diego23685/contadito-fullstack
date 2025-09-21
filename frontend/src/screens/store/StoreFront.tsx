// src/screens/store/StoreFront.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  FlatList, RefreshControl, useWindowDimensions, Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useCart } from '../../providers/CartContext';

type Item = {
  id?: number;
  sku?: string;
  name: string;
  price: number;
  slug?: string | null;
  description?: string | null;
  images?: string[];
  pid: string; // clave única UI
};

type RouteParams = { tenantId?: number | string; slugOrName?: string; };
type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'name_asc';

const money = (n?: number) =>
  new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n ?? 0);

// hash determinista simple (djb2)
const djb2 = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
};

export default function StoreFront() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  let cart: any = null; try { cart = useCart?.(); } catch {}

  const { tenantId, slugOrName } = (route.params ?? {}) as RouteParams;
  const tenantRef = (tenantId ?? slugOrName ?? '').toString();

  // UI
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

  // cantidades por PID (fuente de verdad de la UI)
  const [shadowQty, setShadowQty] = useState<Record<string, number>>({});

  const cols = useMemo(() => (width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1), [width]);

  const endpointBase = useMemo(
    () => (isNaN(Number(tenantRef)) ? `/store/${tenantRef}/products` : `/store/${Number(tenantRef)}/products`),
    [tenantRef]
  );

  // PID estable global
  const makePid = useCallback((x: any) => {
    const t = tenantRef || 't';
    const id = x.id ?? x.Id;
    if (Number.isFinite(id)) return `t:${t}|id:${id}`;
    const sku = (x.sku ?? x.Sku)?.toString().trim();
    if (sku) return `t:${t}|sku:${sku.toLowerCase()}`;
    const slug = (x.slug ?? x.Slug)?.toString().trim();
    if (slug) return `t:${t}|slug:${slug.toLowerCase()}`;
    const name = (x.name ?? x.Name)?.toString().trim() || '';
    const price = String(x.price ?? x.Price ?? '');
    const desc = (x.description ?? x.Description ?? '').toString().trim();
    const fp = `${t}|${name}|${price}|${desc}`;
    return `t:${t}|h:${djb2(fp)}`;
  }, [tenantRef]);

  const mapItems = useCallback((raw: any[]): Item[] => {
    return (raw ?? []).map((x: any) => ({
      id: (x.id ?? x.Id) as number | undefined,
      sku: x.sku ?? x.Sku,
      name: x.name ?? x.Name,
      price: Number(x.price ?? x.Price ?? 0),
      slug: x.slug ?? x.Slug,
      description: x.description ?? x.Description,
      images: x.images ?? x.Images ?? [],
      pid: makePid(x),
    }));
  }, [makePid]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canLoadMore = items.length < total;

  const fetchPage = useCallback(
    async (pageNum: number, append = false) => {
      try {
        setError(null);
        if (append) setLoadingMore(true);
        else if (!refreshing) setLoading(true);

        const { data } = await api.get(endpointBase, { params: { q: query, page: pageNum, pageSize } });
        const mapped = mapItems(data?.items ?? []);
        setTotal(Number(data?.total ?? 0));
        setPage(pageNum);
        setItems(prev => (append ? [...prev, ...mapped] : mapped));
      } catch (e: any) {
        setError(e?.response?.data || e?.message || 'No se pudieron cargar los productos');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [endpointBase, pageSize, query, refreshing, mapItems]
  );

  // primer load / cambio tenant
  useEffect(() => { setItems([]); setPage(1); fetchPage(1, false); }, [endpointBase, fetchPage]);

  // debounce search
  const onChangeQuery = (txt: string) => {
    setQuery(txt);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchPage(1, false), 300);
  };
  const onSubmitSearch = () => { if (debounce.current) clearTimeout(debounce.current); fetchPage(1, false); };
  const onClear = () => { setQuery(''); if (debounce.current) clearTimeout(debounce.current); fetchPage(1, false); };

  // sort local
  const sortedItems = useMemo(() => {
    if (sort === 'relevance') return items;
    const cp = [...items];
    if (sort === 'price_asc')  cp.sort((a,b)=>a.price-b.price);
    if (sort === 'price_desc') cp.sort((a,b)=>b.price-a.price);
    if (sort === 'name_asc')   cp.sort((a,b)=>a.name.localeCompare(b.name,'es'));
    return cp;
  }, [items, sort]);
  const cycleSort = () => setSort(s => s==='relevance'?'price_asc':s==='price_asc'?'price_desc':s==='price_desc'?'name_asc':'relevance');

  const onRefresh = () => { setRefreshing(true); fetchPage(1, false); };

  // ===== cantidades =====
  // Buscar en carrito (si existe) — sólo para sincronizar de fondo
  const findInCart = useCallback((p: Item) => {
    if (!cart?.items?.length) return null;
    return cart.items.find((l: any) =>
      (Number.isFinite(p.id) && (l.productId === p.id || l.id === p.id)) ||
      (p.sku && l.sku === p.sku) ||
      (p.slug && l.slug === p.slug)
    );
  }, [cart]);

  // Fuente de verdad en UI = shadowQty[p.pid]; si no existe, caemos a carrito
  const uiQtyOf = useCallback((p: Item) => {
    const local = shadowQty[p.pid];
    if (typeof local === 'number') return local; // <- prioridad UI
    const line = findInCart(p);
    const ctx = Number(line?.qty ?? line?.quantity ?? (cart?.getQty && Number.isFinite(p.id) ? cart.getQty(p.id!) : 0)) || 0;
    return ctx;
  }, [shadowQty, cart, findInCart]);

  const setQtyUI = useCallback((p: Item, qty: number) => {
    setShadowQty(prev => ({ ...prev, [p.pid]: Math.max(0, qty) }));
  }, []);

  const syncCartFromUI = useCallback((p: Item, qty: number) => {
    try {
      const q = Math.max(0, qty);

      // Requiere id numérico para clave estable en el carrito
      const idNum = Number(p.id);
      if (!Number.isFinite(idNum)) {
        console.warn('[Cart] Producto sin id numérico; no se puede agregar:', p);
        return;
      }

      const payload = {
        id: idNum,
        name: p.name,
        price: Number(p.price || 0),
        image: p.images?.[0] ?? null,
        sku: p.sku ?? null,
        slug: p.slug ?? null,
      };

      const current = cart?.getQty ? Number(cart.getQty(idNum, tenantRef)) : 0;
      const exists = current > 0;

      // 1) Si no existe aún la línea:
      if (!exists) {
        if (q <= 0) return; // nada que hacer
        if (cart?.addItem) { cart.addItem(payload, q, tenantRef); return; }
        if (cart?.add)     { cart.add(payload, q, tenantRef);     return; }
        return; // si no hay API para crear, salimos
      }

      // 2) Si ya existe la línea:
      if (cart?.setQty)       { cart.setQty(idNum, q, tenantRef);       return; }
      if (cart?.setQuantity)  { cart.setQuantity(idNum, q, tenantRef);  return; }

      // 3) Fallback por delta
      const delta = q - current;
      if (delta > 0) {
        if (cart?.addItem) cart.addItem(payload, delta, tenantRef);
        else if (cart?.add) cart.add(payload, delta, tenantRef);
      } else if (delta < 0) {
        if (q <= 0) {
          if (cart?.remove) cart.remove(idNum, tenantRef);
        } else if (cart?.decrement) {
          cart.decrement(idNum, tenantRef, Math.abs(delta));
        }
      }
    } catch {
      // noop
    }
  }, [cart, tenantRef]);



  const inc = (it: Item) => {
    const next = uiQtyOf(it) + 1;
    setQtyUI(it, next);       // UI primero
    syncCartFromUI(it, next); // luego carrito (best-effort)
  };
  const dec = (it: Item) => {
    const next = Math.max(0, uiQtyOf(it) - 1);
    setQtyUI(it, next);
    syncCartFromUI(it, next);
  };

  const cartCount = useMemo(() => {
    // Cuenta basada en UI (shadowQty) para que el badge coincida con lo que el usuario ve
    const uiTotal = Object.values(shadowQty).reduce((s, n) => s + (n || 0), 0);
    if (uiTotal > 0) return uiTotal;
    // si aún no hay UI, usa carrito real
    if (cart?.items?.length) return cart.items.reduce((s:number,l:any)=>s+Number(l.qty ?? l.quantity ?? 0),0);
    return 0;
  }, [cart, shadowQty]);

  // nav
  const goDetail = (it: Item) => {
    navigation.navigate('ProductDetail', {
      tenantId: isNaN(Number(tenantRef)) ? undefined : Number(tenantRef),
      slugOrName: isNaN(Number(tenantRef)) ? tenantRef : undefined,
      productSlugOrId: it.slug ?? it.id,
    });
  };

  // UI
  const QtyRow = ({ item }: { item: Item }) => {
    const qty = uiQtyOf(item);
    if (qty <= 0) {
      return (
        <Pressable onPress={() => inc(item)} style={styles.addBtn} accessibilityLabel="Agregar al carrito">
          <Text style={styles.addBtnText}>Agregar</Text>
        </Pressable>
      );
    }
    return (
      <View style={styles.stepper}>
        <Pressable onPress={() => dec(item)} style={[styles.stepBtn, styles.stepBtnLeft]} accessibilityLabel="Quitar uno">
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.qtyText}>{qty}</Text>
        <Pressable onPress={() => inc(item)} style={[styles.stepBtn, styles.stepBtnRight]} accessibilityLabel="Agregar uno">
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    );
  };

  const renderCard = ({ item }: { item: Item }) => (
    <View style={[styles.card, cols > 1 && { flex: 1 }]}>
      <Pressable onPress={() => goDetail(item)} style={{ width: '100%' }} accessibilityLabel={`Ver ${item.name}`}>
        {item.images?.[0]
          ? <Image source={{ uri: item.images[0] }} style={styles.thumb} resizeMode="cover" />
          : <View style={[styles.thumb, { backgroundColor: '#e5e7eb' }]} />
        }
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      </Pressable>

      <Text style={styles.price}>{money(item.price)}</Text>
      {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}

      <QtyRow item={item} />

      <Pressable onPress={() => goDetail(item)} style={styles.detailBtn}>
        <Text style={styles.detailBtnText}>Ver detalle</Text>
      </Pressable>
    </View>
  );

  const keyExtractor = (it: Item) => it.pid;

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
        <Text style={styles.meta}>{loading ? 'Cargando…' : `${total} resultado${total === 1 ? '' : 's'}`}</Text>
      </View>

      {/* Body */}
      {error ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#b91c1c', fontWeight: '700' }}>{error}</Text>
          <Pressable onPress={() => fetchPage(1, false)} style={[styles.detailBtn, { marginTop: 10 }]}>
            <Text style={styles.detailBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : loading && !items.length ? (
        <View style={{ padding: 12 }}>
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
          extraData={{ shadowQty, sort }} // fuerza re-render cuando cambian cantidades
        />
      )}

      {/* FAB carrito */}
      <Pressable
        onPress={() => navigation.navigate('Cart', { tenantRef })}
        style={styles.fab}
        accessibilityLabel="Ver carrito"
      >
        <Text style={styles.fabText}>🛒</Text>
        {cartCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cartCount}</Text>
          </View>
        )}
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  title: { fontWeight: '900', fontSize: 18, color: '#0f172a' },
  meta: { color: '#64748b', marginTop: 6, fontSize: 12 },
  rowWrap: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  searchWrap: { position: 'relative', flex: 1 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, minHeight: 42, backgroundColor: '#fff', paddingRight: 34 },
  clearBtn: { position: 'absolute', right: 6, top: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  sortBtn: { paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#111827', minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  sortText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef0f4', borderRadius: 12, padding: 12 },
  thumb: { height: 120, borderRadius: 10, backgroundColor: '#e5e7eb', marginBottom: 8, width: '100%' },
  name: { fontWeight: '700', color: '#0f172a' },
  price: { marginTop: 4, fontWeight: '900', color: '#1e40af' },
  desc: { marginTop: 6, color: '#6b7280', fontSize: 12 },
  addBtn: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#111827' },
  addBtnText: { color: '#fff', fontWeight: '800' },
  stepper: { marginTop: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  stepBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#f9fafb' },
  stepBtnLeft: { borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  stepBtnRight: { borderLeftWidth: 1, borderLeftColor: '#e5e7eb' },
  stepBtnText: { fontSize: 16, fontWeight: '900', color: '#111827' },
  qtyText: { minWidth: 36, textAlign: 'center', fontWeight: '900', color: '#0f172a' },
  detailBtn: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  detailBtnText: { fontWeight: '800', color: '#111827' },
  skeletonRow: { flexDirection: 'row', gap: 12 },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 20 },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});
