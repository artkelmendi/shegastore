# Wolf Shop accounts and staff workspace — local foundation

The backend and real authentication run locally. GitHub Pages publishes the storefront plus a separate, public, read-only admin preview using only the sample catalogue.

## Start and sign in

Use Node 24 LTS (tested on 24.13.0); the minimum declared version is 22.16. The built-in `node:sqlite` module currently prints an experimental warning.

```powershell
npm install
npm run dev
```

Open **http://localhost:5173/login**. The first visit asks you to create the first administrator with your own email and a passphrase of 15–128 characters. No default credentials are provided. Initial account setup only runs locally and is disabled when `NODE_ENV=production`.

Customers use **http://localhost:5173/account/create** to register and **http://localhost:5173/account/sign-in** to sign in. The header's account icon opens their account. Customer registration does not create a staff account or interfere with the first-administrator setup. The same email may have separate customer and staff identities, with separate credentials and sessions.

The frontend uses port 5173; the API uses loopback port 8787. `npm run dev:store` and `npm run api` can run them separately. The API must remain running to use staff features. No external database account is needed for this local version.

## What works

- Staff sign-in/sign-out with server sessions. A protected API checks every product, stock, activity and upload request.
- Customer registration, sign-in/out, profile name editing and passphrase changes. Email addresses are read-only until a verification flow exists. Passphrase changes revoke other customer sessions and issue a fresh session cookie.
- An overview showing actual product counts, published pieces, available tracked units and sizes awaiting a count.
- A searchable catalogue with draft, published and archived states. Archiving preserves the product and its stock history.
- Product creation and editing: name, handle, brand, category, description, price, original price, colour, new-arrival flag, main image and gallery. Handles stay fixed after creation.
- JPEG/PNG/WebP uploads, up to 4 MB each and eight photos per product. New products can also reuse an existing catalogue image.
- Sizes selected when creating a product; one colour per product in this first interface. Existing size lists are read-only. Additional sizes/colours and image deletion are future work.
- Stock by size: receive, remove or set a counted quantity, with a reason and optional note. Each adjustment records the operator, change and resulting quantity.
- Version checks reject stale product or stock changes; stock adjustments and their history are saved in one transaction. Negative quantities and removing reserved stock are rejected.
- Local storefront reads published products from the API, shows confirmed availability, disables sold-out sizes and limits bag quantities. Saved items and the preview bag are refreshed when products change.
- Unsaved edits prompt before in-app link navigation, Cancel or page reload. Browser Back/Forward does not yet have an SPA blocker.

No sample revenue, orders, customers or sales charts have been invented.

## Data

The first launch creates `var/shega.sqlite` and imports the existing eight sample products. Their **35 size variants start unconfirmed**. Zero is not presented as a physical count until a staff member saves a stock adjustment. Newly created variants start with a confirmed count of zero.

The additive migrations `001-initial.sql` and `002-customers.sql` define the tables below. Existing staff, product and stock records are preserved when migration 2 is applied.

| Table               | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `staff_users`       | Staff identities, password hashes, role and active state          |
| `staff_sessions`    | Hashed session tokens and expiry                                  |
| `products`          | Product content, integer cent prices, visibility and edit version |
| `product_variants`  | Size, colour, unique SKU, on-hand/reserved count and edit version |
| `stock_movements`   | Append-only adjustment ledger                                     |
| `audit_log`         | Product, stock and account events                                 |
| `schema_migrations` | Applied schema version                                            |

`customers` stores customer identities, password hashes and profile versions. `customer_sessions` stores their hashed session tokens and expiry. These tables are separate from staff identities/sessions. Customer API routes are under `/api/customer/`; customer cookies (`shega_customer`) cannot authenticate staff API requests. Staff cookies (`shega_staff`) also cannot authenticate customer requests.

Photos are stored in `var/media/`. `var/`, environment files and test artifacts are ignored by Git. Keep both the database and media when backing up. Stop the API before copying the entire `var` directory, including any SQLite WAL files; do not copy only the main SQLite file while the API is writing.

