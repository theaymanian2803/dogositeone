# Landing Page → Storefront Playbook

**Canonical copy:** `C:\Users\PC\Desktop\tracksuitsites\PLAYBOOK.md`

This is the **only** playbook. Do not keep a second `PLAYBOOK.md` inside a store project; point that project's `AGENTS.md` here instead. If a rule changes, change it here once.

**Read this before implementing any landing page in this template.**
It is the single source of truth for turning a design (HTML export, screenshot, Figma link, or copy deck) into a working store on TanStack Start + Turso, with the admin, checkout, accounts and Google login intact.

Template root: `C:\Users\PC\Desktop\tracksuitsites`.
Buyer-facing setup guide: `INSTRUCTIONS.md`. Agent conventions: `AGENTS.md`.

---

## 0. Agent contract

When the user says "implement this landing page", "make this a store", "add this design", or hands over HTML/screenshots:

1. **Do not restyle the app by hand.** The homepage is database-driven. Anything the admin must edit later belongs in `landing_sections`, `settings`, `products`, `categories`, `brands`, `page_content` or `media` — not hard-coded in JSX.
2. **Do not remove or bypass** Turso, the admin, guest checkout, customer accounts, or Google login. They are part of the sellable template.
3. **Never reintroduce Supabase.** Google is direct Google OAuth. Turso is the only database.
4. **Never commit `.env`** and never print the Turso token, Google secret, or session tokens.
5. Work in phases 1–8 below **in order**. Do not skip verification in phase 7.
6. If the design needs a section that the built-in types cannot express, extend the section system (phase 5B) instead of writing a one-off homepage component.
7. When the design is not apparel, complete the **vertical adaptation** checklist (phase 4F).
8. **This template is the backend base, not the storefront.** A landing page becomes a **new project in a new folder** (phase 0B). Never convert an existing store in place, and never "apply the playbook" to the folder of another brand.
9. **One project, one database.** Before any write, confirm the target database belongs to the project you are working on (`SELECT value FROM settings WHERE key='store_branding'`). Never write brand A's catalog, sections, settings or pages into brand B's database.
10. **No database writes without an explicit go-ahead.** Credentials found in `.env` are read-only until the user says "write to it". Start with a read-only probe, report what you found, then write.
11. **Never ask the user to paste a secret into chat.** Have them put tokens in `.env` directly, or read the value already there. If a token fails twice, stop retrying and diagnose (phase 0C).
12. **Reuse the credentials that already exist.** Use the existing Google OAuth client and the project's existing Turso URL/token from `.env`. Do not create a new Google client or a new database for each build. Only ask for new credentials when the project genuinely needs a different database.
13. **Match the design exactly.** Port every source component the design uses — including the product quick-view eye, the mega menu, the shop filters, hover states and section furniture. Do not "simplify" a source component into a plain link, dropdown or grid during the rebuild.
14. **Keep only the finished full website.** After the store passes the definition of done, remove the landing-page source folder and all temporary artifacts. Archive the source first only when it has no remote backup (phase 0D).
15. **One playbook, one source of truth.** There is exactly one playbook (this file). Store projects must not carry a drifting copy.
16. **Default owner credentials are intentional.** Every new store seeds an owner with **`admin@email.com` / `123456789`** when no admin exists. This deliberately overrides the old "no default credentials" rule. Keep the same credentials across projects unless the user says otherwise, and flag rotation before a public launch.

Definition of done is at the end. A task is not complete until every box is checked.

---

## 0B. New project, new folder (do this before phase 1)

The template is a **reusable backend**. Every storefront is its own project:

```powershell
# from the template root (this folder), with the work committed on a branch
$target = "C:\Users\PC\Desktop\<brand>-store"
git archive --format=zip --output="$env:TEMP\brand.zip" <branch>
Expand-Archive -Path "$env:TEMP\brand.zip" -DestinationPath $target
cd $target
git init; git add -A; git commit -m "feat: <brand> storefront"
```

Then, in the new folder:

| Step                                                                                       | Why                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` → `"name": "<brand>-store"`                                                 | two projects must not share a package identity                                                                                                                      |
| `src/server/db.ts` + `src/server/setup.ts` → `file:.data/<brand>.db`                       | separate local databases                                                                                                                                            |
| `vite.config.ts` → the origin the existing Google client already trusts (usually **8080**) | reuse the registered redirect URI; if 8080 is taken or unregistered, use 8081+ **and** register that exact URI in Google Console. Never run two stores on one port. |
| Google `GOOGLE_REDIRECT_URI` → `http://localhost:<port>/api/auth/google/callback`          | must match the project's port **and** the existing Google Console entry                                                                                             |
| Copy the **existing** Google client ID/secret from the template `.env`                     | one OAuth client is reused for every store; do not create a new client                                                                                              |
| Turso URL/token → this project's own database                                              | the token is scoped to one database; never point another brand at it                                                                                                |
| `README.md` / `INSTRUCTIONS.md`                                                            | replace template wording, DB filename and port                                                                                                                      |

Work in a **working folder** (`Desktop\<brand>-store`). When the project passes §12, move it to:

```
C:\Users\PC\Desktop\finished-websites\<project-slug>
```

That folder is the managed home for finished projects. Each finished project gets its **own new GitHub repo** at that point — never push the final store to the design/source repo, and never reuse another project's remote. Record the repo URL in `finished-websites\INDEX.md`.

Never edit the original project's database, sections or `.env` while building another brand.

## 0C. Databases and credentials

**Two databases, never crossed.**

| Rule                    | Detail                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Identify before writing | `SELECT value FROM settings WHERE key='store_branding'` — the name must match the project you are in |
| Read-only first         | probe counts/keys, report, then ask for the go-ahead to write                                        |
| Turso only              | no Supabase/Postgres/Firebase                                                                        |
| Token scope             | a token is bound to **one database id (`rid`)** and one signing key (`kid`)                          |

When Turso answers:

```
401 Unauthorized: invalid JWT token: can't be decoded with any of the existing keys
```

the token was **signed for a different database or account** — it is not a permissions problem and retrying with another copied token will not fix it. Diagnose instead:

```sh
turso db shell <db> "SELECT 1"          # does the CLI see this DB?
turso db tokens create <db>             # prints once, in the terminal
```

Then paste that value into `.env` **yourself**; never route secrets through chat. Rotate any token that was pasted anywhere (`turso db tokens invalidate <db>`).

**Project databases.** Each finished project keeps its own database. Record the URL here; the token stays only in that project's `.env`.

| Project          | `TURSO_DATABASE_URL`                                        |
| ---------------- | ----------------------------------------------------------- |
| `unccode-estate` | `libsql://estatesiteone-aymanekancw.aws-eu-west-1.turso.io` |

```env
TURSO_DATABASE_URL=libsql://<database>-<org>.turso.io
TURSO_AUTH_TOKEN=<token from the Turso dashboard or `turso db tokens create`>
```

On Windows, the `turso` command installed by `winget`/cargo may be the SQL shell (`tursodb.exe`), which cannot create databases or tokens. Use the dashboard or the real Turso CLI for those. A `.env` with a `file:` URL still works locally, but production and any shared demo need the `libsql://` URL plus token. Verify with `SELECT COUNT(*)` against the remote DB before handing the site over.

**WhatsApp (Meta Cloud API).** Each shop has its own Meta app and phone number. Put `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OWNER_NUMBER` and optional `WHATSAPP_API_VERSION` in `.env` only. The customer-facing shop number and owner alert recipient live in `store_whatsapp` (Admin → Settings). Never log the token; never send it through chat or commit it.

## 0D. Keep only the finished website (and one playbook)

When the store passes §12, clean the workspace:

| Keep                                                         | Remove                                                                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `finished-websites/<project-slug>/` (the finished store)     | the landing-page source folder (`<brand>`, `<brand>-v2`, the Bolt/Replit export)                         |
| its `.env` (local only, never committed)                     | `.screens/`, `.*-build.log`, `.*-test.log`, `.tmp-*.mjs`, any probe script                               |
| its local `.data/<brand>.db` (or Turso)                      | `node_modules/`, `.output/`, `.tanstack/`, `.wrangler/`, `docs/`, `.superpowers/` from the buyer package |
| `finished-websites/builds/<project-slug>-source.zip`         | any second `PLAYBOOK.md` inside a store project                                                          |
| `finished-websites/INDEX.md` (project + repo + zip register) | stale zips for the same project                                                                          |

Rules:

- **Verify the source has a remote before deleting it.** `git -C <source> remote -v`. If it has one (GitHub), deleting the local source is safe and recoverable. If it has no remote, zip it into `builds/sources/` first, then delete the folder.
- **Do not delete unrelated projects** on the Desktop. Only remove the source folder for the store you just finished.
- **One playbook only.** Delete `PLAYBOOK.md` from store projects and make their `AGENTS.md` point to `C:\Users\PC\Desktop\tracksuitsites\PLAYBOOK.md`. Do not let two copies drift.
- **Do not leave demo/probe credentials or test users** in a database you are handing over. Reset the local DB or delete the test rows. The intentional default owner (`admin@email.com` / `123456789`) stays.
- **Do not rebuild the zip during development.** The zip is a release artifact, rebuilt only in the final “finish them up” batch (§0E). Keep the last good zip untouched until then.
- **New repo at finish.** Create a new GitHub repo for the finished store, set it as `origin`, commit, and push only when the user asks. The design/source repo is not the destination.
- `finished-websites` contains only finished projects and `builds/`; no landing-page sources, probes or temp builds.

## 0E. “Finish them up” — the only time zips are rebuilt

When the user says **“zip them all”**, **“finish them up”**, **“package everything”** or similar, run this batch once:

1. List every folder directly under `C:\Users\PC\Desktop\finished-websites\` (ignore `builds/`).
2. For each project:
   - `git status` must be clean (commit or report first).
   - Run `bun run typecheck`, `bun run test`, `bun run lint`, `bun run build`.
   - Remove `.*-build.log`, `.*-test.log`, probe scripts and `.screens/`.
   - Rebuild `finished-websites\builds\<project-slug>-source.zip` with the exclusions below.
   - Confirm the zip has **no `.env`**, no `.data`, no `node_modules`, no `.output`, no `.git`.
3. Update `finished-websites\INDEX.md` with the project, repo URL, zip path, status and verification date.
4. Report: projects zipped, projects skipped/failed, and any repo that still needs to be created.

**Never** rebuild zips on ordinary edits, commits or check-ins. If a project fails verification during the batch, keep its previous zip and report the failure instead of shipping a broken archive.

```powershell
$stage = "$env:TEMP\opencode\package-store"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
robocopy . $stage /E /XD node_modules .git .data .output .tanstack .superpowers .wrangler docs dist .screens /XF .env *.log *.tsbuildinfo | Out-Null
$zip = "C:\Users\PC\Desktop\finished-websites\builds\<project-slug>-source.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$stage\*" -DestinationPath $zip -CompressionLevel Optimal
Remove-Item -Recurse -Force $stage
```

---

## 1. Ground truth

| Item              | Value                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | TanStack Start + React 19 + Vite 8                                                                                                                  |
| Styling           | Tailwind CSS v4, config inside `src/styles.css`                                                                                                     |
| Database          | libSQL / Turso only                                                                                                                                 |
| Local DB fallback | `file:.data/tracksuit.db` when `TURSO_DATABASE_URL` is unset                                                                                        |
| Dev server        | `http://localhost:8080` for the template. Each project uses the origin its existing Google client already trusts; never run two stores on one port. |
| Build output      | Nitro `cloudflare-module`                                                                                                                           |
| Package manager   | Bun                                                                                                                                                 |
| Payments / email  | Not implemented. Demo checkout writes an order only.                                                                                                |
| Auth              | httpOnly cookie sessions, PBKDF2 passwords, hashed session tokens                                                                                   |
| Admin             | Email + password only; seeds `admin@email.com` / `123456789` when no admin exists (user-requested default)                                          |
| Shopper login     | Email/password and direct Google OAuth (customer role only)                                                                                         |
| Guest checkout    | Always available                                                                                                                                    |
| Licensing         | Off by default; only gates admin writes when configured                                                                                             |

Scripts (run from the template root):

```sh
bun install
bun run dev          # http://localhost:8080
bun run test         # Vitest
bun run typecheck    # tsc --noEmit
bun run lint         # ESLint
bun run build        # also regenerates src/routeTree.gen.ts
```

**Order matters:** after adding or deleting a route file, run `bun run build` first so the route tree regenerates, then tests/typecheck/lint/build again.

---

## 2. Phase 1 — Intake the landing page

Extract this into a filled brief before touching code. If the user gave only a screenshot, infer and state assumptions; ask only when a missing fact changes the build.

```md
## Landing page brief

Brand name:
Logo text / wordmark:
Announcement bar:
Accent colour (hex):
Display font:
Body font:
Light or dark canvas:

Sections in order:

1. <section> — headline / subhead / CTA / image / notes
2. ...
   ...

Products (or items):

- name | price | compare-at | category | brand | badge | image (up to 4) | 3–6 bullets | description
  ...

Navigation:
Footer links:
Editable pages needed:
Contact details:
Shipping rules:
Currency:
Promo popup:
Images available (paths or URLs):
Non-apparel adaptation needed? (sizes, fabric fields, etc.)
```

Then map the brief onto the template using the tables below.

---

## 3. Where everything lives

