# Nails by Eurie

A responsive custom press-on nail storefront for Mandaluyong. Google-only sign-in, private saved photos, provisional or artist-confirmed sizing, manual nail previews, instant fixed prices, and cash at delivery or handover.

## Current state

- The local application and production build are implemented.
- Real Pinterest reference photography is used for the local design preview. See `PHOTO-SOURCES.md`; these images are not represented as Eurie's own work.
- The local app points to the existing `nails-by-eurie` Supabase project using its public publishable key. Google login is enabled. Migrations through `006_security_validation.sql` have been applied to this project.
- Both supplied admin addresses are configured in the database migration.
- No public deployment has been performed. The existing Supabase project is live and contains prior customer orders plus a cancelled test order.

## Run locally

Requires a current Node.js LTS installation.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Without environment variables, you can browse the reference collection, inspect designs and their sources, and see the protected-page sign-in flow.

```sh
npm test
npm run build
```

Tests cover Google OAuth callback handling, cancelled/expired links, safe destinations, session restoration and public-key validation. Database tests use an isolated in-memory PostgreSQL instance (PGlite), executing the actual migration and RPC with test stand-ins for Supabase's auth and storage schemas. They are not tests against a live Supabase tenant or Google OAuth provider.

## Architecture

- React + TypeScript + Vite, deployed as static files.
- Supabase Auth with Google OAuth and PKCE. Only the public project URL and anonymous/publishable API key go in the browser.
- PostgreSQL row-level security protects every customer table. Checked database functions perform mutations; customers cannot directly update admin roles, prices, verification flags, order statuses, or payment flags.
- A private `private-media` bucket contains hands, inspiration, and preview images. Signed URLs last five minutes and refresh while a screen is open. A separate public `gallery` bucket is writable only by admins.
- Photo try-on stores five independent nail fits, rotated source crops, and a rendered composite. Customers save a hand photo and choose a style; the nails are fitted automatically. The hand is found by an in-browser detector (MediaPipe, no paid API, photos stay on the device), and the nails in the 106 library photos are pre-marked in `src/nail-maps.json`. A customer's own style photo may need one tap on the nail they like. Manual fitting remains as an optional fallback. No generated artwork is used. See `docs/photo-try-on.md`.
- A 530-photo inspiration library provides source links, search, category filters, and fixed prices from ₱200–₱350. These are references, separate from Eurie's own portfolio. See [inspiration sources](docs/inspiration-sources.md).
- New orders lock the displayed price and are confirmed immediately. Older orders placed before this change retain their quote and acceptance flow. The database locks the capacity setting while accepting an order.
- Amounts are integer centavos. Dates use Asia/Manila. Payment is `Unpaid → Collected → Received` for courier COD, or `Unpaid → Received` at handover. Delivery is recorded before collection, and completion requires receipt of cash.
- Accepted orders retain design, sizing, and price snapshots. Later edits do not silently reprice them.

## Connect the production services

1. Use the existing `nails-by-eurie` Supabase project. Migrations `001` through `006` and the seed catalog are already installed. Do not rerun them against this database. For a separate fresh project, apply them once in order after checking the schema.
2. Google OAuth is already configured and works locally. Before public use, add the final hosting origin to Google Cloud's authorized JavaScript origins and complete the consent/audience requirements. Keep Google's authorized redirect URI pointed at the Supabase callback shown in its dashboard.
3. Google is already enabled in Supabase Auth and the other sign-in providers are disabled. Keep the Google secret in the provider dashboard; do not put it or a Supabase service-role key in this repository or in a `VITE_` variable.
4. Set Supabase's Site URL to the deployed origin and allow exact local/production `/auth/callback` redirect URLs. The app explicitly exchanges the PKCE code once, cleans it from the URL, and restores the customer's selected page/design. Avoid broad wildcard redirects in production.
5. `.env.local` is configured on this machine. For another installation, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Legacy `VITE_SUPABASE_ANON_KEY` is also supported. Restart Vite. Set the same public variables in the hosting build environment.
6. Sign in with each of the two configured Google accounts and a separate customer account. Only the two supplied addresses should see the Artist desk. If these addresses ever change, update the protected allowlist with a database-owner operation, not through the customer application.
7. Follow [the Render deployment guide](docs/deploy-render.md) when the prelaunch checks are settled. The included `render.yaml` configures a static site. Do not upload `.env.local` or database credentials.
8. Review [the deployment checklist](docs/before-deployment.md), especially real tip sizes, price feasibility, photo permissions, and the final-domain Google callback. Set the real capacity, cancellation and retention policies before taking orders.

