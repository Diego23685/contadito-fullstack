// src/screens/RecentActivity.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';

const F = Platform.select({ ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const }, default: { fontFamily: 'Apoka' } });
const BRAND = {
  primary: '#2563EB', surface: '#FFFFFF', bg: '#EEF2FF',
  border: '#E6EBFF', slate900: '#0F172A', slate700: '#334155', slate500: '#64748B',
  green: '#10B981', red: '#DC2626', purple: '#7C3AED'
};

const ymd = (d: Date) => {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
};
const moneyNI = (v?: number | null) => {
  const n = Number(v ?? 0);
  try { return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n); }
  catch { return `C$ ${n.toFixed(2)}`; }
};

type SaleDetail = {
  invoice: string;
  customer?: string | null;
  total: number;
  items: { name: string; qty: number }[];
};

type DayBucket = {
  date: string;              // yyyy-mm-dd
  inCount: number;           // movimientos IN/ADJUST
  inQty: number;             // suma qty IN/ADJUST
  outCount: number;          // movimientos OUT (ventas, salidas)
  outQty: number;            // suma qty OUT
  salesCount: number;        // facturas
  salesTotal: number;        // total vendido en C$
  salesDetails: SaleDetail[];// ← NUEVO: facturas con items/cliente
};

type QuickRange = 'hoy' | 'ayer' | 'antier' | 'ult7' | 'ult30';