### Routes

| Path                                 | File                                            | Purpose                                                                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                  | `src/routes/index.tsx`                          | Homepage. Loads products, sections, settings, session, categories, brands and approved reviews, then renders `SectionRenderer` in order. Each section is wrapped in a `div` with the section key as its anchor. |
| `/shop`                              | `src/routes/shop.tsx`                           | Full catalog. `validateSearch` accepts `category`, `sort`, `maxPrice`, `minRange` and `inStock`; the header mega-menu "Shop by need" links use these. The grid stays client-filterable after load.              |
| `/products/$productId`               | `src/routes/products/$productId.tsx`            | Product detail: image gallery (max 4) with hover zoom, price, sizes, fabric/care/fit, reviews, wishlist, brand-first related pieces.                                                                            |
| `/checkout`                          | `src/routes/checkout.tsx`                       | Guest + account checkout, quote and order placement.                                                                                                                                                            |
| `/account`                           | `src/routes/account.tsx`                        | Shopper register/login, Google button, orders, wishlist.                                                                                                                                                        |
| `/pages/$pageKey`                    | `src/routes/pages/$pageKey.tsx`                 | Editable content pages (About, Shipping, Returns, FAQ, Contact).                                                                                                                                                |
| `/admin`                             | `src/routes/admin.tsx`                          | Guarded admin shell and sidebar.                                                                                                                                                                                |
| `/admin/login`                       | `src/routes/admin_.login.tsx`                   | Login; becomes first-run owner setup when no admin exists.                                                                                                                                                      |
| `/admin/page-controls`               | `src/routes/admin/page-controls.tsx`            | Homepage section CRUD, visibility and ordering, entity pickers (brands, categories, products, reviews) and design controls (colours, typography, alignment, banner layout).                                     |
| `/admin/pages`                       | `src/routes/admin/pages.tsx`                    | Content page block builder: add/reorder/remove blocks, page layout, eyebrow and hero image.                                                                                                                     |
| `/admin/products`                    | `src/routes/admin/products.tsx`                 | Catalog CRUD, including up to four gallery images per product.                                                                                                                                                  |
| `/admin/categories`, `/admin/brands` | `src/routes/admin/categories.tsx`, `brands.tsx` | Taxonomy.                                                                                                                                                                                                       |
| `/admin/orders`                      | `src/routes/admin/orders.tsx`                   | Orders and status.                                                                                                                                                                                              |
| `/admin/reviews`                     | `src/routes/admin/reviews.tsx`                  | Review moderation.                                                                                                                                                                                              |
| `/admin/coupons`                     | `src/routes/admin/coupons.tsx`                  | Discounts.                                                                                                                                                                                                      |
| `/admin/customers`                   | `src/routes/admin/customers.tsx`                | Accounts and roles.                                                                                                                                                                                             |
| `/admin/media`                       | `src/routes/admin/media.tsx`                    | Image uploads (DB BLOBs).                                                                                                                                                                                       |
| `/admin/theme`                       | `src/routes/admin/theme.tsx`                    | Font pairing and accent.                                                                                                                                                                                        |
| `/admin/settings`                    | `src/routes/admin/settings.tsx`                 | Branding, contact, shipping, reviews, popup, nav, footer.                                                                                                                                                       |
| `/admin/setup`                       | `src/routes/admin/setup.tsx`                    | DB connect/test/reset, owner credentials, license, checklist, tour reset.                                                                                                                                       |
| `/api/media/$id`                     | `src/routes/api/media/$id.ts`                   | Serves uploaded media with immutable caching.                                                                                                                                                                   |
| `/api/auth/google`                   | `src/routes/api/auth/google/index.ts`           | Starts Google OAuth (302 to Google).                                                                                                                                                                            |
| `/api/auth/google/callback`          | `src/routes/api/auth/google/callback.ts`        | Exchanges code, creates customer + session.                                                                                                                                                                     |

### Server (`src/server/**` — never import from a route/component)

| File            | Owns                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `db.ts`         | Client creation, schema bootstrap, migrations, seeding, runtime DB switching (`db_url`/`db_token`). |
| `schema.ts`     | All `CREATE TABLE` statements and additive column migrations.                                       |
| `defaults.ts`   | Default sections, pages, settings re-export.                                                        |
| `seed.ts`       | Seed products.                                                                                      |
| `catalog.ts`    | Product/category/brand reads and admin CRUD.                                                        |
| `cms.ts`        | `landing_sections` and `page_content` CRUD, ordering.                                               |
| `settings.ts`   | Merged `settings` JSON rows.                                                                        |
| `commerce.ts`   | Reviews, wishlist, coupons, customer order history.                                                 |
| `orders.ts`     | Server-side quote/order placement, shipping, idempotency.                                           |
| `auth.ts`       | PBKDF2, sessions, cookies, `requireAdmin` / `requireStaff`.                                         |
| `oauth.ts`      | `upsertOAuthUser` (Google customer creation).                                                       |
| `media.ts`      | Unified media read/write: R2 or database (per `store_media`), merged library, delete routing.       |
| `r2.ts`         | Cloudflare R2: upload, list, delete and status through `aws4fetch` (no AWS SDK, edge-safe).         |
| `image-data.ts` | Shared data-URL validation: MIME allow-list, 5 MB cap, extension map.                               |
| `setup.ts`      | Setup status, DB config, license status.                                                            |
| `license.ts`    | Optional Ed25519 license gate.                                                                      |

### Bridges and client

| File                                                      | Owns                                                                                                                                                                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api.ts`                                          | Public typed server functions (catalog, sections, pages, settings, auth, checkout, reviews, wishlist).                                                                                                                                             |
| `src/lib/admin-api.ts`                                    | Admin typed server functions; every one re-checks the session.                                                                                                                                                                                     |
| `src/lib/cms.ts`                                          | `SectionType`, `SECTION_TYPES`, `PAGE_KEYS`, section/page types, section style tokens + sanitisers (`cleanSectionStyle`, `cleanPageBlocks`), entity-id readers (`sectionBrandIds`, `sectionCategoryIds`, `sectionProductIds`, `sectionReviewIds`). |
| `src/lib/storefront.ts`                                   | `Product`, `Brand`, `ProductCategory`, `Collection`, filters, size chart, `getRelatedProducts` (brand-first).                                                                                                                                      |
| `src/lib/store-settings.ts`                               | `StoreSettings` shape, defaults, theme fonts.                                                                                                                                                                                                      |
| `src/lib/checkout.ts`                                     | Checkout validation and totals types.                                                                                                                                                                                                              |
| `src/lib/cart.tsx`                                        | Client cart, localStorage persistence.                                                                                                                                                                                                             |
| `src/components/site/section-renderer.tsx`                | Maps section type → React component; entity-driven sections (brands, categories, products, reviews) and the V2 spotlight, product rows, service cards and testimonial ticker.                                                                      |
| `src/components/site/section-style.ts`                    | Turns a section's `config.style` into inline styles (colours, fonts, sizes, alignment, background layout).                                                                                                                                         |
| `src/components/site/product-grid-section.tsx`            | Filterable catalog grid, quick-view eye, add-to-bag, saved toggle.                                                                                                                                                                                 |
| `src/components/site/quick-view.tsx`                      | Product quick-look dialog (eye button on every card): image, price, stock, specs, colourway, add-to-bag and full-details link.                                                                                                                     |
| `src/components/site/product-gallery.tsx`                 | Product gallery: thumbnails, active image, cursor-follow hover zoom.                                                                                                                                                                               |
| `src/components/site/page-blocks.tsx`                     | Renders content-page blocks and stacked/two-column layout.                                                                                                                                                                                         |
| `src/components/site/site-header.tsx` / `site-footer.tsx` | Store chrome, nav, announcement, footer links and the category-card mega menu with "Shop by need".                                                                                                                                                 |
| `src/components/site/theme-style.tsx`                     | Injects DB theme as CSS variables.                                                                                                                                                                                                                 |
| `src/styles.css`                                          | Design tokens (Tailwind v4 `@theme`), base styles, fonts variables.                                                                                                                                                                                |
| `src/routes/__root.tsx`                                   | Document shell, Google Fonts `<link>`, error boundary.                                                                                                                                                                                             |

### Database (all created by `src/server/schema.ts`)

| Table                                         | Holds                                                                                                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`                                    | Catalog rows (slug/id, price, category, brand, images JSON, stock, active, sort).                                                                                                             |
| `categories`, `brands`                        | Taxonomy.                                                                                                                                                                                     |
| `landing_sections`                            | Homepage sections: `section_key`, `type`, `title`, `subtitle`, `image_url`, `visible`, `sort_order`, `config` JSON (design `style` + entity ids + section fields).                            |
| `page_content`                                | Editable pages keyed by `(page_key, locale)`, content JSON `{title, body, eyebrow, heroImage, layout, blocks[]}`. `body` is kept in sync for legacy readers.                                  |
| `settings`                                    | JSON values keyed by `store_branding`, `store_contact`, `store_footer`, `store_shipping`, `store_reviews`, `store_theme`, `store_popup`, `store_megamenu`, plus internal `db_url`/`db_token`. |
| `media`                                       | Database-stored images (the fallback when R2 is off): `mime`, `data` BLOB.                                                                                                                    |
| `users`, `profiles`, `user_roles`, `sessions` | Accounts, roles, auth sessions.                                                                                                                                                               |
| `orders`, `order_items`                       | Orders and lines.                                                                                                                                                                             |
| `reviews`, `coupons`, `wishlist`              | Commerce extras.                                                                                                                                                                              |

**Render rule:** the storefront only renders sections where `visible = 1`, ordered by `sort_order, created_at`. `SectionRenderer` receives the live products, categories, brands and approved reviews so picker sections can resolve ids; unpicked entity sections show everything, and sections with no matching data render nothing. `index.tsx` falls back to a product grid only when there are zero sections.

---

## 4. Phase 2 — Brand, theme and chrome

Do this first so every later screenshot already looks like the design.

### 4A. Branding and settings

Edit the defaults in `src/lib/store-settings.ts` **and** write the same values to the live database (defaults only seed fresh DBs; `INSERT OR IGNORE` never overwrites existing rows).

| Setting key         | Fields                                                                                     | Where it shows                               |
| ------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `store_branding`    | `name`, `logoText`, `announcement`                                                         | Header, titles, footer, announcement bar     |
| `store_contact`     | `email`, `phone`, `address`, `hours`                                                       | Footer and Contact page                      |
| `store_footer`      | `socials[]`, `companyLinks[]`, `note`                                                      | Footer                                       |
| `store_shipping`    | `flatRate`, `freeThreshold`, `currency`, `codLabel`, `minOrder`, `deliveryTime`, `zones[]` | Checkout and order totals                    |
| `store_whatsapp`    | `enabled`, `number`, `ownerNumber`, `buttonLabel`, `orderMessage`                          | Storefront WhatsApp buttons and owner alerts |
| `store_locale`      | `language` (`en` or `fr`)                                                                  | Storefront interface language                |
| `store_marketplace` | `enabled`, `proMonthly`, `unlimitedMonthly`, `proAnnual`, `unlimitedAnnual`                | Agency vs marketplace mode, seller plans     |
| `store_reviews`     | `requireApproval`                                                                          | Review submission                            |
| `store_theme`       | `displayFont`, `bodyFont`, `accent`                                                        | `ThemeStyle` CSS variables                   |
| `store_popup`       | `enabled`, `title`, `body`, `code`, `delaySeconds`                                         | Storefront popup                             |
| `store_megamenu`    | `enabled`, `featuredCategory`                                                              | Header navigation                            |
| `store_media`       | `storage` (`auto` / `r2` / `database`)                                                     | Where uploads are stored (Admin → Media)     |

Accent colour is a hex string; `ThemeStyle` turns it into CSS variables. Keep the visual language consistent unless the design explicitly differs: the base tokens live in `src/styles.css` (`:root` and `@theme inline`).

### 4B. Fonts

- Font families are declared in `src/styles.css` (`--font-sans`, `--font-display`) and loaded as a Google Fonts `<link>` in `src/routes/__root.tsx`.
- The admin Theme page can switch between the families listed in `THEME_FONTS` / `THEME_FONT_FAMILIES` in `src/lib/store-settings.ts`.
- To add a new family: add it to `THEME_FONT_FAMILIES`, add the Google Fonts link in `__root.tsx`, add a pairing to `THEME_FONTS`, then set it in `store_theme`.

### 4C. Static images vs media uploads

- **Design assets shipped with the template:** put them in `public/` (e.g. `public/products/velocity-01.jpg`) and reference `/products/velocity-01.jpg`. These are stable, unhashed paths and are what seed rows use.
- **Buyer-uploaded images:** use `/admin/media`. Max 5 MB; JPEG/PNG/WebP/GIF/AVIF.
- Never store build-hashed asset imports in database rows.

**Storage backend is a setting, not a hard-coded choice.** `store_media.storage` has three values:

| Mode             | Behaviour                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `auto` (default) | Cloudflare R2 when the `R2_*` env vars are present, the database otherwise. Never blocks an upload. |
| `r2`             | R2 only. Missing keys fail loudly with a message telling the admin to add them or switch mode.      |
| `database`       | Turso only; images are served from `/api/media/:id`.                                                |

Implementation:

