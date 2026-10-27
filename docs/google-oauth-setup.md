# Google login for Nails by Eurie

Project: **nails-by-eurie** (`ituisqtlvgvqpwaootuv`). The local `.env.local` contains the project URL and public publishable key and is excluded from Git.

Updated 23 October 2026: Google OAuth is enabled and worked in the local app. Email/password, phone, anonymous, and other sign-in providers are disabled. The database migrations through `006_security_validation.sql` are installed. The remaining OAuth work is to add and test the final deployed website origin.

## 1. Prepare the existing Supabase project

The database setup is complete in [the project dashboard](https://supabase.com/dashboard/project/ituisqtlvgvqpwaootuv). Migrations `001` through `006` and the seed catalog have already been applied. Do not rerun them on this project.

The migration installs private storage policies, customer isolation, order functions, and the protected admin allowlist for:

- `adriannesalazar9@gmail.com`
- `preciousclaudia555@gmail.com`

## 2. Review the existing Google OAuth client

Open [Google Cloud Console](https://console.cloud.google.com/) and select the existing Nails by Eurie Google Cloud project. Review its Google Auth Platform settings; do not create a duplicate client unless the existing one has been lost.

1. Configure branding with app name **Nails by Eurie**, a support email you control, and developer contact information.
2. Choose an External audience for ordinary Gmail customers. While the app is in Testing, add both admin addresses and any customer account used for testing to the test-user list.
3. Request only `openid`, email, and profile for sign-in.
4. Under Clients, open the existing **Web application** OAuth client.
5. Add this authorized JavaScript origin for development:

   ```text
   http://localhost:5173
   ```

6. Add this exact **authorized redirect URI**:

   ```text
   https://ituisqtlvgvqpwaootuv.supabase.co/auth/v1/callback
   ```

7. Keep the existing client ID and secret in Supabase's Google provider settings. Do not put the secret in the website, a `VITE_` variable, Git, or chat.

The Google redirect URI points to Supabase. The app callback below is a separate redirect configured in Supabase.

## 3. Review Google in Supabase

In Authentication → Sign In / Providers, confirm Google remains enabled. Keep nonce checking enabled. Email/password, phone, anonymous sign-in, and other providers should remain disabled. Keep new user sign-up enabled for customers.

Authentication → URL Configuration is now saved with `http://127.0.0.1:5173` as the temporary local Site URL and these exact Redirect URLs (approved by the user and verified in the dashboard):

```text
http://127.0.0.1:5173/auth/callback
http://localhost:5173/auth/callback
```

Use the same browser and hostname from start to finish: PKCE stores a verifier on the browser origin where sign-in starts.

Before deploying, set Site URL to the final HTTPS website origin and add its exact `/auth/callback` URL to Supabase. Add that HTTPS origin to the Google client's authorized JavaScript origins. Keep Google's authorized redirect URI pointing to Supabase. Complete the Google consent/audience requirements before opening sign-in to customers.

## 4. Verify

Restart the development server with `npm run dev`, then:

- Open a design, go to Try it on, and choose Continue with Google. Complete sign-in in the same browser. The app should return to that design.
- Test both admin accounts: each should have Artist desk access.
- Test a separate ordinary customer account: it should have no Artist desk or other customers' photos/orders.
- Reload and confirm the session persists; sign out and confirm private content disappears.
- Cancel a sign-in and confirm the app presents a retry message.
- Verify real photo uploads and the quote/order flow after the database migration is applied.

The automated suite currently covers callback handling and PostgreSQL access rules; it does not substitute for these live account tests.

References: [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE sessions](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).

