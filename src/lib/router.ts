import { useSyncExternalStore } from 'react';

/**
 * Minimal History-API router: the app only has two screens (storefront and /admin).
 * Paths are app-relative ("/", "/admin"); the deployment prefix (e.g. "/repo-name" on GitHub Pages)
 * is added and removed here, so the rest of the app never has to know about it.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

function getPath(): string {
  const { pathname } = window.location;
  const path = BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  return path || '/';
}

export const ADMIN_PATH = '/admin';

export function navigate(path: string, options: { replace?: boolean } = {}) {
  if (path !== getPath()) {
    const url = `${BASE}${path}`;
    if (options.replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    window.scrollTo(0, 0);
  }
  listeners.forEach((listener) => listener());
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, getPath);
}