- `src/server/r2.ts` uploads with **`aws4fetch`** (signed `PUT`), lists with `ListObjectsV2` and deletes with `DELETE`. No AWS SDK, so the Workers bundle stays small.
- `src/server/image-data.ts` owns `parseDataUrl`, the MIME allow-list and the 5 MB cap; both backends use it.
- `src/server/media.ts` reads `store_media`, resolves the target, and falls back to the database only in `auto` mode. It also merges database rows and R2 objects into one `MediaEntry[]` and routes deletes by id shape (`/` means an R2 key).
- `src/lib/media-storage.ts` holds the pure resolver (`resolveMediaStorage`), plus `isR2ObjectId` and `mimeForKey` — unit-tested.
- Admin → Settings → **Image storage** picks the mode and shows whether R2 is configured. Admin → Media tags each card **R2** or **DB**, shows the size, and deletes from the correct backend.

R2 environment (per project, same bucket, different prefix):

```env
R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_DOMAIN=https://pub-xxxx.r2.dev
R2_PREFIX=<project-slug>
```

Three rules that save time:

1. **Never reuse another project's prefix.** One bucket is fine; one prefix per brand is not optional.
2. **`R2_PUBLIC_DOMAIN` has no trailing slash**, and the bucket must have public access or a custom domain.
3. **Do not put the AWS SDK here.** `aws4fetch` does the signing; the SDK bloats the Worker and needs more Node compat.

The media library lists the newest **200 objects per prefix** (one page). Add pagination before a shop uploads thousands of images.

---

## 5. Phase 3 — Homepage sections

The built-in types and the exact config keys their renderers read. Every type also accepts the `style` object described in 5D:

| Type             | Component             | `title`                            | `subtitle`                   | `imageUrl`                                 | `config` keys                                                                                                                                            |
| ---------------- | --------------------- | ---------------------------------- | ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero`           | `HeroSection`         | Headline (newlines become lines)   | Fallback eyebrow / side note | Hero image                                 | `eyebrow`, `description`, `cta_text`, `cta_link`, `secondary_cta_text`, `secondary_cta_link`, `stats[]` (`{value,label,icon}`), `caption`, `featured_id` |
| `product_grid`   | `ProductGridSection`  | Section heading                    | Section deck                 | —                                          | `eyebrow`, `description`, `filter` (a category slug or `all`)                                                                                            |
| `promo`          | `PromoSection`        | Big statement                      | Supporting line              | Optional image (side or background)        | `eyebrow`, `cta_text`, `cta_link`                                                                                                                        |
| `custom_banner`  | `CustomBanner`        | Heading                            | Body                         | Right-hand image                           | `eyebrow`, `cta_text`, `cta_link`                                                                                                                        |
| `rich_text`      | `RichText`            | Heading                            | Used if `content` absent     | —                                          | `eyebrow`, `content` (blank line separates paragraphs)                                                                                                   |
| `categories`     | `CategoriesSection`   | Heading                            | Supporting line              | —                                          | `eyebrow`, `category_ids[]` (empty = all categories); tiles link to `/shop?category=<slug>`                                                              |
| `products`       | `ProductPickSection`  | Heading                            | Supporting line              | —                                          | `eyebrow`, `product_ids[]` (empty = all products), `cta_text`, `cta_link`                                                                                |
| `spotlight`      | `SpotlightSection`    | Heading                            | Supporting line              | —                                          | `eyebrow`, `product_ids[]` (first = spotlight card, rest = rows)                                                                                         |
| `product_rows`   | `ProductRowsSection`  | Heading                            | Supporting line              | —                                          | `eyebrow`, `description`, `chips[]`, `product_ids[]`, `cta_text`, `cta_link`                                                                             |
| `service_grid`   | `ServiceGrid`         | Heading                            | Supporting line              | —                                          | `eyebrow`, `services[]` (`title`, `description`, `image`, `icon`, `cta_text`, `cta_link`)                                                                |
| `testimonials`   | `TestimonialsSection` | —                                  | —                            | —                                          | `review_ids[]` (empty = all approved reviews); scrolling ticker                                                                                          |
| `lookbook`       | `Lookbook`            | Heading                            | Supporting line              | Fallback single image                      | `eyebrow`, `images[]`, `captions[]`, `layout: "masonry"` for the community masonry                                                                       |
| `reviews`        | `ReviewsSection`      | Heading                            | Supporting line              | —                                          | `eyebrow`, `review_ids[]` (empty = all approved reviews)                                                                                                 |
| `featured_brand` | `FeaturedBrand`       | Heading (falls back to brand name) | Body                         | Left-hand image (falls back to brand logo) | `eyebrow`, `cta_text`, `cta_link`, `brand_id`                                                                                                            |
| `brands`         | `BrandsSection`       | Heading                            | Supporting line              | —                                          | `eyebrow`, `brand_ids[]` (empty = all brands)                                                                                                            |

`cta_link` may be `#anchor`, an internal `/path`, or an absolute external URL. Internal links stay in-tab; external links open in a new tab.

Entity-driven sections (`brands`, `categories`, `products`, `spotlight`, `product_rows`, `reviews`, `testimonials`, `featured_brand`) are populated from the live catalog/moderation tables. The admin section dialog loads those lists and renders checklists/selects, so buyers add brands/categories/products/reviews once in their own admin page and pick them in the section — never hard-code entity names in `config`.

### 5A. Reuse an existing type (normal case)

Write `landing_sections` rows. Either use **Admin → Page controls → Add section**, or run a one-off DB script (phase 6). Set `visible`, `sort_order`, and the config JSON exactly as in the table. In the dialog, use the **Design** panel for colours/typography/alignment/layout and the entity pickers for brands, categories, products and reviews — don't hand-write those into the JSON box (it is stripped and re-merged on save).

### 5B. Add a new section type (when the design needs it)

Edits, in this order. The admin type dropdown is generated from `SECTION_TYPES`; design controls work for any type automatically.

1. `src/lib/cms.ts` — add to the `SectionType` union and to `SECTION_TYPES` (`value`, `label`, `hint`). If the renderer shows `section.imageUrl`, add the type to `IMAGE_SECTION_TYPES` (drives `sectionUsesImage`, which shows/hides the Image field).
2. `src/components/site/section-renderer.tsx` — add a `case` and a component that reads `section.title`, `section.subtitle`, `section.imageUrl`, `section.config`, and (if image/type supports styling) `resolveSectionStyle(section)`.
3. If the section displays existing entities (brands, categories, products, reviews), add an id-list reader in `src/lib/cms.ts` (`sectionXIds`), pass the data through `src/routes/index.tsx` (load it with a `list*Fn` from `src/lib/api.ts`), and add a picker block in `src/routes/admin/page-controls.tsx` (mirror `IdChecklist`).
4. **Update the admin save branches.** In `src/routes/admin/page-controls.tsx`, the `save()` function deletes `product_ids`, `review_ids`, `category_ids` and `brand_ids` for types it does not recognise. Add every new id-bearing type to the matching `if` branch (for example `products | spotlight | product_rows` and `reviews | testimonials`). Otherwise saving the section silently wipes its picks.
5. `src/server/defaults.ts` — optionally add a seed example.
6. `src/server/seed.ts` / product data — only if the section needs new catalog fields.
7. Tests — add a renderer assertion (type present, images render, entity filtering works).

Renderer rules:

- Read config with the local `text(config, "key", fallback)` helper; never assume a key exists.
- Use `Cta` for buttons so internal/external behaviour stays consistent.
- Accept empty data gracefully (no image → neutral block; no items → hide the section body).
- Keep Tailwind tokens from `src/styles.css`; use `text-hot-pink`/accent variables rather than hard-coded hex.
- Apply `resolveSectionStyle` so colours, typography and alignment keep working, and stack the header when `align` is `center`/`right` (see `SectionHeader`).
- Mobile-first: the template is checked at 390 px and 1440 px.
- **Do not flatten a source component.** If the source has a product quick-view eye, an image-card mega menu, a scrolling testimonial ticker or a sticky intro column, port that structure. Replacing it with a plain link, dropdown, grid or text list is a design regression, not a simplification.

### 5C. Ordering and visibility

- `sort_order` is an integer; the admin move buttons swap neighbours.
- `visible = 0` hides a section without deleting it.
- The homepage renders zero sections as a single product grid fallback; if the design intentionally has no sections, update that fallback in `src/routes/index.tsx`.

### 5D. Section design overrides (`config.style`)

Every section can override the site theme. The admin exposes this as a **Design** panel in the Add/Edit section dialog; blank fields inherit the global theme (fonts/accent) and the template defaults, so existing sections never change.

```json
{
  "style": {
    "background": "#101010",
    "titleColor": "#ffffff",
    "subtitleColor": "#d4d4d4",
    "eyebrowColor": "#ff2d95",
    "titleFont": "Bebas Neue",
    "bodyFont": "DM Sans",
    "titleSize": "xl",
    "subtitleSize": "lg",
    "align": "center",
    "uppercase": true,
    "imageSide": "left",
    "layout": "background",
    "overlay": 55
  }
}
```

Allowed tokens (anything else is dropped server-side by `cleanSectionStyle`):

| Key                                                         | Values                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| `background`, `titleColor`, `subtitleColor`, `eyebrowColor` | hex `#rgb` / `#rrggbb`                                         |
| `titleFont`, `bodyFont`                                     | one of `THEME_FONT_FAMILIES` (`src/lib/store-settings.ts`)     |
| `titleSize`                                                 | `sm` \| `md` \| `lg` \| `xl` (responsive `clamp()`)            |
| `subtitleSize`                                              | `sm` \| `md` \| `lg`                                           |
| `align`                                                     | `left` \| `center` \| `right`                                  |
| `uppercase`                                                 | boolean (title)                                                |
| `imageSide`                                                 | `left` \| `right` (banner split layouts)                       |
| `layout`                                                    | `split` \| `background` (promo, custom banner, featured brand) |
| `overlay`                                                   | 0–90 (black overlay for the background layout; default 45)     |

Rules:

- Unset = inherit. Delete the key instead of writing a blank string.
- `layout: "background"` paints the image behind the text and defaults the text to white unless a colour is set.
- Alignment on header-style sections (`categories`, `products`, `reviews`, `brands`, `lookbook`, `product_grid`) stacks the header so the title actually moves; `textAlign` alone does nothing in a shrink-wrapped flex item.
- Image-capable types are exactly `hero`, `promo`, `custom_banner`, `lookbook`, `featured_brand` (`IMAGE_SECTION_TYPES` in `src/lib/cms.ts`; `sectionUsesImage()` drives the admin field).
- `config.style` is stripped from the admin JSON box and re-merged on save; never edit it by hand in the UI, use the Design panel.

### 5E. Picker sections

Entity sections store ids, not copies. The admin loads the live lists for the pickers; empty means "show everything".

```text
{ "brand_ids": ["brand-id-1", "brand-id-2"] }
{ "brand_id": "brand-id" }
{ "category_ids": ["cat-women"] }
{ "product_ids": ["velocity-01"] }
{ "review_ids": ["review-uuid"] }
```

- `brands` → `brand_ids[]`, `featured_brand` → `brand_id` (falls back to brand name/logo).
- `categories` → `category_ids[]`, `products` → `product_ids[]`.
- `reviews` → `review_ids[]`; the storefront only receives **approved** reviews, so pending ones never render.
- Deleting an entity in its admin page leaves stale ids in config; the renderer filters them out safely.
- Public loaders: `listBrandsFn` and `listStoreReviewsFn` in `src/lib/api.ts`; admin lists come from `adminBrandsFn`, `adminCategoriesFn`, `adminProductsFn`, `adminReviewsFn`.

---

## 6. Phase 4 — Catalog, pages and vertical adaptation

### 4A. Products

Product shape (`src/lib/storefront.ts`): `id`, `name`, `color`, `price`, `originalPrice?`, `image`, `category`, `badge?`, `brand?`, `stock?`, `images?`, `tagline`, `description`, `fabric`, `composition[]`, `care[]`, `fit`, `modelNote`, `features[]`.

Required for every product:

- `id` is the URL slug (`/products/<id>`); keep it lowercase and URL-safe.
- `category` must match a `categories.slug`.
- `image` is the primary image; `images[]` holds up to **three extra gallery shots** — four images total per product.
- `price` is numeric; `originalPrice` is the compare-at price.
- `active = 1` or the storefront will not show it.
- `stock` drives low-stock admin warnings; it is not enforced at checkout by default.

Gallery and imagery:

- The admin product dialog has a **Gallery** block: `+ Add image` (max 3 extras), add/remove slots. `ImageField` uploads through `media` and returns `/api/media/:id`.
- The product page (`ProductGallery`) shows the main image, four-across thumbnails, click-to-switch, and **hover zoom** (1.9×, follows the cursor) so buyers can inspect fabric. Hero height is capped at `70vh`.
- Uploads are optimised in the browser before storage: longest edge **1600px**, WebP quality **0.82** (JPEG fallback), GIFs untouched. The 5 MB server limit still applies to the original file.
- Related pieces are **brand-first**: same brand, then same category, then the rest (`getRelatedProducts` in `src/lib/storefront.ts`). The block heading becomes "MORE FROM <BRAND>" when a brand exists.
- Every product card (homepage featured grid and `/shop`) has a **quick-view eye** that opens `src/components/site/quick-view.tsx`: image, price, stock, key specs, colourway picker, add-to-bag and full-details link. This is part of the source design — never remove the eye during a rebuild.

