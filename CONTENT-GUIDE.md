# Managing Your Site's Content

A plain-language guide to adding or removing the things you'll actually
change day-to-day: products, categories, FAQs, journal posts, and policy
text. Every file mentioned lives inside your project folder.

**Before editing anything**, know your two options for getting changes
live on GitHub Pages:
- **Edit directly on GitHub.com** — open the file, click the pencil (✏️)
  icon, edit, scroll down, click "Commit changes." Simplest, no extra
  tools needed.
- **Edit locally, then push** — edit the file on your computer, then in a
  terminal inside the project folder run `git add .`, `git commit -m "update"`,
  `git push`.

For any `.json` file, paste your edited version into
[jsonlint.com](https://jsonlint.com) before saving — it catches a missing
comma or bracket instantly, which is the most common way these files break.

---

## Adding or removing a product

**File:** `data/products.json`

Covered in detail in `product-template.json` (a ready-to-copy blank
product) — the short version: copy an existing entry, change every field,
give it a unique `id`. Full field guide is in that template file's
surrounding chat context, or just copy any existing product as your
starting point and edit each value.

To **remove** a product, delete its entire `{ ... }` block from the list.
Make sure you don't leave a trailing comma on the entry now at the end of
the list (JSON doesn't allow a comma after the last item).

---

## Adding or removing a category

Categories aren't in the product data file — they're a short list defined
in two places, so both need updating together. This is the one place in
the site that isn't fully "just edit one file," so follow both steps:

**Step 1 — `js/collections.js`**, near the top, find:
```js
const CATEGORIES = [
  { slug: 'all', label: 'All' },
  { slug: 'bridal', label: 'Bridal' },
  { slug: 'overbust', label: 'Overbust' },
  ...
];
```
Add or remove a line here. `slug` is the internal code (lowercase,
hyphens instead of spaces — this is what you'll use in each product's
`"category"` field in `products.json`); `label` is what customers see on
the filter buttons.

**Step 2 — `js/main.js`**, find `CATEGORY_LABELS` (a similar list) and add
the same slug/label pair — this is what shows the category name on
product cards and the product detail page.

**Step 3 (optional) — footer links.** Every page's footer has a "Shop"
column with direct links to a few categories, e.g.:
```html
<li><a href="collections.html?cat=bridal">Bridal Corsets</a></li>
```
These are just shortcuts, not required for the category to work — the
category will already work correctly from Step 1 and 2 alone, showing up
as a filter chip on the Collections page. Only add a footer link if you
want that specific category to also get its own direct link in every
page's footer (which means editing all 17 HTML files' footer section the
same way — a bigger job, so it's genuinely optional).

Once a product's `"category"` field in `products.json` matches your new
slug, it'll automatically show up under that filter.

---

## Adding or removing an FAQ

**File:** `faqs.html`

FAQs are grouped into categories. Find the category you want (or add a
new one) — each one looks like this:
```html
<div class="faq-category">
  <h2>Sizing & Fit</h2>
  <div class="faq-item">
    <button type="button" class="faq-question">
      Your question here?
      <span class="faq-icon">...</span>
    </button>
    <div class="faq-answer"><div class="faq-answer-inner">Your answer here.</div></div>
  </div>
  <!-- more .faq-item blocks... -->
</div>
```
To add a question: copy one whole `.faq-item` block (including its
question button and answer div), paste it inside the same
`.faq-category`, and change the text. To remove one, delete its whole
`.faq-item` block. No JavaScript needed — the accordion behavior works
automatically for any `.faq-item` on the page.

---

## Adding or removing a Journal post

**File:** `data/journal-posts.json`

Same data-driven pattern as products — copy an existing post's `{ ... }`
block, change the fields:
```json
{
  "slug": "your-post-slug",
  "title": "Your Post Title",
  "category": "Care Guide",
  "date": "2026-08-01",
  "excerpt": "One or two sentences shown on the Journal index card.",
  "swatch": "linear-gradient(160deg,#241014,#6B1423 55%,#A9772F 140%)",
  "content": [
    "First paragraph.",
    "Second paragraph.",
    "As many paragraphs as you want — each string in this list becomes one paragraph."
  ]
}
```
`slug` must be unique (used in the URL: `journal-post.html?post=your-post-slug`)
and works best as lowercase words separated by hyphens. To remove a post,
delete its whole block the same way as products.

---

## Editing policy pages (Custom Order Policy, Privacy, Terms, Shipping)

These are plain static pages — `custom-order-policy.html`, `privacy-policy.html`,
`terms.html`, `shipping.html`. Open the file, find the paragraph or list
item you want to change, edit the text directly between the HTML tags.
No JSON, no special format — just be careful not to delete a `<tag>` by
accident while editing the words around it.

**Where the 50% deposit policy appears** (if you ever need to change the
percentage again): it's stated in more places than just the policy page,
by design — customers see it at every point they might place an order:
- The announcement bar at the very top of every page
- Custom Order Policy page
- Custom Builder's final review step (with a required checkbox)
- The Buy Now order form on every product page (with a required checkbox)
- Quick View's order message
- The footer payment note on every page
- FAQs, Shipping page, Terms page

If this number ever changes again, all of these need updating together —
search your files for "50%" to find every mention.
