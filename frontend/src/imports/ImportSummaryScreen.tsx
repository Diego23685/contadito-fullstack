// src/screens/ImportSummaryScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { BarChart } from 'react-native-gifted-charts';

export type ImportItemSummary = {
  sku: string;
  name: string;
  productId?: number | null;
  created: boolean;
  updated: boolean;
  skipped?: boolean;
  skippedReason?: string | null;
  isService?: boolean;
  trackStock?: boolean;
  listPrice?: number;
  stdCost?: number | null;
  initQty?: number | null;
  initCost?: number | null;
  warehouseId?: number | null;
  warehouseName?: string | null;
  costCalc?: {
    baseCost: number;
    overheadPct: number;
    shippingPct: number;
    finalCost: number;
    marginAbs: number;
    marginPct: number;
  } | null;
};

export type ImportSummaryPayload = {
  created: number;
  updated: number;
  skipped: number;
  errors?: string[];
  items: ImportItemSummary[];
};

type ParamList = {
  ImportSummary: { summary: ImportSummaryPayload };
};

const F = { fontFamily: 'Apoka' } as const;
const BRAND = {
  bg: '#EEF2FF',
  card: '#FFFFFF',
  ink: '#0f172a',
  inkSub: '#64748B',
  primary: '#2563EB',
  primarySoft: '#D2E0FF',
  green: '#10B981',
  blue: '#3B82F6',
  grayInk: '#1E293B',
  border: '#E6EBFF',
  danger: '#991b1b',
  warn: '#F59E0B',
};

const moneyNI = (v?: number | null) => {
  const n = Number(v ?? 0);
  try {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n);
  } catch {
    return `C$ ${n.toFixed(2)}`;
  }
};

