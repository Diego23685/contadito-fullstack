// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../api';

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
    invoice_id: number;
    number: string;
    customer_name: string | null;
    total: number;
    due_amount: number;
    due_in_days: number;
  }[];
  activity: {
    kind: string;
    ref_id: number;
    title: string;
    when_at: string;
  }[];
};

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
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

  const kpisHoy = useMemo(() => ([
    { label: 'Ventas hoy', value: money(dashboard?.salesToday) },
    { label: 'Margen hoy', value: money(dashboard?.marginToday) },
    { label: 'Tickets hoy', value: String(dashboard?.ticketsToday ?? 0) },
  ]), [dashboard, money]);

  const kpisMes = useMemo(() => ([
    { label: 'Ventas mes', value: money(dashboard?.salesMonth) },
    { label: 'Margen mes', value: money(dashboard?.marginMonth) },
    { label: 'Ticket prom.', value: money(dashboard?.avgTicketMonth) },
  ]), [dashboard, money]);

  const totals = useMemo(() => ([
    { label: 'Productos', value: String(dashboard?.productsTotal ?? '...') },
    { label: 'Clientes', value: String(dashboard?.customersTotal ?? '...') },
    { label: 'Almacenes', value: String(dashboard?.warehousesTotal ?? '...') },
  ]), [dashboard]);

  const goSearch = useCallback(() => {
    if (!search?.trim()) return;
    navigation.navigate('GlobalSearch', { q: search.trim() });
  }, [navigation, search]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboard} />}
    >
      {/* Encabezado tenant + estado */}
      <View style={[styles.section, { paddingTop: 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Inicio</Text>
            <Text style={styles.meta}>
              Empresa: <Text style={styles.bold}>{dashboard?.tenantName ?? '—'}</Text> · Plan: <Text style={styles.bold}>{dashboard?.plan ?? '—'}</Text>
            </Text>
          </View>
          <View style={styles.headerBtns}>
            <Button title="Cambiar empresa" onPress={() => navigation.navigate('TenantSwitch')} />
          </View>
        </View>

        {/* Buscar global */}
        <TextInput
          placeholder="Buscar productos, clientes o SKU…"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={goSearch}
          style={styles.search}
          returnKeyType="search"
        />
        <View style={{ height: 8 }} />
        <View style={styles.row}>
          <Button title="Buscar" onPress={goSearch} />
          <Button title="Limpiar" onPress={() => setSearch('')} />
        </View>

        {/* Acciones rápidas */}
        <View style={[styles.quickGrid, { marginTop: 12 }]}>
          <Button title="Venta" onPress={() => navigation.navigate('SaleCreate')} />
          <Button title="Compra" onPress={() => navigation.navigate('PurchaseCreate')} />
          <Button title="Producto" onPress={() => navigation.navigate('ProductForm')} />
          <Button title="Cliente" onPress={() => navigation.navigate('CustomerForm')} />
        </View>
      </View>

      {/* Totales existentes (compatibles con tu UI actual) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen de entidades</Text>
        <View style={styles.cards}>
          {totals.map((k) => (
            <View key={k.label} style={styles.card}>
              <Text style={styles.cardLabel}>{k.label}</Text>
              <Text style={styles.cardValue}>{k.value}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Button title="Productos" onPress={() => navigation.navigate('ProductsList')} />
          <Button title="Clientes" onPress={() => navigation.navigate('CustomersList')} />
          <Button title="Almacenes" onPress={() => navigation.navigate('WarehousesList')} />
        </View>
      </View>

      {/* KPIs de HOY */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hoy</Text>
        <View style={styles.cards}>
          {kpisHoy.map((k) => (
            <View key={k.label} style={styles.card}>
              <Text style={styles.cardLabel}>{k.label}</Text>
              <Text style={styles.cardValue}>{k.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* KPIs del MES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Este mes</Text>
        <View style={styles.cards}>
          {kpisMes.map((k) => (
            <View key={k.label} style={styles.card}>
              <Text style={styles.cardLabel}>{k.label}</Text>
              <Text style={styles.cardValue}>{k.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Alertas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alertas</Text>

        {/* Stock bajo */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Stock bajo</Text>
          {!dashboard?.lowStock?.length ? (
            <Text style={styles.muted}>Sin alertas de stock.</Text>
          ) : (
            dashboard.lowStock.map((p) => (
              <View key={p.id} style={styles.rowBetween}>
                <Text numberOfLines={1}>{p.sku} · {p.name}</Text>
                <Button title="Ver" onPress={() => navigation.navigate('ProductsList', { filter: 'lowStock' })} />
              </View>
            ))
          )}
        </View>

        {/* Por cobrar próximos a vencer */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Por cobrar (próx. 7 días)</Text>
          {!dashboard?.receivablesDueSoon?.length ? (
            <Text style={styles.muted}>Sin cuentas próximas a vencer.</Text>
          ) : (
            dashboard.receivablesDueSoon.map((i) => (
              <View key={i.invoice_id} style={styles.rowBetween}>
                <Text numberOfLines={1}>
                  #{i.number} · {i.customer_name ?? 'Cliente'} · vence en {i.due_in_days}d
                </Text>
                <Text style={styles.badge}>{money(i.due_amount)}</Text>
              </View>
            ))
          )}
          <View style={{ marginTop: 8 }}>
            <Button title="Ver cuentas por cobrar" onPress={() => navigation.navigate('ReceivablesList')} />
          </View>
        </View>
      </View>

      {/* Actividad reciente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actividad reciente</Text>
        {!dashboard?.activity?.length ? (
          <Text style={styles.muted}>Sin actividad reciente.</Text>
        ) : (
          dashboard.activity.slice(0, 10).map((a, idx) => (
            <View key={`${a.kind}-${a.ref_id}-${idx}`} style={styles.activityItem}>
              <Text style={styles.itemTitle}>{a.kind}: {a.title}</Text>
              <Text style={styles.itemSub}>{a.when_at}</Text>
            </View>
          ))
        )}
      </View>

      {/* Últimos productos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimos productos</Text>
        {!dashboard?.latestProducts?.length ? (
          <Text style={styles.muted}>No hay productos para mostrar.</Text>
        ) : (
          dashboard.latestProducts.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemSub}>{item.sku}</Text>
              <View style={styles.rowRight}>
                <Button title="Editar" onPress={() => navigation.navigate('ProductForm', { id: item.id })} />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Estado de conexión / sync y acciones */}
      <View style={styles.section}>
        <View style={styles.statusBar}>
          <Text style={{ color: dashboard?.online ? '#065f46' : '#92400e', fontWeight: '600' }}>
            {dashboard?.online ? 'Conectado' : 'Sin conexión'}
          </Text>
          <Text style={styles.muted}>Último sync: {dashboard?.lastSync ?? '—'}</Text>
        </View>

        <View style={{ marginTop: 8 }}>
          <Button title="Refrescar tablero" onPress={fetchDashboard} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },

  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  headerBtns: { flexDirection: 'row', gap: 8 },

  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  meta: { color: '#6b7280' },
  bold: { fontWeight: '700' },

  search: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, minHeight: 42, marginTop: 8,
  },

  row: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', alignItems: 'center' },
  rowRight: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 8 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  cards: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  card: { flex: 1, backgroundColor: '#f8f9fb', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eef0f4' },
  cardLabel: { color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '700' },

  panel: { borderWidth: 1, borderColor: '#eef0f4', backgroundColor: '#fafafa', padding: 12, borderRadius: 10, marginBottom: 10 },
  panelTitle: { fontWeight: '700', marginBottom: 6 },

  muted: { color: '#6b7280' },

  activityItem: { paddingVertical: 8, borderBottomColor: '#eee', borderBottomWidth: 1 },
  listItem: { paddingVertical: 10, borderBottomColor: '#eee', borderBottomWidth: 1 },

  itemTitle: { fontSize: 16, fontWeight: '500' },
  itemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  statusBar: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  badge: { fontWeight: '700' },
});
