// src/theme/FontsGate.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { loadApokaAndSetDefaults } from './typography';

export default function FontsGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await loadApokaAndSetDefaults(); }
      finally { if (alive) setOk(true); }
    })();
    return () => { alive = false; };
  }, []);

  if (!ok) {
    return (
      <View style={styles.root}>
        <Text style={styles.logo}>Contadito</Text>
        <Text style={styles.sub}>Cargando tipografías…</Text>
        <ActivityIndicator color="#0ea5e9" style={{ marginTop: 12 }} />
        <Text style={styles.build}>{Platform.OS.toUpperCase()}</Text>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1020', alignItems: 'center', justifyContent: 'center' },
  logo: { fontFamily: 'Apoka', fontSize: 28, color: '#fff' },
  sub: { color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  build:{ color: 'rgba(255,255,255,0.55)', marginTop: 10, fontSize: 12 },
});
