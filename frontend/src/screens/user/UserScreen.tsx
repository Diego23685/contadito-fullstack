// src/screens/UserScreen.tsx — perfil responsive con tema BRAND + fuente Apoka integrada
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
import { useFonts } from 'expo-font';
import { AuthContext } from '../../providers/AuthContext';
import { api } from '../../api';

/** ====== BRAND (unificado con el resto) ====== */
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

  // Tonos auxiliares para pills/estados
  text:   '#0F172A',
  muted:  '#6B7280',
  successBg: '#ECFDF5', successText: '#065F46', successBorder: '#D1FAE5',
  warnBg:    '#FEF3C7', warnText:    '#92400E', warnBorder:    '#FDE68A',
  dangerBg:  '#FEE2E2', dangerText:  '#991B1B', dangerBorder:  '#FCA5A5',
} as const;

/** ====== Fuente Apoka ====== */
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

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
    if (typeof atob === 'function') {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(b64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }
    // @ts-ignore
    const buffer = typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64') : null;
    // @ts-ignore
    return buffer ? buffer.toString('utf-8') : '';
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

function timeFromNowUnix(expSec?: number): { label: string; expired: boolean; minutesLeft: number } {
  if (!expSec) return { label: '—', expired: false, minutesLeft: 0 };
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
  const minutesLeft = expired ? 0 : Math.max(0, Math.floor(diff / 60));
  return { label, expired, minutesLeft };
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{(value ?? '—') as any}</Text>
    </View>
  );
}

function Chip({ title, onPress, tone = 'default' as 'default' | 'brand' | 'danger' | 'ghost' }) {
  const toneStyle =
    tone === 'brand' ? styles.chipBrand :
    tone === 'danger' ? styles.chipDanger :
    tone === 'ghost' ? styles.chipGhost :
    styles.chip;
  const toneText =
    tone === 'brand' ? styles.chipTextBrand :
    tone === 'danger' ? styles.chipTextDanger :
    tone === 'ghost' ? styles.chipTextGhost :
    styles.chipText;
  return (
    <Pressable onPress={onPress} style={[styles.chipBase, toneStyle]}>
      <Text style={[styles.chipTextBase, toneText]}>{title}</Text>
    </Pressable>
  );
}

