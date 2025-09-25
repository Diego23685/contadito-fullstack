// ==============================
// src/components/TutorialOverlay.tsx
// ==============================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export type TutorialStep = {
  key: string;
  title: string;
  body: string;
  cta?: string;        // texto del botón principal (default: "Siguiente")
  onCta?: () => void;  // acción opcional
};

export default function TutorialOverlay({
  visible,
  onClose,
  steps,
  startIndex = 0,
}: {
  visible: boolean;
  onClose: () => void;
  steps: TutorialStep[];
  startIndex?: number;
}) {
  const [idx, setIdx] = useState(startIndex);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      setIdx(startIndex);
      fade.setValue(0);
      slide.setValue(12);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [visible, startIndex, fade, slide]);

  const step = steps[Math.max(0, Math.min(steps.length - 1, idx))];
  const last = idx >= steps.length - 1;

  const next = () => {
    if (last) return onClose();
    setIdx(i => i + 1);
  };

  const prev = () => {
    setIdx(i => Math.max(0, i - 1));
  };

  const Dots = useMemo(() => (
    <View style={s.dots}>
      {steps.map((_, i) => (
        <View key={i} style={[s.dot, i === idx && s.dotActive]} />
      ))}
    </View>
  ), [idx, steps]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Animated.View style={[s.card, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <Text style={s.title}>{step?.title}</Text>
          <Text style={s.body}>{step?.body}</Text>
          {Dots}
          <View style={s.row}>
            <Pressable accessibilityRole="button" onPress={onClose} style={[s.btn, s.btnGhost]}>
              <Text style={[s.btnText, s.btnGhostText]}>Saltar</Text>
            </Pressable>
            {idx > 0 && (
              <Pressable accessibilityRole="button" onPress={prev} style={[s.btn, s.btnGhost]}>
                <Text style={[s.btnText, s.btnGhostText]}>Atrás</Text>
              </Pressable>
            )}
            {!!step?.onCta && (
              <Pressable accessibilityRole="button" onPress={step.onCta} style={[s.btn, s.btnAlt]}>
                <Text style={[s.btnText, s.btnAltText]}>{step?.cta || 'Ir'}</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={next} style={s.btn}>
              <Text style={s.btnText}>{last ? 'Listo' : 'Siguiente'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const BRAND = {
  hanBlue: '#4458C7',
  iris: '#5A44C7',
  border: '#E2E7FF',
  panel: '#FCFDFF',
  text: '#0f172a',
  muted: '#6b7280',
};

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%', maxWidth: 520,
    backgroundColor: BRAND.panel,
    borderRadius: 16,
    borderWidth: 1, borderColor: BRAND.border,
    padding: 16,
  },
  title: { fontFamily: Platform.select({ ios: 'Apoka', default: 'Apoka' }) as string, fontSize: 18, color: BRAND.text },
  body: { fontFamily: Platform.select({ ios: 'Apoka', default: 'Apoka' }) as string, color: BRAND.muted, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  btn: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1, borderColor: BRAND.border,
    backgroundColor: '#ffffff',
  },
  btnText: { fontFamily: Platform.select({ ios: 'Apoka', default: 'Apoka' }) as string, color: BRAND.hanBlue },
  btnGhost: { backgroundColor: '#fff' },
  btnGhostText: { color: BRAND.muted },
  btnAlt: { backgroundColor: '#eef2ff', borderColor: '#dbeafe' },
  btnAltText: { color: BRAND.iris },
  dots: { flexDirection: 'row', gap: 6, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#e5e7eb' },
  dotActive: { backgroundColor: BRAND.hanBlue },
});
