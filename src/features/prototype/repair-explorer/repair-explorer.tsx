"use client";

import { repairExplorerHandoffHref, type RepairExplorerContext } from "@/lib/repair-explorer-context";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, CircleHelp, Search, Trash2, Wrench } from "lucide-react";

import { CATALOG_COUNTS, REPAIR_SYSTEMS, searchRepairs, type RepairOperation } from "./catalog";
import { estimateTotals, isValidAmount, parsePreviewDraft, type EstimateLine } from "./estimate";
import { LaborEvidence } from "./labor-evidence";
import { VisualRepairFinder } from "./visual-repair-finder";
import { visualAreaForSystem } from "./visual-catalog";
import styles from "./repair-explorer.module.css";
import { brakeOperationForId } from "@/lib/brake-baseline";
import { repairScopeConflict } from "@/lib/repair-catalog-baselines";
import { BrakeOperationScope } from "@/features/diagnostics/brake-operation-scope";
import { SteeringOperationScope } from "@/features/diagnostics/steering-operation-scope";
import { LaborGuideViewSwitch, laborGuideHref } from "@/features/diagnostics/labor-guide-view-switch";
import { LightDutyOperationScope } from "@/features/diagnostics/light-duty-operation-scope";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export function RepairExplorer({ storageKey, initialSystemId, initialGroupId, context }: { storageKey: string; initialSystemId?: string; initialGroupId?: string; context?: RepairExplorerContext }) {
  const router = useRouter();
  const repairOrderId = context?.repairOrderId;
  const initialSystem = REPAIR_SYSTEMS.find(system => system.id === initialSystemId) ?? REPAIR_SYSTEMS.find(system => system.id === "brakes")!;
  const initialGroup = initialSystem.groups.find(group => group.id === initialGroupId) ?? initialSystem.groups[0];
  const [systemId, setSystemId] = useState(initialSystem.id);
  const [groupId, setGroupId] = useState(initialGroup.id);
  const [axle, setAxle] = useState("front");
  const [mode, setMode] = useState<"repair" | "diagnosis">("repair");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialGroup.operations.find(operation => operation.kind === "repair")?.id ?? "");
  const [lines, setLines] = useState<EstimateLine[]>([]);
  const [rate, setRate] = useState(context?.laborRate ?? 150);
  const [reportedOverrides, setReportedOverrides] = useState<Record<string, { hours: number; configuration: string; count: number }>>({});
  const [review, setReview] = useState(false);
  const [visualOpen, setVisualOpen] = useState(false);
  const [status, setStatus] = useState("Choose a repair to start your estimate.");
  const contentHeading = useRef<HTMLHeadingElement>(null);
  const system = REPAIR_SYSTEMS.find((item) => item.id === systemId)!;
  const group = system.groups.find((item) => item.id === groupId);
  const selected = group?.operations.find((item) => item.id === selectedId);
  const visible = group?.operations.filter((item) => item.kind === mode && (group.id !== "friction" || mode === "diagnosis" || (brakeOperationForId(item.id)?.position.toLowerCase().startsWith(axle) ?? item.id.startsWith(axle)))) ?? [];
  const results = query.trim() ? searchRepairs(query) : [];
  const totals = estimateTotals(lines, rate);
  const scopeConflict = lines.some((line, index) => lines.slice(index + 1).some(other => repairScopeConflict(line.id, other.id)));

  function focusContent() {
    requestAnimationFrame(() => contentHeading.current?.focus());
  }

  function selectGroup(nextSystemId: string, nextGroupId: string) {
    const nextGroup = REPAIR_SYSTEMS.find((item) => item.id === nextSystemId)!.groups.find((item) => item.id === nextGroupId)!;
    setSystemId(nextSystemId);
    setGroupId(nextGroupId);
    setSelectedId(nextGroup.operations.find((item) => item.kind === mode)?.id ?? "");
    setAxle("front");
    setQuery("");
    setReview(false);
    setVisualOpen(false);
  }

  function selectSystem(nextSystemId: string) {
    setSystemId(nextSystemId);
    setGroupId("");
    setSelectedId("");
    setQuery("");
    setReview(false);
    setVisualOpen(false);
  }

  function addRepair(repair: RepairOperation) {
    if (lines.some((line) => line.id === repair.id)) return;
    if (lines.some(line => repairScopeConflict(line.id, repair.id))) {
      setStatus("This work is already included in a selected package or is an incompatible alternative. Remove the overlapping line before choosing this alternative.");
      return;
    }
    const sourceId = repair.catalogOperationId ?? repair.id;
    if (lines.some((line) => (line.catalogOperationId ?? line.id) === sourceId && (!line.position || !repair.position))) {
      setStatus("The same catalog work is already added with a different position scope. Remove it before adding a scoped alternative.");
      return;
    }
    if (lines.length >= 100) { setStatus("This estimate supports up to 100 lines."); return; }
    if (repair.conflictGroup && lines.some((line) => line.conflictGroup === repair.conflictGroup)) {
      setStatus("An overlapping repair is already added. Remove that line before selecting this alternative.");
      return;
    }
    const reported = reportedOverrides[repair.id];
    setLines([...lines, { id: repair.id, label: repair.label, hours: reported?.hours ?? repair.hours, parts: repair.parts, conflictGroup: repair.conflictGroup, laborBasis: reported ? "REPORTED_MEDIAN" : "PLANNING", laborConfiguration: reported?.configuration, reportedJobCount: reported?.count, catalogOperationId: repair.catalogOperationId, position: repair.position }]);
    setSelectedId(repair.catalogOperationId ?? repair.id);
    setStatus(`${repair.label} added with ${reported ? "technician-reported median" : "provisional planning"} hours. Review scope, labor overlap and parts before quoting.`);
  }

  function updateLine(id: string, field: "hours" | "parts", value: string) {
    const amount = value.trim() ? Number(value) : null;
    if (amount !== null && !isValidAmount(amount, field === "hours" ? 100 : 100000)) return;
    setLines(lines.map((line) => line.id === id ? { ...line, [field]: amount, ...(field === "hours" ? { laborBasis: "MANUAL" as const, laborConfiguration: undefined, reportedJobCount: undefined } : {}) } : line));
    setStatus("Estimate updated. Save the draft to keep these changes in this browser.");
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, rate, lines, repairOrderId, vehicleId: context?.vehicleId }));
      setStatus("Draft saved in this browser. No repair order or customer record was changed.");
    } catch {
      setStatus("Browser storage is unavailable. Your estimate is still available until you leave this page.");
    }
  }

  function generateEstimate() {
    if (!lines.length || scopeConflict) { setStatus("Add work and resolve scope conflicts before generating an estimate."); return; }
    try {
      const raw = JSON.stringify({ version: 1, rate, lines, repairOrderId, vehicleId: context?.vehicleId });
      if (!parsePreviewDraft(raw)) throw new Error("invalid");
      window.localStorage.setItem(storageKey, raw);
      window.sessionStorage.setItem(`${storageKey}.handoff`, raw);
      router.push(repairExplorerHandoffHref(repairOrderId, context?.reviewWorkflow));
    } catch {
      setStatus("The estimate could not be transferred. Check draft values and browser storage; your current work was kept.");
    }
  }

  function loadDraft() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const draft = raw ? parsePreviewDraft(raw) : null;
      if (!draft) { setStatus(raw ? "The saved draft cannot be loaded. Your current estimate was kept." : "No saved draft in this browser yet."); return; }
      if ((draft.repairOrderId ?? null) !== (repairOrderId ?? null) || (draft.vehicleId ?? null) !== (context?.vehicleId ?? null)) {
        setStatus("This saved draft belongs to another repair order or vehicle. Your current work was kept.");
        return;
      }
      if (lines.length && !window.confirm("Replace the current estimate with the saved browser draft?")) return;
      setLines(draft.lines);
      setRate(draft.rate);
      setStatus(draft.lines.some((line, index) => draft.lines.slice(index + 1).some(other => repairScopeConflict(line.id, other.id))) ? "Saved draft loaded with original amounts. Current catalog scope conflicts need review before quoting." : "Saved draft loaded from this browser.");
    } catch {
      setStatus("Browser storage is unavailable. Your current estimate was kept.");
    }
  }

  function addCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const label = String(data.get("label") ?? "").trim();
    const hours = Number(data.get("hours"));
    const parts = Number(data.get("parts"));
    if (!label || !isValidAmount(hours, 100) || !isValidAmount(parts, 100000) || lines.length >= 100) {
      setStatus("Enter a repair name and valid amounts. An estimate supports up to 100 lines.");
      return;
    }
    setLines([...lines, { id: `custom-${crypto.randomUUID()}`, label, hours, parts, laborBasis: "MANUAL" }]);
    setStatus(`${label} added as custom work.`);
    form.reset();
  }

  function removeLine(id: string) {
    setLines(lines.filter((line) => line.id !== id));
    setStatus("Repair removed. Estimate updated.");
  }

  function applyReportedHours(operationId: string, hours: number, configuration: string, count: number) {
    setReportedOverrides({ ...reportedOverrides, [operationId]: { hours, configuration, count } });
    setLines(lines.map((line) => line.id === operationId ? { ...line, hours, laborBasis: "REPORTED_MEDIAN", laborConfiguration: configuration, reportedJobCount: count } : line));
    setStatus(`Using a technician-reported median from ${count} jobs for ${configuration}. Confirm it matches the estimate vehicle; this is not a validated shop standard.`);
  }

  return (
    <div className={styles.preview}>
      <header className={styles.topbar}>
        <a href={laborGuideHref("legacy", repairOrderId, context?.reviewWorkflow)}><ArrowLeft size={16} /> Current Labor Guide</a>
        <a href="/prototype/brake-workflow">Try the guided brakes workflow →</a>
        <a href="/prototype/service-workspace">Customer estimates & RO preview →</a>
        <a href="/prototype/repair-coverage">Review ten-system coverage →</a>
        <strong>Dispatch Board <span>/ Repair Explorer</span></strong>
        <span className={styles.badge}>Review preview</span>
      </header>
      <LaborGuideViewSwitch reviewWorkflow={context?.reviewWorkflow} view="new" repairOrderId={repairOrderId} />
      <main className={styles.workspace}>
        <div className={styles.intro}>
          <div><p className={styles.eyebrow}>REPAIR EXPLORER PREVIEW</p><h1>Find the work. Build the estimate.</h1><p>{context ? <>{context.vehicleLabel} · {context.vin ?? "VIN not recorded"} · {context.repairOrderNumber}{context.inventoryNumber ? ` · ${context.inventoryNumber}` : ""}<span className={styles.dot}>•</span> Concern: {context.concern}</> : <>Reference vehicle: 2019 Ford F-150 · 3.5L <span className={styles.dot}>•</span> Concern: grinding when braking</>}</p></div>
          <nav className={styles.steps} aria-label="Estimate steps">
            <button type="button" aria-current={!review ? "step" : undefined} onClick={() => { setReview(false); focusContent(); }}><span>1</span> Find repair</button>
            <ChevronRight size={18} />
            <button type="button" aria-current={review ? "step" : undefined} disabled={!lines.length} onClick={() => { setReview(true); setQuery(""); focusContent(); }}><span>2</span> Review estimate</button>
          </nav>
        </div>
        <div className={styles.searchbar}>
          <Search size={21} aria-hidden="true" />
          <input aria-label="Search all repairs" placeholder="Search a symptom, repair, part or trouble code" value={query} onChange={(event) => { setQuery(event.target.value); setReview(false); setVisualOpen(false); }} />
          {query ? <button type="button" onClick={() => setQuery("")}>Clear</button> : <span>All systems</span>}
          <button type="button" className={styles.visualLaunch} aria-pressed={visualOpen} onClick={() => { setVisualOpen(!visualOpen); setQuery(""); setReview(false); }}>Find it visually</button>
        </div>
        {scopeConflict && <p role="alert">Current catalog review identifies duplicate or incompatible scope. Original amounts are retained; remove or revise the overlapping work before quoting. This preview does not authorize repairs.</p>}
        <div className={styles.columns}>
          <aside className={styles.systems} aria-label="Vehicle systems">
            <div className={styles.panelHeading}><h2>Vehicle systems</h2><p>Choose a system to explore.</p></div>
            {REPAIR_SYSTEMS.map((item, index) => (
              <div key={item.id}>
                <button type="button" className={styles.systemButton} aria-expanded={systemId === item.id} aria-controls={`system-${item.id}`} onClick={() => selectSystem(item.id)}>
                  <span className={styles.systemNumber}>{String(index + 1).padStart(2, "0")}</span><span>{item.label}</span>{systemId === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div id={`system-${item.id}`} hidden={systemId !== item.id} className={styles.subsystems}>
                  <button type="button" aria-current={!group ? "true" : undefined} onClick={() => selectSystem(item.id)}>All {item.label.toLowerCase()} groups</button>
                  {item.groups.map((child) => <button type="button" key={child.id} aria-current={group?.id === child.id ? "true" : undefined} onClick={() => selectGroup(item.id, child.id)}>{child.label}</button>)}
                </div>
              </div>
            ))}
            <p className={styles.catalogNote}>{CATALOG_COUNTS.systems} systems · {CATALOG_COUNTS.groups} groups · {CATALOG_COUNTS.operations} operations. Broad preview catalog; confirm vehicle applicability before pricing.</p>
          </aside>
          <section className={styles.content} aria-label={review ? "Review estimate" : "Repair selection"}>
            {review ? <>
              <p className={styles.breadcrumb}>Estimate / Review</p>
              <h2 ref={contentHeading} tabIndex={-1}>Review your estimate</h2>
              <p className={styles.description}>Review provisional labor hours and enter parts before saving your browser draft. Recorded job hours remain separate from planning allowances.</p>
              <label className={styles.rate}>Shop labor rate ($ / hour)<input aria-label="Shop labor rate" type="number" min="0" max="1000" step="0.01" value={rate} onChange={(event) => { const amount = Number(event.target.value); if (event.target.value && isValidAmount(amount, 1000)) { setRate(amount); setStatus("Shop labor rate updated."); } }} /></label>
              {!lines.length ? <div className={styles.empty}>No repairs remain. Return to Find repair to add work.</div> : lines.map((line) => <article className={styles.reviewLine} key={line.id}>
                <div className={styles.row}><h3>{line.label}</h3><button type="button" className={styles.iconButton} aria-label={`Remove ${line.label}`} onClick={() => removeLine(line.id)}><Trash2 size={17} /></button></div>
                <p className={styles.laborBasis}>{line.laborBasis === "PLANNING" ? "Provisional planning allowance · no measured job evidence" : line.laborBasis === "REPORTED_MEDIAN" ? `Technician-reported median · ${line.reportedJobCount} jobs · ${line.laborConfiguration}` : "Manually entered hours · not source-verified"}</p>
                <div className={styles.lineFields}><label>Labor hours<input aria-label={`Labor hours for ${line.label}`} type="number" min="0" max="100" step="0.1" placeholder="Enter hours" value={line.hours ?? ""} onChange={(event) => updateLine(line.id, "hours", event.target.value)} /></label><label>Parts total ($)<input aria-label={`Parts total for ${line.label}`} type="number" min="0" max="100000" step="0.01" placeholder="Enter parts total" value={line.parts ?? ""} onChange={(event) => updateLine(line.id, "parts", event.target.value)} /></label><strong>{line.hours === null || line.parts === null ? "Needs pricing" : money(estimateTotals([line], rate).subtotal)}</strong></div>
              </article>)}
              <div className={styles.note}><CircleHelp size={19} /><p>Ready for a customer estimate? Choose Generate / Print Estimate, select the actual repair order, then review labor, itemized parts and taxes. Printing is available after the official estimate is issued. Customer approval and final invoicing remain separate steps.</p></div>
              <button type="button" className={styles.secondary} onClick={() => { setReview(false); focusContent(); }}><ArrowLeft size={16} /> Keep adding work</button>
            </> : visualOpen ? <VisualRepairFinder initialArea={visualAreaForSystem(systemId)} initialOperationId={selectedId} addedIds={lines.map((line) => line.id)} onBrowseSystem={(nextSystemId) => { selectSystem(nextSystemId); focusContent(); }} onClose={() => { setVisualOpen(false); focusContent(); }} onView={(entry) => { selectGroup(entry.system.id, entry.group.id); setMode(entry.repair.kind); setSelectedId(entry.repair.id); if (entry.repair.id.startsWith("rear")) setAxle("rear"); focusContent(); }} onAdd={(entry, repair) => { setSystemId(entry.system.id); setGroupId(entry.group.id); setMode(entry.repair.kind); setAxle("front"); addRepair(repair); }} /> : query.trim() ? <>
              <p className={styles.breadcrumb}>Search / All systems</p><h2 ref={contentHeading} tabIndex={-1}>Matching work</h2>
              <p className={styles.description}>{results.length} {results.length === 1 ? "result" : "results"} for “{query}”</p>
              {!results.length && <div className={styles.empty}>No catalog matches. Try “engine assembly”, “grinding”, “P0300” or choose a system. You can also add custom work below.</div>}
              {results.map(({ system: resultSystem, group: resultGroup, repair }) => <article className={styles.searchResult} key={repair.id}>
                <div><span>{resultSystem.label} / {resultGroup.label}</span><h3>{repair.label}</h3><small>{repair.kind === "diagnosis" ? "Diagnostic work" : "Repair"} · {repair.hours === null ? "Needs pricing" : `${repair.hours.toFixed(1)} hrs · provisional`}</small></div>
                <button type="button" className={styles.secondary} onClick={() => { selectGroup(resultSystem.id, resultGroup.id); setMode(repair.kind); if (repair.id.startsWith("rear")) setAxle("rear"); else setAxle("front"); setSelectedId(repair.id); focusContent(); }}>View <ArrowRight size={16} /></button>
              </article>)}
            </> : !group ? <>
              <p className={styles.breadcrumb}>Vehicle systems / {system.label}</p>
              <h2 ref={contentHeading} tabIndex={-1}>{system.label}: choose a repair group</h2>
              <p className={styles.description}>Open one group at a time to find components, repairs and diagnostic checks.</p>
              <div className={styles.groupGrid}>
                {system.groups.map((item) => <button type="button" key={item.id} className={styles.groupCard} onClick={() => { selectGroup(system.id, item.id); focusContent(); }}><span><strong>{item.label}</strong><small>{item.operations.filter((repair) => repair.kind === "repair").length} repairs · {item.operations.filter((repair) => repair.kind === "diagnosis").length} diagnostic checks</small></span><ChevronRight size={18} /></button>)}
              </div>
            </> : <>
              <p className={styles.breadcrumb}><button type="button" className={styles.breadcrumbButton} onClick={() => selectSystem(system.id)}>{system.label}</button> / {group.label}</p>
              <h2 ref={contentHeading} tabIndex={-1}>What needs attention?</h2>
              <p className={styles.description}>Choose the work you know, or start with a diagnostic check.</p>
              <div className={styles.modeSwitch} role="group" aria-label="Type of work">
                <button type="button" aria-pressed={mode === "diagnosis"} onClick={() => { setMode("diagnosis"); setSelectedId(""); }}>Diagnose a concern</button>
                <button type="button" aria-pressed={mode === "repair"} onClick={() => { setMode("repair"); setSelectedId(""); }}>Choose a repair</button>
              </div>
              {group.id === "friction" && mode === "repair" && <div className={styles.axles} role="group" aria-label="Brake axle">
                {["front", "rear"].map((item) => <button type="button" key={item} aria-pressed={axle === item} onClick={() => { setAxle(item); setSelectedId(`${item}-pads-rotors`); }}><Wrench size={25} /><span><strong>{item === "front" ? "Front brakes" : "Rear brakes"}</strong><small>{item === "front" ? "Front" : "Rear"} axle</small></span>{axle === item && <Check size={19} />}</button>)}
              </div>}
              <div className={styles.operationList}>
                {visible.map((repair) => {
                  const added = lines.some((line) => line.id === repair.id);
                  return <article key={repair.id} className={`${styles.operation} ${selectedId === repair.id ? styles.selected : ""}`}>
                    <button type="button" className={styles.operationTitle} aria-pressed={selectedId === repair.id} onClick={() => setSelectedId(repair.id)}><Wrench size={18} /><span><strong>{repair.label}</strong><small>{repair.hours === null ? "Needs pricing" : `${repair.hours.toFixed(1)} hrs · provisional ${repair.kind === "diagnosis" ? "initial assessment" : "planning allowance"}`}</small></span></button>
                    <button type="button" className={styles.addButton} disabled={added} aria-label={added ? `${repair.label} added` : `Add ${repair.label}`} onClick={() => addRepair(repair)}>{added ? <><Check size={16} /> Added</> : "Add"}</button>
                  </article>;
                })}
              </div>
              {selected && selected.kind === mode && <div className={styles.repairDetails}>
                <h3>Included in this {mode === "diagnosis" ? "check" : "repair"}</h3>
                <ul>{selected.includes.map((text) => <li key={text}><Check size={15} />{text}</li>)}</ul>
                <BrakeOperationScope operationId={selected.id} />
                <SteeringOperationScope operationId={selected.id} />
                <LightDutyOperationScope operationId={selected.id} />
                <LaborEvidence key={selected.id} repair={selected} groupId={group.id} storageKey={storageKey} onUseReportedHours={(hours, configuration, count) => applyReportedHours(selected.id, hours, configuration, count)} />
                <details><summary>Parts, procedures & labor source</summary><p>Labor is a provisional planning allowance, not a verified book time. Parts, fitment and vehicle-specific procedures require review. {selected.parts === null ? "Enter parts pricing in estimate review." : `Provisional parts allowance: ${money(selected.parts)}. Confirm pricing before quoting.`}</p>{system.id === "ev" && <p>High-voltage work requires appropriately trained staff and vehicle-specific safety procedures.</p>}</details>
                <details><summary>Related checks & additional work</summary><p>Confirm findings before adding related work. Diagnostic checks and repairs are separate estimate lines. Shared labor must be reviewed for overlap.</p></details>
              </div>}
            </>}
            {!review && !visualOpen && <details className={styles.custom}><summary>Can’t find the work? Add a custom line</summary><form onSubmit={addCustom}><label>Work description<input name="label" required maxLength={200} placeholder="Describe the work" /></label><div className={styles.lineFields}><label>Labor hours<input name="hours" type="number" min="0" max="100" step="0.1" defaultValue="1" required /></label><label>Parts total ($)<input name="parts" type="number" min="0" max="100000" step="0.01" defaultValue="0" required /></label></div><button className={styles.secondary} type="submit">Add custom work</button></form></details>}
          </section>
          <aside className={styles.estimate} aria-label="Estimate">
            <div className={styles.row}><h2>Estimate</h2><span className={styles.count}>{lines.length} {lines.length === 1 ? "line" : "lines"}</span></div>
            <p className={styles.description}>{context ? `Proposed work · ${context.repairOrderNumber}` : "Estimate draft · this browser"}</p>
            {!lines.length ? <div className={styles.empty}><Wrench size={26} /><strong>Your estimate starts here</strong><p>Add a repair or diagnostic check. Totals update as you go.</p></div> : <ul className={styles.estimateLines}>{lines.map((line) => <li key={line.id}><div><strong>{line.label}</strong><small>{line.hours === null ? "Hours needed" : `${line.hours.toFixed(1)} hrs`} · {line.parts === null ? "parts needed" : `parts ${money(line.parts)}`}</small></div><button type="button" className={styles.iconButton} aria-label={`Remove ${line.label} from estimate`} onClick={() => removeLine(line.id)}><Trash2 size={15} /></button></li>)}</ul>}
            <dl className={styles.totals}><div><dt>Labor · {totals.hours.toFixed(1)} hrs × {money(rate)}</dt><dd>{money(totals.labor)}</dd></div><div><dt>Parts</dt><dd>{money(totals.parts)}</dd></div><div className={styles.subtotal}><dt>{totals.unpricedLines ? "Priced subtotal" : "Estimated subtotal"}</dt><dd data-testid="estimate-subtotal">{money(totals.subtotal)}</dd></div></dl>
            {totals.unpricedLines > 0 && <p className={styles.pricingNotice} data-testid="pricing-needed">{totals.unpricedLines} {totals.unpricedLines === 1 ? "line needs" : "lines need"} pricing. This subtotal is incomplete. Enter hours and parts in Review estimate.</p>}
            <p className={styles.priceNote}>Provisional labor hours require review. Excludes taxes and fees. Waiting time is not technician labor.</p>
            <button type="button" className={review ? styles.secondary : styles.primary} disabled={!lines.length} onClick={() => { if (review) saveDraft(); else { setReview(true); setQuery(""); focusContent(); } }}>{review ? "Save draft" : "Review estimate"}<ArrowRight size={17} /></button>
            {review && <button type="button" className={styles.primary} disabled={!lines.length || scopeConflict} onClick={generateEstimate}>Generate / Print Estimate<ArrowRight size={17} /></button>}
            {review && <p className={styles.priceNote}>{context ? "Next: review and generate the estimate for this repair order. Fitment, labor, parts, tax and authorization safeguards still apply." : "Next: select a real customer / vehicle and RO. Documents, approvals and final invoice printing are available from that RO; a browser draft is not an invoice."}</p>}
            <div className={styles.draftActions}>{!review && <button type="button" onClick={saveDraft}>Save draft</button>}<button type="button" onClick={loadDraft}>Load saved draft</button></div>
            <p className={styles.status} role="status" aria-live="polite">{status}</p>
          </aside>
        </div>
        <footer className={styles.footer}><span>Browser draft only · no live repair orders, customer records or approvals are changed here. Generate / Print Estimate opens the governed live workflow.</span><a href={laborGuideHref("legacy", repairOrderId, context?.reviewWorkflow)}>Return to current Labor Guide <ArrowRight size={14} /></a></footer>
      </main>
    </div>
  );
}
