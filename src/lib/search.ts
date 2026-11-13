import type { Drug } from '../types';

/**
 * Lower-cases and folds Arabic spelling variants:
 * أ/إ/آ → ا, ة → ه, ى → ي, and strips tashkeel + tatweel.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Everyday Arabic words → the English term the database actually uses
 * (active ingredients and therapeutic classes are stored in English).
 * Keys are already normalised.
 */
const ALIASES: Record<string, string> = {
  باراسيتامول: 'paracetamol',
  بنادول: 'panadol',
  ايبوبروفين: 'ibuprofen',
  بروفين: 'ibuprofen',
  ديكلوفيناك: 'diclofenac',
  اموكسيسيلين: 'amoxicillin',
  اوميبرازول: 'omeprazole',
  ميتفورمين: 'metformin',
  انسولين: 'insulin',
  اسبرين: 'acetylsalicylic',
  كورتيزون: 'glucocorticoid',
  حديد: 'iron',
  كالسيوم: 'calcium',
  زنك: 'zinc',
  اوميجا: 'omega',
  فيتامين: 'vitamin',
  فيتامينات: 'vitamin',
  صداع: 'analgesic',
  مسكن: 'analgesic',
  حراره: 'antipyretic',
  سخونيه: 'antipyretic',
  كحه: 'cough',
  سعال: 'cough',
  برد: 'cold',
  زكام: 'cold',
  انفلونزا: 'cold',
  حساسيه: 'anti-histamine',
  حموضه: 'peptic',
  قرحه: 'peptic',
  اسهال: 'antidiarr',
  امساك: 'laxative',
  مغص: 'antispasmodic',
  ترجيع: 'antiemetic',
  قيء: 'antiemetic',
  انتفاخ: 'antiflatulent',
  ضغط: 'hypertensive',
  سكر: 'anti-diabetic',
  كوليسترول: 'antihyperlipidemic',
  فطريات: 'antifungal',
  ملين: 'laxative',
};

/** Multi-word Arabic phrases → the English phrase used in the database. Keys are normalised. */
const PHRASES: [string, string][] = [
  ['مضاد حيوي', 'antibiotic'],
  ['فيتامين د', 'vitamin d'],
  ['فيتامين سي', 'vitamin c'],
  ['فيتامين ج', 'vitamin c'],
  ['فيتامين ب', 'vitamin b'],
  ['فيتامين ا', 'vitamin a'],
  ['فيتامين ه', 'vitamin e'],
];

/** Each search word (or known phrase), with its optional English alias. A drug must match every one. */
function termsOf(query: string): string[][] {
  let rest = ` ${normalize(query)} `;
  const terms: string[][] = [];
  for (const [phrase, english] of PHRASES) {
    if (rest.includes(` ${phrase} `)) {
      rest = rest.replace(` ${phrase} `, ' ');
      terms.push([phrase, english]);
    }
  }
  for (const term of rest.split(' ').filter(Boolean)) {
    const alias = ALIASES[term] ?? ALIASES[term.replace(/^ال/, '')];
    terms.push(alias ? [term, alias] : [term]);
  }
  return terms;
}

/**
 * Arabic brand names in the database are transliterations, so vowels vary
 * ("أوجمنتين" vs "أوجمينتين"). Dropping the long vowels gives a consonant skeleton to compare.
 */
const skeleton = (text: string) => text.replace(/[اوي]/g, '');
const HAS_ARABIC = /[ء-ي]/;

function looseArabicSearch(drugs: readonly Drug[], query: string): Drug[] {
  const terms = normalize(query)
    .split(' ')
    .filter((term) => HAS_ARABIC.test(term))
    .map(skeleton)
    .filter((term) => term.length >= 3);
  if (terms.length === 0) return [];
  return drugs.filter((drug) => {
    const name = skeleton(drug.search.slice(0, drug.search.indexOf(' | ')));
    return terms.every((term) => name.includes(term));
  });
}

/**
 * Live search across Arabic name, English name, active ingredient and therapeutic class.
 * Results whose name starts with the query are listed first; original order is kept otherwise.
 */
export function searchDrugs(drugs: readonly Drug[], query: string): Drug[] {
  const terms = termsOf(query);
  if (terms.length === 0) return drugs as Drug[];

  const first = normalize(query).split(' ')[0];
  const leading: Drug[] = [];
  const rest: Drug[] = [];

  for (const drug of drugs) {
    const haystack = drug.search;
    let matched = true;
    for (const options of terms) {
      if (!options.some((option) => haystack.includes(option))) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    // `search` begins with the Arabic name, then " | " + the English name.
    if (haystack.startsWith(first) || haystack.includes(`| ${first}`)) leading.push(drug);
    else rest.push(drug);
  }
  if (leading.length === 0 && rest.length === 0) return looseArabicSearch(drugs, query);
  return leading.concat(rest);
}
