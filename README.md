# Wolf Shop

React, Vite, Motion and custom CSS storefront, with local customer accounts and a staff workspace backed by Node and SQLite.

## Run locally

Use Node 24 LTS and installed Google Chrome for browser verification.

```powershell
npm install
npm run dev
```

- Storefront: http://localhost:5173/
- Customer sign-in: http://localhost:5173/account/sign-in
- Customer registration: http://localhost:5173/account/create
- Staff setup/sign-in: http://localhost:5173/login
- Workspace: http://localhost:5173/admin

Create your own first administrator on the local setup screen. There are no default credentials. Products, accounts and stock records are stored privately under ignored `var/`; no real stock counts are assumed for the eight imported sample products.

Customers register separately and can edit their name, change their passphrase and sign out. Their sessions cannot access the staff workspace. Email verification/recovery, customer orders and synchronised saved items are future work. Customer screens live in `src/customer/`; their API is in `server/customers.mjs`.

See [the workspace guide](docs/WORKSPACE.md) for database structure, actual features, limitations, verification and future hosting requirements.

## Storefront

Home, shop, individual products, brand directory, saved pieces, bag/checkout preview, contact, FAQ, about, delivery and privacy pages. The local storefront reads published database products; standalone static hosting retains the existing sample catalogue. Contact and checkout remain previews and do not send messages or take payment.

Cabinet Grotesk 800 handles headings, Satoshi handles body text and controls, and Telma is reserved for the hero signature. Light and dark surfaces use Wolf red (#FF0033) accents. Original Wolf Shop assets, published brand marks and real brand photography are hosted locally. `asset-sources.json` and `font-sources.json` record their sources. Supplied hero/editorial images are unchanged.

The Wolf-eye entrance is the default: the original eyes open, resolve into the full logo and reveal the page from their centre. `?entrance=classic` keeps a simple logo fallback. Reduced motion enters directly. Light is the default, with a persistent moon/sun switch for dark mode. The Wolf artwork, water interaction, faint background marks, scroll details and page transitions respect reduced motion. Mobile product grids show two columns. See [the rebrand notes](docs/WOLF-REBRAND.md).

Desktop wheel smoothing uses Lenis; mobile retains native scrolling. The red cursor stays attached to the native pointer. Cookie preferences offer equal accept/reject controls; no optional trackers are installed.

## Source map

| Location                                                                | Purpose                                                        |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/main.jsx`                                                          | Public pages, navigation, saved items and bag                  |
| `src/catalog.jsx`                                                       | Database catalogue with standalone sample fallback             |
| `src/data.js`                                                           | Sample catalogue used for initial database seed/static preview |
| `src/admin/`                                                            | Staff login, catalogue editor, inventory and activity          |
| `server/`                                                               | Local HTTP API, authentication, SQLite and schema              |
| `src/type-system.css`                                                   | Shared typography and rhythm                                   |
| `src/editorial.css`, `src/styles.css`                                   | Existing storefront layout and components                      |
| `src/origin-entrance.*`, `src/brand-motion.*`, `src/scroll-details.jsx` | Entrance, brand and scroll motion                              |
| `public/logos`, `public/images/real`                                    | Local marks and photographs                                    |

## Verify

```powershell
npm run test:api
npm run test:workspace
npm run build
```

Tests use isolated databases and synthetic staff credentials. Browser screenshots and reports go to ignored `artifacts/`. `node scripts/verify-wolf.mjs` checks the current identity, both themes, responsive layouts and entrance; earlier motion scripts remain historical checks of the previous choreography.

## Deployment boundary

The public static site is https://artkelmendi.github.io/shegastore/. Pushes to `main` run `.github/workflows/pages.yml` with base `/shegastore/` and `VITE_STATIC_ADMIN=true`. The published `/admin/` dashboard is a public, read-only preview of the sample catalogue. `/login/` links to that preview without asking for credentials. Static builds make no API requests and disable customer sign-in. GitHub Pages cannot host the API/database; real accounts and editing remain in the local workspace until a backend is hosted. Local databases, uploads and credentials are not included in the deployment.

Products, prices, measurements and photography remain illustrative until replaced with actual stock information. Existing preview disclosures remain in the storefront.
