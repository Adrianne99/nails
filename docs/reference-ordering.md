# Reference requests

Customers select a collection design or inspiration, optionally paste an HTTPS reference link or privately upload an image, choose a provisional Small/Medium/Large fit or reuse their saved fit, and request a quote. Try-on is optional. Default payment remains cash at delivery/handover.

Estimates per set: simple ₱200, French/light details ₱250, detailed ₱300, statement ₱350. These are proposed business prices, not image-based automatic cost recognition. The customer selects a detail level; the artist reviews feasibility and the final quote. Server checks limit new nail quotes to ₱200–₱350 per set; delivery fees are separate. Existing accepted orders retain their prior agreed prices.

Provisional charts (thumb/index/middle/ring/pinky): Small 2/5/4/6/9, Medium 1/5/4/6/8, Large 0/4/3/5/7. Source example: https://iridescentnailz.com/pages/what-size-nails-to-choose . These are not universal sizes or Eurie's verified stock. Customers see the caveat; both hands must be verified by the artist before production. Admins can edit preset numbers in Shop settings. New requests snapshot the chart, preserving old requests if the chart changes.

## Database update

Applied successfully to `nails-by-eurie` on 2026-10-22. For another project, run `supabase/migrations/002_reference_orders.sql` once after 001. Do not rerun either migration on the existing project. This adds size charts and the new request fields inside order snapshots, while retaining ownership checks, private storage, quote acceptance and production safeguards. No new admins or public access to customer data are added.

## Hosting later

Publishing is postponed at the owner's request. Render Static Site + existing Supabase avoids an extra application server. `render.yaml` is prepared. When ready, connect a Git repository, create a Render static site, and supply the two public environment values from `.env.example`. Never add a service-role or secret key. Use the free onrender.com domain initially.

Set Supabase Auth Site URL to the actual HTTPS Render URL and allow that exact `/auth/callback` URL. Keep local callbacks only while developing. Google Cloud's redirect remains the Supabase project `/auth/v1/callback` endpoint. Test Google login, a reference request, an artist quote, customer acceptance, and cash handover before sharing the site.

Render static hosting is free within its usage allowances: https://render.com/docs/static-sites . Supabase free usage has limits; monitor its dashboard. Vercel Hobby is non-commercial and is not suitable for this business: https://vercel.com/docs/limits/fair-use-guidelines . No paid plan or public deployment has been created.

Suggested next feature: office pickup batches (agreed workplace, day and time) so Eurie can hand over coworkers' sets together. Existing saved sizing profiles already reduce repeat-order effort.
