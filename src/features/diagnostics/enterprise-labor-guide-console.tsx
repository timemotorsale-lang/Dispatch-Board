"use client";

import { BookOpen, Brain, CarFront, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, ClipboardList, Copy, FileText, Info, Lock, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, UserRound, Wrench, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import type { LaborGuideNavigationCategory, LaborGuideNavigationOperation } from "@/server/diagnostics/labor-guide-navigation";

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

type SpecificRepairOperation = ManualOperation & {
  aliases: string[];
  concernExamples: string[];
};

const approvedManualPackage: ManualOperation[] = [
  { id: "front-right-lower-control-arm", system: "Suspension & Steering", subsystem: "Front Suspension", component: "Lower Control Arm", operation: "Replace", position: "Front Right", title: "Replace front right lower control arm", hours: 2.4 },
  { id: "rear-shock-absorbers-both-sides", system: "Suspension & Steering", subsystem: "Rear Suspension", component: "Shock Absorber", operation: "Replace", position: "Rear Both", title: "Replace rear shock absorbers - both sides", hours: 2.2 },
];

const specificRepairOperations: SpecificRepairOperation[] = [
  { ...approvedManualPackage[0], aliases: ["control arm", "lower arm", "front end clunk"], concernExamples: ["Clunking noise over bumps", "Loose front wheel feel"] },
  { ...approvedManualPackage[1], aliases: ["rear shock", "shock absorber", "bouncy rear", "rear suspension"], concernExamples: ["Rear feels bouncy over bumps", "Rear suspension noise"] },
  { id: "front-strut-assembly", system: "Suspension & Steering", subsystem: "Front Suspension", component: "Strut Assembly", operation: "Replace", position: "Front Both", title: "Replace front strut assemblies - both sides", hours: 3.4, aliases: ["strut", "front struts", "front suspension bounce"], concernExamples: ["Front bounce", "Strut leaking"] },
  { id: "front-brake-pads-rotors", system: "Brakes, ABS & Stability", subsystem: "Front Brakes", component: "Pads & Rotors", operation: "Replace", position: "Front Both", title: "Replace front brake pads and rotors", hours: 2.1, aliases: ["front brakes", "brake pads", "rotors", "grinding"], concernExamples: ["Grinding when braking", "Brake pulsation"] },
  { id: "rear-brake-pads-rotors", system: "Brakes, ABS & Stability", subsystem: "Rear Brakes", component: "Pads & Rotors", operation: "Replace", position: "Rear Both", title: "Replace rear brake pads and rotors", hours: 2.0, aliases: ["rear brakes", "rear pads", "rear rotors"], concernExamples: ["Rear brake grinding", "Parking brake drag"] },
  { id: "alternator-replacement", system: "Starting & Charging", subsystem: "Charging System", component: "Alternator", operation: "Replace", position: "Engine Bay", title: "Replace alternator assembly", hours: 2.1, aliases: ["alternator", "generator", "battery light"], concernExamples: ["Battery lamp on", "Repeated dead battery"] },
  { id: "starter-replacement", system: "Starting & Charging", subsystem: "Starting System", component: "Starter Motor", operation: "Replace", position: "Engine Bay", title: "Replace starter motor", hours: 1.8, aliases: ["starter", "no crank", "click"], concernExamples: ["Click and no crank", "Intermittent no start"] },
  { id: "water-pump-replacement", system: "Cooling System", subsystem: "Coolant Pumping", component: "Water Pump", operation: "Replace", position: "Engine Bay", title: "Replace water pump", hours: 3.2, aliases: ["water pump", "coolant leak", "overheat"], concernExamples: ["Coolant leak", "Overheating"] },
  { id: "radiator-replacement", system: "Cooling System", subsystem: "Heat Exchanger", component: "Radiator", operation: "Replace", position: "Front", title: "Replace radiator assembly", hours: 2.6, aliases: ["radiator", "coolant leak", "overheat"], concernExamples: ["Radiator leaking", "Temperature warning"] },
  { id: "ac-compressor-replacement", system: "HVAC & Climate Control", subsystem: "A/C Refrigerant", component: "Compressor", operation: "Replace", position: "Engine Bay", title: "Replace A/C compressor", hours: 2.8, aliases: ["ac compressor", "a/c not cold", "compressor"], concernExamples: ["A/C not cold", "Compressor noise"] },
  { id: "wheel-bearing-front", system: "Wheels, Tires & TPMS", subsystem: "Wheel Bearing", component: "Hub Bearing", operation: "Replace", position: "Front", title: "Replace front wheel bearing / hub assembly", hours: 1.9, aliases: ["wheel bearing", "hub", "humming"], concernExamples: ["Humming noise at speed", "Wheel play"] },
  { id: "oxygen-sensor-replacement", system: "Emissions & Exhaust", subsystem: "Oxygen Sensing", component: "Oxygen Sensor", operation: "Replace", position: "Bank / Sensor Specific", title: "Replace oxygen sensor", hours: 1.0, aliases: ["oxygen sensor", "o2 sensor", "p013"], concernExamples: ["Check engine light", "Fuel trim fault"] },
];

const addOns = [
  { id: "alignment", label: "Alignment recommended", hours: 1.2 },
  { id: "road-test", label: "Road test", hours: 0.3 },
  { id: "torque-verification", label: "Torque verification", hours: 0.2 },
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

function scoreOperation(query: string, item: SpecificRepairOperation | ManualOperation, category?: LaborGuideNavigationCategory, diagnostic?: LaborGuideNavigationOperation) {
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

export function EnterpriseLaborGuideConsole({ activeRepairOrder, catalog, repairOrders = [] }: { activeRepairOrder: ActiveRepairOrder | null; catalog: LaborGuideNavigationCategory[]; repairOrders?: { id: string; label: string }[] }) {
  const [mode, setMode] = useState<"manual" | "engine">("manual");
  const [packageOperations, setPackageOperations] = useState<ManualOperation[]>(approvedManualPackage);
  const [intelligencePrompt, setIntelligencePrompt] = useState("Replace front right lower control arm and both rear shocks");
  const [engineGenerated, setEngineGenerated] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>(["steering-suspension"]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const diagnosticOperations = useMemo(() => catalog.flatMap((category) => category.operations.map((operation) => ({ category, operation, manual: diagnosticToManualOperation(category, operation) }))), [catalog]);
  const repairSystems = unique([...specificRepairOperations.map((item) => item.system), ...catalog.map((item) => item.title)]);
  const repairSubsystems = unique([...specificRepairOperations.map((item) => item.subsystem), "General Diagnostic", "Advanced Diagnostic"]);
  const repairComponents = unique([...specificRepairOperations.map((item) => item.component), ...diagnosticOperations.map((item) => item.manual.component)]);
  const repairPositions = unique([...specificRepairOperations.map((item) => item.position), "Vehicle", "Front", "Rear", "Both Sides", "Bank / Sensor Specific"]);
  const searchQuery = searchText.trim().toLocaleLowerCase();
  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];
    const specific = specificRepairOperations.map((manual) => ({ category: null, manual, operation: null, score: scoreOperation(searchQuery, manual) }));
    const diagnostic = diagnosticOperations.map(({ category, operation, manual }) => ({ category, manual, operation, score: scoreOperation(searchQuery, manual, category, operation) }));
    return [...specific, ...diagnostic].filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [diagnosticOperations, searchQuery]);
  const totalHours = useMemo(() => packageOperations.reduce((sum, item) => sum + item.hours, 0) + addOns.filter((item) => selectedAddOnIds.includes(item.id)).reduce((sum, item) => sum + item.hours, 0), [packageOperations, selectedAddOnIds]);
  const laborAmount = totalHours * 120.13;
  const partsEstimate = packageOperations.length ? 412.35 : 0;
  const activeRoHref = activeRepairOrder ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(activeRepairOrder.id)}` : "/vehicles/repair-workbench?view=all";
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
    const scored = [
      ...specificRepairOperations.map((manual) => ({ manual, score: scoreOperation(normalized, manual) })),
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
          </div>
        </div>
        <div className={styles.vehicleContext}><CarFront /><div><span>Vehicle</span><strong>{activeRepairOrder?.vehicle.label ?? "No vehicle selected"}</strong></div></div>
        <div className={styles.vinContext}><div><span>VIN</span><strong>{activeRepairOrder?.vehicle.vin ?? "VIN required"}</strong><small>Odometer: Not recorded</small></div><button aria-label="Copy VIN" disabled={!activeRepairOrder} onClick={() => activeRepairOrder ? navigator.clipboard.writeText(activeRepairOrder.vehicle.vin) : undefined} type="button"><Copy /></button></div>
        <div className={styles.concernContext}><UserRound /><div><span>Customer / Concern</span><strong>{activeRepairOrder ? `Customer states: ${activeRepairOrder.concern}` : "Select an active RO to load the customer concern."}</strong></div></div>
      </section>

      <div className={styles.modeSwitch} role="tablist" aria-label="Labor guide mode">
        <button aria-selected={mode === "manual"} onClick={() => setMode("manual")} role="tab" type="button"><BookOpen />Manual Labor Guide</button>
        <button aria-selected={mode === "engine"} onClick={() => setMode("engine")} role="tab" type="button"><Brain />Labor Intelligence Engine</button>
      </div>

      <div className={styles.workspaceGrid}>
        <section className={styles.panel} aria-label="Manual operation builder">
          <header className={styles.panelHeader}><h2>Manual Operation Builder <Info /></h2><button onClick={() => setCategoriesOpen((current) => !current)} type="button"><SlidersHorizontal />{categoriesOpen ? "Hide Categories" : "Open All Categories"}</button></header>
          <div className={styles.builderBody}>
            <div className={styles.searchRow}>
              <label><Search /><input aria-label="Search repair areas" onChange={(event) => setSearchText(event.target.value)} placeholder="Search any repair area, component, symptom, or operation" ref={searchInputRef} value={searchText} /></label>
              <button aria-label="Open all repair categories" onClick={() => setCategoriesOpen(true)} type="button"><SlidersHorizontal /></button>
            </div>
            {searchMatches.length ? (
              <div className={styles.searchMatches} aria-label="Search matches">
                {searchMatches.map((match) => <button key={`${match.category?.id ?? "repair"}-${match.manual.id}`} onClick={() => selectOperation(match.manual)} type="button"><strong>{match.manual.title}</strong><span>{match.manual.system} / {match.manual.subsystem}</span></button>)}
              </div>
            ) : null}
            {categoriesOpen ? (
              <div className={styles.categoryBrowser} aria-label="All repair categories">
                {catalog.map((category) => (
                  <section key={category.id}>
                    <button aria-expanded={expandedCategoryIds.includes(category.id)} onClick={() => toggleCategory(category.id)} type="button"><ChevronRight /><span><strong>{category.title}</strong><small>{category.description}</small></span><b>{category.operations.length}</b></button>
                    {expandedCategoryIds.includes(category.id) ? (
                      <div>
                        {category.operations.map((operation) => {
                          const manual = diagnosticToManualOperation(category, operation);
                          return <button key={operation.id} onClick={() => selectOperation(manual)} type="button"><span>{manual.title}</span><small>{operation.complexity} / {manual.hours.toFixed(1)} hrs</small></button>;
                        })}
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
                  <select aria-label={`Operation type ${index + 1}`} onChange={(event) => updateOperation(item.id, "operation", event.target.value)} value={item.operation}><option>Replace</option><option>Inspect</option><option>Diagnose</option><option>Adjust</option><option>Measure</option><option>Program / Calibrate</option></select>
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
            <section><h3>Suggested Add-Ons</h3>{addOns.map((item) => <article key={item.id}><button aria-pressed={selectedAddOnIds.includes(item.id)} onClick={() => toggleAddOn(item.id)} type="button">{selectedAddOnIds.includes(item.id) ? "Added" : "Add"}</button><span>{item.label}</span><strong>{item.hours.toFixed(1)} hrs</strong><Info /></article>)}</section>
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
          <section className={styles.reviewWarning}><ShieldCheck /><div><strong>Advisor Review Required</strong><span>Draft only - no dispatch, no parts order, no authorization.</span></div></section>
          <section className={styles.authorityBoundary}><Lock /><div><strong>Authority Boundary</strong><span>Labor Guide prepares the draft. Customer authorization happens from the RO / estimate.</span></div><b>Draft Only</b></section>
          <div className={styles.previewActions}><a className={styles.primaryAction} href={advisorHref}><FileText />Add to Estimate Draft</a><a href={advisorHref}><Send />Send to Advisor Review</a><a href={activeRoHref}><Copy />Convert to Work Order Lines</a><a href={activeRoHref}><ClipboardList />Open RO / Estimate for Customer Authorization</a></div>
        </aside>
      </div>

      <section className={styles.enginePreview} aria-label="Labor Intelligence Engine preview">
        <header><h2>Labor Intelligence Engine (Preview) <span>Beta</span></h2><div><button disabled={!activeRepairOrder} onClick={useActiveConcern} type="button">Use Active RO Concern</button><button onClick={() => activateIntelligenceEngine()} type="button">Generate Work Package <span>-&gt;</span></button></div></header>
        <div className={styles.engineContent}>
          <div className={styles.engineExplanation}><Sparkles /><p>Describe the repair in your own words and our engine will parse it into structured operations.</p></div>
          <label><span>Describe the repair or concern</span><textarea aria-label="Describe repair or concern" onChange={(event) => setIntelligencePrompt(event.target.value)} value={intelligencePrompt} /></label>
          <div className={styles.parsedOutput}><strong>Parsed Output (Preview)</strong><div><span><b>System</b>{packageOperations[0]?.system ?? "Not selected"}</span><span><b>Operation</b>{packageOperations[0]?.operation ?? "Draft"}</span><span><b>Position</b>{packageOperations.map((item) => item.position).join("; ") || "Not selected"}</span><span><b>Quantity</b>{packageOperations.length}</span></div><p>{engineGenerated ? "Work package generated for advisor review." : "Enter a concern, then generate a governed work package."}</p></div>
        </div>
      </section>
    </section>
  );
}
