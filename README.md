# Labor Ready NY Inc Website (Next.js + Vercel)

This project has been migrated to a Vercel-aligned Next.js (App Router) setup while preserving existing page content and `.html` routes.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - run local Next.js dev server
- `npm run lint` - run ESLint
- `npm run build` - production build
- `npm run start` - run production server

## Route compatibility

- Existing static pages are preserved under `public/*.html`.
- Root (`/`) redirects to `/index.html`.
- Clean rewrites are enabled for:
  - `/about`
  - `/apply`
  - `/clients`
  - `/contact`
  - `/dispatch`
  - `/industries`
  - `/onboarding`
  - `/payroll`
  - `/portal`
  - `/services`

## Neon Postgres (serverless) setup

The demo API route uses Neon at:

- `GET /api/demo` (read)
- `POST /api/demo` (write; body: `{ "message": "..." }`)
- `POST /api/intake` (stores website form requests)
- `GET /api/intake` (admin request listing; requires token or admin session)
- `POST /api/admin/login` (admin login; sets secure session cookie)
- `POST /api/admin/logout` (admin logout)
- `GET /api/admin/requests` (admin request listing)
- `PATCH /api/admin/requests` (update request status)

Required environment variable:

- `DATABASE_URL` - Neon connection string
- `INTAKE_ADMIN_TOKEN` - admin password/token used for intake admin login
- `ADMIN_SESSION_SECRET` - HMAC secret used to sign admin sessions

If `DATABASE_URL` is not configured, the route gracefully returns a feature-disabled response and the site remains fully functional.

### Form routing behavior

- Public forms submit directly to `/api/intake`.
- Requests are managed at `/admin/login` and `/admin/requests`.
- This intake/admin system requires runtime hosting (Vercel/Next.js server). Static GitHub Pages cannot run the API or admin login.

Create `.env.local`:

```bash
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
INTAKE_ADMIN_TOKEN=<strong-admin-password>
ADMIN_SESSION_SECRET=<long-random-secret>
```

## Vercel deployment notes

- No custom server is required.
- Use Vercel default Next.js build settings.
- Set `DATABASE_URL`, `INTAKE_ADMIN_TOKEN`, and `ADMIN_SESSION_SECRET` in Vercel Project Settings → Environment Variables.

## Migration checklist

- [x] Bootstrap Next.js App Router project
- [x] Preserve existing HTML/CSS/JS content and route intent
- [x] Keep legacy `.html` routes working and add clean rewrites
- [x] Add Neon-backed intake API routes for all website forms
- [x] Add admin login and intake management workflow
- [x] Keep deployment compatible with Vercel defaults

## Rollback notes

If rollback is required:
1. Identify the last known-good static release commit:
   ```bash
   git log --oneline -- README.md index.html public/index.html
   ```
2. In Vercel, redeploy that commit from the project Deployments tab (or run `vercel --prod` from a checkout of that commit).
3. If needed, reset the branch to that commit and push a rollback PR:
   ```bash
   git checkout <known-good-sha>
   ```
4. Keep DNS unchanged; only switch deployment target back to the known-good revision.
