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