Provider documentation:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://render.com/docs/static-sites

## Initial cost plan

Hosting options checked again 23 October 2026. Budget: **₱1,000 total**, not a monthly subscription.

| Item | Initial plan | Expected charge within free allowances |
| --- | --- | --- |
| Hosting | Render static site | ₱0 within included usage |
| Web address | Included `onrender.com` subdomain | ₱0 |
| Database + Google authentication | Supabase Free | ₱0 |
| Private image storage | Supabase Free | ₱0 within 1 GB |
| Notifications | In-app updates and manual refresh | ₱0 extra |
| AI / payment gateway | Not used | ₱0 |
| Custom domain | Deferred | No purchase made; obtain a registration and renewal quote first |

Sources: https://supabase.com/pricing and https://supabase.com/docs/guides/platform/billing-on-supabase ; https://render.com/docs/static-sites and https://render.com/docs/free . Render's static hosting is free within included bandwidth/build usage. Vercel's free Hobby plan is restricted to non-commercial use (https://vercel.com/docs/plans/hobby), so this paid-order shop should not use it.

Supabase's published Free allowances include 500 MB database storage, 1 GB file storage, 5 GB egress and 50,000 monthly active users. Free projects can pause after inactivity, lack production-grade backup guarantees/support, and have usage limits. Free image transformations are not assumed; the app compresses images before upload. Pro starts at USD 25/month, so upgrading is not part of this budget. Static hosting does not include infinite database/storage capacity.

Example storage estimate, not a guarantee: 100 customers × 4 photos × 0.35 MB ≈ 140 MB. Saving two 0.35 MB images per order at 300 orders/month adds about 210 MB/month. Retention and repeat-preview cleanup matter even with fewer than 100 users. Monitor actual usage and plan backups; no automatic paid upgrade is configured by this project.

## Business settings still to finalize

- Actual daily capacity and lead time (10 sets/day is an editable placeholder).
- Delivery area, courier capable of COD, shipping fees, failed-delivery handling, and remittance schedule.
- Exact tip brand, shape and length ranges, and sizing-kit logistics.
- Public catalog prices and which designs can actually be reproduced for each quote.
- Privacy contact, retention periods, cancellation and replacement/remake policies.

## Privacy operations

Deleting a saved hand or inspiration photo also removes its saved composite previews after checking that no active order needs them. Metadata deletion and storage deletion are separate calls: if storage deletion fails, the UI reports it; an admin must remove the orphaned files in Supabase. Existing signed links may remain usable until their five-minute expiry.

The account-deletion button creates a request, not an immediate destructive deletion. Admins must review it with the customer and execute deletion through the provider dashboard. Export only records legitimately retained under the published policy; remove that customer's private objects and dependent preview/media rows, then order events/internal notes/orders, sizing records and deletion request, and finally the Auth user. Foreign keys deliberately prevent a careless Auth-only delete from silently leaving private records behind. Do not mark a request handled before completing and communicating the process.

## Launch validation still required

The local database tests are passing and the static build succeeds. Browser checks cover mobile/desktop public navigation, real-photo gallery filters, design details and Google-only gating. The following require actual configured services and must be tested before launch:

- Both admin accounts and an ordinary customer completing Google OAuth.
- Real private uploads, signed URL refresh, reuse and deletion.
- Photo positioning and export on the customer's actual mobile browser, including automatic nail fitting on real customer hand photos and the first-time model download on mobile data.
- A customer accepting a real artist quote and an admin processing delivery, COD collection and remittance.
- Multi-account attempts to read another customer's real files/orders.
- Provider backup/export and storage-cleanup procedures.

The Supabase project has live historical orders. A clearly labelled test order was placed and cancelled during final testing; its cancelled record remains in history.
# nails
