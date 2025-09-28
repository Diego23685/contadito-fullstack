// src/screens/ProfitCompetitivenessScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-gifted-charts';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { api } from '../../api';

const OLLAMA_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:11434' : 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen2.5:3b-instruct';

const BRAND = {
  primary:'#2563EB', border:'#E6EBFF', surface:'#fff', bg:'#EEF2FF',
  slate900:'#0F172A', slate700:'#334155', slate500:'#64748B',
  cardShadow:'rgba(37,99,235,0.16)', purple:'#7C3AED', green:'#10B981',
};
const F = Platform.select({ ios:{fontFamily:'Apoka', fontWeight:'normal' as const}, default:{fontFamily:'Apoka'} });

type Props = { navigation: any };
type CatalogRow = { id: number; sku?: string; name: string; std_cost?: number|null; list_price?: number|null };
type ProfitRow = {
  key: string; name: string; sku?: string;
  qty: number; revenue: number; unitCost?: number|null; estCostUsed: 'catalog'|'fallback'|'unknown';
  costTotal: number; margin: number; marginPct: number;
  myPrice?: number|null; competitorPrice?: number|null; priceGapPct?: number|null;
};

function money(n:number){ try{ return new Intl.NumberFormat('es-NI',{style:'currency',currency:'NIO'}).format(n);}catch{return `C$ ${n.toFixed(2)}`;} }
const chunk = <T,>(arr: T[], size: number) => { const out: T[][] = []; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; };

