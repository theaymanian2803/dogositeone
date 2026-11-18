# PetPals — buyer instructions

A sellable pet-supply storefront: TanStack Start + React 19 + Tailwind v4 + libSQL (Turso), with a full admin for products, orders, page controls, pages, settings, theme, reviews, coupons, customers, media and setup.

## 1. Run it

```sh
bun install
bun run dev
```

Open `http://localhost:8080`. The first page request creates `.data/petpals.db` and seeds the 13-product pet catalog, pages and homepage sections.

## 2. Sign in to the admin

Open `/admin/login` and use the seeded owner:

```text
Email:    admin@email.com
Password: 123456789
```

The password is stored as a PBKDF2 hash, never plaintext. Rotate it in **Admin → Setup** before a public launch. If the owner row is removed, the first-run form creates a new owner with an 8+ character password.

Optional: set `OWNER_SETUP_KEY` in the environment to require a setup key on that first-run form.

The first admin visit starts a seven-step guided tour (dashboard → page controls → products → settings → setup). Finish or skip it; restart it any time from **Setup → Restart tour**.

## 3. What you can control

| Admin section       | What it controls                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Dashboard           | revenue, orders, products, customers, low stock, recent orders                                                              |
| Page controls       | homepage sections: hero, product grid, promo, banner, rich text, categories, lookbook, featured brand — reorder, hide, edit |
| Pages               | About, Shipping, Returns, FAQ, Contact at `/pages/<key>`                                                                    |
| Products            | full catalog CRUD, pricing, stock, images, care and suitability detail                                                      |
| Categories / Brands | catalog taxonomy (Dogs, Cats, Food, Grooming, Beds, Toys by default)                                                       |
| Orders              | order list, line items, status updates                                                                                      |
| Reviews             | add, approve/unapprove, delete                                                                                              |
| Coupons             | percentage/fixed discounts, minimums, usage caps, expiry                                                                     |
| Customers           | accounts, roles (admin/moderator/customer), delete                                                                          |
| Media               | image uploads stored in the database, served from `/api/media/:id`                                                          |
| Theme               | display/body font pairing and accent colour                                                                                 |
| Settings            | branding, contact, shipping, reviews, popup, navigation, footer                                                             |
| Setup               | database connect/test/reset, owner credentials, license, launch checklist                                                   |

## 4. Products and images

Every seeded product is **One Size**. The product page shows a single-size note and the checkout stores the size as `One Size`; there is no apparel size guide.

Replace the sample photography before launch. Local files live in `public/products/`:

- `bone.jpg` — chew toy
- `biscuit.jpg` — treats / food bag
- `bed.jpg` — beds and scratching posts
- `groom.jpg` — grooming

You can also upload through **Admin → Media** and paste the `/api/media/<id>` URL into a product. Update product names, descriptions, prices, stock and categories in **Admin → Products**.

## 5. Database

Local development uses `file:.data/petpals.db`. To use Turso:

1. Create a database at turso.tech.
2. In `/admin/setup`, paste the `libsql://` URL and auth token, choose whether to keep the sample catalog, then Save & connect. You will be signed out of the old database — create the owner account on the new one.

Or set environment variables before the build:

```
TURSO_DATABASE_URL=libsql://…
TURSO_AUTH_TOKEN=…
```

The token is stored server-side and never returned to the browser.

## 6. Customer accounts

Shoppers can create an account at `/account` to see their orders and save products. Guest checkout still works without an account.
**Password recovery without email:** the customer opens **Forgot password?** on `/account`, requests a code, and the shop issues it in **Admin → Customers → Password recovery** (or **Reset** on a customer row). Send the code by WhatsApp or phone. The code is hashed, expires in 30 minutes, works once, locks after five wrong attempts, and signs the customer out everywhere when used.

**Google sign-in (optional):** create (or reuse) an OAuth 2.0 Web client in Google Cloud Console, add `<your-domain>/api/auth/google/callback` as an authorised redirect URI, then set:

```
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
# optional override
GOOGLE_REDIRECT_URI=https://your-domain/api/auth/google/callback
```

The “Continue with Google” button appears on `/account` once both values are set; otherwise shoppers use email/password or **Continue as guest**. Google accounts are created as `customer` only — the admin always signs in with email and password. Reviews can require approval in Settings.

## 7. Cash on delivery and WhatsApp

Checkout is cash on delivery: no card payment is processed. Configure it in **Admin → Settings → Shipping and cash on delivery**:

- Flat rate and free-delivery threshold (defaults: 50 MAD flat, free from 500 MAD).
- COD label, minimum order and delivery time shown to the customer.
- Delivery zones: one per line as `City|fee|free threshold`. Zones start empty; until a city is added, the flat rate applies everywhere.

The store currency is **MAD**. Change it in **Admin → Settings → Shipping and cash on delivery**; prices across the storefront, checkout and emails follow the setting.

**WhatsApp orders:** set the customer-facing shop number, the owner alert number, the button label and opening message in **Admin → Settings → WhatsApp orders**. The storefront then shows a floating WhatsApp button, a per-product order link, and a post-checkout "send this order on WhatsApp" link with the order prefilled.

**Automatic new-order alerts** use the Meta WhatsApp Cloud API. Add these to `.env`:

```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_OWNER_NUMBER=2126...
# optional
WHATSAPP_API_VERSION=v20.0
```

`WHATSAPP_OWNER_NUMBER` is a fallback; the owner number saved in Settings takes priority. If the variables are missing or Meta rejects the request, the order is still stored and the admin keeps working.

## 8. Language

The storefront ships English and French. Switch the store language in **Admin → Settings → Language** (`store_locale.language`). Admin screens stay English. Content pages and product copy stay as entered, so translate them in the admin if the shop is French.

## 9. Licensing (optional, off by default)

The store works with no license. To gate admin writes behind a domain license, run your own license server that issues Ed25519 grants and set:

```
LICENSE_SERVER_URL=https://your-license-server.example
LICENSE_PUBLIC_KEY={"crv":"Ed25519","kty":"OKP","x":"…"}
LICENSE_PRODUCT=track-suit-society
```

`LICENSE_DISABLED=1` forces the gate off. The storefront is never gated; only admin writes require activation when licensing is enabled.

## 10. Email

Email uses Resend. Set `EMAIL_ENABLED=1`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_OWNER` and `EMAIL_TEST_TO` in the environment; verify the sender domain in Resend first. Admin → Settings → **Email (Resend)** → **Send test email** confirms delivery. Order receipts, owner alerts and password reset codes are sent through the same sender. If email is not configured, checkout and admin-issued recovery codes still work.

The sample `.env` uses `EMAIL_FROM=PetPals <orders@unccode.site>` and `EMAIL_OWNER=sberechou@gmail.com`; replace both with the buyer's verified domain and inbox before selling.

## 11. Deploy

```sh
bun run build
```

The Nitro output targets Cloudflare. Set the Turso env vars in the host, then deploy the built output. See `DEPLOYMENT.md` for Vercel, Cloudflare Pages and Cloudflare Workers.

## 12. Verify a sale build

```sh
bun run test
bun run typecheck
bun run lint
bun run build
```

Then sign in, edit a product, change a page section, place a test order and confirm it appears under Orders.
