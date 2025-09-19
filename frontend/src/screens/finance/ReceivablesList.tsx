import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, StyleSheet, RefreshControl,
  ActivityIndicator, Pressable, useWindowDimensions, Platform
} from 'react-native';
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
      kind === 'danger' && styles.btnTextPrimary
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

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'issued' | 'paid'>('all');

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const debounceRef = useRef<any>(null);

  // Pago modal
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

  // auto refresh cada 30s y al cambiar filtros/busqueda con debounce
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
        // calcular days
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.badge, tag.style]}>{tag.label}</Text>
              <Text style={styles.badge}>{currency(item.total)} total</Text>
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
        <Chip label="Todas"   active={status === 'all'}    onPress={() => setStatus('all')} />
        <Chip label="Pendientes" active={status === 'issued'} onPress={() => setStatus('issued')} />
        <Chip label="Pagadas" active={status === 'paid'}   onPress={() => setStatus('paid')} />
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
            <TextInput value={payRef} onChangeText={setPayRef} placeholder="#transacción, nota..." style={styles.input} />

            <View style={{ height: 8 }} />

            <Text style={styles.muted}>Notas (opcional)</Text>
            <TextInput value={payNotes} onChangeText={setPayNotes} placeholder="comentarios" style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline />

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
  screen: { flex: 1, backgroundColor: '#F6F7F9' },

  toolbarContainer: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 10, backgroundColor: '#F6F7F9' },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  toolbarLabel: { color: '#6B7280' },
  searchBox: { position: 'relative', flex: 1 },
  searchInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, height: 42, backgroundColor: '#fff' },
  clearBtn: { position: 'absolute', right: 8, top: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#EEF2FF' },
  clearText: { fontSize: 18, lineHeight: 18, color: '#374151' },

  chip: { borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFF' },
  chipActive: { backgroundColor: '#0EA5E922', borderColor: '#0EA5E9' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#0369A1' },

  btn: { minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0EA5E9' },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  btnDanger: { backgroundColor: '#DC2626' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
  btnTextPrimary: { color: '#FFFFFF', fontWeight: '700' },
  btnTextSecondary: { color: '#111827', fontWeight: '700' },

  card: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: Platform.select({ android: 2, default: 0 }) },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  itemSub: { color: '#6B7280', fontSize: 12 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#eef2ff', color: '#1e3a8a', fontWeight: '700' },
  badgeInfo: { backgroundColor: '#dbeafe', color: '#1e40af' },
  badgeSuccess: { backgroundColor: '#dcfce7', color: '#14532d' },
  badgeNeutral: { backgroundColor: '#e5e7eb', color: '#1f2937' },
  badgeDanger: { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeWarning: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeOrange: { backgroundColor: '#ffedd5', color: '#9a3412' },

  rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomColor: '#E5E7EB', borderBottomWidth: 1, backgroundColor: '#fff', gap: 10 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  rowSub: { color: '#6B7280', fontSize: 12 },

  metaRow: { paddingHorizontal: 12, paddingBottom: 8 },
  metaText: { color: '#6B7280' },

  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#6B7280', textAlign: 'center' },

  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, minHeight: 42, backgroundColor: '#fff' },

  modalWrap: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  muted: { color: '#6B7280' },
});
