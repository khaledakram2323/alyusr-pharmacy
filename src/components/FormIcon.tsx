import type { ReactNode } from 'react';
import { useLang } from '../context/LanguageContext';
import { formById } from '../data/catalog';
import type { Dictionary } from '../i18n/translations';
import type { Drug, FormId, Lang } from '../types';

/** Custom line icons, one per dosage form. Drawn on a 24px grid with currentColor. */
const paths: Record<FormId, ReactNode> = {
  // Capsule + scored tablet
  tablets: (
    <>
      <rect x="2.500" y="9" width="13" height="6.500" rx="3.250" transform="rotate(-40 9 12.250)" />
      <path d="M7.300 9.500l4.200 5" />
      <circle cx="17.500" cy="16.500" r="4" />
      <path d="M14.700 16.500h5.600" />
    </>
  ),
  // Syrup bottle with measuring line
  syrup: (
    <>
      <path d="M9.500 2.500h5v3h-5z" />
      <path d="M8 9.500c0-1.800 1.500-2.200 1.500-4h5c0 1.800 1.500 2.200 1.500 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
      <path d="M8 12.500h8M8 17h8" />
    </>
  ),
  // Tube of cream
  cream: (
    <>
      <path d="M7 3h10l-1.500 13h-7z" />
      <path d="M6 3h12" />
      <path d="M10 16v3.500a2 2 0 0 0 4 0V16" />
      <path d="M10.500 7.500h3" />
    </>
  ),
  // Dropper bottle + drop
  drops: (
    <>
      <path d="M8.500 2.500h4l-.700 3.500h-2.600z" />
      <path d="M7 9.500A3.500 3.500 0 0 1 9.200 6h2.600A3.500 3.500 0 0 1 14 9.500V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
      <path d="M19 12.500c1.300 1.700 2 2.800 2 3.800a2 2 0 0 1-4 0c0-1 .700-2.100 2-3.800z" />
    </>
  ),
  // Syringe
  injection: (
    <>
      <path d="M14.500 4.500l5 5" />
      <path d="M17 7l-9.500 9.500-2.500.500.500-2.500L15 5" />
      <path d="M5 17l-2.500 2.500" />
      <path d="M10 10l1.500 1.500M12.500 7.500L14 9" />
      <path d="M18.500 3l2.500 2.500" />
    </>
  ),
  // Pump spray with mist
  spray: (
    <>
      <path d="M8 8h6v2.500H8z" />
      <path d="M11 8V5.500h3" />
      <path d="M7 12.500a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
      <path d="M17.500 3.500h.010M20 5.500h.010M17.500 7.500h.010M20.500 2.500h.010M20.500 8.500h.010" strokeWidth="2" />
    </>
  ),
  // Sachet with tear notch and fizz
  sachet: (
    <>
      <path d="M5 4h14v16H5z" />
      <path d="M5 7.500h14" />
      <path d="M16 4l1.500 1.750L16 7.500" />
      <circle cx="10" cy="15.500" r="1.250" />
      <circle cx="14" cy="12.500" r="1" />
      <path d="M14.500 16.500h.010" strokeWidth="2" />
    </>
  ),
  // Suppository
  suppository: (
    <>
      <path d="M12 3c3 2.800 4.500 6 4.500 9.500V18a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3v-5.500C7.500 9 9 5.800 12 3z" />
      <path d="M7.500 16h9" />
    </>
  ),
  // Generic pack with a cross
  other: (
    <>
      <rect x="3.500" y="6" width="17" height="14" rx="2.500" />
      <path d="M8 6V4.500A1.500 1.500 0 0 1 9.500 3h5A1.500 1.500 0 0 1 16 4.500V6" />
      <path d="M12 10v6M9 13h6" />
    </>
  ),
};

export function FormIcon({ form, className = 'size-5' }: { form: FormId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[form]}
    </svg>
  );
}

/** Patient-friendly dosage-form label, refined by the raw route where it helps. */
export function formLabel(drug: Drug, lang: Lang, t: Dictionary): string {
  switch (drug.route) {
    case 'EYE':
      return t.forms.eyeDrops;
    case 'EAR':
      return t.forms.earDrops;
    case 'VAGINAL':
      return t.forms.vaginal;
    case 'MOUTH':
      return t.forms.mouth;
    case 'SOAP':
      return t.forms.soap;
    default:
      return formById.get(drug.form)?.name[lang] ?? '';
  }
}

export function FormBadge({ drug, className = '' }: { drug: Drug; className?: string }) {
  const { lang, t } = useLang();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-800 ${className}`}
    >
      <FormIcon form={drug.form} className="size-3.5" />
      {formLabel(drug, lang, t)}
    </span>
  );
}
