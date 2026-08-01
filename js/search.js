/* ==========================================================================
   SITE SEARCH
   Injects its own trigger button into every page's header (as the first
   icon, before Wishlist) and a single overlay appended to body — same
   self-contained pattern as the AI widget and Quick View, so no markup
   needs to be duplicated across all 17 pages by hand.

   Product/Journal data is only fetched on first open, not on page load —
   most visits never open search, so there's no reason to pay for two
   extra fetches every single page view. Cached afterward via the existing
   getProducts()/getJournalPosts() cache in main.js.
   ========================================================================== */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '923287658832';
  let overlay = null;
  let dataLoaded = false;
  let allProducts = [];
  let allPosts = [];

  function injectTrigger() {
    document.querySelectorAll('.header-icons').forEach((container) => {
      if (container.querySelector('[data-search-trigger]')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-search-trigger', '');
      btn.setAttribute('aria-label', 'Search');
      btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke-width="1.5"/><path d="M21 21l-4.3-4.3" stroke-width="1.5" stroke-linecap="round"/></svg>';
      container.insertBefore(btn, container.firstChild);
      btn.addEventListener('click', open);
    });
  }

  function injectOverlay() {
    if (overlay) return overlay;
    const el = document.createElement('div');
    el.className = 'search-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Site search');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="search-panel">
        <div class="search-input-row">
          <svg class="search-input-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke-width="1.5"/><path d="M21 21l-4.3-4.3" stroke-width="1.5" stroke-linecap="round"/></svg>
          <label for="site-search-input" class="visually-hidden">Search products and journal posts</label>
          <input type="text" id="site-search-input" placeholder="Search corsets, fabrics, journal..." data-search-input>
          <button type="button" class="search-close" data-search-close aria-label="Close search">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="search-results" data-search-results></div>
      </div>
    `;
    document.body.appendChild(el);
    overlay = el;

    el.querySelector('[data-search-close]').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.classList.contains('is-open')) close();
    });
    el.querySelector('[data-search-input]').addEventListener('input', (e) => {
      renderResults(e.target.value.trim());
    });
    return el;
  }

  function matchProduct(p, q) {
    const { categoryLabels } = window.CorsetAtelier;
    const haystack = [p.name, p.fabric, categoryLabels[p.category] || p.category, (p.tags || []).join(' ')].join(' ').toLowerCase();
    return haystack.includes(q);
  }

  function matchPost(post, q) {
    const haystack = [post.title, post.category, post.excerpt].join(' ').toLowerCase();
    return haystack.includes(q);
  }

  function renderResults(query) {
    const container = overlay.querySelector('[data-search-results]');
    const q = query.toLowerCase();

    if (!dataLoaded) {
      container.innerHTML = '<div class="search-loading">Loading...</div>';
      return;
    }
    if (!q) {
      container.innerHTML = '<div class="search-hint">Start typing to search products and journal posts.</div>';
      return;
    }

    const { formatPrice, categoryLabels } = window.CorsetAtelier;
    const matchedProducts = allProducts.filter((p) => matchProduct(p, q)).slice(0, 5);
    const matchedPosts = allPosts.filter((p) => matchPost(p, q)).slice(0, 3);

    if (!matchedProducts.length && !matchedPosts.length) {
      container.innerHTML = `
        <div class="search-empty">
          <p>No results for "${query}"</p>
          <p>Try a different search, or <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener">message us on WhatsApp</a>.</p>
        </div>`;
      return;
    }

    let html = '';
    if (matchedProducts.length) {
      html += '<div class="search-section-label">Products</div>';
      html += matchedProducts.map((p) => `
        <a href="product.html?id=${p.id}" class="search-result-item">
          <span class="search-result-swatch" style="background:${window.CorsetAtelier.resolveBackground(p.swatch)}"></span>
          <span class="search-result-text">
            <span class="search-result-title">${p.name}</span>
            <span class="search-result-meta">${categoryLabels[p.category] || p.category} · ${formatPrice(p.price)}</span>
          </span>
        </a>
      `).join('');
    }
    if (matchedPosts.length) {
      html += '<div class="search-section-label">Journal</div>';
      html += matchedPosts.map((post) => `
        <a href="journal-post.html?post=${post.slug}" class="search-result-item">
          <span class="search-result-swatch" style="background:${window.CorsetAtelier.resolveBackground(post.swatch)}"></span>
          <span class="search-result-text">
            <span class="search-result-title">${post.title}</span>
            <span class="search-result-meta">${post.category}</span>
          </span>
        </a>
      `).join('');
    }
    container.innerHTML = html;
  }

  async function open() {
    injectOverlay();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const input = overlay.querySelector('[data-search-input]');
    input.value = '';
    input.focus();
    renderResults('');

    if (!dataLoaded) {
      try {
        const results = await Promise.all([
          window.CorsetAtelier.getProducts(),
          window.CorsetAtelier.getJournalPosts()
        ]);
        allProducts = results[0];
        allPosts = results[1];
        dataLoaded = true;
      } catch (err) {
        // Fail silently here — the search box still works, results will
        // just stay on the loading state; the person can always fall back
        // to browsing normally or WhatsApp.
      }
      renderResults(overlay.querySelector('[data-search-input]').value.trim());
    }
  }

  function close() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('DOMContentLoaded', injectTrigger);

  window.CorsetAtelier = window.CorsetAtelier || {};
  window.CorsetAtelier.openSearch = open;
})();
