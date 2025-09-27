// src/screens/UnitCostScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Platform, Pressable, Alert } from 'react-native';

const BRAND = {
  primary: '#2563EB',
  slate900: '#0F172A',
  slate700: '#334155',
  slate500: '#64748B',
  bg: '#EEF2FF',
  surface: '#FFFFFF',
  border: '#E6EBFF',
  cardShadow: 'rgba(37,99,235,0.16)',
};
const F = Platform.select({ ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const }, default: { fontFamily: 'Apoka' } });

const moneyNI = (v?: number | null) => {
  const n = Number(v ?? 0);
  try { return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(n); }
  catch { return `C$ ${n.toFixed(2)}`; }
};
// convierte strings flexibles ("1 234,56", "1,234.56") a número
const n = (s: string) => {
  if (!s) return 0;
  const t = s.replace(/\s+/g, '').replace(/,/g, '.');
  const v = Number(t);
  return Number.isFinite(v) ? v : 0;
};

type Material = { id: string; name: string; qtyPerUnit: string; unitPrice: string };

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
  suffix?: string;
}> = ({ label, value, onChange, placeholder, keyboardType = 'numeric', suffix }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={[F, { color: BRAND.slate700, marginBottom: 4 }]}>{label}</Text>
    <View style={[styles.inputWrap]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        style={[styles.input]}
      />
      {!!suffix && <Text style={[F, { color: BRAND.slate500 }]}>{suffix}</Text>}
    </View>
  </View>
);

const Kpi: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <View style={styles.kpi}>
    <Text style={[F, { color: BRAND.slate500, fontSize: 12 }]}>{title}</Text>
    <Text style={[F, { color: BRAND.slate900, fontSize: 18, marginTop: 4 }]}>{value}</Text>
  </View>
);

const Chip: React.FC<{ label: string; active?: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[F, { color: active ? '#fff' : BRAND.slate700 }]}>{label}</Text>
  </Pressable>
);

