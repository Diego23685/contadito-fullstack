import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, StyleSheet, RefreshControl,
  ActivityIndicator, Pressable, useWindowDimensions, Platform
} from 'react-native';
import { useFonts } from 'expo-font';
import { api } from '../../api';
import { AuthContext } from '../../providers/AuthContext';

type Item = {
  invoiceId: number;
  number: string | null;
  customerName: string | null;
  issuedAt?: string | null;
  dueAt?: string | null;
  status: 'issued' | 'paid' | string;
  total: number;
  paid: number;
  dueAmount: number;
};
type Resp = { total: number; page: number; pageSize: number; items: Item[] };

const PAGE_SIZE = 12;

// ===== Paleta consistente con Home =====
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

const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

const currency = (v?: number) =>
  new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 2 }).format(Number(v ?? 0));

const Chip = ({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>
);

const ActionBtn = ({ title, onPress, kind = 'primary', disabled }: {
  title: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.btn,
      kind === 'secondary' && styles.btnSecondary,
      kind === 'danger' && styles.btnDanger,
      disabled && styles.btnDisabled
    ]}
  >
    <Text style={[
      styles.btnText,
      kind === 'secondary' && styles.btnTextSecondary,
      (kind === 'primary' || kind === 'danger') && styles.btnTextPrimary
    ]}>{title}</Text>
  </Pressable>
);

