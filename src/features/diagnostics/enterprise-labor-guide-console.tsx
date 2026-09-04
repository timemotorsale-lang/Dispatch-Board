"use client";

import { BookOpen, Brain, Check, ChevronLeft, Edit3, Grid2X2, List, Package, Plus, ScanBarcode, Search, ShoppingCart, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { evaluateEstimatePartsTaxPolicy, type EstimateRequiredPart } from "@/server/diagnostics/estimate-parts-tax-policy";
import { analyzeLaborLanguage } from "@/server/diagnostics/labor-language-intelligence";
import type { LaborOperationSystem, LaborRepairOperation } from "@/server/diagnostics/labor-operation-taxonomy";
import { evaluateRepairAreaIntelligence, type RepairAreaPartRule } from "@/server/diagnostics/repair-area-intelligence";

import styles from "./enterprise-labor-guide-console.module.css";
import { LaborGuideDetailsForm, emptyLaborGuideDetails, type LaborGuideDetails } from "./labor-guide-details";
import { useWorkspaceDraft } from "./use-workspace-draft";
import { DiagnosticWorkspace } from "./diagnostic-workspace";

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

const laborRate = 129.02;
const commonSuggestedAddOns = [
  { id: "road-test", label: "Road test and repair verification", hours: 0.3 },
  { id: "torque-verification", label: "Torque verification", hours: 0.2 },
  { id: "brake-fluid-service", label: "Brake hydraulic bleed / fluid exchange", hours: 0.8 },
];

const defaultParts: SelectedPart[] = [
  { id: "front-pad-set", laborRowId: "front-brake-pads-rotors", name: "Front brake pad set", number: "B4SA-33-28Z", quantity: 1, source: "AUTO_CATALOG", unitPrice: 128.99 },
  { id: "front-rotor", laborRowId: "front-brake-pads-rotors", name: "Front brake rotor", number: "B45A-33-25XC", quantity: 2, source: "AUTO_CATALOG", unitPrice: 119.95 },
  { id: "caliper-hardware", laborRowId: "brake-caliper-front", name: "Caliper hardware kit", number: "HW13714", quantity: 1, source: "AUTO_CATALOG", unitPrice: 43.46 },
];

const money = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
const displayLabel = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toLocaleUpperCase());
const partsMarkup = 1.35;

function normalizePartsSyncMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to sync parts demand.";
  if (/Parts Operations mutations are not enabled/i.test(message)) {
    return "Live parts-demand sync is still held in rollout. Your labor lines and parts plan remain available here; use the Parts Ordering Workspace to continue the governed workflow.";
  }
  return message;
}

