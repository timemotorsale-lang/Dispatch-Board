# Sales Workflow Catalog

Each workflow defines entry, decision points, commands, handoffs, exceptions, evidence, and completion. Workflow IDs remain stable across implementation, tests, analytics, and operating playbooks.

## SAL-WF-001 — Omnichannel lead intake

**Entry:** A website, marketplace, phone, chat, walk-in, referral, repeat-customer, manual, or imported sales inquiry is received.

**Flow:**

1. Validate organization, source, received time, and idempotency identity.
2. Normalize contact observations without replacing display values.
3. Resolve or propose customer identity candidates.
4. Detect duplicate or related active opportunities.
5. Create or associate the opportunity.
6. Evaluate contact restrictions and source freshness.
7. Evaluate priority and assignment candidates.
8. Assign or place in an explicit unassigned exception queue.
9. Create owned response work and acknowledgement timer.
10. Emit intake, decision, assignment, and work evidence.

**Exceptions:** insufficient identity, suspected duplicate, restricted contact, missing location, no eligible owner, stale import, replay.

**Completion:** one durable opportunity is either owned with response work or visibly awaiting a named exception resolution.

## SAL-WF-002 — Fast response and qualification

1. Present the customer context and inquiry in the response workspace.
2. Recommend an allowed channel and response play.
3. Record each attempt with structured outcome.
4. On two-way contact, capture need, timing, vehicle/category, trade, and next step.
5. Advance to Engaged or Qualified only when evidence passes.
6. Schedule an appointment, enter nurture, or close with controlled reason.
7. Set the next action for every active result.

**Efficiency rule:** prefill known information; ask only for missing facts needed for the next decision.

## SAL-WF-003 — Lead assignment and reassignment

1. Filter staff by authorization, location, active status, schedule, lead type, language/specialty, and capacity.
2. Score continuity, skill fit, workload, response availability, and distribution balance.
3. Recommend one owner with reasons and alternates.
4. Require acceptance when policy calls for it.
5. Start acknowledgement timer.
6. Reassign on decline, absence, breach, or manager command.
7. Preserve assignment history and reasons.

No owner may lose a lead silently; reassignment notifies affected owners and retains continuity context.

## SAL-WF-004 — Appointment conversion

1. Select appointment purpose and participants.
2. Query Appointments for feasible times, staff, location, and vehicle/resource conditions.
3. Offer approved times.
4. Commit through the Appointments domain.
5. Create confirmation and preparation work.
6. Reconcile changes, cancellation, late arrival, or no-show.
7. Record appointment outcome and create the correct follow-up.

## SAL-WF-005 — Showroom journey

```text
EXPECTED -> ARRIVED -> ASSIGNED -> NEEDS_ANALYSIS -> VEHICLE/DEMO
         -> APPRAISAL -> WRITE_UP -> MANAGER_TURN -> OUTCOME
```

Timers identify unassigned arrivals, excessive waits, delayed appraisals, and stalled manager turns. A status change requires an actor and time. Departure requires an outcome and next action unless delivered/closed.

## SAL-WF-006 — Vehicle discovery and alternative match

1. Capture must-have, preferred, and flexible customer criteria.
2. Retrieve sale-eligible candidates from Inventory.
3. Exclude hard conflicts and restricted/unready vehicles according to policy.
4. Rank exact and alternative matches.
5. Show fit, availability, readiness, economics, and uncertainty separately.
6. Record what was recommended, viewed, rejected, or selected.
7. If no suitable vehicle exists, create sourcing/transfer/nurture work without promising availability.

## SAL-WF-007 — Trade and appraisal handoff

1. Record proposed trade identity and customer representation.
2. Submit an appraisal request to the authoritative Inventory workflow.
3. Track custody, inspection, valuation freshness, and completion.
4. Consume the approved valuation; never overwrite it locally.
5. If the valuation expires or facts change, require refresh.
6. Link accepted trade terms to the deal scenario version.

## SAL-WF-008 — Deal creation and needs analysis

