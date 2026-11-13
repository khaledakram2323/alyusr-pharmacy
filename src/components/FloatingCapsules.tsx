import { useId, type CSSProperties } from 'react';

/**
 * Glossy 3D-styled medicine capsules and tablets that float around the page.
 *
 * Each preset renders two layers inside the nearest `relative` parent:
 *   • back  (z-0)  — sits BEHIND the glass panels, so the frosted glass refracts and blurs it
 *   • front (z-20) — sharp capsules overlapping card corners and section edges
 * On phones the whole front layer is hidden and the back layer is smaller and half-transparent,
 * so nothing floats over the text or the tap targets.
 * Section content must be `relative z-10` to sit between the two.
 */

type Tone = 'cyan' | 'pearl' | 'teal' | 'coral';
type Motion = 'slow' | 'medium' | 'reverse';

/** [highlight, body, shadow] */
const TONES: Record<Tone, [string, string, string]> = {
  cyan: ['#9BEBFA', '#009EC4', '#00566B'],
  pearl: ['#FFFFFF', '#E6EFF3', '#9FB3BE'],
  teal: ['#8EF0E2', '#14B8A6', '#0A6258'],
  coral: ['#FFCBBB', '#E07A5F', '#93402B'],
};

interface Pill {
  kind: 'capsule' | 'tablet';
  a: Tone;
  b?: Tone;
  /** Width in px */
  w: number;
  /** Position of the centre, in % of the parent (may be negative / over 100 to overlap edges) */
  x: number;
  y: number;
  /** Resting rotation in degrees */
  r: number;
  layer: 'back' | 'front';
  blur?: number;
  motion: Motion;
  delay?: number;
  /** Hidden on phones to keep small screens calm */
  desktopOnly?: boolean;
}

function Capsule({ a, b }: { a: Tone; b: Tone }) {
  const id = useId();
  const [aHi, aMid, aLo] = TONES[a];
  const [bHi, bMid, bLo] = TONES[b];
  return (
    <svg viewBox="0 0 200 80" className="block h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={aHi} />
          <stop offset="0.45" stopColor={aMid} />
          <stop offset="1" stopColor={aLo} />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bHi} />
          <stop offset="0.45" stopColor={bMid} />
          <stop offset="1" stopColor={bLo} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <rect width="200" height="80" rx="40" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="101" height="80" fill={`url(#${id}a)`} />
        <rect x="100" width="100" height="80" fill={`url(#${id}b)`} />
        {/* seam between the two halves */}
        <rect x="98" width="2.5" height="80" fill="#000" opacity="0.22" />
        <rect x="100.5" width="2" height="80" fill="#fff" opacity="0.35" />
        {/* underside bounce light */}
        <ellipse cx="100" cy="86" rx="92" ry="18" fill="#fff" opacity="0.14" />
      </g>
      {/* specular highlights */}
      <rect x="20" y="9" width="160" height="20" rx="10" fill={`url(#${id}s)`} opacity="0.75" />
      <ellipse cx="34" cy="24" rx="9" ry="5" fill="#fff" opacity="0.85" />
      <rect width="200" height="80" rx="40" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.5" />
    </svg>
  );
}

function Tablet({ a }: { a: Tone }) {
  const id = useId();
  const [hi, mid, lo] = TONES[a];
  return (
    <svg viewBox="0 0 100 100" className="block h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}f`} cx="0.36" cy="0.3" r="0.85">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </radialGradient>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
      </defs>
      {/* bevelled edge, then the face */}
      <circle cx="50" cy="50" r="49" fill={`url(#${id}e)`} />
      <circle cx="50" cy="50" r="42" fill={`url(#${id}f)`} />
      <path d="M22 50H78" stroke={lo} strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 52.5H78" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="36" cy="30" rx="15" ry="8" fill="#fff" opacity="0.6" transform="rotate(-28 36 30)" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
    </svg>
  );
}