export default function UnitCostScreen() {
  // Parámetros del lote
  const [unidades, setUnidades] = useState('100');        // unidades planeadas (iniciadas)
  const [mermaPct, setMermaPct] = useState('0');          // % merma sobre el lote
  const [precioVenta, setPrecioVenta] = useState('');     // opcional: precio de venta unit.

  // ====== Materia prima (lista) ======
  const [materials, setMaterials] = useState<Material[]>([
    { id: 'm1', name: 'Materia A', qtyPerUnit: '1', unitPrice: '10' },
  ]);
  const addMaterial = () => setMaterials(m => [...m, { id: `m${Date.now()}`, name: '', qtyPerUnit: '0', unitPrice: '0' }]);
  const removeMaterial = (id: string) => setMaterials(m => m.filter(x => x.id !== id));
  const updateMat = (id: string, key: keyof Material, val: string) =>
    setMaterials(m => m.map(x => (x.id === id ? { ...x, [key]: val } : x)));

  // ====== Mano de obra directa (MOD) ======
  type MoMode = 'unit' | 'batch';
  const [moMode, setMoMode] = useState<MoMode>('unit');   // horas por unidad o totales del lote
  const [moTarifa, setMoTarifa] = useState('0');          // C$/hora
  const [moHorasUnit, setMoHorasUnit] = useState('0');    // horas por unidad
  const [moHorasLote, setMoHorasLote] = useState('0');    // horas totales del lote

  // ====== Costos variables ======
  // combinamos: por unidad, por lote y % sobre base (MAT, MOD, MAT+MOD)
  const [varUnit, setVarUnit] = useState('0');            // variables por unidad (empaque, comisiones por unidad, etc.)
  const [varLote, setVarLote] = useState('0');            // variables por lote (energía del proceso, etc.)
  const [varPct, setVarPct] = useState('0');              // %
  type VarBase = 'MAT' | 'MOD' | 'MAT+MOD';
  const [varBase, setVarBase] = useState<VarBase>('MAT+MOD');

  // ====== Costos fijos ======
  const [setup, setSetup] = useState('0');                // fijos por lote (preparación)
  const [fijoMensual, setFijoMensual] = useState('0');    // CIF fijo mensual (alquiler, sueldos, etc.)
  const [prodMensual, setProdMensual] = useState('0');    // producción esperada al mes (u) para prorratear

  // ====== Otros ======
  const [otros, setOtros] = useState('0');                // otros costos del lote
  const [nota, setNota] = useState('');

  // ====== Derivados ======
  const unidadesPlan = useMemo(() => Math.max(0, Math.floor(n(unidades))), [unidades]);
  const unidadesBuenas = useMemo(() => {
    const merma = Math.max(0, Math.min(100, n(mermaPct)));
    const out = unidadesPlan * (1 - merma / 100);
    return out > 0 ? out : 0;
  }, [unidadesPlan, mermaPct]);

  // Materia prima
  const matUnit = useMemo(() => {
    return materials.reduce((s, it) => s + n(it.qtyPerUnit) * n(it.unitPrice), 0);
  }, [materials]);
  const matLote = useMemo(() => matUnit * unidadesPlan, [matUnit, unidadesPlan]);

  // MOD
  const moLote = useMemo(() => {
    const tarifa = n(moTarifa);
    if (moMode === 'unit') return tarifa * n(moHorasUnit) * unidadesPlan;
    return tarifa * n(moHorasLote);
  }, [moMode, moTarifa, moHorasUnit, moHorasLote, unidadesPlan]);

  // Variables
  const varBaseMonto = useMemo(() => {
    switch (varBase) {
      case 'MAT': return matLote;
      case 'MOD': return moLote;
      default:    return matLote + moLote;
    }
  }, [varBase, matLote, moLote]);
  const varPctMonto = useMemo(() => (n(varPct) / 100) * varBaseMonto, [varPct, varBaseMonto]);
  const varUnitMonto = useMemo(() => n(varUnit) * unidadesPlan, [varUnit, unidadesPlan]);
  const varTotal = useMemo(() => n(varLote) + varUnitMonto + varPctMonto, [varLote, varUnitMonto, varPctMonto]);

  // Fijos
  const fijoMensualPorUnidad = useMemo(() => {
    const prod = n(prodMensual);
    return prod > 0 ? n(fijoMensual) / prod : 0;
  }, [fijoMensual, prodMensual]);
  const fijoMensualLote = useMemo(() => fijoMensualPorUnidad * unidadesPlan, [fijoMensualPorUnidad, unidadesPlan]);
  const fijosLote = useMemo(() => n(setup) + fijoMensualLote, [setup, fijoMensualLote]);

  // Otros
  const otrosLote = useMemo(() => n(otros), [otros]);

  // Totales
  const totalLote = useMemo(() =>
    matLote + moLote + varTotal + fijosLote + otrosLote,
  [matLote, moLote, varTotal, fijosLote, otrosLote]);

  const unitSinMerma = useMemo(() => (unidadesPlan > 0 ? totalLote / unidadesPlan : 0), [totalLote, unidadesPlan]);
  const unitConMerma = useMemo(() => (unidadesBuenas > 0 ? totalLote / unidadesBuenas : 0), [totalLote, unidadesBuenas]);

  // Márgenes (si hay precio)
  const precioU = useMemo(() => n(precioVenta), [precioVenta]);
  const margenU = useMemo(() => (precioU > 0 ? precioU - unitConMerma : 0), [precioU, unitConMerma]);
  const margenPct = useMemo(() => (precioU > 0 ? (margenU / precioU) * 100 : 0), [precioU, margenU]);

  const onLimpiar = () => {
    setUnidades('100'); setMermaPct('0'); setPrecioVenta('');
    setMaterials([{ id: 'm1', name: '', qtyPerUnit: '0', unitPrice: '0' }]);
    setMoTarifa('0'); setMoHorasUnit('0'); setMoHorasLote('0'); setMoMode('unit');
    setVarUnit('0'); setVarLote('0'); setVarPct('0'); setVarBase('MAT+MOD');
    setSetup('0'); setFijoMensual('0'); setProdMensual('0');
    setOtros('0'); setNota('');
  };

  const onGuardarNota = () => Alert.alert('Guardado', 'Se guardó la nota localmente (persistencia real pendiente).');

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Costo unitario de producción</Text>
        <Text style={styles.sub}>Modelo por Materia prima, Variables, Fijos y Mano de Obra. Incluye merma y margen.</Text>

        {/* Parámetros del lote */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Parámetros</Text>
          <View style={[styles.grid]}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Field label="Unidades del lote (iniciadas)" value={unidades} onChange={setUnidades} placeholder="p. ej. 100" suffix="u" />
            </View>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Field label="Merma (%)" value={mermaPct} onChange={setMermaPct} placeholder="0–100" suffix="%" />
            </View>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Field label="Precio de venta unit. (opcional)" value={precioVenta} onChange={setPrecioVenta} placeholder="C$" />
            </View>
          </View>
        </View>

        {/* Materia prima */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Materia prima (por unidad)</Text>
          {materials.map((m) => (
            <View key={m.id} style={[styles.matRow]}>
              <TextInput
                placeholder="Nombre (opcional)"
                value={m.name}
                onChangeText={(t) => updateMat(m.id, 'name', t)}
                style={[styles.input, { flex: 1 }]}
              />
              <View style={{ width: 100 }}>
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder="Cant."
                    value={m.qtyPerUnit}
                    onChangeText={(t) => updateMat(m.id, 'qtyPerUnit', t)}
                    keyboardType="numeric"
                    style={[styles.input]}
                  />
                  <Text style={[F, { color: BRAND.slate500 }]}>u</Text>
                </View>
              </View>
              <View style={{ width: 120 }}>
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder="Precio"
                    value={m.unitPrice}
                    onChangeText={(t) => updateMat(m.id, 'unitPrice', t)}
                    keyboardType="numeric"
                    style={[styles.input]}
                  />
                  <Text style={[F, { color: BRAND.slate500 }]}>C$/u</Text>
                </View>
              </View>
              <Pressable onPress={() => removeMaterial(m.id)} style={styles.removeBtn}>
                <Text style={[F, { color: '#991b1b', fontSize: 18 }]}>×</Text>
              </Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Pressable onPress={addMaterial} style={[styles.btn, styles.btnGray]}><Text style={styles.btnTextAlt}>Agregar material</Text></Pressable>
          </View>

          <View style={[styles.break, { marginTop: 10 }]}>
            <Text style={styles.breakLabel}>Costo materia prima (unitario)</Text>
            <Text style={styles.breakVal}>{moneyNI(matUnit)}</Text>
          </View>
          <View style={[styles.break]}>
            <Text style={styles.breakLabel}>Costo materia prima (lote)</Text>
            <Text style={styles.breakVal}>{moneyNI(matLote)}</Text>
          </View>
        </View>

        {/* Mano de obra directa */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Mano de obra directa (MOD)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <Chip label="Horas por unidad" active={moMode === 'unit'} onPress={() => setMoMode('unit')} />
            <Chip label="Horas del lote" active={moMode === 'batch'} onPress={() => setMoMode('batch')} />
          </View>
          <View style={[styles.grid]}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Field label="Tarifa (C$/h)" value={moTarifa} onChange={setMoTarifa} placeholder="C$/h" />
            </View>
            {moMode === 'unit' ? (
              <View style={{ flex: 1, minWidth: 200 }}>
                <Field label="Horas por unidad" value={moHorasUnit} onChange={setMoHorasUnit} placeholder="h/u" suffix="h/u" />
              </View>
            ) : (
              <View style={{ flex: 1, minWidth: 200 }}>
                <Field label="Horas totales del lote" value={moHorasLote} onChange={setMoHorasLote} placeholder="h" suffix="h" />
              </View>
            )}
          </View>
          <View style={[styles.break, { marginTop: 6 }]}>
            <Text style={styles.breakLabel}>MOD (lote)</Text>
            <Text style={styles.breakVal}>{moneyNI(moLote)}</Text>
          </View>
        </View>

        {/* Variables */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Costos variables</Text>
          <View style={[styles.grid]}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Field label="Variables por unidad" value={varUnit} onChange={setVarUnit} placeholder="C$/u" />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Field label="Variables por lote" value={varLote} onChange={setVarLote} placeholder="C$" />
            </View>
          </View>

          <Text style={[F, { color: BRAND.slate700, marginBottom: 6, marginTop: 4 }]}>Variable porcentual</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <Chip label="% sobre MAT" active={varBase === 'MAT'} onPress={() => setVarBase('MAT')} />
            <Chip label="% sobre MOD" active={varBase === 'MOD'} onPress={() => setVarBase('MOD')} />
            <Chip label="% sobre MAT+MOD" active={varBase === 'MAT+MOD'} onPress={() => setVarBase('MAT+MOD')} />
          </View>
          <View style={{ width: 160 }}>
            <Field label="Porcentaje" value={varPct} onChange={setVarPct} placeholder="%" suffix="%" />
          </View>

          <View style={[styles.break, { marginTop: 6 }]}>
            <Text style={styles.breakLabel}>Base porcentual seleccionada</Text>
            <Text style={styles.breakVal}>{moneyNI(varBaseMonto)}</Text>
          </View>
          <View style={[styles.break]}>
            <Text style={styles.breakLabel}>Variables (lote)</Text>
            <Text style={styles.breakVal}>{moneyNI(varTotal)}</Text>
          </View>
        </View>

        {/* Fijos */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Costos fijos</Text>
          <View style={[styles.grid]}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Field label="Fijo por lote (setup)" value={setup} onChange={setSetup} placeholder="C$" />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Field label="CIF fijo mensual" value={fijoMensual} onChange={setFijoMensual} placeholder="C$/mes" />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Field label="Producción mensual esperada" value={prodMensual} onChange={setProdMensual} placeholder="unidades/mes" suffix="u" />
            </View>
          </View>

          <View style={[styles.break, { marginTop: 6 }]}>
            <Text style={styles.breakLabel}>Fijo mensual prorrateado (por unidad)</Text>
            <Text style={styles.breakVal}>{moneyNI(fijoMensualPorUnidad)}</Text>
          </View>
          <View style={[styles.break]}>
            <Text style={styles.breakLabel}>Fijos (lote)</Text>
            <Text style={styles.breakVal}>{moneyNI(fijosLote)}</Text>
          </View>
        </View>

        {/* Otros */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Otros</Text>
          <View style={{ width: 220 }}>
            <Field label="Otros costos (lote)" value={otros} onChange={setOtros} placeholder="C$" />
          </View>
          <View style={[styles.inputWrap, { alignItems: 'flex-start', marginTop: 6 }]}>
            <TextInput
              multiline
              value={nota}
              onChangeText={setNota}
              placeholder="Observaciones, supuestos, etc."
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <Pressable onPress={onGuardarNota} style={[styles.btn, styles.btnBlue]}><Text style={styles.btnTextAlt}>Guardar nota</Text></Pressable>
            <Pressable onPress={onLimpiar} style={[styles.btn, styles.btnGray]}><Text style={styles.btnTextAlt}>Limpiar</Text></Pressable>
          </View>
        </View>

        {/* Resultados */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Resultados</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <Kpi title="Total del lote" value={moneyNI(totalLote)} />
            <Kpi title="Unidades planificadas" value={`${unidadesPlan} u`} />
            <Kpi title="Unidades buenas (post-merma)" value={`${unidadesBuenas.toFixed(2)} u`} />
          </View>

          <View style={[styles.grid, { marginTop: 8 }]}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <View style={[styles.break]}><Text style={styles.breakLabel}>Materia prima (lote)</Text><Text style={styles.breakVal}>{moneyNI(matLote)}</Text></View>
              <View style={[styles.break]}><Text style={styles.breakLabel}>MOD (lote)</Text><Text style={styles.breakVal}>{moneyNI(moLote)}</Text></View>
              <View style={[styles.break]}><Text style={styles.breakLabel}>Variables (lote)</Text><Text style={styles.breakVal}>{moneyNI(varTotal)}</Text></View>
              <View style={[styles.break]}><Text style={styles.breakLabel}>Fijos (lote)</Text><Text style={styles.breakVal}>{moneyNI(fijosLote)}</Text></View>
              <View style={[styles.break]}><Text style={styles.breakLabel}>Otros (lote)</Text><Text style={styles.breakVal}>{moneyNI(otrosLote)}</Text></View>
              <View style={[styles.break, styles.breakTotal]}><Text style={[styles.breakLabel, { fontWeight: '700' }]}>Total lote</Text><Text style={[styles.breakVal, { fontWeight: '700' }]}>{moneyNI(totalLote)}</Text></View>
            </View>

            <View style={{ flex: 1, minWidth: 260 }}>
              <View style={[styles.kpiBig]}>
                <Text style={[F, { color: BRAND.slate500 }]}>Costo unitario (sin merma)</Text>
                <Text style={[F, styles.kpiBigValue]}>{moneyNI(unitSinMerma)}</Text>
              </View>
              <View style={[styles.kpiBig, { marginTop: 10 }]}>
                <Text style={[F, { color: BRAND.slate500 }]}>Costo unitario (con merma)</Text>
                <Text style={[F, styles.kpiBigValue]}>{moneyNI(unitConMerma)}</Text>
              </View>

              {!!precioVenta && (
                <View style={[styles.kpiBig, { marginTop: 10 }]}>
                  <Text style={[F, { color: BRAND.slate500 }]}>Margen unitario (vs. precio)</Text>
                  <Text style={[F, { color: BRAND.slate900, fontSize: 16, marginTop: 4 }]}>
                    {moneyNI(margenU)}  ·  {margenPct.toFixed(1)}%
                  </Text>
                </View>
              )}

              {unidadesBuenas === 0 && (
                <Text style={[F, { color: '#b91c1c', marginTop: 10 }]}>
                  Revisa unidades y merma: no hay unidades buenas para prorratear.
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...F, fontSize: 22, color: '#1D4ED8' },
  sub: { ...F, color: BRAND.slate500 },

  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 12,
    shadowColor: BRAND.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTitle: { ...F, color: BRAND.slate900, fontSize: 16, marginBottom: 8 },

  grid: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1, borderColor: BRAND.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 42,
  },
  input: { ...F, flex: 1, paddingVertical: 8, color: BRAND.slate900 },

  divider: { height: 1, backgroundColor: BRAND.border, marginVertical: 12 },

  btn: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 1,
    alignSelf: 'flex-start',
  },
  btnBlue: { backgroundColor: BRAND.primary },
  btnGray: { backgroundColor: '#1E293B' },
  btnTextAlt: { ...F, color: '#fff' },

  kpi: {
    flexGrow: 1, minWidth: 160,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }, elevation: 2,
  },
  kpiBig: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }, elevation: 2,
  },
  kpiBigValue: { fontSize: 22, color: BRAND.slate900, marginTop: 4, fontWeight: '700' },

  break: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomColor: BRAND.border, borderBottomWidth: 1 },
  breakLabel: { ...F, color: BRAND.slate700 },
  breakVal: { ...F, color: BRAND.slate900 },
  breakTotal: { borderBottomWidth: 0, marginTop: 4 },

  // Materia prima rows
  matRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  removeBtn: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1, borderColor: '#fecaca',
  },

  // Chips
  chip: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1, borderColor: BRAND.border,
  },
  chipActive: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },
});
