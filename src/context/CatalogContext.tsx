import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyOverrides, loadCatalog, type Catalog, type DrugOverride, type Overrides } from '../data/catalog';
import { readJson, useStorageSync, writeJson } from '../lib/storage';
import type { Drug } from '../types';

type CatalogState =
  | { status: 'loading'; catalog: null }
  | { status: 'error'; catalog: null }
  | { status: 'ready'; catalog: Catalog };

/** The fields an admin can change. `image: null` removes the product photo. */
export interface DrugEdit {
  nameAr?: string;
  nameEn?: string;
  price?: number;
  image?: string | null;
}

interface InventoryApi {
  retry: () => void;
  /** Every drug in the database with the admin's edits applied — including hidden ones. Dashboard only. */
  inventory: Drug[] | null;
  overrides: Overrides;
  /** The drug exactly as it is in the database, before any admin edit. */
  baseOf: (id: string) => Drug | undefined;
  /**
   * Merges `fields` into the drug and saves to localStorage. Fields that end up equal to the database
   * value are dropped, so setting everything back restores the original.
   * Returns false — and changes nothing — when the browser's storage is full.
   */
  updateDrug: (id: string, fields: DrugEdit) => boolean;
  /** false hides the drug from the storefront and its search results. */
  setInStock: (id: string, inStock: boolean) => boolean;
}

/** `catalog` is the customer-facing catalogue: hidden drugs are already removed and edits already applied. */
type CatalogValue = CatalogState & InventoryApi;

const OVERRIDES_KEY = 'alyusr.inventoryOverrides';
const CatalogContext = createContext<CatalogValue | null>(null);

/** Product photos are either a remote https:// link or a small compressed upload stored inline. */
export const isImageSource = (value: unknown): value is string =>
  typeof value === 'string' && (value.startsWith('https://') || value.startsWith('data:image/'));

function readOverrides(): Overrides {
  const parsed = readJson<unknown>(OVERRIDES_KEY, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const clean: Overrides = {};
  for (const [id, value] of Object.entries(parsed as Record<string, DrugOverride | null>)) {
    if (!value || typeof value !== 'object') continue;
    const entry: DrugOverride = {};
    if (typeof value.price === 'number' && Number.isFinite(value.price) && value.price > 0) entry.price = value.price;
    if (value.hidden === true) entry.hidden = true;
    if (typeof value.nameAr === 'string' && value.nameAr.trim()) entry.nameAr = value.nameAr;
    if (typeof value.nameEn === 'string' && value.nameEn.trim()) entry.nameEn = value.nameEn;
    if (value.image === null || isImageSource(value.image)) entry.image = value.image;
    if (Object.keys(entry).length > 0) clean[id] = entry;
  }
  return clean;
}

/**
 * Fetches /data/egyptian-drugs.json once on app load, then layers the admin's edits
 * (names, price, photo, stock visibility — kept in localStorage) on top of it.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogState>({ status: 'loading', catalog: null });
  const [attempt, setAttempt] = useState(0);
  const [overrides, setOverrides] = useState<Overrides>(readOverrides);

  // Mutators read the latest values through refs, so they can save synchronously and report failure.
  const overridesRef = useRef(overrides);
  const baseRef = useRef<Catalog | null>(null);
  baseRef.current = state.catalog;

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', catalog: null });
    loadCatalog(controller.signal)
      .then((catalog) => setState({ status: 'ready', catalog }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ status: 'error', catalog: null });
      });
    return () => controller.abort();
  }, [attempt]);

  // An admin editing in another tab updates this tab's storefront straight away.
  useStorageSync(
    OVERRIDES_KEY,
    useCallback(() => {
      overridesRef.current = readOverrides();
      setOverrides(overridesRef.current);
    }, []),
  );

  /** Applies `change` to one drug's override, persists, then publishes. Storage is written first so a full quota aborts cleanly. */
  const patch = useCallback((id: string, change: (entry: DrugOverride) => void): boolean => {
    const current = overridesRef.current;
    const entry: DrugOverride = { ...current[id] };
    change(entry);
    const next = { ...current };
    if (Object.keys(entry).length === 0) delete next[id];
    else next[id] = entry;
    if (!writeJson(OVERRIDES_KEY, next)) return false;
    overridesRef.current = next;
    setOverrides(next);
    return true;
  }, []);

  const updateDrug = useCallback<InventoryApi['updateDrug']>(
    (id, fields) => {
      const base = baseRef.current?.byId.get(id);
      if (!base) return false;
      return patch(id, (entry) => {
        if (fields.nameAr !== undefined) {
          const nameAr = fields.nameAr.replace(/\s+/g, ' ').trim();
          if (!nameAr || nameAr === base.nameAr) delete entry.nameAr;
          else entry.nameAr = nameAr;
        }
        if (fields.nameEn !== undefined) {
          const nameEn = fields.nameEn.replace(/\s+/g, ' ').trim();
          if (!nameEn || nameEn === base.nameEn) delete entry.nameEn;
          else entry.nameEn = nameEn;
        }
        if (fields.price !== undefined) {
          const valid = Number.isFinite(fields.price) && fields.price > 0;
          if (!valid || fields.price === base.price) delete entry.price;
          else entry.price = fields.price;
        }
        if (fields.image !== undefined) {
          if (fields.image === null) {
            if (base.image) entry.image = null; // explicitly removed
            else delete entry.image;
          } else if (!isImageSource(fields.image) || fields.image === base.image) delete entry.image;
          else entry.image = fields.image;
        }
      });
    },
    [patch],
  );

  const setInStock = useCallback<InventoryApi['setInStock']>(
    (id, inStock) =>
      patch(id, (entry) => {
        if (inStock) delete entry.hidden;
        else entry.hidden = true;
      }),
    [patch],
  );

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  const value = useMemo<CatalogValue>(() => {
    const api = { retry, overrides, updateDrug, setInStock };
    if (state.status !== 'ready') return { ...state, ...api, inventory: null, baseOf: () => undefined };
    const base = state.catalog;
    const { storefront, inventory } = applyOverrides(base, overrides);
    return { status: 'ready', catalog: storefront, inventory, baseOf: (id) => base.byId.get(id), ...api };
  }, [state, overrides, retry, updateDrug, setInStock]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
