"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, ZoomIn, RotateCcw } from "lucide-react";

import type { CATALOG_ENTRIES, RepairOperation } from "./catalog";
import { VISUAL_AREAS, visualEntries, visualEstimateRepair, visualPartForOperation, type VehicleSide, type VisualAreaId } from "./visual-catalog";
import styles from "./visual-repair-finder.module.css";

type CatalogEntry = typeof CATALOG_ENTRIES[number];

function activate(event: KeyboardEvent<SVGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); }
}

function PartShape({ id }: { id: string }) {
  switch (id) {
    case "rotor": return <><ellipse cx="293" cy="215" rx="76" ry="115" /><ellipse cx="293" cy="215" rx="57" ry="91" /><ellipse cx="293" cy="215" rx="25" ry="39" /></>;
    case "pads": return <><path d="M367 151 L384 143 L401 158 L401 264 L384 280 L367 271 Z" /><path d="M336 161 L347 155 L358 168 L358 255 L347 267 L336 260 Z" /><path d="M379 161 V260 M345 172 V252" className={styles.detailStroke} /></>;
    case "caliper": return <><path d="M385 119 Q425 110 448 138 L448 280 Q426 302 390 291 L390 262 L420 261 L420 156 L386 156 Z" /><circle cx="438" cy="146" r="5" /><circle cx="438" cy="278" r="5" /></>;
    case "hose": return <><path d="M354 40 C397 38 436 48 430 88 S401 102 421 131" className={styles.hose} /><rect x="347" y="34" width="16" height="12" rx="3" /><rect x="416" y="123" width="12" height="16" rx="3" /></>;
    case "abs-sensor": return <><path d="M158 51 L189 74 Q214 106 224 145" className={styles.wire} /><rect x="220" y="140" width="12" height="30" rx="4" transform="rotate(-30 226 155)" /></>;
    case "brake-hub": return <><ellipse cx="292" cy="215" rx="33" ry="48" /><ellipse cx="292" cy="215" rx="13" ry="20" />{[[292,180],[315,205],[305,245],[275,240],[269,199]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />)}</>;
    case "strut": return <><path d="M292 50 L312 52 L329 223 L311 235 Z" /><path d="M297 169 L321 167 L332 235 L312 240 Z" /><path d="M322 230 L347 241 L342 254 L318 242 Z" /></>;
    case "spring": return <><path d="M264 75 Q306 64 313 78 Q322 91 267 96 Q247 104 318 115 Q332 127 270 135 Q250 146 321 154 Q334 169 277 180" className={styles.spring} /><path d="M258 69 L316 63 M267 185 L329 176" className={styles.hose} /></>;
    case "mount": return <><ellipse cx="296" cy="47" rx="43" ry="14" /><rect x="282" y="24" width="27" height="20" rx="5" /><circle cx="267" cy="41" r="4" /><circle cx="324" cy="40" r="4" /></>;
    case "control-arm": return <><path d="M111 311 L350 305 Q370 317 348 332 L156 369 L137 350 L299 319 L113 334 Z" /><ellipse cx="115" cy="322" rx="18" ry="17" /><ellipse cx="152" cy="358" rx="18" ry="15" /></>;
    case "ball-joint": return <><path d="M344 300 L356 300 L356 325 L344 325 Z" /><ellipse cx="350" cy="316" rx="17" ry="12" /><path d="M339 305 Q350 293 361 305" /></>;
    case "knuckle": return <><path d="M336 231 L356 226 L376 251 L402 261 L403 308 L366 329 L353 311 L365 295 L351 277 L337 265 Z" /><circle cx="349" cy="247" r="6" /></>;
    case "tie-rod": return <><path d="M111 275 L310 268 L340 273 L341 287 L309 284 L111 289 Z" /><circle cx="343" cy="280" r="12" /><path d="M120 275 V289 M128 275 V289 M136 275 V289" /></>;
    case "stabilizer-link": return <><path d="M61 347 L181 332 L202 320" className={styles.hose} /><path d="M203 319 L216 213 L300 219" className={styles.link} /><circle cx="215" cy="215" r="10" /><circle cx="204" cy="318" r="10" /></>;
    case "suspension-hub": return <><ellipse cx="410" cy="285" rx="41" ry="47" /><ellipse cx="410" cy="285" rx="14" ry="17" />{[[410,251],[439,275],[429,311],[390,309],[382,274]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />)}</>;
    default: return null;
  }
}

