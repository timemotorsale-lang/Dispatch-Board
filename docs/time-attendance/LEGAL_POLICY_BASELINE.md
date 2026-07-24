# Legal and Policy Baseline

**Jurisdiction baseline:** United States federal and Minnesota  
**Verified:** 2026-07-23  
**Purpose:** Engineering requirements and release gates, not legal advice

## Authority register

| ID | Topic | Authority |
| --- | --- | --- |
| US-FLSA-HOURS | Compensable hours, waiting, training, travel, rest and meal periods | [U.S. DOL Fact Sheet 22](https://www.dol.gov/agencies/whd/fact-sheets/22-flsa-hours-worked) |
| US-FLSA-OT | Federal overtime and coverage baseline | [U.S. DOL FLSA reference](https://www.dol.gov/agencies/whd/flsa) |
| US-FLSA-RECORDS | Required federal wage/hour records | [U.S. DOL FLSA reference guide](https://www.dol.gov/agencies/whd/compliance-assistance/handy-reference-guide-flsa) |
| US-FLSA-BREAKS | Short-break and bona-fide-meal treatment | [U.S. DOL Breaks and Meal Periods](https://www.dol.gov/general/topic/workhours/breaks) |
| US-FLSA-ROUNDING | Federal neutral rounding regulation referenced by DOL guidance | [29 CFR 785.48](https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-B/part-785/subpart-D/section-785.48) |
| MN-HOURS-RECORDS | Minnesota hours worked and three-year record baseline | [Minnesota DLI Payment for Hours Worked](https://www.dli.mn.gov/business/employment-practices/payment-hours-worked) |
| MN-OT | Minnesota 48-hour overtime and federal interplay | [Minnesota DLI Overtime Laws](https://dli.mn.gov/overtime) |
| MN-REST | Rest-break requirement effective 2026-01-01 | [Minnesota DLI Work Breaks](https://dli.mn.gov/breaks), [Minn. Stat. 177.253](https://www.revisor.mn.gov/statutes/cite/177.253) |
| MN-MEAL | Meal-period requirement effective 2026-01-01 | [Minnesota DLI Work Breaks](https://dli.mn.gov/breaks), [Minn. Stat. 177.254](https://www.revisor.mn.gov/statutes/cite/177.254) |
| MN-ESST | Eligibility, accrual, use, balances, notices, and local interplay | [Minnesota DLI ESST](https://dli.mn.gov/sick-leave), [Minnesota ESST FAQs](https://dli.mn.gov/sick-leave-FAQs), [Minn. Stat. 181.9446](https://www.revisor.mn.gov/statutes/cite/181.9446) |

Official statutes/regulations and approved counsel interpretation supersede agency summaries where they differ.

## Implemented baseline rules

### Exact time and hours worked

- Record actual start/end and break instants.
- Keep attendance discipline separate from paid-time calculation. A tardiness label never authorizes deducting minutes actually worked.
- Include work the employer suffers or permits, including required pre/post-shift activity.
- Do not discard unscheduled work because it lacked advance approval.
- Treat short rest breaks as compensable.
- Treat a meal as unpaid only when it meets the approved duration and the employee is completely relieved of duty.
- Allow organization policy to pay a qualifying meal period; paid status changes the wage calculation, not whether a long enough completely relieved meal opportunity occurred.
- Waiting, training, on-call, and travel scenarios require separately validated reason profiles; ambiguous cases route to review.

### Overtime

- Federal FLSA-covered non-exempt profile: overtime after 40 hours worked in the fixed seven-day workweek.
- Minnesota-MFLSA-only non-exempt profile: overtime after 48 hours worked in the fixed seven-day workweek.
- Exempt, conflicting, missing, or special coverage: no automatic overtime classification; block for policy review.
- PTO, holiday, vacation, and sick hours are not treated as hours worked for the Minnesota threshold unless a more protective approved policy explicitly does so.
- The MVP classifies minutes into earning categories; it does not calculate the regular rate or final overtime dollars.

### Rounding decision

- The MVP adopts `EXACT_TIME`; it does not round punches for pay.
- Federal guidance describes neutral nearest-quarter rounding in which one through seven minutes round down and eight through fourteen minutes round up. It does not authorize always pushing a late punch to the next quarter hour.
- A staff member clocking in seven minutes after schedule remains seven minutes late for attendance and contributes the actual compensable minutes worked.
- A company may define attendance thresholds or grace rules, but those labels remain separate from paid time and require HR/legal approval.
- Any later rounding proposal requires neutral-over-time simulation, employee-impact analysis, counsel/payroll approval, a new effective-dated policy version, and golden tests. It cannot rewrite raw punches.

### Minnesota breaks effective 2026-01-01

- At least one paid rest break of 15 minutes, or longer when required to use the nearest convenient restroom, within each four consecutive hours worked.
- At least one meal opportunity of 30 minutes when working six or more consecutive hours.
- A meal is unpaid only when the employee is completely relieved.
- A meal may be paid by policy and still count as the required meal opportunity when it is long enough and completely relieved.
- Missing, short, late, interrupted, or unrecorded breaks create evidence-backed exceptions.
- The system never inserts a break merely to make a card appear compliant.

### Minnesota ESST

- Eligible employees accrue at least one hour per 30 hours worked.
- The standard accrual baseline caps annual accrual at 48 hours and banked accrual at 80 hours unless an approved policy is more generous.
- Accrual starts with employment and includes overtime hours worked.
- Front-loading and payout alternatives are separate policy methods and must not be mixed with standard accrual.
- Available and used balances must be available for pay-period reporting.
- Minneapolis/St. Paul or other local overlays must resolve to the applicable more protective requirement.
- Protected reason details use restricted privacy handling.

### Records

- Preserve required time and wage-computation evidence for at least the applicable legal period.
- The program proposes a seven-year application retention baseline for time cards, corrections, approvals, policy lineage, and export evidence, subject to counsel/privacy approval.
- Legal holds suspend normal disposition.
- Ordinary application roles cannot hard-delete audit or raw time events.

## Required policy profile fields

- work location and jurisdiction;
- location timezone;
- workweek start day/time;
- pay-period calendar;
- hourly/salary/commission/other basis;
- FLSA coverage and exemption disposition;
- MFLSA coverage and exemption disposition;
- adult/minor status;
- collective-bargaining status;
- prevailing-wage status;
- special-industry/exemption flags;
- break policy;
- overtime policy;
- ESST method and local overlay;
- payroll earning-code mapping;
- effective dates, approver, sources, and review date.

Missing required fields produce `POLICY_REVIEW_REQUIRED`.

## Counsel/payroll decisions required before pilot

1. Exact employee cohort and classification evidence.
2. Fixed workweek start.
3. Treatment of dealership technicians, commissioned retail employees, drivers, and any potentially exempt staff.
4. Whether any motor-carrier, retail commission, union, minor, prevailing-wage, or special-industry rules apply.
5. Minneapolis/St. Paul/local ordinance applicability.
6. ESST accrual versus front-loading method and payroll ownership.
7. Time-entry precision and confirmation that rounding remains disabled.
8. Required time-off increments and privacy routing.
9. Payroll earning codes and export authority.
10. Retention, legal hold, access, and correction policy.

## Change control

- Review official sources at least quarterly and before every production release.
- A legal source change creates a proposed policy version; it does not silently mutate active history.
- Activation requires source evidence, effective date, impact simulation, golden tests, policy-owner approval, and release notes.
- Retroactive recalculation requires explicit authority, scope, reason, original/new results, employee-impact review, and payroll reconciliation.