1. Convert a qualified opportunity into a deal.
2. Link customer, participants, vehicle interest, trade, appointment, and owner.
3. Record known decision criteria, timeframe, objections, and unknowns.
4. Establish next milestone and blockers.
5. Evaluate deal health and required manager assistance.

## SAL-WF-009 — Scenario, quote, and negotiation

1. Build a scenario from authoritative vehicle, pricing, fee, trade, and approved finance observations.
2. Evaluate data freshness and seller authority.
3. Route any exception for approval.
4. Freeze an approved scenario version.
5. Generate and present the customer-facing quote.
6. Record response against the exact quote version.
7. On revision, create a new scenario rather than altering history.
8. Record acceptance, rejection, counter, expiration, or follow-up.

## SAL-WF-010 — Manager approval

1. Classify request: discount, gross exception, fee adjustment, promise, reservation, policy override, or other approved class.
2. Determine authority from amount, role, location, vehicle, policy, and cumulative deal impact.
3. Route to the smallest sufficient authority.
4. Show current scenario, delta, reasons, customer context, and deadline.
5. Approve, deny, request changes, or escalate.
6. Bind approval to a precise version and expiry.
7. Re-evaluate if relevant facts change.

## SAL-WF-011 — Finance handoff

1. Confirm customer acceptance of a specific quote.
2. Package participants, vehicle, trade, scenario, approvals, documents, promises, and open questions.
3. Transfer to the authorized finance workflow.
4. Require receiving acknowledgement.
5. Track status without inferring or exposing restricted credit decisions.
6. Route customer-visible changes back through a new approved scenario/quote when required.

## SAL-WF-012 — Delivery readiness and close

1. Assemble vehicle, document, finance, payment, insurance, title, promised-item, and appointment readiness.
2. Distinguish ready, waiting, blocked, waived-by-authority, and not applicable.
3. Assign every blocker.
4. Schedule delivery only under approved readiness policy.
5. Record delivery evidence and unresolved commitments.
6. Close the commercial outcome without erasing post-sale obligations.

## SAL-WF-013 — Lost, nurture, and reactivation

1. Require a controlled reason and evidence.
2. Classify eligibility, earliest recontact time, contact policy, and trigger signals.
3. Exit inappropriate active cadences.
4. Monitor approved triggers such as suitable new inventory, price change, customer re-engagement, or time-based follow-up.
5. Re-score on trigger.
6. Recommend reactivation to an owner.
7. Preserve previous loss context to avoid repetitive outreach.

## SAL-WF-014 — Customer promise management

Every promise records exact commitment, customer-visible due time, accountable owner, source conversation, dependencies, status, and proof. At-risk promises escalate before breach. Missed promises create recovery work and Customer timeline evidence.

## SAL-WF-015 — Pipeline review and forecast

1. Snapshot material changes since the prior review.
2. Identify stale, slipping, pulled-in, unsupported, and high-upside deals.
3. Compare seller, manager, deterministic, and predictive views.
4. Capture commit/best-case decisions and reasons.
5. Create interventions with owner and due time.
6. Measure whether interventions occurred and affected the outcome.

## SAL-WF-016 — Integration failure and reconciliation

1. Detect failed, delayed, duplicate, conflicting, or out-of-order messages.
2. Prevent unsafe downstream action when freshness is insufficient.
3. Retry according to policy.
4. Route exhausted failures to an owned reconciliation queue.
5. Compare local and external identity/version/state.
6. Apply an authorized correction or accept a documented difference.
7. Retain replay and reconciliation evidence.

## SAL-WF-017 — Data-quality recovery

Detect active records with missing owner, next action, due time, customer, source, stage evidence, vehicle context, quote follow-up, outcome reason, or stale integration data. Route corrections to the smallest capable owner. Do not reward artificial field completion that lacks evidence.

## SAL-WF-018 — Manager intervention and coaching

1. Identify a material, recoverable risk.
2. Explain the risk and supporting signals.
3. Recommend an intervention such as manager call, alternative vehicle, appraisal escalation, quote revision, or coaching.
4. Assign and time-box the intervention.
5. Record completion and outcome.
6. Learn from aggregate results without treating correlation as causation.

