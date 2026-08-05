import type { ShopReconStageCode } from "./foundation";

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

export type ShopReconOperationalWorkspace = {
  stage: ShopReconStageCode;
  workTitle: string;
  workInstruction: string;
  tools?: readonly ShopReconOperationalTool[];
  pilotValues: Readonly<Record<string, unknown>>;
  actions: readonly ShopReconOperationalAction[];
};

const action = (key: string, title: string, instruction: string, owner: string, evidence: string, requiredFields: readonly string[]): ShopReconOperationalAction => ({ key, title, instruction, owner, evidence, requiredFields });
const tool = (key: string, label: string, href: string, description: string): ShopReconOperationalTool => ({ key, label, href, description });

export const SHOP_RECON_OPERATIONAL_WORKSPACES: readonly ShopReconOperationalWorkspace[] = [
  {
    stage: "SERVICE_RECON_JOB_INTAKE",
    workTitle: "Create the controlled Shop request",
    workInstruction: "Capture who is requesting work, which vehicle is involved, the intended outcome, timing, and accountable intake owner before scope is defined.",
    tools: [
      tool("INTAKE_FORM", "Open Intake Form", "/vehicles/repair-orders?intakeSource=WALK_IN", "Create or continue the customer vehicle intake record."),
      tool("SERVICE_ADVISOR", "Open Service Advisor", "/vehicles/advisor", "Review advisor queue, customer concern, appointment context, and handoff state."),
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
  },
  {
    stage: "JOB_SCOPE_DEFINITION",
    workTitle: "Define the exact requested Shop outcome",
    workInstruction: "Translate the intake concern into controlled inclusions, exclusions, work intent, and authority without silently expanding scope.",
    pilotValues: { requestedOutcome: "Inspect and correct approved mechanical items required for frontline readiness.", scopeType: "Recon package", scopeInclusions: "Safety inspection and approved mechanical recon.", scopeExclusions: "Cosmetic and merchandising work.", scopeOwner: "Brock" },
    actions: [
      action("DEFINE_OUTCOME", "Define the requested outcome", "State what successful completion means for this job.", "Lane owner", "Requested-outcome statement", ["requestedOutcome"]),
      action("CLASSIFY_SCOPE", "Classify the work intent", "Identify whether the request is inspection, diagnosis, repair, or an Inventory recon package.", "Lane owner", "Scope classification", ["scopeType"]),
      action("SET_INCLUSIONS", "Record included work", "List what the Shop is authorized to inspect or plan at this stage.", "Lane owner", "Scope inclusions", ["scopeInclusions"]),
      action("SET_EXCLUSIONS", "Record exclusions and boundaries", "Make non-authorized or deferred work explicit.", "Lane owner", "Scope exclusions", ["scopeExclusions"]),
      action("FREEZE_SCOPE", "Name authority and freeze scope", "Identify who controls future scope changes and create the initial version.", "Service Advisor or Brock", "Versioned job scope", ["scopeOwner"]),
    ],
  },
  {
    stage: "WORK_ORDER_CREATION",
    workTitle: "Create the controlled work order",
    workInstruction: "Convert the approved intake and scope into one attributable repair order with linked operations and financial status.",
    pilotValues: { repairOrderReference: "PILOT-INV-001", scopeVersion: 1, requestedOperations: "Initial inspection and concern verification.", authorizationStatus: "Not yet required", workOrderNotes: "Inventory recon work order created from approved scope." },
    actions: [
      action("CONFIRM_RO", "Create or confirm the repair order", "Establish the authoritative work-order reference used throughout the Shop lifecycle.", "Service Advisor or Brock", "Repair-order reference", ["repairOrderReference"]),
      action("LINK_SCOPE", "Link the scope version", "Bind the work order to the exact approved job-scope version.", "Intake owner", "Scope-version link", ["scopeVersion"]),
      action("CREATE_OPERATIONS", "Create requested operations", "Translate the scope into identifiable work-order operations without adding unauthorized work.", "Intake owner", "Requested operations", ["requestedOperations"]),
      action("SET_AUTH_STATUS", "Set preliminary authorization status", "Record whether the current request is pre-authorized, pending, or does not yet require spending approval.", "Lane authority", "Authorization status", ["authorizationStatus"]),
      action("VERIFY_WORK_ORDER", "Verify work-order completeness", "Confirm the work order is ready to receive the physical vehicle.", "Service Advisor or Brock", "Work-order completeness", ["workOrderNotes"]),
    ],
  },
  {
    stage: "VEHICLE_INTAKE_CUSTODY",
    workTitle: "Receive the physical vehicle and accept custody",
    workInstruction: "Match the arriving vehicle to its work order, preserve entry condition, control keys, and establish accountable Shop custody.",
    pilotValues: { observedIdentifier: "PILOT-INV-001", arrivalCondition: "Normal", keyCount: 2, keyTag: "PILOT-KEY-001", custodyLocation: "Inbound lot", intakeNotes: "Vehicle arrived under its own power with no visible damage." },
    actions: [
      action("MATCH_PHYSICAL_VEHICLE", "Match vehicle to work order", "Scan or enter the observed identifier and compare it to the controlled work order.", "Receiving staff", "Vehicle identity match", ["observedIdentifier"]),
      action("RECORD_ARRIVAL", "Record arrival condition", "Preserve visible condition before the vehicle moves deeper into Shop control.", "Receiving staff", "Arrival-condition record", ["arrivalCondition"]),
      action("COUNT_KEYS", "Count and tag every key", "Record the exact number of keys and the controlled tag or locker reference.", "Receiving staff", "Key-control record", ["keyCount", "keyTag"]),
      action("CAPTURE_CONDITION", "Capture intake condition", "Document visible damage, condition conflicts, or a clear arrival observation.", "Receiving staff", "Intake condition evidence", ["intakeNotes"]),
      action("ACCEPT_CUSTODY", "Accept custody and location", "Record who controls the vehicle and where it is physically placed.", "Brock or Eli", "Custody acceptance", ["custodyLocation"]),
      action("CONTROL_RESTRICTIONS", "Record movement restrictions", "Identify any immediate restriction that must be honored until Safety & Mobility Triage.", "Brock or Eli", "Movement restriction note", ["intakeNotes"]),
    ],
  },
] as const;

export function getShopReconOperationalWorkspace(stage: ShopReconStageCode) {
  return SHOP_RECON_OPERATIONAL_WORKSPACES.find(workspace => workspace.stage === stage) ?? null;
}
