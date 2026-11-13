import { normalize } from '../lib/search';
import type { Category, CategoryId, DosageForm, Drug, FormId, RawDrug } from '../types';

/** Served from /public — fetched at runtime, never bundled into the JS. */
export const DATA_URL = `${import.meta.env.BASE_URL}data/egyptian-drugs.json`;
export const PAGE_SIZE = 12;

export const categories: Category[] = [
  { id: 'cold-flu', name: { ar: 'أدوية البرد والأنفلونزا', en: 'Cold & Flu' }, color: '#2478B8' },
  { id: 'pain-fever', name: { ar: 'المسكنات وخافض الحرارة', en: 'Pain & Fever Relief' }, color: '#C8573B' },
  { id: 'skin-hair', name: { ar: 'العناية بالبشرة والشعر', en: 'Skin & Hair Care' }, color: '#B84E86' },
  { id: 'vitamins', name: { ar: 'الفيتامينات والمكملات', en: 'Vitamins & Supplements' }, color: '#B7820A' },
  { id: 'eye-ear', name: { ar: 'قطرات العين والأذن', en: 'Eye & Ear Drops' }, color: '#0E8F84' },
  { id: 'stomach', name: { ar: 'المعدة والقولون', en: 'Stomach & Colon' }, color: '#7355C2' },
  { id: 'chronic', name: { ar: 'أدوية الأمراض المزمنة', en: 'Chronic Conditions' }, color: '#BF3F4C' },
  { id: 'other', name: { ar: 'أدوية أخرى', en: 'Other Medicines' }, color: '#52657A' },
];

export const categoryById = new Map(categories.map((category) => [category.id, category]));

export const forms: DosageForm[] = [
  { id: 'tablets', name: { ar: 'أقراص وكبسولات', en: 'Tablets & capsules' } },
  { id: 'syrup', name: { ar: 'شراب', en: 'Syrup' } },
  { id: 'cream', name: { ar: 'كريم ودهان', en: 'Cream & topical' } },
  { id: 'drops', name: { ar: 'قطرة', en: 'Drops' } },
  { id: 'injection', name: { ar: 'حقن', en: 'Injection' } },
  { id: 'spray', name: { ar: 'بخاخ', en: 'Spray' } },
  { id: 'sachet', name: { ar: 'فوار وأكياس', en: 'Sachets & effervescent' } },
  { id: 'suppository', name: { ar: 'لبوس', en: 'Suppositories' } },
  { id: 'other', name: { ar: 'أشكال أخرى', en: 'Other forms' } },
];

export const formById = new Map(forms.map((form) => [form.id, form]));

/* ───────────── Cleanup ───────────── */

const REJECTED_NAME = /\(\s*(CANCELLED|WITHDRAWAL|WITHDRAWN|ILLEGAL IMPORT)\s*\)|^9{5,}/i;

function isUsable(raw: RawDrug): boolean {
  return (
    typeof raw?.commercial_name_en === 'string' &&
    typeof raw.commercial_name_ar === 'string' &&
    raw.commercial_name_en.trim().length > 1 &&
    typeof raw.price_egp === 'number' &&
    raw.price_egp > 0 &&
    !REJECTED_NAME.test(raw.commercial_name_en)
  );
}

/* ───────────── route → dosage form ───────────── */

const ROUTE_FORM: Record<string, FormId> = {
  'ORAL.SOLID': 'tablets',
  'ORAL.LIQUID': 'syrup',
  TOPICAL: 'cream',
  SOAP: 'cream',
  EYE: 'drops',
  EAR: 'drops',
  INJECTION: 'injection',
  SPRAY: 'spray',
  EFF: 'sachet',
  RECTAL: 'suppository',
  VAGINAL: 'suppository',
};

/** Rows with an unknown route get a best guess from the English pack description. */
const NAME_FORM: [RegExp, FormId][] = [
  [/\b(TAB|TABS|TABLET|TABLETS|CAP|CAPS|CAPSULE|CAPSULES|LOZENGES?|PIECES)\b/, 'tablets'],
  [/\b(SYRUP|SUSP|SUSPENSION|ELIXIR|ORAL SOL\w*|ORAL DROPS)\b/, 'syrup'],
  [/\b(CREAM|GEL|OINT|OINTMENT|LOTION|SHAMPOO|SERUM|MASK|BALM|CLEANSER|SOAP)\b/, 'cream'],
  [/\b(EYE|EAR) DROPS\b/, 'drops'],
  [/\b(AMP|AMPS|AMPOULES?|VIAL|VIALS|INJ|SYRINGE|PEN)\b/, 'injection'],
  [/\b(SPRAY|INHALER)\b/, 'spray'],
  [/\b(SACHETS?|EFF|POWDER)\b/, 'sachet'],
  [/\bSUPP\b/, 'suppository'],
];

