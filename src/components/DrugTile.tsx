import { useState } from 'react';
import { useLang } from '../context/LanguageContext';
import { categoryById } from '../data/catalog';
import type { Drug } from '../types';
import { FormIcon } from './FormIcon';

interface DrugTileProps {
  drug: Drug;
  className?: string;
  iconClassName?: string;
}

/**
 * Product visual. Shows the real photo (`image_url`) on a clean white frame when there is one;
 * if it is missing or fails to load, falls back to the colour-coded dosage-form illustration.
 */
export function DrugTile({ drug, className = '', iconClassName = 'size-10' }: DrugTileProps) {
  // Remember which URL failed, so the fallback resets automatically when the drug changes.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(drug.image) && failedSrc !== drug.image;

  if (showPhoto) {
    return (
      <span className={`grid shrink-0 place-items-center overflow-hidden border border-line bg-white ${className}`} aria-hidden="true">
        <img
          src={drug.image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(drug.image ?? null)}
          className="size-full object-contain p-1.5"
        />
      </span>
    );
  }

  const color = categoryById.get(drug.category)?.color ?? '#52657A';
  return (
    <span
      className={`grid shrink-0 place-items-center ${className}`}
      style={{ color, backgroundColor: `${color}14` }}
      aria-hidden="true"
    >
      <FormIcon form={drug.form} className={iconClassName} />
    </span>
  );
}

/**
 * Always shows BOTH names: the current language first, the other underneath,
 * so patients and pharmacists can recognise the medicine either way.
 */
export function DrugNames({
  drug,
  primaryClassName = '',
  secondaryClassName = '',
  as: Heading = 'p',
}: {
  drug: Drug;
  primaryClassName?: string;
  secondaryClassName?: string;
  as?: 'p' | 'h2' | 'h3';
}) {
  const { lang } = useLang();
  const arabic = (
    <span dir="rtl" lang="ar" className="block">
      {drug.nameAr}
    </span>
  );
  const english = (
    <span dir="ltr" lang="en" className="block ltr:text-left rtl:text-right">
      {drug.nameEn}
    </span>
  );
  return (
    <>
      <Heading className={primaryClassName}>{lang === 'ar' ? arabic : english}</Heading>
      <p className={secondaryClassName}>{lang === 'ar' ? english : arabic}</p>
    </>
  );
}
