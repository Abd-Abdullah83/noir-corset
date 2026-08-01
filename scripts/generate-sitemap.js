/* ==========================================================================
   generate-sitemap.js
   Rebuilds sitemap.xml from the actual site content instead of a
   hand-maintained list. The previous sitemap only listed 13 static pages
   and was missing every product page and journal post — 21 indexable,
   unique-content pages that search engines had no direct way to discover
   (they could still be reached by crawling links, but an explicit sitemap
   entry is a much stronger, faster signal, especially for a newer site).

   Run: SITE_URL=https://your-real-domain.com node scripts/generate-sitemap.js
   (Re-run whenever a product or journal post is added/removed, then
   commit/deploy sitemap.xml along with the rest of the site.)
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const products = require(path.join(ROOT, 'data', 'products.json'));
const posts = require(path.join(ROOT, 'data', 'journal-posts.json'));

const SITE_URL = (process.env.SITE_URL || 'https://noircorset.vercel.app').replace(/\/+$/, '');

const STATIC_PAGES = [
  { loc: 'index.html', priority: '1.0', changefreq: 'weekly' },
  { loc: 'collections.html', priority: '0.9', changefreq: 'daily' },
  { loc: 'custom-builder.html', priority: '0.8', changefreq: 'monthly' },
  { loc: 'our-story.html', priority: '0.6', changefreq: 'monthly' },
  { loc: 'size-guide.html', priority: '0.6', changefreq: 'monthly' },
  { loc: 'journal.html', priority: '0.6', changefreq: 'weekly' },
  { loc: 'gift-cards.html', priority: '0.5', changefreq: 'monthly' },
  { loc: 'custom-order-policy.html', priority: '0.4', changefreq: 'monthly' },
  { loc: 'faqs.html', priority: '0.5', changefreq: 'monthly' },
  { loc: 'shipping.html', priority: '0.4', changefreq: 'monthly' },
  { loc: 'contact.html', priority: '0.5', changefreq: 'monthly' },
  { loc: 'privacy-policy.html', priority: '0.2', changefreq: 'yearly' },
  { loc: 'terms.html', priority: '0.2', changefreq: 'yearly' },
];

// Category landing pages (collections.html?cat=...) are meaningfully
// distinct listing pages worth their own sitemap entry — same reasoning
// as product pages: real unique content behind a query param that a
// crawler might otherwise skip in favor of just the bare collections.html.
const CATEGORIES = [
  'bridal', 'overbust', 'underbust', 'waist-trainers', 'evening', 'satin',
];

function urlEntry(loc, opts = {}) {
  const parts = [`  <url><loc>${SITE_URL}/${loc}</loc>`];
  if (opts.lastmod) parts.push(`<lastmod>${opts.lastmod}</lastmod>`);
  if (opts.changefreq) parts.push(`<changefreq>${opts.changefreq}</changefreq>`);
  if (opts.priority) parts.push(`<priority>${opts.priority}</priority>`);
  parts.push('</url>');
  return parts.join('');
}

const entries = [];

for (const page of STATIC_PAGES) {
  entries.push(urlEntry(page.loc, { priority: page.priority, changefreq: page.changefreq }));
}

for (const cat of CATEGORIES) {
  entries.push(urlEntry(`collections.html?cat=${cat}`, { priority: '0.7', changefreq: 'daily' }));
}

for (const product of products) {
  entries.push(urlEntry(`product.html?id=${product.id}`, { priority: '0.8', changefreq: 'weekly' }));
}

for (const post of posts) {
  entries.push(urlEntry(`journal-post.html?post=${post.slug}`, { priority: '0.5', changefreq: 'monthly', lastmod: post.date }));
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml written with ${entries.length} URLs (was 13 static pages only — now includes ${products.length} products, ${posts.length} journal posts, ${CATEGORIES.length} category pages).`);
if (!process.env.SITE_URL) {
  console.log('NOTE: used default domain https://noircorset.vercel.app — re-run with SITE_URL=... set if that is not the real live domain.');
}
