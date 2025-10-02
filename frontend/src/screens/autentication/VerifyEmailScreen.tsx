import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { AuthContext } from '../../providers/AuthContext';

export default function VerifyEmailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const email = route?.params?.email as string;

  const { login } = useContext(AuthContext);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let t: any;
    if (cooldown > 0) t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onVerify = async () => {
    if (!code || code.length < 6) {
      Alert.alert('Código', 'Ingresa los 6 dígitos.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/auth/verify-email-code', { email, code, purpose: 'register' });
      const token = res.data?.token;
      if (!token) { Alert.alert('Error', 'No se recibió token.'); return; }
      await login(token);
    } catch (e: any) {
      const msg = e?.response?.data || e.message || 'No se pudo verificar';
      Alert.alert('Verificación', String(msg));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    try {
      setLoading(true);
      await api.post('/auth/request-email-code', { email, purpose: 'register' });
      setCooldown(60);
      Alert.alert('Código reenviado', 'Revisa tu bandeja de entrada.');
    } catch (e: any) {
      const msg = e?.response?.data || e.message || 'No se pudo reenviar';
      Alert.alert('Reenvío', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.card}>
        <Text style={s.title}>Verifica tu correo</Text>
        <Text style={s.sub}>{email}</Text>

        <TextInput
          value={code}
          onChangeText={(t)=>setCode(t.replace(/\D/g,'').slice(0,6))}
          keyboardType="number-pad"
          placeholder="Código de 6 dígitos"
          placeholderTextColor="#94a3b8"
          style={s.input}
        />

        <Pressable onPress={onVerify} style={s.primaryBtn} disabled={loading || code.length < 6}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Confirmar</Text>}
        </Pressable>

        <Pressable onPress={onResend} style={s.linkBtn} disabled={cooldown>0}>
          <Text style={[s.linkText, cooldown>0 && { color:'#94a3b8'}]}>
            {cooldown>0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
          </Text>
        </Pressable>

        <Pressable onPress={()=>navigation.goBack()} style={{ marginTop: 8 }}>
          <Text style={{ color:'#2563EB' }}>Volver</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex:1, alignItems:'center', justifyContent:'center', padding:16, backgroundColor:'#0B1020' },
  card: {
    width:'100%', maxWidth:420, backgroundColor:'#fff', borderRadius:16, padding:20,
    borderWidth:1, borderColor:'rgba(14,30,80,0.06)'
  },
  title: { fontSize:20, color:'#0f172a', marginBottom:4 },
  sub: { color:'#64748b', marginBottom:14 },
  input: {
    backgroundColor:'#F8FAFF', borderWidth:1, borderColor:'#E6EBFF', borderRadius:12,
    paddingVertical:12, paddingHorizontal:12, fontSize:18, textAlign:'center'
  },
  primaryBtn: {
    marginTop:16, backgroundColor:'#2563EB', borderRadius:12, alignItems:'center', paddingVertical:12
  },
  primaryText: { color:'#fff', fontSize:16 },
  linkBtn: { marginTop:12, alignItems:'center' },
  linkText: { color:'#2563EB' }
});
