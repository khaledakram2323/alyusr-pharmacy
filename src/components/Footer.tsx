import { ArrowUpRight, Clock, MapPin, MessageCircle, Phone, Truck, type LucideIcon } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { phoneHref, SITE, whatsappHref } from '../data/site';
import { FloatingCapsules } from './FloatingCapsules';
import { LogoMark } from './Logo';

/** Single-branch location & contact card, then a quiet closing line. */
export function Footer() {
  const { t, pick } = useLang();
  const whatsapp = whatsappHref('');

  // Lines with nothing to show (e.g. delivery details not provided yet) are left out.
  const details: { icon: LucideIcon; label: string; lines: { value: string; href?: string | null; external?: boolean }[] }[] = [
    { icon: MapPin, label: t.site.address, lines: [{ value: pick(SITE.address) }] },
    { icon: Clock, label: t.site.hours, lines: [{ value: pick(SITE.hours) }] },
    {
      icon: Phone,
      label: t.site.phone,
      lines: [
        { value: SITE.phone, href: phoneHref() },
        { value: SITE.landline, href: phoneHref(SITE.landline) },
      ],
    },
    { icon: MessageCircle, label: t.site.whatsapp, lines: [{ value: whatsapp ? SITE.phone : '', href: whatsapp, external: true }] },
    { icon: Truck, label: t.site.delivery, lines: [{ value: pick(SITE.delivery) }] },
  ];
  const shown = details
    .map((detail) => ({ ...detail, lines: detail.lines.filter((line) => line.value.trim()) }))
    .filter((detail) => detail.lines.length > 0);

  return (
    <footer id="contact" className="scroll-mt-28 overflow-x-clip px-4 pb-10 pt-4 sm:px-6">
      <div className="relative mx-auto max-w-6xl">
        <FloatingCapsules preset="footer" />
      <div className="glass relative z-10 mx-auto max-w-6xl rounded-[2rem] px-5 py-10 sm:rounded-[2.5rem] sm:px-12 sm:py-14 lg:py-16">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="size-20" />
          <h2 className="mt-5 text-3xl font-bold text-brand-900">{pick(SITE.name)}</h2>
          <p className="mt-3 max-w-md leading-relaxed text-muted">{t.footer.about}</p>
        </div>

        <dl className="mt-8 grid gap-x-10 gap-y-6 border-t border-line pt-8 sm:mt-12 sm:grid-cols-2 sm:gap-y-8 sm:pt-12">
          {shown.map(({ icon: Icon, label, lines }) => (
            <div key={label} className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface/80 text-brand-600">
                <Icon className="size-5.5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dt className="text-sm text-muted">{label}</dt>
                {lines.map((line) => (
                  <dd key={line.value} className="mt-1 break-words text-base font-semibold leading-snug text-brand-900">
                    {line.href ? (
                      <a
                        href={line.href}
                        className="num text-lg hover:text-brand-600"
                        {...(line.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      >
                        {line.value}
                      </a>
                    ) : (
                      line.value
                    )}
                  </dd>
                ))}
              </div>
            </div>
          ))}
        </dl>

        {SITE.mapsUrl && (
          <div className="mt-10 flex justify-center">
            <a
              href={SITE.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center gap-2 rounded-full btn-primary px-7 text-sm font-bold transition hover:brightness-110"
            >
              {t.footer.openMap}
              <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      </div>

      <div className="mx-auto mt-8 max-w-6xl px-2 text-center text-xs leading-relaxed text-muted">
        <p>
          © <span className="num">{new Date().getFullYear()}</span> {pick(SITE.name)}. {t.footer.rights}
        </p>
        <p className="mt-1">{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
