# Role Duty Reference

## Purpose

This document is the current operational reference for:

- Day-one staff and role mapping
- Role priorities and support relationships
- Role default duties
- Daily task template intent
- Due-time expectations
- Approval-required work
- Daily intelligence log expectations
- MVP boundaries and deferred workflow areas

This file is the planning-facing source of truth for role, duty, and day-one template expectations.

## How To Use This Document

Use this document when:

- Planning role, duty, and task-template changes
- Seeding `Role`, `Duty`, `RoleDuty`, `UserDuty`, and `TaskTemplate`
- Reviewing daily board generation behavior
- Comparing implementation against real dealership operations
- Scoping MVP-safe work versus deferred work

If this document conflicts with older planning language, treat this document as the latest role-and-duty reference unless a newer approved product decision overrides it.

## Core Rules

- The board should generate daily work from `User -> Role(s) -> Duties -> Task Templates -> Daily Tasks -> Today's Board`.
- Custom user duties should take priority over broad role defaults.
- Every task should have one clear owner.
- Every active operational role should contribute a daily intelligence log.
- Manual tasks and generated tasks both remain valid in MVP.
- Generated tasks must stay idempotent and avoid duplicates for the same board date, user, and template.
- Approval-required work must move through `Ready for Review` before `Completed`.
- Deep workflow automation, handoff generation, and advanced workload balancing are deferred.

## MVP Boundaries

### Active In MVP

- Daily board generation
- Role defaults and custom duties
- Manager review and approval work
- Inventory, service, mechanic, marketing, advertising, sales, office/front desk, and management workflows
- Collections as a basic daily log only
- Activity visibility and intelligence logging

### Defined But Mostly Deferred

- Deep collections workflow
- Full documentation workflow
- Full compliance workflow
- Deep customer service workflow
- Automatic workflow handoffs
- Advanced staffing/capacity scoring
- AI-only final assignment decisions

## Day-One Staff Mapping

| Staff | Primary Role(s) | Backup / Support | Notes |
| --- | --- | --- | --- |
| Eli | Executive Dealership Manager / General Manager; Sales Oversight | Final approval, dispatch control | Owns management control and final approval decisions |
| Brock | Inventory Manager; Service Department Manager | Shop/Parts support; Lot/Detail support | Should receive one combined inventory/service production log |
| Walter | Mechanic | None by default | Default experience should prioritize `My Repair Tasks` |
| Baraka | Salesperson; Marketing & Advertisement Manager | Backup Lot/Detail; Documentation support | Primary for photos, video, social posting, and listings |
| Ancilla | Office / Front Desk Manager | Sales support; Marketing support | Supports listing completeness, platform updates, and communication |
| Eva | Collections Manager | Future collections/compliance support | MVP-active role is basic daily collections logging |
| System | Daily Generation / Automation | Activity logging | Creates scheduled tasks and system events |

## Role Priority Model

Users may hold multiple roles. When role priority is represented, use:

```ts
type RolePriority = "primary" | "backup" | "support" | "inactive_future";
```

Recommendation order should prefer:

1. Direct custom duty match
2. Primary role match
3. Backup role match
4. Support role match
5. Template owner
6. Workflow area match
7. Manager review needed

## Workflow Areas

Recommended workflow areas:

- `Inventory`
- `Service`
- `Mechanic`
- `LotDetail`
- `Marketing`
- `Advertising`
- `Sales`
- `OfficeFrontDesk`
- `Collections`
- `Documentation`
- `Compliance`
- `CustomerService`
- `Management`
- `System`

## Task Status Rules

Use these statuses:

- `Not Started`
- `In Progress`
- `Blocked`
- `Waiting on Parts`
- `Waiting on Approval`
- `Ready for Review`
- `Completed`

Required rules:

- `Blocked` requires a blocker reason.
- `requiresManagerApproval = true` means staff cannot complete directly.
- Approval-required flow is `In Progress -> Ready for Review -> Completed`.
- Managers may return work from `Ready for Review` to `In Progress`.

## Default Due-Time Schedule

### Weekday Defaults

| Time | Use |
| --- | --- |
| `9:00 AM` | Board generation, huddle, manager board review |
| `10:00 AM` | Inventory walk and priority review |
| `11:00 AM` | Service and mechanic status updates |
| `12:00 PM` | Photos/listing readiness review |
| `2:00 PM` | Sales lead follow-up checkpoint |
| `3:00 PM` | Marketing/listing/social checkpoint |
| `4:00 PM` | Blocked and approval-needed review |
| `5:00 PM` | End-of-day intelligence logs |
| `5:30 PM` | Manager review and tomorrow directives |

