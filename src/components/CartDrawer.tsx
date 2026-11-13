import { CircleCheck, FileText, Info, Phone, Send, ShoppingBag, Truck, UserRound, X } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useInbox } from '../context/InboxContext';
import { useLang } from '../context/LanguageContext';
import { phoneHref, SITE, whatsappHref } from '../data/site';
import { isEgyptianMobile, normalizeMobile, scrollToId, useEscape, useLockBodyScroll } from '../lib/hooks';
import { DrugNames, DrugTile } from './DrugTile';
import { formatAmount, Price } from './Price';
import { QuantityStepper } from './QuantityStepper';

export function CartDrawer({ onUploadRx, onOpenAuth }: { onUploadRx: () => void; onOpenAuth: () => void }) {
  const { t, pick } = useLang();
  const cart = useCart();
  const { user } = useAuth();
  const { isOpen, close, lines } = cart;

  useEscape(isOpen, close);
  useLockBodyScroll(isOpen);

  const goTo = (id: string) => {
    close();
    // Wait for the scroll lock to release before scrolling.
    window.setTimeout(() => scrollToId(id), 60);
  };

  const { addOrder } = useInbox();
  const phoneId = useId();
  const addressId = useId();
  // Pre-filled from the signed-in profile; guests type them in.
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [placedRef, setPlacedRef] = useState<string | null>(null);

  // The confirmation is shown once; reopening the drawer starts a fresh cart.
  useEffect(() => {
    if (isOpen) setPlacedRef(null);
  }, [isOpen]);

  const tel = phoneHref();

  const placeOrder = (event: FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) return;
    if (!isEgyptianMobile(phone)) return setError(t.rx.errPhone);
    const deliverTo = address.trim();
    if (deliverTo.length < 5) return setError(t.cart.errAddress);
    const mobile = normalizeMobile(phone);

    // No backend yet: the order goes to the admin inbox (localStorage).
    const ref = addOrder({
      items: lines.map(({ drug, qty }) => ({ id: drug.id, nameAr: drug.nameAr, nameEn: drug.nameEn, qty, price: drug.price })),
      total: cart.subtotal,
      address: deliverTo,
      phone: mobile,
      customerName: user?.name,
    });

    // When a WhatsApp number is configured, the same order is also sent there —
    // always with both names so the pharmacist can read it either way.
    const whatsapp = whatsappHref(
      [
        t.cart.waGreeting,
        ...lines.map(
          (line) =>
            `• ${line.drug.nameAr} — ${line.drug.nameEn} × ${line.qty} = ${formatAmount(line.qty * line.drug.price)} ${t.currency}`,
        ),
        `${t.cart.waTotal}: ${formatAmount(cart.subtotal)} ${t.currency}`,
        '',
        `${t.cart.waRef}: ${ref}`,
        ...(user ? [`${t.auth.name}: ${user.name}`] : []),
        `${t.auth.phone}: ${mobile}`,
        `${t.cart.deliverTo}: ${deliverTo}`,
      ].join('\n'),
    );
    if (whatsapp) window.open(whatsapp, '_blank', 'noopener,noreferrer');

    setError(null);
    setPlacedRef(ref);
    cart.clear();
  };

  const field =
    'mt-1 h-11 w-full rounded-xl border border-line bg-mist px-3.5 text-base text-ink outline-none transition placeholder:text-muted/70 focus:border-brand-500 focus:bg-surface sm:text-sm';

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} inert={!isOpen}>
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.cart.title}
        className={`absolute inset-y-0 end-0 glass-strong flex w-full max-w-md flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-brand-900">
            <ShoppingBag className="size-5 text-brand-600" aria-hidden="true" />
            {t.cart.title}
            {cart.count > 0 && (
              <span className="num rounded-full bg-tint px-2 py-0.5 text-xs font-bold text-brand-800">{cart.count}</span>
            )}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t.cart.close}
            className="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-tint hover:text-brand-800"
          >
            <X className="size-5" />
          </button>
        </header>

        {lines.length === 0 && placedRef ? (
          <div className="flex flex-1 animate-fade-up flex-col items-center justify-center px-8 text-center" aria-live="polite">
            <span className="grid size-20 place-items-center rounded-full bg-tint text-brand-600">
              <CircleCheck className="size-9" aria-hidden="true" />
            </span>
            <p className="mt-5 text-lg font-bold text-ink">{t.cart.placedTitle}</p>
            <p className="mt-1.5 text-sm text-muted">{t.cart.placedBody}</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-2 text-sm text-brand-800">
              {t.cart.placedRef}
              <span className="num font-bold">{placedRef}</span>
            </p>
            <button
              type="button"
              onClick={() => goTo('products')}
              className="mt-6 h-11 rounded-full btn-primary px-7 text-sm font-bold transition hover:brightness-110"
            >
              {t.auth.continueShopping}
            </button>
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-tint text-brand-600">
              <ShoppingBag className="size-8" aria-hidden="true" />
            </span>
            <p className="mt-5 text-lg font-bold text-ink">{t.cart.empty}</p>
            <p className="mt-1.5 text-sm text-muted">{t.cart.emptyBody}</p>
            <button
              type="button"
              onClick={() => goTo('products')}
              className="mt-6 h-11 rounded-full btn-primary px-7 text-sm font-bold transition hover:brightness-110"
            >
              {t.cart.startShopping}
            </button>
          </div>
        ) : (
          <>
            {pick(SITE.delivery).trim() && (
              <p className="flex items-start gap-2 border-b border-line bg-tint/60 px-5 py-3 text-sm text-brand-800">
                <Truck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {pick(SITE.delivery)}
              </p>
            )}

            <ul className="min-h-28 flex-1 divide-y divide-line overflow-y-auto px-5 thin-scroll">
              {lines.map(({ drug, qty }) => (
                <li key={drug.id} className="flex gap-3.5 py-4">
                  <DrugTile drug={drug} className="size-16 rounded-xl" iconClassName="size-8" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <DrugNames
                          drug={drug}
                          primaryClassName="text-sm font-semibold leading-snug text-ink"
                          secondaryClassName="mt-0.5 text-xs leading-snug text-muted"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.remove(drug.id)}
                        aria-label={`${t.cart.remove}: ${drug.nameAr}`}
                        className="relative -me-1.5 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted transition after:absolute after:-inset-1 hover:bg-coral-50 hover:text-coral-700"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <QuantityStepper size="sm" value={qty} onChange={(next) => cart.setQty(drug.id, next)} />
                      <Price amount={qty * drug.price} className="text-brand-800" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="max-h-[68%] shrink-0 overflow-y-auto overscroll-contain border-t border-line/70 bg-surface/50 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] thin-scroll">
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-coral/40 bg-coral-50 p-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-coral-700" aria-hidden="true" />
                <div className="text-sm">
                  <p className="text-ink">{t.cart.rxNotice}</p>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onUploadRx();
                    }}
                    className="mt-1 font-bold text-coral-700 underline underline-offset-4 hover:text-ink"
                  >
                    {t.cart.uploadRx}
                  </button>
                </div>
              </div>

              <form id="checkout-form" onSubmit={placeOrder} noValidate className="mb-4 space-y-3 rounded-xl border border-line bg-tint/50 p-3 text-sm">
                {user ? (
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <UserRound className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
                    {user.name}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onOpenAuth();
                    }}
                    className="flex w-full items-center gap-2 text-start text-xs font-medium text-brand-800 underline-offset-4 hover:underline"
                  >
                    <UserRound className="size-4 shrink-0" aria-hidden="true" />
                    {t.cart.loginHint}
                  </button>
                )}
                <div>
                  <label htmlFor={phoneId} className="text-xs font-semibold text-muted">
                    {t.cart.phoneLabel}
                  </label>
                  <input
                    id={phoneId}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder={t.rx.phonePlaceholder}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={`${field} num font-semibold rtl:text-end`}
                  />
                </div>
                <div>
                  <label htmlFor={addressId} className="text-xs font-semibold text-muted">
                    {t.cart.addressLabel}
                  </label>
                  <input
                    id={addressId}
                    type="text"
                    autoComplete="street-address"
                    placeholder={t.cart.addressPlaceholder}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className={field}
                  />
                </div>
                {error && (
                  <p role="alert" className="rounded-lg bg-coral-50 px-3 py-2 text-sm font-medium text-coral-700">
                    {error}
                  </p>
                )}
              </form>

              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted">
                  <dt>{t.cart.delivery}</dt>
                  <dd className="font-medium text-ink">{t.cart.deliveryTbd}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3 text-base font-bold text-ink">
                  <dt>{t.cart.subtotal}</dt>
                  <dd>
                    <Price amount={cart.subtotal} className="text-xl text-brand-800" />
                  </dd>
                </div>
              </dl>

              <button
                type="submit"
                form="checkout-form"
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full btn-primary text-sm font-bold transition hover:brightness-110 active:scale-[0.99]"
              >
                <Send className="size-4.5 rtl:-scale-x-100" aria-hidden="true" />
                {t.cart.checkout}
              </button>

              {tel && (
                <a
                  href={tel}
                  className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full border border-brand-200 text-sm font-semibold text-brand-800 transition hover:bg-tint"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {t.cart.call}
                </a>
              )}

              <div className="mt-3 flex items-start justify-between gap-4 text-xs text-muted">
                <span className="flex items-start gap-1.5">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {t.products.priceNote}
                </span>
                <button type="button" onClick={cart.clear} className="-my-3 shrink-0 py-3 underline underline-offset-4 hover:text-coral-700">
                  {t.cart.clear}
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
