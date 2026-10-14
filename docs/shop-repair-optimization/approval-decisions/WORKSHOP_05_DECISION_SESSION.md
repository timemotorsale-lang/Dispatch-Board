# Workshop 5 Decision Session — Pricing, Margin, Discounts, and Financial Authority

**Session:** `SRO-AE0-2026-01`  
**Status:** `PASSED FOR POLICY — 10 CLOSED`  
**Scope:** `SRO-APR-040`–`049`  
**Predecessor:** Workshops 1–4 passed for policy  
**Authorization boundary:** Policy decisions only; no design, code, shadow, pilot, activation, price publication, estimate sending, purchase, discount, refund, tax/legal determination, or application adaptation

## `SRO-APR-040` — Parts pricing curves

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A parts sell-price recommendation may use only an Eli-approved, effective-dated pricing table that identifies eligible lane/program, cost basis, part category, breakpoints, calculation method, rounding, floor/ceiling, effective period and superseded version. Cost, list/reference price, recommended sell price, authorized sell price and realized result remain separate. The calculation must reproduce from recorded inputs and policy version. No curve, percentage, dollar value, rounding rule or category is inferred. Until an exact approved table is recorded, the application performs no new parts-price calculation and staff use the existing authorized manual price.

**Required fields:** Exact curve values, categories, breakpoints, rounding, effective dates and lane/program applicability.  
**Safe default:** Existing authorized manual price; no algorithmic recommendation.  
**Authority:** Eli as Finance/Parts authority; independent review retained when required.  
**Dependencies:** `005`, `006`, `030`–`032`; later `070`–`072`.  
**Affected algorithms:** `SRO-ALG-030`, `032`–`034`, `042`.  
**Operational consequence:** A generic markup formula cannot silently become dealership policy.

## `SRO-APR-041` — Labor time, rate, and minimum-charge policy

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Labor source time, technician actual time, approved billable time, labor rate, minimum charge and realized labor result are distinct facts. A labor recommendation requires an Eli-approved effective-dated matrix identifying operation/lane/program eligibility, authoritative time source/version, rate class, minimum-charge rule, rounding, permitted combinations and override boundary. Diagnostic uncertainty or vehicle condition may create a revised scope for authorization but cannot secretly alter the matrix. No time source, rate, minimum, increment or exception is inferred. Until the exact matrix is recorded, staff use the existing authorized manual labor policy and the application produces no labor-price recommendation.

**Required fields:** Exact time sources, rate classes, minimums, rounding, effective dates, lane/program rules and override limits.  
**Safe default:** Existing authorized manual labor policy.  
**Authority:** Eli as Finance/Shop authority; qualified procedure/time-source review where required.  
**Dependencies:** `005`, `006`, `021`, `024`, `033`, `035`.  
**Affected algorithms:** `SRO-ALG-031`, `032`, `034`, `041`, `042`.  
**Operational consequence:** Actual clock time, source time and customer charge cannot be silently substituted for one another.

## `SRO-APR-042` — Price floors, ceilings, and anomaly stops

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every automated financial check requires effective-dated Eli-approved floors, ceilings and anomaly thresholds for its exact lane, program and calculation class. Below-floor, above-ceiling, nonreproducible, negative, missing-cost, conflicting-policy or threshold-exceeding results are blocked from presentation and routed to Eli with inputs, calculation, policy version, variance and alternatives. No threshold or waiver is inferred. Until exact values exist, all application-generated financial recommendations are unavailable; existing manually authorized pricing continues. Eli may decide an exception only within recorded authority and may not satisfy a genuinely independent originating/review requirement on both sides.

**Required fields:** Exact floors, ceilings, anomaly thresholds, authority limits, effective dates and independent-review triggers.  
**Safe default:** Stop application calculation/presentation; use existing authorized manual process.  
**Authority:** Eli as Finance/Controller authority; independent review where required.  
**Dependencies:** `006`, `040`, `041`.  
**Affected algorithms:** `SRO-ALG-030`–`034`, `042`.  
**Operational consequence:** Missing financial guardrails disable the recommendation rather than defaulting to guessed values.

## `SRO-APR-043` — Permitted and prohibited pricing attributes

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Pricing may use only current authorized cost, part category, labor operation/time source, lane/program, approved package, documented vehicle-specific work complexity or condition that changes authorized scope, and an effective pricing-policy version. It may not use protected characteristics, inferred vulnerability, willingness to pay, browsing/communication behavior, urgency unrelated to authorized cost/scope, neighborhood, device, credit proxy, negotiation history or individualized opaque optimization. Vehicle age, mileage or condition may affect scope only through attributable findings and reauthorization, never as an unexplained price multiplier. Customer-pay, Inventory-Recon and internal/fleet policies remain distinct.

