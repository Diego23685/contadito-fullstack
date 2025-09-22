// src/screens/SplashScreen.tsx
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { AuthContext } from '../providers/AuthContext';

/** ====== BRAND (misma paleta que ProductForm) ====== */
const BRAND = {
  hanBlue: '#4458C7',
  iris: '#5A44C7',
  cyanBlueAzure: '#4481C7',
  maximumBlue: '#44AAC7',
  darkPastelBlue: '#8690C7',
  verdigris: '#43BFB7',

  surfaceTint:  '#0B1020', // base oscura del splash
  softGlow:     '#101734',
};

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const { token } = useContext(AuthContext);

  // Carga de fuente Apoka (igual que en otras pantallas)
  const [fontsReady] = useFonts({ Apoka: require('../../assets/fonts/apokaregular.ttf') });

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const dot = useRef(new Animated.Value(0)).current; // para 3 puntos
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  // Evita parpadeo: muestra al menos X ms
  const MIN_TIME = 900;
  const [startAt] = useState(() => Date.now());

  useEffect(() => {
    // logo fade-in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // “breathe” sutil del logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    // puntos del loader
    Animated.loop(
      Animated.timing(dot, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // orbes decorativos (parallax lento)
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(orb2, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, breathe, dot, orb1, orb2]);

  // Navegación cuando fuente + min tiempo estén ok
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const go = () => {
      const elapsed = Date.now() - startAt;
      const wait = Math.max(0, MIN_TIME - elapsed);
      timer = setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: token ? 'Home' : 'Login' }],
        });
      }, wait);
    };

    if (fontsReady) go();
    return () => { if (timer) clearTimeout(timer); };
  }, [fontsReady, token, navigation, startAt]);

  const logoScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const logoTY    = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  const dotOpacities = useMemo(() => {
    // escalona los puntos: 0, 0.33, 0.66
    const make = (offset: number) =>
      dot.interpolate({
        inputRange: [0 + offset, 0.33 + offset, 0.66 + offset, 1 + offset],
        outputRange: [0.2, 1, 0.2, 0.2],
        extrapolate: 'extend',
      });
    return [make(0), make(0.11), make(0.22)];
  }, [dot]);

  return (
    <View style={styles.root}>
      {/* “Gradiente” suave con dos capas */}
      <View style={styles.bgBase} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            backgroundColor: BRAND.hanBlue,
            opacity: 0.22,
            transform: [
              { translateX: orb1.interpolate({ inputRange: [0, 1], outputRange: [-24, -6] }) },
              { translateY: orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
              { scale: orb1.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.12] }) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb2,
          {
            backgroundColor: BRAND.verdigris,
            opacity: 0.18,
            transform: [
              { translateX: orb2.interpolate({ inputRange: [0, 1], outputRange: [18, -8] }) },
              { translateY: orb2.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
              { scale: orb2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
            ],
          },
        ]}
      />

      {/* Logo + claim */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: fadeIn, transform: [{ scale: logoScale }, { translateY: logoTY }] },
        ]}
      >
        <Text style={styles.logo}>Contadito</Text>
        <Text style={styles.sub}>Tu negocio, claro y al día</Text>
      </Animated.View>

      {/* Loader de 3 puntos */}
      <View style={styles.dotsRow} accessibilityRole="progressbar" accessibilityLabel="Cargando">
        {dotOpacities.map((o, i) => (
          <Animated.View key={`d${i}`} style={[styles.dot, { opacity: o }]} />
        ))}
      </View>

      <Text style={styles.buildInfo}>{Platform.OS.toUpperCase()} · iniciando…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  // Fondo compuesto (sin libs extras)
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND.surfaceTint,
  },
  orb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -60,
    left: -40,
    shadowColor: BRAND.hanBlue,
    shadowOpacity: 0.25,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
  },
  orb2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: -40,
    right: -20,
    shadowColor: BRAND.verdigris,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
  },

  logoWrap: { alignItems: 'center' },
  logo: {
    fontFamily: 'Apoka',
    fontSize: 34,
    fontWeight: Platform.OS === 'ios' ? '900' : 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sub: {
    fontFamily: 'Apoka',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },

  // Loader 3 puntos
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  buildInfo: { color: 'rgba(255,255,255,0.55)', marginTop: 10, fontSize: 12, fontFamily: 'Apoka' },
});
