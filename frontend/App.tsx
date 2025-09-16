// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { api, setBaseUrl, setToken as setApiToken } from './src/api';
import { saveToken, loadToken, clearToken, saveBase, loadBase } from './src/storage';

const Stack = createNativeStackNavigator();

const DEFAULT_BASE = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://127.0.0.1:5000';

// No pongas setBaseUrl aquí; lo haremos después de intentar restaurar

function LoginScreen({ onLoggedIn, base, setBase }: any) {
  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('pass123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      const token = res.data?.token as string | undefined;
      if (!token) throw new Error('Respuesta sin token');
      setApiToken(token);
      await saveToken(token);         // <— persistimos el token
      onLoggedIn(token);
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'No se pudo iniciar sesion';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  const useAndroidLocalhost = async () => {
    setBaseUrl('http://10.0.2.2:5000');
    setBase('http://10.0.2.2:5000');
    await saveBase('http://10.0.2.2:5000'); // <— persistimos base
  };
  const useLoopback = async () => {
    setBaseUrl('http://127.0.0.1:5000');
    setBase('http://127.0.0.1:5000');
    await saveBase('http://127.0.0.1:5000'); // <— persistimos base
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contadito</Text>
      <Text style={styles.small}>STACK: AUTH</Text>
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
      {loading ? <ActivityIndicator /> : <Button title="Iniciar sesion" onPress={handleLogin} />}
    </View>
  );
}

function HomeScreen({ token, onLogout, base }: any) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/products', { params: { page: 1, pageSize: 1 } });
        setCount(res.data?.total ?? 0);
      } catch (e: any) {
        Alert.alert('Error /products', String(e?.response?.status || e?.message));
      }
    })();
  }, []);

  const tokenPreview = useMemo(() => (token ? token.slice(0, 28) + '...' : '(sin token)'), [token]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inicio</Text>
      <Text style={styles.small}>STACK: APP</Text>
      <Text style={styles.small}>API: {base}</Text>
      <Text>Token: {tokenPreview}</Text>
      <Text>Total de productos (backend): {count ?? '...'}</Text>
      <View style={{ height: 12 }} />
      <Button title="Cerrar sesion" onPress={onLogout} />
    </View>
  );
}

function AuthStack({ onLoggedIn, base, setBase }: any) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" options={{ title: 'Login' }}>
        {() => <LoginScreen onLoggedIn={onLoggedIn} base={base} setBase={setBase} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function AppStack({ token, onLogout, base }: any) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" options={{ title: 'Inicio' }}>
        {() => <HomeScreen token={token} onLogout={onLogout} base={base} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [base, setBase] = useState<string>(DEFAULT_BASE);
  const [hydrating, setHydrating] = useState(true);

  // Restaurar base y token al montar
  useEffect(() => {
    (async () => {
      // 1) Base
      const storedBase = await loadBase();
      const baseToUse = storedBase || DEFAULT_BASE;
      setBase(baseToUse);
      setBaseUrl(baseToUse);

      // 2) Token
      const storedToken = await loadToken();
      if (storedToken) {
        setApiToken(storedToken); // el interceptor lo usará
        setToken(storedToken);    // entra directo al AppStack
      }
      setHydrating(false);
    })();
  }, []);

  const handleLoggedIn = (t: string) => setToken(t);
  const handleLogout = async () => {
    setToken(null);
    setApiToken(null);
    await clearToken(); // <— limpiamos almacenamiento
  };

  if (hydrating) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Cargando sesion...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <AppStack token={token} onLogout={handleLogout} base={base} />
      ) : (
        <AuthStack onLoggedIn={handleLoggedIn} base={base} setBase={setBase} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  label: { alignSelf: 'stretch', marginTop: 8, marginBottom: 4 },
  input: { alignSelf: 'stretch', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  small: { color: '#555', marginBottom: 6 },
});
