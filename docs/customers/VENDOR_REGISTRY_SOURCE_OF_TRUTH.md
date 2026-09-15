# CRM Vendor Registry Source of Truth

**Document:** CRM Vendor Registry Source of Truth  
**Version:** 1.0 planning baseline  
**Date:** 2026-09-14  
**Status:** Draft for review before implementation  
**Primary future route:** `/customers/vendors`  
**Parent module:** Customers / CRM Console  

---

## 1. Purpose

The Vendor Registry is the dealership's trusted place to manage non-customer companies, partners, and internal contacts that support daily operations.

The operating question is:

> Who do we work with, what do they help us do, who owns the relationship, and what work is currently open with them?

The Vendor Registry should help staff find the right vendor quickly, understand the relationship history, and connect vendor work to vehicles, tasks, repair orders, appointments, deals, documents, and follow-ups.

---

## 2. Product Position

Vendors belong inside the CRM / Customers Console because CRM is the relationship system. Vendors should not be mixed into retail customer records, sales leads, or ordinary customer follow-up lists.

The architecture must follow the dealership's operating philosophy:

> Enterprise capability in the backend. Simple execution on the front end.

This means the system may support strong data modeling, permissions, audit history, category-specific rules, linked records, reporting, duplicate controls, and future intelligence behind the scenes. Staff should not feel that complexity when doing daily work. The front end should stay fast, clean, searchable, and action-oriented.

The recommended position is:

```text
CRM Console
  Customers
  Vendors
  Cases / Resolutions
  Leads / Opportunities
  Activity / Follow-up
```

Vendors are relationship records, but they are not retail customers.

---

## 3. Definition of Vendor

In this application, a vendor is:

> Any non-retail-customer business, organization, partner, provider, or internal contact that the dealership works with to complete operational, financial, sales, service, inventory, title, transport, repair, warranty, or administrative work.

This broad definition intentionally includes companies that may not be "vendors" in accounting language. The user-facing registry should still organize them under Vendor Registry because staff need one place to find and manage these working relationships.

---

## 4. Vendor Categories

Every vendor record must have one primary category.

Initial categories:

- Lender / Bank
- Warranty Company
- Transport Provider
- Parts Supplier
- Recon / Repair Vendor
- Auction / Wholesale Partner
- Internal Contact
- Other

Future categories may be added only when a real workflow needs distinct fields, permissions, reporting, or routing.

---

## 5. What Vendor Is Not

Vendor Registry is not:

- a retail customer list
- a sales lead pipeline
- a replacement for accounting vendor payment records
- a general notes bucket
- a duplicate of tasks, appointments, repair orders, deals, or vehicle records

Vendor Registry may link to those records, but it should not become their source of truth.

---

## 6. Core Vendor Record

Every vendor profile should support these common fields:

| Field | Purpose |
| --- | --- |
| Vendor name | Official or commonly used business/contact name |
| Vendor category | Primary category from the approved category list |
| Status | Preferred, Active, Pending Review, Inactive, Do Not Use |
| Main contact name | Primary person or desk |
| Phone | Primary phone number |
| Email | Primary email |
| Address | Mailing or service address |
| Website / portal | Login or public website reference |
| Internal owner | Staff member accountable for relationship quality |
| Notes | General operating notes |
| Last activity | Most recent interaction or linked event |
| Open work count | Tasks, follow-ups, or linked open items |
| Created / updated audit | Basic creation and update evidence |

Required for version 1:

- Vendor name
- Category
- Status
- At least one contact method or internal note

---

## 7. Category-Specific Fields

The core profile should stay clean. Special fields should appear only when the vendor category needs them.

### Lender / Bank

- dealer number
- lienholder address
- payoff phone
- payoff portal
- funding contact
- title release contact
- preferred funding notes

### Warranty Company

- claims phone
- authorization portal
- contract lookup instructions
- labor rate notes
- supplement / authorization rules
- escalation contact

### Transport Provider

- dispatch contact
- lane coverage
- insurance expiration
- average pickup timing
- after-hours contact
- preferred transport notes

