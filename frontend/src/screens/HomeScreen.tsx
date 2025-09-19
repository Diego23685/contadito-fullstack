// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import {
  Alert,
  Button,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { api } from '../api';
import { AuthContext } from '../providers/AuthContext';

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

// --------- UI Helpers ----------
const Card: React.FC<{ style?: any; children: React.ReactNode; onPress?: () => void }> = ({ style, children, onPress }) => {
  const Comp: any = onPress ? Pressable : View;
  return (
    <Comp onPress={onPress} style={[styles.card, style, onPress && { opacity: 1 }]}>
      {children}
    </Comp>
  );
};

const Section: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode; style?: any }> = ({ title, right, children, style }) => (
  <View style={[styles.section, style]}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right ? <View>{right}</View> : null}
    </View>
    {children}
  </View>
);

const Label: React.FC<{ children: React.ReactNode; muted?: boolean; style?: any }> = ({ children, muted, style }) => (
  <Text style={[{ color: muted ? '#6b7280' : '#111827' }, style]}>{children}</Text>
);

const Badge: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <Text style={[styles.badge, style]}>{children}</Text>
);

// Barra horizontal proporcional (sin libs)
const Bar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
    </View>
  );
};

// --------- Pantalla ----------
export default function HomeScreen({ navigation }: Props) {
  const { logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isWide = width >= 700;   // 2 columnas
  const isXL = width >= 1000;    // grillas más anchas

  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [search, setSearch] = useState('');

  const money = useCallback((v?: number | null) => {
    const n = Number(v ?? 0);
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n);
  }, []);

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
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // KPIs HOY (con barras relativas entre sí)
  const kpisHoy = useMemo(() => {
    const vals = [
      { label: 'Ventas hoy', value: Number(dashboard?.salesToday ?? 0), fmt: money },
      { label: 'Margen hoy', value: Number(dashboard?.marginToday ?? 0), fmt: money },
      { label: 'Tickets hoy', value: Number(dashboard?.ticketsToday ?? 0), fmt: (v: number) => `${v}` },
    ];
    const max = Math.max(...vals.map(v => v.value), 1);
    return { items: vals, max };
  }, [dashboard, money]);

  // KPIs MES
  const kpisMes = useMemo(() => {
    const vals = [
      { label: 'Ventas mes', value: Number(dashboard?.salesMonth ?? 0), fmt: money },
      { label: 'Margen mes', value: Number(dashboard?.marginMonth ?? 0), fmt: money },
      { label: 'Ticket prom.', value: Number(dashboard?.avgTicketMonth ?? 0), fmt: money },
    ];
    const max = Math.max(...vals.map(v => v.value), 1);
    return { items: vals, max };
  }, [dashboard, money]);

  const totals = useMemo(() => ([
    { label: 'Productos', value: String(dashboard?.productsTotal ?? '...'), to: () => navigation.navigate('ProductsList') },
    { label: 'Clientes', value: String(dashboard?.customersTotal ?? '...'), to: () => navigation.navigate('CustomersList') },
    { label: 'Almacenes', value: String(dashboard?.warehousesTotal ?? '...'), to: () => navigation.navigate('WarehousesList') },
  ]), [dashboard, navigation]);

  const goSearch = useCallback(() => {
    if (!search?.trim()) return;
    navigation.navigate('GlobalSearch', { q: search.trim() });
  }, [navigation, search]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboard} />}
    >
      {/* Header */}
      <View style={[styles.headerWrap]}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Contadito</Text>
          <Text style={styles.meta}>
            Empresa: <Text style={styles.bold}>{dashboard?.tenantName ?? '—'}</Text> · Plan: <Text style={styles.bold}>{dashboard?.plan ?? '—'}</Text>
          </Text>
        </View>
        <View style={styles.headerBtns}>
          <Button title="Cambiar empresa" onPress={() => navigation.navigate('TenantSwitch')} />
          <Button title="Cerrar sesión" color="#b91c1c" onPress={logout} />
        </View>
      </View>

      {/* Search + Quick actions */}
      <View style={[styles.section, { paddingTop: 0 }]}>
        <View style={[styles.searchRow, isWide && { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <TextInput
            placeholder="Buscar productos, clientes o SKU…"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={goSearch}
            style={[styles.search, isWide && { flex: 1 }]}
            returnKeyType="search"
          />
          <View style={[styles.row, { marginTop: isWide ? 0 : 8 }]}>
            <Button title="Buscar" onPress={goSearch} />
            <Button title="Limpiar" onPress={() => setSearch('')} />
          </View>
        </View>

        <View style={[styles.quickGrid, { marginTop: 12 }]}>
          <Button title="Venta" onPress={() => navigation.navigate('SaleCreate')} />
          <Button title="Compra" onPress={() => navigation.navigate('PurchaseCreate')} />
          <Button title="Producto" onPress={() => navigation.navigate('ProductForm')} />
          <Button title="Cliente" onPress={() => navigation.navigate('CustomerForm')} />
        </View>
      </View>

      {/* MAIN GRID (dos columnas en pantallas anchas) */}
      <View style={[styles.main, isWide && styles.mainWide]}>
        {/* Columna izquierda */}
        <View style={[styles.col, isWide && styles.colLeft]}>
          {/* KPIs Hoy */}
          <Section title="Hoy">
            <View style={[styles.grid, isXL ? styles.cols3 : styles.cols2]}>
              {kpisHoy.items.map(k => (
                <Card key={k.label}>
                  <Label muted style={{ marginBottom: 6 }}>{k.label}</Label>
                  <Text style={styles.kpiValue}>{k.fmt(k.value)}</Text>
                  <Bar value={k.value} max={kpisHoy.max} />
                </Card>
              ))}
            </View>
          </Section>

          {/* KPIs Mes */}
          <Section title="Este mes">
            <View style={[styles.grid, isXL ? styles.cols3 : styles.cols2]}>
              {kpisMes.items.map(k => (
                <Card key={k.label}>
                  <Label muted style={{ marginBottom: 6 }}>{k.label}</Label>
                  <Text style={styles.kpiValue}>{k.fmt(k.value)}</Text>
                  <Bar value={k.value} max={kpisMes.max} />
                </Card>
              ))}
            </View>
          </Section>

          {/* Totales */}
          <Section
            title="Resumen de entidades"
            right={<View style={styles.row}>
              <Button title="Productos" onPress={() => navigation.navigate('ProductsList')} />
              <Button title="Clientes" onPress={() => navigation.navigate('CustomersList')} />
              <Button title="Almacenes" onPress={() => navigation.navigate('WarehousesList')} />
            </View>}
          >
            <View style={[styles.grid, styles.cols3]}>
              {totals.map(k => (
                <Card key={k.label} onPress={k.to}>
                  <Label muted style={{ marginBottom: 6 }}>{k.label}</Label>
                  <Text style={styles.kpiValue}>{k.value}</Text>
                </Card>
              ))}
            </View>
          </Section>

          {/* Últimos productos */}
          <Section
            title="Últimos productos"
            right={<Button title="Ver todos" onPress={() => navigation.navigate('ProductsList')} />}
          >
            {!dashboard?.latestProducts?.length ? (
              <Label muted>No hay productos para mostrar.</Label>
            ) : (
              <View style={{ gap: 8 }}>
                {dashboard.latestProducts.slice(0, isWide ? 8 : 5).map(item => (
                  <Card key={item.id} style={{ paddingVertical: 10 }}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemSub}>{item.sku}</Text>
                      </View>
                      <Button title="Editar" onPress={() => navigation.navigate('ProductForm', { id: item.id })} />
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
          <Section
            title="Alertas"
            right={<View style={styles.row}><Button title="Refrescar" onPress={fetchDashboard} /></View>}
          >
            {/* Stock bajo */}
            <Card style={{ marginBottom: 12 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.panelTitle}>Stock bajo</Text>
                <Text style={{ color: '#6b7280' }}>{dashboard?.lowStock?.length ?? 0}</Text>
              </View>

              {!dashboard?.lowStock?.length ? (
                <Label muted>Sin alertas de stock.</Label>
              ) : (
                <View style={{ gap: 8 }}>
                  {dashboard.lowStock.slice(0, 6).map((p) => (
                    <View key={p.id} style={styles.rowBetween}>
                      <Text numberOfLines={1} style={{ flex: 1, paddingRight: 8 }}>
                        {p.sku} · {p.name}
                      </Text>
                      <Button title="Ver" onPress={() => navigation.navigate('ProductsList', { filter: 'lowStock' })} />
                    </View>
                  ))}
                </View>
              )}

              <View style={{ marginTop: 8 }}>
                <Button title="Ver todos" onPress={() => navigation.navigate('ProductsList', { filter: 'lowStock' })} />
              </View>
            </Card>

            {/* Por cobrar */}
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.panelTitle}>Por cobrar (próx. 7 días)</Text>
                <Text style={{ color: '#6b7280' }}>{dashboard?.receivablesDueSoon?.length ?? 0}</Text>
              </View>

              {!dashboard?.receivablesDueSoon?.length ? (
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
                          <Text numberOfLines={1} style={styles.itemTitle}>
                            #{i.number} · {i.customerName ?? 'Cliente'}
                          </Text>
                          <Text style={styles.itemSub}>
                            vence en {i.dueInDays}d
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Badge style={tag.style}>{tag.label}</Badge>
                          <Badge>{money(i.dueAmount)}</Badge>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={{ marginTop: 8 }}>
                <Button title="Ver cuentas por cobrar" onPress={() => navigation.navigate('ReceivablesList')} />
              </View>
            </Card>
          </Section>

          {/* Actividad */}
          <Section title="Actividad reciente">
            {!dashboard?.activity?.length ? (
              <Label muted>Sin actividad reciente.</Label>
            ) : (
              <View style={{ gap: 8 }}>
                {dashboard.activity.slice(0, isWide ? 10 : 6).map((a, idx) => (
                  <Card key={`${a.kind}-${a.refId}-${idx}`} style={{ paddingVertical: 10 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{a.kind}: {a.title}</Text>
                    <Text style={styles.itemSub}>{a.whenAt}</Text>
                  </Card>
                ))}
              </View>
            )}
          </Section>

          {/* Estado / Sync */}
          <Section title="Estado del sistema">
            <Card>
              <View style={styles.statusRow}>
                <Text style={{ color: dashboard?.online ? '#065f46' : '#92400e', fontWeight: '700' }}>
                  {dashboard?.online ? 'Conectado' : 'Sin conexión'}
                </Text>
                <Label muted>Último sync: {dashboard?.lastSync ?? '—'}</Label>
              </View>
              <View style={{ marginTop: 8 }}>
                <Button title="Refrescar tablero" onPress={fetchDashboard} />
              </View>
            </Card>
          </Section>
        </View>
      </View>
    </ScrollView>
  );
}

// --------- Estilos ----------
const styles = StyleSheet.create({
  // Estructura general
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  headerLeft: { flex: 1 },
  headerBtns: { flexDirection: 'row', gap: 8 },

  section: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  main: { paddingHorizontal: 16 },
  mainWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  col: { flex: 1 },
  colLeft: { flex: 7 },
  colRight: { flex: 5 },

  // Tipos
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  meta: { color: '#6b7280' },
  bold: { fontWeight: '700' },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Search / acciones
  searchRow: { flexDirection: 'column' },
  search: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, minHeight: 42, marginTop: 8,
  },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-start', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },

  // Cards / grid
  grid: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  cols3: {},
  cols2: {},
  card: {
    flexGrow: 1,
    minWidth: 180,
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eef0f4',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  // KPI
  kpiValue: { fontSize: 20, fontWeight: '800', marginBottom: 8 },

  // Barras
  barTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#2563eb' },

  // Paneles
  panelTitle: { fontWeight: '700', marginBottom: 8 },

  // Badges base
  badge: {
    backgroundColor: '#eef2ff',
    color: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '700',
  },
  // Variantes de urgencia
  badgeDanger: { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeWarning: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeOrange: { backgroundColor: '#ffedd5', color: '#9a3412' },
  badgeInfo: { backgroundColor: '#dbeafe', color: '#1e40af' },

  // Estado
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
