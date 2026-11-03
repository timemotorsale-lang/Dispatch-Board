# Deals Home and focused deal workspace

Deals Home (`/crm-next/deals`) provides compact quick actions, current work, period summaries and a separate archive. Counts and work queues continue to use the existing deal dashboard service. Time shortcuts include today, this week, this month, yesterday, last week, two weeks ago and last month. Open work remains visible independently of its start date; dashboard cards can overlap.

Opening a deal starts on Overview. Six sections keep the same mounted workspace and preserve edits: Overview, Customer & Vehicle, Terms & Payments, Documents, Completion and Activity. The identity strip shows the selected customer, vehicle, revenue pathway, assigned staff and save status. The next-action card guides staff toward missing identities or the next pathway operation.

## Revenue pathways

The chooser beneath the identity strip is available from every section: Cash Retail, Outside Finance, Dealer Finance, BHPH, Lease-to-Own, Repairs, Wholesale, Loaner, Daily Rental and Test Drive. It reuses the existing presets and calculators. Changing sections does not create a second deal. Existing pathway and lifecycle protections still apply.

## Entry and saving

- An explicit draft ID opens that exact saved deal.
- A new-deal request starts a blank workspace.
- Entering from a customer resumes one compatible active deal, offers a choice when several exist, or starts blank when none exists.
- General entry does not silently resume another customer's most recent draft.
- Browsing Overview, choosing a pathway or changing sections does not itself save an empty draft. Deliberately selecting an identity, pressing Save draft or editing business fields saves work through the existing service.
- Resume another saved deal remains available in the toolbar.

## Documents and completion

Documents opens the existing form selection, generation and preview tools. Signed uploads use the linked document jacket. Quick links first ask staff to choose the correct deal. Packet generation is never triggered merely by opening a section.

Sales and leases retain the existing mark-sold workflow: sold with paperwork pending is yellow; finalized paperwork is green. Vehicle-use pathways retain reservation, handoff and return operations. Existing permissions, audit records, funding checks and completion rules remain authoritative. This change does not introduce a new financial ledger or bypass finalization checks.

Activity reads the existing saved-deal operations history. Deal follow-up and verified money actions remain in the existing Deals Home drawer.

## Validation

Focused unit coverage verifies entry selection, next-action routing, period boundaries and rendered navigation. Browser coverage verifies both manager and coordinator access, explicit selection among customer deals, no automatic draft writes during navigation, preserved edits, packet chooser access, mobile layout and dashboard time/work filters. Writes are intercepted in the browser fixtures.
