// src/navigation/RootNavigator.tsx
import React, { useContext } from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../providers/AuthContext';
import { CartProvider } from '../providers/CartContext';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductsList from '../screens/products/ProductsList';
import ProductForm from '../screens/products/ProductForm';
import CustomersList from '../screens/customers/CustomersList';
import CustomerForm from '../screens/customers/CustomerForm';
import WarehousesList from '../screens/warehouses/WarehousesList';
import WarehouseForm from '../screens/warehouses/WarehouseForm';
import GlobalSearch from '../screens/GlobalSearch';
import SaleCreate from '../screens/sales/SaleCreate';
import PurchaseCreate from '../screens/purchases/PurchaseCreate';
import ReceivablesList from '../screens/finance/ReceivablesList';
import ReceivableCreate from '../screens/finance/ReceivableCreate';
import TenantSwitch from '../screens/tenants/TenantSwitch';
import UserScreen from '../screens/user/UserScreen';
import UnitCostScreen from '../screens/unitcost/UnitCostScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfitCompetitivenessScreen from '../screens/competitive/ProfitCompetitivenessScreen';
import SalesForecastScreen from '../screens/simulation/SalesForecastScreen';
import ImportSummaryScreen from '../imports/ImportSummaryScreen';
import OllamaChat from '../screens/OllamaChat';
import RecentActivity from '../screens/activity/RecentActivity';

// 👇 OJO: ruta exacta a tu archivo
import VerifyEmailScreen from '../screens/autentication/VerifyEmailScreen';

// Store (público)
import StoreFront from '../screens/store/StoreFront';
import ProductDetail from '../screens/store/ProductDetail';
import CartScreen from '../screens/store/CartScreen';
import CheckoutScreen from '../screens/store/CheckoutScreen';

// Easter egg
import EasterEgg from '../screens/EasterEgg';

const Stack = createNativeStackNavigator();

/** Paleta */
const P = {
  blue: '#2563EB',
  hanBlue: '#4458C7',
  violet: '#7C3AED',
  white: '#FFFFFF',
  text: '#0F172A',
  sub: '#64748B',
  border: '#E6EBFF',
  pageTop: '#0B1020',
  pageBottom: '#101733',
};

const headerShadow = Platform.select({
  ios: { headerShadowVisible: true },
  android: { headerShadowVisible: false },
  default: {},
});

/** Header app privada */
const appHeader = {
  headerStyle: { backgroundColor: P.white },
  headerTintColor: P.hanBlue,
  headerTitleStyle: { color: P.text, fontFamily: 'Apoka', fontSize: 17 },
  headerBackTitleVisible: false,
  headerLargeTitleShadowVisible: false,
  contentStyle: { backgroundColor: '#EEF2FF' },
  ...headerShadow,
} as const;

/** Header tienda pública */
const publicHeader = {
  headerStyle: { backgroundColor: P.pageTop },
  headerTintColor: '#E5EDFF',
  headerTitleStyle: { color: '#F8FAFF', fontFamily: 'Apoka', fontSize: 17 },
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: P.white },
  ...headerShadow,
} as const;

/** Opciones comunes */
const commonScreenOptions = {
  animation: 'fade' as const,
  gestureEnabled: true,
  headerTitleAlign: 'center' as const,
  headerLargeTitle: Platform.OS === 'ios',
  statusBarStyle: Platform.select<'light' | 'dark'>({
    ios: 'dark',
    android: 'light',
    default: 'dark',
  }),
};

