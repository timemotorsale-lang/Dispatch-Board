# Time Motor Sales Report Catalog Draft

Prepared October 4, 2026. This catalog defines the proposed reporting products for Time Motor Sales. It is a design deliverable for the reports-enterprise-design branch, not an implementation or confirmation that each data source is ready.

Read this alongside [the operating rulebook](report-operating-rulebook.md) and [the console design](report-console-design.md). The intended experience is simple: open a useful report, inspect the records behind it, and take the next business action.

## Existing foundation

Inspection confirmed that the current Reports route loads the inventory governance workspace. That workspace presents snapshot metadata, operational measures, underlying-record links, and a link to controlled exports. The enterprise reporting helper organizes source activity into staff, manager, CRM, inventory, compliance, and coaching sections. Existing COO Workbook planning describes meaningful activity becoming report inputs and requires human review for sensitive content.

The application also contains sales, customer, appointment, inventory, shop, diagnostic, parts, claims, attendance, growth, document, and manager workspaces. Their presence does not prove that reporting data is complete. Every report below requires a source assessment before activation.

## Report families

| Family | Purpose | Persistence | Expected user action |
| --- | --- | --- | --- |
| Live operational report | Understand current work, outcomes, and exceptions | Saved definition; results update when run | Inspect and act |
| Individual period report | Preserve a person's account of daily, weekly, or monthly work | Versioned submissions and reviews | Review and submit |
| Department period report | Assess team outcomes and constraints | Versioned manager submissions | Review and approve |
| Leadership period brief | Assess business impact across departments | Versioned leadership submissions | Decide and assign follow-up |
| Published period snapshot | Preserve calculated facts at a specific cutoff | Immutable result and calculation version | Retrieve, compare, and reconcile |

Frequency, report family, business area, and subject are separate attributes. A monthly live report is not automatically a submitted monthly staff report. Approval of a narrative report does not certify financial reconciliation.

## Shared report attributes

Each definition has a stable identifier, title, family, business area, business owner, allowed audience, source contracts, field permissions, date basis, supported filters, calculation version, quality rules, refresh policy, export rules, and next actions.

Each saved period report also has an organization, location scope, department, reporting subject, author, covered period, timezone, calendar version, expectation identifier, reviewer, status, revision, submission time, approval time, source cutoff, and retained evidence manifest. The reporting subject may be a person, department, or dealership; it is not necessarily the author.

Display historical staff names and assignments as they applied to the report. Preserve stable identities so history remains retrievable after a rename, transfer, or deactivation.

## Console report catalog

All figures below are proposed definitions. Counts use stable business identities, not the number of activity messages. Sensitive attributes are visible only when authorized.

| Report | Audience and frequency | Specific attributes and source facts | Measures and date basis | Record detail and next action |
| --- | --- | --- | --- | --- |
| Daily Operations Brief | GM and operations; live and daily snapshot | Source area, responsible owner, commitment, due time, blocker, linked record, amount where permitted | Open commitments at cutoff; overdue commitments; pending decisions; distinct outcomes during period | Open task, vehicle, case, or approval; assign follow-up |
| Sales Pipeline | Sales staff and managers; live, weekly, monthly | Opportunity, customer, lead source, assigned rep, stage transitions, loss reason, deal and delivery links | Open opportunities by stage at cutoff; distinct delivered units by delivery date; source-specific conversion cohorts | Open opportunity or deal; record permitted next action |
| Follow Up Coverage | Sales and customer managers; live and daily | Assigned customer/opportunity, next action, due time, completed qualifying contact, outcome | Overdue follow-ups at cutoff; missing next actions for active opportunities; response elapsed time where timestamps exist | Open customer or overdue task; schedule follow-up |
| Appointment Outcomes | Appointment and sales managers; live, daily, weekly | Appointment occurrence, type, scheduled start, assigned staff, attendance, cancellation time and reason, reschedule link | Attended, no-show, canceled, and unresolved occurrences by scheduled date; utilization only with configured capacity | Open occurrence; contact customer or reschedule |
| Customer Commitments and Cases | Customer owners and managers; live, weekly | Commitment, promise date, case, case category, owner, status transitions, resolution evidence | Open promises at cutoff; overdue promises; distinct cases resolved during period; case elapsed time | Open case or promise; contact customer or assign resolution |
| Inventory Aging and Readiness | Inventory manager and GM; live, weekly, monthly | Stock identity, VIN, receipt date, frontline-ready date, lifecycle stage, location, disposition, cost completeness | Inventory count at cutoff; days since receipt; days since frontline readiness; age bands; complete-cost exposure | Open vehicle; review readiness, pricing, or disposition |
| Acquisition and Disposition | Inventory manager; weekly and monthly | Acquisition record, supplier, receipt, appraisal, acquisition amount, retail/wholesale disposition, approval | Distinct receipts and dispositions during period; appraisal variance when comparable amounts exist | Open acquisition or disposition; inspect supporting evidence |
| Recon and Shop Production | Shop lead and inventory manager; live, daily, weekly | Repair order, job, technician, stage history, active labor, waiting reason, parts dependency, target finish | Open work at cutoff; completions in period; elapsed cycle time; active labor; time in waiting stages | Open repair order; dispatch job or resolve blocker |
| Diagnostics and Quality | Diagnostic lead and shop manager; weekly and monthly | Diagnostic case, concern, finding, repair link, QC result, reinspection, comeback link and reason | Case closure; QC pass rate over completed inspections; rework and comeback cohorts with defined observation windows | Open case or QC evidence; request review or corrective work |
| Parts and Vendor Delivery | Parts team and shop manager; live, weekly | Order line, vendor, quantity, promised date, received date, partial receipt, return, repair-order dependency | Outstanding quantity; late lines at cutoff; on-time receipt rate by due-date cohort; documented returns | Open order; expedite, receive, or resolve shortage |
| Claims and Recoveries | Claims staff and authorized managers; live, monthly | Claim, category, party, submission date, evidence, requested/authorized/received amounts, status | Open claim age; missing evidence; requested, authorized, and recovered totals shown separately | Open claim; complete evidence or follow up |
| Document and Packet Readiness | Document staff, sales manager; live and daily | Required document slot, document type, related transaction, received/reviewed status, rejection reason | Missing required slots at cutoff; review backlog; elapsed review time; packet readiness under versioned requirements | Open document or transaction; capture, correct, or review |
| Attendance and Coverage | Employee for own data; authorized supervisors for team; daily and weekly | Shift, roster, clock events, exception, approved adjustment, leave | Scheduled and recorded hours; unresolved exceptions; coverage gaps; no automatic payroll certification | Open attendance exception; request or approve correction |
| Growth Outcomes | Growth lead and GM; weekly and monthly | Campaign, channel, attributable lead, qualified outcome, spend source, attribution model | Leads and outcomes under one attribution model; cost per qualifying outcome only when spend is complete | Open campaign and attributed records; review allocation |
| Review and Approval Backlog | Managers and authorized administrators; live, daily | Decision request, request type, owner, created/due time, amount, resolution, authority | Pending at cutoff; overdue requests; decisions during period; elapsed time to decision | Open request; approve, return, or escalate under existing permissions |
| Individual Work Report | Employee and authorized reviewer; daily, weekly, monthly | Planned work, outcomes, meaningful updates, blockers, commitments, carryover, source links | Distinct outcomes; outstanding commitments; verified trends; no automatic employee ranking | Review draft, add context, submit; manager reviews |
| Department Operating Review | Department lead and GM; weekly and monthly | Authorized individual submissions, domain facts, targets, constraints, staffing context | Department outcomes and weighted rates; unresolved constraints; coverage completeness | Approve review; assign decisions and support |
| Leadership Operating Review | GM and authorized leadership; daily brief, weekly, monthly | Domain snapshots, material exceptions, department reviews, decision history | Cross-department outcomes; financial exposure with quality labels; persistent constraints | Record decision, accountable owner, and follow-up date |

