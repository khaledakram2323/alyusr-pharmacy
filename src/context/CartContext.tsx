import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Drug } from '../types';
import { useCatalog } from './CatalogContext';

export interface CartLine {
  drug: Drug;
  qty: number;
}

interface CartValue {
  lines: CartLine[];
  /** Total number of units across all lines. */
  count: number;
  subtotal: number;
  qtyOf: (id: string) => number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const STORAGE_KEY = 'alyusr.cart';
const MAX_QTY = 20;
const CartContext = createContext<CartValue | null>(null);

type Quantities = Record<string, number>;

function readStoredCart(): Quantities {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: Quantities = {};
    for (const [id, qty] of Object.entries(parsed)) {
      if (typeof qty === 'number' && qty > 0) clean[id] = Math.min(Math.floor(qty), MAX_QTY);
    }
    return clean;
  } catch {
    return {};
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { catalog } = useCatalog();
  const [quantities, setQuantities] = useState<Quantities>(readStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    } catch {
      /* ignore */
    }
  }, [quantities]);

  const setQty = useCallback((id: string, qty: number) => {
    setQuantities((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, MAX_QTY);
      return next;
    });
  }, []);

  const add = useCallback((id: string, qty = 1) => {
    setQuantities((current) => ({ ...current, [id]: Math.min((current[id] ?? 0) + qty, MAX_QTY) }));
  }, []);

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => setQuantities({}), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartValue>(() => {
    // Saved ids are resolved against the catalogue once it has loaded;
    // ids that no longer exist in the database are simply skipped.
    const lines: CartLine[] = [];
    if (catalog) {
      for (const [id, qty] of Object.entries(quantities)) {
        const drug = catalog.byId.get(id);
        if (drug) lines.push({ drug, qty });
      }
    }
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      subtotal: lines.reduce((sum, line) => sum + line.qty * line.drug.price, 0),
      qtyOf: (id) => quantities[id] ?? 0,
      add,
      setQty,
      remove,
      clear,
      isOpen,
      open,
      close,
    };
  }, [catalog, quantities, isOpen, add, setQty, remove, clear, open, close]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
