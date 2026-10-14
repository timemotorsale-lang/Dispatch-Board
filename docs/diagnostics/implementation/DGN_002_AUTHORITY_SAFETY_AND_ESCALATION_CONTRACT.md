# DGN-002 — Authority, Safety, and Escalation Contract

**Status:** Implemented contract; runtime enforcement deferred  
**Date:** 2026-07-20  
**Gate contribution:** `DG-G0`

## Decision

Diagnostic authority is capability-, qualification-, vehicle/system-, location-, and risk-scoped. Job title alone never grants technical confirmation authority. UI visibility never substitutes for server enforcement.

## Product charter

Diagnostics exists to help qualified shop personnel move from a customer concern to an evidence-supported cause and verified repair with less avoidable time, uncertainty, and parts replacement. It is a technician-first workspace with governed advisor, foreman, manager, knowledge, safety, and audit views.

Success means higher evidence quality, safer and more discriminating testing, transparent uncertainty, complete handoffs, verified outcomes, and useful organizational learning. It does not mean maximizing automated conclusions or minimizing abstention at any cost.

Diagnostics owns case reasoning and diagnostic work coordination. It does not own customer authorization, price, inventory balance, purchasing, dispatch assignment authority, repair execution truth, QC disposition, vehicle release, payroll, or source licensing decisions.

## Accountable roles

| Role | Owns | Cannot independently do |
| --- | --- | --- |
| Product owner | Product scope, priorities, provisional UI approval | Approve technical truth or safety procedure without qualified review |
| Fixed Operations owner | Shop operating policy, staffing, pilot, escalation | Weaken technical/safety evidence requirements |
| Diagnostic technical owner | Ontology, tests, confirmation policies, technical review | Approve own safety-critical release when independence applies |
| Safety owner | Hazard classes, non-waivable gates, stop-work/recovery rules | Authorize customer scope or price |
| Data/knowledge owner | Sources, licensing, lineage, withdrawal | Declare automotive correctness without technical reviewer |
| Engineering owner | Implementation integrity, security, recovery, monitoring | Activate unapproved diagnostic logic |
| Advisor | Concern intake, diagnostic authorization, customer updates, estimates | Edit measurements, pass tests, eliminate hypotheses, confirm cause |
| Technician | Observe, measure, execute eligible tests, propose findings | Publish/confirm outside capability or bypass safety/authorization |
| Qualified diagnostician | Advanced testing and cause confirmation within qualification | Authorize price, parts purchase, repair, QC, or release |
| Foreman/shop manager | Assign, review, escalate, approve permitted overrides | Fabricate evidence or waive non-waivable safety controls |
| Independent reviewer/QC | Review high-risk conclusion and verification | Independently review own work where separation applies |
| Knowledge author/reviewer | Create/review governed content | Activate unvalidated or unlicensed content |
| Auditor | Read authorized history and controls | Mutate case or operational truth |

## Capabilities

Planned server capabilities:

- `DIAGNOSTIC_CASE_VIEW`, `DIAGNOSTIC_CASE_CREATE`, `DIAGNOSTIC_CASE_ASSIGN`;
- `DIAGNOSTIC_EVIDENCE_RECORD`, `DIAGNOSTIC_TEST_EXECUTE`;
- `DIAGNOSTIC_CONCLUSION_PROPOSE`, `DIAGNOSTIC_CONCLUSION_CONFIRM`;
- `DIAGNOSTIC_HIGH_RISK_CONFIRM`, `DIAGNOSTIC_OVERRIDE_CREATE`;
- `DIAGNOSTIC_RECOMMENDATION_PUBLISH`;
- `DIAGNOSTIC_VERIFICATION_EXECUTE`, `DIAGNOSTIC_VERIFICATION_REVIEW`;
- `DIAGNOSTIC_KNOWLEDGE_AUTHOR`, `DIAGNOSTIC_KNOWLEDGE_APPROVE`, `DIAGNOSTIC_RULE_ACTIVATE`;
- `DIAGNOSTIC_AUDIT_VIEW`.

Capabilities accept constraints for location, system family, vehicle class, voltage class, maximum risk tier, required certification, own-case/assigned-work, independent approval, and effective dates. Explicit deny wins.

## Risk tiers

| Tier | Examples | Required control |
| --- | --- | --- |
| `R0 ROUTINE` | Read-only review, low-risk visual observation | Authorized case access and attributable entry |
| `R1 CONTROLLED` | Standard meter/scan tests with no consequential actuation | Applicable procedure, qualified technician, tool/readiness checks |
| `R2 ELEVATED` | Road test, fuel/pressure, lifting, invasive electrical, active controls | Enhanced qualification, explicit hazard checklist, stop conditions |
| `R3 HIGH` | Brake/steering/restraint, ADAS calibration, module programming, immobilizer, high voltage | Named capability, independent review or two-person control, strict recovery |
| `R4 PROHIBITED/EXTERNAL` | Unlicensed secure bypass, unsupported programming, unavailable safe procedure/equipment | Engine abstains; route OEM/specialist/sublet |

## Non-waivable gates

- organization/vehicle/case/source applicability;
- authentication and required qualification;
- secure-access and legal restrictions;
- high-voltage isolation/absence-of-voltage where applicable;
- restraint, fuel, brake, steering, lifting, road-test, and programming prerequisites;
- instrument suitability and required calibration;
- valid vehicle state and safe environment;
- customer/internal diagnostic authorization where required;
- confirmed emergency stop, recovery, or programming power-support requirement.

An override may select another eligible test or document a policy exception. It cannot transform a prohibited or unsafe action into an eligible action.

## Separation of duties

- Safety-critical knowledge author cannot be its sole approver.
- High-risk confirmer cannot be the sole independent verifier when policy requires independence.
- AI, integrations, advisors, dispatchers, and parts staff cannot confirm cause.
- Repair authorization, financial approval, parts purchasing, QC pass, and release remain outside Diagnostics.
- Emergency containment may stop work or restrict a vehicle; it does not confirm cause or authorize repair.

## Escalation ladder

```text
Technician -> qualified diagnostician -> foreman/shop manager
  -> safety/technical owner -> OEM/remote specialist/sublet
```

Escalation triggers include out-of-model behavior, unresolved hard conflict, insufficient qualification/equipment/source rights, repeated inconclusive tests, high-risk system, suspect instrument/setup, source withdrawal, programming/security need, unsafe reproduction, and failed verification/recurrence.

The escalation packet contains the complete permission-filtered case, not a rewritten note: concern, configuration, evidence, tests, hypotheses/conflicts, sources, versions, safety state, time used, question, and requested decision.

## Denied-command scenarios

1. Advisor attempts to confirm a cause: deny.
2. Technician has test capability but not high-risk confirmation: allow eligible test; deny confirmation.
3. Manager lacks system qualification: may route/escalate; cannot confirm technical cause.
4. Knowledge author attempts to approve own R3 procedure: deny.
5. Qualified diagnostician attempts cross-location case access without grant: deny.
6. User attempts road test without eligibility/current vehicle safety: deny.
7. AI invokes publication: deny; require authorized human command.
8. Explicit deny conflicts with role default: deny.
9. Capability expires mid-case: preserve work; deny new consequential command and route reassignment.
10. Safety gate becomes unsatisfied after test start: pause/stop safely; retain evidence; require recovery.

## Implementation requirements

DGN-006 must specify capability persistence and reason codes. DGN-007 onward must enforce the contract server-side. DGN-019 must implement risk/readiness gates. No runtime capability is claimed here.

**Disposition:** `DGN-002` complete as a governing contract.
