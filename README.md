# PetPals

A production pet-supply storefront built with TanStack Start, React 19, Vite and Tailwind CSS v4. The design uses a clean white canvas, warm orange accents, Poppins type and a spacious product grid for food, toys, beds and grooming essentials.

## Pages

- `/` — the storefront, rendered from the page-control sections: hero, product grid, promo, banners, rich text, categories, lookbook and featured brand.
- `/shop` — the full catalog with category filters, search, saved items and one-size product cards.
- `/products/$productId` — product detail: description, care, suitability notes, reviews, wishlist and related products.
- `/checkout` — guest checkout with server-side coupon and shipping validation, cash on delivery.
- `/account` — customer register/login (email or Google), order history and saved products. Guest checkout is always available.
- `/pages/$pageKey` — editable About, Shipping, Returns, FAQ and Contact pages.
- `/admin` — the full store admin: dashboard, page controls, pages, products, categories, brands, orders, reviews, coupons, customers, media, theme, settings and setup.

## Catalog

The seed catalog contains 13 pet products across six categories: `dogs`, `cats`, `foods`, `groom`, `bed` and `toys`. Every product is sold as **One Size**, so the storefront and checkout use a single size and there is no apparel size guide.

Product photos live in `public/products/` (`bone.jpg`, `biscuit.jpg`, `bed.jpg`, `groom.jpg`) and are referenced by the seeded rows. Replace them from **Admin → Products** with the buyer's own photography; remote URLs are supported too.

## Admin

Open `/admin/login` and sign in with **`admin@email.com` / `123456789`** (seeded on a fresh database). Rotate the password in **Admin → Setup** before a public launch. From there you control the entire store without touching code:

| Area                           | Controls                                                           |
| ------------------------------ | ------------------------------------------------------------------ |
| Page controls                  | Homepage sections: add, edit, reorder, hide, delete                |
| Pages                          | About, Shipping, Returns, FAQ, Contact                             |
| Products / Categories / Brands | Catalog and taxonomy                                               |
| Orders                         | Status updates and line items                                      |
| Reviews                        | Add, approve, delete                                               |
| Coupons                        | Percentage/fixed discounts with limits and expiry                  |
| Customers                      | Roles and account deletion                                         |
| Media                          | Database-backed image uploads served at `/api/media/:id`           |
| Theme                          | Font pairing and accent colour                                     |
| Settings                       | Branding, contact, shipping, reviews, popup, navigation, footer    |
| Setup                          | Database connect/test/reset, owner credentials, license, checklist |

A buyer-facing guide lives in `INSTRUCTIONS.md`.

On the first admin visit a seven-step guided tour walks through the dashboard, page controls, products, settings and setup. It can be restarted from Setup at any time.

## Backend

The catalog and orders live in libSQL. Local development uses a SQLite file at `.data/petpals.db`, created and seeded with the 13-product pet catalog on first request. Production points at Turso through environment variables.

Copy `.env.example` to `.env` only if you want to override the defaults:

```
TURSO_DATABASE_URL=file:.data/petpals.db
TURSO_AUTH_TOKEN=

# Optional Meta WhatsApp Cloud API alerts for new orders.
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_OWNER_NUMBER=
WHATSAPP_API_VERSION=v20.0
```

For Turso, set `TURSO_DATABASE_URL=libsql://…` and `TURSO_AUTH_TOKEN=…` in the host's environment. Database reads fall back to the seeded catalog if the database is unreachable, so the storefront still renders.

Tables: `users`, `profiles`, `user_roles`, `sessions`, `products`, `categories`, `brands`, `orders`, `order_items`, `reviews`, `coupons`, `wishlist`, `landing_sections`, `page_content`, `settings`, `media`. Checkout recomputes every price from the database, validates coupons server-side, calculates shipping from the store settings, and writes the order and its lines in one transaction. An idempotency key stops a retried submit from creating a duplicate order. Cash on delivery is the default; no card payment is processed. New orders trigger a WhatsApp alert to the owner when the Meta Cloud API variables and an owner number are configured.

Seed changes only apply to a fresh database. Delete `.data/petpals.db` during development to reseed it.

Sessions are httpOnly cookies; only a SHA-256 hash of each session token is stored. Admin APIs are guarded server-side with the `admin` role on every call.

Server code is under `src/server/` and is never bundled into the browser; typed server functions in `src/lib/api.ts` are the bridge the routes call.

## Store defaults

| Setting            | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| Brand              | PetPals                                                  |
| Announcement       | Free delivery over 500 MAD — cash on delivery            |
| Currency           | MAD                                                      |
| Flat shipping      | 50 MAD                                                   |
| Free delivery      | Orders from 500 MAD                                      |
| Delivery time      | 24 hours                                                 |
| Contact            | hello@petpals.com · 0694784176 · Mhamid 7, Marrakech     |
| Order prefix       | `PET-`                                                   |
| Homepage sections  | Hero, product grid, promo, categories, reviews           |
| Categories         | Dogs, Cats, Food, Grooming, Beds, Toys                   |

All of these are editable in **Admin → Settings**, **Admin → Theme** and **Admin → Page controls**.

## Email

Transactional email runs through Resend. Set `EMAIL_ENABLED=1`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_OWNER` and `EMAIL_TEST_TO` in the host environment; the sender domain must be verified in Resend. The admin **Settings → Email (Resend)** card has a **Send test email** button. Order confirmations, owner alerts and password-reset codes fall back safely when email is not configured; checkout never depends on it.

## Development

Requires Node.js 20+ and [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

The dev server runs at `http://localhost:8080`. The first page request creates `.data/petpals.db` and seeds the catalog.

## Scripts

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `bun run dev`       | Start the Vite dev server                           |
| `bun run build`     | Production build (Nitro / Cloudflare module output) |
| `bun run preview`   | Preview the production build                        |
| `bun run test`      | Run the Vitest suite                                |
| `bun run typecheck` | Type-check with `tsc --noEmit`                      |
| `bun run lint`      | Run ESLint                                          |
| `bun run format`    | Format with Prettier                                |

## Project structure

```text
public/products/     stable product images used by database rows
src/
  assets/            hero photography
  components/        shared UI (shadcn/ui primitives, bag sheet)
  lib/               cart, checkout validation, server-function bridge, utilities
  routes/            TanStack file-based routes
  server/            server-only database, catalog, seed, and order code
  styles.css         Tailwind v4 theme tokens and base styles
```

## License

This template ships under the **UNC CODE Standard License**: up to three live sites (three domains), for you or your clients. Need more? The Extended License removes the limit.

- `LICENSE.md` — Standard License terms (included with this purchase)
- `LICENSE-EXTENDED.md` — Extended License terms (upgrade through the seller)

Runtime activation (`src/server/license.ts`) is **off by default** (`LICENSE_DISABLED=1`). The admin works normally. Set `LICENSE_SERVER_URL`, `LICENSE_PUBLIC_KEY` and `LICENSE_PRODUCT` only if you run your own license server.

## Deploying

`DEPLOYMENT.md` covers Vercel, Cloudflare Pages and Cloudflare Workers: the
`NITRO_PRESET` each target needs, the environment variables, and the
first-deploy checklist.
