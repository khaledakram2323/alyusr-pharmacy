import type { Localized } from '../types';

/**
 * ─────────────────────────────────────────────────────────────
 *  صيدلية اليسر — بيانات الصيدلية (فرع واحد)
 *  Al-Yusr Pharmacy — single-branch business details
 *
 *  Address, phone numbers and WhatsApp are taken from the pharmacy's printed card;
 *  working hours were supplied by the owner. ✏️ Edit the values below to change them.
 *  An empty value hides that line on the site.
 * ─────────────────────────────────────────────────────────────
 */
export const SITE = {
  name: { ar: 'صيدلية اليسر', en: 'Al-Yusr Pharmacy' } as Localized,

  // ✏️ العنوان — كما هو مكتوب على كارت الصيدلية
  address: {
    ar: 'مدينة 6 أكتوبر - الحي الثاني مجاورة 8 - عمارة 2384',
    en: '6th of October City - 2nd District, Neighbourhood 8 - Building 2384',
  } as Localized,

  // ✏️ رقم الموبايل للاتصال — يُستخدم في أزرار «اتصل بينا»
  phone: '010 70 33 4000',

  // ✏️ الخط الأرضي — اتركه فارغاً لإخفائه
  landline: '02 3838 22 31',

  // ✏️ رقم واتساب الطلبات — أرقام فقط بالصيغة الدولية (01070334000 ← 201070334000)
  whatsapp: '201070334000',

  // ✏️ مواعيد العمل
  hours: {
    ar: 'من 9 صباحاً إلى 1 صباحاً',
    en: '9:00 AM to 1:00 AM',
  } as Localized,

  // ✏️ معلومات التوصيل — غير مذكورة على الكارت؛ اكتبها هنا لتظهر في الموقع (فارغة = مخفية)
  delivery: {
    ar: '',
    en: '',
  } as Localized,

  // ✏️ (اختياري) رابط موقع الصيدلية على خرائط جوجل — اتركه فارغاً لإخفاء الزر
  mapsUrl: '',

  // ✏️ (اختياري) صورة خلفية حقيقية بدل المشهد المرسوم — ضع الصورة في public/ واكتب مسارها، مثال: '/bg/pharmacy.jpg'
  // Optional photographic backdrop instead of the drawn scene. Leave empty to keep the SVG scene.
  backdropPhoto: '',
};

const digitsOf = (value: string) => value.replace(/[^\d+]/g, '');

/** `tel:` link for the main number (or the one given), or null when it is empty / not a real number. */
export function phoneHref(number: string = SITE.phone): string | null {
  if (number.includes('[')) return null;
  const digits = digitsOf(number);
  return digits.length >= 5 ? `tel:${digits}` : null;
}

/** WhatsApp deep link with a pre-filled message, or null while the number is a placeholder. */
export function whatsappHref(message: string): string | null {
  const digits = SITE.whatsapp.replace(/\D/g, '');
  if (SITE.whatsapp.includes('[') || digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
