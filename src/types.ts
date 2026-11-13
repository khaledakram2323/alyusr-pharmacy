export type Lang = 'ar' | 'en';
export type Localized = Record<Lang, string>;

export type CategoryId =
  | 'cold-flu'
  | 'pain-fever'
  | 'skin-hair'
  | 'vitamins'
  | 'eye-ear'
  | 'stomach'
  | 'chronic'
  | 'other';

export type FormId =
  | 'tablets'
  | 'syrup'
  | 'cream'
  | 'drops'
  | 'injection'
  | 'spray'
  | 'sachet'
  | 'suppository'
  | 'other';

/** One row of public/data/egyptian-drugs.json, exactly as stored. */
export interface RawDrug {
  commercial_name_en: string;
  commercial_name_ar: string;
  scientific_name: string;
  manufacturer: string;
  drug_class: string;
  route: string;
  price_egp: number;
  /** Added by scripts/enrich_drugs.py — real product photo, when one was found. */
  image_url?: string;
}

/** A cleaned, indexed catalogue entry. */
export interface Drug {
  /** Stable key derived from the English commercial name (used by the cart). */
  id: string;
  nameEn: string;
  nameAr: string;
  /** Active ingredient(s); empty string when the database has none. */
  scientific: string;
  manufacturer: string;
  drugClass: string;
  route: string;
  form: FormId;
  category: CategoryId;
  price: number;
  /** HTTPS product photo URL; absent when none has been fetched yet. */
  image?: string;
  /** Pre-normalised text used by live search. */
  search: string;
}

export interface Category {
  id: CategoryId;
  name: Localized;
  /** Accent colour for the category's icons and product tiles. */
  color: string;
}

export interface DosageForm {
  id: FormId;
  name: Localized;
}

/* ───────────── Admin inbox ───────────── */

export type InboxStatus = 'pending' | 'completed' | 'rejected';

interface InboxBase {
  id: string;
  /** Human-readable reference shown to the customer (ORD-12345 / RX-12345). */
  ref: string;
  createdAt: number;
  /** false = "new / unread", true = "reviewed". */
  read: boolean;
  status: InboxStatus;
  phone: string;
  customerName?: string;
}

export interface OrderItem {
  id: string;
  nameAr: string;
  nameEn: string;
  qty: number;
  /** Unit price at the time of ordering. */
  price: number;
}

export interface OrderMessage extends InboxBase {
  kind: 'order';
  items: OrderItem[];
  total: number;
  address: string;
}

export interface PrescriptionMessage extends InboxBase {
  kind: 'prescription';
  /** Downscaled JPEG data URL; absent for PDFs or when storage is full. */
  image?: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  contactMethod: 'whatsapp' | 'call';
}

export type InboxMessage = OrderMessage | PrescriptionMessage;
