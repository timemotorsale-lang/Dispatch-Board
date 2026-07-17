# Shop Scenario and Decision Catalog

**Status:** Planning-complete scenario baseline  
**Identifiers:** `SRO-SCN-*`, `SRO-DEC-*`

## 1. Staff decision catalog

| Decision | Question | Valid outcomes |
| --- | --- | --- |
| `SRO-DEC-001` | What operating lane owns this request? | Customer-pay; inventory recon; internal/fleet; hold for ownership conflict |
| `SRO-DEC-002` | What class of service applies? | Safety/critical; customer waiting; promise recovery; standard; planned |
| `SRO-DEC-003` | Is diagnosis sufficient to estimate? | Yes; more testing; specialist/sublet; unsafe/stop; evidence clarification |
| `SRO-DEC-004` | Is exact work authorized? | Accepted; partial; declined; deferred; expired/revoked; wrong authority |
| `SRO-DEC-005` | Are required parts usable and reserved? | Complete kit; partial; source; substitute review; transfer; backorder/replan |
| `SRO-DEC-006` | Is the job ready to start? | Start; stage next; resolve prerequisite; manager review; pause/contain |
| `SRO-DEC-007` | Who and which resources are eligible? | Choose eligible bundle; defer; resolve qualification/resource conflict |
| `SRO-DEC-008` | Should ready work be resequenced? | Keep plan; resequence; interrupt under policy; revise promise; manager recovery |
| `SRO-DEC-009` | How should a blocker be resolved? | Assign action/owner/time; alternate path; wait with review; escalate; disposition review |
| `SRO-DEC-010` | Does a new condition change scope? | Continue unaffected work; pause; diagnose; change order; safety containment |
| `SRO-DEC-011` | Internal repair or sublet? | Internal; approved sublet; defer/replan; specialist review |
| `SRO-DEC-012` | Is repair execution complete? | Submit to QC; incomplete; evidence missing; changed scope; rework before QC |
| `SRO-DEC-013` | Did QC/road test pass? | Pass; fail exact item; restricted handoff; specialist review; incident response |
| `SRO-DEC-014` | Is a price/discount within policy? | Present; authorized override; revise; higher approval; reject |
| `SRO-DEC-015` | Is an AI-assisted finding/draft accurate? | Confirm; edit; request clarification; discard/report unsafe output |
| `SRO-DEC-016` | Does the customer need an intervention? | Contact; manager assist; correct promise; compensation review; dismiss/correct signal |
| `SRO-DEC-017` | Is predictive-service outreach appropriate? | Approve; delay; suppress; request mileage; consent review; discard low confidence |

## 2. Scenario catalog

