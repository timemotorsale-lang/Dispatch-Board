"use client";
import { repairReviewHref } from "@/lib/repair-workflow-review";

import { BookOpen, Brain, Check, ChevronLeft, ClipboardCheck, Edit3, Package, Plus, ScanBarcode, Search, ShoppingCart, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { evaluateEstimatePartsTaxPolicy, type EstimateRequiredPart } from "@/server/diagnostics/estimate-parts-tax-policy";
import { analyzeLaborLanguage } from "@/server/diagnostics/labor-language-intelligence";
import type { LaborOperationSystem, LaborRepairOperation } from "@/server/diagnostics/labor-operation-taxonomy";
import { evaluateRepairAreaIntelligence, type RepairAreaPartRule } from "@/server/diagnostics/repair-area-intelligence";

import styles from "./enterprise-labor-guide-console.module.css";
import { ServiceChargesEditor } from "@/features/inventory/service-charges-editor";
import { SERVICE_CHARGES_POLICY, normalizeServiceCharges, serviceChargeLines, serviceQuoteTax, type ServiceCharge } from "@/lib/service-charges";
import { LaborGuideDetailsForm, emptyLaborGuideDetails, type LaborGuideDetails } from "./labor-guide-details";
import { useWorkspaceDraft } from "./use-workspace-draft";
import { DiagnosticWorkspace } from "./diagnostic-workspace";
import type { ClinicalDrafts } from "@/lib/diagnostic-clinical-draft";
import { emptyManualLaborReview, estimateReviewScope, manualReviewComplete, type ManualLaborReview } from "@/lib/estimate-review";
import { GuidedEstimate } from "./guided-estimate";
import { laborGuideHref, type LaborGuideView } from "./labor-guide-view-switch";
import { LaborGuideVehicleEntry } from "./labor-guide-vehicle-entry";
import { EstimateControlsPanel } from "./estimate-controls-panel";
import { BrakeOperationScope } from "./brake-operation-scope";
import { SteeringOperationScope } from "./steering-operation-scope";
import { LightDutyOperationScope } from "./light-duty-operation-scope";
import { ConnectedRepairCatalog } from "./connected-repair-catalog";
import { connectedLaborSelection, LABOR_PILOT_SYSTEMS } from "@/lib/labor-catalog-selection";
import type { RepairOperation } from "@/features/prototype/repair-explorer/catalog";
import { repairBaselineForId, repairScopeConflict } from "@/lib/repair-catalog-baselines";
import { isExplorerPartsAllowance, replaceExplorerPartsAllowance, unresolvedExplorerAllowance, type ExplorerEstimateSeed } from "@/lib/explorer-estimate-handoff";
import { checkEstimateControls, checkStaffQuotePricing, estimateControlsScope, initialEstimatePricing, type EstimateControls, type EstimatePricing } from "@/lib/labor-guide-controls";

type ActiveRepairOrder = {
  concern: string;
  customer: string;
  id: string;
  openedAt: string;
  repairOrderNumber: string;
  vehicle: { id?: string; label: string; vin: string };
};

type SelectedLabor = LaborRepairOperation & { rowId: string; source?: "SELECTED" | "POLICY_REQUIRED" };
type LaborDraft = { hours: string; included: string; title: string };

type SelectedPart = {
  catalogPartId?: string;
  id: string;
  laborRowId: string;
  name: string;
  number: string;
  policyRequirementKey?: string;
  pricingStatus?: "ESTIMATED" | "PRICE_PENDING";
  quantity: number;
  source?: "AUTO_CATALOG" | "MANUAL" | "POLICY_REQUIRED";
  taxable?: boolean;
  unitPrice: number;
};
type PartDraft = { name: string; number: string; quantity: string; unitPrice: string };

type WorkTab = "selected" | "labor" | "parts" | "evidence" | "customer" | "notes" | "history";
type EvidenceDraft = {
  accessLevel: "CUSTOMER_VISIBLE" | "INTERNAL";
  attachedTo: string;
  category: "DIAGNOSTIC_PHOTO" | "DOCUMENT" | "MEASUREMENT" | "REPAIR_PHOTO" | "SCAN_REPORT";
  fileName: string;
  note: string;
  status: "Staged" | "Uploaded";
};
type RepairOrderLookup = {
  id: string;
  repairOrderNumber: string;
  stage: string;
  version: number;
  vehicle: { id?: string; make: string | null; model: string | null; vehicleNumber: string; vin: string | null; year: number | null };
  customer: { displayName: string } | null;
  ownerUser?: { id: string; name: string };
  serviceVisit: { concernSummary: string };
};
type PartsWorkspacePart = { description: string; id: string; partNumber: string; standardCostCents?: number };

const commonSuggestedAddOns = [
  { id: "road-test", label: "Road test and repair verification", hours: 0.3 },
  { id: "torque-verification", label: "Torque verification", hours: 0.2 },
  { id: "brake-fluid-service", label: "Full brake fluid exchange (not an included circuit bleed)", hours: 1 },
];

const defaultParts: SelectedPart[] = [
  { id: "front-pad-set", laborRowId: "front-brake-pads-rotors", name: "Front brake pad set", number: "B4SA-33-28Z", quantity: 1, source: "AUTO_CATALOG", unitPrice: 128.99 },
  { id: "front-rotor", laborRowId: "front-brake-pads-rotors", name: "Front brake rotor", number: "B45A-33-25XC", quantity: 2, source: "AUTO_CATALOG", unitPrice: 119.95 },
  { id: "caliper-hardware", laborRowId: "brake-caliper-front", name: "Caliper hardware kit", number: "HW13714", quantity: 1, source: "AUTO_CATALOG", unitPrice: 43.46 },
];

const money = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
const displayLabel = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toLocaleUpperCase());

function normalizePartsSyncMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to sync parts demand.";
  if (/Parts Operations mutations are not enabled/i.test(message)) {
    return "Live parts-demand sync is still held in rollout. Your labor lines and parts plan remain available here; use the Parts Ordering Workspace to continue the governed workflow.";
  }
  return message;
}

function partSourceLabel(part: SelectedPart) {
  if (part.source === "POLICY_REQUIRED") return part.pricingStatus === "PRICE_PENDING" ? "Required - price pending" : "Required by repair policy";
  if (part.source === "AUTO_CATALOG") return part.pricingStatus === "PRICE_PENDING" ? "Suggested catalog match - price pending; fitment unconfirmed" : "Suggested catalog match - fitment and price need review";
  return "Manual";
}

function encodePartsOrderingPayload(parts: SelectedPart[]) {
  return JSON.stringify(parts.map((part) => ({
    id: part.id,
    name: part.name,
    number: part.number,
    quantity: part.quantity,
    sourceLabel: partSourceLabel(part),
    totalLabel: part.pricingStatus === "PRICE_PENDING" ? "Quote needed" : money(part.quantity * part.unitPrice),
  })));
}

function encodeOfficialEstimateLines(labor: SelectedLabor[], parts: SelectedPart[], laborRate: number) {
  return JSON.stringify([
    ...labor.map((item) => ({
      amountLabel: money(item.hours * laborRate),
      detail: `${item.included.slice(0, 3).join(" · ")}${item.source === "POLICY_REQUIRED" ? " · Required by repair policy" : ""}`,
      kind: "Labor" as const,
      quantityLabel: `${item.hours.toFixed(1)} hrs`,
      title: item.title,
    })),
    ...parts.map((part) => ({
      amountLabel: part.pricingStatus === "PRICE_PENDING" ? "Quote needed" : money(part.quantity * part.unitPrice),
      detail: `${part.number} · ${partSourceLabel(part)}`,
      kind: "Part" as const,
      quantityLabel: `Qty ${part.quantity}`,
      title: part.name,
    })),
  ]);
}

function encodeOfficialEstimateSummary(summary: Array<{ label: string; value: string }>) {
  return JSON.stringify(summary);
}

function requiredPartToSelectedPart(part: EstimateRequiredPart): SelectedPart {
  return {
    id: `${part.laborOperationId}-${part.key}`,
    laborRowId: part.laborOperationId,
    name: part.description,
    number: part.partNumber,
    policyRequirementKey: part.key,
    pricingStatus: part.pricingStatus,
    quantity: part.quantity,
    source: "POLICY_REQUIRED",
    taxable: part.taxable,
    unitPrice: part.unitPriceCents / 100
  };
}

function partSearchTerms(operation: LaborRepairOperation) {
  const title = operation.title.toLocaleLowerCase();
  const terms = new Set<string>([operation.component, operation.subsystem, operation.system]);
  if (title.includes("pads") || title.includes("brake")) terms.add("brake pad");
  if (title.includes("rotor")) terms.add("brake rotor");
  if (title.includes("caliper")) terms.add("caliper hardware");
  if (title.includes("control arm")) terms.add("control arm");
  if (title.includes("shock")) terms.add("shock absorber");
  if (title.includes("strut")) terms.add("strut assembly");
  if (title.includes("filter")) terms.add("filter");
  if (title.includes("sensor")) terms.add("sensor");
  return Array.from(terms).map((term) => term.trim()).filter((term) => term.length > 2).slice(0, 4);
}

function quantityForPart(operation: LaborRepairOperation, part: PartsWorkspacePart) {
  const haystack = `${operation.title} ${operation.position} ${part.description} ${part.partNumber}`.toLocaleLowerCase();
  if (haystack.includes("rotor") && (haystack.includes("both") || haystack.includes("front") || haystack.includes("rear"))) return 2;
  if (haystack.includes("shock") && haystack.includes("both")) return 2;
  if (haystack.includes("strut") && haystack.includes("both")) return 2;
  return 1;
}

const ignoredSearchWords = new Set(["and", "are", "can", "customer", "from", "has", "need", "needs", "noise", "of", "or", "repair", "states", "the", "to", "with"]);

function matchesRepairText(operation: LaborRepairOperation, searchText: string) {
  const haystack = [operation.title, operation.system, operation.subsystem, operation.component, operation.position, ...operation.aliases, ...operation.concernExamples, ...operation.included, ...partSearchTerms(operation)].join(" ").toLocaleLowerCase();
  if (!searchText) return true;
  if (haystack.includes(searchText)) return true;
  const words = searchText.split(/[^a-z0-9]+/).map((word) => word.trim()).filter((word) => word.length > 2 && !ignoredSearchWords.has(word));
  if (!words.length) return true;
  const matchedWords = words.filter((word) => haystack.includes(word));
  return matchedWords.length >= Math.min(2, words.length);
}

