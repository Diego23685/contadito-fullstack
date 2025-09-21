import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../api';
import { useCart } from '../../providers/CartContext';

export default function ProductDetail() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const slug: string = route.params?.slug;
  const key: string = route.params?.key;

  const { add } = useCart();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<any>(null);
  const [stock, setStock] = useState<number>(0);
  const [images, setImages] = useState<string[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/store/${slug}/products/${key}`);
      setP(data.p); setStock(data.stock); setImages(data.images || []);
    } catch (e: any) {
      Alert.alert('Error', String(e?.response?.data || e?.message || 'No se pudo cargar'));
      nav.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading || !p) return (<View style={styles.root}><ActivityIndicator /></View>);

  return (
    <View style={styles.root}>
      {images[0] ? <Image source={{ uri: images[0] }} style={styles.img} /> : <View style={[styles.img, styles.ph]}><Text>Sin imagen</Text></View>}
      <Text style={styles.name}>{p.name}</Text>
      <Text style={styles.price}>C$ {(p.price ?? 0).toFixed(2)}</Text>
      <Text style={styles.stock}>{stock > 0 ? `Stock: ${stock}` : 'Agotado'}</Text>
      {!!p.publicDescription && <Text style={styles.desc}>{p.publicDescription}</Text>}

      <Pressable
        onPress={() => add({ productId: p.id, name: p.name, price: p.price ?? 0, image: images[0] ?? null }, 1)}
        style={[styles.btn, stock <= 0 && { opacity: 0.6 }]}
        disabled={stock <= 0}
      >
        <Text style={styles.btnText}>Agregar al carrito</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor:'#fff', padding: 16, gap: 8 },
  img: { width: '100%', height: 240, borderRadius: 12, backgroundColor: '#f1f5f9' },
  ph: { alignItems:'center', justifyContent:'center' },
  name: { fontWeight: '900', color:'#0f172a', fontSize: 18 },
  price: { fontWeight: '800', color:'#0f172a', fontSize: 16 },
  stock: { color:'#64748b' },
  desc: { color:'#0f172a', marginTop: 8 },
  btn: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor:'#e5e7eb', backgroundColor:'#0ea5e9', alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'900' },
});