const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export default function ReceivablesList({ navigation }: any) {
  const { logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const columns = width >= 1280 ? 2 : 1;
  const isGrid = columns > 1;

  useFonts({ Apoka: require('../../../assets/fonts/apokaregular.ttf') });

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'issued' | 'paid'>('all');

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const debounceRef = useRef<any>(null);

  // Pago modal (simple overlay)
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Item | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'cash'|'card'|'transfer'|'other'>('cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySaving, setPaySaving] = useState(false);

  const openPay = (it: Item) => {
    setPayTarget(it);
    setPayAmount(String(it.dueAmount || 0));
    setPayMethod('cash');
    setPayRef('');
    setPayNotes('');
    setPayOpen(true);
  };
  const closePay = () => {
    if (paySaving) return;
    setPayOpen(false);
    setPayTarget(null);
  };
  const savePay = async () => {
    if (!payTarget) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
      return;
    }
    if (amount > (payTarget.dueAmount || 0) + 0.0001) {
      Alert.alert('Excede saldo', 'El abono no puede superar el monto pendiente.');
      return;
    }
    try {
      setPaySaving(true);
      await api.post('/receivables/payments', {
        invoiceId: payTarget.invoiceId,
        amount,
        method: payMethod,
        reference: payRef || undefined,
        notes: payNotes || undefined,
      });
      closePay();
      await load(true);
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo registrar el pago';
      Alert.alert('Error', String(msg));
    } finally {
      setPaySaving(false);
    }
  };

  const serverParams = useMemo(() => ({
    q: q || undefined,
    status
  }), [q, status]);

  const load = useCallback(async (reset: boolean) => {
    if (loading) return;
    try {
      setLoading(true);
      const nextPage = reset ? 1 : page + 1;
      const res = await api.get<Resp>('/receivables', {
        params: { page: nextPage, pageSize: PAGE_SIZE, ...serverParams }
      });
      setTotal(res.data.total || 0);
      setPage(nextPage);
      setItems(reset ? res.data.items : [...items, ...res.data.items]);
    } catch (e: any) {
      if (e?.response?.status === 401) logout();
      const msg = e?.response?.data || e?.message || 'Error cargando CxC';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  }, [loading, page, items, logout, serverParams]);

  useEffect(() => { load(true); }, []); // primera carga

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(true), 350);
    return () => clearTimeout(debounceRef.current);
  }, [q, status]); // eslint-disable-line

  useEffect(() => {
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };
  const onEndReached = () => {
    if (!loading && items.length < total) load(false);
  };

  const renderItem = ({ item }: { item: Item }) => {
    const tag =
      item.status === 'paid' ? { label: 'Pagada', style: styles.badgeSuccess } :
      item.dueAmount <= 0.0001 ? { label: 'S/Límite', style: styles.badgeNeutral } :
      (() => {
        let days = 0;
        if (item.dueAt) {
          const due = new Date(item.dueAt).getTime();
          const now = Date.now();
          days = Math.floor((due - now) / (1000 * 60 * 60 * 24));
        }
        if (!item.dueAt) return { label: 'Sin venc.', style: styles.badgeInfo };
        if (days < 0) return { label: 'Vencido', style: styles.badgeDanger };
        if (days === 0) return { label: 'Hoy', style: styles.badgeWarning };
        if (days <= 3) return { label: 'Pronto', style: styles.badgeOrange };
        return { label: 'Esta semana', style: styles.badgeInfo };
      })();

    if (isGrid) {
      return (
        <Card style={{ flex: 1, margin: 6 }}>
          <View style={{ gap: 6 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              #{item.number || item.invoiceId} · {item.customerName || 'Cliente'}
            </Text>
            <Text style={styles.itemSub}>
              Total {currency(item.total)} · Pagado {currency(item.paid)} · Pendiente {currency(item.dueAmount)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.badge, tag.style]}>{tag.label}</Text>
              <Text style={[styles.badge, styles.badgeOutline]}>{currency(item.total)} total</Text>
              {item.dueAmount > 0 && (
                <ActionBtn title="Abonar" kind="secondary" onPress={() => openPay(item)} />
              )}
            </View>
          </View>
        </Card>
      );
    }

    return (
      <View style={styles.rowItem}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            #{item.number || item.invoiceId} · {item.customerName || 'Cliente'}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            Total {currency(item.total)} · Pagado {currency(item.paid)} · Pendiente {currency(item.dueAmount)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Text style={[styles.badge, tag.style]}>{tag.label}</Text>
          {item.dueAmount > 0 && (
            <ActionBtn title="Abonar" kind="secondary" onPress={() => openPay(item)} />
          )}
        </View>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.toolbarContainer}>
      <View style={styles.toolbarRow}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por número o cliente"
            placeholderTextColor="#9aa7c2"
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
          />
          {!!q && (
            <Pressable onPress={() => setQ('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          )}
        </View>

        <ActionBtn title="Nueva CxC" onPress={() => navigation.navigate('ReceivableCreate')} />
      </View>

      <View style={styles.toolbarRow}>
        <Chip label="Todas"      active={status === 'all'}    onPress={() => setStatus('all')} />
        <Chip label="Pendientes" active={status === 'issued'} onPress={() => setStatus('issued')} />
        <Chip label="Pagadas"    active={status === 'paid'}   onPress={() => setStatus('paid')} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{items.length} de {total} cuentas</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(c) => String(c.invoiceId)}
        numColumns={columns}
        key={columns}
        columnWrapperStyle={isGrid ? { paddingHorizontal: 8 } : undefined}
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.3}
        onEndReached={onEndReached}
        ListFooterComponent={
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            {loading ? <ActivityIndicator /> : (items.length < total ? <ActionBtn title="Cargar más" kind="secondary" onPress={() => load(false)} /> : null)}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💳</Text>
              <Text style={styles.emptyTitle}>No hay cuentas</Text>
              <Text style={styles.emptyText}>Crea tu primera cuenta por cobrar.</Text>
              <View style={{ height: 8 }} />
              <ActionBtn title="Nueva CxC" onPress={() => navigation.navigate('ReceivableCreate')} />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Modal pago */}
      {payOpen && (
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Registrar pago</Text>
            <Text style={styles.muted}>
              Factura #{payTarget?.number || payTarget?.invoiceId} · Pendiente {currency(payTarget?.dueAmount)}
            </Text>

            <View style={{ height: 10 }} />

            <Text style={styles.muted}>Monto</Text>
            <TextInput
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#9aa7c2"
              style={styles.input}
            />

            <View style={{ height: 8 }} />

            <Text style={styles.muted}>Método</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['cash','card','transfer','other'] as const).map(m => (
                <Pressable
                  key={m}
                  onPress={() => setPayMethod(m)}
                  style={[styles.chip, payMethod===m && styles.chipActive]}
                >
                  <Text style={[styles.chipText, payMethod===m && styles.chipTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 8 }} />

            <Text style={styles.muted}>Referencia (opcional)</Text>
            <TextInput
              value={payRef}
              onChangeText={setPayRef}
              placeholder="#transacción, nota..."
              placeholderTextColor="#9aa7c2"
              style={styles.input}
            />

            <View style={{ height: 8 }} />

            <Text style={styles.muted}>Notas (opcional)</Text>
            <TextInput
              value={payNotes}
              onChangeText={setPayNotes}
              placeholder="comentarios"
              placeholderTextColor="#9aa7c2"
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              multiline
            />

            <View style={{ height: 14 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <ActionBtn title="Cancelar" kind="secondary" onPress={closePay} disabled={paySaving} />
              <ActionBtn title={paySaving ? 'Guardando...' : 'Guardar'} onPress={savePay} disabled={paySaving} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fondo app con tinte de marca
  screen: { flex: 1, backgroundColor: BRAND.surfaceTint },

  // Toolbar / header de la lista
  toolbarContainer: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 10,
    backgroundColor: BRAND.surfaceTint
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  toolbarLabel: { ...F, color: '#6B7280' },

  // Buscador
  searchBox: { position: 'relative', flex: 1 },
  searchInput: {
    ...F,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingHorizontal: 12, height: 42,
    backgroundColor: BRAND.surfacePanel, fontSize: 16
  },
  clearBtn: {
    position: 'absolute', right: 8, top: 6, width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 15, backgroundColor: BRAND.surfaceSubtle,
    borderWidth: 1, borderColor: BRAND.borderSoft
  },
  clearText: { ...F, fontSize: 18, lineHeight: 18, color: '#374151' },

  // Chips de filtro
  chip: {
    borderWidth: 1, borderColor: BRAND.borderSoft,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, backgroundColor: BRAND.surfacePanel
  },
  chipActive: { backgroundColor: '#E9EDFF', borderColor: BRAND.hanBlue },
  chipText: { ...F, color: '#374151' },
  chipTextActive: { ...F, color: BRAND.hanBlue },

  // Botones
  btn: {
    minWidth: 96, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: BRAND.hanBlue, borderWidth: 1, borderColor: BRAND.hanBlue
  },
  btnSecondary: { backgroundColor: BRAND.surfacePanel, borderWidth: 1, borderColor: BRAND.borderSoft },
  btnDanger: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...F },
  btnTextPrimary: { ...F, color: '#FFFFFF' },
  btnTextSecondary: { ...F, color: '#111827' },

  // Cards / items
  card: {
    flex: 1,
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: Platform.select({ android: 2, default: 0 }),
  },

  itemTitle: { ...F, fontSize: 16, color: '#0f172a' },
  itemSub: { ...F, color: '#6B7280', fontSize: 12 },

  // Badges coherentes con marca
  badge: { ...F, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E9EDFF', color: BRAND.hanBlue },
  badgeOutline: { backgroundColor: BRAND.surfacePanel, borderWidth: 1, borderColor: BRAND.borderSoft, color: '#374151' },
  badgeInfo:    { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  badgeSuccess: { backgroundColor: '#DCFCE7', color: '#065F46' },
  badgeNeutral: { backgroundColor: '#E5E7EB', color: '#1F2937' },
  badgeDanger:  { backgroundColor: '#FEE2E2', color: '#991B1B' },
  badgeWarning: { backgroundColor: '#FEF3C7', color: '#92400E' },
  badgeOrange:  { backgroundColor: '#FFEDD5', color: '#9A3412' },

  // Lista en modo fila
  rowItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderBottomColor: BRAND.borderSofter, borderBottomWidth: 1,
    backgroundColor: BRAND.surfacePanel, gap: 10
  },
  rowTitle: { ...F, fontSize: 16, color: '#0f172a' },
  rowSub: { ...F, color: '#6B7280', fontSize: 12 },

  // Meta / vacío
  metaRow: { paddingHorizontal: 12, paddingBottom: 8 },
  metaText: { ...F, color: '#6B7280' },

  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { ...F, fontSize: 40 },
  emptyTitle: { ...F, fontSize: 18, color: '#0f172a' },
  emptyText: { ...F, color: '#6B7280', textAlign: 'center' },

  // Inputs generales (modal)
  input: {
    ...F,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 10,
    paddingHorizontal: 12, minHeight: 42, backgroundColor: BRAND.surfacePanel, fontSize: 16
  },

  // Modal de pago
  modalWrap: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: {
    width: '100%', maxWidth: 520,
    backgroundColor: BRAND.surfacePanel,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    borderTopWidth: 3, borderTopColor: BRAND.hanBlue,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },
  modalTitle: { ...F, fontSize: 18, color: BRAND.hanBlue },
  muted: { ...F, color: '#6B7280' },
});
