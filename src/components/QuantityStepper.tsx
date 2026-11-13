import { Minus, Plus, Trash2 } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Lowest reachable value. 0 lets the minus button remove the line. */
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function QuantityStepper({ value, onChange, min = 0, max = 20, size = 'md', className = '' }: QuantityStepperProps) {
  const { t } = useLang();
  // 44px touch targets: the compact size keeps a 36px circle but extends its hit area with a pseudo-element.
  const button = size === 'sm' ? 'relative size-9 after:absolute after:-inset-1 after:content-[\'\']' : 'size-11';
  const removes = min === 0 && value === 1;

  return (
    <div
      className={`inline-flex items-center justify-between rounded-full border border-brand-200 bg-brand-50 text-brand-800 ${className}`}
      role="group"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t.products.decrease}
        className={`${button} grid place-items-center rounded-full transition hover:bg-brand-100 active:scale-90 disabled:opacity-35`}
      >
        {removes ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
      </button>
      <span className="num min-w-6 text-center text-sm font-bold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={t.products.increase}
        className={`${button} grid place-items-center rounded-full transition hover:bg-brand-100 active:scale-90 disabled:opacity-35`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
