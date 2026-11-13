import type { ReactNode } from 'react';

export type AdminTab = 'overview' | 'inventory' | 'inbox';

/** Shared page heading for the three dashboard panels. */
export function PanelHeader({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}
