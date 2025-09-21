// src/screens/UserScreen.tsx — perfil responsive y pro para pantallas grandes
import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Switch,
  Platform,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../providers/AuthContext';
import { api } from '../../api';

type DashboardSnap = {
  tenantName?: string;
  plan?: string;
  online?: boolean;
  lastSync?: string;
  productsTotal?: number;
  customersTotal?: number;
  warehousesTotal?: number;
};

function base64UrlDecode(input: string) {
  try {
    const pad = (s: string) => s + '==='.slice((s.length + 3) % 4);
    const b64 = pad(input).replace(/-/g, '+').replace(/_/g, '/');
    // RN Web
    if (typeof atob === 'function') {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(b64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }
    // RN Nativo
    const buffer = Buffer.from(b64, 'base64');
    return buffer.toString('utf-8');
  } catch {
    return '';
  }
}

function parseJwt(token?: string | null): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function timeFromNowUnix(expSec?: number): { label: string; expired: boolean } {
  if (!expSec) return { label: '—', expired: false };
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = expSec - nowSec;
  const expired = diff <= 0;
  const abs = Math.abs(diff);
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const label = expired
    ? `expirado hace ${d ? `${d}d ` : ''}${h ? `${h}h ` : ''}${m}m`
    : `expira en ${d ? `${d}d ` : ''}${h ? `${h}h ` : ''}${m}m`;
  return { label, expired };
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{(value ?? '—') as any}</Text>
    </View>
  );
}

function Chip({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip}>
      <Text style={styles.chipText}>{title}</Text>
    </Pressable>
  );
}

