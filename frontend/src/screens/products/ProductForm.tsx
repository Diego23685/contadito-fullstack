// src/screens/products/ProductForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Switch, Alert, StyleSheet, ScrollView,
  Pressable, ActivityIndicator, useWindowDimensions, Platform, Image
} from 'react-native';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
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
  images?: string[];
};

const BRAND = {
  primary600:    '#2563EB',
  purple600:     '#6D28D9',
  hanBlue:       '#4458C7',

  surfaceTint:   '#EEF2FF',
  surfaceSubtle: '#F7F9FF',
  surfacePanel:  '#FFFFFF',
  borderSoft:    '#E6EBFF',
  borderSofter:  '#EDF1FF',

  cardShadow: 'rgba(37, 99, 235, 0.16)',
} as const;

/** ===== Helpers de formato/validación numérica ===== */
const sanitizeDecimalInput = (raw: string) => {
  // Acepta solo dígitos y un punto decimal. Convierte coma a punto.
  let s = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  return s;
};
const sanitizeIntegerInput = (raw: string) => raw.replace(/\D/g, '');

const currency = (n: number | null | undefined) => {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(v);
  } catch {
    return `C$ ${v.toFixed(2)}`;
  }
};

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
  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

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
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [urlToAdd, setUrlToAdd] = useState('');

  const [errors, setErrors] = useState<{ [k: string]: string | null }>({});

  // ===== Inventario (UI edición) =====
  const [currentQty, setCurrentQty] = useState<number | null>(null);
  const [inQty, setInQty] = useState<string>('');
  const [inCost, setInCost] = useState<string>('');
  const [outQty, setOutQty] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // ===== Stock inicial (solo al crear) =====
  const [initQty, setInitQty] = useState<string>('');               // cantidad inicial
  const [initCost, setInitCost] = useState<string>('');             // costo unitario opcional
  const [initWarehouseId, setInitWarehouseId] = useState<string>(''); // almacén opcional

  // ===== Avisos "solo números" =====
  const [numHints, setNumHints] = useState<{ [k: string]: boolean }>({});
  const flashNumHint = (key: string) => {
    setNumHints(h => ({ ...h, [key]: true }));
    setTimeout(() => setNumHints(h => ({ ...h, [key]: false })), 1400);
  };

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
        setImages(p.images ?? (p as any).Images ?? []);
      } catch (e: any) {
        Alert.alert('Error', String(e?.response?.data || e?.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  useEffect(() => { fetchStock(); }, [id]);

  const numPrice = useMemo(() => toNumber(listPrice), [listPrice]);
  const numCost = useMemo(() => (stdCost === '' ? null : toNumber(stdCost)), [stdCost]);
  const profit = useMemo(() => (numCost == null ? null : numPrice - (numCost ?? 0)), [numPrice, numCost]);
  const marginPct = useMemo(
    () => (numCost == null || numPrice === 0 ? null : ((numPrice - (numCost ?? 0)) / numPrice) * 100),
    [numPrice, numCost]
  );

  const validate = () => {
    const next: typeof errors = {};
    if (!isEdit && !sku.trim()) next.sku = 'Requerido al crear';
    if (!name.trim()) next.name = 'Requerido';
    if (numPrice < 0) next.listPrice = 'No puede ser negativo';
    const nc = stdCost === '' ? null : numCost;
    if (stdCost !== '' && (nc ?? 0) < 0) next.stdCost = 'No puede ser negativo';
    if (isService && trackStock) next.trackStock = 'Un servicio no debería controlar stock';

    // Validación básica de stock inicial (opcional)
    if (!isEdit && !isService && trackStock && initQty.trim() !== '') {
      const q0 = toNumber(initQty);
      if (!(q0 > 0)) next.initQty = 'La cantidad inicial debe ser mayor a 0';
      if (initCost.trim() !== '' && toNumber(initCost) < 0) next.initCost = 'Costo inválido';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ====== Subida de imagen ======
  async function uploadImage(uri: string): Promise<string> {
    const form = new FormData();

    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      form.append('file', blob, `product_${Date.now()}.jpg`);
    } else {
      form.append('file', {
        uri,
        name: `product_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);
    }

    const { data } = await api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url ?? data.Location ?? data.path;
  }

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Autoriza acceso a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled) return;

    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    try {
      setUploadingImg(true);
      const url = await uploadImage(asset.uri);
      setImages(prev => [url, ...prev]);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo subir la imagen'));
    } finally {
      setUploadingImg(false);
    }
  };

  const addByUrl = () => {
    const u = urlToAdd.trim();
    if (!u) return;
    setImages(prev => [u, ...prev]);
    setUrlToAdd('');
  };

  const removeImage = (u: string) => {
    setImages(prev => prev.filter(x => x !== u));
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
        images,
      };

      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        Alert.alert('Listo', 'Producto actualizado');
        navigation.goBack();
        return;
      }

      // --- Creación ---
      const { data: created } = await api.post('/products', { sku: sku.trim(), ...payload });
      const newId: number = created?.id ?? created?.Id ?? created?.productId ?? created?.ProductId;
      const productId = Number(newId);

      // --- Stock inicial (si aplica) ---
      const qty0 = initQty.trim() === '' ? 0 : toNumber(initQty);
      if (!isService && trackStock && Number.isFinite(productId) && qty0 > 0) {
        const cost0 = initCost.trim() === '' ? null : toNumber(initCost);
        const wh = initWarehouseId.trim() === '' ? null : Number(initWarehouseId);

        await api.post('/inventory/adjust', {
          productId,
          warehouseId: wh,
          movementType: 'in',
          quantity: qty0,
          unitCost: cost0,
          reference: 'STOCK-INICIAL',
          reason: 'Carga inicial de inventario',
        });
      }

      Alert.alert('Listo', 'Producto creado');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo guardar'));
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => navigation.goBack();

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
      {/* Top bar (lechoso + sutil blur en web) */}
      <View style={styles.topBar}>
        <Text style={styles.title}>
          {isEdit ? 'Editar producto' : 'Nuevo producto'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={cancel} style={[styles.actionBtn, styles.secondaryBtn]}>
            <Text style={styles.actionTextSecondary}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={loading || (!isEdit && !sku)}
            style={[styles.actionBtn, (!loading && (isEdit || !!sku) ? styles.primaryBtn : styles.disabledBtn)]}
          >
            {loading ? <ActivityIndicator /> : <Text style={styles.actionTextPrimary}>Guardar</Text>}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.container, isWide && styles.containerWide]}>
        {/* Columna izquierda */}
        <View style={[styles.col, isWide && styles.colLeft]}>
          <Card>
            <SectionTitle>Ficha de producto</SectionTitle>

            {/* Badges de estado visual (producto/servicio) */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.badge, isService ? styles.badgePurple : styles.badgeBlue]}>
                {isService ? 'Servicio' : 'Producto'}
              </Text>
              {!!name && <Text style={[styles.badge, styles.badgeOutline]}>{name.length} caracteres</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>SKU {isEdit ? '(no editable)' : ''}</Text>
              <TextInput
                style={[styles.input, isEdit && styles.disabled]}
                value={sku}
                onChangeText={setSku}
                editable={!isEdit}
                placeholder="Ej. CAF-001"
                placeholderTextColor="#9aa7c2"
                autoCapitalize="characters"
              />
              {!!errors.sku && <Text style={styles.error}>{errors.sku}</Text>}
              {!isEdit && <HelperText>Identificador único dentro del tenant.</HelperText>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Café molido 500g"
                placeholderTextColor="#9aa7c2"
              />
              {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}
            </View>

            <View style={styles.row2}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Unidad</Text>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="unidad, kg, lt"
                  placeholderTextColor="#9aa7c2"
                />
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
                placeholderTextColor="#9aa7c2"
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
                  style={[styles.input, styles.priceInput]}
                  // @ts-ignore
                  inputMode="decimal"
                  keyboardType={Platform.select({ ios: 'decimal-pad', android: 'decimal-pad', default: 'numeric' })}
                  value={listPrice}
                  onChangeText={(t) => {
                    const s = sanitizeDecimalInput(t);
                    if (t !== s) flashNumHint('listPrice');
                    setListPrice(s);
                  }}
                  placeholder="0.00"
                  placeholderTextColor="#9aa7c2"
                />
                {numHints.listPrice && <Text style={styles.numHint}>Solo números y un punto decimal.</Text>}
                {!!errors.listPrice && <Text style={styles.error}>{errors.listPrice}</Text>}
                <HelperText>Precio público sugerido.</HelperText>
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Costo estándar (C$)</Text>
                <TextInput
                  style={styles.input}
                  // @ts-ignore
                  inputMode="decimal"
                  keyboardType={Platform.select({ ios: 'decimal-pad', android: 'decimal-pad', default: 'numeric' })}
                  placeholder="Opcional"
                  value={stdCost}
                  onChangeText={(t) => {
                    const s = sanitizeDecimalInput(t);
                    if (t !== s) flashNumHint('stdCost');
                    setStdCost(s);
                  }}
                  placeholderTextColor="#9aa7c2"
                />
                {numHints.stdCost && <Text style={styles.numHint}>Solo números y un punto decimal.</Text>}
                {!!errors.stdCost && <Text style={styles.error}>{errors.stdCost}</Text>}
                <HelperText>Úsalo para estimar margen. Déjalo vacío si no aplica.</HelperText>
              </View>
            </View>
          </Card>
        </View>

        {/* Columna derecha */}
        <View style={[styles.col, isWide && styles.colRight]}>
          {/* ===== Imágenes ===== */}
          <Card>
            <SectionTitle>Imágenes</SectionTitle>

            {/* Controles */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pressable
                onPress={pickAndUpload}
                style={[styles.actionBtn, styles.secondaryBtn]}
              >
                <Text style={styles.actionTextSecondary}>{uploadingImg ? 'Subiendo…' : 'Desde galería'}</Text>
              </Pressable>

              <View style={styles.urlRow}>
                <TextInput
                  style={[styles.input, styles.urlInput]}
                  placeholder="Pegar URL de imagen"
                  placeholderTextColor="#9aa7c2"
                  value={urlToAdd}
                  onChangeText={setUrlToAdd}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={addByUrl}
                  style={[styles.actionBtn, styles.primaryBtn, styles.addBtn]}
                >
                  <Text style={styles.actionTextPrimary}>Agregar</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ height: 10 }} />

            {images.length === 0 ? (
              <Text style={styles.helper}>Aún no hay imágenes. Agrega al menos una para mostrarla en la tienda.</Text>
            ) : (
              <View style={styles.thumbGrid}>
                {images.map(u => (
                  <View key={u} style={styles.thumbItem}>
                    <View style={styles.thumbBox}>
                      <Image source={{ uri: u }} style={styles.thumbImg} />
                    </View>
                    <Pressable onPress={() => removeImage(u)} style={{ marginTop: 6, alignItems: 'center' }}>
                      <Text style={styles.removeTxt}>Quitar</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* ===== Resumen ===== */}
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

          {/* ===== Stock inicial (solo creación) ===== */}
          {!isEdit && !isService && trackStock && (
            <Card>
              <SectionTitle>Stock inicial (opcional)</SectionTitle>

              <Text style={[styles.label, { marginTop: 6 }]}>Almacén (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="ID de almacén (numérico) o vacío"
                placeholderTextColor="#9aa7c2"
                value={initWarehouseId}
                onChangeText={(t) => {
                  const s = sanitizeIntegerInput(t);
                  if (t !== s) flashNumHint('initWarehouseId');
                  setInitWarehouseId(s);
                }}
                keyboardType="number-pad"
                // @ts-ignore
                inputMode="numeric"
              />
              {numHints.initWarehouseId && <Text style={styles.numHint}>Solo dígitos (número entero).</Text>}

              <View style={styles.row2}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Cantidad</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 10"
                    placeholderTextColor="#9aa7c2"
                    value={initQty}
                    onChangeText={(t) => {
                      const s = sanitizeDecimalInput(t);
                      if (t !== s) flashNumHint('initQty');
                      setInitQty(s);
                    }}
                    keyboardType="decimal-pad"
                    // @ts-ignore
                    inputMode="decimal"
                  />
                  {numHints.initQty && <Text style={styles.numHint}>Solo números y un punto decimal.</Text>}
                  {!!errors.initQty && <Text style={styles.error}>{errors.initQty}</Text>}
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Costo unitario (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 120.50"
                    placeholderTextColor="#9aa7c2"
                    value={initCost}
                    onChangeText={(t) => {
                      const s = sanitizeDecimalInput(t);
                      if (t !== s) flashNumHint('initCost');
                      setInitCost(s);
                    }}
                    keyboardType="decimal-pad"
                    // @ts-ignore
                    inputMode="decimal"
                  />
                  {numHints.initCost && <Text style={styles.numHint}>Solo números y un punto decimal.</Text>}
                  {!!errors.initCost && <Text style={styles.error}>{errors.initCost}</Text>}
                </View>
              </View>

              <HelperText>
                Si ingresas una cantidad, al guardar se registrará una entrada con referencia <Text style={{fontWeight:'700'}}>STOCK-INICIAL</Text>.
              </HelperText>
            </Card>
          )}

          {/* ===== Inventario (solo edición) ===== */}
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
                placeholderTextColor="#9aa7c2"
                value={warehouseId}
                onChangeText={(t) => {
                  const s = sanitizeIntegerInput(t);
                  if (t !== s) flashNumHint('warehouseId');
                  setWarehouseId(s);
                }}
                keyboardType="number-pad"
                // @ts-ignore
                inputMode="numeric"
              />
              {numHints.warehouseId && <Text style={styles.numHint}>Solo dígitos (número entero).</Text>}
              <HelperText>Si lo dejas vacío, se registra sin almacén específico.</HelperText>

              <Text style={[styles.label, { marginTop: 12 }]}>Referencia (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. AJUSTE-001"
                placeholderTextColor="#9aa7c2"
                value={reference}
                onChangeText={setReference}
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Motivo (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Comentario del ajuste"
                placeholderTextColor="#9aa7c2"
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
                    placeholderTextColor="#9aa7c2"
                    value={inQty}
                    onChangeText={(t) => {
                      const s = sanitizeDecimalInput(t);
                      if (t !== s) flashNumHint('inQty');
                      setInQty(s);
                    }}
                    keyboardType="decimal-pad"
                    // @ts-ignore
                    inputMode="decimal"
                  />
                  {numHints.inQty && <Text style={styles.numHint}>Solo números y un punto decimal.</Text>}
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Costo unitario (opcional)"
                    placeholderTextColor="#9aa7c2"
                    value={inCost}
                    onChangeText={(t) => {
                      const s = sanitizeDecimalInput(t);
                      if (t !== s) flashNumHint('inCost');
                      setInCost(s);
                    }}
                    keyboardType="decimal-pad"
                    // @ts-ignore
                    inputMode="decimal"
                  />
                  {numHints.inCost && <Text style={styles.numHint}>Solo números y un punto decimal.</Text>}
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
                  placeholderTextColor="#9aa7c2"
                  value={outQty}
                  onChangeText={(t) => {
                    const s = sanitizeDecimalInput(t);
                    if (t !== s) flashNumHint('outQty');
                    setOutQty(s);
                  }}
                  keyboardType="decimal-pad"
                  // @ts-ignore
                  inputMode="decimal"
                />
                {numHints.outQty && <Text style={styles.numHint}>Solo números y un punto decimal.</Text>}
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

      {/* Footer (lechoso + blur en web) */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <Text style={styles.footerText}>{isEdit ? `Editando: ${name || '(sin nombre)'}` : 'Creando nuevo producto'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={cancel} style={[styles.actionBtn, styles.secondaryBtn]}>
              <Text style={styles.actionTextSecondary}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={loading || (!isEdit && !sku)}
              style={[styles.actionBtn, (!loading && (isEdit || !!sku) ? styles.primaryBtn : styles.disabledBtn)]}
            >
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
  screen: { flex: 1, backgroundColor: BRAND.surfaceTint },

  topBar: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1, borderBottomColor: BRAND.borderSoft,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    // @ts-ignore
    backdropFilter: 'saturate(140%) blur(6px)',
  },
  title: { ...F, fontSize: 20, color: BRAND.hanBlue },

  container: { padding: 16, gap: 16 },
  containerWide: { maxWidth: 1200, alignSelf: 'center', width: '100%', flexDirection: 'row' },
  col: { flex: 1, gap: 16 },
  colLeft: { flex: 2 },
  colRight: { flex: 1, minWidth: 320 },

  card: {
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3, borderTopColor: BRAND.hanBlue,
    borderWidth: 0,
    shadowColor: BRAND.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },

  sectionTitle: { ...F, fontSize: 16, color: '#0f172a', marginBottom: 8 },
  field: { marginBottom: 12 },
  label: { ...F, marginBottom: 6, color: '#0f172a' },

  badge: { ...F, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#E9EDFF', color: BRAND.hanBlue },
  badgeBlue: { backgroundColor: '#E0EAFF', color: BRAND.hanBlue },
  badgePurple: { backgroundColor: '#EDE9FE', color: BRAND.purple600 },
  badgeOutline: { backgroundColor: BRAND.surfacePanel, borderWidth: 1, borderColor: BRAND.borderSoft, color: '#374151' },

  input: {
    ...F,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingHorizontal: 12, minHeight: 42, height: 42,
    backgroundColor: BRAND.surfacePanel, fontSize: 16
  },
  priceInput: {
    borderColor: '#93C5FD',
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: Platform.select({ android: 2, default: 0 }),
  },
  disabled: { backgroundColor: BRAND.surfaceSubtle },

  row2: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    borderWidth: 1, borderColor: BRAND.borderSoft, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, backgroundColor: BRAND.surfacePanel
  },
  pillActive: { backgroundColor: '#E9EDFF', borderColor: BRAND.hanBlue },
  pillText: { ...F, color: '#374151' },
  pillTextActive: { ...F, color: BRAND.hanBlue, fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },

  helper: { ...F, marginTop: 6, color: '#6B7280', fontSize: 12 },
  error: { ...F, marginTop: 6, color: '#B91C1C', fontSize: 12 },
  numHint: { ...F, color: '#B45309', fontSize: 12, marginTop: 6 }, // ámbar

  divider: { height: 1, backgroundColor: BRAND.borderSofter, marginVertical: 12 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { ...F, color: '#6B7280' },
  summaryValue: { ...F, color: '#0f172a', fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },
  negative: { color: '#B91C1C' },

  tip: { ...F, color: '#374151', marginBottom: 6 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopWidth: 1, borderTopColor: BRAND.borderSoft,
    shadowColor: BRAND.cardShadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 },
    elevation: 6,
    // @ts-ignore
    backdropFilter: 'saturate(140%) blur(6px)',
  },
  footerInner: {
    maxWidth: 1200, alignSelf: 'center', width: '100%',
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  footerText: { ...F, color: '#6B7280' },

  actionBtn: {
    minWidth: 96,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 0,
    height: 42,
    borderRadius: 10, borderWidth: 1
  },
  primaryBtn: { backgroundColor: BRAND.hanBlue, borderColor: BRAND.hanBlue },
  secondaryBtn: { backgroundColor: BRAND.surfacePanel, borderColor: BRAND.borderSoft },
  disabledBtn: { backgroundColor: '#93C5FD', borderColor: '#93C5FD' },
  actionTextPrimary: { ...F, color: '#FFFFFF' },
  actionTextSecondary: { ...F, color: '#111827' },

  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  urlInput: { flex: 1, minWidth: 0 },
  addBtn: { minWidth: 96, flexShrink: 0 },

  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbItem: { width: 86 },
  thumbBox: {
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: BRAND.borderSoft,
    width: 86, height: 86, backgroundColor: BRAND.surfaceSubtle
  },
  thumbImg: { width: '100%', height: '100%' },
  removeTxt: { ...F, color: '#DC2626', fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },
});
