/* ==========================================================================
   CONTACT FORM → WHATSAPP
   ========================================================================== */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '923286712746';

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const message = [
        `Hi! I'm reaching out from the Noir Corset website.`,
        ``,
        `Name: ${data.name}`,
        `Phone: ${data.phone || '—'}`,
        `Email: ${data.email || '—'}`,
        ``,
        `Message:`,
        data.message
      ].join('\n');
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    });
  });
})();
