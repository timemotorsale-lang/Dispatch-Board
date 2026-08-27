# UCRM-120 — AI receptionist requirements and safety contract evidence

Status: `IMPLEMENTED_UNVERIFIED`

## Scope

UCRM-120 adds a manager-only AI receptionist requirements and safety contract covering consent, human handoff, bounded retrieval, escalation/no-action defaults, audit, and cost controls.

## Safety posture

- Live calls are disabled.
- Live texts are disabled.
- Autonomous actions are disabled.
- Simulation is allowed as the next safe foundation step.
- The assistant must fail closed when consent, authority, identity, confidence, or approved retrieval context is missing.
- No customer communication, provider traffic, scheduling, quote approval, promise, discount, or source-domain mutation is enabled.

## Verification

- Focused service tests cover management visibility, held/contracted requirement counts, live behavior blocked posture, and no credential/autonomous approval leakage.
- Focused route tests cover success and typed authorization denial.
- Full TypeScript typecheck passed.

## Remaining review

Business approval is still required for consent UX, retrieval fields, retention, access review, monthly AI/voice/text budget, and live rollout boundaries before any AI receptionist behavior can move beyond simulation.
