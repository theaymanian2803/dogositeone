# Deploying UNC CODE — Tracksuit storefront

TanStack Start + Nitro. The build target is chosen by `NITRO_PRESET`, read in
`vite.config.ts`.

| Target | `NITRO_PRESET` | Build output | How it ships |
| --- | --- | --- | --- |
| Cloudflare Workers (default) | `cloudflare-module` | `.output/` | `wrangler deploy` |
| Cloudflare Pages | `cloudflare_pages` | `dist/` | Pages project, output dir `dist` |
| Vercel | `vercel` | `.vercel/output/` | Vercel project |

> Use the underscore spelling `cloudflare_pages`. On Nitro 3, `cloudflare-pages`
> is not recognised and the build silently falls back to Workers output.

Local development: `bun install` then `bun run dev`, on port 8080.

## 1. Database

Local development uses `file:.data/tracksuit.db`. Serverless hosts have no
persistent disk, so production and demos need Turso:

```sh
turso db create <database-name>
turso db show <database-name> --url        # libsql://...
turso db tokens create <database-name>     # copy once
```

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the host's environment
settings. Do not commit them.

Schema and seed data are created on the first request (`ensureDatabase`). The
first load may take a second longer.

## 2. Vercel

1. Push the repository to GitHub.
2. Vercel → **Add New Project** → import the repo.
3. **Framework Preset: Other** — do not let Vercel pick Vite.
4. Install Command: `bun install`
5. Build Command: `bun run build`
6. Output Directory: leave empty. The build writes `.vercel/output`.
7. Environment Variables: add `NITRO_PRESET=vercel` plus everything in §4.
8. Deploy, then open `/` and `/admin/login`.

If Bun is unavailable in your plan, switch Install Command to `npm install`.

## 3. Cloudflare Pages

1. Push the repository to GitHub.
2. Cloudflare → **Workers & Pages** → **Create** → **Pages** → connect the repo.
3. Framework preset: **None**.
4. Build command: `NITRO_PRESET=cloudflare_pages npm run build`
5. Build output directory: `dist`
6. Settings → Functions → **Compatibility flags**: enable `nodejs_compat`.
   Without it, `node:crypto` and password hashing fail at runtime.
7. Environment Variables: `NODE_VERSION=22`, `NITRO_PRESET=cloudflare_pages`,
   plus everything in §4.
8. Deploy, then open `/` and `/admin/login`.

`dist/` contains `_worker.js`, `_routes.json`, `_headers` and the static
assets. Do not add a `functions/` directory; the worker is the whole app.

## 4. Environment variables

Required in production:

```env
TURSO_DATABASE_URL=libsql://<database>-<org>.turso.io
TURSO_AUTH_TOKEN=<token for that database>
```

Optional, only when the matching feature is used:

```env
# Google shopper sign-in. Redirect URI: https://your-domain.com/api/auth/google/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# WhatsApp order alerts (Meta Cloud API). Leave empty to disable.
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_OWNER_NUMBER=
WHATSAPP_API_VERSION=v20.0

# Optional runtime license gate. Off by default.
LICENSE_DISABLED=1
LICENSE_PRODUCT=tracksuitsites
```

The first account is seeded as **`admin@email.com` / `123456789`**. Sign in at
`/admin/login` and change the password before the site is public.

**Image storage (optional).** Set `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_DOMAIN` and `R2_PREFIX` to store uploads in Cloudflare R2. Without them, images stay in the database and are served from `/api/media/:id`.

**Choosing the storage backend.** Admin → Settings → Image storage offers three modes:

- **Automatic** (default): Cloudflare R2 when the keys above are set, the database otherwise.
- **Cloudflare R2 only**: refuses uploads with a clear error if the keys are missing.
- **Database only**: keeps images in Turso and serves them from `/api/media/:id`.

The Media page shows which backend is active, and the settings card shows whether R2 is configured on this deployment. The library lists both database media and the objects under this project's R2 prefix, tags each item **R2** or **DB**, and deleting an R2 image removes the object from the bucket.

## 5. First deploy checklist

- [ ] `/` returns 200 and renders the seeded catalogue
- [ ] `/admin/login` loads, sign-in works with the seeded owner
- [ ] Change the admin password
- [ ] Create or edit one record, then reload to confirm the write persisted
- [ ] Image upload works (if the store uses media)
- [ ] Google sign-in works, or is left unconfigured on purpose
- [ ] Checkout or enquiry form submits end to end
- [ ] No `.env`, `.data/` or `node_modules/` in the repository

## 6. Demo deployment (marketplace preview)

For a public demo shown on the sales site:

- use a **separate** Turso database, seeded, never production data
- set `LICENSE_DISABLED=1` — the demo is yours, not a licensed install
- leave PayPal, WhatsApp and Google empty so nothing real can be charged or sent
- treat the demo admin as public: rotate its password, or leave `/admin` unused
- expect visitors to create fake orders and enquiries; reset the demo database
  periodically (`turso db shell <db> < reset.sql` or recreate it)

## 7. Troubleshooting

| Symptom | Cause |
| --- | --- |
| 500 on every page after deploy | `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` missing or wrong |
| 401 from Turso | token belongs to another database — create a token for this one |
| Deploy succeeds, site 404s | wrong output directory (`dist` for Pages, `.vercel/output` for Vercel) |
| Vercel serves the Workers bundle | `NITRO_PRESET=vercel` was not set at build time |
| `crypto is not defined` on Cloudflare | `nodejs_compat` flag missing |
| `window is not defined` in SSR | a browser-only module imported at the top of a server-rendered file |
| Blank page, console 404 on assets | `public/` was not deployed, or the base path changed |
| Admin changes do not persist | database is read-only, or the token lacks write scope |
