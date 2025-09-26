// src/screens/SplashScreen.tsx
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { AuthContext } from '../providers/AuthContext';

/** ====== BRAND (paleta unificada) ====== */
const BRAND = {
  hanBlue: '#4458C7',
  iris: '#5A44C7',
  cyanBlueAzure: '#4481C7',
  maximumBlue: '#44AAC7',
  darkPastelBlue: '#8690C7',
  verdigris: '#43BFB7',
  surfaceTint: '#0B1020',
  softGlow: '#101734',
};

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const { token } = useContext(AuthContext);
  const [fontsReady] = useFonts({ Apoka: require('../../assets/fonts/apokaregular.ttf') });

  // Core anims
  const fadeIn = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  // Loader dots
  const dotA = useRef(new Animated.Value(0)).current;
  const dotB = useRef(new Animated.Value(0)).current;
  const dotC = useRef(new Animated.Value(0)).current;

  // Orbs
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  // Fancy: ring + sweep highlight + stars
  const ringSpin = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const starsT = useRef(new Animated.Value(0)).current;

  // Evitar parpadeo
  const MIN_TIME = 900;
  const [startAt] = useState(() => Date.now());

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    // Dots
    const pulse = (v: Animated.Value, d: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(d),
          Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
    pulse(dotA, 0); pulse(dotB, 200); pulse(dotC, 400);

    // Orbs
    const swing = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
    swing(orb1, 4400); swing(orb2, 5200); swing(orb3, 6400);

    // Ring: giro + pulso
    Animated.loop(Animated.timing(ringSpin, { toValue: 1, duration: 3800, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    // Sweep highlight
    Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(500),
      ])
    ).start();

    // Stars
    Animated.loop(
      Animated.sequence([
        Animated.timing(starsT, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(starsT, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, breathe, dotA, dotB, dotC, orb1, orb2, orb3, ringSpin, ringPulse, sweep, starsT]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const go = () => {
      const wait = Math.max(0, MIN_TIME - (Date.now() - startAt));
      timer = setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: token ? 'Home' : 'Login' }] });
      }, wait);
    };
    if (fontsReady) go();
    return () => { if (timer) clearTimeout(timer); };
  }, [fontsReady, token, navigation, startAt]);

  // Interpolaciones
  const logoScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const logoTY = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  const dotStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) as any },
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) as any },
    ],
  } as any);

  const orb1AnimatedStyle: any = {
    transform: [
      { translateX: orb1.interpolate({ inputRange: [0, 1], outputRange: [-24, -8] }) as any },
      { translateY: orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) as any },
      { scale: orb1.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.12] }) as any },
    ],
  };
  const orb2AnimatedStyle: any = {
    transform: [
      { translateX: orb2.interpolate({ inputRange: [0, 1], outputRange: [18, -10] }) as any },
      { translateY: orb2.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) as any },
      { scale: orb2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) as any },
    ],
  };
  const orb3AnimatedStyle: any = {
    transform: [
      { translateX: orb3.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) as any },
      { translateY: orb3.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) as any },
      { scale: orb3.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.1] }) as any },
    ],
  };
  const logoAnimatedStyle: any = {
    opacity: fadeIn,
    transform: [{ scale: logoScale as any }, { translateY: logoTY as any }],
  };

  // Ring anim styles
  const ringStyle: any = {
    transform: [
      { rotate: ringSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) as any },
      { scale: ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) as any },
    ],
  };

  // Sweep highlight: barra que cruza el logo
  const sweepStyle: any = {
    transform: [
      { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] }) as any },
      { rotate: '16deg' as any },
    ],
    opacity: sweep.interpolate({ inputRange: [0, 0.2, 0.6, 1], outputRange: [0, 0.45, 0.25, 0] }),
  };

  // Starfield positions fijas (deterministas)
  const STARS = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => {
        const r = (n: number) => Math.abs(Math.sin((i + 1) * n));
        const x = Math.round(10 + r(1.3) * 80);  // %
        const y = Math.round(10 + r(2.1) * 80);  // %
        const size = 2 + Math.round(r(3.7) * 2);
        return { key: `s${i}`, left: `${x}%`, top: `${y}%`, size };
      }),
    []
  );

  // Movimiento sutil de estrellas
  const starAnim = (idx: number): any => ({
    transform: [
      { translateY: starsT.interpolate({ inputRange: [0, 1], outputRange: [0, idx % 2 ? -2 : 2] }) as any },
      { translateX: starsT.interpolate({ inputRange: [0, 1], outputRange: [0, idx % 3 ? 1 : -1] }) as any },
    ],
    opacity: starsT.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] }),
  });

  return (
    <View style={styles.root}>
      {/* Fondo */}
      <View style={styles.bgBase} />
      <View style={styles.vignette} />

      {/* Orbes */}
      <Animated.View pointerEvents="none" style={[styles.orb, styles.orbBlue, orb1AnimatedStyle]} />
      <Animated.View pointerEvents="none" style={[styles.orb2, styles.orbTeal, orb2AnimatedStyle]} />
      <Animated.View pointerEvents="none" style={[styles.orb3, styles.orbPurple, orb3AnimatedStyle]} />

      {/* Starfield */}
      {STARS.map((s, i) => (
        <Animated.View
          key={s.key}
          pointerEvents="none"
          style={[
            styles.star,
            { left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: s.size / 2 },
            starAnim(i),
          ]}
        />
      ))}

      {/* Logo + Ring + Sweep */}
      <View style={styles.logoStack}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
          <Text style={styles.logo}>Contadito</Text>
          <Text style={styles.sub}>Tu negocio, claro y al día</Text>
          <Animated.View style={[styles.sweep, sweepStyle]} />
        </Animated.View>
      </View>

      {/* Loader de 3 puntos */}
      <View style={styles.dotsRow} accessibilityRole="progressbar" accessibilityLabel="Cargando">
        <Animated.View style={[styles.dot, dotStyle(dotA)]} />
        <Animated.View style={[styles.dot, dotStyle(dotB)]} />
        <Animated.View style={[styles.dot, dotStyle(dotC)]} />
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

  // Fondo compuesto
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.surfaceTint },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 40,
  },

  // Orbes
  orb: {
    position: 'absolute',
    width: 320, height: 320, borderRadius: 160,
    top: -60, left: -40,
    shadowColor: BRAND.hanBlue, shadowOpacity: 0.35, shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
  },
  orb2: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    bottom: -40, right: -20,
    shadowColor: BRAND.verdigris, shadowOpacity: 0.28, shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
  },
  orb3: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    top: 100, right: 40,
    shadowColor: BRAND.darkPastelBlue, shadowOpacity: 0.22, shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  orbBlue: { backgroundColor: BRAND.hanBlue, opacity: 0.22 },
  orbTeal: { backgroundColor: BRAND.verdigris, opacity: 0.18 },
  orbPurple: { backgroundColor: BRAND.iris, opacity: 0.14 },

  // Estrellas
  star: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  // Logo stack
  logoStack: { alignItems: 'center', justifyContent: 'center' },

  // Ring
  ring: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },

  // Logo + claim
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logo: {
    fontFamily: 'Apoka',
    fontSize: 36,
    textShadowColor: 'rgba(255,255,255,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    fontWeight: Platform.OS === 'ios' ? '900' : 'bold',
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  sub: {
    fontFamily: 'Apoka',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    textAlign: 'center',
  },

  // Sweep highlight
  sweep: {
    position: 'absolute',
    width: 160, height: 22,
    backgroundColor: '#FFFFFF',
    opacity: 0.2,
    borderRadius: 12,
    top: 10,
  },

  // Loader 3 puntos
  dotsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },

  buildInfo: { color: 'rgba(255,255,255,0.55)', marginTop: 10, fontSize: 12, fontFamily: 'Apoka' },
});
