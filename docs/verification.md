# Verification record — 14 October 2026

## Passed locally

- Eleven OAuth tests cover public key validation, Google-only sign-in parameters, safe return pages/designs, successful callbacks, cancellations, expired/incomplete links, session restoration, and rejection of non-Google sessions. Total automated tests: 20 passing.
- TypeScript check and Vite production build.
- Dependency audit: 0 known vulnerabilities after removing the unnecessary affected test runner and using Node's built-in runner.
- Nine integration tests execute the real database migration/RPC against isolated PostgreSQL via PGlite:
  - Google-only admin identity.
  - Customer self-promotion, price edits, and admin RPC rejection.
  - Non-Google identity rejection.
  - Ten-finger sizing validation and verification permissions.
  - Private storage isolation between customers, admins, and anonymous users.
  - Duplicate-submission protection and server-derived prices.
  - Quote versions, acceptance, immutable pricing, delivery, cash collection, remittance, completion, and hidden internal notes.
  - Capacity enforcement during quote acceptance.
  - Active-order photo retention and deletion after cancellation.
- Local HTTP server returned 200.
- Browser: home-to-gallery navigation, Floral filter, photo detail dialog, Pinterest attribution link, try-on sign-in gate, setup-state Google button, mobile menu.
- Desktop viewport 1280×900: loaded hero/collection images and no horizontal overflow.
- Mobile viewport 390×844: six collection photographs and no horizontal overflow.
- Saved screenshots: `storefront-preview.jpg`, `mobile-collection.jpg`.

## Not yet verified

Supabase's Site URL is saved as `http://127.0.0.1:5173`. Both approved local `/auth/callback` URLs (`127.0.0.1` and `localhost`, port 5173) are saved; the dashboard confirmed “Successfully added 2 URLs.” Evidence: `oauth-redirect-saved.jpg`.

Live read-only checks after installation: the catalog returns all six designs, the settings endpoint returns daily capacity 10, and anonymous requests for `media` and `admin_emails` return permission denied (HTTP 401). This confirms anonymous restrictions, not authenticated cross-customer isolation.

The local app is connected to `nails-by-eurie` (`ituisqtlvgvqpwaootuv`) with a public publishable key. The initial schema and seed catalog were applied successfully through the signed-in Supabase SQL editor after user approval. Google provider configuration is still pending. Authenticated browser uploads, mobile canvas editing/export on a real customer's device, live customer/admin isolation, and real fulfillment/payment workflows have not been exercised against production services. PGlite's test auth/storage schemas reproduce permission boundaries but do not replace a Supabase staging test. See `README.md` for connection and launch checks.
