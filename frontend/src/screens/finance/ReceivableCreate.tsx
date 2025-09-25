// src/screens/receivables/ReceivableCreate.tsx
import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, Pressable, Platform,
  useWindowDimensions, ScrollView, Modal, FlatList, ActivityIndicator
} from 'react-native';
import { useFonts } from 'expo-font';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { api } from '../../api';
import { AuthContext } from '../../providers/AuthContext';

// ===== Paleta de marca (misma que Home) =====
const BRAND = {
  hanBlue: '#4458C7',
  iris: '#5A44C7',
  cyanBlueAzure: '#4481C7',
  maximumBlue: '#44AAC7',
  darkPastelBlue: '#8690C7',
  verdigris: '#43BFB7',

  surfaceTint:  '#F3F6FF',
  surfaceSubtle:'#F8FAFF',
  surfacePanel: '#FCFDFF',
  borderSoft:   '#E2E7FF',
  borderSofter: '#E9EEFF',
  trackSoft:    '#DEE6FB',
} as const;

// Tipos mínimos para clientes
type Customer = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
};

// Fuente
const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

const ActionBtn = ({ title, onPress, kind='primary', disabled }: any) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.btn,
      kind === 'secondary' && styles.btnSecondary,
      disabled && { opacity: 0.6 }
    ]}
  >
    <Text style={[styles.btnText, kind === 'secondary' && styles.btnTextSecondary]}>{title}</Text>
  </Pressable>
);

// ---------- Utils ----------
const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
const toISODate = (d?: Date | null) =>
  d ? `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` : '';

/** -------------------------
 *  Selector de Cliente (Modal)
 *  ------------------------- */
