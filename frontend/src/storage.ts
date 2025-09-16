// src/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TOKEN = 'contadito.token';
const KEY_BASE  = 'contadito.base';

export async function saveToken(token: string) {
  await AsyncStorage.setItem(KEY_TOKEN, token);
}
export async function loadToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_TOKEN);
}
export async function clearToken() {
  await AsyncStorage.removeItem(KEY_TOKEN);
}

export async function saveBase(base: string) {
  await AsyncStorage.setItem(KEY_BASE, base);
}
export async function loadBase(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_BASE);
}
