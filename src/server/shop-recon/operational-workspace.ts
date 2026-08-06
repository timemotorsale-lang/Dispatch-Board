import type { ShopReconStageCode } from "./foundation";

export type ShopReconWorkLane = "CUSTOMER_REPAIR" | "INVENTORY_RECON";

export type ShopReconOperationalAction = {
  key: string;
  title: string;
  instruction: string;
  owner: string;
  evidence: string;
  requiredFields: readonly string[];
};

export type ShopReconOperationalTool = {
  key: string;
  label: string;
  href: string;
  description: string;
};

export type ShopReconOperationalSummaryField = {
  key: string;
  label: string;
  fallback: "none" | "workLaneLabel" | "vehicleIdentifier" | "subject" | "concern" | "targetDate" | "owner" | "inventoryLifecycleStage" | "completionHandoff" | "repairOrderNumber" | "authorizationPath";
};

export type ShopReconOperationalWorkspace = {
  stage: ShopReconStageCode;
  workTitle: string;
  workInstruction: string;
  tools?: readonly ShopReconOperationalTool[];
  summaryTitle?: string;
  summaryInstruction?: string;
  summaryFields?: readonly ShopReconOperationalSummaryField[];
  pilotValues: Readonly<Record<string, unknown>>;
  actions: readonly ShopReconOperationalAction[];
  laneVariants?: Partial<Record<ShopReconWorkLane, Partial<Omit<ShopReconOperationalWorkspace, "stage" | "laneVariants">>>>;
};

const action = (key: string, title: string, instruction: string, owner: string, evidence: string, requiredFields: readonly string[]): ShopReconOperationalAction => ({ key, title, instruction, owner, evidence, requiredFields });
const tool = (key: string, label: string, href: string, description: string): ShopReconOperationalTool => ({ key, label, href, description });
const summaryField = (key: string, label: string, fallback: ShopReconOperationalSummaryField["fallback"]): ShopReconOperationalSummaryField => ({ key, label, fallback });

