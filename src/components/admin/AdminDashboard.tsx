import { Inbox as InboxIcon, Info, Languages, LayoutDashboard, LogOut, Pill, Store, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInbox } from '../../context/InboxContext';
import { useLang } from '../../context/LanguageContext';
import { navigate } from '../../lib/router';
import { Backdrop } from '../Backdrop';
import { LogoMark } from '../Logo';
import { InboxPanel } from './InboxPanel';
import { InventoryPanel } from './InventoryPanel';
import { OverviewPanel } from './OverviewPanel';
import type { AdminTab } from './PanelHeader';

/** Protected admin area (rendered by App only when the signed-in user has `isAdmin`). */
export function AdminDashboard() {
  const { t, toggle } = useLang();
  const { logout } = useAuth();
  const { unreadCount } = useInbox();
  const [tab, setTab] = useState<AdminTab>('overview');

  const tabs: { id: AdminTab; label: string; short: string; icon: LucideIcon; badge?: number }[] = [
    { id: 'overview', label: t.admin.tabs.overview, short: t.admin.tabs.overview, icon: LayoutDashboard },
    { id: 'inventory', label: t.admin.tabs.inventory, short: t.admin.tabs.inventory, icon: Pill },
    { id: 'inbox', label: t.admin.tabs.inbox, short: t.admin.tabs.inboxShort, icon: InboxIcon, badge: unreadCount },
  ];

  const signOut = () => {
    logout();
    navigate('/');
  };

  const utility =
    'flex h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white';

  return (
    <div className="min-h-dvh">
      <Backdrop />

      <div className="mx-auto flex max-w-[92rem] flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:items-start lg:gap-5 lg:p-5">
        {/* ── Sidebar (desktop) ── */}
        <aside className="glass sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-72 shrink-0 flex-col rounded-[2rem] p-4 lg:flex">
          <div className="flex items-center gap-3 px-2 pb-5 pt-2">
            <LogoMark className="size-12" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-lg font-bold text-white">{t.brand.name}</p>
              <p className="text-xs font-medium text-label">{t.admin.title}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5" aria-label={t.admin.title}>
            {tabs.map(({ id, label, icon: Icon, badge }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(id)}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-start text-sm font-semibold leading-snug transition ${
                    active
                      ? 'border-brand-500/40 bg-brand-500/15 text-brand-800 shadow-[0_0_28px_-10px_rgba(34,211,238,0.8)]'
                      : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`size-5 shrink-0 ${active ? 'text-brand-500' : ''}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">{label}</span>
                  {!!badge && <CountBadge count={badge} />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
            <button type="button" onClick={() => navigate('/')} className={utility}>
              <Store className="size-5 shrink-0" aria-hidden="true" />
              {t.admin.viewStore}
            </button>
            <button type="button" onClick={toggle} aria-label={t.nav.switchLangLabel} className={utility}>
              <Languages className="size-5 shrink-0" aria-hidden="true" />
              {t.nav.switchLang}
            </button>
            <button type="button" onClick={signOut} className={`${utility} hover:!bg-coral/15 hover:!text-coral-700`}>
              <LogOut className="size-5 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              {t.admin.tabs.logout}
            </button>
          </div>
        </aside>

        {/* ── Top bar + tab strip (mobile / tablet) ── */}
        <header className="glass sticky top-3 z-30 rounded-3xl p-2 lg:hidden">
          <div className="flex items-center gap-2 px-1.5">
            <LogoMark className="size-10" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold text-white">{t.brand.name}</p>
              <p className="text-[11px] font-medium text-label">{t.admin.title}</p>
            </div>
            <IconButton label={t.admin.viewStore} onClick={() => navigate('/')} icon={Store} />
            <IconButton label={t.nav.switchLangLabel} onClick={toggle} icon={Languages} />
            <IconButton label={t.admin.tabs.logout} onClick={signOut} icon={LogOut} flip />
          </div>
          <nav className="mt-2 grid grid-cols-3 gap-1" aria-label={t.admin.title}>
            {tabs.map(({ id, short, icon: Icon, badge }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(id)}
                  className={`relative flex h-11 items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-bold transition sm:text-sm ${
                    active ? 'bg-brand-500/15 text-brand-800' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Icon className={`size-4.5 shrink-0 ${active ? 'text-brand-500' : ''}`} aria-hidden="true" />
                  <span className="truncate">{short}</span>
                  {!!badge && <CountBadge count={badge} />}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="min-w-0 flex-1 pb-8">
          <div key={tab} className="animate-fade-up">
            {tab === 'overview' && <OverviewPanel onNavigate={setTab} />}
            {tab === 'inventory' && <InventoryPanel />}
            {tab === 'inbox' && <InboxPanel />}
          </div>

          <p className="mt-6 flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {t.admin.localNote}
          </p>
        </main>
      </div>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="num grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-on-coral">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function IconButton({ label, onClick, icon: Icon, flip = false }: { label: string; onClick: () => void; icon: LucideIcon; flip?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 shrink-0 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
    >
      <Icon className={`size-4.5 ${flip ? 'rtl:-scale-x-100' : ''}`} aria-hidden="true" />
    </button>
  );
}
