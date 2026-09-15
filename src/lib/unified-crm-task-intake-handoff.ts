const TASK_INTAKE_TYPES = [
  "Quick Task",
  "Manager Decision",
  "Sales Lead / Appointment",
  "Sales Deal / Delivery",
  "Finance / Funding",
  "Customer Issue",
  "Service Advisor",
  "Repair Order / Authorization",
  "Diagnostics / Estimate",
  "Shop Dispatch / Technician",
  "Parts Request / Backorder",
  "Sublet / Vendor",
  "Quality Control / Comeback",
  "Inventory Acquisition",
  "Inventory Movement",
  "Recon / Detail",
  "Photos / Merchandising",
  "Marketing / Listing",
  "Title / Registration",
  "Admin / Documentation",
  "Accounting / Payables",
  "Collections",
  "Compliance / Risk",
  "Facilities / Supplies"
] as const;

const TASK_WORKFLOW_AREAS = [
  "INVENTORY",
  "SERVICE_ADVISOR",
  "SHOP",
  "SALES",
  "MARKETING",
  "ADVERTISING",
  "ADMIN",
  "COLLECTIONS",
  "GENERAL_MANAGER"
] as const;

const TASK_INTAKE_TYPE_SET = new Set<string>(TASK_INTAKE_TYPES);
const TASK_WORKFLOW_AREA_SET = new Set<string>(TASK_WORKFLOW_AREAS);

type UnifiedCrmTaskIntakeType = typeof TASK_INTAKE_TYPES[number];
type UnifiedCrmTaskWorkflowArea = typeof TASK_WORKFLOW_AREAS[number];

const LEGACY_TASK_INTAKE_TYPE_ALIASES: Record<string, UnifiedCrmTaskIntakeType> = {
  "Vehicle / Service": "Repair Order / Authorization"
};

export type UnifiedCrmTaskIntakeDefaults = {
  brief?: string;
  customerReference?: string;
  dueDate?: string;
  dueTime?: string;
  expectedOutcome?: string;
  intakeType?: UnifiedCrmTaskIntakeType;
  sourceDetail?: string;
  sourceTitle?: string;
  title?: string;
  vehicleReference?: string;
  workflowArea?: UnifiedCrmTaskWorkflowArea;
};

function text(value: string | null | undefined, max: number) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, max);
}

function dateValue(value: string | null | undefined) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

function timeValue(value: string | null | undefined) {
  if (!value) return undefined;
  if (!/^\d{2}:\d{2}$/.test(value)) return undefined;
  return value;
}

function isGenericStarterTaskDetail(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  return normalized.startsWith("review this daily focus item and record whether")
    || normalized.startsWith("converted from a manually added")
    || normalized === "document the action, evidence, and next step expected from the owner.";
}

export function buildUnifiedCrmTaskIntakeHref(input: {
  customerDisplayName: string;
  customerId: string;
  customerNumber: string;
  customerContextReturn?: string;
  dueAt?: string | null;
}) {
  const returnTo = buildUnifiedCrmCustomerReturn(
    input.customerId,
    safeUnifiedCrmCustomerContextReturn(input.customerContextReturn)
  );
  const params = new URLSearchParams({
    brief: "Document the customer follow-up, outcome, and next operational step.",
    customerReference: `${input.customerDisplayName} · ${input.customerNumber}`,
    expectedOutcome: "The customer follow-up is completed and the resulting next step is recorded in the Dispatch Board.",
    intakeType: "Customer Issue",
    returnTo,
    title: `Follow up with ${input.customerDisplayName}`,
    workflowArea: "SALES"
  });

  if (input.dueAt) {
    const due = new Date(input.dueAt);
    if (!Number.isNaN(due.getTime())) {
      params.set("dueDate", due.toISOString().slice(0, 10));
      params.set("dueTime", due.toISOString().slice(11, 16));
    }
  }

  return `/tasks/intake?${params.toString()}`;
}

export function normalizeUnifiedCrmTaskIntakeDefaults(input: Record<string, string | undefined>): UnifiedCrmTaskIntakeDefaults {
  const intakeType = text(input.intakeType, 80);
  const normalizedIntakeType = intakeType ? (LEGACY_TASK_INTAKE_TYPE_ALIASES[intakeType] ?? intakeType) : undefined;
  const workflowArea = text(input.workflowArea, 40)?.toUpperCase();
  const sourceTitle = text(input.sourceTitle, 240);
  const sourceDetail = text(input.sourceDetail, 1200);
  const briefCandidate = text(input.brief, 1200);
  const brief = briefCandidate && !isGenericStarterTaskDetail(briefCandidate) ? briefCandidate : undefined;

  return {
    brief,
    customerReference: text(input.customerReference, 240),
    dueDate: dateValue(input.dueDate),
    dueTime: timeValue(input.dueTime),
    expectedOutcome: text(input.expectedOutcome, 500),
    intakeType: normalizedIntakeType && TASK_INTAKE_TYPE_SET.has(normalizedIntakeType) ? normalizedIntakeType as UnifiedCrmTaskIntakeType : undefined,
    sourceDetail,
    sourceTitle,
    title: text(input.title, 240) ?? sourceTitle,
    vehicleReference: text(input.vehicleReference, 240),
    workflowArea: workflowArea && TASK_WORKFLOW_AREA_SET.has(workflowArea) ? workflowArea as UnifiedCrmTaskWorkflowArea : undefined
  };
}
import { buildUnifiedCrmCustomerReturn, safeUnifiedCrmCustomerContextReturn } from "@/server/unified-crm/opportunity-review-return";
