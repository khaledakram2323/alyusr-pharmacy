import { ChevronLeft, ChevronRight, LoaderCircle, Pencil, Search, X } from 'lucide-react';
import { memo, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { useLang } from '../../context/LanguageContext';
import { categoryById } from '../../data/catalog';
import { searchDrugs } from '../../lib/search';
import type { Drug } from '../../types';
import { DrugTile } from '../DrugTile';
import { formatAmount } from '../Price';
import { EditDrugModal } from './EditDrugModal';
import { PanelHeader } from './PanelHeader';

type StockFilter = 'all' | 'inStock' | 'hidden' | 'edited';

const PAGE_SIZE = 12;
const FILTERS: StockFilter[] = ['all', 'inStock', 'hidden', 'edited'];

export function InventoryPanel() {
  const { t, pick } = useLang();
  const { inventory, status, retry, overrides, baseOf, setInStock } = useCatalog();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storageFull, setStorageFull] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());

  // Searching 25k rows is the slow part, so it only reruns when the query or the data changes…
  const matched = useMemo(() => (inventory ? searchDrugs(inventory, deferredQuery) : []), [inventory, deferredQuery]);
  // …while the cheap status filter runs on every toggle.
  const rows = useMemo(() => {
    if (filter === 'all') return matched;
    return matched.filter((drug) => {
      const entry = Object.hasOwn(overrides, drug.id) ? overrides[drug.id] : undefined;
      if (filter === 'hidden') return entry?.hidden === true;
      if (filter === 'inStock') return !entry?.hidden;
      return !!entry && Object.keys(entry).some((key) => key !== 'hidden');
    });
  }, [matched, filter, overrides]);

  useEffect(() => setPage(1), [deferredQuery, filter]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Looked up by id on every render, so the modal always opens with the latest saved values.
  const editing = editingId ? inventory?.find((drug) => drug.id === editingId) : undefined;
  const toggleStock = (id: string, inStock: boolean) => setStorageFull(!setInStock(id, inStock));

  return (
    <>
      <PanelHeader title={t.admin.inventory.title} sub={t.admin.inventory.sub} />

      <section className="glass rounded-[2rem] p-3 sm:p-5">
        {/* ── Search + filters ── */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-mist px-4 transition focus-within:border-brand-500">
            <Search className="size-4.5 shrink-0 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.admin.inventory.search}
              aria-label={t.admin.inventory.search}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t.nav.clear}
                className="-me-2 grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </label>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label={t.admin.inventory.colStock}>
            {FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                  filter === option
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-800'
                    : 'border-line text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {t.admin.inventory.filters[option]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        {status === 'loading' ? (
          <p className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t.products.loading}
          </p>
        ) : status === 'error' ? (
          <div className="py-16 text-center">
            <p className="font-bold text-ink">{t.products.errorTitle}</p>
            <p className="mt-1 text-sm text-muted">{t.products.errorBody}</p>
            <button type="button" onClick={retry} className="btn-primary mt-5 h-11 rounded-full px-6 text-sm font-bold">
              {t.products.retry}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-4 px-1 text-xs font-medium text-muted" aria-live="polite">
              {t.admin.inventory.results(rows.length)}
            </p>
            {storageFull && (
              <p role="alert" className="mt-2 rounded-xl border border-coral/40 bg-coral/15 px-3.5 py-2 text-sm font-medium text-coral-700">
                {t.admin.inventory.storageFull}
              </p>
            )}

            <div className="mt-2 overflow-hidden rounded-2xl border border-line">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-white/5 text-xs font-semibold text-label">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-start sm:px-4">
                      {t.admin.inventory.colDrug}
                    </th>
                    <th scope="col" className="hidden w-44 px-4 py-3 text-start lg:table-cell">
                      {t.admin.inventory.colCategory}
                    </th>
                    <th scope="col" className="w-20 px-2 py-3 text-start sm:w-32 sm:px-4">
                      {t.admin.inventory.colPrice}
                    </th>
                    <th scope="col" className="w-16 px-2 py-3 text-center sm:w-24 sm:px-4">
                      {t.admin.inventory.colStock}
                    </th>
                    <th scope="col" className="w-14 px-2 py-3 text-center sm:w-28 sm:px-4">
                      {t.admin.inventory.colEdit}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((drug) => (
                    <InventoryRow
                      key={drug.id}
                      drug={drug}
                      category={pick(categoryById.get(drug.category)!.name)}
                      basePrice={baseOf(drug.id)?.price ?? drug.price}
                      edited={Object.hasOwn(overrides, drug.id) && Object.keys(overrides[drug.id]).some((key) => key !== 'hidden')}
                      inStock={!(Object.hasOwn(overrides, drug.id) && overrides[drug.id].hidden)}
                      onEdit={setEditingId}
                      onStock={toggleStock}
                    />
                  ))}
                </tbody>
              </table>
              {visible.length === 0 && <p className="px-4 py-14 text-center text-sm text-muted">{t.admin.inventory.empty}</p>}
            </div>

            {/* ── Pagination ── */}
            <nav className="mt-4 flex items-center justify-between gap-3" aria-label={t.admin.inventory.page(current, pages)}>
              <PageButton label={t.admin.inventory.prev} disabled={current <= 1} onClick={() => setPage(current - 1)}>
                <ChevronRight className="size-4 ltr:rotate-180" aria-hidden="true" />
              </PageButton>
              <p className="text-sm font-medium text-muted">{t.admin.inventory.page(current, pages)}</p>
              <PageButton label={t.admin.inventory.next} disabled={current >= pages} onClick={() => setPage(current + 1)} trailing>
                <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
              </PageButton>
            </nav>
          </>
        )}
      </section>

      {editing && <EditDrugModal key={editing.id} drug={editing} onClose={() => setEditingId(null)} />}
    </>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  trailing = false,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  trailing?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold text-white/80 transition hover:border-brand-500/50 hover:bg-white/10 disabled:opacity-35 disabled:hover:border-line disabled:hover:bg-transparent"
    >
      {!trailing && children}
      {label}
      {trailing && children}
    </button>
  );
}

