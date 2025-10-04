// src/providers/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CartItem = {
  lineId: string;
  productId: number;
  name: string;
  price: number;
  qty: number;
  image?: string | null;
};

type Ctx = {
  items: CartItem[];
  total: number;
  add: (item: Omit<CartItem, 'lineId' | 'qty'>, qty?: number) => void;
  remove: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: (slug?: string) => void; // slug opcional: lo usas en CheckoutScreen
};

const CartContext = createContext<Ctx>({
  items: [],
  total: 0,
  add: () => {},
  remove: () => {},
  setQty: () => {},
  clear: () => {},
});

const STORAGE_KEY = 'cart:v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // cargar carrito persistido
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // persist helper
  const persist = async (next: CartItem[]) => {
    setItems(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const total = useMemo(
    () => items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0),
    [items]
  );

  const add: Ctx['add'] = (item, qty = 1) => {
    persist(
      ((prev) => {
        const idx = prev.findIndex((i) => i.productId === item.productId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
          return copy;
        }
        const lineId = `${item.productId}-${Date.now()}`;
        return [...prev, { ...item, qty, lineId }];
      })(items)
    );
  };

  const remove: Ctx['remove'] = (productId) => persist(items.filter((i) => i.productId !== productId));

  const setQty: Ctx['setQty'] = (productId, qty) => {
    if (qty <= 0) return remove(productId);
    persist(items.map((i) => (i.productId === productId ? { ...i, qty } : i)));
  };

  const clear: Ctx['clear'] = (_slug) => {
    // Si quisieras un carrito por tienda, aquí podrías usar _slug para elegir otra KEY.
    persist([]);
  };

  const value = useMemo(() => ({ items, total, add, remove, setQty, clear }), [items, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
