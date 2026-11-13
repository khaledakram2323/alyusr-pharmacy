import { ArrowLeft, BadgeDollarSign, Clock, EyeOff, FileText, MailWarning, PackageCheck, Pill, ShoppingBag, Tag, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { useInbox } from '../../context/InboxContext';
import { useLang } from '../../context/LanguageContext';
import { formatAmount } from '../Price';
import { PanelHeader, type AdminTab } from './PanelHeader';
import { formatWhen, StatusBadges } from './InboxPanel';

export function OverviewPanel({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const { t, lang } = useLang();
  const { inventory, overrides, catalog } = useCatalog();
  const { messages, unreadCount } = useInbox();

  const stats = useMemo(() => {
    const entries = Object.values(overrides);
    return {
      hidden: entries.filter((entry) => entry.hidden).length,
      edited: entries.filter((entry) => Object.keys(entry).some((key) => key !== 'hidden')).length,
      pending: messages.filter((message) => message.status === 'pending').length,
      sales: messages.reduce((sum, message) => sum + (message.kind === 'order' && message.status === 'completed' ? message.total : 0), 0),
    };
  }, [overrides, messages]);

  const count = (value: number | undefined) => (value === undefined ? '—' : value.toLocaleString('en-US'));

  const tiles: { label: string; value: string; icon: LucideIcon; tone: string; tab: AdminTab; unit?: string }[] = [
    { label: t.admin.overview.unread, value: count(unreadCount), icon: MailWarning, tone: 'text-coral-700 bg-coral/15', tab: 'inbox' },
    { label: t.admin.overview.pending, value: count(stats.pending), icon: Clock, tone: 'text-amber-300 bg-amber-300/15', tab: 'inbox' },
    { label: t.admin.overview.sales, value: formatAmount(stats.sales), unit: t.currency, icon: BadgeDollarSign, tone: 'text-emerald-300 bg-emerald-300/15', tab: 'inbox' },
    { label: t.admin.overview.totalDrugs, value: count(inventory?.length), icon: Pill, tone: 'text-brand-500 bg-brand-500/15', tab: 'inventory' },
    { label: t.admin.overview.inStock, value: count(catalog?.drugs.length), icon: PackageCheck, tone: 'text-brand-500 bg-brand-500/15', tab: 'inventory' },
    { label: t.admin.overview.hidden, value: count(stats.hidden), icon: EyeOff, tone: 'text-muted bg-white/10', tab: 'inventory' },
    { label: t.admin.overview.edits, value: count(stats.edited), icon: Tag, tone: 'text-label bg-label/15', tab: 'inventory' },
  ];

  const recent = messages.slice(0, 5);

  return (
    <>
      <PanelHeader title={t.admin.overview.hello} sub={t.admin.overview.sub} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
        {tiles.map(({ label, value, unit, icon: Icon, tone, tab }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(tab)}
            className="glass-flat flex flex-col items-start gap-3 rounded-3xl p-4 text-start transition sm:p-5"
          >
            <span className={`grid size-10 place-items-center rounded-2xl ${tone}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="num block text-2xl font-bold text-ink sm:text-3xl">
                {value}
                {unit && <span className="ms-1.5 text-xs font-semibold text-muted">{unit}</span>}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-muted sm:text-sm">{label}</span>
            </span>
          </button>
        ))}
      </div>

      <section className="glass mt-5 rounded-[2rem] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-900">{t.admin.overview.recent}</h2>
          <button
            type="button"
            onClick={() => onNavigate('inbox')}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-white/10"
          >
            {t.admin.overview.openInbox}
            <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
          </button>
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{t.admin.overview.noMessages}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((message) => {
              const isOrder = message.kind === 'order';
              return (
                <li key={message.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('inbox')}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-start transition hover:bg-white/5"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full ${
                        isOrder ? 'bg-brand-500/15 text-brand-500' : 'bg-coral/15 text-coral-700'
                      }`}
                    >
                      {isOrder ? <ShoppingBag className="size-4.5" aria-hidden="true" /> : <FileText className="size-4.5" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${message.read ? 'font-medium text-ink/85' : 'font-bold text-ink'}`}>
                        {isOrder ? t.admin.inbox.order : t.admin.inbox.prescription} <span className="num">{message.ref}</span>
                        <span className="text-muted"> · {message.customerName || t.admin.inbox.guest}</span>
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {isOrder ? (
                          <>
                            <span className="num">{formatAmount(message.total)}</span> {t.currency} ·{' '}
                          </>
                        ) : null}
                        {formatWhen(message.createdAt, lang)}
                      </span>
                    </span>
                    <StatusBadges message={message} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
