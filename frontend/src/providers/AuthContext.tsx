// src/providers/AuthContext.tsx
import React, { createContext, useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToken as setApiToken } from '../api';

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const login = useCallback(async (t: string) => {
    setToken(t);
    setApiToken(t);
    await AsyncStorage.setItem('ct_token', t);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setApiToken(null);
    await AsyncStorage.removeItem('ct_token');
  }, []);

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
