import React, { createContext, useCallback, useMemo, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { api, authApi } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

type AuthCtx = {
  token?: string;
  hydrated: boolean; // ← listo cuando ya rehidratamos el token
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: (opts?: { onOnboarding?: () => void; onSuccess?: () => void }) => Promise<void>;
};

export const AuthContext = createContext<AuthCtx>({
  token: undefined,
  hydrated: false,
  login: async () => {},
  logout: async () => {},
  loginWithGoogle: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);

  // Rehidratar token una sola vez
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('auth_token');
        if (t) {
          setToken(t);
          api.defaults.headers.common.Authorization = `Bearer ${t}`;
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const login = useCallback(async (t: string) => {
    setToken(t);
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
    await AsyncStorage.setItem('auth_token', t);
  }, []);

  const logout = useCallback(async () => {
    setToken(undefined);
    delete api.defaults.headers.common.Authorization;
    await AsyncStorage.multiRemove(['auth_token', 'needs_onboarding']); // limpia también el flag
  }, []);

  // ======= Google =======
  const CLIENT_ID = Platform.select({
    ios: 'TU_IOS_CLIENT_ID.apps.googleusercontent.com',
    android: 'TU_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    web: 'TU_WEBO_ID.apps.googleusercontent.com',
    default: 'TU_EXPO_CLIENT_ID.apps.googleusercontent.com',
  })!;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: CLIENT_ID,
    scopes: ['openid', 'email', 'profile'],
    responseType: 'token', // para poder pedir /userinfo
  });

  const loginWithGoogle = useCallback(
    async (opts?: { onOnboarding?: () => void; onSuccess?: () => void }) => {
      const res = await promptAsync();
      if (res.type !== 'success') return;

      const accessToken =
        res.authentication?.accessToken ?? (res as any)?.params?.access_token;
      if (!accessToken) throw new Error('No se obtuvo accessToken de Google');

      const uiResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const info = await uiResp.json();
      // info: { sub, email, name, picture, ... }

      const payload = {
        email: info.email,
        subject: info.sub,
        name: info.name,
        pictureUrl: info.picture,
      };

      const back = await authApi.googleSignIn(payload);
      const { token, onboardingRequired } = back.data as {
        token: string;
        onboardingRequired?: boolean;
      };

      await login(token);

      if (onboardingRequired) {
        await AsyncStorage.setItem('needs_onboarding', '1');
        opts?.onOnboarding?.();
      } else {
        await AsyncStorage.removeItem('needs_onboarding');
        opts?.onSuccess?.();
      }
    },
    [promptAsync, login]
  );

  const value = useMemo(
    () => ({ token, hydrated, login, logout, loginWithGoogle }),
    [token, hydrated, login, logout, loginWithGoogle]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
