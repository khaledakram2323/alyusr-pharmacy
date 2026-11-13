import { ImageOff, ImagePlus, LoaderCircle, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { isImageSource, useCatalog } from '../../context/CatalogContext';
import { useLang } from '../../context/LanguageContext';
import { useEscape, useLockBodyScroll } from '../../lib/hooks';
import { fileToThumbnail } from '../../lib/image';
import type { Drug } from '../../types';

/** Uploaded photos are shrunk hard so one upload costs ~10–25 KB of the ~5 MB localStorage quota. */
const UPLOAD_MAX_SIDE = 300;
const UPLOAD_QUALITY = 0.6;

const INPUT =
  'h-11 w-full rounded-xl border border-line bg-mist px-3.5 text-base text-ink outline-none transition placeholder:text-muted/60 focus:border-brand-500 focus:bg-surface sm:text-sm';

const isUpload = (image: string | null) => !!image && image.startsWith('data:');

/** Approximate decoded size of a base64 data URL. */
function uploadSize(dataUrl: string): string {
  const bytes = Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface EditDrugModalProps {
  /** The drug as currently shown (with any earlier edits). The modal is mounted only while editing. */
  drug: Drug;
  onClose: () => void;
}

/** Glass modal for editing a drug's names, price and photo. Saving goes through `updateDrug` in CatalogContext. */
export function EditDrugModal({ drug, onClose }: EditDrugModalProps) {
  const { t } = useLang();
  const { updateDrug, baseOf } = useCatalog();
  const copy = t.admin.editor;
  const base = baseOf(drug.id);
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const [nameAr, setNameAr] = useState(drug.nameAr);
  const [nameEn, setNameEn] = useState(drug.nameEn);
  const [price, setPrice] = useState(String(drug.price));
  /** The photo that will be saved: an https:// link, a compressed data: URL, or null for none. */
  const [image, setImage] = useState<string | null>(drug.image ?? null);
  const [url, setUrl] = useState(drug.image && !isUpload(drug.image) ? drug.image : '');
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscape(true, onClose);
  useLockBodyScroll(true);

  const typedUrl = url.trim();
  const urlInvalid = typedUrl !== '' && !typedUrl.startsWith('https://');

  const onUrlChange = (value: string) => {
    setUrl(value);
    setError(null);
    const next = value.trim();
    // The preview follows the link as it is typed; an upload stays until a link replaces it.
    if (next.startsWith('https://')) setImage(next);
    else if (!isUpload(image)) setImage(null);
  };

  const acceptFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError(copy.errFile);
    setError(null);
    setCompressing(true);
    // Canvas downscale + JPEG re-encode (see lib/image.ts) before anything touches localStorage.
    const compressed = await fileToThumbnail(file, UPLOAD_MAX_SIDE, UPLOAD_QUALITY);
    setCompressing(false);
    if (!compressed) return setError(copy.errFile);
    setImage(compressed);
    setUrl('');
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void acceptFile(event.dataTransfer.files[0]);
  };

  const removeImage = () => {
    setImage(null);
    setUrl('');
    setError(null);
  };

  const restore = () => {
    if (!base) return;
    setNameAr(base.nameAr);
    setNameEn(base.nameEn);
    setPrice(String(base.price));
    setImage(base.image ?? null);
    setUrl(base.image ?? '');
    setError(null);
  };

  const parsedPrice = Number(price.replace(',', '.'));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (compressing) return;
    if (nameAr.trim().length < 2) return setError(copy.errNameAr);
    if (nameEn.trim().length < 2) return setError(copy.errNameEn);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice > 1_000_000) return setError(copy.errPrice);
    if (urlInvalid) return setError(copy.errUrl);
    const saved = updateDrug(drug.id, {
      nameAr,
      nameEn,
      price: Math.round(parsedPrice * 100) / 100,
      image: isImageSource(image) ? image : null,
    });
    if (!saved) return setError(copy.errStorage);
    onClose();
  };

  const differsFromBase =
    !!base &&
    (nameAr.trim() !== base.nameAr || nameEn.trim() !== base.nameEn || parsedPrice !== base.price || (image ?? undefined) !== base.image);
  const showPhoto = !!image && brokenSrc !== image;

  // Rendered into <body>: the dashboard panel it is opened from is animated with a CSS transform,
  // and a transformed ancestor would make `position: fixed` relative to that panel instead of the screen.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* The card never exceeds the screen: header and action bar stay put, only the middle scrolls. */}
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-strong relative flex max-h-[90vh] w-full max-w-2xl animate-fade-up flex-col overflow-hidden rounded-[1.75rem] supports-[height:1dvh]:max-h-[90dvh]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-bold text-brand-900">
              {copy.title}
            </h2>
            <p className="num mt-0.5 truncate text-start text-xs text-muted rtl:text-end">{base?.nameEn ?? drug.nameEn}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.modal.close}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-surface/80 text-muted transition hover:bg-surface hover:text-brand-800"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 thin-scroll sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.nameAr} className="sm:col-span-2">
            {(id) => <input id={id} type="text" dir="rtl" lang="ar" autoFocus value={nameAr} onChange={(event) => setNameAr(event.target.value)} className={INPUT} />}
          </Field>
          <Field label={copy.nameEn}>
            {(id) => (
              <input id={id} type="text" dir="ltr" lang="en" value={nameEn} onChange={(event) => setNameEn(event.target.value)} className={`${INPUT} num`} />
            )}
          </Field>
          <Field label={copy.price}>
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                dir="ltr"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className={`${INPUT} num font-bold`}
              />
            )}
          </Field>
        </div>

        {/* ── Product image ── */}
        <fieldset className="mt-5 rounded-2xl border border-line bg-black/15 p-3.5 sm:p-4">
          <legend className="px-1.5 text-xs font-semibold text-label">{copy.image}</legend>
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Live preview */}
            <div className="shrink-0 sm:w-36">
              <div
                className={`mx-auto grid size-36 place-items-center overflow-hidden rounded-2xl border ${
                  showPhoto ? 'border-line bg-white' : 'border-dashed border-line bg-surface/50'
                }`}
                aria-label={copy.preview}
                role="img"
              >
                {compressing ? (
                  <LoaderCircle className="size-7 animate-spin text-brand-500" aria-hidden="true" />
                ) : showPhoto ? (
                  <img
                    key={image}
                    src={image}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setBrokenSrc(image)}
                    className="size-full object-contain p-2"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 px-2 text-center text-[11px] leading-snug text-muted">
                    <ImageOff className="size-7" aria-hidden="true" />
                    {image ? copy.brokenImage : copy.noImage}
                  </span>
                )}
              </div>
              {image && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="mx-auto mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-muted transition hover:bg-coral/15 hover:text-coral-700"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  {copy.removeImage}
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Field label={copy.urlLabel}>
                {(id) => (
                  <input
                    id={id}
                    type="url"
                    inputMode="url"
                    dir="ltr"
                    spellCheck={false}
                    placeholder={copy.urlPlaceholder}
                    value={url}
                    aria-invalid={urlInvalid}
                    onChange={(event) => onUrlChange(event.target.value)}
                    className={`${INPUT} num ${urlInvalid ? '!border-coral' : ''}`}
                  />
                )}
              </Field>
              <p className={`mt-1 text-[11px] ${urlInvalid ? 'font-semibold text-coral-700' : 'text-muted'}`}>
                {urlInvalid ? copy.errUrl : isUpload(image) && image ? copy.uploaded(uploadSize(image)) : copy.urlHint}
              </p>

              <p className="my-2.5 flex items-center gap-3 text-[11px] font-semibold text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
                {copy.or}
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  void acceptFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  dragDepth.current += 1;
                  setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => {
                  dragDepth.current -= 1;
                  if (dragDepth.current <= 0) setDragging(false);
                }}
                onDrop={onDrop}
                className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-3.5 py-3 text-start transition ${
                  dragging ? 'scale-[1.01] border-brand-500 bg-brand-500/15' : 'border-tint-300 bg-tint/40 hover:border-brand-300 hover:bg-tint/70'
                }`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-brand-500">
                  {compressing ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{compressing ? copy.compressing : dragging ? copy.dropNow : copy.drop}</span>
                  <span className="block text-[11px] leading-snug text-muted">{copy.dropHint}</span>
                </span>
              </div>
            </div>
          </div>
        </fieldset>
        </div>

        {/* Always-visible action bar; validation errors show here so they are never scrolled out of view. */}
        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-black/20 px-5 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-3.5">
          {error && (
            <p role="alert" className="w-full rounded-xl border border-coral/40 bg-coral/15 px-3.5 py-2 text-sm font-medium text-coral-700">
              {error}
            </p>
          )}
          {differsFromBase && (
            <button
              type="button"
              onClick={restore}
              className="flex h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted transition hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {copy.restore}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ms-auto h-11 rounded-full border border-line px-5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            {copy.cancel}
          </button>
          <button
            type="submit"
            disabled={compressing}
            className="btn-primary flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden="true" />
            {copy.save}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function Field({ label, className = '', children }: { label: string; className?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-label">
        {label}
      </label>
      {children(id)}
    </div>
  );
}
