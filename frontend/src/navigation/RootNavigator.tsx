import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../providers/AuthContext';

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

// Nuevas
import GlobalSearch from '../screens/GlobalSearch';
import SaleCreate from '../screens/sales/SaleCreate';
import PurchaseCreate from '../screens/purchases/PurchaseCreate';
import ReceivablesList from '../screens/finance/ReceivablesList';
import ReceivableCreate from '../screens/finance/ReceivableCreate';
import TenantSwitch from '../screens/tenants/TenantSwitch';
import UserScreen from '../screens/user/UserScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token } = useContext(AuthContext);

  return (
    <Stack.Navigator
      initialRouteName="Splash"           // 👈 primero Splash
      screenOptions={{ headerBackTitleVisible: false }}
    >
      {/* Splash sin header */}
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />

      {!token ? (
        // ======== AUTH STACK ========
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro' }} />
        </>
      ) : (
        // ======== APP STACK ========
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

          {/* Extras / Finanzas */}
          <Stack.Screen name="GlobalSearch" component={GlobalSearch} options={{ title: 'Búsqueda' }} />
          <Stack.Screen name="SaleCreate" component={SaleCreate} options={{ title: 'Nueva venta' }} />
          <Stack.Screen name="PurchaseCreate" component={PurchaseCreate} options={{ title: 'Nueva compra' }} />
          <Stack.Screen name="ReceivablesList" component={ReceivablesList} options={{ title: 'Cuentas por cobrar' }} />
          <Stack.Screen name="ReceivableCreate" component={ReceivableCreate} options={{ title: 'Nueva CxC' }} />
          <Stack.Screen name="TenantSwitch" component={TenantSwitch} options={{ title: 'Cambiar empresa' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
