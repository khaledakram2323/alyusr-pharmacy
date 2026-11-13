import { Check, CheckCheck, FileText, Inbox as InboxIcon, MapPin, MessageCircle, Phone, RotateCcw, ShoppingBag, Trash2, X, ZoomIn } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useInbox } from '../../context/InboxContext';
import { useLang } from '../../context/LanguageContext';
import { useEscape, useLockBodyScroll } from '../../lib/hooks';
import type { InboxMessage, Lang, OrderMessage, PrescriptionMessage } from '../../types';
import { formatAmount } from '../Price';
import { PanelHeader } from './PanelHeader';

type InboxFilter = 'all' | 'unread' | 'orders' | 'prescriptions';
const FILTERS: InboxFilter[] = ['all', 'unread', 'orders', 'prescriptions'];

export function formatWhen(timestamp: number, lang: Lang): string {
  return new Date(timestamp).toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

/** "New" vs "Reviewed", plus the outcome once the admin has acted. */
export function StatusBadges({ message }: { message: InboxMessage }) {
  const { t } = useLang();
  const pill = 'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold';
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {message.status === 'completed' && <span className={`${pill} bg-emerald-300/15 text-emerald-300`}>{t.admin.inbox.completed}</span>}
      {message.status === 'rejected' && <span className={`${pill} bg-coral/15 text-coral-700`}>{t.admin.inbox.rejected}</span>}
      {message.read ? (
        message.status === 'pending' && <span className={`${pill} bg-white/10 text-muted`}>{t.admin.inbox.reviewed}</span>
      ) : (
        <span className={`${pill} bg-brand-500/20 text-brand-800`}>
          <span className="size-1.5 animate-pulse rounded-full bg-brand-500" />
          {t.admin.inbox.fresh}
        </span>
      )}
    </span>
  );
}

export function InboxPanel() {
  const { t } = useLang();
  const { messages, unreadCount, markAllRead } = useInbox();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [zoomed, setZoomed] = useState<PrescriptionMessage | null>(null);

  const counts: Record<InboxFilter, number> = {
    all: messages.length,
    unread: unreadCount,
    orders: messages.filter((message) => message.kind === 'order').length,
    prescriptions: messages.filter((message) => message.kind === 'prescription').length,
  };

  const visible = messages.filter((message) => {
    if (filter === 'unread') return !message.read;
    if (filter === 'orders') return message.kind === 'order';
    if (filter === 'prescriptions') return message.kind === 'prescription';
    return true;
  });

  return (
    <>
      <PanelHeader title={t.admin.inbox.title} sub={t.admin.inbox.sub}>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-white/80 transition hover:border-brand-500/50 hover:bg-white/10"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            {t.admin.inbox.markAllRead}
          </button>
        )}
      </PanelHeader>

      <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label={t.admin.inbox.title}>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
              filter === option
                ? 'border-brand-500/50 bg-brand-500/15 text-brand-800'
                : 'border-line bg-black/15 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t.admin.inbox.filters[option]}
            <span className={`num rounded-full px-1.5 text-[11px] font-bold ${filter === option ? 'bg-brand-500/25' : 'bg-white/10'}`}>
              {counts[option]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-[2rem] px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-tint text-brand-500">
            <InboxIcon className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-4 text-lg font-bold text-ink">{t.admin.inbox.emptyTitle}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">{t.admin.inbox.emptyBody}</p>
        </div>
      ) : (
        <ul className="space-y-3 sm:space-y-4">
          {visible.map((message) => (
            <li key={message.id}>
              <MessageCard message={message} onZoom={setZoomed} />
            </li>
          ))}
        </ul>
      )}

      <Lightbox message={zoomed} onClose={() => setZoomed(null)} />
    </>
  );
}

