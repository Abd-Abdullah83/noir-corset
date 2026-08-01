/* ==========================================================================
   GET /api/share?id=<product-id>
   Serverless function (Vercel) that returns a tiny HTML page with real,
   per-product Open Graph / Twitter Card meta tags, then redirects a human
   visitor straight on to the real product page.

   Why this exists: product.html is a single static file used for every
   product (the actual product is chosen client-side from ?id=, after
   JavaScript runs). Link-preview bots (WhatsApp, Facebook, Instagram,
   iMessage, etc.) do NOT run JavaScript — they only read the raw HTML of
   the URL they're given, so every shared product link showed the same
   generic site-wide preview instead of that product's photo, name, and
   price. This endpoint is generated per request from the real product
   data, so the crawler sees the right title/description/image, while a
   real person just gets bounced on to product.html?id=... in well under
   a second.
   ========================================================================== */

const products = require('../data/products.json');

const SITE_URL = 'https://noircorset.vercel.app';
const FALLBACK_IMAGE = `${SITE_URL}/assets/images/og-image.jpg`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Products currently store photography either as a real image path/URL or
// as a CSS gradient placeholder (see resolveBackground() in js/main.js for
// the client-side equivalent of this check). Only a real image is usable
// as an og:image — gradients fall back to the site's default share image.
function resolveShareImage(value) {
  if (!value) return FALLBACK_IMAGE;
  const v = String(value).trim();
  const isUrl = /^(https?:\/\/|\/|data:image)/i.test(v) || /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(v);
  if (!isUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(v)) return v;
  return `${SITE_URL}/${v.replace(/^\/+/, '')}`;
}

function formatPrice(amount) {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK');
}

module.exports = function handler(req, res) {
  const id = req.query && req.query.id;
  const product = id ? products.find((p) => p.id === id) : null;

  if (!product) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found — Noir Corset</title></head><body>Product not found. <a href="${SITE_URL}/collections.html">Browse the collection</a>.</body></html>`);
    return;
  }

  const title = `${product.name} — Noir Corset`;
  const description = `${product.description} ${formatPrice(product.price)}, handcrafted to order.`.trim();
  const image = resolveShareImage(product.swatch);
  const productUrl = `${SITE_URL}/product.html?id=${encodeURIComponent(product.id)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${productUrl}">

<meta property="og:type" content="product">
<meta property="og:site_name" content="Noir Corset">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(productUrl)}">
<meta property="product:price:amount" content="${product.price}">
<meta property="product:price:currency" content="PKR">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">

<meta http-equiv="refresh" content="0; url=${escapeHtml(productUrl)}">
<script>window.location.replace(${JSON.stringify(productUrl)});</script>
</head>
<body>
  <p>Taking you to <a href="${productUrl}">${escapeHtml(product.name)}</a>&hellip;</p>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.end(html);
};
