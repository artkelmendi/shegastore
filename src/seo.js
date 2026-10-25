import { products as catalog } from "./data.js";
import { contactEmail, socialLinks } from "./site-config.js";

export const siteOrigin = "https://wolfshop.style";
const shareImage = `${siteOrigin}/images/wolfshop-share.png`;
const publicPages = {
  "/": [
    "Wolf Shop | Replica menswear & everyday style",
    "Explore replica T-shirts, sweatshirts, knitwear and tracksuits at Wolf Shop. Ask @wolfshop.ks on Instagram to confirm sizes, availability and final prices.",
  ],
  "/shop": [
    "Shop replica menswear | Wolf Shop",
    "Browse Wolf Shop’s replica menswear collection. Compare colours and listed sizes, save pieces, and ask us on Instagram about fit and availability.",
  ],
  "/brands": [
    "Explore the clothing labels | Wolf Shop",
    "Browse the labels referenced in Wolf Shop’s independent replica clothing collection. We are not affiliated with or authorised by the featured brands.",
  ],
  "/contact": [
    "Contact Wolf Shop | Instagram enquiries & email",
    "Message @wolfshop.ks on Instagram about orders, sizes and availability. For general enquiries, email wolfshop.style@gmail.com. No checkout on this website.",
  ],
  "/faq": [
    "Ordering, sizes & product questions | Wolf Shop",
    "Find answers about Wolf Shop’s replica clothing, listed sizes, Instagram ordering, sample prices, delivery enquiries and saved pieces.",
  ],
  "/about": [
    "About Wolf Shop | Independent replica clothing catalog",
    "Learn about Wolf Shop’s independent menswear catalog and Instagram-only order enquiries. The clothes shown are replicas, not authentic branded merchandise.",
  ],
  "/delivery": [
    "Delivery & returns information | Wolf Shop",
    "Confirm delivery areas, costs, timing and return conditions with @wolfshop.ks on Instagram before ordering. No delivery promise or payment is made on this site.",
  ],
};
const privateTitles = {
  "/privacy": "Privacy information",
  "/saved": "Saved pieces",
  "/login": "Staff sign in",
  "/account": "Your account",
  "/account/sign-in": "Customer sign in",
  "/account/create": "Create account",
};
const clean = (path) => path.replace(/\/+$/, "") || "/";
const absolute = (path) => `${siteOrigin}${path === "/" ? "/" : `${path}/`}`;
export function getPageSeo(pathname, search = "", products = catalog) {
  const path = clean(pathname);
  const product = path.startsWith("/product/")
    ? products.find((p) => `/product/${p.id}` === path)
    : null;
  const page = publicPages[path];
  const title = product
    ? `${product.brand} ${product.name} — ${product.color} | Wolf Shop`
    : page?.[0] ||
      `${privateTitles[path] || (path.startsWith("/admin") ? "Staff dashboard" : "Page not found")} | Wolf Shop`;
  const description = product
    ? `${product.description} Replica style, not authentic branded merchandise. Ask Wolf Shop on Instagram to confirm fit, stock and the final price.`
    : page?.[1] ||
      "Wolf Shop account, privacy and support information. This page is not intended for search indexing.";
  const query = new URLSearchParams(search);
  const noindex =
    (!page && !product) ||
    [...query.keys()].some((key) =>
      ["q", "size", "category", "brand", "edit", "entrance"].includes(key),
    );
  const canonical =
    page || product || privateTitles[path] || path.startsWith("/admin")
      ? absolute(path)
      : null;
  const image = product
    ? `${siteOrigin}/images/real/${product.image}.webp`
    : shareImage;
  const graph = [];
  if (!noindex && canonical) {
    graph.push({
      "@type": "Organization",
      "@id": `${siteOrigin}/#organization`,
      name: "Wolf Shop",
      url: `${siteOrigin}/`,
      email: contactEmail,
      logo: {
        "@type": "ImageObject",
        url: `${siteOrigin}/logos/wolf-full-light.svg`,
      },
      sameAs: [socialLinks.instagram],
    });
    graph.push({
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      url: `${siteOrigin}/`,
      name: "Wolf Shop",
      publisher: { "@id": `${siteOrigin}/#organization` },
      inLanguage: "en",
    });
    graph.push({
      "@type":
        path === "/contact"
          ? "ContactPage"
          : path === "/about"
            ? "AboutPage"
            : path === "/shop"
              ? "CollectionPage"
              : "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      isPartOf: { "@id": `${siteOrigin}/#website` },
      inLanguage: "en",
      primaryImageOfPage: { "@type": "ImageObject", url: image },
    });
    if (path !== "/") {
      const crumbs = [{ name: "Home", item: `${siteOrigin}/` }];
      if (product) crumbs.push({ name: "Shop", item: absolute("/shop") });
      crumbs.push({
        name: product
          ? `${product.name} — ${product.color}`
          : title.split(" | ")[0],
        item: canonical,
      });
      graph.push({
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          ...item,
        })),
      });
    }
    // Prices and stock are illustrative, so no Offer, rating or manufacturer
    // claims are emitted. The catalog remains a CollectionPage, not a feed.
    if (path === "/shop")
      graph.push({
        "@type": "ItemList",
        itemListElement: products.map((p, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${p.brand} ${p.name} — ${p.color} (replica)`,
          url: absolute(`/product/${p.id}`),
        })),
      });
  }
  return {
    path,
    title,
    description,
    canonical,
    image,
    imageAlt: product
      ? `${product.brand} ${product.name}, ${product.color}, replica clothing preview`
      : "Wolf Shop — Dress Like yourself. Menswear catalog and Instagram enquiries.",
    width: product ? 1080 : 1200,
    height: product ? 1350 : 630,
    noindex,
    jsonLd: graph.length
      ? { "@context": "https://schema.org", "@graph": graph }
      : null,
  };
}
export function indexablePaths(products = catalog) {
  return [
    ...Object.keys(publicPages),
    ...products.map((p) => `/product/${p.id}`),
  ];
}
export function applySeo(meta) {
  document.title = meta.title;
  const setMeta = (attribute, key, value) => {
    let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attribute, key);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", String(value));
  };
  setMeta("name", "description", meta.description);
  setMeta(
    "name",
    "robots",
    meta.noindex ? "noindex, follow" : "index, follow, max-image-preview:large",
  );
  for (const [key, value] of Object.entries({
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
  }))
    setMeta("property", key, value);
  for (const [key, value] of Object.entries({
    "twitter:card": "summary_large_image",
    "twitter:title": meta.title,
    "twitter:description": meta.description,
    "twitter:image": meta.image,
    "twitter:image:alt": meta.imageAlt,
  }))
    setMeta("name", key, value);
  let link = document.head.querySelector('link[rel="canonical"]');
  if (meta.canonical) {
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = meta.canonical;
  } else link?.remove();
  document.getElementById("wolf-structured-data")?.remove();
  if (meta.jsonLd) {
    const script = document.createElement("script");
    script.id = "wolf-structured-data";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(meta.jsonLd);
    document.head.appendChild(script);
  }
}
