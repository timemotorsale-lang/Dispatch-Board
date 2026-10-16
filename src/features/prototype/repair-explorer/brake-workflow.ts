import { estimateTotals } from "./estimate";

export const WORKFLOW_STEPS = ["Inspection", "Estimate", "Approval", "Execution", "Verification", "Complete"] as const;
export type WorkflowStage = 0 | 1 | 2 | 3 | 4 | 5;
export type WorkflowAction = {
  type: "inspect" | "quote" | "approve" | "decline" | "start" | "pause" | "block" | "resume" | "finish" | "verify";
  actor: string;
  at: number;
  notes?: string;
  vehicle?: string;
  measurement?: string;
  hours?: number;
  parts?: number;
  rate?: number;
  technician?: string;
  partsReady?: boolean;
  checks?: boolean[];
};
export type BrakeWorkflow = {
  stage: WorkflowStage;
  vehicle: string;
  finding: string;
  measurement: string;
  hours: number;
  parts: number;
  rate: number;
  revision: number;
  technician: string;
  approval: { actor: string; at: number; revision: number; total: number } | null;
  runningSince: number | null;
  elapsedMs: number;
  blocked: string;
  events: WorkflowAction[];
};

export function newBrakeWorkflow(): BrakeWorkflow {
  return { stage: 0, vehicle: "", finding: "", measurement: "", hours: 2, parts: 220, rate: 150, revision: 0, technician: "", approval: null, runningSince: null, elapsedMs: 0, blocked: "", events: [] };
}

export function workflowTotal(state: BrakeWorkflow) {
  return estimateTotals([{ id: "front-pads-rotors", label: "Replace front brake pads and rotors", hours: state.hours, parts: state.parts }], state.rate).subtotal;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 1000) throw new Error(`${label} is required (up to 1,000 characters).`);
  return value.trim();
}

function amount(value: unknown, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum) throw new Error("Enter valid labor, rate and parts amounts.");
  return value;
}

export function applyWorkflowAction(state: BrakeWorkflow, input: WorkflowAction): BrakeWorkflow {
  const action = { ...input, actor: text(input.actor, "Staff name") };
  const previous = state.events.at(-1);
  if (!Number.isSafeInteger(action.at) || action.at < 0 || (previous && action.at < previous.at)) throw new Error("The event time is invalid. Check the device clock.");
  if (state.events.length >= 500) throw new Error("This preview has reached its event limit. Export your review record.");
  const next = { ...state, events: [...state.events, action] };
  const requireStage = (stage: WorkflowStage) => { if (state.stage !== stage) throw new Error("Complete the current step before taking this action."); };
  const stopClock = () => {
    next.elapsedMs += state.runningSince === null ? 0 : action.at - state.runningSince;
    next.runningSince = null;
  };
  switch (action.type) {
    case "inspect":
      requireStage(0);
      next.vehicle = text(action.vehicle, "Vehicle configuration or reference");
      next.finding = text(action.notes, "Inspection finding");
      next.measurement = text(action.measurement, "Measurements and specification reference");
      next.stage = 1;
      break;
    case "quote":
      requireStage(1);
      next.hours = amount(action.hours, 100);
      next.parts = amount(action.parts, 100000);
      next.rate = amount(action.rate, 1000);
      next.technician = text(action.technician, "Assigned technician");
      next.revision += 1;
      next.approval = null;
      next.stage = 2;
      break;
    case "approve":
      requireStage(2);
      next.approval = { actor: text(action.notes, "Reviewer acting as customer"), at: action.at, revision: state.revision, total: workflowTotal(state) };
      next.stage = 3;
      break;
    case "decline":
      requireStage(2);
      text(action.notes, "Revision reason");
      next.stage = 1;
      break;
    case "start":
    case "resume":
      requireStage(3);
      if (!state.approval || state.approval.revision !== state.revision || state.runningSince !== null) throw new Error("A current approval and stopped clock are required.");
      if (action.partsReady !== true) throw new Error("Confirm parts and required instructions are ready.");
      next.blocked = "";
      next.runningSince = action.at;
      break;
    case "pause":
      requireStage(3);
      if (state.runningSince === null) throw new Error("Start the job before pausing.");
      stopClock();
      break;
    case "block":
      requireStage(3);
      next.blocked = text(action.notes, "Blocker");
      stopClock();
      break;
    case "finish":
      requireStage(3);
      if (state.blocked || !state.events.some((event) => event.type === "start" || event.type === "resume")) throw new Error("Start the work and resolve blockers before completion.");
      text(action.notes, "Work completion notes");
      stopClock();
      next.stage = 4;
      break;
    case "verify":
      requireStage(4);
      if (!Array.isArray(action.checks) || action.checks.length !== 4 || action.checks.some((check) => check !== true)) throw new Error("Complete every verification check before release.");
      text(action.notes, "Verification results");
      next.stage = 5;
      break;
    default:
      throw new Error("Unsupported workflow action.");
  }
  return next;
}

export function parseBrakeWorkflow(raw: string): BrakeWorkflow | null {
  try {
    if (raw.length > 1000000) return null;
    const saved = JSON.parse(raw) as { version: number; events: WorkflowAction[] };
    if (!saved || saved.version !== 1 || !Array.isArray(saved.events) || saved.events.length > 500) return null;
    return saved.events.reduce(applyWorkflowAction, newBrakeWorkflow());
  } catch {
    return null;
  }
}
