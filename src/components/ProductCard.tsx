import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLang } from '../context/LanguageContext';
import type { Drug } from '../types';
import { DrugNames, DrugTile } from './DrugTile';
import { FormBadge } from './FormIcon';
import { Price } from './Price';
import { QuantityStepper } from './QuantityStepper';

interface ProductCardProps {
  drug: Drug;
  onQuickView: (drug: Drug) => void;
}

/**
 * Essentials only: photo/icon pod, both names, dosage form, price, add button.
 * Active ingredient, manufacturer and alternatives live in the quick-view modal.
 */
export function ProductCard({ drug, onQuickView }: ProductCardProps) {
  const { t, lang } = useLang();
  const { qtyOf, add, setQty } = useCart();
  const qty = qtyOf(drug.id);
  const name = lang === 'ar' ? drug.nameAr : drug.nameEn;

  return (
    <article className="glass-flat group flex min-w-0 flex-col rounded-3xl p-2.5 transition duration-300 hover:bg-surface/90 hover:shadow-lift sm:rounded-[2rem] sm:p-5 sm:hover:-translate-y-1">
      <button
        type="button"
        onClick={() => onQuickView(drug)}
        aria-label={`${t.products.details}: ${name}`}
        className="flex min-w-0 flex-1 flex-col rounded-2xl text-start sm:rounded-3xl"
      >
        <DrugTile
          drug={drug}
          className="h-28 w-full rounded-2xl sm:h-48 sm:rounded-3xl"
          iconClassName="size-12 transition duration-300 group-hover:scale-110 sm:size-16"
        />
        <span className="mt-3 block w-full min-w-0 px-1 sm:mt-5">
          <FormBadge drug={drug} className="rounded-full px-2.5 py-1" />
          <DrugNames
            drug={drug}
            as="h3"
            primaryClassName="mt-2 line-clamp-2 min-h-[2.8em] text-sm font-bold leading-snug text-brand-900 sm:mt-3 sm:text-lg"
            secondaryClassName="mt-1 line-clamp-1 text-xs text-muted sm:mt-1.5 sm:text-sm"
          />
        </span>
      </button>

      <div className="mt-3 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-1">
        <Price amount={drug.price} className="px-1 text-lg text-brand-500 sm:px-0 sm:text-xl" />
        {qty > 0 ? (
          <QuantityStepper value={qty} onChange={(next) => setQty(drug.id, next)} className="w-full animate-fade-up sm:w-auto" />
        ) : (
          <button
            type="button"
            onClick={() => add(drug.id)}
            aria-label={`${t.products.add}: ${name}`}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full btn-primary px-3 text-sm font-bold transition hover:brightness-110 active:scale-95 sm:w-auto sm:px-5"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t.products.add}
          </button>
        )}
      </div>
    </article>
  );
}

/** Placeholder card shown while the drug database is downloading. */
export function ProductCardSkeleton() {
  return (
    <div className="glass-flat animate-pulse rounded-3xl p-2.5 sm:rounded-[2rem] sm:p-5" aria-hidden="true">
      <div className="h-28 rounded-2xl bg-surface/80 sm:h-48 sm:rounded-3xl" />
      <div className="mt-4 space-y-3 px-1 sm:mt-6">
        <div className="h-5 w-20 rounded-full bg-tint" />
        <div className="h-5 w-4/5 rounded bg-muted/25" />
        <div className="h-4 w-3/5 rounded bg-muted/15" />
      </div>
      <div className="mt-5 flex flex-col gap-2 px-1 sm:mt-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-6 w-20 rounded bg-muted/25" />
        <div className="h-11 w-full rounded-full bg-tint sm:w-32" />
      </div>
    </div>
  );
}
