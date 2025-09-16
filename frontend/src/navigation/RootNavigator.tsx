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

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token } = useContext(AuthContext);

  if (!token) {
    // Stack de autenticacion
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro' }} />
      </Stack.Navigator>
    );
  }

  // Stack de la app (CRUDs)
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Stack.Screen name="ProductsList" component={ProductsList} options={{ title: 'Productos' }} />
      <Stack.Screen name="ProductForm" component={ProductForm} options={{ title: 'Producto' }} />
      <Stack.Screen name="CustomersList" component={CustomersList} options={{ title: 'Clientes' }} />
      <Stack.Screen name="CustomerForm" component={CustomerForm} options={{ title: 'Cliente' }} />
      <Stack.Screen name="WarehousesList" component={WarehousesList} options={{ title: 'Almacenes' }} />
      <Stack.Screen name="WarehouseForm" component={WarehouseForm} options={{ title: 'Almacen' }} />
    </Stack.Navigator>
  );
}