const PRESETS = {
  hero: [
    { kind: 'capsule', a: 'cyan', b: 'pearl', w: 250, x: 6, y: 20, r: -28, layer: 'back', motion: 'slow' },
    { kind: 'capsule', a: 'coral', b: 'pearl', w: 190, x: 93, y: 58, r: 34, layer: 'back', motion: 'reverse', delay: -4 },
    { kind: 'tablet', a: 'pearl', w: 120, x: 88, y: 12, r: 0, layer: 'back', blur: 2, motion: 'medium', delay: -2 },
    { kind: 'capsule', a: 'teal', b: 'pearl', w: 150, x: 24, y: 88, r: 18, layer: 'back', blur: 3, motion: 'medium', delay: -5, desktopOnly: true },
    { kind: 'capsule', a: 'cyan', b: 'pearl', w: 120, x: 97, y: 94, r: -22, layer: 'front', motion: 'slow', delay: -3 },
    { kind: 'tablet', a: 'teal', w: 64, x: 2.5, y: 72, r: 0, layer: 'front', motion: 'reverse', delay: -6, desktopOnly: true },
  ],
  categories: [
    { kind: 'capsule', a: 'teal', b: 'pearl', w: 170, x: 4, y: 40, r: 40, layer: 'back', blur: 2, motion: 'medium' },
    { kind: 'tablet', a: 'cyan', w: 96, x: 95, y: 24, r: 0, layer: 'back', blur: 3, motion: 'slow', delay: -3 },
    { kind: 'capsule', a: 'coral', b: 'pearl', w: 96, x: 96.5, y: 78, r: -30, layer: 'front', motion: 'reverse', delay: -2, desktopOnly: true },
  ],
  products: [
    { kind: 'capsule', a: 'cyan', b: 'pearl', w: 200, x: 2, y: 18, r: -36, layer: 'back', blur: 3, motion: 'slow' },
    { kind: 'capsule', a: 'coral', b: 'pearl', w: 170, x: 98, y: 46, r: 26, layer: 'back', blur: 2, motion: 'reverse', delay: -5 },
    { kind: 'tablet', a: 'pearl', w: 90, x: 3, y: 74, r: 0, layer: 'back', blur: 4, motion: 'medium', delay: -3, desktopOnly: true },
    { kind: 'capsule', a: 'teal', b: 'pearl', w: 92, x: 97.5, y: 8, r: 48, layer: 'front', motion: 'medium', delay: -1, desktopOnly: true },
  ],
  consult: [
    { kind: 'capsule', a: 'cyan', b: 'pearl', w: 210, x: 10, y: 22, r: 24, layer: 'back', motion: 'slow' },
    { kind: 'tablet', a: 'teal', w: 110, x: 90, y: 74, r: 0, layer: 'back', motion: 'medium', delay: -4 },
    { kind: 'capsule', a: 'coral', b: 'pearl', w: 110, x: 91, y: 16, r: -34, layer: 'front', motion: 'reverse', delay: -2 },
    { kind: 'tablet', a: 'pearl', w: 58, x: 8.5, y: 86, r: 0, layer: 'front', motion: 'slow', delay: -6, desktopOnly: true },
  ],
  footer: [
    { kind: 'capsule', a: 'teal', b: 'pearl', w: 180, x: 92, y: 30, r: 30, layer: 'back', motion: 'reverse' },
    { kind: 'tablet', a: 'cyan', w: 100, x: 7, y: 62, r: 0, layer: 'back', blur: 2, motion: 'slow', delay: -3 },
    { kind: 'capsule', a: 'cyan', b: 'pearl', w: 100, x: 6.5, y: 10, r: -24, layer: 'front', motion: 'medium', delay: -5, desktopOnly: true },
  ],
  // Positioned around the login card: some tucked behind the glass, two floating in front of its edges.
  auth: [
    { kind: 'capsule', a: 'cyan', b: 'pearl', w: 230, x: 2, y: 9, r: -32, layer: 'back', motion: 'slow' },
    { kind: 'capsule', a: 'teal', b: 'pearl', w: 190, x: 102, y: 40, r: 58, layer: 'back', motion: 'reverse', delay: -4 },
    { kind: 'tablet', a: 'pearl', w: 120, x: 92, y: 2, r: 0, layer: 'back', motion: 'medium', delay: -2 },
    { kind: 'tablet', a: 'cyan', w: 84, x: -6, y: 60, r: 0, layer: 'back', blur: 2, motion: 'medium', delay: -6 },
    { kind: 'capsule', a: 'coral', b: 'pearl', w: 150, x: 14, y: 99, r: 16, layer: 'front', motion: 'slow', delay: -3 },
    { kind: 'capsule', a: 'cyan', b: 'pearl', w: 96, x: 103, y: 84, r: -40, layer: 'front', motion: 'reverse', delay: -1 },
  ],
} satisfies Record<string, Pill[]>;

export type CapsulePreset = keyof typeof PRESETS;

function Layer({ pills, layer }: { pills: Pill[]; layer: 'back' | 'front' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${layer === 'back' ? 'z-0' : 'z-20 hidden md:block'}`} aria-hidden="true">
      {pills
        .filter((pill) => pill.layer === layer)
        .map((pill, index) => {
          const position: CSSProperties = {
            left: `${pill.x}%`,
            top: `${pill.y}%`,
            width: pill.w,
            marginLeft: -pill.w / 2,
            marginTop: pill.kind === 'capsule' ? -pill.w / 5 : -pill.w / 2,
            animationDelay: `${pill.delay ?? 0}s`,
          };
          const look: CSSProperties = {
            transform: `rotate(${pill.r}deg)`,
            filter: `drop-shadow(0 ${layer === 'front' ? 22 : 14}px ${layer === 'front' ? 26 : 18}px rgb(0 0 0 / 0.5))${
              pill.blur ? ` blur(${pill.blur}px)` : ''
            }`,
          };
          return (
            <div
              key={index}
              style={position}
              className={`absolute will-change-transform float-${pill.motion} ${pill.desktopOnly ? 'hidden lg:block' : 'max-lg:scale-[0.6] max-md:scale-50 max-md:opacity-50'}`}
            >
              <div style={look}>{pill.kind === 'capsule' ? <Capsule a={pill.a} b={pill.b ?? 'pearl'} /> : <Tablet a={pill.a} />}</div>
            </div>
          );
        })}
    </div>
  );
}

export function FloatingCapsules({ preset }: { preset: CapsulePreset }) {
  const pills: Pill[] = PRESETS[preset];
  return (
    <>
      <Layer pills={pills} layer="back" />
      <Layer pills={pills} layer="front" />
    </>
  );
}
