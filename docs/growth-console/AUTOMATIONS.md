# Growth Console Automations

**Status:** Foundation baseline
**Date:** 2026-09-07

## Automation Philosophy

Automations should make the next action easier, not remove human judgment from customer-facing work. The foundation phase can show automation ideas and readiness, but it cannot activate live sends, ad spend, or CRM mutations.

## Automation States

| State | Meaning |
| --- | --- |
| Draft | Planned rule with no live effects. |
| Ready for review | Source, audience, template, and owner are identified. |
| Approved inactive | Approved but not scheduled or connected to providers. |
| Active | Running through approved backend controls and provider adapters. |
| Paused | Temporarily stopped by user, risk rule, provider issue, or budget control. |
| Retired | No longer used but preserved for audit/history. |

## Initial Automation Catalog

| Automation | Trigger | Action | Required approval |
| --- | --- | --- | --- |
| Unsold quote recovery | Quote saved but not presented or accepted after configured delay | Create CRM follow-up and prepare message | Sales manager |
| Aged inventory boost | Vehicle crosses age threshold and is retail-ready | Prepare ad campaign and audience signal | Inventory manager + GM budget |
| Fresh arrival promotion | Vehicle becomes retail-ready | Prepare owned-channel and paid-channel plan | Inventory manager |
| Appointment no-show recovery | Appointment outcome is no-show | Prepare staff follow-up task and message | Sales/service manager |
| Service reminder | Customer reaches service interval or seasonal trigger | Prepare reminder message | Service manager |
| Lead speed-to-contact | New lead arrives from approved source | Create assigned follow-up task and suggested message | CRM/sales policy |
| Cold lead reactivation | Lead has no progress after approved wait | Prepare reactivation audience and message | Sales manager |
| Review request | Sale or service completion recorded | Prepare review request after cooling period | Manager |
| Data cleanup | Audience blocked by missing consent/contact fields | Create CRM cleanup queue | CRM owner |

## Guardrails

- No automation may bypass consent, opt-out, quiet hours, or frequency caps.
- No automation may spend money without budget approval.
- No automation may advertise unavailable or stale inventory.
- No automation may use unapproved pricing, finance, warranty, repair, or service claims.
- No automation may hide failed sends, bounces, complaints, or opt-outs.
- Every automation must have a human owner.

## Timing Controls

| Control | Purpose |
| --- | --- |
| Quiet hours | Prevent customer outreach during restricted times. |
| Frequency cap | Prevent over-contacting the same person. |
| Cooldown | Wait after sale, repair, complaint, no-show, or quote activity before outreach. |
| Launch window | Restrict campaigns to approved dates. |
| Retry limit | Avoid repeated provider failures or duplicate sends. |

## Pause Rules

Pause automatically when:

- opt-out or complaint rate crosses approved threshold;
- provider health is degraded;
- inventory source becomes stale;
- budget limit is reached;
- message/ad is changed after approval;
- owner queue is full;
- source authority changes.

## Frontend Foundation

The first Growth Console implementation should show automations as governed playbooks with visible state and next review action. It should not show any automation as live unless backend proof exists.
