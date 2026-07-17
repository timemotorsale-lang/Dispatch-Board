# Slice 8 Future Handoff — Merchandising and Pricing

**Status:** Prepared; `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`  
**Direct approvals:** `ITF-APR-140`-`149`; applicable global/predecessor approvals  
**Catalog:** [`Merchandising and Pricing`](../../MERCHANDISING_PRICING_DECISION_CATALOG.md)

## Outcome and boundary

Turn verified facts into truthful reviewed media/content, support human price authorization, publish only through eligible controlled channels, reconcile desired versus observed public state, and hand a current package to Frontline Release Review. Package completion is not release.

## Slice contract

| Requirement | Slice-specific contract |
| --- | --- |
| Entry trigger/gate | Full or explicitly constrained preparation eligibility; current physical/QC/title/fact context; approved templates/sources |
| Authoritative inputs | Vehicle/equipment/mileage/condition/title/history/disclosure/service facts, media originals, cost/exposure/market sources, price authority, channel accounts/mappings |
| Staff questions/options | Eligible to prepare? facts verified? media/content pass? claim/disclosure supported? proposed price within authority? publish/update/pause/remove? public state reconciled? |
| Conditional route | Unverified fact → omit/block; constrained state → allowed draft work only; unsupported AI/provider output → reject; stale market → advisory; channel drift → correct/pause/remove |
| Roles | Merchandising owner, detail/media, data/content coordinator, claim/compliance reviewer, pricing recommender/authority, Controller, channel/integration, Frontline consumer |
| Permissions/financial | Human customer-facing price; floor/ceiling/expiry/reapproval/cumulative authority; publication commands separated and server-enforced |
| Evidence | Fact/source/freshness, media lineage/edits/review, content/disclosures/approval, market/economics, price decision, payload/fingerprint, request/ack/observed/reconciled state |
| Safety/legal/privacy | Truthful claims/disclosures, personal/restricted media removal, accessibility/language, AI draft/human review, provider security |
| States | Preparation eligible → media/content draft/approved → price proposed/approved → publication requested/acknowledged/observed/reconciled → package review-ready |
| Dependencies/effects | Consumes verified Shop/Title/fact state; public drift/invalidations constrain Frontline; does not authorize release/sale |
| Timing/escalation | Preparation/content/price/publication/reconciliation/handoff targets; fact/price/payload expiry |
| Notifications | Content/pricing/channel owners and Frontline consumer; wrong public fact/price/disclosure escalates immediately |
| Exceptions/recovery | Wrong option/mileage, poor/privacy-exposing media, unsupported claim, stale comparables, below-floor price, channel reject/duplicate/outage/drift |
| Cancellation/correction | Version facts/content/media/price/package; pause/remove/correct/republish; preserve prior public/approval evidence |
| Degraded/manual | Approved manual channel procedure with desired/observed evidence and reconciliation; no live claim from request/ack alone |
| Exit gate | Current verified facts, approved media/content/price, required channel state reconciled, package fingerprint frozen and Frontline consumer accepts |
| Tabletop | `ITF-AE-TT-018`-`019`,`023`-`025` plus catalog cases |
| Pilot eligibility | Approved claims/media/privacy/price/channel policy, narrow supported channels, human publication confirmation |
| Monitoring | Fact/claim defects, media quality/privacy, price overrides/expiry, channel drift/rejection/duplicates, correction time, handoff rejection |
| Pause/rollback/resume | Disable publishing, pause/remove affected listings, preserve packages/prices, use controlled manual correction, reconcile before resume |

## Future build order

Policy → fact/media/content/price/publication/package model → persistence/versioning → permissions/commands → events/evidence → market/channel adapters/reconciliation → role UX → degraded/manual → tests/tabletop/shadow/pilot/rollback → activation.

## Readiness blockers

Decisions `140`-`149`, verified fact/claim sources, media/content/privacy, price authority/values, channel mappings and predecessor/global controls remain open.
