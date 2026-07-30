/* ==========================================================================
   CUSTOM BUILDER WIZARD
   Six steps held in one page: type -> fabric -> color -> sizing -> details
   -> review. State lives in memory; the final step builds a formatted
   WhatsApp message covering every selection plus the 50% deposit terms.
   ========================================================================== */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '923286712746';
  const TOTAL_STEPS = 6;

  const TYPE_OPTIONS = [
    { value: 'Bridal Corset', swatch: 'linear-gradient(160deg,#3a1116,#6B1423 55%,#C9A6A1 140%)' },
    { value: 'Overbust Corset', swatch: 'linear-gradient(160deg,#0F0D0E,#4a161d 130%)' },
    { value: 'Underbust Corset', swatch: 'linear-gradient(160deg,#171415,#6B1423 150%)' },
    { value: 'Waist Trainer', swatch: 'linear-gradient(160deg,#211014,#A9772F 170%)' },
    { value: 'Evening Corset', swatch: 'linear-gradient(160deg,#0F0D0E,#8A2432 160%)' },
    { value: 'Satin Corset', swatch: 'linear-gradient(160deg,#241014,#C9A6A1 150%)' }
  ];

  const FABRIC_OPTIONS = [
    { value: 'Silk Satin', desc: 'Smooth, lustrous' },
    { value: 'Duchess Satin', desc: 'Soft sheen' },
    { value: 'Cotton Coutil', desc: 'Structured, breathable' },
    { value: 'Velvet', desc: 'Rich, plush' },
    { value: 'French Lace Overlay', desc: 'Delicate, sheer' },
    { value: 'Silk Brocade', desc: 'Woven pattern, heirloom' }
  ];

  const COLOR_OPTIONS = ['Ivory', 'Black', 'Oxblood', 'Blush', 'Champagne', 'Emerald', 'Wine', 'Nude'];
  const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const state = {
    step: 1,
    type: null,
    fabric: null,
    color: null,
    sizingMode: 'standard',
    size: null,
    measurements: { bust: '', waist: '', hip: '', torso: '' },
    details: { name: '', phone: '', email: '', address: '', city: '', notes: '' }
  };

  function waLink(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  // ---- Stepper UI ----
  function renderStepper() {
    const stepper = document.querySelector('[data-stepper]');
    const mobileLabel = document.querySelector('[data-step-mobile-label]');
    const labels = ['Type', 'Fabric', 'Color', 'Sizing', 'Details', 'Review'];

    stepper.innerHTML = labels.map((label, i) => {
      const n = i + 1;
      const cls = n < state.step ? 'is-complete' : (n === state.step ? 'is-active' : '');
      return `
        <div class="step-node ${cls}">
          <span class="dot">${n < state.step ? '✓' : n}</span>
          <span class="connector"></span>
        </div>`;
    }).join('');

    mobileLabel.textContent = `Step ${state.step} of ${TOTAL_STEPS} — ${labels[state.step - 1]}`;
  }

  function showStep() {
    document.querySelectorAll('.builder-step').forEach((el) => {
      el.classList.toggle('is-active', Number(el.getAttribute('data-step')) === state.step);
    });
    renderStepper();
    updateNavButtons();
    if (state.step === TOTAL_STEPS) renderReview();
    window.scrollTo({ top: document.querySelector('.builder-panel').offsetTop - 100, behavior: 'smooth' });
  }

  function updateNavButtons() {
    document.querySelectorAll('[data-back]').forEach((btn) => { btn.disabled = state.step === 1; });
    document.querySelectorAll('[data-next]').forEach((btn) => {
      btn.textContent = state.step === TOTAL_STEPS ? 'Send Order on WhatsApp' : 'Continue';
    });
  }

  function validateStep() {
    const errorEl = document.querySelector(`.builder-step[data-step="${state.step}"] .field-error`);
    let valid = true;
    let message = '';

    if (state.step === 1 && !state.type) { valid = false; message = 'Please choose a corset type.'; }
    if (state.step === 2 && !state.fabric) { valid = false; message = 'Please choose a fabric.'; }
    if (state.step === 3 && !state.color) { valid = false; message = 'Please choose a color.'; }
    if (state.step === 4) {
      if (state.sizingMode === 'standard' && !state.size) { valid = false; message = 'Please choose a standard size.'; }
      if (state.sizingMode === 'custom') {
        const m = state.measurements;
        if (!m.bust || !m.waist || !m.hip || !m.torso) { valid = false; message = 'Please fill in all four measurements.'; }
      }
    }
    if (state.step === 5) {
      const d = state.details;
      if (!d.name || !d.phone || !d.address || !d.city) { valid = false; message = 'Please fill in the required fields.'; }
    }
    if (state.step === 6) {
      const checkbox = document.querySelector('[data-policy-agree]');
      if (!checkbox.checked) { valid = false; message = 'Please confirm you understand the deposit and cancellation policy.'; }
    }

    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.toggle('is-visible', !valid);
    }
    return valid;
  }

  // ---- Step 1: Type ----
  function renderTypeOptions() {
    const grid = document.querySelector('[data-type-grid]');
    grid.innerHTML = TYPE_OPTIONS.map((opt) => `
      <div class="option-card ${state.type === opt.value ? 'is-selected' : ''}" data-type-option="${opt.value}">
        <div class="option-swatch" style="background:${opt.swatch}"></div>
        <h4>${opt.value}</h4>
      </div>
    `).join('');
    grid.querySelectorAll('[data-type-option]').forEach((card) => {
      card.addEventListener('click', () => {
        state.type = card.getAttribute('data-type-option');
        renderTypeOptions();
      });
    });
  }

  // ---- Step 2: Fabric ----
  function renderFabricOptions() {
    const grid = document.querySelector('[data-fabric-grid]');
    grid.innerHTML = FABRIC_OPTIONS.map((opt) => `
      <div class="option-card ${state.fabric === opt.value ? 'is-selected' : ''}" data-fabric-option="${opt.value}">
        <h4>${opt.value}</h4>
        <p>${opt.desc}</p>
      </div>
    `).join('');
    grid.querySelectorAll('[data-fabric-option]').forEach((card) => {
      card.addEventListener('click', () => {
        state.fabric = card.getAttribute('data-fabric-option');
        renderFabricOptions();
      });
    });
  }

  // ---- Step 3: Color ----
  function renderColorOptions() {
    const grid = document.querySelector('[data-color-grid]');
    const { colorToCss } = window.CorsetAtelier;
    grid.innerHTML = COLOR_OPTIONS.map((c) => `
      <div class="color-option ${state.color === c ? 'is-selected' : ''}" data-color-option="${c}">
        <span class="swatch-circle" style="background:${colorToCss(c)}"></span>
        <span>${c}</span>
      </div>
    `).join('');
    grid.querySelectorAll('[data-color-option]').forEach((opt) => {
      opt.addEventListener('click', () => {
        state.color = opt.getAttribute('data-color-option');
        renderColorOptions();
      });
    });
  }

  // ---- Step 4: Sizing ----
  function renderSizingOptions() {
    const grid = document.querySelector('[data-size-grid]');
    grid.innerHTML = SIZE_OPTIONS.map((s) => `
      <button type="button" class="size-btn ${state.size === s ? 'is-active' : ''}" data-size-option="${s}">${s}</button>
    `).join('');
    grid.querySelectorAll('[data-size-option]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.size = btn.getAttribute('data-size-option');
        renderSizingOptions();
      });
    });
  }

  function initSizingToggle() {
    const toggleBtns = document.querySelectorAll('[data-sizing-toggle]');
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.sizingMode = btn.getAttribute('data-sizing-toggle');
        toggleBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        document.querySelectorAll('.sizing-panel').forEach((panel) => {
          panel.classList.toggle('is-active', panel.getAttribute('data-sizing-panel') === state.sizingMode);
        });
      });
    });

    document.querySelectorAll('[data-measure-input]').forEach((input) => {
      input.addEventListener('input', () => {
        state.measurements[input.getAttribute('data-measure-input')] = input.value;
      });
    });
  }

  // ---- Step 5: Details ----
  function initDetailsForm() {
    document.querySelectorAll('[data-detail-input]').forEach((input) => {
      input.addEventListener('input', () => {
        state.details[input.getAttribute('data-detail-input')] = input.value;
      });
    });
  }

  // ---- Step 6: Review ----
  function renderReview() {
    const { formatPrice } = window.CorsetAtelier;
    const sizingText = state.sizingMode === 'standard'
      ? `Size ${state.size}`
      : `Custom — Bust ${state.measurements.bust}", Waist ${state.measurements.waist}", Hip ${state.measurements.hip}", Torso Length ${state.measurements.torso}"`;

    const rows = [
      ['Type', state.type],
      ['Fabric', state.fabric],
      ['Color', state.color],
      ['Sizing', sizingText],
      ['Name', state.details.name],
      ['Phone', state.details.phone],
      ['City', state.details.city],
      ['Address', state.details.address]
    ];

    document.querySelector('[data-review-rows]').innerHTML = rows.map(([label, value]) => `
      <div class="review-row"><span class="review-label">${label}</span><span class="review-value">${value || '—'}</span></div>
    `).join('');
  }

  function buildOrderMessage() {
    const sizingText = state.sizingMode === 'standard'
      ? `Standard Size: ${state.size}`
      : `Custom Measurements — Bust: ${state.measurements.bust}in, Waist: ${state.measurements.waist}in, Hip: ${state.measurements.hip}in, Torso Length: ${state.measurements.torso}in`;

    return [
      `Hi! I'd like to start a custom build:`,
      ``,
      `*Type:* ${state.type}`,
      `*Fabric:* ${state.fabric}`,
      `*Color:* ${state.color}`,
      `*${sizingText}*`,
      state.details.notes ? `*Notes:* ${state.details.notes}` : '',
      ``,
      `*Contact Details*`,
      `Name: ${state.details.name}`,
      `Phone: ${state.details.phone}`,
      `Email: ${state.details.email || '—'}`,
      `Address: ${state.details.address}`,
      `City: ${state.details.city}`,
      ``,
      `I understand this requires a 50% deposit to confirm the order, with the balance due before delivery, and that once confirmed, this deposit is non-refundable if the order is cancelled.`
    ].filter(Boolean).join('\n');
  }

  function initNav() {
    document.querySelectorAll('[data-next]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!validateStep()) return;
        if (state.step === TOTAL_STEPS) {
          window.open(waLink(buildOrderMessage()), '_blank');
          return;
        }
        state.step++;
        showStep();
      });
    });
    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.step === 1) return;
        state.step--;
        showStep();
      });
    });
  }

  function prefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const base = params.get('base');
    if (base) {
      const notesField = document.querySelector('[data-detail-input="notes"]');
      const text = `Based on: ${base}`;
      notesField.value = text;
      state.details.notes = text;
    }
  }

  function init() {
    if (!document.querySelector('[data-builder-root]')) return;
    renderTypeOptions();
    renderFabricOptions();
    renderColorOptions();
    renderSizingOptions();
    initSizingToggle();
    initDetailsForm();
    initNav();
    prefillFromQuery();
    showStep();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
