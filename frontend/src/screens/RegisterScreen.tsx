// src/screens/RegisterScreen.tsx
import React, { useContext, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Platform } from 'react-native';
import { api, setBaseUrl } from '../api';
import { AuthContext } from '../providers/AuthContext';

const DEFAULT_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000';
setBaseUrl(DEFAULT_BASE);

const RegisterScreen: React.FC = () => {
  const { login } = useContext(AuthContext);

  const [tenantName, setTenantName] = useState('DemoPyme');
  const [ownerName, setOwnerName] = useState('Owner');
  const [ownerEmail, setOwnerEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('pass123');
  const [confirm, setConfirm] = useState('pass123');

  const [base, setBase] = useState(DEFAULT_BASE);
  const [loading, setLoading] = useState(false);

  const useAndroidLocalhost = () => { setBaseUrl('http://10.0.2.2:5000'); setBase('http://10.0.2.2:5000'); };
  const useLoopback = () => { setBaseUrl('http://127.0.0.1:5000'); setBase('http://127.0.0.1:5000'); };

  const handleRegister = async () => {
    if (!tenantName.trim() || !ownerName.trim() || !ownerEmail.trim() || !password) {
      Alert.alert('Datos incompletos', 'Completa todos los campos');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Contraseña', 'La confirmacion no coincide');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        tenantName,
        ownerName,
        ownerEmail,
        password,
      };
      const res = await api.post('/auth/register-tenant', payload);
      const token = res.data?.token as string | undefined;
      if (!token) {
        Alert.alert('Registro', 'Se registro, pero no se recibio token. Inicia sesion manualmente.');
        return;
      }
      await login(token); // autologin
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo registrar';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta (tenant + owner)</Text>
      <Text style={styles.small}>API: {base}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Button title="10.0.2.2" onPress={useAndroidLocalhost} />
        <Button title="127.0.0.1" onPress={useLoopback} />
      </View>

      <Text style={styles.label}>Nombre del negocio (tenantName)</Text>
      <TextInput style={styles.input} value={tenantName} onChangeText={setTenantName} />

      <Text style={styles.label}>Tu nombre (ownerName)</Text>
      <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} />

      <Text style={styles.label}>Correo (ownerEmail)</Text>
      <TextInput style={styles.input} value={ownerEmail} onChangeText={setOwnerEmail} autoCapitalize="none" keyboardType="email-address" />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={styles.label}>Confirmar contraseña</Text>
      <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry />

      <View style={{ height: 12 }} />
      <Button title={loading ? 'Registrando...' : 'Registrarme'} onPress={handleRegister} disabled={loading} />
    </View>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  small: { color: '#555', marginBottom: 6 },
});
