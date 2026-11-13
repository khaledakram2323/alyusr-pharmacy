import { CircleCheck, FileText, LoaderCircle, Lock, MessageCircle, Phone, Trash2, Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInbox } from '../context/InboxContext';
import { useLang } from '../context/LanguageContext';
import { isEgyptianMobile, normalizeMobile } from '../lib/hooks';
import { fileToThumbnail } from '../lib/image';

type UploadError = 'file' | 'type' | 'size' | 'phone';
type ContactMethod = 'whatsapp' | 'call';

const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function PrescriptionUploader() {
  const { t } = useLang();
  const { user } = useAuth();
  const { addPrescription } = useInbox();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const phoneId = useId();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? ''); // pre-filled from the signed-in profile
  const [method, setMethod] = useState<ContactMethod>('whatsapp');
  const [error, setError] = useState<UploadError | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Object URL lifecycle: one per selected file, revoked on change/unmount.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    const supported = candidate.type.startsWith('image/') || candidate.type === 'application/pdf';
    if (!supported) return setError('type');
    if (candidate.size > MAX_BYTES) return setError('size');
    setError(null);
    setFile(candidate);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    accept(event.dataTransfer.files[0]);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!file) return setError('file');
    if (!isEgyptianMobile(phone)) return setError('phone');
    setError(null);
    setBusy(true);
    // No backend yet: the request goes to the admin inbox (localStorage) with a downscaled copy of the photo.
    const isPhoto = file.type.startsWith('image/');
    const image = isPhoto ? await fileToThumbnail(file) : undefined;
    const ref = addPrescription({
      image,
      fileName: file.name,
      fileType: isPhoto ? 'image' : 'pdf',
      phone: normalizeMobile(phone),
      contactMethod: method,
      customerName: user?.name,
    });
    setBusy(false);
    setReference(ref);
  };

  const reset = () => {
    setFile(null);
    setPhone(user?.phone ?? '');
    setError(null);
    setReference(null);
  };

  const errorText: Record<UploadError, string> = {
    file: t.rx.errFile,
    type: t.rx.errType,
    size: t.rx.errSize,
    phone: t.rx.errPhone,
  };

  if (reference) {
    return (
      <div className="glass-strong animate-fade-up rounded-[2rem] p-8 text-center sm:p-10" aria-live="polite">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-tint text-brand-700">
          <CircleCheck className="size-8" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-xl font-bold text-ink">{t.rx.successTitle}</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          {method === 'whatsapp' ? t.rx.successWhatsapp : t.rx.successCall}
        </p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-2 text-sm text-brand-800">
          {t.rx.ref}
          <span className="num font-bold">{reference}</span>
        </p>
        <div>
          <button
            type="button"
            onClick={reset}
            className="mt-6 text-sm font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-900"
          >
            {t.rx.another}
          </button>
        </div>
      </div>
    );
  }

  const isImage = file?.type.startsWith('image/');

  return (
    <form onSubmit={onSubmit} noValidate className="glass-strong rounded-[2rem] p-5 sm:p-8">
      <div className="flex items-start gap-3.5 pe-12">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-coral-50 text-coral-700">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-snug text-ink">{t.rx.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{t.rx.sub}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {file ? (
        <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-brand-200 bg-brand-50 p-3">
          {isImage && previewUrl ? (
            <img src={previewUrl} alt={file.name} className="size-20 shrink-0 rounded-xl border border-line bg-surface object-cover" />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-xl border border-line bg-surface text-coral-700">
              <FileText className="size-7" aria-hidden="true" />
              <span className="num -mt-3 text-[10px] font-bold">PDF</span>
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="num truncate text-start text-sm font-semibold text-ink" dir="auto">
              {file.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              <span className="num">{formatSize(file.size)}</span>
              {!isImage && <span> · {t.rx.pdf}</span>}
            </p>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-brand-700 underline underline-offset-4"
              >
                {t.rx.open}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label={t.rx.remove}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface hover:text-coral-700"
          >
            <Trash2 className="size-4.5" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
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
          className={`mt-5 flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
            dragging
              ? 'scale-[1.01] border-coral bg-coral-50'
              : 'border-tint-300 bg-tint/40 hover:border-brand-300 hover:bg-tint/70'
          }`}
        >
          <span
            className={`grid size-12 place-items-center rounded-full bg-surface shadow-soft transition ${
              dragging ? '-translate-y-1 text-coral-700' : 'text-brand-700'
            }`}
          >
            <Upload className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3.5 text-sm font-semibold text-ink">{dragging ? t.rx.dropNow : t.rx.drop}</p>
          {!dragging && (
            <p className="mt-0.5 text-sm text-muted">
              {t.rx.or} <span className="font-semibold text-brand-700 underline underline-offset-4">{t.rx.browse}</span>
            </p>
          )}
          <p className="mt-2.5 text-xs text-muted">{t.rx.formats}</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor={phoneId} className="text-xs font-semibold text-muted">
            {t.rx.phoneLabel}
          </label>
          <div className="mt-1.5 flex h-12 items-center gap-2 rounded-xl border border-line bg-mist px-3.5 transition focus-within:border-brand-500 focus-within:bg-surface">
            <Phone className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              id={phoneId}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                if (error === 'phone') setError(null);
              }}
              placeholder={t.rx.phonePlaceholder}
              aria-invalid={error === 'phone'}
              className="num h-full min-w-0 flex-1 bg-transparent text-start text-base font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted/70 sm:text-sm rtl:text-end"
            />
          </div>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-muted">{t.rx.via}</legend>
          <div className="mt-1.5 grid h-12 grid-cols-2 gap-1 rounded-xl border border-line bg-mist p-1">
            {(['whatsapp', 'call'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={method === option}
                onClick={() => setMethod(option)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${
                  method === option ? 'bg-surface text-brand-800 shadow-soft' : 'text-muted hover:text-brand-800'
                }`}
              >
                {option === 'whatsapp' ? (
                  <MessageCircle className="size-4" aria-hidden="true" />
                ) : (
                  <Phone className="size-4" aria-hidden="true" />
                )}
                {option === 'whatsapp' ? t.rx.whatsapp : t.rx.call}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-coral-50 px-3 py-2 text-sm font-medium text-coral-700">
          {errorText[error]}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-coral text-base font-bold text-on-coral shadow-[0_10px_24px_-12px_var(--color-coral-700)] transition hover:bg-coral-600 active:scale-[0.99] disabled:opacity-60"
      >
        {busy && <LoaderCircle className="size-4.5 animate-spin" aria-hidden="true" />}
        {t.rx.submit}
      </button>

      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-xs text-muted">
        <Lock className="size-3.5" aria-hidden="true" />
        {t.rx.privacy}
      </p>
    </form>
  );
}
