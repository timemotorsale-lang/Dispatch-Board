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

## Evidence Rule

A milestone is complete only when documentation, implementation, tests, and user review evidence all match the same scope. Static frontend review data does not prove backend capability.
