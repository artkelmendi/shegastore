# wolfshop.style — hosting and technical SEO

Connected and verified on 26 October 2026.

## Hosting

- Public address: https://wolfshop.style/
- Host: GitHub Pages, repository `artkelmendi/shegastore`, Actions workflow `pages.yml`.
- Build base: `/`, with `VITE_STATIC_ADMIN=true`.
- Repository Pages custom-domain setting: `wolfshop.style`.
- HTTPS enforcement enabled. Certificate approved for `wolfshop.style` and `www.wolfshop.style`.
- `http://wolfshop.style`, both `www` variants, and the old GitHub Pages homepage redirect to the HTTPS apex address.
- Spaceship DNS, default record group, 30-minute TTL:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | artkelmendi.github.io |

No nameserver changes, purchases, mail records, credentials or DNSSEC settings were changed. The supplied Gmail address needs no domain MX record. GitHub's certificate provisioning was restarted after DNS became valid, then HTTPS was enabled after approval.

## SEO implementation

- `src/seo.js` is the shared source for runtime and build-time metadata.
- Each public page and colourway gets a unique title, description, HTTPS canonical, Open Graph and Twitter card metadata.
- `scripts/build-pages.mjs` emits metadata in the actual HTML, so link-preview crawlers do not need JavaScript.
- `https://wolfshop.style/sitemap.xml` contains 14 public URLs; `robots.txt` points to it.
- Staff, account, saved-item and privacy pages use `noindex, follow`. Filter/search result URLs use a canonical shop URL and runtime noindex rather than creating duplicate indexed combinations.
- Organization, WebSite, WebPage/CollectionPage and BreadcrumbList JSON-LD describes the real business/contact information. The catalog has an ItemList of product links.
- No invented reviews, manufacturer authorisation, live-stock guarantees, or purchase Offers were added. Existing sample prices remain illustrative.
- `public/images/wolfshop-share.png` is the 1200×630 branded sharing card. Product pages use the selected colourway's photo as their sharing image.
- Public pages include a useful no-JavaScript fallback with matching catalog information and replica disclosure.
- Inner pages no longer preload the large homepage hero image.

## Verification

- `npm run build` passed with the root-domain base and static-admin flag.
- `node scripts/verify-seo.mjs` verifies every generated public HTML file, unique titles/canonicals, structured data, noindex exclusions, sitemap and fallbacks.
- Live HTTPS checks passed for every sitemap URL, generated asset URLs, private-page noindex, 404 handling, social image and redirects.
- The live homepage and shop were inspected in the in-app browser on the custom domain.

## Search indexing

The site is technically ready for crawling. No Google Search Console account was connected and no indexing/ranking outcome is claimed. When the owner connects Search Console, submit `https://wolfshop.style/sitemap.xml` and use URL Inspection for the homepage and important product pages. Do not add tracking without updating the consent/privacy implementation.

## References

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/appearance/structured-data/product
