# LeadPush

Independent React and Supabase application for lead management, partner-college lead delivery, and URL shortening.

## Local development

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

Create `.env` with:

```dotenv
VITE_SUPABASE_PROJECT_ID=your-project-reference
VITE_SUPABASE_URL=https://your-project-reference.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Deployment

- Frontend: deploy the Vite `dist` directory to Cloudflare Pages.
- Backend: apply `supabase/migrations` to your Supabase project and deploy every directory in `supabase/functions`.
- Build command: `npm run build`
- Build output: `dist`

Set the three `VITE_SUPABASE_*` values as Cloudflare Pages build variables. Configure server-only integration credentials, including `META_VERIFY_TOKEN`, as Supabase Edge Function secrets; never add service-role or secret keys to `VITE_*` variables.

The frontend and backend are independent of any website-builder hosting service.
