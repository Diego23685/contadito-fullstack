// src/screens/HomeScreen.tsx — Panel lateral pro + centrado + Apoka + Asesor IA (animado) + GiftedCharts
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

// Gradiente + (opcional) animaciones declarativas futuras
import { LinearGradient } from 'expo-linear-gradient';

// CHARTS: sin Skia, compatibles con React 18 / Expo
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

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

// === IA local (Ollama) ===
const OLLAMA_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:11434' : 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen2.5:3b-instruct';

type AiInsights = {
  resumen?: string;
  prioridadGeneral?: 'alta' | 'media' | 'baja';
  acciones?: { titulo: string; detalle?: string; prioridad?: 'alta' | 'media' | 'baja' }[];
  texto?: string;
};

// ------------- Colores de marca ---------------
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

  accent:       '#4458C7',
  accentAlt:    '#5A44C7',
};

// ------------- Utilidades ---------------
const moneyNI = (v?: number | null) => {
  const n = Number(v ?? 0);
  try {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n);
  } catch {
    return `C$ ${n.toFixed(2)}`;
  }
};

function timeAgo(iso?: string) {
  if (!iso) return '—';
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000);
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

const GradientCard: React.FC<{ children: React.ReactNode; style?: any }>
= ({ children, style }) => (
  <LinearGradient
    colors={['#ffffff', '#f7f8ff']}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    style={[styles.card, { borderTopColor: BRAND.iris }, style]}
  >
    {children}
  </LinearGradient>
);

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

/* ================= Animaciones mínimas (propio) ================= */

const ShimmerLine: React.FC<{ width?: number | string; height?: number; style?: any; radius?: number }>
= ({ width = '100%', height = 14, style, radius = 8 }) => {
  const trans = useRef(new Animated.Value(-60)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(trans, { toValue: 260, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [trans]);
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: '#eef0f4' }, style]}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0, bottom: 0, width: 120,
          transform: [{ translateX: trans }],
          backgroundColor: 'rgba(255,255,255,0.6)',
          opacity: 0.6,
        }}
      />
    </View>
  );
};

const Typewriter: React.FC<{ text?: string; speed?: number; style?: any }>
= ({ text = '', speed = 14, style }) => {
  const [slice, setSlice] = useState('');
  useEffect(() => {
    setSlice('');
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setSlice(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, Math.max(8, 1000 / speed));
    return () => clearInterval(id);
  }, [text, speed]);
  return <Text style={style}>{slice}</Text>;
};

const PriorityPulse: React.FC<{ prioridad?: 'alta' | 'media' | 'baja' | string }>
= ({ prioridad }) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  let bg = '#E9EDFF'; let fg = BRAND.hanBlue;
  if (prioridad === 'alta') { bg = '#fee2e2'; fg = '#991b1b'; }
  else if (prioridad === 'media') { bg = '#fef3c7'; fg = '#92400e'; }
  else if (prioridad === 'baja') { bg = '#dcfce7'; fg = '#065f46'; }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Text style={[styles.badge, { backgroundColor: bg, color: fg }]}>
        prioridad {prioridad || '—'}
      </Text>
    </Animated.View>
  );
};

const StaggerItem: React.FC<{ delay?: number; children: React.ReactNode }>
= ({ delay = 0, children }) => {
  const opa = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.timing(opa, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.timing(ty, { toValue: 0, duration: 260, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [opa, ty, delay]);
  return <Animated.View style={{ opacity: opa, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
};

const MiniBar: React.FC<{ label: string; value: number; max: number }>
= ({ label, value, max }) => {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    Animated.timing(w, { toValue: pct, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, max, w]);
  const widthInterpolate = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[F, { color: '#0f172a' }]}>{label}</Text>
        <Text style={[F, { color: '#6b7280' }]}>{value}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 6, backgroundColor: '#eef2ff', overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: widthInterpolate, backgroundColor: BRAND.iris }} />
      </View>
    </View>
  );
};

/* ================= Helpers de datos (para charts) ================= */

function bucketReceivables(arr?: Dashboard['receivablesDueSoon']) {
  const data = { vencido: 0, hoy: 0, pronto: 0, semana: 0 };
  if (Array.isArray(arr)) {
    for (const r of arr) {
      if (r.dueInDays < 0) data.vencido += r.dueAmount ?? 0;
      else if (r.dueInDays === 0) data.hoy += r.dueAmount ?? 0;
      else if (r.dueInDays <= 3) data.pronto += r.dueAmount ?? 0;
      else data.semana += r.dueAmount ?? 0;
    }
  }
  return [
    { label: 'Vencido', value: data.vencido, color: BRAND.hanBlue },
    { label: 'Hoy',     value: data.hoy,     color: BRAND.iris },
    { label: '1–3d',    value: data.pronto,  color: BRAND.maximumBlue },
    { label: '4–7d',    value: data.semana,  color: BRAND.verdigris },
  ];
}

