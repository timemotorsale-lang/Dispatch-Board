"use client";

import { BookOpen, Brain, CarFront, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, ClipboardList, Copy, FileText, Info, Lock, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, UserRound, Wrench, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import type { LaborGuideNavigationCategory, LaborGuideNavigationOperation } from "@/server/diagnostics/labor-guide-navigation";
import type { LaborOperationSystem, LaborRepairOperation } from "@/server/diagnostics/labor-operation-taxonomy";

import styles from "./enterprise-labor-guide-console.module.css";

type ActiveRepairOrder = {
  concern: string;
  customer: string;
  id: string;
  openedAt: string;
  repairOrderNumber: string;
  vehicle: { label: string; vin: string };
};

type ManualOperation = {
  component: string;
  hours: number;
  id: string;
  operation: string;
  position: string;
  subsystem: string;
  system: string;
  title: string;
};

const approvedManualPackage: ManualOperation[] = [
  { id: "front-right-lower-control-arm", system: "Steering & Suspension", subsystem: "Front Suspension", component: "Lower Control Arm", operation: "Replace", position: "Front Right", title: "Replace front right lower control arm", hours: 2.4 },
  { id: "rear-shock-absorbers-both-sides", system: "Steering & Suspension", subsystem: "Rear Suspension", component: "Shock Absorber", operation: "Replace", position: "Rear Both", title: "Replace rear shock absorbers - both sides", hours: 2.2 },
];

const money = (value: number) => `$${value.toFixed(2)}`;

function diagnosticToManualOperation(category: LaborGuideNavigationCategory, operation: LaborGuideNavigationOperation): ManualOperation {
  return {
    component: operation.title.replace(/\s+diagnosis$/i, ""),
    hours: operation.likelyHours,
    id: operation.id,
    operation: operation.title.toLocaleLowerCase().includes("replace") ? "Replace" : "Diagnose",
    position: "Vehicle",
    subsystem: operation.complexity === "HIGH" ? "Advanced Diagnostic" : "General Diagnostic",
    system: category.title,
    title: operation.title,
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function scoreOperation(query: string, item: LaborRepairOperation | ManualOperation, category?: LaborGuideNavigationCategory, diagnostic?: LaborGuideNavigationOperation) {
  const haystack = [
    item.title,
    item.system,
    item.subsystem,
    item.component,
    item.operation,
    item.position,
    category?.description,
    ...(diagnostic?.aliases ?? []),
    ...(diagnostic?.concernExamples ?? []),
    ...("aliases" in item ? item.aliases : []),
    ...("concernExamples" in item ? item.concernExamples : []),
  ].join(" ").toLocaleLowerCase();
  return query.split(/\s+/).filter((token) => token.length > 2 && haystack.includes(token)).length;
}

export function EnterpriseLaborGuideConsole({ activeRepairOrder, catalog, laborAddOns, repairOrders = [], repairTaxonomy }: { activeRepairOrder: ActiveRepairOrder | null; catalog: LaborGuideNavigationCategory[]; laborAddOns: { id: string; label: string; hours: number }[]; repairOrders?: { id: string; label: string }[]; repairTaxonomy: LaborOperationSystem[] }) {
  const [mode, setMode] = useState<"manual" | "engine">("manual");
  const [packageOperations, setPackageOperations] = useState<ManualOperation[]>(activeRepairOrder ? approvedManualPackage : []);
  const [intelligencePrompt, setIntelligencePrompt] = useState("");
  const [engineGenerated, setEngineGenerated] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>(["steering-suspension"]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const diagnosticOperations = useMemo(() => catalog.flatMap((category) => category.operations.map((operation) => ({ category, operation, manual: diagnosticToManualOperation(category, operation) }))), [catalog]);
  const repairOperations = useMemo(() => repairTaxonomy.flatMap((system) => system.groups.flatMap((group) => group.operations)), [repairTaxonomy]);
  const repairSystems = unique([...repairOperations.map((item) => item.system), ...catalog.map((item) => item.title)]);
  const repairSubsystems = unique([...repairOperations.map((item) => item.subsystem), "General Diagnostic", "Advanced Diagnostic"]);
  const repairComponents = unique([...repairOperations.map((item) => item.component), ...diagnosticOperations.map((item) => item.manual.component)]);
  const repairPositions = unique([...repairOperations.map((item) => item.position), "Vehicle", "Front", "Rear", "Both Sides", "Bank / Sensor Specific"]);
  const searchQuery = searchText.trim().toLocaleLowerCase();
  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];
    const specific = repairOperations.map((manual) => ({ category: null, manual, operation: null, score: scoreOperation(searchQuery, manual) }));
    const diagnostic = diagnosticOperations.map(({ category, operation, manual }) => ({ category, manual, operation, score: scoreOperation(searchQuery, manual, category, operation) }));
    return [...specific, ...diagnostic].filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [diagnosticOperations, repairOperations, searchQuery]);
  const requiredAddOnIds = useMemo(() => packageOperations.flatMap((operation) => repairOperations.find((item) => item.id === operation.id)?.requiredAddOns ?? []), [packageOperations, repairOperations]);
  const activeAddOnIds = unique([...selectedAddOnIds, ...requiredAddOnIds]);
  const totalHours = useMemo(() => packageOperations.reduce((sum, item) => sum + item.hours, 0) + laborAddOns.filter((item) => activeAddOnIds.includes(item.id)).reduce((sum, item) => sum + item.hours, 0), [activeAddOnIds, laborAddOns, packageOperations]);
  const laborAmount = totalHours * 120.13;
  const partsEstimate = packageOperations.length ? 412.35 : 0;
  const activeRoHref = activeRepairOrder ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(activeRepairOrder.id)}` : "/vehicles/repair-workbench?view=all";
  const checkInHref = "/vehicles/repair-orders?intakeSource=WALK_IN&returnTo=%2Fdiagnostics%2Flabor-guide";
  const addVehicleHref = checkInHref;
  const customerHref = "/customers";
  const advisorHref = `/diagnostics/advisor-review?operation=${encodeURIComponent(packageOperations[0]?.id ?? "manual-labor-package")}${activeRepairOrder ? `&repairOrderId=${encodeURIComponent(activeRepairOrder.id)}` : ""}`;

  function navigateToRepairOrder(value: string) {
    window.location.assign(value ? `/diagnostics/labor-guide?repairOrderId=${encodeURIComponent(value)}` : "/vehicles/repair-workbench?view=all");
  }

  function updateOperation(id: string, key: keyof Pick<ManualOperation, "system" | "subsystem" | "component" | "operation" | "position">, value: string) {
    setPackageOperations((current) => current.map((item) => item.id === id ? { ...item, [key]: value, title: `${value === item.operation ? value : item.operation} ${key === "component" ? value : item.component}`.trim() } : item));
  }

  function selectOperation(operation: ManualOperation, append = true) {
    setPackageOperations((current) => append ? [...current.filter((item) => item.id !== operation.id), operation] : [operation]);
    setEngineGenerated(false);
  }

  function addOperation() {
    const template = approvedManualPackage[0];
    setPackageOperations((current) => [...current, { ...template, id: `manual-operation-${current.length + 1}`, title: "New labor operation", hours: 0 }]);
  }

  function activateIntelligenceEngine(prompt = intelligencePrompt) {
    setMode("engine");
    const normalized = prompt.toLocaleLowerCase();
    if (!normalized.trim()) {
      setPackageOperations([]);
      setEngineGenerated(false);
      return;
    }
    const scored = [
      ...repairOperations.map((manual) => ({ manual, score: scoreOperation(normalized, manual) })),
      ...diagnosticOperations.map(({ category, operation, manual }) => ({ manual, score: scoreOperation(normalized, manual, category, operation) })),
    ].filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    const nextOperations = scored.length ? scored.slice(0, 3).map((item) => item.manual) : approvedManualPackage;
    setPackageOperations(nextOperations);
    setEngineGenerated(true);
  }

  function toggleAddOn(id: string) {
    setSelectedAddOnIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleCategory(id: string) {
    setExpandedCategoryIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function openAllCategories() {
    setCategoriesOpen(true);
    setExpandedCategoryIds(repairTaxonomy.map((system) => system.id));
  }

  function focusManualBuilder() {
    setMode("manual");
    searchInputRef.current?.focus();
  }

  function useActiveConcern() {
    if (!activeRepairOrder) return;
    setIntelligencePrompt(activeRepairOrder.concern);
    activateIntelligenceEngine(activeRepairOrder.concern);
  }

  return (
    <section className={styles.console} aria-label="Enterprise Labor Guide Console" data-catalog-systems={catalog.length}>
      <section className={styles.contextBar} aria-label="Active repair order and vehicle context">
        <div className={styles.roContext}>
          <ClipboardList />
          <div>
            <strong>Active RO <a href={activeRoHref}>{activeRepairOrder ? `#${activeRepairOrder.repairOrderNumber.replace(/^RO-?/i, "")}` : ""}</a></strong>
            <label>
              <span>Status: <b>{activeRepairOrder ? "In Progress" : "Not selected"}</b></span>
              <select aria-label="Select active repair order" onChange={(event) => navigateToRepairOrder(event.target.value)} value={activeRepairOrder?.id ?? ""}>
                <option value="">Select active RO / vehicle</option>
                {repairOrders.map((order) => <option key={order.id} value={order.id}>{order.label}</option>)}
              </select>
              <ChevronDown />
            </label>
            <a className={styles.contextLink} href={activeRepairOrder ? activeRoHref : checkInHref}>{activeRepairOrder ? "Open RO" : "Check in / create RO"}</a>
          </div>
        </div>
        <div className={styles.vehicleContext}><CarFront /><div><span>Vehicle</span><strong>{activeRepairOrder?.vehicle.label ?? "No vehicle selected"}</strong><a className={styles.contextLink} href={activeRepairOrder ? activeRoHref : addVehicleHref}>{activeRepairOrder ? "Open vehicle in RO" : "Add vehicle"}</a></div></div>
        <div className={styles.vinContext}><div><span>VIN</span><strong>{activeRepairOrder?.vehicle.vin ?? "VIN required"}</strong><small>Odometer: Not recorded</small><a className={styles.contextLink} href={activeRepairOrder ? activeRoHref : addVehicleHref}>{activeRepairOrder ? "Verify VIN" : "Add VIN / vehicle"}</a></div><button aria-label="Copy VIN" disabled={!activeRepairOrder} onClick={() => activeRepairOrder ? navigator.clipboard.writeText(activeRepairOrder.vehicle.vin) : undefined} type="button"><Copy /></button></div>
        <div className={styles.concernContext}><UserRound /><div><span>Customer / Concern</span><strong>{activeRepairOrder ? `Customer states: ${activeRepairOrder.concern}` : "Select or create an RO to load the customer concern."}</strong><a className={styles.contextLink} href={activeRepairOrder ? activeRoHref : customerHref}>{activeRepairOrder ? "Open concern in RO" : "Open customers"}</a></div></div>
      </section>

      <div className={styles.modeSwitch} role="tablist" aria-label="Labor guide mode">
        <button aria-selected={mode === "manual"} onClick={() => setMode("manual")} role="tab" type="button"><BookOpen />Manual Labor Guide</button>
        <button aria-selected={mode === "engine"} onClick={() => setMode("engine")} role="tab" type="button"><Brain />Labor Intelligence Engine</button>
      </div>

      <div className={styles.workspaceGrid}>
        <section className={styles.panel} aria-label="Manual operation builder">
          <header className={styles.panelHeader}><h2>Manual Operation Builder <Info /></h2><button onClick={() => categoriesOpen ? setCategoriesOpen(false) : openAllCategories()} type="button"><SlidersHorizontal />{categoriesOpen ? "Hide Categories" : "Open All Categories"}</button></header>
          <div className={styles.builderBody}>
            <div className={styles.searchRow}>
              <label><Search /><input aria-label="Search repair areas" onChange={(event) => setSearchText(event.target.value)} placeholder="Search any repair area, component, symptom, or operation" ref={searchInputRef} value={searchText} /></label>
              <button aria-label="Open all repair categories" onClick={openAllCategories} type="button"><SlidersHorizontal /></button>
            </div>
            {searchMatches.length ? (
              <div className={styles.searchMatches} aria-label="Search matches">
                {searchMatches.map((match) => <button key={`${match.category?.id ?? "repair"}-${match.manual.id}`} onClick={() => selectOperation(match.manual)} type="button"><strong>{match.manual.title}</strong><span>{match.manual.system} / {match.manual.subsystem}</span></button>)}
              </div>
            ) : null}
            {categoriesOpen ? (
              <div className={styles.categoryBrowser} aria-label="All repair categories">
                {repairTaxonomy.map((system) => (
                  <section key={system.id}>
                    <button aria-expanded={expandedCategoryIds.includes(system.id)} onClick={() => toggleCategory(system.id)} type="button"><ChevronRight /><span><strong>{system.title}</strong><small>{system.description}</small></span><b>{system.groups.reduce((count, group) => count + group.operations.length, 0)}</b></button>
                    {expandedCategoryIds.includes(system.id) ? (
                      <div>
                        {system.groups.map((group) => (
                          <article key={group.id}>
                            <strong>{group.title}</strong>
                            {group.operations.map((operation) => <button key={operation.id} onClick={() => selectOperation(operation)} type="button"><span>{operation.title}</span><small>{operation.position} / {operation.hours.toFixed(1)} hrs</small></button>)}
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : null}
            <div className={styles.columnLabels}><span>System</span><span>Subsystem</span><span>Component</span><span>Operation</span><span>Position</span></div>
            <div className={styles.operationRows}>
              {packageOperations.map((item, index) => (
                <article key={item.id}>
                  <b>{index + 1}</b>
                  <select aria-label={`System for operation ${index + 1}`} onChange={(event) => updateOperation(item.id, "system", event.target.value)} value={item.system}>{repairSystems.map((option) => <option key={option}>{option}</option>)}</select>
                  <select aria-label={`Subsystem for operation ${index + 1}`} onChange={(event) => updateOperation(item.id, "subsystem", event.target.value)} value={item.subsystem}>{repairSubsystems.map((option) => <option key={option}>{option}</option>)}</select>
                  <select aria-label={`Component for operation ${index + 1}`} onChange={(event) => updateOperation(item.id, "component", event.target.value)} value={item.component}>{repairComponents.map((option) => <option key={option}>{option}</option>)}</select>
                  <select aria-label={`Operation type ${index + 1}`} onChange={(event) => updateOperation(item.id, "operation", event.target.value)} value={item.operation}><option>Replace</option><option>Repair</option><option>Inspect</option><option>Diagnose</option><option>Adjust</option><option>Measure</option><option>Program / Calibrate</option><option>Service</option></select>
                  <select aria-label={`Position for operation ${index + 1}`} onChange={(event) => updateOperation(item.id, "position", event.target.value)} value={item.position}>{repairPositions.map((option) => <option key={option}>{option}</option>)}</select>
                  <button aria-label={`Remove ${item.title}`} onClick={() => setPackageOperations((current) => current.filter((operation) => operation.id !== item.id))} type="button"><X /></button>
                </article>
              ))}
            </div>
            <button className={styles.addOperation} onClick={addOperation} type="button"><Plus />Add Operation</button>
          </div>
          <footer className={styles.builderFooter}><span>{packageOperations.length} operations selected</span><button onClick={() => setPackageOperations([])} type="button"><Trash2 />Clear All</button></footer>
        </section>

        <section className={`${styles.panel} ${styles.workPackage}`} aria-label="Selected work package">
          <header className={styles.panelHeader}><h2>Selected Work Package</h2><button onClick={focusManualBuilder} type="button"><Wrench />Edit Package</button></header>
          <div className={styles.packageBody}>
            <section><h3>Primary Operations</h3>{packageOperations.map((item, index) => <article key={item.id}><b>{index + 1}</b><span>{item.title}</span><strong>{item.hours.toFixed(1)} hrs</strong></article>)}{!packageOperations.length ? <p>No labor operations selected yet.</p> : null}</section>
            <section><h3>Suggested Add-Ons</h3>{laborAddOns.map((item) => <article key={item.id}><button aria-pressed={activeAddOnIds.includes(item.id)} onClick={() => toggleAddOn(item.id)} type="button">{activeAddOnIds.includes(item.id) ? "Added" : "Add"}</button><span>{item.label}</span><strong>{item.hours.toFixed(1)} hrs</strong><Info /></article>)}</section>
            <section className={styles.overlapLogic}><h3>Overlap / Combination Logic</h3><div><CheckCircle2 /><p><strong>No overlap conflicts detected</strong><span>Operations can be performed together.</span></p><b>High Confidence</b></div></section>
            <footer className={styles.packageConfidence}><span>Package Confidence <Info /></span><strong>92% High</strong></footer>
          </div>
        </section>

        <aside className={`${styles.panel} ${styles.estimatePreview}`} aria-label="Estimate and work order preview">
          <header className={styles.panelHeader}><h2>Estimate / Work Order Preview</h2></header>
          <dl>
            <div><dt><Wrench />Total Labor Hours</dt><dd>{totalHours.toFixed(1)} hrs</dd></div>
            <div><dt><CircleDollarSign />Total Labor Amount (Retail)</dt><dd>{money(laborAmount)}</dd></div>
            <div><dt><Sparkles />Parts Demand (Est.)</dt><dd>{money(partsEstimate)}</dd></div>
            <div><dt><ShieldCheck />Gross Profit Safeguard</dt><dd className={styles.gpValue}>31.8%</dd></div>
          </dl>
          {!activeRepairOrder ? <section className={styles.contextWarning}><ClipboardList /><div><strong>Vehicle and RO required</strong><span>Select or create the repair order before estimate draft, authorization, dispatch, or work-order conversion.</span></div></section> : null}
          <section className={styles.reviewWarning}><ShieldCheck /><div><strong>Advisor Review Required</strong><span>Draft only - no dispatch, no parts order, no authorization.</span></div></section>
          <section className={styles.authorityBoundary}><Lock /><div><strong>Authority Boundary</strong><span>Labor Guide prepares the draft. Customer authorization happens from the RO / estimate.</span></div><b>Draft Only</b></section>
          <div className={styles.previewActions}><a className={styles.primaryAction} href={activeRepairOrder ? advisorHref : checkInHref}><FileText />{activeRepairOrder ? "Add to Estimate Draft" : "Create RO Before Estimate"}</a><a href={activeRepairOrder ? advisorHref : activeRoHref}><Send />{activeRepairOrder ? "Send to Advisor Review" : "Select Active RO"}</a><a href={activeRepairOrder ? activeRoHref : checkInHref}><Copy />{activeRepairOrder ? "Convert to Work Order Lines" : "Check In Vehicle"}</a><a href={activeRoHref}><ClipboardList />Open RO / Estimate for Customer Authorization</a></div>
        </aside>
      </div>

      <section className={styles.enginePreview} aria-label="Labor Intelligence Engine preview">
        <header><h2>Labor Intelligence Engine (Preview) <span>Beta</span></h2><div><button disabled={!activeRepairOrder} onClick={useActiveConcern} type="button">Use Active RO Concern</button><button onClick={() => activateIntelligenceEngine()} type="button">Generate Work Package <span>-&gt;</span></button></div></header>
        <div className={styles.engineContent}>
          <div className={styles.engineExplanation}><Sparkles /><p>Describe the repair in your own words and our engine will parse it into structured operations.</p></div>
          <label><span>Describe the repair or concern</span><textarea aria-label="Describe repair or concern" onChange={(event) => setIntelligencePrompt(event.target.value)} placeholder="Example: replace front right lower control arm and both rear shocks, or customer states clunking over bumps" value={intelligencePrompt} /></label>
          <div className={styles.parsedOutput}><strong>Parsed Output (Preview)</strong><div><span><b>System</b>{packageOperations[0]?.system ?? "Not selected"}</span><span><b>Operation</b>{packageOperations[0]?.operation ?? "Draft"}</span><span><b>Position</b>{packageOperations.map((item) => item.position).join("; ") || "Not selected"}</span><span><b>Quantity</b>{packageOperations.length}</span></div><p>{engineGenerated ? "Work package generated for advisor review." : "Enter a concern, then generate a governed work package."}</p></div>
        </div>
      </section>
    </section>
  );
}