function formOf(route: string, nameEn: string): FormId {
  const known = ROUTE_FORM[route];
  if (known) return known;
  for (const [pattern, form] of NAME_FORM) if (pattern.test(nameEn)) return form;
  return 'other';
}

/* ───────────── drug_class + route → shopper-friendly category ───────────── */

const EYE_CLASS = /ANTIGLAU?COMA|OPHTHALM|MYDRIATIC|CORNEAL|EYE LUBRICANT|CONTACT LENS/;
const STOMACH = /PEPTIC|ANTACID|ANTIEMETIC|LAXATIVE|ANTIDIARR|ANTISPASMODIC|ANTIFLATULENT|\bGIT\b|DIGESTIVE|IRRITABLE BOWEL|PYLORI|HA?EMORRHOID|ULCERATIVE|MOTILITY|\bORS\b|PROBIOTIC|5-HT3|\bCOLON\b|GASTRO|ANTHELMINT|ANTIHELMINT/;
const CHRONIC = /ANTI-?HYPERTENSIVE|ANTI-?DIABETIC|INSULIN|ANTI-?HYPERLIPIDEMIC|ANTI-ISCHEMIC|ANTIPLATE?LET|ANTICOAGULANT|DIURETIC|THYROID|ARRHYTHMI|ASTHMA|BRONCHODILATOR|\bHEART\b|CARDIAC|ANTI-EPILEPTIC|ANTICONVULSANT|PARKINSON|OSTEOPOROSIS|ANTIGOUT|ANTI-RHEUMATIC/;
const COLD = /\bCOLD\b|COUGH|ANTITUSSIVE|MUCOLYTIC|EXPECTORANT|NASAL|DECONGESTANT|SORE THROAT|ANTI-?HISTAMINE|\bFLU\b/;
const PAIN = /NSAID|ANALGESIC|ANTIPYRETIC|ANTIMIGRAINE|MUSCLE RELAXANT|NON-STEROIDAL|MASSAGE/;
const VITAMINS = /VITAMIN|\bVIT\b|\bIRON\b|CALCIUM|SUPPLEMENT|OMEGA|ANTIOXIDANT|\bZINC\b|FOLIC|MAGNESIUM|IMMUNITY|ANEMIA|AMINO ACID|HERBAL|ROYAL JELLY|GINSENG|COLLAGEN|APPETITE/;
const SKIN = /SKIN|HAIR|SUN ?BLOCK|SUNSCREEN|ACNE|WHITENING|MOISTURIZ|SOOTHING|HEALING|\bSCARS?\b|DIAPER RASH|PSORIASIS|EMOLLIENT|FIRMING|EYE CONTOUR|FACIAL|DERMATOLOG|SCABICIDE|\bSOAP\b|DANDRUFF|ECZEMA|\bLICE\b/;

function categoryOf(drugClass: string, route: string, form: FormId): CategoryId {
  const cls = drugClass.toUpperCase();
  if (route === 'EYE' || route === 'EAR' || EYE_CLASS.test(cls)) return 'eye-ear';
  if (STOMACH.test(cls) && !/URINARY/.test(cls)) return 'stomach';
  if (CHRONIC.test(cls)) return 'chronic';
  if (COLD.test(cls)) return 'cold-flu';
  if (PAIN.test(cls)) return 'pain-fever';
  if (VITAMINS.test(cls) && !/SEXUAL/.test(cls)) return 'vitamins';
  if (SKIN.test(cls)) return 'skin-hair';
  // Remaining creams, ointments and soaps (topical antifungals, antiseptics…) belong with skin care.
  if (route === 'TOPICAL' || route === 'SOAP' || (route === 'UNKNOWN' && form === 'cream')) return 'skin-hair';
  return 'other';
}

/* ───────────── Catalogue ───────────── */

export interface Catalog {
  drugs: Drug[];
  byId: Map<string, Drug>;
  /** Drugs grouped by exact active ingredient — powers "alternatives". */
  byScientific: Map<string, Drug[]>;
  categoryCounts: Record<CategoryId, number>;
}

const tidy = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

