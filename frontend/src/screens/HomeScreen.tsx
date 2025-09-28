// src/screens/HomeScreen.tsx — Panel + IA + GiftedCharts + Tutorial anclado (diseño Neuro/Canva)
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
  findNodeHandle,
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../api';
import { AuthContext } from '../providers/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { importExcelProducts } from '../features/import/ExcelImport';
import * as DocumentPicker from 'expo-document-picker'; 
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

// Tutorial anclado
import AsyncStorage from '@react-native-async-storage/async-storage';
import TutorialOverlay, { TutorialStep, TargetRect } from './TutorialOverlay';

// ---------------- Tipos ----------------
type Dashboard = {
  tenantName: string;
  plan: 'free' | 'pro' | 'business' | string;
  online: boolean;
  lastSync: string;
  salesToday: number; marginToday: number; ticketsToday: number;
  salesMonth: number; marginMonth: number; ticketsMonth: number; avgTicketMonth: number;
  productsTotal: number; customersTotal: number; warehousesTotal: number;
  latestProducts: { id: number; sku: string; name: string }[];
  lowStock: { id: number; sku: string; name: string }[];
  receivablesDueSoon: {
    invoiceId: number; number: string; customerName: string | null;
    total: number; dueAmount: number; dueInDays: number;
  }[];
  activity: { kind: string; refId: number; title: string; whenAt: string }[];
};

type Props = { navigation: any };

// === IA local (Ollama) ===
const OLLAMA_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:11434' : 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen2.5:3b-instruct';

type AiInsights = {
  resumen?: string;
  prioridadGeneral?: 'alta' | 'media' | 'baja';
  acciones?: { titulo: string; detalle?: string; prioridad?: 'alta' | 'media' | 'baja' }[];
  texto?: string;
};

// ------------- Colores (Neuro/Canva) ---------------
const BRAND = {
  primary:       '#2563EB',
  primary500:    '#3B82F6',
  primary600:    '#2563EB',
  primary700:    '#1D4ED8',
  purple:        '#7C3AED',
  purple600:     '#6D28D9',
  teal:          '#14B8A6',
  green:         '#10B981',
  slate900:      '#0F172A',
  slate700:      '#334155',
  slate500:      '#64748B',

  bg:            '#EEF2FF',
  surface:       '#FFFFFF',
  surfaceSubtle: '#F7F9FF',
  surfacePanel:  '#FFFFFF',

  cardShadow: 'rgba(37, 99, 235, 0.16)',   // sombra azul tenue
  cardShadowLg: 'rgba(37, 99, 235, 0.22)', // para hover/tooltip

  border:        '#E6EBFF',
  borderSoft:    '#E6EBFF',
  borderSofter:  '#EDF1FF',
  trackSoft:     '#ECF2FF',

  // compat con nombres previos
  hanBlue:       '#4458C7',
  iris:          '#5A44C7',
  maximumBlue:   '#44AAC7',
  verdigris:     '#43BFB7',
  surfaceTint:   '#EEF2FF',
  accent:        '#3B82F6',
  accentAlt:     '#5A44C7',
};

const F = Platform.select({ ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const }, default: { fontFamily: 'Apoka' } });

const moneyNI = (v?: number | null) => {
  const n = Number(v ?? 0);
  try { return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n); }
  catch { return `C$ ${n.toFixed(2)}`; }
};
const timeAgo = (iso?: string) => {
  if (!iso) return '—';
  const dt = new Date(iso); const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000), hours = Math.floor(mins / 60), days = Math.floor(hours / 24);
  if (days > 0) return `hace ${days} d`; if (hours > 0) return `hace ${hours} h`; if (mins > 0) return `hace ${mins} min`; return 'justo ahora';
};
const initials = (s?: string) => (String(s || 'U').trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()??'').join('') || 'U');

// ---------- UI básicos ----------
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
  <LinearGradient colors={['#ffffff', '#f7f8ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderTopColor: BRAND.accent }, style]}>
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
= ({ children, muted, style }) => <Text style={[F, { color: muted ? '#6b7280' : '#111827' }, style]}>{children}</Text>;
const Badge: React.FC<{ children: React.ReactNode; style?: any }>
= ({ children, style }) => <Text style={[styles.badge, style]}>{children}</Text>;
const SmallBtn: React.FC<{ title: string; onPress: () => void; danger?: boolean; style?: any }>
= ({ title, onPress, danger, style }) => (
  <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: danger ? '#fecaca' : '#e5e7eb' }} style={[styles.smallBtn, danger && styles.smallBtnDanger, style]}>
    <Text style={[styles.smallBtnText, danger && { color: '#991b1b' }]}>{title}</Text>
  </Pressable>
);
const Bar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.barTrack}>
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.barFill, { width: `${pct * 100}%` }]}
      />
    </View>
  );
};

const Skeleton: React.FC<{ height?: number; width?: number; style?: any }>
= ({ height = 18, width, style }) => <View style={[{ height, width, backgroundColor: '#eef0f4', borderRadius: 8 }, style]} />;