function StatTile({ label, value, hint, pill }: { label: string; value: React.ReactNode; hint?: string; pill?: boolean }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, pill && styles.statPill]}>{value as any}</Text>
      {!!hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

function planPillStyle(plan?: string) {
  switch ((plan || '').toLowerCase()) {
    case 'pro': return { backgroundColor: '#dbeafe', color: '#1e40af' };
    case 'business': return { backgroundColor: '#dcfce7', color: '#166534' };
    default: return { backgroundColor: '#f3f4f6', color: '#111827' };
  }
}

export default function UserScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const maxW = 1200; // centrado en pantallas XL
  const cols = width >= 1200 ? 3 : width >= 860 ? 2 : 1;

  const auth = useContext(AuthContext) as any;
  const route = useRoute<any>();

  // Context (si existe)
  const ctxUser = auth?.user ?? null;
  const ctxEmail = ctxUser?.email ?? auth?.email ?? null;
  const ctxName = ctxUser?.name ?? null;
  const ctxRole = ctxUser?.role ?? null;
  const ctxTenantName = auth?.tenant?.name ?? null;
  const token: string | null = auth?.token ?? null;

  // JWT
  const claims = useMemo(() => parseJwt(token), [token]);
  const jwtEmail = claims?.email ?? claims?.Email ?? null;
  const jwtRole = claims?.role ?? claims?.Role ?? null;
  const jwtTenantId = claims?.tenant_id ?? claims?.tenantId ?? null;
  const jwtExp = claims?.exp as number | undefined;
  const { label: expLabel, expired } = timeFromNowUnix(jwtExp);

  // Snapshot
  const snapshot: DashboardSnap | undefined = route?.params?.snapshot;

  // Estado remoto /dashboard
  const [loading, setLoading] = useState<boolean>(!snapshot);
  const [dash, setDash] = useState<DashboardSnap | null>(snapshot ?? null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<any>('/dashboard');
      setDash({
        tenantName: data?.tenantName,
        plan: data?.plan,
        online: data?.online,
        lastSync: data?.lastSync,
        productsTotal: data?.productsTotal,
        customersTotal: data?.customersTotal,
        warehousesTotal: data?.warehousesTotal,
      });
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudieron cargar los datos';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (!snapshot) load();
    }, [snapshot])
  );

  // Final fields
  const name = ctxName ?? 'Usuario';
  const email = ctxEmail ?? jwtEmail ?? '—';
  const role = ctxRole ?? jwtRole ?? '—';
  const tenantName = dash?.tenantName ?? ctxTenantName ?? '—';
  const plan = dash?.plan ?? '—';
  const planStyle = planPillStyle(plan);

  // Preferencias locales (solo UI)
  const [dark, setDark] = useState(false);
  const [nio, setNio] = useState(true);

  // Avatar initials
  const initials = useMemo(() => {
    const s = (name || email || 'U').trim();
    const parts = s.split(' ').filter(Boolean);
    const t = (parts[0]?.[0] ?? s[0]) + (parts[1]?.[0] ?? '');
    return t.toUpperCase();
  }, [name, email]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={[styles.centerWrap, { maxWidth: maxW }]}>
        {/* ===== Hero Perfil ===== */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{name}</Text>
              <Text style={styles.heroSub}>{email}</Text>
              <View style={styles.heroBadges}>
                <Text style={[styles.pill, { backgroundColor: '#eef2ff', color: '#1e3a8a' }]}>Rol: {String(role)}</Text>
                <Text style={[styles.pill, planStyle]}>Plan: {String(plan)}</Text>
                {jwtTenantId ? (
                  <Text style={[styles.pill, { backgroundColor: '#ecfeff', color: '#155e75' }]}>Tenant ID: {jwtTenantId}</Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Chip title="Cambiar empresa" onPress={() => navigation.navigate('TenantSwitch')} />
            <Chip title="Seguridad" onPress={() => navigation.navigate('Security')} />
            <Chip title="Volver al inicio" onPress={() => navigation.navigate('Home')} />
          </View>
        </View>

        {/* ===== Grid de Stats (responsive) ===== */}
        <View style={[styles.grid, cols === 3 ? styles.cols3 : cols === 2 ? styles.cols2 : styles.cols1]}>
          <View style={styles.card}>
            <StatTile label="Empresa" value={tenantName} hint={dash?.online ? 'Conectado' : 'Sin conexión'} />
          </View>
          <View style={styles.card}>
            <StatTile label="Productos" value={dash?.productsTotal ?? (loading ? '...' : '0')} />
          </View>
          <View style={styles.card}>
            <StatTile label="Clientes" value={dash?.customersTotal ?? (loading ? '...' : '0')} />
          </View>
          <View style={styles.card}>
            <StatTile label="Almacenes" value={dash?.warehousesTotal ?? (loading ? '...' : '0')} />
          </View>
          <View style={styles.card}>
            <StatTile label="Último sync" value={dash?.lastSync ?? (loading ? '...' : '—')} />
          </View>
          <View style={styles.card}>
            <StatTile
              label="Sesión (JWT)"
              value={expired ? 'Expirada' : 'Activa'}
              hint={expLabel}
              pill
            />
          </View>
        </View>

        {/* ===== Información Detallada ===== */}
        <View style={[styles.card, styles.block]}>
          <Text style={styles.blockTitle}>Información</Text>

          {loading ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Row label="Nombre" value={name} />
              <Row label="Email" value={email} />
              <Row label="Rol" value={String(role)} />

              <View style={{ height: 8 }} />
              <Text style={styles.subTitle}>Empresa</Text>
              <Row label="Nombre" value={tenantName} />
              <Row label="Plan" value={String(plan)} />
              <Row label="Productos" value={dash?.productsTotal ?? null} />
              <Row label="Clientes" value={dash?.customersTotal ?? null} />
              <Row label="Almacenes" value={dash?.warehousesTotal ?? null} />
            </>
          )}
        </View>

        {/* ===== Sesión y Seguridad ===== */}
        <View style={[styles.card, styles.block]}>
          <Text style={styles.blockTitle}>Sesión y seguridad</Text>
          <Row label="Plataforma" value={`${Platform.OS} ${Platform.Version ?? ''}`} />
          <Row label="Estado JWT" value={expired ? 'Expirada' : 'Activa'} />
          <Row label="Tiempo" value={expLabel} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Chip title="Cerrar sesión" onPress={auth?.logout ?? (() => {})} />
            <Chip title="Refrescar datos" onPress={() => load()} />
          </View>
        </View>

        {/* ===== Preferencias (local UI) ===== */}
        <View style={[styles.card, styles.block]}>
          <Text style={styles.blockTitle}>Preferencias</Text>
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Tema oscuro</Text>
            <Switch value={dark} onValueChange={setDark} />
          </View>
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Moneda por defecto</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setNio(true)} style={[styles.pillBtn, nio && styles.pillBtnActive]}>
                <Text style={[styles.pillBtnTxt, nio && styles.pillBtnTxtActive]}>NIO</Text>
              </Pressable>
              <Pressable onPress={() => setNio(false)} style={[styles.pillBtn, !nio && styles.pillBtnActive]}>
                <Text style={[styles.pillBtnTxt, !nio && styles.pillBtnTxtActive]}>USD</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.prefHint}>Estas preferencias son locales a este dispositivo (solo UI).</Text>
        </View>

        {/* ===== Accesos Rápidos (extra) ===== */}
        <View style={[styles.card, styles.block]}>
          <Text style={styles.blockTitle}>Accesos rápidos</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Chip title="Productos" onPress={() => navigation.navigate('ProductsList')} />
            <Chip title="Clientes" onPress={() => navigation.navigate('CustomersList')} />
            <Chip title="Cuentas por cobrar" onPress={() => navigation.navigate('ReceivablesList')} />
            <Chip title="Facturación" onPress={() => navigation.navigate('Billing')} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Contenedor centrado
  centerWrap: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Hero
  heroCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#eef0f4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64, height: 64, borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: '#e2e8f0',
  },
  avatarTxt: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  heroSub: { color: '#64748b', marginTop: 2 },
  heroBadges: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '800', overflow: 'hidden' },
  heroActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },

  // Grid de stats
  grid: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  cols1: {},
  cols2: {},
  cols3: {},
  card: {
    flexGrow: 1, minWidth: 260,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1, borderColor: '#eef0f4',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statTile: { gap: 6 },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  statValue: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  statPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    alignSelf: 'flex-start', overflow: 'hidden',
    backgroundColor: '#f1f5f9', color: '#0f172a',
  },
  statHint: { color: '#64748b', fontSize: 12 },

  // Bloques
  block: { marginTop: 12 },
  blockTitle: { fontWeight: '800', color: '#0f172a', fontSize: 16, marginBottom: 8 },
  subTitle: { fontWeight: '800', color: '#0f172a', fontSize: 13, marginBottom: 4 },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel: { width: 140, color: '#64748b', fontSize: 12 },
  rowValue: { flex: 1, color: '#0f172a', fontWeight: '600' },

  // Chips
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  chipText: { fontWeight: '800', color: '#0f172a' },

  // Preferencias
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  prefLabel: { color: '#0f172a', fontWeight: '600' },
  prefHint: { color: '#64748b', fontSize: 12, marginTop: 6 },
  pillBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  pillBtnActive: { backgroundColor: '#0f172a' },
  pillBtnTxt: { color: '#0f172a', fontWeight: '700' },
  pillBtnTxtActive: { color: '#fff' },
});
