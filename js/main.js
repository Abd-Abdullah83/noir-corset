/* ==========================================================================
   CORSET ATELIER — SHARED SITE BEHAVIOR
   Header scroll state, mobile nav drawer, wishlist badge count.
   Wishlist is stored client-side in localStorage under key "ca_wishlist"
   as an array of product ids. Every page that renders products reads/writes
   this same key, so the count here always stays in sync.
   ========================================================================== */

(function () {
  'use strict';

  const WISHLIST_KEY = 'ca_wishlist';

  function getWishlist() {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function isWishlisted(productId) {
    return getWishlist().includes(productId);
  }

  function toggleWishlist(productId) {
    const list = getWishlist();
    const idx = list.indexOf(productId);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(productId);
    }
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    updateWishlistBadge();
    return list.includes(productId);
  }

  function updateWishlistBadge() {
    const badge = document.querySelector('[data-wishlist-count]');
    if (!badge) return;
    const count = getWishlist().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // ---- Shared formatting ----
  function formatPrice(amount) {
    return 'Rs. ' + Number(amount).toLocaleString('en-PK');
  }

  // ---- Share ----
  // Not a hardcoded domain: this site is deployed to more than one host
  // (Vercel at the root, GitHub Pages under a subpath) and a fixed string
  // here would be wrong on whichever one isn't "the real one" this week.
  // Reading it from the page itself means sharing works correctly no
  // matter which deployment the person is actually using.
  const SITE_URL = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');

  function showToast(message) {
    let toast = document.querySelector('.ca-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'ca-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('is-visible');
    void toast.offsetWidth;
    toast.classList.add('is-visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  // Shared "share this product" action used by the product page and every
  // product card. Points at /api/share?id=... rather than product.html
  // directly, since that endpoint serves per-product Open Graph tags so
  // the shared link actually shows the product's photo, name, and price
  // when pasted into WhatsApp or other apps — product.html itself can't,
  // since it's one static file for every product and link-preview bots
  // don't run the JavaScript that would otherwise pick the right product.
  async function shareProduct(product) {
    // Points at the pre-generated static page in /share/ (see
    // scripts/generate-share-pages.js) rather than product.html directly.
    // product.html is one static file for every product — a link-preview
    // bot (WhatsApp, Facebook, etc.) doesn't run the JavaScript that picks
    // the right product from ?id=, so every shared product link would
    // otherwise show the same generic site-wide preview (logo, not the
    // product photo). The static share page has real per-product Open
    // Graph tags baked in at build time, and works on any static host —
    // unlike a serverless endpoint, which only runs on some of them.
    const shareUrl = `${SITE_URL}share/${product.id}.html`;
    const shareData = {
      title: `${product.name} — Noir Corset`,
      text: `${product.name} — ${formatPrice(product.price)} at Noir Corset`,
      url: shareUrl
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // AbortError just means the user closed the share sheet — not a failure.
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard');
        return;
      } catch (err) { /* fall through to WhatsApp */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareUrl)}`, '_blank', 'noopener');
  }

  function discountPercent(price, comparePrice) {
    if (!comparePrice || comparePrice <= price) return null;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  }

  // ---- Product data (shared across collections / product / wishlist pages) ----
  let productsCache = null;
  async function getProducts() {
    if (productsCache) return productsCache;
    const res = await fetch('data/products.json');
    productsCache = await res.json();
    return productsCache;
  }

  // ---- Background value resolver ----
  // Product/journal "swatch" and "gallery" fields have always held CSS
  // gradient strings (placeholders). As real photography gets added, some
  // of those fields end up holding a plain image path/URL instead — used
  // directly as `background: <value>` that's invalid CSS (a bare path
  // isn't a valid background value), so the element silently falls back
  // to its default background color instead of showing the photo. This
  // detects a path/URL and wraps it in url(...) so both keep working from
  // the same field without needing a separate "image" key in the data.
  function resolveBackground(value) {
    if (!value) return '';
    const v = String(value).trim();
    if (/^(linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|url\(|#|rgba?\(|hsla?\()/i.test(v)) {
      return v;
    }
    if (/^(https?:\/\/|\.{0,2}\/|data:image)/i.test(v) || /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i.test(v)) {
      return `url('${v.replace(/'/g, "\\'")}') center/cover no-repeat`;
    }
    return v;
  }

  // Same distinction as resolveBackground, but returns a bare path (or
  // null for a gradient placeholder) instead of a CSS background value —
  // for contexts that need a plain image URL, like structured data.
  function resolveImagePath(value) {
    if (!value) return null;
    let v = String(value).trim();
    const urlMatch = v.match(/^url\((['"]?)(.*?)\1\)/i);
    if (urlMatch) v = urlMatch[2];
    const isUrl = /^(https?:\/\/|\/|data:image)/i.test(v) || /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(v);
    return isUrl ? v : null;
  }

  // ---- Header scroll state ----
  function initHeaderScroll() {
    const header = document.querySelector('[data-site-header]');
    if (!header) return;
    const solidFromStart = header.hasAttribute('data-solid');
    const threshold = 40;

    function onScroll() {
      if (solidFromStart) return;
      if (window.scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
    if (solidFromStart) header.classList.add('is-solid');
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Mobile drawer ----
  function initMobileDrawer() {
    const openBtn = document.querySelector('[data-drawer-open]');
    const closeBtn = document.querySelector('[data-drawer-close]');
    const drawer = document.querySelector('[data-mobile-drawer]');
    const backdrop = document.querySelector('[data-drawer-backdrop]');
    if (!openBtn || !drawer) return;

    drawer.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');

    function open() {
      drawer.classList.add('is-open');
      backdrop && backdrop.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      closeBtn && closeBtn.focus();
    }
    function close() {
      drawer.classList.remove('is-open');
      backdrop && backdrop.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      openBtn.focus();
    }
    openBtn.addEventListener('click', open);
    closeBtn && closeBtn.addEventListener('click', close);
    backdrop && backdrop.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
  }

  // ---- Active nav link ----
  function markActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav-link]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === path) link.classList.add('is-active');
    });
  }

  // ---- Sitewide structured data ----
  // Organization + WebSite schema, injected on every page (not just the
  // homepage) since Google associates this with the domain as a whole,
  // not any single URL. Helps establish brand identity for search
  // (knowledge panel eligibility, sitelinks) independent of per-product
  // Product schema, which only exists on product.html.
  function injectSiteStructuredData() {
    if (document.getElementById('ld-organization')) return;
    const origin = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    const siteUrl = origin.replace(/\/$/, '');

    const orgScript = document.createElement('script');
    orgScript.type = 'application/ld+json';
    orgScript.id = 'ld-organization';
    orgScript.textContent = JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'ClothingStore',
      name: 'Noir Corset',
      url: `${siteUrl}/index.html`,
      logo: `${siteUrl}/assets/images/og-image.jpg`,
      image: `${siteUrl}/assets/images/og-image.jpg`,
      description: 'Handcrafted corsets for women — bridal, overbust, underbust, waist trainers and evening corsets, made to order and laced to fit.',
      sameAs: ['https://www.instagram.com/noir_corset/'],
      priceRange: 'Rs. 6,000–Rs. 25,000'
    });
    document.head.appendChild(orgScript);

    const siteScript = document.createElement('script');
    siteScript.type = 'application/ld+json';
    siteScript.id = 'ld-website';
    siteScript.textContent = JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'WebSite',
      name: 'Noir Corset',
      url: `${siteUrl}/index.html`
    });
    document.head.appendChild(siteScript);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeaderScroll();
    initMobileDrawer();
    updateWishlistBadge();
    markActiveNav();
    injectSiteStructuredData();
  });

  // Expose small helpers other pages can reuse.
  const STOCK_INFO = {
    'in-stock': { text: 'In Stock', className: 'stock-in' },
    'low-stock': { text: 'Low Stock', className: 'stock-low' },
    'made-to-order': { text: 'Made to Order · 7 Days', className: 'stock-made' },
    'sold-out': { text: 'Sold Out', className: 'stock-out' }
  };

  function getStockInfo(status) {
    return STOCK_INFO[status] || STOCK_INFO['in-stock'];
  }

  function isPurchasable(status) {
    return status !== 'sold-out';
  }

  function stockBadgeHTML(status) {
    const info = getStockInfo(status);
    return `<span class="stock-badge ${info.className}">${info.text}</span>`;
  }

  // ---- Shared category labels + card renderer (used by collections, product, wishlist pages) ----
  const CATEGORY_LABELS = {
    'bridal': 'Bridal', 'overbust': 'Overbust', 'underbust': 'Underbust',
    'waist-trainers': 'Waist Trainers', 'evening': 'Evening', 'satin': 'Satin',
    'new-arrivals': 'New Arrivals', 'luxury': 'Luxury'
  };

  function renderProductCard(p) {
    const discount = discountPercent(p.price, p.comparePrice);
    const wishlisted = isWishlisted(p.id);
    return `
      <div class="product-card" data-product-id="${p.id}">
        <div class="product-media">
          <div class="media-bg" style="background:${resolveBackground(p.swatch)}"></div>
          ${discount ? `<span class="product-badge">-${discount}%</span>` : ((p.tags || []).includes('new-arrivals') ? '<span class="product-badge" style="background:var(--c-brass)">New</span>' : '')}
          <button type="button" class="wishlist-btn ${wishlisted ? 'is-active' : ''}" data-wishlist-toggle="${p.id}" aria-label="Toggle wishlist">
            <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.5 4c2-.3 3.8.7 4.9 2.3C11.5 4.7 13.3 3.7 15.3 4c3.5.5 5.1 4 3.5 7.7C16.5 16.4 12 21 12 21z" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="share-btn" data-share-trigger="${p.id}" aria-label="Share this product">
            <svg viewBox="0 0 24 24"><path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zm12 6a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="product-quickview" data-quickview-trigger="${p.id}">Quick View</button>
        </div>
        <a href="product.html?id=${p.id}" class="product-info-link">
          <div class="product-info">
            <span class="product-category">${CATEGORY_LABELS[p.category] || p.category}</span>
            <h3 class="product-name">${p.name}</h3>
            <div class="product-price-row">
              <span class="product-price">${formatPrice(p.price)}</span>
              ${p.comparePrice ? `<span class="product-compare-price">${formatPrice(p.comparePrice)}</span>` : ''}
              ${discount ? `<span class="product-discount">Save ${discount}%</span>` : ''}
            </div>
            ${p.stock ? stockBadgeHTML(p.stock) : ''}
          </div>
        </a>
      </div>
    `;
  }

  function bindWishlistButtons(scope) {
    (scope || document).querySelectorAll('[data-wishlist-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-wishlist-toggle');
        const nowActive = toggleWishlist(id);
        btn.classList.toggle('is-active', nowActive);
        if (nowActive) {
          btn.classList.remove('is-pulsing');
          void btn.offsetWidth;
          btn.classList.add('is-pulsing');
        }
      });
    });
    // Share buttons ride along with wishlist buttons since both live on
    // every product card and are bound at the same call sites.
    (scope || document).querySelectorAll('[data-share-trigger]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-share-trigger');
        const all = await getProducts();
        const product = all.find((p) => p.id === id);
        if (product) shareProduct(product);
      });
    });
  }

  function colorToCss(name) {
    const map = {
      'Ivory': '#F6F1E9', 'Blush': '#E8C7C2', 'Champagne': '#D9B98A', 'Black': '#141213',
      'Oxblood': '#6B1423', 'Wine': '#5C1420', 'Nude': '#D9B79A', 'Emerald': '#1F4A38',
      'Rose': '#C98A8C'
    };
    return map[name] || '#999';
  }

  // ---- Staggered reveal for dynamically-rendered grids (product cards) ----
  // Static content is handled by reveal.js via IntersectionObserver; content
  // rendered after a fetch (collections, related products, wishlist) calls
  // this directly right after building its grid, since it's usually already
  // in or near the viewport by the time it renders.
  function staggerReveal(container, itemSelector) {
    if (!container) return;
    const items = Array.from(container.querySelectorAll(itemSelector));
    if (!items.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    items.forEach((el, i) => {
      el.classList.add('reveal-target');
      el.style.transitionDelay = `${Math.min(i, 8) * 60}ms`;
    });
    // Double rAF: let the browser paint the hidden state first, so the
    // transition to visible actually animates instead of snapping instantly.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        items.forEach((el) => el.classList.add('is-revealed'));
      });
    });
  }

  const RECENTLY_VIEWED_KEY = 'ca_recently_viewed';
  const RECENTLY_VIEWED_MAX = 8;

  function getRecentlyViewed() {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function addRecentlyViewed(productId) {
    let list = getRecentlyViewed().filter((id) => id !== productId);
    list.unshift(productId);
    if (list.length > RECENTLY_VIEWED_MAX) list = list.slice(0, RECENTLY_VIEWED_MAX);
    try {
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    } catch (e) {
      // localStorage unavailable (private browsing, quota, etc.) — fail silently,
      // recently-viewed is a nice-to-have, not a critical feature.
    }
  }

  let journalCache = null;
  async function getJournalPosts() {
    if (journalCache) return journalCache;
    const res = await fetch('data/journal-posts.json');
    journalCache = await res.json();
    return journalCache;
  }

  function formatJournalDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function renderJournalCard(post) {
    return `
      <a href="journal-post.html?post=${post.slug}" class="journal-card">
        <div class="journal-card-media" style="background:${resolveBackground(post.swatch)}"></div>
        <div class="journal-card-body">
          <span class="journal-card-category">${post.category}</span>
          <h3 class="journal-card-title">${post.title}</h3>
          <p class="journal-card-excerpt">${post.excerpt}</p>
          <span class="journal-card-date">${formatJournalDate(post.date)}</span>
        </div>
      </a>
    `;
  }

  // ---- Skeleton loading placeholders ----
  // Shown immediately (before the products.json fetch resolves) so the grid
  // never sits blank while waiting on a network request.
  function renderSkeletonGrid(container, count) {
    if (!container) return;
    const n = count || 8;
    container.innerHTML = Array.from({ length: n }).map(() => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-media"></div>
        <div class="skeleton-line skeleton-line-sm"></div>
        <div class="skeleton-line skeleton-line-lg"></div>
      </div>
    `).join('');
  }

  // ---- Fetch failure state ----
  // Shown if products.json fails to load (offline, network error, etc.)
  // instead of leaving the grid stuck on skeletons with no explanation.
  function renderFetchError(container, onRetry) {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <h3>Couldn't load products</h3>
        <p>Check your connection and try again — or message us on WhatsApp if the problem continues.</p>
        <button type="button" class="btn btn-primary" data-fetch-retry style="margin-top:1.5rem">Try Again</button>
      </div>`;
    const btn = container.querySelector('[data-fetch-retry]');
    if (btn && onRetry) btn.addEventListener('click', onRetry);
  }

  window.CorsetAtelier = window.CorsetAtelier || {};
  window.CorsetAtelier.getWishlist = getWishlist;
  window.CorsetAtelier.resolveBackground = resolveBackground;
  window.CorsetAtelier.resolveImagePath = resolveImagePath;
  window.CorsetAtelier.isWishlisted = isWishlisted;
  window.CorsetAtelier.toggleWishlist = toggleWishlist;
  window.CorsetAtelier.updateWishlistBadge = updateWishlistBadge;
  window.CorsetAtelier.formatPrice = formatPrice;
  window.CorsetAtelier.shareProduct = shareProduct;
  window.CorsetAtelier.discountPercent = discountPercent;
  window.CorsetAtelier.getProducts = getProducts;
  window.CorsetAtelier.categoryLabels = CATEGORY_LABELS;
  window.CorsetAtelier.renderProductCard = renderProductCard;
  window.CorsetAtelier.bindWishlistButtons = bindWishlistButtons;
  window.CorsetAtelier.colorToCss = colorToCss;
  window.CorsetAtelier.staggerReveal = staggerReveal;
  window.CorsetAtelier.renderSkeletonGrid = renderSkeletonGrid;
  window.CorsetAtelier.renderFetchError = renderFetchError;
  window.CorsetAtelier.getRecentlyViewed = getRecentlyViewed;
  window.CorsetAtelier.addRecentlyViewed = addRecentlyViewed;
  window.CorsetAtelier.getJournalPosts = getJournalPosts;
  window.CorsetAtelier.renderJournalCard = renderJournalCard;
  window.CorsetAtelier.formatJournalDate = formatJournalDate;
  window.CorsetAtelier.getStockInfo = getStockInfo;
  window.CorsetAtelier.isPurchasable = isPurchasable;
  window.CorsetAtelier.stockBadgeHTML = stockBadgeHTML;
})();