Write products through **Admin → Products**, or seed them in `src/server/seed.ts` for a fresh database. Existing databases need inserts/updates, not a seed edit.

### 4B. Categories and brands

- `categories` rows have `id`, `name`, `slug`, `image`.
- `brands` rows have `id`, `name`, `logo_url`.
- Sections consume these by id (see 5E), so creating a category/brand automatically makes it available in the section pickers.
- Brand logos render large in the storefront `brands` section (192px max height, 280px tiles); admin thumbnails stay small.
- The product-grid filter chips are hard-coded in `src/components/site/product-grid-section.tsx` (`all`, `sets`, `women`, `men`). If the design's collections differ, update `ProductCategory` in `src/lib/storefront.ts`, `Collection`, the filter list, and `filterProducts`.

### 4C. Content pages

Pages are built from blocks, not a single body string.

Block types (`PageBlock` in `src/lib/cms.ts`): `heading` (level 2/3), `paragraph`, `image` (url, alt, caption), `image_text` (image, alt, side, text), `list` (items), `faq` (question/answer pairs), `contact` (email/phone/address/hours), `cta` (label/href), `divider`.

Page shape:

```json
{
  "title": "About",
  "eyebrow": "Our story",
  "heroImage": "/api/media/…",
  "layout": "stacked",
  "blocks": [{ "id": "…", "type": "paragraph", "text": "…" }],
  "body": "legacy mirror of paragraph blocks"
}
```

- `layout`: `stacked` (820px column) or `two_column` (1200px, blocks side by side; images span both columns).
- Stored in `page_content.content`; **no migration** — old `{title, body}` rows are converted into paragraph blocks on read and `body` is rewritten from paragraph blocks on save.
- Admin: **/admin/pages** block builder — `+ Add block`, per-block ↑/↓/Remove, dynamic list/FAQ items, hero image upload, eyebrow and layout. Incomplete blocks block the save with a message.
- Validation: `cleanPageBlocks` drops unknown types, trims strings, limits image URLs to `/…` or `https://…`, limits CTA links to `#`, `/`, `http(s)`, `mailto:`, `tel:`, caps 60 blocks.
- To add a page key: add it to `PAGE_KEYS`, add a default in `src/server/defaults.ts`, write the row, and link it from `store_footer.companyLinks`/nav. The route `/pages/$pageKey` renders any key; no route file per page.

### 4D. Navigation and footer

- Header nav and the mega menu live in `src/components/site/site-header.tsx`. The source mega menu is **not** a plain dropdown: on first open it loads categories/products through `listCategoriesFn` + `listProductsFn` and renders category image cards (name, product count, "Shop now") beside a 260px **"Shop by need"** panel.
- The "Shop by need" links use the `/shop` search filters: `sort=best-sellers`, `maxPrice=3000&sort=price-asc`, `minRange=60`, and `inStock=1`. Do not replace them with plain `/shop` links.
- Mobile navigation lists the same categories; it can use the static slug fallback because it opens before the catalog fetch.
- Footer links are `store_footer.companyLinks` JSON: `[{ "label": "Shipping", "href": "/pages/shipping" }]`.
- Announcement bar is `store_branding.announcement`; render it only when non-empty.
- Promo popup is `store_popup`; keep it disabled unless the design calls for it.

### 4E. Reviews, coupons, orders

These already work and should stay working:

- Reviews: product detail form → `reviews`; approval controlled by `store_reviews.requireApproval`.
- Coupons: admin CRUD; checkout recalculates discount server-side.
- Orders: checkout sends items + customer; the server recomputes every price, shipping and discount, then writes `orders` + `order_items` in one transaction with an idempotency key. Client prices are ignored. No payment is collected.
- Order statuses: `new`, `processing`, `shipped`, `delivered`, `cancelled`.

### 4E2. WhatsApp, cash on delivery and FR/EN localisation

Every storefront ships a COD/WhatsApp layer. Keep it on new builds.

**Cash on delivery**

- `store_shipping.zones` is an array of `{ city, fee, freeThreshold? }`. It starts **empty by default**; until a city zone is added, `flatRate` applies to every city. Matching is case-insensitive on `customer.city`.
- `minOrder` rejects the order server-side when the subtotal is below it. `deliveryTime` is display copy. `codLabel` replaces the old "no payment" wording at checkout and on product pages.
- `validateCheckout` also requires an 8–15 digit phone number (punctuation/spaces allowed).

**WhatsApp order handoff**

- `src/lib/whatsapp.ts` builds `wa.me` links and prefilled messages (product, order, chat).
- `src/components/site/whatsapp-order.tsx` provides `WhatsAppFloat` (rendered from the header) and `WhatsAppOrderLink` (product page + confirmation screen).
- After checkout, the confirmation screen offers "Send this order on WhatsApp" with the order number, items, total, name, phone and address prefilled.
- Shop number and button label live in `store_whatsapp`, not in code.

**Automatic new-order alerts (Meta WhatsApp Cloud API)**

- `src/server/whatsapp.ts` posts a text message to `graph.facebook.com/<version>/<phone-number-id>/messages` after the order is stored. It reads `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`; the recipient comes from `store_whatsapp.ownerNumber` with `WHATSAPP_OWNER_NUMBER` as fallback, and `WHATSAPP_API_VERSION` defaults to `v20.0`.
- Do **not** add an email provider. If the env vars or owner number are missing, the alert returns `WHATSAPP_NOT_CONFIGURED` and the order still succeeds. Never roll an order back because an alert failed.
- Admin → Settings → "WhatsApp orders" edits the customer number, owner alert number, button label and opening message.
- Admin → Settings → "Shipping and cash on delivery" edits flat rate, free threshold, COD label, minimum order, delivery time and the zone list (`City|fee|free threshold`, one per line).

**Localisation**

- `src/lib/locale.tsx` holds the EN/FR dictionary, `LocaleProvider` and `useT(key, vars)`. Wrap every storefront page that renders `SiteHeader`/`SiteFooter` in `LocaleProvider` using `settings.store_locale.language`.
- French + English only. No RTL/Arabic dictionaries.
- Translate the chrome (nav, footer, bag, product actions, checkout fields, COD/shipping copy, confirmation). Admin stays English.
- `store_locale.language` is editable in Admin → Settings → Language; the default is `en` for apparel templates and `fr` for Moroccan shops.
- New UI strings go in both dictionaries; do not hard-code English in components that the provider covers.

**Files added by this layer**

`src/lib/locale.tsx`, `src/lib/whatsapp.ts`, `src/server/whatsapp.ts`, `src/components/site/whatsapp-order.tsx`, plus the `store_shipping`/`store_whatsapp`/`store_locale` defaults and settings cards.

### 4F. Vertical adaptation checklist (non-apparel designs)

The template ships as an apparel store. When the landing page is coffee, skincare, furniture, digital goods, etc., change these deliberately:

- [ ] `ProductCategory` union and the filter chips (`product-grid-section.tsx`).
- [ ] Size selector and size chart (`sizes` in `product-grid-section.tsx` and `products/$productId.tsx`, `sizeChart`/`fitNotes`/`measuringNotes` in `src/lib/storefront.ts`). Replace with variant options or remove.
- [ ] Product fields that no longer apply (`fabric`, `composition`, `care`, `fit`, `modelNote`). Either repurpose them (e.g. ingredients/specs) or adjust the product detail/admin form.
- [ ] Meta copy in `src/routes/index.tsx`, product route, `README.md`, `INSTRUCTIONS.md` (titles, descriptions, "tracksuits" wording).
- [ ] Seed products, categories, brands and images.
- [ ] Footer/company links and contact copy.
- [ ] Checkout fields: address/phone are required by `src/lib/checkout.ts`; relax them for digital goods if needed.
- [ ] Reviews: keep author/rating/title/body; drop image upload if irrelevant.

Do not leave apparel wording ("tracksuit", "size S", "fabric") in a non-apparel build.

---

### 4G. Design fidelity — "make it look like the source", exactly

Approximating a design is a defect. Work through this before calling the homepage done.

**Colours**

- [ ] Copy the source's **exact hex values**. Do not convert to `oklch` by eye — `oklch(0.13 0 0)` is not `#050505`.
- [ ] Register the source's raw scale as Tailwind tokens in `@theme` (`--color-ink-900`, `--color-lime-400`, `--color-orange-500` …) so markup can use `bg-ink-900`, `text-lime-400`, `border-ink-700`.
- [ ] Map the semantic tokens (`--background`, `--border`, `--muted-foreground` …) onto those raw values, so every existing component inherits the new palette.
- [ ] Keep the accent wired through `store_theme.accent`; `ThemeStyle` writes `--hot-pink`, so accents stay admin-editable.
- [ ] Fix contrast when the canvas changes: lime/secondary buttons need `text-primary-foreground`, not `text-foreground`.
- [ ] Prove it after the build: the served CSS must contain the exact hex values (`curl` the stylesheet and grep `#050505`, `#c6f432`, …).

**Typography**

- [ ] Display and body families match the source, and are in the Google Fonts `<link>` in `src/routes/__root.tsx`.
- [ ] Copy **casing matches**. Many designs are title case; do not force `uppercase` on headings. Only eyebrows/labels are usually uppercase.
- [ ] Weight and tracking match (`font-extrabold`, `tracking-[0.2em]` eyebrows, …).

**Composition**

- [ ] Compare the hero against the source: full-bleed background with gradient overlays vs. split text/image. Rebuild the renderer if it differs — the hero is a section type, not a fixed layout.
- [ ] Check section furniture: dividing rules, eyebrow placement, heading sizes, spacing rhythm.
- [ ] Check chrome: header surface (transparent over hero vs. solid), announcement bar colours, footer background band.
- [ ] **Check interactive components:** every product card has the quick-view eye; the mega menu is the image-card + "Shop by need" layout; category tiles open `/shop?category=<slug>`; the "Shop by need" links actually filter the shop grid.
- [ ] Audit in the browser at 390 px and 1440 px, hard-refresh after a palette change. Open the mega menu and a quick-view dialog in the audit, not just the page at rest.

**Content**

- [ ] Brand, headline, subhead and CTA text copied from the source (or client copy), not paraphrased.
- [ ] Numbers quoted in copy are true for the catalog you seeded (range, speed, load).
- [ ] Vertical words match the catalog. If the source says "e-bikes" but the catalog is scooters (or vice versa), change the word — never leave a wrong product category in the copy.

---

## 7. Phase 5 — Turso, auth and Google

### 5A. Database configuration (pick one)

**Environment mode (recommended for a deployed store):**

```
TURSO_DATABASE_URL=libsql://<db>-<org>.turso.io
TURSO_AUTH_TOKEN=<token>
```

**Setup mode (buyer enters credentials in the admin):**

`/admin/setup` tests and saves `db_url` + `db_token` into the bootstrap database's `settings` table. The effective client switches at runtime; the admin is signed out of the old DB and must create the owner on the new one.

Rules:

- Turso is the only database. Do not add Postgres/Supabase/Firebase.
- **Reuse the credentials that already exist.** Read the project's `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` from `.env`; do not create a new database or token for every rebuild.
- **Credentials are brand-scoped.** A token belongs to one database. If the existing URL/token points at another brand (check `store_branding`), do not use it — ask the user to add the new database URL/token to `.env`.
- `.env` is gitignored and excluded from the buyer zip.
- Local `file:.data/<brand>.db` is created and seeded on first request; delete it to reseed.
- Seed statements are `INSERT OR IGNORE`; they never overwrite live rows.

### 5B. Admin

- `/admin/login` signs in the seeded owner. On a fresh DB, `seedDefaultOwner` in `src/server/db.ts` creates **`admin@email.com` / `123456789`** with a PBKDF2 hash. The first-run owner form only appears if that seed is disabled or the admin row is removed.
- **This rule applies to every storefront in this workspace, including `veloz-store` and `veloz-v2-store`.** Do not leave a port on first-run owner setup. If a store lacks the seed, retrofit it from `tracksuitsites` before calling it up to date:
  1. Copy `src/server/password.ts` (`hashPassword` / `verifyPassword`, PBKDF2).
  2. Add `DEFAULT_ADMIN_EMAIL = "admin@email.com"` and `DEFAULT_ADMIN_PASSWORD = "123456789"` to `src/server/db.ts`.
  3. Call `seedDefaultOwner(client)` immediately after `seedPages(...)` in the bootstrap.
  4. Refactor `src/server/auth.ts` to use the shared password helpers.
  5. Drop the local DB (or use a scratch DB) and prove the seeded login works.
- Retrofitting an existing database is safe: `seedDefaultOwner` only inserts when no `admin` row exists, so it never overwrites a rotated password.
- The default owner is intentional (user instruction). Rotate the password before a public launch and keep the credentials out of chat.
- Optional `OWNER_SETUP_KEY` gates that first-run form.
- Every admin server function re-checks the session and role; the route loader is only a UX guard.
- Roles: `admin`, `moderator`, `customer`. Staff sign in with email + password only.
- After implementing a site, set/rotate the owner password in **Admin → Setup**.

### 5C. Shopper accounts and Google

- Email/password registration and login on `/account`.
- Guest checkout never requires an account.
- Google is **direct Google OAuth**; there is no Supabase broker.

**Account recovery (no email provider).** Every store must ship a working “Forgot password?” path without email:

