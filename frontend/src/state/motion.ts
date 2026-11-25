/** True when motion should be kept to a minimum: the system asks for it, or the user
 *  turned on «Уменьшить анимацию» in the settings (App mirrors that onto <html>). */
export function prefersLessMotion() {
  if (typeof window === 'undefined') return true;
  return (
    document.documentElement.dataset.reducedMotion === 'true' ||
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
