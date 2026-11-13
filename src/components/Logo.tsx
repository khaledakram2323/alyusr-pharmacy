import { useLang } from '../context/LanguageContext';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpeg`;

interface LogoMarkProps {
  className?: string;
  /** White rounded frame — use on dark or coloured surfaces. */
  framed?: boolean;
}

/**
 * The shield emblem wrapped in a circular white badge with a subtle cyan glow
 * so the JPEG's white background and square corners look like an intentional emblem on dark glass.
 */
export function LogoMark({ className = 'size-11' }: LogoMarkProps) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white p-1.5 aspect-square shadow-[0_0_15px_rgba(0,158,196,0.3)] ${className}`}
    >
      <img
        src={LOGO_SRC}
        alt=""
        width={128}
        height={128}
        className="size-full rounded-full object-contain"
      />
    </span>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  const { t } = useLang();
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark framed={inverted} />
      <span className="flex flex-col leading-none">
        <span className={`text-lg font-bold leading-tight ${inverted ? 'text-white' : 'text-brand-900'}`}>
          {t.brand.name}
        </span>
        <span className={`mt-0.5 text-[11px] font-medium ${inverted ? 'text-brand-200' : 'text-muted'}`}>
          {t.brand.tagline}
        </span>
      </span>
    </span>
  );
}
