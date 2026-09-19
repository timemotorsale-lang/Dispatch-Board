# Integration Source Authority Matrix

This matrix defines the default ownership rules for outside tools. A provider-specific intake document may narrow these rules, but it must not broaden them without explicit approval.

## Authority Types

| Type | Meaning |
| --- | --- |
| `CANONICAL` | This system owns the fact. Other systems may display or request changes through governed commands. |
| `ADVISORY` | This system can suggest or enrich, but cannot overwrite the canonical fact. |
| `DELIVERY` | This system performs an external action and reports delivery/result evidence. |
| `REFERENCE` | This system provides lookup context only. |
| `HELD` | No integration behavior is approved yet. |

## Default Matrix

| Fact or workflow | Internal owner | External role allowed by default | Notes |
| --- | --- | --- | --- |
| Customer identity | Customers / CRM | advisory or reference | External matches require duplicate review before merge or overwrite. |
| Customer contact method | Customers / CRM | advisory or delivery | Writes require consent, purpose, and audit. |
| Communication send | CRM / Communications | delivery | Provider reports send/delivery status; internal command decides whether sending is allowed. |
| Communication content | CRM / Communications | delivery or reference | Store minimum payload. Respect retention and restricted-note rules. |
| Appointment record | Appointments | delivery or advisory | Calendar tools can mirror or schedule only through appointment commands. |
| Staff task/work item | Tasks / Dispatch Board | advisory or delivery | External tools may notify or mirror; they do not own internal status. |
| Vehicle identity | Inventory / Vehicle 360 | advisory or reference | VIN/history providers enrich; internal vehicle registry remains canonical. |
| Repair order | Service / Repair Order | advisory or reference | DMS may be canonical for selected RO facts only after field-level approval. |
| Inventory lifecycle state | Inventory | advisory | External listings or market tools cannot move lifecycle stages directly. |
| Parts quote/order/shipment | Parts Operations | delivery or advisory | Vendor status must reconcile against internal demand/order records. |
| Sale record | Sales / Accounting boundary | held until approved | Prevent duplicate sold records and unreviewed financial writes. |
| Payment reference | Payments / Accounting boundary | delivery or reference | Never store payment-card or bank credentials in app records. |
| Accounting posting | Accounting/DMS boundary | canonical only after approval | Must include reconciliation, out-of-balance handling, and rollback plan. |
| Document upload | Owning workflow | delivery or reference | Document class, retention, malware scan, and access rules required. |
| E-signature envelope | Owning workflow / document authority | delivery | Signature provider returns envelope status; internal command accepts result. |
| AI enrichment | Owning domain | advisory only | AI cannot authorize actions, create facts, or bypass permissions. |

## Field-Level Rule

Every provider write must name:

- field path,
- internal owner,
- external source,
- direction,
- freshness expectation,
- conflict rule,
- mapping version,
- audit event,
- rollback behavior.

If a field is not listed, the provider cannot write it.

## Conflict Rules

| Rule | Use when |
| --- | --- |
| `CANONICAL_WINS` | internal owner remains trusted source |
| `SOURCE_WINS` | provider is explicitly approved as canonical for that field |
| `MANUAL_REVIEW` | duplicate, mismatch, legal, financial, identity, or customer-facing risk exists |
| `LATEST_FRESH` | low-risk advisory fields where newest source is acceptable |

Identity, consent, communication, payment, accounting, document, and approval conflicts default to `MANUAL_REVIEW`.

## Write Safety

Provider-originated writes must enter through existing domain commands. Direct database writes from an adapter are not allowed for consequential business facts.

Examples:

- An SMS provider may report delivery status, but the CRM communication command decides whether sending was lawful.
- A calendar provider may propose an appointment time, but the Appointment domain creates or updates the appointment.
- A DMS provider may provide accounting references, but accounting reconciliation decides whether an internal sale/payment record is complete.
- A document provider may store a file, but the owning workflow decides whether the document satisfies a checklist or approval gate.

## Open Decisions

- First provider family to pilot.
- Whether email/calendar starts with Gmail, Outlook, or a neutral sandbox provider.
- Whether document integrations begin with upload/storage, e-signature, or Drive/SharePoint style collaboration.
- Which DMS/accounting fields are truly canonical outside Dispatch Board.
- Exact credential storage and rotation path for production.
- Integration health dashboard location and role access.
