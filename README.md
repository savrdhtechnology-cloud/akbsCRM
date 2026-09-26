# AKBS CRM

Live staff workspace backed by the existing `akbs_crm` schema in Supabase project `ldffgetuzoeupuhoaubn`.

## Run

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Optional environment overrides: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Only the publishable key belongs in the frontend. Never add a service-role key or database password.

Staff sign in using their existing AKBS login. Roles come from the server; there is no client-side role switch. Temporary passwords must be changed before workspace access. Sessions expire after eight hours and are stored only for the current browser tab.

## Workflows

- New leads automatically go to an active employee with the fewest open leads. Admin can reassign any lead or allocate existing unassigned leads. Managers are limited to their own team.
- Search, source/state/stage filters, own/unassigned tabs, pagination and CSV export use actual accessible records.
- Lead details, notes, call logs, tasks, follow-ups, visits, documents, proposals and financing records persist in Supabase. Writes reject stale versions.
- Conversion requires approval and an accepted proposal. Proposals move through draft, review, approval, sent and accepted/rejected states. Sending remains a manual confirmation, not a delivery API.
- WhatsApp/email templates open editable drafts in the user's messaging app. Opening a draft never confirms delivery. No provider email or WhatsApp API is configured by this change.
- Documents are private database records (PDF/JPEG/PNG, 2 MB each), downloaded only after parent-lead authorization.
- The existing soft quotation template builder is retained. Its project defaults and template configuration retain their existing browser-local persistence.
- Customer/partner registration routes and older prototype components remain in the repository; this change does not connect those prototype registration forms or partner supply-order screens to this workspace.

## Database and later migration

`supabase/migrations/*_akbs_workspace.sql` contains this workspace extension and `supabase/tests/workspace.sql` tests authorization and persistence inside a rolled-back transaction. Run tests with an administrator database connection; they leave no test users or leads. Sequence values may advance.

The migration **requires the existing `akbs_crm` schema baseline**, including users, leads, activities, documents, workflows, commissions, settings, sessions, and the `public_user`, `visible`, `lead_view`, `audit` and `rate` functions. It is not a standalone full-database dump.

Before moving to a new project, take a secure database backup/export of that existing schema and its sequence values, existing public inquiry capture dependencies, required extensions, grants and triggers. Restore that baseline and business data first; then apply the workspace extension, set the two frontend environment variables, and run the rollback tests. Do not commit customer data, password hashes, live sessions or gateway secrets to Git. Revoke sessions during cutover and require users to sign in again.

## Verification

TypeScript, production build and five simulated UI interaction tests pass. The UI tests cover login, filtering, lead creation, reassignment, follow-up status and employee controls using a mocked RPC. Live database behavior is tested separately. Browser visual verification was unavailable in the execution environment. Database regression tests cover missing-password rejection, password login, anonymous access, assignment, employee isolation, optimistic concurrency, call logging, follow-up completion, private document roundtrip, admin-only templates, the full proposal approval/acceptance path, customer conversion and logout revocation.

Security advisor notices for the private schema's RLS-without-policies are intentional: direct table access is denied and the RPC performs staff-session and per-lead authorization. The public RPC is intentionally executable for login, with all data operations requiring a valid staff session. See [Supabase advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Existing unrelated project warnings were not modified.
