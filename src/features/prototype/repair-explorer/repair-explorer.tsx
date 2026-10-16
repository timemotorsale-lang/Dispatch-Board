"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, CircleHelp, Search, Trash2, Wrench } from "lucide-react";

import { CATALOG_COUNTS, REPAIR_SYSTEMS, searchRepairs, type RepairOperation } from "./catalog";
import { estimateTotals, isValidAmount, parsePreviewDraft, type EstimateLine } from "./estimate";
import { LaborEvidence } from "./labor-evidence";
import styles from "./repair-explorer.module.css";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export function RepairExplorer({ storageKey }: { storageKey: string }) {
  const [systemId, setSystemId] = useState("brakes");
  const [groupId, setGroupId] = useState("friction");
  const [axle, setAxle] = useState("front");
  const [mode, setMode] = useState<"repair" | "diagnosis">("repair");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("front-pads-rotors");
  const [lines, setLines] = useState<EstimateLine[]>([]);
  const [rate, setRate] = useState(150);
  const [reportedOverrides, setReportedOverrides] = useState<Record<string, { hours: number; configuration: string; count: number }>>({});
  const [review, setReview] = useState(false);
  const [status, setStatus] = useState("Choose a repair to start your sample estimate.");
  const contentHeading = useRef<HTMLHeadingElement>(null);
  const system = REPAIR_SYSTEMS.find((item) => item.id === systemId)!;
  const group = system.groups.find((item) => item.id === groupId);
  const selected = group?.operations.find((item) => item.id === selectedId);
  const visible = group?.operations.filter((item) => item.kind === mode && (group.id !== "friction" || mode === "diagnosis" || item.id.startsWith(axle))) ?? [];
  const results = query.trim() ? searchRepairs(query) : [];
  const totals = estimateTotals(lines, rate);

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
  }

  function selectSystem(nextSystemId: string) {
    setSystemId(nextSystemId);
    setGroupId("");
    setSelectedId("");
    setQuery("");
    setReview(false);
  }

  function addRepair(repair: RepairOperation) {
    if (lines.some((line) => line.id === repair.id)) return;
    if (lines.length >= 100) { setStatus("This sample estimate supports up to 100 lines."); return; }
    if (repair.conflictGroup && lines.some((line) => line.conflictGroup === repair.conflictGroup)) {
      setStatus("An overlapping repair is already added. Remove that line before selecting this alternative.");
      return;
    }
    const reported = reportedOverrides[repair.id];
    setLines([...lines, { id: repair.id, label: repair.label, hours: reported?.hours ?? repair.hours, parts: repair.parts, conflictGroup: repair.conflictGroup, laborBasis: reported ? "REPORTED_MEDIAN" : "PLANNING", laborConfiguration: reported?.configuration, reportedJobCount: reported?.count }]);
    setSelectedId(repair.id);
    setStatus(`${repair.label} added with ${reported ? "technician-reported median" : "provisional planning"} hours. Review scope, labor overlap and parts before quoting.`);
  }

  function updateLine(id: string, field: "hours" | "parts", value: string) {
    const amount = value.trim() ? Number(value) : null;
    if (amount !== null && !isValidAmount(amount, field === "hours" ? 100 : 100000)) return;
    setLines(lines.map((line) => line.id === id ? { ...line, [field]: amount, ...(field === "hours" ? { laborBasis: "MANUAL" as const, laborConfiguration: undefined, reportedJobCount: undefined } : {}) } : line));
    setStatus("Sample estimate updated. Save the draft to keep these changes in this browser.");
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, rate, lines }));
      setStatus("Sample draft saved in this browser. No repair order or customer record was changed.");
    } catch {
      setStatus("Browser storage is unavailable. Your sample estimate is still available until you leave this page.");
    }
  }

  function loadDraft() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const draft = raw ? parsePreviewDraft(raw) : null;
      if (!draft) { setStatus(raw ? "The saved sample draft cannot be loaded. Your current estimate was kept." : "No saved sample draft in this browser yet."); return; }
      if (lines.length && !window.confirm("Replace the current sample estimate with the saved browser draft?")) return;
      setLines(draft.lines);
      setRate(draft.rate);
      setStatus("Saved sample draft loaded from this browser.");
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
      setStatus("Enter a repair name and valid amounts. The sample supports up to 100 lines.");
      return;
    }
    setLines([...lines, { id: `custom-${crypto.randomUUID()}`, label, hours, parts, laborBasis: "MANUAL" }]);
    setStatus(`${label} added as custom sample work.`);
    form.reset();
  }

  function removeLine(id: string) {
    setLines(lines.filter((line) => line.id !== id));
    setStatus("Repair removed. Sample estimate updated.");
  }

  function applyReportedHours(operationId: string, hours: number, configuration: string, count: number) {
    setReportedOverrides({ ...reportedOverrides, [operationId]: { hours, configuration, count } });
    setLines(lines.map((line) => line.id === operationId ? { ...line, hours, laborBasis: "REPORTED_MEDIAN", laborConfiguration: configuration, reportedJobCount: count } : line));
    setStatus(`Using a technician-reported median from ${count} jobs for ${configuration}. Confirm it matches the estimate vehicle; this is not a validated shop standard.`);
  }

  return (
    <div className={styles.preview}>
      <header className={styles.topbar}>
        <a href="/diagnostics/labor-guide"><ArrowLeft size={16} /> Current Labor Guide</a>
        <strong>Dispatch Board <span>/ Repair Explorer</span></strong>
        <span className={styles.badge}>Prototype · sample data</span>
      </header>
      <main className={styles.workspace}>
        <div className={styles.intro}>
          <div><p className={styles.eyebrow}>REPAIR EXPLORER PREVIEW</p><h1>Find the work. Build the estimate.</h1><p>Sample vehicle: 2019 Ford F-150 · 3.5L <span className={styles.dot}>•</span> Concern: grinding when braking</p></div>
          <nav className={styles.steps} aria-label="Estimate steps">
            <button type="button" aria-current={!review ? "step" : undefined} onClick={() => { setReview(false); focusContent(); }}><span>1</span> Find repair</button>
            <ChevronRight size={18} />
            <button type="button" aria-current={review ? "step" : undefined} disabled={!lines.length} onClick={() => { setReview(true); setQuery(""); focusContent(); }}><span>2</span> Review estimate</button>
          </nav>
        </div>
        <div className={styles.searchbar}>
          <Search size={21} aria-hidden="true" />
          <input aria-label="Search all sample repairs" placeholder="Search a symptom, repair, part or trouble code" value={query} onChange={(event) => { setQuery(event.target.value); setReview(false); }} />
          {query ? <button type="button" onClick={() => setQuery("")}>Clear</button> : <span>All systems</span>}
        </div>
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
          <section className={styles.content} aria-label={review ? "Review sample estimate" : "Repair selection"}>
            {review ? <>
              <p className={styles.breadcrumb}>Sample vehicle / Estimate review</p>
              <h2 ref={contentHeading} tabIndex={-1}>Review your estimate</h2>
              <p className={styles.description}>Review provisional labor hours and enter parts before saving your browser draft. Recorded job hours remain separate from planning allowances.</p>
              <label className={styles.rate}>Shop labor rate ($ / hour)<input aria-label="Shop labor rate" type="number" min="0" max="1000" step="0.01" value={rate} onChange={(event) => { const amount = Number(event.target.value); if (event.target.value && isValidAmount(amount, 1000)) { setRate(amount); setStatus("Sample shop rate updated."); } }} /></label>
              {!lines.length ? <div className={styles.empty}>No repairs remain. Return to Find repair to add work.</div> : lines.map((line) => <article className={styles.reviewLine} key={line.id}>
                <div className={styles.row}><h3>{line.label}</h3><button type="button" className={styles.iconButton} aria-label={`Remove ${line.label}`} onClick={() => removeLine(line.id)}><Trash2 size={17} /></button></div>
                <p className={styles.laborBasis}>{line.laborBasis === "PLANNING" ? "Provisional planning allowance · no measured job evidence" : line.laborBasis === "REPORTED_MEDIAN" ? `Technician-reported median · ${line.reportedJobCount} jobs · ${line.laborConfiguration}` : "Manually entered hours · not source-verified"}</p>
                <div className={styles.lineFields}><label>Labor hours<input aria-label={`Labor hours for ${line.label}`} type="number" min="0" max="100" step="0.1" placeholder="Enter hours" value={line.hours ?? ""} onChange={(event) => updateLine(line.id, "hours", event.target.value)} /></label><label>Parts total ($)<input aria-label={`Parts total for ${line.label}`} type="number" min="0" max="100000" step="0.01" placeholder="Enter parts total" value={line.parts ?? ""} onChange={(event) => updateLine(line.id, "parts", event.target.value)} /></label><strong>{line.hours === null || line.parts === null ? "Needs pricing" : money(estimateTotals([line], rate).subtotal)}</strong></div>
              </article>)}
              <div className={styles.note}><CircleHelp size={19} /><p>This preview stops at estimate review. Vehicle-specific labor, parts fitment, taxes, authorization and repair-order updates will be connected after the design is approved.</p></div>
              <button type="button" className={styles.secondary} onClick={() => { setReview(false); focusContent(); }}><ArrowLeft size={16} /> Keep adding work</button>
            </> : query.trim() ? <>
              <p className={styles.breadcrumb}>Search / All sample systems</p><h2 ref={contentHeading} tabIndex={-1}>Matching work</h2>
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
                <LaborEvidence key={selected.id} repair={selected} groupId={group.id} storageKey={storageKey} onUseReportedHours={(hours, configuration, count) => applyReportedHours(selected.id, hours, configuration, count)} />
                <details><summary>Parts, procedures & labor source</summary><p>Labor is a provisional planning allowance, not a verified book time. Parts, fitment and vehicle-specific procedures require review. {selected.parts === null ? "Enter parts pricing in estimate review." : `Parts allowance: ${money(selected.parts)} (demo only).`}</p>{system.id === "ev" && <p>High-voltage work requires appropriately trained staff and vehicle-specific safety procedures.</p>}</details>
                <details><summary>Related checks & additional work</summary><p>Confirm findings before adding related work. Diagnostic checks and repairs are separate estimate lines. Shared labor must be reviewed for overlap.</p></details>
              </div>}
            </>}
            {!review && <details className={styles.custom}><summary>Can’t find the work? Add a custom line</summary><form onSubmit={addCustom}><label>Work description<input name="label" required maxLength={200} placeholder="Describe the work" /></label><div className={styles.lineFields}><label>Labor hours<input name="hours" type="number" min="0" max="100" step="0.1" defaultValue="1" required /></label><label>Parts total ($)<input name="parts" type="number" min="0" max="100000" step="0.01" defaultValue="0" required /></label></div><button className={styles.secondary} type="submit">Add custom work</button></form></details>}
          </section>
          <aside className={styles.estimate} aria-label="Sample estimate">
            <div className={styles.row}><h2>Estimate</h2><span className={styles.count}>{lines.length} {lines.length === 1 ? "line" : "lines"}</span></div>
            <p className={styles.description}>Sample vehicle · browser draft</p>
            {!lines.length ? <div className={styles.empty}><Wrench size={26} /><strong>Your estimate starts here</strong><p>Add a repair or diagnostic check. Totals update as you go.</p></div> : <ul className={styles.estimateLines}>{lines.map((line) => <li key={line.id}><div><strong>{line.label}</strong><small>{line.hours === null ? "Hours needed" : `${line.hours.toFixed(1)} hrs`} · {line.parts === null ? "parts needed" : `parts ${money(line.parts)}`}</small></div><button type="button" className={styles.iconButton} aria-label={`Remove ${line.label} from estimate`} onClick={() => removeLine(line.id)}><Trash2 size={15} /></button></li>)}</ul>}
            <dl className={styles.totals}><div><dt>Labor · {totals.hours.toFixed(1)} hrs × {money(rate)}</dt><dd>{money(totals.labor)}</dd></div><div><dt>Parts</dt><dd>{money(totals.parts)}</dd></div><div className={styles.subtotal}><dt>{totals.unpricedLines ? "Priced subtotal" : "Sample subtotal"}</dt><dd data-testid="estimate-subtotal">{money(totals.subtotal)}</dd></div></dl>
            {totals.unpricedLines > 0 && <p className={styles.pricingNotice} data-testid="pricing-needed">{totals.unpricedLines} {totals.unpricedLines === 1 ? "line needs" : "lines need"} pricing. This subtotal is incomplete. Enter hours and parts in Review estimate.</p>}
            <p className={styles.priceNote}>Provisional labor hours require review. Excludes taxes and fees. Waiting time is not technician labor.</p>
            <button type="button" className={styles.primary} disabled={!lines.length} onClick={() => { if (review) saveDraft(); else { setReview(true); setQuery(""); focusContent(); } }}>{review ? "Save sample draft" : "Review estimate"}<ArrowRight size={17} /></button>
            <div className={styles.draftActions}>{!review && <button type="button" onClick={saveDraft}>Save sample draft</button>}<button type="button" onClick={loadDraft}>Load saved sample</button></div>
            <p className={styles.status} role="status" aria-live="polite">{status}</p>
          </aside>
        </div>
        <footer className={styles.footer}><span>Design review only · no live repair orders, customer records or approvals are changed.</span><a href="/diagnostics/labor-guide">Return to current Labor Guide <ArrowRight size={14} /></a></footer>
      </main>
    </div>
  );
}
