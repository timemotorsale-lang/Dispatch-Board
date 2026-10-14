# Claims Workspace Implementation Status

**Branch:** `codex/claims-workspace-enterprise-foundation`  
**Current implementation target:** CLM-010 through CLM-050 workflow foundation plus durable persistence adapter

## Implemented

| Milestone | Status | Evidence |
| --- | --- | --- |
| CLM-010 Claim assistant shell | Implemented | `/vehicles/claims-desk` and `/vehicles/claims-workspace` render the desk and opened-claim workspace. |
| CLM-020 Durable claim record contract | Implemented foundation + database adapter | Server workflow service defines the claim aggregate, create command, activity history, evidence relationship model, repository boundary, Prisma schema tables, SQL migration, and Prisma repository adapter. |
| CLM-030 Snapshot and checklist | Implemented | Workspace read model derives claim snapshot, missing evidence checklist, primary blocker, and next action. |
| CLM-040 Evidence and documents | Foundation implemented | Evidence attach command supports category, status, notes, document-library id, and relationship targets for claim/customer/vehicle/repair order. |
| CLM-050 Handoff readiness | Implemented | Repair handoff gate blocks missing authorization, required photos, claim identity, carrier/manual exception, owner, and vehicle/customer facts. |

## API Surface

- `GET /api/claims-workspace/claims`
- `POST /api/claims-workspace/claims`
- `POST /api/claims-workspace/claims/:claimId/evidence`
- `POST /api/claims-workspace/claims/:claimId/handoff`

## Current Limits

- The repository boundary supports both in-process workflow tests and a Prisma-backed production adapter.
- Database migration exists for `InsuranceClaim`, `InsuranceClaimEvidence`, and `InsuranceClaimActivity`.
- The app routes still use the workflow service boundary; deployment wiring should select the Prisma adapter after migration rollout.
- Repair-order creation, supplement tracking, carrier communication integration, and payment recovery remain later milestones.
- Document library relationship fields are represented in the evidence model, but actual binary upload/storage integration remains later work.
- `prisma generate` may need to be rerun after local Windows file locks release; schema validation passes.

## Verification

- Claims workflow service tests cover desk read model, claim creation, duplicate blocking, evidence attachment, blocked handoff, and successful handoff readiness.
- Prisma repository adapter tests cover claim aggregate persistence and rehydration with evidence and activity.
- Existing Claims Desk, Claims Workspace, and intake form packet tests remain passing.