function StatTile({ label, value, hint, pill, pillTone = 'neutral' as 'neutral' | 'ok' | 'warn' | 'bad' }) {
  const pillStyle =
    pillTone === 'ok' ? styles.pillOk :
    pillTone === 'warn' ? styles.pillWarn :
    pillTone === 'bad' ? styles.pillBad :
    styles.pillNeutral;
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, pill && [styles.statPill, pillStyle]]}>{value as any}</Text>
      {!!hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

function planPillStyle(plan?: string) {
  const p = (plan || '').toLowerCase();
  if (p === 'pro')      return { backgroundColor: '#E9EDFF', color: BRAND.hanBlue, borderColor: BRAND.borderSoft };
  if (p === 'business') return { backgroundColor: BRAND.successBg, color: BRAND.successText, borderColor: BRAND.successBorder };
  return { backgroundColor: '#F3F4F6', color: BRAND.text, borderColor: BRAND.borderSoft };
}

export default function UserScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const maxW = 1200;
  const cols = width >= 1200 ? 3 : width >= 860 ? 2 : 1;

  // Fuente Apoka
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const auth = useContext(AuthContext) as any;
  const route = useRoute<any>();

  const ctxUser = auth?.user ?? null;
  const ctxEmail = ctxUser?.email ?? auth?.email ?? null;
  const ctxName = ctxUser?.name ?? null;
  const ctxRole = ctxUser?.role ?? null;
  const ctxTenantName = auth?.tenant?.name ?? null;
  const token: string | null = auth?.token ?? null;

  const claims = useMemo(() => parseJwt(token), [token]);
  const jwtEmail = claims?.email ?? claims?.Email ?? null;
  const jwtRole = claims?.role ?? claims?.Role ?? null;
  const jwtTenantId = claims?.tenant_id ?? claims?.tenantId ?? null;
  const jwtExp = claims?.exp as number | undefined;
  const { label: expLabel, expired, minutesLeft } = timeFromNowUnix(jwtExp);

  const snapshot: DashboardSnap | undefined = route?.params?.snapshot;

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

  const name = ctxName ?? 'Usuario';
  const email = ctxEmail ?? jwtEmail ?? '—';
  const role = ctxRole ?? jwtRole ?? '—';
  const tenantName = dash?.tenantName ?? ctxTenantName ?? '—';
  const plan = dash?.plan ?? '—';
  const planStyle = planPillStyle(plan);

  const [dark, setDark] = useState(false);
  const [nio, setNio] = useState(true);
  const [push, setPush] = useState(true);

  const initials = useMemo(() => {
    const s = (name || email || 'U').trim();
    const parts = s.split(' ').filter(Boolean);
    const t = (parts[0]?.[0] ?? s[0]) + (parts[1]?.[0] ?? '');
    return t.toUpperCase();
  }, [name, email]);

  const sessionTone = expired ? 'bad' : minutesLeft <= 15 ? 'warn' : 'ok';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BRAND.surfaceTint }}>
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
                <Text style={[styles.metaPill, { backgroundColor: '#E9EDFF', color: BRAND.hanBlue, borderColor: BRAND.borderSoft }]}>
                  Rol: {String(role)}
                </Text>
                <Text style={[styles.metaPill, planStyle]}>Plan: {String(plan)}</Text>
                {jwtTenantId ? (
                  <Text style={[styles.metaPill, { backgroundColor: BRAND.surfaceSubtle, color: '#155E75', borderColor: '#BAE6FD' }]}>
                    Tenant ID: {jwtTenantId}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Chip title="Cambiar empresa" onPress={() => navigation.navigate('TenantSwitch')} tone="brand" />
            <Chip title="Seguridad" onPress={() => navigation.navigate('Security')} />
            <Chip title="Volver al inicio" onPress={() => navigation.navigate('Home')} tone="ghost" />
          </View>
        </View>

        {/* ===== Grid de Stats ===== */}
        <View style={[styles.grid, cols === 3 ? styles.cols3 : cols === 2 ? styles.cols2 : styles.cols1]}>
          <View style={styles.card}><StatTile label="Empresa" value={tenantName} hint={dash?.online ? 'Conectado' : 'Sin conexión'} /></View>
          <View style={styles.card}><StatTile label="Productos" value={dash?.productsTotal ?? (loading ? '…' : '0')} /></View>
          <View style={styles.card}><StatTile label="Clientes" value={dash?.customersTotal ?? (loading ? '…' : '0')} /></View>
          <View style={styles.card}><StatTile label="Almacenes" value={dash?.warehousesTotal ?? (loading ? '…' : '0')} /></View>
          <View style={styles.card}><StatTile label="Último sync" value={dash?.lastSync ?? (loading ? '…' : '—')} /></View>
          <View style={styles.card}>
            <StatTile
              label="Sesión (JWT)"
              value={expired ? 'Expirada' : 'Activa'}
              hint={expLabel}
              pill
              pillTone={sessionTone as any}
            />
          </View>
        </View>

        {/* ===== Información Detallada ===== */}
        <View style={[styles.card, styles.block]}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Información</Text>
            <Chip title="Refrescar" onPress={load} tone="brand" />
          </View>

          {loading ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator color={BRAND.hanBlue} />
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
            <Chip title="Cerrar sesión" onPress={auth?.logout ?? (() => {})} tone="danger" />
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
            <Text style={styles.prefLabel}>Notificaciones push</Text>
            <Switch value={push} onValueChange={setPush} />
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

        {/* ===== Accesos Rápidos ===== */}
        <View style={[styles.card, styles.block]}>
          <Text style={styles.blockTitle}>Accesos rápidos</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Chip title="Productos" onPress={() => navigation.navigate('ProductsList')} tone="brand" />
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
    backgroundColor: BRAND.surfacePanel,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64, height: 64, borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E9EDFF', borderWidth: 1, borderColor: BRAND.borderSoft,
  },
  avatarTxt: { ...F, fontSize: 22, color: BRAND.hanBlue },
  heroTitle: { ...F, fontSize: 20, color: BRAND.text, fontWeight: Platform.OS === 'ios' ? '700' : 'bold' },
  heroSub: { ...F, color: BRAND.muted, marginTop: 2 },
  heroBadges: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaPill: {
    ...F,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    overflow: 'hidden', borderWidth: 1,
  },
  heroActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },

  // Chips / Botones
  chipBase: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  chip: { backgroundColor: BRAND.surfacePanel, borderColor: BRAND.borderSoft },
  chipBrand: { backgroundColor: BRAND.hanBlue, borderColor: BRAND.hanBlue },
  chipDanger: { backgroundColor: BRAND.dangerBg, borderColor: BRAND.dangerBorder },
  chipGhost: { backgroundColor: BRAND.surfacePanel, borderColor: BRAND.borderSoft },
  chipTextBase: { ...F },
  chipText: { ...F, color: BRAND.text },
  chipTextBrand: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '800' : 'bold' },
  chipTextDanger: { ...F, color: BRAND.dangerText, fontWeight: Platform.OS === 'ios' ? '700' : 'bold' },
  chipTextGhost: { ...F, color: BRAND.text },

  // Grid de stats
  grid: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  cols1: {},
  cols2: {},
  cols3: {},
  card: {
    flexGrow: 1, minWidth: 260,
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statTile: { gap: 6 },
  statLabel: { ...F, color: BRAND.muted, fontSize: 12 },
  statValue: { ...F, color: BRAND.text, fontSize: 18 },
  statPill: {
    ...F,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    alignSelf: 'flex-start', overflow: 'hidden', borderWidth: 1,
  },
  pillNeutral: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', color: BRAND.text },
  pillOk:      { backgroundColor: BRAND.successBg, borderColor: BRAND.successBorder, color: BRAND.successText },
  pillWarn:    { backgroundColor: BRAND.warnBg,    borderColor: BRAND.warnBorder,    color: BRAND.warnText },
  pillBad:     { backgroundColor: BRAND.dangerBg,  borderColor: BRAND.dangerBorder,  color: BRAND.dangerText },
  statHint: { ...F, color: BRAND.muted, fontSize: 12 },

  // Bloques
  block: { marginTop: 12 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  blockTitle: { ...F, color: BRAND.text, fontSize: 16, fontWeight: Platform.OS === 'ios' ? '700' : 'bold' },
  subTitle: { ...F, color: BRAND.text, fontSize: 13, marginBottom: 4 },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BRAND.borderSofter },
  rowLabel: { ...F, width: 140, color: BRAND.muted, fontSize: 12 },
  rowValue: { ...F, flex: 1, color: BRAND.text },

  // Preferencias
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  prefLabel: { ...F, color: BRAND.text },
  prefHint: { ...F, color: BRAND.muted, fontSize: 12, marginTop: 6 },
  pillBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: BRAND.borderSoft, backgroundColor: BRAND.surfacePanel
  },
  pillBtnActive: { backgroundColor: BRAND.hanBlue, borderColor: BRAND.hanBlue },
  pillBtnTxt: { ...F, color: BRAND.text },
  pillBtnTxtActive: { ...F, color: '#fff', fontWeight: Platform.OS === 'ios' ? '700' : 'bold' },
});
