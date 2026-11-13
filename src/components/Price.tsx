import { useLang } from '../context/LanguageContext';

export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

interface PriceProps {
  amount: number;
  className?: string;
  /** Renders as a struck-through "was" price. */
  struck?: boolean;
}

export function Price({ amount, className = '', struck = false }: PriceProps) {
  const { lang, t } = useLang();
  const number = <span className="num font-bold">{formatAmount(amount)}</span>;
  const currency = <span className="text-[0.72em] font-semibold opacity-70">{t.currency}</span>;
  return (
    <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${struck ? 'line-through opacity-60' : ''} ${className}`}>
      {lang === 'en' ? (
        <>
          {currency}
          {number}
        </>
      ) : (
        <>
          {number}
          {currency}
        </>
      )}
    </span>
  );
}
