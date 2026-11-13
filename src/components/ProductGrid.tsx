import { ChevronDown, MessageCircle, PackageSearch, RefreshCw, WifiOff, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { useLang } from '../context/LanguageContext';
import { categoryById, forms, PAGE_SIZE } from '../data/catalog';
import { scrollToId } from '../lib/hooks';
import { searchDrugs } from '../lib/search';
import type { CategoryId, Drug, FormId } from '../types';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { FloatingCapsules } from './FloatingCapsules';
import { SearchBar } from './SearchBar';

type SortMode = 'default' | 'low' | 'high';

interface ProductGridProps {
  query: string;
  category: CategoryId | 'all';
  onQueryChange: (value: string) => void;
  onCategoryChange: (category: CategoryId | 'all') => void;
  onQuickView: (drug: Drug) => void;
}

// Phones: two compact columns. Tablets keep two roomier ones; desktop gets three.
const GRID = 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-8';
const SELECT = 'glass-flat h-12 rounded-full ps-5 pe-3 text-sm font-semibold text-brand-900 outline-none';

export function ProductGrid({ query, category, onQueryChange, onCategoryChange, onQuickView }: ProductGridProps) {
  const { t, pick } = useLang();
  const { catalog, status, retry } = useCatalog();
  const [sort, setSort] = useState<SortMode>('default');
  const [form, setForm] = useState<FormId | 'all'>('all');

  // Keeps typing responsive while the full dataset is filtered.
  const trimmed = useDeferredValue(query.trim());

  const results = useMemo(() => {
    if (!catalog) return [];
    let list: Drug[] = catalog.drugs;
    if (category !== 'all' || form !== 'all') {
      list = list.filter(
        (drug) => (category === 'all' || drug.category === category) && (form === 'all' || drug.form === form),
      );
    }
    list = searchDrugs(list, trimmed);
    if (sort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...list].sort((a, b) => b.price - a.price);
    // Default browsing order: well-known products that have a real photo come first.
    if (!trimmed) {
      const withPhoto = list.filter((drug) => drug.image);
      if (withPhoto.length > 0 && withPhoto.length < list.length) {
        return withPhoto.concat(list.filter((drug) => !drug.image));
      }
    }
    return list;
  }, [catalog, category, form, trimmed, sort]);

  // "Load more" paging; any change of filters starts again from the first page.
  const filterKey = `${trimmed}|${category}|${form}|${sort}`;
  const [page, setPage] = useState({ key: filterKey, count: PAGE_SIZE });
  const shownCount = Math.min(page.key === filterKey ? page.count : PAGE_SIZE, results.length);
  const visible = results.slice(0, shownCount);
  const remaining = results.length - shownCount;

  const categoryName = category === 'all' ? null : pick(categoryById.get(category)!.name);
  const filtered = Boolean(trimmed) || category !== 'all' || form !== 'all';

  const clearAll = () => {
    onQueryChange('');
    onCategoryChange('all');
    setForm('all');
  };

  return (
    <section id="products" className="relative scroll-mt-28 py-12 sm:py-20 lg:py-28">
      <FloatingCapsules preset="products" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-brand-600">{trimmed ? t.products.searchFor : t.products.eyebrow}</p>
          <h2 className="mt-2 break-words text-2xl font-bold leading-snug text-brand-900 sm:mt-3 sm:text-4xl sm:leading-snug">
            {trimmed ? `“${trimmed}”` : (categoryName ?? t.products.title)}
          </h2>
        </div>

        {/* One quiet toolbar: search, dosage form, sort */}
        <div className="relative z-20 mt-7 flex flex-col gap-3 sm:mt-10 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar query={query} onQueryChange={onQueryChange} onOpenDrug={onQuickView} onSubmit={() => undefined} />
          </div>
          <div className="flex gap-3">
            <select
              value={form}
              onChange={(event) => setForm(event.target.value as FormId | 'all')}
              aria-label={t.cat.formsTitle}
              className={`${SELECT} min-w-0 flex-1 lg:flex-none`}
            >
              <option value="all">{t.cat.allForms}</option>
              {forms.map((item) => (
                <option key={item.id} value={item.id}>
                  {pick(item.name)}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              aria-label={t.products.sortLabel}
              className={`${SELECT} min-w-0 flex-1 lg:flex-none`}
            >
              <option value="default">{`${t.products.sortLabel}: ${t.products.sortDefault}`}</option>
              <option value="low">{t.products.sortLow}</option>
              <option value="high">{t.products.sortHigh}</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-x-3 px-1 text-sm text-muted sm:mt-5 sm:px-2">
          <p aria-live="polite">
            {status === 'ready' ? t.products.count(shownCount, results.length) : status === 'loading' ? t.products.loading : ''}
          </p>
          {filtered && (
            <button
              type="button"
              onClick={clearAll}
              className="flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 transition hover:text-brand-900"
            >
              <X className="size-4" aria-hidden="true" />
              {t.products.clearFilters}
            </button>
          )}
        </div>

        {status === 'loading' && (
          <div className={`mt-4 sm:mt-8 ${GRID}`} role="status" aria-label={t.products.loading}>
            {Array.from({ length: 6 }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="glass mt-6 flex flex-col items-center rounded-[2rem] px-5 py-12 text-center sm:mt-8 sm:py-20" role="alert">
            <span className="grid size-16 place-items-center rounded-full bg-coral-50 text-coral-700">
              <WifiOff className="size-7" aria-hidden="true" />
            </span>
            <p className="mt-6 text-xl font-bold text-ink">{t.products.errorTitle}</p>
            <p className="mt-2 max-w-sm text-muted">{t.products.errorBody}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-8 flex h-12 items-center gap-2 rounded-full btn-primary px-7 text-sm font-bold transition hover:brightness-110"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {t.products.retry}
            </button>
          </div>
        )}

        {status === 'ready' && visible.length > 0 && (
          <>
            <div className={`mt-4 sm:mt-8 ${GRID}`}>
              {visible.map((drug) => (
                <ProductCard key={drug.id} drug={drug} onQuickView={onQuickView} />
              ))}
            </div>

            {remaining > 0 && (
              <div className="mt-8 flex flex-col items-center gap-3 sm:mt-14">
                <button
                  type="button"
                  onClick={() => setPage({ key: filterKey, count: shownCount + PAGE_SIZE })}
                  className="glass flex h-14 w-full items-center justify-center gap-2.5 rounded-full px-10 text-base font-bold text-brand-900 transition hover:bg-surface/90 active:scale-[0.98] sm:w-auto"
                >
                  {t.products.loadMore}
                  <ChevronDown className="size-5" aria-hidden="true" />
                </button>
                <p className="text-sm text-muted">{t.products.remaining(remaining)}</p>
              </div>
            )}

            <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed text-muted">{t.products.priceNote}</p>
          </>
        )}

        {status === 'ready' && visible.length === 0 && (
          <div className="glass mt-6 flex flex-col items-center rounded-[2rem] px-5 py-12 text-center sm:mt-8 sm:py-20">
            <span className="grid size-16 place-items-center rounded-full bg-tint text-brand-600">
              <PackageSearch className="size-7" aria-hidden="true" />
            </span>
            <p className="mt-6 text-xl font-bold text-ink">{t.products.emptyTitle}</p>
            <p className="mt-2 max-w-sm text-muted">{t.products.emptyBody}</p>
            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={clearAll}
                className="h-12 rounded-full btn-primary px-7 text-sm font-bold transition hover:brightness-110"
              >
                {t.products.clearFilters}
              </button>
              <button
                type="button"
                onClick={() => scrollToId('consult')}
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-brand-200 bg-surface/60 px-6 text-sm font-semibold text-brand-800 transition hover:bg-surface"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                {t.hero.ask}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
