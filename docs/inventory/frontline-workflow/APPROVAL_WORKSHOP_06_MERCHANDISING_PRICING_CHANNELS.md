# Approval Workshop 06 - Merchandising, Pricing, and Channel Publication Approval

**Status:** Decision-ready; not conducted  
**Decisions:** `ITF-APR-140`-`149`  
**Slice:** 8. Merchandising and Pricing  
**Current gate:** `GO FOR APPROVAL WORKSHOP`; `NO-GO FOR CODE`  

## 1. Outcome

Approve or safely defer how verified vehicle facts become truthful media/content, how humans authorize customer-facing price, how approved packages are submitted to eligible channels, and how desired versus observed public state is reconciled before Frontline Release Review.

Draft content is not approved content; a recommendation is not an approved price; provider acknowledgement is not live/correct publication; package completion is not frontline authorization.

## 2. Internal sequence

1. **6A — Preparation Eligibility, Vehicle Facts, and Media** (`140`-`143`).
2. **6B — Content, AI/Provider Controls, Market/Economics, and Pricing** (`144`-`146`).
3. **6C — Channel Publication, Reconciliation, Package, and Handoff** (`147`-`149`).
4. **6D — Gap, Tabletop, Sign-Off, and Slice Readiness Review**.

## 3. Required participants

GM/Operations; Inventory/Merchandising Manager; detail/media staff; vehicle-data/content coordinator; content/claim approver; pricing recommender and authority; Office/Controller; counsel/compliance for claims/disclosures; title/condition source owners; website/channel/integration owner; Privacy/Security; Sales/Lot; workflow/pilot owner.

## 4. Decisions

| Decision | Recommended disposition | Required approval direction | Safe default |
| --- | --- | --- | --- |
| `140` | APPROVE | Distinguish verified source, draft/approved content, proposed/approved price, request/ack/live/reconciled publication and release-review-ready package | Never infer downstream state |
| `141` | APPROVE_WITH_CHANGE | Define full/constrained preparation prerequisites, physical readiness, template/shot/media requirements, freshness and permitted/prohibited work | Draft preparation only or hold |
| `142` | APPROVE_WITH_CHANGE | Approve sources/verification for identity, equipment/options, mileage, condition, title/history/disclosure, warranty/certification/service/promotional claims | Unverified claim omitted/blocked |
| `143` | APPROVE_WITH_CHANGE | Define media capture, original/derivative lineage, truthfulness, editing, quality, privacy, accessibility, language, review, access and retention | Media remains draft/unpublished |
| `144` | APPROVE_WITH_CHANGE | Define content templates/fields/descriptions/disclosures/variants/material changes and AI/provider provenance/evaluation/human review/fallback/kill switch | AI/provider output draft only |
| `145` | APPROVE_WITH_CHANGE | Define authoritative cost/exposure, accounting boundary, eligible comparables/market, freshness/confidence, economics, margin/floor/ceiling/incentive/uncertainty | Analysis remains advisory |
| `146` | APPROVE_WITH_CHANGE | Name pricing roles/limits, separation, aggregation, effective/expiry, floor exception, reapproval, aging/transfer/disposition behavior | No customer-facing price action |
| `147` | APPROVE_WITH_CHANGE | Approve channels/accounts/mappings/payload requirements and publish/update/pause/remove authority, idempotency and desired state | No automated publication |
| `148` | APPROVE | Keep request/ack/live/removed distinct; define observed evidence, required channels, drift/duplicate/rejection/retry/outage/manual fallback/reconciliation | State remains pending/unknown; no live claim |
| `149` | APPROVE_WITH_CHANGE | Define package final review, Frontline handoff, post-publish invalidation/recovery, owner, targets/escalation and pilot measures | Package not review-ready |

## 5. Required outputs

- preparation eligibility and constrained-action matrix;
- verified vehicle-fact/source/freshness/claim manifest;
- media shot/quality/privacy/accessibility/original-derivative policy;
- content/disclosure/AI-provider/human-approval manifest;
- market/comparable/cost/margin/uncertainty policy;
- pricing role/limit/floor/reapproval/expiry matrix;
- channel account/status/payload/idempotency mappings;
- desired-versus-observed publication/reconciliation and outage fallback;
- package fingerprint, invalidation and Frontline handoff contract.

## 6. Minimum tabletop cases

1. Fully eligible ordinary unit and package.
2. Physical/detail readiness incomplete.
3. Wrong equipment/option or mileage conflict.
4. Condition/title/disclosure fact changes mid-preparation.
5. Missing/poor/misassigned/overedited media.
6. Media exposes personal/restricted information.
7. AI-generated unsupported claim or prohibited wording.
8. Market/comparable data stale or low-confidence.
9. Proposed price below floor or above authority.
10. Price expires/changes after payload preparation.
11. One channel rejects; another acknowledges.
12. Provider acknowledges but listing is absent/wrong.
13. Wrong public price/media/disclosure drift.
14. Duplicate listing or account mapping conflict.
15. Provider outage/manual fallback.
16. Post-publish fact invalidation requires pause/removal.

## 7. Readiness and sign-off

Slice 8 enters technical design only after `140`-`149`, applicable predecessor/global/title decisions are approved/safely deferred; public facts/roles/limits/channels are exact; privacy/compliance and acceptance owners are assigned.

Required sign-off: GM/Operations; Inventory/Merchandising; Content/Compliance; Pricing/Controller; Media/Data; Channel/Integration; Privacy/Security; Sales/Lot; workflow/pilot owners.

**Current result:** documentation ready; 10 decisions `OPEN`; Slice 8 `NO-GO FOR CODE`.