### Parts Supplier

- account number
- delivery schedule
- order cutoff time
- payment terms
- return policy notes
- counter contact

### Recon / Repair Vendor

- services offered
- turnaround expectation
- authorization contact
- pickup/drop-off rules
- estimate requirement notes
- quality issue notes

### Auction / Wholesale Partner

- buyer/seller representative
- title contact
- arbitration contact
- lane/run notes
- payment/title timing notes
- transport handoff notes

### Internal Contact

- department
- role
- escalation path
- coverage hours
- backup contact

### Other

- custom notes only until a repeatable workflow justifies a new category or field group.

---

## 8. Vendor Profile Experience

The vendor profile should be a working relationship page, not a static address book.

Recommended sections:

- Overview
- Contacts
- Open Work
- Linked Records
- Activity Timeline
- Notes
- Documents
- Category Details
- Relationship Health

Version 1 may ship with a simpler profile:

- Overview
- Contact details
- Notes
- Open tasks
- Linked records placeholder

---

## 9. Vendor List and Search

Vendor Registry should support fast lookup by:

- vendor name
- contact name
- phone
- email
- category
- status
- service type
- account number
- linked vehicle stock number
- linked repair order
- linked deal

Default list columns:

- Vendor
- Category
- Status
- Main contact
- Phone
- Owner
- Open work
- Last activity

Useful saved views:

- Preferred Vendors
- Active Vendors
- Pending Review
- Do Not Use
- Lenders / Banks
- Warranty Companies
- Transport Providers
- Parts Suppliers
- Recon / Repair Vendors
- Auction / Wholesale Partners
- Internal Contacts

---

## 10. Vendor Actions

From a vendor profile, staff should eventually be able to:

- create task
- add note
- add update
- add contact
- add document
- link vehicle
- link repair order
- link appointment
- link deal
- mark preferred
- mark inactive
- mark do not use
- add issue / complaint
- set follow-up date
- record last contact

Version 1 actions:

- create vendor
- edit vendor
- add note
- create task
- mark active / inactive

---

## 11. Linked Records

Vendor profiles may link to:

- vehicles
- repair orders
- parts requests
- appointments
- tasks
- deals
- documents
- cases / issues
- payments or invoice references

Important boundary:

Linked records remain owned by their source module. Vendor Registry displays relationship context and creates navigation back to the owning record.

---

## 12. Activity Timeline

Vendor activity should eventually include:

- manual notes
- task created
- task completed
- appointment linked
- vehicle linked
- repair order linked
- document uploaded
- issue reported
- status changed
- contact updated

The timeline should answer:

> What happened with this vendor, when, and who handled it?

---

## 13. Permissions

Recommended permission levels:

| Permission | Staff | Manager | Admin / Accounting |
| --- | --- | --- | --- |
| View vendor | Yes | Yes | Yes |
| Add note | Yes | Yes | Yes |
| Create task | Yes | Yes | Yes |
| Create vendor | Optional | Yes | Yes |
| Edit core details | Limited | Yes | Yes |
| Change status | No | Yes | Yes |
| Mark Do Not Use | No | Yes | Yes |
| Manage sensitive docs | No | Limited | Yes |
| Manage payment/tax fields | No | No | Yes |

Version 1 can start with application-level staff access if detailed permissions are not ready, but sensitive accounting and tax fields must not be added until permissions exist.

---

## 14. Reporting and Intelligence

Future reporting should support:

- active vendors by category
- open work by vendor
- vendors with aging tasks
- vendors with repeated issues
- preferred vendor usage
- inactive vendors still linked to open work
- transport delays
- warranty authorization delays
- parts supplier delays
- recon vendor turnaround

Future intelligence should recommend:

- vendor follow-up needed
- vendor issue requires manager review
- duplicate vendor candidate
- stale contact information
- preferred vendor candidate
- do-not-use warning

---

## 15. Version 1 Build Scope

The first implementation should stay practical and reviewable.

Version 1 includes:

