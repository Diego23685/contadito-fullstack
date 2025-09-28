// src/screens/ReportsScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Platform,
  ActivityIndicator, Alert, Linking, Modal
} from 'react-native';
import { api } from '../api';
import ExcelJS from 'exceljs';

const BRAND = {
  primary:'#2563EB', border:'#E6EBFF', surface:'#fff', bg:'#EEF2FF',
  slate900:'#0F172A', slate700:'#334155', slate500:'#64748B',
  cardShadow:'rgba(37,99,235,0.16)'
};
const F = Platform.select({ ios:{fontFamily:'Apoka', fontWeight:'normal' as const}, default:{fontFamily:'Apoka'} });

const Chip = ({ label, active, onPress }: { label:string; active?:boolean; onPress:()=>void }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[F, { color: active ? '#fff' : BRAND.slate700 }]}>{label}</Text>
  </Pressable>
);

type SourceKey = 'sales'|'purchases'|'inventory'|'products';

type Preset = { key:string; name:string; groupBy:string[]; metrics:string[] };

const SALES_PRESETS: Preset[] = [
  { key:'sales_day',    name:'Ventas por día',          groupBy:['date:day'],              metrics:['count','sum_total'] },
  { key:'sales_month',  name:'Ventas por mes',          groupBy:['date:month'],            metrics:['count','sum_total'] },
  { key:'sales_state',  name:'Facturas por estado',     groupBy:['status'],                metrics:['count','sum_total'] },
  { key:'sales_curr_m', name:'Moneda x mes',            groupBy:['currency','date:month'],metrics:['sum_total'] },
  { key:'sales_client', name:'Ventas por cliente',      groupBy:['customer'],              metrics:['count','sum_total'] },
  { key:'sales_product',name:'Top productos (cant.)',   groupBy:['product'],               metrics:['sum_qty','count'] },
];
const PURCHASE_PRESETS: Preset[] = [
  { key:'purch_day',   name:'Compras por día',   groupBy:['date:day'],   metrics:['count','sum_total'] },
  { key:'purch_month', name:'Compras por mes',   groupBy:['date:month'], metrics:['count','sum_total'] },
  { key:'purch_state', name:'Compras por estado',groupBy:['status'],     metrics:['count','sum_total'] },
];
const INVENTORY_PRESETS: Preset[] = [
  { key:'inv_day',   name:'Movimientos por día', groupBy:['date:day'],   metrics:['count','sum_qty'] },
  { key:'inv_prod',  name:'Stock por producto',  groupBy:['product_id'], metrics:['count','sum_qty'] },
];
const PRODUCT_PRESETS: Preset[] = [
  { key:'prod_basic', name:'Productos (conteo)', groupBy:[], metrics:['count'] },
];

function presetsFor(source: SourceKey): Preset[] {
  switch (source) {
    case 'sales': return SALES_PRESETS;
    case 'purchases': return PURCHASE_PRESETS;
    case 'inventory': return INVENTORY_PRESETS;
    default: return PRODUCT_PRESETS;
  }
}

const ymd = (d: Date) => {
  const z = (n: number) => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
};

