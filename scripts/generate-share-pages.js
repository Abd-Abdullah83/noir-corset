/* ==========================================================================
   generate-share-pages.js
   Build-time script: reads data/products.json and writes one static HTML
   file per product to /share/<id>.html, each with real per-product Open
   Graph / Twitter Card tags (title, description, price, and — where a
   product has a real photo rather than a placeholder gradient — the
   actual product image).

   Why this exists alongside api/share.js: that file does the same job at
   request-time, but only works on a host that runs Node serverless
   functions (Vercel). If the site is instead served from GitHub Pages (or
   any plain static host), /api/share doesn't exist as a route at all, so
   link previews on WhatsApp/Facebook/etc. silently fall back to whatever
   generic tags are in product.html itself (same for every product — the
   site logo, not the product photo). These static files solve that
   everywhere, since they're just HTML sitting on disk.

   Run: node scripts/generate-share-pages.js
   (Run this any time data/products.json changes, then commit/deploy the
   generated /share/ folder along with the rest of the site.)
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const products = require(path.join(ROOT, 'data', 'products.json'));

// No single hardcoded domain — this repo is deployed to more than one host
// (Vercel at the root, GitHub Pages under /noir-corset/), so a value baked
// in at build time would be wrong for whichever host isn't "the real one"
// this week. SITE_URL is resolved per-deploy via an env var if set;
// otherwise these pages fall back to a relative canonical/redirect, which
// still works correctly for the redirect itself (browsers resolve a
// relative URL against the page's own location) even though an absolute
// og:url requires the env var to be fully correct for crawlers.
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');

const OUT_DIR = path.join(ROOT, 'share');
const FALLBACK_IMAGE_PATH = 'assets/images/og-image.jpg';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Products store photography either as a real image path/URL — often
// CSS-wrapped as url('path') center/cover, matching how it's used as a
// background elsewhere on the site — or as a plain gradient placeholder
// (see resolveBackground() in js/main.js). Only a real image is usable as
// og:image. This must unwrap the url(...) form first, since that's what
// every actual product photo in the data uses — matching the same fix in
// api/share.js.
function resolveShareImagePath(value) {
  if (!value) return FALLBACK_IMAGE_PATH;
  let v = String(value).trim();
  const urlMatch = v.match(/^url\((['"]?)(.*?)\1\)/i);
  if (urlMatch) v = urlMatch[2];
  const isUrl = /^(https?:\/\/|\/|data:image)/i.test(v) || /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(v);
  if (!isUrl) return FALLBACK_IMAGE_PATH;
  if (/^https?:\/\//i.test(v)) return v;
  return v.replace(/^\/+/, '');
}

function formatPrice(amount) {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK');
}

function abs(relPath) {
  return SITE_URL ? `${SITE_URL}/${relPath}` : `../${relPath}`;
}

function buildPage(product) {
  const title = `${product.name} — Noir Corset`;
  const description = `${product.description} ${formatPrice(product.price)}, handcrafted to order.`.trim();
  const imagePath = resolveShareImagePath(product.swatch);
  const productRelUrl = `product.html?id=${encodeURIComponent(product.id)}`;
  const productUrl = SITE_URL ? `${SITE_URL}/${productRelUrl}` : `../${productRelUrl}`;
  const imageUrl = SITE_URL ? (imagePath.startsWith('http') ? imagePath : `${SITE_URL}/${imagePath}`) : `../${imagePath}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(productUrl)}">

<meta property="og:type" content="product">
<meta property="og:site_name" content="Noir Corset">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:url" content="${escapeHtml(productUrl)}">
<meta property="product:price:amount" content="${product.price}">
<meta property="product:price:currency" content="PKR">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">

<meta http-equiv="refresh" content="0; url=${escapeHtml(productUrl)}">
<script>window.location.replace(${JSON.stringify(productUrl)});</script>
</head>
<body>
  <p>Taking you to <a href="${escapeHtml(productUrl)}">${escapeHtml(product.name)}</a>&hellip;</p>
</body>
</html>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let count = 0;
for (const product of products) {
  const html = buildPage(product);
  fs.writeFileSync(path.join(OUT_DIR, `${product.id}.html`), html, 'utf8');
  count += 1;
}
console.log(`Generated ${count} share page(s) in ${OUT_DIR}`);
if (!SITE_URL) {
  console.log('NOTE: SITE_URL env var not set — og:url/og:image were written as relative URLs.');
  console.log('For crawlers (WhatsApp/Facebook) to resolve them correctly, re-run with:');
  console.log('  SITE_URL=https://your-real-domain.com node scripts/generate-share-pages.js');
}
