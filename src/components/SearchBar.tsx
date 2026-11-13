import { LoaderCircle, Search, X } from 'lucide-react';
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { useLang } from '../context/LanguageContext';
import { searchDrugs } from '../lib/search';
import type { Drug } from '../types';
import { DrugNames, DrugTile } from './DrugTile';
import { Price } from './Price';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenDrug: (drug: Drug) => void;
  /** Called when the user asks for the full result list (Enter / "see all"). */
  onSubmit: () => void;
  /** "hero" is the large floating glass bar; "inline" is the compact one above the product grid. */
  variant?: 'hero' | 'inline';
}

const MAX_SHOWN = 5;

export function SearchBar({ query, onQueryChange, onOpenDrug, onSubmit, variant = 'inline' }: SearchBarProps) {
  const { t } = useLang();
  const { catalog, status } = useCatalog();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hero = variant === 'hero';

  // Typing stays instant; the full-dataset scan runs on the deferred value.
  const trimmed = useDeferredValue(query.trim());
  const results = useMemo(
    () => (trimmed && catalog ? searchDrugs(catalog.drugs, trimmed) : []),
    [trimmed, catalog],
  );
  const shown = results.slice(0, MAX_SHOWN);

  useEffect(() => setActive(-1), [trimmed]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const submit = () => {
    setOpen(false);
    inputRef.current?.blur();
    onSubmit();
  };

  const choose = (drug: Drug) => {
    setOpen(false);
    inputRef.current?.blur();
    onOpenDrug(drug);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (event.key === 'ArrowDown' && shown.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % shown.length);
    } else if (event.key === 'ArrowUp' && shown.length > 0) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? shown.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = shown[active];
      if (selected) choose(selected);
      else if (query.trim()) submit();
    }
  };

  return (
    <div ref={rootRef} className={`relative w-full ${open ? 'z-30' : ''}`}>
      <div
        className={`glass group flex items-center rounded-full transition focus-within:bg-surface/90 focus-within:ring-2 focus-within:ring-brand-300 ${
          hero ? 'h-14 gap-2.5 ps-5 pe-1.5 sm:h-16 sm:gap-3 sm:ps-6 sm:pe-2' : 'h-12 gap-2.5 ps-5 pe-1'
        }`}
      >
        <Search className={`shrink-0 text-brand-600 ${hero ? 'size-5.5' : 'size-4.5'}`} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={t.nav.searchLabel}
          autoComplete="off"
          value={query}
          placeholder={t.nav.searchPlaceholder}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`h-full min-w-0 flex-1 text-ellipsis bg-transparent text-ink outline-none placeholder:text-muted/80 ${hero ? 'text-base sm:text-lg' : 'text-base sm:text-sm'}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('');
              inputRef.current?.focus();
            }}
            aria-label={t.nav.clear}
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-brand-800"
          >
            <X className="size-4" />
          </button>
        )}
        {hero && (
          <button
            type="button"
            onClick={submit}
            className="hidden h-12 shrink-0 items-center rounded-full btn-primary px-6 text-sm font-bold transition hover:brightness-110 sm:flex"
          >
            {t.nav.searchLabel}
          </button>
        )}
      </div>

      {open && (
        <div id={listId} className="glass-strong absolute inset-x-0 top-full mt-3 animate-fade-up overflow-hidden rounded-3xl">
          {!trimmed && (
            <div className="p-4 sm:p-5">
              <p className="text-xs font-semibold text-muted">{t.nav.tryLabel}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.nav.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      onQueryChange(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex min-h-11 items-center rounded-full bg-tint px-4 text-sm font-medium text-brand-800 transition hover:bg-tint-200 sm:min-h-9"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {trimmed && status === 'loading' && (
            <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {t.nav.loading}
            </p>
          )}

          {trimmed && status === 'error' && <p className="p-6 text-center text-sm text-muted">{t.products.errorTitle}</p>}

          {trimmed && status === 'ready' && shown.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-ink">
                {t.nav.noResults} “{trimmed}”
              </p>
              <p className="mt-1 text-sm text-muted">{t.nav.noResultsHint}</p>
            </div>
          )}

          {shown.length > 0 && (
            <>
              <ul role="listbox" className="max-h-[55vh] overflow-y-auto p-2 thin-scroll">
                {shown.map((drug, index) => (
                  <li key={drug.id} role="option" aria-selected={index === active}>
                    <button
                      type="button"
                      onClick={() => choose(drug)}
                      onMouseEnter={() => setActive(index)}
                      className={`flex w-full items-center gap-3.5 rounded-2xl p-2.5 text-start transition ${
                        index === active ? 'bg-tint' : 'hover:bg-tint/50'
                      }`}
                    >
                      <DrugTile drug={drug} className="size-12 rounded-xl" iconClassName="size-6" />
                      <span className="min-w-0 flex-1">
                        <DrugNames
                          drug={drug}
                          primaryClassName="truncate text-sm font-semibold text-ink"
                          secondaryClassName="truncate text-xs text-muted"
                        />
                      </span>
                      <Price amount={drug.price} className="text-sm text-brand-800" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={submit}
                className="block w-full border-t border-line/70 px-4 py-3.5 text-center text-sm font-semibold text-brand-700 transition hover:bg-tint/60"
              >
                {t.nav.seeAll(results.length)}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