- CRM navigation entry for Vendor Registry
- vendor list page
- add vendor form
- vendor profile page
- category and status
- core contact fields
- notes
- basic tasks linkage or task creation handoff
- linked records placeholder
- search/filter by name, category, status, and contact info

Version 1 does not include:

- accounting payment controls
- W-9 or tax document management
- automated duplicate merge
- vendor performance scoring
- category-specific automation
- full reporting dashboard
- external vendor portal integrations

---

## 16. UX Principles

- Keep the staff-facing experience simple even when the backend is powerful.
- Make the first screen answer: find vendor, add vendor, open vendor, take action.
- Use progressive disclosure. Show advanced fields only when the category or task requires them.
- Keep vendors separate from retail customers.
- Make search fast and forgiving.
- Make category selection obvious.
- Do not show every specialized field for every vendor.
- Keep the profile practical for daily staff use.
- Make relationship history visible without forcing staff to open multiple modules.
- Use clear status labels so staff know who is preferred, active, inactive, or blocked.
- Avoid turning Vendor Registry into an accounting system.

---

## 17. Implementation Guardrails

- Do not add vendor records into the retail customer table without an explicit data-model decision.
- Do not create a standalone app or separate deployment.
- Do not expose backend complexity as front-end clutter.
- Do not turn the first release into a full enterprise vendor-management suite.
- Do not require staff to understand categories, permissions, linked-record ownership, or audit concepts before they can add or find a vendor.
- Do not add vendor financial/tax fields before permission rules are defined.
- Do not make vendor category a free-text field in version 1.
- Do not allow inactive or do-not-use vendors to be selected without a clear warning.
- Do not make linked records editable from the vendor profile unless the owning module already supports that command safely.

---

## 18. Simplicity and Enterprise Architecture Principle

Vendor Registry should be built as a simple staff tool with enterprise foundations underneath.

### Staff-facing simplicity

Version 1 front end should emphasize:

- one clear Vendor Registry entry point
- one search box
- simple filters
- a short add-vendor form
- an easy-to-read vendor profile
- visible category and status
- obvious actions: add note, create task, edit contact, mark inactive

The default user should not need to think about data ownership, audit trails, integration contracts, reporting schemas, duplicate keys, or future automation.

### Backend capability

The backend should still be designed to support:

- durable vendor identity
- vendor categories and statuses
- category-specific field groups
- audit history
- permissions
- notes and activity timeline
- linked records across CRM, tasks, appointments, inventory, repair orders, deals, and documents
- duplicate detection
- inactive and do-not-use safety rules
- reporting and intelligence
- future accounting/document controls

### Design rule

If a capability is powerful but not needed for daily staff execution, it belongs behind the scenes, behind a manager/admin view, or in a later phase.

---

## 19. Open Decisions

These decisions should be resolved before implementation:

1. Should internal contacts live in Vendor Registry permanently or move to a future Staff Directory?
2. Should Vendor Registry use `/customers/vendors` or a top-level `/vendors` route?
3. Which roles may create a new vendor in version 1?
4. Should "Do Not Use" require manager approval?
5. Which linked records are required in version 1: vehicles, tasks, repair orders, deals, or appointments?
6. Should vendor notes be visible to all staff by default?
7. What vendor statuses should be included at launch?

---

## 20. Recommended Build Order

1. Approve this source of truth.
2. Define version 1 acceptance criteria.
3. Add data model / storage plan.
4. Add Vendor Registry route and navigation entry.
5. Build vendor list and search.
6. Build add/edit vendor form.
7. Build vendor profile shell.
8. Add notes and task handoff.
9. Add basic linked record placeholders.
10. Add smoke tests and review screenshots.

---

## 21. Acceptance Criteria for Version 1

Version 1 is acceptable when:

- staff can open Vendor Registry from CRM
- staff can create a vendor with category, status, and contact details
- staff can search and filter vendors
- staff can open a vendor profile
- staff can add notes or updates
- staff can create or link a task from a vendor profile
- vendor records are visually and operationally distinct from retail customers
- inactive and do-not-use statuses are visible
- the build does not break existing customer, task, appointment, or CRM routes