### Saturday Defaults

| Time | Use |
| --- | --- |
| `9:00 AM` | Saturday board generation and quick huddle |
| `10:00 AM` | Sales appointments, vehicle prep, urgent service check |
| `11:00 AM` | Photos/listings or delivery-related updates |
| `12:00 PM` | Escalate blocked or customer-facing issues |
| `1:00 PM` | Saturday end-of-day logs |
| `1:30 PM` | Manager carryover review |

### Sunday

- Do not auto-generate a normal board unless Sunday is configured as a business day.

## Manager Approval Defaults

These categories should usually require manager approval before completion:

- Vehicle marked ready for sale
- Photos completed
- Listing completed
- Sold vehicle prep completed
- Repair completed
- High-importance manager-created task
- Customer complaint resolved
- Title/DMV issue resolved
- Vehicle listed online
- Vehicle sold or delivered
- Parts delay cleared
- Insurance claim estimate sent
- Cash/payment arrangement completed

These usually do not require approval:

- Routine daily log submitted
- Basic customer call logged
- Lead follow-up completed
- Appointment confirmation completed
- Basic marketing update logged
- Inventory status checked
- Marking waiting states with a reason
- Staff-created personal task completed unless manager changes the setting

## Daily Intelligence Logs

Every active role should have at least one daily intelligence log task.

Each log should capture:

- Item / vehicle / customer / lead / campaign
- Current status
- What changed today
- Next step
- Blocker or risk
- Owner

Role-specific log intent:

- `Brock`: one combined inventory/service production update
- `Walter`: repair report whenever repair work is completed
- `Eva`: daily collections log only in MVP
- `Eli`: daily intelligence review and tomorrow directives

## Role Reference

### General Manager

**Primary owner:** Eli

**Mission:** Run the daily operation from the dispatch board, remove bottlenecks, approve critical work, and set next-day directives.

**Default duties:**

- Review today's dispatch board
- Review blocked tasks
- Review waiting-on-approval tasks
- Review ready-for-review tasks
- Reassign work when needed
- Approve ready-for-sale status
- Approve listing completion and delivery readiness
- Review daily intelligence logs
- Set tomorrow directives

**MVP-active daily templates:**

- Review today's dispatch board
- Review blocked and waiting tasks
- Review ready-for-review tasks
- Approve vehicles ready for sale
- Review daily intelligence and set tomorrow directives

### Inventory Manager

**Primary owner:** Brock

**Mission:** Move inventory from acquisition through frontline-ready status.

**Default duties:**

- Review inventory status
- Check vehicles needing inspection
- Check vehicles waiting for repairs
- Check vehicles waiting for parts
- Check vehicles waiting for detail
- Check vehicles ready for photos/listing
- Confirm vehicles ready for sale review
- Flag stalled inventory or recon bottlenecks
- Submit inventory and service production update

**MVP-active daily templates:**

- Review inventory status and priority vehicles
- Check vehicles needing inspection
- Check vehicles waiting for repairs
- Check vehicles waiting for detail
- Check vehicles ready for photos/listing
- Flag stalled inventory or recon bottlenecks
- Submit inventory and service production update

### Service Department Manager

**Primary owner:** Brock

**Mission:** Control service production throughput, repair status, parts delays, QC, and recon bottlenecks.

**Default duties:**

- Review service production priorities
- Review mechanic repair schedule
- Check vehicles awaiting parts
- Check vehicles awaiting QC
- Flag vehicles stalled in recon
- Feed service production information into the combined daily log

**MVP-active daily templates:**

- Review service production priorities
- Review mechanic repair schedule
- Check vehicles awaiting parts
- Check vehicles awaiting QC
- Flag vehicles stalled in recon
- Submit inventory and service production update

### Mechanic

**Primary owner:** Walter

**Mission:** Diagnose, repair, update, and report mechanical work clearly so inventory and service production can move forward.

**Default duties:**

- Review assigned repair and diagnostic tasks
- Update active repair status
- Mark waiting on parts when needed
- Mark waiting on approval when needed
- Mark blocked with a reason when needed
- Move finished work to ready for review
- Complete a repair report for completed repairs

