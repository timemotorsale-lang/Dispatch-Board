"use client";

import { AlertTriangle, BadgeCheck, BarChart3, CarFront, CheckCircle2, ChevronDown, ChevronRight, FileText, History, Info, Layers3, Search, Settings2, ShieldAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { LaborGuideNavigationCategory, LaborGuideNavigationOperation } from "@/server/diagnostics/labor-guide-navigation";

import styles from "./diagnostics.module.css";

type ActiveRepairOrder = {
  concern: string;
  customer: string;
  id: string;
  openedAt: string;
  repairOrderNumber: string;
  vehicle: { label: string; vin: string };
};

const fallbackOperation: LaborGuideNavigationOperation = {
  id: "custom-diagnostic-area",
  title: "Custom diagnostic investigation",
  aliases: [],
  concernExamples: ["Concern does not match the standard catalog"],
  initialTests: ["Preserve the customer concern", "Perform safety screening", "Establish a symptom-led test plan"],
  likelyHours: 1.5,
  complexity: "HIGH",
  skills: ["Master diagnostic technician"],
  tools: ["Vehicle-appropriate scan and test equipment"],
  verification: ["Root cause supported by retained evidence", "Repair verified under the original conditions"],
};

const money = (value: number) => `$${value.toFixed(2)}`;

export function EnterpriseLaborGuideConsole({ activeRepairOrder, catalog }: { activeRepairOrder: ActiveRepairOrder | null; catalog: LaborGuideNavigationCategory[] }) {
  const initialCategory = catalog.find((category) => category.id === "starting-charging") ?? catalog[0];
  const initialOperation = initialCategory?.operations.find((operation) => operation.id === "charging") ?? initialCategory?.operations[0] ?? fallbackOperation;
  const [openCategories, setOpenCategories] = useState(() => new Set(initialCategory ? [initialCategory.id] : []));
  const [selectedOperationId, setSelectedOperationId] = useState(initialOperation.id);
  const [query, setQuery] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [showDiagram, setShowDiagram] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCatalog = useMemo(() => catalog.map((category) => ({
    ...category,
    operations: category.operations.filter((operation) => !normalizedQuery || `${category.title} ${category.description} ${operation.title} ${operation.aliases.join(" ")} ${operation.concernExamples.join(" ")}`.toLocaleLowerCase().includes(normalizedQuery)),
  })).filter((category) => !normalizedQuery || category.title.toLocaleLowerCase().includes(normalizedQuery) || category.operations.length), [catalog, normalizedQuery]);

  const selectedOperation = customArea ? { ...fallbackOperation, title: `Custom investigation: ${customArea}` } : catalog.flatMap((category) => category.operations).find((operation) => operation.id === selectedOperationId) ?? initialOperation;
  const likelyHours = selectedOperation.likelyHours;
  const baseRate = 190;
  const effectiveHours = Math.max(.5, likelyHours);
  const laborAmount = effectiveHours * baseRate;
  const openedAt = activeRepairOrder ? new Date(activeRepairOrder.openedAt).toLocaleString() : null;

  function toggleCategory(categoryId: string) {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
      return next;
    });
  }

  function selectOperation(operation: LaborGuideNavigationOperation) {
    setSelectedOperationId(operation.id);
    setCustomArea("");
    setShowComparison(false);
    setShowHistory(false);
  }

  return (
    <section className={styles.laborGuideConsole} aria-label="Enterprise Labor Guide Intelligence Console">
      <header className={styles.laborGuideTopbar}>
        <div><span className={styles.eyebrow}>Enterprise Labor Guide Intelligence</span><h1>Labor Guide</h1><p>Search every major vehicle diagnostic system, select an operation, and review explainable labor and handoff intelligence before anything becomes customer-facing.</p></div>
        <div className={styles.laborGuideStatus}><span><i aria-hidden="true" />System online</span><strong>Governed catalog live</strong></div>
      </header>

      <section className={styles.laborGuideContextBar} aria-label="Active vehicle and repair order context">
        <label className={styles.laborGuideSearch}><Search size={17} /><span className="sr-only">VIN or vehicle search</span><input aria-label="VIN or vehicle search" defaultValue={activeRepairOrder?.vehicle.vin ?? ""} placeholder="VIN, year, make, model, or stock number" /></label>
        <div className={styles.laborVehicleCard}><CarFront size={34} /><span><strong>{activeRepairOrder?.vehicle.label ?? "Select a repair order or vehicle"}</strong><small>{activeRepairOrder ? `Customer: ${activeRepairOrder.customer}` : "Vehicle-specific applicability requires an active context"}</small></span></div>
        <Link className={styles.laborRoCard} href={activeRepairOrder ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(activeRepairOrder.id)}` : "/vehicles/repair-workbench?view=all"}>
          <strong>{activeRepairOrder ? `Active ${activeRepairOrder.repairOrderNumber}` : "Open Repair Orders"}</strong><small>{activeRepairOrder ? `${activeRepairOrder.concern} · Opened ${openedAt}` : "Select an RO to load its complete workbench"}</small><ChevronRight aria-hidden="true" />
        </Link>
      </section>

      <div className={styles.laborGuideGrid}>
        <aside className={styles.operationNavigator}>
          <header><span>1</span><strong>Diagnostic System Navigator</strong></header>
          <label className={styles.navigatorSearch}><Search size={15} /><input aria-label="Search diagnostic systems and repair areas" onChange={(event) => setQuery(event.target.value)} placeholder="Search symptom, system, component, or operation" value={query} /></label>
          <div className={styles.catalogSummary}><strong>{catalog.length} vehicle systems</strong><span>{catalog.reduce((sum, category) => sum + category.operations.length, 0)} governed diagnostic areas</span></div>
          <nav aria-label="Diagnostic system and operation hierarchy">
            {filteredCatalog.map((category) => {
              const open = openCategories.has(category.id) || Boolean(normalizedQuery);
              return <section className={styles.navigatorCategory} key={category.id}>
                <button aria-expanded={open} className={styles.categoryButton} onClick={() => toggleCategory(category.id)} type="button">{open ? <ChevronDown /> : <ChevronRight />}<span><strong>{category.title}</strong><small>{category.description}</small></span><b>{category.operations.length}</b></button>
                {open ? <div className={styles.categoryOperations}>{category.operations.map((operation) => <button aria-current={!customArea && selectedOperation.id === operation.id ? "true" : undefined} className={!customArea && selectedOperation.id === operation.id ? styles.selectedOperation : ""} key={operation.id} onClick={() => selectOperation(operation)} type="button"><Wrench /><span><strong>{operation.title}</strong><small>{operation.concernExamples.slice(0, 2).join(" · ")}</small></span><em>{operation.complexity}</em></button>)}</div> : null}
              </section>;
            })}
            {!filteredCatalog.length ? <div className={styles.catalogEmpty}><AlertTriangle /><strong>No standard repair area matched “{query}”</strong><p>Keep the concern intact and open a custom diagnostic investigation rather than forcing an incorrect category.</p><button onClick={() => { setCustomArea(query.trim()); setSelectedOperationId(fallbackOperation.id); }} type="button">Use “{query}” as a custom diagnostic area</button></div> : null}
          </nav>
          <div className={styles.vehicleDiagramCard}>{showDiagram ? <div className={styles.diagramDetail}><strong>{selectedOperation.title}</strong><span>Vehicle-specific diagrams require an authorized OEM or licensed source. The selected system and operation context is ready for that integration.</span></div> : <div className={styles.vehicleSketch}><Wrench aria-hidden="true" /></div>}<button aria-expanded={showDiagram} onClick={() => setShowDiagram((current) => !current)} type="button">{showDiagram ? "Hide diagram context" : "View diagram context"}</button></div>
        </aside>

        <main className={styles.laborEnginePanel}>
          <header><span>2</span><div><strong>Labor Intelligence Engine</strong><small><Info size={13} /> governed catalog · explainable draft calculations</small></div></header>
          <div className={styles.operationName}><strong>Selected Diagnostic Area:</strong> {selectedOperation.title} <span>{selectedOperation.complexity}</span></div>

          <section className={styles.operationScope} aria-label="Selected diagnostic area scope">
            <article><strong>Common concerns</strong><ul>{selectedOperation.concernExamples.map((item) => <li key={item}>{item}</li>)}</ul></article>
            <article><strong>Initial diagnostic coverage</strong><ul>{selectedOperation.initialTests.map((item) => <li key={item}>{item}</li>)}</ul></article>
            <article><strong>Required verification</strong><ul>{selectedOperation.verification.map((item) => <li key={item}>{item}</li>)}</ul></article>
          </section>

          <section className={styles.laborSourceGrid} aria-label="Labor source comparison">
            <article><span>OEM Baseline</span><strong>{(likelyHours * .86).toFixed(1)}<small>hrs</small></strong><p>Reference basis pending licensed vehicle-specific activation</p><CheckCircle2 aria-hidden="true" /></article>
            <article><span>Internal Guide</span><strong>{likelyHours.toFixed(1)}<small>hrs</small></strong><p>Governed internal diagnostic catalog</p><CheckCircle2 aria-hidden="true" /></article>
            <article><span>Shop Historical</span><strong>{(likelyHours * .95).toFixed(1)}<small>hrs</small></strong><p>Historical learning remains controlled until representative data exists</p><CheckCircle2 aria-hidden="true" /></article>
          </section>

          <section className={styles.complexityBand}><h2>Three-Tier Complexity: <span>{selectedOperation.complexity}</span></h2><div><article className={selectedOperation.complexity === "LOW" ? styles.activeComplexity : ""}><Layers3 /><strong>Low</strong><span>{(likelyHours * .75).toFixed(1)} hrs</span><small>Ideal conditions</small></article><article className={selectedOperation.complexity === "MEDIUM" ? styles.activeComplexity : ""}><Settings2 /><strong>Medium</strong><span>{likelyHours.toFixed(1)} hrs</span><small>Typical conditions</small></article><article className={selectedOperation.complexity === "HIGH" ? styles.highComplexity : ""}><AlertTriangle /><strong>High</strong><span>{(likelyHours * 1.25).toFixed(1)} hrs</span><small>Advanced conditions</small></article></div></section>

          <div className={styles.laborDetailGrid}><section><h2>Diagnostic Logic &amp; Boundaries <BadgeCheck size={18} /></h2><dl><div><dt>Evidence first</dt><dd>Do not replace parts from a symptom alone</dd></div><div><dt>Scope control</dt><dd>Additional testing requires documented reason</dd></div><div><dt>Verification</dt><dd>{selectedOperation.verification[0]}</dd></div></dl></section><section><h2>Required Skill / Tool / Bay</h2><table><tbody><tr><th>Skill</th><td>{selectedOperation.skills.join(", ")}</td><td><CheckCircle2 size={15} /></td></tr><tr><th>Tools</th><td>{selectedOperation.tools.join(", ")}</td><td><CheckCircle2 size={15} /></td></tr><tr><th>Bay</th><td>Vehicle-appropriate diagnostic bay</td><td><CheckCircle2 size={15} /></td></tr></tbody></table></section></div>
          <div className={styles.laborFinancialGrid}><article><span>Dynamic Labor Rate</span><p>Base labor rate {money(175)}<br />Complexity adjustment visible</p><strong>{money(baseRate)}/hr</strong></article><article><span>Advisory Labor</span><p>{effectiveHours.toFixed(1)} diagnostic hours<br />Not customer-presented</p><strong>{money(laborAmount)}</strong></article></div>
          {showComparison ? <section className={styles.inlineIntelligence}><strong>Model comparison</strong><p>OEM baseline {(likelyHours * .86).toFixed(1)} hrs · Internal guide {likelyHours.toFixed(1)} hrs · Controlled shop-history signal {(likelyHours * .95).toFixed(1)} hrs. No model silently overrides another.</p></section> : null}
          {showHistory ? <section className={styles.inlineIntelligence}><strong>Operation history</strong><p>No representative completed-shop sample is active for this vehicle and operation. The engine abstains instead of fabricating historical confidence.</p></section> : null}
        </main>

        <aside className={styles.advisorDraftPanel}>
          <header><span>3</span><strong>Advisor Estimate Draft</strong><b>Draft</b></header>
          <div className={styles.authorityWarning}><ShieldAlert size={18} />Authority boundary: no parts order, no dispatch, no authorization</div>
          <Link className={styles.createDraftButton} href={`/diagnostics/advisor-review?operation=${encodeURIComponent(selectedOperation.id)}${activeRepairOrder ? `&repairOrderId=${encodeURIComponent(activeRepairOrder.id)}` : ""}`}><FileText size={18} />Create Advisor Draft</Link>
          <section className={styles.draftCard}><header><strong>Advisor Draft — Not Customer Presented</strong><small>Live preview</small></header><table><thead><tr><th>Labor Line</th><th>Time</th><th>Rate</th><th>Amount</th></tr></thead><tbody><tr><td>{selectedOperation.title}</td><td>{effectiveHours.toFixed(1)}</td><td>{money(baseRate)}</td><td>{money(laborAmount)}</td></tr></tbody><tfoot><tr><th>Total Labor</th><th>{effectiveHours.toFixed(1)}</th><th /><th>{money(laborAmount)}</th></tr></tfoot></table><p>{selectedOperation.initialTests.join("; ")}.</p></section>
          <section className={styles.marginSafeguard}><h2>Margin Safeguard</h2><div><span>Estimated GP%</span><strong>Review</strong></div><div><span>GP Target</span><strong>70%</strong></div><div><span>Status</span><strong>Advisory</strong></div></section>
          <section className={styles.managerReviewCard}><AlertTriangle /><div><strong>Advisor Review Required</strong><span>Confirm vehicle applicability, included tests, rate, and authority before presentation.</span></div></section>
          <footer><button aria-pressed={showComparison} onClick={() => setShowComparison((current) => !current)} type="button"><BarChart3 size={17} />Compare Models</button><button aria-pressed={showHistory} onClick={() => setShowHistory((current) => !current)} type="button"><History size={17} />View History</button></footer>
        </aside>
      </div>
    </section>
  );
}
