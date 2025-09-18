import React from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

export default function PurchaseCreate({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nueva compra</Text>
      <Text style={styles.sub}>Pantalla placeholder. Aquí armarás el flujo de compra.</Text>
      <View style={{ height: 12 }} />
      <Button title="Ir a Productos" onPress={() => navigation.navigate('ProductsList')} />
      <View style={{ height: 8 }} />
      <Button title="Guardar (demo)" onPress={() => Alert.alert('OK', 'Compra guardada (demo)')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#6b7280' },
});
