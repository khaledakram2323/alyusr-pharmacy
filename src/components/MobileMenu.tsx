import { FileText, Languages, UserRound, X, type LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { scrollToId, useEscape, useLockBodyScroll } from '../lib/hooks';
import { Logo } from './Logo';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  links: { id: string; label: string; icon: LucideIcon }[];
  onUploadRx: () => void;
  onOpenAuth: () => void;
}

const ROW = 'flex min-h-13 w-full items-center gap-3.5 rounded-2xl px-3.5 text-start text-base font-semibold text-white/85 transition active:bg-white/10 hover:bg-white/10 hover:text-white';

/**
 * Slide-out glass drawer that holds everything the phone header has no room for:
 * section links, account, language and the prescription upload.
 * Portalled to <body> because the header pill uses backdrop-filter, which would trap a fixed child inside it.
 */
export function MobileMenu({ open, onClose, links, onUploadRx, onOpenAuth }: MobileMenuProps) {
  const { t, toggle } = useLang();
  const { user } = useAuth();
  useEscape(open, onClose);
  useLockBodyScroll(open);

  /** Close first, then act — scrolling has to wait for the scroll lock to release. */
  const leave = (action: () => void) => {
    onClose();
    window.setTimeout(action, 60);
  };

  return createPortal(
    <div className={`fixed inset-0 z-50 xl:hidden ${open ? '' : 'pointer-events-none'}`} inert={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.menu}
        className={`glass-strong absolute inset-y-0 end-0 flex w-[86%] max-w-sm flex-col rounded-s-[2rem] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label={t.nav.closeMenu}
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </header>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 thin-scroll" aria-label={t.nav.menu}>
          {links.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => leave(() => scrollToId(id))} className={ROW}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface/80 text-brand-500">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              {label}
            </button>
          ))}

          <div className="!my-3 border-t border-line/70" />

          <button type="button" onClick={() => leave(onOpenAuth)} className={ROW}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface/80 text-brand-500">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 truncate">{user ? user.name : t.auth.navLogin}</span>
          </button>
          <button type="button" onClick={toggle} aria-label={t.nav.switchLangLabel} className={ROW}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface/80 text-brand-500">
              <Languages className="size-5" aria-hidden="true" />
            </span>
            {t.nav.switchLang}
          </button>
        </nav>

        <div className="border-t border-line/70 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => leave(onUploadRx)}
            className="flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-coral text-base font-bold text-on-coral transition hover:bg-coral-600 active:scale-[0.98]"
          >
            <FileText className="size-5" aria-hidden="true" />
            {t.nav.upload}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
