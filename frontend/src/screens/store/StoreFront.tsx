// src/screens/store/StoreFront.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  FlatList, RefreshControl, useWindowDimensions, Image, Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useCart } from '../../providers/CartContext';
import { useFonts } from 'expo-font';

/** ===== Paleta de marca (unificada con el resto) ===== */
const BRAND = {
  hanBlue: '#4458C7',
  iris: '#5A44C7',
  cyanBlueAzure: '#4481C7',
  maximumBlue: '#44AAC7',
  darkPastelBlue: '#8690C7',
  verdigris: '#43BFB7',

  surfaceTint:  '#F3F6FF',
  surfaceSubtle:'#F8FAFF',
  surfacePanel: '#FCFDFF',
  borderSoft:   '#E2E7FF',
  borderSofter: '#E9EEFF',
  trackSoft:    '#DEE6FB',
} as const;

const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

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
  // Carga de fuente Apoka (no bloquea; aplicará cuando esté lista)
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isWide = width >= 1000; // breakpoint para sidebar

  // Cart context (tolerante)
  let cart: any = null; try { cart = useCart?.(); } catch {}

  const { tenantId, slugOrName } = (route.params ?? {}) as RouteParams;
  const tenantRef = (tenantId ?? slugOrName ?? '').toString();

  // UI
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [sortOpen, setSortOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [likes, setLikes] = useState<Record<string, boolean>>({}); // “favoritos” locales

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

  const cols = useMemo(() => {
    return width >= 1400 ? 5 : width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1;
  }, [width]);

  // Layout: padding contenedor + gutter + ancho de tarjeta fijo para grid estable
  const layout = useMemo(() => {
    const sidebarW = isWide ? 300 : 0;
    const padding = 16;  // padding horizontal del contenedor
    theGutter: 0; // no usar; sólo para no romper nada
    const gutter = 12;   // separación entre columnas
    const available = width - sidebarW - padding * 2;
    const cardWidth = Math.max(0, (available - gutter * (cols - 1)) / cols);
    return { padding, gutter, cardWidth, sidebarW };
  }, [width, cols, isWide]);

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

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'relevance', label: 'Relevancia' },
    { key: 'price_asc', label: 'Precio ↑' },
    { key: 'price_desc', label: 'Precio ↓' },
    { key: 'name_asc', label: 'Nombre A-Z' },
  ];

  const onRefresh = () => { setRefreshing(true); fetchPage(1, false); };

  // ===== cantidades =====
  const findInCart = useCallback((p: Item) => {
    if (!cart?.items?.length) return null;
    return cart.items.find((l: any) =>
      (Number.isFinite(p.id) && (l.productId === p.id || l.id === p.id)) ||
      (p.sku && l.sku === p.sku) ||
      (p.slug && l.slug === p.slug)
    );
  }, [cart]);

  const uiQtyOf = useCallback((p: Item) => {
    const local = shadowQty[p.pid];
    if (typeof local === 'number') return local;
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
      const idNum = Number(p.id);
      if (!Number.isFinite(idNum)) return;

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

      if (!exists) {
        if (q <= 0) return;
        if (cart?.addItem) { cart.addItem(payload, q, tenantRef); return; }
        if (cart?.add)     { cart.add(payload, q, tenantRef);     return; }
        return;
      }

      if (cart?.setQty)       { cart.setQty(idNum, q, tenantRef);       return; }
      if (cart?.setQuantity)  { cart.setQuantity(idNum, q, tenantRef);  return; }

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
    } catch { /* noop */ }
  }, [cart, tenantRef]);

  const inc = (it: Item) => {
    const next = uiQtyOf(it) + 1;
    setQtyUI(it, next);
    syncCartFromUI(it, next);
  };
  const dec = (it: Item) => {
    const next = Math.max(0, uiQtyOf(it) - 1);
    setQtyUI(it, next);
    syncCartFromUI(it, next);
  };

  const cartCount = useMemo(() => {
    const uiTotal = Object.values(shadowQty).reduce((s, n) => s + (n || 0), 0);
    if (uiTotal > 0) return uiTotal;
    if (cart?.items?.length) return cart.items.reduce((s:number,l:any)=>s+Number(l.qty ?? l.quantity ?? 0),0);
    return 0;
  }, [cart, shadowQty]);

  // Total estimado para sticky mini-cart (prefiere carrito real)
  const cartTotalFromCtx = useMemo(() => {
    if (typeof cart?.total === 'number') return cart.total;
    if (cart?.items?.length) return cart.items.reduce((s:number,l:any)=>s + (Number(l.qty ?? l.quantity ?? 0) * Number(l.price ?? 0)), 0);
    return 0;
  }, [cart]);

  const uiEstimatedTotal = useMemo(() => {
    if (!sortedItems.length) return 0;
    return sortedItems.reduce((s, it) => s + uiQtyOf(it) * Number(it.price || 0), 0);
  }, [sortedItems, uiQtyOf]);

  const stickyTotal = useMemo(() => {
    const t = cartTotalFromCtx || uiEstimatedTotal || 0;
    return money(t);
  }, [cartTotalFromCtx, uiEstimatedTotal]);

  // nav
  const goDetail = (it: Item) => {
    navigation.navigate('ProductDetail', {
      tenantId: isNaN(Number(tenantRef)) ? undefined : Number(tenantRef),
      slugOrName: isNaN(Number(tenantRef)) ? tenantRef : undefined,
      productSlugOrId: it.slug ?? it.id,
    });
  };

  // UI subcomponentes
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
          <Text style={styles.stepBtnText}>＋</Text>
        </Pressable>
      </View>
    );
  };

  const toggleLike = (pid: string) => setLikes(prev => ({ ...prev, [pid]: !prev[pid] }));

  const renderCard = ({ item }: { item: Item }) => {
    const liked = !!likes[item.pid];
    return (
      <View style={[
        styles.card,
        { width: layout.cardWidth },
        compact && styles.cardCompact
      ]}>
        <Pressable onPress={() => goDetail(item)} style={{ width: '100%' }} accessibilityLabel={`Ver ${item.name}`}>
          <View style={styles.thumbWrap}>
            {item.images?.[0]
              ? <Image source={{ uri: item.images[0] }} style={[styles.thumb, compact && styles.thumbCompact]} resizeMode="cover" />
              : <View style={[styles.thumb, compact && styles.thumbCompact, { backgroundColor: '#e5e7eb' }]} />
            }
            <Pressable onPress={() => toggleLike(item.pid)} style={styles.likeBtn} accessibilityLabel="Favorito">
              <Text style={{ ...F, fontSize: 16 }}>{liked ? '❤️' : '🤍'}</Text>
            </Pressable>
          </View>
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
  };

  const keyExtractor = (it: Item) => it.pid;

  const SortMenu = () => (
    <View style={styles.sortMenuCard}>
      {sortOptions.map(opt => (
        <Pressable
          key={opt.key}
          onPress={() => { setSort(opt.key); setSortOpen(false); }}
          style={[styles.sortItem, sort === opt.key && styles.sortItemActive]}
        >
          <Text style={[styles.sortItemText, sort === opt.key && styles.sortItemTextActive]}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  // Skeleton fila
  const SkeletonRow = () => {
    return (
      <View style={styles.skeletonRow}>
        {Array.from({ length: cols }).map((_, i) => (
          <View
            key={`sk-${i}`}
            style={[
              styles.card,
              { width: layout.cardWidth, marginRight: i < cols - 1 ? layout.gutter : 0 }
            ]}
          >
            <View style={[styles.thumb, { backgroundColor: '#eef2f7' }]} />
            <View style={{ height: 14, backgroundColor: '#eef2f7', borderRadius: 6, marginTop: 8 }} />
            <View style={{ height: 12, width: '40%', backgroundColor: '#eef2f7', borderRadius: 6, marginTop: 6 }} />
          </View>
        ))}
      </View>
    );
  };

  // ===== Sidebar (solo wide) =====
  const Sidebar = () => (
    <View style={[styles.sidebar, { width: layout.sidebarW }]}>
      <Text style={styles.sidebarTitle}>Opciones</Text>

      <View style={styles.sidebarCard}>
        <Text style={styles.sidebarLabel}>Ordenar</Text>
        <View style={{ gap: 8 }}>
          {sortOptions.map(o => {
            const active = sort === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => setSort(o.key)}
                style={[styles.sideChip, active && styles.sideChipActive]}
              >
                <Text style={[styles.sideChipTxt, active && styles.sideChipTxtActive]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sidebarCard}>
        <Text style={styles.sidebarLabel}>Vista</Text>
        <Pressable
          onPress={() => setCompact(c => !c)}
          style={[styles.sideChip, compact && styles.sideChipActive]}
        >
          <Text style={[styles.sideChipTxt, compact && styles.sideChipTxtActive]}>
            {compact ? 'Compacto ✓' : 'Compacto'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.sidebarCard}>
        <Text style={styles.sidebarLabel}>Carrito</Text>
        <View style={styles.sidebarCartRow}>
          <Text style={styles.sidebarMuted}>Total</Text>
          <Text style={styles.sidebarTotal}>{stickyTotal}</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Cart', { tenantRef })}
          style={[styles.sidePrimaryBtn, { marginTop: 8 }]}
        >
          <Text style={styles.sidePrimaryTxt}>Ver carrito</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header} pointerEvents="box-none">
        <Text style={styles.title}>Tienda</Text>

        {/* Controles: búsqueda / orden */}
        <View style={styles.rowWrap}>
          <View style={styles.searchWrap}>
            <TextInput
              placeholder="Buscar productos…"
              value={query}
              onChangeText={onChangeQuery}
              onSubmitEditing={onSubmitSearch}
              style={styles.input}
              returnKeyType="search"
              placeholderTextColor="#9aa7c2"
            />
            {!!query && (
              <Pressable onPress={onClear} style={styles.clearBtn} accessibilityLabel="Limpiar búsqueda">
                <Text style={{ ...F, fontWeight: '900' }}>×</Text>
              </Pressable>
            )}
          </View>

          <View style={{ position: 'relative' }}>
            <Pressable onPress={() => setSortOpen(s => !s)} style={styles.sortBtn}>
              {/* ===== FIX: sin operador coma, sin variable suelta ===== */}
              <Text style={styles.sortText}>
                {sortOptions.find(o => o.key === sort)?.label ?? 'Ordenar'}
              </Text>
            </Pressable>
            {sortOpen && <SortMenu />}
          </View>
        </View>

        <Text style={styles.meta}>
          {loading ? 'Cargando…' : `${total} resultado${total === 1 ? '' : 's'}`}
        </Text>
      </View>

      {/* Body con sidebar en wide */}
      <View style={[styles.body, isWide && styles.bodyWide]}>
        {/* GRID */}
        <View style={[styles.gridCol, isWide && styles.gridColWide]}>
          {error ? (
            <View style={{ padding: 16 }}>
              <Text style={{ ...F, color: '#DC2626', fontWeight: Platform.OS === 'ios' ? '700' : 'bold' }}>{error}</Text>
              <Pressable onPress={() => fetchPage(1, false)} style={[styles.detailBtn, { marginTop: 10 }]}>
                <Text style={styles.detailBtnText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : loading && !items.length ? (
            <View style={{ paddingHorizontal: layout.padding, paddingTop: 12, paddingBottom: 12 }}>
              <SkeletonRow />
            </View>
          ) : !items.length ? (
            <View style={{ padding: 16 }}>
              <Text style={{ ...F, color: '#6B7280' }}>No hay productos públicos.</Text>
            </View>
          ) : (
            <FlatList
              key={`grid-${cols}`} // fuerza re-mount al cambiar columnas
              data={sortedItems}
              renderItem={renderCard}
              keyExtractor={keyExtractor}
              numColumns={cols}
              contentContainerStyle={{ paddingHorizontal: layout.padding, paddingTop: 12, paddingBottom: 12 }}
              columnWrapperStyle={cols > 1 ? { justifyContent: 'space-between' } : undefined}
              ItemSeparatorComponent={() => <View style={{ height: layout.gutter }} />}
              removeClippedSubviews={false}
              initialNumToRender={cols * 6}
              windowSize={5}
              onEndReached={() => !loadingMore && canLoadMore && fetchPage(page + 1, true)}
              onEndReachedThreshold={0.4}
              ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              extraData={{ shadowQty, sort, compact, likes, layoutCardWidth: layout.cardWidth }}
            />
          )}
        </View>

        {/* SIDEBAR */}
        {isWide && <Sidebar />}
      </View>

      {/* FAB carrito (desktop / tablets) */}
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

      {/* Mini-carrito fijo (móvil) */}
      {cartCount > 0 && width < 1000 && (
        <View style={styles.checkoutBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>Carrito</Text>
            <Text style={styles.totalValue}>{stickyTotal}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Cart', { tenantRef })}
            style={styles.checkoutBtn}
          >
            <Text style={styles.checkoutBtnText}>Ver carrito</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.surfaceTint },
  header: {
    padding: 16,
    backgroundColor: BRAND.surfacePanel,
    borderBottomWidth: 1, borderBottomColor: BRAND.borderSoft
  },
  title: { ...F, fontWeight: Platform.OS === 'ios' ? '800' : 'bold', fontSize: 18, color: '#0F172A' },
  meta: { ...F, color: '#6B7280', marginTop: 6, fontSize: 12 },

  rowWrap: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  searchWrap: { position: 'relative', flex: 1, marginRight: 8 },
  input: {
    ...F,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingHorizontal: 12, minHeight: 42, backgroundColor: BRAND.surfacePanel, paddingRight: 34, color: '#0F172A'
  },
  clearBtn: {
    position: 'absolute', right: 6, top: 6, width: 28, height: 28, borderRadius: 14,
    backgroundColor: BRAND.surfaceSubtle, alignItems: 'center', justifyContent: 'center'
  },

  // Sort
  sortBtn: {
    paddingHorizontal: 12, borderRadius: 10, backgroundColor: BRAND.hanBlue,
    minHeight: 42, alignItems: 'center', justifyContent: 'center', marginRight: 8
  },
  sortText: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  sortMenuCard: {
    position: 'absolute', right: 0, top: 46, zIndex: 10,
    backgroundColor: BRAND.surfacePanel, borderWidth: 1, borderColor: BRAND.borderSoft,
    borderRadius: 12, padding: 6, width: 160,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 3,
    maxHeight: 300, overflow: 'hidden'
  },
  sortItem: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  sortItemActive: { backgroundColor: '#E9EDFF', borderColor: BRAND.hanBlue },
  sortItemText: { ...F, color: '#0F172A', fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },
  sortItemTextActive: { ...F, color: BRAND.hanBlue },

  // Body + Sidebar
  body: { flex: 1 },
  bodyWide: { flexDirection: 'row' },
  gridCol: { flex: 1 },
  gridColWide: { flex: 1, borderRightWidth: 1, borderRightColor: BRAND.borderSofter },

  sidebar: {
    width: 300,
    padding: 12,
    backgroundColor: BRAND.surfacePanel,
  },
  sidebarTitle: { ...F, fontSize: 14, color: '#0F172A', fontWeight: Platform.OS === 'ios' ? '800' : 'bold', marginBottom: 6 },
  sidebarCard: {
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 12,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    padding: 12,
    marginBottom: 10,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: Platform.select({ android: 2, default: 0 }),
  },
  sidebarLabel: { ...F, color: '#6B7280', marginBottom: 8 },
  sideChip: {
    borderWidth: 1, borderColor: BRAND.borderSoft,
    backgroundColor: BRAND.surfacePanel,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999
  },
  sideChipActive: { backgroundColor: '#E9EDFF', borderColor: BRAND.hanBlue },
  sideChipTxt: { ...F, color: '#0F172A', fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },
  sideChipTxtActive: { ...F, color: BRAND.hanBlue },
  sidebarCartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sidebarMuted: { ...F, color: '#6B7280' },
  sidebarTotal: { ...F, fontWeight: Platform.OS === 'ios' ? '800' : 'bold', color: BRAND.hanBlue },
  sidePrimaryBtn: {
    borderWidth: 1, borderColor: BRAND.hanBlue,
    backgroundColor: BRAND.hanBlue, borderRadius: 10, paddingVertical: 10, alignItems: 'center'
  },
  sidePrimaryTxt: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },

  // Cards (productos)
  card: {
    backgroundColor: BRAND.surfacePanel, borderWidth: 1, borderColor: BRAND.borderSoft,
    borderRadius: 12, padding: 12,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: Platform.select({ android: 1, default: 0 }),
  },
  cardCompact: { padding: 10 },
  thumbWrap: { position: 'relative' },
  thumb: { height: 160, borderRadius: 10, backgroundColor: '#e5e7eb', marginBottom: 8, width: '100%' },
  thumbCompact: { height: 120 },
  likeBtn: {
    position: 'absolute', right: 8, top: 8,
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffffcc'
  },
  name: { ...F, fontWeight: Platform.OS === 'ios' ? '800' : 'bold', color: '#0F172A' },
  price: { ...F, marginTop: 4, fontWeight: Platform.OS === 'ios' ? '900' : 'bold', color: BRAND.hanBlue },
  desc: { ...F, marginTop: 6, color: '#6B7280', fontSize: 12 },

  addBtn: {
    marginTop: 10, borderWidth: 1, borderColor: BRAND.hanBlue, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', backgroundColor: BRAND.hanBlue
  },
  addBtnText: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '900' : 'bold' },

  stepper: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10, overflow: 'hidden'
  },
  stepBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: BRAND.surfaceSubtle },
  stepBtnLeft: { borderRightWidth: 1, borderRightColor: BRAND.borderSoft },
  stepBtnRight: { borderLeftWidth: 1, borderLeftColor: BRAND.borderSoft },
  stepBtnText: { ...F, fontSize: 16, fontWeight: Platform.OS === 'ios' ? '900' : 'bold', color: '#111827' },
  qtyText: { ...F, minWidth: 36, textAlign: 'center', fontWeight: Platform.OS === 'ios' ? '900' : 'bold', color: '#0F172A' },

  detailBtn: {
    marginTop: 10, borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', backgroundColor: BRAND.surfacePanel
  },
  detailBtnText: { ...F, fontWeight: Platform.OS === 'ios' ? '800' : 'bold', color: '#111827' },

  skeletonRow: { flexDirection: 'row' },

  // FAB
  fab: {
    position: 'absolute', right: 16, bottom: 88,
    width: 52, height: 52, borderRadius: 26, backgroundColor: BRAND.hanBlue,
    alignItems: 'center', justifyContent: 'center', elevation: 4
  },
  fabText: { ...F, color: '#fff', fontSize: 20 },
  badge: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, paddingHorizontal: 4,
    borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center'
  },
  badgeText: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '900' : 'bold', fontSize: 12 },

  // Mini-carrito móvil
  checkoutBar: {
    position: 'absolute', left: 12, right: 12, bottom: 12,
    backgroundColor: BRAND.surfacePanel, borderRadius: 14, borderWidth: 1, borderColor: BRAND.borderSoft,
    padding: 12, flexDirection: 'row', alignItems: 'center',
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3
  },
  totalLabel: { ...F, color: '#6B7280', fontSize: 12 },
  totalValue: { ...F, fontSize: 18, fontWeight: Platform.OS === 'ios' ? '900' : 'bold', color: '#0F172A' },
  checkoutBtn: {
    backgroundColor: BRAND.hanBlue, borderColor: BRAND.hanBlue,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1
  },
  checkoutBtnText: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '900' : 'bold' },
});
