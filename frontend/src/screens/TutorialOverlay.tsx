// ==============================
// src/components/TutorialOverlay.tsx
// Coach marks con resaltado sobre objetivos reales
// ==============================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ----- Tipos públicos -----
export type TargetRect = { x: number; y: number; width: number; height: number };
export type TutorialStep = {
  key: string;
  title: string;
  body: string;
  /** clave para buscar el rect objetivo */
  targetKey?: string;
  /** texto del botón adicional (opcional) */
  cta?: string;
  /** acción del CTA (opcional) */
  onCta?: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  steps: TutorialStep[];
  /** índice inicial del paso */
  startIndex?: number;
  /** mapa de rects calculados por el host */
  targets?: Record<string, TargetRect | undefined>;
  /** padding alrededor del highlight */
  targetPadding?: number;
  /** callback opcional cuando cambia el paso (ej. para telemetría) */
  onStepChange?: (step: TutorialStep, index: number) => void;
  /**
   * si el paso apunta a algo fuera de vista, podemos pedir al host hacer scroll.
   * por ejemplo: requestScroll(y: number) => scrollView.scrollTo({ y, animated: true })
   */
  requestScroll?: (y: number) => void;
};

// ----- Paleta mínima -----
const BRAND = {
  hanBlue: '#4458C7',
  iris: '#5A44C7',
  border: '#E2E7FF',
  panel: '#FCFDFF',
  text: '#0f172a',
  muted: '#6b7280',
};

