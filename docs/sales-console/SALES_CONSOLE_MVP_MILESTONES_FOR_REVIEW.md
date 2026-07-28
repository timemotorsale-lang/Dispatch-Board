# Sales Console MVP Milestones for Review

**Status:** Planning review only; no implementation authorized  
**Product area:** `/sales`  
**Goal:** Build a stable MVP console with an enterprise foundation that can expand later  
**Visual reference:** `assets/enterprise-sales-console-review-mockup-v1.png`  
**Related roadmap:** `SALES_CONSOLE_IMPLEMENTATION_PLANNING_MILESTONES.md`

## 1. MVP definition

The MVP should be a real Sales Console, not a throwaway demo. It should be narrow enough to build safely, but structured like the long-term enterprise product.

The MVP should provide:

- one stable `/sales` operating surface;
- approved enterprise layout and navigation;
- read-only visibility into sales work, leads, deals, inventory fit, and manager risk;
- role-aware access and sensitive-action guardrails;
- clear expansion path for opportunity workflow, deal desk, approvals, finance handoff, and reporting.

The MVP should not yet automate or authorize sensitive selling actions.

## 2. MVP principles

| Principle | Meaning |
| --- | --- |
| Narrow scope | Build the smallest console that is useful every day |
| Enterprise shape | Use permanent navigation, data boundaries, permissions, and audit posture |
| Read first | Start with trusted visibility before commands |
| No risky writes | Avoid customer messaging, quotes, vehicle holds, finance decisions, and discount approvals |
| Expand cleanly | Every MVP section should map to future workflows without rework |
| Manager-visible | The MVP must help managers see risk early, not only help salespeople view tasks |

## 3. MVP milestone roadmap

| ID | Milestone | MVP scope | Exit proof |
| --- | --- | --- | --- |
| SAL-MVP-00 | Approval and scope lock | Confirm mockup, MVP boundaries, pilot users, and no-risk action policy | Written approval of MVP scope and visual direction |
| SAL-MVP-01 | Sales Console shell | Stable `/sales` route, sales navigation, loading/error states, responsive console layout | Sales user can open `/sales`; unauthenticated/denied paths are handled clearly |
| SAL-MVP-02 | Visual foundation | Translate approval mockup into reusable UI patterns: topbar, KPI strip, dense tables, manager rail, status chips | UI matches approved enterprise direction closely enough for stakeholder review |
| SAL-MVP-03 | Read-only data contract | Define which existing records feed the MVP: tasks, customers, leads, appointments, vehicles, deal placeholders | Data-source map shows owner, freshness, and fallback for each field |
| SAL-MVP-04 | Salesperson Today MVP | Show a ranked seller queue with customer, vehicle, stage, next action, freshness, blocker, and reason | Salesperson can understand top priorities within 30 seconds |
| SAL-MVP-05 | Lead Operations MVP | Show lead intake health, new leads, unassigned/stale leads, SLA risk, duplicate-review indicators | Manager/BDC can identify leads needing attention without changing records |
| SAL-MVP-06 | Manager Command Center MVP | Show risk queues, approvals-needed placeholders, delivery blockers, forecast placeholder, and top opportunities | Manager can drill from risk summary to underlying records or planned placeholders |
| SAL-MVP-07 | Inventory Intelligence MVP | Show customer-fit vehicle matches, readiness state, availability, blockers, and fit reasons | Blocked vehicles are never presented as clean recommendations |
| SAL-MVP-08 | Deal Desk MVP | Show lightweight deal table with scenario/version placeholder, approval status, estimated payment label, and blocker state | Deal desk visibility exists without quote submission or finance automation |
| SAL-MVP-09 | Customer and appointment links | Link sales items to Customer 360, appointments, vehicles, and task records where available | Users can move from sales console to source context without duplicate entry |
| SAL-MVP-10 | Role and permission guardrails | Gate sensitive visibility and actions by role; show unavailable actions as planned or disabled | Salesperson, manager, and admin views expose only appropriate information |
| SAL-MVP-11 | MVP smoke and pilot readiness | Add route smoke, render smoke, auth/access smoke, and review checklist | MVP passes tests and is ready for limited pilot review |
| SAL-MVP-12 | Pilot review and stabilize | Run limited review with selected users, capture feedback, fix usability and data issues | Pilot users agree console is stable enough for daily read-only use |

## 4. What is included in the MVP

| Console area | Included in MVP | Notes |
| --- | --- | --- |
| `/sales` route | Yes | Permanent home for Sales Console |
| Enterprise visual direction | Yes | Based on approved mockup |
| Salesperson Today | Yes | Read-only queue first |
| Lead Operations | Yes | Read-only health and risk view |
| Manager Command Center | Yes | Risk visibility and drilldown |
| Inventory Intelligence | Yes | Fit, readiness, blockers, alternatives |
| Deal Desk | Limited | Visibility and placeholders, not full desking |
| Customer 360 | Linked | Sales console should reference customer truth |
| Appointments | Linked | Show appointment state and route to appointment console |
| Tasks | Linked | Use existing task system where possible |
| Permissions | Yes | Sensitive fields and actions gated from start |
| Audit model | Planned foundation | Required before write commands expand |

