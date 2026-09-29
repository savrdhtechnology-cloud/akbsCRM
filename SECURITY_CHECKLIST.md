# Security release and migration checklist

- [x] Preserve current UI and merge latest partner/payment updates.
- [x] OTP counter persistence, replay/lockout and financial injection tests.
- [x] Quote ownership, role denial, payment ownership and duplicate reference tests.
- [x] API origin/cookie/allowlist, upload signature and portal signup gate tests.
- [x] CRM and website TypeScript checks and production builds.
- [x] npm dependency audits: zero reported findings at review time.
- [x] Primary security SQL migration applied; rollback-only tests leave no fixture records.
- [x] Payment proof, company QR and staff proof-view functions updated.
- [ ] Receipt Edge update: automatic review requires explicit authorization for customer/payment PDF data sent to Resend.
- [ ] Vercel release: intentionally not performed; cookie BFF, UI and headers are not live until deployed.
- [ ] Browser regression: environment browser daemon failed to start; no visual pass claimed.
- [ ] Verify provider delivery, backup retention, PITR, restore drill, alerts and MFA.

## Configuration
Set AKBS_SUPABASE_URL and AKBS_SUPABASE_PUBLISHABLE_KEY on the CRM server. VITE-prefixed values must contain only publishable configuration. Set AKBS_ALLOWED_ORIGINS to exact production origins; add specific preview origins only when testing. Website also requires the existing secret AKBS_CRM_GATEWAY_KEY. Edge service-role credentials stay in Supabase secrets. Optional Gemini keys stay on the server. Never commit real passwords, gateway keys or service-role keys.

## Release and rollback
Review SECURITY_AUDIT.md and test results. Recheck latest main before release. Deploy all updated BFF/API/UI files together only after release authorization. Existing browser sessions require a new login after cookie migration. Confirm customer/partner separation, admin/manager/employee views, signup, inquiry creation, assignment, quotation approval, private proof viewing and verified receipt actions in a real browser.

Do not reapply historical function snapshots over newer canonical payment migrations. Database history records security migration `20260928221450`; the repository file was generated at `20260928215034`. Reconcile migration history before using `supabase db push` on this existing project. This repo does not contain a full shared-project bootstrap. For a new project, export a reviewed schema-only baseline, apply ordered migrations, create private/public buckets deliberately, provision secrets separately, and test with synthetic accounts before copying authorized data.

Before production change, verify a recoverable backup. Prefer a forward fix; blindly restoring an old database or old ACLs can lose customer changes or reopen vulnerabilities. Roll back frontend as a complete version while retaining compatible security checks. Keep current Edge versions until the replacement passes checks. No backup or disaster-recovery guarantee is claimed by this audit.
