# Deploying the frontend to Cloudflare Pages

## Build configuration

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `20` or newer

## Build variables

Configure these in Cloudflare Pages under **Settings → Variables and Secrets**:

```dotenv
VITE_SUPABASE_PROJECT_ID=lxbcosppgjktydsbvamw
VITE_SUPABASE_URL=https://lxbcosppgjktydsbvamw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_K_MGauxPOtUgPh7NvGWhpw_7O5npR7s
```

The publishable key is intentionally safe for frontend use. Never put a Supabase
secret key, service-role key, database password, or partner API secret in a
`VITE_*` variable.

`public/_redirects` provides the SPA fallback required by React Router and is
copied into the production build automatically.

## Backend prerequisite

Cloudflare Pages hosts only the static frontend. Before publishing, apply every
file in `supabase/migrations`, deploy every directory in `supabase/functions`,
and configure the Edge Function secrets in the independent Supabase project.
