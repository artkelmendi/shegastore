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
- A continuous strip of the original BOSS, Diesel, Emporio Armani, and HUGO logos with pause controls and keyboard/reduced-motion support.

## Motion direction

White editorial styling with design variance 7, motion intensity 7, and visual density 3. The original red-G / black-lettering SVG is the primary logo. White surfaces and black type are accented with Shega-red rules, arrows, active states, and small details. Locally hosted Clash Display gives headings and navigation their character; Satoshi handles body text and controls. Fontshare source URLs are recorded in `font-sources.json`. The editorial layer is in `src/editorial.css`.

The home page opens directly, with no full-screen introduction, session timer, focus capture, or scroll lock. The header logo has a small 650 ms rise within its own position. Both supplied hero images stay mounted and crossfade, avoiding an empty frame between slides. Dark type sits in their light negative space on desktop; mobile separates the copy from the product images. Other content reveals once with restrained stagger; the hero has gentle scroll parallax. Interactive panels use a 280 ms exit/entrance. Motion honours reduced-motion preferences. No scroll hijacking is used.

## Frontend boundaries

No backend, live inventory, authentication, payment, email, analytics, or external form service is connected. Contact, newsletter, and checkout controls clearly explain their preview behaviour. The bag, saved items, and appearance preference are the only data saved, using local storage on the visitor's device.

Products, prices, and garment measurements are illustrative. Replica status is disclosed in product cards, product details, store information, and the footer. Real campaign and model photography comes from the official BOSS, Diesel, and Armani websites, and the brand marks use their published artwork. Exact image URLs and source pages are recorded in `asset-sources.json`. These reference images are not photos of Shega's actual replica inventory. Confirm stock details, contact channels, delivery terms, and return conditions before live sales.

Edit the catalogue in `src/data.js`, site components in `src/main.jsx`, and the white design in `src/editorial.css`. Shared component styles are in `src/styles.css`. Shega assets are in `public/logos`, original brand marks in `public/logos/brands`, and real photographs in `public/images/real`.

## Verification

`node scripts/verify.mjs` runs the browser integration checks with installed Google Chrome through Playwright. Set `SHEGA_PREVIEW_URL` to test a different local origin. It checks the hero, search-to-product flow, size validation, bag calculations and persistence, saved items, filtering, sorting, contact preview, routes, responsive overflow, images, white appearance, logo marquee controls, mobile navigation, and reduced motion. `node scripts/review-white.mjs` checks the catalogue at six viewport widths. `node scripts/review-direction.mjs` checks a cold first visit, stable hero placement, loaded fonts, removed uniform tile, and both supplied hero slides at five screen widths. Reports and screenshots are written to the ignored `artifacts` directory.

The production build includes explicit HTML entry points for all collection, information, and product routes, so direct links also work on static hosting. Automated mobile emulation has been checked; touch feel and browser chrome behaviour still need a real phone.