// Animaciones brevísimas
const ShimmerLine: React.FC<{ width?: number | string; height?: number; style?: any; radius?: number }>
= ({ width = '100%', height = 14, style, radius = 8 }) => {
  const trans = useRef(new Animated.Value(-60)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(trans, { toValue: 260, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start(); return () => loop.stop();
  }, [trans]);
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: '#eef0f4' }, style]}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, width: 120, transform: [{ translateX: trans }], backgroundColor: 'rgba(255,255,255,0.6)', opacity: 0.6 }} />
    </View>
  );
};
const Typewriter: React.FC<{ text?: string; speed?: number; style?: any }>
= ({ text = '', speed = 14, style }) => {
  const [slice, setSlice] = useState(''); useEffect(() => {
    setSlice(''); if (!text) return; let i = 0;
    const id = setInterval(() => { i += 1; setSlice(text.slice(0, i)); if (i >= text.length) clearInterval(id); }, Math.max(8, 1000 / speed));
    return () => clearInterval(id);
  }, [text, speed]); return <Text style={style}>{slice}</Text>;
};
const PriorityPulse: React.FC<{ prioridad?: 'alta' | 'media' | 'baja' | string }>
= ({ prioridad }) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ])); loop.start(); return () => loop.stop();
  }, [scale]);
  let bg = '#E9EDFF'; let fg = BRAND.hanBlue;
  if (prioridad === 'alta') { bg = '#fee2e2'; fg = '#991b1b'; }
  else if (prioridad === 'media') { bg = '#fef3c7'; fg = '#92400e'; }
  else if (prioridad === 'baja') { bg = '#dcfce7'; fg = '#065f46'; }
  return <Animated.View style={{ transform: [{ scale }] }}><Text style={[styles.badge, { backgroundColor: bg, color: fg }]}>prioridad {prioridad || '—'}</Text></Animated.View>;
};
const StaggerItem: React.FC<{ delay?: number; children: React.ReactNode }>
= ({ delay = 0, children }) => {
  const opa = useRef(new Animated.Value(0)).current; const ty = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.timing(opa, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.timing(ty, { toValue: 0, duration: 260, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [opa, ty, delay]); return <Animated.View style={{ opacity: opa, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
};
const MiniBar: React.FC<{ label: string; value: number; max: number }>
= ({ label, value, max }) => {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => { const pct = max > 0 ? Math.min(1, value / max) : 0; Animated.timing(w, { toValue: pct, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [value, max, w]);
  const widthInterpolate = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[F, { color: '#0f172a' }]}>{label}</Text>
        <Text style={[F, { color: '#6b7280' }]}>{value}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 6, backgroundColor: '#eef2ff', overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: widthInterpolate, backgroundColor: BRAND.accent }} />
      </View>
    </View>
  );
};

// Helpers data
function bucketReceivables(arr?: Dashboard['receivablesDueSoon']) {
  const data = { vencido: 0, hoy: 0, pronto: 0, semana: 0 };
  if (Array.isArray(arr)) for (const r of arr) {
    if (r.dueInDays < 0) data.vencido += r.dueAmount ?? 0;
    else if (r.dueInDays === 0) data.hoy += r.dueAmount ?? 0;
    else if (r.dueInDays <= 3) data.pronto += r.dueAmount ?? 0;
    else data.semana += r.dueAmount ?? 0;
  }
  return [
    { label: 'Vencido', value: data.vencido, color: '#2563EB' },
    { label: 'Hoy',     value: data.hoy,     color: '#3B82F6' },
    { label: '1–3d',    value: data.pronto,  color: '#60A5FA' },
    { label: '4–7d',    value: data.semana,  color: '#7C3AED' },
  ];
}
function lastNDaysLabels(n: number) {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']; const out: { key: string; label: string; date: string }[] = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const label = days[d.getDay()]; const key = d.toISOString().slice(0,10); out.push({ key, label, date: key }); }
  return out;
}
function activityToSeries(arr?: Dashboard['activity']) {
  const labels = lastNDaysLabels(7); const map = new Map(labels.map(l => [l.key, 0]));
  if (Array.isArray(arr)) arr.forEach(a => { const k = String(a.whenAt).slice(0,10); if (map.has(k)) map.set(k, (map.get(k) || 0) + 1); });
  return { values: labels.map(l => ({ value: map.get(l.key) || 0 })), labels: labels.map(l => l.label) };
}

// Panel lateral (sidebar “card” redondeada tipo Canva)
const PanelRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <View style={styles.panelRow}>
    <Text style={styles.panelRowLabel}>{label}</Text>
    <Text style={styles.panelRowValue} numberOfLines={1}>{value ?? '—'}</Text>
  </View>
);

const SidePanel: React.FC<{
  open: boolean; onClose: () => void; pinned: boolean; width?: number;
  dashboard?: Dashboard | null; navigation: any; userEmail?: string | null;
  onTogglePolling: () => void; polling: boolean;
  onImportExcel?: () => void;   // <-- añadir
  importing?: boolean;          // <-- añadir
}> = ({ open, onClose, pinned, width = 320, dashboard, navigation, userEmail, onTogglePolling, polling, onImportExcel, importing }) => {
  const slide = useRef(new Animated.Value(pinned ? 0 : -width)).current;
  useEffect(() => {
    if (pinned) { slide.setValue(0); return; }
    Animated.timing(slide, { toValue: open ? 0 : -width, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [open, pinned, width, slide]);

  const avatarText = initials(dashboard?.tenantName || userEmail || 'Usuario');

  const PanelContent = (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.panelHeaderWrap}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{avatarText}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.panelTitleMain} numberOfLines={1}>{dashboard?.tenantName ?? '—'}</Text>
          <Text style={styles.panelSubtitle} numberOfLines={1}>{userEmail ?? '—'}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('UserScreen')} style={styles.linkChip} accessibilityRole="button">
          <Text style={styles.linkChipText}>Usuario</Text>
        </Pressable>
        <SmallBtn
          title={importing ? "Importando…" : "Importar Excel"}
          onPress={onImportExcel}
        />


      </View>

      {/* Card plan */}
      <View style={styles.panelCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.panelCardTitle}>Plan</Text>
          <Text style={[styles.planPill, planColor(dashboard?.plan)]}>{dashboard?.plan ?? '—'}</Text>
        </View>
        <Text style={styles.panelCardSub}>
          {dashboard?.online ? 'Conectado • ' : 'Sin conexión • '}
          {dashboard?.lastSync ? `Sync ${timeAgo(dashboard.lastSync)}` : '—'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Pressable onPress={() => navigation.navigate('TenantSwitch')} style={[styles.smallBtn, styles.btnBlue]}>
            <Text style={styles.smallBtnTextAlt}>Administrar empresa</Text>
          </Pressable>
          {String(dashboard?.plan || '').toLowerCase() !== 'business' && (
            <Pressable onPress={() => navigation.navigate('Billing')} style={[styles.smallBtn, styles.btnPurple]}>
              <Text style={styles.smallBtnTextAlt}>Mejorar plan</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Resumen */}
      <View style={styles.panelBlock}>
        <Text style={styles.panelBlockTitle}>Resumen</Text>
        <PanelRow label="Productos" value={String(dashboard?.productsTotal ?? '—')} />
        <PanelRow label="Clientes" value={String(dashboard?.customersTotal ?? '—')} />
        <PanelRow label="Almacenes" value={String(dashboard?.warehousesTotal ?? '—')} />
      </View>

      {/* Navegación tipo “pills” */}
      <View style={styles.panelBlock}>
        <Text style={styles.panelBlockTitle}>Ir a</Text>
        <View style={{ gap: 10 }}>
          <Pressable onPress={() => navigation.navigate('ProductsList')}   style={styles.navItem}>
            <Text style={styles.navItemText}>Catálogo de productos</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SalesForecast')} style={styles.navItem}>
            <Text style={styles.navItemText}>Simulación y pronóstico</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('CustomersList')}  style={styles.navItem}>
            <Text style={styles.navItemText}>Clientes</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('ReceivablesList')} style={styles.navItem}>
            <Text style={styles.navItemText}>Cuentas por cobrar</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('WarehousesList')} style={styles.navItem}>
            <Text style={styles.navItemText}>Almacenes</Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('UnitCost')} style={styles.navItem}>
            <Text style={styles.navItemText}>Costo unitario</Text>
          </Pressable>
        </View>
      </View>

      {/* Controles (se conservan) */}
      <View style={styles.panelBlock}>
        <Text style={styles.panelBlockTitle}>Controles</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Pressable onPress={onTogglePolling} style={[styles.smallBtn, styles.btnGreen]}>
            <Text style={styles.smallBtnTextAlt}>{polling ? 'Pausar auto-refresco' : 'Reanudar auto-refresco'}</Text>
          </Pressable>
          <Pressable onPress={() => {}} style={[styles.smallBtn, styles.btnGray]}>
            <Text style={styles.smallBtnTextAlt}>Refrescar tablero</Text>
          </Pressable>
        </View>
      </View>

      {/* CTA inferior tipo “Contact us” opcional (tu copy) */}
      <View style={styles.sidebarCta}>
        <Text style={styles.sidebarCtaSmall}>¿Necesitas ayuda con el panel?</Text>
        <Pressable onPress={() => navigation.navigate('UserScreen')} style={styles.sidebarCtaBtn}>
          <Text style={styles.sidebarCtaBtnText}>Contactar soporte</Text>
        </Pressable>
      </View>

      <Text style={styles.panelFoot}>Contadito · Panel</Text>
    </View>
  );

  // “Card” separada y redondeada (pinned = dock; drawer = flotante)
  if (pinned) {
    return (
      <View style={[styles.sidebarDock, { width }]}>
        <View style={styles.sidebarOuter}>
          <LinearGradient colors={['#1E3A8A', '#1D4ED8']} start={{x:0,y:0}} end={{x:0,y:1}} style={styles.sidebarGradient}>
            {PanelContent}
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <>
      {open && <Pressable accessibilityRole="button" style={styles.overlay} onPress={onClose} />}
      <Animated.View style={[styles.sidebarFloat, { width, transform: [{ translateX: slide }] }]}>
        <View style={styles.sidebarOuter}>
          <LinearGradient colors={['#1E3A8A', '#1D4ED8']} start={{x:0,y:0}} end={{x:0,y:1}} style={styles.sidebarGradient}>
            {PanelContent}
          </LinearGradient>
        </View>
      </Animated.View>
    </>
  );
};

