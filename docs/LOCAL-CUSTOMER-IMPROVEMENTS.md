# Local customer experience pass — 25 October 2026

Preview: http://localhost:5173/shop
Product example: http://localhost:5173/product/armani-exchange-black-tshirt

## What changed

1. **Clearer ordering path.** A compact shop note explains the Instagram-only flow. Product pages now give Instagram enquiries the main action; the bag remains a secondary way to collect pieces. There is no checkout or automatic message sending.
2. **Copy product details.** One click prepares a message with the actual selected colour, size and quantity, followed by questions about availability, final price, measurements, delivery and returns. Changing colour/size updates the message. Customers can also ask for sizing help without selecting a size.
3. **Copy a whole bag.** The bag now has an Instagram action and a copy button for all items, sizes, colours and quantities. This replaces the redundant checkout-preview step. It explicitly says nothing has been ordered or reserved.
4. **Clipboard fallback.** If the browser denies clipboard access, a selectable, read-only message is shown instead. No external message is sent by the website.
5. **Listed-size filtering.** The shop now filters by size, excludes explicitly tracked out-of-stock sizes, shows a removable size filter and counts active filters. Unknown stock is labelled for confirmation rather than claimed to be available. Size, brand and edit filters combine in the URL.
6. **Helpful empty states and accurate counts.** Empty sale and filtered pages explain what to do next. Counts say “style/styles” because colourways are grouped.
7. **Honest, product-relevant fit guidance.** Removed invented example measurements. Size & fit help now explains measuring a similar garment flat, chest width versus body circumference, length, and how to ask for actual garment measurements. Tracksuits include waist/inside-leg guidance. No unverified size chart or fit guarantee was added.
8. **Better browsing information.** Cards show listed sizes. Recommendations exclude the entire current colour family and prioritise the same category. Search results group colourways and include colour names.
9. **Navigation that reflects the catalog.** When there are no sale products, the header/mobile menu shows New arrivals instead. The empty Sale footer link is hidden. The sale route still works with a useful empty state.
10. **Styling and accessibility polish.** Larger fit-help and filter targets, a responsive filter grid, consistent mobile card reading order, more compact colour information, clear focus states, labelled copy results, and dark-mode-compatible surfaces. The existing hero fonts, entrance choreography, approved brand ribbon and reduced-motion behavior were retained.

## Existing local work preserved

The local wolfshop.style and wolfshop.style@gmail.com changes from the previous request remain in place. The domain is not connected; DNS, GitHub Pages, and production were not changed. The Instagram order destination remains @wolfshop.ks. Replica and non-affiliation disclosures remain visible.

## Research used

- [Baymard: Apparel UX research launch](https://baymard.com/research-articles/apparel-ecommerce-ux-research-launch) — size filters and coherent colour/size selection.
- [Baymard: Apparel sizing information](https://baymard.com/research-articles/apparel-size-information) — usable fit guidance near the size selector and information appropriate to the product.
- [Baymard: Apparel UX](https://baymard.com/industries/apparel-ux) — reduce uncertainty around fit, product imagery, delivery and returns.

These are usability-informed changes, not a claim of measured sales improvement for Wolf Shop. No scarcity, fabricated reviews, material claims or delivery promises were added.

## Verification

- Production build passed (`npm run build`).
- `node scripts/verify-customer-experience.mjs`: Chrome 1440px/light and WebKit 390px/dark + 320px/light. Covers combined size/brand filtering, out-of-stock exclusion with an isolated mocked catalog, filter removal, no-results recovery, chosen-colour enquiry text, clipboard success/fallback, bag details, relevant fit help and no horizontal overflow.
- `node scripts/verify-eyes-intro.mjs`: existing entrance regression check.
- Tests never change real stock, accounts or messages. Safari checks are WebKit automation, not a physical iPhone test.

## Review and restore

Originally prepared as a local experiment. Publication was authorised by the user on 25 October 2026, together with the product/hero motion refinement. The domain stays disconnected.
New customer-specific implementation: `src/customer-help.jsx` and `src/customer-help.css`; integration and copy in `src/main.jsx`.
The domain/email edits in `src/main.jsx` and `src/site-config.js` predate this pass. Avoid blindly restoring those files to Git HEAD if you want to keep that earlier work.


## Product and hero motion refinement — 25 October 2026

- Product cards, colour variants, gallery thumbnails and hero photos now share a decode-first crossfade. The current photo remains until the next image is decoded. The outgoing frame fades over a fully opaque incoming image, avoiding a backdrop flash.
- The normal crossfade is 280ms with the existing strong ease-out; Reduce Motion uses a 140ms opacity-only version. No whole-page opacity or stacking changes were added.
- Colour-specific price, description and colour text receive a short coordinated opacity transition. Rapid changes ignore stale image requests.
- The hero keeps “Dress Like yourself.” and its logo/CTA steady while the photo and supporting copy change. Slide changes wait for image decoding.
- Hero copy now explains shopping and Instagram size/availability checks, with a shorter mobile version and a desktop “How to order” link.
- Hero controls have 44px touch targets. The compact mobile hero gains 20px at smaller widths to keep those controls clear of the shopping button.
- `node scripts/verify-product-motion.mjs` tests slow image responses, crossfade timing, stable image geometry, rapid variant switches and hero-control spacing in Chrome/desktop, WebKit/430px and WebKit/320px with Reduce Motion.
