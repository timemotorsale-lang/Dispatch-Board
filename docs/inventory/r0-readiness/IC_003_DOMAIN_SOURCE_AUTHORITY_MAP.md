# IC-003 — Domain and Source-Authority Map

**State:** `BLOCKED FOR ACTUAL-SYSTEM INPUTS`  
**Internal architecture:** Defined  
**External field/workflow authority:** Not yet approved

## Internal authority

| Business fact | Canonical owner | May consume, but must not redefine |
| --- | --- | --- |
| Physical vehicle identity and external IDs | Vehicle Registry | InventoryUnit, Shop, Parts, Wholesale, search |
| Dealership-controlled inventory cycle and lifecycle | InventoryUnit | Control Tower, retail, Shop links, reporting |
| Acquisition opportunity, appraisal, limit, commitment | Acquisition & Appraisal | InventoryUnit after authoritative acquisition boundary |
| Transport-to-frontline stages, gates, evidence | Inventory-to-Frontline | InventoryUnit projections, Shop/Parts handoffs |
| Availability, reservation, sale, delivery, unwind | Retail Completion | InventoryUnit terminal/operating projection |
| Customer Repair and Inventory Recon work | RepairOrder / RepairJob / Shop | InventoryUnit links, Parts demand, reporting |
| Part identity, supply, quantity, stock custody, procurement | Parts | Shop readiness, costs, Wholesale only by reference |
| Candidate, disposition appraisal, channel/offer/sale/settlement | Disposition & Wholesale | InventoryUnit state by accepted handoff |
| Tasks, blockers, reviews, approvals, escalation | Work Governance | Every domain; never underlying domain state |
| Documents/media metadata, checksum, retention, links | Evidence & Knowledge | Every domain; file existence never proves completion |
| Capability, delegation, limits, separation, effective policy, rollout | Policy & Authorization | Every command/read; never business mutation |
| Audit, domain events, outbox/inbox, reconciliation evidence | Shared audit/event + Integration Platform | Projections and support tooling |
| Metric facts, operational projections, recommendations | Reporting & Optimization | UI/reports; never command authority |

## Critical non-equivalences

- Vehicle is not InventoryUnit.
- Ownership, custody, location, assignment, and control are different facts.
- Customer Repair is not dealership Inventory Recon.
- Repair readiness is not parts availability; parts reservation is not installation.
- Review is not approval; approval is not execution; task completion is not domain completion.
- Provider request is not acknowledgement; acknowledgement is not reconciliation.
- Estimated exposure is not posted accounting value.
- Published listing is not sale; accepted offer is not released custody; expected proceeds are not settled proceeds.

## External authority register

This table must be completed with actual organization systems—not vendor categories—before a related integration can move beyond sandbox/read-only verification.

| Authority area | Actual system/provider | Accountable owner | Authoritative fields/workflows | Direction | Acknowledgement/reconciliation | Manual fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DMS / deal / inventory reference | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |
| Accounting / posted costs / proceeds | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |
| Title / government / compliance | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |
| VIN/history/valuation facts | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |
| Listing / market / auction | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |
| Parts vendor / catalog / ordering | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |
| Transport provider | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |
| Messaging | `TBD` | `TBD` | delivery/consent boundaries `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |
| Payment reference only | `TBD` | `TBD` | reference/status boundary `TBD` | `TBD` | `TBD` | `TBD` | `OPEN` |

Secrets, card data, legal conclusions, posted accounting facts, and provider credentials must not be copied into a new internal source of truth merely to simplify the UI.

## Approval tests

- [x] Every internal business fact has one intended canonical owner.
- [x] Cross-domain consumers and non-ownership boundaries are explicit.
- [x] Work governance, evidence, policies, projections, and integrations cannot silently become domain authority.
- [ ] Actual external systems and accountable people are named.
- [ ] Field-level and workflow-level authority, direction, IDs, freshness, and conflict precedence are approved.
- [ ] Acknowledgement, outage, retry/replay, reconciliation, privacy, security, and manual fallback are approved per adapter.
- [ ] One representative source-to-domain-to-projection reconciliation fixture passes before any write activation.

**Gate result:** Internal conformance work may be planned. External adapter activation and external-authority completion claims are blocked.

