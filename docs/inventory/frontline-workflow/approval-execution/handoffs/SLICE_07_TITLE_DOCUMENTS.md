# Slice 7 Future Handoff — Title and Document Readiness

**Status:** Prepared; `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`  
**Direct approvals:** `ITF-APR-130`-`139`; applicable global/predecessor approvals  
**Catalog:** [`Title and Document Readiness`](../../TITLE_DOCUMENT_READINESS_DECISION_CATALOG.md)

## Outcome and boundary

Apply qualified, versioned requirement policy; protect document custody; track integrity, liens and external filings; govern constrained states; obtain qualified final readiness and downstream acceptance. The workflow does not provide legal advice or adjudicate ownership.

## Slice contract

| Requirement | Slice-specific contract |
| --- | --- |
| Entry trigger/gate | Qualified applicability policy for organization/jurisdiction/entity/source/vehicle/route; current vehicle/acquisition/custody context |
| Authoritative inputs | Identity/ownership chain, assignments/signatures/dates/odometer/brand/disclosures, originals/scans, lien/payoff/release, forms/fees/provider/agency states |
| Staff questions/options | Which requirements apply? evidence received/custodied/verified/accepted? integrity issue? lien/special process? prepare/file/resubmit? constrained route? ready/handoff? |
| Conditional route | No qualified applicability → hold; missing/failed critical item → constrained; provider ack → wait/reconcile; rejected filing → correct/resubmit; special process → qualified review |
| Roles | Counsel/compliance, title coordinator/custodian/preparer/verifier/final reviewer, filing/fee authority, records/privacy/security, provider owner, downstream Merch consumer |
| Permissions/financial | Sensitive access and separation; filing/fee commands within exact authority; no legal conclusion by general staff/system |
| Evidence | Requirement/template version, original/electronic custody, integrity checks, corrections, lien/special process, packet/signature/fee, submission/ack/rejection/agency completion |
| Safety/legal/privacy | Qualified legal boundary; original protection; restricted PII; retention/legal hold/export/redaction/disposal/incident controls |
| States | Requirement applicable → evidence received/custodied/verified/accepted → submitted/acknowledged/rejected/agency complete → final readiness; constrained states explicit |
| Dependencies/effects | Uses acquisition/identity/custody/condition facts; readiness/constraints govern Merch/Frontline; invalidation can suspend downstream state |
| Timing/escalation | Requirement/document/provider/agency/review targets, expiry and external waiting; total age visible |
| Notifications | Title owner, qualified reviewer, fee authority, Inventory/downstream; minimal sensitive data |
| Exceptions/recovery | Wrong VIN/party/signature/date, odometer/brand/chain issue, missing original, lien delay, lost title, obsolete form, provider outage/rejection |
| Cancellation/correction | Preserve originals and filings; correction/supersession/resubmission; document loss incident; explicit constrained/disposition route |
| Degraded/manual | Approved secure manual custody/packet/filing procedure; provider state observed and later reconciled; no inferred completion |
| Exit gate | Every applicable requirement has current accepted evidence or approved constrained disposition; qualified final reviewer authorizes; downstream accepts |
| Tabletop | `ITF-AE-TT-016`-`017`,`023`-`025` plus catalog cases |
| Pilot eligibility | Qualified pilot applicability, ordinary supported title routes, trained separated roles, secure custody; excluded special cases explicit |
| Monitoring | Requirement age, custody gaps, integrity failures, provider/agency variance, constrained states, expiry/invalidation, access incidents |
| Pause/rollback/resume | Stop readiness/filing automation, protect documents/in-flight packets, continue qualified manual process, reconcile and re-review before resume |

## Future build order

Qualified policy → requirement/custody/filing/readiness model → persistence/versioning → permissions/commands → events/evidence → provider reconciliation → title/reviewer UX → secure degraded mode → tests/tabletop/shadow/pilot/rollback → activation.

## Readiness blockers

Qualified applicability and decisions `130`-`139`, exact templates/roles/custody/retention/fees/provider mappings and predecessor/global controls remain open.
