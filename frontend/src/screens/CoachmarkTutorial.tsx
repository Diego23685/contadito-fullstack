// ==============================
// src/components/CoachmarkTutorial.tsx
// Coachmarks anclados a refs con spotlight y tooltip
// ==============================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type CoachStep = {
  key: string;
  title: string;
  body: string;
  targetRef?: React.RefObject<any>; // ref al botón/área
  // preferencia de posición del tooltip relativo al target
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  ctaText?: string;           // texto opcional de CTA auxiliar
  onCta?: () => void;         // acción CTA auxiliar
};

type Rect = { x: number; y: number; width: number; height: number };

const BRAND = {
  hanBlue: '#4458C7',
  iris: '#5A44C7',
  border: '#E2E7FF',
  panel: '#FCFDFF',
  text: '#0f172a',
  muted: '#6b7280',
  overlay: 'rgba(0,0,0,0.45)',
};

export default function CoachmarkTutorial({
  visible,
  onClose,
  steps,
  startIndex = 0,
}: {
  visible: boolean;
  onClose: () => void;
  steps: CoachStep[];
  startIndex?: number;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  const step = steps[Math.max(0, Math.min(steps.length - 1, idx))];
  const last = idx >= steps.length - 1;

  const measure = useCallback(() => {
    const ref = step?.targetRef?.current;
    if (!ref || typeof ref.measureInWindow !== 'function') {
      setTargetRect(null);
      return;
    }
    // En web y native:
    ref.measureInWindow((x: number, y: number, width: number, height: number) => {
      setTargetRect({ x, y, width, height });
    });
  }, [step]);

  // Re-medimos al abrir/avanzar o en rotación
  useEffect(() => {
    if (!visible) return;
    const doAnim = () => {
      fade.setValue(0);
      slide.setValue(12);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    };
    const t = setTimeout(() => {
      measure();
      doAnim();
    }, 10);
    const sub = Dimensions.addEventListener('change', () => {
      setTimeout(measure, 10);
    });
    return () => {
      clearTimeout(t);
      // @ts-ignore RN < 0.71
      sub?.remove?.();
    };
  }, [visible, idx, measure, fade, slide]);

  const next = () => {
    if (last) return onClose();
    setIdx(i => i + 1);
  };
  const prev = () => setIdx(i => Math.max(0, i - 1));

  // Calcula posición del tooltip en función del target y pantalla
  const { tipStyle, arrowStyle } = useMemo(() => {
    const win = Dimensions.get('window');
    const pad = 12;
    const maxW = Math.min(360, win.width - 2 * pad);
    if (!targetRect) {
      return {
        tipStyle: { left: pad, right: pad, bottom: pad },
        arrowStyle: {},
      };
    }
    const { x, y, width, height } = targetRect;
    const pref = step?.placement || 'auto';

    const canTop = y - 130 > 0;
    const canBottom = y + height + 130 < win.height;
    const canLeft = x - maxW - 16 > 0;
    const canRight = x + width + maxW + 16 < win.width;

    let place: NonNullable<CoachStep['placement']> = pref;
    if (pref === 'auto') {
      place = canTop ? 'top' : canBottom ? 'bottom' : canRight ? 'right' : canLeft ? 'left' : 'bottom';
    }

    let tipPos: any = { maxWidth: maxW };
    let arrowPos: any = {};

    switch (place) {
      case 'top':
        tipPos = {
          maxWidth: maxW,
          left: Math.min(Math.max(x + width / 2 - maxW / 2, pad), win.width - maxW - pad),
          top: Math.max(y - 140, pad),
        };
        arrowPos = { left: x + width / 2 - 8, top: y - 10, transform: [{ rotate: '180deg' }] };
        break;
      case 'bottom':
        tipPos = {
          maxWidth: maxW,
          left: Math.min(Math.max(x + width / 2 - maxW / 2, pad), win.width - maxW - pad),
          top: Math.min(y + height + 10, win.height - 160),
        };
        arrowPos = { left: x + width / 2 - 8, top: y + height - 2 };
        break;
      case 'left':
        tipPos = {
          maxWidth: maxW,
          left: Math.max(x - maxW - 12, pad),
          top: Math.min(Math.max(y - 20, pad), win.height - 160),
        };
        arrowPos = { left: x - 6, top: y + height / 2 - 8, transform: [{ rotate: '-90deg' }] };
        break;
      case 'right':
        tipPos = {
          maxWidth: maxW,
          left: Math.min(x + width + 12, win.width - maxW - pad),
          top: Math.min(Math.max(y - 20, pad), win.height - 160),
        };
        arrowPos = { left: x + width - 8, top: y + height / 2 - 8, transform: [{ rotate: '90deg' }] };
        break;
    }

    return { tipStyle: tipPos, arrowStyle: arrowPos };
  }, [targetRect, step]);

  const Dots = useMemo(() => (
    <View style={styles.dots}>
      {steps.map((_, i) => (
        <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
      ))}
    </View>
  ), [idx, steps]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        {/* Fondo oscurecido clickeable para avanzar */}
        <Pressable style={styles.overlay} onPress={next} />

        {/* Spotlight simple: borde alrededor del target */}
        {targetRect && (
          <View
            pointerEvents="none"
            style={[
              styles.spotlight,
              {
                left: targetRect.x - 6,
                top: targetRect.y - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
              },
            ]}
          />
        )}

        {/* Tooltip */}
        <Animated.View style={[styles.tipWrap, { opacity: fade, transform: [{ translateY: slide }] }, tipStyle]}>
          <View style={styles.tipCard}>
            <Text style={styles.title}>{step?.title}</Text>
            <Text style={styles.body}>{step?.body}</Text>
            {Dots}
            <View style={styles.row}>
              <Pressable accessibilityRole="button" onPress={onClose} style={[styles.btn, styles.btnGhost]}>
                <Text style={[styles.btnText, styles.btnGhostText]}>Saltar</Text>
              </Pressable>
              {idx > 0 && (
                <Pressable accessibilityRole="button" onPress={prev} style={[styles.btn, styles.btnGhost]}>
                  <Text style={[styles.btnText, styles.btnGhostText]}>Atrás</Text>
                </Pressable>
              )}
              {!!step?.onCta && (
                <Pressable accessibilityRole="button" onPress={step.onCta} style={[styles.btn, styles.btnAlt]}>
                  <Text style={[styles.btnText, styles.btnAltText]}>{step?.ctaText || 'Ir'}</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={next} style={styles.btn}>
                <Text style={styles.btnText}>{last ? 'Listo' : 'Siguiente'}</Text>
              </Pressable>
            </View>
          </View>
          {/* Flecha del tooltip */}
          <View style={[styles.arrow, arrowStyle]} />
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.overlay },
  spotlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 10,
  },
  tipWrap: { position: 'absolute' },
  tipCard: {
    backgroundColor: BRAND.panel,
    borderRadius: 16,
    borderWidth: 1, borderColor: BRAND.border,
    padding: 14,
    maxWidth: 360,
  },
  title: { fontFamily: Platform.select({ ios: 'Apoka', default: 'Apoka' }) as string, fontSize: 17, color: BRAND.text },
  body: { fontFamily: Platform.select({ ios: 'Apoka', default: 'Apoka' }) as string, color: BRAND.muted, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, flexWrap: 'wrap' },
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
  dots: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#e5e7eb' },
  dotActive: { backgroundColor: BRAND.hanBlue },
  arrow: {
    position: 'absolute',
    width: 0, height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BRAND.panel,
  },
});
