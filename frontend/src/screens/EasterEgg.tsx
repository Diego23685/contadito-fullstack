// src/screens/EasterEgg.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView,
  ActivityIndicator, Platform, Animated, Easing
} from 'react-native';

const F = Platform.select({
  ios: { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  default: { fontFamily: 'Apoka' },
});

const BRAND = {
  bgTop: '#F5F3FF',
  bgBottom: '#EEF2FF',
  panel: '#FFFFFF',
  border: '#E6EBFF',
  accent: '#7C3AED',
  blue: '#2563EB',
  green: '#10B981',
  danger: '#EF4444',
  ink: '#0F172A',
  sub: '#64748B',
};

// Letras (incluye Ñ)
const LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

// Conjunto de palabras (sin imágenes). Cada palabra “pide” su inicial.
const WORDS: { word: string; letter: string }[] = [
  { word: 'Árbol', letter: 'A' },
  { word: 'Barco', letter: 'B' },
  { word: 'Casa', letter: 'C' },
  { word: 'Dado', letter: 'D' },
  { word: 'Elefante', letter: 'E' },
  { word: 'Fresa', letter: 'F' },
  { word: 'Gato', letter: 'G' },
  { word: 'Helado', letter: 'H' },
  { word: 'Isla', letter: 'I' },
  { word: 'Jugo', letter: 'J' },
  { word: 'Koala', letter: 'K' },
  { word: 'Luna', letter: 'L' },
  { word: 'Manzana', letter: 'M' },
  { word: 'Ñandú', letter: 'Ñ' },
  { word: 'Oso', letter: 'O' },
  { word: 'Perro', letter: 'P' },
  { word: 'Queso', letter: 'Q' },
  { word: 'Rana', letter: 'R' },
  { word: 'Sol', letter: 'S' },
  { word: 'Taza', letter: 'T' },
  { word: 'Uva', letter: 'U' },
  { word: 'Vaca', letter: 'V' },
  { word: 'Wifi', letter: 'W' },
  { word: 'Xilófono', letter: 'X' },
  { word: 'Yuca', letter: 'Y' },
  { word: 'Zorro', letter: 'Z' },
];

// Utilidad para barajar
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

export default function EasterEgg({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [letters, setLetters] = useState<string[]>(shuffle(LETTERS));
  const [pool, setPool] = useState(WORDS);            // palabras restantes
  const [selected, setSelected] = useState<number|null>(null); // índice de palabra seleccionada
  const [correct, setCorrect] = useState<Record<string, boolean>>({});
  const [errorLetter, setErrorLetter] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2 minutos
  const [win, setWin] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // sutil animación
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [float]);

  // temporizador
  useEffect(() => {
    if (win || gameOver) return;
    const id = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(id); setGameOver(true); }
      return t - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [win, gameOver]);

  // victoria
  useEffect(() => {
    if (pool.length === 0 && Object.keys(correct).length === WORDS.length) {
      setWin(true);
    }
  }, [pool, correct]);

  const onPickWord = (idx: number) => {
    if (win || gameOver) return;
    setSelected(idx);
    setErrorLetter(null);
  };

  const onPickLetter = (L: string) => {
    if (win || gameOver) return;
    if (selected == null) return;
    const w = pool[selected];
    const expected = (w.letter || '').toUpperCase();
    const got = (L || '').toUpperCase();

    if (got === expected) {
      // marcar como resuelta, quitar del pool, barajar letras un poco
      setCorrect(prev => ({ ...prev, [w.word]: true }));
      setPool(prev => prev.filter((_, i) => i !== selected));
      setSelected(null);
      setLetters(shuffle(letters));
    } else {
      setErrorLetter(L);
      setTimeout(() => setErrorLetter(null), 600);
    }
  };

  const restart = () => {
    setLoading(true);
    setTimeout(() => {
      setLetters(shuffle(LETTERS));
      setPool(WORDS);
      setSelected(null);
      setCorrect({});
      setErrorLetter(null);
      setTimeLeft(120);
      setWin(false);
      setGameOver(false);
      setLoading(false);
    }, 300);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, '0');

  const score = useMemo(() => {
    const solved = Object.keys(correct).length;
    const base = solved * 4;         // 26*4 = 104 máx.
    const timeBonus = Math.max(0, Math.floor(timeLeft / 5)); // +24 máx.
    return base + timeBonus;
  }, [correct, timeLeft]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bgTop }}>
      <Animated.View
        style={[
          styles.header,
          { transform: [{ translateY: float.interpolate({ inputRange: [0,1], outputRange: [0, -4] }) }] }
        ]}
      >
        <Text style={styles.title}>ABCPiensa · Lite</Text>
        <View style={styles.headerRight}>
          <Text style={styles.timer}>{minutes}:{seconds}</Text>
          <Pressable style={styles.btnGhost} onPress={() => navigation.goBack()}>
            <Text style={styles.btnGhostTxt}>Salir</Text>
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>1) Elige una palabra</Text>
          <View style={styles.wordsWrap}>
            {pool.map((w, idx) => {
              const isSel = selected === idx;
              const isDone = !!correct[w.word];
              return (
                <Pressable
                  key={`${w.word}-${idx}`}
                  style={[styles.wordChip, isSel && styles.wordChipOn]}
                  onPress={() => onPickWord(idx)}
                  disabled={isDone}
                >
                  <Text style={[styles.wordTxt, isSel && { color: BRAND.panel }]}>{w.word}</Text>
                </Pressable>
              );
            })}
            {pool.length === 0 && <Text style={[styles.sub, { marginTop: 6 }]}>¡Todas resueltas! ✨</Text>}
          </View>

          <Text style={[styles.panelTitle, { marginTop: 12 }]}>2) Toca la letra inicial correcta</Text>
          <View style={styles.lettersGrid}>
            {letters.map(L => {
              const isErr = errorLetter === L;
              return (
                <Pressable key={L} onPress={() => onPickLetter(L)} style={[styles.letterBox, isErr && styles.letterErr]}>
                  <Text style={[styles.letterTxt, isErr && { color: BRAND.danger }]}>{L}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.sub}>Resueltas: {Object.keys(correct).length}/{WORDS.length}</Text>
            <Text style={styles.sub}>Puntuación: {score}</Text>
          </View>

          {(win || gameOver) && (
            <View style={styles.resultBox}>
              <Text style={[styles.resultTitle, win ? { color: BRAND.green } : { color: BRAND.danger }]}>
                {win ? '¡Ganaste!' : 'Tiempo agotado'}
              </Text>
              <Text style={styles.sub}>Puntuación: {score}</Text>
              <Pressable style={styles.btnPrimary} onPress={restart}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryTxt}>Jugar de nuevo</Text>}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomColor: BRAND.border, borderBottomWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  title: { ...F, color: BRAND.ink, fontSize: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timer: { ...F, color: BRAND.accent, fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },

  container: { padding: 16 },
  panel: {
    backgroundColor: BRAND.panel,
    borderRadius: 16, padding: 14,
    borderTopWidth: 3, borderTopColor: BRAND.accent,
    borderColor: BRAND.border, borderWidth: 1,
  },
  panelTitle: { ...F, color: BRAND.ink, marginBottom: 8 },
  wordsWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  wordChip: {
    borderWidth: 1, borderColor: BRAND.border, backgroundColor: '#F8FAFF',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999,
  },
  wordChipOn: { backgroundColor: BRAND.accent, borderColor: BRAND.accent },
  wordTxt: { ...F, color: BRAND.ink },

  lettersGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginTop: 8,
  },
  letterBox: {
    width: 48, height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1, borderColor: BRAND.border
  },
  letterErr: { borderColor: BRAND.danger, backgroundColor: '#FEF2F2' },
  letterTxt: { ...F, color: BRAND.ink, fontSize: 18 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  sub: { ...F, color: BRAND.sub },

  resultBox: { marginTop: 14, alignItems: 'center', gap: 8 },
  resultTitle: { ...F, fontSize: 18 },
  btnPrimary: {
    marginTop: 6, backgroundColor: BRAND.blue, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, alignItems: 'center'
  },
  btnPrimaryTxt: { ...F, color: '#fff' },
});
