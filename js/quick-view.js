/* ==========================================================================
   QUICK VIEW
   Injects a single modal into the page (once) and listens for clicks on
   any [data-quickview-trigger] via event delegation on document — this
   means it works for product cards that don't exist yet at page load
   (Collections/Wishlist/related-products all render after a fetch), with
   no need to re-bind listeners after every re-render.

   "Buy Now" here is intentionally lightweight: it opens WhatsApp with the
   product + chosen variant, asking to finalize delivery details there,
   rather than duplicating the full delivery form inside a modal-over-modal.
   The full form flow still lives on the product page for anyone who wants
   it — "View Full Details" links straight there.
   ========================================================================== */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '923286712746';
  let overlay = null;
  let product = null;
  let selectedColor = null;
  let selectedSize = null;

  function waLink(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function injectOverlay() {
    if (overlay) return overlay;
    const el = document.createElement('div');
    el.className = 'qv-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('aria-label', 'Quick view');
    el.innerHTML = `
      <div class="qv-panel">
        <button type="button" class="qv-close" data-qv-close aria-label="Close quick view">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div data-qv-body></div>
      </div>
    `;
    document.body.appendChild(el);
    overlay = el;

    el.querySelector('[data-qv-close]').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.classList.contains('is-open')) close();
    });
    return el;
  }

  function open(p) {
    injectOverlay();
    product = p;
    selectedColor = p.colors[0];
    selectedSize = p.sizes[0];
    renderContent();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.qv-close').focus();
  }

  function close() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderContent() {
    const { formatPrice, discountPercent, colorToCss, categoryLabels, isWishlisted } = window.CorsetAtelier;
    const discount = discountPercent(product.price, product.comparePrice);
    const body = overlay.querySelector('[data-qv-body]');

    body.innerHTML = `
      <div class="qv-grid">
        <div class="qv-media" style="background:${product.swatch}"></div>
        <div class="qv-info">
          <span class="qv-category">${categoryLabels[product.category] || product.category}</span>
          <h2 class="qv-name">${product.name}</h2>
          <div class="qv-price-row">
            <span class="qv-price">${formatPrice(product.price)}</span>
            ${product.comparePrice ? `<span class="qv-compare">${formatPrice(product.comparePrice)}</span>` : ''}
            ${discount ? `<span class="qv-discount">Save ${discount}%</span>` : ''}
          </div>
          ${product.stock ? window.CorsetAtelier.stockBadgeHTML(product.stock) : ''}
          <p class="qv-desc">${product.description}</p>

          <div class="qv-variant-group">
            <div class="qv-variant-label"><h6>Color</h6><span data-qv-color-value>${selectedColor}</span></div>
            <div class="qv-swatch-row" data-qv-colors></div>
          </div>

          <div class="qv-variant-group">
            <div class="qv-variant-label"><h6>Size</h6></div>
            <div class="qv-size-row" data-qv-sizes></div>
          </div>

          <div class="qv-actions">
            <button type="button" class="btn ${window.CorsetAtelier.isPurchasable(product.stock) ? 'btn-primary' : 'btn-outline-dark'}" data-qv-buy>${window.CorsetAtelier.isPurchasable(product.stock) ? 'Buy Now — WhatsApp' : 'Notify Me — WhatsApp'}</button>
            <button type="button" class="qv-wishlist-btn ${isWishlisted(product.id) ? 'is-active' : ''}" data-qv-wishlist aria-label="Toggle wishlist">
              <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.5 4c2-.3 3.8.7 4.9 2.3C11.5 4.7 13.3 3.7 15.3 4c3.5.5 5.1 4 3.5 7.7C16.5 16.4 12 21 12 21z" stroke-width="1.5" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <a href="product.html?id=${product.id}" class="btn-ghost qv-full-link">View Full Details &amp; Photos</a>
        </div>
      </div>
    `;

    const colorRow = body.querySelector('[data-qv-colors]');
    colorRow.innerHTML = product.colors.map((c, i) => `
      <button type="button" class="qv-color-swatch ${i === 0 ? 'is-active' : ''}" data-color="${c}" style="background:${colorToCss(c)}" title="${c}" aria-label="${c}"></button>
    `).join('');
    colorRow.querySelectorAll('.qv-color-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedColor = btn.getAttribute('data-color');
        colorRow.querySelectorAll('.qv-color-swatch').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        body.querySelector('[data-qv-color-value]').textContent = selectedColor;
      });
    });

    const sizeRow = body.querySelector('[data-qv-sizes]');
    sizeRow.innerHTML = product.sizes.map((s, i) => `
      <button type="button" class="qv-size-btn ${i === 0 ? 'is-active' : ''}" data-size="${s}">${s}</button>
    `).join('');
    sizeRow.querySelectorAll('.qv-size-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedSize = btn.getAttribute('data-size');
        sizeRow.querySelectorAll('.qv-size-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    const wishBtn = body.querySelector('[data-qv-wishlist]');
    wishBtn.addEventListener('click', () => {
      const active = window.CorsetAtelier.toggleWishlist(product.id);
      wishBtn.classList.toggle('is-active', active);
      pulseWishlistIcon(wishBtn, active);

      // Sync the card underneath the modal — it's still in the DOM behind
      // the overlay, and without this it would keep showing the old
      // (unfilled) heart state until the grid happens to re-render for
      // some unrelated reason.
      document.querySelectorAll(`[data-wishlist-toggle="${product.id}"]`).forEach((cardBtn) => {
        cardBtn.classList.toggle('is-active', active);
      });
    });

    body.querySelector('[data-qv-buy]').addEventListener('click', handleBuy);
  }

  function pulseWishlistIcon(el, active) {
    if (!active) return;
    el.classList.remove('is-pulsing');
    void el.offsetWidth; // restart animation if clicked repeatedly
    el.classList.add('is-pulsing');
  }

  function handleBuy() {
    const { formatPrice, isPurchasable } = window.CorsetAtelier;
    const soldOut = !isPurchasable(product.stock);

    const message = soldOut
      ? `Hi! I'd like to be notified when *${product.name}* is back in stock.`
      : [
          `Hi! I'd like to order:`,
          ``,
          `*${product.name}*`,
          `Color: ${selectedColor}   Size: ${selectedSize}`,
          `Price: ${formatPrice(product.price)}`,
          ``,
          `Could you send me the order form to confirm delivery details?`,
          ``,
          `I understand this order requires a 50% deposit to confirm, with the balance due on delivery, and that once confirmed, this deposit is non-refundable if the order is cancelled.`
        ].join('\n');

    const body = overlay.querySelector('[data-qv-body]');
    body.innerHTML = `
      <div class="qv-confirm">
        <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${soldOut ? `Opening WhatsApp to notify you about<br><strong>${product.name}</strong>...` : `Opening WhatsApp to finish your order for<br><strong>${product.name}</strong>...`}
      </div>
    `;
    setTimeout(() => {
      window.open(waLink(message), '_blank');
      close();
    }, 700);
  }

  async function handleTriggerClick(e) {
    const trigger = e.target.closest('[data-quickview-trigger]');
    if (!trigger) return;
    e.preventDefault();
    const id = trigger.getAttribute('data-quickview-trigger');
    const products = await window.CorsetAtelier.getProducts();
    const p = products.find((prod) => prod.id === id);
    if (p) open(p);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', handleTriggerClick);
  });
})();
