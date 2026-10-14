# CRM Next — Implementation Documentation Pack

**Project:** Time Motor Sales Dispatch Board  
**Module:** Customers / CRM Next  
**Status:** Approved planning baseline — pre-implementation

## Core decision

CRM Next is a parallel replacement experience inside the existing Dispatch Board platform. Legacy remains available during development. CRM Next selectively reuses proven data/services/infrastructure, but the legacy UI is not its design foundation.

**Default end state:** CRM Next replaces Legacy. Hybridization is an exception.

## Source-of-truth order

1. Product Blueprint
2. Information Architecture
3. UX Specification
4. Capability Ledger
5. Domain & Data Model
6. Technical Architecture
7. Intelligence Architecture
8. Integration Contract
9. Permissions & Governance
10. Migration & Cutover Plan
11. Acceptance Criteria
12. Roadmap
13. CRM Next Agent Rules

## Non-negotiable model

- Customer 360 = system of record
- Customer Command Center = system of action
- Dispatch Board = cross-department execution system
- Shared Task Engine = one task universe
- Unified Activity Timeline = relationship history
- Intelligence Engine = Risk + Next Action + Opportunity
- Employee UX = Who needs me? Why? What should I do?
- Manager UX = Where are we failing to act?

## Architecture protection

A new capability does not automatically justify a new tab, dashboard, module, or primary navigation item. Fit it first into Customer 360, Workbench, Pipeline, Cases, Intelligence, universal actions, progressive disclosure, or the shared Task Engine. Primary information-architecture changes require explicit product approval.

