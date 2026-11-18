# TODO — PetPals (dogositeone)

## Brand and launch

- [x] Rebuild the store on the production TanStack Start template
- [x] PetPals branding, Poppins type, orange accent and MAD pricing
- [x] 13-product pet catalog with six categories and One Size products
- [x] Shop page, pet product detail, reviews and category sections
- [x] Server-side checkout with cash on delivery and MAD shipping
- [x] Admin auth, orders, products, pages, media, settings and theme
- [x] Resend order emails and a verified test send
- [ ] Replace the sample product photography in `public/products/`
- [ ] Replace the sample remote photography in the promo/product rows
- [ ] Confirm the buyer's domain and social handles for PetPals
- [ ] Run a trademark check for the PetPals name in the target market
- [ ] Update the Google OAuth app name and Turso database labels
- [ ] Replace the favicon and logo files if they still show the old mark
- [ ] Rotate the seeded admin password (`admin@email.com` / `123456789`) before launch
- [ ] Review product names, photos and page copy for third-party trademarks

## Email provider (Resend — completed)

- [x] Verify `unccode.site` in Resend and publish SPF, DKIM and DMARC records
- [x] Add `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_ENABLED` and owner variables to `.env`
- [x] Send order confirmation and owner alert emails after `placeOrder`
- [x] Send a password reset email as an optional faster path
- [x] Add a **Send test email** button in Admin → Settings
- [x] Verify a real inbox and keep the key out of git

## Notes

- The Resend key stays in `.env` only; `.env` is git-ignored.
- Email is an addition, not a dependency: checkout still completes if email is unset or rejected.
- Product photography is intentionally placeholder-grade until the buyer supplies their own.
- Free tiers change — confirm provider limits before launch.