const PromoBanner: React.FC<{ onPress: () => void; hidden?: boolean }> = ({ onPress, hidden }) => {
  if (hidden) return null;
  return (
    <LinearGradient
      colors={['#06B6D4', '#2563EB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.promoCard}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.promoEyebrow}>¿Te gustaría probar nuestro plan premium?</Text>
        <Text style={styles.promoTitle}>¿Quieres mejores opciones?<Text style={{ fontWeight: '900' }}> ¡Prueba Premium!</Text></Text>
        <Text style={styles.promoSub}>Desbloquea analítica avanzada, IA priorizada, múltiples almacenes y más.</Text>

        <Pressable onPress={onPress} style={styles.promoBtn} accessibilityRole="button">
          <Text style={styles.promoBtnText}>Probar plan Premium</Text>
        </Pressable>
      </View>

      {/* “Ilustración” simple (placeholder) */}
      <View style={styles.promoArt}>
        <View style={styles.promoChip} />
        <View style={[styles.promoChip, { width: 36, opacity: 0.7 }]} />
        <View style={[styles.promoMonitor]} />
        <View style={[styles.promoKeyboard]} />
      </View>
    </LinearGradient>
  );
};


// ---------------- Pantalla ----------------
export default function HomeScreen({ navigation }: Props) {
  const { logout } = useContext(AuthContext);
  const auth = useContext(AuthContext) as any;
  const currentUserEmail: string | null = auth?.user?.email ?? auth?.email ?? null;
  useFonts({ Apoka: require('../../assets/fonts/apokaregular.ttf') });

  const scrollRef = useRef<ScrollView>(null);

  const { width } = useWindowDimensions();
  const isWide = width >= 900; const isXL = width >= 1200;
  const isNarrow = width < 600;
  const panelWidth = Math.min(360, Math.max(300, Math.floor(width * 0.26)));
  const panelPinned = width >= 1200;

  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [search, setSearch] = useState('');
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [polling, setPolling] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  // IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiInsights | null>(null);

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState<boolean | null>(null);

  // Referencias a botones / áreas (para medir)
  const btnBuscarRef = useRef<View>(null);
  const btnVentaRef = useRef<View>(null);
  const btnCompraRef = useRef<View>(null);
  const btnProductoRef = useRef<View>(null);
  const btnClienteRef = useRef<View>(null);
  const btnPanelRef = useRef<View>(null);
  const btnIARef = useRef<View>(null);

  const sectionHoyRef = useRef<View>(null);
  const sectionMesRef = useRef<View>(null);
  const sectionStockRef = useRef<View>(null);
  const sectionPorCobrarRef = useRef<View>(null);
  const sectionTableroRef = useRef<View>(null);

  const [targets, setTargets] = useState<Record<string, TargetRect>>({});

  // Helper para medir un ref y guardarlo
  const measureAndSet = useCallback((name: string, ref: React.RefObject<View>) => {
    const node = findNodeHandle(ref.current as any);
    if (!node || !ref.current) return;
    // @ts-ignore
    ref.current.measureInWindow?.((x: number, y: number, w: number, h: number) => {
      setTargets(prev => ({ ...prev, [name]: { x, y, width: w, height: h } }));
    });
  }, []);

  // Mide en el primer render visible y cuando abrimos el tutorial / cambia ancho
  const measureAll = useCallback(() => {
    measureAndSet('buscar', btnBuscarRef);
    measureAndSet('venta', btnVentaRef);
    measureAndSet('compra', btnCompraRef);
    measureAndSet('producto', btnProductoRef);
    measureAndSet('cliente', btnClienteRef);
    measureAndSet('panel', btnPanelRef);
    measureAndSet('ia', btnIARef);

    measureAndSet('hoy', sectionHoyRef);
    measureAndSet('mes', sectionMesRef);
    measureAndSet('stock', sectionStockRef);
    measureAndSet('porCobrar', sectionPorCobrarRef);
    measureAndSet('tablero', sectionTableroRef);
  }, [measureAndSet]);

  useEffect(() => {
    const id = setTimeout(measureAll, 300);
    return () => clearTimeout(id);
  }, [measureAll, width, panelOpen]);

  const { current: appState } = useRef(AppState.currentState);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [importing, setImporting] = useState(false);

// arriba: importa Alert si no está ya
// import { Alert } from 'react-native';

const handleImportExcel = useCallback(async () => {
  try {
    setImporting(true);
    const res = await importExcelProducts({
      api,
      fetchDashboard,
      OLLAMA_BASE,
      OLLAMA_MODEL,
      onBusy: setImporting,
      // opcional: onProgress: (m)=>setAlgúnEstadoDeProgreso(m),
    });

    // ✅ Ir al resumen con los datos que devuelve el importador
    navigation.navigate('ImportSummary', { summary: res });

    // (si aún quieres mostrar un Alert también, puedes dejar esto)
    // const resumen = `Creados: ${res.created ?? 0}\nActualizados: ${res.updated ?? 0}\nSaltados: ${res.skipped ?? 0}`;
    // Alert.alert('Importación completada', resumen);

  } catch (e: any) {
    Alert.alert('Error al importar', String(e?.message || e));
  } finally {
    setImporting(false);
  }
}, [api, fetchDashboard, navigation]);




  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => {
    const unsub = navigation.addListener?.('focus', fetchDashboard);
    return unsub;
  }, [navigation, fetchDashboard]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if ((appState as any).match(/inactive|background/) && nextState === 'active') {
        setPolling(true); fetchDashboard();
      } else if ((nextState as any).match(/inactive|background/)) {
        setPolling(false);
      }
    }); return () => sub.remove();
  }, [fetchDashboard, appState]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (polling) interval = setInterval(fetchDashboard, 60000);
    return () => { if (interval) clearInterval(interval); };
  }, [polling, fetchDashboard]);

  // Mostrar tutorial solo la primera vez
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('ctd_tutorial_v1_done');
        if (seen === '1') { setTutorialSeen(true); return; }
        setTutorialSeen(false);
        setShowTutorial(true);
        setTimeout(measureAll, 350);
      } catch {
        setTutorialSeen(false);
      }
    })();
  }, [measureAll]);

  const closeTutorial = useCallback(async () => {
    try { await AsyncStorage.setItem('ctd_tutorial_v1_done', '1'); } catch {}
    setShowTutorial(false); setTutorialSeen(true);
  }, []);

  const goSearch = useCallback(() => {
    const q = search?.trim(); if (!q) return;
    navigation.navigate('GlobalSearch', { q });
  }, [navigation, search]);
  const onChangeSearch = useCallback((txt: string) => {
    setSearch(txt); if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 350);
  }, []);

  const kpisHoy = useMemo(() => {
    const vals = [
      { label: 'Ventas hoy', value: Number(dashboard?.salesToday ?? 0), fmt: moneyNI },
      { label: 'Margen hoy', value: Number(dashboard?.marginToday ?? 0), fmt: moneyNI },
      { label: 'Tickets hoy', value: Number(dashboard?.ticketsToday ?? 0), fmt: (v: number) => `${v}` },
    ]; const max = Math.max(...vals.map(v => v.value), 1);
    return { items: vals, max };
  }, [dashboard]);
  const kpisMes = useMemo(() => {
    const vals = [
      { label: 'Ventas mes', value: Number(dashboard?.salesMonth ?? 0), fmt: moneyNI },
      { label: 'Margen mes', value: Number(dashboard?.marginMonth ?? 0), fmt: moneyNI },
      { label: 'Ticket prom.', value: Number(dashboard?.avgTicketMonth ?? 0), fmt: moneyNI },
    ]; const max = Math.max(...vals.map(v => v.value), 1);
    return { items: vals, max };
  }, [dashboard]);
  const totals = useMemo(() => ([
    { label: 'Productos', value: String(dashboard?.productsTotal ?? '—'), to: () => navigation.navigate('ProductsList') },
    { label: 'Clientes', value: String(dashboard?.customersTotal ?? '—'), to: () => navigation.navigate('CustomersList') },
    { label: 'Almacenes', value: String(dashboard?.warehousesTotal ?? '—'), to: () => navigation.navigate('WarehousesList') },
  ]), [dashboard, navigation]);

  // IA
  const buildAiContext = useCallback((d: Dashboard) => {
    const take = <T,>(arr: T[] | undefined, n: number) => (Array.isArray(arr) ? arr.slice(0, n) : []);
    return JSON.stringify({
      tenant: d.tenantName, plan: d.plan,
      kpis: { salesToday: d.salesToday, marginToday: d.marginToday, ticketsToday: d.ticketsToday, salesMonth: d.salesMonth, marginMonth: d.marginMonth, avgTicketMonth: d.avgTicketMonth },
      lowStock: take(d.lowStock, 10),
      receivablesDueSoon: take(d.receivablesDueSoon, 10),
    });
  }, []);
  const analyzeAlerts = useCallback(async () => {
    if (!dashboard) { setAiError('No hay datos para analizar.'); return; }
    try {
      setAiLoading(true); setAiError(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const context = buildAiContext(dashboard);
      const system = 'Eres un asesor de negocios para pymes. Prioriza y sugiere acciones concretas. Responde en español.';
      const user = `Analiza este estado JSON del negocio y propone acciones que pueda ejecutar hoy.
Devuelve SOLO JSON válido con esta forma:
{
  "resumen": "2-3 líneas",
  "acciones": [{ "titulo": "texto corto", "detalle": "qué hacer y por qué", "prioridad": "alta|media|baja" }],
  "prioridadGeneral": "alta|media|baja"
}
Estado: ${context}`;

      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          options: { num_ctx: 1024, num_gpu: 0, temperature: 0.2 },
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const txt = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(txt);
      }

      const data = await res.json();
      const text = data?.message?.content ?? data?.response ?? '';

      let parsed: AiInsights | null = null;
      try {
        const start = text.indexOf('{'); const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) parsed = JSON.parse(text.slice(start, end + 1));
      } catch {}

      if (!parsed) {
        if (typeof text === 'string' && text.includes('"error"')) setAiError('IA devolvió un error. Revisa el servidor Ollama.');
        setAi({ texto: String(text || 'Sin respuesta') });
      } else {
        setAi(parsed);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') setAiError('La solicitud a IA tardó demasiado (timeout).');
      else if (typeof e?.message === 'string' && e.message.includes('model runner has unexpectedly stopped')) {
        setAiError('Ollama detuvo el modelo inesperadamente (memoria o error interno). Revisa logs del servidor.');
      } else {
        setAiError(e?.message || 'Error al consultar la IA');
      }
    } finally {
      setAiLoading(false);
    }
  }, [dashboard, buildAiContext]);

  const sticky: number[] = [1];
  const onTogglePanel = () => setPanelOpen(o => !o);

  const lowCount = Number(dashboard?.lowStock?.length ?? 0);
  const dueCount = Number(dashboard?.receivablesDueSoon?.length ?? 0);
  const maxAlertCount = Math.max(1, lowCount, dueCount);
  const receivablesData = useMemo(() => bucketReceivables(dashboard?.receivablesDueSoon), [dashboard]);
  const activity = useMemo(() => activityToSeries(dashboard?.activity), [dashboard]);

  // Pasos del tutorial
  const tutorialSteps: TutorialStep[] = useMemo(() => [
    { key: 'bienvenida', title: '¡Bienvenido a Contadito! 👋', body: 'Te muestro dónde están las acciones clave para empezar.' },
    { key: 'buscar', title: 'Búsqueda global', body: 'Toca “Buscar” para encontrar productos, clientes o SKU.', targetKey: 'buscar' },
    { key: 'accionesVenta', title: 'Acción rápida: Venta', body: 'Crea una venta en un toque desde aquí.', targetKey: 'venta' },
    { key: 'accionesCompra', title: 'Acción rápida: Compra', body: 'Registra compras/ingresos de stock.', targetKey: 'compra' },
    { key: 'accionesProducto', title: 'Crear producto', body: 'Agrega tu primer producto para empezar a vender.', targetKey: 'producto', cta: 'Crear', onCta: () => navigation.navigate('ProductForm') },
    { key: 'accionesCliente', title: 'Crear cliente', body: 'Registra clientes para facturar o fiados.', targetKey: 'cliente', cta: 'Nuevo cliente', onCta: () => navigation.navigate('CustomerForm') },
    { key: 'panel', title: 'Panel lateral', body: 'Abre el panel para ver empresa, plan y accesos directos.', targetKey: 'panel', cta: 'Abrir panel', onCta: () => setPanelOpen(true) },

    { key: 'hoy', title: 'KPIs de hoy', body: 'Monitorea ventas, margen y tickets del día.', targetKey: 'hoy' },
    { key: 'mes', title: 'KPIs del mes', body: 'Acumulados y ticket promedio del mes actual.', targetKey: 'mes' },
    { key: 'stock', title: 'Stock bajo', body: 'Productos que requieren reposición pronto.', targetKey: 'stock', cta: 'Ver', onCta: () => navigation.navigate('ProductsList', { filter: 'lowStock' }) },
    { key: 'porCobrar', title: 'Cuentas por cobrar', body: 'Vencimientos próximos y montos.', targetKey: 'porCobrar', cta: 'Ir a lista', onCta: () => navigation.navigate('ReceivablesList') },
    { key: 'tablero', title: 'Tablero visual', body: 'Vencimientos por monto y actividad reciente.', targetKey: 'tablero' },

    { key: 'ia', title: 'Asesor IA', body: 'Analiza tus datos y sugiere acciones ejecutables hoy.', targetKey: 'ia', cta: 'Analizar', onCta: () => analyzeAlerts() },
    { key: 'listo', title: '¡Listo!', body: 'Puedes reabrir este tutorial desde “Tutorial” en el encabezado.' },
  ], [navigation, analyzeAlerts]);

  // requestScroll para TutorialOverlay
  const requestScroll = useCallback((y: number) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
    setTimeout(measureAll, 250);
  }, [measureAll]);

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.surfaceTint }}>

      {/* Panel */}
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
        onImportExcel={handleImportExcel}
        importing={importing}
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingBottom: 28 }, panelPinned ? { paddingLeft: panelWidth } : null]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { fetchDashboard(); setTimeout(measureAll, 300); }} />}
        stickyHeaderIndices={sticky}
        contentInsetAdjustmentBehavior="automatic"
        onLayout={() => setTimeout(measureAll, 200)}
      >
        {/* Header */}
        <View style={[styles.headerWrap]}>
          <View style={[styles.container, styles.containerMax]}>
            <View style={[styles.headerInner, isNarrow && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
              <View style={[styles.headerLeft, { minWidth: 0 }]}>
                <Text style={styles.title}>Contadito</Text>
                <Text style={styles.meta}>
                  Empresa: <Text style={[styles.bold]}>{dashboard?.tenantName ?? '—'}</Text>
                  {'  '}·{'  '}
                  Plan: <Text style={[styles.bold, styles.planPill, planColor(dashboard?.plan)]}>{dashboard?.plan ?? '—'}</Text>
                </Text>
              </View>

              <View style={[styles.headerBtnsWrap, isNarrow && styles.headerBtnsWrapNarrow]}>
                {!panelPinned && (
                  <View ref={btnPanelRef} style={{ flexShrink: 0 }}>
                    <SmallBtn title={panelOpen ? 'Cerrar panel' : 'Abrir panel'} onPress={() => { setPanelOpen(p => !p); setTimeout(measureAll, 200); }} />
                  </View>
                )}
                <SmallBtn title="Usuario" onPress={() => navigation.navigate('UserScreen')} />
                <SmallBtn title="Chat IA" onPress={() => navigation.navigate('OllamaChat')} />
                <SmallBtn title="Cambiar empresa" onPress={() => navigation.navigate('TenantSwitch')} />
                <SmallBtn
                  title="Simulación y pronóstico"
                  onPress={() =>
                    navigation.navigate('SalesForecast', {
                      snapshot: dashboard,                  // <-- pasa los datos que ya recibes en Home
                      ollamaBase: OLLAMA_BASE,              // <-- tu config local
                      ollamaModel: OLLAMA_MODEL,
                    })
                  }
                />
                <SmallBtn title="Reportes" onPress={() => navigation.navigate('Reports')} />

                <SmallBtn
                  title="Costo unitario"
                  onPress={() => navigation.navigate('UnitCost')}
                />
                <SmallBtn title="Tutorial" onPress={() => { setShowTutorial(true); setTimeout(measureAll, 200); }} />
                <SmallBtn title="Cerrar sesión" onPress={logout} danger />
              </View>
            </View>
            {dashboard?.lastSync && (
              <Text style={styles.syncHint}>Sincronizado {timeAgo(dashboard.lastSync)} • {dashboard.lastSync}</Text>
            )}
          </View>
        </View>

        {/* Search bar (STICKY) */}
        <View style={[styles.sectionSticky]}>
          <View style={[styles.container, styles.containerMax]}>
            <View style={[styles.searchRow, styles.searchRowTight]}>
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
              <View style={styles.inlineBtns}>
                <View ref={btnBuscarRef}>
                  <Pressable onPress={goSearch} style={[styles.smallBtn, styles.btnBlue]}><Text style={styles.smallBtnTextAlt}>Buscar</Text></Pressable>
                </View>
                <Pressable onPress={() => setSearch('')} style={[styles.smallBtn, styles.btnGray]}><Text style={styles.smallBtnTextAlt}>Limpiar</Text></Pressable>
              </View>
            </View>

            {/* Acciones rápidas */}
            <View style={styles.quickRow}>
              <View ref={btnVentaRef}><Pressable style={[styles.smallBtn, styles.btnBlue]} onPress={() => navigation.navigate('SaleCreate')}><Text style={styles.smallBtnTextAlt}>Venta</Text></Pressable></View>
              <View ref={btnCompraRef}><Pressable style={[styles.smallBtn, styles.btnPurple]} onPress={() => navigation.navigate('PurchaseCreate')}><Text style={styles.smallBtnTextAlt}>Compra</Text></Pressable></View>
              <View ref={btnProductoRef}><Pressable style={[styles.smallBtn, styles.btnGreen]} onPress={() => navigation.navigate('ProductForm')}><Text style={styles.smallBtnTextAlt}>Producto</Text></Pressable></View>
              <View ref={btnClienteRef}><Pressable style={[styles.smallBtn, styles.btnGray]} onPress={() => navigation.navigate('CustomerForm')}><Text style={styles.smallBtnTextAlt}>Cliente</Text></Pressable></View>
            </View>
          </View>
        </View>

        {/* MAIN GRID */}
        <View style={[styles.container, styles.containerMax]}>
          <View style={[styles.main, isWide && styles.mainWide]}>
            {/* Columna izquierda */}
            <View style={[styles.col, isWide && styles.colLeft]}>
              {/* Banner Premium */}
                <PromoBanner
                  onPress={() => navigation.navigate('Billing')}
                  hidden={String(dashboard?.plan || '').toLowerCase() === 'business'}
                />

              {/* KPIs Hoy */}
              <Section title="Hoy" subtitle="Resultados del día en curso">
                <View ref={sectionHoyRef} />
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
                <View ref={sectionMesRef} />
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
                right={<View style={styles.row}>
                  <SmallBtn title="Productos" onPress={() => navigation.navigate('ProductsList')} />
                  <SmallBtn title="Clientes" onPress={() => navigation.navigate('CustomersList')} />
                  <SmallBtn title="Almacenes" onPress={() => navigation.navigate('WarehousesList')} />
                </View>}
              >
                <View style={[styles.grid, styles.cols3]}>
                  {(loadingFirst ? [0,1,2] : totals).map((k: any, idx: number) => (
                    <GradientCard key={k?.label ?? `skt-${idx}`} >
                      {loadingFirst
                        ? (<><Skeleton width={90} /><Skeleton height={24} style={{ marginTop: 8, width: 60 }} /></>)
                        : (<><Label muted style={{ marginBottom: 6 }}>{k.label}</Label><Text style={[styles.kpiValue, isXL && styles.kpiValueXL]}>{k.value}</Text></>)}
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

              {/* Comparativa rápida */}
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
                        { value: Number(dashboard?.salesToday || 0), label: 'Ventas', frontColor: '#2563EB' },
                        { value: Number(dashboard?.marginToday || 0), label: 'Margen', frontColor: '#7C3AED' },
                      ]}
                      yAxisTextStyle={{ ...F, color: '#6b7280' } as any}
                      xAxisLabelTextStyle={{ ...F, color: '#6b7280' } as any}
                      showValuesAsTopLabel
                      //valueTextStyle={{ ...F, color: '#0f172a' } as any}
                      //barTopLabelTextStyle={{ ...F, color: '#0f172a' } as any}  // <-- aquí
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
              <Section title="Alertas" subtitle="Riesgos y pendientes" right={<View style={styles.row}><SmallBtn title="Refrescar" onPress={() => { fetchDashboard(); setTimeout(measureAll, 200); }} /></View>}>

                {/* Asesor IA */}
                <GradientCard style={{ marginBottom: 12 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.panelTitle}>Asesor IA (beta)</Text>
                    {aiLoading ? <ActivityIndicator /> : (
                      <View ref={btnIARef}>
                        <Pressable onPress={analyzeAlerts} style={[styles.smallBtn, styles.btnPurple]}>
                          <Text style={styles.smallBtnTextAlt}>{ai ? 'Re-analizar' : 'Analizar con IA'}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {ai?.prioridadGeneral && <View style={{ marginTop: 8 }}><PriorityPulse prioridad={ai.prioridadGeneral} /></View>}
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
                  <View ref={sectionStockRef} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.panelTitle}>Stock bajo</Text>
                    {loadingFirst ? <ActivityIndicator /> : (<Text style={[F, { color: '#6b7280' }]}>{dashboard?.lowStock?.length ?? 0}</Text>)}
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
                          <Text numberOfLines={1} style={[F, { flex: 1, paddingRight: 8 }]}>{p.sku} · {p.name}</Text>
                          <SmallBtn title="Ver" onPress={() => navigation.navigate('ProductsList', { filter: 'lowStock' })} />
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <SmallBtn title="Ver todos" onPress={() => navigation.navigate('ProductsList', { filter: 'lowStock' })} />
                    <SmallBtn title="Tienda Online" onPress={() => navigation.navigate('StoreFront', { tenantId: 5 })} />
                  </View>
                </Card>

                {/* Por cobrar */}
                <Card>
                  <View ref={sectionPorCobrarRef} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.panelTitle}>Por cobrar (próx. 7 días)</Text>
                    {loadingFirst ? <ActivityIndicator /> : (<Text style={[F, { color: '#6b7280' }]}>{dashboard?.receivablesDueSoon?.length ?? 0}</Text>)}
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

              {/* Tablero visual */}
              <Section title="Tablero visual" subtitle="Más vistas de tus datos">
                <View ref={sectionTableroRef} />
                <View style={[styles.grid, styles.cols2]}>
                  <Card>
                    <Text style={[styles.itemTitle, { marginBottom: 8 }]}>Vencimientos (monto)</Text>
                    <View style={{ alignItems: 'center' }}>
                      <PieChart
                        data={receivablesData.map(d => ({ value: d.value, color: d.color, text: `${d.label}\n${moneyNI(d.value)}` }))}
                        donut radius={110} innerRadius={70} showText textColor="#0f172a" textSize={10}
                        focusOnPress sectionAutoFocus
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
                  <Card>
                    <Text style={[styles.itemTitle, { marginBottom: 8 }]}>Actividad (últimos 7 días)</Text>
                    <LineChart
                      data={activity.values}
                      areaChart hideDataPoints={false} dataPointsHeight={6} dataPointsWidth={6}
                      startFillColor="#93C5FD" endFillColor="#93C5FD00" startOpacity={1} endOpacity={0.08}
                      thickness={2} color="#2563EB"
                      xAxisLabelTexts={activity.labels}
                      yAxisThickness={0} xAxisColor={BRAND.borderSoft} yAxisColor={BRAND.borderSoft}
                      xAxisLabelTextStyle={{ ...F, color: '#6b7280' } as any}
                      rulesColor={BRAND.borderSoft}
                      initialSpacing={20} spacing={28} noOfSections={4}
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

              {/* Estado */}
              <Section title="Estado del sistema" subtitle="Conectividad y sincronización">
                <Card>
                  <View style={styles.statusRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.dot, { backgroundColor: dashboard?.online ? '#10b981' : '#f59e0b' }]} />
                      <Text style={[F, { color: dashboard?.online ? '#065f46' : '#92400e' }]}>{dashboard?.online ? 'Conectado' : 'Sin conexión'}</Text>
                    </View>
                    <Label muted>Último sync: {dashboard?.lastSync ? `${dashboard.lastSync} · ${timeAgo(dashboard.lastSync)}` : '—'}</Label>
                  </View>
                  <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <SmallBtn title="Refrescar tablero" onPress={() => { fetchDashboard(); setTimeout(measureAll, 200); }} />
                    <SmallBtn title={polling ? 'Pausar auto-refresco' : 'Reanudar auto-refresco'} onPress={() => setPolling(p => !p)} />
                  </View>
                </Card>
              </Section>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Tutorial con targets (coach marks) */}
      <TutorialOverlay
        visible={showTutorial}
        onClose={closeTutorial}
        steps={tutorialSteps}
        targets={targets}
        requestScroll={requestScroll}
        onStepChange={() => setTimeout(measureAll, 200)}
      />
      {importing && (
        <View
          pointerEvents="auto"
          style={{
            position: 'absolute',
            left: 0, right: 0, top: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <View style={{
            width: 260,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#fff',
            alignItems: 'center',
            shadowColor: 'rgba(0,0,0,0.2)',
            shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}>
            <ActivityIndicator size="large" />
            <Text style={[F, { marginTop: 12, color: '#0f172a', fontSize: 16 }]}>
              Importando Excel…
            </Text>
            <Text style={[F, { marginTop: 6, color: '#6b7280', fontSize: 12, textAlign: 'center' }]}>
              Esto puede tardar unos segundos. No cierres esta pantalla.
            </Text>
          </View>
        </View>
      )}

    </View>
  );
}

// Empty State
const EmptyState: React.FC<{ title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }>
= ({ title, subtitle, actionLabel, onAction }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    {!!actionLabel && !!onAction && (<SmallBtn title={actionLabel} onPress={onAction} style={{ marginTop: 8 }} />)}
  </View>
);

// Estilos / helpers
function planColor(plan?: string) {
  switch ((plan || '').toLowerCase()) {
    case 'pro':       return { backgroundColor: '#dbeafe', color: BRAND.hanBlue };
    case 'business':  return { backgroundColor: '#dcfce7', color: BRAND.verdigris };
    default:          return { backgroundColor: '#f3f4f6', color: '#111827' };
  }
}

const styles = StyleSheet.create({
  container: { width: '100%', paddingHorizontal: 16 },
  containerMax: { maxWidth: 1280, alignSelf: 'center' },

  // HEADER
  headerWrap: { paddingTop: 12, paddingBottom: 8, backgroundColor: BRAND.surfacePanel, borderBottomColor: BRAND.borderSoft, borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerLeft: { flex: 1, minWidth: 0 },

  headerBtnsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minWidth: 0, alignItems: 'center' },
  headerBtnsWrapNarrow: { width: '100%' },

  title: { ...F, fontSize: 24, marginBottom: 4, color: BRAND.hanBlue },
  meta:  { ...F, color: '#6f7b94' },
  bold:  { ...F },
  planPill: { ...F, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  syncHint: { ...F, color: '#9aa7c2', marginTop: 4 },

  // STICKY
  sectionSticky: {
    backgroundColor: 'rgba(255,255,255,0.75)', // lechoso
    borderBottomColor: BRAND.borderSoft,
    borderBottomWidth: 0.5,
    paddingVertical: 10,
    zIndex: 5,
    elevation: 5,
    // efecto “frosted” light en web/iOS (opcional)
    // @ts-ignore
    backdropFilter: 'saturate(140%) blur(6px)',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F6FF', // ligeramente más claro que surfaceSubtle
  },


  // SECCIONES
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
    sectionTitle: { ...F, fontSize: 16, color: BRAND.slate700 },
  sectionSub:   { ...F, fontSize: 12, color: '#6b7280', marginTop: 2 },

  // GRID
  main: { paddingHorizontal: 16, paddingTop: 12 },
  mainWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  col: { flex: 1, minWidth: 0 }, 
  colLeft: { flex: 7 }, 
  colRight: { flex: 5 },
  grid: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  cols3: {}, 
  cols2: {},

  // CARD base (glass subtle)
  card: {
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,           // un poco más redondo
    padding: 12,
    borderWidth: 0,
    // sombra azul suave
    shadowColor: BRAND.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },


  // KPIs
  kpiValue:   { ...F, fontSize: 20, marginBottom: 8, color: '#0f172a' },
  kpiValueXL: { fontSize: 24 },
  barTrack: {
    height: 8,
    backgroundColor: BRAND.trackSoft,
    borderRadius: 999,          // totalmente redondo
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },


  // Textos comunes
  itemTitle: { ...F, fontSize: 16, color: '#0f172a' },
  itemSub:   { ...F, fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Buscador / acciones
  searchRow: { flexDirection: 'row' },
  searchRowTight: { alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start', minWidth: 0 },
  searchWrap: { position: 'relative', minWidth: 0, flexShrink: 1 },
  searchInput: {
    ...F, fontSize: 16,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingHorizontal: 12, paddingRight: 34, minHeight: 42,
    backgroundColor: BRAND.surfacePanel,
  },
  searchClear: {
    position: 'absolute', right: 10, top: 9,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND.surfaceSubtle,
  },
  inlineBtns: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  quickRow: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // Badges
  badge:       { ...F, backgroundColor: '#E9EDFF', color: BRAND.hanBlue, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  badgeDanger: { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeWarning:{ backgroundColor: '#fef3c7', color: '#92400e' },
  badgeOrange: { backgroundColor: '#ffedd5', color: '#9a3412' },
  badgeInfo:   { backgroundColor: '#E9EDFF', color: BRAND.hanBlue },

  // Estado
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 999 },

  // Botón pequeño (chips)
  smallBtn: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BRAND.surfacePanel,
    shadowColor: BRAND.cardShadow,  // sombra neutra por defecto
    shadowOpacity: 1, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 1,
    flexShrink: 0, alignSelf: 'flex-start',
  },
  btnBlue: {
    backgroundColor: BRAND.primary600,
    // glow del mismo tono
    shadowColor: 'rgba(37,99,235,0.25)',
    elevation: 2,
  },
  btnPurple: {
    backgroundColor: BRAND.purple600,
    shadowColor: 'rgba(109,40,217,0.25)',
    elevation: 2,
  },
  btnGreen: {
    backgroundColor: BRAND.green,
    shadowColor: 'rgba(16,185,129,0.25)',
    elevation: 2,
  },
  btnGray: {
    backgroundColor: '#1E293B',
    shadowColor: 'rgba(30,41,59,0.25)',
    elevation: 2,
  },


  smallBtnDanger: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  smallBtnText: { ...F, color: BRAND.hanBlue },
  smallBtnTextAlt: { ...F, color: '#FFFFFF' },

    // ---- Sidebar “card” separada
  sidebarDock: {
    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10,
    paddingLeft: 16, paddingTop: 16, paddingBottom: 16,
  },
  sidebarFloat: {
    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 20,
    paddingLeft: 16, paddingTop: 16, paddingBottom: 16,
  },
  sidebarOuter: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sidebarGradient: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
  },

  // Ajustes del panel interno para usar sobre gradiente
  panel: { flex: 1, paddingTop: Platform.OS === 'web' ? 16 : 44, paddingHorizontal: 10, paddingBottom: 12 },
  panelHeaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND.primary600, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...F, color: '#ffffff' },
  panelTitleMain: { ...F, color: '#fff', fontSize: 16 },
  panelSubtitle:  { ...F, color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },

  panelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // translúcido sobre el azul
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderColor: 'rgba(255,255,255,0.15)',

      // quitar bordes
      borderWidth: 0,
  },
  panelCardTitle: { ...F, color: '#fff' },
  panelCardSub: { ...F, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  panelBlock: { marginBottom: 12 },
  panelBlockTitle: { ...F, fontSize: 11, color: 'rgba(255,255,255,0.9)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 6, borderBottomColor: 'rgba(255,255,255,0.15)', borderBottomWidth: 1 },
  panelRowLabel: { ...F, color: 'rgba(255,255,255,0.9)', width: 120, fontSize: 12 },
  panelRowValue: { ...F, color: '#fff', flex: 1 },
  linkChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.08)' },
  linkChipText: { ...F, color: '#fff' },

  // Nav items tipo “pill”
  navItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',   // mismo tono translúcido del panel
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.18)',       // borde suave
  },
  navItemText: { ...F, color: '#FFFFFF' },        // texto claro


  // CTA inferior del sidebar (opcional)
  sidebarCta: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  sidebarCtaSmall: { ...F, color: 'rgba(255,255,255,0.9)', fontSize: 12, marginBottom: 8 },
  sidebarCtaBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sidebarCtaBtnText: { ...F, color: '#fff' },

  // Pie
  panelFoot: { ...F, marginTop: 8, color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,          // en Web funciona; si no, usa márgenes
    flexWrap: 'nowrap',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  promoCard: {
  borderRadius: 20,
  padding: 16,
  marginBottom: 12,
  flexDirection: 'row',
  alignItems: 'center',
  // sombra suave tipo glass
  backgroundColor: 'transparent',
  shadowColor: BRAND.cardShadow,
  shadowOpacity: 1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
},
promoEyebrow: { ...F, color: 'rgba(255,255,255,0.95)', fontSize: 12, marginBottom: 6 },
promoTitle:   { ...F, color: '#FFFFFF', fontSize: 18, lineHeight: 22 },
promoSub:     { ...F, color: 'rgba(255,255,255,0.95)', fontSize: 12, marginTop: 6 },

promoBtn: {
  marginTop: 12,
  backgroundColor: '#FFFFFF',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 12,
  alignSelf: 'flex-start',
  shadowColor: 'rgba(255,255,255,0.25)',
  shadowOpacity: 1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
},
promoBtnText: { ...F, color: BRAND.primary700 },

// “ilustración” geométrica simple al lado derecho
promoArt: {
  width: 140,
  height: 110,
  alignItems: 'center',
  justifyContent: 'center',
},
promoChip: {
  width: 46, height: 10, borderRadius: 6,
  backgroundColor: 'rgba(255,255,255,0.9)',
  marginBottom: 6,
},
promoMonitor: {
  width: 110, height: 54, borderRadius: 12,
  backgroundColor: 'rgba(255,255,255,0.92)',
  marginTop: 4,
},
promoKeyboard: {
  width: 120, height: 12, borderRadius: 8,
  backgroundColor: 'rgba(255,255,255,0.9)',
  marginTop: 8,
},

overlay: {
  position: 'absolute',
  left: 0, top: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.25)',
},
panelTitle: { ...F, fontSize: 14, color: '#0f172a' },

empty: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  paddingHorizontal: 12,
},
emptyTitle: { ...F, fontSize: 16, color: '#0f172a' },
emptySub:   { ...F, fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' },


});