// ==== normalizador números (quita moneda/comas) ====
const toNum = (v:any): number => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  s = s.replace(/[^\d,.\-]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot   = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g,'').replace(',', '.');
    else s = s.replace(/,/g,'');
  } else if (lastComma > -1) {
    s = s.replace(/\./g,'').replace(',', '.');
  } else {
    s = s.replace(/,/g,'');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// ===== Helpers para mapear columnas/keys =====
const pickKey = (obj:any, regexes:RegExp[])=>{
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = Object.keys(obj);
  for (const re of regexes) {
    const k = keys.find(k => re.test(k));
    if (k) return obj[k];
  }
  return undefined;
};
const getField = (row:any, cols:string[], reArr:RegExp[], reObj:RegExp[])=>{
  if (Array.isArray(row)) {
    const i = cols?.findIndex(c => reArr.some(re=>re.test(c))) ?? -1;
    return i>=0 ? row[i] : undefined;
  }
  return pickKey(row, reObj)
      ?? (row.product && pickKey(row.product, reObj))
      ?? (row.metrics && pickKey(row.metrics, reObj));
};
const getNumber = (row:any, cols:string[], reArr:RegExp[], reObj:RegExp[])=>{
  const v = getField(row, cols, reArr, reObj);
  return toNum(v);
};
// Regex (incluye snake + camel)
const RE_ID_A   = [/(\bproduct\.?id\b|\bid\b)/i, /\bproductid\b/i, /product.?id/i];
const RE_SKU_A  = [/(\bproduct\.?sku\b|\bsku\b)/i,  /\bproductsku\b/i, /product.?sku/i];
const RE_NAME_A = [/(\bproduct\.?name\b|\bname\b)/i, /\bproductname\b/i, /product.?name/i];
const RE_ID_O   = [/(^|product[._])id$/i, /^id$/i, /productid$/i, /product.?id$/i];
const RE_SKU_O  = [/(^|product[._])sku$/i, /^sku$/i, /productsku$/i, /product.?sku$/i];
const RE_NAME_O = [/(^|product[._])name$/i, /^name$/i, /productname$/i, /product.?name$/i];
// qty / total
const RE_QTY_A  = [/\bsum[_ ]?qty\b/i, /\bsumqty\b/i, /\btotal[_ ]?qty\b/i, /\bqty[_ ]?sold\b/i, /\bqty\b/i, /\bquantity\b/i, /units?_sold?/i, /\bunits?\b/i];
const RE_QTY_O  = [/sum[_ ]?qty/i, /sumqty/i, /total[_ ]?qty/i, /qty[_ ]?sold/i, /^qty$/i, /quantity/i, /units?_sold?/i, /^units?$/i];
const RE_TOT_A  = [/\bsum[_ ]?(total|amount|revenue)\b/i, /\bsumtotal\b/i, /\btotal[_ ]?amount\b/i, /\bsubtotal\b/i, /\bnet[_ ]?total\b/i, /\bgross\b/i, /\brevenue\b/i, /\bsales\b/i, /\btotal\b/i, /\bamount\b/i];
const RE_TOT_O  = [/sum[_ ]?(total|amount|revenue)/i, /sumtotal/i, /total[_ ]?amount/i, /subtotal/i, /net[_ ]?total/i, /gross/i, /revenue/i, /sales/i, /^total$/i, /^amount$/i];

export default function ProfitCompetitivenessScreen({ navigation }: Props) {
  // Filtros
  const [dateFrom,setDateFrom]=useState(''); const [dateTo,setDateTo]=useState('');
  const [fallbackCostPct,setFallbackCostPct]=useState('0.60');
  const [loading,setLoading]=useState(false);
  const [rows,setRows]=useState<ProfitRow[]>([]);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiText,setAiText]=useState<string|undefined>();
  const [compMap,setCompMap]=useState<Record<string,number>>({});
  const [catalogMap,setCatalogMap]=useState<Record<string, CatalogRow>>({});  // sku:/name:/id:
  const [catalogArr,setCatalogArr]=useState<CatalogRow[]>([]);
  const [simulating,setSimulating]=useState(false);
  const [reportMeta,setReportMeta]=useState<{columns:string[]; sample:any}|null>(null);

  const quick = (key:'today'|'7'|'month'|'lastmonth'|'ytd')=>{
    const z=(n:number)=>String(n).padStart(2,'0'); const ymd=(d:Date)=>`${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
    const now=new Date();
    if(key==='today'){ const d=new Date(); setDateFrom(ymd(d)); setDateTo(ymd(d)); }
    else if(key==='7'){ const f=new Date(now); f.setDate(now.getDate()-6); setDateFrom(ymd(f)); setDateTo(ymd(now)); }
    else if(key==='month'){ const f=new Date(now.getFullYear(),now.getMonth(),1); setDateFrom(ymd(f)); setDateTo(ymd(now)); }
    else if(key==='lastmonth'){ const f=new Date(now.getFullYear(),now.getMonth()-1,1); const t=new Date(now.getFullYear(),now.getMonth(),0); setDateFrom(ymd(f)); setDateTo(ymd(t)); }
    else { const f=new Date(now.getFullYear(),0,1); setDateFrom(ymd(f)); setDateTo(ymd(now)); }
  };

  // Cargar catálogo desde /products
  const loadCatalog = useCallback(async ()=>{
    try{
      const { data } = await api.get('/products', { params: { page:1, pageSize: 10000 } });
      const itemsRaw: any[] = data?.items || data || [];
      const items: CatalogRow[] = itemsRaw.map((p:any)=>({
        id: Number(p.id),
        sku: p.sku,
        name: p.name,
        std_cost: p.stdCost!=null ? toNum(p.stdCost) : (p.std_cost!=null ? toNum(p.std_cost) : null),
        list_price: p.listPrice!=null ? toNum(p.listPrice) : (p.list_price!=null ? toNum(p.list_price) : null),
      }));
      const map:Record<string,CatalogRow> = {};
      items.forEach((p)=>{
        const sku = (p.sku||'').trim().toLowerCase();
        const name= (p.name||'').trim().toLowerCase();
        if (sku)  map[`sku:${sku}`]=p;
        if (name) map[`name:${name}`]=p;
        if (p.id!=null) map[`id:${String(p.id)}`]=p;
      });
      setCatalogMap(map);
      setCatalogArr(items);
    }catch(e){ console.warn('loadCatalog', e); }
  },[]);
  useEffect(()=>{ loadCatalog(); },[loadCatalog]);

  // cuando cambia compMap, recalcular competidor y brecha en filas
  useEffect(()=>{
    if (!rows.length) return;
    setRows(prev => prev.map(r=>{
      const kSku  = r.sku ? `sku:${r.sku.toLowerCase()}` : '';
      const kName = `name:${r.name.toLowerCase()}`;
      const comp = (kSku && compMap[kSku] != null) ? compMap[kSku] : compMap[kName];
      const myP = r.myPrice ?? (r.qty>0 ? r.revenue/r.qty : null);
      const gap = (myP!=null && comp!=null && myP>0) ? ((myP - comp)/myP)*100 : null;
      return { ...r, competitorPrice: comp ?? null, priceGapPct: gap };
    }));
  }, [compMap]); // eslint-disable-line

  // Importar competidores (Excel/CSV)
  const importCompetitors = useCallback(async ()=>{
    try{
      const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory:true });
      if (pick.canceled) return;
      const file = pick.assets?.[0]; if (!file?.uri) return;
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const wb = XLSX.read(base64, { type:'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rws = XLSX.utils.sheet_to_json<any>(ws, { defval:'', raw:true });
      const map:Record<string,number> = {};
      rws.forEach((r:any)=>{
        const sku = String(r.sku || r.SKU || r.Sku || '').trim();
        const name= String(r.name||r.product||r.Product||'').trim();
        const price = toNum(r.price ?? r.Price ?? r.precio ?? r.Precio);
        if (!Number.isFinite(price)) return;
        if (sku)  map[`sku:${sku.toLowerCase()}`]=price;
        if (name) map[`name:${name.toLowerCase()}`]=price;
      });
      setCompMap(map);
      Alert.alert('Competidores', `Se cargaron ${Object.keys(map).length} precios.`);
    }catch(e:any){
      Alert.alert('Competidores', String(e?.message || e));
    }
  },[]);

  // Simular competidores (IA)
  const simulateCompetitorsAI = useCallback(async (rowsInput?: ProfitRow[], silent = false)=>{
    const source = rowsInput ?? rows;
    if (!source.length) { if (!silent) Alert.alert('Simulación IA','Primero ejecuta “Calcular”.'); return; }
    try{
      if (!silent) setSimulating(true);
      const batches = chunk(
        source.map(r=>{
          const key = r.sku ? `sku:${r.sku.toLowerCase()}` : `name:${r.name.toLowerCase()}`;
          const myP = r.myPrice ?? (r.qty>0 ? r.revenue/r.qty : null);
          return { key, name: r.name, myPrice: myP };
        }),
        80
      );
      const merged: Record<string,number> = {};
      for (const sample of batches) {
        const system = 'Eres analista de pricing en retail en Nicaragua. Genera precios plausibles de la competencia.';
        const user =
`Para cada producto, estima un precio típico de competidor en córdobas (NIO).
Reglas:
- Usa NIO (números), no strings con moneda.
- Varía entre -20% y +20% del precio propio (premium tiende a +10–20%).
- Si myPrice es null, devuelve 100–1500 NIO según nombre.
- Devuelve SOLO JSON válido:
{"items":[{"key":"sku:abc-123"|"name:camisa básica","price":123.45},...]}

Productos:
${JSON.stringify(sample)}`;
        let map: Record<string,number> | null = null;
        try {
          const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              model: OLLAMA_MODEL, stream:false,
              options:{ temperature:0.2, num_ctx: 2048 },
              messages:[{role:'system',content:system},{role:'user',content:user}]
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          const text: string = data?.message?.content ?? data?.response ?? '';
          const start = text.indexOf('{'); const end = text.lastIndexOf('}');
          const json = JSON.parse(text.slice(start, end+1));
          const arr = Array.isArray(json?.items) ? json.items : [];
          const tmp: Record<string,number> = {};
          arr.forEach((it:any)=>{
            const k = String(it?.key || '').trim().toLowerCase();
            const p = toNum(it?.price);
            if (k && Number.isFinite(p)) tmp[k] = p;
          });
          if (Object.keys(tmp).length) map = tmp;
        } catch {
          const tmp: Record<string,number> = {};
          sample.forEach((s, i)=>{
            const base = Number(s.myPrice ?? 400);
            const pct = ( (i % 14) + 5 ) / 100;
            const sign = (i % 2 === 0) ? -1 : 1;
            tmp[s.key] = Math.max(50, base * (1 + sign * pct));
          });
          map = tmp;
        }
        Object.assign(merged, map || {});
      }
      setCompMap(prev => ({ ...prev, ...merged }));
      if (!silent) Alert.alert('Simulación IA', `Generados ${Object.keys(merged).length} precios de competencia.`);
    } catch(e:any){
      if (!silent) Alert.alert('Simulación IA', String(e?.message || e));
    } finally {
      if (!silent) setSimulating(false);
    }
  },[rows]);

  // Recomendaciones IA
  const analyzeAI = useCallback(async (rowsInput?: ProfitRow[], silent = false)=>{
    const src = rowsInput ?? rows;
    if (!src.length) { if (!silent) Alert.alert('IA','Ejecuta el análisis primero.'); return; }
    try{
      if (!silent) setAiLoading(true);
      setAiText(undefined);
      const topW = [...src].filter(r=>displayMargin(r)>0).sort((a,b)=>displayMargin(b)-displayMargin(a)).slice(0,5)
        .map(r=>({name:r.name, margin:displayMargin(r), marginPct:+displayMarginPct(r).toFixed(1)}));
      const topL = [...src].filter(r=>displayMargin(r)<0).sort((a,b)=>displayMargin(a)-displayMargin(b)).slice(0,5)
        .map(r=>({name:r.name, loss:displayMargin(r), marginPct:+displayMarginPct(r).toFixed(1)}));
      const gaps  = src.filter(r=>r.priceGapPct!=null).slice(0,80)
        .map(r=>({name:r.name, myPrice:r.myPrice, comp:r.competitorPrice, gapPct:+(r.priceGapPct as number).toFixed(1)}));
      const payload = { kpis: summaryKpis(src), winners: topW, losers: topL, priceGaps: gaps };
      const system = 'Eres analista financiero y de pricing para pymes. Da recomendaciones claras y accionables.';
      const user = `Con estos datos JSON, escribe 4–6 acciones concretas (viñetas) y un breve resumen. Español, conciso.\n${JSON.stringify(payload)}`;
      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model: OLLAMA_MODEL, stream:false, options:{temperature:0.2, num_ctx:1024}, messages:[{role:'system',content:system},{role:'user',content:user}] })
      });
      if(!res.ok){ throw new Error(await res.text()); }
      const data = await res.json();
      setAiText(data?.message?.content ?? data?.response ?? 'Sin respuesta');
    }catch(e:any){
      if (!silent) Alert.alert('IA', String(e?.message||e));
    } finally{
      if (!silent) setAiLoading(false);
    }
  },[rows]);

  // ====== Calcular (intenta snake y si no hay filas, intenta camel) ======
  const fetchReport = async (body:any) => {
    const { data } = await api.post('/reports/run', body);
    const cols: string[] = data?.columns ?? [];
    const rowsApi: any[] = (data?.rows ?? data?.items ?? []);
    return { cols, rowsApi };
  };

  const run = useCallback(async ()=>{
    setLoading(true); setAiText(undefined);
    try{
      // 1) intento snake_case
      let body:any = {
        source:'sales',
        groupBy:['product.id','product.sku','product.name'],
        metrics:['sum_qty','sum_total'],
        limit: 100000,
      };
      if(dateFrom) body.from=dateFrom; if(dateTo) body.to=dateTo;

      let { cols, rowsApi } = await fetchReport(body);

      // 2) si vino vacío, intento camelCase
      if (!rowsApi?.length) {
        body = {
          source:'sales',
          groupBy:['productId','productSku','productName'],
          metrics:['sumQty','sumTotal'],
          limit: 100000,
        };
        if(dateFrom) body.from=dateFrom; if(dateTo) body.to=dateTo;
        ({ cols, rowsApi } = await fetchReport(body));
      }

      setReportMeta({ columns: cols, sample: rowsApi?.[0] });

      // construir filas
      const listFromSales: ProfitRow[] = (rowsApi||[]).map((r:any)=>{
        const pid  = getField(r, cols, RE_ID_A,   RE_ID_O);
        const skuR = getField(r, cols, RE_SKU_A,  RE_SKU_O);
        const namR = getField(r, cols, RE_NAME_A, RE_NAME_O);
        const prodId = pid!=null && pid!=='' ? Number(pid) : undefined;
        const sku    = skuR ? String(skuR).trim() : undefined;
        const nameR  = namR ? String(namR).trim() : undefined;

        const qty     = getNumber(r, cols, RE_QTY_A, RE_QTY_O);
        const revenue = getNumber(r, cols, RE_TOT_A, RE_TOT_O);

        const cat = (prodId!=null && catalogMap[`id:${prodId}`])
          || (sku  && catalogMap[`sku:${sku.toLowerCase()}`])
          || (nameR&& catalogMap[`name:${nameR.toLowerCase()}`]);

        const unitCost = cat?.std_cost ?? null;
        const myPrice  = (cat?.list_price!=null && Number.isFinite(cat.list_price))
          ? cat.list_price!
          : (qty>0 ? revenue/qty : null);

        const fb = Math.max(0, Math.min(1, toNum(fallbackCostPct.replace(',','.')) || 0.6));
        const used:'catalog'|'fallback'|'unknown' =
          unitCost!=null && Number.isFinite(unitCost) ? 'catalog' :
          revenue>0 ? 'fallback' : 'unknown';

        const costTotal = (unitCost!=null && Number.isFinite(unitCost)) ? unitCost*qty : (revenue>0 ? revenue*fb : 0);
        const margin = revenue - costTotal;
        const marginPct = revenue>0 ? (margin/revenue)*100 : 0;

        const finalName = cat?.name || nameR || sku || (prodId!=null ? `#${prodId}` : 'Producto');
        const finalSku  = cat?.sku || sku;

        return {
          key: String(prodId ?? finalSku ?? finalName ?? Math.random()),
          name: finalName, sku: finalSku,
          qty, revenue, unitCost, estCostUsed: used, costTotal,
          margin, marginPct, myPrice,
          competitorPrice: null, priceGapPct: null,
        };
      });

      // agrega TODOS los del catálogo con 0 ventas
      const seen = new Set<string>();
      listFromSales.forEach(r=>{
        const k = r.sku ? `sku:${r.sku.toLowerCase()}` : `name:${r.name.toLowerCase()}`;
        seen.add(k);
      });
      const zeroRows: ProfitRow[] = catalogArr
        .filter(p=>{
          const k = p.sku ? `sku:${p.sku.toLowerCase()}` : `name:${p.name.toLowerCase()}`;
          return !seen.has(k);
        })
        .map(p=>{
          const myPrice = (p.list_price!=null && Number.isFinite(p.list_price)) ? p.list_price : null;
          return {
            key: String(p.id),
            name: p.name, sku: p.sku,
            qty: 0, revenue: 0,
            unitCost: p.std_cost ?? null, estCostUsed: 'catalog',
            costTotal: 0, margin: 0, marginPct: 0,
            myPrice, competitorPrice: null, priceGapPct: null,
          };
        });

      const fullList = [...listFromSales, ...zeroRows];
      setRows(fullList);

      if (fullList.length) {
        await simulateCompetitorsAI(fullList, true);
        await analyzeAI(fullList, true);
      }
    }catch(e:any){
      Alert.alert('Análisis', String(e?.message || e));
    }finally{
      setLoading(false);
    }
  },[dateFrom,dateTo,fallbackCostPct,catalogMap,catalogArr,simulateCompetitorsAI,analyzeAI]);

  const kpis = useMemo(()=>summaryKpis(rows),[rows]);
  const allZeros = rows.length>0 && rows.every(r=>r.qty===0 && r.revenue===0);

  return (
    <View style={{ flex:1, backgroundColor: BRAND.bg }}>
      <ScrollView contentContainerStyle={{ padding:16 }}>
        <Text style={styles.title}>Rentabilidad & Competitividad</Text>
        <Text style={styles.sub}>Analiza margen por producto, detecta «loss leaders» y brechas de precio.</Text>

        {allZeros && (
          <View style={[styles.card, { marginTop:12, borderColor:'#F59E0B', borderWidth:1 }]}>
            <Text style={[F,{ color:'#92400E', marginBottom:6 }]}>⚠ El reporte devolvió cantidades/ingresos en 0.</Text>
            {!!reportMeta && (
              <>
                <Text style={[F,{ color:BRAND.slate700 }]}>Columns: {JSON.stringify(reportMeta.columns)}</Text>
                <Text style={[F,{ color:BRAND.slate700 }]}>Sample row: {typeof reportMeta.sample==='object' ? JSON.stringify(reportMeta.sample) : String(reportMeta.sample)}</Text>
                <Text style={[F,{ color:BRAND.slate500, marginTop:4 }]}>
                  Si ves nombres distintos (p. ej. "productId", "sumQty"), el segundo intento camelCase ya los cubre.
                </Text>
              </>
            )}
          </View>
        )}

        {/* Filtros */}
        <View style={[styles.card, { marginTop:12 }]}>
          <Text style={styles.cardTitle}>Filtros</Text>
          <View style={[styles.row, { flexWrap:'wrap', gap:8 }]}>
            <Pressable onPress={()=>quick('today')}  style={[styles.chip]}><Text style={styles.chipTxt}>Hoy</Text></Pressable>
            <Pressable onPress={()=>quick('7')}      style={[styles.chip]}><Text style={styles.chipTxt}>7 días</Text></Pressable>
            <Pressable onPress={()=>quick('month')}  style={[styles.chip]}><Text style={styles.chipTxt}>Este mes</Text></Pressable>
            <Pressable onPress={()=>quick('lastmonth')} style={[styles.chip]}><Text style={styles.chipTxt}>Mes pasado</Text></Pressable>
            <Pressable onPress={()=>quick('ytd')}    style={[styles.chip]}><Text style={styles.chipTxt}>YTD</Text></Pressable>
          </View>

          <View style={[styles.row, { marginTop:8, gap:8, flexWrap:'wrap' }]}>
            <View style={{ width:170 }}>
              <Text style={styles.label}>Desde</Text>
              <TextInput value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" style={styles.input}/>
            </View>
            <View style={{ width:170 }}>
              <Text style={styles.label}>Hasta</Text>
              <TextInput value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" style={styles.input}/>
            </View>
            <View style={{ width:170 }}>
              <Text style={styles.label}>Costo fallback (% ingreso)</Text>
              <TextInput value={fallbackCostPct} onChangeText={setFallbackCostPct} placeholder="0.60" style={styles.input} keyboardType="decimal-pad"/>
            </View>
          </View>

          <View style={{ marginTop:10, flexDirection:'row', gap:8, flexWrap:'wrap' }}>
            <Pressable onPress={run} style={[styles.btn, styles.btnBlue]}><Text style={styles.btnText}>Calcular</Text></Pressable>
            <Pressable onPress={importCompetitors} style={[styles.btn, styles.btnPurple]}><Text style={styles.btnText}>Importar competidores</Text></Pressable>
            <Pressable onPress={()=>simulateCompetitorsAI(undefined,false)} style={[styles.btn, styles.btnGreen]}>
              <Text style={styles.btnText}>{simulating ? 'Simulando…' : 'Simular competidores (IA)'}</Text>
            </Pressable>
            {(loading || simulating || aiLoading) && <ActivityIndicator />}
          </View>

          {!!Object.keys(compMap).length && (
            <Text style={[F, { color: BRAND.slate500, marginTop: 6 }]}>
              Precios de competencia cargados: {Object.keys(compMap).length}
            </Text>
          )}
          {!!rows.length && (
            <Text style={[F, { color: BRAND.slate500, marginTop: 2 }]}>
              Productos mostrados: {rows.length} · En catálogo: {catalogArr.length}
            </Text>
          )}
        </View>

        {/* KPIs */}
        {!!rows.length && (
          <View style={[styles.card, { marginTop:12 }]}>
            <Text style={styles.cardTitle}>KPIs</Text>
            <View style={[styles.row, { flexWrap:'wrap', gap:12 }]}>
              <Metric label="Ingresos" value={money(kpis.revenue)} />
              <Metric label="Costo total" value={money(kpis.cost)} />
              <Metric label="Margen bruto" value={money(kpis.margin)} />
              <Metric label="% Margen" value={`${kpis.marginPct.toFixed(1)}%`} />
              {/* KPIs adicionales */}
              <Metric label="Costo prod. (u. prom.)" value={money(kpis.avgUnitCost)} />
              <Metric label="Margen u. (prom.)" value={money(kpis.avgUnitMargin)} />
              <Metric label="Productos rentables" value={`${kpis.profitable}/${rows.length}`} />
              <Metric label="Loss leaders" value={`${kpis.lossLeaders}`} />
            </View>
            <Text style={[F,{ color:BRAND.slate500, marginTop:6 }]}>
              Nota: gráficos usan margen de precio (mi precio − competidor) si existe; si no, margen bruto.
            </Text>
          </View>
        )}

        {/* Gráficos */}
        {!!rows.length && (
          <>
            <View style={[styles.card, { marginTop:12 }]}>
              <Text style={styles.cardTitle}>Top productos</Text>
              <Text style={[F, { color: BRAND.slate500, marginBottom: 8 }]}>Mejor/Peor margen mostrado</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection:'row', gap:24, paddingRight:12 }}>
                  <ChartBlock title="Mejor margen" data={toBarTop(rows, 'best')} color="#10B981" />
                  <ChartBlock title="Peor margen"  data={toBarTop(rows, 'worst')} color="#EF4444" />
                </View>
              </ScrollView>
            </View>

            <View style={[styles.card, { marginTop:12 }]}>
              <Text style={styles.cardTitle}>Todos los productos (margen)</Text>
              <Text style={[F, { color: BRAND.slate500, marginBottom: 8 }]}>Verde = margen ≥ 0 · Rojo = margen &lt; 0</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ width: Math.max(440, rows.length * 72) }}>
                  <BarChart
                    data={toBarAll(rows)}
                    barWidth={24}
                    noOfSections={4}
                    yAxisThickness={0}
                    xAxisThickness={0}
                    xAxisLabelTextStyle={{ ...F, color: '#6b7280' } as any}
                    rulesColor={BRAND.border}
                    showValuesAsTopLabel
                    barTopLabelTextStyle={{ ...F, color: '#0f172a' } as any}
                    rotateLabel
                  />
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {/* Tabla */}
        {!!rows.length && (
          <View style={[styles.card, { marginTop:12 }]}>
            <Text style={styles.cardTitle}>Detalle por producto</Text>
            <ScrollView horizontal>
              <View>
                <View style={[styles.trHeader]}>
                  {['Producto','Cant.','Ingresos','Costo','Margen','%','Mi precio','Comp.','Brecha %'].map((h,i)=>(
                    <Text key={i} style={[styles.th, { minWidth: i===0?260:110 }]} numberOfLines={1}>{h}</Text>
                  ))}
                </View>
                {rows.map((r,idx)=>{
                  const dispMargin = displayMargin(r);
                  const dispPct    = displayMarginPct(r);
                  return (
                    <View key={r.key} style={[styles.tr, idx%2?{ backgroundColor:'#FAFBFF' }:null]}>
                      <Text style={[styles.td, { minWidth:260 }]} numberOfLines={1}>
                        {r.sku? `${r.sku} · `:''}{r.name}
                      </Text>
                      <Text style={[styles.td, { minWidth:110, textAlign:'right' }]}>{r.qty}</Text>
                      <Text style={[styles.td, { minWidth:110, textAlign:'right' }]}>{money(r.revenue)}</Text>

                      {/* ⬇️ Mostrar PRECIO donde dice "Costo" */}
                      <Text style={[styles.td, { minWidth:110, textAlign:'right' }]}>{r.myPrice!=null? money(r.myPrice):'—'}</Text>

                      {/* ⬇️ Margen mostrado = precio vs competidor si existe; si no, margen bruto */}
                      <Text style={[styles.td, { minWidth:110, textAlign:'right', color:dispMargin<0?'#b91c1c':'#0f172a' }]}>{money(dispMargin)}</Text>
                      <Text style={[styles.td, { minWidth:110, textAlign:'right' }]}>{dispPct.toFixed(1)}%</Text>

                      <Text style={[styles.td, { minWidth:110, textAlign:'right' }]}>{r.myPrice!=null? money(r.myPrice):'—'}</Text>
                      <Text style={[styles.td, { minWidth:110, textAlign:'right' }]}>{r.competitorPrice!=null? money(r.competitorPrice):'—'}</Text>
                      <Text style={[styles.td, { minWidth:110, textAlign:'right', color:(r.priceGapPct??0)<0?'#16a34a':'#0f172a' }]}>{r.priceGapPct!=null? `${r.priceGapPct.toFixed(1)}%`:'—'}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ marginTop:12, flexDirection:'row', gap:8 }}>
              <Pressable onPress={()=>analyzeAI(undefined,false)} style={[styles.btn, styles.btnBlue]}>
                <Text style={styles.btnText}>{aiLoading?'Analizando…':'Recomendaciones IA'}</Text>
              </Pressable>
            </View>

            {!!aiText && (
              <View style={{ marginTop:10, padding:10, borderRadius:12, backgroundColor:'#F7F9FF', borderWidth:1, borderColor:BRAND.border }}>
                <Text style={[F, { color: BRAND.slate900 }]}>{aiText}</Text>
              </View>
            )}
          </View>
        )}
        <View style={{ height:24 }}/>
      </ScrollView>
    </View>
  );
}

