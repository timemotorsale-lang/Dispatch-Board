# Claims Workspace Implementation Status

**Branch:** `codex/claims-workspace-enterprise-foundation`  
**Current implementation target:** CLM-010 through CLM-050 workflow foundation

## Implemented

| Milestone | Status | Evidence |
| --- | --- | --- |
| CLM-010 Claim assistant shell | Implemented | `/vehicles/claims-desk` and `/vehicles/claims-workspace` render the desk and opened-claim workspace. |
| CLM-020 Durable claim record contract | Foundation implemented | Server workflow service defines the claim aggregate, create command, activity history, evidence relationship model, and repository boundary. Production database adapter remains the next backend step. |
| CLM-030 Snapshot and checklist | Implemented | Workspace read model derives claim snapshot, missing evidence checklist, primary blocker, and next action. |
| CLM-040 Evidence and documents | Foundation implemented | Evidence attach command supports category, status, notes, document-library id, and relationship targets for claim/customer/vehicle/repair order. |
| CLM-050 Handoff readiness | Implemented | Repair handoff gate blocks missing authorization, required photos, claim identity, carrier/manual exception, owner, and vehicle/customer facts. |

## API Surface

- `GET /api/claims-workspace/claims`
- `POST /api/claims-workspace/claims`
- `POST /api/claims-workspace/claims/:claimId/evidence`
- `POST /api/claims-workspace/claims/:claimId/handoff`

## Current Limits

- The repository boundary is implemented with an in-process repository for the first workflow foundation.
- Production database tables, migrations, and Prisma-backed persistence are not yet wired.
- Repair-order creation, supplement tracking, carrier communication integration, and payment recovery remain later milestones.
- Document library relationship fields are represented in the evidence model, but actual binary upload/storage integration remains later work.

## Verification

- Claims workflow service tests cover desk read model, claim creation, duplicate blocking, evidence attachment, blocked handoff, and successful handoff readiness.
- Existing Claims Desk, Claims Workspace, and intake form packet tests remain passing.
