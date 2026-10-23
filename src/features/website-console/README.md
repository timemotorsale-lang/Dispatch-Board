# Website Console foundation

Staff entry: `/command-center` → **Website Console** → `/website-console`.

The Website Console lives in the authenticated staff app. The public customer website remains a separate app at `apps/dealership`. This module does not import that app, its local SQLite preview records, or its customer cookies. It does not publish staff records or duplicate vehicle/customer tables.

## Access

Active General Managers and staff with the existing delegated-manager capability can enter. Both the server page and navigation enforce the policy. The route is part of the MANAGEMENT workspace contract, including post-login return routing. There are no mutation endpoints or newly granted permissions.

## Navigation

The console has Overview, Inventory, Content & Media, Customer Requests, and Launch Readiness sections. Its console navigation takes precedence over an incidental contained-workspace query. It includes its own CCC Home return link. Existing inventory, frontline, Growth, Document Library, Sales, Advisor, and Integrations links open their canonical tools; their existing authorization still applies.

## Website destinations

Set these in the **staff app's** server environment, not the public app:

- `DEALERSHIP_PUBLIC_URL`: approved HTTPS origin only, for example `https://cars.example.com`. No credentials, path, query, or fragment. An empty or invalid value renders an unavailable state, not a fabricated public URL.
- `DEALERSHIP_PREVIEW_URL`: optional HTTP loopback override. Development defaults to the known local customer-app origin `http://127.0.0.1:3100`. This computer only; never offered in production.
- `DEALERSHIP_PREVIEW_ENABLED=false`: manually hides the review link before launch. A valid `DEALERSHIP_PUBLIC_URL` automatically hides it regardless of this switch or an explicit preview URL.

The console section bar includes **Open Website Preview**, which opens a new browser tab without replacing the console. The same action is also available in the header. Once the public address is set, only **View Website** remains. No environment change is needed to enable local review in development.

For repeat reviews after the preview stops or the computer restarts, run `npm run review` from `apps/dealership`, or use the saved **Open Time Motor Sales Website Preview.cmd** launcher. The helper verifies an existing local synthetic-data preview before reusing it, refuses to stop an unrelated process on port 3100, or starts the app with sample data on loopback. Keep the launcher window open while its server is running. Startup errors and framework security warnings remain visible; they are not bypassed. This is not an always-on hosted review environment or a phone-accessible URL.

The CCC Home hero and Website Console use the same destination resolver. External links open a new tab with `noopener noreferrer`. Neither configured address is a live health check or proof of deployment. No public domain was selected or environment value changed during implementation.

## Scope boundary

This is a console launchpad and integration-readiness foundation, **not** a finished publishing CMS or live website-request inbox. Inventory publication, content editing/approval, real customer intake/routing, account authentication, secure uploads, and financial providers remain unconnected. The interface explicitly identifies these limits, with no fake Save/Publish buttons or fabricated request/listing counts. Local preview records never appear as real incoming requests.

Before release, remediate the previously observed installed-framework security warning, complete the bridges with authorization and audit/reconciliation, and test the authenticated CCC-to-console flow in a running environment. No production deployment, migration, or provider activation is included.

## Validation

Focused regression command: `npx vitest run src/tests/unit/website-console.test.tsx src/tests/unit/navigation.test.ts src/tests/unit/workspace-routing.test.ts src/tests/unit/app-topbar.test.tsx`.

Coverage includes destination validation, production preview isolation, active-manager access, unauthorized direct-page rejection, login return routes, CCC navigation discovery, console shell selection, section resolution, canonical handoffs, and truthful unavailable states.
