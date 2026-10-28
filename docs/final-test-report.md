# Nails by Eurie — final local test, 22 October 2026

## Passed

- `npm test`: 46/46 checks passed, including Google-only login flow, server-enforced roles and prices, private photo access, sizing, order lifecycle, Philippine mobile normalization, and invalid input rejection.
- `npm run build`: TypeScript and production build passed. Vite reports a non-blocking large-chunk warning.
- All 530 reference images were present in the production build and passed image-file verification. The live `reference_prices` table contained 530 unique IDs, matched the local price checksum, and stayed within ₱100-₱250.
- Production preview loaded the gallery, searched a newly added reference, showed its ₱300 price, and prompted anonymous visitors to sign in before viewing orders. No browser console errors were recorded in the preview or local app.
- Google sign-in returned successfully to the local app. The signed-in order page, saved hands, automatic try-on, artist desk, and shop settings loaded.
- Placed one clearly marked test order for “Color and details inspiration 623.” It appeared immediately as confirmed at ₱300, without quote approval. The artist desk showed the reference photo and source. Cancelled the test order; after reload it remained cancelled and active orders returned from five to four. Test order ID begins `261af0c9`; its cancelled record remains in history.
- The production build contained no `.env` files or detected Supabase secret key, Google OAuth client secret, or private-key block. The public publishable key is intentionally used by the browser app.

## Still needed before public launch

- Test a non-admin Google customer account and Eurie's second admin account end to end. The role and private-data rules pass automated database tests, but these two real Google sessions were unavailable for this rehearsal.
- Test Google login again on the final deployed domain after adding its exact Supabase callback URL. Hosting is postponed.
- Have Eurie confirm the provisional Small/Medium/Large tip charts, actual daily capacity, and whether the displayed prices cover her materials and time.
- Replace or license Pinterest photos before public commercial use. Some newer references link to their source Pinterest board rather than an exact pin.
- Check the entire checkout on a physical phone and rehearse delivery, cash collection, and a disposable customer's photo deletion. The automated order lifecycle covers these database transitions, but this local browser session did not exercise every live UI path.

See [before-deployment.md](before-deployment.md) for the full business and launch checklist.

## Recheck on 23 October 2026

- Re-ran all 46 automated tests and the production build: passed. The build still reports a non-blocking large JavaScript chunk warning.
- `npm audit --omit=dev --audit-level=high` reported zero known production dependency vulnerabilities.
- The live Supabase Auth settings endpoint reported Google enabled, email and phone disabled, and customer sign-up enabled. This checks provider settings only; it does not replace a fresh real-account login.
- Fixed `.gitignore` to exclude `.env.local` before a future GitHub push. Added a [Render deployment guide](deploy-render.md) and confirmed the static-site Blueprint includes an OAuth callback rewrite.
- Vercel Hobby is restricted to non-commercial use; Render static hosting is the free option documented for this paid-order shop.

**Launch status: hold.** The site is technically buildable, but public use still depends on image rights, Eurie's actual sizes/prices/capacity, separate customer and second-admin account checks, and a final-domain OAuth and phone test. No public site was deployed during this recheck.

The attempted mobile-sized browser recheck on 23 October could not run because browser access to the local development tab was blocked by the browser's URL policy. The existing responsive CSS includes phone breakpoints, but that is not a substitute for viewing and using the site on an actual phone. The local development server was started at `http://127.0.0.1:5173/` for the owner to check directly.
