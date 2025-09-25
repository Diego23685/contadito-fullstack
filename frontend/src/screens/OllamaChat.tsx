// src/screens/OllamaChat.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Platform, KeyboardAvoidingView,
  StyleSheet, ActivityIndicator, LayoutAnimation, UIManager, Modal, ScrollView,
  NativeSyntheticEvent, TextInputKeyPressEventData, useWindowDimensions, SafeAreaView
} from 'react-native';
import { useFonts } from 'expo-font';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

const OLLAMA_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:11434' : 'http://localhost:11434';

const DEFAULT_MODEL = 'qwen2.5:3b-instruct';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ====== Branding / tipografía ======
const BRAND = {
  bg: '#F3F6FF',
  panel: '#FFFFFF',
  border: '#E5E7EB',
  borderSoft: '#E2E7FF',
  accent: '#4458C7',
  accentAlt: '#5A44C7',
  text: '#0F172A',
  muted: '#6B7280',
  userBubble: '#4458C7',
  assistantBubble: '#FFFFFF',
};

const F = Platform.select({
  ios:   { fontFamily: 'Apoka', fontWeight: 'normal' as const },
  android: { fontFamily: 'Apoka' as const },
  default: { fontFamily: 'Apoka' as const },
});

export default function OllamaChat() {
  // Tipografía
  const [fontsLoaded] = useFonts({ Apoka: require('../../assets/fonts/apokaregular.ttf') });

  const { width } = useWindowDimensions();
  const isNarrow = width < 480;
  const isWrapChips = width < 380;           // wrap en móviles muy estrechos
  const bubbleMax = Math.min(820, width - 72);

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'system', content: 'Eres un asistente para pymes. Responde en español, conciso y accionable.' },
    { role: 'assistant', content: '¡Hola! Soy tu IA local (Ollama). ¿En qué ayudo a tu negocio hoy?' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);

  // Caja colapsable de “preguntas rápidas”
  const [quickOpen, setQuickOpen] = useState(!isNarrow ? true : false);

  // Modal de fragmento
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [snippetText, setSnippetText] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !sending && online !== false,
    [input, sending, online]
  );

  const scrollToEnd = () => listRef.current?.scrollToEnd({ animated: true });

  const addUserMessage = (text: string) => {
    LayoutAnimation.easeInEaseOut();
    setMessages(prev => [...prev, { role: 'user', content: text }]);
  };
  const addAssistantMessage = (text = '') => {
    LayoutAnimation.easeInEaseOut();
    setMessages(prev => [...prev, { role: 'assistant', content: text }]);
  };
  const patchAssistant = (delta: string) => {
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') {
          next[i] = { ...next[i], content: (next[i].content ?? '') + delta };
          break;
        }
      }
      return next;
    });
  };

  // ===== Helpers de composición con contexto =====
  const withContext = (context: string, prompt: string) => {
    const ctx = (context || '').slice(0, 2500);
    return `Usa este contexto entre triples comillas y responde claro, con pasos/bullets si aplica.\n"""${ctx}"""\n${prompt}`;
  };

  // ---- estado + modelos ----
  const refresh = useCallback(async () => {
    try {
      setErrorBanner(null);
      const tags = await fetch(`${OLLAMA_BASE}/api/tags`).then(r => r.json()).catch(() => null);
      const list = Array.isArray(tags?.models) ? tags.models.map((m: any) => m?.name).filter(Boolean) : [];
      setModels(list);
      if (list.length) setModel(list.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : list[0]);

      const pong = await fetch(`${OLLAMA_BASE}/api/version`).then(r => r.ok).catch(() => false);
      setOnline(!!pong);
      if (!pong) setErrorBanner('No se pudo conectar con Ollama en localhost:11434');
    } catch {
      setOnline(false);
      setErrorBanner('No se pudo conectar con Ollama en localhost:11434');
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // ---- enviar (stream con fallback) ----
  const sendText = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;

    setInput('');
    addUserMessage(text);
    addAssistantMessage('');
    setSending(true);
    setTyping(true);
    setErrorBanner(null);

    const canStream = typeof ReadableStream !== 'undefined';
    const controller = new AbortController();
    abortRef.current = controller;

    const base = [...messages, { role: 'user', content: text }];

    try {
      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: base, stream: canStream }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => String(res.status));
        throw new Error(errText || `HTTP ${res.status}`);
      }

      if (canStream && (res as any).body?.getReader) {
        const reader = (res as any).body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              if (obj?.done) break;
              const piece = obj?.message?.content ?? obj?.response ?? '';
              if (piece) patchAssistant(piece);
            } catch { /* ignora línea malformada */ }
          }
        }
      } else {
        const data = await res.json();
        const textOut = data?.message?.content ?? data?.response ?? JSON.stringify(data);
        patchAssistant(String(textOut));
      }
    } catch (e: any) {
      patchAssistant(`⚠️ Error: ${e?.message || e}`);
      setErrorBanner('Ocurrió un error hablando con el modelo. Verifica que Ollama esté corriendo.');
    } finally {
      setTyping(false);
      setSending(false);
      abortRef.current = null;
      setTimeout(scrollToEnd, 50);
    }
  };

  const send = () => sendText(input);
  const cancelStream = () => { abortRef.current?.abort(); abortRef.current = null; setTyping(false); setSending(false); };
  const clearChat = () => {
    LayoutAnimation.easeInEaseOut();
    setMessages([
      { role: 'system', content: 'Eres un asistente para pymes. Responde en español, conciso y accionable.' },
      { role: 'assistant', content: 'Listo para empezar ✨ ¿Qué te gustaría lograr esta semana en tu negocio?' },
    ]);
    setErrorBanner(null);
    setTimeout(scrollToEnd, 50);
  };

  // ---- UI helpers ----
  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData> | any) => {
    if (Platform.OS === 'web' && e?.nativeEvent?.key === 'Enter' && !e?.shiftKey) {
      e.preventDefault?.();
      if (input.trim() && !sending && online !== false) send();
    }
  };
  const onScroll = (e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
    setShowScrollFab(!atBottom);
  };

  // ===== Quick prompts =====
  const SME_QUICK_PROMPTS: { label: string; prompt: string }[] = [
    { label: '¿Qué reponer esta semana?', prompt: 'Con base en ventas recientes y stock estimado, sugiere qué productos debo reponer esta semana y en qué cantidades. Devuelve lista con SKU, cantidad sugerida y razón.' },
    { label: '5 ideas de promos', prompt: 'Dame 5 ideas de promociones para este mes enfocadas en aumentar ticket promedio y rotación de inventario lento. Incluye copy breve.' },
    { label: 'Recordatorio de pago', prompt: 'Redacta un correo educado de recordatorio de pago para un cliente con factura vencida. Incluye asunto y cuerpo.' },
    { label: 'Plan 7 días', prompt: 'Crea un plan de acción de 7 días para subir ventas un 10% con acciones diarias simples para un negocio pequeño.' },
    { label: 'Segmenta clientes', prompt: 'Propón una segmentación de clientes por frecuencia y ticket promedio, y qué oferta dar a cada segmento.' },
    { label: 'Checklist inventario', prompt: 'Genera un checklist práctico para realizar conteo de inventario sin cerrar la tienda.' },
    { label: 'Precios y margen', prompt: 'Sugiéreme una estrategia simple de precios para lograr margen objetivo del 30% considerando redondeos psicológicos.' },
    { label: 'Resumen del día', prompt: 'Pídeme los datos clave de hoy y devuelve un resumen ejecutivo en 5 bullets con alertas (stock, ventas, cobranzas).' },
    { label: 'Tendencias de venta', prompt: 'Explica posibles tendencias por categoría basadas en temporada y sugiere acciones.' },
    { label: 'Guion de llamada', prompt: 'Escribe un guion breve para llamar a clientes inactivos y recuperar ventas.' },
  ];

  // Caja colapsable de chips (aprovecha mejor el alto)
  const QuickBox = () => {
    const toggle = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setQuickOpen(o => !o); };
    return (
      <View style={styles.quickBox}>
        <Pressable onPress={toggle} style={styles.quickHeader} accessibilityRole="button">
          <Text style={[styles.quickTitle, F]}>Sugerencias rápidas</Text>
          <View style={styles.quickActions}>
            <Text style={[styles.quickCount, F]}>{SME_QUICK_PROMPTS.length}</Text>
            <Text style={[styles.quickChevron, F]}>{quickOpen ? '▲' : '▼'}</Text>
          </View>
        </Pressable>

        {quickOpen && (
          isWrapChips ? (
            <View style={styles.chipWrap}>
              {SME_QUICK_PROMPTS.map(({ label, prompt }) => (
                <Pressable
                  key={label}
                  onPress={() => sendText(prompt)}
                  style={({ pressed }) => [styles.chip, styles.chipBlock, pressed && { opacity: 0.88 }]}
                >
                  <Text style={[styles.chipText, F]} numberOfLines={1}>{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {SME_QUICK_PROMPTS.map(({ label, prompt }) => (
                <Pressable
                  key={label}
                  onPress={() => sendText(prompt)}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.88 }]}
                >
                  <Text style={[styles.chipText, F]}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )
        )}
      </View>
    );
  };

  // ===== Acciones bajo respuestas del asistente =====
  const AssistantActions: React.FC<{ context: string }> = ({ context }) => {
    const items = [
      { label: 'Preguntar sobre esto', make: () => setInput(withContext(context, 'Tengo una duda específica: ')) },
      { label: 'Resumir', make: () => sendText(withContext(context, 'Resume en 5 viñetas claras.')) },
      { label: 'Plan de acción', make: () => sendText(withContext(context, 'Convierte esto en un plan de acción con pasos concretos.')) },
      { label: 'Dame ideas', make: () => sendText(withContext(context, 'Dame 5 ideas aplicables para pymes.')) },
    ];
    return (
      <View style={styles.actionsRow}>
        {items.map(it => (
          <Pressable key={it.label} onPress={it.make} style={styles.actionChip}>
            <Text style={[styles.actionChipText, F]}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Msg }) => {
    if (item.role === 'system') return null;
    const isUser = item.role === 'user';
    const content = item.content;

    const Bubble = (
      <Pressable
        onLongPress={() => { setSnippetText(content); setSnippetOpen(true); }}
        delayLongPress={250}
        style={[
          styles.bubble,
          isUser ? styles.user : styles.assistant,
          { maxWidth: bubbleMax },
        ]}
      >
        <Text selectable style={[styles.bubbleText, F, isUser && styles.bubbleTextUser]}>{content}</Text>
      </Pressable>
    );

    return (
      <View style={[styles.row, isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: BRAND.accent }]}>
            <Text style={[{ color: '#fff', fontWeight: '700' }, F]}>IA</Text>
          </View>
        )}
        <View style={{ maxWidth: bubbleMax }}>
          {Bubble}
          {!isUser && <AssistantActions context={content} />}
        </View>
        {isUser && (
          <View style={[styles.avatar, { backgroundColor: '#10B981' }]}>
            <Text style={[{ color: '#fff', fontWeight: '700' }, F]}>Tú</Text>
          </View>
        )}
      </View>
    );
  };

  const Header = () => (
    <View style={[styles.appbar, isNarrow && { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
          <View style={[styles.dot, { backgroundColor: online ? '#22C55E' : online === false ? '#F59E0B' : '#9CA3AF' }]} />
          <Text style={[styles.appbarTitle, F]}>Chat IA (Ollama)</Text>
        </View>
        <Pressable onPress={() => setShowModelPicker(true)} style={styles.modelPill}>
          <Text style={[styles.modelPillText, F]} numberOfLines={1}>{model}</Text>
        </Pressable>
      </View>
      <View style={[{ flexDirection: 'row', columnGap: 8, rowGap: 8, flexWrap: 'wrap', marginTop: isNarrow ? 6 : 0 }]}>
        {sending ? (
          <Pressable onPress={cancelStream} style={[styles.topBtn, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
            <Text style={[styles.topBtnText, F, { color: '#991b1b' }]}>Cancelar</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={clearChat} style={styles.topBtn}>
          <Text style={[styles.topBtnText, F]}>Limpiar</Text>
        </Pressable>
        <Pressable onPress={refresh} style={styles.topBtn}>
          <Text style={[styles.topBtnText, F]}>Reintentar</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header />

        {!!errorBanner && (
          <View style={styles.banner}>
            <Text style={[styles.bannerText, F]}>{errorBanner}</Text>
            <Pressable onPress={refresh} style={styles.bannerBtn}><Text style={[styles.bannerBtnText, F]}>Reintentar</Text></Pressable>
          </View>
        )}

        {/* Caja colapsable de preguntas rápidas */}
        <QuickBox />

        <View style={styles.wrap}>
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={scrollToEnd}
            onLayout={scrollToEnd}
            onScroll={onScroll}
            scrollEventThrottle={16}
          />

          {typing && (
            <View style={styles.typingWrap}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, { opacity: 0.7 }]} />
              <View style={[styles.typingDot, { opacity: 0.45 }]} />
              <Text style={[styles.typingText, F]}>Escribiendo…</Text>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputBarShadowWrap}>
            <View style={[styles.inputRow, online === false && { opacity: 0.6 }]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={online === false ? 'Ollama no está disponible — toca “Reintentar”' : 'Escribe tu mensaje…'}
                placeholderTextColor="#9CA3AF"
                style={[styles.input, F]}
                multiline
                onKeyPress={onKeyPress}
                onFocus={() => setTimeout(scrollToEnd, 50)}
                editable={online !== false}
              />
              <Pressable
                onPress={send}
                disabled={!canSend}
                style={[styles.sendBtn, !canSend && { opacity: 0.5 }]}
              >
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={[styles.sendBtnText, F]}>Enviar</Text>}
              </Pressable>
            </View>
          </View>

          {showScrollFab && (
            <Pressable onPress={scrollToEnd} style={styles.scrollFab}>
              <Text style={[{ color: '#fff', fontWeight: '800' }, F]}>↓</Text>
            </Pressable>
          )}
        </View>

        {/* Picker de modelo */}
        <Modal visible={showModelPicker} transparent animationType="fade" onRequestClose={() => setShowModelPicker(false)}>
          <Pressable style={styles.modalBack} onPress={() => setShowModelPicker(false)}>
            <View style={styles.modalCard}>
              <Text style={[styles.modalTitle, F]}>Modelos disponibles</Text>
              {!models.length ? (
                <Text style={[{ color: BRAND.muted }, F]}>
                  No se encontraron modelos. ¿Ya hiciste <Text style={{ fontWeight: '700' }}>ollama pull …</Text>?
                </Text>
              ) : (
                <View style={{ rowGap: 8 }}>
                  {models.map(m => (
                    <Pressable
                      key={m}
                      onPress={() => { setModel(m); setShowModelPicker(false); }}
                      style={[styles.modelItem, m === model && styles.modelItemActive]}
                    >
                      <Text style={[styles.modelItemText, F, m === model && { color: '#fff' }]}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </Pressable>
        </Modal>

        {/* Modal de fragmento para recortar y preguntar */}
        <Modal visible={snippetOpen} transparent animationType="fade" onRequestClose={() => setSnippetOpen(false)}>
          <Pressable style={styles.modalBack} onPress={() => setSnippetOpen(false)}>
            <View style={styles.modalCard}>
              <Text style={[styles.modalTitle, F]}>Usar fragmento como contexto</Text>
              <Text style={[{ color: BRAND.muted, marginBottom: 8 }, F]}>
                Recorta el texto si quieres y luego elige una acción.
              </Text>
              <TextInput
                value={snippetText}
                onChangeText={setSnippetText}
                multiline
                style={[styles.snippetBox, F]}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8, marginTop: 10 }}>
                <Pressable
                  style={styles.modalBtn}
                  onPress={() => { setInput(withContext(snippetText, 'Mi pregunta: ')); setSnippetOpen(false); }}
                >
                  <Text style={[styles.modalBtnText, F]}>Preguntar…</Text>
                </Pressable>
                <Pressable
                  style={styles.modalBtn}
                  onPress={() => { sendText(withContext(snippetText, 'Resume en 5 puntos.')); setSnippetOpen(false); }}
                >
                  <Text style={[styles.modalBtnText, F]}>Resumir</Text>
                </Pressable>
                <Pressable
                  style={styles.modalBtn}
                  onPress={() => { sendText(withContext(snippetText, 'Convierte en plan de acción por pasos.')); setSnippetOpen(false); }}
                >
                  <Text style={[styles.modalBtnText, F]}>Plan de acción</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: '#fff', borderColor: BRAND.border }]}
                  onPress={() => setSnippetOpen(false)}
                >
                  <Text style={[styles.modalBtnText, F, { color: BRAND.text }]}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/* ===================== styles ===================== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND.bg },

  appbar: {
    backgroundColor: '#F8FAFF',
    borderBottomColor: BRAND.borderSoft,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: BRAND.accent,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  appbarTitle: { fontSize: 18, color: BRAND.text },

  modelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: BRAND.borderSoft, backgroundColor: '#FFFFFF',
    maxWidth: 280,
  },
  modelPillText: { color: BRAND.accent, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 5 },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    columnGap: 10, rowGap: 10, flexWrap: 'wrap',
    backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  bannerText: { color: '#92400E', flexShrink: 1, flexGrow: 1 },
  bannerBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFF7ED',
  },
  bannerBtnText: { color: '#92400E', fontWeight: '700' },

  wrap: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 96 },

  row: { flexDirection: 'row', alignItems: 'flex-end', columnGap: 8, rowGap: 2, marginVertical: 2, flexWrap: 'nowrap' },

  avatar: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1e293b', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
  },

  bubble: {
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E6E8EF', backgroundColor: BRAND.assistantBubble,
    shadowColor: '#1e293b', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  assistant: { alignSelf: 'flex-start' },
  user: { alignSelf: 'flex-end', backgroundColor: BRAND.userBubble, borderColor: BRAND.userBubble, shadowOpacity: 0.08 },
  bubbleText: { fontSize: 15, lineHeight: 20, color: BRAND.text },
  bubbleTextUser: { color: '#FFFFFF' },

  // ===== QuickBox
  quickBox: {
    marginTop: 6,
    marginBottom: 2,
    marginHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    shadowColor: '#1e293b',
    shadowOpacity: Platform.OS === 'web' ? 0.04 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickTitle: { color: BRAND.text, fontSize: 14 },
  quickActions: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  quickCount: {
    color: BRAND.accent,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  quickChevron: { color: BRAND.muted, fontWeight: '700' },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 6, marginTop: 6 },
  actionChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: BRAND.border, backgroundColor: '#FFFFFF',
  },
  actionChipText: { color: BRAND.accent, fontWeight: '600', fontSize: 12 },

  typingWrap: {
    position: 'absolute', left: 16, bottom: 82,
    flexDirection: 'row', alignItems: 'center', columnGap: 8,
    backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: BRAND.border,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND.accent } as any,
  typingText: { color: BRAND.muted, fontSize: 12 },

  inputBarShadowWrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingBottom: Platform.select({ ios: 10, default: 12 }),
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', columnGap: 10,
    borderWidth: 1, borderColor: BRAND.border, backgroundColor: BRAND.panel,
    borderRadius: 14, padding: 10,
    shadowColor: BRAND.accentAlt, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  input: { flex: 1, minHeight: 42, maxHeight: 140, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, color: BRAND.text },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: BRAND.accent, borderRadius: 12 },
  sendBtnText: { color: '#FFFFFF', fontWeight: '700' },

  scrollFab: {
    position: 'absolute', right: 16, bottom: 90,
    backgroundColor: BRAND.accent, borderRadius: 999,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND.accentAlt, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },

  // Chips (modo carrusel)
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingRight: 16,
  },
  // Chips (modo wrap)
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  chip: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    backgroundColor: '#FFFFFF',
    marginRight: 8, // solo en carrusel
    shadowColor: '#1e293b',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  chipBlock: { marginRight: 0 },
  chipText: { color: BRAND.accent, fontWeight: '600' },

  // Modal
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: {
    width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: BRAND.border, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: BRAND.text },
  snippetBox: {
    minHeight: 120, maxHeight: 260, borderWidth: 1, borderColor: BRAND.border,
    borderRadius: 10, padding: 10, textAlignVertical: 'top', color: BRAND.text, backgroundColor: '#FFFFFF',
  },
  modalBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: BRAND.accent, borderWidth: 1, borderColor: BRAND.accent,
  },
  modalBtnText: { color: '#fff', fontWeight: '700' },

  topBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: BRAND.borderSoft, backgroundColor: '#FFFFFF',
  },
  topBtnText: { color: BRAND.accent, fontWeight: '700' },

  modelItem: { paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: BRAND.border, borderRadius: 10, backgroundColor: '#fff' },
  modelItemActive: { backgroundColor: BRAND.accent, borderColor: BRAND.accent },
  modelItemText: { color: BRAND.text, fontWeight: '600' },
});
