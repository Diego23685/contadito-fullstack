import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../../providers/CartContext';
import { api } from '../../api';

export default function CheckoutScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const slug: string = route.params?.slug ?? 'DemoPyme2';

  const { items, total, clear } = useCart();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!items.length) { Alert.alert('Carrito vacío'); return; }
    setLoading(true);
    try {
      const payload = {
        name, email, phone, shippingAddress: addr,
        items: items.map(i => ({ productId: i.productId, quantity: i.qty })),
      };
      const { data } = await api.post(`/store/${slug}/orders`, payload);
      clear();
      Alert.alert('Pedido creado', `Número: ${data.number}\nTotal: C$ ${Number(data.total).toFixed(2)}`);
      nav.reset({ index: 0, routes: [{ name: 'StoreFront', params: { slug } }] });
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo crear el pedido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.sub}>Total: <Text style={{ fontWeight:'900' }}>C$ {total.toFixed(2)}</Text></Text>

      <View style={{ gap: 10, marginTop: 8 }}>
        <Field label="Nombre completo" value={name} onChangeText={setName} />
        <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Dirección de envío" value={addr} onChangeText={setAddr} multiline />
      </View>

      <Pressable onPress={submit} disabled={loading} style={[styles.btn, loading && { opacity: 0.6 }]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirmar pedido</Text>}
      </Pressable>
    </View>
  );
}

function Field(props: any) {
  return (
    <View>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput {...props} style={[styles.input, props.multiline && { height: 90, textAlignVertical:'top' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:'#f8fafc', padding: 12 },
  title: { fontSize: 18, fontWeight:'900', color:'#0f172a' },
  sub: { color:'#64748b', marginTop: 4 },
  label: { color:'#64748b', fontSize:12, marginBottom: 4 },
  input: { borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, backgroundColor:'#fff', paddingHorizontal:12, minHeight:42 },
  btn: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor:'#e5e7eb', backgroundColor:'#0ea5e9', alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'900' },
});
