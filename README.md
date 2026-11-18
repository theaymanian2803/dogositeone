# PetPals

A dog and cat supplies storefront built with React 19, Vite, Tailwind CSS v4 and Turso (libSQL).

## Run

```sh
bun install
bun run dev
```

Open `http://localhost:8080`.

## Database

Copy `.env.example` to `.env` and set:

```
VITE_TURSO_DB_URL=libsql://your-database.turso.io
VITE_TURSO_AUTH_TOKEN=your-token
```

The store reads and writes Turso directly from the browser client. The demo
build points at a shared database; use your own for real customers. You can
also connect a database from the admin settings dialog.

## Admin

- Storefront: `/`
- Admin: `/admin`
- Sign-in: `/auth`

The admin manages products, categories, orders, reviews, homepage sections,
branding, shipping, contact details and the database connection.

## Scripts

| Command            | Purpose                                |
| ------------------ | -------------------------------------- |
| `bun run dev`      | Start the Vite dev server on port 8080 |
| `bun run build`    | Production build                       |
| `bun run preview`  | Preview the build                      |
| `bun run lint`     | ESLint                                 |
| `bun run test`     | Vitest                                 |
| `bun run seed:all` | Seed auth, products and demo orders    |

## Email

Orders send a Resend receipt to the customer and a new-order alert to the owner. Set the server-only EMAIL_* variables in Vercel and .env; verify the sender domain in Resend. Local dev uses the Vite middleware in ite.config.ts; production uses pi/send-order-email.ts (Edge function). Checkout still succeeds when email is disabled.

## Notes

- The demo brand can be pinned in `src/lib/brand.ts`; leave it empty to let the admin's Store settings control branding.
- Prices are displayed in MAD.
- Default language is English; French and Arabic are available from the header.
- Product images are remote Unsplash URLs; replace them in the admin or the
  `products` table with your own assets.
