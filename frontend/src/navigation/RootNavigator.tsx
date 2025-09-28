// src/navigation/RootNavigator.tsx
import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../providers/AuthContext';
import OllamaChat from '../screens/OllamaChat';

// Splash
import SplashScreen from '../screens/SplashScreen';

// Auth
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// App
import HomeScreen from '../screens/HomeScreen';
import ProductsList from '../screens/products/ProductsList';
import ProductForm from '../screens/products/ProductForm';
import CustomersList from '../screens/customers/CustomersList';
import CustomerForm from '../screens/customers/CustomerForm';
import WarehousesList from '../screens/warehouses/WarehousesList';
import WarehouseForm from '../screens/warehouses/WarehouseForm';

// Extras
import GlobalSearch from '../screens/GlobalSearch';
import SaleCreate from '../screens/sales/SaleCreate';
import PurchaseCreate from '../screens/purchases/PurchaseCreate';
import ReceivablesList from '../screens/finance/ReceivablesList';
import ReceivableCreate from '../screens/finance/ReceivableCreate';
import TenantSwitch from '../screens/tenants/TenantSwitch';
import UserScreen from '../screens/user/UserScreen';

import UnitCostScreen from '../screens/unitcost/UnitCostScreen';

// Store (público)
import StoreFront from '../screens/store/StoreFront';
import ProductDetail from '../screens/store/ProductDetail';
import CartScreen from '../screens/store/CartScreen';
import CheckoutScreen from '../screens/store/CheckoutScreen';

//Importaciones
import ImportSummaryScreen from '../imports/ImportSummaryScreen';

import SalesForecastScreen from '../screens/simulation/SalesForecastScreen';

// 👇 NUEVO: Reportes
import ReportsScreen from '../screens/ReportsScreen'; // <- ajusta la ruta si lo creaste en otra carpeta

// Cart provider
import { CartProvider } from '../providers/CartContext';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token } = useContext(AuthContext);

  return (
    <CartProvider>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerBackTitleVisible: false }}
      >
        {/* Splash sin header */}
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />

        {/* ======= TIENDA PÚBLICA (disponible siempre) ======= */}
        {/* Alias para mantener navegaciones existentes: navigate('Store', { tenantId }) */}
        <Stack.Screen name="Store" component={StoreFront} options={{ title: 'Tienda' }} />
        {/* Nombre “nuevo” si prefieres usarlo en adelante */}
        <Stack.Screen name="StoreFront" component={StoreFront} options={{ title: 'Tienda' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetail} options={{ title: 'Producto' }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Carrito' }} />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{ title: 'Checkout', presentation: 'modal' }}
        />

        {!token ? (
          // ======= AUTH =======
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro' }} />
          </>
        ) : (
          // ======= APP PRIVADA =======
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Contadito' }} />
            <Stack.Screen name="UserScreen" component={UserScreen} options={{ title: 'Usuario' }} />

            {/* CRUDs */}
            <Stack.Screen name="ProductsList" component={ProductsList} options={{ title: 'Productos' }} />
            <Stack.Screen name="ProductForm" component={ProductForm} options={{ title: 'Producto' }} />
            <Stack.Screen name="CustomersList" component={CustomersList} options={{ title: 'Clientes' }} />
            <Stack.Screen name="CustomerForm" component={CustomerForm} options={{ title: 'Cliente' }} />
            <Stack.Screen name="WarehousesList" component={WarehousesList} options={{ title: 'Almacenes' }} />
            <Stack.Screen name="WarehouseForm" component={WarehouseForm} options={{ title: 'Almacén' }} />
            <Stack.Screen name="OllamaChat" component={OllamaChat} options={{ title: 'Chat IA (local)' }} />
            {/* Extras */}
            <Stack.Screen name="GlobalSearch" component={GlobalSearch} options={{ title: 'Búsqueda' }} />
            <Stack.Screen name="SaleCreate" component={SaleCreate} options={{ title: 'Nueva venta' }} />
            <Stack.Screen name="PurchaseCreate" component={PurchaseCreate} options={{ title: 'Nueva compra' }} />
            <Stack.Screen name="ReceivablesList" component={ReceivablesList} options={{ title: 'Cuentas por cobrar' }} />
            <Stack.Screen name="ReceivableCreate" component={ReceivableCreate} options={{ title: 'Nueva CxC' }} />
           
            <Stack.Screen
              name="SalesForecast"
              component={SalesForecastScreen}
              options={{ title: 'Pronóstico (IA)' }}
            />
            <Stack.Screen
              name="UnitCost"
              component={UnitCostScreen}
              options={{ title: 'Costo unitario' }}
            />

            {/* 👇 NUEVO: pantalla de Reportes */}
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{ title: 'Reportes' }}
            />

            <Stack.Screen name="ImportSummary" component={ImportSummaryScreen} options={{ title: 'Importar . Resumen' }} />
            <Stack.Screen name="TenantSwitch" component={TenantSwitch} options={{ title: 'Cambiar empresa' }} />
          </>
        )}
      </Stack.Navigator>
    </CartProvider>
  );
}
