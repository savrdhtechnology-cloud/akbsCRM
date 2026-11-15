# AKBS Poultry CRM

The CRM and business portals for AKBS Poultry Farming Private Limited
(https://crm.akbspoultry.com). Next.js 15 (App Router) with the AKBS Royal Navy
& Gold premium interface.

The public website lives in a separate repository (`akbspoultryweb`) and links
here for login, customer registration and partner registration.

## Portals

| Route | Who |
| --- | --- |
| `/portal/login` | Staff, partner and customer sign-in |
| `/admin`, `/manager`, `/employee`, `/finance` | Staff portals (role checked by the API and database) |
| `/partner`, `/customer` | Referral partner and customer portals |
| `/customer/register`, `/partner/register` | Public registration forms |

Old links keep working: `/customer-registration`, `/partner-registration`,
`/partner-portal` and `/login` redirect to the routes above.

## Data

All data comes from the existing AKBS Supabase project through the
`akbs_crm_gateway` RPC (server-side only, see `lib/crm/server.ts`). There is no
mock data — every KPI, chart and table is computed from live records.
The database and the migrations in `supabase/` are unchanged by this app.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values (server-only).
2. `npm install`
3. `npm run dev` → http://localhost:3000
4. `npm run lint` (TypeScript) and `npm run build` before deploying.

Production deploys from `main` on Vercel.
