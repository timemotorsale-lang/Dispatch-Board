# CRM Next — Permissions, Audit & Governance

## Principles

Least privilege; server-side enforcement; clear ownership; auditable sensitive actions; manager override where appropriate.

## Staff

View permitted customer context; execute assigned work; log communications/updates; manage permitted own pipeline/cases/tasks.

## Manager

Organization-wide visibility; assign/reassign; review escalations; override recommendations; manage permitted workflow/configuration.

## Sensitive domains

BHPH/payment, insurance, personally sensitive documents, and other restricted data use explicit permission scopes. Full Dispatch Board visibility does not automatically mean unrestricted financial/document access.

## Suggested scopes

`crm.customer.read`, `crm.customer.edit`, `crm.pipeline.manage`, `crm.case.manage`, `crm.finance.read`, `crm.payment.read`, `crm.documents.read`, `crm.insurance.read`, `crm.intelligence.read`, `crm.intelligence.override`, `crm.admin`. Exact naming follows existing conventions.

## Audit

Audit customer identity/merge changes; assignment; sensitive finance/payment edits; document actions; case escalation/closure; recommendation override; permission/configuration changes; migration/cutover actions.

## AI governance

Recommendations expose source/reason. Sensitive/high-impact actions require policy-defined human review. Future model/prompt changes affecting operational decisions should be versioned/auditable.



## Coordinator customer and deal intake

Operations Coordinator workspace eligibility includes Customer Console and CRM Next
entry. Coordinators use the existing SALES staff policy class for CRM access only;
this does not assign a Sales workspace or a manager role. Customer ownership and
record mutation checks continue to apply, and sensitive, export, and administration
capabilities remain denied. CRM feature-off and inactive-account checks still apply.
The fallback for a coordinator without a Sales workspace is `/operations-coordinator`.
Office Manager or Marketing Manager alone does not confer this eligibility.

Saved sidebar collapse applies only to rails supporting compact rendering. Standard
console sidebars remain expanded. Theme, sidebar, and workspace preferences fail
safely when browser storage is blocked; changes can still apply within the current
session. This fallback does not suppress business-record save failures or clear drafts.

Local verification used the existing Ancilla development identity: Customer Console
and Start Deal opened after the eligibility correction, including a saved collapsed
sidebar and unavailable local storage. This confirms the local defect, not the exact
cause on a staff member's production browser.


### Shared customer selection within a deal

Opening the console alone does not establish that staff can complete intake. The
shared deal selector loads its own paginated customer list instead of relying on
the owner-scoped command-center preview. An authorized Operations Coordinator may
select active company customers for a deal, including records owned by other staff.
This intake-specific access requires a current location membership in the configured
company and the existing CUSTOMER_LIFECYCLE_VIEW capability; explicit denials apply.
Search results expose only recognizable identity and masked contact information.
The selected record supplies the contact and identity fields required by the deal.

General CRM read/edit ownership, sensitive-data, export, manager, and other staff's
draft permissions remain unchanged. Both lookup and draft/context validation use
the same deal-specific customer boundary; selecting a record does not reassign it.
New and existing customer selections save the canonical link immediately. If saving
fails, the selection remains on screen with the draft-save error for retry.

Acceptance checks must cover customer listing, selecting a company customer owned
by someone else, creating a customer, saving the draft, and reopening that exact
saved draft. Loading the page or signing in alone is insufficient verification.


The Start Deal page preloads the first authorized customer/prospect page and its
pagination cursor through the shared deal identity service, independently of the
command-center preview. The selector renders that list immediately; its browser
fetch is only a fallback for other entry points. Preload failure produces an
explicit retry message rather than an unexplained blank panel. Verification must
include a fresh coordinator page with no search or selection, and must still show
the list when the browser's list-loading request is unavailable.