export function buildCatalog(rows: unknown): Catalog {
  if (!Array.isArray(rows)) throw new Error('Drug database is not an array');

  const drugs: Drug[] = [];
  const byId = new Map<string, Drug>();
  const byScientific = new Map<string, Drug[]>();
  const categoryCounts = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<CategoryId, number>;

  for (const raw of rows as RawDrug[]) {
    if (!isUsable(raw)) continue;

    const nameEn = tidy(raw.commercial_name_en);
    const nameAr = tidy(raw.commercial_name_ar) || nameEn;
    const scientific = tidy(raw.scientific_name);
    const drugClass = tidy(raw.drug_class).replace(/^\.$/, '');
    const route = tidy(raw.route).toUpperCase() || 'UNKNOWN';
    const form = formOf(route, nameEn.toUpperCase());
    const category = categoryOf(drugClass, route, form);

    let id = nameEn;
    for (let copy = 2; byId.has(id); copy += 1) id = `${nameEn} #${copy}`;

    const drug: Drug = {
      id,
      nameEn,
      nameAr,
      scientific,
      manufacturer: tidy(raw.manufacturer),
      drugClass,
      route,
      form,
      category,
      price: raw.price_egp,
      image: typeof raw.image_url === 'string' && raw.image_url.startsWith('https://') ? raw.image_url : undefined,
      search: normalize(`${nameAr} | ${nameEn} | ${scientific} | ${drugClass}`),
    };

    drugs.push(drug);
    byId.set(id, drug);
    categoryCounts[category] += 1;
    if (scientific) {
      const group = byScientific.get(scientific);
      if (group) group.push(drug);
      else byScientific.set(scientific, [drug]);
    }
  }

  return { drugs, byId, byScientific, categoryCounts };
}

/* ───────────── Admin overrides (price edits + stock visibility) ───────────── */

export interface DrugOverride {
  /** Admin-set price in EGP; absent = the database price. */
  price?: number;
  /** Admin-edited names; absent = the database name. */
  nameAr?: string;
  nameEn?: string;
  /** Admin-set photo (https:// link or a small compressed data: URL); null = photo removed. */
  image?: string | null;
  /** true = toggled "out of stock": removed from the storefront and its search. */
  hidden?: boolean;
}

export type Overrides = Record<string, DrugOverride>;

/**
 * Layers the admin's overrides on top of the loaded database.
 * A drug's `id` never changes — even when its English name is edited — so carts and overrides keep pointing at it.
 * `inventory` is every drug with the edits applied (the dashboard's view);
 * `storefront` is the same minus hidden drugs, re-indexed (what customers see).
 * Untouched drugs keep their object identity, so memoised cards do not re-render.
 */
export function applyOverrides(base: Catalog, overrides: Overrides): { storefront: Catalog; inventory: Drug[] } {
  if (Object.keys(overrides).length === 0) return { storefront: base, inventory: base.drugs };

  const inventory: Drug[] = [];
  const drugs: Drug[] = [];
  const byId = new Map<string, Drug>();
  const byScientific = new Map<string, Drug[]>();
  const categoryCounts = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<CategoryId, number>;

  for (const original of base.drugs) {
    const override = Object.hasOwn(overrides, original.id) ? overrides[original.id] : undefined;
    const drug = override ? edited(original, override) : original;
    inventory.push(drug);
    if (override?.hidden) continue;

    drugs.push(drug);
    byId.set(drug.id, drug);
    categoryCounts[drug.category] += 1;
    if (drug.scientific) {
      const group = byScientific.get(drug.scientific);
      if (group) group.push(drug);
      else byScientific.set(drug.scientific, [drug]);
    }
  }

  return { storefront: { drugs, byId, byScientific, categoryCounts }, inventory };
}

function edited(original: Drug, override: DrugOverride): Drug {
  const nameAr = override.nameAr ?? original.nameAr;
  const nameEn = override.nameEn ?? original.nameEn;
  const price = override.price ?? original.price;
  const image = override.image === undefined ? original.image : (override.image ?? undefined);
  if (nameAr === original.nameAr && nameEn === original.nameEn && price === original.price && image === original.image) return original;
  const renamed = nameAr !== original.nameAr || nameEn !== original.nameEn;
  return {
    ...original,
    nameAr,
    nameEn,
    price,
    image,
    // Live search must find the drug by its new name.
    search: renamed ? normalize(`${nameAr} | ${nameEn} | ${original.scientific} | ${original.drugClass}`) : original.search,
  };
}

export async function loadCatalog(signal?: AbortSignal): Promise<Catalog> {
  const response = await fetch(DATA_URL, { signal });
  if (!response.ok) throw new Error(`Failed to load drug database (HTTP ${response.status})`);
  return buildCatalog(await response.json());
}

/** Same active ingredient, excluding the drug itself: same dosage form first, then cheapest. */
export function alternativesOf(catalog: Catalog, drug: Drug): Drug[] {
  if (!drug.scientific) return [];
  return (catalog.byScientific.get(drug.scientific) ?? [])
    .filter((other) => other.id !== drug.id)
    .sort((a, b) => Number(b.form === drug.form) - Number(a.form === drug.form) || a.price - b.price);
}
