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
    workTitle: "Complete the diagnostic decision",
    workInstruction: "Use the Diagnostic Module to review the verified concern, collect assist-inspection evidence, and choose the supported next decision.",
    tools: [
      tool("DIAGNOSTIC_MODULE", "Diagnostic Module", "/vehicles/repair-workbench", "Open the existing repair workbench diagnostic module for this repair order."),
      tool("DIAGNOSTIC_ASSIST_INSPECTION", "Diagnostic Assist Inspection", "/vehicles/repair-workbench", "Open the concern-seeded inspection checklist and save its findings as diagnostic evidence. This does not pass Final QC."),
    ],
    pilotValues: { diagnosticEvidenceReviewed: true, diagnosticAssistInspectionPerformed: true, diagnosticTestDriveOrStaticCheckCompleted: true, diagnosticDispositionSelected: true, diagnosticNextStepControlled: true, diagnosticDisposition: "Possible repair needed", diagnosticNotes: "Diagnostic assist inspection found brake pulsation, ABS light present, and scan evidence attached for repair-plan decision." },
    actions: [
      action("REVIEW_DIAGNOSTIC_EVIDENCE", "Diagnostic evidence reviewed", "Review the Stage 6 verified concern, prior inspection result, scan data, photos, and measurements before deciding.", "Walter Hernandez or assigned technician", "Diagnostic evidence review", ["diagnosticEvidenceReviewed"]),
      action("PERFORM_DIAGNOSTIC_ASSIST_INSPECTION", "Diagnostic assist inspection performed", "Use the familiar inspection checklist as evidence collection for diagnosis; this is not a final QC pass.", "Walter Hernandez or assigned technician", "Diagnostic assist inspection", ["diagnosticAssistInspectionPerformed"]),
      action("COMPLETE_DIAGNOSTIC_ROAD_STATIC_CHECK", "Road test or static check completed or marked not needed", "Record the road-test, static check, or not-needed reason that supports the diagnostic decision.", "Walter Hernandez or assigned technician", "Diagnostic test/road-check result", ["diagnosticTestDriveOrStaticCheckCompleted"]),
      action("SELECT_DIAGNOSTIC_DISPOSITION", "Diagnostic disposition selected", "Choose no concern observed, concern found, possible repair needed, more diagnosis needed, or manager hold.", "Walter Hernandez or assigned technician", "Diagnostic disposition", ["diagnosticDispositionSelected", "diagnosticDisposition"]),
      action("CONTROL_DIAGNOSTIC_NEXT_STEP", "Next decision controlled if concern found", "If a concern is found, route it to repair planning, more diagnosis, scope review, or manager hold with observations attached.", "Walter Hernandez or Brock", "Controlled diagnostic next step", ["diagnosticNextStepControlled", "diagnosticNotes"]),
    ],
  },
  {
    stage: "FINDINGS_REPAIR_PLAN",
    workTitle: "Build the Findings & Repair Plan",
    workInstruction: "Use Repair Workbench and Labor Guide to convert verified findings into a plan that is ready for authorization.",
    tools: [
      tool("REPAIR_WORKBENCH", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair workbench to build the repair plan, estimate, and authorization packet."),
      tool("LABOR_GUIDE", "Labor Guide", "/diagnostics/labor-guide", "Open Labor Guide to refine labor operations and time assumptions."),
    ],
    pilotValues: { findingsReviewed: true, workNeededClassified: true, repairPlanCreated: true, costResourceImpactPrepared: true, submittedForAuthorization: true },
    actions: [
      action("REVIEW_FINDINGS", "Findings reviewed", "Review inspection and diagnosis evidence before building the repair plan.", "Brock or assigned technician", "Reviewed finding evidence", ["findingsReviewed"]),
      action("CLASSIFY_WORK_NEEDED", "Work needed classified", "Classify each finding as safety, required, recommended, optional, cosmetic, deferred, or no action.", "Brock or assigned technician", "Finding classification", ["workNeededClassified"]),
      action("CREATE_REPAIR_PLAN", "Repair plan created", "Create the repair operations clearly enough for labor, parts, dispatch, and technician execution.", "Brock with technician input", "Repair-plan operations", ["repairPlanCreated"]),
      action("PREPARE_COST_RESOURCE_IMPACT", "Cost / resource impact prepared", "Identify labor, parts, sublet, special tools, bay needs, dependencies, and estimated cost impact.", "Brock or Service Advisor", "Cost and resource impact", ["costResourceImpactPrepared"]),
      action("SUBMIT_FOR_AUTHORIZATION", "Submitted for authorization", "Submit the current repair-plan version to the correct approval path.", "Brock or Service Advisor", "Authorization-ready repair plan", ["submittedForAuthorization"]),
    ],
  },
  {
    stage: "AUTHORIZATION",
    workTitle: "Record customer / owner authorization",
    workInstruction: "Use Repair Workbench to record the exact authorization decision. Use the lane support tool only when the approving party or source context needs review.",
    tools: [
      tool("REPAIR_WORKBENCH_AUTHORIZATION", "Repair Workbench / Authorization", "/vehicles/repair-workbench", "Open the repair workbench authorization area for this repair order."),
      tool("SERVICE_ADVISOR", "Service Advisor / Approval Desk", "/vehicles/advisor", "Open Service Advisor to document or review customer authorization communication."),
    ],
    pilotValues: { repairPlanVersionReviewed: true, approvalAuthorityConfirmed: true, authorizationDecisionRecorded: true, approvedScopeAmountCaptured: true, authorizationSubmittedForReadiness: true },
    actions: [
      action("REVIEW_REPAIR_PLAN_VERSION", "Current repair-plan version reviewed", "Confirm the approving party is looking at the exact current repair plan and estimate version.", "Service Advisor, Brock, or Inventory owner", "Reviewed repair-plan version", ["repairPlanVersionReviewed"]),
      action("CONFIRM_APPROVAL_AUTHORITY", "Approval authority confirmed", "Confirm who controls permission and spend: customer, Service Advisor, Brock, Inventory owner, or General Manager exception.", "Service Advisor or Brock", "Approval authority confirmation", ["approvalAuthorityConfirmed"]),
      action("RECORD_AUTHORIZATION_DECISION", "Decision recorded", "Record accepted, partially accepted, declined, pending, or revision requested.", "Service Advisor or Brock", "Authorization decision", ["authorizationDecisionRecorded"]),
      action("CAPTURE_SCOPE_AMOUNT", "Approved scope and amount captured", "Record exactly what is approved, what is not approved, and the dollar, labor, or resource limit.", "Service Advisor or Brock", "Authorized scope and amount", ["approvedScopeAmountCaptured"]),
      action("SUBMIT_AUTHORIZATION_READINESS", "Authorization submitted for readiness", "Submit the authorization packet so Parts & Resource Readiness can begin with a frozen authorized scope.", "Service Advisor or Brock", "Authorization-ready submission", ["authorizationSubmittedForReadiness"]),
    ],
    laneVariants: {
      INVENTORY_RECON: {
        workInstruction: "Use Repair Workbench to record the exact inventory authorization decision and Inventory Lifecycle Authorization to confirm the dealership-owned unit is approved to proceed.",
        tools: [
          tool("REPAIR_WORKBENCH_AUTHORIZATION", "Repair Workbench / Authorization", "/vehicles/repair-workbench", "Open the repair workbench authorization area for this repair order."),
          tool("INVENTORY_LIFECYCLE_AUTHORIZATION", "Inventory Lifecycle Authorization", "/vehicles/inventory", "Open the inventory lifecycle source authorization for dealership-owned recon work."),
        ],
      },
    },
  },
  {
    stage: "PARTS_RESOURCE_READINESS",
    workTitle: "Confirm Parts & Resource Readiness",
    workInstruction: "Use the adopted Parts Ordering Form as the source of truth, and Repair Workbench to review the authorized repair plan.",
    tools: [
      tool("PARTS_ORDERING_FORM", "Parts Ordering Form", "/diagnostics/parts-ordering", "Open the existing governed parts ordering form adopted from the inventory lifecycle."),
      tool("REPAIR_WORKBENCH", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair workbench to review the authorized repair plan and estimate."),
    ],
    pilotValues: { authorizedRepairPlanReviewed: true, partsDemandCreatedOrNotRequired: true, partsAvailabilityConfirmed: true, resourcesProcedureNeedsConfirmed: true, subletVendorNeedResolved: true, readinessDecisionSubmitted: true },
    actions: [
      action("REVIEW_AUTHORIZED_PLAN", "Authorized repair plan reviewed", "Review the Stage 9 approved repair scope before reserving, ordering, or staging resources.", "Brock or Parts owner", "Authorized repair-plan review", ["authorizedRepairPlanReviewed"]),
      action("CREATE_PARTS_DEMAND", "Parts demand created or marked not required", "Create required parts, fluids, tires, and materials demand, or mark no parts required.", "Parts owner or Brock", "Parts demand / not-required decision", ["partsDemandCreatedOrNotRequired"]),
      action("CONFIRM_PARTS_STATUS", "Parts availability / order status confirmed", "Confirm parts are reserved, ordered, received, backordered, or intentionally held.", "Parts owner", "Parts status confirmation", ["partsAvailabilityConfirmed"]),
      action("CONFIRM_RESOURCES_PROCEDURES", "Resources and procedure needs confirmed", "Confirm special tools, bay needs, scan/calibration, service information, and procedure requirements.", "Brock or assigned technician", "Resource and procedure readiness", ["resourcesProcedureNeedsConfirmed"]),
      action("RESOLVE_SUBLET_VENDOR", "Sublet / vendor need resolved", "Mark vendor/sublet work not required, selected, scheduled, or blocking.", "Brock or Parts owner", "Sublet/vendor readiness", ["subletVendorNeedResolved"]),
      action("SUBMIT_READINESS_DECISION", "Readiness decision submitted", "Record ready for dispatch, waiting parts, waiting resource, waiting vendor, or manager review.", "Brock", "Parts/resource readiness decision", ["readinessDecisionSubmitted"]),
    ],
  },
  {
    stage: "DISPATCH_WORK_STAGING",
    workTitle: "Dispatch and stage the job",
    workInstruction: "Use Shop Dispatch as the control tower for technician, bay, time, WIP, keys, parts, and instructions before repair begins.",
    tools: [
      tool("SHOP_DISPATCH", "Shop Dispatch / Assignment", "/vehicles/shop-dispatch", "Open the dispatch workspace to assign technician, bay, schedule, queue position, and staging."),
      tool("REPAIR_WORKBENCH", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair workbench to review the authorized work packet and current instructions."),
    ],
    pilotValues: { authorizationReadinessGatesPassed: true, technicianEligibilityConfirmed: true, bayTimeSlotReserved: true, vehicleKeysPartsStaged: true, currentRepairInstructionsReviewed: true, wipQueuePositionConfirmed: true, dispatchPublished: true },
    actions: [
      action("CONFIRM_AUTHORIZATION_READINESS", "Authorization and readiness gates passed", "Confirm authorization, parts, resources, procedures, technician eligibility, and bay eligibility are clear before dispatch.", "Brock or Eli", "Authorization and readiness gate check", ["authorizationReadinessGatesPassed"]),
      action("CONFIRM_TECHNICIAN_ELIGIBILITY", "Technician eligibility confirmed", "Confirm Walter Hernandez or another qualified technician is appropriate for the job.", "Brock or Eli", "Technician eligibility confirmation", ["technicianEligibilityConfirmed"]),
      action("RESERVE_BAY_TIME", "Bay and time slot reserved", "Reserve one of the two shop bays and a staffed working time window.", "Brock or Eli", "Bay and time reservation", ["bayTimeSlotReserved"]),
      action("STAGE_VEHICLE_KEYS_PARTS", "Vehicle, keys, and parts staged", "Confirm vehicle location, keys, parts kit, materials, and any sublet items are staged.", "Brock or Eli", "Vehicle, keys, and parts staging", ["vehicleKeysPartsStaged"]),
      action("REVIEW_REPAIR_INSTRUCTIONS", "Current repair instructions reviewed", "Confirm the technician sees the latest authorized scope, stop rules, safety limits, and notes.", "Brock or assigned technician", "Current instruction review", ["currentRepairInstructionsReviewed"]),
      action("CONFIRM_WIP_QUEUE", "WIP limit / queue position confirmed", "Confirm the two-bay WIP limit and queue position are respected, or a General Manager exception exists.", "Brock; GM for exception", "WIP and queue confirmation", ["wipQueuePositionConfirmed"]),
      action("PUBLISH_DISPATCH", "Dispatch published", "Record who, where, when, and under what instructions the work is dispatched.", "Brock or Eli", "Attributable dispatch publication", ["dispatchPublished"]),
    ],
  },
  {
    stage: "REPAIR_EXECUTION",
    workTitle: "Perform the authorized repair",
    workInstruction: "Use Technician Workspace / My Work to start, pause, resume, finish, and evidence the assigned repair. Use Repair Workbench to review the current authorized instructions.",
    tools: [
      tool("TECHNICIAN_WORKSPACE", "Technician Workspace / My Work", "/my-tasks", "Open the technician's current assigned repair and labor controls."),
      tool("REPAIR_WORKBENCH_EXECUTION", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair order workbench to review the authorized work packet, estimate, jobs, and timeline."),
    ],
    pilotValues: { dispatchAcceptedWorkStarted: true, authorizedInstructionsReviewedForRepair: true, laborClockEventRecorded: true, authorizedRepairWorkPerformed: true, partsMaterialsConsumedRecorded: true, repairEvidenceMeasurementsAttached: true, changedScopeStoppedOrNoChangeConfirmed: true },
    actions: [
      action("ACCEPT_DISPATCH_START_WORK", "Dispatch accepted and work started", "Technician accepts the dispatched job and begins only the authorized work.", "Walter Hernandez or assigned technician", "Repair dispatch acceptance and start", ["dispatchAcceptedWorkStarted"]),
      action("REVIEW_CURRENT_INSTRUCTIONS", "Current authorized instructions reviewed", "Review the latest scope, stop rules, safety limits, parts status, and procedure notes before repair.", "Walter Hernandez or assigned technician", "Current instruction review", ["authorizedInstructionsReviewedForRepair"]),
      action("RECORD_LABOR_EVENT", "Labor clock / event recorded", "Record an attributable labor start, pause, resume, or finish event in the technician workspace.", "Walter Hernandez or assigned technician", "Labor clock / event", ["laborClockEventRecorded"]),
      action("PERFORM_AUTHORIZED_REPAIR", "Authorized repair work performed", "Perform only the authorized repair work using the current procedure and staged resources.", "Walter Hernandez or assigned technician", "Repair work record", ["authorizedRepairWorkPerformed"]),
      action("RECORD_PARTS_MATERIALS", "Parts/materials consumed recorded", "Record installed parts, fluids, materials, or no-consumption status against the repair.", "Walter Hernandez or assigned technician", "Parts/material consumption record", ["partsMaterialsConsumedRecorded"]),
      action("ATTACH_REPAIR_EVIDENCE", "Repair evidence / measurements attached", "Attach photos, measurements, scan results, readings, or repair proof required for QC.", "Walter Hernandez or assigned technician", "Repair execution evidence", ["repairEvidenceMeasurementsAttached"]),
      action("CONTROL_CHANGED_SCOPE", "Changed scope stopped or no-change confirmed", "If new findings exceed authorization, stop affected work and submit changed scope; otherwise confirm no scope change.", "Walter Hernandez or Brock", "Changed-scope control", ["changedScopeStoppedOrNoChangeConfirmed"]),
    ],
  },
  {
    stage: "TECHNICIAN_COMPLETION",
    workTitle: "Complete technician sign-off",
    workInstruction: "Use Technician Workspace / My Work to finish labor, document the correction, attach completion evidence, and submit the repair for independent QC.",
    tools: [
      tool("TECHNICIAN_WORKSPACE", "Technician Workspace / My Work", "/my-tasks", "Open the technician's assigned repair, finish labor, and submit completion evidence."),
      tool("REPAIR_WORKBENCH_EXECUTION", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair order workbench to review job status, execution evidence, and timeline."),
    ],
    pilotValues: { executionCompleteConfirmed: true, completionEvidenceAttached: true, laborClosedNoRunningClock: true, correctionMeasurementsDocumented: true, submittedForIndependentQc: true },
    actions: [
      action("CONFIRM_EXECUTION_COMPLETE", "Execution complete confirmed", "Confirm the authorized repair work is complete enough for QC.", "Walter Hernandez or assigned technician", "Execution completion confirmation", ["executionCompleteConfirmed"]),
      action("ATTACH_COMPLETION_EVIDENCE", "Completion evidence attached", "Confirm required photos, measurements, scans, readings, or proof are attached.", "Walter Hernandez or assigned technician", "Completion evidence", ["completionEvidenceAttached"]),
      action("CLOSE_LABOR", "Labor closed / no running clock", "Confirm labor is finished and no running clock remains for the repair.", "Walter Hernandez or assigned technician", "Closed labor record", ["laborClosedNoRunningClock"]),
      action("DOCUMENT_CORRECTION", "Correction and measurements documented", "Document the correction performed, final measurements, and technician notes.", "Walter Hernandez or assigned technician", "Technician correction statement", ["correctionMeasurementsDocumented"]),
      action("SUBMIT_FOR_QC", "Submitted for independent QC", "Submit the completed repair packet for independent QC and road-test decision.", "Walter Hernandez or assigned technician", "QC-ready submission", ["submittedForIndependentQc"]),
    ],
  },
  {
    stage: "QUALITY_CONTROL_ROAD_TEST",
    workTitle: "Perform QC and road-test decision",
    workInstruction: "Use Quality Control as the independent verification workspace. Failed QC or road test returns the vehicle to repair execution for rework.",
    tools: [
      tool("QUALITY_CONTROL", "Quality Control", "/vehicles/quality-control", "Open the QC workspace to inspect, road test, pass, hold, or send the repair back to rework."),
      tool("REPAIR_WORKBENCH_EXECUTION", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair order workbench to review technician completion evidence."),
    ],
    pilotValues: { repairEvidenceReviewedForQc: true, independentQcPerformed: true, roadTestCompletedOrNotRequired: true, qcDispositionPassed: true, reworkLoopControlledIfFailed: true },
    actions: [
      action("REVIEW_REPAIR_EVIDENCE", "Repair evidence reviewed", "Review technician completion evidence, measurements, notes, and repair history.", "Brock or QC authority", "Repair evidence review", ["repairEvidenceReviewedForQc"]),
      action("PERFORM_INDEPENDENT_QC", "Independent QC performed", "Perform QC independently from the repair technician whenever possible.", "Brock or QC authority", "Independent QC inspection", ["independentQcPerformed"]),
      action("COMPLETE_ROAD_TEST_DECISION", "Road test completed or marked not required", "Record road-test pass, fail, or not-required reason.", "Brock or eligible road-test staff", "Road-test result", ["roadTestCompletedOrNotRequired"]),
      action("PASS_QC_DISPOSITION", "QC disposition passed", "Record the QC pass decision that allows release readiness.", "Brock or QC authority", "QC pass disposition", ["qcDispositionPassed"]),
      action("CONTROL_REWORK_LOOP", "Rework loop controlled if failed", "If QC or road test fails, route back to Repair Execution; otherwise confirm no rework loop is open.", "Brock", "QC rework control", ["reworkLoopControlledIfFailed"]),
    ],
  },
  {
    stage: "RELEASE_HANDOVER_READINESS",
    workTitle: "Prepare release and handover",
    workInstruction: "Use the lane return tool to prepare the vehicle for release: Service Advisor for customer vehicles, Inventory Lifecycle for dealership units.",
    tools: [
      tool("SERVICE_ADVISOR", "Service Advisor / Customer Release", "/vehicles/advisor", "Open Service Advisor to prepare customer communication, payment, promise, and release readiness."),
      tool("INVENTORY_LIFECYCLE_RETURN", "Inventory Lifecycle Return", "/vehicles/inventory", "Open Inventory Lifecycle to prepare dealership-owned vehicle return."),
      tool("REPAIR_WORKBENCH_EXECUTION", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair order workbench to review final cost, QC, and release evidence."),
    ],
    pilotValues: { qcRoadTestPassConfirmed: true, finalScopeCostReconciled: true, keysDocumentsReconciled: true, destinationReceivingPartyConfirmed: true, releaseReadinessSubmitted: true },
    actions: [
      action("CONFIRM_QC_ROAD_TEST", "QC and road-test pass confirmed", "Confirm QC passed and road test passed or was not required.", "Brock", "QC and road-test confirmation", ["qcRoadTestPassConfirmed"]),
      action("RECONCILE_SCOPE_COST", "Final scope and cost reconciled", "Confirm final scope, cost, approved amount, declined work, and lane-specific charges are reconciled.", "Brock or Service Advisor", "Final scope/cost reconciliation", ["finalScopeCostReconciled"]),
      action("RECONCILE_KEYS_DOCUMENTS", "Keys and documents reconciled", "Confirm keys, documents, photos, final notes, and required release records are ready.", "Brock or Service Advisor", "Key/document reconciliation", ["keysDocumentsReconciled"]),
      action("CONFIRM_DESTINATION_RECEIVER", "Destination and receiving party confirmed", "Confirm the vehicle returns to Inventory Lifecycle or Service Advisor/customer handoff as appropriate.", "Brock or receiving owner", "Destination and receiving-party confirmation", ["destinationReceivingPartyConfirmed"]),
      action("SUBMIT_RELEASE_READINESS", "Release readiness submitted", "Submit release readiness so physical handoff can occur.", "Brock or Service Advisor", "Release-readiness submission", ["releaseReadinessSubmitted"]),
    ],
    laneVariants: {
      INVENTORY_RECON: {
        tools: [
          tool("INVENTORY_LIFECYCLE_RETURN", "Inventory Lifecycle Return", "/vehicles/inventory", "Open Inventory Lifecycle to prepare dealership-owned vehicle return."),
          tool("REPAIR_WORKBENCH_EXECUTION", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair order workbench to review final cost, QC, and release evidence."),
        ],
      },
      CUSTOMER_REPAIR: {
        tools: [
          tool("SERVICE_ADVISOR", "Service Advisor / Customer Release", "/vehicles/advisor", "Open Service Advisor to prepare customer communication, payment, promise, and release readiness."),
          tool("REPAIR_WORKBENCH_EXECUTION", "Repair Workbench", "/vehicles/repair-workbench", "Open the repair order workbench to review final cost, QC, and release evidence."),
        ],
      },
    },
  },
  {
    stage: "VEHICLE_HANDOVER_SHOP_EXIT",
    workTitle: "Record vehicle handover and Shop exit",
    workInstruction: "Use the lane return tool to record accepted custody transfer and the vehicle's physical exit from Shop control.",
    tools: [
      tool("SERVICE_ADVISOR", "Service Advisor / Customer Handoff", "/vehicles/advisor", "Open Service Advisor for customer handoff and delivery acceptance."),
      tool("INVENTORY_LIFECYCLE_RETURN", "Inventory Lifecycle Return", "/vehicles/inventory", "Open Inventory Lifecycle for dealership-owned vehicle return acceptance."),
      tool("VEHICLE_360", "Vehicle 360", "/vehicles/360", "Open the vehicle record to verify final location, custody, and evidence."),
    ],
    pilotValues: { releaseReadinessVerified: true, vehicleKeysTransferred: true, receivingPartyAcceptanceCaptured: true, finalLocationExitRecorded: true, returnPathSynced: true },
    actions: [
      action("VERIFY_RELEASE_READINESS", "Release readiness verified", "Confirm the release-readiness version is current before physical handoff.", "Brock or Eli", "Release-readiness verification", ["releaseReadinessVerified"]),
      action("TRANSFER_VEHICLE_KEYS", "Vehicle and keys transferred", "Confirm vehicle, keys, documents, and custody are transferred to the receiving party.", "Brock or Eli", "Vehicle/key transfer", ["vehicleKeysTransferred"]),
      action("CAPTURE_RECEIVER_ACCEPTANCE", "Receiving-party acceptance captured", "Record the receiving Inventory owner, Service Advisor, or customer acceptance.", "Brock or receiving owner", "Receiving-party acceptance", ["receivingPartyAcceptanceCaptured"]),
      action("RECORD_FINAL_EXIT", "Final location and exit recorded", "Record final location, exit time, and physical Shop exit.", "Brock or Eli", "Final location and exit record", ["finalLocationExitRecorded"]),
      action("SYNC_RETURN_PATH", "Return path synced", "Confirm the card returns to Inventory Lifecycle or Service Advisor/customer handoff.", "Brock or receiving owner", "Return-path sync", ["returnPathSynced"]),
    ],
    laneVariants: {
      INVENTORY_RECON: {
        tools: [
          tool("INVENTORY_LIFECYCLE_RETURN", "Inventory Lifecycle Return", "/vehicles/inventory", "Open Inventory Lifecycle for dealership-owned vehicle return acceptance."),
          tool("VEHICLE_360", "Vehicle 360", "/vehicles/360", "Open the vehicle record to verify final location, custody, and evidence."),
        ],
      },
      CUSTOMER_REPAIR: {
        tools: [
          tool("SERVICE_ADVISOR", "Service Advisor / Customer Handoff", "/vehicles/advisor", "Open Service Advisor for customer handoff and delivery acceptance."),
          tool("VEHICLE_360", "Vehicle 360", "/vehicles/360", "Open the vehicle record to verify final location, custody, and evidence."),
        ],
      },
    },
  },
] as const;

export function getShopReconOperationalWorkspace(stage: ShopReconStageCode, lane?: ShopReconWorkLane) {
  const workspace = SHOP_RECON_OPERATIONAL_WORKSPACES.find(workspace => workspace.stage === stage);
  const variant = lane ? workspace?.laneVariants?.[lane] : null;
  return workspace && variant ? { ...workspace, ...variant, laneVariants: workspace.laneVariants } : workspace ?? null;
}