export default function ImportSummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'ImportSummary'>>();
  const summary = route.params?.summary;
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const justCreated = useMemo(() => summary?.items?.filter(i => i.created && !i.skipped) ?? [], [summary]);

  // Redondeo a 2 decimales en el valor que grafica (margen absoluto)
  const chartData = useMemo(() => {
    return (justCreated.slice(0, 8)).map(i => {
      const raw = Number(i.costCalc?.marginAbs ?? 0);
      const value = Math.round(raw * 100) / 100; // ← 2 decimales
      return {
        value,
        label: i.sku?.slice(0, 8) || 'SKU',
        frontColor: BRAND.green,
        extraData: i,
      };
    });
  }, [justCreated]);

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Encabezado */}
        <View style={[styles.headerRow, isWide && { alignItems: 'flex-end' }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>Resumen de importación</Text>
            <Text style={styles.sub}>
              Productos creados: <Text style={styles.bold}>{summary?.created ?? 0}</Text> · Actualizados:{' '}
              <Text style={styles.bold}>{summary?.updated ?? 0}</Text> · Omitidos:{' '}
              <Text style={styles.bold}>{summary?.skipped ?? 0}</Text>
            </Text>
          </View>
          <View style={styles.headerBtns}>
            <Pressable onPress={() => navigation.goBack()} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Volver</Text>
            </Pressable>
          </View>
        </View>

        {/* Métricas (siempre arriba) */}
        <View style={[styles.kpiRow, isWide ? null : { marginBottom: 12 }]}>
          <KpiCard label="Creados" value={summary?.created ?? 0} color={BRAND.green} />
          <KpiCard label="Actualizados" value={summary?.updated ?? 0} color={BRAND.blue} />
          <KpiCard label="Omitidos" value={summary?.skipped ?? 0} color={BRAND.warn} />
        </View>

        {/* Grid responsive: izq lista, der gráfico/errores */}
        <View style={[styles.grid, isWide && styles.gridWide]}>
          {/* Columna izquierda: LISTA */}
          <View style={[styles.col, isWide && styles.colLeft]}>
            {/* Lista detallada */}
            <View style={{ gap: 12 }}>
              {(summary?.items ?? []).map((i, idx) => (
                <View key={`${i.sku}-${idx}`} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {i.name || 'Producto'}
                    </Text>
                    <Text
                      style={[
                        styles.pill,
                        i.created ? styles.pillOk : i.updated ? styles.pillInfo : i.skipped ? styles.pillWarn : null,
                      ]}
                    >
                      {i.created ? 'Creado' : i.updated ? 'Actualizado' : i.skipped ? 'Omitido' : '—'}
                    </Text>
                  </View>

                  <Text style={styles.itemSub}>
                    SKU {i.sku} {i.productId ? `· ID ${i.productId}` : ''}
                  </Text>

                  {/* Estructura de costos */}
                  <View style={styles.costGrid}>
                    <CostCol label="Precio lista" value={moneyNI(i.listPrice)} />
                    <CostCol label="Costo base" value={moneyNI(i.costCalc?.baseCost)} />
                    <CostCol label="Indirectos" value={`${(((i.costCalc?.overheadPct ?? 0) * 100).toFixed(2))}%`} />
                    <CostCol label="Flete/otros" value={`${(((i.costCalc?.shippingPct ?? 0) * 100).toFixed(2))}%`} />
                    <CostCol label="Costo total" value={moneyNI(i.costCalc?.finalCost)} />
                    <CostCol
                      label="Margen"
                      value={`${moneyNI(i.costCalc?.marginAbs)} (${(((i.costCalc?.marginPct ?? 0) * 100).toFixed(2))}%)`}
                    />
                  </View>

                  {/* Stock inicial si aplica */}
                  {!i.isService && Number(i.initQty ?? 0) > 0 && (
                    <View style={[styles.row, { marginTop: 10, flexWrap: 'wrap' }]}>
                      <Text style={styles.badge}>
                        Stock inicial: {i.initQty} @ {moneyNI(i.initCost)} {i.warehouseName ? `· ${i.warehouseName}` : ''}
                      </Text>
                    </View>
                  )}

                  {!!i.skipped && !!i.skippedReason && (
                    <Text style={[styles.itemSub, { color: BRAND.danger, marginTop: 6 }]}>
                      Motivo: {i.skippedReason}
                    </Text>
                  )}

                  {/* Acciones rápidas */}
                  <View style={[styles.row, { marginTop: 10, flexWrap: 'wrap' }]}>
                    {!!i.productId && (
                      <Pressable
                        style={styles.linkBtn}
                        onPress={() => navigation.navigate('ProductForm', { id: i.productId })}
                      >
                        <Text style={styles.linkBtnText}>Abrir producto</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.linkBtn} onPress={() => navigation.navigate('ProductsList')}>
                      <Text style={styles.linkBtnText}>Ver catálogo</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Columna derecha: GRÁFICO + ERRORES */}
          <View style={[styles.col, isWide && styles.colRight]}>
            {/* Gráfico de márgenes */}
            {!!chartData.length && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Top márgenes estimados (recién creados)</Text>
                <BarChart
                  data={chartData}
                  barWidth={28}
                  spacing={32}
                  noOfSections={4}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  showValuesAsTopLabel
                  // Etiquetas superiores ya reciben el 'value' redondeado (2 decimales)
                  topLabelTextStyle={{ ...F, color: BRAND.inkSub, fontSize: 10 } as any}
                  rulesColor={BRAND.border}
                  renderTooltip={(it: any) => {
                    const ed = it?.extraData;
                    const pct = Number((ed?.costCalc?.marginPct ?? 0) * 100);
                    return (
                      <View style={styles.tooltip}>
                        <Text style={styles.tooltipTitle}>{ed?.name ?? it?.label}</Text>
                        <Text style={styles.tooltipText}>SKU {ed?.sku}</Text>
                        <Text style={styles.tooltipText}>Precio: {moneyNI(ed?.listPrice)}</Text>
                        <Text style={styles.tooltipText}>Costo total: {moneyNI(ed?.costCalc?.finalCost)}</Text>
                        <Text style={styles.tooltipText}>
                          Margen: {moneyNI(ed?.costCalc?.marginAbs)} ({pct.toFixed(2)}%)
                        </Text>
                      </View>
                    );
                  }}
                />
              </View>
            )}

            {/* Errores */}
            {!!summary?.errors?.length && (
              <View style={[styles.card, { borderColor: '#fecaca', borderWidth: 1 }]}>
                <Text style={[styles.cardTitle, { color: BRAND.danger }]}>Errores</Text>
                {summary.errors.map((e, i) => (
                  <Text key={`err-${i}`} style={[styles.itemSub, { color: BRAND.danger }]}>
                    {e}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

/* ------- Subcomponentes pequeños ------- */
const KpiCard: React.FC<{ label: string; value: number | string; color: string }> = ({ label, value, color }) => (
  <View style={[styles.kpiCard]}>
    <View style={[styles.kpiBadge, { backgroundColor: color }]} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={styles.kpiValue}>{String(value)}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  </View>
);

const CostCol: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.costCol}>
    <Text style={styles.costLabel}>{label}</Text>
    <Text style={styles.costValue}>{value}</Text>
  </View>
);

/* --------------- Estilos --------------- */
const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { ...F, fontSize: 22, color: BRAND.primary },
  sub: { ...F, color: BRAND.inkSub },
  bold: { ...F },

  headerBtns: { flexDirection: 'row', gap: 8 },
  primaryBtn: { backgroundColor: BRAND.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  primaryBtnText: { ...F, color: '#fff' },

  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flexGrow: 1,
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f2f5ff',
    shadowColor: 'rgba(37,99,235,0.12)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kpiBadge: { width: 12, height: 12, borderRadius: 6 },
  kpiValue: { ...F, color: BRAND.ink, fontSize: 18 },
  kpiLabel: { ...F, color: BRAND.inkSub, fontSize: 12, marginTop: 2 },

  grid: { gap: 16 },
  gridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0 },
  colLeft: { flex: 7, gap: 16 },
  colRight: { flex: 5, gap: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderColor: BRAND.border,
    borderWidth: 1,
    shadowColor: 'rgba(37,99,235,0.12)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTitle: { ...F, color: BRAND.ink, fontSize: 16, marginBottom: 8 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'nowrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  itemTitle: { ...F, color: BRAND.ink, fontSize: 16 },
  itemSub: { ...F, color: BRAND.inkSub, fontSize: 12, marginTop: 2 },

  pill: { ...F, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, color: BRAND.ink, backgroundColor: '#E5E7EB' },
  pillOk: { backgroundColor: '#dcfce7', color: '#065f46' },
  pillInfo: { backgroundColor: '#dbeafe', color: '#1e3a8a' },
  pillWarn: { backgroundColor: '#fee2e2', color: '#991b1b' },

  costGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  costCol: { minWidth: 140, flexGrow: 1 },
  costLabel: { ...F, color: BRAND.inkSub, fontSize: 12 },
  costValue: { ...F, color: BRAND.ink, fontSize: 14 },

  badge: { ...F, backgroundColor: '#E9EDFF', color: '#1e3a8a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },

  linkBtn: { backgroundColor: BRAND.grayInk, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  linkBtnText: { ...F, color: '#fff' },

  tooltip: { backgroundColor: '#fff', borderColor: BRAND.border, borderWidth: 1, padding: 6, borderRadius: 8, maxWidth: 240 },
  tooltipTitle: { ...F, color: BRAND.ink },
  tooltipText: { ...F, color: BRAND.inkSub, fontSize: 12 },
});