// ===== Componente =====
export default function TutorialOverlay({
  visible,
  onClose,
  steps,
  startIndex = 0,
  targets = {},
  targetPadding = 6,
  onStepChange,
  requestScroll,
}: Props) {
  const [idx, setIdx] = useState(startIndex);

  // animaciones
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const { width: W, height: H } = Dimensions.get('window');

  const step = steps[Math.max(0, Math.min(steps.length - 1, idx))];
  const last = idx >= steps.length - 1;

  // highlight del target actual
  const rawTarget = step?.targetKey ? targets[step.targetKey] : undefined;
  const highlight = useMemo(() => {
    if (!rawTarget) return null;
    const pad = Math.max(0, targetPadding);
    return {
      x: clamp(rawTarget.x - pad, 6, Math.max(6, W - 12)),
      y: clamp(rawTarget.y - pad, 6, Math.max(6, H - 12)),
      w: Math.min(W - 12, rawTarget.width + pad * 2),
      h: Math.min(H - 12, rawTarget.height + pad * 2),
      r: 12,
    };
  }, [rawTarget, targetPadding, W, H]);

  // posición del tooltip (debajo si cabe, si no arriba; y limitamos X)
  const tooltip = useMemo(() => {
    const maxW = Math.min(380, W - 24 - 24);
    if (!highlight) {
      return { x: 12, y: H * 0.15, maxW, place: 'center' as const };
    }
    const gap = 10;
    const preferBelowY = highlight.y + highlight.h + gap;
    const preferAboveY = Math.max(12, highlight.y - 10 - 160);
    const placeBelow = preferBelowY + 170 < H; // altura estimada tarjeta
    const x = clamp(highlight.x, 12, W - maxW - 12);
    const y = placeBelow ? preferBelowY : preferAboveY;
    return { x, y, maxW, place: placeBelow ? ('below' as const) : ('above' as const) };
  }, [highlight, W, H]);

  // abrir/cerrar animado
  useEffect(() => {
    if (!visible) return;

    setIdx(startIndex);
    fade.setValue(0);
    slide.setValue(12);

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();

    const onBack = () => { onClose(); return true; };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBack);

    return () => {
      loop.stop();
      backSub.remove();
    };
  }, [visible, startIndex, fade, slide, pulse, onClose]);

  // pedir scroll si el target queda fuera de vista (host decide el margen)
  useEffect(() => {
    if (!visible || !requestScroll || !rawTarget) return;
    // margen superior para que quepa el tooltip
    const desiredTop = Math.max(0, rawTarget.y - 120);
    requestScroll(desiredTop);
  }, [visible, rawTarget, requestScroll]);

  // notificar cambio de paso
  useEffect(() => {
    if (visible && step && onStepChange) onStepChange(step, idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, idx]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const next = () => {
    if (last) return onClose();
    setIdx(i => Math.min(steps.length - 1, i + 1));
  };
  const prev = () => setIdx(i => Math.max(0, i - 1));

  const Dots = (
    <View style={s.dots} accessibilityRole="tablist" accessibilityLabel={`Paso ${idx + 1} de ${steps.length}`}>
      {steps.map((_, i) => (
        <View
          key={i}
          style={[s.dot, i === idx && s.dotActive]}
          accessibilityRole="text"
          accessibilityLabel={i === idx ? `Paso ${i + 1} (actual)` : `Paso ${i + 1}`}
        />
      ))}
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[s.wrap, { opacity: fade }]}>
        {/* Capa oscura */}
        <Pressable style={s.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar tutorial" />

        {/* Highlight animado */}
        {highlight && (
          <Animated.View
            pointerEvents="none"
            style={[
              s.highlight,
              {
                left: highlight.x,
                top: highlight.y,
                width: highlight.w,
                height: highlight.h,
                borderRadius: highlight.r,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
        )}

        {/* Flecha hacia el objetivo */}
        {highlight && (
          <View
            pointerEvents="none"
            style={[
              s.arrow,
              tooltip.place === 'below'
                ? {
                    left: clamp(highlight.x + 20, tooltip.x + 20, highlight.x + highlight.w - 20),
                    top: highlight.y + highlight.h + 2,
                    borderTopColor: '#ffffff',
                  }
                : {
                    left: clamp(highlight.x + 20, tooltip.x + 20, highlight.x + highlight.w - 20),
                    top: highlight.y - 10,
                    transform: [{ rotate: '180deg' }],
                    borderTopColor: '#ffffff',
                  },
            ]}
          />
        )}

        {/* Tarjeta del paso */}
        <Animated.View
          accessible
          accessibilityRole="dialog"
          accessibilityLabel={step?.title}
          style={[
            s.card,
            { left: tooltip.x, top: tooltip.y, maxWidth: tooltip.maxW, transform: [{ translateY: slide }] },
          ]}
        >
          {!!step?.title && <Text style={s.title}>{step.title}</Text>}
          {!!step?.body && <Text style={s.body}>{step.body}</Text>}
          {Dots}
          <View style={s.row}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[s.btn, s.btnGhost]}
            >
              <Text style={[s.btnText, s.btnGhostText]}>Saltar</Text>
            </Pressable>
            {idx > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={prev}
                style={[s.btn, s.btnGhost]}
              >
                <Text style={[s.btnText, s.btnGhostText]}>Atrás</Text>
              </Pressable>
            )}
            {!!step?.onCta && (
              <Pressable
                accessibilityRole="button"
                onPress={step.onCta}
                style={[s.btn, s.btnAlt]}
              >
                <Text style={[s.btnText, s.btnAltText]}>{step?.cta || 'Ir'}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={next}
              style={s.btn}
            >
              <Text style={s.btnText}>{last ? 'Listo' : 'Siguiente'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ----- Utils -----
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ----- Estilos -----
const fontFamily = Platform.select({ ios: 'Apoka', default: 'Apoka' }) as string;

const s = StyleSheet.create({
  wrap: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  highlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  card: {
    position: 'absolute',
    backgroundColor: BRAND.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  title: { fontFamily, fontSize: 18, color: BRAND.text },
  body: { fontFamily, color: BRAND.muted, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: '#ffffff',
  },
  btnText: { fontFamily, color: BRAND.hanBlue },
  btnGhost: { backgroundColor: '#fff' },
  btnGhostText: { color: BRAND.muted },
  btnAlt: { backgroundColor: '#eef2ff', borderColor: '#dbeafe' },
  btnAltText: { color: BRAND.iris },
  dots: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#e5e7eb' },
  dotActive: { backgroundColor: BRAND.hanBlue },
});
