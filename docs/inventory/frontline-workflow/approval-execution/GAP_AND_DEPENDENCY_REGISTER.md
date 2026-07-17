# Approval Gap and Dependency Register

**Status:** Open; safe containment defined  
**Source detail:** [`Workshop 2 Gap Register`](../WORKSHOP_02_GAP_REGISTER.md)

## Program-level gaps

| Gap | Severity | Affected decisions/slices | Safe containment | Closure owner/authority | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- |
| `ITF-AE-GAP-001` Authorized signatures absent | Critical | All 130; ALL | All decisions OPEN; no code/pilot/activation | GM/Operations + packet authorities | Valid approval records | OPEN |
| `ITF-AE-GAP-002` Exact named roles/backups incomplete | Critical | `020`-`025`; ALL | Commands/actions unavailable | GM/Operations | Accepted RACI/capability/coverage | OPEN |
| `ITF-AE-GAP-003` Financial limits/thresholds absent | Critical | `030`-`036`; S1,S4-S9 | No financial automation/commitment | GM/Owner/Controller | Signed limit/quote/reapproval matrices | OPEN |
| `ITF-AE-GAP-004` Calendar/SLA/escalation values absent | High | `015`,`040`-`045`; ALL | Age visible; manual escalation only | Operations | Effective calendars/targets/rosters | OPEN |
| `ITF-AE-GAP-005` Evidence/access/retention rules incomplete | Critical | `050`,`053`-`056`; ALL | No live evidence gate/disposal/export | Privacy/Security/Records + owners | Evidence/classification/retention manifests | OPEN |
| `ITF-AE-GAP-006` Internal drive authority unavailable | Critical | `014`,`051`,`052`; S1,S6 | Carrier/tow only; no internal driver | Safety/Insurance/legal/HR | Qualified roadworthiness/driver policy | OPEN |
| `ITF-AE-GAP-007` Field source/freshness mappings incomplete | Critical | `060`,`062`,`065`; ALL | No authoritative automation; conflicts hold | Data/Integration + source owners | Field-level source matrix/runbook | OPEN |
| `ITF-AE-GAP-008` Provider contracts/state mappings unapproved | High | `063`; S1,S5,S7,S8,S9 | Advisory/manual monitored path | Integration + functional owner | Adapter/idempotency/reconciliation tests | OPEN |
| `ITF-AE-GAP-009` Receiving locations/capabilities unapproved | Critical | `013`,`081`; S1-S3 | No unspecified/unattended arrival | Operations/Location | Approved capability/location sheet | OPEN |
| `ITF-AE-GAP-010` Inspection/QC templates and qualifications unapproved | Critical | `091`-`095`,`121`-`124`; S3,S6 | No affected inspection/QC/road test | Shop/Safety/QC | Effective templates/qualification/resource manifests | OPEN |
| `ITF-AE-GAP-011` Recon/parts/repair exact authority unapproved | Critical | `100`-`119`; S4-S5 | No executable work from draft/estimate | Shop/Finance/Parts/Safety | Authorized plan/job/parts/execution policy | OPEN |
| `ITF-AE-GAP-012` Qualified title applicability determination absent | Critical | `130`; S7-S9 | No live title-readiness evaluation | Counsel/Compliance | Qualified signed applicability policy | OPEN |
| `ITF-AE-GAP-013` Public claim/price/channel authority unapproved | Critical | `140`-`149`; S8-S9 | Draft only; no customer price/publication | GM/Controller/Compliance/Merch | Fact/claim/price/channel matrices | OPEN |
| `ITF-AE-GAP-014` Independent frontline release authority unapproved | Critical | `151`-`159`; S9 | No evaluation/release/reinstatement | GM/Frontline authority | Reviewer/gate/exception/suspension policy | OPEN |
| `ITF-AE-GAP-015` Tabletop and staff validation not conducted | Critical | `004`,`070`-`075`; ALL | No implementation/pilot decision | Pilot owner + all authorities | Accepted enterprise suite results | OPEN |
| `ITF-AE-GAP-016` Pilot monitoring/pause/rollback authorities absent | Critical | `074`,`159`; ALL | Pilot remains off | GM/Operations | Named primary/backups and rehearsal | OPEN |

## Dependency rules

1. AE-1 and AE-2 are global predecessors for every slice.
2. Each slice requires its predecessor handoff; parallel preparation cannot fabricate predecessor completion.
3. Safe deferral may allow unaffected design only when excluded scope, alternate route and residual risk are explicit.
4. A critical gap cannot be closed by an aggregate readiness score.
5. Changes to a predecessor decision re-evaluate all dependent slice gates and in-flight package fingerprints.