function partSourceLabel(part: SelectedPart) {
  if (part.source === "POLICY_REQUIRED") return part.pricingStatus === "PRICE_PENDING" ? "Required - price pending" : "Required by repair policy";
  if (part.source === "AUTO_CATALOG") return part.pricingStatus === "PRICE_PENDING" ? "Labor guide match - price pending" : "Auto from parts catalog";
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

function encodeOfficialEstimateLines(labor: SelectedLabor[], parts: SelectedPart[]) {
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

export function EnterpriseLaborGuideConsole({ activeRepairOrder, initialMode = "manual", initialQuery = "", initialSelectedWork = "empty", initialWorkTab = "selected", repairTaxonomy, returnLabel, returnTo }: { activeRepairOrder: ActiveRepairOrder | null; catalog: unknown[]; initialMode?: "manual" | "engine"; initialQuery?: string; initialSelectedWork?: "empty" | "starter" | "transmission"; initialWorkTab?: WorkTab; laborAddOns: unknown[]; repairOrders?: { id: string; label: string }[]; repairTaxonomy: LaborOperationSystem[]; returnLabel?: string; returnTo?: string }) {
  const allOperations = useMemo(() => repairTaxonomy.flatMap((system) => system.groups.flatMap((group) => group.operations)), [repairTaxonomy]);
  const brakeStarter = allOperations.filter((operation) => ["front-brake-pads-rotors", "brake-caliper-front"].includes(operation.id));
  const transmissionStarter = allOperations.filter((operation) => operation.id === "transmission-remove-install");
  const [mode, setMode] = useState<"manual" | "engine">(initialMode);
  const [activeSystemId, setActiveSystemId] = useState(repairTaxonomy.find((system) => system.id === "brakes")?.id ?? repairTaxonomy[0]?.id ?? "");
  const [query, setQuery] = useState(initialQuery);
  const [enginePrompt, setEnginePrompt] = useState("");
  const [analyzedEnginePrompt, setAnalyzedEnginePrompt] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const [openGroupId, setOpenGroupId] = useState<string>("");
  const [workTab, setWorkTab] = useState<WorkTab>(initialWorkTab);
  const [selectedLabor, setSelectedLabor] = useState<SelectedLabor[]>(initialSelectedWork === "empty" ? [] : (initialSelectedWork === "transmission" ? transmissionStarter : brakeStarter).map((operation) => ({ ...operation, rowId: operation.id })));
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>(initialSelectedWork === "starter" ? defaultParts : []);
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
  const [selectedRepairOrder, setSelectedRepairOrder] = useState<ActiveRepairOrder | null>(activeRepairOrder);
  const [manualDetails, setManualDetails] = useState<LaborGuideDetails>(emptyLaborGuideDetails);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const contextCustomer = selectedRepairOrder?.customer ?? (manualDetails.customer || undefined);
  const contextVehicle = selectedRepairOrder?.vehicle.label ?? (manualDetails.vehicle || undefined);
  const contextVin = selectedRepairOrder?.vehicle.vin ?? (manualDetails.vin || undefined);
  const contextConcern = selectedRepairOrder?.concern ?? (manualDetails.concern || undefined);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [partsCatalogBusy, setPartsCatalogBusy] = useState(false);
  const [estimateAttempt, setEstimateAttempt] = useState<{ fingerprint: string; body: Record<string, unknown> } | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<RepairOrderLookup | null>(null);
  const workspaceContent = useMemo(() => ({ ro: selectedRepairOrder, manual: manualDetails, labor: selectedLabor, parts: selectedParts, evidence: evidenceDrafts, attempt: estimateAttempt }), [selectedRepairOrder, manualDetails, selectedLabor, selectedParts, evidenceDrafts, estimateAttempt]);
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
    return scoped.filter((operation) => matchesRepairText(operation, normalizedQuery));
  }, [activeSystem, allOperations, engineAnalysis, mode, normalizedQuery]);
  const repairAreaOperations = selectedLabor.length ? selectedLabor : catalogOperations.slice(0, 3);
  const repairAreaQuery = selectedLabor.length ? selectedLabor.map((operation) => operation.title).join(" ") : normalizedQuery || enginePrompt || activeSystem?.title;
  const repairAreaIntelligence = useMemo(
    () => evaluateRepairAreaIntelligence({ query: repairAreaQuery, operations: repairAreaOperations }),
    [repairAreaOperations, repairAreaQuery]
  );
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

  const estimatePolicy = useMemo(() => evaluateEstimatePartsTaxPolicy({ labor: selectedLabor, parts: selectedParts }), [selectedLabor, selectedParts]);
  const estimateLabor = useMemo(() => [
    ...selectedLabor,
    ...allOperations
      .filter((operation) => estimatePolicy.requiredAddOnIds.includes(operation.id) && !selectedLabor.some((item) => item.id === operation.id))
      .map((operation) => ({ ...operation, rowId: operation.id, source: "POLICY_REQUIRED" as const }))
  ], [allOperations, estimatePolicy.requiredAddOnIds, selectedLabor]);
  const totalHours = estimateLabor.reduce((sum, item) => sum + item.hours, 0);
  const laborTotal = totalHours * laborRate;
  const estimateParts = useMemo(() => [
    ...selectedParts,
    ...estimatePolicy.missingRequiredParts.map(requiredPartToSelectedPart)
  ], [estimatePolicy.missingRequiredParts, selectedParts]);
  const partsTotal = estimateParts.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const subtotal = laborTotal + partsTotal;
  const taxAndSupplies = estimatePolicy.tax.taxCents / 100;
  const total = subtotal + taxAndSupplies;
  const laborGuideReturnTo = selectedRepairOrder ? `/diagnostics/labor-guide?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}` : "/diagnostics/labor-guide";
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
    lines: encodeOfficialEstimateLines(estimateLabor, estimateParts),
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
  const partsNeedCount = estimateParts.reduce((sum, item) => sum + item.quantity, 0);
  const pendingPricingCount = estimateParts.filter((item) => item.pricingStatus === "PRICE_PENDING" || item.unitPrice === 0).length;
  const policyRequiredCount = estimateParts.filter((item) => item.source === "POLICY_REQUIRED").length;
  const canCreateEstimate = Boolean(selectedRepairOrder) && Boolean(selectedLabor.length || selectedParts.length);
  const createEstimateReason = !selectedRepairOrder
    ? "Select the repair order shown in the customer and vehicle lookup before creating this estimate."
    : !selectedLabor.length && !selectedParts.length
      ? "Add at least one labor or part line before creating this estimate."
      : "Creates the official estimate document and opens print and repair-workbench actions.";
  const suggestedAddOns = useMemo(() => {
    return commonSuggestedAddOns.filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index && !acceptedAddOnIds.includes(item.id) && !estimatePolicy.requiredAddOnIds.includes(item.id)).slice(0, 4);
  }, [acceptedAddOnIds, estimatePolicy.requiredAddOnIds]);

  useEffect(() => {
    const query = lookupQuery.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (query.length < 2) {
        setLookupResults([]);
        return;
      }
      fetch(`/api/repair-orders?query=${encodeURIComponent(query)}&pageSize=6`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Repair-order lookup failed.")))
        .then((body: { items?: RepairOrderLookup[] }) => setLookupResults(body.items ?? []))
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setLookupResults([]);
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
    setSelectedLabor((current) => current.some((item) => item.id === operation.id) ? current : [...current, { ...operation, rowId: operation.id }]);
    setWorkTab("selected");
    void autoAddCatalogParts(operation);
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

  function openCatalogView(nextView: "list" | "board") {
    setView(nextView);
    setOpenGroupId((current) => current || groupedCatalog[0]?.id || "");
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
    setPendingSwitch(order);
  }

  function applyRepairOrder(order: RepairOrderLookup) {
    draft.adopt();
    setEstimateAttempt(null);
    setManualDetails(emptyLaborGuideDetails);
    clearEstimateWorkspace();
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
    setNotice(`Loaded ${order.repairOrderNumber} for estimate work.`);
    setPendingSwitch(null);
  }

  async function request<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body.error ?? "Request failed."), { status: response.status });
    return body as T;
  }

  async function autoAddCatalogParts(operation: LaborRepairOperation) {
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
      unitPriceCents: Math.round(item.hours * laborRate * 100),
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
      unitPriceCents: Math.round(part.unitPrice * 100),
      workTypeCode: "PART",
    })),
  ], [estimateLabor, estimateParts]);

  async function presentEstimate() {
    if (!selectedRepairOrder) {
      setNotice("Select or create an active repair order before presenting an estimate.");
      return;
    }
    if (!selectedLabor.length && !selectedParts.length) {
      setNotice("Add at least one labor or part line before presenting an estimate.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const presentedAt = new Date();
      const expiresAt = new Date(presentedAt.getTime() + 7 * 86_400_000);
      const taxCents = estimatePolicy.tax.taxCents;
      const fingerprint = JSON.stringify({ ro: selectedRepairOrder.id, lineItems, taxCents });
      const planning = estimateAttempt?.fingerprint === fingerprint ? null : await request<{ version: number }>(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/planning`);
      const attempt = estimateAttempt?.fingerprint === fingerprint ? estimateAttempt : { fingerprint, body: {
          expectedVersion: planning!.version,
          action: "PRESENT_ESTIMATE",
          assumptions: "Prepared from selected labor catalog operations and manual parts in the RO creation workspace.",
          discountCents: 0,
          expiresAt: expiresAt.toISOString(),
          idempotencyKey: crypto.randomUUID(),
          lineItems,
          optionGroups: [],
          presentationChannel: "INTERNAL",
          presentedAt: presentedAt.toISOString(),
          reason: "Present governed estimate from RO creation workspace selected labor and parts.",
          taxBoundary: estimatePolicy.tax.taxSummary,
          taxCents,
        } };
      setEstimateAttempt(attempt);
      if (!await draft.save({ ...workspaceContent, attempt })) throw new Error("Save the draft successfully before presenting this estimate.");
      const result = await request<{ result?: { id?: string; estimateVersion?: number; totalCents?: number } }>(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/planning`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(attempt.body),
      });
      setNotice(`Estimate presented${result.result?.estimateVersion ? ` as version ${result.result.estimateVersion}` : ""}. Opening the official estimate document.`);
      if (!result.result?.id) throw new Error("Estimate response was incomplete. Retry to retrieve the same estimate; do not create a second one.");
      window.location.assign(`/repair-estimate?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}&estimateId=${encodeURIComponent(result.result.id)}&returnTo=${encodeURIComponent(laborGuideReturnTo)}`);
    } catch (error) {
      // A definite rejection can start a fresh attempt after the prerequisite is corrected.
      // Network failures and uncertain server errors retain the saved retry identity.
      if (error instanceof Error && "status" in error && ([400, 401, 403].includes(Number(error.status)) || (error.status === 409 && error.message.startsWith("Expected version")))) setEstimateAttempt(null);
      setNotice(error instanceof Error ? error.message : "Unable to present estimate.");
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
            repairJobReference: estimateLabor.find((item) => item.rowId === part.laborRowId)?.title ?? null,
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
    <DiagnosticWorkspace vehicle={contextVehicle} customer={contextCustomer} vin={contextVin} concern={contextConcern} repairOrderId={selectedRepairOrder?.id} repairOrderNumber={selectedRepairOrder?.repairOrderNumber} onSave={draft.save} onFindDrafts={() => draft.refresh().catch(error => setNotice(error.message))} saveStatus={draft.status} returnTo={returnTo} returnLabel={returnLabel} feedback={notice ? <div className={styles.notice} role="status">{notice}</div> : null} tools={<>
      <section className={styles.lookupBand} aria-label="Draft protection">
        <button disabled={draft.saving || busy} onClick={() => void draft.save()} type="button">Save preliminary quote</button>
        <button disabled={draft.saving || busy} onClick={() => void draft.refresh().catch(error => setNotice(error.message))} type="button">Find saved drafts</button>
        {draft.status.includes("another session") ? <button disabled={draft.saving || busy} onClick={() => void draft.saveCopy()} type="button">Save my changes as a separate draft</button> : null}
        <span>A preliminary quote is not a confirmed diagnosis or repair authorization.</span>
      </section>
      {draft.draftsLoaded && !draft.drafts.length ? <p role="status">No saved quotes yet. Add vehicle details or estimate lines, then choose Save quote.</p> : null}
      {draft.drafts.length ? <section className={styles.lookupResults} aria-label="Saved drafts">{draft.drafts.map(saved => <button key={saved.id} disabled={busy || draft.saving} onClick={async () => {
        if (!await draft.save()) return;
        try {
          const latest = (await draft.refresh()).find(item => item.id === saved.id);
          if (!latest) throw new Error("That draft is no longer available in the recent drafts list.");
          const value = latest.content;
          draft.adopt(latest); setSelectedRepairOrder(value.ro); setManualDetails(value.manual); setSelectedLabor(value.labor); setSelectedParts(value.parts); setEvidenceDrafts(value.evidence); setEstimateAttempt(value.attempt);
          setNotice(`Resumed ${latest.title}.`);
        } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to resume draft."); }
      }} type="button">Resume {saved.title}</button>)}</section> : null}
      {pendingSwitch ? <section className={styles.notice} role="region" aria-label="Confirm vehicle switch">
        <span>Switch to {pendingSwitch.repairOrderNumber}? Choose what to do with your current draft.</span>
        <button disabled={draft.saving} type="button" onClick={async () => { if (await draft.save()) applyRepairOrder(pendingSwitch); }}>Save and switch</button>
        <button disabled={draft.saving} type="button" onClick={() => applyRepairOrder(pendingSwitch)}>Discard unsaved changes and switch</button>
        <button disabled={draft.saving} type="button" onClick={() => setPendingSwitch(null)}>Cancel</button>
      </section> : null}

      <section className={styles.lookupBand} aria-label="Customer and vehicle lookup">
        <label className={styles.lookupSearch}>
          <Search />
          <input onChange={(event) => setLookupQuery(event.target.value)} placeholder="Search customer, phone, VIN, plate, vehicle, or RO number" value={lookupQuery} />
        </label>
        <button disabled={Boolean(selectedRepairOrder)} onClick={() => setDetailsOpen(!detailsOpen)} type="button"><Edit3 />Vehicle & customer details</button>
        <Link href="/vehicles/repair-orders?intakeSource=WALK_IN&returnTo=%2Fdiagnostics%2Flabor-guide"><Plus />Check in vehicle</Link>
      </section>
      {detailsOpen && !selectedRepairOrder ? <LaborGuideDetailsForm value={manualDetails} onApply={value => { setManualDetails(value); setDetailsOpen(false); setNotice("Vehicle and customer details applied to this page. No repair order or check-in was created."); }} onCancel={() => setDetailsOpen(false)} /> : null}
      {lookupResults.length ? <section className={styles.lookupResults} aria-label="Repair order lookup results">{lookupResults.map((order) => <button key={order.id} onClick={() => selectRepairOrder(order)} type="button"><strong>{order.repairOrderNumber}</strong><span>{order.customer?.displayName ?? "Internal"} · {[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber}</span><small>{order.serviceVisit.concernSummary}</small></button>)}</section> : null}

      </>}>
      <div className={styles.console} aria-label="Estimate editor">
      <div className={styles.modeTabs} role="tablist" aria-label="RO creation mode">
        <button aria-selected={mode === "manual"} onClick={() => setMode("manual")} role="tab" type="button"><BookOpen />Manual Labor Guide</button>
        <button aria-selected={mode === "engine"} onClick={() => setMode("engine")} role="tab" type="button"><Brain />Labor Intelligence Engine</button>
      </div>

      <div className={`${styles.workspaceShell} ${reviewOpen ? "" : styles.reviewCollapsed} ${editingPartId ? styles.editingWorkspace : ""}`}>
        <main className={styles.catalogWorkspace}>
          <div className={styles.catalogHeader}>
            <div>
              <h2>{mode === "manual" ? "Complete Repair Catalog" : "Labor Intelligence Engine"}</h2>
              <p>{mode === "manual" ? "Search and add any available repair category, operation, labor line, or manual part." : "Start with the concern, then accept, edit, or remove generated labor lines."}</p>
            </div>
            <div className={styles.viewToggle}>
              <button aria-pressed={view === "list"} onClick={() => openCatalogView("list")} type="button"><List />List</button>
              <button aria-pressed={view === "board"} onClick={() => openCatalogView("board")} type="button"><Grid2X2 />Board</button>
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

          {repairAreaIntelligence.activeRulePack ? (
            <section className={styles.repairAreaIntelligence} aria-label="Repair area intelligence">
              <header>
                <div>
                  <span>{repairAreaIntelligence.activeRulePack.domain}</span>
                  <h3>{repairAreaIntelligence.activeRulePack.title}</h3>
                  <p>{repairAreaIntelligence.summary}</p>
                </div>
                <small>{repairAreaIntelligence.version} · {displayLabel(repairAreaIntelligence.confidence)}</small>
              </header>
              <div className={styles.assemblyMap} aria-label={`${repairAreaIntelligence.activeRulePack.title} assembly map`}>
                {repairAreaIntelligence.activeRulePack.assembly.map((node) => (
                  <article data-zone={node.zone} key={node.id}>
                    <strong>{node.label}</strong>
                    <small>{node.description}</small>
                  </article>
                ))}
              </div>
              <div className={styles.areaRuleGrid}>
                <section>
                  <h4>Estimate Labor Rules</h4>
                  {repairAreaIntelligence.activeRulePack.laborRules.map((rule) => (
                    <p key={`${rule.title}-${rule.requirement}`}><b>{rule.requirement}</b><span>{rule.title}</span><small>{rule.hours == null ? "Review time" : `${rule.hours.toFixed(1)} hrs`} · {rule.reason}</small></p>
                  ))}
                </section>
                <section>
                  <h4>OEM Parts Map</h4>
                  {repairAreaIntelligence.activeRulePack.partRules.slice(0, 6).map((part) => (
                    <p key={`${part.oemPartNumber}-${part.description}`}>
                      <b>{part.requirement}</b>
                      <span>{part.description}</span>
                      <small>{part.oemPartNumber} · Qty {part.quantity} · {part.fitmentBasis}</small>
                      <button onClick={() => addRepairAreaPart(part)} type="button"><Plus />Add</button>
                    </p>
                  ))}
                </section>
              </div>
              <div className={styles.areaChecks}>
                {[...repairAreaIntelligence.activeRulePack.fitmentRules, ...repairAreaIntelligence.activeRulePack.calibrationRules, ...repairAreaIntelligence.activeRulePack.refinishRules].slice(0, 6).map((rule) => <span key={rule}>{rule}</span>)}
              </div>
            </section>
          ) : null}

          <div className={styles.categoryLinks} aria-label="Repair category shortcuts">
            {repairTaxonomy.map((system) => <button aria-current={system.id === activeSystemId} key={system.id} onClick={() => updateActiveSystem(system.id)} type="button">{system.title}</button>)}
          </div>

          <div className={view === "list" ? styles.catalogList : styles.catalogBoard}>
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
                      {group.operations.slice(0, view === "list" ? 12 : 8).map((operation) => (
                        <article key={operation.id} onDoubleClick={() => addLabor(operation)} role="group">
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
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </section>
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

        <aside className={styles.reviewPanel} aria-label="Estimate and repair order preview">
          <button className={styles.collapseReview} onClick={() => setReviewOpen((current) => !current)} type="button"><ChevronLeft />{reviewOpen ? "Collapse" : "Open preview"}</button>
          {reviewOpen ? (
            <>
              <h2>Estimate / RO Preview</h2>
              <dl>
                <div><dt>Labor</dt><dd>{totalHours.toFixed(1)} hrs</dd></div>
                <div><dt>Labor retail</dt><dd>{money(laborTotal)}</dd></div>
                <div><dt>Parts</dt><dd>{money(partsTotal)}</dd></div>
                <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
                <div><dt>MN taxable parts</dt><dd>{money(estimatePolicy.tax.taxablePartsCents / 100)}</dd></div>
                <div><dt>Tax</dt><dd>{money(taxAndSupplies)}</dd></div>
                <div className={styles.total}><dt>Total</dt><dd>{money(total)}</dd></div>
                <div><dt>Gross profit</dt><dd className={styles.good}>{estimateLabor.length || estimateParts.length ? "31.8%" : "—"}</dd></div>
              </dl>
              <button aria-describedby="create-estimate-help" className={styles.createRo} disabled={busy || !canCreateEstimate} onClick={() => void presentEstimate()} type="button">{busy ? "Creating estimate..." : canCreateEstimate ? "Create & Open Official Estimate" : "Repair order required"}</button>
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
              <Link className={styles.secondaryReview} href={`/diagnostics/advisor-review${selectedRepairOrder ? `?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}` : ""}`}>Advisor review</Link>
              <section className={styles.historyCard}>
                <h3>Customer / Vehicle Context</h3>
                <p><span>{selectedRepairOrder ? "This is a new blank estimate. Prior estimate lines are not carried into this RO." : "Select a repair order to begin. No previous estimate is loaded."}</span></p>
              </section>
            </>
          ) : null}
        </aside>
      </div>
      </div>
    </DiagnosticWorkspace>
  );
}