function initialRepairSystemId(repairTaxonomy: LaborOperationSystem[], initialQuery: string) {
  const fallback = repairTaxonomy.find((system) => system.id === "brakes")?.id ?? repairTaxonomy[0]?.id ?? "";
  const searchText = initialQuery.trim().toLocaleLowerCase();
  if (!searchText) return fallback;
  if (["body", "collision", "door", "glass", "bumper", "fender", "paint", "refinish"].some((word) => searchText.includes(word))) {
    return repairTaxonomy.find((system) => system.id === "body-collision")?.id ?? fallback;
  }
  const directSystem = repairTaxonomy.find((system) => `${system.title} ${system.description}`.toLocaleLowerCase().includes(searchText));
  if (directSystem) return directSystem.id;
  const exactOperationSystem = repairTaxonomy.find(system => system.groups.some(group => group.operations.some(operation => operation.title.toLocaleLowerCase().includes(searchText))));
  if (exactOperationSystem) return exactOperationSystem.id;
  const matchingSystem = repairTaxonomy.find((system) => system.groups.some((group) => group.operations.some((operation) => matchesRepairText(operation, searchText))));
  return matchingSystem?.id ?? fallback;
}

export function EnterpriseLaborGuideConsole({ reviewWorkflow = false, initialExplorerSeed, activeRepairOrder, initialMode = "manual", initialQuery = "", initialSelectedWork = "empty", initialWorkTab = "selected", repairTaxonomy, returnLabel, returnTo, initialNotice = "", initialPricing = initialEstimatePricing, pricingAvailable = true, canOverrideLaborRate = false, connectedSystemIds = LABOR_PILOT_SYSTEMS }: { reviewWorkflow?: boolean; initialGuideView?: LaborGuideView; initialExplorerSeed?: ExplorerEstimateSeed; activeRepairOrder: ActiveRepairOrder | null; catalog: unknown[]; initialMode?: "manual" | "engine"; initialQuery?: string; initialSelectedWork?: "empty" | "starter" | "transmission"; initialWorkTab?: WorkTab; laborAddOns: unknown[]; repairOrders?: { id: string; label: string }[]; repairTaxonomy: LaborOperationSystem[]; returnLabel?: string; returnTo?: string; initialNotice?: string; initialPricing?: EstimatePricing; pricingAvailable?: boolean; canOverrideLaborRate?: boolean; connectedExplorer?: boolean; connectedSystemIds?: readonly string[] }) {
  const router = useRouter();
  const guideView: LaborGuideView = "new";
  const connectedExplorer = guideView === "new";
  const EstimateWorksheet = GuidedEstimate;
  const allOperations = useMemo(() => repairTaxonomy.flatMap((system) => system.groups.flatMap((group) => group.operations)), [repairTaxonomy]);
  const brakeStarter = allOperations.filter((operation) => ["front-brake-pads-rotors", "brake-caliper-front"].includes(operation.id));
  const transmissionStarter = allOperations.filter((operation) => operation.id === "transmission-remove-install");
  const [mode, setMode] = useState<"manual" | "engine">(initialMode);
  const [activeSystemId, setActiveSystemId] = useState(() => initialRepairSystemId(repairTaxonomy, initialQuery));
  const [query, setQuery] = useState(initialQuery);
  const [enginePrompt, setEnginePrompt] = useState("");
  const [analyzedEnginePrompt, setAnalyzedEnginePrompt] = useState("");
  const [openGroupId, setOpenGroupId] = useState<string>("");
  const [workTab, setWorkTab] = useState<WorkTab>(initialWorkTab);
  const [selectedLabor, setSelectedLabor] = useState<SelectedLabor[]>(initialExplorerSeed?.labor ?? (initialSelectedWork === "empty" ? [] : (initialSelectedWork === "transmission" ? transmissionStarter : brakeStarter).map((operation) => ({ ...operation, rowId: operation.id }))));
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([]);
  const [suppliesTaxable, setSuppliesTaxable] = useState(false);
  const [discountCents, setDiscountCents] = useState(0);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>(initialExplorerSeed?.parts ?? (initialSelectedWork === "starter" ? defaultParts : []));
  const [evidenceDrafts, setEvidenceDrafts] = useState<EvidenceDraft[]>([]);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceCategory, setEvidenceCategory] = useState<EvidenceDraft["category"]>("DIAGNOSTIC_PHOTO");
  const [evidenceAccessLevel, setEvidenceAccessLevel] = useState<EvidenceDraft["accessLevel"]>("INTERNAL");
  const [evidenceAttachedTo, setEvidenceAttachedTo] = useState("RO");
  const [editingLaborRowId, setEditingLaborRowId] = useState("");
  const [laborDraft, setLaborDraft] = useState<LaborDraft>({ hours: "", included: "", title: "" });
  const [editingPartId, setEditingPartId] = useState("");
  const [partDraft, setPartDraft] = useState<PartDraft>({ name: "", number: "", quantity: "", unitPrice: "" });
  const [acceptedAddOnIds, setAcceptedAddOnIds] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<RepairOrderLookup[]>([]);
  const [lookupFeedback, setLookupFeedback] = useState("");
  const partsRequestGeneration = useRef(0);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState<ActiveRepairOrder | null>(activeRepairOrder);
  const [manualDetails, setManualDetails] = useState<LaborGuideDetails>(emptyLaborGuideDetails);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const contextCustomer = selectedRepairOrder?.customer ?? (manualDetails.customer || undefined);
  const contextVehicle = selectedRepairOrder?.vehicle.label ?? (manualDetails.vehicle || undefined);
  const contextVin = selectedRepairOrder?.vehicle.vin ?? (manualDetails.vin || undefined);
  const contextConcern = selectedRepairOrder?.concern ?? (manualDetails.concern || undefined);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [estimateError, setEstimateError] = useState("");
  const [partsCatalogBusy, setPartsCatalogBusy] = useState(false);
  const [estimateAttempt, setEstimateAttempt] = useState<{ fingerprint: string; body: Record<string, unknown> } | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<RepairOrderLookup | null>(null);
  const [clinical, setClinical] = useState<ClinicalDrafts>({});
  const [laborReview, setLaborReview] = useState<ManualLaborReview>({ ...emptyManualLaborReview, source: initialExplorerSeed?.reviewNote ?? "" });
  const [estimateControls, setEstimateControls] = useState<EstimateControls>({ version: 1, pricing: { ...initialPricing }, fitment: {}, overlapResolution: "", reviewedScope: "" });
  const laborRate = estimateControls.pricing.laborRate;
  const partsMarkup = 1 + estimateControls.pricing.partsMarkupPercent / 100;
  const [workToolsOpen, setWorkToolsOpen] = useState(initialWorkTab !== "selected");
  const [controlsOpen, setControlsOpen] = useState(false);
  const checksRef = useRef<HTMLDetailsElement>(null);
  const estimateGuideRef = useRef<HTMLDivElement | null>(null);
  const workToolsRef = useRef<HTMLDetailsElement | null>(null);
  const workspaceContent = useMemo(() => ({ ro: selectedRepairOrder, manual: manualDetails, labor: selectedLabor, parts: selectedParts, evidence: evidenceDrafts, attempt: estimateAttempt, clinical, laborReview, estimateControls, serviceCharges, suppliesTaxable, discountCents }), [selectedRepairOrder, manualDetails, selectedLabor, selectedParts, evidenceDrafts, estimateAttempt, clinical, laborReview, estimateControls, serviceCharges, suppliesTaxable, discountCents]);
  const draft = useWorkspaceDraft(workspaceContent, contextVehicle ?? "Preliminary quote");

  const activeSystem = repairTaxonomy.find((system) => system.id === activeSystemId) ?? repairTaxonomy[0];
  const engineAnalysis = useMemo(
    () => analyzeLaborLanguage(analyzedEnginePrompt, repairTaxonomy),
    [analyzedEnginePrompt, repairTaxonomy]
  );
  const engineCandidatesById = useMemo(
    () => new Map(engineAnalysis.candidates.map((candidate) => [candidate.operation.id, candidate])),
    [engineAnalysis]
  );
  const normalizedQuery = (mode === "engine" ? analyzedEnginePrompt : query).trim().toLocaleLowerCase();
  const catalogOperations = useMemo(() => {
    if (mode === "engine" && normalizedQuery) return engineAnalysis.candidates.map((candidate) => candidate.operation);
    const scoped = normalizedQuery ? allOperations : activeSystem?.groups.flatMap((group) => group.operations) ?? [];
    if (!normalizedQuery) return scoped;
    return scoped
      .filter((operation) => matchesRepairText(operation, normalizedQuery))
      .sort((a, b) => Number(b.title.toLocaleLowerCase().includes(normalizedQuery)) - Number(a.title.toLocaleLowerCase().includes(normalizedQuery)) || Number(b.system === activeSystem?.title) - Number(a.system === activeSystem?.title));
  }, [activeSystem, allOperations, engineAnalysis, mode, normalizedQuery]);
  const repairAreaOperations = useMemo(
    () => selectedLabor.length ? selectedLabor : normalizedQuery ? catalogOperations.slice(0, 3) : [],
    [catalogOperations, normalizedQuery, selectedLabor]
  );
  const repairAreaQuery = selectedLabor.length ? selectedLabor.map((operation) => operation.title).join(" ") : normalizedQuery;
  const repairAreaIntelligence = useMemo(
    () => evaluateRepairAreaIntelligence({ query: repairAreaQuery, operations: repairAreaOperations }),
    [repairAreaOperations, repairAreaQuery]
  );
  const repairAssistantParts = repairAreaIntelligence.activeRulePack?.partRules.slice(0, 4) ?? [];
  const repairAssistantChecks = repairAreaIntelligence.activeRulePack
    ? [
      ...repairAreaIntelligence.activeRulePack.fitmentRules,
      ...repairAreaIntelligence.activeRulePack.calibrationRules,
      ...repairAreaIntelligence.activeRulePack.refinishRules
    ].slice(0, 4)
    : [];
  const groupedCatalog = useMemo(() => {
    const byGroup = new Map<string, { description: string; id: string; operations: LaborRepairOperation[]; title: string }>();
    if (normalizedQuery) {
      for (const operation of catalogOperations) {
        const key = `${operation.system}:${operation.subsystem}`;
        const current = byGroup.get(key) ?? { description: operation.system, id: key, operations: [], title: operation.subsystem };
        current.operations.push(operation);
        byGroup.set(key, current);
      }
      return Array.from(byGroup.values());
    }
    return activeSystem?.groups.map((group) => ({ ...group, description: activeSystem.description, operations: group.operations.filter((operation) => catalogOperations.some((item) => item.id === operation.id)) })).filter((group) => group.operations.length) ?? [];
  }, [activeSystem, catalogOperations, normalizedQuery]);
  const visibleGroupId = openGroupId && groupedCatalog.some((group) => group.id === openGroupId) ? openGroupId : normalizedQuery ? groupedCatalog[0]?.id ?? "" : "";

  const estimatePolicy = useMemo(() => evaluateEstimatePartsTaxPolicy({ labor: selectedLabor, parts: selectedParts, taxRate: (estimateControls.pricing.taxRatePercent ?? 0) / 100 }), [selectedLabor, selectedParts, estimateControls.pricing.taxRatePercent]);
  const estimateLabor = useMemo(() => [
    ...selectedLabor,
    ...allOperations
      .filter((operation) => estimatePolicy.requiredAddOnIds.includes(operation.id) && !selectedLabor.some((item) => item.id === operation.id))
      .map((operation) => ({ ...operation, rowId: operation.id, source: "POLICY_REQUIRED" as const }))
  ], [allOperations, estimatePolicy.requiredAddOnIds, selectedLabor]);
  const totalHours = estimateLabor.reduce((sum, item) => sum + item.hours, 0);
  const laborTotal = estimateLabor.reduce((sum, item) => sum + Math.round(Math.round(item.hours * 60) / 60 * laborRate * 100), 0) / 100;
  const estimateParts = useMemo(() => [
    ...selectedParts,
    ...estimatePolicy.missingRequiredParts.map(requiredPartToSelectedPart)
  ], [estimatePolicy.missingRequiredParts, selectedParts]);
  const partsTotal = estimateParts.reduce((sum, item) => sum + item.quantity * Math.round(item.unitPrice * 100), 0) / 100;
  const feeLines = useMemo(() => connectedExplorer ? serviceChargeLines(Math.round(laborTotal * 100), serviceCharges, suppliesTaxable) : [], [connectedExplorer, laborTotal, serviceCharges, suppliesTaxable]);
  const feesTotal = feeLines.reduce((sum, line) => sum + line.unitPriceCents, 0) / 100;
  const subtotal = laborTotal + partsTotal + feesTotal;
  const estimateTaxCents = serviceQuoteTax(Math.round(subtotal * 100), estimatePolicy.tax.taxablePartsCents + feeLines.filter(line => line.taxable).reduce((sum, line) => sum + line.unitPriceCents, 0), estimateControls.pricing.taxRatePercent ?? 0, Math.min(discountCents, Math.round(subtotal * 100)));
  const taxAndSupplies = estimateTaxCents / 100;
  const total = subtotal + taxAndSupplies - discountCents / 100;
  const laborGuideReturnTo = guideView === "new" ? `/prototype/labor-guide${selectedRepairOrder ? `?${new URLSearchParams({ repairOrderId: selectedRepairOrder.id, ...(reviewWorkflow ? { workflow: "review" } : {}) })}` : ""}` : laborGuideHref("legacy", selectedRepairOrder?.id, reviewWorkflow);
  const assignTechnicianHref = selectedRepairOrder
    ? `/vehicles/repair-workbench?${new URLSearchParams({
      repairOrderId: selectedRepairOrder.id,
      returnTo: laborGuideReturnTo,
      vehicleId: selectedRepairOrder.vehicle.id ?? "",
    }).toString()}`
    : `/vehicles/repair-workbench?${new URLSearchParams({
      returnTo: laborGuideReturnTo,
      view: "all",
    }).toString()}`;
  const partsWorkspaceHref = `/diagnostics/parts-ordering?${new URLSearchParams({
    parts: encodePartsOrderingPayload(estimateParts),
    ...(selectedRepairOrder ? { repairOrderId: selectedRepairOrder.id, repairOrderNumber: selectedRepairOrder.repairOrderNumber, vehicle: selectedRepairOrder.vehicle.label } : {}),
    returnTo: laborGuideReturnTo,
  }).toString()}`;
  const officialEstimateHref = `/repair-estimate?${new URLSearchParams({
    concern: contextConcern ?? "Repair estimate review",
    createdAt: selectedRepairOrder?.openedAt ?? "Pending estimate date",
    customer: contextCustomer ?? "Internal vehicle",
    estimateNumber: selectedRepairOrder ? `EST-${selectedRepairOrder.repairOrderNumber.replace(/^RO-?/i, "")}` : "EST-DRAFT",
    lines: encodeOfficialEstimateLines(estimateLabor, estimateParts, laborRate),
    ...(selectedRepairOrder ? { repairOrderId: selectedRepairOrder.id, repairOrderNumber: selectedRepairOrder.repairOrderNumber, vehicle: selectedRepairOrder.vehicle.label } : { repairOrderNumber: "RO-DRAFT", vehicle: contextVehicle ?? "Vehicle pending" }),
    returnTo: laborGuideReturnTo,
    summary: encodeOfficialEstimateSummary([
      { label: "Labor", value: `${totalHours.toFixed(1)} hrs · ${money(laborTotal)}` },
      { label: "Parts", value: money(partsTotal) },
      { label: "MN taxable parts", value: money(estimatePolicy.tax.taxablePartsCents / 100) },
      { label: "Tax", value: money(taxAndSupplies) },
      { label: "Total", value: money(total) },
    ]),
  }).toString()}`;
  const advisorReviewHref = `/diagnostics/advisor-review${selectedRepairOrder ? `?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}` : ""}`;
  const partsNeedCount = estimateParts.reduce((sum, item) => sum + item.quantity, 0);
  const pendingPricingCount = estimateParts.filter((item) => item.pricingStatus === "PRICE_PENDING" || item.unitPrice === 0).length;
  const policyRequiredCount = estimateParts.filter((item) => item.source === "POLICY_REQUIRED").length;
  const totalWorkLines = estimateLabor.length + estimateParts.length;
  const createEstimateReason = !selectedRepairOrder
    ? "Select the repair order shown in the customer and vehicle lookup before creating this estimate."
    : !selectedLabor.length && !selectedParts.length
      ? "Add at least one labor or part line before creating this estimate."
      : "Creates the official estimate document and opens print and repair-workbench actions.";
  const suggestedAddOns = useMemo(() => {
    return commonSuggestedAddOns.filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index && !acceptedAddOnIds.includes(item.id) && !estimatePolicy.requiredAddOnIds.includes(item.id) && !(selectedLabor.some(operation => repairBaselineForId(operation.id) && operation.operation !== "Diagnose") && ["road-test", "torque-verification"].includes(item.id))).slice(0, 4);
  }, [acceptedAddOnIds, estimatePolicy.requiredAddOnIds, selectedLabor]);

  useEffect(() => {
    const query = lookupQuery.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (query.length < 2) {
        setLookupResults([]);
        setLookupFeedback("");
        return;
      }
      fetch(`/api/repair-orders?query=${encodeURIComponent(query)}&pageSize=6`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Repair-order lookup failed.")))
        .then((body: { items?: RepairOrderLookup[] }) => { setLookupResults(body.items ?? []); setLookupFeedback(body.items?.length ? "" : "No matching repair order found. Search again or check in the vehicle; no new record has been created."); })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setLookupResults([]);
          setLookupFeedback("Repair-order lookup failed. Retry or check access; this is not a no-match result.");
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [lookupQuery]);

  useEffect(() => {
    if (!editingPartId) return;
    document.querySelector<HTMLElement>("[data-part-editor]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [editingPartId]);

  function addLabor(operation: LaborRepairOperation) {
    if (selectedLabor.some(line => repairScopeConflict(line.id, operation.id))) {
      setNotice("This work is already included in the selected scope or is an incompatible alternative. Remove the overlapping line before choosing an alternative.");
      return;
    }
    setSelectedLabor((current) => current.some((item) => item.id === operation.id) ? current : [...current, { ...operation, rowId: operation.id }]);
    setWorkTab("selected");
    void autoAddCatalogParts(operation);
  }

  function addConnectedRepair(repair: RepairOperation) {
    try { addLabor(connectedLaborSelection(repair, allOperations, connectedSystemIds)); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Selected work could not be added."); }
  }

  function toggleGroup(groupId: string) {
    setOpenGroupId((current) => current === groupId ? "" : groupId);
  }

  function updateCatalogQuery(value: string) {
    setQuery(value);
    setOpenGroupId("");
  }

  function updateEnginePrompt(value: string) {
    setEnginePrompt(value);
    setAnalyzedEnginePrompt("");
    setOpenGroupId("");
  }

  function analyzeEnginePrompt() {
    const prompt = enginePrompt.trim();
    const analysis = analyzeLaborLanguage(prompt, repairTaxonomy);
    setAnalyzedEnginePrompt(prompt);
    const first = analysis.candidates[0]?.operation;
    setOpenGroupId(first ? `${first.system}:${first.subsystem}` : "");
  }

  function handleEnginePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    analyzeEnginePrompt();
  }

  function updateActiveSystem(systemId: string) {
    setActiveSystemId(systemId);
    const system = repairTaxonomy.find((candidate) => candidate.id === systemId);
    if (mode === "engine" && system) {
      const analysis = analyzeLaborLanguage(system.title, repairTaxonomy);
      const first = analysis.candidates[0]?.operation;
      setEnginePrompt(system.title);
      setAnalyzedEnginePrompt(system.title);
      setOpenGroupId(first ? `${first.system}:${first.subsystem}` : "");
      return;
    }
    setOpenGroupId("");
  }

  function startLaborEdit(item: SelectedLabor) {
    setEditingLaborRowId(item.rowId);
    setLaborDraft({ hours: item.hours.toFixed(1), included: item.included.join("; "), title: item.title });
  }

  function saveLaborEdit(rowId: string) {
    const hours = Number(laborDraft.hours);
    setSelectedLabor((current) => current.map((item) => item.rowId === rowId ? {
      ...item,
      hours: Number.isFinite(hours) && hours >= 0 ? Number(hours.toFixed(1)) : item.hours,
      included: laborDraft.included.split(";").map((value) => value.trim()).filter(Boolean),
      title: laborDraft.title.trim() || item.title,
    } : item));
    setEditingLaborRowId("");
    setLaborDraft({ hours: "", included: "", title: "" });
  }

  function cancelLaborEdit() {
    setEditingLaborRowId("");
    setLaborDraft({ hours: "", included: "", title: "" });
  }

  function deleteLabor(rowId: string) {
    partsRequestGeneration.current += 1;
    setSelectedLabor((current) => current.filter((item) => item.rowId !== rowId));
    setSelectedParts((current) => current.filter((part) => part.laborRowId !== rowId));
  }

  function addManualPart() {
    const id = `manual-part-${crypto.randomUUID()}`;
    setSelectedParts((current) => [...current, { id, laborRowId: selectedLabor[0]?.rowId ?? "manual", name: "Manual part", number: "Enter part #", pricingStatus: "PRICE_PENDING", quantity: 1, source: "MANUAL", unitPrice: 0 }]);
    setEditingPartId(id);
    setPartDraft({ name: "Manual part", number: "", quantity: "1", unitPrice: "" });
    setWorkTab("parts");
  }

  function addWorksheetPart(replaceId?: string) {
    const prior = estimateParts.find(part => part.id === replaceId);
    const part: SelectedPart = { id: `manual-part-${crypto.randomUUID()}`, laborRowId: prior?.laborRowId ?? selectedLabor[0]?.rowId ?? "manual", name: "New part", number: "", pricingStatus: "PRICE_PENDING", quantity: 1, source: "MANUAL", unitPrice: 0 };
    setSelectedParts(current => replaceExplorerPartsAllowance(current, part));
    setEstimateError("");
  }

  function addRepairAreaPart(part: RepairAreaPartRule) {
    setSelectedParts((current) => {
      const id = `area-${part.oemPartNumber.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      if (current.some((item) => item.id === id || item.number === part.oemPartNumber)) return current;
      return [...current, {
        id,
        laborRowId: selectedLabor[0]?.rowId ?? "repair-area",
        name: part.description,
        number: part.oemPartNumber,
        pricingStatus: "PRICE_PENDING",
        quantity: part.quantity,
        source: "MANUAL",
        taxable: true,
        unitPrice: 0
      }];
    });
    setWorkTab("parts");
  }

  function startPartEdit(part: SelectedPart) {
    setSelectedParts(current => current.some(item => item.id === part.id) ? current : [...current, part]);
    setEditingPartId(part.id);
    setPartDraft({ name: part.name, number: part.number, quantity: String(part.quantity), unitPrice: part.unitPrice ? part.unitPrice.toFixed(2) : "" });
  }

  function savePartEdit(id: string) {
    const quantity = Number(partDraft.quantity);
    const unitPrice = Number(partDraft.unitPrice);
    setSelectedParts((current) => current.map((part) => part.id === id ? {
      ...part,
      name: partDraft.name.trim() || part.name,
      number: partDraft.number.trim() || part.number,
      pricingStatus: Number.isFinite(unitPrice) && unitPrice >= 0 && partDraft.unitPrice.trim() ? "ESTIMATED" : "PRICE_PENDING",
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : part.quantity,
      unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? Number(unitPrice.toFixed(2)) : part.unitPrice,
    } : part));
    setEditingPartId("");
    setPartDraft({ name: "", number: "", quantity: "", unitPrice: "" });
  }

  function cancelPartEdit() {
    setEditingPartId("");
    setPartDraft({ name: "", number: "", quantity: "", unitPrice: "" });
  }

  function deletePart(id: string) {
    setSelectedParts((current) => current.filter((part) => part.id !== id));
  }

  function stageEvidenceFiles(files: FileList | null) {
    if (!files?.length) return;
    const attachedLabor = selectedLabor.find((item) => item.rowId === evidenceAttachedTo);
    const attachedTo = evidenceAttachedTo === "RO" ? "Entire RO" : attachedLabor?.title ?? "Selected repair";
    const items = Array.from(files).map((file) => ({
      accessLevel: evidenceAccessLevel,
      attachedTo,
      category: evidenceCategory,
      fileName: file.name,
      note: evidenceNote.trim(),
      status: "Staged" as const,
    }));
    setEvidenceDrafts((current) => [...items, ...current]);
    setEvidenceNote("");
    setWorkTab("evidence");
  }

  function deleteEvidenceDraft(index: number) {
    setEvidenceDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function acceptSuggestedAddOn(id: string) {
    const operation = allOperations.find((item) => item.id === id);
    if (operation) addLabor(operation);
    setAcceptedAddOnIds((current) => current.includes(id) ? current : [...current, id]);
  }

  function clearEstimateWorkspace() {
    setQuery("");
    setEnginePrompt("");
    setAnalyzedEnginePrompt("");
    setOpenGroupId("");
    setWorkTab("selected");
    setSelectedLabor([]);
    setSelectedParts([]);
    setServiceCharges([]); setSuppliesTaxable(false); setDiscountCents(0);
    setEvidenceDrafts([]);
    setEvidenceNote("");
    setEvidenceAttachedTo("RO");
    setEditingLaborRowId("");
    setLaborDraft({ hours: "", included: "", title: "" });
    setEditingPartId("");
    setPartDraft({ name: "", number: "", quantity: "", unitPrice: "" });
    setAcceptedAddOnIds([]);
  }

  function selectRepairOrder(order: RepairOrderLookup) {
    const hasWork = selectedRepairOrder || Object.values(manualDetails).some(Boolean) || selectedLabor.length || selectedParts.length || evidenceDrafts.length || Object.keys(clinical).length || estimateAttempt || Object.values(laborReview).some(Boolean);
    if (!hasWork) {
      applyRepairOrder(order);
      return;
    }
    setPendingSwitch(order);
  }

  function applyRepairOrder(order: RepairOrderLookup, keepProposedWork = false) {
    partsRequestGeneration.current += 1;
    draft.adopt();
    setClinical({});
    setLaborReview(emptyManualLaborReview);
    setEstimateControls({ ...estimateControls, fitment: {}, overlapResolution: "", reviewedScope: "", brakeReview: undefined, steeringReview: undefined, systemReviews: undefined });
    setEstimateAttempt(null);
    setManualDetails(emptyLaborGuideDetails);
    if (!keepProposedWork) clearEstimateWorkspace();
    else { setEvidenceDrafts([]); setAcceptedAddOnIds([]); }
    setSelectedRepairOrder({
      concern: order.serviceVisit.concernSummary,
      customer: order.customer?.displayName ?? "Internal vehicle",
      id: order.id,
      openedAt: new Date().toISOString(),
      repairOrderNumber: order.repairOrderNumber,
      vehicle: { id: order.vehicle.id, label: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber, vin: order.vehicle.vin ?? order.vehicle.vehicleNumber },
    });
    setLookupQuery("");
    setLookupResults([]);
    setNotice(keepProposedWork ? `Proposed work attached to ${order.repairOrderNumber}. Evidence, approvals and fitment/labor reviews were not carried over. Recheck this vehicle before presenting.` : `Loaded ${order.repairOrderNumber} for estimate work.`);
    setPendingSwitch(null);
  }

  function revealWorkTools(tab: WorkTab = "labor") {
    setWorkTab(tab);
    setWorkToolsOpen(true);
    window.requestAnimationFrame(() => {
      workToolsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      workToolsRef.current?.focus({ preventScroll: true });
    });
  }

  function revealChecks() {
    setControlsOpen(true);
    requestAnimationFrame(() => { checksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); checksRef.current?.focus({ preventScroll: true }); });
  }

  function revealEstimateGuide() {
    window.requestAnimationFrame(() => {
      estimateGuideRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      estimateGuideRef.current?.focus({ preventScroll: true });
    });
  }

  async function request<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body.error ?? "Request failed."), { status: response.status });
    return body as T;
  }

  async function autoAddCatalogParts(operation: LaborRepairOperation) {
    const baseline = repairBaselineForId(operation.id);
    if (baseline) {
      setNotice(baseline.operation.parts.length ? "Parts plan added with pricing pending. Confirm the VIN, quantities, hardware and materials before quoting." : "No replacement parts were added for this test or service. Add materials only when required by the reviewed procedure.");
      return;
    }
    const generation = partsRequestGeneration.current;
    setPartsCatalogBusy(true);
    try {
      const matches: PartsWorkspacePart[] = [];
      for (const term of partSearchTerms(operation)) {
        const body = await request<{ parts?: PartsWorkspacePart[] }>(`/api/parts?query=${encodeURIComponent(term)}`);
        for (const part of body.parts ?? []) {
          const alreadyMatched = matches.some((item) => item.id === part.id);
          if (!alreadyMatched) matches.push(part);
        }
      }
      if (generation !== partsRequestGeneration.current) return;
      const additions = matches.slice(0, 3).map((part) => {
        const unitPrice = Number((((part.standardCostCents ?? 0) / 100) * partsMarkup).toFixed(2));
        return {
        catalogPartId: part.id,
        id: `${operation.id}-${part.id}`,
        laborRowId: operation.id,
        name: part.description,
        number: part.partNumber,
        pricingStatus: unitPrice > 0 ? "ESTIMATED" as const : "PRICE_PENDING" as const,
        quantity: quantityForPart(operation, part),
        source: "AUTO_CATALOG" as const,
        unitPrice,
      };
      });
      // A labor operation always creates an estimate-ready parts plan, even when the live catalog has no priced match yet.
      const fallbackParts = evaluateRepairAreaIntelligence({ operations: [operation], query: operation.title }).activeRulePack?.partRules.map((part) => ({
        id: `${operation.id}-guide-${part.oemPartNumber}`,
        laborRowId: operation.id,
        name: part.description,
        number: part.oemPartNumber,
        pricingStatus: "PRICE_PENDING" as const,
        quantity: part.quantity,
        source: "AUTO_CATALOG" as const,
        taxable: true,
        unitPrice: 0,
      })) ?? [];
      const plannedParts: SelectedPart[] = additions.length ? additions : fallbackParts;
      if (!plannedParts.length) {
        setNotice(`Added ${operation.title}. No parts rule is available yet; add a part manually if one is required.`);
        return;
      }
      setSelectedParts((current) => {
        const existing = new Set(current.map((part) => `${part.laborRowId}:${part.catalogPartId ?? part.number}`));
        return [...current, ...plannedParts.filter((part) => !existing.has(`${part.laborRowId}:${part.catalogPartId ?? part.number}`))];
      });
      setNotice(`${operation.title}: added ${plannedParts.length} linked part${plannedParts.length === 1 ? "" : "s"}${additions.length ? " with catalog pricing." : "; enter retail pricing after VIN and fitment review."}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load matching parts from the catalog.");
    } finally {
      setPartsCatalogBusy(false);
    }
  }

  const lineKey = (prefix: string, id: string) => `${prefix}-${id.replace(/[^a-z0-9-]/gi, "-").toLocaleLowerCase()}`;
  const lineItems = useMemo(() => [
    ...estimateLabor.map((item) => ({
      description: item.title,
      key: lineKey("labor", item.rowId),
      laborGuideMinutes: Math.round(item.hours * 60),
      plannedCorrection: item.title,
      quantity: 1,
      taxable: false,
      type: "LABOR" as const,
      unitPriceCents: Math.round(Math.round(item.hours * 60) / 60 * laborRate * 100),
      workTypeCode: item.operation.toUpperCase().replaceAll(" ", "_").replaceAll("/", "_"),
    })),
    ...estimateParts.map((part) => ({
      description: `${part.name} (${part.number})`,
      key: lineKey("part", part.id),
      laborGuideMinutes: 0,
      plannedCorrection: `Supply ${part.name}`,
      quantity: part.quantity,
      taxable: part.taxable !== false,
      type: "PART" as const,
      partNumber: part.number,
      laborLineKey: lineKey("labor", estimateLabor.find(item => item.rowId === part.laborRowId || item.id === part.laborRowId)?.rowId ?? part.laborRowId),
      unitPriceCents: Math.round(part.unitPrice * 100),
      workTypeCode: "PART",
    })),
    ...feeLines,
  ], [estimateLabor, estimateParts, laborRate, feeLines]);
  const reviewScope = estimateReviewScope(selectedRepairOrder?.vehicle.id ?? `${contextVehicle ?? ""}|${contextVin ?? ""}`, lineItems);
  const controlsScope = estimateControlsScope(selectedRepairOrder?.vehicle.id ?? `${contextVehicle ?? ""}|${contextVin ?? ""}`, lineItems, estimateControls);
  const controlsReady = useMemo(() => {
    try { if (connectedExplorer) checkStaffQuotePricing(lineItems, estimateControls, estimateLabor, estimateTaxCents, discountCents); else checkEstimateControls(selectedRepairOrder?.vehicle.id ?? `${contextVehicle ?? ""}|${contextVin ?? ""}`, lineItems, estimateControls, estimateLabor, estimatePolicy.tax.taxCents); return true; }
    catch { return false; }
  }, [connectedExplorer, selectedRepairOrder?.vehicle.id, contextVehicle, contextVin, lineItems, estimateControls, estimateLabor, estimatePolicy.tax.taxCents, estimateTaxCents, discountCents]);
  const unresolvedAllowances = estimateParts.some(unresolvedExplorerAllowance);
  const reviewReady = manualReviewComplete(laborReview, reviewScope);

  async function presentEstimate() {
    setEstimateError("");
    try { normalizeServiceCharges(serviceCharges); } catch (error) { setEstimateError(error instanceof Error ? error.message : "Check other charges."); return; }
    if (discountCents > Math.round(subtotal * 100)) { setEstimateError("Discount cannot exceed the subtotal."); return; }
    if (!pricingAvailable) { setEstimateError("Shop rate settings are unavailable. Reload and try again."); return; }
    if (!selectedRepairOrder) {
      setDetailsOpen(true);
      setEstimateError("Select a vehicle and repair order first.");
      return;
    }
    if (!selectedLabor.length && !selectedParts.length) {
      revealWorkTools("labor");
      setEstimateError("Add work or parts first.");
      return;
    }
    if (unresolvedAllowances) {
      revealEstimateGuide();
      setEstimateError("Enter part details or remove the incomplete line.");
      return;
    }
    if (estimateParts.some(part => part.pricingStatus === "PRICE_PENDING")) {
      revealEstimateGuide();
      setEstimateError("Enter the missing part prices.");
      return;
    }
    if (!connectedExplorer && !reviewReady) {
      revealEstimateGuide();
      setEstimateError("Complete the labor basis review before presenting.");
      return;
    }
    try { if (connectedExplorer) checkStaffQuotePricing(lineItems, estimateControls, estimateLabor, estimateTaxCents, discountCents); else checkEstimateControls(selectedRepairOrder.vehicle.id ?? "", lineItems, estimateControls, estimateLabor, estimatePolicy.tax.taxCents); }
    catch (error) { setEstimateError(error instanceof Error ? error.message : "Check estimate pricing."); revealEstimateGuide(); return; }
    setBusy(true);
    setNotice("");
    try {
      const presentedAt = new Date();
      const expiresAt = new Date(presentedAt.getTime() + 7 * 86_400_000);
      const taxCents = estimateTaxCents;
      const fingerprint = JSON.stringify({ ro: selectedRepairOrder.id, lineItems, taxCents, discountCents, laborReview, estimateControls });
      const planning = estimateAttempt?.fingerprint === fingerprint ? null : await request<{ version: number }>(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/planning`);
      const attempt = estimateAttempt?.fingerprint === fingerprint ? estimateAttempt : { fingerprint, body: {
          expectedVersion: planning!.version,
          action: "PRESENT_ESTIMATE",
          ...(connectedExplorer ? { estimateWorkflow: "STAFF_QUOTE", chargesPolicy: SERVICE_CHARGES_POLICY } : { manualLaborReview: laborReview }),
          estimateControls,
          assumptions: "Prepared from selected labor catalog operations and manual parts in the RO creation workspace.",
          discountCents,
          expiresAt: expiresAt.toISOString(),
          idempotencyKey: crypto.randomUUID(),
          lineItems,
          optionGroups: { servicePricing: { taxRatePercent: estimateControls.pricing.taxRatePercent } },
          presentationChannel: "INTERNAL",
          presentedAt: presentedAt.toISOString(),
          reason: "Present governed estimate from RO creation workspace selected labor and parts.",
          taxBoundary: connectedExplorer ? `Staff-configured ${estimateControls.pricing.taxRatePercent}% tax on taxable parts and charges after proportional discount allocation.` : `${estimatePolicy.tax.taxSummary} ${estimateControls.pricing.taxRatePercent}% · ${estimateControls.pricing.taxReference}`,
          taxCents,
        } };
      setEstimateAttempt(attempt);
      await draft.save({ ...workspaceContent, attempt });
      const result = await request<{ result?: { id?: string; estimateVersion?: number; totalCents?: number } }>(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/planning`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(attempt.body),
      });
      setNotice(`Estimate saved${result.result?.estimateVersion ? ` as version ${result.result.estimateVersion}` : ""}. Opening the issued estimate for printing.`);
      if (!result.result?.id) throw new Error("Estimate response was incomplete. Retry to retrieve the same estimate; do not create a second one.");
      router.push(`/repair-estimate?${new URLSearchParams({ repairOrderId: selectedRepairOrder.id, estimateId: result.result.id, workspace: "1", ...(reviewWorkflow ? { workflow: "review" } : {}) })}`);
    } catch (error) {
      // A definite rejection can start a fresh attempt after the prerequisite is corrected.
      // Network failures and uncertain server errors retain the saved retry identity.
      if (error instanceof Error && "status" in error && ([400, 401, 403].includes(Number(error.status)) || (error.status === 409 && error.message.startsWith("Expected version")))) setEstimateAttempt(null);
      setEstimateError(error instanceof Error ? error.message : "Unable to generate the estimate. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function syncPartDemands() {
    if (!selectedRepairOrder) {
      setNotice("Select an active repair order before syncing parts demand.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      for (const part of estimateParts) {
        const partQuery = await request<{ parts?: PartsWorkspacePart[] }>(`/api/parts?query=${encodeURIComponent(part.number)}`);
        let partId = part.catalogPartId ?? partQuery.parts?.find((item) => item.partNumber.toLocaleUpperCase() === part.number.toLocaleUpperCase())?.id;
        if (!partId) {
          const created = await request<{ result?: { id: string } }>("/api/parts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              description: part.name,
              idempotencyKey: crypto.randomUUID(),
              partNumber: part.number,
              reason: "Create manual part from RO creation workspace.",
              standardCostCents: Math.round(part.unitPrice * 70),
              unitOfMeasure: "EACH",
            }),
          });
          partId = created.result?.id;
        }
        if (!partId) throw new Error(`Part ${part.number} could not be resolved.`);
        await request(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/parts`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            notes: `Demand created from RO workspace for ${part.name}.`,
            partId,
            quantityRequired: part.quantity,
            reason: "Create repair part demand from RO creation workspace.",
            repairJobReference: lineKey("labor", estimateLabor.find(item => item.rowId === part.laborRowId || item.id === part.laborRowId)?.rowId ?? part.laborRowId),
            requiredAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
            substitutionAllowed: true,
          }),
        });
      }
      setNotice("Parts demand synced to the repair order.");
    } catch (error) {
      setNotice(normalizePartsSyncMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <DiagnosticWorkspace initialSection="Estimate" clinical={clinical} onClinicalChange={setClinical} onClinicalPersist={async value => { const saved = await draft.save({ ...workspaceContent, clinical: value }); if (saved) setClinical(value); return saved; }} vehicle={contextVehicle} customer={contextCustomer} vin={contextVin} concern={contextConcern} repairOrderId={selectedRepairOrder?.id} repairOrderNumber={selectedRepairOrder?.repairOrderNumber} onSave={draft.save} onFindDrafts={() => draft.refresh().catch(error => setNotice(error.message))} saveStatus={draft.status} returnTo={returnTo} returnLabel={returnLabel} feedback={notice ? <div className={styles.notice} role="status">{notice}</div> : null} tools={<>
      <section className={styles.lookupBand} aria-label="Draft protection">
        <button disabled={draft.saving || busy} onClick={() => void draft.save()} type="button">Save preliminary quote</button>
        <button disabled={draft.saving || busy} onClick={() => void draft.refresh().catch(error => setNotice(error.message))} type="button">Find saved drafts</button>
        {draft.status.includes("another session") ? <button disabled={draft.saving || busy} onClick={() => void draft.saveCopy()} type="button">Save my changes as a separate draft</button> : null}
        <span>A preliminary quote is not a confirmed diagnosis or repair authorization.</span>
      </section>
      {draft.draftsLoaded && !draft.drafts.length ? <p role="status">No saved quotes yet. Add vehicle details or estimate lines, then choose Save quote.</p> : null}
      {draft.drafts.length ? <section className={styles.savedDraftGrid} aria-label="Saved drafts">{draft.drafts.map(saved => <article key={saved.id}>
        <button disabled={busy || draft.saving} onClick={async () => {
          if (!await draft.save()) return;
          try {
            const latest = (await draft.refresh()).find(item => item.id === saved.id);
            if (!latest) throw new Error("That draft is no longer available in the recent drafts list.");
            const value = latest.content;
            setClinical(value.clinical ?? {});
            setLaborReview(value.laborReview ?? emptyManualLaborReview);
            setEstimateControls(value.estimateControls ?? { version: 1, pricing: { ...initialEstimatePricing, laborRate: 129.02, taxRatePercent: 8, reason: "Historical draft defaults retained; recheck pricing before presentation." }, fitment: {}, overlapResolution: "", reviewedScope: "" });
            draft.adopt(latest); setSelectedRepairOrder(value.ro); setManualDetails(value.manual); setSelectedLabor(value.labor); setSelectedParts(value.parts); setServiceCharges(value.serviceCharges ?? []); setSuppliesTaxable(value.suppliesTaxable ?? false); setDiscountCents(value.discountCents ?? 0); setEvidenceDrafts(value.evidence); setEstimateAttempt(value.attempt);
            setNotice("");
          } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to resume draft."); }
        }} type="button">Resume {saved.title}</button>
        <button aria-label={`Archive saved quote ${saved.title}`} disabled={busy || draft.saving} onClick={async () => {
          try {
            await draft.archiveDraft(saved.id);
            setNotice(`Archived saved quote: ${saved.title}. The record is preserved for history.`);
          } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to archive saved quote."); }
        }} type="button">Archive</button>
      </article>)}</section> : null}
      {pendingSwitch ? <section className={styles.notice} role="region" aria-label="Confirm vehicle switch">
        <span>Switch to {pendingSwitch.repairOrderNumber}? Choose what to do with your current draft.</span>
        <button ref={element => { element?.focus(); }} disabled={draft.saving} type="button" onClick={async () => { if (await draft.save()) applyRepairOrder(pendingSwitch); }}>Save and switch</button>
        <button disabled={draft.saving} type="button" onClick={() => applyRepairOrder(pendingSwitch)}>Discard unsaved changes and switch</button>
        {!selectedRepairOrder && (selectedLabor.length > 0 || selectedParts.length > 0) ? <button disabled={draft.saving} type="button" onClick={async () => { if (await draft.save()) applyRepairOrder(pendingSwitch, true); }}>Save source quote & attach proposed work to this RO</button> : null}
        <button disabled={draft.saving} type="button" onClick={() => setPendingSwitch(null)}>Cancel</button>
      </section> : null}

      <section className={styles.lookupBand} aria-label="Customer and vehicle lookup">
        <label className={styles.lookupSearch}>
          <Search />
          <input onChange={(event) => setLookupQuery(event.target.value)} placeholder="Search customer, phone, VIN, plate, vehicle, or RO number" value={lookupQuery} />
        </label>
        <button disabled={Boolean(selectedRepairOrder)} onClick={() => setDetailsOpen(!detailsOpen)} type="button"><Edit3 />Vehicle & customer details</button>
        {!selectedRepairOrder ? <LaborGuideVehicleEntry vin={manualDetails.vin} /> : null}
        <Link href="/vehicles/repair-orders?intakeSource=WALK_IN&returnTo=%2Fdiagnostics%2Flabor-guide"><Plus />Check in vehicle</Link>
      </section>
      {!selectedRepairOrder ? <p id="labor-guide-add-vehicle-help">Vehicle missing? Add it in a new tab without leaving this estimate. Complete check-in there, then select the new repair order in this page&apos;s lookup to continue. Adding a vehicle does not authorize repairs.</p> : null}
      {lookupFeedback ? <p role="status">{lookupFeedback}</p> : null}
      {detailsOpen && !selectedRepairOrder ? <LaborGuideDetailsForm value={manualDetails} onApply={value => { setManualDetails(value); setDetailsOpen(false); setNotice("Vehicle and customer details applied to this page. No repair order or check-in was created."); }} onCancel={() => setDetailsOpen(false)} /> : null}
      {lookupResults.length ? <section className={styles.lookupResults} aria-label="Repair order lookup results">{lookupResults.map((order) => <button key={order.id} disabled={busy || draft.saving || Boolean(pendingSwitch)} onClick={() => selectRepairOrder(order)} type="button"><strong>{[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber}</strong><span>{order.customer?.displayName ?? "Internal"} · {order.repairOrderNumber}</span><small>{order.serviceVisit.concernSummary}</small><span>Select vehicle for estimate →</span></button>)}</section> : null}

      </>}>
      <div className={styles.console} aria-label="Estimate editor">
      {selectedRepairOrder ? <nav aria-label="Continue this repair order"><Link href={reviewWorkflow ? repairReviewHref(selectedRepairOrder.id) : `/vehicles/shop-planning?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}&returnTo=${encodeURIComponent(laborGuideReturnTo)}`}>Estimate revisions, customer authorization & approved jobs →</Link><Link href={`/service-documents?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}`}> View Documents & Approvals</Link><Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}`}> Create / Print Final Invoice</Link><span> Presentation is not customer approval. Authorize the exact revision before dispatch.</span></nav> : null}
      {initialNotice ? <p role="alert">{initialNotice}</p> : null}
      {unresolvedAllowances && <p role="alert">Explorer parts allowances need itemization. Edit part details below or remove the allowance and add actual parts. A price alone does not resolve an allowance.</p>}
      <div ref={estimateGuideRef} tabIndex={-1}>
      {connectedExplorer && <ServiceChargesEditor laborCents={Math.round(laborTotal * 100)} charges={serviceCharges} suppliesTaxable={suppliesTaxable} discountCents={discountCents} subtotalCents={Math.round(subtotal * 100)} onDiscount={setDiscountCents} busy={busy || draft.saving} onChange={setServiceCharges} onSuppliesTaxable={setSuppliesTaxable} />}
      {connectedExplorer && <label>Tax rate (%) <input aria-label="Estimate tax rate" type="number" min="0" max="30" step="0.001" value={estimateControls.pricing.taxRatePercent ?? ""} onChange={event => setEstimateControls(current => ({ ...current, pricing: { ...current.pricing, taxRatePercent: event.target.value === "" ? null : Number(event.target.value) } }))} /></label>}
      <EstimateWorksheet feedback={estimateError} simplified={connectedExplorer} vehicle={contextVehicle} vin={contextVin} hasRO={Boolean(selectedRepairOrder)} lines={[
        ...estimateLabor.map(item => ({ id: item.rowId, title: item.title, kind: "Labor" as const, quantity: item.hours, price: laborRate, pending: false, removable: selectedLabor.some(row => row.rowId === item.rowId), editable: selectedLabor.some(row => row.rowId === item.rowId) })),
        ...estimateParts.map(item => ({ id: item.id, title: item.name, kind: "Part" as const, quantity: item.quantity, price: item.unitPrice, number: item.number, allowance: isExplorerPartsAllowance(item), pending: item.pricingStatus === "PRICE_PENDING" || unresolvedExplorerAllowance(item), removable: item.source !== "POLICY_REQUIRED", editable: true })),
      ]} onAddPart={connectedExplorer ? () => addWorksheetPart() : undefined} onItemizePart={connectedExplorer ? line => addWorksheetPart(line.id) : undefined} checksReady={controlsReady && pricingAvailable && !unresolvedAllowances} onReviewChecks={revealChecks} summary={[{ label: "Labor", value: money(laborTotal) }, { label: "Parts", value: money(partsTotal) }, ...(connectedExplorer ? [{ label: "Other charges & supplies", value: money(feesTotal) }] : []), ...(connectedExplorer ? [{ label: "Discount", value: money(discountCents / 100) }] : []), { label: "Tax", value: money(taxAndSupplies) }]} onRemove={line => { if (line.kind === "Labor") deleteLabor(line.id); else deletePart(line.id); }} onPartChange={(line, field, value) => { const part = estimateParts.find(item => item.id === line.id); if (!part) return; setSelectedParts(rows => { const current = rows.find(item => item.id === line.id) ?? part; const updated = { ...current, [field]: value }; return rows.some(item => item.id === line.id) ? rows.map(item => item.id === line.id ? updated : item) : [...rows, updated]; }); }} review={laborReview} scope={reviewScope} total={money(total)} busy={busy || draft.saving} onFindVehicle={() => setDetailsOpen(true)} onAddWork={() => revealWorkTools("labor")} onReview={setLaborReview} onSave={() => void draft.save()} onPresent={() => void presentEstimate()} onEdit={(line, field, value) => {
        if (line.kind === "Labor") setSelectedLabor(rows => rows.map(row => row.rowId === line.id ? { ...row, hours: value } : row));
        else { const part = estimateParts.find(item => item.id === line.id); if (!part) return; setSelectedParts(rows => { const current = rows.find(item => item.id === line.id) ?? part; const updated = { ...current, ...(field === "quantity" ? { quantity: Math.max(1, Math.floor(value)) } : { unitPrice: value, pricingStatus: "ESTIMATED" as const }) }; return rows.some(item => item.id === line.id) ? rows.map(item => item.id === line.id ? updated : item) : [...rows, updated]; }); }
      }} />
      <details hidden={connectedExplorer} ref={checksRef} open={controlsOpen} onToggle={event => setControlsOpen(event.currentTarget.open)} tabIndex={-1}><summary>Pricing, fitment &amp; safety checks · {controlsReady ? "Reviewed" : "Review needed"}</summary>
      <EstimateControlsPanel controls={estimateControls} scope={controlsScope} labor={estimateLabor} parts={estimateParts.map(part => ({ key: lineKey("part", part.id), label: part.name }))} onChange={setEstimateControls} canOverrideLaborRate={canOverrideLaborRate} shopLaborRate={initialPricing.laborRate} />
      </details>
      </div>
      <details><summary>Additional guide tools</summary><nav aria-label="Labor guide experience"><span>Catalog tools for this guide.</span>{canOverrideLaborRate && <> · <Link href="/diagnostics/labor-evidence">Actual labor evidence</Link> · <Link href="/diagnostics/labor-readiness">Pilot readiness</Link></>}</nav></details>
      <details className={styles.workTools} open={workToolsOpen} onToggle={(event) => setWorkToolsOpen(event.currentTarget.open)} ref={workToolsRef} tabIndex={-1}><summary><span>Find labor or parts</span><small>Catalog, parts, evidence, notes</small></summary>
      <div hidden={connectedExplorer} className={styles.modeTabs} role="tablist" aria-label="RO creation mode">
        <button aria-selected={mode === "manual"} onClick={() => setMode("manual")} role="tab" type="button"><BookOpen />Manual Labor Guide</button>
        <button aria-selected={mode === "engine"} onClick={() => setMode("engine")} role="tab" type="button"><Brain />Labor Intelligence Engine</button>
      </div>

      <div className={`${styles.workspaceShell} ${reviewOpen ? "" : styles.reviewCollapsed} ${editingPartId ? styles.editingWorkspace : ""} ${connectedExplorer ? styles.connectedWorkspace : ""}`}>
        <main className={styles.catalogWorkspace}>
          {connectedExplorer && <ConnectedRepairCatalog allowedSystemIds={connectedSystemIds} vehicle={contextVehicle ?? ""} concern={contextConcern ?? ""} selected={estimateLabor} laborRate={laborRate} onSelect={addConnectedRepair} onReview={revealEstimateGuide} />}
          <div hidden={connectedExplorer}>
          <div className={styles.catalogHeader}>
            <div>
              <span className={styles.catalogEyebrow}>{mode === "manual" ? "Complete Repair Catalog" : "Labor Intelligence Engine"}</span>
              <h2>{mode === "manual" ? "Find labor or parts" : "Describe the work once"}</h2>
              <p>{mode === "manual" ? "Use one search box, pick the closest repair group, then add the line to the estimate worksheet." : "Write the concern in plain language, then accept, edit, or remove the suggested labor lines."}</p>
            </div>
          </div>

          {mode === "engine" ? (
            <div className={styles.engineTools}>
              <label>
                <span>Describe the repair need, symptom, or advisor notes</span>
                <textarea onChange={(event) => updateEnginePrompt(event.target.value)} onKeyDown={handleEnginePromptKeyDown} placeholder="Example: customer states grinding noise from front passenger brake, pedal pulsation, check front pads and rotors" value={enginePrompt} />
              </label>
              <button onClick={analyzeEnginePrompt} type="button"><Brain />Analyze</button>
              <small>Press Enter to analyze. Use Shift+Enter for a new line.</small>
            </div>
          ) : (
            <div className={styles.catalogTools}>
              <label><Search /><input onChange={(event) => updateCatalogQuery(event.target.value)} placeholder="Search repair category, component, symptom, or operation" value={query} /></label>
              <select aria-label="Repair category" onChange={(event) => updateActiveSystem(event.target.value)} value={activeSystemId}>{repairTaxonomy.map((system) => <option key={system.id} value={system.id}>{system.title}</option>)}</select>
              <select aria-label="Labor time filter"><option>Any labor time</option><option>Under 1 hr</option><option>1-3 hrs</option></select>
              <select aria-label="OEM filter"><option>OEM / Aftermarket</option><option>OEM</option><option>Aftermarket</option></select>
            </div>
          )}

          {mode === "engine" && analyzedEnginePrompt ? (
            <section className={styles.languageAnalysis} aria-label="Language analysis">
              <header>
                <span>{displayLabel(engineAnalysis.intent)}</span>
                <b data-confidence={engineAnalysis.confidence}>{displayLabel(engineAnalysis.confidence)}</b>
                <small>{engineAnalysis.version}</small>
              </header>
              <p>{engineAnalysis.summary}</p>
              {engineAnalysis.recognizedTerms.length ? <div>{engineAnalysis.recognizedTerms.map((term) => <span key={term}>{term}</span>)}</div> : null}
              {engineAnalysis.clarification ? <strong>{engineAnalysis.clarification}</strong> : null}
            </section>
          ) : null}

          {repairAreaIntelligence.activeRulePack && (repairAssistantParts.length || repairAssistantChecks.length) ? (
            <section className={styles.repairAreaAssistant} aria-label="Repair area assistance">
              <header>
                <div>
                  <span>{repairAreaIntelligence.activeRulePack.domain}</span>
                  <h3>Helpful items to review</h3>
                  <p>Use these only if they match the vehicle, concern, and approved repair direction.</p>
                </div>
                <small>{displayLabel(repairAreaIntelligence.confidence)}</small>
              </header>
              {repairAssistantParts.length ? (
                <div className={styles.quickPartList}>
                  {repairAssistantParts.map((part) => (
                    <article key={`${part.oemPartNumber}-${part.description}`}>
                      <span>
                        <strong>{part.description}</strong>
                        <small>Qty {part.quantity} · confirm fitment before ordering</small>
                      </span>
                      <button onClick={() => addRepairAreaPart(part)} type="button"><Plus />Add part</button>
                    </article>
                  ))}
                </div>
              ) : null}
              {repairAssistantChecks.length ? (
                <div className={styles.fitmentChecklist} aria-label="Fitment checks">
                  {repairAssistantChecks.map((rule) => <span key={rule}><ClipboardCheck />{rule}</span>)}
                </div>
              ) : null}
            </section>
          ) : null}

          <div className={styles.categoryLinks} aria-label="Repair category shortcuts">
            {repairTaxonomy.map((system) => <button aria-current={system.id === activeSystemId} key={system.id} onClick={() => updateActiveSystem(system.id)} type="button">{system.title}</button>)}
          </div>

          <div className={styles.catalogList}>
            <section className={styles.operationGroups} aria-label={normalizedQuery ? "Matching repair groups" : `${activeSystem?.title ?? "Repair"} groups`}>
              {groupedCatalog.length === 0 ? (
                <div className={styles.emptyCatalogResult}>
                  <strong>{mode === "engine" ? "No reliable standard operation yet" : "No repair matches found"}</strong>
                  <span>{mode === "engine" ? "Try a little more detail, such as symptom, side, system, or component: “front brake grinding,” “battery not charging,” or “left control arm clunk.”" : "Try a component, symptom, category, or operation name like “battery,” “control arm,” “brake noise,” or “alignment.”"}</span>
                </div>
              ) : null}
              {groupedCatalog.map((group) => (
                <section className={styles.operationGroup} key={group.id}>
                  <button aria-expanded={visibleGroupId === group.id} className={styles.operationGroupButton} onClick={() => toggleGroup(group.id)} type="button">
                    <span>
                      <strong>{group.title}</strong>
                      <small>{group.description}</small>
                    </span>
                    <b>{visibleGroupId === group.id ? "Hide" : `${group.operations.length} ${mode === "engine" ? "matches" : "fixes"}`}</b>
                  </button>
                  {visibleGroupId === group.id ? (
                    <div className={styles.operationResults}>
                      {group.operations.map((operation) => (
                        <article key={operation.id} role="group">
                          <button className={styles.operationChoice} onClick={() => addLabor(operation)} type="button">
                            <strong>{operation.title}</strong>
                            <small>{operation.included.slice(0, 3).join(", ")}</small>
                            {mode === "engine" && engineCandidatesById.get(operation.id) ? (
                              <small className={styles.matchExplanation}>
                                <b>{displayLabel(engineCandidatesById.get(operation.id)!.confidence)}</b>
                                {engineCandidatesById.get(operation.id)!.reasons.slice(0, 2).join(" · ")}
                              </small>
                            ) : null}
                          </button>
                          <span>{operation.hours.toFixed(1)} hrs</span>
                          <BrakeOperationScope operationId={operation.id} />
                          <SteeringOperationScope operationId={operation.id} />
                          <LightDutyOperationScope operationId={operation.id} />
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </section>
          </div>

          </div>
          <section className={styles.workTray} aria-label="RO work tray">
            <nav>
              {[
                ["selected", `Selected Work ${estimateLabor.length}`],
                ["labor", "Add Labor"],
                ["parts", `Parts ${estimateParts.length}`],
                ["evidence", `Evidence ${evidenceDrafts.length}`],
                ["customer", "Customer / Vehicle"],
                ["notes", "Notes"],
                ["history", "History"],
              ].map(([id, label]) => <button aria-current={workTab === id} key={id} onClick={() => setWorkTab(id as WorkTab)} type="button">{label}</button>)}
            </nav>
            {workTab === "evidence" ? (
              <section className={styles.evidencePanel} aria-label="Repair evidence uploads">
                <div className={styles.evidenceUploader}>
                  <label><span>Evidence type</span><select onChange={(event) => setEvidenceCategory(event.target.value as EvidenceDraft["category"])} value={evidenceCategory}><option value="DIAGNOSTIC_PHOTO">Diagnostic photo</option><option value="REPAIR_PHOTO">Repair photo</option><option value="SCAN_REPORT">Scan report</option><option value="MEASUREMENT">Measurement / test note</option><option value="DOCUMENT">Document</option></select></label>
                  <label><span>Attach to</span><select onChange={(event) => setEvidenceAttachedTo(event.target.value)} value={evidenceAttachedTo}><option value="RO">Entire RO</option>{estimateLabor.map((item) => <option key={item.rowId} value={item.rowId}>{item.title}</option>)}</select></label>
                  <label><span>Visibility</span><select onChange={(event) => setEvidenceAccessLevel(event.target.value as EvidenceDraft["accessLevel"])} value={evidenceAccessLevel}><option value="INTERNAL">Internal only</option><option value="CUSTOMER_VISIBLE">Customer-facing</option></select></label>
                  <label className={styles.evidenceNote}><span>Evidence note</span><textarea onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Example: front right lower control arm bushing torn; photo taken before removal." value={evidenceNote} /></label>
                  <label className={styles.fileDrop}><Plus /><span>Upload photos, videos, scan reports, or documents</span><input multiple onChange={(event) => stageEvidenceFiles(event.target.files)} type="file" /></label>
                </div>
                <div className={styles.evidenceList}>
                  <header><h3>Evidence attached to this RO</h3><small>{selectedRepairOrder?.vehicle.id ? "Ready to upload against checked-in vehicle evidence." : "Check in/select a vehicle to permanently upload evidence."}</small></header>
                  {evidenceDrafts.map((item, index) => <article key={`${item.fileName}-${index}`}><span><strong>{item.fileName}</strong><small>{item.category.replaceAll("_", " ")} · {item.attachedTo} · {item.accessLevel === "CUSTOMER_VISIBLE" ? "Customer-facing" : "Internal only"} · {item.status}</small>{item.note ? <small>{item.note}</small> : null}</span><button aria-label={`Remove ${item.fileName}`} onClick={() => deleteEvidenceDraft(index)} type="button"><Trash2 /></button></article>)}
                  {!evidenceDrafts.length ? <p>No evidence has been added yet. Upload photos, scan reports, measurements, or documents to support the repair recommendation.</p> : null}
                </div>
              </section>
            ) : (
            <>
            <div className={styles.trayGrid}>
              <section>
                <header><h3>Labor</h3><button onClick={() => setWorkTab("labor")} type="button"><Plus />Add labor</button></header>
                <table><tbody>{estimateLabor.map((item, index) => editingLaborRowId === item.rowId ? (
                  <tr className={styles.editingLaborRow} key={item.rowId}>
                    <td>{index + 1}</td>
                    <td>
                      <label>Repair<input onChange={(event) => setLaborDraft((current) => ({ ...current, title: event.target.value }))} value={laborDraft.title} /></label>
                      <label>Notes / included work<textarea onChange={(event) => setLaborDraft((current) => ({ ...current, included: event.target.value }))} value={laborDraft.included} /></label>
                    </td>
                    <td><label>Hours<input inputMode="decimal" onChange={(event) => setLaborDraft((current) => ({ ...current, hours: event.target.value }))} value={laborDraft.hours} /></label></td>
                    <td><button onClick={() => saveLaborEdit(item.rowId)} type="button"><Check />Save</button><button onClick={cancelLaborEdit} type="button"><X />Cancel</button></td>
                  </tr>
                ) : <tr key={item.rowId}><td>{index + 1}</td><td>{item.title}<small>{item.included.slice(0, 2).join(" · ")}{item.source === "POLICY_REQUIRED" ? " · Required by repair policy" : ""}</small></td><td>{item.hours.toFixed(1)} hrs</td><td>{item.source === "POLICY_REQUIRED" ? <span className={styles.lockedPart}>Required</span> : <><button aria-label={`Edit ${item.title}`} onClick={() => startLaborEdit(item)} type="button"><Edit3 /></button><button aria-label={`Delete ${item.title}`} onClick={() => deleteLabor(item.rowId)} type="button"><Trash2 /></button></>}</td></tr>)}</tbody></table>
              </section>
              <section>
                <header><h3>Parts</h3><button onClick={addManualPart} type="button"><Plus />Add manual part</button></header>
                <table><thead><tr><th>Part</th><th>Qty</th><th>Retail</th><th>Total</th><th>Actions</th></tr></thead><tbody>{estimateParts.map((part) => editingPartId === part.id ? (
                  <tr className={styles.editingPartRow} key={part.id}>
                    <td colSpan={5}>
                      <section className={styles.partEditor} data-part-editor>
                        <header><div><h4>Edit estimate part</h4><p>Update the retail charge and quantity before this line is sent to the estimate or parts workflow.</p></div><span>{partSourceLabel(part)}</span></header>
                        <div className={styles.partEditorFields}>
                          <label>Description<input aria-label={`Part description for ${part.name}`} onChange={(event) => setPartDraft((current) => ({ ...current, name: event.target.value }))} value={partDraft.name} /></label>
                          <label>Part #<input aria-label={`Part number for ${part.name}`} onChange={(event) => setPartDraft((current) => ({ ...current, number: event.target.value }))} value={partDraft.number} /></label>
                          <label>Quantity<input aria-label={`Quantity for ${part.name}`} inputMode="numeric" min="1" onChange={(event) => setPartDraft((current) => ({ ...current, quantity: event.target.value }))} type="number" value={partDraft.quantity} /></label>
                          <label>Retail unit price<input aria-label={`Retail unit price for ${part.name}`} inputMode="decimal" min="0" onChange={(event) => setPartDraft((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="Enter retail price" step="0.01" type="number" value={partDraft.unitPrice} /></label>
                        </div>
                        <footer><strong>Estimate line total: {partDraft.unitPrice && Number.isFinite(Number(partDraft.unitPrice)) ? money((Number(partDraft.quantity) || 0) * Number(partDraft.unitPrice)) : "Quote needed"}</strong><div><button onClick={() => savePartEdit(part.id)} type="button"><Check />Save changes</button><button onClick={cancelPartEdit} type="button"><X />Cancel</button></div></footer>
                      </section>
                    </td>
                  </tr>
                ) : <tr key={part.id}><td>{part.name}<small>{part.number} · {partSourceLabel(part)}</small></td><td>{part.quantity}</td><td>{part.pricingStatus === "PRICE_PENDING" ? "Quote needed" : money(part.unitPrice)}</td><td>{part.pricingStatus === "PRICE_PENDING" ? "Quote needed" : money(part.quantity * part.unitPrice)}</td><td><button aria-label={`Edit ${part.name} price and quantity`} onClick={() => startPartEdit(part)} type="button"><Edit3 /></button>{part.source === "POLICY_REQUIRED" ? <span className={styles.lockedPart}>Required</span> : <button aria-label={`Delete ${part.name}`} onClick={() => deletePart(part.id)} type="button"><Trash2 /></button>}</td></tr>)}</tbody></table>
                {partsCatalogBusy ? <p className={styles.partsCatalogStatus}>Matching labor to parts catalog...</p> : null}
              </section>
            </div>
            {estimatePolicy.readinessCodes.length ? (
              <section className={styles.estimatePolicyCard} aria-label="Estimate parts and tax policy">
                <header><div><h3>Estimate Parts & Tax Policy</h3><p>{estimatePolicy.version}</p></div></header>
                <div>
                  {estimatePolicy.readinessCodes.map((code) => <span key={code}>{displayLabel(code)}</span>)}
                </div>
                <p>{estimatePolicy.tax.taxSummary}</p>
              </section>
            ) : null}
            <section className={styles.suggestedAddOns} aria-label="Automatic suggested add-ons">
              <header><div><h3>Automatic Suggested Add-Ons</h3><p>Based on selected labor lines and common verification steps.</p></div></header>
              <div>
                {suggestedAddOns.map((item) => <article key={item.id}><span><strong>{item.label}</strong><small>{item.hours.toFixed(1)} hrs</small></span><button onClick={() => acceptSuggestedAddOn(item.id)} type="button"><Plus />Add</button></article>)}
                {!suggestedAddOns.length ? <p className={styles.emptySuggestion}>No additional automatic add-ons are available for the selected work.</p> : null}
              </div>
            </section>
            </>
            )}
          </section>
        </main>

        {!connectedExplorer && <aside className={styles.reviewPanel} aria-label="Estimate and repair order preview">
          <button className={styles.collapseReview} onClick={() => setReviewOpen((current) => !current)} type="button"><ChevronLeft />{reviewOpen ? "Collapse" : "Open preview"}</button>
          {reviewOpen ? (
            <>
              <div className={styles.previewHero}>
                <span>Estimate / RO Preview</span>
                <h2>Live estimate preview</h2>
                <strong>{money(total)}</strong>
                <small>{totalWorkLines ? `${totalWorkLines} line${totalWorkLines === 1 ? "" : "s"} ready for review` : "Add labor or parts to build the estimate"}</small>
              </div>
              <dl>
                <div><dt>Labor</dt><dd>{totalHours.toFixed(1)} hrs</dd></div>
                <div><dt>Labor retail</dt><dd>{money(laborTotal)}</dd></div>
                <div><dt>Parts</dt><dd>{money(partsTotal)}</dd></div>
                <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
                <div><dt>MN taxable parts</dt><dd>{money(estimatePolicy.tax.taxablePartsCents / 100)}</dd></div>
                <div><dt>Tax</dt><dd>{money(taxAndSupplies)}</dd></div>
                <div className={styles.total}><dt>Total</dt><dd>{money(total)}</dd></div>
              </dl>
              <button aria-describedby="create-estimate-help" className={styles.createRo} disabled={busy} onClick={revealEstimateGuide} type="button">Return to estimate worksheet</button>
              <p className={styles.createEstimateHint} id="create-estimate-help">{createEstimateReason}</p>
              <section className={styles.assignmentCard} aria-label="Technician assignment handoff">
                <header>
                  <div>
                    <h3>Technician delegation</h3>
                    <p>Route this repair order to the responsible technician and continue in the repair workbench assignment controls.</p>
                  </div>
                  <UserRound />
                </header>
                <dl>
                  <div><dt>Repair order</dt><dd>{selectedRepairOrder?.repairOrderNumber ?? "Select RO first"}</dd></div>
                  <div><dt>Vehicle</dt><dd>{contextVehicle ?? "Vehicle pending"}</dd></div>
                </dl>
                <Link className={styles.assignTechnicianLink} href={assignTechnicianHref}>Assign Technician</Link>
              </section>
              <section className={styles.partsOrderingCard} aria-label="Parts ordering workflow">
                <header>
                  <div>
                    <h3>Parts needed for this repair</h3>
                    <p>Open the Parts Ordering Workspace to order and document the actual vendor, source, and cost.</p>
                  </div>
                  <span>{partsNeedCount} item{partsNeedCount === 1 ? "" : "s"}</span>
                </header>
                <div className={styles.partsOrderingStats}>
                  <article><Package /><span><strong>{estimateParts.length}</strong><small>part lines</small></span></article>
                  <article><ShoppingCart /><span><strong>{policyRequiredCount}</strong><small>policy-required</small></span></article>
                  <article><ScanBarcode /><span><strong>{pendingPricingCount}</strong><small>pricing / sourcing pending</small></span></article>
                </div>
                <div className={styles.partsNeededList}>
                  {estimateParts.length ? estimateParts.slice(0, 5).map((part) => <article key={`review-${part.id}`}><span><strong>{part.name}</strong><small>{part.number} · Qty {part.quantity} · {partSourceLabel(part)}</small></span><em>{part.pricingStatus === "PRICE_PENDING" ? "Quote needed" : money(part.quantity * part.unitPrice)}</em></article>) : <p>No parts have been added yet. Select labor or add manual parts to create demand.</p>}
                </div>
                <div className={styles.partsOrderingActions}>
                  <Link className={styles.primaryPartsLink} href={partsWorkspaceHref}>Open Parts Ordering Workflow</Link>
                  <button className={styles.secondaryReview} disabled={busy || !selectedRepairOrder} onClick={() => void syncPartDemands()} type="button">Sync parts demand to RO</button>
                </div>
                <ul className={styles.partsOrderingTrail}>
                  <li>Open Parts Ordering Workflow is where staff actually log what part was ordered, from where, and at what cost.</li>
                  <li>Sync parts demand to RO preserves the repair-order demand record.</li>
                  <li>Receiving match confirms the right part before repair begins.</li>
                </ul>
              </section>
              <Link className={styles.secondaryReview} href={officialEstimateHref}>Preview preliminary quote</Link>
              <Link className={styles.secondaryReview} href={advisorReviewHref}>Advisor review</Link>
              <section className={styles.historyCard}>
                <h3>Customer / Vehicle Context</h3>
                <p><span>{selectedRepairOrder ? "This is a new blank estimate. Prior estimate lines are not carried into this RO." : "Select a repair order to begin. No previous estimate is loaded."}</span></p>
              </section>
            </>
          ) : null}
        </aside>}
      </div>
      </details></div>
    </DiagnosticWorkspace>
    </>
  );
}
