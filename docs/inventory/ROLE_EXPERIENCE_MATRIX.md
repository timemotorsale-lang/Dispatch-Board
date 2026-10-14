# Role Experience Matrix

**Product:** Time Motor Sales Dispatch Board
**Program:** Role-Aware Workspace Optimization
**Version:** `1.2.0`
**Status:** Approved implementation contract
**Date approved:** July 25, 2026
**Shared resolver implementation:** July 26, 2026
**Page and record routing:** [`TECHNICIAN_WORKSPACE_PAGE_RECORD_ROUTING_MATRIX.md`](TECHNICIAN_WORKSPACE_PAGE_RECORD_ROUTING_MATRIX.md)
**Resolver contract:** [`ROLE_LANDING_AND_RECORD_ROUTING_ALGORITHMS.md`](ROLE_LANDING_AND_RECORD_ROUTING_ALGORITHMS.md)

---

## 1. Purpose

Each user opens a workspace designed for the work they are authorized to perform. The application must not make a mechanic navigate manager, inventory, customer, reporting, or administration consoles to reach assigned repair work.

Role-aware presentation reduces navigation; it does not replace server-side permission checks. A hidden page is not a security boundary, and a visible link is not permission.

## 2. Primary role experiences

| Role family | Default landing | Primary navigation | Contextual record links | Hidden by default |
| --- | --- | --- | --- | --- |
| General Manager | `/board` | Overview, Live Board, Tasks, Appointments, Vehicles, Customers, Manager Review, Reports, Administration | All permitted authoritative records | None within granted management scope |
| Vehicle Operations Lead | `/vehicles?workspace=vehicle-operations-lead` | Operations Home, My Vehicle Work, Inventory Flow, Shop & Recon, Parts Runner, Receive Vehicle, Exceptions | Inventory Unit, Vehicle 360, Repair Order, Repair Job, Parts demand, QC, lot/custody tasks | Enterprise administration, unrelated customer/sales/office consoles, broad staff management unless separately granted |
| Inventory Manager | `/vehicles` | Inventory Home, Inventory Lifecycle, Vehicle 360, inventory readiness, disposition, Parts status, Reviews | Inventory Unit, inventory workbench, evidence, Parts, QC | User administration, unrelated department consoles, and daily shop/technician controls unless also assigned |
| Service Department Manager | `/vehicles/shop-recon` | Shop & Recon, Shop Dispatch, Repair Orders, Parts Operations, QC, Reviews | Technician job, diagnostic case, Vehicle 360, evidence | Inventory Tower unless separately granted; enterprise administration |
| Service Advisor | `/appointments` | Advisor Home, Check In Vehicle, Appointment Board, Customers, Repair Orders, Diagnostic Review, My Work | Appointment, Customer, Vehicle, Repair Order, advisor diagnosis/estimate review, authorization, customer handoff | Technician execution controls, Inventory Tower, shop-management controls, enterprise appointment intelligence unless separately granted |
| Mechanic or Technician | `/my-tasks` | My Work, Available Work, Diagnostics & Tools | Assigned Work Order, scoped Vehicle 360, job Parts, Evidence, QC result | Shop & Recon dashboard, Inventory Tower, broad Repair Order administration, Customers, Reports, Approvals, Administration |
| Parts staff | `/vehicles/parts-operations` | Parts Home, Demand Queue, Parts Counter, My Work; action queues for unblocking repairs, duplicate risk, receiving, unknown location, returns/credits, and vendor cutoff risk | Linked Repair Order, Repair Job, Vehicle 360, Part Demand, Purchase Order, Receipt, Custody/Location Event, Return/Recovery | Technician execution, customer intake, Inventory Tower, management reports, and unlinked free-text parts tracking |
| QC inspector | `/vehicles/quality-control` | QC Queue, assigned inspections, rework handoff | Repair Job, Repair Order, evidence, procedure | Technician labor controls, customer intake, inventory management |
| Salesperson | `/tasks?department=SALES` | My Work, Sales Tasks, Appointments, Customers, Vehicles | Delivery-prep and permitted customer/vehicle context | Shop execution, inventory management, administration |
| Office Manager | `/my-tasks` | My Work, office tasks, permitted appointments/customers/documents | Relevant authoritative business record | Shop execution, diagnostics, Inventory Tower unless separately granted |
| Marketing/Advertisement Manager | `/tasks?department=MARKETING` | My Work, Marketing, Advertising, permitted Vehicles | Vehicle merchandising context | Repair execution, customer service records, management consoles |
| Collections | `/my-tasks` | My Work and permitted Collections work | Minimum permitted customer/account context | Vehicle repair, diagnostics, Inventory Tower, broad customer data |

