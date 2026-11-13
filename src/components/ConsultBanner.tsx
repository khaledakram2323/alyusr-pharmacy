import { MessageCircle, Phone, Stethoscope } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { phoneHref, whatsappHref } from '../data/site';
import { FloatingCapsules } from './FloatingCapsules';

const PILL = 'flex h-14 items-center justify-center gap-2.5 rounded-full px-8 text-base font-bold transition';

/** One calm, wide glass banner with a direct WhatsApp / call trigger. */
export function ConsultBanner() {
  const { t } = useLang();
  const whatsapp = whatsappHref(t.consult.waPrefix);
  const tel = phoneHref();

  return (
    <section id="consult" className="scroll-mt-28 px-4 py-12 sm:px-6 sm:py-20 lg:py-28">
      <div className="relative mx-auto max-w-6xl">
        <FloatingCapsules preset="consult" />
      <div className="glass relative z-10 mx-auto flex max-w-6xl flex-col items-center rounded-[2rem] px-5 py-10 text-center sm:rounded-[2.5rem] sm:px-12 sm:py-16 lg:py-20">
        <span className="grid size-16 place-items-center rounded-full bg-surface/80 text-brand-600">
          <Stethoscope className="size-8" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="mt-6 max-w-2xl text-balance text-2xl font-bold leading-snug text-brand-900 sm:mt-8 sm:text-4xl sm:leading-snug">{t.consult.title}</h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted sm:mt-4 sm:text-lg">{t.consult.sub}</p>

        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:mt-10 sm:w-auto sm:flex-row">
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noreferrer" className={`${PILL} bg-coral text-on-coral hover:bg-coral-600 active:scale-[0.98]`}>
              <MessageCircle className="size-5" aria-hidden="true" />
              {t.footer.whatsappUs}
            </a>
          ) : (
            <span className={`${PILL} bg-coral text-on-coral opacity-50`}>
              <MessageCircle className="size-5" aria-hidden="true" />
              {t.footer.whatsappUs}
            </span>
          )}
          {tel ? (
            <a href={tel} className={`${PILL} btn-primary hover:brightness-110 active:scale-[0.98]`}>
              <Phone className="size-5" aria-hidden="true" />
              {t.consult.call}
            </a>
          ) : (
            <span className={`${PILL} btn-primary opacity-50`}>
              <Phone className="size-5" aria-hidden="true" />
              {t.consult.call}
            </span>
          )}
        </div>
        {(!whatsapp || !tel) && <p className="mt-4 text-xs text-amber-300">{t.site.notSet}</p>}

        <p className="mt-8 text-sm text-muted">{t.consult.disclaimer}</p>
      </div>
      </div>
    </section>
  );
}
