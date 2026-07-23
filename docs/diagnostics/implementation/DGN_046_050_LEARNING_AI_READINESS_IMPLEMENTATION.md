# DGN-046-050 - Learning and AI Readiness Implementation

**Status:** Implemented in source; review/shadow readiness only, not AI authority or production activation  
**Branch:** `codex/diagnostics-dgn-046-050-learning-ai-readiness`  
**Gates:** `DG-G8`, `DG-G9`, `DG-G10` readiness support

## Outcome

This grouped slice implements the remaining post-advanced-coverage Diagnostics readiness controls:

- `DGN-046` verified similar-case retrieval;
- `DGN-047` controlled calibration proposals;
- `DGN-048` provider-neutral AI gateway readiness;
- `DGN-049` low-risk AI assistance drafts;
- `DGN-050` advanced AI diagnostic draft gate;
- `DG-G10` enterprise scale and ecosystem readiness.

The implementation deliberately stops at governed review and shadow readiness. It does not connect to a live AI provider, mutate production diagnostic logic, activate external adapters, approve customer-facing AI output, or grant any diagnostic, dispatch, repair, pilot, production, or AI authority.

## Implemented Source

- `src/server/diagnostics/learning-ai-readiness.ts`
- `src/features/diagnostics/learning-ai-readiness-card.tsx`
- `src/server/diagnostics/index.ts`
- `src/tests/unit/diagnostics-learning-ai-readiness.test.tsx`

## Coverage

### Verified similar-case retrieval

The retrieval evaluator returns only verified, permission-safe cases with valid verification checksums. It explains configuration, symptom, and evidence overlap, excludes unverified outcomes, and marks permission filtering explicitly.

### Controlled calibration proposals

Calibration proposals require verified outcome samples, offline evaluation, measured improvement, zero safety regression, rollback documentation, shadow monitoring, and independent approval. Proposals can become ready for shadow evaluation, but cannot self-modify production logic.

### Provider-neutral AI gateway readiness

The gateway readiness evaluator checks provider registry neutrality, permission-filtered retrieval, citations and source versions, prompt/model/tool versioning, privacy controls, prompt-injection controls, deterministic output validation, telemetry, cost/latency limits, kill switch, disabled mode, red-team scenarios, and acceptance signatures.

### Low-risk AI assistance

Low-risk assistance drafts cover dictation structuring, cited case summaries, missing/contradictory evidence drafts, and approved-procedure explanations. Every draft requires citations and human confirmation.

### Advanced AI diagnostic drafts

Advanced hypothesis, test-plan, similar-case, and repair-handoff drafts require a shadow-ready gateway, verified similar-case retrieval, groundedness threshold, abstention behavior, zero harmful-output findings, zero privacy findings, human-review workflow readiness, and completed offline evaluation.

### Enterprise scale and ecosystem readiness

The enterprise readiness gate checks multi-location policy inheritance, fleet/specialty partitions, adapter isolation, licensed connector contracts, governed telemetry ingestion, reconciliation and degraded behavior, load evidence, recovery objectives, regional data controls, support model, change governance, service-extraction justification, and acceptance signatures.

## Authority Boundary

This grouped slice does not authorize:

- self-modifying production diagnostic logic;
- live diagnostic test execution;
- diagnostic conclusions;
- dispatch;
- repair approval;
- customer presentation;
- controlled pilot activation;
- production rollout;
- AI activation as authority.
- enterprise production expansion.

All outputs explicitly keep human review required and AI authority false.

## Verification

Focused tests verify:

- similar-case retrieval excludes unverified cases and keeps permission-safe lineage;
- calibration proposals require offline evidence and remain shadow-only;
- AI gateway readiness remains supervised and kill-switch governed;
- low-risk AI drafts require citations and human confirmation;
- advanced AI diagnostic drafts fail closed when safety or groundedness evidence is incomplete;
- enterprise scale readiness fails closed when adapter, load, recovery, support, or governance evidence is incomplete;
- the readiness card renders the grouped boundary clearly.
