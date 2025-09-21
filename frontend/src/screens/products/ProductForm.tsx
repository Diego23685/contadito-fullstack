import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Switch, Button, Alert, StyleSheet, ScrollView,
  Pressable, ActivityIndicator, useWindowDimensions, Platform
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../../api';

type Product = {
  id: number;
  tenantId: number;
  sku: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  isService?: boolean;
  trackStock?: boolean;
  listPrice?: number;
  stdCost?: number | null;
};

const currency = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(Number(n || 0));

const toNumber = (raw: string) => {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) return Number(parts[0] + '.' + parts.slice(1).join(''));
  return Number(cleaned || 0);
};

const HelperText = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.helper}>{children}</Text>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

const Card: React.FC<{ children: React.ReactNode, style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Divider = () => <View style={styles.divider} />;

const ProductForm: React.FC<any> = ({ route, navigation }) => {
  // Carga de fuente (no bloquea; se aplica cuando lista)
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });
  const F = Platform.select({
    ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
    default: { fontFamily: 'Apoka' },
  });

  const id: number | undefined = route?.params?.id;
  const isEdit = !!id;
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [loading, setLoading] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [description, setDescription] = useState('');
  const [isService, setIsService] = useState(false);
  const [trackStock, setTrackStock] = useState(true);
  const [listPrice, setListPrice] = useState<string>('0');
  const [stdCost, setStdCost] = useState<string>('');

  const [errors, setErrors] = useState<{ [k: string]: string | null }>({});

  // ---- Inventario (UI) ----
  const [currentQty, setCurrentQty] = useState<number | null>(null);
  const [inQty, setInQty] = useState<string>('');           // cantidad para IN
  const [inCost, setInCost] = useState<string>('');         // costo unitario para IN
  const [outQty, setOutQty] = useState<string>('');         // cantidad para OUT
  const [warehouseId, setWarehouseId] = useState<string>(''); // opcional
  const [reference, setReference] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const fetchStock = async () => {
    if (!isEdit) return;
    try {
      const { data } = await api.get<{ productId: number; qty: number }>(`/inventory/products/${id}/stock`);
      setCurrentQty(data.qty ?? 0);
    } catch {
      setCurrentQty(null);
    }
  };

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<Product>(`/products/${id}`);
        const p = res.data;
        setSku(p.sku);
        setName(p.name);
        setUnit(p.unit || 'unidad');
        setDescription(p.description || '');
        setIsService(!!p.isService);
        setTrackStock(!!p.trackStock);
        setListPrice(String(p.listPrice ?? 0));
        setStdCost(p.stdCost != null ? String(p.stdCost) : '');
      } catch (e: any) {
        Alert.alert('Error', String(e?.response?.data || e?.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  // trae stock al entrar / cuando cambie id
  useEffect(() => { fetchStock(); }, [id]);

  // Cálculos precios
  const numPrice = useMemo(() => toNumber(listPrice), [listPrice]);
  const numCost = useMemo(() => (stdCost === '' ? null : toNumber(stdCost)), [stdCost]);
  const profit = useMemo(() => (numCost == null ? null : numPrice - numCost), [numPrice, numCost]);
  const marginPct = useMemo(() => (numCost == null || numPrice === 0 ? null : ((numPrice - numCost) / numPrice) * 100), [numPrice, numCost]);

  const validate = () => {
    const next: typeof errors = {};
    if (!isEdit && !sku.trim()) next.sku = 'Requerido al crear';
    if (!name.trim()) next.name = 'Requerido';
    if (numPrice < 0) next.listPrice = 'No puede ser negativo';
    if (stdCost !== '' && (numCost ?? 0) < 0) next.stdCost = 'No puede ser negativo';
    if (isService && trackStock) next.trackStock = 'Un servicio no debería controlar stock';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        unit: unit.trim(),
        isService,
        trackStock: isService ? false : trackStock,
        listPrice: numPrice,
        stdCost: stdCost === '' ? null : numCost,
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
      } else {
        await api.post('/products', { sku: sku.trim(), ...payload });
      }
      Alert.alert('Listo', 'Producto guardado');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar'));
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => navigation.goBack();

  // ---- Handlers de inventario ----
  const postAdjust = async (movementType: 'in' | 'out') => {
    if (!isEdit) {
      Alert.alert('Primero guarda el producto', 'Debes crear el producto antes de ajustar inventario.');
      return;
    }
    try {
      const qty = movementType === 'in' ? toNumber(inQty) : toNumber(outQty);
      if (!qty || qty <= 0) {
        Alert.alert('Cantidad inválida', 'Ingresa una cantidad mayor a cero.');
        return;
      }
      const unitCost = movementType === 'in'
        ? (inCost.trim() === '' ? null : toNumber(inCost))
        : null;

      const payload = {
        productId: id,
        warehouseId: warehouseId.trim() === '' ? null : Number(warehouseId),
        movementType,
        quantity: qty,
        unitCost,
        reference: reference.trim() || undefined,
        reason: reason.trim() || undefined,
      };

      await api.post('/inventory/adjust', payload);
      Alert.alert('Listo', movementType === 'in' ? 'Entrada registrada' : 'Salida registrada');

      // limpiar inputs y refrescar stock
      if (movementType === 'in') {
        setInQty('');
        setInCost('');
      } else {
        setOutQty('');
      }
      await fetchStock();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo ajustar inventario'));
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.title}>{isEdit ? 'Editar producto' : 'Nuevo producto'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={cancel} style={[styles.actionBtn, styles.secondaryBtn]}>
            <Text style={styles.actionTextSecondary}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={save} disabled={loading || (!isEdit && !sku)} style={[styles.actionBtn, (!loading && (isEdit || !!sku) ? styles.primaryBtn : styles.disabledBtn)]}>
            {loading ? <ActivityIndicator /> : <Text style={styles.actionTextPrimary}>Guardar</Text>}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.container, isWide && styles.containerWide]}>
        {/* Columna izquierda */}
        <View style={[styles.col, isWide && styles.colLeft]}>
          <Card>
            <SectionTitle>Ficha de producto</SectionTitle>
            <View style={styles.field}>
              <Text style={styles.label}>SKU {isEdit ? '(no editable)' : ''}</Text>
              <TextInput
                style={[styles.input, isEdit && styles.disabled]}
                value={sku}
                onChangeText={setSku}
                editable={!isEdit}
                placeholder="Ej. CAF-001"
              />
              {!!errors.sku && <Text style={styles.error}>{errors.sku}</Text>}
              {!isEdit && <HelperText>Identificador único dentro del tenant.</HelperText>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Café molido 500g" />
              {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}
            </View>

            <View style={styles.row2}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Unidad</Text>
                <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="unidad, kg, lt" />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Tipo</Text>
                <View style={styles.pillRow}>
                  <Pressable onPress={() => { setIsService(false); }} style={[styles.pill, !isService && styles.pillActive]}>
                    <Text style={[styles.pillText, !isService && styles.pillTextActive]}>Producto</Text>
                  </Pressable>
                  <Pressable onPress={() => { setIsService(true); setTrackStock(false); }} style={[styles.pill, isService && styles.pillActive]}>
                    <Text style={[styles.pillText, isService && styles.pillTextActive]}>Servicio</Text>
                  </Pressable>
                </View>
                <HelperText>{isService ? 'Los servicios no manejan inventario.' : 'Los productos pueden manejar stock.'}</HelperText>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Notas, especificaciones, etc."
              />
            </View>

            <Divider />

            <View style={[styles.field, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={styles.label}>¿Controla stock?</Text>
              <Switch value={isService ? false : trackStock} onValueChange={setTrackStock} disabled={isService} />
            </View>
            {!!errors.trackStock && <Text style={styles.error}>{errors.trackStock}</Text>}
          </Card>

          <Card>
            <SectionTitle>Precios y costos</SectionTitle>
            <View style={styles.row2}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Precio de venta (C$)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={listPrice}
                  onChangeText={setListPrice}
                  placeholder="0.00"
                />
                {!!errors.listPrice && <Text style={styles.error}>{errors.listPrice}</Text>}
                <HelperText>Precio público sugerido.</HelperText>
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Costo estándar (C$)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="Opcional"
                  value={stdCost}
                  onChangeText={setStdCost}
                />
                {!!errors.stdCost && <Text style={styles.error}>{errors.stdCost}</Text>}
                <HelperText>Úsalo para estimar margen. Déjalo vacío si no aplica.</HelperText>
              </View>
            </View>
          </Card>
        </View>

        {/* Columna derecha */}
        <View style={[styles.col, isWide && styles.colRight]}>
          <Card>
            <SectionTitle>Resumen</SectionTitle>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Precio</Text>
              <Text style={styles.summaryValue}>{currency(numPrice)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Costo</Text>
              <Text style={styles.summaryValue}>{numCost == null ? '—' : currency(numCost)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Utilidad</Text>
              <Text style={[styles.summaryValue, profit != null && profit < 0 && styles.negative]}>{profit == null ? '—' : currency(profit)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Margen</Text>
              <Text style={[styles.summaryValue, marginPct != null && marginPct < 0 && styles.negative]}>
                {marginPct == null ? '—' : `${marginPct.toFixed(1)}%`}
              </Text>
            </View>
            <Divider />
            <HelperText>El margen se calcula como (Precio − Costo) / Precio. Si dejas el costo vacío, no se calcula.</HelperText>
          </Card>

          {/* ===== Inventario ===== */}
          {isEdit && trackStock && !isService && (
            <Card>
              <SectionTitle>Inventario</SectionTitle>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Stock actual</Text>
                <Text style={styles.summaryValue}>{currentQty == null ? '—' : `${currentQty}`}</Text>
              </View>

              <Divider />

              <Text style={[styles.label, { marginTop: 6 }]}>Almacén (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="ID de almacén (numérico) o vacío"
                value={warehouseId}
                onChangeText={setWarehouseId}
                keyboardType="number-pad"
              />
              <HelperText>Si lo dejas vacío, se registra sin almacén específico.</HelperText>

              <Text style={[styles.label, { marginTop: 12 }]}>Referencia (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. AJUSTE-001"
                value={reference}
                onChangeText={setReference}
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Motivo (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Comentario del ajuste"
                value={reason}
                onChangeText={setReason}
              />

              <Divider />

              {/* IN */}
              <Text style={[styles.label, { marginTop: 8 }]}>Entrada</Text>
              <View style={styles.row2}>
                <View style={[styles.field, styles.flex1]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Cantidad a ingresar"
                    value={inQty}
                    onChangeText={setInQty}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Costo unitario (opcional)"
                    value={inCost}
                    onChangeText={setInCost}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Pressable onPress={() => postAdjust('in')} style={[styles.actionBtn, styles.primaryBtn, { marginTop: 4 }]}>
                <Text style={styles.actionTextPrimary}>Entrar al stock</Text>
              </Pressable>
              <HelperText>La entrada puede incluir costo para alimentar promedio.</HelperText>

              {/* OUT */}
              <Divider />
              <Text style={[styles.label, { marginTop: 8 }]}>Salida</Text>
              <View style={[styles.field]}>
                <TextInput
                  style={styles.input}
                  placeholder="Cantidad a descontar"
                  value={outQty}
                  onChangeText={setOutQty}
                  keyboardType="decimal-pad"
                />
              </View>
              <Pressable onPress={() => postAdjust('out')} style={[styles.actionBtn, styles.secondaryBtn]}>
                <Text style={styles.actionTextSecondary}>Descontar</Text>
              </Pressable>
            </Card>
          )}

          <Card>
            <SectionTitle>Buenas prácticas</SectionTitle>
            <Text style={styles.tip}>• Usa SKU legibles (ej. CAT-001) y consistentes.</Text>
            <Text style={styles.tip}>• Para servicios, desactiva inventario.</Text>
            <Text style={styles.tip}>• Revisa que el precio sea mayor al costo para evitar márgenes negativos.</Text>
          </Card>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <Text style={styles.footerText}>{isEdit ? `Editando: ${name || '(sin nombre)'}` : 'Creando nuevo producto'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={cancel} style={[styles.actionBtn, styles.secondaryBtn]}>
              <Text style={styles.actionTextSecondary}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={save} disabled={loading || (!isEdit && !sku)} style={[styles.actionBtn, (!loading && (isEdit || !!sku) ? styles.primaryBtn : styles.disabledBtn)]}>
              {loading ? <ActivityIndicator /> : <Text style={styles.actionTextPrimary}>Guardar</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ProductForm;

const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7F9' },

  topBar: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  title: { ...F, fontSize: 20, fontWeight: '700' },

  container: { padding: 16, gap: 16 },
  containerWide: { maxWidth: 1200, alignSelf: 'center', width: '100%', flexDirection: 'row' },
  col: { flex: 1, gap: 16 },
  colLeft: { flex: 2 },
  colRight: { flex: 1, minWidth: 320 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 2,
  },

  sectionTitle: { ...F, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  field: { marginBottom: 12 },
  label: { ...F, marginBottom: 6, color: '#111827', fontWeight: '600' },
  input: {
    ...F,
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, minHeight: 42,
    backgroundColor: '#fff'
  },
  disabled: { backgroundColor: '#F3F4F6' },

  row2: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, backgroundColor: '#FFF'
  },
  pillActive: { backgroundColor: '#0EA5E922', borderColor: '#0EA5E9' },
  pillText: { ...F, color: '#374151', fontWeight: '600' },
  pillTextActive: { ...F, color: '#0369A1', fontWeight: '600' },

  helper: { ...F, marginTop: 6, color: '#6B7280', fontSize: 12 },
  error: { ...F, marginTop: 6, color: '#B91C1C', fontSize: 12 },

  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { ...F, color: '#6B7280' },
  summaryValue: { ...F, fontWeight: '700' },
  negative: { color: '#B91C1C' },

  tip: { ...F, color: '#374151', marginBottom: 6 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: -2 }, shadowRadius: 8,
    elevation: 6,
  },
  footerInner: {
    maxWidth: 1200, alignSelf: 'center', width: '100%',
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  footerText: { ...F, color: '#6B7280' },

  actionBtn: {
    minWidth: 110, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1
  },
  primaryBtn: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  secondaryBtn: { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB' },
  disabledBtn: { backgroundColor: '#93C5FD', borderColor: '#93C5FD' },
  actionTextPrimary: { ...F, color: '#FFFFFF', fontWeight: '700' },
  actionTextSecondary: { ...F, color: '#111827', fontWeight: '700' },
});