Role families not represented in current seed data remain capability-controlled targets. Their appearance must not be claimed as active until their role/capability setup exists.

## 3. Vehicle Operations Lead experience contract

The Vehicle Operations Lead is a deliberate multi-hat role for the current operating reality where one person may coordinate inventory, shop production, parts running, lot readiness, and technician support.

This role must not become an everything-page. It receives focused work modes:

1. **Operations Home** - the combined vehicle operations picture, with inventory, shop, parts, lot, and exception signals.
2. **My Vehicle Work** - assigned vehicle operations tasks and next actions.
3. **Inventory Flow** - acquisition, intake, recon, merchandising, readiness, and disposition movement.
4. **Shop & Recon** - production and bottleneck coordination, not technician labor execution by default.
5. **Parts Runner** - parts demand, pickup, receiving, returns, and waiting-on-parts constraints.
6. **Receive Vehicle** - vehicle intake, custody, keys, photos, location, and lot placement.
7. **Exceptions** - stalled units, governed reviews, and manager-visible decisions inside the vehicle domain.

When the dealership hires narrower staff such as a Lot Attendant, Inventory Specialist, Parts Specialist, or dedicated Shop Manager, their duties should be reassigned to those focused roles. The Vehicle Operations Lead then keeps oversight and exceptions instead of daily clutter.

## 4. Mechanic experience contract

A mechanic-only account sees three primary destinations:

1. **My Work** — current repair assignment, next repair assignment, assigned diagnostic work, general assigned tasks, blocked/waiting work, and recent submissions.
2. **Available Work** — only work the mechanic is eligible to claim, with an explanation of fit and readiness.
3. **Diagnostics & Tools** — the diagnostic queue, troubleshooting workspace, labor/reference tools, and permitted technical resources.

The mechanic does not normally see Shop & Recon, Inventory Tower, broad Repair Order administration, customer administration, reports, approvals, or enterprise settings.

After authentication, attendance is resolved before repair work:

- an off-clock technician receives a focused **Clock In** gate and then continues to My Work;
- an already clocked-in technician opens My Work immediately;
- a technician on meal break must end the break before repair execution resumes;
- Clock Out is available from My Work, but is blocked while a repair labor clock is running;
- an unavailable attendance dependency is shown honestly and does not conceal assigned work.

The attendance shift clock and the repair labor clock are separate governed records. Signing in or clocking in never starts billable repair labor.

The Technician Repair Workbench may link to a scoped work order, Vehicle 360, Parts, evidence, manager direction, diagnostics, and QC status. Those are contextual links to the same canonical records, not broad console navigation.

My Work includes a compact, read-only **Shop Pulse** for useful situational awareness: the technician's bay and queue, aggregate active repair count, waiting-on-parts count, QC waiting count, promise pressure, and an honest constrained/ready state. It must not expose assignment controls, staffing management, other technicians' detailed work, financial metrics, or broad customer information. The full Shop & Recon page remains a service-management workspace rather than technician navigation.

## 4A. Parts staff experience contract

Parts staff open a focused **Parts Home** that answers: “What needs action now to unblock repair work and stop waste?”

The Parts Staff workspace contains:

1. **Unblocking Now** - parts demands actively blocking repair orders or promise times.
2. **Demand Queue** - requested and qualified parts needs attached to Repair Orders, Repair Jobs, or approved stock reasons.
3. **Duplicate Risk** - possible repeated demand/order/receipt candidates that must be reviewed before purchase commitment.
4. **Receiving Today** - expected arrivals, missed ETAs, receipt inspection, and binning tasks.
5. **Unknown Location** - accepted parts without verified bin, counter, technician, vehicle, return, or vendor location.
6. **Returns & Credits** - wrong, unused, core, warranty, or returnable parts that remain open until return/credit recovery is resolved.
7. **Vendor Cutoff Risk** - demands that must be sourced or ordered before cutoff to protect repair promises.