export const SHOP_RECON_OPERATIONAL_WORKSPACES: readonly ShopReconOperationalWorkspace[] = [
  {
    stage: "SERVICE_RECON_JOB_INTAKE",
    workTitle: "Create the controlled Shop request",
    workInstruction: "Capture who is requesting work, which vehicle is involved, the intended outcome, timing, and accountable intake owner before scope is defined.",
    tools: [
      tool("INTAKE_FORM", "Open Intake Form", "/vehicles/repair-orders?intakeSource=WALK_IN", "Create or continue the customer vehicle intake record."),
      tool("SERVICE_ADVISOR", "Open Service Advisor", "/vehicles/advisor", "Review advisor queue, customer concern, appointment context, and handoff state."),
    ],
    summaryTitle: "Service Intake Summary",
    summaryInstruction: "Service Intake is the source of entry. The vehicle card verifies readiness and records the governed Shop decision.",
    summaryFields: [
      summaryField("workLane", "Work lane", "workLaneLabel"),
      summaryField("vehicleIdentifier", "VIN / vehicle / RO", "vehicleIdentifier"),
      summaryField("requester", "Customer / authorization contact", "subject"),
      summaryField("concern", "Concern or requested outcome", "concern"),
      summaryField("commitmentAt", "Customer promise", "targetDate"),
      summaryField("intakeOwner", "Service owner", "owner"),
    ],
    pilotValues: { workLane: "Inventory Recon", vehicleIdentifier: "PILOT-INV-001", requester: "Brock", concern: "Complete frontline mechanical inspection and approved recon work.", commitmentAt: "2026-08-05", intakeOwner: "Brock" },
    actions: [
      action("SELECT_LANE", "Identify the work lane", "Choose Customer Repair or Inventory Recon so the correct authority and commitment rules apply.", "Service Advisor or Inventory owner", "Lane declaration", ["workLane"]),
      action("FIND_VEHICLE", "Find or create the vehicle record", "Search, scan, or enter the authoritative vehicle identifier and confirm the correct card.", "Intake owner", "Vehicle identity reference", ["vehicleIdentifier"]),
      action("IDENTIFY_REQUESTER", "Identify requester and authorization contact", "Record who requested the work and who may make scope or spending decisions.", "Intake owner", "Requester and contact record", ["requester"]),
      action("CAPTURE_CONCERN", "Capture concern or requested outcome", "Record the customer's concern or Inventory objective in operational language.", "Intake owner", "Concern statement", ["concern"]),
      action("SET_COMMITMENT", "Record timing and commitment", "Capture the customer promise or frontline target that will govern priority.", "Intake owner", "Commitment record", ["commitmentAt"]),
      action("ASSIGN_OWNER", "Assign and submit intake", "Name the accountable intake owner and submit a complete request to Job Scope Definition.", "Service Advisor or Brock", "Attributable intake submission", ["intakeOwner"]),
    ],
    laneVariants: {
      INVENTORY_RECON: {
        workTitle: "Verify the Inventory-to-Shop handoff packet",
        workInstruction: "Confirm the upstream Inventory Lifecycle packet is complete enough for Shop control without repeating dealership intake.",
        tools: [
          tool("INVENTORY_CARD", "Open Inventory Vehicle Card", "/vehicles/inventory", "Review the dealership inventory vehicle and lifecycle context."),
          tool("INVENTORY_HANDOFF", "Open Inventory-to-Shop Handoff", "/vehicles/repair-orders?intakeSource=INVENTORY_RECON", "Create or review the inventory recon repair-order handoff."),
          tool("PRIOR_INSPECTION", "Open Prior Inspection / Photos", "/vehicles/inventory", "Review upstream intake, inspection, photos, and recon context."),
          tool("ACCEPT_HANDOFF", "Accept Shop Handoff", "#stage-completion", "Go to the governed completion controls after the handoff is verified."),
        ],
        summaryTitle: "Inventory-to-Shop Handoff Summary",
        summaryInstruction: "Inventory Lifecycle is the source of entry. The Shop card verifies the handoff packet and accepts the vehicle as controlled Shop work.",
        summaryFields: [
          summaryField("vehicleIdentifier", "Stock / VIN / unit identity", "vehicleIdentifier"),
          summaryField("inventoryStage", "Source inventory stage", "inventoryLifecycleStage"),
          summaryField("requester", "Inventory owner / approver", "owner"),
          summaryField("concern", "Recon objective", "concern"),
          summaryField("commitmentAt", "Frontline target", "targetDate"),
          summaryField("priorInspection", "Prior inspection / photos", "none"),
          summaryField("handoffAccepted", "Shop handoff acceptance", "none"),
        ],
        pilotValues: { workLane: "Inventory Recon", vehicleIdentifier: "PILOT-INV-001", inventoryStage: "Recon Plan and Approval", requester: "Brock", concern: "Complete frontline mechanical inspection and approved recon work.", commitmentAt: "2026-08-05", priorInspection: "Inventory intake and prior inspection packet available", handoffAccepted: "Ready for Brock acceptance" },
        actions: [
          action("VERIFY_INVENTORY_IDENTITY", "Verify inventory identity", "Confirm the stock, VIN, unit, and repair-order identity match the upstream Inventory Lifecycle record.", "Inventory owner or Brock", "Inventory identity match", ["vehicleIdentifier"]),
          action("VERIFY_SOURCE_STAGE", "Verify source inventory stage", "Confirm which Inventory Lifecycle stage sent the vehicle into Shop control.", "Inventory owner", "Source-stage reference", ["inventoryStage"]),
          action("CONFIRM_RECON_AUTHORITY", "Confirm inventory owner and approver", "Name the person who controls recon scope and spending decisions for this dealership-owned unit.", "Inventory owner or Brock", "Inventory authority record", ["requester"]),
          action("VERIFY_RECON_OBJECTIVE", "Verify recon objective", "Confirm the exact Shop objective without creating a duplicate customer-style intake.", "Brock", "Recon objective statement", ["concern"]),
          action("VERIFY_FRONTLINE_TARGET", "Verify frontline target", "Confirm the target date that should drive inventory urgency and priority.", "Inventory owner", "Frontline target record", ["commitmentAt"]),
          action("VERIFY_PRIOR_PACKET", "Verify prior inspection and photos", "Confirm upstream intake, inspection notes, photos, and known blockers are available to Shop.", "Brock or Eli", "Prior packet reference", ["priorInspection"]),
          action("ACCEPT_SHOP_HANDOFF", "Accept Shop handoff", "Record that Shop accepts the inventory unit as controlled Shop work and can proceed to Job Scope Definition.", "Brock; Eli as backup", "Shop handoff acceptance", ["handoffAccepted"]),
        ],
      },
    },
  },
  {
    stage: "JOB_SCOPE_DEFINITION",
    workTitle: "Complete the Scope Builder",
    workInstruction: "Use one guided Scope Builder tool to define why the vehicle is here, what the shop may do, when the technician must stop, and who owns approval.",
    tools: [
      tool("SCOPE_BUILDER", "Scope Builder", "#scope-builder", "Open the official form that defines the scope packet and leaves the Stage 2 work trail."),
    ],
    pilotValues: { scopeReason: "Recon inspection", workAreas: "Brakes; Safety inspection; Warning light", allowedWork: "Inspect + estimate", approvedLimit: "Recon threshold", stopRules: "Stop before repair; Stop if cost exceeds threshold; Stop if sublet/vendor is needed", safetyConcern: "Yes", roadTestAllowed: "Not sure", partsLikelyNeeded: "Unknown", subletVendorLikely: "No", specialToolsProcedure: "Unknown", approvalOwner: "Brock / Inventory owner", scopeNotes: "Perform inspection and estimate only. Do not repair beyond approved recon threshold.", scopeSummaryReviewed: true, scopeReadyForWorkOrder: true },
    actions: [
      action("REASON_SELECTED", "Reason selected", "Use Scope Builder to identify why the vehicle is here.", "Lane owner", "Scope reason", ["scopeReason"]),
      action("WORK_AREA_SELECTED", "Work area selected", "Use Scope Builder to identify the concern or recon area involved.", "Lane owner", "Work area", ["workAreas"]),
      action("ALLOWED_WORK_DEFINED", "Allowed work defined", "Use Scope Builder to define what the shop is allowed to do right now.", "Lane authority", "Allowed-work boundary", ["allowedWork"]),
      action("STOP_RULE_DEFINED", "Stop rule defined", "Use Scope Builder to define when the technician must stop and ask.", "Lane authority", "Stop rule", ["stopRules"]),
      action("RISK_CHECK_COMPLETED", "Risk check completed", "Use Scope Builder to answer safety, road-test, parts and sublet risk questions.", "Brock or Service Advisor", "Scope risk check", ["safetyConcern", "roadTestAllowed", "partsLikelyNeeded", "subletVendorLikely"]),
      action("APPROVAL_OWNER_NAMED", "Approval owner named", "Use Scope Builder to identify who owns the scope decision.", "Lane owner", "Approval owner", ["approvalOwner"]),
      action("SCOPE_REVIEWED_READY", "Scope reviewed and ready", "Review the generated Scope Summary and mark it ready for Work Order.", "Service Advisor or Brock", "Scope-ready confirmation", ["scopeSummaryReviewed", "scopeReadyForWorkOrder"]),
    ],
    laneVariants: {
      CUSTOMER_REPAIR: {
        workInstruction: "Use one guided Scope Builder tool to define what the customer authorized, where the technician must stop, and who owns approval.",
        pilotValues: { scopeReason: "Customer concern", workAreas: "Brakes; Noise / vibration", allowedWork: "Diagnose only", approvedLimit: "1.0 diagnostic hour", stopRules: "Stop before repair; Stop before teardown; Stop if outside original concern", safetyConcern: "Unknown", roadTestAllowed: "Not sure", partsLikelyNeeded: "Unknown", subletVendorLikely: "No", specialToolsProcedure: "Unknown", approvalOwner: "Customer through Service Advisor", scopeNotes: "Perform diagnosis/estimate only. Do not repair until customer approval.", scopeSummaryReviewed: true, scopeReadyForWorkOrder: true },
      },
      INVENTORY_RECON: {
        workInstruction: "Use one guided Scope Builder tool to define the recon objective, stop threshold, risks, and inventory approval owner.",
        tools: [
          tool("SCOPE_BUILDER", "Scope Builder", "#scope-builder", "Open the official inventory recon Scope Builder form and leave the Stage 2 work trail."),
        ],
      },
    },
  },
  {
    stage: "WORK_ORDER_CREATION",
    workTitle: "Create the controlled work order in Labor Guide",
    workInstruction: "Open Labor Guide to create the technician-ready work order. Then confirm the simple checklist below before Stage 3 can advance.",
    tools: [
      tool("LABOR_GUIDE", "Labor Guide", "/diagnostics/labor-guide", "Open the existing Labor Guide work-order creation tool for this repair order."),
    ],
    pilotValues: { scopePacketReviewed: true, workOrderTypeSelected: true, laborOperationsCreated: true, partsMaterialNeedsIdentified: true, authorizationPathAttached: true, technicianStopInstructionsRecorded: true, workOrderReadyForDispatch: true },
    actions: [
      action("REVIEW_SCOPE_PACKET", "Scope Builder packet reviewed", "Confirm Labor Guide is using the approved Stage 2 scope and stop rules.", "Service Advisor or Brock", "Reviewed scope-to-work-order packet", ["scopePacketReviewed"]),
      action("SELECT_WORK_ORDER_TYPE", "Work order type selected", "Choose the correct Labor Guide type: diagnosis, inspection, repair, recon package, estimate, or QC/rework.", "Service Advisor or Brock", "Work-order type selection", ["workOrderTypeSelected"]),
      action("CREATE_LABOR_OPERATIONS", "Labor operations created", "Create at least one technician-actionable labor operation in Labor Guide.", "Service Advisor or Brock", "Labor Guide operation lines", ["laborOperationsCreated"]),
      action("IDENTIFY_PARTS_MATERIALS", "Parts/material needs identified", "Record whether parts, fluids, tires, materials, sublet, or unknown needs are expected.", "Service Advisor or Brock", "Parts/material expectation", ["partsMaterialNeedsIdentified"]),
      action("ATTACH_AUTHORIZATION_PATH", "Authorization/approval path attached", "Attach the customer/advisor path or inventory/Brock approval path to the order.", "Lane authority", "Authorization path", ["authorizationPathAttached"]),
      action("RECORD_TECH_STOP_INSTRUCTIONS", "Technician stop instructions recorded", "State what the technician may do and exactly when they must stop and ask.", "Service Advisor or Brock", "Technician stop instructions", ["technicianStopInstructionsRecorded"]),
      action("MARK_READY_FOR_DISPATCH", "Work order ready for dispatch", "Confirm the Labor Guide packet is ready to move into the next Shop stage.", "Service Advisor or Brock", "Dispatch-ready confirmation", ["workOrderReadyForDispatch"]),
    ],
  },
  {
    stage: "VEHICLE_INTAKE_CUSTODY",
    workTitle: "Complete Vehicle Intake & Custody",
    workInstruction: "Open the physical check-in form, confirm the exact vehicle, control keys, document condition, assign location, and accept custody.",
    tools: [
      tool("VEHICLE_INTAKE_CUSTODY", "Vehicle Intake & Custody", "#vehicle-intake-custody", "Open the official physical check-in form for Stage 4."),
    ],
    pilotValues: { observedIdentifier: "PILOT-INV-001", decodedVehicle: "2020 Ford Escape", matchStatus: "Match confirmed", keyCount: 2, keyTag: "KT-0417", custodyAcceptedBy: "Brock", arrivalCondition: "As-is", intakeNotes: "Minor scuffs on front bumper; RR door ding", photoEvidence: "Uploaded intake photos", custodyLocation: "Inventory Lot A", movementRestriction: "No Move – Shop Custody", bayNeeded: "Yes", custodyAccepted: true },
    actions: [
      action("MATCH_VEHICLE_IDENTITY", "Vehicle identity matched", "Use the physical check-in form to match the observed VIN, stock, or RO against the controlled vehicle.", "Receiving staff", "Vehicle identity match", ["observedIdentifier", "matchStatus"]),
      action("RECORD_ARRIVAL_CONDITION", "Arrival condition recorded", "Record the as-arrived condition and visible damage notes.", "Receiving staff", "Arrival-condition record", ["arrivalCondition", "intakeNotes"]),
      action("CONTROL_KEYS", "Keys counted and tagged", "Record the key count and controlled key tag or locker reference.", "Receiving staff", "Key-control record", ["keyCount", "keyTag"]),
      action("CAPTURE_PHOTOS", "Photos/evidence captured", "Attach or reference intake photos and condition evidence.", "Receiving staff", "Photo evidence", ["photoEvidence"]),
      action("ASSIGN_LOCATION", "Physical location assigned", "Record the current zone, lot position, or custody location.", "Brock or Eli", "Physical location assignment", ["custodyLocation"]),
      action("NOTE_MOVEMENT_RESTRICTION", "Movement restriction noted", "Identify the movement boundary until Safety & Mobility Triage.", "Brock or Eli", "Movement restriction note", ["movementRestriction"]),
      action("ACCEPT_CUSTODY", "Custody accepted", "Confirm the exact vehicle is now under Shop custody.", "Brock or Eli", "Custody acceptance", ["custodyAcceptedBy", "custodyAccepted"]),
    ],
  },
] as const;

export function getShopReconOperationalWorkspace(stage: ShopReconStageCode, lane?: ShopReconWorkLane) {
  const workspace = SHOP_RECON_OPERATIONAL_WORKSPACES.find(workspace => workspace.stage === stage);
  const variant = lane ? workspace?.laneVariants?.[lane] : null;
  return workspace && variant ? { ...workspace, ...variant, laneVariants: workspace.laneVariants } : workspace ?? null;
}
