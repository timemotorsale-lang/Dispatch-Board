import { WorkflowArea } from "@prisma/client";

export type TaskConversionContext = {
  category?: string;
  company?: string;
  originText?: string;
  person?: string;
  sourceId?: string;
  sourceKind?: string;
};

export type TaskExecutionIntent =
  | "ADMIN_DOCUMENTATION"
  | "CUSTOMER_ADVISOR_FOLLOW_UP"
  | "INVENTORY_MOVEMENT"
  | "MANAGEMENT_COORDINATION"
  | "REPAIR_EXECUTION"
  | "SALES_FOLLOW_UP";

export type TaskConversionContract = {
  classificationReason: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  executionIntent: TaskExecutionIntent;
  linkedWorkflowAreas: WorkflowArea[];
  origin: {
    channel: string;
    sourceId?: string;
    sourceKind: string;
    text: string;
  };
  selectedWorkflowArea: WorkflowArea;
  suggestedWorkflowArea: WorkflowArea;
  version: 1;
};

type ConversionClassificationInput = {
  channel?: string;
  description: string;
  expectedOutcome?: string;
  intakeType?: string;
  requestedWorkflowArea: WorkflowArea;
  title: string;
  conversionContext?: TaskConversionContext;
};

const shopTerms = [
  "bodywork",
  "brake",
  "diagnos",
  "estimate",
  "final qc",
  "inspection",
  "mechanic",
  "oil",
  "parts",
  "repair",
  "recon",
  "reset",
  "service",
  "shop",
  "technician",
  "tire",
  "transmission",
  "vehicle condition"
];

const advisorTerms = [
  "advise",
  "advisor",
  "approval",
  "authorization",
  "authorize",
  "call",
  "called",
  "complain",
  "customer",
  "decision",
  "follow up",
  "handoff",
  "message",
  "promise",
  "requested update",
  "tell",
  "update"
];

const inventoryTerms = ["inventory", "keys", "lot", "photos", "stock", "title", "vin"];
const salesTerms = ["buyer", "deal", "delivery", "finance", "lead", "sale", "sales", "test drive"];
const adminTerms = ["document", "dmv", "paperwork", "registration", "signature"];

function scoreTerms(text: string, terms: string[]) {
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function isWorkbookConversion(input: ConversionClassificationInput) {
  const sourceKind = input.conversionContext?.sourceKind?.toLowerCase() ?? "";
  const channel = input.channel?.toLowerCase() ?? "";
  const intakeType = input.intakeType?.toLowerCase() ?? "";

  return sourceKind.includes("workbook") ||
    channel.includes("workbook") ||
    intakeType.includes("quick task") ||
    intakeType.includes("resume workbook") ||
    intakeType.includes("carryover");
}

function compactReason(parts: string[]) {
  return parts.filter(Boolean).join(" ");
}

export function classifyConvertedTask(input: ConversionClassificationInput): TaskConversionContract | null {
  if (!isWorkbookConversion(input)) return null;

  const originText = input.conversionContext?.originText || input.description || input.title;
  const searchable = [
    input.title,
    input.description,
    input.expectedOutcome,
    input.conversionContext?.category,
    input.conversionContext?.company,
    input.conversionContext?.person,
    originText
  ].filter(Boolean).join(" ").toLowerCase();

  const advisorScore = scoreTerms(searchable, advisorTerms);
  const shopScore = scoreTerms(searchable, shopTerms);
  const inventoryScore = scoreTerms(searchable, inventoryTerms);
  const salesScore = scoreTerms(searchable, salesTerms);
  const adminScore = scoreTerms(searchable, adminTerms);
  const linkedWorkflowAreas = new Set<WorkflowArea>();
  let suggestedWorkflowArea: WorkflowArea = WorkflowArea.GENERAL_MANAGER;
  let executionIntent: TaskExecutionIntent = "MANAGEMENT_COORDINATION";
  let classificationReason = "Converted workbook item needs management coordination until the execution path is clarified.";

  if (advisorScore > 0 && shopScore > 0) {
    suggestedWorkflowArea = WorkflowArea.SERVICE_ADVISOR;
    executionIntent = "CUSTOMER_ADVISOR_FOLLOW_UP";
    linkedWorkflowAreas.add(WorkflowArea.SHOP);
    classificationReason = "Customer-facing repair work should start with Service Advisor ownership, with Shop & Recon linked for inspection, diagnosis, parts, repair, or QC.";
  } else if (shopScore > 0) {
    suggestedWorkflowArea = WorkflowArea.SHOP;
    executionIntent = "REPAIR_EXECUTION";
    classificationReason = "The update describes repair, diagnosis, inspection, parts, or QC work.";
  } else if (advisorScore > 0) {
    suggestedWorkflowArea = WorkflowArea.SERVICE_ADVISOR;
    executionIntent = "CUSTOMER_ADVISOR_FOLLOW_UP";
    classificationReason = "The update describes customer communication, authorization, promise, or advisor handoff work.";
  } else if (inventoryScore > 0) {
    suggestedWorkflowArea = WorkflowArea.INVENTORY;
    executionIntent = "INVENTORY_MOVEMENT";
    classificationReason = "The update describes vehicle inventory, stock, title, keys, location, or merchandising work.";
  } else if (salesScore > 0) {
    suggestedWorkflowArea = WorkflowArea.SALES;
    executionIntent = "SALES_FOLLOW_UP";
    classificationReason = "The update describes sales, lead, deal, finance, or delivery follow-up.";
  } else if (adminScore > 0) {
    suggestedWorkflowArea = WorkflowArea.ADMIN;
    executionIntent = "ADMIN_DOCUMENTATION";
    classificationReason = "The update describes documentation, paperwork, registration, or signature work.";
  }

  const selectedWorkflowArea = input.requestedWorkflowArea === WorkflowArea.GENERAL_MANAGER
    ? suggestedWorkflowArea
    : input.requestedWorkflowArea;
  const confidence = suggestedWorkflowArea === WorkflowArea.GENERAL_MANAGER
    ? "LOW"
    : advisorScore > 0 && shopScore > 0
      ? "HIGH"
      : "MEDIUM";

  linkedWorkflowAreas.delete(selectedWorkflowArea);

  return {
    classificationReason: compactReason([
      classificationReason,
      selectedWorkflowArea !== suggestedWorkflowArea ? "A user-selected workflow override was preserved." : ""
    ]),
    confidence,
    executionIntent,
    linkedWorkflowAreas: [...linkedWorkflowAreas],
    origin: {
      channel: input.channel || "Workbook",
      ...(input.conversionContext?.sourceId ? { sourceId: input.conversionContext.sourceId } : {}),
      sourceKind: input.conversionContext?.sourceKind || input.intakeType || "Workbook item",
      text: originText
    },
    selectedWorkflowArea,
    suggestedWorkflowArea,
    version: 1
  };
}
