/* ==========================================================================
   JOURNAL SINGLE POST
   Reads ?post=slug from the URL, same data-driven pattern as product.html.
   ========================================================================== */

(function () {
  'use strict';

  function renderNotFound() {
    document.querySelector('[data-journal-root]').innerHTML = `
      <div class="empty-state">
        <h3>We couldn't find that post</h3>
        <p>It may have been moved or renamed. Browse the full Journal instead.</p>
        <a href="journal.html" class="btn btn-primary" style="margin-top:1.5rem">Back to Journal</a>
      </div>`;
  }

  function renderFetchFailed(retry) {
    document.querySelector('[data-journal-root]').innerHTML = `
      <div class="empty-state">
        <h3>Couldn't load this post</h3>
        <p>Check your connection and try again.</p>
        <button type="button" class="btn btn-primary" data-retry-load style="margin-top:1.5rem">Try Again</button>
      </div>`;
    document.querySelector('[data-retry-load]').addEventListener('click', retry);
  }

  function renderPost(post, allPosts) {
    const { formatJournalDate } = window.CorsetAtelier;

    document.title = `${post.title} — Noir Corset`;
    document.querySelector('[data-post-category]').textContent = post.category;
    document.querySelector('[data-post-title]').textContent = post.title;
    document.querySelector('[data-post-date]').textContent = formatJournalDate(post.date);
    document.querySelector('[data-post-media]').style.background = post.swatch;

    const canonicalLink = document.querySelector('[data-canonical]');
    if (canonicalLink) {
      const origin = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      canonicalLink.setAttribute('href', `${origin}journal-post.html?post=${post.slug}`);
    }
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta && post.excerpt) descMeta.setAttribute('content', post.excerpt);

    const body = document.querySelector('[data-post-body]');
    body.innerHTML = post.content.map((para) => `<p>${para}</p>`).join('');

    // Next post — cycles through the list in order, wrapping around.
    const sorted = [...allPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const idx = sorted.findIndex((p) => p.slug === post.slug);
    const next = sorted[(idx + 1) % sorted.length];
    const nextLink = document.querySelector('[data-next-post]');
    if (next && next.slug !== post.slug) {
      nextLink.href = `journal-post.html?post=${next.slug}`;
      nextLink.querySelector('[data-next-post-title]').textContent = next.title;
      nextLink.style.display = '';
    } else {
      nextLink.style.display = 'none';
    }
  }

  async function init() {
    const root = document.querySelector('[data-journal-root]');
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get('post');

    let posts;
    try {
      posts = await window.CorsetAtelier.getJournalPosts();
    } catch (err) {
      renderFetchFailed(init);
      return;
    }

    const post = posts.find((p) => p.slug === slug);
    if (!post) {
      renderNotFound();
      return;
    }

    renderPost(post, posts);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
