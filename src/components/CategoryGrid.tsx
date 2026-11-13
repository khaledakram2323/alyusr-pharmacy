import { useLang } from '../context/LanguageContext';
import { categories } from '../data/catalog';
import { scrollToId } from '../lib/hooks';
import type { CategoryId } from '../types';
import { CategoryIcon } from './CategoryIcons';
import { FloatingCapsules } from './FloatingCapsules';

interface CategoryGridProps {
  category: CategoryId | 'all';
  onCategoryChange: (category: CategoryId | 'all') => void;
}

/** One calm category block: two columns on phones, a spacious 4-column grid from tablets up. */
export function CategoryGrid({ category, onCategoryChange }: CategoryGridProps) {
  const { t, pick } = useLang();

  const choose = (id: CategoryId) => {
    onCategoryChange(category === id ? 'all' : id);
    scrollToId('products');
  };

  return (
    <section id="categories" className="relative scroll-mt-28 py-12 sm:py-20 lg:py-28">
      <FloatingCapsules preset="categories" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="text-sm font-semibold text-brand-600">{t.cat.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold leading-snug text-brand-900 sm:mt-3 sm:text-4xl sm:leading-snug">{t.cat.title}</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">{t.cat.sub}</p>
      </div>

      <div className="relative z-10 mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-3 px-4 sm:mt-12 sm:gap-4 sm:px-6 md:grid-cols-4 lg:gap-6">
        {categories.map((item) => {
          const selected = category === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(item.id)}
              className={`group flex min-w-0 flex-col items-center gap-3 rounded-3xl px-3 py-5 text-center transition duration-200 sm:gap-4 sm:rounded-[1.75rem] sm:px-4 sm:py-7 ${
                selected ? 'btn-primary shadow-lift' : 'glass-flat text-brand-900 hover:-translate-y-1 hover:bg-surface/90'
              }`}
            >
              <span
                className={`grid size-13 place-items-center rounded-2xl transition group-hover:scale-105 sm:size-16 ${
                  selected ? 'bg-on-brand/15 text-on-brand' : 'bg-surface/80 text-brand-600'
                }`}
              >
                <CategoryIcon id={item.id} className="size-7 sm:size-9" />
              </span>
              <span className="text-sm font-bold leading-snug sm:text-[15px]">{pick(item.name)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
