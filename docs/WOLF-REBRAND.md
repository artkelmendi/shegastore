# Wolf Shop rebrand

The rebrand is prepared locally. The repository and public address stay at `artkelmendi/shegastore` and `https://artkelmendi.github.io/shegastore/` as requested; no repository move is needed.

## Identity

Original approved vectors come from `../outputs/wolf-shop`. `scripts/prepare-wolf-assets.py` copies the black/red-eye and white/red-eye full logos and ticket marks, plus the wordmarks and red monochrome ticket. It derives animation layers from the supplied SVG without redrawing the contours. The favicon uses the red ticket.

The ticket replaces the former navigation mark, ribbon dividers, background watermarks and staff marks. The text-only Wolf Shop wordmark is used in the hero, with the full logo in the footer. Brand photography remains unchanged, with the three store-supplied image filenames updated to Wolf.

The original artwork red is **#FF0033**. Text and filled action buttons use related reds where extra contrast is needed. Light is the first-visit default; the moon/sun button switches to a charcoal dark palette and saves the choice locally. Theme selection is applied before first paint. Both themes cover the storefront, forms, account screens, local admin and static admin preview.

## Entrance

The entrance starts on pure white in either theme. Only the original red eye contours appear, with the ticket's 30-degree tilt removed so both eyes sit level. They are deliberately large on desktop (44vw, capped at 680px) and proportioned for mobile (68vw, capped at 400px). They resolve softly into a steady gaze, easing slightly inward without blinking or squeezing, then dive forward past the viewer. The full page crossfades beneath the dive, followed by staggered imagery, header, logo and typography. Document height stays unchanged and the timeline waits for the last stagger before releasing the intro; no viewport crop is removed at the handoff. The ticket and wordmark stay hidden throughout the intro; the full logo remains in the finished hero. The sequence runs for approximately 3.1 seconds. Font/image preparation is bounded and overlaps the gaze reveal.

The implementation uses WAAPI, the existing easing tokens, opacity, transforms and clip masks. Escape, the Skip entrance button, a resize, or enabling reduced motion immediately settles the page and restores scrolling. Reduced-motion users enter directly. Sign-in/admin/account pages skip the marketing entrance. `?entrance=classic` keeps a simple full-logo fallback.

## Existing data

The database and authentication cookie identifiers are deliberately unchanged so the existing administrator and sessions continue working. The local SQLite file remains `var/shega.sqlite`. This filename is an internal compatibility detail, not visible branding. Existing bag, saved-item and consent keys are read as fallbacks; new browser preferences use Wolf keys. No accounts or stock records are reset or exported.

## Verify

```powershell
node scripts/verify-wolf.mjs
npm run test:api
npm run test:workspace
npm run build
```

The rebrand check covers 12 pages, four viewport widths and both themes, visible old-brand text, broken images, theme persistence, the eye entrance, Escape and reduced motion. Staff tests also check the dark workspace. Test databases remain isolated from the real local account.

For a production-style preview, build with the existing `/shegastore/` base and `VITE_STATIC_ADMIN=true`, then run `scripts/verify-static-admin.mjs` against the preview server. Real sign-in and stock changes still require the local/hosted API; the public static admin uses sample data only.
