import { SITE } from '../data/site';

/**
 * Fixed page backdrop: a deep midnight-teal gradient with soft cyan, teal and coral glows
 * (styled by `.ambient` in index.css). The floating capsules are rendered per section by
 * <FloatingCapsules/> so they can sit both behind and in front of the glass panels.
 *
 * Optional: set SITE.backdropPhoto to blend a dimmed photograph into the gradient.
 */
export function Backdrop() {
  return (
    <div className="ambient" aria-hidden="true">
      {SITE.backdropPhoto && <img src={SITE.backdropPhoto} alt="" />}
    </div>
  );
}
