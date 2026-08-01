/* ==========================================================================
   GIFT CARDS
   Amount selection (preset or custom), recipient/message fields, and a
   WhatsApp handoff — same submission pattern as every other form on the
   site. There's no real payment processing here (no backend), so this is
   intentionally a "request" flow: the actual payment and code delivery
   are confirmed manually on WhatsApp, same as a custom order.
   ========================================================================== */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '923287658832';
  let selectedAmount = 10000;

  function init() {
    const amountRow = document.querySelector('[data-giftcard-amounts]');
    const customInput = document.querySelector('[data-giftcard-custom]');
    const submitBtn = document.querySelector('[data-giftcard-submit]');
    if (!amountRow || !submitBtn) return;

    amountRow.querySelectorAll('[data-amount]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedAmount = Number(btn.getAttribute('data-amount'));
        amountRow.querySelectorAll('[data-amount]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        customInput.value = '';
      });
    });

    customInput.addEventListener('input', () => {
      if (customInput.value) {
        selectedAmount = Number(customInput.value);
        amountRow.querySelectorAll('[data-amount]').forEach((b) => b.classList.remove('is-active'));
      }
    });

    submitBtn.addEventListener('click', handleSubmit);
  }

  function handleSubmit() {
    const name = document.querySelector('[data-giftcard-name]').value.trim();
    const phone = document.querySelector('[data-giftcard-phone]').value.trim();
    const email = document.querySelector('[data-giftcard-email]').value.trim();
    const recipient = document.querySelector('[data-giftcard-recipient]').value.trim();
    const message = document.querySelector('[data-giftcard-message]').value.trim();
    const errorEl = document.querySelector('[data-giftcard-error]');

    if (!name || !phone) {
      errorEl.textContent = 'Please fill in your name and phone number so we can arrange your gift card.';
      errorEl.classList.add('is-visible');
      return;
    }
    if (!selectedAmount || selectedAmount < 1000) {
      errorEl.textContent = 'Please choose or enter a valid gift card amount (minimum Rs. 1,000).';
      errorEl.classList.add('is-visible');
      return;
    }
    errorEl.classList.remove('is-visible');

    const { formatPrice } = window.CorsetAtelier;
    const waMessage = [
      `Hi! I'd like to request a gift card:`,
      ``,
      `*Amount:* ${formatPrice(selectedAmount)}`,
      recipient ? `*For:* ${recipient}` : '',
      message ? `*Message:* ${message}` : '',
      ``,
      `*My Details*`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email || '—'}`
    ].filter(Boolean).join('\n');

    const submitBtn = document.querySelector('[data-giftcard-submit]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Opening WhatsApp...';
    submitBtn.disabled = true;

    setTimeout(() => {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`, '_blank');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }, 500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
