# Parts Control Optimization Algorithm Catalog

**Product:** Time Motor Sales Dispatch Board  
**Module:** Parts Staff Workspace / Parts Operations  
**Version:** 0.1 planning and design baseline  
**Date:** 2026-07-26  
**Status:** Approved planning/design direction; no autonomous purchase authority

## 1. Algorithm boundaries

Algorithms may rank, warn, explain, route, and require evidence. They may not autonomously purchase, override policy, hide duplicate exposure, alter repair scope, approve estimates, or close financial recovery.

Every algorithm output must show:

- input freshness;
- matching evidence;
- confidence or uncertainty;
- blocked reason where applicable;
- responsible owner;
- next allowed action.

## 2. PCO-ALG-001 Part Demand Completeness

**Purpose:** Prevent loose or incomplete parts requests.

**Inputs:** repair order, repair job, vehicle identity, concern/diagnosis, requested part, quantity, requester, required time, authorization context.

**Outputs:**

- `COMPLETE`
- `MISSING_REPAIR_LINK`
- `MISSING_PART_IDENTITY`
- `MISSING_QUANTITY`
- `MISSING_REQUIRED_TIME`
- `FITMENT_REVIEW_REQUIRED`
- `AUTHORIZATION_REVIEW_REQUIRED`

**Action:** incomplete demand remains draft/review and cannot become PO-ready.

## 3. PCO-ALG-002 Duplicate Exposure Detector

**Purpose:** Prevent double/triple ordering and re-buying available parts.

**Inputs:** part number, description, category, side/location, VIN/vehicle fitment, RO/job, open demands, open POs, received-unissued parts, returns, quarantine, recent orders.

**Outputs:**

- `NO_DUPLICATE_FOUND`
- `POSSIBLE_DUPLICATE`
- `HARD_DUPLICATE`
- `RECEIVED_AVAILABLE`
- `RETURN_OR_QUARANTINE_MATCH`

**Action:** possible duplicates require review; hard duplicates block purchase until authorized override.

## 4. PCO-ALG-003 Vendor Cutoff and Late Order Risk

**Purpose:** Make late ordering visible before it delays the repair.

**Inputs:** required-by time, repair promise, vendor cutoffs, ETA range, diagnosis time, demand age, order status, vendor acknowledgement status.

**Outputs:**

- `ON_TRACK`
- `WATCH`
- `ORDER_NOW`
- `CUTOFF_AT_RISK`
- `CUTOFF_MISSED`
- `PROMISE_AT_RISK`

**Action:** yellow/orange/red results enter Parts Staff priority queue; red also alerts Advisor and Shop/Vehicle Operations lead.

## 5. PCO-ALG-004 Repair Order Parts Readiness

**Purpose:** Derive a truthful repair-order parts state.

**Inputs:** required demands, reservations, receipts, custody/location events, condition, quantity, authorization, issue/install events.

**Outputs:**

- `NO_PARTS_REQUIRED`
- `PARTS_NOT_REQUESTED`
- `REQUESTED_NOT_ORDERED`
- `ORDERED_WAITING`
- `PARTIAL_KIT`
- `READY_BINNED`
- `ISSUED_TO_TECH`
- `BLOCKED_PARTS`

**Action:** Shop & Recon, Advisor, Technician, and Vehicle Operations views consume this derived state. They do not maintain separate parts readiness.

## 6. PCO-ALG-005 Unknown Location Detector

**Purpose:** Stop losing parts after receipt.

**Inputs:** accepted receipt events, last custody event, bin assignment, technician issue, install/return event, elapsed time.

**Outputs:**

- `LOCATION_VERIFIED`
- `BINNING_REQUIRED`
- `ISSUE_CONFIRMATION_REQUIRED`
- `UNKNOWN_LOCATION`
- `CUSTODY_CONFLICT`

**Action:** unknown or conflicted parts become exceptions and cannot satisfy readiness.

## 7. PCO-ALG-006 Receiving Discrepancy Detector

**Purpose:** Catch wrong, damaged, short, over, duplicate, or unexpected arrivals.

**Inputs:** PO lines, expected quantity, received quantity, part identity, condition, cost, shipment evidence, prior receipt history.

**Outputs:**

- `ACCEPT`
- `SHORT_SHIPMENT`
- `OVER_SHIPMENT`
- `WRONG_PART`
- `DAMAGED_PART`
- `COST_VARIANCE`
- `DUPLICATE_RECEIPT`
- `UNKNOWN_SOURCE`

**Action:** accepted parts continue to binning; discrepancies create discrepancy cases and cannot satisfy readiness until resolved.

## 8. PCO-ALG-007 Return and Credit Recovery Risk

**Purpose:** Recover money tied up in unused/wrong/core/warranty parts.

**Inputs:** return reason, vendor return terms, expected credit, actual credit, return age, shipment evidence, original PO/receipt, condition.

**Outputs:**

- `RETURN_NOT_REQUIRED`
- `RETURN_PENDING`
- `SHIPMENT_PENDING`
- `CREDIT_PENDING`
- `CREDIT_SHORT`
- `RECOVERY_AT_RISK`
- `WRITE_OFF_REVIEW_REQUIRED`

**Action:** stale or short-credit items escalate to manager/finance.

## 9. PCO-ALG-008 Parts Priority Ranker

**Purpose:** Order the Parts Staff work queue by operational impact.

**Priority factors:**

1. customer or delivery promise at risk;
2. active technician/bay blocked;
3. vendor cutoff risk;
4. duplicate/waste exposure;
5. unknown-location received part;
6. return/credit dollar exposure;
7. demand age;
8. manager escalation;
9. routine stock or non-blocking work.

**Output:** ordered action queue with reason labels. The ranker does not assign blame or make purchases.

## 10. PCO-ALG-009 Customer-Safe Parts Summary

**Purpose:** Give the Service Advisor truthful wording without exposing internal clutter.

**Inputs:** parts readiness, ETA confidence, blocker reason, promise risk, authorization status, next owner/action.

**Outputs:**

- short advisor summary;
- customer-safe status wording;
- whether customer update is recommended;
- whether promise review is required.

**Boundary:** The algorithm drafts language; the advisor decides communication.

## 11. PCO-ALG-010 Manager Leakage Metrics

**Purpose:** Measure waste and process leakage.

**Metrics:** duplicate warnings, duplicate orders prevented, late orders, cutoff misses, unknown-location count, received-not-binned age, return/credit exposure, emergency orders, ETA variance, parts-caused repair delay hours, first-time correct part rate.

**Output:** manager dashboard and weekly trend. It does not clutter Parts Staff daily work unless action is required.