/* ==== Helpers de visualización para márgenes ==== */
// Si hay competidor y miPrecio, usar gap de precio; si no, usar margen bruto
function displayMargin(r: ProfitRow): number {
  if (r.myPrice != null && r.competitorPrice != null) {
    return r.myPrice - r.competitorPrice;
  }
  return r.margin;
}
// % equivalente: si hay competidor -> priceGapPct; si no, % de margen bruto
function displayMarginPct(r: ProfitRow): number {
  if (r.priceGapPct != null) return r.priceGapPct;
  return r.marginPct;
}

const Metric: React.FC<{ label:string; value:string }> = ({ label, value }) => (
  <LinearGradient colors={['#ffffff','#f7f9ff']} start={{x:0,y:0}} end={{x:1,y:1}}
    style={{ padding:12, borderRadius:14, minWidth:160, borderColor:BRAND.border, borderWidth:1 }}>
    <Text style={[F,{ color:BRAND.slate500 }]}>{label}</Text>
    <Text style={[F,{ color:BRAND.slate900, fontSize:18, marginTop:4 }]}>{value}</Text>
  </LinearGradient>
);

const ChartBlock: React.FC<{ title:string; data:any[]; color:string }> = ({ title, data, color }) => (
  <View style={{ width: 420 }}>
    <Text style={[F,{ color: BRAND.slate700, marginBottom: 6 }]}>{title}</Text>
    <BarChart
      data={data}
      barWidth={26}
      frontColor={color as any}
      noOfSections={4}
      yAxisThickness={0}
      xAxisThickness={0}
      xAxisLabelTextStyle={{ ...F, color: '#6b7280' } as any}
      rulesColor={BRAND.border}
      showValuesAsTopLabel
      barTopLabelTextStyle={{ ...F, color: '#0f172a' } as any}
      rotateLabel
    />
  </View>
);

