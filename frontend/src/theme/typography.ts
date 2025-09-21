// src/theme/typography.ts
import { Text, TextInput, Platform } from 'react-native';
import * as Font from 'expo-font';

let ready = false;

export async function loadApokaAndSetDefaults() {
  if (ready) return;
  await Font.loadAsync({
    Apoka: require('../../assets/fonts/apokaregular.ttf'),
  });

  const base = Platform.select({
    ios:   { fontFamily: 'Apoka', fontWeight: 'normal' as const },
    default: { fontFamily: 'Apoka' },
  });

  // Text
  (Text as any).defaultProps = (Text as any).defaultProps || {};
  (Text as any).defaultProps.style = [
    base,
    (Text as any).defaultProps.style,
  ];

  // TextInput
  (TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
  (TextInput as any).defaultProps.style = [
    base,
    (TextInput as any).defaultProps.style,
  ];

  ready = true;
}
