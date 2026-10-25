import { mkdir, readFile, writeFile } from "node:fs/promises";
import { products } from "../src/data.js";
import { getPageSeo, indexablePaths, siteOrigin } from "../src/seo.js";

const routes = [
  "",
  "shop",
  "login",
  "account",
  "account/sign-in",
  "account/create",
  "admin",
  "admin/products",
  "admin/products/new",
  "admin/stock",
  "admin/activity",
  "faq",
  "brands",
  "contact",
  "about",
  "saved",
  "delivery",
  "privacy",
  ...products.map((p) => `product/${p.id}`),
];
const template = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const escape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
function seoHtml(path) {
  const meta = getPageSeo(path);
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(
      /<meta\s+(?:name|property)=["'](?:description|robots|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi,
      "",
    )
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");
  if (path !== "/")
    html = html.replace(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/gi, "");
  const tags = [
    `<title>${escape(meta.title)}</title>`,
    `<meta name="description" content="${escape(meta.description)}">`,
    `<meta name="robots" content="${meta.noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}">`,
  ];
  if (meta.canonical)
    tags.push(`<link rel="canonical" href="${meta.canonical}">`);
  const og = {
    "og:site_name": "Wolf Shop",
    "og:title": meta.title,
    "og:description": meta.description,
    "og:type": "website",
    "og:url": meta.canonical || `${siteOrigin}/`,
    "og:image": meta.image,
    "og:image:width": meta.width,
    "og:image:height": meta.height,
    "og:image:alt": meta.imageAlt,
    "og:locale": "en_US",
  };
  for (const [key, value] of Object.entries(og))
    tags.push(`<meta property="${key}" content="${escape(value)}">`);
  for (const [key, value] of Object.entries({
    "twitter:card": "summary_large_image",
    "twitter:title": meta.title,
    "twitter:description": meta.description,
    "twitter:image": meta.image,
    "twitter:image:alt": meta.imageAlt,
  }))
    tags.push(`<meta name="${key}" content="${escape(value)}">`);
  if (meta.jsonLd)
    tags.push(
      `<script id="wolf-structured-data" type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c")}</script>`,
    );
  html = html.replace("</head>", `${tags.join("\n")}\n</head>`);
  // Useful fallback for people and bots without JavaScript. It presents the
  // same catalog information; it never flashes over the animated JS version.
  const product = products.find((p) => path === `/product/${p.id}`);
  const links = indexablePaths()
    .filter((p) => p !== path)
    .map(
      (p) =>
        `<li><a href="${p === "/" ? "/" : `${p}/`}">${escape(p.startsWith("/product/") ? products.find((item) => `/product/${item.id}` === p)?.name + " — " + products.find((item) => `/product/${item.id}` === p)?.color : p === "/" ? "Home" : p.slice(1))}</a></li>`,
    )
    .join("");
  const fallback = `<noscript><main style="max-width:960px;margin:60px auto;padding:24px;font:16px/1.7 Arial,sans-serif"><h1>${escape(meta.title.split(" | ")[0])}</h1><p>${escape(meta.description)}</p>${product ? `<img src="/images/real/${product.image}.webp" width="324" height="405" alt="${escape(product.name + " in " + product.color)}"><p>Colour: ${escape(product.color)}. Listed sizes: ${escape(product.sizes.join(", "))}. Prices and stock must be confirmed.</p>` : ""}<p>Replica clothing, not authentic branded merchandise. Wolf Shop is not affiliated with or authorised by the referenced brands.</p><p><a href="https://www.instagram.com/wolfshop.ks/">Contact @wolfshop.ks on Instagram</a> for product and order enquiries. No orders or payments are processed on this website.</p><p>Enable JavaScript for colour selection, the shopping bag and the full browsing experience.</p><nav aria-label="Site pages"><ul>${links}</ul></nav></main></noscript>`;
  return html.replace("</body>", `${meta.noindex ? "" : fallback}\n</body>`);
}
for (const route of routes) {
  const directory = new URL(`../dist/${route}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(
    new URL("index.html", directory),
    seoHtml(route ? `/${route}` : "/"),
  );
}
await writeFile(new URL("../dist/404.html", import.meta.url), seoHtml("/404"));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexablePaths()
  .map(
    (path) =>
      `  <url><loc>${siteOrigin}${path === "/" ? "/" : `${path}/`}</loc></url>`,
  )
  .join("\n")}\n</urlset>\n`;
await writeFile(new URL("../dist/sitemap.xml", import.meta.url), sitemap);
console.log(
  `Prepared ${routes.length} static entry points with unique SEO, plus sitemap and no-JavaScript fallbacks.`,
);
