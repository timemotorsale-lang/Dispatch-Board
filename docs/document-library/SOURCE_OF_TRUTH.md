# Document Library Source of Truth

## Principle

The Document Library owns document control. Storage providers hold files. Workflow packets define business need.

No outside storage system should become the accidental authority for whether a claim, repair, sale, title, purchase, or customer workflow is complete.

## Authority Boundaries

| Question | Source of truth |
| --- | --- |
| What is this document? | Document Library |
| What file or link represents it? | Storage Provider |
| Which workflow needs it? | Workflow Packet |
| Does it satisfy a requirement? | Document Review |
| Who may see it? | Document Library permission policy |
| How long should it be retained? | Retention policy |
| Who changed/reviewed/archived it? | Document audit |
| Is an outside provider connected? | Integration registry |

## Provider Boundaries

External systems may:

- store or expose a file,
- provide a reference link,
- return metadata,
- return signature or delivery status,
- provide packet status,
- suggest document type.

External systems may not by default:

- mark an internal workflow complete,
- bypass document review,
- overwrite document classification,
- decide internal permissions,
- remove audit evidence,
- delete internal document records,
- satisfy legal hold or retention decisions,
- create hidden duplicate packets.

## Document Classification

| Class | Examples | Default handling |
| --- | --- | --- |
| Public/low sensitivity | public listing photo, generic vendor brochure | ordinary access controls |
| Internal | internal checklist, operating packet | staff access by workflow |
| Confidential | customer contact docs, claim packet, repair proof | need-to-know workflow access |
| Restricted | finance docs, IDs, insurance/legal docs, title docs, payment evidence | explicit capability and audit |
| Security/Audit | audit export, access evidence, incident evidence | security/manager-controlled |

## Ownership Rules

Every document must have:

- owning domain,
- owning record,
- document type,
- sensitivity,
- source,
- current status,
- storage pointer or external reference,
- retention/archive posture.

Every packet must have:

- packet type,
- owning workflow,
- required document list,
- optional document list,
- current completion state,
- blockers,
- review requirements.

## Field-Level Authority

| Field | Authority |
| --- | --- |
| document type | Document Library, with reviewer correction |
| business owner | owning workflow |
| storage location | Storage Provider |
| sensitivity | Document Library policy |
| packet requirement | Workflow Packet definition |
| accepted/rejected | Document Review |
| expiration | Document Library policy plus document metadata |
| retention/archive | Retention policy |
| external status | provider as advisory/delivery evidence |

## Golden Rule

The provider can tell us where the document is. The Document Library tells us what the document means.

