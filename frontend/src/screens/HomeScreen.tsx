// src/screens/HomeScreen.tsx — panel lateral pro + centrado + Apoka manual
import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import {
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Pressable,
  AppState,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../api';
import { AuthContext } from '../providers/AuthContext';

// ---------------- Tipos ----------------
type Dashboard = {
  tenantName: string;
  plan: 'free' | 'pro' | 'business' | string;
  online: boolean;
  lastSync: string;

  // KPIs
  salesToday: number;
  marginToday: number;
  ticketsToday: number;

  salesMonth: number;
  marginMonth: number;
  ticketsMonth: number;
  avgTicketMonth: number;

  // Totales
  productsTotal: number;
  customersTotal: number;
  warehousesTotal: number;

  // Listas
  latestProducts: { id: number; sku: string; name: string }[];
  lowStock: { id: number; sku: string; name: string }[];
  receivablesDueSoon: {
    invoiceId: number;
    number: string;
    customerName: string | null;
    total: number;
    dueAmount: number;
    dueInDays: number;
  }[];
  activity: {
    kind: string;
    refId: number;
    title: string;
    whenAt: string; // "yyyy-MM-dd HH:mm"
  }[];
};

type Props = { navigation: any };

// ------------- Utilidades ---------------
const moneyNI = (v?: number | null) => {
  const n = Number(v ?? 0);
  try {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n);
  } catch {
    return `C$ ${n.toFixed(2)}`; // fallback
  }
};

function timeAgo(iso?: string) {
  if (!iso) return '—';
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const sec = Math.max(1, Math.floor(diff / 1000));
  const mins = Math.floor(sec / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `hace ${days} d`;
  if (hours > 0) return `hace ${hours} h`;
  if (mins > 0) return `hace ${mins} min`;
  return 'justo ahora';
}

function initials(s?: string) {
  if (!s) return 'U';
  const parts = String(s).trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || 'U';
}

// ===== Helper de fuente Apoka =====
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

// ---------- Componentes UI ----------
const Card: React.FC<{ style?: any; children: React.ReactNode; onPress?: () => void; testID?: string }>
= ({ style, children, onPress, testID }) => {
  const Comp: any = onPress ? Pressable : View;
  return (
    <Comp
      accessibilityRole={onPress ? 'button' : undefined}
      android_ripple={onPress ? { color: '#e5e7eb' } : undefined}
      onPress={onPress}
      testID={testID}
      style={[styles.card, onPress && { overflow: Platform.OS === 'android' ? 'hidden' : 'visible' }, style]}
    >
      {children}
    </Comp>
  );
};

const Section: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode; style?: any; subtitle?: string }>
= ({ title, right, children, style, subtitle }) => (
  <View style={[styles.section, style]}>
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
        {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
    {children}
  </View>
);

const Label: React.FC<{ children: React.ReactNode; muted?: boolean; style?: any }>
= ({ children, muted, style }) => (
  <Text style={[F, { color: muted ? '#6b7280' : '#111827' }, style]}>{children}</Text>
);

const Badge: React.FC<{ children: React.ReactNode; style?: any }>
= ({ children, style }) => (
  <Text style={[styles.badge, style]}>{children}</Text>
);

const SmallBtn: React.FC<{ title: string; onPress: () => void; danger?: boolean; style?: any }>
= ({ title, onPress, danger, style }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    android_ripple={{ color: danger ? '#fecaca' : '#e5e7eb' }}
    style={[styles.smallBtn, danger && styles.smallBtnDanger, style]}
  >
    <Text style={[styles.smallBtnText, danger && { color: '#991b1b' }]}>{title}</Text>
  </Pressable>
);

const Bar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
    </View>
  );
};

const Skeleton: React.FC<{ height?: number; width?: number; style?: any }>
= ({ height = 18, width, style }) => (
  <View style={[{ height, width, backgroundColor: '#eef0f4', borderRadius: 8 }, style]} />
);

// ---------- Panel Lateral Moderno ----------
const PanelRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <View style={styles.panelRow}>
    <Text style={styles.panelRowLabel}>{label}</Text>
    <Text style={styles.panelRowValue} numberOfLines={1}>{value ?? '—'}</Text>
  </View>
);

const SidePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  pinned: boolean;
  width?: number;
  dashboard?: Dashboard | null;
  navigation: any;
  userEmail?: string | null;
  onTogglePolling: () => void;
  polling: boolean;
}> = ({ open, onClose, pinned, width = 320, dashboard, navigation, userEmail, onTogglePolling, polling }) => {
  const slide = useRef(new Animated.Value(pinned ? 0 : -width)).current;

  useEffect(() => {
    if (pinned) {
      slide.setValue(0);
      return;
    }
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open, pinned, width, slide]);

  const avatarText = initials(dashboard?.tenantName || userEmail || 'Usuario');

  const PanelContent = (
    <View style={[styles.panel, { width }]}>
      {/* Cabecera usuario */}
      <View style={styles.panelHeaderWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.panelTitleMain} numberOfLines={1}>{dashboard?.tenantName ?? '—'}</Text>
          <Text style={styles.panelSubtitle} numberOfLines={1}>{userEmail ?? '—'}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('UserScreen')} style={styles.linkChip} accessibilityRole="button">
          <Text style={styles.linkChipText}>Usuario</Text>
        </Pressable>
      </View>

      {/* Tarjeta tenant/plan */}
      <View style={styles.panelCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.panelCardTitle]}>Plan</Text>
          <Text style={[styles.planPill, planColor(dashboard?.plan)]}>{dashboard?.plan ?? '—'}</Text>
        </View>
        <Text style={styles.panelCardSub}>
          {dashboard?.online ? 'Conectado • ' : 'Sin conexión • '}
          {dashboard?.lastSync ? `Sync ${timeAgo(dashboard.lastSync)}` : '—'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <SmallBtn title="Administrar empresa" onPress={() => navigation.navigate('TenantSwitch')} />
          {String(dashboard?.plan || '').toLowerCase() !== 'business' && (
            <SmallBtn title="Mejorar plan" onPress={() => navigation.navigate('Billing')} />
          )}
        </View>
      </View>

      {/* Métricas rápidas */}
      <View style={styles.panelBlock}>
        <Text style={styles.panelBlockTitle}>Resumen</Text>
        <PanelRow label="Productos" value={String(dashboard?.productsTotal ?? '—')} />
        <PanelRow label="Clientes" value={String(dashboard?.customersTotal ?? '—')} />
        <PanelRow label="Almacenes" value={String(dashboard?.warehousesTotal ?? '—')} />
      </View>

      {/* Navegación */}
      <View style={styles.panelBlock}>
        <Text style={styles.panelBlockTitle}>Ir a</Text>
        <View style={{ gap: 8 }}>
          <Card onPress={() => navigation.navigate('ProductsList')}><Text style={styles.linkLike}>Catálogo de productos</Text></Card>
          <Card onPress={() => navigation.navigate('CustomersList')}><Text style={styles.linkLike}>Clientes</Text></Card>
          <Card onPress={() => navigation.navigate('ReceivablesList')}><Text style={styles.linkLike}>Cuentas por cobrar</Text></Card>
          <Card onPress={() => navigation.navigate('WarehousesList')}><Text style={styles.linkLike}>Almacenes</Text></Card>
        </View>
      </View>

      {/* Preferencias / controles */}
      <View style={styles.panelBlock}>
        <Text style={styles.panelBlockTitle}>Controles</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <SmallBtn title={polling ? 'Pausar auto-refresco' : 'Reanudar auto-refresco'} onPress={onTogglePolling} />
          <SmallBtn title="Refrescar tablero" onPress={() => { /* noop; ya hay pull-to-refresh */ }} />
        </View>
      </View>

      {/* Footer panel */}
      <Text style={styles.panelFoot}>Contadito · Panel</Text>
    </View>
  );

  if (pinned) {
    return <View style={[styles.panelPinnedWrap, { width }]}>{PanelContent}</View>;
  }

  return (
    <>
      {open && <Pressable accessibilityRole="button" style={styles.overlay} onPress={onClose} />}
      <Animated.View style={[styles.panelDrawer, { width, transform: [{ translateX: slide }] }]}>
        {PanelContent}
      </Animated.View>
    </>
  );
};