**MVP-active daily templates:**

- Review assigned repair and diagnostic tasks
- Update active repair statuses
- Mark waiting on parts or approval when applicable
- Move finished repair work to Ready for Review
- Complete repair report for completed repair

### Salesperson

**Primary owner:** Baraka

**Mission:** Manage active leads, appointments, test drives, deal progress, and sales follow-up visibility.

**Default duties:**

- Review sales follow-up tasks
- Follow up with assigned leads
- Confirm appointments
- Update sold or pending vehicle prep status
- Notify manager of hot leads or stalled deals
- Keep lead stages current in the sales pipeline log

**MVP-active daily templates:**

- Review sales follow-up tasks
- Follow up with assigned leads
- Confirm appointments
- Update sold or pending vehicle prep status
- Notify manager of hot leads or stalled deals

### Marketing / Advertisement Manager

**Primary owner:** Baraka

**Mission:** Own photos, video, social posting, listings, and broad marketing execution.

**Default duties:**

- Check vehicles ready for photos
- Create or capture vehicle photos and video
- Confirm listings are complete
- Update online advertising tasks
- Create or update broad marketing posts
- Flag missing photos or vehicle information
- Maintain marketing activity visibility

**MVP-active daily templates:**

- Check vehicles ready for photos
- Confirm listings are complete
- Update online advertising tasks
- Create or update broad marketing posts
- Flag missing photos or vehicle information

### Office / Front Desk Manager

**Primary owner:** Ancilla

**Mission:** Support front-desk communication, customer issues, documentation visibility, and operational coordination.

**Default duties:**

- Review office/admin support tasks
- Handle customer calls and front-desk issues
- Confirm appointments when needed
- Flag missing documentation when noticed
- Support listing completeness and platform updates
- Support sales or inventory tasks when assigned

**MVP-active daily templates:**

- Review office/admin support tasks
- Confirm appointments
- Flag missing documentation when noticed
- Support sales or inventory tasks when assigned

### Collections Manager

**Primary owner:** Eva

**Mission:** Provide daily visibility into payment and collections activity without activating the full collections workflow.

**Default duties:**

- Submit daily collections log
- Note payment status and next steps

**MVP-active daily templates:**

- Submit daily collections log

**Deferred notes:**

- Full collections workflow remains defined but inactive.
- Do not expand into a specialized collections system during MVP alignment work unless explicitly requested.

### System

**Primary owner:** Automation

**Mission:** Generate the board, preserve duplicate protection, and write system activity.

**Responsibilities:**

- Create scheduled daily tasks
- Record generation events
- Preserve idempotent generation behavior
- Avoid duplicate generated tasks

## User Experience Defaults

- `Eli`: Manager dashboard
- `Brock`: Inventory + Service board
- `Walter`: My Repair Tasks first, full board still visible
- `Baraka`: Sales + Marketing tasks
- `Ancilla`: Office / Front Desk tasks
- `Eva`: Collections log

## Quick Operations Log

The source document also defines a `Quick Operations Log` feature. It is adjacent to the role/duty system and should be treated as a separate planning item unless a task explicitly asks for it.

### Purpose

- Let any logged-in staff member log an important operational event
- Keep the activity feed aware of events that are not always tasks
- Optionally create a follow-up task when action is required

### Key Rules

- A log entry is not automatically a task
- A log entry may optionally create a follow-up task
- Sensitive events may require restricted visibility
- `ActivityEvent` metadata is the preferred MVP storage path unless it becomes too crowded

### Typical Event Types

- Repair drop-off
- Repair pick-up
- Rental out
- Rental returned
- Vehicle movement
- Parts/vendor event
- Payment/collections event
- Documentation event
- Insurance event
- Sales event
- Lot/vehicle issue
- Complaint/risk event

## Implementation Notes For Future Plans

- Keep `Baraka` primary for sales and marketing, not default lot/detail.
- Keep `Brock` on one combined inventory/service production log instead of duplicate daily log tasks.
- Keep `Walter` centered on repair work and repair reporting.
- Keep `Eva` limited to the MVP collections log unless collections is explicitly expanded.
- Keep future/inactive workflows documented without generating them by default.
- Prefer seed-data and template-definition changes first if the current schema already supports the required behavior.

## Change Log

- `2026-06-29`: Clean Markdown reference created and adopted as the role/duty planning source of truth.
