# AKBS security architecture

## Authentication and request boundary
The CRM React UI uses `/api/secure`. Staff, customer and partner credentials live in separate HttpOnly, SameSite=Strict cookies (Secure in production). Tokens are not returned in browser JSON or stored in browser storage. Browser cookies expire after 30 minutes. Database expiry/revocation and active-account checks remain authoritative. Login and OTP endpoints must stay public; all workspace operations verify a hashed session and server-side role. Public quotation acceptance uses its random capability token, expiry and server state.

The BFF has an explicit operation allowlist, exact trusted Origin/Host checks, JSON content-type checks and body limits. Client-supplied credentials are discarded. Website inquiries use the existing secret-backed gateway and strict contact schema. Website customer and partner routes redirect to the CRM. No external email is sent by the test suites.

## Authorization and database
`akbs_crm` tables deny direct anon/authenticated access. Narrow SECURITY DEFINER RPCs implement custom-session authorization. ADMIN is the existing administrative role; no new SUPER_ADMIN role was invented. Managers and employees use lead/team ownership checks; customers and partners use account mappings. Internal gateway implementations cannot be invoked directly. Payment verification, refunds and assignment remain server-authorized actions. SQL uses typed parameters, scoped names and field allowlists.

Security events are private and record important authentication/financial changes. They are not a complete off-site, tamper-proof logging system. A database owner/service key remains highly privileged and must never enter a browser bundle.

## Payments, files and output
Amounts come from fee configuration. Customer payment submission uses the current canonical `akbs_customer_payment_submit` path; today's duplicate-reference and transaction fixes are preserved. Payment proof is private; authorized staff obtain short-lived signed URLs. Company QR images are intentionally public. Uploads validate MIME/extension/magic bytes and size; this is not malware scanning. BFF uploads accept 3 MiB to remain within serverless JSON/base64 limits. Receipt HTML and CSV formula-leading values are escaped.

## Integrations and deployment
Supabase Edge functions use custom session verification, so JWT verification remains disabled intentionally. Provider keys are server-only. Existing receipt email uses Resend; its revised function remains pending explicit approval after automatic deployment review blocked it. No Vercel deployment was performed. `git.deploymentEnabled=false` prevents automatic deployments while code is reviewed.

## Operational limits
A real-browser production regression run, email delivery verification, admin MFA, antivirus/quarantine, centralized alerting, backup retention/PITR and a restore drill remain operational follow-up. The website CSP retains inline scripts for current Next.js hydration; nonce-based CSP is a future hardening step. Shared Supabase applications outside AKBS were not modified. The current custom-auth architecture intentionally produces some SECURITY DEFINER and RLS-with-no-policy advisor notices; these do not grant direct table access.
