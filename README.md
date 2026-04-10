# M Cube Spaces CRM

Internal CRM for M Cube Spaces sales, showroom, and admin teams. The app is built with React, TypeScript, Vite, Supabase, React Query, and Tailwind, and is deployable to Vercel as an installable PWA.

## Current scope

The app currently includes:

- Supabase authentication with protected and admin-only routes
- Supabase-backed lead list, lead detail, create/edit flows, stage updates, and assignment
- Activity timeline and follow-up scheduling/completion
- Admin users page with role updates, activation/deactivation, and bulk lead reassignment
- Real dashboard metrics and charts
- CSV import preview, validation, duplicate checks, insert flow, and CSV export
- PWA manifest and service worker support

## Tech stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase Auth + Postgres + RLS
- TanStack React Query
- Vercel
- `vite-plugin-pwa`

## Local setup

### 1. Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file from `.env.example`.

```bash
cp .env.example .env
```

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

Example:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_URL=http://localhost:8080
```

### 4. Run the app

```bash
npm run dev
```

The local app runs on `http://localhost:8080`.

### 5. Build locally

```bash
npm run build
```

## Supabase setup

### 1. Create a Supabase project

Create a new Supabase project and note:

- Project URL
- Anon public key

Do not use the service role key in the frontend.

### 2. Run the schema

The schema migration currently lives at:

- [supabase/migrations/20260409_phase2_leads.sql](/c:/Users/Divas/OneDrive/Desktop/McubeSpaces_Work/MCS_CRM/supabase/migrations/20260409_phase2_leads.sql)

Paste it into the Supabase SQL Editor and run it, or apply it through the Supabase CLI if you prefer.

This creates:

- enums for roles, stages, lead source/type, priorities, activities, follow-ups, and quotations
- `profiles`
- `leads`
- `lead_activities`
- `follow_ups`
- `lead_assignments`
- `quotations`
- `app_settings`
- timestamp triggers
- profile auto-creation trigger for new auth users
- indexes
- RLS policies

### 3. Create the first admin user

After creating your first user in Supabase Auth, update the profile role manually:

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@mcubespaces.com';
```

### 4. Recommended auth settings

In Supabase Auth:

- enable email/password auth
- set the site URL to your deployed app URL
- add local and production redirect URLs

Recommended redirect URLs:

- `http://localhost:8080/auth/update-password`
- `https://your-vercel-domain.vercel.app/auth/update-password`
- `https://crm.yourdomain.com/auth/update-password`

## Environment variables

### Frontend

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
- `VITE_APP_URL`: app base URL used for auth-related redirects and deployment documentation

### Important security note

- Never expose the Supabase service role key in the frontend.
- All privileged behavior should be enforced with RLS and, where needed later, secure server-side functions.

## RLS notes

The schema enables RLS on the core tables and applies role-aware access rules.

Current design assumptions:

- admins can view and manage all leads, users metadata, settings, and assignments
- non-admin users can only access permitted leads through assignment or creator ownership
- inactive users are blocked in the frontend from accessing protected routes
- `profiles.is_active` is the source of truth for user activation state

You should still validate these policies in your Supabase project before production rollout.

Recommended verification checklist:

1. Confirm an admin can view all leads and edit all users.
2. Confirm a sales user can only see their own or assigned leads.
3. Confirm a deactivated user can no longer work in the app.
4. Confirm `lead_activities`, `follow_ups`, and `lead_assignments` follow the same visibility rules as their parent lead.

## Vercel deployment

### 1. Import the repo into Vercel

Create a new Vercel project and import this repository.

### 2. Build settings

These defaults are fine for this project:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### 3. Environment variables in Vercel

Add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

For production, `VITE_APP_URL` should be your public app URL.

### 4. SPA routing

This repo includes [vercel.json](/c:/Users/Divas/OneDrive/Desktop/McubeSpaces_Work/MCS_CRM/vercel.json) with SPA rewrites so routes like `/leads/123` load correctly on refresh.

### 5. Deploy

Push to the connected branch or deploy from the Vercel dashboard.

After deployment:

1. Open the app URL.
2. Confirm login works.
3. Confirm direct links like `/dashboard`, `/leads`, and `/leads/:id` load correctly.
4. Confirm password reset redirects return to `/auth/update-password`.

## PWA notes

The app now includes:

- a web app manifest
- service worker registration
- install metadata and icons
- Vite PWA plugin configuration

Installability should work in Chromium-based browsers and on supported Android devices.

Manual checks after deployment:

1. Open the deployed site in Chrome.
2. Confirm the install prompt or browser install action appears.
3. Install the app and confirm it launches standalone.
4. Verify major routes open after install.

## Useful scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Production notes

- The app is currently frontend-only with Supabase as the backend.
- Notifications in the top bar are still placeholder UI.
- Invite-based user onboarding is still scaffolded, not fully implemented.
- CSV import currently validates required fields, enums, dates, numeric fields, and duplicate email/phone. It does not yet create import-job audit records.
- Dashboard metrics are computed client-side from fetched lead/follow-up data. This is practical for current internal usage, but materialized views or RPCs may be better if volume grows significantly.
- The current PWA icon set uses SVG assets. That is acceptable for modern browsers, but PNG icons are still recommended later for broader platform consistency.

## Pending recommendations

Recommended next production-hardening work:

1. Move dashboard aggregations into Supabase views or RPC functions for larger datasets.
2. Replace placeholder notifications with a real reminder feed.
3. Add invite flow or admin-assisted user creation backed by secure server-side logic.
4. Add audit records for imports and exports.
5. Add automated tests for auth guards, import validation, and lead workflows.
6. Add PNG app icons and splash assets for the widest mobile install support.

## Final implementation summary

Completed across the six phases:

- project audit and cleanup of the fake auth path
- Supabase auth scaffold and route protection
- database-aligned lead types and services
- live leads list, detail, create, edit, assignment, and stage updates
- activity logging and follow-up management
- Supabase-backed admin users page
- real dashboard metrics
- CSV import/export
- PWA support
- Vercel deployment readiness

The repo is now in a practical internal-deployment state for M Cube Spaces, with the main remaining work centered on scale hardening, notifications, onboarding automation, and additional test coverage.