- `password_resets` stores one-time codes: `code_hash`, `status` (`pending` → `code_issued` → `used`/`cancelled`), `attempts`, `expires_at`.
- A customer submits the recovery form; the request is stored as `pending`. The API always returns `{ ok: true }`, whether or not the email exists (no account enumeration).
- Admin → Customers → **Password recovery** lists pending requests. **Generate code** creates an 8-character code, stores only its PBKDF2 hash, expires it in 30 minutes and shows it once with a prefilled `wa.me` link. Admin can also use **Reset** on any customer row.
- The customer enters email + code + new password. On success the server updates the hash, deletes every session for that user, marks the row `used`, and rejects reuse.
- Five wrong attempts lock the code; request a new one. Passwords stay 8–128 characters.
- Shared UI: `src/components/account-recovery.tsx` (`AccountRecovery`). It is included from `SignedOut` on `/account`; keep it design-neutral so every theme can reuse it.
- Staff/admin passwords are **not** recoverable through this flow. Admins sign in with the seeded owner and rotate it in Setup.

**Reuse the existing Google client.** The workspace already has one OAuth client in the template `.env`; copy its `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into the new store's `.env`. Do not create a second Google client for each store. Only the redirect URI changes.

```
GOOGLE_CLIENT_ID=<existing client>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<existing secret>
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback
```

Use the origin the existing client already trusts (in this workspace **8080**). If the store must run on another port, add `http://localhost:<port>/api/auth/google/callback` to the same OAuth client in Google Console **before** testing. Never run two stores on the same port.

Google Cloud Console → OAuth client → Authorised redirect URIs must contain the **exact** callback:

```
<origin>/api/auth/google/callback
```

Flow: `/api/auth/google` → Google consent → `/api/auth/google/callback` → verify state cookie → exchange code → `upsertOAuthUser` (role `customer`) → session cookie → `/account`.

Guardrails:

- Staff emails are rejected by the callback; admin stays email + password.
- The button only renders when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (`authOptionsFn`).
- Without credentials, shoppers still use email/password or guest checkout.
- In production, set `GOOGLE_REDIRECT_URI` to the deployed origin; never rely on the localhost default.
- `redirect_uri_mismatch` means the console does not have the exact origin. Add it to the **existing** client, or move the project to the registered origin (8080 here). Do not create a new client to work around it.
- Route ids are `/api/auth/google/` (directory index) and `/api/auth/google/callback`; do not hand-edit `src/routeTree.gen.ts`.

---

### 5D. SaaS / marketplace variant

Some projects are not a plain shop. They are a **single-tenant SaaS**: the buyer gets an agency/company site first, then can switch on a marketplace with seller accounts and subscriptions. Keep this pattern reusable.

**Default state: agency mode (marketplace OFF).** The site owner manages listings, content and inquiries. There is no public seller signup, no seller dashboard, no pricing page and no subscription checkout. The UI hides those routes, and every seller/subscription server function also checks the flag so the routes cannot be reached directly.

**Admin activation.** Store `store_marketplace` in settings:

```
store_marketplace: {
  enabled: false,
  proMonthly: 10,
  unlimitedMonthly: 90,
  proAnnual: 96,
  unlimitedAnnual: 864
}
```

Admin → Settings → Marketplace edits the flag and prices. On save, the server must re-check the session and role; never trust the client.

**Turning it off.** Block deactivation while active subscriptions exist:

```ts
if (key === "store_marketplace" && value.enabled === false) {
  const active = await countActiveSubscriptions(client);
  if (active > 0) throw new Error(`Cancel ${active} active subscription(s) first.`);
}
```

This prevents charging sellers for a marketplace that is switched off.

**Seller role.** Add `seller` to the role union and `ROLE_OPTIONS`. `becomeSeller` is allowed only when the marketplace is on; it replaces the `customer` role and is idempotent. Seller APIs use `requireSeller` (admin also allowed). Ownership is checked on every update/delete, not just in the UI.

**Plans and limits.** Keep the plan limits in one server function:

| Plan      | Active listings |
| --------- | --------------- |
| Free      | 1               |
| Pro       | 5               |
| Unlimited | unlimited       |

Enforce the limit when a listing is created, not only when it is displayed. Seller submissions enter as `pending`; admin approval makes them `active`.

**PayPal subscriptions.** Use env only:

```
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox
PAYPAL_PLAN_PRO=
PAYPAL_PLAN_PRO_ANNUAL=
PAYPAL_PLAN_UNLIMITED=
PAYPAL_PLAN_UNLIMITED_ANNUAL=
PAYPAL_WEBHOOK_ID=
APP_URL=http://localhost:<port>
```

- Create subscription server-side, store `pending` with the PayPal subscription id, return the approval URL to the client.
- Webhook at `/api/paypal/webhook` verifies `PAYPAL_WEBHOOK_ID` with PayPal's `verify-webhook-signature` endpoint, then syncs `ACTIVATED`/`CANCELLED`/`EXPIRED`/`SUSPENDED` into `subscriptions`.
- On activation, promote the user to `seller`.
- Cancellation is server-side and only for the signed-in user's own subscription.
- If PayPal env is unset, the UI must fail gracefully; the rest of the site keeps working.

**Database tables.** `properties` (with `seller_id`, `status`, `featured`), `property_inquiries`, `saved_properties`, `saved_searches`, `subscriptions`, `testimonials`, `site_content`, `listing_options`. Keep ownership columns indexed.

**Tests to add.** Free-plan limit, second listing rejection, seller ownership, admin approval, marketplace-off blocking, active-subscription deactivation block, webhook status mapping.

### 5E. Deployment targets (Vercel, Cloudflare Pages, Workers)

The build target is chosen by `NITRO_PRESET`, read in `vite.config.ts`. The default is Cloudflare Workers.

| Target             | `NITRO_PRESET`                | Build output      | Settings                                                                     |
| ------------------ | ----------------------------- | ----------------- | ---------------------------------------------------------------------------- |
| Cloudflare Workers | `cloudflare-module` (default) | `.output/`        | `wrangler deploy`                                                            |
| Cloudflare Pages   | `cloudflare_pages`            | `dist/`           | Framework None, output `dist`, flag `nodejs_compat`                          |
| Vercel             | `vercel`                      | `.vercel/output/` | Framework preset **Other**, `bun install`, `bun run build`, empty output dir |

Three rules:

1. Use **`cloudflare_pages` with an underscore**. Nitro 3 silently ignores `cloudflare-pages` and builds the Workers bundle, which then fails on Pages.
2. **`nodejs_compat` is mandatory on Cloudflare.** Password hashing and `node:crypto` fail at runtime without it.
3. **`NITRO_PRESET` must be set at build time** on the host, not only at runtime. Vercel reading a Workers bundle is the usual "deployed but 404" symptom.

Serverless hosts have no persistent disk, so production always needs Turso (`libsql://` + token). Every project ships a `DEPLOYMENT.md` with the platform-specific steps, the env table and a first-deploy checklist. Keep it in sync when a new env var is added.

After deploy, check `/`, `/admin/login`, one write, and (if configured) an image upload. A deploy that "succeeded" with a 500 on every page is almost always a missing `TURSO_*`.

### 5F. Licensing

Every project ships two license documents:

- `LICENSE.md` — **Standard**: up to three live sites on three domains, for the buyer or their clients; local development does not count; no resale of the source.
- `LICENSE-EXTENDED.md` — **Extended**: unlimited sites and paid client work; still no resale of the source.

Wire the same terms into the marketplace's `/license` page and FAQ so the buyer reads one story before and after purchase.

Runtime activation is **off by default**:

```env
LICENSE_DISABLED=1
# LICENSE_SERVER_URL=https://<license-worker>.workers.dev
# LICENSE_PUBLIC_KEY={"crv":"Ed25519","kty":"OKP","x":"..."}
LICENSE_PRODUCT=<project-slug>
```

- `src/server/license.ts` verifies an Ed25519 grant bound to the request host and stores it in `settings`.
- `requireLicense()` guards **admin writes only**. The public storefront always renders, which is why previews and demos need no key.
- `activateLicense()` calls `${LICENSE_SERVER_URL}/v1/activate`; the license worker mints keys at `/v1/keys` and enforces `max_domains` (default **3**).
- `localhost` never consumes a domain slot; the seller can release a domain with `/v1/deactivate`.
- The public JWK is safe to ship. The private key and the worker's admin password never go into a repo, a zip or a chat message.

Per project, set the real `LICENSE_PRODUCT` (`tracksuitsites`, `veloz-store`, `unccode-estate`, …) — the placeholder `track-suit-society` is not acceptable in a delivery.

### 5G. One database, multiple versions of one site

When the same store ships in several visual versions — theme variants, A/B layouts, a white-label skin — point every version at **one Turso database**. The catalog, orders, customers, reviews and settings stay single-source; only the presentation differs.

Real example from this workspace: `dogositeone` (PetPals orange), `dogositetwo` (PetPals green) and `dogositethree` (Hearth & Hound cream) all use the same `dogocat-unccode` Turso database. One catalog, three skins.

**Share one DB when all versions have:**

- The same products, prices, categories and stock.
- The same orders, customers and reviews.
- The same operational settings (shipping, contact, homepage composition).
- Only the theme, typography, layout, imagery or brand chrome differ.

**Use separate DBs when any version has:**

- Its own catalog, prices, currencies or stock.
- Its own orders/customers (separate businesses).
- Its own admin team or legal entity.
- A different homepage structure or shipping policy that the admin must edit independently.

#### Set-up

1. **One credential set.** Copy the same `libsql://…` URL and token into every version's `.env`:

   ```
   # tracksuitsites / UNC CODE
   TURSO_DATABASE_URL=libsql://<shared-db>.turso.io
   TURSO_AUTH_TOKEN=<token>

   # dogocat-style client-side variants
   VITE_TURSO_DB_URL=libsql://<shared-db>.turso.io
   VITE_TURSO_AUTH_TOKEN=<token>
   ```

2. **One canonical schema/seed.** Only one version owns migrations and seed scripts. `INSERT OR IGNORE` makes re-running safe, but never run `seed:all` against a live shared database — it can add demo rows to every version.

3. **Differences live in code and assets, not the database.**

   | Difference                          | Where it belongs                                                                                 |
   | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
   | Palette, type scale, radii, shadows | `src/styles.css` in each version                                                                 |
   | Font links                          | `src/routes/__root.tsx` in each version                                                          |
   | Brand name                          | `src/lib/brand.ts` override (committed) or `VITE_BRAND_NAME`                                     |
   | Logo / hero / product imagery       | `public/` and `src/assets/` per version                                                          |
   | Section layout order                | Component code per version, or a different `homepage_sections` only if the order is truly shared |
   | Copy blocks unique to a skin        | Local component copy, not `settings`                                                             |

4. **Brand override pattern.** The database's `store_branding.name` is shared, so a variant with a different name needs a local override that wins after the DB merge. Keep it committed so it survives a clone, with an optional env override for deployments:

   ```ts
   // src/lib/brand.ts
   export const BRAND_OVERRIDE = "Hearth & Hound"; // "" lets the admin/DB control it
   ```

   ```ts
   // src/hooks/useSettings.tsx (or the template's settings reader)
   import { BRAND_OVERRIDE as LOCAL_BRAND_OVERRIDE } from "@/lib/brand";

   const ENV_BRAND_OVERRIDE = import.meta.env["VITE_BRAND_NAME"]?.trim();
   const BRAND_OVERRIDE = ENV_BRAND_OVERRIDE || LOCAL_BRAND_OVERRIDE;

   setSettings({
     ...defaultSettings,
     ...dbSettings,
     ...(BRAND_OVERRIDE ? { brand_name: BRAND_OVERRIDE } : {}),
   });
   ```

   Precedence: `VITE_BRAND_NAME` → `src/lib/brand.ts` → database `store_branding.name`.

5. **Per-version theme stays in CSS.** `store_theme` is a shared DB row. If each version must keep its own palette, do not drive it from the admin Theme page; keep the tokens in `src/styles.css` and ignore or override `store_theme`. Admin Theme edits then affect all versions by design.

#### Operating rules

- **A write is global.** Editing a product, section, review or order in one admin changes every version. That is the point; announce it before bulk edits.
- **Cleaning data is global.** Deleting a test product removes it from every skin. Do the cleanup once, from one project, then re-check all versions.
- **Accounts are global.** Admins and customers live in the shared DB. Sessions are per browser/origin; logging in on one version does not automatically sign the user in on a different domain, but the same credentials work everywhere.
- **Settings are global.** `store_branding`, `store_contact`, `store_shipping`, `store_popup`, `store_megamenu`, `store_locale` and `store_marketplace` are shared. If two versions need different values, use a local override (brand only) or split the DB.
- **Media is global.** Database media rows are shared; R2 buckets are shared if the env is the same. Per-version images should live in `public/`.
- **Never run two versions on the same port.** Give each a different `PORT` or start them one at a time.
- **Client-exposed tokens.** In `VITE_TURSO_*` projects the token is bundled into the browser. Treat a shared demo database as public, read/write demo data only. Production stores should use server-side `TURSO_*` or a separate DB per store.

#### Verify a shared-DB variant

- Both versions show the same product count and the same order.
- A product edit in version A appears in version B after refresh.
- Version A's brand and accent stay correct; version B's brand override wins.
- Mobile at 390 px has no horizontal overflow on either.
- No broken images, no test rows, no duplicate hard-coded sections.
- Admin login works on both; sessions do not leak across unrelated domains.

