# Vendor Registry Architecture

**Document:** Vendor Registry Architecture  
**Version:** 1.0 planning baseline  
**Date:** 2026-09-14  
**Status:** Draft architecture for review before implementation  
**Source of truth:** [`VENDOR_REGISTRY_SOURCE_OF_TRUTH.md`](VENDOR_REGISTRY_SOURCE_OF_TRUTH.md)  
**Primary future route:** `/customers/vendors`  
**Parent module:** Customers / CRM Console  

---

## 1. Architecture Principle

Vendor Registry must follow the dealership operating philosophy:

> Enterprise capability in the backend. Simple execution on the front end.

The backend should be strong enough to support durable identity, permissions, audit history, category-specific fields, linked records, reporting, and future intelligence. The staff-facing experience should stay simple: find a vendor, add a vendor, open a profile, create a task, add a note, and keep moving.

---

## 2. System Position

Vendor Registry is a CRM relationship capability inside the existing Dispatch Board modular monolith.

```text
Dispatch Board
  App shell, auth, organization context
  Customers / CRM Console
    Customers
    Vendors
    Cases / Resolutions
    Leads / Opportunities
    Activity / Follow-up
  Shared Task Engine
  Appointments
  Inventory
  Repair / Service
  Documents
  Reporting
```

Vendor Registry should not become a separate app, a separate deployment, or an accounting system.

---

## 3. Domain Ownership

Vendor Registry owns:

- vendor identity
- vendor category
- vendor status
- vendor contact details
- vendor relationship notes
- vendor-specific operating details
- vendor activity timeline projection
- vendor-to-record relationship context
- vendor warnings such as inactive or do-not-use

Vendor Registry does not own:

- retail customer identity
- repair order execution
- vehicle lifecycle state
- appointment scheduling state
- task lifecycle state
- accounting payment truth
- document storage truth

Vendor Registry may link to those records and show context, but the owning module remains authoritative.

---

## 4. Recommended Module Boundaries

Future implementation should use clear boundaries similar to the Customers module.

```text
src/
  app/
    (app)/customers/vendors/
      page.tsx
      [vendorId]/page.tsx
    api/vendors/
    api/vendor-notes/
  features/
    vendors/
      vendor-registry-page.tsx
      vendor-profile-page.tsx
      vendor-form.tsx
      vendor-actions.tsx
      vendor-read-models.ts
      vendor-types.ts
  server/
    vendors/
      vendor-repository.ts
      vendor-service.ts
      vendor-policy.ts
      vendor-validation.ts
      vendor-read-model.ts
      vendor-activity.ts
```

Exact paths may adapt to existing repo conventions when implementation begins. The boundary rule matters more than the folder names: server authority belongs on the server, and UI should consume simple read models and commands.

---

## 5. Data Model Concept

Version 1 should use a dedicated vendor identity rather than storing vendors as retail customers.

Recommended conceptual records:

### Vendor

- id
- organizationId
- vendorNumber
- name
- normalizedName
- category
- status
- ownerUserId
- primaryPhone
- primaryEmail
- address fields
- websiteOrPortalUrl
- accountReference
- generalNotes
- createdAt / createdBy
- updatedAt / updatedBy
- archivedAt / archivedBy

### VendorContact

- id
- vendorId
- name
- role
- phone
- email
- isPrimary
- notes

Version 1 may keep contact fields on the vendor record if speed matters, but the architecture should allow contact normalization later.

### VendorCategoryDetail

Stores category-specific details without cluttering the main vendor record.

Examples:

- lender payoff details
- warranty claims portal
- transport lane coverage
- parts account information
- recon service notes
- auction title/arbitration contacts

Implementation options:

- typed tables per category when rules are stable
- JSON detail payload with validation when fields are still evolving

For version 1, prefer the simplest durable approach that still validates known categories and avoids free-form chaos.

### VendorNote

- id
- vendorId
- body
- visibility
- createdAt / createdBy
- updatedAt / updatedBy

### VendorActivity

Activity may be a vendor-specific table or a projection from the shared activity system.

Activity types:

- vendor created
- vendor updated
- status changed
- note added
- task created
- record linked
- document linked
- issue reported

### VendorRecordLink

Links vendor profiles to owned records in other modules.

- id
- vendorId
- recordType
- recordId
- labelSnapshot
- relationshipType
- createdAt / createdBy

Record types may include vehicle, task, appointment, repair order, deal, document, and issue/case.

---

## 6. Category and Status Model

Vendor category must be a controlled value, not free text.

Initial categories:

- Lender / Bank
- Warranty Company
- Transport Provider
- Parts Supplier
- Recon / Repair Vendor
- Auction / Wholesale Partner
- Internal Contact
- Other

