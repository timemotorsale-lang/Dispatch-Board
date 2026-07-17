# Authority and Guardrail Matrix

**Status:** Proposed; approval required before implementation or pilot

## 1. Automation levels

| Level | Meaning | Permitted examples |
| --- | --- | --- |
| `L0 Observe` | Measure without recommendations | Queue age, missing data, capacity history |
| `L1 Draft` | Prepare content or calculation for review | Structured finding, estimate draft, status draft |
| `L2 Recommend` | Rank valid options; human chooses | Dispatch, source, resequence, intervention |
| `L3 Confirmed execute` | Human confirms exact command | Assignment, reservation, approved message |
| `L4 Bounded automatic` | Pre-approved low-impact action with verification | Deduplicated internal task or alert only after separate approval |
| `L5 Autonomous consequential` | System independently commits consequential action | Prohibited planning baseline |

## 2. Authority matrix

| Decision | Algorithm may | Required human authority | Non-waivable protection |
| --- | --- | --- | --- |
| Classify work lane/service | Recommend | Advisor/manager resolves conflict | Ownership identity |
| Declare job ready | Evaluate gates | Dispatcher initiates work | Authorization, skill, safety, parts/resource truth |
| Assign/resequence | Recommend candidates/impact | Dispatcher; manager for disruptive override | Eligibility and booking conflicts |
| Purchase/transfer/substitute part | Compare options | Parts/purchase authority; technical approval for substitute | Financial limit, fitment, custody |
| Change scope | Calculate impact/draft request | Customer/internal authorizer | Exact versioned scope and price |
| Price labor/parts | Calculate approved-policy recommendation | Advisor/manager presents/overrides within authority | Disclosure, floor/ceiling, audit |
| Discount/refund/goodwill | Show permitted options | Named financial authority | Cumulative exposure and anti-splitting |
| Complete repair | Check evidence | Technician submits completion | Does not pass QC |
| Pass QC/road test/release | Show requirements/risk | Qualified verifier/manager | Failed mandatory item blocks release |
| Communicate diagnosis/price/promise | Draft | Advisor approves send | Consent, accuracy, authorized version |
| Heat-case recovery | Flag and create task | Advisor/manager chooses response | No automatic compensation/admission |
| Predict maintenance | Produce range/opportunity | Advisor reviews; customer authorizes | Prediction label and consent |
| Change model/policy | Propose | Policy/algorithm owners approve | Version, validation, rollback |

## 3. Financial controls

- Pricing policies are organization/location/program scoped, effective-dated, versioned, and immutable after use.
- Cost, price, tax, fee, discount, warranty, goodwill, and internal-charge states remain separate.
- Limits apply cumulatively across related lines, estimates, supplements, purchase orders, and recovery actions; splitting does not avoid authority.
- The UI displays source cost where permitted, proposed sell price, effective labor time/rate, gross dollars/percentage, policy band, and override impact.
- Cost changes, returns, credits, cores, warranty recovery, write-offs, and realized margin reconcile without rewriting original facts.
- A below-floor recommendation stops presentation or requires the named approver; it never silently rounds into compliance.

## 4. Safety and quality controls

- Qualification, certification, lift/tool/equipment rules, lockout/tagout, high-voltage, road-test, environmental, and PPE policy are hard gates when applicable.
- Staff may stop work and report uncertainty without requiring an optimization score.
- AI cannot diagnose, approve a deviation, mark a safety item passed, or substitute for qualified inspection.
- Failed QC creates rework; repeated failure or comeback triggers manager/quality review without automatic blame.
- A rush, waiting customer, frontline target, gross opportunity, or manager preference cannot waive a mandatory safety control.

## 5. Customer and privacy controls

- Obtain and retain lawful consent for communication channels, recordings, transcription, connected-vehicle data, and marketing where applicable.
- Separate transactional RO updates from marketing outreach and apply channel-specific opt-out/suppression.
- Limit voice/text processing to the defined purpose, access group, retention period, and approved providers.
- Do not infer sensitive traits, emotion, fault, willingness to pay, creditworthiness, or vulnerability.
- Sentiment is a signal, not a fact; staff see supporting interaction context and can dismiss/correct a heat-case flag.
- Predictions and drafts cannot be presented as observed mileage, confirmed diagnosis, approved work, or guaranteed completion.

## 6. Employee fairness controls

- Assignment considers job eligibility and workload without protected traits or irrelevant personal data.
- Production measures compare like-for-like work, show uncertainty/data gaps, and account for approved nonproductive time, training, diagnostic complexity, parts waits, rework ownership, and assistance provided.
- No algorithm autonomously disciplines, changes compensation, assigns fault, or creates a performance finding.
- Staff can view material factors affecting their assignments and challenge inaccurate skill, availability, clock, or outcome data.
- Override, acceptance, speed, and billed hours alone are not proxies for employee quality.

## 7. Override contract

An override records original recommendation, alternatives, actor, authority, reason code, explanation, selected action, predicted impact, time, policy version, and eventual outcome. Invalid or prohibited actions remain unavailable. Emergency containment is narrow, time-bounded, and followed by mandatory review.

## 8. Stop conditions

Immediately suspend the affected recommendation or automation when there is a safety incident, unauthorized action, systematic incorrect pricing, privacy/security incident, corrupted source authority, material false-positive/negative threshold breach, discriminatory effect, unexplained outcome deterioration, reconciliation failure, or inability to restore a safe manual path.
