# CRM Next — Dispatch Board & Module Integration Contract

## Principle

CRM Next shares platform services; it must not create competing universes.

## Shared Task Engine

One underlying task/work item. CRM can originate customer work; Dispatch Board assigns/tracks it; opening from either surface resolves to the same item. Status, assignee, due time, comments, blockers, review, and activity are synchronized by definition, not copying.

## Appointments

CRM appointments integrate with the Appointment Command Center. Customer 360 may display/create appointments but does not own a disconnected calendar.

## Activity

Customer-specific events contribute to Customer 360. Operational task events remain visible in Dispatch Board activity where appropriate. Prefer linked context over duplicate contradictory histories.

## Identity & permissions

Reuse Dispatch Board staff identity and policy model. CRM permissions extend it.

## Search

CRM customer search is available inside CRM; future global Dispatch Board search can federate CRM results through a stable contract.

## External integration checklist

Define authoritative source; direction; identifiers; sync/idempotency; errors/retries; audit; conflict resolution; retention/privacy. No integration becomes required merely because CRM Next supports that domain.