| Scenario | Condition | Expected controlled outcome |
| --- | --- | --- |
| `SRO-SCN-001` | Normal customer-pay repair, authorized and fully ready | Eligible dispatch, execution evidence, QC, advisor handoff |
| `SRO-SCN-002` | Inventory recon with frontline target | Shop priority considers target without bypassing customer/safety policy |
| `SRO-SCN-003` | Ownership lane conflicts with request | Stop routing and resolve identity/authority |
| `SRO-SCN-004` | Waiting customer requests immediate work | Class affects ranking only after readiness/eligibility |
| `SRO-SCN-005` | Safety-critical condition discovered at intake | Contain, restrict movement, route qualified response |
| `SRO-SCN-006` | Concern lacks sufficient diagnostic evidence | Continue diagnosis; do not draft confirmed correction |
| `SRO-SCN-007` | Customer authorizes only selected lines | Create exact executable subset; other lines remain declined/deferred |
| `SRO-SCN-008` | Authorization revoked before start | Job becomes unready; reservations/commitments reviewed |
| `SRO-SCN-009` | Authorization revoked during work | Safe stop, completed-work accounting, reassembly/recovery decision |
| `SRO-SCN-010` | Part is on hand but allocated elsewhere | No double reservation; source/transfer/resequence alternatives |
| `SRO-SCN-011` | Vendor ETA has low confidence | Forecast range widens; job not advertised ready |
| `SRO-SCN-012` | Wrong or damaged part received | Quarantine, discrepancy, replacement/return; demand stays open |
| `SRO-SCN-013` | Candidate substitute may fit | Qualified technical review and authorization before use |
| `SRO-SCN-014` | Technician qualified, required lift unavailable | Exclude resource bundle; suggest valid slot/alternative |
| `SRO-SCN-015` | Technician certification expired | Exclude candidate even if schedule benefit is high |
| `SRO-SCN-016` | Technician already has active and staged work | Do not stack third job; rebalance/blocker-resolution recommendation |
| `SRO-SCN-017` | Appointment demand exceeds A-tech capacity | Show range/conflict and valid alternate slots; no double-booking |
| `SRO-SCN-018` | Emergency work arrives mid-job | Show interruption impacts; manager applies policy and records reason |
| `SRO-SCN-019` | Active vehicle waits in productive bay for parts | Recommend safe relocation/resequence where permitted |
| `SRO-SCN-020` | New defect found during repair | Pause affected scope; evidence, diagnosis, price/time impact, reauthorization |
| `SRO-SCN-021` | Internal capacity inadequate but sublet available | Compare custody, capability, cost, ETA, quality; manager chooses |
| `SRO-SCN-022` | Technician finishes without required evidence | Reject QC handoff; preserve work and show missing items |
| `SRO-SCN-023` | QC fails one mandatory item | Exact rework loop; no averaged pass or delivery |
| `SRO-SCN-024` | Road test required but driver/insurance unavailable | Release blocked; eligible reschedule/escalation path |
| `SRO-SCN-025` | Repeat concern/comeback | Link original work, preserve warranty/customer recovery, enhanced review |
| `SRO-SCN-026` | Short job falls below approved labor minimum | Display policy calculation and customer-facing price before authorization |
| `SRO-SCN-027` | Matrix would exceed ceiling or create anomalous price | Stop/route manager review; do not silently apply |
| `SRO-SCN-028` | Discount split across supplements to avoid limit | Aggregate exposure and require correct authority |
| `SRO-SCN-029` | Cost changes after customer authorization | Preserve original; calculate change-order/reapproval effect |
| `SRO-SCN-030` | Voice transcription misidentifies left/right component | Highlight uncertainty; technician corrects before finding confirmation |
| `SRO-SCN-031` | AI suggests unsupported part or labor operation | Exclude from approved estimate; require sourced validation/report |
| `SRO-SCN-032` | Evidence upload fails during technician work | Save controlled draft/local state; finish gate remains incomplete |
| `SRO-SCN-033` | Customer expresses price shock | Heat-case review with context; advisor/manager chooses response |
| `SRO-SCN-034` | Customer asks why completion moved | Draft factual explanation from current blocker/forecast; advisor sends |
| `SRO-SCN-035` | Sentiment model flags neutral short message | Staff dismisses/corrects; outcome improves calibration data |
| `SRO-SCN-036` | Genuine frustration lacks negative keywords | Commitment/breach signals still create review; measure false negative |
| `SRO-SCN-037` | Predictive mileage has two old observations | Low-confidence range; request current mileage or suppress outreach |
| `SRO-SCN-038` | Mileage decreases or has not-actual flag | Quarantine prediction; do not claim service interval reached |
| `SRO-SCN-039` | Customer recently declined or opted out | Frequency/consent engine suppresses marketing outreach |
| `SRO-SCN-040` | Time-based OEM interval precedes mileage estimate | Use approved time/mileage rule and explain basis |
| `SRO-SCN-041` | Integration unavailable | Show stale/unavailable status; safe manual work and later reconciliation |
| `SRO-SCN-042` | Duplicate command/message replay | Idempotent result; no duplicate assignment/order/task/message |
| `SRO-SCN-043` | Concurrent dispatchers select same resource | One version succeeds; loser receives current recoverable state |
| `SRO-SCN-044` | Recommendation changes after a source update | Supersede old decision visibly; require revalidation before execution |
| `SRO-SCN-045` | Manager overrides best-ranked job | Record rationale/impact/outcome; no silent policy change |
| `SRO-SCN-046` | Algorithm systematically favors easy work | Fairness/complexity monitor alerts; pause/calibrate before expansion |
| `SRO-SCN-047` | Faster throughput increases QC failures | Expansion blocked; quality recovery and root-cause review |
| `SRO-SCN-048` | Margin improves but CSI/rework worsens | Balanced gate rejects success claim |
| `SRO-SCN-049` | Critical source data corrupted | Suspend affected decisions and reconcile authoritative facts |
| `SRO-SCN-050` | Shop must operate manually during outage | Printed/controlled queue, explicit authority, later event reconciliation |

## 3. Acceptance rule

Each scenario must be traceable to algorithm version, policy decision, expected events, visible staff state, permissions, audit evidence, outcome measures, and rollback behavior before the affected slice can leave shadow mode.
