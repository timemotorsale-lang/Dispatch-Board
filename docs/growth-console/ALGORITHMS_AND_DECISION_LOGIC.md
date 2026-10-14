# Growth Console Algorithms And Decision Logic

**Status:** Foundation baseline
**Date:** 2026-09-07

## Design Rule

Growth algorithms must explain what they are doing in plain language. Staff should see the next best action; managers should be able to inspect the signals, weights, exclusions, and risks.

## Opportunity Priority Score

Purpose: rank the daily queue.

Suggested score:

`priority = valuePotential + urgency + audienceReadiness + sourceConfidence + ownerCapacity - riskPenalty - fatiguePenalty`

| Signal | Meaning |
| --- | --- |
| Value potential | Expected revenue, gross profit, service value, or retention value. |
| Urgency | Aging inventory, quote expiration, missed follow-up, appointment window, seasonal timing. |
| Audience readiness | Eligible contacts, consent clarity, CRM completeness, vehicle/service fit. |
| Source confidence | Freshness and authority of CRM, inventory, sales, service, or appointment facts. |
| Owner capacity | Whether the assigned team can handle likely replies and follow-up. |
| Risk penalty | Compliance, consent, offer uncertainty, budget risk, duplicate outreach, brand claim risk. |
| Fatigue penalty | Recent contacts, opt-outs, bounces, repeated campaigns, or too many messages. |

## Audience Readiness Logic

Audience status should be one of:

- `Ready`: source records are fresh, consent is valid, and no hard blockers exist.
- `Review needed`: useful audience exists but exclusions, missing data, or offer checks need review.
- `Blocked`: consent, source record, budget, provider, or policy prevents activation.

Checks:

1. Has a valid CRM/customer source.
2. Has allowed contact channel.
3. Is not opted out or legally suppressed.
4. Has not exceeded frequency cap.
5. Has a relevant vehicle, service, quote, appointment, or lifecycle trigger.
6. Has required source-owner approval when using inventory price, finance terms, repair/service claims, or customer-sensitive data.

## Suppression Logic

Always suppress:

- opted-out contacts;
- invalid or missing contact method for the selected channel;
- recently contacted people inside the approved quiet window;
- customers with unresolved complaint/escalation flags unless approved;
- sold, unavailable, blocked, or stale inventory when the campaign depends on that vehicle;
- unapproved offers, discounts, payment terms, repair claims, or service claims.

## Channel Fit Logic

| Channel | Best for | Avoid when |
| --- | --- | --- |
| Email | Detail, photos, vehicle options, service education, quote recovery | Consent unclear or urgent same-day action is needed. |
| SMS | Short approved prompts, appointment reminders, urgent follow-up | Consent uncertain, message is complex, or opt-out risk is high. |
| Phone task | High-value leads, trade-in, finance, unsold quotes | No staff capacity or customer requested written communication only. |
| Paid ads | Inventory promotion, retargeting, lead acquisition | Budget unapproved, inventory stale, or offer cannot be verified. |
| Social | Broad awareness, event, vehicle showcase | Precise attribution or one-to-one privacy is required. |
| Website | Always-on conversion and landing support | Offer source is unapproved or landing page is stale. |

## Message And Offer Readiness

A message/ad is ready only when:

- the offer source is named;
- any price, discount, payment, warranty, inspection, or repair claim has an authoritative source;
- required disclosures are present;
- the call to action is clear;
- the next owner is known;
- fallback path exists if a customer replies.

## Budget Recommendation Logic

For paid campaigns, the budget recommendation should consider:

- available approved budget;
- vehicle margin or service value;
- expected audience size;
- channel cost history;
- target conversion value;
- urgency and age;
- risk of promoting unavailable or low-quality inventory.

The UI may display a recommendation, but manager approval controls spend.

## Attribution Logic

Growth should attribute outcomes by confidence tier:

| Tier | Criteria |
| --- | --- |
| Direct | Click, call, form, appointment, sale, or service tied to campaign tracking. |
| Assisted | Customer was exposed and later converted through CRM, phone, walk-in, or appointment within the approved window. |
| Influenced | Campaign was active for a relevant audience or vehicle, but direct identity or tracking is incomplete. |
| Unattributed | No reliable link. |

Open rates alone must not be treated as reliable proof of customer intent because privacy changes can make opens noisy. Clicks, replies, appointments, and business outcomes should carry more weight.

## Automation Eligibility Logic

An automation can run only when:

1. trigger source is authoritative;
2. audience rules are approved;
3. consent and suppression are enforced server-side;
4. frequency cap is active;
5. message/ad template is approved;
6. owner and fallback queue exist;
7. pause and rollback path exists;
8. launch evidence is recorded.

## Frontend Foundation Logic

The first UI should show these algorithms as simple statuses:

- Opportunity value.
- Audience readiness.
- Approval needed.
- Launch unavailable until backend is approved.
- CRM writeback planned.

Detailed formulas remain in documentation until backend services are implemented.
