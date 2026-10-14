# DGN-024–025 Adaptive Testing Implementation

**Status:** Implemented in source  
**Implemented:** 2026-07-21  
**Gate impact:** Advances `DG-G3`; does not approve production knowledge, rollout, publishing, or pilot use.

## Delivered boundary

### DGN-024 — eligible next-test generation

- Generates candidates only from approved, versioned server-side test definitions that distinguish at least two viable hypotheses or resolve an unresolved conflict.
- Evaluates applicability, prerequisite, safety/hazard, capability, qualification, tool, vehicle-state, authorization, source-validity, and definition-validity gates independently.
- Preserves every exclusion and every reason code. Multiple simultaneous failures are retained.
- Fails closed when no test is eligible. A failed hard gate never becomes a ranking penalty and cannot be bypassed by override.

### DGN-025 — transparent test optimization

- Calculates normalized expected information gain from hypothesis probability mass and declared outcome partitions.
- Ranks eligible tests using explicit, versioned weights for information gain, risk reduction, downstream unblocking, reliability, technician time, cost, invasiveness/vehicle risk, setup/resource delay, and bounded look-ahead.
- Stores each normalized factor, weight, signed contribution, stable rank, alternatives, tie-break outcome, policy identity, bounds, and checksums.
- Permits an authorized technician to select a lower-ranked eligible test with a substantive reason. The original recommendation, selection, actor, prior override, policy, and lineage checksum remain immutable.

## Runtime and authority controls

- `POST /api/diagnostics/cases/{caseId}/adaptive-tests` evaluates the latest complete reasoning result with at least two viable hypotheses.
- `POST /api/diagnostics/cases/{caseId}/adaptive-tests/{evaluationId}/override` records an authorized alternative selection.
- Clients cannot submit test definitions, operational readiness, weights, hypotheses, conflicts, or source status. An approved server-side provider supplies definitions and current shop/technician context; no default provider is active.
- Evaluation and override require separate capabilities, case ownership/manager authority, Diagnostics Reasoning rollout, optimistic concurrency, idempotency, audit event, domain event, and outbox handling.
- The database binds each evaluation to the same tenant, case, reasoning record, and exact reasoning result checksum. Evaluation and override tables are append-only.

## Determinism and replay

The engine canonicalizes test and hypothesis keys, sorts inputs and exclusions, validates weight normalization, applies deterministic tie-breaking, and records input, result, weight, and override-lineage SHA-256 checksums. Bounded look-ahead is disclosed with its maximum test count and evaluated-alternative count; it does not claim exhaustive future planning.

## Verification evidence

- Information-gain reference and no-gain partition cases pass.
- Applicability, prerequisite, hazard, capability, qualification, tool, state, authorization, source rights/expiry, and definition expiry exclusions pass with complete reason retention.
- No-discrimination abstention, hard-gate no-scoring-bypass, stable ordering, transparent factor contribution, cost/risk tradeoff, malformed-weight rejection, alternative preservation, and override lineage cases pass.
- Service tests prove server-owned inputs, latest reasoning/checksum binding, capability/ownership/rollout enforcement, no-provider fail-closed behavior, and eligible-only overrides.
- Prisma validation, TypeScript validation, and zero-warning lint pass.

## Explicitly not delivered

- No production adaptive-testing provider, licensed vehicle-specific source activation, or live tool/resource adapter.
- No automatic conversion of a recommendation into a case test plan or execution; the technician retains the governed DGN-015–016 planning/execution boundary.
- No hypothesis conclusion, confirmation, rejection, or signoff; those remain DGN-026.
- No adaptive-testing UI or complete no-start simulation/benchmark experience; those remain DGN-027.
- No database deployment or Diagnostics rollout activation.

## Exit disposition

DGN-024 and DGN-025 are complete in source. `DG-G3` remains open until DGN-026–027, approved knowledge/provider activation, and the required no-start simulation, benchmark, safety, explanation, and usability evidence are complete.
