import { ArrowLeft, FileText, ShieldCheck, Stethoscope, Truck } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { scrollToId } from '../lib/hooks';
import type { Drug } from '../types';
import { FloatingCapsules } from './FloatingCapsules';
import { SearchBar } from './SearchBar';

interface HeroProps {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenDrug: (drug: Drug) => void;
  onSubmitSearch: () => void;
  onUploadRx: () => void;
}

const trustIcons = [Truck, Stethoscope, ShieldCheck];

/**
 * Centered editorial hero inside one large frosted-glass window, so the backdrop scene
 * shows through around and behind it.
 */
export function Hero({ query, onQueryChange, onOpenDrug, onSubmitSearch, onUploadRx }: HeroProps) {
  const { t } = useLang();

  return (
    <section id="top" className="relative z-10 scroll-mt-28 px-4 py-6 sm:px-6 sm:pb-10 sm:pt-8 lg:pt-10">
      {/* Soft cyan glow behind the window */}
      <div className="pointer-events-none absolute inset-x-0 top-1/4 mx-auto h-72 max-w-3xl rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl">
        <FloatingCapsules preset="hero" />
      <div className="glass-frame relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-center rounded-[2rem] px-4 py-10 text-center sm:rounded-[2.5rem] sm:px-10 sm:py-16 md:min-h-[75vh] lg:py-24">
        <p className="glass animate-fade-up rounded-full px-4 py-1.5 text-xs font-semibold text-brand-800">{t.hero.eyebrow}</p>

        <h1 className="mt-5 max-w-4xl animate-fade-up text-balance text-4xl font-bold leading-[1.4] text-brand-900 sm:mt-8 sm:text-6xl sm:leading-[1.25] lg:text-7xl lg:leading-[1.2] ltr:leading-[1.15] ltr:tracking-tight">
          {t.hero.titleA} <span className="bg-linear-to-r from-[#009EC4] to-[#22D3EE] bg-clip-text text-transparent">{t.hero.titleHighlight}</span>
        </h1>

        <p className="mt-4 max-w-xl animate-fade-up text-pretty text-base leading-relaxed text-ink/75 sm:mt-6 sm:text-lg">{t.hero.sub}</p>

        <div className="relative z-20 mt-7 w-full max-w-2xl animate-fade-up text-start [animation-delay:80ms] sm:mt-10">
          <SearchBar variant="hero" query={query} onQueryChange={onQueryChange} onOpenDrug={onOpenDrug} onSubmit={onSubmitSearch} />
        </div>

        <div className="mt-4 flex w-full animate-fade-up flex-col items-stretch justify-center gap-3 [animation-delay:120ms] sm:mt-6 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => scrollToId('categories')}
            className="group flex h-13 w-full items-center justify-center gap-2.5 rounded-full btn-primary px-7 text-base font-bold transition hover:brightness-110 active:scale-[0.98] sm:h-12 sm:w-auto sm:text-sm"
          >
            {t.hero.shop}
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onUploadRx}
            className="flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-coral px-6 text-base font-bold text-on-coral transition hover:bg-coral-600 active:scale-[0.98] sm:h-12 sm:w-auto sm:text-sm"
          >
            <FileText className="size-4" aria-hidden="true" />
            {t.nav.upload}
          </button>
        </div>

        <ul className="mt-9 grid w-full max-w-4xl gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-4 lg:mt-20">
          {t.hero.trust.map((item, index) => {
            const Icon = trustIcons[index];
            return (
              <li key={item.title} className="glass flex items-center gap-3.5 rounded-2xl p-3.5 text-start sm:gap-4 sm:rounded-3xl sm:p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface/80 text-brand-600 sm:size-12 sm:rounded-2xl">
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[15px] font-bold text-brand-900">{item.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{item.body}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      </div>
    </section>
  );
}