function AssemblyDiagram({ areaId, selectedPartId, zoomed, onSelect }: { areaId: VisualAreaId; selectedPartId: string; zoomed: boolean; onSelect: (id: string) => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const area = VISUAL_AREAS.find((item) => item.id === areaId)!;
  const selected = area.parts.find((part) => part.id === selectedPartId);
  return <svg viewBox={zoomed && selected ? selected.zoom : "0 0 600 400"} className={styles.assembly} role="group" aria-labelledby={titleId} aria-describedby={descriptionId}>
    <title id={titleId}>{`${area.label} component diagram`}</title>
    <desc id={descriptionId}>Original generic schematic. Select a numbered component with mouse, Enter or Space. The matching part list below provides the same choices. Geometry is not vehicle-specific or to scale.</desc>
    <g className={styles.context} aria-hidden="true">{areaId === "brakes" ? <><ellipse cx="275" cy="218" rx="92" ry="130" /><path d="M167 318 L178 131 L214 98" /><path d="M269 218 L190 214" /></> : <><path d="M80 304 L100 360 L170 382 M248 33 L340 33" /><ellipse cx="411" cy="284" rx="65" ry="80" /></>}</g>
    {area.parts.map((part) => <g key={part.id} className={`${styles.part} ${selectedPartId === part.id ? styles.activePart : ""}`} role="button" tabIndex={0} aria-label={`Select ${part.label}`} aria-pressed={selectedPartId === part.id} onClick={() => onSelect(part.id)} onKeyDown={(event) => activate(event, () => onSelect(part.id))}>
      <title>{`${part.label}: ${part.description}`}</title>
      <g className={styles.componentShape}><PartShape id={part.id} /></g>
    </g>)}
    {area.parts.map((part, index) => <g key={part.id} className={`${styles.callout} ${selectedPartId === part.id ? styles.activeCallout : ""}`} onClick={() => onSelect(part.id)} aria-hidden="true">
      <path d={`M${part.callout.join(" ")} L${part.target.join(" ")}`} />
      <circle cx={part.callout[0]} cy={part.callout[1]} r="16" />
      <text x={part.callout[0]} y={part.callout[1] + 5} textAnchor="middle">{index + 1}</text>
    </g>)}
  </svg>;
}

function VehicleOverview({ onFrontWheel }: { onFrontWheel: () => void }) {
  const titleId = useId();
  return <svg viewBox="0 0 600 235" role="group" aria-labelledby={titleId} className={styles.vehicle}>
    <title id={titleId}>Vehicle overview: select the highlighted front wheel area</title>
    <path d="M63 155 L78 117 L183 105 L239 56 L391 56 L444 112 L524 132 L539 172 L503 179 L103 179 L63 171 Z" fill="#e7eef7" stroke="#788ba3" strokeWidth="3" />
    <path d="M202 106 L247 67 L309 67 L309 109 Z M324 67 L384 67 L425 109 L324 109 Z" fill="white" stroke="#9baabd" strokeWidth="2" />
    <path d="M316 120 V168 M75 143 H107 M487 147 H531" stroke="#9baabd" strokeWidth="3" fill="none" />
    <circle cx="458" cy="173" r="33" fill="#53687f" /><circle cx="458" cy="173" r="17" fill="#e3ebf5" />
    <g role="button" tabIndex={0} aria-label="Explore front wheel area" onClick={onFrontWheel} onKeyDown={(event) => activate(event, onFrontWheel)} className={styles.frontWheel}>
      <circle cx="153" cy="173" r="49" fill="#eaf2ff" stroke="#155bd7" strokeWidth="2" strokeDasharray="5 4" />
      <circle cx="153" cy="173" r="33" fill="#155bd7" /><circle cx="153" cy="173" r="17" fill="white" />
      <text x="153" y="233" textAnchor="middle" fill="#155bd7">Front wheel area →</text>
    </g>
  </svg>;
}

export function VisualRepairFinder({ initialArea, initialOperationId, addedIds, onAdd, onView, onClose }: {
  initialArea: VisualAreaId | null;
  initialOperationId: string;
  addedIds: string[];
  onAdd: (entry: CatalogEntry, repair: RepairOperation) => void;
  onView: (entry: CatalogEntry) => void;
  onClose: () => void;
}) {
  const [areaId, setAreaId] = useState<VisualAreaId | null>(initialArea);
  const [partId, setPartId] = useState(initialArea ? visualPartForOperation(initialArea, initialOperationId)?.id ?? "" : "");
  const [side, setSide] = useState<VehicleSide | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [areaChoice, setAreaChoice] = useState(false);
  const [kind, setKind] = useState<"repair" | "diagnosis">("repair");
  const area = VISUAL_AREAS.find((item) => item.id === areaId);
  const part = area?.parts.find((item) => item.id === partId);
  const entries = part ? visualEntries(part, side).filter(({ repair }) => repair.kind === kind) : [];

  function choosePart(id: string) { setPartId(id); setZoomed(false); }
  function chooseArea(id: VisualAreaId) { setAreaId(id); setPartId(""); setSide(null); setZoomed(false); setKind("repair"); }

  return <div className={styles.finder}>
    <div className={styles.finderHeader}><div><p className={styles.eyebrow}>VISUAL PART FINDER</p><h2>Point to the part. Find the work.</h2></div><button type="button" className={styles.textButton} onClick={onClose}>Return to repair list</button></div>
    <nav className={styles.breadcrumb} aria-label="Diagram location"><button type="button" onClick={() => { setAreaId(null); setAreaChoice(false); setPartId(""); }}>Vehicle overview</button>{area && <><ChevronRight size={14} /><span>Front wheel area</span><ChevronRight size={14} /><span>{area.label}</span></>}</nav>
    {!area ? <>
      <p className={styles.description}>Choose the front wheel area to explore the parts behind it. These first diagrams cover front disc brakes and front suspension.</p>
      <VehicleOverview onFrontWheel={() => setAreaChoice(true)} />
      <div className={styles.areaCards} role="group" aria-label="Front wheel systems">
        {VISUAL_AREAS.map((item) => <button type="button" key={item.id} onClick={() => chooseArea(item.id)}><strong>{item.label}</strong><span>{item.id === "brakes" ? "Disc, pads, caliper and fluid hose" : "Spring, damper, arms and steering links"}</span><ArrowRight size={18} /></button>)}
      </div>
      <p role="status" className={styles.description}>{areaChoice ? "Front wheel area selected. Choose brakes or front suspension above." : "You can also choose either system directly."}</p>
    </> : <>
      <div className={styles.toolbar}><div className={styles.areaSwitch} role="group" aria-label="Diagram system">{VISUAL_AREAS.map((item) => <button key={item.id} type="button" aria-pressed={area.id === item.id} onClick={() => chooseArea(item.id)}>{item.label}</button>)}</div><div className={styles.zoomButtons}><button type="button" disabled={!part || zoomed} onClick={() => setZoomed(true)}><ZoomIn size={15} /> Zoom selected part</button><button type="button" disabled={!zoomed} onClick={() => setZoomed(false)}><RotateCcw size={15} /> Fit diagram</button></div></div>
      <p className={styles.diagramCaption}>{area.subtitle}</p>
      <AssemblyDiagram areaId={area.id} selectedPartId={partId} zoomed={zoomed} onSelect={choosePart} />
      <p className={styles.disclaimer}>Original identification schematic · not to scale or matched to the sample vehicle. Confirm design and serviceability before selecting work.</p>
      <div className={styles.partList} role="group" aria-label="Diagram part list">{area.parts.map((item, index) => <button key={item.id} type="button" aria-pressed={partId === item.id} onClick={() => choosePart(item.id)}><span className={styles.partNumber}>{index + 1}</span><span>{item.label}</span></button>)}</div>
      {part ? <section className={styles.partWork} aria-label="Selected diagram component"><p className={styles.eyebrow}>SELECTED COMPONENT</p><h3>{part.label}</h3><p>{part.description}</p><p className={styles.scope}>{part.scope}</p>
        {part.sideRequired && <div className={styles.sidePicker} role="group" aria-label="Vehicle side"><span>Which side?</span>{(["left", "right"] as const).map((item) => <button type="button" key={item} aria-pressed={side === item} onClick={() => setSide(item)}>Vehicle {item}</button>)}<small>Left/right is from the vehicle’s forward-facing perspective.</small></div>}
        <div className={styles.workSwitch} role="group" aria-label="Diagram work type"><button type="button" aria-pressed={kind === "repair"} onClick={() => setKind("repair")}>Repairs</button><button type="button" aria-pressed={kind === "diagnosis"} onClick={() => setKind("diagnosis")}>Diagnostic checks</button></div>
        {kind === "repair" && part.sideRequired && !side && <p className={styles.scope} role="status">Choose vehicle left or right before adding a repair.</p>}
        {entries.map((entry) => {
          const estimateRepair = visualEstimateRepair(entry.repair, part, side);
          const added = estimateRepair ? addedIds.includes(estimateRepair.id) : false;
          return <article key={entry.repair.id} className={styles.workRow}><div><strong>{entry.repair.label}</strong><small>{entry.repair.hours?.toFixed(1)} hrs · provisional planning allowance</small><button type="button" className={styles.textButton} onClick={() => onView(entry)}>View in catalog</button></div><button type="button" className={styles.addButton} disabled={!estimateRepair || added} aria-label={added ? `${estimateRepair!.label} added from diagram` : `Add ${estimateRepair?.label ?? entry.repair.label} from diagram`} onClick={() => { if (estimateRepair) onAdd(entry, estimateRepair); }}>{added ? <><Check size={15} /> Added</> : "Add"}</button></article>;
        })}
      </section> : <div className={styles.choosePrompt}>Select a numbered part in the illustration or the matching list. Its name and available work will appear here.</div>}
      <button type="button" className={styles.textButton} onClick={() => { setAreaId(null); setPartId(""); setAreaChoice(true); }}><ArrowLeft size={15} /> Back to front wheel systems</button>
    </>}
  </div>;
}