export default function RecentActivity({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<QuickRange>('hoy');

  const rangeDates = useMemo(() => {
    const today = new Date(); today.setHours(12,0,0,0);
    const d = new Date(today);
    if (range === 'hoy') {
      return { from: ymd(d), to: ymd(d) };
    } else if (range === 'ayer') {
      d.setDate(d.getDate()-1);
      return { from: ymd(d), to: ymd(d) };
    } else if (range === 'antier') {
      d.setDate(d.getDate()-2);
      return { from: ymd(d), to: ymd(d) };
    } else if (range === 'ult7') {
      const f = new Date(today); f.setDate(f.getDate()-6);
      return { from: ymd(f), to: ymd(today) };
    } else {
      const f = new Date(today); f.setDate(f.getDate()-29);
      return { from: ymd(f), to: ymd(today) };
    }
  }, [range]);

  const [data, setData] = useState<DayBucket[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = rangeDates;

      // 1) Movimientos de inventario (IN/OUT/ADJUST) agrupados por día y tipo
      const invReq = api.post('/reports/run', {
        source: 'inventory_movements',
        groupBy: ['date:day', 'movementType'],
        metrics: ['sum_qty','count'],
        from, to,
      });

      // 2) Ventas (resumen por día, para totales)
      const salesSummaryReq = api.post('/reports/run', {
        source: 'sales',
        groupBy: ['date:day'],
        metrics: ['sum_total','count'],
        from, to,
      });

      // 3) Ventas por ítem/factura/cliente (para “qué y a quién”)
      const salesDetailReq = api.post('/reports/run', {
        source: 'sales',
        groupBy: ['date:day', 'invoice', 'customer', 'product'],
        metrics: ['sum_qty','sum_total','count'],
        from, to,
      });

      const [invRes, salesRes, salesDetRes] = await Promise.all([invReq, salesSummaryReq, salesDetailReq]);

      // ---- Parse inventario ----
      const invCols: string[] = invRes.data?.columns || [];
      const invRows: any[][] = invRes.data?.rows || [];
      const invDateIdx = Math.max(invCols.findIndex(c => /date(.+day)?/i.test(c)), invCols.findIndex(c => /fecha/i.test(c)));
      const invTypeIdx = invCols.findIndex(c => /movementtype/i.test(c));
      const invQtyIdx  = Math.max(invCols.findIndex(c => /sum_qty/i.test(c)), invCols.findIndex(c => /qty/i.test(c)));
      const invCntIdx  = Math.max(invCols.findIndex(c => /count/i.test(c)), invCols.findIndex(c => /movimientos/i.test(c)));

      // ---- Parse ventas (resumen por día) ----
      const sCols: string[] = salesRes.data?.columns || [];
      const sRows: any[][] = salesRes.data?.rows || [];
      const sDateIdx = Math.max(sCols.findIndex(c => /date(.+day)?/i.test(c)), sCols.findIndex(c => /fecha/i.test(c)));
      const sTotalIdx = Math.max(sCols.findIndex(c => /sum_total/i.test(c)), sCols.findIndex(c => /total/i.test(c)));
      const sCountIdx = sCols.findIndex(c => /count/i.test(c));

      // ---- Parse ventas detalle (día + factura + cliente + producto) ----
      const dCols: string[] = salesDetRes.data?.columns || [];
      const dRows: any[][] = salesDetRes.data?.rows || [];
      const dDateIdx   = Math.max(dCols.findIndex(c => /^date$/i.test(c) || /date(.+day)?/i.test(c)), dCols.findIndex(c => /fecha/i.test(c)));
      const dInvIdx    = dCols.findIndex(c => /^invoice$/i.test(c));
      const dCustIdx   = dCols.findIndex(c => /^customer$/i.test(c));
      // product puede venir como product_name o product
      let dProdNameIdx = dCols.findIndex(c => /^product_name$/i.test(c));
      if (dProdNameIdx < 0) dProdNameIdx = dCols.findIndex(c => /^product$/i.test(c));
      const dQtyIdx    = Math.max(dCols.findIndex(c => /sum_qty/i.test(c)), dCols.findIndex(c => /^qty$/i.test(c)));
      const dTotIdx    = Math.max(dCols.findIndex(c => /sum_total/i.test(c)), dCols.findIndex(c => /^total$/i.test(c)));

      // Buckets por día
      const map = new Map<string, DayBucket>();

      // 1) inventario
      for (const r of invRows) {
        const rawDate = r?.[invDateIdx];
        const type = String(r?.[invTypeIdx] ?? '').toLowerCase() as 'in'|'out'|'adjust'|'';
        if (!rawDate || !type) continue;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : ymd(new Date(rawDate));
        const qty = Number(r?.[invQtyIdx] ?? 0) || 0;
        const cnt = Number(r?.[invCntIdx] ?? 0) || 0;

        const bucket = map.get(date) || { date, inCount:0,inQty:0,outCount:0,outQty:0,salesCount:0,salesTotal:0, salesDetails: [] };
        if (type === 'out') { bucket.outCount += cnt; bucket.outQty += qty; }
        else { bucket.inCount += cnt; bucket.inQty += qty; }
        map.set(date, bucket);
      }

      // 2) ventas resumen
      for (const r of sRows) {
        const rawDate = r?.[sDateIdx];
        if (!rawDate) continue;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : ymd(new Date(rawDate));
        const total = Number(r?.[sTotalIdx] ?? 0) || 0;
        const cnt = Number(r?.[sCountIdx] ?? 0) || 0;

        const bucket = map.get(date) || { date, inCount:0,inQty:0,outCount:0,outQty:0,salesCount:0,salesTotal:0, salesDetails: [] };
        bucket.salesCount += cnt;
        bucket.salesTotal += total;
        map.set(date, bucket);
      }

      // 3) ventas detalle (construir facturas -> items)
      // Estructura temporal: day -> invoice -> { customer,total, items[] }
      type TmpInv = { customer?: string | null; total: number; items: { name: string; qty: number }[] };
      const dayInvoices = new Map<string, Map<string, TmpInv>>();

      for (const r of dRows) {
        const rawDate = r?.[dDateIdx];
        const invoice = String(r?.[dInvIdx] ?? '').trim();
        const customer = (r?.[dCustIdx] ?? null) as string | null;
        const prodName = String(r?.[dProdNameIdx] ?? '').trim();
        const qty = Number(r?.[dQtyIdx] ?? 0) || 0;
        const total = Number(r?.[dTotIdx] ?? 0) || 0;

        if (!rawDate || !invoice) continue;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : ymd(new Date(rawDate));

        let invs = dayInvoices.get(date);
        if (!invs) { invs = new Map<string, TmpInv>(); dayInvoices.set(date, invs); }
        let info = invs.get(invoice);
        if (!info) { info = { customer, total: 0, items: [] }; invs.set(invoice, info); }

        info.total += total; // sum_total ya viene agrupado por producto; se suma por seguridad
        if (prodName) {
          const existing = info.items.find(i => i.name === prodName);
          if (existing) existing.qty += qty;
          else info.items.push({ name: prodName, qty });
        }
      }

      // Integrar detalles en los buckets
      for (const [date, invs] of dayInvoices.entries()) {
        const bucket = map.get(date) || { date, inCount:0,inQty:0,outCount:0,outQty:0,salesCount:0,salesTotal:0, salesDetails: [] };
        const details: SaleDetail[] = [];
        for (const [invoice, info] of invs.entries()) {
          // Ordenar items por qty desc
          info.items.sort((a,b) => (b.qty - a.qty));
          details.push({
            invoice,
            customer: info.customer,
            total: info.total,
            items: info.items
          });
        }
        // Ordenar facturas por total desc
        details.sort((a,b) => b.total - a.total);
        bucket.salesDetails = details;
        map.set(date, bucket);
      }

      // orden cronológico descendente (día más reciente primero)
      const list = Array.from(map.values()).sort((a,b) => (a.date < b.date ? 1 : -1));
      setData(list);
    } catch (e:any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo cargar la actividad'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [rangeDates]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Actividad: entradas / salidas y ventas</Text>
      <View style={styles.chips}>
        {(['hoy','ayer','antier','ult7','ult30'] as QuickRange[]).map(k => (
          <Pressable key={k} onPress={() => setRange(k)} style={[styles.chip, range===k && styles.chipActive]}>
            <Text style={[styles.chipText, range===k && styles.chipTextActive]}>
              {k==='hoy'?'Hoy':k==='ayer'?'Ayer':k==='antier'?'Antier':k==='ult7'?'Últimos 7d':'Últimos 30d'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderDay = ({ item }: { item: DayBucket }) => {
    const totalMovs = item.inCount + item.outCount;

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.dayTitle}>{item.date}</Text>
          <Text style={styles.dayMeta}>
            {totalMovs} movs • {item.outQty > 0 ? `- ${item.outQty}` : ''}{item.inQty > 0 ? `${item.outQty>0?' / ':''}+ ${item.inQty}` : ''}
          </Text>
        </View>

        <View style={{ marginTop: 8, gap: 8 }}>
          {/* Ventas resumen del día */}
          <View style={[styles.line, { borderLeftColor: BRAND.purple }]}>
            <Text style={[F, { color: BRAND.slate700, flex: 1 }]}>Ventas</Text>
            <Text style={[F, { color: BRAND.slate900, fontWeight: '700' as const }]}>{moneyNI(item.salesTotal)} ({item.salesCount})</Text>
          </View>

          {/* Detalles de ventas por factura: qué y a quién */}
          {item.salesDetails?.length > 0 && (
            <View style={{ gap: 6, marginTop: 2 }}>
              {item.salesDetails.slice(0, 6).map((det, idx) => {
                const itemsTxt = det.items.slice(0, 3).map(i => `${i.qty}× ${i.name}`).join(', ');
                const more = det.items.length > 3 ? `, +${det.items.length - 3} ítem(s)` : '';
                return (
                  <View key={`${det.invoice}-${idx}`} style={[styles.saleDetailRow]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[F, { color: BRAND.slate900 }]}>
                        #{det.invoice} · {det.customer || 'Cliente'}
                      </Text>
                      {!!itemsTxt && (
                        <Text numberOfLines={1} style={[F, { color: BRAND.slate500, fontSize: 12 }]}>
                          {itemsTxt}{more}
                        </Text>
                      )}
                    </View>
                    <Text style={[F, { color: BRAND.slate900, fontWeight: '700' as const }]}>{moneyNI(det.total)}</Text>
                  </View>
                );
              })}
              {item.salesDetails.length > 6 && (
                <Text style={[F, { color: BRAND.slate500, fontSize: 12 }]}>
                  y {item.salesDetails.length - 6} factura(s) más…
                </Text>
              )}
            </View>
          )}

          {/* Salidas de inventario */}
          {item.outQty !== 0 && (
            <View style={[styles.line, { borderLeftColor: BRAND.red }]}>
              <Text style={[F, { color: BRAND.slate700, flex: 1 }]}>Salidas inventario</Text>
              <Text style={[F, { color: BRAND.slate900, fontWeight: '700' as const }]}>−{item.outQty}</Text>
            </View>
          )}

          {/* Entradas (compras/ajustes) */}
          {item.inQty !== 0 && (
            <View style={[styles.line, { borderLeftColor: BRAND.green }]}>
              <Text style={[F, { color: BRAND.slate700, flex: 1 }]}>Entradas/ajustes</Text>
              <Text style={[F, { color: BRAND.slate900, fontWeight: '700' as const }]}>+{item.inQty}</Text>
            </View>
          )}
        </View>

        {/* Acciones rápidas del día */}
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Pressable onPress={() => navigation.navigate('SaleCreate')} style={[styles.smallBtn, { backgroundColor: BRAND.primary }]}><Text style={styles.smallBtnTextAlt}>Nueva venta</Text></Pressable>
          <Pressable onPress={() => navigation.navigate('PurchaseCreate')} style={[styles.smallBtn, { backgroundColor: BRAND.green }]}><Text style={styles.smallBtnTextAlt}>Registrar compra</Text></Pressable>
          <Pressable onPress={() => navigation.navigate('ProductsList')} style={[styles.smallBtn, { backgroundColor: BRAND.slate700 }]}><Text style={styles.smallBtnTextAlt}>Ver productos</Text></Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex:1, backgroundColor: BRAND.bg }}>
      {header}
      {loading ? (
        <View style={{ padding: 16 }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(d) => d.date}
          renderItem={renderDay}
          contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 12 }}
          ListEmptyComponent={<Text style={[F, { color: BRAND.slate500, textAlign: 'center', marginTop: 20 }]}>Sin actividad en el rango.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, backgroundColor: BRAND.surface, borderBottomColor: BRAND.border, borderBottomWidth: 1 },
  title: { ...F, color: BRAND.slate900, fontSize: 18 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: BRAND.border },
  chipActive: { backgroundColor: '#E9EDFF', borderColor: BRAND.primary },
  chipText: { ...F, color: BRAND.slate700 },
  chipTextActive: { ...F, color: BRAND.primary, fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BRAND.border },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTitle: { ...F, color: BRAND.slate900, fontSize: 16, fontWeight: Platform.OS === 'ios' ? '700' : 'bold' },
  dayMeta: { ...F, color: BRAND.slate500 },

  line: { flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fafbff' },

  saleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F7F7FF',
    borderWidth: 1,
    borderColor: '#EAEAFF'
  },

  smallBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  smallBtnTextAlt: { ...F, color: '#fff' },
});
