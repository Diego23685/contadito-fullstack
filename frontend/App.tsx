// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/providers/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { Auth0Provider } from '@auth0/auth0-react';

export default function App() {
  return (
    <Auth0Provider
      domain="dev-u0rsrro1n34wze1g.us.auth0.com"
      clientId="bRa3NWp34fmCMZHIB0y2v7O29jqZ0Y93"
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </Auth0Provider>
  );
}