#### Split later without code changes

1. Create a new Turso database.
2. Copy the schema and the rows you want to keep (or run the canonical seed).
3. Put the new URL/token in that version's `.env`.
4. Rotate the old token if it was shared with a public client.
5. Re-check the version's brand override, settings and admin login.

---

### 5H. Transactional email (Resend)

Every store ships transactional email through **Resend**. One account and one API key serve all template builds; the sender and brand change per project.

**Environment (server-only — never `VITE_`):**

```env
EMAIL_ENABLED=1
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_...
EMAIL_FROM="NORVEN <orders@unccode.site>"
EMAIL_REPLY_TO=orders@unccode.site
EMAIL_OWNER=owner@example.com
EMAIL_TEST_TO=owner@example.com
EMAIL_BRAND=NORVEN        # static Vite stores only
```

- `EMAIL_FROM` must be a verified Resend sender on the shared domain (`unccode.site`).
- `EMAIL_API_KEY` stays in `.env` and in the host's secret store; it never enters the repo, the browser bundle or the buyer zip.
- `EMAIL_OWNER` receives new-order alerts; `EMAIL_TEST_TO` receives the admin test send.
- If email is unset or Resend is down, **checkout still succeeds**. The email layer is a no-op, never a dependency.

**TanStack Start stores (tracksuitsites, norven-store):**

- `src/server/email.ts` — Resend HTTP sender, order confirmation, owner alert, password reset, test send, `emailStatus()`.
- `src/server/orders.ts` — after the order transaction, `sendOrderEmails(...)` sends both messages.
- `src/lib/admin-api.ts` — `adminEmailStatusFn`, `adminSendTestEmailFn`; password-reset generation also emails the code and returns `emailed`.
- `src/routes/admin/settings.tsx` — **Email (Resend)** card with status, sender and **Send test email**.
- Tests skip real sends when `NODE_ENV=test`.

**Static Vite stores (dogositeone, dogositetwo, dogositethree):**

- `server/email.ts` — dependency-free Resend sender + order templates.
- `api/send-order-email.ts` — Vercel **Edge** function; the browser POSTs the order payload after the Turso insert.
- `vite.config.ts` — local dev middleware for `/api/send-order-email`, plus `loadEnv` so the server-only `EMAIL_*` values are available in dev.
- Checkout collects a required **email** field; the order is saved first, email is attempted after. A failed email never blocks the order.
- Deploy on Vercel with the `EMAIL_*` variables set in the project; the key is never exposed to the client.

**Deliverability checklist:**

1. Resend → Domains → add `unccode.site`, publish SPF + DKIM, then DMARC (`p=none` initially).
2. Wait for **Verified** before using `orders@unccode.site` for customer mail.
3. Admin → Settings → **Send test email**; confirm the inbox and check spam.
4. Place one real test order; confirm the customer receipt and the owner alert.
5. Re-check that the zip has no `.env` and no `re_` key.

**Rules:**

- Never put `EMAIL_API_KEY` behind `VITE_` or import it into client code.
- Never hard-code the key in source, docs, chat or a zip.
- Keep one shared Resend key for all templates; rotate it if it is ever pasted into chat.
- The design source repo is not the destination for the finished store or its secrets.

---

## 8. Phase 6 — Writing data

Prefer the admin UI for a handful of edits. For a full landing page (many sections/products), use a temporary Node script with the same libSQL client. Pattern:

```js
// .tmp-apply.mjs — delete after use, never commit
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const db = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

// Idempotent section upsert
await db.execute({
  sql: `INSERT INTO landing_sections
        (id, section_key, type, title, subtitle, image_url, visible, sort_order, config, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(section_key) DO UPDATE SET
          type = excluded.type, title = excluded.title, subtitle = excluded.subtitle,
          image_url = excluded.image_url, visible = excluded.visible,
          sort_order = excluded.sort_order, config = excluded.config,
          updated_at = CURRENT_TIMESTAMP`,
  args: [
    "sec-hero-main",
    "hero_main",
    "hero",
    "HEADLINE",
    "Subhead",
    "/products/hero.jpg",
    1,
    0,
    JSON.stringify({ eyebrow: "...", cta_text: "Shop", cta_link: "#shop" }),
  ],
});

// Settings are JSON strings; merge before writing so partial edits are safe
const row = await db.execute({
  sql: "SELECT value FROM settings WHERE key = ?",
  args: ["store_branding"],
});
const current = row.rows[0] ? JSON.parse(String(row.rows[0].value)) : {};
await db.execute({
  sql: `INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  args: [
    "store_branding",
    JSON.stringify({ ...current, name: "BRAND", logoText: "BRAND", announcement: "..." }),
  ],
});

// Products: upsert on id, keep sort_order stable
await db.execute({
  sql: `INSERT INTO products
        (id, slug, name, color, price, original_price, image, category, brand, badge,
         tagline, description, fabric, composition, care, fit, model_note, features,
         images, stock, active, sort_order)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, price = excluded.price, image = excluded.image,
          category = excluded.category, description = excluded.description,
          active = excluded.active`,
  args: [
    "product-01",
    "product-01",
    "Product",
    "Colour",
    120,
    null,
    "/products/product-01.jpg",
    "sets",
    "BRAND",
    null,
    "Tagline",
    "Description",
    "Fabric",
    JSON.stringify(["Material"]),
    JSON.stringify(["Care"]),
    "Fit",
    "Model note",
    JSON.stringify(["Feature"]),
    JSON.stringify([]),
    25,
    1,
    0,
  ],
});

// Section design overrides live in config.style; merge so ids/fields survive
const sectionRow = await db.execute({
  sql: "SELECT config FROM landing_sections WHERE id = ?",
  args: ["sec-hero-main"],
});
const sectionConfig = sectionRow.rows[0] ? JSON.parse(String(sectionRow.rows[0].config)) : {};
await db.execute({
  sql: "UPDATE landing_sections SET config = ? WHERE id = ?",
  args: [
    JSON.stringify({
      ...sectionConfig,
      style: { ...(sectionConfig.style ?? {}), align: "center", titleColor: "#101010" },
    }),
    "sec-hero-main",
  ],
});

// Content pages are block-based; keep body in sync for legacy readers
await db.execute({
  sql: `INSERT INTO page_content (page_key, locale, content, updated_at)
        VALUES (?, 'en', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(page_key, locale) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP`,
  args: [
    "about",
    JSON.stringify({
      title: "About",
      eyebrow: "Our story",
      heroImage: "",
      layout: "stacked",
      blocks: [{ id: "block-1", type: "paragraph", text: "Copy goes here." }],
      body: "Copy goes here.",
    }),
  ],
});

console.log("applied");
db.close();
```

Rules:

- Confirm the target first: `SELECT value FROM settings WHERE key='store_branding'` must show **this** project's brand. If it shows another brand's name, stop — you are pointed at the wrong database.
- Get an explicit go-ahead before the first write. Probe read-only, report counts, then write.
- Read credentials from `.env`; never hard-code them.
- Use `ON CONFLICT` upserts so the script is safe to re-run.
- Merge JSON objects for settings; replacing a whole settings key can drop fields.
- Merge section `config` before writing; replacing it drops `style` and the entity id arrays (`brand_ids`, `category_ids`, `product_ids`, `review_ids`).
- Products: `images` is a JSON array of up to three extra gallery URLs; `image` stays the primary.
- Page content: `blocks[]` plus the legacy `body` mirror; unknown block fields are dropped by `cleanPageBlocks`.
- Delete the script and any log files afterwards.
- Verify counts after writing (phase 7).

---

## 9. Phase 7 — Verification protocol

### 7A. Static gates

```sh
bun run build      # regenerate route tree first
bun run test
bun run typecheck
bun run lint
bun run build
```

Expected: tests all pass, TypeScript clean, lint has **0 errors** (warnings allowed), build exit 0.

### 7B. Runtime smoke test

Stop any old dev server first (it holds `routeTree.gen.ts`). Then:

```powershell
bun run dev   # background
Start-Sleep -Seconds 4

