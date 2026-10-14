# UCRM-119 — Quiet hours, rate limits, and cost controls evidence

Status: `IMPLEMENTED_UNVERIFIED`

## Scope

UCRM-119 adds a manager-only review model for communication quiet hours, rate limits, cost controls, consent checks, and global kill-switch readiness.

## Safety posture

- Automated sending is disabled.
- Provider traffic is disabled.
- Guardrail enforcement is preview-only until business decisions are approved.
- No customer communications, provider calls, webhooks, or operational mutations are enabled.
- Non-management users receive typed fail-closed authorization denial.

## Verification

- Focused service tests cover manager visibility, preview-only enforcement, held rule counts, kill-switch presence, and non-management denial.
- Focused route tests cover success and typed authorization denial.
- Full TypeScript typecheck passed.

## Remaining review

Final business decisions are still required for quiet hours, contact caps, monthly spend caps, opt-out policy, and override authority before this milestone can become `VERIFIED`.
