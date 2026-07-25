"use client";

import { BookOpen, Brain, CarFront, Check, ChevronLeft, ClipboardList, Edit3, Grid2X2, History, List, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { analyzeLaborLanguage } from "@/server/diagnostics/labor-language-intelligence";
import type { LaborOperationSystem, LaborRepairOperation } from "@/server/diagnostics/labor-operation-taxonomy";

import styles from "./enterprise-labor-guide-console.module.css";

type ActiveRepairOrder = {
  concern: string;
  customer: string;
  id: string;
  openedAt: string;
  repairOrderNumber: string;
  vehicle: { id?: string; label: string; vin: string };
};

type SelectedLabor = LaborRepairOperation & { rowId: string };
type LaborDraft = { hours: string; included: string; title: string };

type SelectedPart = {
  catalogPartId?: string;
  id: string;
  laborRowId: string;
  name: string;
  number: string;
  quantity: number;
  source?: "AUTO_CATALOG" | "MANUAL";
  unitPrice: number;
};

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
type PlanningDetail = RepairOrderLookup & {
  diagnosisVersions: Array<{ id: string; version: number }>;
  estimateVersions: Array<{ id: string; totalCents: number; version: number }>;
  location: { id: string; name: string };
  ownerUser: { id: string; name: string };
};
type PartsWorkspacePart = { description: string; id: string; partNumber: string; standardCostCents?: number };

const laborRate = 129.02;
const commonSuggestedAddOns = [
  { id: "road-test", label: "Road test and brake noise verification", hours: 0.3 },
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

export function EnterpriseLaborGuideConsole({ activeRepairOrder, initialMode = "manual", initialSelectedWork = "starter", initialWorkTab = "selected", repairTaxonomy }: { activeRepairOrder: ActiveRepairOrder | null; catalog: unknown[]; initialMode?: "manual" | "engine"; initialSelectedWork?: "empty" | "starter"; initialWorkTab?: WorkTab; laborAddOns: unknown[]; repairOrders?: { id: string; label: string }[]; repairTaxonomy: LaborOperationSystem[] }) {
  const allOperations = useMemo(() => repairTaxonomy.flatMap((system) => system.groups.flatMap((group) => group.operations)), [repairTaxonomy]);
  const brakeStarter = allOperations.filter((operation) => ["front-brake-pads-rotors", "brake-caliper-front"].includes(operation.id));
  const [mode, setMode] = useState<"manual" | "engine">(initialMode);
  const [activeSystemId, setActiveSystemId] = useState(repairTaxonomy.find((system) => system.id === "brakes")?.id ?? repairTaxonomy[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [enginePrompt, setEnginePrompt] = useState("");
  const [analyzedEnginePrompt, setAnalyzedEnginePrompt] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const [openGroupId, setOpenGroupId] = useState<string>("");
  const [workTab, setWorkTab] = useState<WorkTab>(initialWorkTab);
  const [selectedLabor, setSelectedLabor] = useState<SelectedLabor[]>(initialSelectedWork === "empty" ? [] : brakeStarter.map((operation) => ({ ...operation, rowId: operation.id })));
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>(initialSelectedWork === "empty" ? [] : defaultParts);
  const [evidenceDrafts, setEvidenceDrafts] = useState<EvidenceDraft[]>([]);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceCategory, setEvidenceCategory] = useState<EvidenceDraft["category"]>("DIAGNOSTIC_PHOTO");
  const [evidenceAccessLevel, setEvidenceAccessLevel] = useState<EvidenceDraft["accessLevel"]>("INTERNAL");
  const [evidenceAttachedTo, setEvidenceAttachedTo] = useState("RO");
  const [editingLaborRowId, setEditingLaborRowId] = useState("");
  const [laborDraft, setLaborDraft] = useState<LaborDraft>({ hours: "", included: "", title: "" });
  const [acceptedAddOnIds, setAcceptedAddOnIds] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<RepairOrderLookup[]>([]);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState<ActiveRepairOrder | null>(activeRepairOrder);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [partsCatalogBusy, setPartsCatalogBusy] = useState(false);

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

  const totalHours = selectedLabor.reduce((sum, item) => sum + item.hours, 0);
  const laborTotal = totalHours * laborRate;
  const partsTotal = selectedParts.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const subtotal = laborTotal + partsTotal;
  const taxAndSupplies = subtotal > 0 ? subtotal * 0.08 + 55.45 : 0;
  const total = subtotal + taxAndSupplies;
  const activeRoHref = selectedRepairOrder ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}` : "/vehicles/repair-workbench?view=all";
  const suggestedAddOns = useMemo(() => {
    const requiredIds = new Set(selectedLabor.flatMap((item) => item.requiredAddOns));
    const required = allOperations.filter((operation) => requiredIds.has(operation.id)).map((operation) => ({ id: operation.id, label: operation.title, hours: operation.hours }));
    return [...required, ...commonSuggestedAddOns].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index && !acceptedAddOnIds.includes(item.id)).slice(0, 4);
  }, [acceptedAddOnIds, allOperations, selectedLabor]);

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
    setSelectedParts((current) => [...current, { id: `manual-part-${current.length + 1}`, laborRowId: selectedLabor[0]?.rowId ?? "manual", name: "Manual part", number: "Enter part #", quantity: 1, source: "MANUAL", unitPrice: 0 }]);
    setWorkTab("parts");
  }

  function editPart(id: string) {
    setSelectedParts((current) => current.map((part) => part.id === id ? { ...part, quantity: part.quantity + 1 } : part));
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

  function selectRepairOrder(order: RepairOrderLookup) {
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
  }

  async function request<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Request failed.");
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
      const additions = matches.slice(0, 3).map((part) => ({
        catalogPartId: part.id,
        id: `${operation.id}-${part.id}`,
        laborRowId: operation.id,
        name: part.description,
        number: part.partNumber,
        quantity: quantityForPart(operation, part),
        source: "AUTO_CATALOG" as const,
        unitPrice: Number((((part.standardCostCents ?? 0) / 100) * partsMarkup).toFixed(2)),
      }));
      if (!additions.length) return;
      setSelectedParts((current) => {
        const existing = new Set(current.map((part) => `${part.laborRowId}:${part.catalogPartId ?? part.number}`));
        return [...current, ...additions.filter((part) => !existing.has(`${part.laborRowId}:${part.catalogPartId ?? part.number}`))];
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load matching parts from the catalog.");
    } finally {
      setPartsCatalogBusy(false);
    }
  }

  const lineKey = (prefix: string, id: string) => `${prefix}-${id.replace(/[^a-z0-9-]/gi, "-").toLocaleLowerCase()}`;
  const lineItems = useMemo(() => [
    ...selectedLabor.map((item) => ({
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
    ...selectedParts.map((part) => ({
      description: `${part.name} (${part.number})`,
      key: lineKey("part", part.id),
      laborGuideMinutes: 0,
      plannedCorrection: `Supply ${part.name}`,
      quantity: part.quantity,
      taxable: true,
      type: "PART" as const,
      unitPriceCents: Math.round(part.unitPrice * 100),
      workTypeCode: "PART",
    })),
  ], [selectedLabor, selectedParts]);

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
      const detail = await request<PlanningDetail>(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/planning`);
      const now = new Date();
      await request(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/planning`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_DIAGNOSIS",
          cause: selectedRepairOrder.concern || "Customer concern requires repair estimate review.",
          concern: selectedRepairOrder.concern || "Repair concern",
          diagnosedAt: now.toISOString(),
          evidence: ["RO creation workspace selected labor package"],
          idempotencyKey: crypto.randomUUID(),
          proposedCorrection: selectedLabor.map((item) => item.title).join("; ") || "Review selected repair operations.",
          reason: "Record diagnosis context from the RO creation workspace before presenting a governed estimate.",
          recommendation: selectedLabor.map((item) => item.title).join("; ") || "Review selected repair operations.",
          symptoms: [selectedRepairOrder.concern || "Repair concern"],
          technicianUserId: detail.ownerUser.id,
          tests: [{ name: "Advisor estimate workspace review", result: "Labor and parts package prepared for estimate presentation." }],
          uncertainty: "MEDIUM",
        }),
      });
      const presentedAt = new Date();
      const expiresAt = new Date(presentedAt.getTime() + 7 * 86_400_000);
      const taxCents = Math.round(partsTotal * 0.08 * 100);
      const result = await request<{ result?: { estimateVersion?: number; totalCents?: number } }>(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/planning`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
          taxBoundary: "Tax is estimated in the workspace and remains subject to final advisor review.",
          taxCents,
        }),
      });
      setNotice(`Estimate presented${result.result?.estimateVersion ? ` as version ${result.result.estimateVersion}` : ""}.`);
    } catch (error) {
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
      for (const part of selectedParts) {
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
            repairJobReference: selectedLabor.find((item) => item.rowId === part.laborRowId)?.title ?? null,
            requiredAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
            substitutionAllowed: true,
          }),
        });
      }
      setNotice("Parts demand synced to the repair order.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to sync parts demand.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.console} aria-label="RO Creation Workspace">
      <header className={styles.pageHeader}>
        <div>
          <h1>RO Creation Workspace</h1>
          <p>CCC Home / Dispatch Board / Diagnostics / Estimate</p>
        </div>
      </header>

      <section className={styles.lookupBand} aria-label="Customer and vehicle lookup">
        <label className={styles.lookupSearch}>
          <Search />
          <input onChange={(event) => setLookupQuery(event.target.value)} placeholder="Search customer, phone, VIN, plate, vehicle, or RO number" value={lookupQuery} />
        </label>
        <div className={styles.lookupResult}>
          <UserRound />
          <span><strong>{selectedRepairOrder?.customer ?? "Leo James"}</strong><small>(555) 212-5555</small><b>Repeat customer</b></span>
        </div>
        <div className={styles.lookupResult}>
          <CarFront />
          <span><strong>{selectedRepairOrder?.vehicle.label ?? "2010 Mazda 3"}</strong><small>VIN {selectedRepairOrder?.vehicle.vin ?? "JM1BL1SF3A1257561"}</small><small>Plate ABC1234</small></span>
        </div>
        <button type="button"><Check />Use selected</button>
        <Link href="/vehicles/repair-orders?intakeSource=WALK_IN&returnTo=%2Fdiagnostics%2Flabor-guide"><Plus />Check in vehicle</Link>
      </section>
      {lookupResults.length ? <section className={styles.lookupResults} aria-label="Repair order lookup results">{lookupResults.map((order) => <button key={order.id} onClick={() => selectRepairOrder(order)} type="button"><strong>{order.repairOrderNumber}</strong><span>{order.customer?.displayName ?? "Internal"} · {[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber}</span><small>{order.serviceVisit.concernSummary}</small></button>)}</section> : null}
      {notice ? <div className={notice.includes("Unable") || notice.includes("required") || notice.includes("not") ? styles.noticeDanger : styles.notice} role="status">{notice}</div> : null}

      <section className={styles.compactContext} aria-label="Selected RO context">
        <div><ClipboardList /><span>Active RO <Link href={activeRoHref}>#{selectedRepairOrder?.repairOrderNumber.replace(/^RO-?/i, "") ?? "0691C247"}</Link></span></div>
        <div><span>Customer</span><strong>{selectedRepairOrder?.customer ?? "Leo James"}</strong></div>
        <div><span>Vehicle</span><strong>{selectedRepairOrder?.vehicle.label ?? "2010 Mazda 3"}</strong></div>
        <div><span>VIN</span><strong>{selectedRepairOrder?.vehicle.vin ?? "JM1BL1SF3A1257561"}</strong></div>
        <div><span>Concern</span><strong>{selectedRepairOrder?.concern ?? "grinding noise from front passenger brakes"}</strong></div>
        <button type="button"><History />Repair history</button>
      </section>

      <div className={styles.modeTabs} role="tablist" aria-label="RO creation mode">
        <button aria-selected={mode === "manual"} onClick={() => setMode("manual")} role="tab" type="button"><BookOpen />Manual Labor Guide</button>
        <button aria-selected={mode === "engine"} onClick={() => setMode("engine")} role="tab" type="button"><Brain />Labor Intelligence Engine</button>
      </div>

      <div className={`${styles.workspaceShell} ${reviewOpen ? "" : styles.reviewCollapsed}`}>
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
                ["selected", `Selected Work ${selectedLabor.length}`],
                ["labor", "Add Labor"],
                ["parts", `Parts ${selectedParts.length}`],
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
                  <label><span>Attach to</span><select onChange={(event) => setEvidenceAttachedTo(event.target.value)} value={evidenceAttachedTo}><option value="RO">Entire RO</option>{selectedLabor.map((item) => <option key={item.rowId} value={item.rowId}>{item.title}</option>)}</select></label>
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
                <table><tbody>{selectedLabor.map((item, index) => editingLaborRowId === item.rowId ? (
                  <tr className={styles.editingLaborRow} key={item.rowId}>
                    <td>{index + 1}</td>
                    <td>
                      <label>Repair<input onChange={(event) => setLaborDraft((current) => ({ ...current, title: event.target.value }))} value={laborDraft.title} /></label>
                      <label>Notes / included work<textarea onChange={(event) => setLaborDraft((current) => ({ ...current, included: event.target.value }))} value={laborDraft.included} /></label>
                    </td>
                    <td><label>Hours<input inputMode="decimal" onChange={(event) => setLaborDraft((current) => ({ ...current, hours: event.target.value }))} value={laborDraft.hours} /></label></td>
                    <td><button onClick={() => saveLaborEdit(item.rowId)} type="button"><Check />Save</button><button onClick={cancelLaborEdit} type="button"><X />Cancel</button></td>
                  </tr>
                ) : <tr key={item.rowId}><td>{index + 1}</td><td>{item.title}<small>{item.included.slice(0, 2).join(" · ")}</small></td><td>{item.hours.toFixed(1)} hrs</td><td><button aria-label={`Edit ${item.title}`} onClick={() => startLaborEdit(item)} type="button"><Edit3 /></button><button aria-label={`Delete ${item.title}`} onClick={() => deleteLabor(item.rowId)} type="button"><Trash2 /></button></td></tr>)}</tbody></table>
              </section>
              <section>
                <header><h3>Parts</h3><button onClick={addManualPart} type="button"><Plus />Add manual part</button></header>
                <table><tbody>{selectedParts.map((part) => <tr key={part.id}><td>{part.name}<small>{part.number} · {part.source === "AUTO_CATALOG" ? "Auto from parts catalog" : "Manual"}</small></td><td>{part.quantity}</td><td>{money(part.unitPrice)}</td><td>{money(part.quantity * part.unitPrice)}</td><td><button onClick={() => editPart(part.id)} type="button"><Edit3 /></button><button onClick={() => deletePart(part.id)} type="button"><Trash2 /></button></td></tr>)}</tbody></table>
                {partsCatalogBusy ? <p className={styles.partsCatalogStatus}>Matching labor to parts catalog...</p> : null}
              </section>
            </div>
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
                <div><dt>Tax and supplies</dt><dd>{money(taxAndSupplies)}</dd></div>
                <div className={styles.total}><dt>Total</dt><dd>{money(total)}</dd></div>
                <div><dt>Gross profit</dt><dd className={styles.good}>31.8%</dd></div>
              </dl>
              <button className={styles.createRo} disabled={busy} onClick={() => void presentEstimate()} type="button">{busy ? "Saving..." : "Present Estimate"}</button>
              <button className={styles.secondaryReview} disabled={busy || !selectedRepairOrder} onClick={() => void syncPartDemands()} type="button">Sync parts demand</button>
              <Link className={styles.secondaryReview} href={`/diagnostics/advisor-review${selectedRepairOrder ? `?repairOrderId=${encodeURIComponent(selectedRepairOrder.id)}` : ""}`}>Advisor review</Link>
              <section className={styles.historyCard}>
                <h3>Customer / Vehicle Context</h3>
                <p><strong>Previous RO</strong><Link href={activeRoHref}>#0678C112</Link></p>
                <p><strong>Last mileage</strong><span>82,945 mi</span></p>
                <p><strong>Prior brake service</strong><span>Front pads and rotors @ 69,230 mi</span></p>
                <p><strong>Declined work</strong><span>Brake fluid exchange</span></p>
              </section>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
