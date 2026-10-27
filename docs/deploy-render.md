# Deploy Nails by Eurie with Render + Supabase

This app needs **one static website on Render** and the **existing Supabase project**. It does not need a Render web server or Render database. Vercel's free Hobby plan is limited to non-commercial use, so it is not the free host to use for a shop accepting paid orders.

## Before putting the link in customers' hands

1. Resolve the items in [before-deployment.md](before-deployment.md), especially Eurie's real tip-size chart, sustainable prices, order capacity, and delivery/cancellation/privacy wording.
2. Replace the third-party Pinterest photographs with photos you own or have permission to use commercially. Pinterest links and creator credits do not grant a commercial image license. The current 530-photo library is for local review until rights are cleared.
3. Test a separate customer Google account and both admin Google accounts. Only the admins should see Artist desk; each customer should see only her own private photos and orders. These live account checks have not all been performed.
4. Decide whether Google's OAuth audience is still in **Testing** or ready for **In production**. In Testing, only listed test users can sign in. Check Google Auth Platform's requirements before inviting customers.

## 1. Put the approved site code in GitHub

Create a **private** GitHub repository. The local project does not yet have a Git repository. Use the project folder as the repository root. Before pushing, check that `.env.local`, `node_modules`, `dist`, and `test-results` are excluded by [.gitignore](../.gitignore). The published site still serves its public images, so a private repository does not solve photo-rights concerns.

Do not place the Google OAuth client secret, any Supabase `sb_secret_`/service-role key, or a database password in GitHub. `VITE_SUPABASE_URL` and the `sb_publishable_` key are the **public browser configuration**; enter them in Render, not in source files.

## 2. Create the free Render static site

In [Render](https://dashboard.render.com/), connect GitHub, then choose **New → Blueprint** and select that repository. Render reads the included [render.yaml](../render.yaml), which specifies a static site, `npm ci && npm run build`, the `dist` publish folder, a single-page rewrite, and response headers. Review the proposed resource before choosing **Deploy Blueprint**. It must say **static site**, not a paid web service or Render Postgres database.

When prompted for environment values, set:

- `VITE_SUPABASE_URL` = `https://ituisqtlvgvqpwaootuv.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = the `sb_publishable_...` value under the existing Supabase project's **Settings → API Keys**.

These values are embedded into the browser build. If you add or change either one after a build, select Render's **Save, rebuild, and deploy** option. Never enter the Google client secret or a Supabase secret/service-role key here.

Wait for a successful build and copy the exact `https://...onrender.com` URL Render assigns. Open the home page and confirm the gallery loads. Do not share it with customers yet.

## 3. Connect that exact URL to Google sign-in

In the [Supabase project](https://supabase.com/dashboard/project/ituisqtlvgvqpwaootuv), go to **Authentication → URL Configuration**:

- Set **Site URL** to the exact Render origin, for example `https://nails-by-eurie.onrender.com` (use the actual name Render assigned; no `/auth/callback` here).
- Add **Redirect URL** `https://YOUR-ACTUAL-RENDER-HOST.onrender.com/auth/callback`.
- Keep the exact local callback URLs if you still need local development. Avoid a broad wildcard for the public site.

In the existing Google Cloud project, open **Google Auth Platform → Clients → the existing Web application client**:

- Add the exact Render origin under **Authorized JavaScript origins**.
- Keep the **Authorized redirect URI** as Supabase's callback, `https://ituisqtlvgvqpwaootuv.supabase.co/auth/v1/callback`. The Render `/auth/callback` belongs in Supabase's Redirect URLs, not in Google's redirect-URI list.
- Review **Audience**. A Testing app only admits listed test users. Follow Google's publishing/verification prompts for the audience you intend to serve.

The app starts sign-in and returns to the **same website origin**. Do not start on localhost and finish on Render, or switch between two Render hostnames during one login.

## 4. Test the actual deployed address before announcing it

1. In a new private browser window, load the Render home page and several collection images. Open `/auth/callback` directly: it should show the app's sign-in retry state, not a Render 404. This checks the rewrite.
2. Sign in with a separate customer Google account, then reload. Confirm it can make an order at the displayed price, view only its own order and private photos, and sign out.
3. Sign in separately with each admin Google account. Confirm both see Artist desk and the customer test order. A regular customer must not see it.
4. Place one **clearly labelled test order** using a permitted test account. Confirm the price, +63 phone normalization, reference image, status and receiving method in customer and artist views. Cancel it afterward; cancelled records remain in history.
5. Check the site on an actual phone using mobile data: gallery loading, sign-in return, checkout button, saved hand photo, and try-on performance. The first try-on can download a large local hand-detection model.
6. Check Supabase usage, storage, and backups. Free projects can pause after low activity and do not provide the same reliability/backup guarantees as a paid production service.

Only share the public link after these checks pass and the business/photo issues above are resolved. If any login returns to localhost, review Supabase **Site URL** and the exact Redirect URL. If the callback page is a 404, check the Render Blueprint rewrite. If Google says access is blocked for a customer, review Google Auth Platform **Audience** and its test-user list or production status.

Official guides: [Render static sites](https://render.com/docs/static-sites), [Render Blueprints](https://render.com/docs/infrastructure-as-code), [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google audience status](https://support.google.com/cloud/answer/15549945), [Vercel Hobby restrictions](https://vercel.com/docs/plans/hobby).
