<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8f892ac6-d826-478a-a472-826437b7349f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Deployment
Production deployment is managed on Vercel from the `main` branch.



## Website / CRM shared data

The CRM reads `akbs_crm.leads` through the authenticated `akbs_crm_workspace`
RPC on the same Supabase project used by `akbspoultryweb`. Website contact
submissions already enter this table through `akbs_crm_capture_inquiry`;
customer registration creates a lead in the same table. There is no second
lead store or browser-local lead fallback.

- Use an existing AKBS staff login. Permissions are checked in the database.
- The CRM refreshes on window focus and every 30 seconds while visible.
- Lead IDs/references are issued by the database. Edits carry a version so
  concurrent changes cannot silently overwrite one another.
- Registration links open the website registration forms. Public quotation
  acceptance keeps its existing route and implementation.
- `.env.example` contains only public connection settings. Never expose the
  website gateway key, database password, or service-role key to Vite.
- `npm test` verifies registration field mapping and partial-update mapping.
  `npm run lint` checks TypeScript; `npm run build` creates production output.

This integration covers shared leads, dashboard lead metrics, notes,
follow-ups, staff/workflow/document reads, supported workflow writes, and
actual document upload/download. The pre-existing soft-quotation storage
implementation is separate and is not migrated by this connection.