// === Gráficos ahora se alimentan del margen mostrado (gap de precio o margen bruto)
function toBarTop(all: ProfitRow[], which:'best'|'worst') {
  const scored = all.map(r => ({ r, m: displayMargin(r) }));
  const arr = [...scored]
    .sort((a,b)=> which==='best' ? b.m-a.m : a.m-b.m)
    .slice(0,6)
    .map(x=>x.r);

  return arr.map(r=>({
    // ⬇️ valor redondeado a 2 decimales para etiqueta superior
    value: round2(Math.abs(displayMargin(r))),
    label: r.sku ? `${r.sku} · ${r.name}` : r.name,
  }));
}

function toBarAll(arr: ProfitRow[]) {
  return arr.map(r=>{
    const m = displayMargin(r);
    return {
      // ⬇️ valor redondeado a 2 decimales para etiqueta superior
      value: round2(Math.abs(m)),
      label: r.sku ? `${r.sku} · ${r.name}` : r.name,
      frontColor: m < 0 ? '#EF4444' : '#10B981',
    };
  });
}

function summaryKpis(rows: ProfitRow[]) {
  const revenue = rows.reduce((s,r)=>s+r.revenue,0);
  const cost    = rows.reduce((s,r)=>s+r.costTotal,0);
  const margin  = revenue - cost;
  const marginPct = revenue>0? (margin/revenue)*100 : 0;
  const profitable = rows.filter(r=>r.margin>0).length;
  const lossLeaders= rows.filter(r=>r.margin<0).length;

  // Promedios unitarios ponderados
  const totalUnits = rows.reduce((s,r)=>s + r.qty, 0);
  const avgUnitPrice  = totalUnits>0 ? (revenue / totalUnits) : 0;
  const avgUnitCost   = totalUnits>0 ? (cost    / totalUnits) : 0;
  const avgUnitMargin = avgUnitPrice - avgUnitCost;
  const avgUnitMarginPct = avgUnitPrice>0 ? (avgUnitMargin / avgUnitPrice) * 100 : 0;

  return { revenue, cost, margin, marginPct, profitable, lossLeaders, avgUnitPrice, avgUnitCost, avgUnitMargin, avgUnitMarginPct };
}

