# Wolf Shop rebrand

The rebrand is prepared locally. The repository and public address stay at `artkelmendi/shegastore` and `https://artkelmendi.github.io/shegastore/` as requested; no repository move is needed.

## Identity

Original approved vectors come from `../outputs/wolf-shop`. `scripts/prepare-wolf-assets.py` copies the black/red-eye and white/red-eye full logos and ticket marks, plus the wordmarks and red monochrome ticket. It derives animation layers from the supplied SVG without redrawing the contours. The favicon uses the red ticket.

The ticket is used in navigation, background watermarks and staff marks. The brand strip uses original SVG wordmarks in white on a red band, with small white line dividers and no heading row or pause button. It avoids raster upscaling and blend/contrast filters. The text-only Wolf Shop wordmark is used in the hero, with the full logo in the footer. Brand photography remains unchanged, with the three store-supplied image filenames updated to Wolf.

The original artwork red is **#FF0033**. Text and filled action buttons use related reds where extra contrast is needed. Light is the first-visit default; the moon/sun button switches to a charcoal dark palette and saves the choice locally. Theme selection is applied before first paint. Both themes cover the storefront, forms, account screens, local admin and static admin preview.

## Entrance

The entrance starts on pure white in either theme. The original red eye contours sit level, resolve into a steady gaze and then dive forward. The page appears through a fading white viewport cover, followed by staggered hero elements. The underlying document keeps its normal opacity, stacking order, height and scroll behaviour throughout; the intro never promotes or fades the whole document. The cover is hidden before animation cancellation, after two final paint frames. The sequence runs for approximately 3.1 seconds, with bounded font/image preparation overlapping the gaze.

With Reduce Motion enabled, the entrance uses a short opacity-only eye/cover fade (about 1.1 seconds), with no zoom, sliding or parallax. It no longer skips straight to the hero. Responsive viewport changes do not cancel either variant. A background-first tab waits until it becomes visible before starting. Escape, Skip entrance or enabling reduced motion during a full entrance settles immediately. Sign-in/admin/account pages skip the marketing entrance. `?entrance=classic` keeps the simple full-logo fallback.

`window.__wolfOrigin` records the selected mode, phase, completion reason and any caught animation error. Animation errors release the page through a short cover fade rather than an abrupt cut.

## Existing data

The database and authentication cookie identifiers are deliberately unchanged so the existing administrator and sessions continue working. The local SQLite file remains `var/shega.sqlite`. This filename is an internal compatibility detail, not visible branding. Existing bag, saved-item and consent keys are read as fallbacks; new browser preferences use Wolf keys. No accounts or stock records are reset or exported.

## Verify

```powershell
node scripts/verify-wolf.mjs
node scripts/verify-safari-entrance.mjs
npm run test:api
npm run test:workspace
npm run build
```

The rebrand check covers 12 pages, four viewport widths and both themes, visible old-brand text, broken images, theme persistence, the eye entrance, Escape and reduced motion. Staff tests also check the dark workspace. Test databases remain isolated from the real local account.

For a production-style preview, build with the existing `/shegastore/` base and `VITE_STATIC_ADMIN=true`, then run `scripts/verify-static-admin.mjs` against the preview server. Real sign-in and stock changes still require the local/hosted API; the public static admin uses sample data only.

## Mobile and browsing polish

Height-only viewport changes from Safari browser bars do not cancel the entrance. Catalogue refreshes on window focus preserve scroll position, and unchanged product data keeps its existing reference. Helvetica Now Text is limited to sale-product cards; the rest of the site retains the original typography. Safari/WebKit checks emulate a 440 × 956, 3× mobile screen; actual iPhone hardware remains a separate check.

Reduced-motion consistency: storefront components use a live `matchMedia` subscription rather than a mount-only preference snapshot. The reduced CSS disables keyframes instead of fast-forwarding them to their final frame. Favorites become a static, horizontally scrollable row with the duplicate hidden; the default looping marquee is unchanged. Active detail-reveal animations are canceled when the preference changes. Verify cold loads and live OS preference changes with `node scripts/verify-motion-preference.mjs` (WebKit phone and desktop).