**Required fields:** Exact optional program/package eligibility remains required before use; prohibited-factor policy is immediately exact.  
**Safe default:** Base existing authorized policy only; no personalized or inferred pricing.  
**Authority:** Eli as Finance/Operations; qualified compliance review retained where required.  
**Dependencies:** `001`, `002`, `005`, `028`, `033`, `040`–`042`.  
**Affected algorithms:** `SRO-ALG-030`–`034`, `042`, `050`–`052`.  
**Operational consequence:** Optimization cannot charge based on who a person appears to be or how much they might tolerate.

## `SRO-APR-044` — Supplies, fees, and taxes

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Parts, labor, shop supplies, fees, taxes, discounts and goodwill are separate calculation and disclosure classes. Each supply/fee/tax requires an Eli-approved current source stating applicability, basis, rate or amount, cap/minimum where applicable, exemptions, rounding, effective jurisdiction/date, disclosure label and reconciliation treatment. The application does not invent legal/tax conclusions or create a new fee. Until authoritative rules and any qualified compliance review are recorded, no new application-calculated supply, fee or tax may be presented; staff use the existing authorized manual process.

**Required fields:** Actual fee/supply rules, tax authority/source, applicability, values, disclosures, effective dates and qualified review where required.  
**Safe default:** No new application fee/tax calculation; existing authorized manual process only.  
**Authority:** Eli as Finance authority plus qualified tax/compliance review where required.  
**Dependencies:** `006`, `040`–`043`; later source decisions `070`–`072`.  
**Affected algorithms:** `SRO-ALG-030`–`034`, `042`, `043`.  
**Operational consequence:** The system cannot manufacture a charge or legal conclusion.

## `SRO-APR-045` — Estimate versioning and presentation

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every estimate version is immutable and records current scope version, line-level part/labor/supply/fee/tax classes, quantities, sources, policy versions, calculations, discounts, total, assumptions, exclusions, expiration condition, preparer and approval state. A revised estimate links to and explains changes from the prior version. `DRAFT` cannot be presented or sent; `READY_FOR_AUTHORIZED_REVIEW` requires reproducible calculations and no unresolved financial block; only Brock may present through the existing authorized customer/Inventory route after required Eli financial approval. Customer or internal authorization applies only to the exact presented version. The application cannot send or accept authorization.

**Required fields:** Approved presentation/consent channel, estimate validity period and exact financial approval limits remain required before application support.  
**Safe default:** Application estimate remains draft and cannot be presented or sent.  
**Authority:** Eli financial approval; Brock authorized presentation/authorization routing within recorded lane scope.  
**Dependencies:** `003`–`006`, `033`, `040`–`044`.  
**Affected algorithms:** `SRO-ALG-032`, `041`–`043`; estimate and changed-scope scenarios.  
**Operational consequence:** Customers and internal authorizers see one reproducible version rather than a mutable calculation.

## `SRO-APR-046` — Discounts, goodwill, and refunds

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A discount, goodwill action or refund is a separate attributable financial decision with type, reason, eligible lane/program, requested amount/effect, cumulative related exposure, evidence, originating actor, approving authority, affected estimate/invoice version and customer/internal communication. Only Eli may approve under the current recorded authority; there is no approved backup or automatic approval. Brock may prepare or communicate an Eli-approved action but cannot approve it. No dollar/percentage limit is inferred; until exact limits and independent-review triggers are recorded, the application may draft no concession recommendation and staff use the existing manual Eli-approved route. Discounts cannot conceal pricing errors, safety/quality issues, warranty questions or unresolved reconciliation.

**Required fields:** Exact limits, reason codes, eligibility, backup, expiry and independent-review thresholds.  
**Safe default:** No automated or unapproved concession; Eli-approved existing manual route only.  
**Authority:** Eli as GM/Operations/Finance; independent review when required.  
**Dependencies:** `005`, `006`, `038`, `040`–`045`, `047`.  
**Affected algorithms:** `SRO-ALG-032`, `033`, `034`, `043`.  
**Operational consequence:** A concession remains a governed decision, not a hidden price adjustment.

## `SRO-APR-047` — Cumulative exposure and anti-splitting

**Recommended:** `APPROVE`

**Exact proposed policy:** Financial authority is evaluated against cumulative related exposure across the same vehicle, repair order, customer/internal commitment, estimate versions, line items, discounts, goodwill, refunds, credits, returns, cores, sublet and linked actions. A transaction may not be divided, sequenced, relabeled or spread across actors to remain below an authority threshold. Related pending and completed actions remain visible to the approver. When relationship or cumulative amount is uncertain, the higher potentially applicable authority and manual review are required. Corrections preserve the original record and reconciliation lineage.

