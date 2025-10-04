import React, { useContext } from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../providers/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

export default function GoogleButton() {
  const { loginWithGoogle } = useContext(AuthContext);
  const nav = useNavigation<any>();
  const [loading, setLoading] = useState(false);

  const onPress = async () => {
    try {
      setLoading(true);
      await loginWithGoogle({
        onOnboarding: () => nav.replace('Onboarding'),
        onSuccess: () => nav.replace('Home'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable onPress={onPress} style={{ padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6EBFF', alignItems: 'center' }}>
      {loading ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <ActivityIndicator />
          <Text>Conectando con Google…</Text>
        </View>
      ) : (
        <Text>Continuar con Google</Text>
      )}
    </Pressable>
  );
}
