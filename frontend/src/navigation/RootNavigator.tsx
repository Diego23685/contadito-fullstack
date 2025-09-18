import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../providers/AuthContext';

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

// NUEVAS PANTALLAS (placeholders funcionales)
import GlobalSearch from '../screens/GlobalSearch';
import SaleCreate from '../screens/sales/SaleCreate';
import PurchaseCreate from '../screens/purchases/PurchaseCreate';
import ReceivablesList from '../screens/finance/ReceivablesList';
import TenantSwitch from '../screens/tenants/TenantSwitch';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token } = useContext(AuthContext);

  if (!token) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro' }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />

      {/* CRUDs existentes */}
      <Stack.Screen name="ProductsList" component={ProductsList} options={{ title: 'Productos' }} />
      <Stack.Screen name="ProductForm" component={ProductForm} options={{ title: 'Producto' }} />
      <Stack.Screen name="CustomersList" component={CustomersList} options={{ title: 'Clientes' }} />
      <Stack.Screen name="CustomerForm" component={CustomerForm} options={{ title: 'Cliente' }} />
      <Stack.Screen name="WarehousesList" component={WarehousesList} options={{ title: 'Almacenes' }} />
      <Stack.Screen name="WarehouseForm" component={WarehouseForm} options={{ title: 'Almacén' }} />

      {/* NUEVAS rutas para que funcionen los botones del Home */}
      <Stack.Screen name="GlobalSearch" component={GlobalSearch} options={{ title: 'Búsqueda' }} />
      <Stack.Screen name="SaleCreate" component={SaleCreate} options={{ title: 'Nueva venta' }} />
      <Stack.Screen name="PurchaseCreate" component={PurchaseCreate} options={{ title: 'Nueva compra' }} />
      <Stack.Screen name="ReceivablesList" component={ReceivablesList} options={{ title: 'Por cobrar' }} />
      <Stack.Screen name="TenantSwitch" component={TenantSwitch} options={{ title: 'Cambiar empresa' }} />
    </Stack.Navigator>
  );
}
