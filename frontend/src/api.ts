// src/api.ts
import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

let BASE_URL = 'http://127.0.0.1:5000';
let AUTH_TOKEN: string | null = null;

let UNAUTHORIZED_HANDLER: null | (() => void) = null;
let last401Ts = 0;
const FIRE_401_EVERY_MS = 500;

const log = (...args: any[]) => {
  // @ts-ignore
  if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...args);
};

export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  UNAUTHORIZED_HANDLER = fn;
};

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export const setBaseUrl = (url: string) => {
  BASE_URL = url;
  api.defaults.baseURL = BASE_URL;
  log('[api] setBaseUrl ->', BASE_URL);
};

export const setToken = (token: string | null) => {
  AUTH_TOKEN = token;
  if (token) {
    // Axios v1: defaults.headers.common es AxiosHeaders; usar set es más robusto
    const h = (api.defaults.headers.common instanceof AxiosHeaders)
      ? api.defaults.headers.common
      : AxiosHeaders.from(api.defaults.headers.common || {});
    h.set('Authorization', `Bearer ${token}`);
    (api.defaults.headers as any).common = h; // asegura la asignación
  } else {
    if (api.defaults.headers.common instanceof AxiosHeaders) {
      api.defaults.headers.common.delete('Authorization');
    } else {
      delete (api.defaults.headers.common as any)?.Authorization;
    }
  }
  log('[api] setToken ->', AUTH_TOKEN ? 'set' : 'null');
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Normaliza headers a AxiosHeaders
  const headers = AxiosHeaders.from(config.headers || {});
  if (AUTH_TOKEN && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${AUTH_TOKEN}`);
  }
  config.headers = headers;
  return config;
});

api.interceptors.response.use(
  (res) => {
    log(
      '[api][RES]',
      res.status,
      res.config.method?.toUpperCase(),
      (res.config.baseURL || '') + (res.config.url || '')
    );
    return res;
  },
  (err) => {
    const status = err?.response?.status;
    const url = (err?.config?.baseURL || '') + (err?.config?.url || '');
    log('[api][ERR]', status, err?.config?.method?.toUpperCase(), url, err?.message);

    if (status === 401 && typeof UNAUTHORIZED_HANDLER === 'function') {
      const now = Date.now();
      if (now - last401Ts > FIRE_401_EVERY_MS) {
        last401Ts = now;
        setTimeout(() => {
          try { UNAUTHORIZED_HANDLER?.(); } catch {}
        }, 0);
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  googleSignIn: (payload: {
    email: string;
    subject: string;
    name?: string;
    pictureUrl?: string;
  }) => api.post('/auth/google', payload),

  completeOnboarding: (dto: {
    tenantName: string;
    countryCode?: string;
    currency?: string;
    password?: string;
  }) => api.post('/auth/complete-onboarding', dto),
};
