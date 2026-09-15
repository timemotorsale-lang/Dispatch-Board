# Vendor Registry One-Shot Implementation Prompt

**Document:** Vendor Registry One-Shot Implementation Prompt  
**Date:** 2026-09-14  
**Status:** Ready for use after planning approval  
**Scope:** Implement Vendor Registry version 1 inside CRM / Customers Console  

Use this prompt when ready to build the Vendor Registry section in one coordinated implementation.

```text
Implement Vendor Registry version 1 inside the Time Motor Sales Dispatch Board CRM / Customers Console.

Create the work on branch codex/vendor-registry-v1.

Before coding, read and follow:

- docs/AGENTS.md
- docs/ARCHITECTURE.md
- docs/customers/README.md
- docs/customers/CUSTOMERS_ARCHITECTURE.md
- docs/customers/VENDOR_REGISTRY_SOURCE_OF_TRUTH.md
- docs/customers/VENDOR_REGISTRY_ARCHITECTURE.md
- docs/customers/VENDOR_REGISTRY_IMPLEMENTATION_ROADMAP.md
- docs/CURRENT_IMPLEMENTATION_STATUS.md

Primary philosophy:

Enterprise capability in the backend. Simple execution on the front end.

Build a simple staff-facing Vendor Registry while creating enough backend foundation for durable identity, controlled categories/statuses, permissions, audit/activity, notes, task handoff, and future linked-record/reporting capability.

Do not build accounting vendor management, tax/W-9 controls, vendor portal integrations, duplicate merge, advanced scorecards, external automation, or complex admin configuration in this version.

Product goal:

Staff should be able to open CRM -> Vendor Registry, find a vendor, create a vendor, open a vendor profile, add notes, see status/category, and create or prepare a task with vendor context.

Implementation requirements:

1. Preserve existing CRM and customer boundaries.
   - Keep vendors separate from retail customers.
   - Do not store vendors as customer records unless the existing architecture explicitly requires a reviewed shared-party model.
   - Do not break `/customers`, `/customers/resolutions`, appointments, tasks, inventory, sales, or existing CRM routes.
   - Vendor Registry may link to other records, but it must not become the source of truth for vehicles, tasks, appointments, repair orders, deals, documents, or accounting.

2. Data model and migration.
   - Add an additive migration for durable vendor records.
   - Include organization scoping.
   - Include controlled category and status.
   - Include vendor name, normalized name/search key, primary contact fields, address summary, website/portal URL, owner, account reference, notes, timestamps, and audit actor references where current patterns support them.
   - Add vendor notes/activity support using existing app conventions where possible.
   - Add a lightweight linked-record concept only if it can be done safely without mutating source modules.
   - Use indexes for organization, category, status, normalized name/search key, owner, and updated/created dates.

3. Vendor categories.
   - Use controlled values:
     - Lender / Bank
     - Warranty Company
     - Transport Provider
     - Parts Supplier
     - Recon / Repair Vendor
     - Auction / Wholesale Partner
     - Internal Contact
     - Other
   - Do not allow free-text categories in version 1.
   - UI labels should be simple and business-readable.

4. Vendor statuses.
   - Use controlled values:
     - Preferred
     - Active
     - Pending Review
     - Inactive
     - Do Not Use
   - Show status clearly in list and profile.
   - Inactive and Do Not Use must be visibly different from normal active vendors.
   - Do Not Use should require manager/admin permission if role infrastructure is available. If not available, keep the policy centralized and document the limitation.

5. Server-authoritative commands.
   - Add server-side validation and policy checks for every mutation.
   - Implement:
     - create vendor
     - update vendor
     - change status
     - add vendor note
     - create task from vendor or prepare task handoff using existing Task Engine conventions
   - Use idempotency where the project already uses idempotency for command routes.
   - Return clear staff-readable errors.
   - Fail closed on unauthorized or cross-organization access.

6. Read models.
   - Add a Vendor Registry list/search read model.
   - Add a Vendor Profile read model.
   - Keep read models simple for the UI.
   - Include:
     - vendor id
     - name
     - category
     - status
     - primary contact
     - phone
     - email
     - owner
     - open work count if available
     - last activity if available
   - If linked records, task counts, or activity are not fully available, show safe empty/unavailable states rather than failing.

7. Routes and navigation.
   - Add Vendor Registry route at `/customers/vendors`.
   - Add Vendor Profile route at `/customers/vendors/[vendorId]`.
   - Add a clear CRM navigation entry from the Customers/CRM area.
   - Preserve existing CRM navigation and routes.
   - If route grouping differs in the repo, follow the existing app route conventions while preserving the user-facing route intent.

8. Staff-facing UI.
   - Build a simple, clean Vendor Registry page.
   - Include:
     - page title: Vendor Registry
     - one primary search box
     - category filter
     - status filter
     - Add Vendor action
     - compact vendor list/table/cards using existing design conventions
     - empty, loading, unavailable, and no-results states
   - Avoid a heavy admin dashboard.
   - Avoid showing every category-specific field on the first screen.
   - Make the UI feel like daily execution, not enterprise configuration.

9. Add/edit vendor form.
   - Keep version 1 form short.
   - Include:
     - vendor name
     - category
     - status
     - main contact name
     - phone
     - email
     - address summary
     - website/portal
     - account reference
     - internal owner if supported
     - notes
   - Add success and error feedback.
   - Validate required fields before submitting.
   - Keep advanced/category-specific fields deferred unless implementation is simple and does not clutter the UI.

10. Vendor profile.
   - Build a simple Vendor Profile page.
   - Include:
     - header with vendor name, category, status
     - main contact
     - quick actions: Add note, Create task, Edit vendor
     - overview details
     - notes/activity
     - linked records placeholder or safe linked-record list if available
     - warnings for Inactive or Do Not Use
   - Make the profile visually distinct from a retail customer profile.

11. Task handoff.
   - Use existing Task Engine patterns.
   - Staff should be able to create or prepare a task from a vendor profile with vendor context carried forward.
   - Do not invent a second task system.
   - If durable task-vendor linking is too large for the first pass, create a safe handoff and document the limitation.

12. Permissions and safety.
   - Enforce organization isolation.
   - Let staff view vendors and add notes if current role rules permit.
   - Restrict create/edit/status changes to manager/admin where role infrastructure supports it.
   - Keep sensitive accounting/tax document fields out of version 1.
   - Do not allow inactive or do-not-use vendors to look like normal active vendors.

13. Tests and verification.
   - Add focused tests for:
     - validation
     - policy checks
     - repository/service behavior
     - list/search read model
     - create/update commands
     - add-note command
     - profile read model
     - inactive/do-not-use warning state where feasible
   - Add or update browser smoke coverage for:
     - opening Vendor Registry
     - searching/filtering vendors
     - opening a vendor profile
     - add vendor flow
     - add note flow
     - task handoff or task preparation flow
   - Run lint/typecheck and focused tests used by this repo.

14. Documentation and evidence.
   - Update docs/CURRENT_IMPLEMENTATION_STATUS.md with honest implemented status.
   - Update vendor docs if implementation decisions differ from the plan.
   - Document deferred items clearly.
   - Provide changed files, test commands, and remaining limitations in the final summary.

15. Implementation discipline.
   - Keep edits scoped to Vendor Registry and required CRM navigation/integration points.
   - Preserve user changes and unrelated dirty worktree files.
   - Prefer existing repo patterns over new abstractions.
   - Do not perform destructive git commands.
   - Do not commit or push unless explicitly requested after implementation.

Acceptance criteria:

- Staff can open CRM -> Vendor Registry.
- Staff can search and filter vendors.
- Authorized users can create a vendor.
- Authorized users can edit a vendor.
- Staff can open a vendor profile.
- Staff can add a vendor note/update.
- Staff can create or prepare a task from the vendor profile.
- Vendor category and status are visible and controlled.
- Inactive and Do Not Use vendors show clear warnings.
- Vendors remain separate from retail customers.
- The front end remains simple and clean.
- Backend foundations support enterprise growth without exposing complexity to staff.
- Existing customer, appointment, task, inventory, and CRM routes still work.
```