Parts work must be recorded on canonical parts records: Part Demand, Source/Requisition, Purchase Order, Receipt, Custody/Location Event, Reservation/Kit, and Return/Recovery. Technician notes, advisor comments, generic tasks, Shop & Recon cards, vendor invoices, and Inventory home cards may display or link to these records, but they must not become separate parts truth.

The full Parts Operations console remains available when the user enters a deeper view, but routine Parts Staff work should begin from the focused Parts Home.

## 4B. Service Advisor experience contract

A Service Advisor opens a focused customer-arrival workspace, not the full enterprise appointment command center by default.

The advisor workspace contains:

1. **Arrival queue** - appointment and walk-in candidates ready for customer/vehicle confirmation.
2. **Check In Vehicle** - governed intake that captures customer concern, custody, consent, transportation, and promise context.
3. **Repair-order handoffs** - customer-facing open ROs needing approval, promise updates, or handoff review.
4. **Customer lookup** - permitted customer context needed to avoid duplicate customer/vehicle records.
5. **Diagnostic Review** - advisor-facing review of technician findings and estimate/customer language.
6. **My Work** - assigned advisor follow-up tasks.

The full appointment board remains available as a secondary link for schedule review, but the advisor default experience is intentionally work-first.

Advisor comments, customer-contact notes, technician-clarification responses, promise updates, and handoff explanations must live as immutable **Advisor Updates** on the authoritative Repair Order. They are not free-floating task comments and must not create a duplicate communication record outside the Repair Order timeline.

## 5. Capability rules

Navigation is derived from effective capabilities:

```text
effective capabilities
  = active role grants
  + active direct-duty grants
  + active scoped capability grants
  - explicit restrictions
  - expired location or organization access
```

The server rechecks organization, location, assignment, record state, and action-specific authority for every protected read and mutation.

Role names provide a deterministic starting experience. They never grant repair, diagnostic, financial, customer, Parts, QC, or management authority by themselves when the owning domain requires an explicit capability.

## 6. Multi-role presentation

When one user has more than one legitimate workspace:

- the user receives one active workspace at a time;
- the landing resolver selects the preferred or highest-responsibility workspace;
- an authorized workspace switcher exposes the other permitted workspaces;
- switching changes navigation and landing context, not identity;
- work and notifications remain linked to their canonical records;
- a mechanic workspace never expands into manager navigation merely because the user also has a manager role.

An explicit safe `returnTo` for a permitted record takes precedence over the default landing. An unsafe or unauthorized return target is ignored.

## 7. Navigation acceptance rules

1. A mechanic reaches current repair work in one action from My Work.
2. A mechanic reaches Available Work in one action.
3. A mechanic-only shell contains no broad management or inventory-control navigation.
4. Contextual links open only the selected permitted record.
5. Multi-role users can deliberately switch workspace without signing out.
6. Hiding navigation never substitutes for server authorization.
7. Unknown roles receive the safe general My Work experience, not a management console.
8. Technician shift state is resolved before execution without adding a fourth primary destination.

## 8. Shared implementation status

The shared role-aware foundation is implemented:

- every defined role family resolves to a deterministic default landing;
- direct duties may add an appropriate workspace presentation without granting domain mutations;
- safe post-login return targets are checked against the user's permitted workspace set;
- multi-role users receive a workspace switcher containing only assigned workspaces;
- the selected workspace is retained in an HTTP-only preference cookie and revalidated on every use;
- role-specific navigation shells are available for Service, Inventory, Advisor, Technician, Parts, Quality, Sales, Marketing, Office, Collections, and safe General Staff;
- Command Control Center and the full Dispatch Board redirect non-management identities to their role landing.

This foundation does not claim that every destination page has completed its own role-specific vertical slice. Each domain page continues to enforce its own server-side read and mutation policies.
