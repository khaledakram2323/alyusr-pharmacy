import { ArrowRight, Eye, EyeOff, LayoutDashboard, LoaderCircle, LogOut, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { isEgyptianMobile, useEscape, useLockBodyScroll } from '../lib/hooks';
import { ADMIN_PATH, navigate } from '../lib/router';
import { FloatingCapsules } from './FloatingCapsules';
import { LogoMark } from './Logo';

export type AuthMode = 'login' | 'signup';

interface AuthViewProps {
  open: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
}

const INPUT =
  'h-12 w-full rounded-xl border border-cyan-300/20 bg-cyan-400/15 px-3.5 text-base text-white outline-none transition placeholder:text-cyan-100/45 focus:border-[#22D3EE] focus:bg-cyan-400/20 sm:h-11 sm:text-sm';
const SUBMIT =
  'mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#009EC4] to-[#14B8A6] text-base font-bold text-on-brand shadow-[0_12px_32px_-10px_rgba(0,158,196,0.8)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Full-screen login / sign-up view: one frosted glass card with capsules behind and in front of it. */
export function AuthView({ open, initialMode = 'login', onClose }: AuthViewProps) {
  useEscape(open, onClose);
  useLockBodyScroll(open);
  if (!open) return null; // unmounting resets the form for next time
  return <AuthScreen initialMode={initialMode} onClose={onClose} />;
}

function AuthScreen({ initialMode, onClose }: { initialMode: AuthMode; onClose: () => void }) {
  const { t } = useLang();
  const { user, login, signup, logout } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setError(null);
    setNotice(null);
  }, [mode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (mode === 'login') {
      if (!identifier.trim() || !password) return setError(t.auth.errRequired);
      setBusy(true);
      const result = await login(identifier, password);
      setBusy(false);
      if (result === 'invalid') return setError(t.auth.errInvalid);
      // The admin lands on the dashboard; everyone else goes back to the homepage.
      if (result === 'admin') return navigate(ADMIN_PATH);
      return onClose();
    } else {
      if (name.trim().length < 2) return setError(t.auth.errName);
      if (!isEgyptianMobile(phone)) return setError(t.rx.errPhone);
      if (!EMAIL.test(email.trim())) return setError(t.auth.errEmail);
      if (password.length < 6) return setError(t.auth.errPassword);
      setBusy(true);
      const result = await signup({ name, phone, email, address }, password);
      setBusy(false);
      if (result === 'exists') return setError(t.auth.errExists);
    }
    setError(null);
  };

  const passwordField = (
    <Field label={t.auth.password}>
      {(id) => (
        <div className="relative">
          <input
            id={id}
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            dir="ltr"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${INPUT} pe-12 rtl:text-end`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
            className="absolute inset-y-0 end-1 grid w-10 place-items-center rounded-lg text-cyan-100/70 transition hover:text-white"
          >
            {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        </div>
      )}
    </Field>
  );

  const isSignup = !user && mode === 'signup';

  return (
    <div
      className="fixed inset-0 z-[100] h-full w-full overflow-y-auto overflow-x-hidden bg-[#020A0F]"
      role="dialog"
      aria-modal="true"
      aria-label={t.auth.loginTitle}
    >
      <div className="ambient !fixed !inset-0 !z-0" aria-hidden="true" />

      <button
        type="button"
        onClick={onClose}
        className="glass fixed start-4 top-4 z-30 flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition hover:bg-white/10 sm:start-6 sm:top-6"
      >
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden="true" />
        {t.auth.back}
      </button>

      <div className="relative z-10 flex min-h-full items-center justify-center px-4 pt-20 pb-8 sm:px-6 sm:py-8">
        <div className={`relative w-full transition-all duration-300 ${isSignup ? 'max-w-2xl' : 'max-w-md'}`}>
          {/* Capsules: some tucked behind the glass card, two floating in front of its edges */}
          <FloatingCapsules preset="auth" />

          <div className="relative z-10 w-full animate-fade-up rounded-3xl border border-white/20 border-t-white/35 bg-[#0B2738]/40 px-5 py-6 shadow-[0_25px_70px_rgba(0,158,196,0.25)] backdrop-blur-2xl sm:px-8 sm:py-6">
            <div className="flex flex-col items-center text-center">
              <LogoMark className="size-12" />
              <h1 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                {user ? t.auth.welcome(user.name.split(' ')[0]) : mode === 'login' ? t.auth.loginTitle : t.auth.signupTitle}
              </h1>
              <p className="mt-1 text-xs text-label/90 sm:text-sm">{user ? t.auth.accountSub : mode === 'login' ? t.auth.loginSub : t.auth.signupSub}</p>
            </div>

            {user ? (
              /* ── Signed in: profile summary ── */
              <div className="mt-6">
                <dl className="space-y-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm">
                  <Detail icon={<UserRound className="size-4" />} value={user.name} />
                  {user.phone && <Detail icon={<Phone className="size-4" />} value={user.phone} ltr />}
                  <Detail icon={<Mail className="size-4" />} value={user.email} ltr />
                  <Detail icon={<MapPin className="size-4" />} value={user.address || t.auth.noAddress} />
                </dl>
                {user.isAdmin ? (
                  <button type="button" onClick={() => navigate(ADMIN_PATH)} className={SUBMIT + ' mt-5'}>
                    <LayoutDashboard className="size-4.5" aria-hidden="true" />
                    {t.admin.title}
                  </button>
                ) : (
                  <button type="button" onClick={onClose} className={SUBMIT + ' mt-5'}>
                    {t.auth.continueShopping}
                  </button>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                  {t.auth.logout}
                </button>
              </div>
            ) : (
              <>
                {/* ── Login / Sign up switch ── */}
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-white/15 bg-black/25 p-1" role="tablist">
                  {(['login', 'signup'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={mode === tab}
                      onClick={() => setMode(tab)}
                      className={`h-11 rounded-full text-sm font-bold transition duration-300 sm:h-9 ${
                        mode === tab ? 'bg-linear-to-r from-[#009EC4] to-[#22D3EE] text-on-brand shadow-[0_6px_18px_-8px_rgba(34,211,238,0.9)]' : 'text-white/75 hover:text-white'
                      }`}
                    >
                      {tab === 'login' ? t.auth.loginTab : t.auth.signupTab}
                    </button>
                  ))}
                </div>

                <form key={mode} onSubmit={submit} noValidate className="mt-4 animate-fade-up space-y-3">
                  {mode === 'login' ? (
                    <div className="space-y-3">
                      <Field label={t.auth.identifier}>
                        {(id) => (
                          <input id={id} type="text" autoComplete="username" dir="auto" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className={INPUT} />
                        )}
                      </Field>
                      {passwordField}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label={t.auth.name}>
                        {(id) => <input id={id} type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={INPUT} />}
                      </Field>
                      <Field label={t.auth.phone}>
                        {(id) => (
                          <input id={id} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="01X XXXX XXXX" value={phone} onChange={(event) => setPhone(event.target.value)} className={`${INPUT} num rtl:text-end`} />
                        )}
                      </Field>
                      <Field label={t.auth.email}>
                        {(id) => (
                          <input id={id} type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} className={`${INPUT} rtl:text-end`} />
                        )}
                      </Field>
                      {passwordField}
                      <Field label={t.auth.address} className="md:col-span-2">
                        {(id) => (
                          <input id={id} type="text" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} className={INPUT} />
                        )}
                      </Field>
                    </div>
                  )}

                  {error && (
                    <p role="alert" className="rounded-xl border border-coral/40 bg-coral/15 px-3.5 py-2 text-sm font-medium text-coral-700">
                      {error}
                    </p>
                  )}
                  {notice && <p className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3.5 py-2 text-sm text-label">{notice}</p>}

                  <button type="submit" disabled={busy} className={SUBMIT}>
                    {busy && <LoaderCircle className="size-4.5 animate-spin" aria-hidden="true" />}
                    {mode === 'login' ? t.auth.loginSubmit : t.auth.signupSubmit}
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
                  {mode === 'login' ? (
                    <>
                      <button type="button" onClick={() => setNotice(t.auth.forgotNote)} className="text-label/90 underline-offset-4 hover:text-white hover:underline">
                        {t.auth.forgot}
                      </button>
                      <p className="text-white/70">
                        {t.auth.noAccount}{' '}
                        <button type="button" onClick={() => setMode('signup')} className="font-bold text-[#22D3EE] underline-offset-4 hover:underline">
                          {t.auth.signupLink}
                        </button>
                      </p>
                    </>
                  ) : (
                    <p className="w-full text-center text-white/70">
                      {t.auth.haveAccount}{' '}
                      <button type="button" onClick={() => setMode('login')} className="font-bold text-[#22D3EE] underline-offset-4 hover:underline">
                        {t.auth.loginTab}
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}

            <p className="mt-3 text-center text-xs leading-relaxed text-white/45">{t.auth.localNote}</p>
          </div>
        </div>
      </div>
    </div>
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

function Detail({ icon, value, ltr = false }: { icon: ReactNode; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-white">
      <span className="mt-0.5 text-label">{icon}</span>
      <dd dir={ltr ? 'ltr' : undefined} className={`min-w-0 break-words font-medium ${ltr ? 'num' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
