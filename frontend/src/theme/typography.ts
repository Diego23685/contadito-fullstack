// src/theme/typography.ts
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import * as Font from 'expo-font';

let patched = false;

export async function loadApoka() {
  await Font.loadAsync({
    Apoka: require('../../assets/fonts/apokaregular.ttf'),
  });
}

export function patchGlobalFont() {
  if (patched) return;
  patched = true;

  const base = [{ fontFamily: 'Apoka' }];

  const prevTextRender = RNText.render;
  (RNText as any).render = function (...args: any[]) {
    const origin = prevTextRender.call(this, ...args);
    return (origin ? { ...origin, props: { ...origin.props, style: [base, origin.props?.style] } } : origin);
  };

  const origTI = RNTextInput.prototype.render;
  RNTextInput.prototype.render = function (...args: any[]) {
    // @ts-ignore
    const origin = origTI.apply(this, args);
    return (origin ? { ...origin, props: { ...origin.props, style: [base, origin.props?.style] } } : origin);
  };
}
