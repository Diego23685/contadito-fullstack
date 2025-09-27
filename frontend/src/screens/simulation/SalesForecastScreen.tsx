import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-gifted-charts';

const F = Platform.select({ ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const }, default: { fontFamily: 'Apoka' } });

type Dashboard = {
  tenantName: string;
  plan: string;
  online: boolean;
  lastSync: string;
  salesToday: number; marginToday: number; ticketsToday: number;
  salesMonth: number; marginMonth: number; ticketsMonth: number; avgTicketMonth: number;
  productsTotal: number; customersTotal: number; warehousesTotal: number;
  latestProducts: { id: number; sku: string; name: string }[];
  lowStock: { id: number; sku: string; name: string }[];
  receivablesDueSoon: { invoiceId: number; number: string; customerName: string | null; total: number; dueAmount: number; dueInDays: number; }[];
  activity: { kind: string; refId: number; title: string; whenAt: string }[];
};

type RouteParams = {
  SalesForecast: {
    snapshot: Dashboard | null;
    horizon?: number;
  };
};

type ForecastItem = { month: string; base: number; optimistic: number; conservative: number };
type ForecastReply = { method: string; assumptions: string[]; monthly_forecast: ForecastItem[] };

const moneyNI = (v?: number | null) => {
  const n = Number(v ?? 0);
  try { return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n); }
  catch { return `C$ ${n.toFixed(2)}`; }
};

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function addMonths(d: Date, m: number) { const x = new Date(d); x.setMonth(x.getMonth()+m); return x; }
function daysInMonth(y: number, m0: number) { return new Date(y, m0+1, 0).getDate(); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// Etiqueta top (2 decimales)
const TopLabel = ({ value }: { value: number }) => (
  <Text style={[F, { color: '#0f172a', fontSize: 12 }]}>{moneyNI(Number(value.toFixed(2)))}</Text>
);

// ===== Pronóstico SOLO con snapshot =====
function forecastFromSnapshotOnly(snapshot: Dashboard | null, horizon: number): ForecastReply {
  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const day = Math.max(1, now.getDate());
  const dimCur = daysInMonth(y, m0);

  const salesMonth = Number(snapshot?.salesMonth ?? 0);
  const salesToday  = Number(snapshot?.salesToday ?? 0);

  // Run-rate diario basado en MTD
  const dailyRunRate = salesMonth / day; // C$ por día

  // Momentum del día actual: compara hoy vs run-rate (±5% máx.)
  const momentum = dailyRunRate > 0 ? clamp((salesToday - dailyRunRate)/dailyRunRate, -0.05, 0.05) : 0;

  // Ajuste por cuentas por cobrar próximas: repartimos en M1 y M2
  const receivables = (snapshot?.receivablesDueSoon ?? []);
  const soon15  = receivables.filter(r => r.dueInDays <= 15).reduce((s, r) => s + (r.dueAmount ?? 0), 0);
  const soon30  = receivables.filter(r => r.dueInDays > 15 && r.dueInDays <= 30).reduce((s, r) => s + (r.dueAmount ?? 0), 0);
  const adjM1 = 0.70 * soon15 + 0.30 * soon30; // más probable entre 0–15 días
  const adjM2 = 0.30 * soon15 + 0.50 * soon30;

  // Deriva mensual suave (crecimiento orgánico)
  const monthlyDrift = 0.007; // +0.7%/mes

  // Generamos meses a partir del próximo mes
  const startMonth = addMonths(new Date(y, m0, 1), 1);
  const months: string[] = Array.from({ length: horizon }, (_, i) => monthKey(addMonths(startMonth, i)));

  const items: ForecastItem[] = months.map((mk, i) => {
    const d = new Date(mk + '-01');
    const baseDays = daysInMonth(d.getFullYear(), d.getMonth());

    // Base por run-rate * días del mes destino
    let base = Math.max(0, dailyRunRate * baseDays);

    // Aplico momentum SOLO al primer mes
    if (i === 0) base *= (1 + momentum);

    // Aplico deriva suave acumulativa
    base *= Math.pow(1 + monthlyDrift, i);

    // Sumo cobranzas probables (solo M1 y M2, aditivo)
    if (i === 0) base += adjM1;
    if (i === 1) base += adjM2;

    return {
      month: mk,
      base,
      optimistic: base * 1.10,     // +10%
      conservative: base * 0.90,   // -10%
    };
  });

  return {
    method: 'Run-rate MTD + momentum del día + cobranzas próximas (sin IA, sin histórico)',
    assumptions: [
      'Base = (ventas MTD / días transcurridos) × días del mes proyectado',
      'Momentum (±5%) según ventas de hoy vs run-rate',
      'Cuentas por cobrar próximas se suman en M1/M2 (70/30 y 30/50)',
      'Crecimiento suave +0.7% mensual',
      'Escenarios: +10% / −10%',
    ],
    monthly_forecast: items,
  };
}

export default function SalesForecastScreen() {
  const route = useRoute<RouteProp<RouteParams, 'SalesForecast'>>();
  const snapshot = route.params?.snapshot ?? null;
  const HORIZON = Math.max(3, Math.min(12, route.params?.horizon ?? 6));

  const [loading, setLoading] = useState(true);
  const [fc, setFc] = useState<ForecastReply | null>(null);

  const recalc = () => {
    setLoading(true);
    const next = forecastFromSnapshotOnly(snapshot, HORIZON);
    setFc(next);
    setLoading(false);
  };

  useEffect(() => { recalc(); }, [snapshot, HORIZON]);

  const labels = useMemo(() => (fc?.monthly_forecast ?? []).map(m => m.month.slice(5)), [fc]);
  const seriesBase = useMemo(() => (fc?.monthly_forecast ?? []).map(m => ({ value: m.base })), [fc]);
  const seriesOpt  = useMemo(() => (fc?.monthly_forecast ?? []).map(m => ({ value: m.optimistic })), [fc]);
  const seriesCon  = useMemo(() => (fc?.monthly_forecast ?? []).map(m => ({ value: m.conservative })), [fc]);

  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
  const kBase = sum((fc?.monthly_forecast ?? []).map(m => m.base));
  const kOpt  = sum((fc?.monthly_forecast ?? []).map(m => m.optimistic));
  const kCon  = sum((fc?.monthly_forecast ?? []).map(m => m.conservative));

  return (
    <View style={{ flex: 1, backgroundColor: '#EEF2FF' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Pronóstico de ventas</Text>
        <Text style={styles.sub}>
          {`Proyección de ${HORIZON} meses usando únicamente tu snapshot del Home.`}
        </Text>

        {/* Resumen / método */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Resumen</Text>
            <Pressable onPress={recalc} style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>Recalcular</Text></Pressable>
          </View>
          {loading || !fc ? <ActivityIndicator style={{ marginTop: 8 }} /> : (
            <>
              <Text style={styles.itemSub}><Text style={styles.bold}>Método: </Text>{fc.method}</Text>
              <View style={{ marginTop: 6 }}>
                {fc.assumptions.slice(0, 4).map((a, idx) => (
                  <Text key={`a-${idx}`} style={styles.itemSub}>• {a}</Text>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Proyección */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Proyección mensual</Text>
          {loading || !fc ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : (
            <>
              <LineChart
                data={seriesBase}
                data2={seriesOpt}
                data3={seriesCon}
                showDataPointForRecordInBetween
                areaChart
                curved
                startFillColor="#93C5FD" endFillColor="#93C5FD00" startOpacity={1} endOpacity={0.05}
                thickness={2} color="#2563EB"
                data2Thickness={2} data2Color="#10B981"
                data3Thickness={2} data3Color="#EF4444"
                xAxisLabelTexts={labels}
                yAxisThickness={0} xAxisColor="#E6EBFF" yAxisColor="#E6EBFF"
                xAxisLabelTextStyle={{ ...F, color: '#6b7280' } as any}
                rulesColor="#E6EBFF"
                initialSpacing={20} spacing={26} noOfSections={4}
              />
              <Text style={styles.legend}>
                <Text style={{ color: '#2563EB' }}>Base</Text> · <Text style={{ color: '#10B981' }}>Optimista</Text> · <Text style={{ color: '#EF4444' }}>Conservador</Text>
              </Text>
            </>
          )}
        </View>

        {/* Totales */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Totales {`(${HORIZON}m)`}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <Kpi title="Base" value={moneyNI(kBase)} />
            <Kpi title="Optimista" value={moneyNI(kOpt)} />
            <Kpi title="Conservador" value={moneyNI(kCon)} />
          </View>

          <View style={{ marginTop: 12 }}>
            <BarChart
              barWidth={28}
              noOfSections={4}
              spacing={40}
              yAxisThickness={0}
              xAxisThickness={0}
              rulesColor="#E6EBFF"
              data={[
                { value: kBase, label: 'Base', frontColor: '#2563EB' },
                { value: kOpt,  label: 'Opt.', frontColor: '#10B981' },
                { value: kCon,  label: 'Cons.', frontColor: '#EF4444' },
              ]}
              showValuesAsTopLabel
              topLabelComponent={(item: any) => <TopLabel value={item.value} />}
              renderTooltip={(item: any) => (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipTitle}>{item.label}</Text>
                  <Text style={styles.tooltipText}>{moneyNI(Number(item.value.toFixed(2)))}</Text>
                </View>
              )}
            />
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const Kpi: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <View style={{ flexGrow: 1, minWidth: 160, backgroundColor: '#fff', borderRadius: 14, padding: 12, shadowColor: 'rgba(37,99,235,0.16)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}>
    <Text style={[F, { color: '#6b7280', fontSize: 12 }]}>{title}</Text>
    <Text style={[F, { color: '#0f172a', fontSize: 18, marginTop: 4 }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  title: { ...F, fontSize: 22, color: '#1D4ED8' },
  sub: { ...F, color: '#64748B' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 12, shadowColor: 'rgba(37,99,235,0.16)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  cardTitle: { ...F, color: '#0f172a', fontSize: 16, marginBottom: 8 },
  itemSub: { ...F, color: '#6b7280', fontSize: 12, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

  btnPrimary: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnPrimaryText: { ...F, color: '#fff' },

  legend: { ...F, color: '#6b7280', fontSize: 12, marginTop: 6 },

  tooltip: { backgroundColor: '#fff', borderColor: '#E6EBFF', borderWidth: 1, padding: 6, borderRadius: 8 },
  tooltipTitle: { ...F, color: '#0f172a' },
  tooltipText: { ...F, color: '#6b7280', fontSize: 12 },
  bold: { ...F },
});
