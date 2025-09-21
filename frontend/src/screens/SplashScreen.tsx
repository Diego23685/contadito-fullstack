// src/screens/SplashScreen.tsx
import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../providers/AuthContext';

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const { token } = useContext(AuthContext); // 👈 lee token del contexto
  const fade = useRef(new Animated.Value(0)).current;
  const bump = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bump, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bump, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [fade, bump]);

  // 👇 redirige a lo que *sí* existe en el stack actual
  useEffect(() => {
    const t = setTimeout(() => {
      const target = token ? 'Home' : 'Login';
      navigation.reset({ index: 0, routes: [{ name: target }] });
    }, 650);
    return () => clearTimeout(t);
  }, [navigation, token]);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: fade,
            transform: [
              { translateY: bump.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
              { scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
            ],
          },
        ]}
      >
        <Text style={styles.logo}>Contadito</Text>
        <Text style={styles.sub}>Tu negocio, claro y al día</Text>
      </Animated.View>

      <ActivityIndicator size="small" color="#0ea5e9" style={{ marginTop: 16 }} />
      <Text style={styles.buildInfo}>{Platform.OS.toUpperCase()} · iniciando…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1020', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center' },
  logo: { fontFamily: 'Apoka', fontSize: 32, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },
  sub: { color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  buildInfo: { color: 'rgba(255,255,255,0.55)', marginTop: 10, fontSize: 12 },
});
