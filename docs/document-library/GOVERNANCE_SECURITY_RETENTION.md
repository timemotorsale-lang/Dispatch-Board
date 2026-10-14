# Document Governance, Security, and Retention

## Security Posture

Documents can contain customer identity, finance, insurance, legal, title, payment, employee, and operational evidence. The default posture is deny-by-default, need-to-know access, clear audit, and no hidden provider writes.

## Permission Model

Access should be evaluated by:

- authenticated user,
- organization/location,
- role/capability,
- linked record access,
- document sensitivity,
- workflow purpose,
- legal hold or restricted state,
- export/download permission.

Viewing a customer or vehicle does not automatically grant access to every document linked to it.

## Sensitive Actions

These actions require audit and may require elevated permission:

- view restricted document,
- download/export,
- replace accepted document,
- reject document,
- waive required document,
- archive document,
- remove external link,
- change sensitivity,
- change retention/hold status,
- connect external provider,
- share outside the organization.

## Audit Events

Minimum audit events:

- created document record,
- uploaded file,
- linked external file,
- viewed restricted document,
- changed document type,
- linked/unlinked record,
- added/removed packet requirement,
- accepted/rejected/waived,
- replaced version,
- archived/restored,
- export/download,
- provider sync/import/reference,
- legal hold applied/released.

Audit entries should include actor, timestamp, organization, subject, action, reason when required, previous/current state summary, correlation ID, and source.

## Retention and Archive

Retention is policy-driven and should not be improvised per file.

Default states:

| State | Meaning |
| --- | --- |
| `ACTIVE` | available for current work |
| `ARCHIVE_READY` | no active workflow requires it |
| `ARCHIVED` | retained but not active |
| `LEGAL_HOLD` | preserved and excluded from disposal |
| `DISPOSITION_PENDING` | future deletion/anonymization review required |

Initial implementation should support archive state, not destructive deletion.

## Legal Hold

Legal hold blocks:

- deletion,
- destructive replacement,
- archive disposal,
- provider cleanup that would remove evidence,
- automatic retention disposal.

Legal hold does not necessarily block viewing or operational use; access still follows sensitivity and workflow policy.

## Provider Security

External document providers must not expose:

- plaintext secrets,
- unrestricted public links,
- unauthorized cross-customer files,
- restricted fields in logs,
- hidden file copies that bypass audit.

Provider references should include:

- provider name,
- environment,
- external object ID or safe URL,
- last verified time,
- access posture,
- sync/import status,
- failure reason when unavailable.

## Export and Sharing

Document export is a command, not a browser shortcut.

Export should require:

- explicit purpose,
- record/packet scope,
- sensitivity review,
- permission check,
- audit event,
- short-lived download where possible.

Broad export and restricted document export should remain disabled until exact policy is approved.

