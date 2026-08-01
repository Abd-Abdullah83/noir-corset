/* ==========================================================================
   PRODUCT DETAIL PAGE
   Loads the product from ?id=, renders gallery/variants/related items, and
   wires the Buy and Query flows to prefilled WhatsApp messages — no backend
   involved, wa.me does the rest.
   ========================================================================== */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '923287658832';
  let product = null;
  let selectedColor = null;
  let selectedSize = null;
  let activeImageIndex = 0;

  function waLink(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function renderNotFound() {
    document.querySelector('[data-product-root]').innerHTML = `
      <div class="empty-state">
        <h3>We couldn't find that piece</h3>
        <p>It may have sold out or moved. Browse the full collection instead.</p>
        <a href="collections.html" class="btn btn-primary" style="margin-top:1.5rem">Back to Collections</a>
      </div>`;
  }

  // Returns the gallery for the currently selected color if the product has
  // one (product.colorGalleries[color]), otherwise falls back to the
  // product's default gallery. This is the color-linked gallery mechanism —
  // see data/products.json for the shape colorGalleries expects. Most
  // products won't have this set yet since it needs real per-color
  // photography to be worth populating; the fallback means nothing breaks
  // for products that don't have it.
  function getActiveGallery() {
    if (product.colorGalleries && product.colorGalleries[selectedColor]) {
      return product.colorGalleries[selectedColor];
    }
    return product.gallery;
  }

  function renderGallery() {
    const main = document.querySelector('[data-gallery-main]');
    const thumbs = document.querySelector('[data-gallery-thumbs]');
    const layers = main.querySelectorAll('[data-zoom-layer]');
    const activeGallery = getActiveGallery();

    const activeLayer = main.querySelector('.zoom-layer.is-active') || layers[0];
    const inactiveLayer = Array.from(layers).find((l) => l !== activeLayer) || layers[1];

    inactiveLayer.style.background = window.CorsetAtelier.resolveBackground(activeGallery[activeImageIndex]);
    // Force a reflow so the browser registers the new background before we
    // toggle opacity — otherwise the crossfade can skip straight to the end.
    void inactiveLayer.offsetWidth;
    layers.forEach((l) => l.classList.remove('is-active'));
    inactiveLayer.classList.add('is-active');

    thumbs.innerHTML = activeGallery.map((g, i) => `
      <button type="button" class="gallery-thumb ${i === activeImageIndex ? 'is-active' : ''}" data-thumb-index="${i}" aria-label="View image ${i + 1}">
        <span class="thumb-bg" style="background:${window.CorsetAtelier.resolveBackground(g)}"></span>
      </button>
    `).join('');

    const dots = main.querySelector('[data-gallery-dots]');
    const prevBtn = main.querySelector('[data-gallery-prev]');
    const nextBtn = main.querySelector('[data-gallery-next]');
    const multiImage = activeGallery.length > 1;
    if (dots) {
      dots.innerHTML = multiImage ? activeGallery.map((_, i) => `
        <button type="button" class="gallery-dot ${i === activeImageIndex ? 'is-active' : ''}" data-dot-index="${i}" aria-label="Go to image ${i + 1}"></button>
      `).join('') : '';
      dots.querySelectorAll('[data-dot-index]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          activeImageIndex = Number(btn.getAttribute('data-dot-index'));
          renderGallery();
        });
      });
    }
    if (prevBtn) prevBtn.style.display = multiImage ? '' : 'none';
    if (nextBtn) nextBtn.style.display = multiImage ? '' : 'none';

    thumbs.querySelectorAll('[data-thumb-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeImageIndex = Number(btn.getAttribute('data-thumb-index'));
        renderGallery();
      });
    });
  }

  function initZoom() {
    const main = document.querySelector('[data-gallery-main]');
    let suppressNextClick = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    main.addEventListener('mousemove', (e) => {
      if (!main.classList.contains('is-zoomed')) return;
      const activeLayer = main.querySelector('.zoom-layer.is-active');
      if (!activeLayer) return;
      const rect = main.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      activeLayer.style.transformOrigin = `${x}% ${y}%`;
    });
    main.addEventListener('click', () => {
      if (suppressNextClick) { suppressNextClick = false; return; }
      main.classList.toggle('is-zoomed');
    });
    main.addEventListener('mouseleave', () => main.classList.remove('is-zoomed'));

    // ---- Prev/Next arrows ----
    const prevBtn = main.querySelector('[data-gallery-prev]');
    const nextBtn = main.querySelector('[data-gallery-next]');
    function stepImage(dir) {
      const gallery = getActiveGallery();
      if (gallery.length < 2) return;
      activeImageIndex = (activeImageIndex + dir + gallery.length) % gallery.length;
      renderGallery();
    }
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); stepImage(-1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); stepImage(1); });

    // ---- Touch: swipe left/right to advance the gallery ----
    // Disabled while zoomed (a zoomed image is meant to be panned by touch,
    // not swiped past) — the same tap that zooms also un-zooms, so touch
    // users can always get back to swipe mode.
    const SWIPE_THRESHOLD = 50;

    main.addEventListener('touchstart', (e) => {
      if (main.classList.contains('is-zoomed')) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
    }, { passive: true });

    main.addEventListener('touchmove', (e) => {
      if (main.classList.contains('is-zoomed')) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) touchMoved = true;
    }, { passive: true });

    main.addEventListener('touchend', (e) => {
      if (main.classList.contains('is-zoomed') || !touchMoved) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      const gallery = getActiveGallery();
      activeImageIndex = dx < 0
        ? (activeImageIndex + 1) % gallery.length
        : (activeImageIndex - 1 + gallery.length) % gallery.length;
      renderGallery();
      // A swipe that ends over the image also fires a click right after on
      // touch devices — suppress that one so it doesn't also toggle zoom.
      suppressNextClick = true;
    });
  }

  function renderInfo() {
    const { formatPrice, discountPercent, categoryLabels, stockBadgeHTML, isPurchasable } = window.CorsetAtelier;
    const discount = discountPercent(product.price, product.comparePrice);

    document.querySelector('[data-pd-category]').textContent = categoryLabels[product.category] || product.category;
    document.querySelector('[data-pd-title]').textContent = product.name;
    document.querySelector('[data-pd-stock]').innerHTML = product.stock ? stockBadgeHTML(product.stock) : '';

    const buyBtn = document.querySelector('[data-open-buy]');
    if (!isPurchasable(product.stock)) {
      buyBtn.textContent = 'Notify Me When Back in Stock';
      buyBtn.classList.add('btn-outline-dark');
      buyBtn.classList.remove('btn-primary');
    } else {
      buyBtn.textContent = 'Order via WhatsApp';
      buyBtn.classList.add('btn-primary');
      buyBtn.classList.remove('btn-outline-dark');
    }
    document.querySelector('[data-pd-desc]').textContent = product.description;
    document.querySelector('[data-pd-price]').textContent = formatPrice(product.price);
    document.querySelector('[data-pd-fabric]').textContent = product.fabric;
    document.querySelector('[data-pd-weight]').textContent = product.weight;

    const compareEl = document.querySelector('[data-pd-compare]');
    const badgeEl = document.querySelector('[data-pd-discount-badge]');
    if (discount) {
      compareEl.textContent = formatPrice(product.comparePrice);
      compareEl.style.display = '';
      badgeEl.textContent = `Save ${discount}%`;
      badgeEl.style.display = '';
    } else {
      compareEl.style.display = 'none';
      badgeEl.style.display = 'none';
    }

    document.title = `${product.name} — Noir Corset`;

    // Color swatches
    const colorRow = document.querySelector('[data-color-swatches]');
    selectedColor = product.colors[0];
    colorRow.innerHTML = product.colors.map((c, i) => `
      <button type="button" class="color-swatch ${i === 0 ? 'is-active' : ''}" data-color="${c}"
        style="background:${window.CorsetAtelier.colorToCss(c)}" title="${c}" aria-label="${c}"></button>
    `).join('');
    document.querySelector('[data-selected-color]').textContent = selectedColor;
    colorRow.querySelectorAll('.color-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedColor = btn.getAttribute('data-color');
        colorRow.querySelectorAll('.color-swatch').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        document.querySelector('[data-selected-color]').textContent = selectedColor;
        // If this color has its own gallery, switch to it (crossfades via
        // the existing renderGallery mechanism); otherwise this is a no-op
        // fallback to the same default gallery already showing.
        activeImageIndex = 0;
        renderGallery();
      });
    });

    // Sizes
    const sizeRow = document.querySelector('[data-size-buttons]');
    selectedSize = product.sizes[0];
    sizeRow.innerHTML = product.sizes.map((s, i) => `
      <button type="button" class="size-btn ${i === 0 ? 'is-active' : ''}" data-size="${s}">${s}</button>
    `).join('');
    sizeRow.querySelectorAll('.size-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedSize = btn.getAttribute('data-size');
        sizeRow.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    // Wishlist button
    const wishBtn = document.querySelector('[data-pd-wishlist]');
    wishBtn.classList.toggle('is-active', window.CorsetAtelier.isWishlisted(product.id));
    wishBtn.addEventListener('click', () => {
      const active = window.CorsetAtelier.toggleWishlist(product.id);
      wishBtn.classList.toggle('is-active', active);
      if (active) {
        wishBtn.classList.remove('is-pulsing');
        void wishBtn.offsetWidth;
        wishBtn.classList.add('is-pulsing');
      }
    });

    // Custom build link carries the product name along
    document.querySelector('[data-custom-link]').href = `custom-builder.html?base=${encodeURIComponent(product.name)}`;

    // Share button
    const shareBtn = document.querySelector('[data-pd-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => window.CorsetAtelier.shareProduct(product));
    }
  }

  async function renderRelated() {
    const { getProducts, renderProductCard, bindWishlistButtons } = window.CorsetAtelier;
    const all = await getProducts();
    const related = all
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, 4);
    const wrap = document.querySelector('[data-related-grid]');
    if (!related.length) {
      document.querySelector('[data-related-section]').style.display = 'none';
      return;
    }
    wrap.innerHTML = related.map(renderProductCard).join('');
    bindWishlistButtons(wrap);
    window.CorsetAtelier.staggerReveal(wrap, '.product-card');
  }

  function renderRecentlyViewed(allProducts) {
    const { renderProductCard, bindWishlistButtons, getRecentlyViewed } = window.CorsetAtelier;
    const viewedIds = getRecentlyViewed().filter((id) => id !== product.id);
    const items = viewedIds
      .map((id) => allProducts.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, 4);

    const section = document.querySelector('[data-recently-viewed-section]');
    if (!items.length) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    const wrap = document.querySelector('[data-recently-viewed-grid]');
    wrap.innerHTML = items.map(renderProductCard).join('');
    bindWishlistButtons(wrap);
    window.CorsetAtelier.staggerReveal(wrap, '.product-card');
  }

  // ---- Buy modal ----
  function buildOrderSummary() {
    const { formatPrice } = window.CorsetAtelier;
    return `${product.name} — ${selectedColor}, Size ${selectedSize} — ${formatPrice(product.price)}`;
  }

  function initBuyModal() {
    const openBtn = document.querySelector('[data-open-buy]');
    const overlay = document.querySelector('[data-buy-modal]');
    const closeBtn = overlay.querySelector('[data-modal-close]');
    const form = overlay.querySelector('form');
    const summary = overlay.querySelector('[data-order-summary]');
    const formView = overlay.querySelector('[data-buy-form-view]');
    const confirmView = overlay.querySelector('[data-buy-confirm-view]');

    function open() {
      if (!window.CorsetAtelier.isPurchasable(product.stock)) {
        const message = `Hi! I'd like to be notified when *${product.name}* is back in stock.`;
        window.open(waLink(message), '_blank');
        return;
      }
      formView.style.display = '';
      confirmView.style.display = 'none';
      summary.innerHTML = `<strong>Order Summary</strong>${buildOrderSummary()}`;
      const policyCheckbox = form.querySelector('[data-buy-policy-agree]');
      const policyError = overlay.querySelector('[data-buy-policy-error]');
      if (policyCheckbox) policyCheckbox.checked = false;
      if (policyError) policyError.classList.remove('is-visible');
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const firstField = form.querySelector('input');
      if (firstField) firstField.focus();
    }
    function close() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      openBtn.focus();
    }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const policyCheckbox = form.querySelector('[data-buy-policy-agree]');
      const policyError = overlay.querySelector('[data-buy-policy-error]');
      if (!policyCheckbox.checked) {
        policyError.textContent = 'Please confirm you understand the deposit and cancellation policy before continuing.';
        policyError.classList.add('is-visible');
        return;
      }
      policyError.classList.remove('is-visible');

      const data = Object.fromEntries(new FormData(form).entries());
      const { formatPrice } = window.CorsetAtelier;
      const message = [
        `Hi! I'd like to order:`,
        ``,
        `*${product.name}*`,
        `Color: ${selectedColor}   Size: ${selectedSize}`,
        `Price: ${formatPrice(product.price)}`,
        ``,
        `*Delivery Details*`,
        `Name: ${data.name}`,
        `Phone: ${data.phone}`,
        `Email: ${data.email || '—'}`,
        `Address: ${data.address}`,
        `City: ${data.city}`,
        ``,
        `I understand this order requires a 50% deposit to confirm, with the balance due on delivery, and that once confirmed, this deposit is non-refundable if the order is cancelled.`
      ].join('\n');

      // Confirmation state — clear feedback that the order was captured
      // before handing off to WhatsApp, rather than the modal just vanishing.
      formView.style.display = 'none';
      confirmView.style.display = '';
      setTimeout(() => {
        window.open(waLink(message), '_blank');
        close();
      }, 700);
    });
  }

  // ---- Query modal ----
  function initQueryModal() {
    const openBtn = document.querySelector('[data-open-query]');
    const overlay = document.querySelector('[data-query-modal]');
    const closeBtn = overlay.querySelector('[data-modal-close]');
    const form = overlay.querySelector('form');

    function open() {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const firstField = form.querySelector('textarea');
      if (firstField) firstField.focus();
    }
    function close() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      openBtn.focus();
    }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const message = [
        `Hi! I have a question about *${product.name}*:`,
        ``,
        data.message,
        ``,
        `— ${data.name}${data.phone ? ', ' + data.phone : ''}`
      ].join('\n');
      window.open(waLink(message), '_blank');
      close();
    });
  }

  let originalRootHTML = null;

  function renderFetchFailed() {
    const root = document.querySelector('[data-product-root]');
    if (originalRootHTML === null) originalRootHTML = root.innerHTML;
    root.innerHTML = `
      <div class="empty-state">
        <h3>Couldn't load this product</h3>
        <p>Check your connection and try again — or message us on WhatsApp if the problem continues.</p>
        <button type="button" class="btn btn-primary" data-retry-load style="margin-top:1.5rem">Try Again</button>
      </div>`;
    document.querySelector('[data-retry-load]').addEventListener('click', () => {
      root.innerHTML = originalRootHTML;
      init();
    });
  }

  // ---- Structured data (JSON-LD) ----
  // Injected once the product loads successfully — Google's crawler does
  // execute JavaScript when indexing, so this works for search results even
  // though it wouldn't work for link-preview bots (see the OG tag note in
  // the README for that separate, unrelated limitation).
  const AVAILABILITY_MAP = {
    'in-stock': 'https://schema.org/InStock',
    'low-stock': 'https://schema.org/LimitedAvailability',
    'made-to-order': 'https://schema.org/PreOrder',
    'sold-out': 'https://schema.org/OutOfStock'
  };
  const SITE_URL = 'https://noircorset.vercel.app';

  function injectJSONLD(id, data) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function renderStructuredData() {
    const { categoryLabels } = window.CorsetAtelier;
    const productUrl = `${SITE_URL}/product.html?id=${product.id}`;

    // Product schema. Note: `image` points to the site's general social
    // preview image as a placeholder, since products currently use CSS
    // gradients, not real photography — schema validates and is accurate
    // in every other field, but won't be eligible for Google's full image
    // rich-result treatment until real product photos replace it here.
    injectJSONLD('ld-product', {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      sku: product.id,
      image: [`${SITE_URL}/assets/images/og-image.jpg`],
      brand: { '@type': 'Brand', name: 'Noir Corset' },
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'PKR',
        price: String(product.price),
        availability: AVAILABILITY_MAP[product.stock] || AVAILABILITY_MAP['in-stock'],
        itemCondition: 'https://schema.org/NewCondition'
      }
    });

    // Breadcrumb schema, reusing the same category label already shown
    // in the visual breadcrumb at the top of the page.
    injectJSONLD('ld-breadcrumb', {
      '@context': 'https://schema.org/',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/index.html` },
        { '@type': 'ListItem', position: 2, name: 'Collections', item: `${SITE_URL}/collections.html` },
        { '@type': 'ListItem', position: 3, name: categoryLabels[product.category] || product.category, item: `${SITE_URL}/collections.html?cat=${product.category}` },
        { '@type': 'ListItem', position: 4, name: product.name }
      ]
    });
  }

  async function init() {
    const root = document.querySelector('[data-product-root]');
    if (!root) return;
    if (originalRootHTML === null) originalRootHTML = root.innerHTML;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    let products;
    try {
      products = await window.CorsetAtelier.getProducts();
    } catch (err) {
      renderFetchFailed();
      return;
    }
    product = products.find((p) => p.id === id);

    if (!product) {
      renderNotFound();
      return;
    }

    // renderInfo() must run before renderGallery() — it's what sets
    // selectedColor for the first time, and renderGallery() now needs that
    // to pick the right color-linked gallery on initial load (not just
    // after a swatch click).
    renderInfo();
    renderStructuredData();
    renderGallery();
    initZoom();
    initBuyModal();
    initQueryModal();
    renderRelated();
    window.CorsetAtelier.addRecentlyViewed(product.id);
    renderRecentlyViewed(products);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
