import { useEffect } from 'react';

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onEscape]);
}

export function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [active]);
}

export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Accepts 01XXXXXXXXX with optional +20 / 0020 prefix, spaces or dashes. */
export function isEgyptianMobile(input: string): boolean {
  const digits = input.replace(/[\s\-()]/g, '').replace(/^(\+20|0020)/, '0');
  return /^01[0125]\d{8}$/.test(digits);
}

/** 01XXXXXXXXX form of an Egyptian mobile number (strips spaces, dashes and the +20 prefix). */
export function normalizeMobile(input: string): string {
  return input.replace(/[\s\-()]/g, '').replace(/^(\+20|0020)/, '0');
}
