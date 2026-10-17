"use client";

import { useState } from "react";
import { REPAIR_SYSTEMS, searchRepairs, type RepairOperation } from "@/features/prototype/repair-explorer/catalog";
import { VisualRepairFinder } from "@/features/prototype/repair-explorer/visual-repair-finder";
import { BrakeOperationScope } from "./brake-operation-scope";
import { SteeringOperationScope } from "./steering-operation-scope";
import { LABOR_PILOT_SYSTEMS } from "@/lib/labor-catalog-selection";
import { repairBaselineForId } from "@/lib/repair-catalog-baselines";
import styles from "@/features/prototype/repair-explorer/repair-explorer.module.css";

export function ConnectedRepairCatalog({ vehicle, concern, selected, laborRate, onSelect, onReview }: {
  vehicle: string; concern: string; selected: { id: string; title: string; hours: number }[]; laborRate: number;
  onSelect: (operation: RepairOperation) => void; onReview: () => void;
}) {
  const [systemId, setSystemId] = useState("brakes");
  const [groupId, setGroupId] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"repair" | "diagnosis">("repair");
  const [detailId, setDetailId] = useState("");
  const [visual, setVisual] = useState(false);
  const system = REPAIR_SYSTEMS.find(item => item.id === systemId)!;
  const group = system.groups.find(item => item.id === groupId);
  const eligible = (id: string) => LABOR_PILOT_SYSTEMS.some(system => system === id);
  const results = query.trim() ? searchRepairs(query).filter(entry => eligible(entry.system.id)) : [];
  const operations = query.trim() ? results.map(entry => entry.repair) : group?.operations.filter(operation => operation.kind === kind) ?? [];
  const details = operations.find(operation => operation.id === detailId);
  const addedIds = selected.map(item => item.id);
  const isAdded = (repair: RepairOperation) => selected.some(item => item.id === repairBaselineForId(repair.id)?.operation.id);
  function chooseSystem(id: string) { setSystemId(id); setGroupId(""); setQuery(""); setDetailId(""); setVisual(false); }
  return <section className={styles.preview} aria-label="Connected Repair Explorer">
    <div className={styles.workspace}>
      <header className={styles.intro}><div><p className={styles.eyebrow}>CONNECTED REPAIR EXPLORER · PILOT</p><h2>Find the work. Build the estimate.</h2><p>{vehicle || "Choose a vehicle above before presentation"}{concern ? ` · ${concern}` : ""}</p></div><button className={styles.primary} type="button" onClick={onReview}>Review selected work</button></header>
      <p>Selections enter this saved-quote/RO workspace. They do not authorize repairs. Hours remain provisional; parts, procedure and pricing reviews are required.</p>
      <div className={styles.searchbar}><input aria-label="Search connected repairs" value={query} placeholder="Search a symptom, component or repair" onChange={event => { setQuery(event.target.value); setVisual(false); }} /><button type="button" onClick={() => { setVisual(!visual); setQuery(""); }}>Find it visually</button></div>
      <div className={styles.columns}>
        <nav className={styles.systems} aria-label="Connected vehicle systems"><div className={styles.panelHeading}><h3>Vehicle systems</h3><a href="/prototype/repair-coverage">Review ten-system expansion</a><p>Brake and steering baselines are connected. Ten expanded systems await shop approval; review them in the coverage preview or existing guide.</p></div>{REPAIR_SYSTEMS.map(item => <div key={item.id}><button className={styles.systemButton} type="button" disabled={!eligible(item.id)} aria-expanded={systemId === item.id} onClick={() => chooseSystem(item.id)}>{item.label}{!eligible(item.id) ? " · approval pending" : ""}</button>{systemId === item.id && eligible(item.id) && <div className={styles.subsystems}>{item.groups.map(child => <button key={child.id} type="button" aria-current={groupId === child.id ? "true" : undefined} onClick={() => { setGroupId(child.id); setDetailId(""); setVisual(false); }}>{child.label}</button>)}</div>}</div>)}</nav>
        <section className={styles.content} aria-label="Connected repair selection">
          {visual ? <VisualRepairFinder allowedSystemIds={LABOR_PILOT_SYSTEMS} initialArea={systemId === "steering" ? "front-suspension" : "brakes"} initialOperationId="" addedIds={addedIds} onAdd={(_entry, repair) => onSelect(repair)} onView={entry => { if (!eligible(entry.system.id)) return; setSystemId(entry.system.id); setGroupId(entry.group.id); setDetailId(entry.repair.id); setVisual(false); }} onBrowseSystem={id => { if (eligible(id)) chooseSystem(id); }} onClose={() => setVisual(false)} /> : <>
            <h3>{query ? "Matching approved work" : group?.label ?? `${system.label}: choose a repair group`}</h3>
            {!group && !query ? <div className={styles.groupGrid}>{system.groups.map(child => <button className={styles.groupCard} type="button" key={child.id} onClick={() => setGroupId(child.id)}>{child.label}</button>)}</div> : <>
              {!query && <div className={styles.modeSwitch} role="group" aria-label="Connected work type"><button type="button" aria-pressed={kind === "diagnosis"} onClick={() => setKind("diagnosis")}>Diagnose a concern</button><button type="button" aria-pressed={kind === "repair"} onClick={() => setKind("repair")}>Choose a repair</button></div>}
              {details && <div className={styles.repairDetails}><h3>{details.label}</h3><BrakeOperationScope operationId={details.id} /><SteeringOperationScope operationId={details.id} /></div>}
              <div className={styles.operationList}>{operations.map(operation => <article className={styles.operation} key={operation.id}><button type="button" className={styles.operationTitle} aria-pressed={detailId === operation.id} onClick={() => setDetailId(operation.id)}><span><strong>{operation.label}</strong><small>{operation.hours?.toFixed(1)} hours · provisional planning</small></span></button><button className={styles.addButton} type="button" disabled={isAdded(operation)} aria-label={`Add ${operation.label} to workspace`} onClick={() => onSelect(operation)}>{isAdded(operation) ? "Added" : "Add"}</button></article>)}</div>
              {!operations.length && <p>No approved matches. Try another description or review other systems in the expanded coverage preview.</p>}
            </>}
          </>}
        </section>
        <aside className={styles.estimate} aria-label="Selected connected work"><h3>Selected work</h3><p>{selected.length} lines · ${laborRate.toFixed(2)}/hour inherited shop rate</p><ul className={styles.estimateLines}>{selected.map(item => <li key={item.id}><strong>{item.title}</strong><small>{item.hours.toFixed(1)} hours</small></li>)}</ul><p>Final parts, tax, overlap and source review stay in the estimate workspace. No browser-only draft or illustrative price is imported.</p><button type="button" className={styles.primary} onClick={onReview}>Review selected work</button></aside>
      </div>
    </div>
  </section>;
}
