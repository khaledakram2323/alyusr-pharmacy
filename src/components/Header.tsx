import { FileText, Languages, LayoutGrid, MapPin, Menu, Pill, ShoppingBag, Stethoscope, UserRound } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLang } from '../context/LanguageContext';
import { scrollToId } from '../lib/hooks';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';

interface HeaderProps {
  onUploadRx: () => void;
  onOpenAuth: () => void;
}

/**
 * Floating pill-shaped glass navigation.
 * Phones show only logo + cart + menu; language, account and prescription upload move into <MobileMenu>.
 */
export function Header({ onUploadRx, onOpenAuth }: HeaderProps) {
  const { t, toggle } = useLang();
  const { count, open } = useCart();
  const { user } = useAuth();
  const accountLabel = user ? user.name.split(' ')[0] : t.auth.navLogin;

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const links = [
    { id: 'categories', label: t.nav.links.categories, icon: LayoutGrid },
    { id: 'products', label: t.nav.links.medicines, icon: Pill },
    { id: 'consult', label: t.nav.links.ask, icon: Stethoscope },
    { id: 'contact', label: t.nav.links.contact, icon: MapPin },
  ];

  return (
    <header className="sticky top-3 z-40 px-4 sm:top-4 sm:px-6">
      <div className="glass mx-auto flex max-w-6xl items-center gap-2 rounded-full py-2 ps-4 pe-2 sm:ps-5">
        <a href="#top" aria-label={t.brand.name} className="min-w-0 shrink rounded-full">
          <Logo />
        </a>

        <nav className="mx-auto hidden items-center gap-1 xl:flex" aria-label={t.brand.name}>
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToId(link.id)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-1.5 xl:ms-0">
          <button
            type="button"
            onClick={toggle}
            aria-label={t.nav.switchLangLabel}
            className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 md:flex"
          >
            <Languages className="size-4.5" aria-hidden="true" />
            <span>{t.nav.switchLang}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAuth}
            aria-label={user ? t.auth.navAccount : t.auth.navLogin}
            className="hidden h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-brand-500/60 hover:bg-white/10 md:flex"
          >
            <UserRound className={`size-4.5 ${user ? 'text-brand-500' : ''}`} aria-hidden="true" />
            <span className="max-w-28 truncate">{accountLabel}</span>
          </button>

          <button
            type="button"
            onClick={onUploadRx}
            aria-label={t.nav.upload}
            className="hidden h-11 items-center gap-2 rounded-full bg-coral px-5 text-sm font-bold text-on-coral transition hover:bg-coral-600 active:scale-[0.97] md:flex"
          >
            <FileText className="size-4.5" aria-hidden="true" />
            <span>{t.nav.upload}</span>
          </button>

          <button
            type="button"
            onClick={open}
            aria-label={t.nav.cartCount(count)}
            className="btn-primary relative grid size-11 place-items-center rounded-full transition hover:brightness-110 active:scale-[0.97]"
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {count > 0 && (
              <span
                key={count}
                className="num absolute -end-1 -top-1 grid h-5 min-w-5 animate-pop place-items-center rounded-full border-2 border-paper bg-coral px-1 text-[11px] font-bold text-on-coral"
              >
                {count}
              </span>
            )}
          </button>

          {/* Section links are only inline from xl up, so the menu button stays until then. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.nav.menu}
            aria-expanded={menuOpen}
            className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10 active:scale-[0.97] xl:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={closeMenu} links={links} onUploadRx={onUploadRx} onOpenAuth={onOpenAuth} />
    </header>
  );
}
