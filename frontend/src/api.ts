// src/api.ts
import axios from 'axios';

let BASE_URL = 'http://127.0.0.1:5000';
let AUTH_TOKEN: string | null = null;

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
  console.log('[api] setToken ->', AUTH_TOKEN ? 'set' : 'null');
};

instance.interceptors.request.use((config) => {
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
    throw err;
  }
);

export const api = instance;
