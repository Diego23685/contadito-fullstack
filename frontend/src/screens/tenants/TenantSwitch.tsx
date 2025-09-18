import React from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

export default function TenantSwitch() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cambiar empresa</Text>
      <Text style={styles.sub}>Placeholder. Aquí listarás/seleccionarás el tenant.</Text>
      <View style={{ height: 12 }} />
      <Button title="Simular cambio" onPress={() => Alert.alert('OK', 'Empresa cambiada (demo)')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#6b7280' },
});
