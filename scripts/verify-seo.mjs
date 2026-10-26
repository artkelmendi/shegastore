import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { indexablePaths, getPageSeo } from "../src/seo.js";
const titles = new Set();
for (const path of indexablePaths()) {
  const html = await readFile(
    `dist${path === "/" ? "" : path}/index.html`,
    "utf8",
  );
  const meta = getPageSeo(path);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert(html.includes(`href="${meta.canonical}"`));
  assert(html.includes("max-image-preview:large"));
  assert(html.includes("twitter:card"));
  assert(html.includes("og:image"));
  const json = JSON.parse(
    html.match(
      /<script id="wolf-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )[1],
  );
  assert(json["@graph"].length >= 3);
  assert(!JSON.stringify(json).includes("aggregateRating"));
  assert(!JSON.stringify(json).includes('"Offer"'));
  assert(!titles.has(meta.title));
  titles.add(meta.title);
  assert(html.includes("<noscript>"));
  if (path !== "/") assert(!html.match(/rel="preload"[^>]*as="image"/));
}
for (const path of ["account", "saved", "privacy"]) {
  const html = await readFile(`dist/${path}/index.html`, "utf8");
  assert(html.includes('content="noindex, follow"'));
}
const sitemap = await readFile("dist/sitemap.xml", "utf8");
assert.equal((sitemap.match(/<loc>/g) || []).length, indexablePaths().length);
assert(!sitemap.includes("/admin"));
assert(!sitemap.includes("/saved"));
assert(!sitemap.includes("github.io"));
assert.equal(getPageSeo("/shop", "?q=black").noindex, true);
assert.equal(getPageSeo("/unknown").canonical, null);
console.log(
  `SEO HTML passed: ${titles.size} unique public pages, correct canonical/share metadata, safe JSON-LD, noindex exclusions, sitemap and no-JS fallback.`,
);

for (const path of ["admin", "admin/products", "login"])
  await assert.rejects(readFile(`dist/${path}/index.html`));
assert.equal(getPageSeo("/admin").canonical, null);