function MessageCard({ message, onZoom }: { message: InboxMessage; onZoom: (message: PrescriptionMessage) => void }) {
  const { t, lang } = useLang();
  const { markRead, setStatus, remove } = useInbox();
  const [confirming, setConfirming] = useState(false);
  const isOrder = message.kind === 'order';
  const whatsapp = `https://wa.me/2${message.phone}`;

  const action = 'flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition active:scale-[0.98]';
  const ghost = `${action} border border-line font-semibold text-white/80 hover:bg-white/10`;

  return (
    <article
      className={`glass-flat relative overflow-hidden rounded-3xl p-4 sm:p-5 ${
        message.read ? '' : '!border-brand-500/45 shadow-[0_0_40px_-18px_rgba(34,211,238,0.9)]'
      } ${message.status === 'pending' ? '' : 'opacity-80'}`}
    >
      {!message.read && <span className="absolute inset-y-0 start-0 w-1 bg-brand-500" aria-hidden="true" />}

      {/* ── Sender line ── */}
      <header className="flex items-start gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-full ${
            isOrder ? 'bg-brand-500/15 text-brand-500' : 'bg-coral/15 text-coral-700'
          }`}
        >
          {isOrder ? <ShoppingBag className="size-5" aria-hidden="true" /> : <FileText className="size-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <h3 className="min-w-0 text-base font-bold text-ink">
              {message.customerName || t.admin.inbox.guest}
              <span className="ms-2 text-xs font-semibold text-label">
                {isOrder ? t.admin.inbox.order : t.admin.inbox.prescription} <span className="num">{message.ref}</span>
              </span>
            </h3>
            <StatusBadges message={message} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <time dateTime={new Date(message.createdAt).toISOString()}>{formatWhen(message.createdAt, lang)}</time>
            <a href={`tel:${message.phone}`} className="num inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              <Phone className="size-3.5" aria-hidden="true" />
              {message.phone}
            </a>
            <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:underline">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              {t.admin.inbox.whatsapp}
            </a>
          </p>
        </div>
      </header>

      {/* ── Message body ── */}
      <div className="mt-4 rounded-2xl rounded-ss-md border border-line bg-black/20 p-3.5 sm:ms-14">
        {isOrder ? <OrderBody order={message} /> : <PrescriptionBody prescription={message} onZoom={onZoom} />}
      </div>

      {/* ── Actions ── */}
      <footer className="mt-4 flex flex-wrap items-center gap-2 sm:ms-14">
        {message.status === 'pending' ? (
          <>
            <button type="button" onClick={() => setStatus(message.id, 'completed')} className={`${action} btn-primary hover:brightness-110`}>
              <Check className="size-4" aria-hidden="true" />
              {t.admin.inbox.complete}
            </button>
            <button
              type="button"
              onClick={() => setStatus(message.id, 'rejected')}
              className={`${action} border border-coral/50 text-coral-700 hover:bg-coral/15`}
            >
              <X className="size-4" aria-hidden="true" />
              {t.admin.inbox.reject}
            </button>
            {!message.read && (
              <button type="button" onClick={() => markRead(message.id)} className={ghost}>
                {t.admin.inbox.markRead}
              </button>
            )}
          </>
        ) : (
          <button type="button" onClick={() => setStatus(message.id, 'pending')} className={ghost}>
            <RotateCcw className="size-4" aria-hidden="true" />
            {t.admin.inbox.reopen}
          </button>
        )}

        {confirming ? (
          <button
            type="button"
            onClick={() => remove(message.id)}
            onBlur={() => setConfirming(false)}
            autoFocus
            className={`${action} ms-auto bg-coral text-on-coral hover:bg-coral-600`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t.admin.inbox.confirmRemove}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={t.admin.inbox.remove}
            title={t.admin.inbox.remove}
            className="ms-auto grid size-10 place-items-center rounded-full text-muted transition hover:bg-coral/15 hover:text-coral-700"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </footer>
    </article>
  );
}

function OrderBody({ order }: { order: OrderMessage }) {
  const { t } = useLang();
  return (
    <>
      <ul className="divide-y divide-line text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 py-2 first:pt-0">
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{item.nameAr}</span>
              <span className="num block text-start text-xs text-muted rtl:text-end">{item.nameEn}</span>
            </span>
            <span className="shrink-0 text-end">
              <span className="num block font-bold text-ink">{formatAmount(item.qty * item.price)}</span>
              <span className="num block text-xs text-muted">
                {item.qty} × {formatAmount(item.price)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="flex items-baseline justify-between border-t border-dashed border-line pt-3 text-sm font-bold text-ink">
        {t.admin.inbox.total}
        <span className="text-lg text-brand-800">
          <span className="num">{formatAmount(order.total)}</span> <span className="text-xs font-semibold opacity-70">{t.currency}</span>
        </span>
      </p>
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-ink">
        <MapPin className="mt-1 size-4 shrink-0 text-label" aria-hidden="true" />
        <span>
          <span className="block text-[11px] font-semibold text-label">{t.admin.inbox.address}</span>
          {order.address}
        </span>
      </p>
    </>
  );
}

function PrescriptionBody({ prescription, onZoom }: { prescription: PrescriptionMessage; onZoom: (message: PrescriptionMessage) => void }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {prescription.image ? (
        <button
          type="button"
          onClick={() => onZoom(prescription)}
          aria-label={t.admin.inbox.viewImage}
          className="group relative block w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface sm:w-44"
        >
          <img src={prescription.image} alt="" className="h-44 w-full object-cover transition duration-300 group-hover:scale-105" />
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="size-6" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <span className="grid h-28 w-full shrink-0 place-items-center rounded-xl border border-dashed border-line bg-surface/60 text-coral-700 sm:w-44">
          <FileText className="size-8" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 text-sm">
        <p className="num truncate text-start font-semibold text-ink rtl:text-end" dir="auto">
          {prescription.fileName}
        </p>
        {!prescription.image && (
          <p className="mt-1 text-xs text-muted">{prescription.fileType === 'pdf' ? t.admin.inbox.pdfNote : t.admin.inbox.noImage}</p>
        )}
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-muted">
          {t.admin.inbox.contactVia}
          <span className="font-bold text-ink">{prescription.contactMethod === 'whatsapp' ? t.admin.inbox.whatsapp : t.admin.inbox.call}</span>
        </p>
      </div>
    </div>
  );
}

function Lightbox({ message, onClose }: { message: PrescriptionMessage | null; onClose: () => void }) {
  const { t } = useLang();
  const open = !!message?.image;
  useEscape(open, onClose);
  useLockBodyScroll(open);
  if (!message?.image) return null;

  // Portalled to <body> so the animated (transformed) panel cannot offset the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={`${t.admin.inbox.prescription} ${message.ref}`}>
      <div onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-md" />
      <img src={message.image} alt={message.fileName} className="relative max-h-[88dvh] max-w-full animate-fade-up rounded-2xl border border-white/20 object-contain shadow-lift" />
      <button
        type="button"
        onClick={onClose}
        autoFocus
        aria-label={t.admin.inbox.close}
        className="glass absolute end-4 top-4 grid size-11 place-items-center rounded-full text-white transition hover:bg-white/15"
      >
        <X className="size-5" />
      </button>
    </div>,
    document.body,
  );
}
