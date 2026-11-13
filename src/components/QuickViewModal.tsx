import { ChevronLeft, Info, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useLang } from '../context/LanguageContext';
import { alternativesOf, categoryById } from '../data/catalog';
import { scrollToId, useEscape, useLockBodyScroll } from '../lib/hooks';
import type { Drug } from '../types';
import { DrugNames, DrugTile } from './DrugTile';
import { FormBadge, formLabel } from './FormIcon';
import { Price } from './Price';
import { QuantityStepper } from './QuantityStepper';

interface QuickViewModalProps {
  drug: Drug | null;
  /** Opens another drug in the same modal (used by the alternatives list). */
  onOpenDrug: (drug: Drug) => void;
  onClose: () => void;
}

const ALTERNATIVES_PREVIEW = 5;

export function QuickViewModal({ drug, onOpenDrug, onClose }: QuickViewModalProps) {
  useEscape(drug !== null, onClose);
  useLockBodyScroll(drug !== null);
  if (!drug) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-2 pt-6 sm:items-center sm:p-6">
      <div onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-md" />
      {/* Keyed so quantity / scroll / expansion reset for each drug. */}
      <QuickViewContent key={drug.id} drug={drug} onOpenDrug={onOpenDrug} onClose={onClose} />
    </div>
  );
}

function QuickViewContent({ drug, onOpenDrug, onClose }: { drug: Drug; onOpenDrug: (drug: Drug) => void; onClose: () => void }) {
  const { t, lang, pick } = useLang();
  const { catalog } = useCatalog();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Real alternatives: every other product in the database with the exact same scientific_name.
  const alternatives = useMemo(() => (catalog ? alternativesOf(catalog, drug) : []), [catalog, drug]);
  const shownAlternatives = showAll ? alternatives : alternatives.slice(0, ALTERNATIVES_PREVIEW);

  const inCart = cart.qtyOf(drug.id);
  const category = categoryById.get(drug.category);

  const leaveTo = (id: string) => {
    onClose();
    window.setTimeout(() => scrollToId(id), 60);
  };

  const addToCart = () => {
    cart.add(drug.id, qty);
    onClose();
    cart.open();
  };

  const facts: { label: string; value: string; ltr?: boolean; strong?: boolean }[] = [
    { label: t.modal.scientific, value: drug.scientific || t.modal.notRecorded, ltr: Boolean(drug.scientific), strong: true },
    { label: t.modal.manufacturer, value: drug.manufacturer || t.modal.notRecorded, ltr: Boolean(drug.manufacturer) },
    { label: t.modal.form, value: formLabel(drug, lang, t) },
    { label: t.modal.category, value: category ? pick(category.name) : '' },
    ...(drug.drugClass ? [{ label: t.modal.drugClass, value: drug.drugClass.replace(/\./g, ' › '), ltr: true }] : []),
    { label: t.modal.availability, value: t.modal.availabilityValue },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? drug.nameAr : drug.nameEn}
      className="relative flex max-h-full w-full max-w-2xl animate-fade-up flex-col glass-strong overflow-hidden rounded-t-[2rem] sm:max-h-[92dvh] sm:rounded-[2rem]"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t.modal.close}
        className="absolute end-3 top-3 z-10 grid size-11 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-brand-800"
      >
        <X className="size-5" />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain thin-scroll">
        {/* Identity */}
        <div className="flex items-start gap-3.5 border-b border-line/70 p-4 pe-16 sm:gap-4 sm:p-8 sm:pe-16">
          <DrugTile drug={drug} className="size-20 rounded-2xl sm:size-24" iconClassName="size-10 sm:size-12" />
          <div className="min-w-0 flex-1">
            <FormBadge drug={drug} />
            <DrugNames
              drug={drug}
              as="h2"
              primaryClassName="mt-2 text-xl font-bold leading-snug text-brand-900 sm:text-2xl"
              secondaryClassName="mt-1 text-sm font-semibold leading-snug text-muted sm:text-base"
            />
          </div>
        </div>

        <div className="p-4 sm:p-8">
          <dl className="divide-y divide-line/70 rounded-2xl border border-line/70 bg-surface/70 text-sm">
            {facts.map((fact) => (
              <div key={fact.label} className="grid grid-cols-[6.5rem_1fr] gap-3 px-3.5 py-2.5 sm:grid-cols-[9rem_1fr]">
                <dt className="text-muted">{fact.label}</dt>
                <dd
                  dir={fact.ltr ? 'ltr' : undefined}
                  className={`min-w-0 [overflow-wrap:anywhere] ltr:text-left rtl:text-right ${fact.strong ? 'font-bold text-brand-800' : 'font-medium text-ink'}`}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Alternatives */}
          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              {t.modal.alternatives}
              {alternatives.length > 0 && (
                <span className="num rounded-full bg-tint px-2 py-0.5 text-xs font-bold text-brand-800">{alternatives.length}</span>
              )}
            </h3>

            {alternatives.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-line bg-surface px-3.5 py-4 text-sm text-muted">
                {t.modal.noAlternatives}
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs leading-relaxed text-muted">{t.modal.altNote}</p>
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {shownAlternatives.map((alternative) => (
                    <li key={alternative.id}>
                      <button
                        type="button"
                        onClick={() => onOpenDrug(alternative)}
                        className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-start transition hover:bg-tint/60"
                      >
                        <DrugTile drug={alternative} className="size-10 rounded-lg" iconClassName="size-5" />
                        <span className="min-w-0 flex-1">
                          <DrugNames
                            drug={alternative}
                            primaryClassName="truncate text-sm font-semibold text-ink"
                            secondaryClassName="truncate text-xs text-muted"
                          />
                        </span>
                        <Price amount={alternative.price} className="text-sm text-brand-800" />
                        <ChevronLeft className="size-4 shrink-0 text-muted ltr:rotate-180" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                {alternatives.length > ALTERNATIVES_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAll((current) => !current)}
                    className="mt-1 flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-900"
                  >
                    {showAll ? t.modal.showLess : t.modal.showAll(alternatives.length)}
                  </button>
                )}
              </>
            )}
          </section>

          <button
            type="button"
            onClick={() => leaveTo('consult')}
            className="mt-4 flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t.modal.askPharmacist}
          </button>

          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {t.modal.disclaimer} {t.products.priceNote}
            </span>
          </p>
        </div>
      </div>

      {/* Purchase bar: outside the scroll area so it is always reachable, padded clear of the phone's home indicator. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2.5 border-t border-line/70 bg-surface/50 px-4 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-4">
        <div className="flex flex-col leading-tight">
          <Price amount={drug.price} className="text-2xl text-brand-500" />
          {inCart > 0 && (
            <span className="mt-0.5 text-xs font-medium text-brand-700">
              {t.products.inCart}: <span className="num">{inCart}</span>
            </span>
          )}
        </div>
        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <QuantityStepper value={qty} min={1} onChange={setQty} className="h-12 shrink-0" />
          <button
            type="button"
            onClick={addToCart}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full btn-primary px-6 text-sm font-bold transition hover:brightness-110 active:scale-[0.98] sm:flex-none"
          >
            <ShoppingBag className="size-4.5" aria-hidden="true" />
            {t.products.add}
          </button>
        </div>
      </div>
    </div>
  );
}
