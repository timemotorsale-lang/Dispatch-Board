# Operations Coordinator Workspace Architecture

## Mission

Create a single enterprise-grade workspace that lets the Operations Coordinator keep the business moving without exposing her to every deep specialist console.

This role is the connective tissue for:

- Appointments
- Customer and vehicle intake
- Service advisor support
- Repair coordination support
- Parts receiving support
- Inventory lifecycle support
- Photo, listing, advertising, and marketing support
- Sales paperwork
- Financing paperwork
- Proof of insurance verification
- Rental initiation
- Payment intake and receipt logging
- Documentation scanning/upload
- Collections support
- Customer communication
- Escalation to manager, advisor, sales, parts, technician, inventory lead, collections, or accounting

## Architectural pattern

Use a hub-and-spoke architecture.

The Operations Coordinator Workspace is the hub. Canonical domain records remain in their existing spokes.

| Domain | Canonical record | Coordinator action type |
|---|---|---|
| Appointments | Appointment | Create, draft, confirm, reschedule, check arrival readiness |
| Customers | Customer | Search, create missing record, update contact basics, note |
| Vehicles | Vehicle / InventoryUnit | Search, add missing vehicle basics, upload photos/docs, flag issue |
| Service intake | ServiceVisit / RepairOrder | Start intake, capture concern, route to advisor, prepare RO |
| Repair | RepairOrder / RepairJob | View status, add coordination note, route blocker |
| Parts | RepairPartDemand / PurchaseOrder / Receipt | Receive simplified, flag discrepancy, route to parts |
| Inventory lifecycle | InventoryUnit workflow | Flag missing docs/photos/detail/transport readiness |
| Sales | Sales task / deal packet | Start paperwork checklist, upload docs, route sales decision |
| Finance | Finance packet/checklist | Verify received docs, route to manager/finance authority |
| Rental | Rental workflow/checklist | Initiate rental packet, verify customer/vehicle/insurance fields |
| Payments | Payment intake record / accounting handoff | Record received payment intake, route to accounting, no final accounting close |
| Collections | Collection task / customer account note | Add follow-up note, route payment issue |
| Documents | Evidence/document object | Upload/scan, classify, mark missing/received |
| Tasks | Task / work item | Start lightweight task, assign/route/escalate |

## Access model

Broad visibility, controlled mutation.

Allowed by default:

- View operational summaries across departments.
- Search customer, vehicle, VIN, stock number, appointment, RO, part, document, payment intake, and task.
- Create and edit appointment drafts.
- Confirm/reschedule appointments inside scheduling rules.
- Start service intake.
- Add missing customer/vehicle basics.
- Upload/attach documents and photos.
- Receive simple parts into canonical receiving workflow.
- Verify document received status.
- Mark proof of insurance received.
- Start sales/finance/rental paperwork checklists.
- Record payment received for accounting review.
- Add notes and customer contact updates.
- Route/escalate blocked work.

Restricted by default:

- Final repair authorization.
- Manager approvals.
- QC pass/release override.
- Final accounting close.
- Financing term approval.
- Delete or rewrite canonical records.
- Admin/policy/permission changes.
- Inventory valuation/write-off decisions.
- Final legal/title decision.

## Workspace modules

1. Today Command Strip
   - Arrivals
   - Waiting customers
   - Calls/messages
   - Appointments to confirm
   - Parts deliveries
   - Payments expected
   - Documents due
   - Photos/listings needed

2. Universal Search
   - One search across customer, vehicle, VIN, stock number, RO, appointment, part, document, task, payment, rental, and paperwork packet.

3. Start Work Dock
   - New Appointment
   - Check In Vehicle
   - Add Customer / Vehicle
   - Start Service Intake
   - Receive Parts
   - Upload Document
   - Upload Photos
   - Start Sales Packet
   - Start Finance Packet
   - Verify Insurance
   - Initiate Rental
   - Record Payment
   - Add Collection Note

4. My Coordination Queue
   - Work assigned to her or waiting for front-desk action.
   - Ranked by customer waiting, appointment time, payment/document deadline, blocker severity, and manager escalation.

5. Paperwork Command Center
   - Sales paperwork
   - Financing checklist
   - Proof of insurance
   - Title/document packet
   - Rental agreement
   - Payment receipt
   - Missing signatures
   - Documents needing manager/accounting review

6. Department Peek Panels
   - Service / Advisor
   - Shop / Repair
   - Parts
   - Inventory
   - Sales
   - Marketing
   - Collections
   - Documents / Office

7. Escalation Router
   - Send to manager
   - Send to advisor
   - Send to sales
   - Send to parts
   - Send to technician
   - Send to inventory lead
   - Send to collections
   - Send to accounting

## Data contract

The workspace read model should be composed from existing canonical services where possible. The first implementation should avoid schema changes unless a missing canonical record is proven necessary.

Recommended read model:

```ts
type OperationsCoordinatorWorkspace = {
  generatedAt: string;
  coordinator: { id: string; name: string };
  counts: {
    arrivalsToday: number;
    waitingCustomers: number;
    appointmentConfirmations: number;
    paperworkDue: number;
    paymentsToRoute: number;
    partsToReceive: number;
    photosNeeded: number;
    escalations: number;
  };
  actionQueue: OperationsCoordinatorAction[];
  paperworkQueue: PaperworkItem[];
  departmentPeek: DepartmentPeek[];
  quickActions: QuickAction[];
};
```

## Implementation boundary

The first implementation should build a role landing page and read-only/action-preparation layer. Deep write flows should link into existing canonical routes unless the action is already safe and established.

Do not create a second appointment system, payment system, parts system, repair order system, finance system, document system, or sales system.