Passwords use salted scrypt; sessions use random tokens with only their hashes in SQLite. Cookies are HttpOnly and SameSite=Strict, expire after eight hours, and use Secure in production mode. Writes validate the request origin. Local login attempts are rate-limited in memory. These are implemented safeguards, not a production security certification.

Orders, checkout, email sending/verification, invitations, password recovery, MFA, customer account deletion and a staff management screen are not implemented. Customer bags and saved items still stay in their browser; signing in does not synchronise them. Roles exist in the staff schema, but editors and administrators currently have the same catalogue permissions. The reserved quantity is prepared for future order handling; adding an item to the preview bag does not reserve it.

## Hosting later

GitHub Pages cannot run this Node API or SQLite. Its workflow sets `VITE_STATIC_ADMIN=true`, which serves a public read-only dashboard at `/admin/`, catalogue browsing/product details, sample size stock and an activity explanation. The `/login/` page opens this preview without asking for credentials. Customer sign-in forms are disabled and no API requests are made in the static build. This does not upload the local database, accounts, private activity, stock records or uploaded photos. No preview interaction saves changes. Local development keeps real authenticated editing.

Build a matching static preview with `VITE_BASE_PATH=/shegastore/` and `VITE_STATIC_ADMIN=true` in the build process environment. `node scripts/verify-static-admin.mjs` checks the public preview routes and verifies there are no authentication forms or API calls; use `SHEGA_PREVIEW_URL` to point it at a different server.

Before enabling this online, choose an API host with durable database/media storage, same-origin routing for `/api`, HTTPS, backups and restore testing. Then prepare account provisioning/recovery, finer role permissions, MFA, persistent/shared rate limits and upload validation suitable for public hosting. Keep local-only setup disabled. Do not enable real orders until checkout, reservation transactions and business details are implemented.

Configuration is read from the process environment: `API_PORT`, `APP_ORIGIN`, `DATABASE_PATH`, `MEDIA_PATH`, `NODE_ENV`. `API_PROXY_TARGET` overrides Vite's local API proxy. The project does not automatically load a `.env` file into the Node process.

## Verification

```powershell
npm run test:api
npm run test:workspace
npm run build
```

API checks cover staff/customer authentication separation, customer registration and passphrase rotation, migration preservation, origin rejection, stale writes, stock integrity/history, publication and upload restrictions. Browser checks use installed Google Chrome with Playwright and an isolated API/database on port 5174. They exercise staff setup/login, product upload/create/edit/publish, stock, activity, storefront availability, customer registration/login/profile/passphrase changes and layouts at 1440, 390 and 320px. Test accounts and stock changes never touch the normal local database. Screenshots and temporary test databases stay under ignored `artifacts/`.

## Storefront review

| Priority     | Finding                                                                             | Current action                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Next         | Sample photography, prices and sizing are not confirmed physical inventory.         | Product editing and uploads now exist locally. Replace samples and count stock before selling.                   |
| Next         | Contact and checkout are still previews.                                            | Keep their existing preview messages; connect real services before launch.                                       |
| Done locally | The catalogue had no persistent management or size-level availability.              | SQLite, staff API, product editor, stock ledger and public catalogue adapter added.                              |
| Done locally | Missing/archived products and stock changes could leave stale bag entries.          | Bag entries are reconciled against the database catalogue; confirmed stock limits apply to add/increase actions. |
| Done locally | Two image descriptions did not match their BOSS photography.                        | Corrected the contact and about image descriptions.                                                              |
| Later        | The main frontend bundle is about 528 kB minified and triggers Vite's size warning. | Staff code is lazy-loaded separately. Measure a vendor/route split before further motion or catalogue expansion. |
| Later        | Phone checks are browser emulation.                                                 | Test touch, keyboard and long forms on a real iPhone/Android device before launch.                               |

The approved hero, fonts, imagery and entrance are preserved. Customer screens use the same storefront typography and white/red styling; an account icon has been added to the header.