Tasks, the COO Workbook, and Operations Coordinator contribute to individual and operational reports; they do not require employees to file a separate daily report for every console. A technician's daily report can include shop jobs, diagnostic findings, parts blockers, and customer commitments in one submission.

## Standard individual report content

| Daily | Weekly | Monthly |
| --- | --- | --- |
| Planned work and outcomes | Major outcomes and goal progress | Operating results and comparable trends |
| Meaningful progress and interruptions | Repeated blockers and accumulated waiting | Persistent constraints and business impact |
| Blockers and customer commitments | Quality, rework, and customer impact | Quality and process improvement |
| Decisions or support needed | Support and coaching needs | Leadership decisions and resources needed |
| Carryover and next working-day priorities | Priorities for next week | Priorities for next month |

Only relevant sections appear. Weekly and monthly numeric results come from source facts; approved daily and weekly reports supply context and links. Report prose is not a second numerical ledger.

## Activation stages

| Stage | Candidate reports | Activation condition |
| --- | --- | --- |
| Foundation | Individual Work Report, Daily Operations Brief, Review Backlog | Calendar, identity, submission history, source links, authorized retrieval, and source quality validated |
| Operations | Inventory Aging, Recon Production, Parts Delivery, Document Readiness | Required lifecycle timestamps, dependencies, and record detail reconcile to existing consoles |
| Customer and commercial | Sales Pipeline, Follow Up, Appointments, Customer Cases, Claims | Identity, stage/outcome histories, attribution, and amount definitions validated |
| Management depth | Department and Leadership Reviews, Quality, Attendance, Growth | Comparable historical facts, access controls, and completeness checks validated |
| Financial depth | Margin, funding, cash, and forecast reports | Reconciled financial sources, posting rules, reversals, and authorized financial ownership established |

This order is a design recommendation. Each stage should release only reports whose source assessment passes; missing capabilities remain clearly unavailable.

## Definition approval before development

For each activated report, the business owner must settle qualifying statuses, time basis, thresholds, required fields, attribution, reviewer, financial sensitivity, retention class, and intended action. The implementation must map those choices to actual source records and include reconciliation examples.

## Reference patterns

The proposal adapts publicly documented patterns rather than claiming an audit of authenticated vendor interfaces: DealerCenter's [dashboard and report support catalog](https://support.dealercenter.net/hc/en-us/sections/201076405-Reporting-Dashboard), ServiceNow's [dashboard filters](https://www.servicenow.com/docs/r/now-intelligence/interactive-filters-workspace.html) and [record drill-down](https://www.servicenow.com/docs/r/now-intelligence/reporting/c_DrillingDownWithinReports.html), and Reynolds' [Retail Management Intelligence](https://www.reyrey.com/solutions/advanced-analytics/retail-management-intelligence). The calendars, formulas, and workflows here are proposed specifically for Time Motor Sales.
