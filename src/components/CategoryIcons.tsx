import type { ReactNode } from 'react';
import type { CategoryId } from '../types';

/** Custom two-tone line icons: currentColor stroke with a single coral accent. */

const ACCENT = 'var(--color-coral)';
const accent = { stroke: ACCENT, fill: ACCENT, fillOpacity: 0.22 };

const paths: Record<CategoryId | 'all', ReactNode> = {
  // Thermometer + snowflake
  'cold-flu': (
    <>
      <path d="M17 8a4 4 0 0 1 8 0v18.500a7 7 0 1 1-8 0z" />
      <circle cx="21" cy="32" r="3" {...accent} />
      <path d="M21 29V14" stroke={ACCENT} />
      <path d="M36 10v12M30.800 13l10.400 6M41.200 13l-10.400 6" />
    </>
  ),
  // Capsule + tablet
  'pain-fever': (
    <>
      <rect x="6" y="19" width="26" height="12" rx="6" transform="rotate(-40 19 25)" />
      <path d="M15.200 20.400l7.700 9.200" />
      <circle cx="34" cy="33" r="7.500" {...accent} />
      <path d="M29 33h10" stroke={ACCENT} />
    </>
  ),
  // Cream tube + drop
  'skin-hair': (
    <>
      <path d="M15 9h14l-2 24H17z" />
      <rect x="18" y="33" width="8" height="6" rx="1.500" />
      <path d="M13 9h18" />
      <path d="M36 22c2.600 3.200 4 5.300 4 7.200a4 4 0 0 1-8 0c0-1.900 1.400-4 4-7.200z" {...accent} />
    </>
  ),
  // Supplement jar with sun
  vitamins: (
    <>
      <rect x="14" y="6" width="20" height="7" rx="2" />
      <path d="M12 20a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v17a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z" />
      <circle cx="24" cy="28.500" r="5.500" {...accent} />
      <path d="M24 19.500V21M24 36v1.500M15 28.500h1.500M31.500 28.500H33" stroke={ACCENT} />
    </>
  ),
  // Eye + drop
  'eye-ear': (
    <>
      <path d="M4 27c5-8 11-12 18-12s13 4 18 12c-5 8-11 12-18 12S9 35 4 27z" />
      <circle cx="22" cy="27" r="6" />
      <circle cx="22" cy="27" r="2" fill="currentColor" />
      <path d="M38 5c2.300 2.900 3.500 4.700 3.500 6.400a3.500 3.500 0 0 1-7 0C34.500 9.700 35.700 7.900 38 5z" {...accent} />
    </>
  ),
  // Stomach
  stomach: (
    <>
      <path d="M19 6v8c0 4-9 6-9 15 0 7 5 12 12 12 8 0 15-6 15-15V16" />
      <path d="M26 6v9c0 3 2 5 5 5s6-2 6-4" />
      <path d="M37 26c0 5-3 9-8 10" />
      <circle cx="20" cy="29" r="3" {...accent} />
    </>
  ),
  // Heart with pulse line
  chronic: (
    <>
      <path d="M24 40C12 32 6 25 6 17.500A9.500 9.500 0 0 1 24 13a9.500 9.500 0 0 1 18 4.500C42 25 36 32 24 40z" />
      <path d="M11 24h7l3-6 4 11 3-5h9" stroke={ACCENT} />
    </>
  ),
  // First-aid case
  other: (
    <>
      <rect x="6" y="14" width="36" height="26" rx="6" />
      <path d="M17 14v-3a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
      <path d="M24 21v12M18 27h12" stroke={ACCENT} />
    </>
  ),
  // Four shelves
  all: (
    <>
      <rect x="7" y="7" width="14" height="14" rx="4" />
      <rect x="27" y="7" width="14" height="14" rx="4" {...accent} />
      <rect x="7" y="27" width="14" height="14" rx="4" />
      <rect x="27" y="27" width="14" height="14" rx="4" />
    </>
  ),
};

export function CategoryIcon({ id, className = 'size-10' }: { id: CategoryId | 'all'; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.900"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[id]}
    </svg>
  );
}
