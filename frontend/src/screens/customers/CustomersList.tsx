// src/screens/customers/CustomersList.tsx
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  Platform,
  type ViewStyle,
  type StyleProp,
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

// Avatar simple
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

// Fuente
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

// ===== Paleta (alineada con Home) =====
const BRAND = {
  primary600: '#2563EB',
  purple600: '#6D28D9',
  green: '#10B981',

  hanBlue: '#4458C7',
  slate700: '#334155',

  surfaceTint: '#EEF2FF',
  surfaceSubtle: '#F7F9FF',
  surfacePanel: '#FFFFFF',

  borderSoft: '#E6EBFF',
  borderSofter: '#EDF1FF',

  cardShadow: 'rgba(37, 99, 235, 0.16)',
} as const;

/** Botón pequeño reutilizable (igual patrón que en Home/CustomerForm) */
const SmallBtn: React.FC<{
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'purple' | 'gray' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ title, onPress, variant = 'gray', disabled, loading, style }) => {
  const isFilled = variant === 'primary' || variant === 'purple' || variant === 'gray' || variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: '#e5e7eb' }}
      style={[
        styles.smallBtn,
        variant === 'primary' && styles.btnBlue,
        variant === 'purple' && styles.btnPurple,
        variant === 'gray' && styles.btnGray,
        variant === 'danger' && styles.btnDanger,
        variant === 'outline' && styles.btnOutline,
        (disabled || loading) && ({ opacity: 0.7 } as ViewStyle),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={isFilled ? styles.smallBtnTextAlt : styles.smallBtnText}>{title}</Text>
      )}
    </Pressable>
  );
};