const CustomerPicker = ({
  value,
  displayName,
  onChange,
}: {
  value?: number | null;
  displayName?: string | null;
  onChange: (c: { id: number; name: string }) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<any>(null);

  const canLoadMore = items.length < total;

  const fetchList = async (reset = false) => {
    if (loading) return;
    try {
      setLoading(true);
      const next = reset ? 1 : page + 1;
      const { data } = await api.get<{ total: number; items: Customer[] }>('/customers', {
        params: { page: next, pageSize: 20, q: q || undefined, sort: 'name', dir: 'asc' },
      });
      setTotal(data?.total || 0);
      setPage(next);
      setItems(reset ? (data?.items || []) : [...items, ...(data?.items || [])]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) { setItems([]); setPage(1); setTotal(0); fetchList(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchList(true), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.inputSelect}>
        <View style={{ flex: 1 }}>
          <Text style={styles.labelSmall}>Cliente</Text>
          <Text style={[styles.selectText, !displayName && { color: '#9aa7c2' }]}>
            {displayName || 'Seleccionar cliente…'}
          </Text>
        </View>
        <View style={styles.selectBadge}><Text style={styles.selectBadgeText}>{value ?? '—'}</Text></View>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Seleccionar cliente</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
              <View style={styles.searchBox}>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Buscar por nombre o email"
                  placeholderTextColor="#9aa7c2"
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                {!!q && (
                  <Pressable onPress={() => setQ('')} style={styles.clearBtn}>
                    <Text style={styles.clearText}>×</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <FlatList
              data={items}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onChange({ id: item.id, name: item.name }); setOpen(false); }}
                  style={styles.rowItem}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{item.email || '—'}{item.phone ? ` · ${item.phone}` : ''}</Text>
                  </View>
                  <View style={styles.pickPill}><Text style={styles.pickPillText}>Elegir</Text></View>
                </Pressable>
              )}
              onEndReachedThreshold={0.3}
              onEndReached={() => { if (!loading && canLoadMore) fetchList(false); }}
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await fetchList(true); setRefreshing(false); }}
              ListFooterComponent={<View style={{ paddingVertical: 12, alignItems: 'center' }}>{loading ? <ActivityIndicator /> : null}</View>}
              ListEmptyComponent={!loading ? (<View style={{ alignItems: 'center', padding: 24 }}><Text style={{ ...F, color: '#6B7280' }}>Sin resultados</Text></View>) : null}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default function ReceivableCreate({ navigation }: any) {
  const { logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  // Cliente
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>('');

  // Campos
  const [number, setNumber] = useState('');
  const [dueAtDate, setDueAtDate] = useState<Date | null>(null);   // Date real
  const [showPicker, setShowPicker] = useState(false);             // modal calendario
  const [total, setTotal] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const openPicker = () => setShowPicker(true);
  const closePicker = () => setShowPicker(false);
  const onConfirmDate = (d: Date) => { setDueAtDate(d); closePicker(); };

  const save = async () => {
    const cid = Number(customerId);
    const tot = Number(total);
    if (!cid || tot <= 0) {
      Alert.alert('Faltan datos', 'Cliente y Total son obligatorios (total > 0).');
      return;
    }

    try {
      setSaving(true);
      await api.post('/receivables', {
        customerId: cid,
        number: number || undefined,
        // Enviamos fecha como YYYY-MM-DD (sin hora)
        dueAt: dueAtDate ? toISODate(dueAtDate) : undefined,
        total: tot,
        notes: notes || undefined,
      });
      Alert.alert('Listo', 'Cuenta por cobrar creada.');
      navigation.goBack();
    } catch (e: any) {
      if (e?.response?.status === 401) logout();
      const msg = e?.response?.data || e?.message || 'No se pudo crear';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.surfaceTint }}>
      {/* Header con acciones */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Nueva cuenta por cobrar</Text>
        <View style={styles.topActions}>
          <ActionBtn title="Cancelar" kind="secondary" onPress={() => navigation.goBack()} disabled={saving} />
          <ActionBtn title={saving ? 'Guardando...' : 'Guardar'} onPress={save} disabled={saving} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.container, isWide && styles.containerWide]}>
        {/* Columna izquierda: Formulario */}
        <View style={[styles.col, isWide && styles.colLeft]}>
          <View style={styles.card}>
            {/* Selector de cliente */}
            <CustomerPicker
              value={customerId ?? undefined}
              displayName={customerName}
              onChange={(c) => { setCustomerId(c.id); setCustomerName(c.name); }}
            />

            {/* Grid 2 cols en wide */}
            <View style={[styles.row2, !isWide && { gap: 10, marginTop: 12 }]}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Número (opcional)</Text>
                <TextInput
                  value={number}
                  onChangeText={setNumber}
                  placeholder="FAC-000123"
                  style={styles.input}
                  placeholderTextColor="#9aa7c2"
                />
              </View>

              {/* --- Fecha con minicalendario + quitar --- */}
              <View style={styles.flex1}>
                <Text style={styles.label}>Vence</Text>

                {Platform.OS !== 'web' ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable style={[styles.input, styles.dateInput]} onPress={openPicker}>
                        <Text style={[F, { color: dueAtDate ? '#0f172a' : '#9aa7c2', fontSize: 16 }]}>
                          {dueAtDate ? toISODate(dueAtDate) : 'Seleccionar fecha'}
                        </Text>
                        <Text style={[F, styles.calendarGlyph]} aria-hidden>📅</Text>
                      </Pressable>

                      {dueAtDate && (
                        <Pressable onPress={() => setDueAtDate(null)} style={styles.clearDateBtn}>
                          <Text style={[F, styles.clearDateText]}>Quitar</Text>
                        </Pressable>
                      )}
                    </View>

                    <DateTimePickerModal
                      isVisible={showPicker}
                      mode="date"
                      display={Platform.OS === 'android' ? 'calendar' : 'inline'}
                      date={dueAtDate || new Date()}
                      minimumDate={new Date()}            // <- mínimo hoy (quita esta línea si permites pasado)
                      onConfirm={onConfirmDate}
                      onCancel={closePicker}
                    />
                  </>
                ) : (
                  // WEB: input nativo de fecha con botón Quitar
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {/* @ts-ignore: RNW permite elementos DOM en web */}
                    <input
                      type="date"
                      value={dueAtDate ? toISODate(dueAtDate) : ''}
                      min={toISODate(new Date())}          // <- mínimo hoy (quita si no lo quieres)
                      onChange={(e: any) => {
                        const v = e?.target?.value as string;
                        setDueAtDate(v ? new Date(v) : null);
                      }}
                      style={styles.webDateInput as any}
                    />
                    {dueAtDate && (
                      <Pressable onPress={() => setDueAtDate(null)} style={styles.clearDateBtn}>
                        <Text style={[F, styles.clearDateText]}>Quitar</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Total destacado */}
            <View style={styles.field}>
              <Text style={styles.label}>Total</Text>
              <TextInput
                value={total}
                onChangeText={setTotal}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={[styles.input, styles.totalInput]}
                placeholderTextColor="#9aa7c2"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notas (opcional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Observaciones"
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                multiline
                placeholderTextColor="#9aa7c2"
              />
            </View>
          </View>
        </View>

        {/* Columna derecha: Resumen */}
        <View style={[styles.col, isWide && styles.colRight]}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Cliente</Text><Text style={styles.summaryValue}>{customerName || '—'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>ID Cliente</Text><Text style={styles.summaryValue}>{customerId ?? '—'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Número</Text><Text style={styles.summaryValue}>{number || '—'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Vence</Text><Text style={styles.summaryValue}>{toISODate(dueAtDate) || '—'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total</Text><Text style={[styles.summaryValue, styles.summaryStrong]}>{total || '0.00'}</Text></View>
            <View style={[styles.divider, { marginTop: 8 }]} />
            <Text style={styles.helper}>Verifica los datos antes de guardar. Podrás editarlos luego.</Text>
          </View>

          <View style={[styles.card, { gap: 6 }]}>
            <Text style={styles.sectionTitle}>Tips</Text>
            <Text style={styles.tip}>• Busca por nombre o email.</Text>
            <Text style={styles.tip}>• Define fecha de vencimiento para alertas.</Text>
            <Text style={styles.tip}>• Escribe notas claras para el cobro.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout general
  container: { padding: 16, gap: 16 },
  containerWide: { maxWidth: 1200, width: '100%', alignSelf: 'center', flexDirection: 'row' },
  col: { flex: 1, gap: 16, minWidth: 0 },
  colLeft: { flex: 2 },
  colRight: { flex: 1, minWidth: 300 },

  // Top bar
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.surfacePanel,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  title: { ...F, fontSize: 18, color: BRAND.hanBlue },
  topActions: { flexDirection: 'row', gap: 8 },

  // Card
  card: {
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderTopWidth: 3,
    borderTopColor: BRAND.hanBlue,
    shadowColor: BRAND.hanBlue,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: Platform.select({ android: 3, default: 0 }),
  },

  sectionTitle: { ...F, fontSize: 16, color: '#0f172a', marginBottom: 8 },

  // Campo "select" de cliente
  inputSelect: {
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BRAND.surfacePanel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  labelSmall: { ...F, color: '#6B7280', fontSize: 12, marginBottom: 2 },
  selectText: { ...F, fontSize: 16, color: '#0f172a' },
  selectBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#E9EDFF', borderRadius: 999, borderWidth: 1, borderColor: BRAND.borderSoft
  },
  selectBadgeText: { ...F, color: BRAND.hanBlue, fontSize: 12 },

  // Form
  field: { marginBottom: 12 },
  label: { ...F, color: '#0f172a', marginBottom: 6 },
  row2: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },

  input: {
    ...F,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    backgroundColor: BRAND.surfacePanel,
    fontSize: 16
  },
  totalInput: {
    fontSize: 20,
    paddingVertical: 12,
    borderColor: BRAND.cyanBlueAzure,
    shadowColor: BRAND.cyanBlueAzure,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: Platform.select({ android: 2, default: 0 }),
  },

  // Date input (presionable)
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  calendarGlyph: { fontSize: 16, color: '#0f172a' },

  // Botón quitar fecha
  clearDateBtn: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: BRAND.borderSoft,
    backgroundColor: BRAND.surfacePanel
  },
  clearDateText: { color: '#111827' },

  // Web: input nativo
  webDateInput: {
    height: 42, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1, borderColor: BRAND.borderSoft, backgroundColor: BRAND.surfacePanel,
    fontFamily: (F as any)?.fontFamily || 'sans-serif', fontSize: 16, color: '#0f172a'
  },

  // Resumen
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { ...F, color: '#6B7280' },
  summaryValue: { ...F, color: '#0f172a' },
  summaryStrong: { fontWeight: Platform.OS === 'ios' ? '600' : 'bold', color: BRAND.hanBlue },
  helper: { ...F, marginTop: 8, color: '#6B7280', fontSize: 12 },
  divider: { height: 1, backgroundColor: BRAND.borderSofter },

  // Botones
  btn: {
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BRAND.hanBlue,
    borderWidth: 1,
    borderColor: BRAND.hanBlue
  },
  btnSecondary: {
    backgroundColor: BRAND.surfacePanel,
    borderWidth: 1,
    borderColor: BRAND.borderSoft
  },
  btnText: { ...F, color: '#FFFFFF' },
  btnTextSecondary: { ...F, color: '#111827' },

  // Modal (selector clientes)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: BRAND.surfacePanel,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: BRAND.borderSoft,
    borderTopWidth: 3,
    borderWidth: 1,
    paddingBottom: 8,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderSoft,
  },
  modalTitle: { ...F, fontSize: 16, color: BRAND.hanBlue, flex: 1 },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND.surfaceSubtle, borderWidth: 1, borderColor: BRAND.borderSoft
  },
  modalCloseText: { ...F, fontSize: 18, lineHeight: 18, color: '#111827' },

  // Lista en modal
  searchBox: { position: 'relative', flex: 1 },
  searchInput: {
    ...F,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10, paddingHorizontal: 12, height: 42,
    backgroundColor: BRAND.surfacePanel, fontSize: 16
  },
  clearBtn: {
    position: 'absolute', right: 8, top: 6, width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#E9EDFF', borderWidth: 1, borderColor: BRAND.borderSoft
  },
  clearText: { ...F, fontSize: 18, lineHeight: 18, color: '#374151' },

  rowItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomColor: BRAND.borderSofter, borderBottomWidth: 1, gap: 10
  },
  rowTitle: { ...F, fontSize: 16, color: '#111827' },
  rowSub: { ...F, color: '#6B7280', fontSize: 12 },

  avatar: {
    width: 36, height: 36, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E9EDFF', borderWidth: 1, borderColor: BRAND.borderSoft
  },
  avatarText: { ...F, color: BRAND.hanBlue, fontSize: 12 },

  pickPill: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: BRAND.hanBlue, borderRadius: 999 },
  pickPillText: { ...F, color: '#fff', fontSize: 12 },
});