const styles = StyleSheet.create({
  title: { ...F, fontSize: 22, color: '#1D4ED8' },
  sub:   { ...F, color: BRAND.slate500 },
  card: {
    backgroundColor: BRAND.surface, borderRadius:16, padding:12,
    shadowColor: BRAND.cardShadow, shadowOpacity:1, shadowRadius:12, shadowOffset:{width:0,height:8}, elevation:2,
  },
  cardTitle: { ...F, color: BRAND.slate900, fontSize: 16, marginBottom: 8 },
  row: { flexDirection:'row', alignItems:'center' },
  label:{ ...F, color: BRAND.slate700, marginBottom:4 },
  input:{ ...F, borderWidth:1, borderColor:BRAND.border, borderRadius:10, paddingHorizontal:10, minHeight:42, backgroundColor:'#fff' },
  chip:{ paddingHorizontal:10, paddingVertical:8, borderRadius:999, backgroundColor:'#f3f4f6', borderWidth:1, borderColor:BRAND.border },
  chipTxt:{ ...F, color: BRAND.slate700 },
  btn:{ paddingHorizontal:12, paddingVertical:10, borderRadius:12, backgroundColor:BRAND.primary },
  btnBlue:{ backgroundColor:'#2563EB' },
  btnPurple:{ backgroundColor:'#7C3AED' },
  btnGreen:{ backgroundColor:'#10B981' },
  btnText:{ ...F, color:'#fff' },
  trHeader:{ flexDirection:'row', backgroundColor:'#F7F9FF', borderTopWidth:1, borderBottomWidth:1, borderColor:BRAND.border },
  tr:{ flexDirection:'row', borderBottomWidth:1, borderColor:BRAND.border },
  th:{ ...F, minWidth:120, padding:8, color:BRAND.slate700, fontWeight:'700' },
  td:{ ...F, minWidth:120, padding:8, color:BRAND.slate900 },
});