const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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

  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

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

  const serverParams = useMemo(
    () => ({
      q: q || undefined,
      filter,
      sort: sortKey,
      dir: sortAsc ? 'asc' : 'desc',
    }),
    [q, filter, sortKey, sortAsc]
  );

  const load = useCallback(
    async (reset: boolean) => {
      if (loading) return;
      try {
        setLoading(true);
        const nextPage = reset ? 1 : page + 1;
        const res = await api.get<CustomersResponse>('/customers', {
          params: { page: nextPage, pageSize: PAGE_SIZE, ...serverParams },
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
    },
    [loading, page, items, logout, serverParams]
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // primera carga

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(true), 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, sortKey, sortAsc]);

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
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemSub} numberOfLines={1}>
                {item.email || 'sin email'}
              </Text>
              {!!phoneNice && (
                <Text style={styles.itemSub} numberOfLines={1}>
                  {phoneNice}
                </Text>
              )}
            </View>
          </View>

          <View style={{ height: 10 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {!!item.documentId && (
                <View style={[styles.badge, styles.badgeNeutral]}>
                  <Text style={styles.badgeText}>Doc.</Text>
                </View>
              )}
              {!!item.address && (
                <View style={[styles.badge, styles.badgeInfo]}>
                  <Text style={styles.badgeText}>Dirección</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <SmallBtn title="Editar" variant="outline" onPress={() => navigation.navigate('CustomerForm', { id: item.id })} />
              <SmallBtn
                title={isDeleting ? 'Eliminando…' : 'Eliminar'}
                variant="danger"
                onPress={() => confirmRemove(item.id)}
                disabled={isDeleting}
              />
            </View>
          </View>
        </Card>
      );
    }

    // Fila lista (1 columna)
    return (
      <View style={styles.rowItem}>
        <View style={[styles.avatar, { backgroundColor: avatarBg, marginRight: 10 }]}>
          <Text style={styles.avatarText}>{inits}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.email || 'sin email'}
            {phoneNice ? ` · ${phoneNice}` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {!!item.documentId && (
            <View style={[styles.badge, styles.badgeNeutral]}>
              <Text style={styles.badgeText}>Doc.</Text>
            </View>
          )}
          {!!item.address && (
            <View style={[styles.badge, styles.badgeInfo]}>
              <Text style={styles.badgeText}>Dir.</Text>
            </View>
          )}
          <SmallBtn title="Editar" variant="outline" onPress={() => navigation.navigate('CustomerForm', { id: item.id })} />
          <SmallBtn
            title={isDeleting ? 'Eliminando…' : 'Eliminar'}
            variant="danger"
            onPress={() => confirmRemove(item.id)}
            disabled={isDeleting}
          />
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
            placeholderTextColor="#9aa7c2"
          />
          {!!q && (
            <Pressable onPress={() => setQ('')} style={styles.clearBtn} accessibilityLabel="Limpiar búsqueda">
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          )}
        </View>
        <SmallBtn title="Nuevo" variant="primary" onPress={() => navigation.navigate('CustomerForm')} />
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
          onPress={() => {
            setSortKey('name');
            setSortAsc(k => (sortKey === 'name' ? !k : true));
          }}
        />
        <Chip
          label={`Recientes ${sortKey === 'recent' ? (sortAsc ? '↑' : '↓') : ''}`}
          active={sortKey === 'recent'}
          onPress={() => {
            setSortKey('recent');
            setSortAsc(k => (sortKey === 'recent' ? !k : false));
          }}
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {items.length} de {total} clientes
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={c => String(c.id)}
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
            {loading ? (
              <ActivityIndicator />
            ) : items.length < total ? (
              <SmallBtn title="Cargar más" variant="outline" onPress={() => load(false)} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyTitle}>No hay clientes</Text>
              <Text style={styles.emptyText}>Empieza creando tu primer cliente para facturar más rápido.</Text>
              <View style={{ height: 8 }} />
              <SmallBtn title="Crear cliente" variant="primary" onPress={() => navigation.navigate('CustomerForm')} />
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
  screen: { flex: 1, backgroundColor: BRAND.surfaceTint },

  // Header/toolbar
  toolbarContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderSoft,
    // @ts-ignore (solo efectos visuales en web/iOS)
    backdropFilter: 'saturate(140%) blur(6px)',
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  toolbarLabel: { ...F, color: '#6B7280' },

  searchBox: { position: 'relative', flex: 1, minWidth: 220 },
  searchInput: {
    ...F,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: BRAND.surfacePanel,
    fontSize: 16,
  },
  clearBtn: {
    position: 'absolute',
    right: 8,
    top: 6,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: BRAND.borderSofter,
  },
  clearText: { ...F, fontSize: 18, lineHeight: 18, color: '#374151' },

  chip: {
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: BRAND.surfacePanel,
  },
  chipActive: { backgroundColor: '#E9EDFF', borderColor: BRAND.hanBlue },
  chipText: { ...F, color: '#374151' },
  chipTextActive: { ...F, color: BRAND.hanBlue },

  // Botón pequeño (chips) + variantes (como en Home)
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BRAND.surfacePanel,
    shadowColor: BRAND.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    alignSelf: 'flex-start',
  },
  btnBlue: {
    backgroundColor: BRAND.primary600,
    shadowColor: 'rgba(37,99,235,0.25)',
    elevation: 2,
  },
  btnPurple: {
    backgroundColor: BRAND.purple600,
    shadowColor: 'rgba(109,40,217,0.25)',
    elevation: 2,
  },
  btnGray: {
    backgroundColor: '#1E293B',
    shadowColor: 'rgba(30,41,59,0.25)',
    elevation: 2,
  },
  btnDanger: {
    backgroundColor: '#DC2626',
    shadowColor: 'rgba(220,38,38,0.25)',
    elevation: 2,
  },
  btnOutline: {
    backgroundColor: BRAND.surfacePanel,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
  },
  smallBtnText: { ...F, color: BRAND.hanBlue },
  smallBtnTextAlt: { ...F, color: '#FFFFFF' },

  // Grid card (estética Home)
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0,
    shadowColor: BRAND.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...F, color: '#111827' },

  itemTitle: { ...F, fontSize: 16, color: '#0f172a' },
  itemSub: { ...F, color: '#6B7280', fontSize: 12 },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { ...F, fontSize: 11, color: '#fff' },
  badgeInfo: { backgroundColor: BRAND.hanBlue },
  badgeNeutral: { backgroundColor: '#94A3B8' },

  // Row list
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomColor: BRAND.borderSofter,
    borderBottomWidth: 1,
    backgroundColor: BRAND.surfacePanel,
    gap: 10,
  },
  rowTitle: { ...F, fontSize: 16, color: '#0f172a' },
  rowSub: { ...F, color: '#6B7280', fontSize: 12 },

  // Meta/empty
  metaRow: { paddingHorizontal: 12, paddingBottom: 8 },
  metaText: { ...F, color: '#6B7280' },

  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { ...F, fontSize: 18, color: BRAND.hanBlue },
  emptyText: { ...F, color: '#6B7280', textAlign: 'center' },
});
