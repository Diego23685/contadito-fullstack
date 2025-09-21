import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable } from 'react-native';
import { useCart } from '../../providers/CartContext';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function CartScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const tenantRef: string = String(
    route.params?.tenantRef ??
    route.params?.tenantId ??
    route.params?.slug ??
    route.params?.slugOrName ??
    'DemoPyme'
  );

  const { items, removeByKey, total, clear } = useCart();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Carrito</Text>

      {!items.length ? (
        <Text style={{ color:'#64748b', marginTop: 8 }}>Tu carrito está vacío.</Text>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(it) => it.lineId} // ✅ clave única
            renderItem={({ item }) => (
              <View style={styles.row}>
                {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <View style={[styles.img, styles.ph]} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.sub}>C$ {Number(item.price).toFixed(2)} × {item.qty}</Text>
                </View>
                <Pressable onPress={() => removeByKey(item.lineId)} style={styles.rm}>
                  <Text style={{ color:'#991b1b', fontWeight:'900' }}>Quitar</Text>
                </Pressable>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingVertical: 12 }}
            extraData={items.map(i => `${i.lineId}:${i.qty}:${i.price}`).join('|')}
          />

          <View style={styles.totalBar}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>C$ {Number(total).toFixed(2)}</Text>
          </View>

          <View style={{ flexDirection:'row', gap:8 }}>
            <Pressable onPress={() => clear(tenantRef)} style={[styles.btn, styles.btnGhost]}>
              <Text style={[styles.btnText, { color:'#0f172a' }]}>Vaciar</Text>
            </Pressable>
            <Pressable onPress={() => nav.navigate('Checkout', { slug: tenantRef })} style={styles.btn}>
              <Text style={styles.btnText}>Pagar</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor:'#f8fafc', padding: 12 },
  title: { fontSize: 18, fontWeight: '900', color:'#0f172a' },
  row: { flexDirection:'row', gap:10, backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#e5e7eb', padding:10, alignItems:'center' },
  img: { width: 56, height:56, borderRadius:10, backgroundColor:'#f1f5f9' },
  ph: {},
  name: { fontWeight:'800', color:'#0f172a' },
  sub: { color:'#64748b', fontSize:12 },
  rm: { paddingHorizontal:10, paddingVertical:8, borderRadius:8, backgroundColor:'#fee2e2', borderWidth:1, borderColor:'#fecaca' },
  totalBar: { marginTop:8, padding:12, backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#e5e7eb', flexDirection:'row', justifyContent:'space-between' },
  totalLabel: { color:'#64748b' },
  totalValue: { fontWeight:'900', color:'#0f172a' },
  btn: { marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor:'#e5e7eb', backgroundColor:'#0ea5e9', alignItems:'center', flex:1 },
  btnGhost: { backgroundColor:'#fff' },
  btnText: { color:'#fff', fontWeight:'900' },
});