## 5. What is excluded from the MVP

| Excluded item | Reason |
| --- | --- |
| Customer texting/email automation | Requires consent, templates, opt-out, logging, and approval policy |
| Quote submission | Requires scenario versioning, finance disclaimer, approval rules, and audit |
| Vehicle holds/reservations | Requires inventory authority and conflict handling |
| Finance decisions | Must remain outside MVP until finance handoff policy is approved |
| Discount approval automation | Requires authority matrix and margin visibility policy |
| AI-generated sales actions | Requires governance, citations, approval, and fallback |
| Full reporting suite | MVP should show core metrics first, then expand |
| Multi-store administration | Enterprise expansion item after single-store stability |

## 6. MVP build order

Recommended order:

1. Approve MVP scope and visual direction.
2. Finalize shell, route, navigation, loading, and error states.
3. Document data-source contract for every MVP field.
4. Build Salesperson Today with read-only data.
5. Build Manager Command Center with read-only risk queues.
6. Build Lead Operations read-only view.
7. Build Inventory Intelligence read-only view.
8. Add Deal Desk visibility and scenario placeholders.
9. Add source links to customers, appointments, vehicles, and tasks.
10. Add role guardrails and smoke tests.
11. Run pilot review and stabilize.

## 7. MVP decision gates

These questions should be answered before implementation begins.

| Gate | Decision needed |
| --- | --- |
| Visual approval | Is `enterprise-sales-console-review-mockup-v1.png` approved as the MVP visual direction? |
| Pilot users | Which salesperson, manager, and support user will review the MVP? |
| Read-only boundary | Is MVP strictly read-only, or can it allow safe actions like setting next action? |
| Data sources | Which existing records are reliable enough to feed the MVP? |
| Sales stages | What stage names should appear in the MVP? |
| SLA | What first-response and stale-work timing should the MVP display? |
| Permissions | Which roles can see gross, payment estimate, approval status, and finance blockers? |
| Inventory blockers | Which blocker states prevent a vehicle from being shown as cleanly sellable? |
| Deal visibility | Should Deal Desk show real deals, placeholders, or task-derived sales work first? |
| Reports | Which five numbers should leadership see first? |

## 8. Recommended MVP boundary

Recommended approval version:

```text
Enterprise Sales Console MVP
  -> permanent /sales console shell
  -> approved visual mockup direction
  -> read-only Salesperson Today queue
  -> read-only Lead Operations health
  -> read-only Manager Command Center
  -> read-only Inventory Intelligence
  -> lightweight Deal Desk visibility
  -> links to source customer, vehicle, appointment, and task records
  -> role-aware sensitive-field guardrails
  -> no customer messaging
  -> no quote submission
  -> no vehicle holds
  -> no finance decisions
  -> no discount approvals
```

## 9. MVP acceptance checklist

The MVP is ready for pilot when:

- `/sales` loads reliably for sales and manager roles.
- The page visually matches the approved enterprise mockup direction.
- Salesperson Today shows ranked work with owner, stage, next action, freshness, blocker, and reason.
- Manager Command Center shows SLA risk, stale work, approvals-needed placeholders, delivery blockers, and top opportunities.
- Lead Operations shows lead health and risk without allowing unapproved lead changes.
- Inventory Intelligence shows readiness and blockers clearly.
- Deal Desk makes deal visibility useful without pretending full desking exists.
- Sensitive values and sensitive actions are role-gated.
- Every visible record either links to a source record or clearly marks itself as placeholder/planned.
- Smoke tests cover render, route, auth, and core content.
- Pilot users can review the console without relying on side explanations.

## 10. Expansion path after MVP

Once the MVP is stable, expand in this order:

| Next capability | Why it comes next |
| --- | --- |
| Opportunity lifecycle | Turns read-only sales work into owned sales records |
| Lead intake and assignment | Makes the console the lead operating surface |
| Response outcomes and next actions | Creates reliable sales activity evidence |
| Approval workflow | Adds manager authority and margin protection |
| Quote scenario versioning | Makes Deal Desk operational |
| Finance handoff readiness | Reduces deal package failures |
| Promise and delivery readiness | Protects customer commitments |
| Forecast and reporting | Turns daily work into leadership control |
| Administration | Makes rules configurable and scalable |

## 11. Review questions

Use these for approval discussion:

1. Is the MVP too broad, too narrow, or about right?
2. Should the first MVP be strictly read-only?
3. Which view matters most on day one: Salesperson Today, Manager Command Center, or Lead Operations?
4. Should Deal Desk appear in MVP as real data, placeholder, or hidden until Wave 2?
5. What is the minimum data quality needed before the console is useful?
6. Who signs off that the MVP is stable enough for pilot?