export default function ReportsScreen() {
  const [pymeName, setPymeName] = useState('Mi Pyme');
  const [source, setSource] = useState<SourceKey>('sales');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [groupBy, setGroupBy] = useState<string[]>(['date:month']);
  const [metrics, setMetrics] = useState<string[]>(['count','sum_total']);
  const [filters, setFilters] = useState<{[k:string]:string}>({ status:'', currency:'' });

  const [selectedPreset, setSelectedPreset] = useState<string>('sales_month');
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [exporting, setExporting] = useState(false);

  // opciones avanzadas (solo si se abre el acordeón)
  const gbOptions = useMemo(() => {
    switch (source) {
      case 'sales': return ['date:day','date:month','status','currency','invoice','customer','product'];
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

  // ===== UX helpers
  const applyPreset = (p: Preset) => {
    setSelectedPreset(p.key);
    setGroupBy(p.groupBy);
    setMetrics(p.metrics);
    setShowAdvanced(false);
  };

  const applyQuickRange = (key: 'today'|'7'|'month'|'lastmonth'|'ytd') => {
    const now = new Date();
    if (key === 'today') {
      const d = new Date();
      setDateFrom(ymd(d)); setDateTo(ymd(d));
    } else if (key === '7') {
      const from = new Date(now); from.setDate(now.getDate()-6);
      setDateFrom(ymd(from)); setDateTo(ymd(now));
    } else if (key === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(ymd(first)); setDateTo(ymd(now));
    } else if (key === 'lastmonth') {
      const first = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const last  = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(ymd(first)); setDateTo(ymd(last));
    } else {
      const firstJan = new Date(now.getFullYear(), 0, 1);
      setDateFrom(ymd(firstJan)); setDateTo(ymd(now));
    }
  };

  const toggle = (arr:string[], v:string, setArr:(x:string[])=>void) => {
    setArr(arr.includes(v) ? arr.filter(x=>x!==v) : [...arr, v]);
  };

  const clearResults = () => { setColumns([]); setRows([]); setErr(null); };

  // ===== API
  const run = async () => {
    setLoading(true); setErr(null);
    try {
      const body:any = { source, groupBy, metrics };
      if (dateFrom) body.from = dateFrom;
      if (dateTo)   body.to   = dateTo;
      if (filters.status)   body.status   = filters.status;
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

  // ===== Excel helpers (idénticos a tu versión anterior: sanitización, anchos, estilos, etc.)
  const excelSafe = (val:any):string|number => {
    if (val===null||val===undefined) return ''; if (typeof val==='number') return isFinite(val)?val:0;
    let s=String(val); s=s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,' '); if(s.length>32000) s=s.slice(0,32000); return s;
  };
  const colLetter = (n:number)=>{let s=''; while(n>0){const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26);} return s;};
  const borderBlackThin = {top:{style:'thin',color:{argb:'FF000000'}},left:{style:'thin',color:{argb:'FF000000'}},bottom:{style:'thin',color:{argb:'FF000000'}},right:{style:'thin',color:{argb:'FF000000'}}} as const;
  const borderBlackMedium= {top:{style:'medium',color:{argb:'FF000000'}},left:{style:'medium',color:{argb:'FF000000'}},bottom:{style:'medium',color:{argb:'FF000000'}},right:{style:'medium',color:{argb:'FF000000'}}} as const;
  const numFmtFor = (h:string)=>{const k=h.toLowerCase(); if(k.includes('count')||k.includes('qty')) return '#,##0'; if(k.includes('subtotal')||k.includes('discount')||k.includes('tax')||k.includes('total')) return '#,##0.00'; return undefined;};
  const toBase64 = (buffer:ArrayBuffer)=>{ const bytes=new Uint8Array(buffer); let binary=''; const chunk=0x8000; for(let i=0;i<bytes.byteLength;i+=chunk){ binary+=String.fromCharCode.apply(null, Array.from(bytes.subarray(i,i+chunk)) as any); } const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='; let output=''; let idx=0; while(idx<binary.length){ const c1=binary.charCodeAt(idx++); const c2=binary.charCodeAt(idx++); const c3=binary.charCodeAt(idx++); const e1=c1>>2; const e2=((c1&3)<<4)|(c2>>4); const e3=isNaN(c2)?64:(((c2&15)<<2)|(c3>>6)); const e4=isNaN(c2)?64:(isNaN(c3)?64:(c3&63)); output+=chars.charAt(e1)+chars.charAt(e2)+chars.charAt(e3)+chars.charAt(e4);} return output; };

  const buildPrettyWorkbook = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = (excelSafe(pymeName) as string) || 'Contadito';
    wb.created = new Date();

    const ws = wb.addWorksheet('Reporte', {
      pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:0.4,right:0.4,top:0.4,bottom:0.4}},
      views:[{ state:'frozen', ySplit:10, xSplit:0 }],
    });

    const now = new Date();
    const meta = [
      ['Reporte de', excelSafe(pymeName || 'Mi Pyme')],
      ['Generado',  excelSafe(now.toLocaleString())],
      ['Fuente',     excelSafe(source)],
      ['Rango',      excelSafe(`${dateFrom || '—'} a ${dateTo || '—'}`)],
      ['Plantilla',  excelSafe(presetsFor(source).find(p=>p.key===selectedPreset)?.name || '-')],
      ['Agrupar por',excelSafe(groupBy.join(', ') || '(ninguno)')],
      ['Métricas',   excelSafe(metrics.join(', ') || '(predeterminado)')],
      ['Filtros',    excelSafe(`status=${filters.status||'-'}, currency=${filters.currency||'-'}`)],
    ] as const;

    const totalCols = Math.max(columns.length, 2);
    const titleRowIndex = 1;
    const firstMetaRow = 2;
    const headerRowIndex = 10;

    ws.mergeCells(titleRowIndex,1,titleRowIndex,totalCols);
    const titleCell = ws.getCell(titleRowIndex,1);
    titleCell.value = `Reporte de ${excelSafe(pymeName || 'Mi Pyme')}`;
    titleCell.font = { bold:true, size:14, color:{argb:'FF1D4ED8'} };
    titleCell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
    titleCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFDBEAFE'} };
    titleCell.border = borderBlackMedium;

    meta.forEach((pair,i)=>{
      const r = firstMetaRow+i;
      const k = ws.getCell(r,1);
      ws.mergeCells(r,2,r,totalCols);
      const v = ws.getCell(r,2);
      k.value = pair[0]; k.font={bold:true,color:{argb:'FF334155'}}; k.alignment={horizontal:'left',vertical:'middle',indent:1,wrapText:true};
      k.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF8FAFF'} };
      v.value = pair[1]; v.font={italic:true,color:{argb:'FF64748B'}}; v.alignment={horizontal:'left',vertical:'middle',indent:1,wrapText:true};
      for (let c=1;c<=totalCols;c++) ws.getCell(r,c).border = borderBlackThin;
    });

    const headerRow = ws.getRow(headerRowIndex);
    columns.forEach((h,i)=>{
      const cell = headerRow.getCell(i+1);
      cell.value = excelSafe(h);
      cell.font = { bold:true, color:{argb:'FF0F172A'} };
      cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF1F5FF'} };
      cell.border = borderBlackMedium;
    });

    if (columns.length) {
      ws.autoFilter = `A${headerRowIndex}:${colLetter(columns.length)}${headerRowIndex}`;
    }

    const startDataRow = headerRowIndex + 1;
    rows.forEach((r, ridx)=>{
      const row = ws.getRow(startDataRow+ridx);
      r.forEach((val, cidx)=>{
        const cell = row.getCell(cidx+1);
        const header = columns[cidx] || '';
        const isNumber = typeof val === 'number';
        cell.value = isNumber ? (isFinite(val)?val:0) : excelSafe(val);
        cell.alignment = { vertical:'middle', horizontal:'center', wrapText:true };
        cell.border = borderBlackThin;
        const fmt = numFmtFor(header); if (isNumber && fmt) cell.numFmt = fmt;
      });
    });

    const maxLen = (txt:any)=>String(txt ?? '').length;
    const widths = columns.map((h,i)=>{
      const maxData = Math.max(...rows.map(r=>maxLen(r[i])), maxLen(h), 6);
      return Math.min(70, Math.max(16, maxData+6));
    });
    widths.forEach((w,i)=>ws.getColumn(i+1).width = w);

    const lastDataRow = startDataRow + Math.max(rows.length-1,0);
    const footerIndex = lastDataRow + 2;
    ws.mergeCells(footerIndex,1,footerIndex,Math.max(1,columns.length));
    const footer = ws.getCell(footerIndex,1);
    footer.value = 'Reporte generado por Contadito by PapuThink';
    footer.font = { italic:true, color:{argb:'FF64748B'} };
    footer.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
    footer.border = borderBlackThin;

    return wb;
  };

  const exportExcel = async () => {
    if (!columns.length) { Alert.alert('Exportar','No hay datos para exportar. Ejecuta un reporte primero.'); return; }
    setExporting(true);
    try {
      const wb = await buildPrettyWorkbook();
      const buf = await wb.xlsx.writeBuffer();
      const range = `${dateFrom || 'desde'}_${dateTo || 'hasta'}`.replace(/[^0-9A-Za-z_-]/g,'');
      const fname = `reporte_${source}_${range || 'hoy'}.xlsx`;
      const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (Platform.OS === 'web') {
        // @ts-ignore
        const blob = new Blob([buf], { type: mime });
        // @ts-ignore
        const url = URL.createObjectURL(blob);
        // @ts-ignore
        const a = document.createElement('a');
        // @ts-ignore
        a.href = url; a.download = fname; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        // @ts-ignore
        URL.revokeObjectURL(url);
      } else {
        const b64 = toBase64(buf);
        const dataUrl = `data:${mime};base64,${b64}`;
        const supported = await Linking.canOpenURL(dataUrl);
        if (supported) await Linking.openURL(dataUrl);
        else Alert.alert('Exportar','No se pudo abrir el archivo. Exporta desde web o agrega /reports/export.');
      }
    } catch (e:any) {
      Alert.alert('Exportar', String(e?.message || e));
    } finally {
      setExporting(false);
    }
  };

  // ===== Column widths para la tabla (alineación perfecta)
  const colWidths = useMemo(()=>{
    if (!columns.length) return [] as number[];
    const charW=8, pad=24, min=120, max=360;
    return columns.map((h,i)=>{
      const maxChars = Math.max(String(h??'').length, ...rows.map(r=>String(r?.[i]??'').length), 6);
      const px = maxChars*charW + pad;
      return Math.max(min, Math.min(max, px));
    });
  }, [columns, rows]);

  const PRESETS = presetsFor(source);
  const currentPreset = PRESETS.find(p=>p.key===selectedPreset) || PRESETS[0];

  return (
    <View style={{ flex:1, backgroundColor: BRAND.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Reportes personalizados</Text>
        <Text style={styles.sub}>Usa una plantilla y ajusta si hace falta. 💡</Text>

        {/* Encabezado */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Encabezado</Text>
          <View style={[styles.row, { gap:8, flexWrap:'wrap' }]}>
            <View style={{ minWidth: 260, flex:1 }}>
              <Text style={styles.label}>Nombre de la Pyme (para el Excel)</Text>
              <TextInput value={pymeName} onChangeText={setPymeName} placeholder="Mi Pyme" style={styles.input}/>
            </View>
          </View>
        </View>

        {/* Config rápida */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Config rápida</Text>

          {/* Fuente + Plantilla */}
          <View style={{ flexDirection:'row', gap:10, flexWrap:'wrap' }}>
            <View style={{ minWidth: 180 }}>
              <Text style={styles.label}>Fuente</Text>
              <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
                {(['sales','purchases','inventory','products'] as const).map(s => (
                  <Chip
                    key={s}
                    label={s}
                    active={source===s}
                    onPress={()=>{
                      setSource(s);
                      const p = presetsFor(s)[0];
                      applyPreset(p);
                      clearResults();
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={{ minWidth: 240, flex:1 }}>
              <Text style={styles.label}>Plantilla</Text>
              <Pressable onPress={()=>setShowPresetPicker(true)} style={styles.selectBox}>
                <Text style={[F, { color: BRAND.slate900 }]} numberOfLines={1}>
                  {currentPreset?.name}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Rangos rápidos */}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Rango rápido</Text>
            <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
              <Chip label="Hoy" onPress={()=>applyQuickRange('today')}/>
              <Chip label="7 días" onPress={()=>applyQuickRange('7')}/>
              <Chip label="Este mes" onPress={()=>applyQuickRange('month')}/>
              <Chip label="Mes pasado" onPress={()=>applyQuickRange('lastmonth')}/>
              <Chip label="YTD" onPress={()=>applyQuickRange('ytd')}/>
            </View>
          </View>

          {/* Fechas y filtros mínimos */}
          <View style={[styles.row, { marginTop: 8, gap: 8, flexWrap:'wrap' }]}>
            <View style={{ width: 170 }}>
              <Text style={styles.label}>Desde (YYYY-MM-DD)</Text>
              <TextInput value={dateFrom} onChangeText={setDateFrom} placeholder="2025-01-01" style={styles.input}/>
            </View>
            <View style={{ width: 170 }}>
              <Text style={styles.label}>Hasta (YYYY-MM-DD)</Text>
              <TextInput value={dateTo} onChangeText={setDateTo} placeholder="2025-01-31" style={styles.input}/>
            </View>
            {source==='sales' && (
              <>
                <View style={{ width: 160 }}>
                  <Text style={styles.label}>Status</Text>
                  <TextInput value={filters.status} onChangeText={t=>setFilters(f=>({...f,status:t}))}
                    placeholder="issued/paid/..." style={styles.input}/>
                </View>
                <View style={{ width: 140 }}>
                  <Text style={styles.label}>Moneda</Text>
                  <TextInput value={filters.currency} onChangeText={t=>setFilters(f=>({...f,currency:t}))}
                    placeholder="NIO/USD" style={styles.input}/>
                </View>
              </>
            )}
          </View>

          {/* Acciones */}
          <View style={{ marginTop: 12, flexDirection:'row', gap:8, flexWrap:'wrap' }}>
            <Pressable onPress={run} style={[styles.btn, styles.btnBlue]}><Text style={styles.btnText}>Ejecutar</Text></Pressable>
            <Pressable onPress={clearResults} style={[styles.btn, styles.btnGrey]}><Text style={styles.btnText}>Limpiar</Text></Pressable>
            {loading && <ActivityIndicator/>}
            {!!err && <Text style={[F, { color:'#b91c1c' }]}>{err}</Text>}
          </View>

          {/* Avanzado */}
          <Pressable onPress={()=>setShowAdvanced(v=>!v)} style={{ marginTop: 10 }}>
            <Text style={[F, { color: BRAND.primary }]}>
              {showAdvanced ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
            </Text>
          </Pressable>

          {showAdvanced && (
            <View style={{ marginTop: 10, gap:12 }}>
              <View>
                <Text style={styles.label}>Agrupar por</Text>
                <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
                  {gbOptions.map(g=>(
                    <Chip key={g} label={g} active={groupBy.includes(g)} onPress={()=>toggle(groupBy,g,setGroupBy)} />
                  ))}
                </View>
              </View>
              <View>
                <Text style={styles.label}>Métricas</Text>
                <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
                  {mOptions.map(m=>(
                    <Chip key={m} label={m} active={metrics.includes(m)} onPress={()=>toggle(metrics,m,setMetrics)} />
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Resultados */}
        {!!columns.length && (
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>Resultado</Text>

            <ScrollView horizontal>
              <View>
                {/* header */}
                <View style={[styles.trHeader]}>
                  {columns.map((c, idx) => (
                    <View key={`h-${idx}`} style={[styles.cellHeader, { width: colWidths[idx] }]}>
                      <Text style={styles.th} numberOfLines={1}>{c}</Text>
                    </View>
                  ))}
                </View>
                {/* rows */}
                {rows.map((r, ridx) => (
                  <View key={`r-${ridx}`} style={[styles.tr, ridx % 2 ? styles.trAlt : null]}>
                    {r.map((cell, cidx) => (
                      <View key={`c-${ridx}-${cidx}`} style={[styles.cell, { width: colWidths[cidx] }]}>
                        <Text style={styles.td} numberOfLines={1}>
                          {typeof cell === 'number' ? cell.toLocaleString() : String(cell ?? '')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={{ marginTop: 12, flexDirection:'row', gap:8 }}>
              <Pressable onPress={exportExcel} style={[styles.btn, styles.btnBlue]}>
                <Text style={styles.btnText}>{exporting ? 'Exportando…' : 'Exportar a Excel (.xlsx)'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ height: 24 }}/>
      </ScrollView>

      {/* Modal de plantillas */}
      <Modal visible={showPresetPicker} transparent animationType="fade" onRequestClose={()=>setShowPresetPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={()=>setShowPresetPicker(false)}>
          <View style={styles.modalSheet}>
            <Text style={[styles.cardTitle, { marginBottom: 8 }]}>Elegí una plantilla</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {PRESETS.map(p => (
                <Pressable
                  key={p.key}
                  onPress={() => { applyPreset(p); setShowPresetPicker(false); }}
                  style={[styles.presetItem, selectedPreset===p.key && styles.presetActive]}
                >
                  <Text style={[F, { color: BRAND.slate900 }]}>{p.name}</Text>
                  <Text style={[F, { color: BRAND.slate500, fontSize: 12 }]}>
                    {`GroupBy: ${p.groupBy.join(', ') || '(ninguno)'} · Métricas: ${p.metrics.join(', ')}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...F, fontSize: 22, color: '#1D4ED8' },
  sub:   { ...F, color: BRAND.slate500 },

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
  btnGrey: { backgroundColor:'#64748B' },
  btnBlue: { backgroundColor: BRAND.primary },
  btnText: { ...F, color:'#fff' },

  // Tabla
  trHeader: { flexDirection:'row', backgroundColor:'#F7F9FF', borderTopWidth:1, borderBottomWidth:1, borderColor:BRAND.border },
  tr: { flexDirection:'row', borderBottomWidth:1, borderColor:BRAND.border },
  trAlt: { backgroundColor:'#FAFBFF' },
  cellHeader: { paddingVertical:10, paddingHorizontal:8, borderRightWidth:1, borderColor:BRAND.border, alignItems:'center', justifyContent:'center' },
  cell: { paddingVertical:10, paddingHorizontal:8, borderRightWidth:1, borderColor:BRAND.border, alignItems:'center', justifyContent:'center' },
  th: { ...F, color: BRAND.slate700, fontWeight:'700', textAlign:'center' },
  td: { ...F, color: BRAND.slate900, textAlign:'center' },

  // Modal presets
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', padding:16 },
  modalSheet: { backgroundColor:'#fff', borderRadius:12, padding:12 },
  presetItem: { paddingVertical:10, borderBottomWidth:1, borderBottomColor:BRAND.border },
  presetActive: { backgroundColor:'#F1F5FF' },

  // Select visual
  selectBox: { borderWidth:1, borderColor:BRAND.border, borderRadius:10, paddingHorizontal:10, minHeight:42, justifyContent:'center', backgroundColor:'#fff' },
});
