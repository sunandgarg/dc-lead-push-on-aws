# Deploying to AWS Amplify

## 1. Connect repo
AWS Amplify Console → New app → Host web app → connect Git repo → select branch.

## 2. Build settings
Amplify will auto-detect `amplify.yml` in the repo root. No changes needed.

## 3. Environment variables (App settings → Environment variables)
Add these (values from `.env` in this project):

- `VITE_SUPABASE_URL` = your Supabase project URL, for example `https://YOUR_PROJECT_REF.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = your project's publishable key (`sb_publishable_...`)
- `VITE_SUPABASE_PROJECT_ID` = your Supabase project reference

These are public/publishable — safe to expose in the build.

## 4. SPA rewrites (CRITICAL for React Router)
Amplify Console → App settings → Rewrites and redirects → add rule:

| Source                                                                 | Target         | Type           |
|------------------------------------------------------------------------|----------------|----------------|
| `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>` | `/index.html`  | 200 (Rewrite)  |

This ensures deep links like `/all-leads`, `/auth`, `/u/code` work on refresh.
(The `public/_redirects` file also acts as a fallback for Netlify-style hosts.)

## 5. Build image
Default Amazon Linux 2023 image with Node 20 works. The `amplify.yml` installs bun.

## 6. Custom domain
App settings → Domain management → Add domain. Amplify handles SSL automatically.

## 7. Backend
This app uses your independently managed Supabase project. Database migrations,
Auth, Storage, and Edge Functions must all be deployed to that project before the
frontend is used in production.

## Notes
- Short URL redirect script in `index.html` uses `%VITE_*%` placeholders that Vite replaces at build time — works on Amplify.
- Do NOT enable Amplify's "Hosting" SSR — this is a static SPA.
