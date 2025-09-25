// src/providers/AuthContext.tsx
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToken as setApiToken, setUnauthorizedHandler } from '../api';

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Evita múltiples logouts concurrentes (por varios 401 a la vez)
  const loggingOutRef = useRef(false);

  // Cargar token al iniciar
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('ct_token');
        if (saved) {
          setToken(saved);
          setApiToken(saved);
        } else {
          setApiToken(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Registrar handler global para 401 -> logout silencioso
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Evitar loops: si ya estamos cerrando sesión, no repetimos
      if (loggingOutRef.current) return;
      logout(true);
    });
    // No necesita cleanup especial; si el provider se desmonta, la app se cierra
  }, []);

  const login = useCallback(async (t: string) => {
    setToken(t);
    setApiToken(t);
    await AsyncStorage.setItem('ct_token', t);
  }, []);

  const logout = useCallback(async (silent?: boolean) => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      setToken(null);
      setApiToken(null);
      await AsyncStorage.removeItem('ct_token');
      // Nota: RootNavigator ya observa "token"; al quedar en null cambia a Login.
      // Puedes mostrar un toast si quieres, aquí lo dejamos silencioso cuando viene de 401.
      // if (!silent) Alert.alert('Sesión cerrada');
    } finally {
      // Pequeño retraso para evitar ráfagas de 401 encadenados
      setTimeout(() => { loggingOutRef.current = false; }, 300);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
