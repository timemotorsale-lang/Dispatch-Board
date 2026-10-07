# Enterprise Vehicle Console Workflows and Business Logic

**Status:** Planning foundation only  
**Goal:** Make vehicle operations simple for staff while preserving enterprise controls, auditability, and recovery.

## 1. Workflow design rule

Every workflow should fit this pattern:

```text
Find or create vehicle
-> choose purpose
-> capture only required facts
-> show duplicates and blockers
-> preview consequences
-> create/update the minimum authoritative record
-> open the next workspace
```

If a staff member cannot explain what will happen after pressing the button, the workflow is too complicated or under-labeled.

## 2. Core workflows

### WF-001 Add Vehicle

**Purpose:** Establish or reuse a canonical Vehicle.

Happy path:

1. Staff enters VIN, stock, plate, or partial vehicle detail.
2. System searches existing vehicle records first.
3. If exact match exists, staff opens that vehicle.
4. If no match, staff enters year, make, model, location, and purpose.
5. Staff reviews consequence: creates Vehicle only, not inventory unit, repair order, deal, or title authority.
6. System creates Vehicle and opens selected next workspace.

Required logic:

- VIN normalize before search.
- Duplicate warning before creation.
- Non-VIN exception requires reason.
- Manual year/make/model must be labeled manual if decoder is not available.
- Created Vehicle gets timeline event and audit.

### WF-002 Add To Inventory

**Purpose:** Start a dealership-controlled inventory cycle for a known Vehicle.

Entry requirements:

- canonical Vehicle exists;
- relationship posture supports dealership control, acquisition, trade, purchase, auction, or ownership review;
- user has inventory authority.

Minimum fields:

- acquisition source or reason;
- location;
- intended path: recon, frontline review, wholesale, hold;
- custody status;
- initial blocker checklist.

Business rules:

- InventoryUnit is separate from Vehicle.
- A customer repair vehicle cannot become inventory through this workflow unless ownership transition is explicitly approved.
- Purchase cost, pack, floorplan, and accounting fields may be deferred but must be visibly incomplete if required by policy.

### WF-003 Vehicle Detail / Master Console

**Purpose:** Give staff one practical operating page for the vehicle.

The page should answer:

- Identity: what is this vehicle?
- Status: where is it in the lifecycle?
- Ownership: who controls it?
- Location: where is it physically?
- Readiness: what blocks the next step?
- Work: who owns the next action?
- Evidence: what documents/photos support it?

Required sections:

- identity header;
- readiness summary;
- next action;
- photos/documents;
- ownership/custody;
- recon/shop;
- sales/merchandising;
- title/documents;
- timeline.

### WF-004 Receipt / Custody

**Purpose:** Confirm the vehicle physically arrived and assign location/accountability.

Required facts:

- location;
- received by;
- date/time;
- keys present;
- mileage if available;
- visible condition note;
- photos optional but encouraged.

Business rules:

- Custody event is append-only.
- Current location is a projection from custody events.
- Missing critical custody facts create blockers, not hidden warnings.

### WF-005 Recon / Repair Intake

**Purpose:** Move vehicle into shop/recon work without losing inventory context.

Entry requirements:

- Vehicle exists.
- InventoryUnit or service/customer context is clear.
- Work purpose is known.

Business rules:

- RepairOrder owns repair execution.
- InventoryUnit owns commercial lifecycle.
- Shared tasks connect them.
- Customer repair and inventory recon must remain distinguishable.

### WF-006 Photos and Documents

**Purpose:** Capture evidence and merchandising material.

Document/photo categories:

- identity;
- purchase/acquisition;
- title/registration;
- keys/odometer;
- condition;
- recon/repair;
- sales/merchandising;
- delivery/disposition.

Business rules:

- Uploading evidence does not approve a workflow by itself.
- Every document/photo has relationship context.
- Sensitive documents must follow document access policy.

### WF-007 Readiness / Blocker Management

**Purpose:** Turn scattered issues into owned work.

Readiness blocker types:

- identity;
- ownership/title;
- custody/location;
- safety;
- recon/repair;
- parts;
- photos/merchandising;
- pricing;
- sales hold;
- document packet;
- manager approval.

Business rules:

- Every blocker has owner, due date, severity, and next action.
- Clearing a blocker requires evidence or a command.
- Blocker counts must reconcile to visible records.

### WF-008 Frontline Release

**Purpose:** Mark an inventory unit ready for sales/frontline exposure.

Gate checks:

- identity verified;
- custody/location known;
- title/document posture acceptable or exception approved;
- recon/QC complete or exception approved;
- photos/merchandising complete if required;
- pricing/review complete if required;
- no blocking safety hold.

Business rules:

- Release is a manager-visible command.
- Partial readiness must be labeled partial, not ready.
- Overrides require reason and authority.

## 3. Business logic catalog

### Duplicate guard

| Situation | System behavior |
| --- | --- |
| Exact VIN match | Reuse existing Vehicle. |
| Same stock but different VIN | Block creation until reviewed. |
| Similar VIN/plate/year/make/model | Warn and offer duplicate review. |
| Invalid VIN with non-VIN exception | Allow only with reason and limited confidence. |

### Next-workspace recommendation

| Purpose | Recommended workspace |
| --- | --- |
| dealership inventory | Add to Inventory or Vehicle Detail |
| customer service/repair | Service Intake |
| trade/acquisition | Acquisition Appraisal |
| uncertain ownership | Vehicle Detail with ownership blocker |
| recon-ready inventory | Recon / Shop Queue |
| frontline-ready review | Frontline Release |

### Readiness scoring

Readiness should not be a magic score. It should be a simple projection:

- `Ready`: all required gates passed.
- `Blocked`: one or more hard blockers.
- `Needs review`: conflicting, stale, or manually-entered facts.
- `Partial`: non-critical requirements remain.
- `Unknown`: insufficient evidence.

### Staff task creation

Every consequential unresolved issue should be convertible into a shared Task:

- title;
- vehicle context;
- owner;
- due date;
- reason;
- blocker link;
- required evidence;
- return link to Vehicle Console.

## 4. Simplicity standards

- Prefer selections over long typing.
- Keep required fields low on first entry.
- Show why a field is required.
- Use one primary action per step.
- Separate "save identity" from "start inventory ownership".
- Avoid tabs that hide the next action.
- Do not show enterprise controls until they are needed.
- Keep every blocker actionable.

## 5. Safety and authority gates

Manager authority is required for:

- duplicate merge;
- ownership transition from customer to dealership inventory;
- release override;
- title exception approval;
- safety blocker override;
- financial amount approval;
- wholesale/disposition decision;
- irreversible cancellation/reversal.

The system may recommend. It must not silently decide these actions.

