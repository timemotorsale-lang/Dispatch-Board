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
  {
    stage: "SAFETY_MOBILITY_TRIAGE",
    workTitle: "Complete Safety & Mobility Triage",
    workInstruction: "Open the official triage form to decide how this vehicle may safely move, be road-tested, or enter inspection.",
    tools: [
      tool("SAFETY_MOBILITY_TRIAGE", "Safety & Mobility Triage", "#safety-mobility-triage", "Open the official Stage 5 safety and movement decision form."),
    ],
    pilotValues: { leaksFluids: "No active leak", brakeSteeringConcern: "Needs caution", fireElectricalRisk: "No fire risk", mobility: "Restricted movement", startRunStatus: "Starts and runs", moveMethod: "Technician or Brock only", roadTestDecision: "Pending technician approval", roadTestReason: "Brake concern", roadTestAuthority: "Walter / Brock", movementRestriction: "No customer road test", containment: "Park in hold zone", physicalHoldLocation: "Safety Hold A", priority: "P2 High", nextAllowedStage: "Inspection / Concern Verification", confirmedBy: "Brock", hazards: "Leaks/fluids: No active leak; Brake/steering: Needs caution; Fire/electrical: No fire risk", safetyDecisionConfirmed: true },
    actions: [
      action("SCREEN_IMMEDIATE_HAZARDS", "Immediate safety hazard screen completed", "Record leaks, brake/steering concern, and fire/electrical risk before anyone moves the vehicle.", "Brock or qualified technician", "Immediate hazard screen", ["leaksFluids", "brakeSteeringConcern", "fireElectricalRisk", "hazards"]),
      action("CLASSIFY_MOBILITY", "Mobility status classified", "Choose how the vehicle may move based on start/run status and movement method.", "Brock or qualified technician", "Mobility classification", ["mobility", "startRunStatus", "moveMethod"]),
      action("DECIDE_ROAD_TEST", "Road-test eligibility decided", "Decide whether the vehicle may be road-tested, why, and who controls the decision.", "Brock or qualified technician", "Road-test decision", ["roadTestDecision", "roadTestReason", "roadTestAuthority"]),
      action("RECORD_MOVEMENT_RESTRICTION", "Shop movement restriction recorded", "Record the operating restriction for movement inside the shop or lot.", "Brock or Eli", "Movement restriction", ["movementRestriction"]),
      action("ASSIGN_PRIORITY", "Priority / risk level assigned", "Assign the operational safety priority that controls urgency and queue behavior.", "Brock", "Priority/risk assignment", ["priority"]),
      action("RECORD_CONTAINMENT", "Required containment action recorded", "Record the containment action and hold location required before inspection.", "Brock or Eli", "Containment action", ["containment", "physicalHoldLocation"]),
      action("CONFIRM_TRIAGE_DECISION", "Safety triage decision confirmed", "Confirm the safety and movement decision is clear before the next stage.", "Brock", "Triage confirmation", ["nextAllowedStage", "confirmedBy", "safetyDecisionConfirmed"]),
    ],
  },
  {
    stage: "INSPECTION_CONCERN_VERIFICATION",
    workTitle: "Complete Inspection & Concern Verification",
    workInstruction: "Open the official inspection form to review the scope, verify the vehicle, complete the inspection, classify the concern outcome, and submit the inspection result.",
    tools: [
      tool("INSPECTION_CONCERN_VERIFICATION", "Inspection / Concern Verification", "#inspection-concern-verification", "Open the official Stage 6 inspection and concern-verification form."),
    ],
    pilotValues: { scopePacket: "Reviewed", workOrderOperations: "Brake noise / warning light", stopRule: "Stop before repair", vinRoMatch: "Match confirmed", odometer: 84216, inspector: "Walter Hernandez", inspectionTemplate: "Customer concern inspection", inspectionChecklistStatus: "Completed", safetyItems: "Brake pulsation and ABS light noted", concernStatus: "Verified", testCondition: "Low-speed braking", inspectionSummary: "Concern verified during low-speed braking. ABS light present. Front brake pulsation observed.", measurementsRecorded: "Front pads 3mm; rotors show pulsation; ABS code stored", inspectionEvidence: "Photos + scan attached", nextDecision: "Proceed to Diagnosis", inspectionPacketComplete: true },
    actions: [
      action("REVIEW_SCOPE_WORK_ORDER", "Scope and work order reviewed", "Confirm the approved scope, Labor Guide operation, and stop rule before inspection begins.", "Walter Hernandez or assigned technician", "Scope/work-order review", ["scopePacket", "workOrderOperations", "stopRule"]),
      action("CONFIRM_VEHICLE_ODOMETER", "Vehicle identity and odometer confirmed", "Confirm the VIN/RO match, observed odometer, and inspector.", "Walter Hernandez or assigned technician", "Identity and odometer confirmation", ["vinRoMatch", "odometer", "inspector"]),
      action("COMPLETE_INSPECTION_CHECKLIST", "Required inspection checklist completed", "Complete the correct inspection template and record safety items observed.", "Walter Hernandez or assigned technician", "Completed inspection checklist", ["inspectionTemplate", "inspectionChecklistStatus", "safetyItems"]),
      action("CLASSIFY_CONCERN_OUTCOME", "Concern verified or outcome classified", "Record whether the concern was verified, not reproduced, intermittent, unsafe to test, or not applicable.", "Walter Hernandez or assigned technician", "Concern-verification outcome", ["concernStatus", "testCondition", "inspectionSummary"]),
      action("RECORD_MEASUREMENTS", "Measurements and observations recorded", "Record measurements, observations, and condition details needed for diagnosis or repair planning.", "Walter Hernandez or assigned technician", "Measurements and observations", ["measurementsRecorded"]),
      action("ATTACH_INSPECTION_EVIDENCE", "Photo / video / scan evidence attached", "Attach or reference photos, video, scan results, or other material inspection evidence.", "Walter Hernandez or assigned technician", "Inspection evidence", ["inspectionEvidence"]),
      action("SUBMIT_INSPECTION_RESULT", "Inspection result submitted for next decision", "Confirm the inspection packet is complete and select the next decision path.", "Walter Hernandez or Brock", "Submitted inspection result", ["nextDecision", "inspectionPacketComplete"]),
    ],
  },
  {
    stage: "DIAGNOSIS",
    workTitle: "Complete diagnosis in the Diagnostic Module",
    workInstruction: "Open the Diagnostic Module to perform the actual diagnostic work. Use the checklist below only to govern whether the module produced the required outputs.",
    tools: [
      tool("DIAGNOSTIC_MODULE", "Diagnostic Module", "/vehicles/repair-workbench", "Open the existing repair workbench diagnostic module for this repair order."),
    ],
    pilotValues: { verifiedConcernReviewed: true, diagnosticRouteSelected: true, diagnosticTestsRecorded: true, diagnosticMeasurementsAttached: true, supportedCauseDocumented: true, recommendedCorrectionEntered: true, diagnosisSubmitted: true },
    actions: [
      action("REVIEW_VERIFIED_CONCERN", "Stage 6 verified concern reviewed", "Confirm the Diagnostic Module is using the verified concern and inspection result from Stage 6.", "Walter Hernandez or assigned technician", "Verified concern review", ["verifiedConcernReviewed"]),
      action("SELECT_DIAGNOSTIC_ROUTE", "Diagnostic route selected", "Select the diagnostic route in the module: scan, electrical, mechanical, drivability, brake, suspension, HVAC, leak, or other.", "Walter Hernandez or assigned technician", "Diagnostic route selection", ["diagnosticRouteSelected"]),
      action("RECORD_DIAGNOSTIC_TESTS", "Required diagnostic tests recorded", "Record the tests performed in the Diagnostic Module.", "Walter Hernandez or assigned technician", "Diagnostic test record", ["diagnosticTestsRecorded"]),
      action("ATTACH_SCAN_MEASUREMENTS", "Scan data / measurements attached", "Attach or record scan codes, live data, measurements, readings, photos, or other diagnostic evidence.", "Walter Hernandez or assigned technician", "Scan data and measurements", ["diagnosticMeasurementsAttached"]),
      action("DOCUMENT_CAUSE_OR_UNCERTAINTY", "Supported cause or uncertainty documented", "Document the supported cause, or clearly state uncertainty and the additional test needed.", "Walter Hernandez or assigned technician", "Cause or uncertainty statement", ["supportedCauseDocumented"]),
      action("ENTER_RECOMMENDED_CORRECTION", "Recommended correction entered", "Enter the technician's recommended repair, adjustment, teardown, sublet, or next action.", "Walter Hernandez or assigned technician", "Recommended correction", ["recommendedCorrectionEntered"]),
      action("SUBMIT_DIAGNOSIS", "Diagnosis submitted for repair-plan decision", "Submit the diagnostic packet so the next stage can build the repair plan.", "Walter Hernandez or Brock", "Submitted diagnosis packet", ["diagnosisSubmitted"]),
    ],
  },
] as const;

export function getShopReconOperationalWorkspace(stage: ShopReconStageCode, lane?: ShopReconWorkLane) {
  const workspace = SHOP_RECON_OPERATIONAL_WORKSPACES.find(workspace => workspace.stage === stage);
  const variant = lane ? workspace?.laneVariants?.[lane] : null;
  return workspace && variant ? { ...workspace, ...variant, laneVariants: workspace.laneVariants } : workspace ?? null;
}
