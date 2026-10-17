# Shega Store

A complete frontend for Shega, built with React, Vite, Motion, and custom CSS. Fonts, original Shega logos, official brand marks, and real brand photography are included locally. The hero uses the two images supplied by the store.

## Run locally

```powershell
cd "C:\Users\Art Kelmendi\Documents\ChatGPT\aureclothes\shega-website"
npm install
npm run dev
```

Open the Local URL printed by Vite. `npm run build` creates a portable `dist` folder; `npm run preview` serves that production build.

## Included

- Home with a two-slide hero with store-supplied BOSS and Emporio Armani images, categories, products, editorial, and newsletter preview.
- Shop with category, brand, new-arrival and sale filters, search, sorting, and empty states.
- Eight individual product pages with real model photography, selectable product/detail views, required size selection, zoom, a size guide, and related pieces.
- Brand directory, saved pieces, contact, about, privacy, delivery, and a not-found page.
- Persistent browser-local bag and saved items; bag quantities, removal, subtotal, and a checkout preview.
- Native modal dialogs with focus management, Escape dismissal, and focus restoration.
- A white editorial design, responsive layouts, touch-specific styling, and reduced-motion support.
- A Shega-red ribbon of the original BOSS, Diesel, Emporio Armani, and HUGO logos in white, separated by Shega marks, with pause controls and keyboard/reduced-motion support.

## Motion direction

The latest changes are local only. The hero includes the original Shega wordmark with an SVG outline-to-ink drawing animation; clicking it replays the drawing. Very faint Shega marks drift in the hero and page background. Pointer hover distorts only the nearby part of a mark, and presses send out short ripples. The effect uses a rasterized canvas texture, bounded ripple work, and a 30 fps background loop; reduced-motion mode is static. Category labels use a softer raspberry red (`#ce304d`). `src/brand-motion.jsx` and `src/brand-motion.css` contain these additions.

White editorial styling with design variance 7, motion intensity 7, and visual density 3. The original red-G / black-lettering SVG is the primary logo. White surfaces and black type are accented with Shega-red rules, arrows, active states, and a red brand ribbon. The user-selected option 05, locally hosted Panchang Bold, gives the lowercase hero its wide geometric character; the second line is Shega red. Clash Display handles the other headings and navigation, Chillax remains on the brand-ribbon caption, and Satoshi handles body text and controls. The three category tiles have solid red labels, white titles, and circular arrow details. Fontshare source URLs are recorded in `font-sources.json`. The editorial layer is in `src/editorial.css`.

Each fresh document opens on a soft white surface. The logo fades upward over 1.1 seconds, followed by a 650 ms dissolve into the composed page. The handoff waits for fonts and the first hero image, with a bounded fallback for slow assets. A native dialog manages focus, Enter store and Escape skip the opening, and scrolling is released on completion. The intro does not use an old session flag and does not replay during in-app navigation. Reduced-motion visitors enter directly.

The hero copy rises in a restrained stagger as the photography fades in. Both supplied hero images stay mounted, decode before becoming visible, and crossfade between slides. Dark type sits in their light negative space on desktop; mobile separates the copy from the product images. Page changes fade out in 140 ms and enter in 280 ms while the header stays still; scrolling resets during the handoff. Query-only filters update immediately. Other content reveals once with restrained stagger, and the hero has gentle scroll parallax. Interactive panels use a 280 ms exit/entrance. Motion honours reduced-motion preferences. No scroll hijacking is used.

## Frontend boundaries

No backend, live inventory, authentication, payment, email, analytics, or external form service is connected. Contact, newsletter, and checkout controls clearly explain their preview behaviour. The bag, saved items, and appearance preference are the only data saved, using local storage on the visitor's device.

Products, prices, and garment measurements are illustrative. Replica status is disclosed in product cards, product details, store information, and the footer. Real campaign and model photography comes from the official BOSS, Diesel, and Armani websites, and the brand marks use their published artwork. Exact image URLs and source pages are recorded in `asset-sources.json`. These reference images are not photos of Shega's actual replica inventory. Confirm stock details, contact channels, delivery terms, and return conditions before live sales.

Edit the catalogue in `src/data.js`, site components in `src/main.jsx`, and the white design in `src/editorial.css`. Shared component styles are in `src/styles.css`. Shega assets are in `public/logos`, original brand marks in `public/logos/brands`, and real photographs in `public/images/real`.

## Verification

`node scripts/verify-brand-motion.mjs` checks the SVG drawing and replay, canvas response, five viewport widths, lighter captions, category navigation, search, and reduced motion. Its screenshots and results are in `artifacts/brand-motion`.

`node scripts/verify.mjs` runs the browser integration checks with installed Google Chrome through Playwright. Set `SHEGA_PREVIEW_URL` to test a different local origin. It checks the hero, search-to-product flow, size validation, bag calculations and persistence, saved items, filtering, sorting, contact preview, routes, responsive overflow, images, white appearance, logo marquee controls, mobile navigation, and reduced motion. `node scripts/verify-motion.mjs` captures the opening and page handoff, checks measured logo movement/opacity, slow-image readiness, interruptible navigation, skip, mobile, and reduced motion. `node scripts/review-white.mjs` checks the catalogue at six viewport widths. `node scripts/review-direction.mjs` checks a cold first visit, stable hero placement, loaded fonts, removed uniform tile, and both supplied hero slides at five screen widths. Reports and screenshots are written to the ignored `artifacts` directory.

The production build includes explicit HTML entry points for all collection, information, and product routes, so direct links also work on static hosting. Automated mobile emulation has been checked; touch feel and browser chrome behaviour still need a real phone.

## GitHub Pages

Public URL: https://artkelmendi.github.io/shegastore/

Pushes to `main` run `.github/workflows/pages.yml`, build with `VITE_BASE_PATH=/shegastore/`, and deploy `dist` to GitHub Pages. Local development keeps the `/` base. Product and FAQ routes include static entry points for direct links.

The latest home layout uses Cabinet Grotesk and Telma, a drawn Shega logo without floating background marks, T-shirts/Sweatshirts/Hoodies categories, and a continuously moving shuffled Our favorites carousel. Mobile product grids retain two columns. The BOSS editorial display was supplied by the store. FAQ answers describe the preview's actual limitations.

Production checks: `npm run build` and `node scripts/verify-pages.mjs` (set `SHEGA_PREVIEW_URL` to the production-style preview URL).
