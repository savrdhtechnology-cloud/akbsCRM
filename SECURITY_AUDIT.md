# AKBS security audit — 29 September 2026

Scope: CRM main `086ad73`, website main `64da84ee`, current AKBS functions/tables in the shared Supabase project. UI and business features are preserved. This is a source/configuration review with regression testing, not a claim of complete security or a destructive penetration test. Other companies' applications in this shared project are outside scope.

## Critical vulnerabilities
- C1: Portal OTP wrong-code branch updates attempts and then raises an exception, rolling back the counter. Five-attempt limit can therefore be bypassed.
- C2: `portal_custom.submit` accepts the entire form JSON, including `_initialPayment.verificationStatus` and amount. Staff lead updates merge arbitrary `details` too. These paths allow financial-state injection.
- C3: Quotation update authorizes the submitted lead, but does not authorize the existing quotation before replacing its parent/payload. Finance/other roles also fall through privileged status actions. Historical quotation RLS trusts unrelated product roles in the shared database.

## High vulnerabilities
- H1: Receipt print interpolates unescaped customer/service/reference text into `document.write` (stored XSS).
- H2: Authenticated tokens are stored in sessionStorage; XSS can steal them. Same-origin HttpOnly cookie API layer is required for both staff and OTP portals.
- H3: Public AI endpoint has no authentication, ownership check, request bound or rate limit; exception text is returned verbatim.
- H4: Payment proof upload permits repeated replacement of verified payment data, races on whole-row details, accepts MIME without file signature verification, and lacks duplicate UTR protection.
- H5: Multiple auxiliary staff RPCs do not enforce the mandatory first-password-change gate. Legacy implementation RPCs are independently executable, bypassing newer wrappers.
- H6: Fee transaction state/amount/refund rules and immutable financial audit history are incomplete.

## Medium vulnerabilities
- M1: Website CORS defaults to wildcard; framing globally allowed. CRM has no response security headers.
- M2: OTP account enumeration, concurrent resend race, old challenge reuse, excessive email requests.
- M3: Edge functions use wildcard CORS, unbounded JSON parsing, raw errors, email-based rather than account-mapping ownership and inadequate rate limits.
- M4: Legacy static-secret admin table grants and RPCs remain accessible despite removal of the website admin UI.
- M5: Public quotation counter table has RLS disabled. Expired quotation details remain retrievable through acceptance lookup.
- M6: Private snapshot records are insufficiently scoped for managers; protected nested fields lack strict allowlists.

## Low vulnerabilities / operational gaps
- L1: Security architecture, rollback, backup retention and configuration requirements are undocumented.
- L2: Existing portal tests target a removed password-auth implementation; they do not exercise current email OTP.
- L3: Default grants expose internal trigger/helper functions. Public key literals are not secrets, but example environment files should use placeholders.

## Existing protections
Bcrypt password hashes; random hashed staff session tokens and 30-minute expiry; hashed portal sessions/OTP with expiry; RLS on AKBS private tables; server lead visibility and role checks on many workflows; first-password-change in primary gateway; ownership checks on draft/timeline; guarded website contact schema, bounded body, origin check and gateway secret; server-side fee configuration; application idempotency.

## Required fixes / audit surface
CRM: Vite React frontend, Vercel AI function, direct Supabase RPC auth/RBAC and Edge payment uploads/email. Website: Next.js routes `/api/contact`, `/api/admin-email-settings`, `/api/email-assets/[type]`, legacy catch-all; website customer/partner routes redirect to CRM. Files: database documents, payment proofs and public company QR assets. Finance: settings, accounts, transactions, initial proof, refund/adjustment, commissions. Integrations: Resend via vault/private secret table, WhatsApp user-controlled copy/share, optional Gemini API. No payment-card processor is implemented.

Implement scoped DB fixes and regression tests; add cookie BFF, input bounds, CSRF/origin checks, headers, safe output encoding and dependency audit. Keep active API contracts compatible until explicit deployment. Database/Edge changes must be migrated together where required. Record verified outcomes and remaining deployment/configuration gaps below after tests. No Vercel deployment is authorized.

## Verified outcome — 29 September 2026
The original SQL hardening is applied as migration `20260928221450`. A rollback-only regression run against the subsequently updated live schema also passed. This preserves later canonical payment and partner-access work from CRM main `356a6e9`.

CRM: 20 node tests and 4 portal tests pass. Website: 6 isolated database/validation regression tests pass. Both TypeScript checks/builds pass. Both dependency audits report zero known vulnerabilities; jsPDF was upgraded to 4.2.1. These tests are not a complete penetration test.

Applied Edge versions: payment-proof v16, admin QR v4, payment-proof-view v5. Receipt update is prepared but NOT deployed: automatic review rejected deployment because it forwards customer/payment details and a PDF to Resend without explicit destination/payload approval in this thread. Existing receipt function remains; its undefined customer-path secret reference is fixed in the pending source. No test email was sent.

HttpOnly BFF, CSP/security headers, escaped receipts/CSV, frontend fixes and tests are repository changes pending an authorized Vercel release. Browser verification was blocked by the environment's browser daemon startup failure; Deno local checking could not download the JSR manifest, while the three deployed Edge functions bundled successfully on Supabase. Backup/MFA/antivirus/nonce-CSP and remaining shared-project advisor warnings are documented in SECURITY_ARCHITECTURE.md and SECURITY_CHECKLIST.md. No claim of complete security is made.
