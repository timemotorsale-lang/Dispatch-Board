# Role Experience Matrix

**Product:** Time Motor Sales Dispatch Board
**Program:** Role-Aware Workspace Optimization
**Version:** `1.0.0`
**Status:** Approved implementation contract
**Date approved:** July 25, 2026
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
| Inventory Manager | `/vehicles` | Inventory Home, Inventory Lifecycle, Vehicle 360, Shop & Recon coordination, Parts status, Reviews | Repair Order, inventory workbench, evidence, Parts, QC | User administration and unrelated department consoles |
| Service Department Manager | `/vehicles/shop-recon` | Shop & Recon, Shop Dispatch, Repair Orders, Parts Operations, QC, Reviews | Technician job, diagnostic case, Vehicle 360, evidence | Inventory Tower unless separately granted; enterprise administration |
| Service Advisor | `/appointments` | Appointments, Vehicle Intake, Customers, Vehicles, Repair Orders | Repair job read-through, diagnostics advisor review, authorization, handoff | Technician execution controls, Inventory Tower, shop-management controls |
| Mechanic or Technician | `/my-tasks` | My Work, Available Work, Diagnostics & Tools | Assigned Work Order, scoped Vehicle 360, job Parts, Evidence, QC result | Shop & Recon dashboard, Inventory Tower, broad Repair Order administration, Customers, Reports, Approvals, Administration |
| Parts staff | `/vehicles/parts-operations` | Parts Operations, Parts Counter, waiting demand, receiving, issue/return | Linked Repair Order, Repair Job, Vehicle 360 | Technician execution, customer intake, Inventory Tower, management reports |
| QC inspector | `/vehicles/quality-control` | QC Queue, assigned inspections, rework handoff | Repair Job, Repair Order, evidence, procedure | Technician labor controls, customer intake, inventory management |
| Salesperson | `/tasks?department=SALES` | My Work, Sales Tasks, Appointments, Customers, Vehicles | Delivery-prep and permitted customer/vehicle context | Shop execution, inventory management, administration |
| Office Manager | `/my-tasks` | My Work, office tasks, permitted appointments/customers/documents | Relevant authoritative business record | Shop execution, diagnostics, Inventory Tower unless separately granted |
| Marketing/Advertisement Manager | `/tasks?department=MARKETING` | My Work, Marketing, Advertising, permitted Vehicles | Vehicle merchandising context | Repair execution, customer service records, management consoles |
| Collections | `/my-tasks` | My Work and permitted Collections work | Minimum permitted customer/account context | Vehicle repair, diagnostics, Inventory Tower, broad customer data |

Role families not represented in current seed data remain capability-controlled targets. Their appearance must not be claimed as active until their role/capability setup exists.

## 3. Mechanic experience contract

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

## 4. Capability rules

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

## 5. Multi-role presentation

When one user has more than one legitimate workspace:

- the user receives one active workspace at a time;
- the landing resolver selects the preferred or highest-responsibility workspace;
- an authorized workspace switcher exposes the other permitted workspaces;
- switching changes navigation and landing context, not identity;
- work and notifications remain linked to their canonical records;
- a mechanic workspace never expands into manager navigation merely because the user also has a manager role.

An explicit safe `returnTo` for a permitted record takes precedence over the default landing. An unsafe or unauthorized return target is ignored.

## 6. Navigation acceptance rules

1. A mechanic reaches current repair work in one action from My Work.
2. A mechanic reaches Available Work in one action.
3. A mechanic-only shell contains no broad management or inventory-control navigation.
4. Contextual links open only the selected permitted record.
5. Multi-role users can deliberately switch workspace without signing out.
6. Hiding navigation never substitutes for server authorization.
7. Unknown roles receive the safe general My Work experience, not a management console.
8. Technician shift state is resolved before execution without adding a fourth primary destination.
