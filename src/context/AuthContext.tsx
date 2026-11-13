import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * ⚠️ Device-local accounts — NOT real authentication.
 * There is no server yet, so accounts live in this browser's localStorage only:
 * they do not sync between devices and offer no real security. Passwords are stored
 * as salted SHA-256 hashes rather than plain text, but replace this with a proper
 * backend (and server-side password handling) before treating it as a login system.
 */

export interface Profile {
  name: string;
  phone: string;
  email: string;
  address: string;
  /** Set only by the built-in admin sign-in; unlocks the /admin dashboard. */
  isAdmin?: boolean;
}

interface StoredAccount {
  profile: Profile;
  salt: string;
  hash: string;
}

interface AuthValue {
  user: Profile | null;
  login: (identifier: string, password: string) => Promise<'ok' | 'admin' | 'invalid'>;
  signup: (profile: Profile, password: string) => Promise<'ok' | 'exists'>;
  logout: () => void;
}

const ACCOUNTS_KEY = 'alyusr.accounts';
const SESSION_KEY = 'alyusr.user';
const AuthContext = createContext<AuthValue | null>(null);

/**
 * ⚠️ Demo admin account, hardcoded until a backend exists. These credentials ship inside the
 * public JavaScript bundle, so anyone can read them — change this before going live.
 */
export const ADMIN_EMAIL = 'admin@alyusr.com';
const ADMIN_PASSWORD = 'admin';
const ADMIN_PROFILE: Profile = { name: 'المدير', phone: '', email: ADMIN_EMAIL, address: '', isAdmin: true };

const normalizePhone = (value: string) => value.replace(/[\s\-()]/g, '').replace(/^(\+20|0020)/, '0');
const normalizeEmail = (value: string) => value.trim().toLowerCase();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const text = `${salt}:${password}`;
  if (window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // crypto.subtle only exists on HTTPS / localhost. Fallback keeps the feature working elsewhere.
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return `fnv-${(hash >>> 0).toString(16)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => readJson<Profile | null>(SESSION_KEY, null));

  const startSession = useCallback((profile: Profile) => {
    writeJson(SESSION_KEY, profile);
    setUser(profile);
  }, []);

  const login = useCallback<AuthValue['login']>(
    async (identifier, password) => {
      if (normalizeEmail(identifier) === ADMIN_EMAIL) {
        if (password !== ADMIN_PASSWORD) return 'invalid';
        startSession(ADMIN_PROFILE);
        return 'admin';
      }
      const accounts = readJson<StoredAccount[]>(ACCOUNTS_KEY, []);
      const phone = normalizePhone(identifier);
      const email = normalizeEmail(identifier);
      const account = accounts.find((item) => item.profile.phone === phone || item.profile.email === email);
      if (!account || (await hashPassword(password, account.salt)) !== account.hash) return 'invalid';
      startSession(account.profile);
      return 'ok';
    },
    [startSession],
  );

  const signup = useCallback<AuthValue['signup']>(
    async (input, password) => {
      const profile: Profile = {
        name: input.name.trim(),
        phone: normalizePhone(input.phone),
        email: normalizeEmail(input.email),
        address: input.address.trim(),
      };
      if (profile.email === ADMIN_EMAIL) return 'exists';
      const accounts = readJson<StoredAccount[]>(ACCOUNTS_KEY, []);
      if (accounts.some((item) => item.profile.phone === profile.phone || item.profile.email === profile.email)) return 'exists';
      const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      accounts.push({ profile, salt, hash: await hashPassword(password, salt) });
      writeJson(ACCOUNTS_KEY, accounts);
      startSession(profile);
      return 'ok';
    },
    [startSession],
  );

  const logout = useCallback(() => {
    writeJson(SESSION_KEY, null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, signup, logout }), [user, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