function lastNDaysLabels(n: number) {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const out: { key: string; label: string; date: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = days[d.getDay()];
    const key = d.toISOString().slice(0,10);
    out.push({ key, label, date: key });
  }
  return out;
}

function activityToSeries(arr?: Dashboard['activity']) {
  const labels = lastNDaysLabels(7);
  const map = new Map(labels.map(l => [l.key, 0]));
  if (Array.isArray(arr)) {
    arr.forEach(a => {
      const k = String(a.whenAt).slice(0,10);
      if (map.has(k)) map.set(k, (map.get(k) || 0) + 1);
    });
  }
  // Para LineChart de GiftedCharts usamos {value}
  return {
    values: labels.map(l => ({ value: map.get(l.key) || 0 })),
    labels: labels.map(l => l.label),
  };
}

/* ================= Fin helpers ================= */

// ---------- Panel Lateral ----------
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

  // Fuente Apoka
  useFonts({ Apoka: require('../../assets/fonts/apokaregular.ttf') });

  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isXL = width >= 1200;

  const panelWidth = Math.min(360, Math.max(300, Math.floor(width * 0.26)));
  const panelPinned = width >= 1200;

  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [search, setSearch] = useState('');
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [polling, setPolling] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  // ---- IA en Alertas ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiInsights | null>(null);

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

  // ===== IA: construir contexto y analizar =====
  const buildAiContext = useCallback((d: Dashboard) => {
    const take = <T,>(arr: T[] | undefined, n: number) => (Array.isArray(arr) ? arr.slice(0, n) : []);
    return JSON.stringify({
      tenant: d.tenantName,
      plan: d.plan,
      kpis: {
        salesToday: d.salesToday,
        marginToday: d.marginToday,
        ticketsToday: d.ticketsToday,
        salesMonth: d.salesMonth,
        marginMonth: d.marginMonth,
        avgTicketMonth: d.avgTicketMonth,
      },
      lowStock: take(d.lowStock, 10),
      receivablesDueSoon: take(d.receivablesDueSoon, 10),
    });
  }, []);

  const analyzeAlerts = useCallback(async () => {
    if (!dashboard) { setAiError('No hay datos para analizar.'); return; }
    try {
      setAiLoading(true);
      setAiError(null);

      const context = buildAiContext(dashboard);
      const system =
        'Eres un asesor de negocios para pymes. Prioriza y sugiere acciones concretas. Responde en español.';
      const user = `Analiza este estado JSON del negocio y propone acciones que pueda ejecutar hoy.
Devuelve SOLO JSON válido con esta forma:
{
  "resumen": "2-3 líneas",
  "acciones": [
    { "titulo": "texto corto", "detalle": "qué hacer y por qué", "prioridad": "alta|media|baja" }
  ],
  "prioridadGeneral": "alta|media|baja"
}
Estado: ${context}`;

      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      });

      if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      const data = await res.json();
      const text = data?.message?.content ?? data?.response ?? '';

      let parsed: AiInsights | null = null;
      try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) parsed = JSON.parse(text.slice(start, end + 1));
      } catch { /* noop */ }

      setAi(parsed ?? { texto: String(text) });
    } catch (e: any) {
      setAiError(e?.message || 'Error al consultar la IA');
    } finally {
      setAiLoading(false);
    }
  }, [dashboard, buildAiContext]);

  const sticky: number[] = [1];
  const onTogglePanel = () => setPanelOpen(o => !o);

  // Mini máximos para barras IA
  const lowCount = Number(dashboard?.lowStock?.length ?? 0);
  const dueCount = Number(dashboard?.receivablesDueSoon?.length ?? 0);
  const maxAlertCount = Math.max(1, lowCount, dueCount);

  // Datasets para charts
  const receivablesData = useMemo(() => bucketReceivables(dashboard?.receivablesDueSoon), [dashboard]);
  const activity = useMemo(() => activityToSeries(dashboard?.activity), [dashboard]);

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.surfaceTint }}>

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

      {/* Contenido principal */}
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
                <SmallBtn title="Chat IA" onPress={() => navigation.navigate('OllamaChat')} />
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
                        <GradientCard key={k.label}>
                          <Label muted style={{ marginBottom: 6 }}>{k.label}</Label>
                          <Text style={[styles.kpiValue, isXL && styles.kpiValueXL]}>{k.fmt(k.value)}</Text>
                          <Bar value={k.value} max={kpisHoy.max} />
                        </GradientCard>
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
                        <GradientCard key={k.label}>
                          <Label muted style={{ marginBottom: 6 }}>{k.label}</Label>
                          <Text style={[styles.kpiValue, isXL && styles.kpiValueXL]}>{k.fmt(k.value)}</Text>
                          <Bar value={k.value} max={kpisMes.max} />
                        </GradientCard>
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
                    <GradientCard key={k?.label ?? `skt-${idx}`} >
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
                    </GradientCard>
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

              {/* Comparativa rápida: Ventas vs Margen (hoy) */}
              <Section title="Comparativa rápida" subtitle="Ventas vs Margen (hoy)">
                <Card>
                  <View style={{ paddingHorizontal: 6 }}>
                    <BarChart
                      barWidth={28}
                      noOfSections={4}
                      spacing={40}
                      yAxisThickness={0}
                      xAxisThickness={0}
                      rulesColor={BRAND.borderSoft}
                      data={[
                        { value: Number(dashboard?.salesToday || 0), label: 'Ventas', frontColor: BRAND.hanBlue },
                        { value: Number(dashboard?.marginToday || 0), label: 'Margen', frontColor: BRAND.verdigris },
                      ]}
                      yAxisTextStyle={{ ...F, color: '#6b7280' } as any}
                      xAxisLabelTextStyle={{ ...F, color: '#6b7280' } as any}
                      showValuesAsTopLabel
                      valueTextStyle={{ ...F, color: '#0f172a' } as any}
                      renderTooltip={(item: any) => (
                        <View style={{ backgroundColor: '#fff', borderColor: BRAND.borderSoft, borderWidth: 1, padding: 6, borderRadius: 8 }}>
                          <Text style={[F, { color: '#0f172a' }]}>{item.label}</Text>
                          <Text style={[F, { color: '#6b7280' }]}>{moneyNI(item.value)}</Text>
                        </View>
                      )}
                    />
                  </View>
                </Card>
              </Section>
            </View>

            {/* Columna derecha */}
            <View style={[styles.col, isWide && styles.colRight]}>
              {/* Alertas */}
              <Section title="Alertas" subtitle="Riesgos y pendientes" right={<View style={styles.row}><SmallBtn title="Refrescar" onPress={fetchDashboard} /></View>}>

                {/* Asesor IA (animado) */}
                <GradientCard style={{ marginBottom: 12 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.panelTitle}>Asesor IA (beta)</Text>
                    {aiLoading ? (
                      <ActivityIndicator />
                    ) : (
                      <SmallBtn title={ai ? 'Re-analizar' : 'Analizar con IA'} onPress={analyzeAlerts} />
                    )}
                  </View>

                  {ai?.prioridadGeneral && (
                    <View style={{ marginTop: 8 }}>
                      <PriorityPulse prioridad={ai.prioridadGeneral} />
                    </View>
                  )}

                  {aiError ? <Text style={[F, { color: '#b91c1c', marginTop: 10 }]}>{aiError}</Text> : null}

                  {aiLoading && (
                    <View style={{ marginTop: 10, gap: 8 }}>
                      <ShimmerLine width="85%" height={16} />
                      <ShimmerLine width="70%" height={12} />
                      <ShimmerLine width="92%" height={12} />
                      <View style={{ marginTop: 8 }}>
                        <ShimmerLine width="55%" height={12} />
                        <ShimmerLine width="48%" height={12} style={{ marginTop: 6 }} />
                        <ShimmerLine width="60%" height={12} style={{ marginTop: 6 }} />
                      </View>
                    </View>
                  )}

                  {!!ai?.resumen && !aiLoading && (
                    <View style={{ marginTop: 10 }}>
                      <Typewriter text={ai.resumen} style={[styles.itemSub, { color: '#0f172a' }]} />
                    </View>
                  )}

                  {!aiLoading && (
                    <View style={{ marginTop: 12 }}>
                      <MiniBar label="Productos con stock bajo" value={lowCount} max={maxAlertCount} />
                      <MiniBar label="Cuentas por cobrar (7 días)" value={dueCount} max={maxAlertCount} />
                    </View>
                  )}

                  {!!ai?.acciones?.length && !aiLoading && (
                    <View style={{ marginTop: 12, gap: 8 }}>
                      {ai.acciones.map((a, idx) => (
                        <StaggerItem key={`${a.titulo}-${idx}`} delay={idx * 80}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <Text style={[F, { color: '#6b7280' }]}>•</Text>
                            <Text style={[F, { flex: 1 }]}>
                              <Text style={{ fontWeight: '700' }}>{a.titulo}</Text>
                              {a.prioridad ? ` (${a.prioridad})` : ''}{a.detalle ? ` — ${a.detalle}` : ''}
                            </Text>
                          </View>
                        </StaggerItem>
                      ))}
                    </View>
                  )}

                  {!ai?.resumen && !!ai?.texto && !aiLoading && (
                    <Text style={[F, { color: '#0f172a', marginTop: 10 }]}>{ai.texto}</Text>
                  )}

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    <SmallBtn title="Productos críticos" onPress={() => navigation.navigate('ProductsList', { filter: 'lowStock' })} />
                    <SmallBtn title="Cuentas por cobrar" onPress={() => navigation.navigate('ReceivablesList')} />
                    <SmallBtn title="Crear promoción" onPress={() => navigation.navigate('SaleCreate')} />
                  </View>

                  {!ai && !aiLoading && !aiError && (
                    <Label muted style={{ marginTop: 8 }}>
                      La IA prioriza alertas y sugiere acciones ejecutables hoy. Toca “Analizar con IA”.
                    </Label>
                  )}
                </GradientCard>

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

              {/* Tablero visual (charts) */}
              <Section title="Tablero visual" subtitle="Más vistas de tus datos">
                <View style={[styles.grid, styles.cols2]}>
                  {/* Donut de por cobrar */}
                  <Card>
                    <Text style={[styles.itemTitle, { marginBottom: 8 }]}>Vencimientos (monto)</Text>
                    <View style={{ alignItems: 'center' }}>
                      <PieChart
                        data={receivablesData.map(d => ({
                          value: d.value,
                          color: d.color,
                          text: `${d.label}\n${moneyNI(d.value)}`,
                        }))}
                        donut
                        radius={110}
                        innerRadius={70}
                        showText
                        textColor="#0f172a"
                        textSize={10}
                        focusOnPress
                        sectionAutoFocus
                        centerLabelComponent={() => (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={[F, { color: '#6b7280', fontSize: 12 }]}>Total</Text>
                            <Text style={[F, { color: '#0f172a', fontSize: 14 }]}>
                              {moneyNI(receivablesData.reduce((s, d) => s + d.value, 0))}
                            </Text>
                          </View>
                        )}
                      />
                    </View>
                  </Card>

                  {/* Línea con área de actividad (7 días) */}
                  <Card>
                    <Text style={[styles.itemTitle, { marginBottom: 8 }]}>Actividad (últimos 7 días)</Text>
                    <LineChart
                      data={activity.values}
                      areaChart
                      hideDataPoints={false}
                      dataPointsHeight={6}
                      dataPointsWidth={6}
                      startFillColor="#e6e8ff"
                      endFillColor="#e6e8ff00"
                      startOpacity={1}
                      endOpacity={0.1}
                      thickness={2}
                      color={BRAND.hanBlue}
                      xAxisLabelTexts={activity.labels}
                      yAxisThickness={0}
                      xAxisColor={BRAND.borderSoft}
                      yAxisColor={BRAND.borderSoft}
                      xAxisLabelTextStyle={{ ...F, color: '#6b7280' } as any}
                      rulesColor={BRAND.borderSoft}
                      initialSpacing={20}
                      spacing={28}
                      noOfSections={4}
                    />
                  </Card>
                </View>
              </Section>

              {/* Actividad reciente */}
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
    case 'pro':       return { backgroundColor: '#dbeafe', color: BRAND.hanBlue };
    case 'business':  return { backgroundColor: '#dcfce7', color: BRAND.verdigris };
    default:          return { backgroundColor: '#f3f4f6', color: '#111827' };
  }
}