foreach ($path in @("/", "/shop", "/shop?category=<slug>", "/shop?maxPrice=3000", "/shop?minRange=60", "/shop?inStock=1", "/account", "/checkout", "/admin/login", "/admin", "/api/auth/google", "/api/auth/google/callback", "/pages/about", "/products/<id>")) {
  $status = curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8080$path"
  Write-Output "$path -> $status"
}
```

Expected matrix:

| Path                                                | Expected                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                                 | 200, new copy and images present                                          |
| `/shop`                                             | 200, full catalog                                                         |
| `/shop?category=<slug>`                             | 200, only that category                                                   |
| `/shop?maxPrice=3000` / `minRange=60` / `inStock=1` | 200, filters applied                                                      |
| `/products/<id>`                                    | 200 for a real product                                                    |
| `/checkout`                                         | 200                                                                       |
| `/account`                                          | 200, Google button when configured, guest checkout link                   |
| `/admin/login`                                      | 200                                                                       |
| `/admin` signed out                                 | 307 → `/admin/login`                                                      |
| `/api/auth/google`                                  | 303 → `accounts.google.com` with the right `client_id` and `redirect_uri` |
| `/api/auth/google/callback` without code            | 303 → `/account?google=state` (safe)                                      |
| `/pages/<key>`                                      | 200                                                                       |

Also verify server-rendered content, not just status codes:

```powershell
$html = curl.exe -s "http://localhost:8080/"
if ($html -match "NEW HEADLINE") { "copy ok" } else { "copy FAIL" }
```

### 7C. Admin and data checks

1. Sign in at `/admin/login`.
2. Dashboard counts match the database.
3. Page controls lists every section in the right order.
4. Edit a section title → storefront changes on refresh.
5. Edit a product price → product page and checkout quote change.
6. Place a test order as a guest → it appears in Orders with the right total.
7. Apply a coupon → discount is recalculated server-side.
8. Upload an image → `/api/media/:id` serves it, and the stored file is optimised (1600px/WebP).
9. Change theme accent → storefront updates.
10. Section design: set background/title colour, typography and **alignment (left/centre/right)** → save, reopen the section and confirm the values persisted, and the storefront title moved.
11. Picker sections: add a brand, category, product and approved review in their admin pages, then pick them in a section → only the picks render; clear the picks → all render.
12. Product gallery: add 2–3 gallery images → thumbnails appear, click switches the main image, hover zooms; a fifth image cannot be added.
13. Page blocks: add/reorder/remove blocks, switch layout to **Two columns**, add a hero image → `/pages/<key>` matches.
14. **Quick view:** every product card shows the eye button; it opens the dialog with image, price, stock, specs and colourway; add-to-bag works and Escape closes it.
15. **Mega menu:** hovering Shop opens the image-card grid with product counts and the "Shop by need" panel; each need link lands on `/shop` with the filter applied.
16. **Shop filters:** category tiles land on `/shop?category=<slug>`; `maxPrice`, `minRange` and `inStock` narrow the grid; search and saved still work after filtering.
17. Delete the test order/coupon/customer afterwards, or use a disposable database.

Data sanity query:

```sql
SELECT
  (SELECT COUNT(*) FROM products) AS products,
  (SELECT COUNT(*) FROM landing_sections) AS sections,
  (SELECT COUNT(*) FROM page_content) AS pages,
  (SELECT COUNT(*) FROM settings) AS settings,
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM orders) AS orders;
```

### 7D. Google check

```powershell
curl.exe -s -D - -o NUL "http://localhost:8080/api/auth/google" | Select-String "location:"
```

Confirm `client_id` and `redirect_uri` exactly match the Google Console entry. A mismatch produces `redirect_uri_mismatch` at Google, not in the app.

Then fetch the authorize URL with the browser user-agent; the consent page must return **200** and must not contain `redirect_uri_mismatch`. Use the **existing** client and the origin already registered (8080 here).

---

## 10. Phase 8 — Finish and package (only on request)

Do **not** rebuild the zip at the end of every session or every change. Verification is per-change; packaging is a release batch.

| Moment                                    | Action                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| During development                        | typecheck / test / lint / build; leave the existing zip untouched                            |
| Project passes §12                        | move it to `finished-websites\<project-slug>`, create its new GitHub repo, update `INDEX.md` |
| User says “zip them all / finish them up” | run the **§0E batch** and rebuild every requested zip in `finished-websites\builds`          |

During the batch, confirm each zip has **no `.env`**, `.data`, `node_modules`, `.output`, `.git` or logs, and includes the new routes/assets, `DEPLOYMENT.md`, `LICENSE.md` and `LICENSE-EXTENDED.md`. `.env.example` must list `NITRO_PRESET`, the `R2_*` block and `LICENSE_PRODUCT` so the buyer can deploy and understand storage.

Before zipping, run the **§0D cleanup**:

- the landing-page source folder is deleted (or archived in `finished-websites/builds/sources/` if it has no remote);
- `.screens/`, probe scripts and temp logs are gone;
- no duplicate `PLAYBOOK.md` exists in the store (the canonical copy stays in `tracksuitsites`);
- the buyer zip excludes `PLAYBOOK.md`, `.env`, `.data`, `.output`, `node_modules`, `.tanstack`, `.wrangler`, `docs`, `.superpowers`, `*.log` and `*.tsbuildinfo`;
- `finished-websites` contains the finished stores, `INDEX.md` and `builds/`, not source exports.

Commit message convention: `feat: implement <brand> landing page`, `fix: ...`, `chore: ...`.

---

## 11. Gotchas that have already bitten us

| Symptom                                                  | Cause                                                                            | Fix                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `routeTree.gen.ts was modified by another process`       | Dev server and build writing the route tree together                             | Stop the dev server before `bun run build`                                                                                       |
| New route 404s                                           | Route tree not regenerated                                                       | Run `bun run build`, then restart dev                                                                                            |
| `/auth/google` 404 after moving to `/api/auth/google`    | Old route file deleted; route id is the directory index                          | Use `/api/auth/google` and route id `/api/auth/google/`                                                                          |
| Google `redirect_uri_mismatch`                           | Console URI ≠ `GOOGLE_REDIRECT_URI` ≠ actual path                                | Make all three identical, including scheme, port and `/api/auth/google/callback`                                                 |
| Admin data changes do nothing on a fresh clone           | Defaults seed only fresh DBs (`INSERT OR IGNORE`)                                | Write to the live DB via admin or SQL                                                                                            |
| Storefront shows old copy                                | DB rows, not defaults, are the source                                            | Update `landing_sections` / `settings`                                                                                           |
| Empty store instead of seed catalog                      | DB is reachable but empty                                                        | Seed products or add via admin; fallback only applies when the DB is unreachable                                                 |
| `.env` values missing in dev                             | File saved as UTF-16/BOM                                                         | Save UTF-8 without BOM                                                                                                           |
| SQL script prints secrets                                | Logging connection strings                                                       | Never log `TURSO_AUTH_TOKEN` or `GOOGLE_CLIENT_SECRET`                                                                           |
| Google button invisible                                  | Only one of `GOOGLE_CLIENT_ID` / `SECRET` set                                    | Set both; `authOptionsFn` requires both                                                                                          |
| Google signs in an admin                                 | Staff emails must not use Google                                                 | Callback rejects `admin`/`moderator`; keep it that way                                                                           |
| Checkout total differs from client                       | Server recomputes prices/shipping/discount                                       | Trust the server result; never send client prices                                                                                |
| Zone fee ignored                                         | `store_shipping.zones` empty or city mismatch                                    | Add `City                                                                                                                        | fee | free threshold` in Admin → Settings; matching ignores case |
| WhatsApp alert never arrives                             | Env vars or owner number missing, or Meta number not approved                    | Set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` + owner number; check the API response                                         |
| Order fails when WhatsApp is down                        | Alert treated as part of the transaction                                         | Keep `sendOrderWhatsAppAlert` fire-and-forget; never throw or roll back                                                          |
| French text missing / English flashes                    | Page not wrapped in `LocaleProvider`                                             | Wrap every route that renders `SiteHeader`/`SiteFooter`                                                                          |
| Placing an order fails with a placeholder quote          | Quote request validates the phone                                                | Keep a valid placeholder phone in `QUOTE_CUSTOMER`                                                                               |
| Customer cannot reset a password                         | No email provider configured                                                     | Use Admin → Customers → Generate code; the customer enters it on `/account` (no email needed)                                    |
| Recovery reveals whether an email exists                 | Response differs for unknown accounts                                            | `requestPasswordResetFn` must always return `{ ok: true }`; never return a 404                                                   |
| Product missing from storefront                          | `active = 0`                                                                     | Set `active = 1`                                                                                                                 |
| Images break after build                                 | Imported hashed asset stored in DB                                               | Use `public/` paths or `/api/media/:id`                                                                                          |
| `$HOME` assignment fails in PowerShell                   | `$HOME` is read-only                                                             | Use `$html` or another variable name                                                                                             |
| Admin role lost after DB switch                          | New database has no users                                                        | Create the owner on the new DB at `/admin/login`                                                                                 |
| Admin login missing on a fresh DB                        | `seedDefaultOwner` did not run or was skipped                                    | Keep the call after `seedPages` in `src/server/db.ts`; it inserts `admin@email.com` / `123456789` once                           |
| Store shows first-run owner setup not the default admin  | Port copied from an older template without the seed                              | Retrofit `password.ts`, `DEFAULT_ADMIN_*`, `seedDefaultOwner` and the `auth.ts` refactor (5B), then test on a fresh DB           |
| Section title ignores alignment                          | Header sits in a shrink-wrapped flex item, so `textAlign` has no width to act on | Header-style sections stack when aligned; keep `SectionHeader`/`aligned` handling                                                |
| Section image saved but never displayed                  | The chosen type's renderer doesn't read `imageUrl`                               | Check `IMAGE_SECTION_TYPES`; pick an image-capable type or extend the renderer                                                   |
| Picked brand/category/product/review missing             | Id removed or stale, or review not approved                                      | Re-pick in the section dialog; approve reviews in `/admin/reviews`; renderers filter unknown ids                                 |
| Fifth gallery image rejected                             | Cap is four per product (main + 3 extras)                                        | Expected; remove one first                                                                                                       |
| Old page copy vanished after using blocks                | Only paragraph blocks mirror into legacy `body`                                  | Put page copy in paragraph blocks                                                                                                |
| Uploaded image looks softer                              | Browser optimises to 1600px / WebP 82%                                           | Use a larger source or raise `MAX_IMAGE_EDGE` in `src/components/admin/ui.tsx`                                                   |
| Hand-edited `config.style` ignored                       | Server sanitises to whitelisted tokens                                           | Use the Design panel; only allowed tokens persist                                                                                |
| A second brand's data appears in a store                 | Wrote to the wrong database                                                      | Check `store_branding` before writing; one project, one DB                                                                       |
| Two versions show the same brand name                    | Versions share one DB, so `store_branding.name` is shared                        | Add a committed `src/lib/brand.ts` override or set `VITE_BRAND_NAME` (5G)                                                        |
| Theme edit in one version repaints every version         | `store_theme` is a shared settings row                                           | Keep per-version tokens in `src/styles.css`, or use separate databases (5G)                                                      |
| Deleting a product removed it from every version         | Shared database by design                                                        | Expected for variants; use separate DBs when catalogs must diverge (5G)                                                          |
| Seed run added demo rows to every version                | `seed:all` ran against the shared DB                                             | Keep one canonical seeder; never seed a live shared database                                                                     |
| Version B shows version A's homepage order               | `settings.homepage_sections` and `landing_sections` are shared                   | Share the order intentionally, or make layout a code-level variant (5G)                                                          |
| Existing store suddenly shows another brand              | "Applied the playbook" to a live project instead of copying it                   | Build in a new folder (0B); restore from git + the DB's backup                                                                   |
| `401 ... can't be decoded with any of the existing keys` | Token signed for another database/account, or altered in transit                 | `turso db shell <db> "SELECT 1"`, then `turso db tokens create <db>` and put it in `.env` directly                               |
| Two dev servers fight for the port                       | Both projects pinned to 8080                                                     | Keep one store on the Google-registered origin; run the other on 8081+ and add that exact callback to the existing Google client |
| Quick-view eye disappeared from product cards            | Card was simplified during a rewrite                                             | Port `src/components/site/quick-view.tsx` and the eye button back onto every card                                                |
| Mega menu looks like a plain dropdown                    | Source image-card menu and "Shop by need" panel were flattened                   | Rebuild from the source structure (4D); do not replace with text links                                                           |
| "Shop by need" links do nothing                          | `/shop` ignores `sort`, `maxPrice`, `minRange`, `inStock`                        | Extend `validateSearch` and filter the product list (4D)                                                                         |
| New section's picks vanish on save                       | `admin/page-controls.tsx` deletes ids for unknown types                          | Add the type to the matching `save()` branch (5B)                                                                                |
| Turso token works in one project but 401s in another     | Token is scoped to one database                                                  | Create a token for the target DB and put it in that project's `.env`                                                             |
| Two playbooks disagree                                   | A store kept its own copy                                                        | Keep only `tracksuitsites\PLAYBOOK.md`; delete local copies and point `AGENTS.md` at it                                          |
| Desktop fills with source folders and temp builds        | Source not cleaned after delivery                                                | Follow 0D: keep the full store + `builds`, remove the landing source and probes                                                  |
| Colours look "close but wrong"                           | Palette approximated in `oklch` instead of the source hex                        | Copy exact hex values and register the source scales as tokens (4G)                                                              |
| Design reads shoutier than the source                    | `uppercase: true` forced on headings                                             | Match the source casing; only eyebrows are uppercase                                                                             |
| Hero looks nothing like the design                       | Template's split hero used for a full-bleed design                               | Rebuild the hero renderer; it is a section type, not a fixed layout                                                              |
| Every product shows the store brand                      | Seeder hard-codes the brand instead of using `product.brand`                     | Seed `product.brand`; verify with `SELECT id, brand FROM products`                                                               |
| Em dashes/quotes corrupted after a scripted edit         | PowerShell `Set-Content` writes ANSI                                             | Use `[System.IO.File]::WriteAllText(path, text, UTF8Encoding($false))`                                                           |
| Email 422 `Invalid from field`                           | `EMAIL_FROM` still has surrounding quotes or is not `Name <email>`               | Use `Name <orders@unccode.site>`; `envValue` strips matching quotes, but fix `.env` too                                          |
| Test email sends but customer mail does not              | Sender domain not verified in Resend                                             | Verify `unccode.site` (SPF/DKIM) before using it for customers; test sender only reaches the account email                       |
| Checkout feels slow on confirmation                      | Email send is awaited with an 8s timeout                                         | Keep the timeout; email must never fail the order. Consider fire-and-forget only where the host keeps the request alive          |
| Email key visible in the browser                         | Used a `VITE_` variable or imported the server module into a component           | Keep `EMAIL_*` server-only; static Vite stores call `/api/send-order-email`                                                      |
| Vite email endpoint returns 400                          | Body was not JSON (PowerShell `curl --data-binary` quoting)                      | Send with `fetch(..., { body: JSON.stringify(payload) })` or a JSON file                                                         |
| R2 upload returns 403/401                                | Wrong keys, or a token scoped to another bucket/account                          | Create a new R2 token for this bucket; keep the same prefix per project                                                          |
| Upload succeeds but the public URL 404s                  | Bucket not public, or `R2_PUBLIC_DOMAIN` has a typo/trailing slash               | Enable public access / custom domain; store the domain without a trailing slash                                                  |
| Media library is empty while uploads work                | `R2_PREFIX` differs from where the objects were written                          | Keep one prefix per project and do not change it after the first upload                                                          |
| “R2 is selected but not configured” on upload            | `store_media.storage = r2` with missing env vars                                 | Add the `R2_*` vars or switch the setting to Automatic/Database                                                                  |
| Deploy succeeds, every page 404s                         | Built with the wrong `NITRO_PRESET` (usually Workers output on Vercel/Pages)     | Set the preset at build time and rebuild; Pages output is `dist`, Vercel is `.vercel/output`                                     |
| Cloudflare runtime `crypto is not defined`               | `nodejs_compat` flag missing                                                     | Enable it in Pages → Settings → Functions (and deploy again)                                                                     |
| `cloudflare-pages` preset ignored                        | Nitro 3 expects the std name                                                     | Use `cloudflare_pages` with an underscore                                                                                        |
| “domain_limit” when activating a license                 | The key already has three live domains                                           | Release an old domain with `/v1/deactivate`, or issue a new key                                                                  |
| Activation works on the live site, fails in preview      | Grant is bound to the host it was activated on                                   | Activate on the final domain only; previews do not need a key for the storefront                                                 |
| Script deleted the buyer's test data                     | Deleting the local DB to reseed                                                  | Check `SELECT COUNT(*) FROM users`; upsert sections/settings/pages instead                                                       |

---

## 12. Definition of done