export default function RootNavigator() {
  const { token } = useContext(AuthContext);

  return (
    <CartProvider>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          ...commonScreenOptions,
          ...appHeader,
        }}
      >
        {/* Splash sin header */}
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />

        {/* ======= SIEMPRE DISPONIBLE ======= */}
        <Stack.Screen name="EasterEgg" component={EasterEgg} options={{ headerShown: false }} />

        {/* ======= TIENDA PÚBLICA ======= */}
        <Stack.Screen name="Store" component={StoreFront} options={{ title: 'Tienda', ...publicHeader }} />
        <Stack.Screen name="StoreFront" component={StoreFront} options={{ title: 'Tienda', ...publicHeader }} />
        <Stack.Screen name="ProductDetail" component={ProductDetail} options={{ title: 'Producto', ...publicHeader }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Carrito', ...publicHeader }} />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{
            title: 'Checkout',
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'containedModal',
            ...publicHeader,
          }}
        />

        {!token ? (
          /* ======= AUTH (público) ======= */
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: 'Iniciar sesión', headerStyle: { backgroundColor: P.white }, headerTintColor: P.hanBlue }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Crear cuenta', headerStyle: { backgroundColor: P.white }, headerTintColor: P.hanBlue }}
            />
            {/* 👇 MOVIDO AQUÍ: accesible SIN token */}
            <Stack.Screen
              name="VerifyEmail"
              component={VerifyEmailScreen}
              options={{ headerShown: true, title: 'Verifica tu correo' }}
            />
          </>
        ) : (
          /* ======= APP PRIVADA (requiere token) ======= */
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                title: 'Contadito',
                headerStyle: { backgroundColor: P.white },
                headerTintColor: P.hanBlue,
                headerLargeTitle: Platform.OS === 'ios',
              }}
            />
            <Stack.Screen name="UserScreen" component={UserScreen} options={{ title: 'Usuario' }} />

            {/* CRUDs */}
            <Stack.Screen name="ProductsList" component={ProductsList} options={{ title: 'Productos' }} />
            <Stack.Screen
              name="ProductForm"
              component={ProductForm}
              options={{ title: 'Producto', presentation: Platform.OS === 'ios' ? 'formSheet' : 'card' }}
            />
            <Stack.Screen name="CustomersList" component={CustomersList} options={{ title: 'Clientes' }} />
            <Stack.Screen
              name="CustomerForm"
              component={CustomerForm}
              options={{ title: 'Cliente', presentation: Platform.OS === 'ios' ? 'formSheet' : 'card' }}
            />
            <Stack.Screen name="WarehousesList" component={WarehousesList} options={{ title: 'Almacenes' }} />
            <Stack.Screen
              name="WarehouseForm"
              component={WarehouseForm}
              options={{ title: 'Almacén', presentation: Platform.OS === 'ios' ? 'formSheet' : 'card' }}
            />

            {/* Extras */}
            <Stack.Screen name="GlobalSearch" component={GlobalSearch} options={{ title: 'Búsqueda' }} />
            <Stack.Screen name="SaleCreate" component={SaleCreate} options={{ title: 'Nueva venta' }} />
            <Stack.Screen name="PurchaseCreate" component={PurchaseCreate} options={{ title: 'Nueva compra' }} />
            <Stack.Screen name="ReceivablesList" component={ReceivablesList} options={{ title: 'Cuentas por cobrar' }} />
            <Stack.Screen name="ReceivableCreate" component={ReceivableCreate} options={{ title: 'Nueva CxC' }} />
            <Stack.Screen name="OllamaChat" component={OllamaChat} options={{ title: 'Chat IA (local)' }} />

            <Stack.Screen name="SalesForecast" component={SalesForecastScreen} options={{ title: 'Pronóstico (IA)' }} />
            <Stack.Screen name="UnitCost" component={UnitCostScreen} options={{ title: 'Costo unitario' }} />

            {/* Reportes */}
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reportes' }} />
            <Stack.Screen
              name="ProfitCompetitiveness"
              component={ProfitCompetitivenessScreen}
              options={{ title: 'Rentabilidad & Competitividad' }}
            />

            <Stack.Screen name="RecentActivity" component={RecentActivity} options={{ title: 'Actividad' }} />

            <Stack.Screen
              name="ImportSummary"
              component={ImportSummaryScreen}
              options={{ title: 'Importar · Resumen', presentation: Platform.OS === 'ios' ? 'formSheet' : 'card' }}
            />

            <Stack.Screen name="TenantSwitch" component={TenantSwitch} options={{ title: 'Cambiar empresa' }} />
          </>
        )}
      </Stack.Navigator>
    </CartProvider>
  );
}
