# Growth Console Traceability Matrix

**Status:** Foundation baseline
**Date:** 2026-09-07

| Outcome | UX surface | Workflow | Algorithm / rule | Milestone | Evidence |
| --- | --- | --- | --- | --- | --- |
| Staff know what growth work to do today | Growth Home queue | Daily Growth Home | Opportunity Priority Score | GROWTH-001, GROWTH-002 | Route render, UI screenshot, unit render test |
| Marketing and advertising operate together | Workspace tabs and campaign builder | Marketing Workspace, Advertising Workspace | Channel Fit Logic | GROWTH-001 | UI review |
| CRM remains the relationship record | CRM connection panel | CRM Connection Workflow | Source Authority Map | GROWTH-001, GROWTH-010 | Docs plus route text |
| Audience activation is safe | Audience review panel | Campaign Creation, Approval Workflow | Audience Readiness, Suppression Logic | GROWTH-003, GROWTH-030 | Render test, later policy tests |
| Message/ad approval is understandable | Approval panel | Approval Workflow | Message And Offer Readiness | GROWTH-004, GROWTH-030 | Render test, later command tests |
| No accidental sends or spend | Disabled launch controls | Approval Workflow, Exception Workflows | Permission Model, Budget Recommendation Logic | GROWTH-001, GROWTH-030 | UI copy and disabled controls |
| Automations are governed | Automation library | Automation catalog | Automation Eligibility Logic | GROWTH-005, GROWTH-060 | UI review, later policy tests |
| Results are measurable | Results panel | Results Workflow | Attribution Logic | GROWTH-006, GROWTH-040 | UI review, later reconciliation tests |
| Existing records are preserved | Guardrail language and command boundary | All workflows | Source Authority Map | GROWTH-000 onward | Docs and no destructive migrations |

## Evidence Rule

A milestone is complete only when documentation, implementation, tests, and user review evidence all match the same scope. Static frontend review data does not prove backend capability.
