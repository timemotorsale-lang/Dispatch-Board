# Growth Console Traceability Matrix

**Status:** Foundation baseline
**Date:** 2026-09-07

| Outcome | UX surface | Workflow | Algorithm / rule | Milestone | Evidence |
| --- | --- | --- | --- | --- | --- |
| Staff know what growth work to do today | Growth Home queue, Workflow Engine panel | Daily Growth Home | Opportunity Priority Score | GROWTH-001, GROWTH-002 | `src/server/growth/domain-engine.ts`, render test, domain test |
| Marketing and advertising operate together | Workspace tabs and campaign builder | Marketing Workspace, Advertising Workspace | Channel Fit Logic | GROWTH-001 | UI review, wired tab test |
| CRM remains the relationship record | CRM connection panel | CRM Connection Workflow | Source Authority Map | GROWTH-001, GROWTH-010 | Docs plus route text |
| Audience activation is safe | Audience review panel, Workflow Engine panel | Campaign Creation, Approval Workflow | Audience Readiness, Suppression Logic | GROWTH-003, GROWTH-030 | `decideGrowthAudience`, domain tests |
| Message/ad approval is understandable | Approval panel, Workflow Engine panel | Approval Workflow | Message And Offer Readiness | GROWTH-004, GROWTH-030 | `evaluateGrowthMessageReadiness`, policy tests |
| No accidental sends or spend | Launch lock and adoption review panels | Approval Workflow, Exception Workflows | Permission Model, Budget Recommendation Logic | GROWTH-001, GROWTH-030, GROWTH-080 | Advertising, automation, release readiness tests |
| Automations are governed | Automation library and activation panels | Automation catalog | Automation Eligibility Logic | GROWTH-005, GROWTH-060 | `decideGrowthAutomation`, automation activation tests |
| Results are measurable | Results and Workflow Engine panels | Results Workflow | Attribution Logic | GROWTH-006, GROWTH-040 | `attributeGrowthOutcome`, domain tests |
| Recommendations stay human-governed | Optimization panel | Results Workflow | Enterprise Optimization Logic | GROWTH-070 | `src/server/growth/optimization.ts`, optimization tests |
| Existing records are preserved | Guardrail language and command boundary | All workflows | Source Authority Map | GROWTH-000 onward | Docs and no destructive migrations |
| Source signals are safe to consume | Workflow Engine and future read adapters | CRM Connection Workflow | Source Authority, Freshness, Confidence | GROWTH-090 | `src/server/growth/source-adapters.ts`, source adapter tests |
| Audience decisions are explainable | Audience review and future audience builder panels | Campaign Creation, Approval Workflow | Suppression, Consent, Quiet Window, Cleanup | GROWTH-100 | `src/server/growth/audience-builder.ts`, audience builder tests |
| Campaign history is preserved | Campaign Plan and future ledger review panels | Campaign Creation, Approval Workflow | Version Preservation, Audit, Idempotency | GROWTH-110 | `src/server/growth/campaign-ledger.ts`, campaign ledger tests |
| Approval gaps point to one next action | Launch Readiness and future manager review panels | Approval Workflow, Exception Workflows | Role, Budget, Offer, Provider Gates | GROWTH-120 | `src/server/growth/approval-gates.ts`, approval gate tests |
| Results are attributed without overclaiming | Results and future reporting panels | Results Workflow | Attribution Window, Proof Events, Context Metrics | GROWTH-130 | `src/server/growth/results-attribution.ts`, results attribution tests |
| Landing page stays simple for staff | Today, Campaigns, Needs Attention, Results, Review Controls | Daily Growth Home | Backend Logic Hidden Behind Next Actions | GROWTH-140 | `src/features/growth/growth-console-foundation.tsx`, render tests |
| Backend commands fail closed before side effects | Future command entry points | All workflows | Role Permission, Mutation Boundary, Idempotency | GROWTH-150 | `src/server/growth/command-boundary.ts`, command boundary tests |
| Source signals become explainable opportunities | Today queue and future source detail drawer | Daily Growth Home, CRM Connection Workflow | Source Freshness, Opportunity Priority Score | GROWTH-160 | `src/server/growth/opportunity-orchestrator.ts`, opportunity orchestrator tests |
| Campaign lifecycle can be prepared end to end | Campaign drawer and future campaign detail workspace | Campaign Creation, Approval Workflow | Audience, Message, Approval, Policy, Launch Lock | GROWTH-170 | `src/server/growth/lifecycle-service.ts`, lifecycle service tests |
| CRM writeback remains reviewable and locked | Review Controls and future CRM writeback preview | CRM Connection Workflow, Results Workflow | Source Authority, Attribution Proof Filtering | GROWTH-180 | `src/server/growth/crm-writeback-preview.ts`, CRM writeback preview tests |

## Evidence Rule

A milestone is complete only when documentation, implementation, tests, and user review evidence all match the same scope. Static frontend review data does not prove backend capability.