interface InventoryRowProps {
  drug: Drug;
  category: string;
  basePrice: number;
  /** Name, price or photo differs from the database. */
  edited: boolean;
  inStock: boolean;
  onEdit: (id: string) => void;
  onStock: (id: string, inStock: boolean) => void;
}

const InventoryRow = memo(function InventoryRow({ drug, category, basePrice, edited, inStock, onEdit, onStock }: InventoryRowProps) {
  const { t } = useLang();
  return (
    <tr className={`transition ${inStock ? 'hover:bg-white/[0.03]' : 'bg-black/20'}`}>
      <td className="px-3 py-3 align-middle sm:px-4">
        <div className={`flex items-center gap-3 ${inStock ? '' : 'opacity-55'}`}>
          <DrugTile drug={drug} className="hidden size-12 rounded-xl sm:grid" iconClassName="size-6" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink">{drug.nameAr}</span>
              {edited && (
                <span className="hidden shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-800 sm:inline">
                  {t.admin.inventory.editedTag}
                </span>
              )}
            </p>
            <p className="num truncate text-start text-xs text-muted rtl:text-end">{drug.nameEn}</p>
            {drug.scientific && <p className="num mt-0.5 hidden truncate text-start text-[11px] text-label/80 sm:block rtl:text-end">{drug.scientific}</p>}
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-3 align-middle text-xs text-muted lg:table-cell">{category}</td>
      <td className="px-2 py-3 align-middle sm:px-4">
        <p className={`num text-start text-sm font-bold rtl:text-end ${drug.price !== basePrice ? 'text-brand-800' : 'text-ink'}`}>{formatAmount(drug.price)}</p>
        {drug.price !== basePrice && (
          <p className="text-[11px] text-muted">
            {t.admin.inventory.original} <span className="num line-through">{formatAmount(basePrice)}</span>
          </p>
        )}
      </td>
      <td className="px-2 py-3 text-center align-middle sm:px-4">
        <Switch checked={inStock} onChange={(next) => onStock(drug.id, next)} label={t.admin.inventory.stockOf(drug.nameAr)} />
        <p className={`mt-1 hidden text-[11px] font-semibold sm:block ${inStock ? 'text-brand-500' : 'text-muted'}`}>
          {inStock ? t.admin.inventory.inStock : t.admin.inventory.hidden}
        </p>
      </td>
      <td className="px-2 py-3 text-center align-middle sm:px-4">
        <button
          type="button"
          onClick={() => onEdit(drug.id)}
          aria-label={t.admin.inventory.editOf(drug.nameAr)}
          title={t.admin.inventory.edit}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-line px-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-500/50 hover:bg-brand-500/15 sm:px-3.5"
        >
          <Pencil className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t.admin.inventory.edit}</span>
        </button>
      </td>
    </tr>
  );
});

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-300 ${
        checked ? 'border-brand-500/60 bg-brand-500/80 shadow-[0_0_18px_-4px_rgba(34,211,238,0.9)]' : 'border-white/15 bg-white/10'
      }`}
    >
      <span
        className={`absolute start-0.5 size-5.5 rounded-full shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          checked ? 'bg-white ltr:translate-x-5 rtl:-translate-x-5' : 'bg-white/70'
        }`}
      />
    </button>
  );
}
