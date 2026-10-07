# Enterprise Vehicle Console Roadmap and Milestones

**Status:** Planning foundation only  
**Program:** Inventory / Vehicle Operations strengthening  
**Build style:** Thin vertical slices, staff-usable first, enterprise controls always present underneath.

## 1. Roadmap posture

Do not start by building a complete DMS. Start by making the existing Inventory / Vehicles area trustworthy, useful, and easier to manage.

The roadmap should produce value in this order:

1. Find and create vehicle records safely.
2. Make one vehicle detail page useful for daily work.
3. Add dealership inventory lifecycle controls.
4. Make blockers and readiness actionable.
5. Connect recon, title, photos, documents, tasks, and reports.
6. Add integrations only after internal source-of-truth rules are stable.

## 2. Milestone sequence

### EVC-000 Planning foundation

**Goal:** Approve operating boundary and first build target.

Deliverables:

- product architecture;
- workflows and business logic;
- roadmap and milestones;
- open decisions list;
- first implementation slice selected.

Exit criteria:

- team agrees this is an Inventory / Vehicle Console, not a separate DMS;
- first build target is limited to Enterprise Add Vehicle + Vehicle Master Console foundation;
- no external integration is considered live.

### EVC-010 Console entry and navigation

**Goal:** Make Vehicle Operations discoverable without cluttering CCC Home.

Deliverables:

- Vehicle Operations entry from CCC Home / Workspace Launcher;
- routes aligned with existing Vehicles / Inventory sections;
- role-aware navigation;
- clean return paths to Dispatch Board.

Acceptance:

- staff can reach Add Vehicle and Vehicle Search in two clicks or less;
- navigation does not create duplicate Inventory landing pages;
- unavailable capabilities are labeled planned or disabled.

### EVC-020 Enterprise Add Vehicle v1

**Goal:** Create or reuse canonical Vehicle records safely.

Deliverables:

- VIN/manual search-first flow;
- duplicate preview;
- manual identity capture;
- purpose selection;
- consequence preview;
- create Vehicle command;
- next-workspace routing.

Acceptance:

- exact duplicates are reused;
- invalid/non-VIN paths require reason;
- creation does not silently create InventoryUnit, RepairOrder, sale, price, title authority, or accounting record;
- command produces audit/timeline evidence.

### EVC-030 Vehicle Master Console v1

**Goal:** Give staff a practical vehicle detail page.

Deliverables:

- identity header;
- status/readiness summary;
- next action;
- documents/photos entry point;
- custody/location summary;
- ownership posture;
- linked tasks;
- timeline.

Acceptance:

- staff can see what the vehicle is, where it is, who owns the next action, and what blocks progress;
- every visible blocker links to an owner or action;
- timeline reconciles to underlying records.

### EVC-040 Inventory Unit Foundation

**Goal:** Separate vehicle identity from dealership inventory lifecycle.

Deliverables:

- Add to Inventory workflow;
- InventoryUnit creation boundaries;
- lifecycle status model;
- acquisition/source posture;
- initial custody and readiness blockers;
- inventory search/list projection.

Acceptance:

- customer vehicles cannot become inventory accidentally;
- InventoryUnit is distinct from Vehicle;
- status transitions are commands, not comments or task labels;
- inventory counts reconcile to InventoryUnit records.

### EVC-050 Documents, Photos, and Evidence

**Goal:** Make vehicle evidence easy to attach and hard to misuse.

Deliverables:

- document/photo upload categories;
- relationship linking;
- evidence panel on Vehicle Console;
- missing-evidence blockers;
- access and retention labels.

Acceptance:

- upload does not equal approval;
- sensitive documents obey access policy;
- photos/documents can be found from the vehicle page;
- required evidence blockers are visible.

### EVC-060 Readiness and Blocker Engine

**Goal:** Turn operational complexity into clear next actions.

Deliverables:

- readiness projection;
- blocker taxonomy;
- owner/due date/severity;
- create-task handoff;
- manager override flow.

Acceptance:

- every hard blocker is actionable;
- readiness state explains itself;
- overrides are authorized and audited;
- blocker counts match visible blocker records.

### EVC-070 Recon / Shop Link

**Goal:** Connect inventory vehicles to recon without mixing up repair authority.

Deliverables:

- recon intake from Vehicle Console;
- RepairOrder/RepairJob link;
- inventory vs customer-repair distinction;
- QC readiness back to inventory.

Acceptance:

- inventory recon and customer repair stay distinguishable;
- shop updates are visible on vehicle page;
- frontline release cannot ignore hard repair/safety blockers.

### EVC-080 Frontline Release v1

**Goal:** Move vehicles to sales-ready state only when gates pass.

Deliverables:

- release checklist;
- title/document posture;
- photo/merchandising posture;
- QC and safety gate;
- pricing/review gate;
- release command.

Acceptance:

- ready means proven ready or approved exception;
- partial and blocked are visible;
- manager override has reason and audit.

### EVC-090 Reporting and Operations Review

**Goal:** Help management run the operation.

Deliverables:

- inventory count by stage;
- aged blockers;
- cycle time;
- recon aging;
- title exceptions;
- missing photos/docs;
- frontline-ready queue;
- drill-through reports.

Acceptance:

- report numbers reconcile to record populations;
- drill-through shows the exact vehicles counted;
- stale projections are labeled.

### EVC-100 Integration readiness

**Goal:** Prepare external DMS/accounting/market integrations without activating unsafe sync.

Deliverables:

- external identity map;
- source authority matrix;
- import preview;
- reconciliation report;
- dead-letter/retry posture;
- provider disabled-state UI.

Acceptance:

- no external writeback without explicit approval;
- imported rows preview before mutation;
- conflicts become review work, not silent overwrites;
- integration freshness is visible.

## 3. First build recommendation

Start with:

1. EVC-020 Enterprise Add Vehicle v1
2. EVC-030 Vehicle Master Console v1
3. EVC-050 Documents, Photos, and Evidence

This produces daily value quickly while setting up the deeper backend controls.

## 4. Pilot plan

Pilot with a small group:

- one manager;
- one inventory staff member;
- one shop/recon user;
- one sales user;
- one office/title user if title blockers are included.

Pilot vehicle cases:

1. clean VIN, new dealership inventory;
2. existing duplicate VIN;
3. customer repair vehicle;
4. trade/acquisition candidate;
5. invalid or missing VIN exception;
6. vehicle with missing title/photo/recon blocker.

## 5. Definition of done for each slice

Each implementation slice should include:

- route or UI surface;
- server command/read model;
- permission check;
- validation and duplicate/concurrency behavior;
- audit/timeline event;
- tests;
- fallback or disabled-state behavior;
- documentation update;
- clear non-claims.

## 6. Open decisions

| Decision | Needed before |
| --- | --- |
| Preferred branch naming and PR strategy for inventory work | first code PR |
| Whether Vehicle Operations becomes the primary CCC launcher label | EVC-010 |
| VIN decoder provider or manual-only first version | EVC-020 |
| Required fields for creating InventoryUnit | EVC-040 |
| Required photo/document categories by lifecycle stage | EVC-050 |
| Manager override roles and approval wording | EVC-060 |
| What counts as frontline-ready for Time Motor Sales | EVC-080 |
| Integration priority: DealerCenter, accounting, website, valuation, or none | EVC-100 |