- [ ] Project built in its **own folder** with its own package name, DB file and port (0B); no other brand's database, `.env` or sections touched — **unless it is an intentional shared-DB variant (5G)**, where the DB is shared on purpose and the differences are code/assets only.
- [ ] Shared-DB variants (5G): every version points at the same Turso URL/token, brand differences use `src/lib/brand.ts`, per-version theme stays in `src/styles.css`, and a write in one version was re-checked in the others.
- [ ] Brief filled and all sections mapped to types (or a new type added in all five places).
- [ ] Brand, accent, fonts, announcement, contact, footer and shipping settings written to the live DB.
- [ ] Every homepage section present, visible, ordered and rendered from `landing_sections`.
- [ ] Section design overrides (colours, typography, alignment left/centre/right, banner layout) persist and render.
- [ ] Entity sections (brands, categories, products, reviews, featured brand) point at live ids; empty selection = show all.
- [ ] Products, categories, brands and images complete; no missing images; `active = 1`; gallery capped at four images with working thumbnails/hover zoom.
- [ ] **Design fidelity (4G) passed**: exact source hex values in the served CSS, matching casing and weights, hero composition rebuilt to match, chrome surfaces correct.
- [ ] Product cards keep the **quick-view eye**; the dialog opens, switches colourway, adds to bag and closes.
- [ ] Mega menu matches the source (image cards + counts + "Shop by need"); each need link filters `/shop`, and category tiles open `/shop?category=<slug>`.
- [ ] `/shop` search filters (`category`, `sort`, `maxPrice`, `minRange`, `inStock`) work and keep search/saved usable.
- [ ] Editable pages built from blocks (layout, hero image); legacy body pages still render.
- [ ] Editable pages linked from footer/nav where needed.
- [ ] Uploaded images are optimised (1600px / WebP) and stored through the configured backend (`store_media`): R2 when configured, the database otherwise.
- [ ] Admin → Media lists both backends, tags each item **R2** / **DB**, and deletes from the correct one.
- [ ] `DEPLOYMENT.md`, `LICENSE.md` and `LICENSE-EXTENDED.md` are in the buyer zip; `NITRO_PRESET` and the `R2_*` vars are in `.env.example`.
- [ ] A production build succeeds for the target platform (`vercel` or `cloudflare_pages`), not only the default Workers preset.
- [ ] `LICENSE_PRODUCT` is this project's own id, and licensing is OFF by default (`LICENSE_DISABLED=1`).
- [ ] Non-apparel adaptation checklist complete (or explicitly N/A).
- [ ] Admin can log in, edit a section, edit a product, and see the storefront change.
- [ ] Guest checkout works end to end; server totals correct; test order cleaned up.
- [ ] If the project has a marketplace: OFF by default, admin toggle works, seller routes and subscription APIs are server-gated, and the toggle is blocked while active subscriptions exist.
- [ ] COD layer complete: delivery zones admin-editable (empty by default, flat-rate fallback), minimum order enforced server-side, phone validated, COD label/delivery time shown at checkout.
- [ ] WhatsApp handoff works: floating button, per-product order message, post-checkout "send this order" prefilled link; shop number comes from settings.
- [ ] New-order WhatsApp alert configured through `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / owner number; missing config never blocks an order; no email provider introduced.
- [ ] English + French UI both render; every storefront page with the header is wrapped in `LocaleProvider`; no hard-coded English in translated chrome.
- [ ] Account recovery works without email: request ? admin code ? reset; code is hashed, expires, is one-time, locks after 5 attempts, and invalidates sessions.
- [ ] Customer register/login works; Google works when configured; staff rejected.
- [ ] **Default owner works:** `admin@email.com` / `123456789` signs in on a fresh database **in every store, including the existing store ports**, and the password hash is stored (never plaintext). First-run owner setup is not an acceptable substitute.
- [ ] **Existing Google OAuth client reused** (no new client); `redirect_uri` uses this project's registered origin and the consent page returns 200 without `redirect_uri_mismatch`.
- [ ] Turso is the only database; the URL/token belong to **this brand's** DB; `.env` untracked; no secrets in logs or zip.
- [ ] Email: Resend configured; **Send test email** reaches an inbox; order confirmation + owner alert send; password reset code emails where the store supports it; checkout still succeeds with email disabled; `EMAIL_API_KEY` never appears in client code or the zip.
- [ ] Any token that passed through chat has been invalidated; the live one exists only in `.env`.
- [ ] `bun run test`, `typecheck`, `lint` (0 errors) and `build` all pass.
- [ ] Runtime matrix (7B) passes, including `/shop`, the filters, `/api/auth/google` 303 and the callback safe redirect.
- [ ] **Only the finished full store remains:** the landing-page source folder was deleted (or archived first if it had no remote) and temp artifacts are gone (0D).
- [ ] **One playbook only:** `tracksuitsites\PLAYBOOK.md`; no local copy in the store, and `AGENTS.md` points to it.
- [ ] Project moved to `finished-websites/<project-slug>` and listed in `finished-websites/INDEX.md`.
- [ ] Its **own new GitHub repo** is recorded in `INDEX.md`; the store was not pushed to the design/source repo. Push only if the user asked.
- [ ] The zip was **not** rebuilt during ordinary work. It is built or refreshed only in the final §0E “finish them up” batch, without `.env`, source folders or temp files.
- [ ] Final message lists what changed, the URLs to check, and the admin credentials/rotation note.

---

## 13. Reference index (fast lookup)

| Need to change                                                                                 | File                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage composition                                                                           | `landing_sections` rows; `src/routes/index.tsx`; `src/components/site/section-renderer.tsx`                                                                                                                         |
| Section type list / labels                                                                     | `src/lib/cms.ts`                                                                                                                                                                                                    |
| Section design tokens / alignment                                                              | `src/lib/cms.ts` (`SectionStyle`, `SECTION_ALIGNMENTS`), `src/components/site/section-style.ts`, `src/routes/admin/page-controls.tsx`                                                                               |
| Entity sections (brands, categories, products, spotlight, product rows, reviews, testimonials) | `src/components/site/section-renderer.tsx`, `src/lib/cms.ts`, `src/routes/index.tsx`, `src/routes/admin/page-controls.tsx`                                                                                          |
| Shop route and filters (`category`, `sort`, `maxPrice`, `minRange`, `inStock`)                 | `src/routes/shop.tsx`, `src/components/site/product-grid-section.tsx`                                                                                                                                               |
| Product quick view (eye dialog)                                                                | `src/components/site/quick-view.tsx`, `src/components/site/product-grid-section.tsx`, `src/components/site/section-renderer.tsx`                                                                                    |
| Mega menu (image cards + Shop by need)                                                         | `src/components/site/site-header.tsx`, `src/routes/shop.tsx`                                                                                                                                                        |
| Product gallery / hover zoom                                                                   | `src/components/site/product-gallery.tsx`, `src/routes/products/$productId.tsx`, `src/routes/admin/products.tsx`                                                                                                    |
| Upload optimisation                                                                            | `src/components/admin/ui.tsx` (`ImageField`), `src/server/media.ts`                                                                                                                                                 |
| Section CRUD                                                                                   | `src/server/cms.ts`, `src/routes/admin/page-controls.tsx`                                                                                                                                                           |
| Default sections/pages                                                                         | `src/server/defaults.ts`                                                                                                                                                                                            |
| Products / categories / brands                                                                 | `src/server/catalog.ts`, `src/server/seed.ts`, `src/routes/admin/products.tsx`                                                                                                                                      |
| Product type and filters                                                                       | `src/lib/storefront.ts`, `src/components/site/product-grid-section.tsx`                                                                                                                                             |
| Settings schema/defaults                                                                       | `src/lib/store-settings.ts`, `src/server/settings.ts`, `src/routes/admin/settings.tsx`                                                                                                                              |
| Theme                                                                                          | `src/styles.css`, `src/components/site/theme-style.tsx`, `src/routes/admin/theme.tsx`                                                                                                                               |
| Per-version brand (shared DB)                                                                  | `src/lib/brand.ts`, `src/hooks/useSettings.tsx`, `VITE_BRAND_NAME`                                                                                                                                                  |
| One database shared by several versions                                                        | `.env` (`TURSO_DATABASE_URL` / `VITE_TURSO_DB_URL`), §5G                                                                                                                                                            |
| Header/footer/nav                                                                              | `src/components/site/site-header.tsx`, `src/components/site/site-footer.tsx`                                                                                                                                        |
| Pages                                                                                          | `src/lib/cms.ts` (`PAGE_KEYS`, `PageBlock`, `cleanPageBlocks`), `src/server/defaults.ts`, `src/server/cms.ts`, `src/components/site/page-blocks.tsx`, `src/routes/admin/pages.tsx`, `src/routes/pages/$pageKey.tsx` |
| Checkout math                                                                                  | `src/server/orders.ts`, `src/lib/checkout.ts`, `src/routes/checkout.tsx`                                                                                                                                            |
| Delivery zones / COD rules                                                                     | `src/lib/store-settings.ts` (`store_shipping`), `src/lib/checkout.ts`, `src/routes/admin/settings.tsx`                                                                                                              |
| WhatsApp handoff (links, messages, float)                                                      | `src/lib/whatsapp.ts`, `src/components/site/whatsapp-order.tsx`, `src/routes/checkout.tsx`, `src/routes/products/$productId.tsx`                                                                                    |
| New-order WhatsApp alert                                                                       | `src/server/whatsapp.ts`, `src/server/orders.ts`, `src/routes/admin/settings.tsx`                                                                                                                                   |
| FR/EN localisation                                                                             | `src/lib/locale.tsx`, every storefront route (`LocaleProvider`), `src/components/site/site-header.tsx`, `src/components/site/site-footer.tsx`                                                                       |
| Auth / sessions                                                                                | `src/server/auth.ts`, `src/lib/api.ts`, `src/routes/account.tsx`, `src/routes/admin_.login.tsx`                                                                                                                     |
| Google OAuth                                                                                   | `src/lib/google-oauth.server.ts`, `src/routes/api/auth/google/index.ts`, `src/routes/api/auth/google/callback.ts`                                                                                                   |
| Database / Turso switching                                                                     | `src/server/db.ts`, `src/routes/admin/setup.tsx`                                                                                                                                                                    |
| Schema                                                                                         | `src/server/schema.ts`                                                                                                                                                                                              |
| Media                                                                                          | `src/server/media.ts`, `src/server/r2.ts`, `src/server/image-data.ts`, `src/routes/api/media/$id.ts`, `src/routes/admin/media.tsx`                                                                                  |
| Transactional email (TanStack stores)                                                          | `src/server/email.ts`, `src/server/orders.ts`, `src/lib/admin-api.ts`, `src/routes/admin/settings.tsx`, `.env` (`EMAIL_*`)                                                                                          |
| Transactional email (static Vite stores)                                                       | `server/email.ts`, `api/send-order-email.ts`, `vite.config.ts`, `src/pages/Checkout.tsx`, `.env` (`EMAIL_*`)                                                                                                        |
| Image storage mode (R2 vs database)                                                            | `src/lib/store-settings.ts` (`store_media`), `src/lib/media-storage.ts`, `src/server/media.ts`, `src/routes/admin/settings.tsx`                                                                                     |
| Deployment targets / hosting steps                                                             | `vite.config.ts` (`NITRO_PRESET`), `DEPLOYMENT.md`                                                                                                                                                                  |
| Licensing (Standard, Extended, activation)                                                     | `LICENSE.md`, `LICENSE-EXTENDED.md`, `src/server/license.ts`, `src/routes/admin/setup.tsx`                                                                                                                          |
| Docs for buyers                                                                                | `INSTRUCTIONS.md`, `README.md`                                                                                                                                                                                      |
| The one playbook / cleanup rules                                                               | `tracksuitsites\PLAYBOOK.md` (canonical; no copies in stores)                                                                                                                                                       |
| Finished projects / new repos / zips                                                           | `C:\Users\PC\Desktop\finished-websites\`, `INDEX.md`, `builds\` (see §0D–§0E)                                                                                                                                       |
| “Zip them all / finish them up” batch                                                          | §0E only; never package during ordinary edits                                                                                                                                                                       |
| Default admin seed (all stores, including the existing store ports)                            | `src/server/db.ts` (`DEFAULT_ADMIN_*`, `seedDefaultOwner`), `src/server/password.ts`, `src/server/auth.ts`                                                                                                          |
| Account recovery (no email)                                                                    | `src/server/auth.ts` (`requestPasswordReset`, `issuePasswordReset`, `completePasswordReset`), `src/server/schema.ts`, `src/routes/admin/customers.tsx`, `src/components/account-recovery.tsx`                       |

---

## 14. Copy-paste brief (start every job with this)

```md
Build this landing page as a NEW project from the store template, following the canonical
PLAYBOOK.md at C:\Users\PC\Desktop\tracksuitsites\PLAYBOOK.md. Do not keep a second playbook.

Template (backend base): C:\Users\PC\Desktop\tracksuitsites
New project folder: C:\Users\PC\Desktop\<brand>-store (see 0B — do not edit any other store)
Port: 8080 (the origin the existing Google client already trusts) or a registered 8081+
Database: the existing Turso URL/token if it belongs to this brand; otherwise local file
Default admin: admin@email.com / 123456789 (seed on a fresh database in every store, including retrofitting existing store ports)
Checkout: cash on delivery + WhatsApp handoff, no card payments, no email provider.
New-order alerts: Meta WhatsApp Cloud API via WHATSAPP_* env; never block an order on failure.
Delivery: admin-editable city zones, empty by default (flat-rate fallback), minimum order, delivery time.
Language: English + French UI (LocaleProvider); shop language in store_locale.

Landing page source: <path/URL/screenshots>
Brand:
Accent: <exact hex values from the source, plus its full colour scale>
Fonts: <display + body>
Sections: <ordered list>
Products/items: <list>
Pages:
Nav/footer:
Images: <paths>
Currency: <MAD/USD/etc.>
Notes: <anything unusual>

Rules:

- Do not remove Turso, admin, guest checkout, or Google login.
- Reuse the existing Google OAuth client and the project's existing Turso credentials.
  Do not create a new Google client. Do not use another brand's database/token.
- Do not write to any database until I say the target is correct.
- Never ask me to paste tokens or secrets in chat; the .env file is the only place they go.
- Match the source design exactly: colours, casing, hero composition, quick-view eye,
  mega menu, shop filters and section furniture (4G/4D). Do not simplify source components.
- When the store passes the definition of done, remove the landing-page source folder and
  temp artifacts, move the store to `finished-websites/<project-slug>`, and create its new
  GitHub repo (0D). Do **not** rebuild zips yet.
- Zips are rebuilt only when I say "zip them all / finish them up"; then run the §0E batch
  into `finished-websites/builds` and update `finished-websites/INDEX.md`.

Report: brief, section mapping, files changed, design-fidelity checklist, verification matrix,
and what was removed during cleanup.
```
