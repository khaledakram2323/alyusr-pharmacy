import { X } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useEscape, useLockBodyScroll } from '../lib/hooks';
import { PrescriptionUploader } from './PrescriptionUploader';

interface RxModalProps {
  open: boolean;
  onClose: () => void;
}

/** "اطلب بالروشتة" — the prescription uploader, opened from the nav pill, the hero or the cart. */
export function RxModal({ open, onClose }: RxModalProps) {
  const { t } = useLang();
  useEscape(open, onClose);
  useLockBodyScroll(open);
  if (!open) return null; // unmounting also resets the form for next time

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
      <div onClick={onClose} className="fixed inset-0 bg-black/45 backdrop-blur-md" />
      {/* min-h-full + centring: short screens scroll from the top instead of cutting the form off. */}
      <div
        className="flex min-h-full items-center justify-center p-4 sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
      <div role="dialog" aria-modal="true" aria-label={t.rx.title} className="relative w-full max-w-lg animate-fade-up">
        <button
          type="button"
          onClick={onClose}
          aria-label={t.modal.close}
          autoFocus
          className="absolute end-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-surface/80 text-muted transition hover:bg-surface hover:text-brand-800"
        >
          <X className="size-5" />
        </button>
        <PrescriptionUploader />
      </div>
      </div>
    </div>
  );
}