// ---------------- Estilos ----------------
const styles = StyleSheet.create({
  // Layout
  container: { width: '100%', paddingHorizontal: 16 },
  containerMax: { maxWidth: 1280, alignSelf: 'center' },

  // Header
  headerWrap: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: BRAND.surfacePanel,
    borderBottomColor: BRAND.borderSoft,
    borderBottomWidth: 1,
  },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerLeft: { flex: 1, minWidth: 0 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  title: { ...F, fontSize: 24, marginBottom: 4, color: BRAND.hanBlue },
  meta: { ...F, color: '#6f7b94' },
  bold: { ...F },
  planPill: { ...F, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },

  syncHint: { ...F, color: '#9aa7c2', marginTop: 4 },

  // Sticky search bar
  sectionSticky: {
    backgroundColor: BRAND.surfaceSubtle,
    borderBottomColor: BRAND.borderSoft,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },

  // Secciones
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.surfaceSubtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  sectionTitle: { ...F, fontSize: 16, color: BRAND.darkPastelBlue },
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
  searchInput: {
    ...F,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    paddingRight: 34,
    backgroundColor: BRAND.surfacePanel,
    fontSize: 16,
  },
  searchClear: {
    position: 'absolute',
    right: 10, top: 9,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND.surfaceSubtle,
  },

  // Grid / cards
  grid: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  cols3: {}, cols2: {},
  card: {
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderTopWidth: 3,
    borderTopColor: BRAND.accent,
    shadowColor: BRAND.accent,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  // KPI
  kpiValue: { ...F, fontSize: 20, marginBottom: 8, color: '#0f172a' },
  kpiValueXL: { fontSize: 24 },

  // Barras
  barTrack: { height: 8, backgroundColor: BRAND.trackSoft, borderRadius: 6, overflow: 'hidden' },
  barFill:  { height: '100%', backgroundColor: BRAND.iris },

  // Paneles (cards)
  panelTitle: { ...F, color: '#0f172a' },

  // Badges base
  badge: {
    ...F,
    backgroundColor: '#E9EDFF',
    color: BRAND.hanBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeDanger: { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeWarning:{ backgroundColor: '#fef3c7', color: '#92400e' },
  badgeOrange: { backgroundColor: '#ffedd5', color: '#9a3412' },
  badgeInfo:   { backgroundColor: '#E9EDFF', color: BRAND.hanBlue },

  // Estado
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 999 },

  // Empty
  empty: { padding: 16, alignItems: 'flex-start', gap: 6 },
  emptyTitle: { ...F },
  emptySub: { ...F, color: '#6b7280' },

  // Small button
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-start', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    backgroundColor: BRAND.surfacePanel,
    shadowColor: BRAND.accentAlt,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  smallBtnDanger: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  smallBtnText: { ...F, color: BRAND.hanBlue },

  // ===== Panel lateral =====
  panelPinnedWrap: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: BRAND.surfacePanel,
    borderRightColor: BRAND.borderSoft,
    borderRightWidth: 1, zIndex: 10
  },
  panelDrawer: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: BRAND.surfacePanel,
    borderRightColor: BRAND.borderSoft,
    borderRightWidth: 1, zIndex: 20
  },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', zIndex: 15 },

  panel: { flex: 1, paddingTop: Platform.OS === 'web' ? 16 : 44, paddingHorizontal: 16, paddingBottom: 16 },
  panelHeaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BRAND.maximumBlue,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { ...F, color: '#ffffff' },
  panelTitleMain: { ...F, color: '#0f172a' },
  panelSubtitle: { ...F, color: '#6f7b94', fontSize: 12, marginTop: 2 },

  panelCard: {
    backgroundColor: BRAND.surfacePanel,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderTopWidth: 3,
    borderTopColor: BRAND.accentAlt,
  },
  panelCardTitle: { ...F, color: '#0f172a' },
  panelCardSub: { ...F, color: '#6f7b94', marginTop: 6 },

  panelBlock: { marginBottom: 14 },
  panelBlockTitle: {
    ...F, fontSize: 11, color: BRAND.darkPastelBlue,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6
  },
  panelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, paddingVertical: 6,
    borderBottomColor: BRAND.borderSofter, borderBottomWidth: 1
  },
  panelRowLabel: { ...F, color: '#6b7280', width: 120, fontSize: 12 },
  panelRowValue: { ...F, color: '#0f172a', flex: 1 },

  linkLike: { ...F, color: BRAND.hanBlue },
  linkChip: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    backgroundColor: BRAND.surfacePanel,
    shadowColor: BRAND.accent, shadowOpacity: 0.02, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  linkChipText: { ...F, color: '#0f172a' },
  panelFoot: { ...F, marginTop: 8, color: '#94a3b8', fontSize: 12, textAlign: 'center' },
});
