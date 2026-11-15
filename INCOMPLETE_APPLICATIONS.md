# Incomplete applications

Admin CRM now provides Leads → Incomplete Applications and Partners → Incomplete Registrations. Both lists show saved contact details, last fully completed form section, required-field completion percentage, signup/OTP timestamp and last saved activity. Open & Complete opens the persisted form for editing, draft saving or assisted submission.

Successful OTP seeds a draft without creating a lead. Both portals restore the request ID and autosave edits. Final submission uses the existing canonical submission workflow and removes the draft. The same request ID is idempotent, including admin/customer retries; late autosaves cannot recreate a submitted draft. Customer applications become normal leads. Partner registrations stay out of the customer lead UI and use the existing Pending → Approve & Activate → partner access workflow.

Only active ADMIN sessions with no required password change can list, edit or complete drafts. Admin completion requires confirmation of applicant authorization and declaration/contact consent, records the administrator in consent and audit data, and rejects stale edits. Server code takes the session token from the HttpOnly staff cookie. No additional client table access is granted.

Completion percentage represents required fields entered, reserves final submission and remains below 100% until submission. Contact fields not yet entered remain blank. Historical accounts without submissions are backfilled where available; unsaved form contents cannot be reconstructed. Last activity means last persisted draft activity. Browser close flushing is best effort; ordinary autosave remains the primary persistence mechanism.

Validation: TypeScript, 23 Node tests, 6 component tests, production build, and transactional SQL integration assertions pass. SQL covers OTP seed, admin/employee permissions, customer/partner separation, optimistic concurrency, consent, canonical submission, retries and late autosave. SQL fixtures roll back without retaining customer data. Browser visual verification was unavailable in this environment.

Migration `20260929073136_incomplete_portal_applications.sql` is applied to Supabase project ldffgetuzoeupuhoaubn. Frontend and BFF changes require the next CRM deployment. This change does not deploy Vercel or send outbound email.
