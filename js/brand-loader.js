/* ==========================================================================
   BRAND LOADER — fade-out timing
   The decision to show the loader at all (first visit this session vs.
   repeat navigation) happens synchronously in a tiny inline script placed
   right after the loader element in each page's <body> — that has to run
   before paint to avoid a flash. That same inline script stamps
   window.__caLoaderShownAt so this file can measure real elapsed time
   rather than guessing, and hold the loader up for a guaranteed minimum
   duration regardless of how fast (or slow) the rest of the page parses.
   This file only handles the timed fade-out once DOMContentLoaded fires,
   and is safe to no-op if the loader was never shown (its default state
   is display:none).

   The SVG lacing animation (see css/base.css, .bl-panel/.bl-lace/
   .bl-eyelet) finishes its last eyelet pop + the wordmark fade-in at
   roughly 1800ms after the loader becomes visible. MIN_VISIBLE_MS is set
   a little past that so the loader never cuts the animation off mid-way
   — on a fast-parsing page, DOMContentLoaded can fire well under 200ms,
   which is exactly what made the old fixed 400ms hold feel like a blink.
   ========================================================================== */

(function () {
  'use strict';

  var MIN_VISIBLE_MS = 2100;
  var FADE_MS = 380;

  document.addEventListener('DOMContentLoaded', function () {
    const loader = document.querySelector('[data-brand-loader]');
    if (!loader || loader.style.display === 'none' || loader.style.display === '') return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      loader.classList.add('is-hiding');
      setTimeout(() => { loader.style.display = 'none'; }, 0);
      return;
    }

    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    const shownAt = typeof window.__caLoaderShownAt === 'number' ? window.__caLoaderShownAt : now;
    const elapsed = now - shownAt;
    const holdTime = Math.max(0, MIN_VISIBLE_MS - elapsed);

    setTimeout(() => {
      loader.classList.add('is-hiding');
      setTimeout(() => {
        loader.style.display = 'none';
      }, FADE_MS);
    }, holdTime);
  });
})();
