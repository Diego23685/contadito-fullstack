// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/providers/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import FontsGate from './src/theme/FontsGate';

export default function App() {
  return (
    <AuthProvider>
      <FontsGate>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </FontsGate>
    </AuthProvider>
  );
}
