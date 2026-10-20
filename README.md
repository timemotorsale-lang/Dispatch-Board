# Time Motor Sales Dispatch Board

Time Motor Sales Dispatch Board is an internal responsive web app for assigning, recommending, tracking, and managing daily dealership duties.

It is built for two kinds of users:

- Managers who need to generate the daily board, review assignments, spot blockers, and keep work moving.
- Staff who need to see their work, update status, add comments, and report blockers quickly from desktop or mobile.

This project is an internal operations tool. It is not a DealerCenter replacement, a CRM, an accounting system, or a full repair-order platform.

## Money & Resources

Open `/money-resources`, or Workbook → More Tools → Money & Resources. Staff can record spending without a receipt, attach evidence later, request funds, record unused funds returned, and account for assigned company cards. Vehicle cost and repair-order links retain the existing canonical context. Managers can review other staff's records, record actual fund handovers and reimbursements, import posted card CSVs, match approved records, and export/print a daily operational journal.

Apply the additive `20261020010000_money_resources` migration after a verified backup. Financial audit events and cash review snapshots are append-only; original money facts are retained through corrections. Staff access is limited to their organization and own records. Receipt bytes use the existing private Document Library storage adapter and restricted document records. Production receipt storage must be configured separately.

Managers can select any active company card in their organization when recording spending on behalf of its assigned cardholder. The cardholder remains responsible, the audit identifies the person who entered it, and a different manager must review the entry. Staff still see only their own authorized cards. Use **Add company card** beside the funding selector to save and select a new card without clearing the purchase form.

**Purchasing authorizations** separate card custody from purchasing responsibility: authorize an employee for one existing vendor/card combination, permitted categories and purpose, a per-purchase limit, start/expiry dates and optional prior approval for every purchase. Above-limit purchases always require prior approval. Independent approval covers an exact amount, purpose, category and date and can be used once. Revoke and replace policies rather than editing history. Purpose descriptions require human review; category/amount/date exceptions are automatic. An actual purchase may still be recorded against an ended authorization, but is visibly flagged; recording is not permission to buy. Vendor/issuer restrictions must be arranged separately, and the application does not block bank charges.

**Expense report** provides date-range, employee (management), vendor, funding source, vehicle/RO, approval and receipt filters, an exceptions-only view, grouping and complete totals. Page controls show 50 records; CSV and print include every matching record, up to 10,000 over a maximum one-year range. Larger results require narrower filters rather than silently truncated totals. Staff reports/receipts remain scoped to their own records. New purchasing fields require the additive `20261020020000_money_purchasing_authorizations` migration after a verified backup. Existing daily journal and card matching remain available.

This is an operational accountability tool, not a bank integration or posted general ledger. It does not move money, enforce issuer-side card limits, pay reimbursements, make payroll deductions, or automatically duplicate inventory costs. Statement CSV headers are `transaction_id,date,merchant,amount` (ISO dates, USD; purchases positive, credits/payments negative). Every import needs stable issuer transaction IDs. Spending links to an existing matching inventory cost when supplied; otherwise use the existing vehicle-cost workflow for accounting allocation. Customer collections remain in their existing receipt workflow.

## Core MVP workflow

The MVP is centered on the daily dispatch workflow:

- Daily dispatch board generation from seeded roles, duties, and task templates
- Staff task updates with protected self-service permissions
- Required blocker reasons for blocked work
- Manager review support for approval-required tasks
- Assignment recommendations with explanation data
- Activity feed events for generation, task updates, blockers, comments, and review-ready work

## Current status

The repository already includes a working foundation for the MVP:

- Session-based login/logout with seeded local users
- Protected board, activity, settings, my-tasks, and task-detail routes
- PostgreSQL + Prisma schema, migrations, and seed data
- Daily board generation with duplicate prevention and generation-run tracking
- Staff task status updates, blocker validation, comments, and activity events
- Automated unit, integration, and end-to-end test coverage

Some planned MVP surfaces are still partial or deferred in the current codebase, including a dedicated manager review workspace and several non-core placeholder routes.

## Tech stack

- Next.js App Router
- React
- TypeScript
- PostgreSQL
- Prisma
- Server-side session auth
- Vitest
- Playwright

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in local values:

```bash
copy .env.example .env
```

The example environment defaults `NEXT_DIST_DIR` to `.next-local` so local development avoids common Windows and OneDrive file-lock issues in the standard `.next` folder.

3. Create your local PostgreSQL database and apply migrations:

```bash
npm run db:migrate
```

4. Generate Prisma client and seed local development data:

```bash
npm run db:generate
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

If Prisma has just been regenerated after a schema change and the dev app still shows an older Prisma runtime error, stop the dev server, delete the active Next cache directory (`.next-local` by default in local development), and restart. See [docs/SETUP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SETUP.md) for the Windows-specific recovery note.

If Prisma regeneration fails on Windows with an `EPERM` rename error around `query_engine-windows.dll.node`, stop the local dev server before retrying generation.

6. Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

For the full setup flow, environment details, troubleshooting, and testing notes, see [docs/SETUP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SETUP.md).

For a production-oriented single-server Ubuntu deployment using Docker Compose,
PostgreSQL, Caddy HTTPS, scheduled jobs, and automated database dumps, see
[docs/DOCKER_DEPLOYMENT.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/DOCKER_DEPLOYMENT.md).
For private VPN access with Tailscale Serve and no public web listener, see
[docs/TAILSCALE_DEPLOYMENT.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/TAILSCALE_DEPLOYMENT.md).

## Quality commands

Use the real repo scripts from `package.json`:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm test` runs the Vitest suite, which covers both unit and integration tests in this repo.

## CI and production deployment

The `CI` workflow validates pull requests targeting `main`, pushes to `main` and
`general-overall-refinement`, and manual runs. It runs the dependency security
gate, lint, typecheck, tests with an isolated PostgreSQL database, and build.
These events do not deploy to production.

To deploy an approved revision, wait for successful `CI` on the corresponding
`main` push, then manually run `Deploy Production` from `main` and enable
`confirm_deployment`. The deployment workflow verifies successful CI for its
exact revision before accessing the production host. It retains the existing
production environment, backup, migration, and health checks.

If Docker Hub downloads fail with a certificate or network error, manually run
`Diagnose Production Network` from `main`. It checks the server's DNS, verified
TLS connections, an independent DNS-over-HTTPS comparison, and current health.
It does not build images, deploy, migrate data, restart services, or change
server configuration. HTTP 401 from the registry is normal for this unauthenticated
connection check; a hostname certificate mismatch must be repaired, not bypassed.

On the diagnosed Time Server, wired `eno1` DNS returns valid Docker addresses,
while Wi-Fi `wlp1s0` DNS returns Comcast portal addresses. The prepared
`deploy/docker/scripts/repair-wifi-dns-routing.sh` requires administrator access
and the verified network layout. It installs a persistent Wi-Fi DNS routing
override, verifies Docker Hub TLS, and reverts its override on verification
failure. It does not deploy or restart Docker. Do not run it on a different
network layout without review. The deployment SSH account currently lacks the
administrative permissions required to apply this repair.

## Project docs

- Current implementation status: [docs/CURRENT_IMPLEMENTATION_STATUS.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/CURRENT_IMPLEMENTATION_STATUS.md)
- Enterprise data movement program: [docs/data-movement/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/data-movement/README.md)
- Setup: [docs/SETUP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SETUP.md)
- Docker Compose and Tailscale deployment: [docs/DOCKER_COMPOSE_TAILSCALE.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/DOCKER_COMPOSE_TAILSCALE.md)
- Architecture: [docs/ARCHITECTURE.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/ARCHITECTURE.md)
- Roadmap: [docs/ROADMAP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/ROADMAP.md)
- Projects module guide: [docs/projects/PROJECTS_MODULE_GUIDE.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/projects/PROJECTS_MODULE_GUIDE.md)
- Scheduler verification contract: [docs/SCHEDULER_VERIFICATION_CONTRACT.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_VERIFICATION_CONTRACT.md)
- Production scheduler task prompts: [docs/PRODUCTION_SCHEDULER_TASK_PROMPTS.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/PRODUCTION_SCHEDULER_TASK_PROMPTS.md)
- Enterprise Appointment program: [docs/appointments/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/appointments/README.md)
- Enterprise Sales Console planning package: [docs/sales-console/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/sales-console/README.md)
- Unified CRM Console foundation: [docs/unified-crm/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/unified-crm/README.md)
- Growth Console foundation: [docs/growth-console/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/growth-console/README.md)
- COO Workbook and Staff Reporting Intelligence: [docs/coo-workbook/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/coo-workbook/README.md)
- MVP scope: [docs/MVP_SCOPE.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/MVP_SCOPE.md)
- Release checklist: [docs/RELEASE_CHECKLIST.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/RELEASE_CHECKLIST.md)
- Enterprise workspace UI source of truth: [docs/ENTERPRISE_WORKSPACE_UI_SOURCE_OF_TRUTH.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/ENTERPRISE_WORKSPACE_UI_SOURCE_OF_TRUTH.md)
- Time & Attendance program: [docs/time-attendance/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/time-attendance/README.md)
- Inventory-to-Frontline workflow planning package: [docs/inventory/frontline-workflow/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/inventory/frontline-workflow/README.md)

## MVP release boundary

The MVP focuses on the daily dispatch board and broad inventory, advertising, marketing, sales, and basic collections-related workflows.

Deferred after MVP:

- Native mobile apps
- DealerCenter or other DMS integrations
- Asana integration
- Google Workspace integration
- Email or SMS notifications
- Advanced AI-only assignment or capacity scoring
- Full CRM, accounting, repair-order, or compliance replacement
