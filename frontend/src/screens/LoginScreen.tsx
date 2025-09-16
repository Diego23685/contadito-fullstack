// src/screens/LoginScreen.tsx
import React, { useContext, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Platform } from 'react-native';
import { api, setBaseUrl } from '../api';
import { AuthContext } from '../providers/AuthContext';
import { useNavigation } from '@react-navigation/native';

const DEFAULT_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000';
setBaseUrl(DEFAULT_BASE);

const LoginScreen: React.FC = () => {
  const { login } = useContext(AuthContext);
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('pass123');
  const [base, setBase] = useState(DEFAULT_BASE);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      const token = res.data?.token as string | undefined;
      if (!token) throw new Error('Respuesta sin token');
      await login(token);
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo iniciar sesion';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  const useAndroidLocalhost = () => { setBaseUrl('http://10.0.2.2:5000'); setBase('http://10.0.2.2:5000'); };
  const useLoopback = () => { setBaseUrl('http://127.0.0.1:5000'); setBase('http://127.0.0.1:5000'); };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contadito</Text>
      <Text style={styles.small}>API: {base}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Button title="10.0.2.2" onPress={useAndroidLocalhost} />
        <Button title="127.0.0.1" onPress={useLoopback} />
      </View>

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <Text style={styles.label}>Contrasena</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

      <View style={{ height: 12 }} />
      <Button title={loading ? 'Ingresando...' : 'Iniciar sesion'} onPress={handleLogin} disabled={loading} />

      <View style={{ height: 12 }} />
      <Button title="Crear cuenta" onPress={() => navigation.navigate('Register')} />
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  small: { color: '#555', marginBottom: 6 },
});
