/* ==========================================================================
   HERO SLIDER
   Auto-advances every 3s. The progress control doubles as the signature
   "lace line" — each tick fills like a lace being drawn tight, and clicking
   a tick jumps straight to that slide.
   ========================================================================== */

(function () {
  'use strict';

  function initHeroSpotlight(hero) {
    const spotlight = hero.querySelector('[data-hero-spotlight]');
    if (!spotlight) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      spotlight.style.setProperty('--spot-x', x + '%');
      spotlight.style.setProperty('--spot-y', y + '%');
    });
  }

  function initHeroSlider() {
    const hero = document.querySelector('[data-hero-slider]');
    if (!hero) return;

    const slides = Array.from(hero.querySelectorAll('.hero-slide'));
    const progressButtons = Array.from(hero.querySelectorAll('.hero-progress button'));
    const prevBtn = hero.querySelector('[data-hero-prev]');
    const nextBtn = hero.querySelector('[data-hero-next]');
    const INTERVAL = 3000;

    let current = 0;
    let timer = null;

    function render() {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === current));
      progressButtons.forEach((b, i) => {
        b.classList.toggle('is-active', i === current);
        b.classList.toggle('is-done', i < current);
      });
    }

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      render();
      restart();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function restart() {
      clearInterval(timer);
      timer = setInterval(next, INTERVAL);
    }

    progressButtons.forEach((btn, i) => {
      btn.addEventListener('click', () => goTo(i));
    });
    nextBtn && nextBtn.addEventListener('click', next);
    prevBtn && prevBtn.addEventListener('click', prev);

    // Pause on hover/focus so a reader can actually read the slide.
    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', restart);

    render();
    restart();
    initHeroSpotlight(hero);
  }

  function initNewsletterForm() {
    const form = document.querySelector('[data-newsletter-form]');
    if (!form) return;

    const formView = document.querySelector('[data-newsletter-form-view]');
    const confirmView = document.querySelector('[data-newsletter-confirm-view]');
    const WHATSAPP_NUMBER = '923287658832';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = new FormData(form).get('email');
      const message = `Hi! Please add me to the Noir Corset mailing list.\n\nEmail: ${email}`;

      formView.style.display = 'none';
      confirmView.style.display = '';
      setTimeout(() => {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
      }, 700);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeroSlider();
    initNewsletterForm();
  });
})();