**Required fields:** None for the anti-splitting rule; numeric authority thresholds remain required separately.  
**Safe default:** Aggregate conservatively and require higher manual authority.  
**Authority:** Eli as Finance/Controller authority; independent review where required.  
**Dependencies:** `001`, `002`, `006`, `040`–`046`.  
**Affected algorithms:** `SRO-ALG-032`–`034`; layered-discount and split-transaction scenarios.  
**Operational consequence:** Multiple small actions cannot evade the approval required for their real combined effect.

## `SRO-APR-048` — Cost/scope changes and financial reapproval

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Any increase in customer/internal total, added or substituted operation/part, price-policy change, loss of expected credit/core/warranty recovery, below-floor result, authority-band change or material promise impact creates a revised estimate and stops affected unperformed work pending reapproval. Any decrease also creates a revised attributable version before final presentation, though it does not authorize added work. Because no monetary tolerance is approved, the safe materiality threshold is any nonzero increase or any scope/authority change. Brock routes the revised version; Eli provides required financial approval. Staff must identify impact and affected commitment; neither sunk work, urgency nor prior authorization waives reapproval.

**Required fields:** Accept the zero-increase safe threshold or provide exact monetary/percentage tolerances and authority bands.  
**Safe default:** Stop affected work/presentation and obtain manual reapproval.  
**Authority:** Eli financial/Shop authority; Brock authorization routing.  
**Dependencies:** `015`–`018`, `033`, `040`–`047`.  
**Affected algorithms:** `SRO-ALG-023`, `030`–`034`, `042`, `043`.  
**Operational consequence:** A changed financial reality cannot be hidden inside the original authorization.

## `SRO-APR-049` — Realized margin and financial reconciliation

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Estimated, authorized, invoiced and realized financial results remain separate. Reconciliation records original/current estimate versions, actual part/labor/sublet/supply/fee/tax amounts, discounts/goodwill/refunds, returns, credits, cores, warranty recovery, write-offs, corrections and timing. Variance is attributed to recorded causes without rewriting original facts. Eli reviews unresolved or material variance; qualified independent review remains required where policy demands it. Unreconciled, missing, stale or disputed results cannot tune pricing policy, evaluate staff/vendors, prove profitability or authorize expansion. Policy changes are prospective, effective-dated and separately approved.

**Required fields:** Authoritative accounting sources, close timing, variance thresholds, warranty/write-off authority and review cadence remain required before application use.  
**Safe default:** No policy tuning or consequential use from unreconciled results.  
**Authority:** Eli as Finance/Parts/Data authority; independent review where required.  
**Dependencies:** `006`, `028`, `038`–`048`; later `070`–`079`.  
**Affected algorithms:** `SRO-ALG-032`–`034`; reconciliation and realized-margin scenarios.  
**Operational consequence:** Financial learning uses reconciled reality without altering historical evidence.

## Workshop 5 acceptance response

Accepted 2026-07-16 through the controlled Codex session; exact time not captured:

| Decision | Accepted disposition | Journal record |
| --- | --- | --- |
| `040` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-040` |
| `041` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-041` |
| `042` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-042` |
| `043` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-043` |
| `044` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-044` |
| `045` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-045` |
| `046` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-046` |
| `047` | APPROVE | `SRO-AE5-APR-047` |
| `048` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-048` |
| `049` | APPROVE_WITH_CHANGE | `SRO-AE5-APR-049` |

```text
040: APPROVE_WITH_CHANGE — accept proposed baseline
041: APPROVE_WITH_CHANGE — accept proposed baseline
042: APPROVE_WITH_CHANGE — accept proposed baseline
043: APPROVE_WITH_CHANGE — accept proposed baseline
044: APPROVE_WITH_CHANGE — accept proposed baseline
045: APPROVE_WITH_CHANGE — accept proposed baseline
046: APPROVE_WITH_CHANGE — accept proposed baseline
047: APPROVE
048: APPROVE_WITH_CHANGE — accept proposed zero-increase safe threshold
049: APPROVE_WITH_CHANGE — accept proposed baseline

I accept the exact Workshop 5 policy text for every decision marked APPROVE or APPROVE_WITH_CHANGE: YES / NO
```

You may change any line to `DEFER_SAFE` or `REJECT`. A changed policy must include exact replacement language. No aggregate approval will be recorded unless you explicitly accept the exact text above.

## Current result

`1 APPROVED / 9 APPROVED_WITH_CHANGE / 10 CLOSED / 0 OPEN / PASSED FOR POLICY`.

This policy pass does not authorize design, code, shadow use, pilot, activation, price publication, estimate sending, purchasing, concessions, tax/legal conclusions, or application adaptation.
