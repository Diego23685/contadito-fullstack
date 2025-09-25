// src/api.ts
import axios from 'axios';

let BASE_URL = 'http://127.0.0.1:5000';
let AUTH_TOKEN: string | null = null;

// Callback global cuando el backend devuelve 401
let UNAUTHORIZED_HANDLER: null | (() => void) = null;

/** Permite registrar un handler global para 401 */
export const setUnauthorizedHandler = (fn: () => void) => {
  UNAUTHORIZED_HANDLER = fn;
};

console.log('[api] init. BASE_URL =', BASE_URL);

export const instance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

export const setBaseUrl = (url: string) => {
  BASE_URL = url;
  instance.defaults.baseURL = BASE_URL;
  console.log('[api] setBaseUrl ->', BASE_URL);
};

export const setToken = (token: string | null) => {
  AUTH_TOKEN = token;
  if (token) {
    instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common.Authorization;
  }
  console.log('[api] setToken ->', AUTH_TOKEN ? 'set' : 'null');
};

instance.interceptors.request.use((config) => {
  // Por si alguien llama antes de setToken, aún inyectamos
  if (AUTH_TOKEN) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res) => {
    console.log('[api][RES]', res.status, res.config.method?.toUpperCase(), (res.config.baseURL || '') + (res.config.url || ''));
    return res;
  },
  (err) => {
    const s = err?.response?.status;
    const u = (err?.config?.baseURL || '') + (err?.config?.url || '');
    console.log('[api][ERR]', s, err?.config?.method?.toUpperCase(), u, err?.message);

    // Si el backend devuelve 401 => disparamos el handler global (logout)
    if (s === 401 && typeof UNAUTHORIZED_HANDLER === 'function') {
      try { UNAUTHORIZED_HANDLER(); } catch {}
    }

    // Re-emitimos el error para que cada pantalla pueda manejar su propio flujo si quiere
    return Promise.reject(err);
  }
);

export const api = instance;
