import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Platform, ActivityIndicator } from 'react-native';
import { api } from '../api';

const BRAND = { primary:'#2563EB', border:'#E6EBFF', surface:'#fff', bg:'#EEF2FF', slate900:'#0F172A', slate700:'#334155', slate500:'#64748B', cardShadow:'rgba(37,99,235,0.16)' };
const F = Platform.select({ ios:{ fontFamily:'Apoka', fontWeight:'normal' as const }, default:{ fontFamily:'Apoka' } });

const Chip = ({ label, active, onPress }: { label: string; active?: boolean; onPress: ()=>void }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[F, { color: active ? '#fff' : BRAND.slate700 }]}>{label}</Text>
  </Pressable>
);

export default function ReportsScreen() {
  const [source, setSource] = useState<'sales'|'purchases'|'inventory'|'products'>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState<string[]>(['date:month']);
  const [metrics, setMetrics] = useState<string[]>(['count', 'sum_total']);
  const [filters, setFilters] = useState<{[k:string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [err, setErr] = useState<string|null>(null);

  const gbOptions = useMemo(() => {
    switch (source) {
      case 'sales':
        // 👇 Nuevas dimensiones: invoice, customer, product
        return ['date:day','date:month','status','currency','invoice','customer','product'];
      case 'purchases': return ['date:day','date:month','status','currency'];
      case 'inventory': return ['date:day','date:month','movement_type','warehouse_id','product_id'];
      default: return ['is_service','track_stock'];
    }
  }, [source]);

  const mOptions = useMemo(() => {
    switch (source) {
      case 'sales': return ['count','sum_qty','sum_subtotal','sum_discount','sum_tax','sum_total'];
      case 'purchases': return ['count','sum_subtotal','sum_discount','sum_tax','sum_total'];
      case 'inventory': return ['count','sum_qty','sum_amount'];
      default: return ['count','avg_list_price','avg_std_cost'];
    }
  }, [source]);

  const toggle = (arr: string[], v: string, setArr: (x:string[])=>void) => {
    setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  const run = async () => {
    setLoading(true); setErr(null);
    try {
      const body: any = { source, groupBy, metrics };

      // Fechas: el backend acepta from/to o dateFrom/dateTo
      if (dateFrom) body.from = dateFrom;
      if (dateTo)   body.to   = dateTo;

      // Filtros: plano y/o via Filters (el backend soporta ambos)
      if (filters.status)  body.status  = filters.status;
      if (filters.currency) body.currency = filters.currency;

      const { data } = await api.post('/reports/run', body);
      setColumns(data.columns || []);
      setRows(data.rows || []);
    } catch (e:any) {
      setErr(String(e?.response?.data || e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex:1, backgroundColor: BRAND.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Reportes personalizados</Text>
        <Text style={styles.sub}>Arma tu reporte por fuente, agrupaciones y métricas.</Text>

        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Fuente</Text>
          <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
            {(['sales','purchases','inventory','products'] as const).map(s => (
              <Chip
                key={s}
                label={s}
                active={source===s}
                onPress={()=>{
                  setSource(s);
                  setGroupBy(s === 'sales' ? ['date:month'] : ['date:month']);
                  setMetrics(s === 'sales' ? ['count','sum_total'] : ['count','sum_total']);
                  setColumns([]); setRows([]);
                }}
              />
            ))}
          </View>

          <View style={[styles.row, { marginTop: 8, gap: 8, flexWrap:'wrap' }]}>
            <View style={{ width: 180 }}>
              <Text style={styles.label}>Desde (YYYY-MM-DD)</Text>
              <TextInput value={dateFrom} onChangeText={setDateFrom} placeholder="2025-01-01" style={styles.input}/>
            </View>
            <View style={{ width: 180 }}>
              <Text style={styles.label}>Hasta (YYYY-MM-DD)</Text>
              <TextInput value={dateTo} onChangeText={setDateTo} placeholder="2025-01-31" style={styles.input}/>
            </View>
          </View>

          {(source === 'sales') && (
            <View style={{ marginTop: 8, gap:8 }}>
              <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
                <View style={{ width: 180 }}>
                  <Text style={styles.label}>Filtro status</Text>
                  <TextInput
                    value={filters.status || ''}
                    onChangeText={t=>setFilters(f=>({ ...f, status: t }))}
                    placeholder="issued/paid/..."
                    style={styles.input}
                  />
                </View>
                <View style={{ width: 180 }}>
                  <Text style={styles.label}>Filtro moneda</Text>
                  <TextInput
                    value={filters.currency || ''}
                    onChangeText={t=>setFilters(f=>({ ...f, currency: t }))}
                    placeholder="NIO/USD"
                    style={styles.input}
                  />
                </View>
              </View>
            </View>
          )}

          <Text style={[styles.cardTitle, { marginTop: 10 }]}>Agrupar por</Text>
          <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
            {gbOptions.map(g => (
              <Chip key={g} label={g} active={groupBy.includes(g)} onPress={()=>toggle(groupBy, g, setGroupBy)} />
            ))}
          </View>

          <Text style={[styles.cardTitle, { marginTop: 10 }]}>Métricas</Text>
          <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
            {mOptions.map(m => (
              <Chip key={m} label={m} active={metrics.includes(m)} onPress={()=>toggle(metrics, m, setMetrics)} />
            ))}
          </View>

          <View style={{ marginTop: 12, flexDirection:'row', gap:8, flexWrap:'wrap' }}>
            <Pressable onPress={run} style={[styles.btn, styles.btnBlue]}><Text style={styles.btnText}>Ejecutar</Text></Pressable>
            {loading && <ActivityIndicator/>}
            {!!err && <Text style={[F, { color:'#b91c1c' }]}>{err}</Text>}
          </View>
        </View>

        {/* Tabla */}
        {!!columns.length && (
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>Resultado</Text>
            <ScrollView horizontal>
              <View>
                {/* header */}
                <View style={[styles.tr, { backgroundColor:'#F7F9FF' }]}>
                  {columns.map((c, idx) => (
                    <Text key={`h-${idx}`} style={[styles.th]} numberOfLines={1}>{c}</Text>
                  ))}
                </View>
                {/* rows */}
                {rows.map((r, ridx) => (
                  <View key={`r-${ridx}`} style={styles.tr}>
                    {r.map((cell, cidx) => (
                      <Text key={`c-${ridx}-${cidx}`} style={styles.td} numberOfLines={1}>
                        {typeof cell === 'number' ? cell.toLocaleString() : String(cell ?? '')}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={{ height: 24 }}/>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...F, fontSize: 22, color: '#1D4ED8' },
  sub: { ...F, color: BRAND.slate500 },

  card: {
    backgroundColor: BRAND.surface, borderRadius: 16, padding: 12,
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }, elevation: 2,
  },
  cardTitle: { ...F, color: BRAND.slate900, fontSize: 16, marginBottom: 8 },

  row: { flexDirection:'row', alignItems:'center' },
  label: { ...F, color: BRAND.slate700, marginBottom: 4 },
  input: { ...F, borderWidth:1, borderColor:BRAND.border, borderRadius:10, paddingHorizontal:10, minHeight:42, backgroundColor:'#fff' },

  chip: { paddingHorizontal:10, paddingVertical:8, borderRadius:999, backgroundColor:'#f3f4f6', borderWidth:1, borderColor:BRAND.border },
  chipActive: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },

  btn: { paddingHorizontal:12, paddingVertical:10, borderRadius:12, backgroundColor:BRAND.primary },
  btnText: { ...F, color:'#fff' },

  tr: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:BRAND.border },
  th: { ...F, minWidth:140, padding:8, color:BRAND.slate700, fontWeight:'700' },
  td: { ...F, minWidth:140, padding:8, color:BRAND.slate900 },
});