Recommended statuses:

- Preferred
- Active
- Pending Review
- Inactive
- Do Not Use

Staff should see simple labels. Backend policy should decide what each status permits.

---

## 7. Command Model

All mutations should flow through server-authoritative commands.

Version 1 commands:

- create vendor
- update vendor
- change vendor status
- add vendor note
- create task from vendor
- link existing record to vendor
- archive vendor

Later commands:

- add category-specific detail
- add vendor contact
- report vendor issue
- mark preferred
- mark do not use with approval
- merge duplicate vendor
- upload/link sensitive document

Commands should validate organization access, permissions, required fields, status rules, and duplicate warnings.

---

## 8. Read Models

The UI should not assemble enterprise complexity on the client. Provide simple read models.

### Vendor List Read Model

Fields:

- id
- name
- category
- status
- main contact
- phone
- email
- owner
- open work count
- last activity

### Vendor Profile Read Model

Sections:

- overview
- contact details
- category details
- open tasks
- linked records
- notes
- timeline
- warnings

### Vendor Search Read Model

Search supports:

- name
- contact
- phone
- email
- category
- status
- account reference
- linked stock number or record label

The front end should receive a clean list result. Ranking, duplicate matching, and normalization belong behind the scenes.

---

## 9. Policy and Permissions

Minimum policy rules:

- organization isolation is mandatory
- staff can view active vendors
- staff can add notes and create tasks
- manager/admin can create and edit vendors
- manager/admin can change status
- do-not-use status requires manager/admin authority
- sensitive payment/tax/document controls require admin/accounting authority

Version 1 may start with simplified role gates, but the architecture must not assume every staff member can edit every vendor field forever.

---

## 10. Workflow Integration

Vendor Registry should integrate through clear handoffs, not by taking ownership of other modules.

### Tasks

Vendor profile can create a task with vendor context. The Task Engine owns completion, assignment, due dates, and task status.

### Appointments

Vendor profile may link to appointment context when a vendor meeting, pickup, delivery, or call is scheduled. Appointments owns scheduling truth.

### Inventory and Vehicles

Vendor profile may show vehicles linked to transport, recon, parts, warranty, or auction work. Inventory owns vehicle lifecycle truth.

### Repair Orders / Service

Vendor profile may link vendor repair or recon work to an RO. Repair/Service owns repair execution truth.

### Documents

Vendor profile may display document references. Document storage and permission truth belong to the document module.

---

## 11. UI Architecture

The staff UI should stay simple:

```text
Vendor Registry
  Search
  Filters
  Add Vendor
  Vendor List

Vendor Profile
  Header: name, category, status, main contact
  Quick actions: Add note, Create task, Edit, Mark inactive
  Overview
  Open work
  Notes
  Linked records
  Timeline
```

Avoid:

- dense admin dashboards on the first screen
- showing every category-specific field at once
- asking staff to understand backend ownership
- making accounting fields part of the first release

Use progressive disclosure. Show deeper controls only when role, category, or workflow requires them.

---

## 12. Enterprise Backend Capabilities

The backend should be ready for enterprise growth:

- durable identity
- duplicate detection
- category validation
- status enforcement
- audit events
- activity timeline
- linked records
- manager permissions
- sensitive field classification
- future document controls
- future reporting projections
- future intelligence signals

These capabilities should not make the staff UI heavy.

---

## 13. Version 1 Architecture Boundary

Version 1 should deliver:

- dedicated vendor records
- vendor list/search
- add/edit vendor
- vendor profile
- category/status
- notes
- task creation handoff
- linked record placeholder
- simple policy checks
- basic audit/activity events

Version 1 should not deliver:

- full accounting vendor management
- tax/W-9 management
- vendor portal integrations
- advanced performance scorecards
- duplicate merge workflow
- category automation
- complex admin configuration

---

## 14. Technical Risks

| Risk | Mitigation |
| --- | --- |
| Vendors get mixed with customers | Use dedicated vendor identity and route. |
| UI becomes too complex | Enforce progressive disclosure and version 1 scope. |
| Status rules are ignored | Centralize status policy server-side. |
| Linked records become alternate sources of truth | Store links only; owning modules retain mutation authority. |
| Sensitive vendor data appears too early | Defer payment/tax fields until permissions are ready. |
| Vendor categories sprawl | Keep categories controlled and approval-based. |

---

## 15. Architecture Acceptance Criteria

Architecture is ready for implementation when:

- source of truth, architecture, and roadmap are linked from the Customers planning package
- vendor identity is separate from retail customer identity
- version 1 route boundary is accepted
- category and status lists are approved
- role boundaries are accepted for version 1
- linked-record ownership rules are understood
- first release remains simple on the front end