// ---------------- Pantalla ----------------
export default function HomeScreen({ navigation }: Props) {
  const { logout } = useContext(AuthContext);
  const auth = useContext(AuthContext) as any;
  const currentUserEmail: string | null = auth?.user?.email ?? auth?.email ?? null;

  // Carga de fuente Apoka (cacheada por expo-font)
  useFonts({
    Apoka: require('../../assets/fonts/apokaregular.ttf'),
  });

  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isXL = width >= 1200;
  const huge = width >= 1440;

  const panelWidth = Math.min(360, Math.max(300, Math.floor(width * 0.26)));
  const panelPinned = width >= 1200;

  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [search, setSearch] = useState('');
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [polling, setPolling] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const appState = useRef(AppState.currentState);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const { data } = await api.get<Dashboard>('/dashboard');
      setDashboard(data);
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo cargar el tablero';
      Alert.alert('Error', String(msg));
    } finally {
      setRefreshing(false);
      setLoadingFirst(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const unsub = navigation.addListener?.('focus', fetchDashboard);
    return unsub;
  }, [navigation, fetchDashboard]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        setPolling(true);
        fetchDashboard();
      } else if (nextState.match(/inactive|background/)) {
        setPolling(false);
      }
      appState.current = nextState as any;
    });
    return () => sub.remove();
  }, [fetchDashboard]);

  useEffect(() => {
    let interval: NodeJS.Timer | null = null;
    if (polling) interval = setInterval(fetchDashboard, 60000);
    return () => { if (interval) clearInterval(interval); };
  }, [polling, fetchDashboard]);

  const goSearch = useCallback(() => {
    const q = search?.trim();
    if (!q) return;
    navigation.navigate('GlobalSearch', { q });
  }, [navigation, search]);

  const onChangeSearch = useCallback((txt: string) => {
    setSearch(txt);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 350);
  }, []);

  const kpisHoy = useMemo(() => {
    const vals = [
      { label: 'Ventas hoy', value: Number(dashboard?.salesToday ?? 0), fmt: moneyNI },
      { label: 'Margen hoy', value: Number(dashboard?.marginToday ?? 0), fmt: moneyNI },
      { label: 'Tickets hoy', value: Number(dashboard?.ticketsToday ?? 0), fmt: (v: number) => `${v}` },
    ];
    const max = Math.max(...vals.map(v => v.value), 1);
    return { items: vals, max };
  }, [dashboard]);

  const kpisMes = useMemo(() => {
    const vals = [
      { label: 'Ventas mes', value: Number(dashboard?.salesMonth ?? 0), fmt: moneyNI },
      { label: 'Margen mes', value: Number(dashboard?.marginMonth ?? 0), fmt: moneyNI },
      { label: 'Ticket prom.', value: Number(dashboard?.avgTicketMonth ?? 0), fmt: moneyNI },
    ];
    const max = Math.max(...vals.map(v => v.value), 1);
    return { items: vals, max };
  }, [dashboard]);

  const totals = useMemo(() => ([
    { label: 'Productos', value: String(dashboard?.productsTotal ?? '—'), to: () => navigation.navigate('ProductsList') },
    { label: 'Clientes', value: String(dashboard?.customersTotal ?? '—'), to: () => navigation.navigate('CustomersList') },
    { label: 'Almacenes', value: String(dashboard?.warehousesTotal ?? '—'), to: () => navigation.navigate('WarehousesList') },
  ]), [dashboard, navigation]);

  const sticky: number[] = [1];
  const onTogglePanel = () => setPanelOpen(o => !o);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Panel anclado o drawer */}
      <SidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        pinned={panelPinned}
        width={panelWidth}
        dashboard={dashboard}
        navigation={navigation}
        userEmail={currentUserEmail}
        polling={polling}
        onTogglePolling={() => setPolling(p => !p)}
      />

      {/* Contenido principal con centrado cuando el panel está anclado */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          { paddingBottom: 28 },
          panelPinned ? { paddingLeft: panelWidth } : null,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboard} />}
        stickyHeaderIndices={sticky}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* 0 - Header */}
        <View style={[styles.headerWrap]}>
          <View style={[styles.container, styles.containerMax]}>
            <View style={styles.headerInner}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Contadito</Text>
                <Text style={styles.meta}>
                  Empresa: <Text style={[styles.bold]}>{dashboard?.tenantName ?? '—'}</Text>
                  {'  '}·{'  '}
                  Plan: <Text style={[styles.bold, styles.planPill, planColor(dashboard?.plan)]}>{dashboard?.plan ?? '—'}</Text>
                </Text>
              </View>
              <View style={styles.headerBtns}>
                {!panelPinned && <SmallBtn title={panelOpen ? 'Cerrar panel' : 'Abrir panel'} onPress={onTogglePanel} />}
                <SmallBtn title="Usuario" onPress={() => navigation.navigate('UserScreen')} />
                <SmallBtn title="Cambiar empresa" onPress={() => navigation.navigate('TenantSwitch')} />
                <SmallBtn title="Cerrar sesión" onPress={logout} danger />
              </View>
            </View>
            {dashboard?.lastSync && (
              <Text style={styles.syncHint}>Sincronizado {timeAgo(dashboard.lastSync)} • {dashboard.lastSync}</Text>
            )}
          </View>
        </View>

        {/* 1 - Search (STICKY) */}
        <View style={[styles.sectionSticky]}>
          <View style={[styles.container, styles.containerMax]}>
            <View style={[styles.searchRow, { alignItems: 'center', gap: 10 }] }>
              <View style={[styles.searchWrap, { flex: 1 }]}>
                <TextInput
                  placeholder="Buscar productos, clientes o SKU…"
                  value={search}
                  onChangeText={onChangeSearch}
                  onSubmitEditing={goSearch}
                  style={styles.searchInput}
                  returnKeyType="search"
                  accessibilityLabel="Cuadro de búsqueda global"
                />
                {!!search && (
                  <Pressable onPress={() => setSearch('')} accessibilityLabel="Limpiar búsqueda" style={styles.searchClear}>
                    <Text style={[F, { fontSize: 16 }]}>×</Text>
                  </Pressable>
                )}
              </View>
              <SmallBtn title="Buscar" onPress={goSearch} />
              <SmallBtn title="Limpiar" onPress={() => setSearch('')} />
              <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
                <SmallBtn title="Venta" onPress={() => navigation.navigate('SaleCreate')} />
                <SmallBtn title="Compra" onPress={() => navigation.navigate('PurchaseCreate')} />
                <SmallBtn title="Producto" onPress={() => navigation.navigate('ProductForm')} />
                <SmallBtn title="Cliente" onPress={() => navigation.navigate('CustomerForm')} />
              </View>
            </View>
          </View>
        </View>

        {/* MAIN GRID */}
        <View style={[styles.container, styles.containerMax]}>
          <View style={[styles.main, isWide && styles.mainWide]}>
            {/* Columna izquierda */}
            <View style={[styles.col, isWide && styles.colLeft]}>
              {/* KPIs Hoy */}
              <Section title="Hoy" subtitle="Resultados del día en curso">
                <View style={[styles.grid, isXL ? styles.cols3 : styles.cols2]}>
                  {loadingFirst
                    ? [0,1,2].map(i => (
                        <Card key={`skh-${i}`}>
                          <Skeleton width={90} />
                          <Skeleton height={24} style={{ marginVertical: 8, width: 120 }} />
                          <Skeleton height={8} />
                        </Card>
                      ))
                    : kpisHoy.items.map(k => (
                        <Card key={k.label}>
                          <Label muted style={{ marginBottom: 6 }}>{k.label}</Label>
                          <Text style={[styles.kpiValue, isXL && styles.kpiValueXL]}>{k.fmt(k.value)}</Text>
                          <Bar value={k.value} max={kpisHoy.max} />
                        </Card>
                      ))}
                </View>
              </Section>

              {/* KPIs Mes */}
              <Section title="Este mes" subtitle="Acumulados del mes" >
                <View style={[styles.grid, isXL ? styles.cols3 : styles.cols2]}>
                  {loadingFirst
                    ? [0,1,2].map(i => (
                        <Card key={`skm-${i}`}>
                          <Skeleton width={100} />
                          <Skeleton height={24} style={{ marginVertical: 8, width: 140 }} />
                          <Skeleton height={8} />
                        </Card>
                      ))
                    : kpisMes.items.map(k => (
                        <Card key={k.label}>
                          <Label muted style={{ marginBottom: 6 }}>{k.label}</Label>
                          <Text style={[styles.kpiValue, isXL && styles.kpiValueXL]}>{k.fmt(k.value)}</Text>
                          <Bar value={k.value} max={kpisMes.max} />
                        </Card>
                      ))}
                </View>
              </Section>

              {/* Totales */}
              <Section
                title="Resumen de entidades"
                right={<View style={styles.row}><SmallBtn title="Productos" onPress={() => navigation.navigate('ProductsList')} /><SmallBtn title="Clientes" onPress={() => navigation.navigate('CustomersList')} /><SmallBtn title="Almacenes" onPress={() => navigation.navigate('WarehousesList')} /></View>}
              >
                <View style={[styles.grid, styles.cols3]}>
                  {(loadingFirst ? [0,1,2] : totals).map((k: any, idx: number) => (
                    <Card key={k?.label ?? `skt-${idx}`} onPress={k?.to}>
                      {loadingFirst ? (
                        <>
                          <Skeleton width={90} />
                          <Skeleton height={24} style={{ marginTop: 8, width: 60 }} />
                        </>
                      ) : (
                        <>
                          <Label muted style={{ marginBottom: 6 }}>{k.label}</Label>
                          <Text style={[styles.kpiValue, isXL && styles.kpiValueXL]}>{k.value}</Text>
                        </>
                      )}
                    </Card>
                  ))}
                </View>
              </Section>

              {/* Últimos productos */}
              <Section title="Últimos productos" right={<SmallBtn title="Ver todos" onPress={() => navigation.navigate('ProductsList')} />}>
                {loadingFirst ? (
                  <View style={{ gap: 8 }}>
                    {[...Array(isWide ? 8 : 5)].map((_, i) => (
                      <Card key={`skp-${i}`} style={{ paddingVertical: 10 }}>
                        <Skeleton width={200} />
                        <Skeleton width={120} style={{ marginTop: 6 }} />
                      </Card>
                    ))}
                  </View>
                ) : !dashboard?.latestProducts?.length ? (
                  <EmptyState title="Aún no tienes productos" subtitle="Crea tu primer producto para empezar a vender" actionLabel="Crear producto" onAction={() => navigation.navigate('ProductForm')} />
                ) : (
                  <View style={{ gap: 8 }}>
                    {dashboard.latestProducts.slice(0, isWide ? 8 : 5).map(item => (
                      <Card key={item.id} style={{ paddingVertical: 10 }} onPress={() => navigation.navigate('ProductForm', { id: item.id })}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.itemSub}>{item.sku}</Text>
                          </View>
                          <SmallBtn title="Editar" onPress={() => navigation.navigate('ProductForm', { id: item.id })} />
                        </View>
                      </Card>
                    ))}
                  </View>
                )}
              </Section>
            </View>

            {/* Columna derecha */}
            <View style={[styles.col, isWide && styles.colRight]}>
              {/* Alertas */}
              <Section title="Alertas" subtitle="Riesgos y pendientes" right={<View style={styles.row}><SmallBtn title="Refrescar" onPress={fetchDashboard} /></View>}>
                {/* Stock bajo */}
                <Card style={{ marginBottom: 12 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.panelTitle}>Stock bajo</Text>
                    {loadingFirst ? <ActivityIndicator /> : (
                      <Text style={[F, { color: '#6b7280' }]}>{dashboard?.lowStock?.length ?? 0}</Text>
                    )}
                  </View>

                  {loadingFirst ? (
                    <View style={{ gap: 8 }}>
                      {[...Array(4)].map((_, i) => (
                        <View key={`sks-${i}`} style={styles.rowBetween}>
                          <Skeleton width={200} />
                          <Skeleton width={70} height={28} />
                        </View>
                      ))}
                    </View>
                  ) : !dashboard?.lowStock?.length ? (
                    <Label muted>Sin alertas de stock.</Label>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {dashboard.lowStock.slice(0, 6).map((p) => (
                        <View key={p.id} style={styles.rowBetween}>
                          <Text numberOfLines={1} style={[F, { flex: 1, paddingRight: 8 }]}>
                            {p.sku} · {p.name}
                          </Text>
                          <SmallBtn title="Ver" onPress={() => navigation.navigate('ProductsList', { filter: 'lowStock' })} />
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ marginTop: 8 }}>
                    <SmallBtn title="Ver todos" onPress={() => navigation.navigate('ProductsList', { filter: 'lowStock' })} />
                    <SmallBtn title="Tienda Online" onPress={() => navigation.navigate('StoreFront', { tenantId: 5 })} />
                  </View>
                </Card>

                {/* Por cobrar */}
                <Card>
                  <View style={styles.rowBetween}>
                    <Text style={styles.panelTitle}>Por cobrar (próx. 7 días)</Text>
                    {loadingFirst ? <ActivityIndicator /> : (
                      <Text style={[F, { color: '#6b7280' }]}>{dashboard?.receivablesDueSoon?.length ?? 0}</Text>
                    )}
                  </View>

                  {loadingFirst ? (
                    <View style={{ gap: 8 }}>
                      {[...Array(4)].map((_, i) => (
                        <View key={`skr-${i}`} style={styles.rowBetween}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Skeleton width={230} />
                            <Skeleton width={120} style={{ marginTop: 6 }} />
                          </View>
                          <Skeleton width={60} height={26} />
                        </View>
                      ))}
                    </View>
                  ) : !dashboard?.receivablesDueSoon?.length ? (
                    <Label muted>Sin cuentas próximas a vencer.</Label>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {dashboard.receivablesDueSoon.slice(0, 6).map((i) => {
                        const tag =
                          i.dueInDays < 0 ? { label: 'Vencido', style: styles.badgeDanger } :
                          i.dueInDays === 0 ? { label: 'Hoy', style: styles.badgeWarning } :
                          i.dueInDays <= 3 ? { label: 'Pronto', style: styles.badgeOrange } :
                          { label: 'Esta semana', style: styles.badgeInfo };

                        return (
                          <View key={i.invoiceId} style={styles.rowBetween}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text numberOfLines={1} style={styles.itemTitle}>#{i.number} · {i.customerName ?? 'Cliente'}</Text>
                              <Text style={styles.itemSub}>vence en {i.dueInDays}d</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Badge style={tag.style}>{tag.label}</Badge>
                              <Badge>{moneyNI(i.dueAmount)}</Badge>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={{ marginTop: 8 }}>
                    <SmallBtn title="Ver cuentas por cobrar" onPress={() => navigation.navigate('ReceivablesList')} />
                  </View>
                </Card>
              </Section>

              {/* Actividad */}
              <Section title="Actividad reciente" subtitle="Últimos movimientos en el sistema">
                {loadingFirst ? (
                  <View style={{ gap: 8 }}>
                    {[...Array(isWide ? 10 : 6)].map((_, i) => (
                      <Card key={`ska-${i}`} style={{ paddingVertical: 10 }}>
                        <Skeleton width={220} />
                        <Skeleton width={120} style={{ marginTop: 6 }} />
                      </Card>
                    ))}
                  </View>
                ) : !dashboard?.activity?.length ? (
                  <Label muted>Sin actividad reciente.</Label>
                ) : (
                  <View style={{ gap: 8 }}>
                    {dashboard.activity.slice(0, isWide ? 10 : 6).map((a, idx) => (
                      <Card key={`${a.kind}-${a.refId}-${idx}`} style={{ paddingVertical: 10 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{a.kind}: {a.title}</Text>
                        <Text style={styles.itemSub}>{a.whenAt} · {timeAgo(a.whenAt)}</Text>
                      </Card>
                    ))}
                  </View>
                )}
              </Section>

              {/* Estado / Sync */}
              <Section title="Estado del sistema" subtitle="Conectividad y sincronización">
                <Card>
                  <View style={styles.statusRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.dot, { backgroundColor: dashboard?.online ? '#10b981' : '#f59e0b' }]} />
                      <Text style={[F, { color: dashboard?.online ? '#065f46' : '#92400e' }]}>
                        {dashboard?.online ? 'Conectado' : 'Sin conexión'}
                      </Text>
                    </View>
                    <Label muted>Último sync: {dashboard?.lastSync ? `${dashboard.lastSync} · ${timeAgo(dashboard.lastSync)}` : '—'}</Label>
                  </View>
                  <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <SmallBtn title="Refrescar tablero" onPress={fetchDashboard} />
                    <SmallBtn title={polling ? 'Pausar auto-refresco' : 'Reanudar auto-refresco'} onPress={() => setPolling(p => !p)} />
                  </View>
                </Card>
              </Section>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------- EmptyState reutilizable ----------------
const EmptyState: React.FC<{ title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }>
= ({ title, subtitle, actionLabel, onAction }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    {!!actionLabel && !!onAction && (
      <SmallBtn title={actionLabel} onPress={onAction} style={{ marginTop: 8 }} />
    )}
  </View>
);

// ---------------- Helpers de estilo ----------------
function planColor(plan?: string) {
  switch ((plan || '').toLowerCase()) {
    case 'pro': return { backgroundColor: '#dbeafe', color: '#1e40af' };
    case 'business': return { backgroundColor: '#dcfce7', color: '#166534' };
    default: return { backgroundColor: '#f3f4f6', color: '#111827' };
  }
}

// ---------------- Estilos ----------------
const styles = StyleSheet.create({
  // Layout
  container: { width: '100%', paddingHorizontal: 16 },
  containerMax: { maxWidth: 1280, alignSelf: 'center' },

  // Header
  headerWrap: { paddingTop: 12, paddingBottom: 8, backgroundColor: '#ffffff', borderBottomColor: '#eef0f4', borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerLeft: { flex: 1, minWidth: 0 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  title: { ...F, fontSize: 24, marginBottom: 4, color: '#0f172a' },
  meta: { ...F, color: '#64748b' },
  bold: { ...F, },
  planPill: { ...F, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },

  syncHint: { ...F, color: '#94a3b8', marginTop: 4 },

  // Sticky search bar
  sectionSticky: { backgroundColor: '#ffffff', borderBottomColor: '#eef0f4', borderBottomWidth: 1, paddingVertical: 8 },

  // Secciones
  section: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  sectionTitle: { ...F, fontSize: 16, color: '#0f172a' },
  sectionSub: { ...F, fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Main grid
  main: { paddingHorizontal: 16, paddingTop: 12 },
  mainWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  col: { flex: 1, minWidth: 0 },
  colLeft: { flex: 7 },
  colRight: { flex: 5 },

  // Tipos
  itemTitle: { ...F, fontSize: 16, color: '#0f172a' },
  itemSub: { ...F, fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Search
  searchRow: { flexDirection: 'row' },
  searchWrap: { position: 'relative' },
  searchInput: { ...F, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, minHeight: 42, paddingRight: 34, backgroundColor: '#fff', fontSize: 16 },
  searchClear: { position: 'absolute', right: 10, top: 9, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },

  // Grid / cards
  grid: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  cols3: {},
  cols2: {},
  card: { flexGrow: 1, minWidth: 220, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eef0f4', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 },

  // KPI
  kpiValue: { ...F, fontSize: 20, marginBottom: 8, color: '#111827' },
  kpiValueXL: { fontSize: 24 },

  // Barras
  barTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#2563eb' },

  // Paneles (cards)
  panelTitle: { ...F, color: '#0f172a' },

  // Badges base
  badge: { ...F, backgroundColor: '#eef2ff', color: '#1e3a8a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  badgeDanger: { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeWarning: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeOrange: { backgroundColor: '#ffedd5', color: '#9a3412' },
  badgeInfo: { backgroundColor: '#dbeafe', color: '#1e40af' },

  // Estado
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 999 },

  // Empty
  empty: { padding: 16, alignItems: 'flex-start', gap: 6 },
  emptyTitle: { ...F, },
  emptySub: { ...F, color: '#6b7280' },

  // Small button
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-start', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  smallBtnDanger: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  smallBtnText: { ...F, color: '#111827' },

  // ===== Panel lateral =====
  panelPinnedWrap: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ffffff', borderRightColor: '#eef0f4', borderRightWidth: 1, zIndex: 10 },
  panelDrawer: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ffffff', borderRightColor: '#eef0f4', borderRightWidth: 1, zIndex: 20 },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', zIndex: 15 },

  panel: { flex: 1, paddingTop: Platform.OS === 'web' ? 16 : 44, paddingHorizontal: 16, paddingBottom: 16 },
  panelHeaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...F, color: '#1e40af' },
  panelTitleMain: { ...F, color: '#0f172a' },
  panelSubtitle: { ...F, color: '#64748b', fontSize: 12, marginTop: 2 },

  panelCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#eef0f4', borderRadius: 12, padding: 12, marginBottom: 12 },
  panelCardTitle: { ...F, color: '#0f172a' },
  panelCardSub: { ...F, color: '#64748b', marginTop: 6 },

  panelBlock: { marginBottom: 14 },
  panelBlockTitle: { ...F, fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 6, borderBottomColor: '#f1f5f9', borderBottomWidth: 1 },
  panelRowLabel: { ...F, color: '#6b7280', width: 120, fontSize: 12 },
  panelRowValue: { ...F, color: '#0f172a', flex: 1 },

  linkLike: { ...F, color: '#1e40af' },
  linkChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  linkChipText: { ...F, color: '#0f172a' },
  panelFoot: { ...F, marginTop: 8, color: '#94a3b8', fontSize: 12, textAlign: 'center' },
});
