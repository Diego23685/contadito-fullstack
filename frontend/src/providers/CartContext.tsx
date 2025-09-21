import React, { createContext, useContext, useMemo, useReducer } from 'react';

type ProductInput = {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  sku?: string | null;
  slug?: string | null;
};

export type CartLine = {
  lineId: string;          // clave única para FlatList
  tenantRef: string;       // "5" o "DemoPyme"
  productId: number;
  name: string;
  price: number;
  qty: number;
  image?: string | null;
  sku?: string | null;
  slug?: string | null;
};

type State = { lines: Record<string, CartLine> };

type Ctx = {
  items: CartLine[];
  total: number;
  getQty: (productId: number, tenantRef: string) => number;
  addItem: (product: ProductInput, qty: number, tenantRef: string) => void;
  setQty: (productId: number, qty: number, tenantRef: string) => void;
  increment: (productId: number, tenantRef: string, by?: number) => void;
  decrement: (productId: number, tenantRef: string, by?: number) => void;
  remove: (productId: number, tenantRef: string) => void;
  removeByKey: (lineId: string) => void;
  clear: (tenantRef?: string) => void;
};

const CartContext = createContext<Ctx | null>(null);

const makeKey = (tenantRef: string, productId: number) => `t:${String(tenantRef)}|pid:${Number(productId)}`;
const makeLineId = (tenantRef: string, productId: number) => `${makeKey(tenantRef, productId)}|lid`;

type Action =
  | { type: 'ADD'; payload: { product: ProductInput; qty: number; tenantRef: string } }
  | { type: 'SET_QTY'; payload: { productId: number; qty: number; tenantRef: string } }
  | { type: 'INC'; payload: { productId: number; tenantRef: string; by: number } }
  | { type: 'DEC'; payload: { productId: number; tenantRef: string; by: number } }
  | { type: 'REMOVE'; payload: { productId: number; tenantRef: string } }
  | { type: 'REMOVE_BY_KEY'; payload: { lineId: string } }
  | { type: 'CLEAR'; payload: { tenantRef?: string } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD': {
      const { product, qty, tenantRef } = action.payload;
      const k = makeKey(tenantRef, product.id);
      const prev = state.lines[k];
      const nextQty = Math.max(0, (prev?.qty ?? 0) + (qty || 0));
      if (nextQty <= 0) {
        if (!prev) return state;
        const { [k]: _, ...rest } = state.lines;
        return { lines: rest };
      }
      const line: CartLine = {
        lineId: prev?.lineId ?? makeLineId(tenantRef, product.id),
        tenantRef,
        productId: product.id,
        name: product.name,
        price: product.price,
        qty: nextQty,
        image: product.image ?? prev?.image ?? null,
        sku: product.sku ?? prev?.sku ?? null,
        slug: product.slug ?? prev?.slug ?? null,
      };
      return { lines: { ...state.lines, [k]: line } };
    }
    case 'SET_QTY': {
      const { productId, qty, tenantRef } = action.payload;
      const k = makeKey(tenantRef, productId);
      const prev = state.lines[k];
      if (!prev && qty <= 0) return state;
      if (qty <= 0) {
        const { [k]: _, ...rest } = state.lines;
        return { lines: rest };
      }
      const line: CartLine = { ...prev!, qty };
      return prev ? { lines: { ...state.lines, [k]: line } } : state;
    }
    case 'INC': {
      const { productId, tenantRef, by } = action.payload;
      const k = makeKey(tenantRef, productId);
      const prev = state.lines[k];
      if (!prev) return state;
      const line: CartLine = { ...prev, qty: Math.max(0, prev.qty + (by || 1)) };
      return { lines: { ...state.lines, [k]: line } };
    }
    case 'DEC': {
      const { productId, tenantRef, by } = action.payload;
      const k = makeKey(tenantRef, productId);
      const prev = state.lines[k];
      if (!prev) return state;
      const newQty = Math.max(0, prev.qty - (by || 1));
      if (newQty <= 0) {
        const { [k]: _, ...rest } = state.lines;
        return { lines: rest };
      }
      const line: CartLine = { ...prev, qty: newQty };
      return { lines: { ...state.lines, [k]: line } };
    }
    case 'REMOVE': {
      const { productId, tenantRef } = action.payload;
      const k = makeKey(tenantRef, productId);
      if (!state.lines[k]) return state;
      const { [k]: _, ...rest } = state.lines;
      return { lines: rest };
    }
    case 'REMOVE_BY_KEY': {
      const { lineId } = action.payload;
      const entries = Object.entries(state.lines);
      const found = entries.find(([_, v]) => v.lineId === lineId);
      if (!found) return state;
      const [foundKey] = found;
      const { [foundKey]: _, ...rest } = state.lines;
      return { lines: rest };
    }
    case 'CLEAR': {
      const { tenantRef } = action.payload;
      if (!tenantRef) return { lines: {} };
      const filtered: Record<string, CartLine> = {};
      for (const [k, v] of Object.entries(state.lines)) {
        if (v.tenantRef !== tenantRef) filtered[k] = v;
      }
      return { lines: filtered };
    }
    default:
      return state;
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, { lines: {} });

  const items = useMemo(() => Object.values(state.lines).slice().sort((a, b) => a.name.localeCompare(b.name, 'es')), [state.lines]);
  const total = useMemo(() => items.reduce((s, l) => s + Number(l.price) * Number(l.qty), 0), [items]);

  const api: Ctx = {
    items,
    total,
    getQty: (productId, tenantRef) => state.lines[makeKey(tenantRef, productId)]?.qty ?? 0,
    addItem: (product, qty, tenantRef) => dispatch({ type: 'ADD', payload: { product, qty, tenantRef } }),
    setQty: (productId, qty, tenantRef) => dispatch({ type: 'SET_QTY', payload: { productId, qty, tenantRef } }),
    increment: (productId, tenantRef, by = 1) => dispatch({ type: 'INC', payload: { productId, tenantRef, by } }),
    decrement: (productId, tenantRef, by = 1) => dispatch({ type: 'DEC', payload: { productId, tenantRef, by } }),
    remove: (productId, tenantRef) => dispatch({ type: 'REMOVE', payload: { productId, tenantRef } }),
    removeByKey: (lineId) => dispatch({ type: 'REMOVE_BY_KEY', payload: { lineId } }),
    clear: (tenantRef) => dispatch({ type: 'CLEAR', payload: { tenantRef } }),
  };

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
};
