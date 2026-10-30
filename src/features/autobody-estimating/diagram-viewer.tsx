"use client";

import { useEffect, useRef, useState } from "react";
import { COMPONENTS, componentFor, assemblyPath, type Component, type Geometry, type Zone } from "@/lib/autobody-estimating/catalog";
import styles from "./workspace.module.css";
import { ComponentArtwork } from "./component-artwork";
import { ComponentExplorer } from "./component-explorer";
import { GroupIllustration } from "./group-illustration";
import { VEHICLE_GROUPS, GROUP_VIEWS, groupComponents, vehicleGroup, type GroupView } from "@/lib/autobody-estimating/vehicle-groups";
import { CamryIllustration, CAMRY_VIEWS, CAMRY_VISIBLE_COMPONENTS, type CamryView } from "./camry-illustration";

function Shape({ kind }: { kind: Geometry }) {
  switch (kind) {
    case "cover": return <><path d="M15 45 Q80 8 145 45 L134 85 Q80 65 26 85Z" /><path d="M45 48H115L108 64H52Z" /><path d="M23 48L37 54M123 54L137 48" /><path d="M35 76Q80 58 125 76" /></>;
    case "beam": return <><path d="M8 48Q80 22 152 48L147 74Q80 48 13 74Z" /><path d="M17 50Q80 32 143 50M30 47V61M130 47V61" /><path d="M35 67L35 88H51V63M109 63V88H125V67" /></>;
    case "hood": return <><path d="M26 18Q80 7 134 18L148 86Q80 108 12 86Z" /><path d="M43 20L31 78M117 20L129 78M31 78Q80 91 129 78" /><path d="M54 29L45 69Q80 78 115 69L106 29Z" /></>;
    case "door": return <><path d="M18 16H117L145 52V98H15Z" /><path d="M29 26H109L128 50H27ZM23 61H134V88H23Z" /><path d="M104 60H123M40 63V88M81 63V88" /></>;
    case "glass": return <><path d="M31 15H129L151 89Q80 102 9 89Z" /><path d="M37 24H123L139 81Q80 91 21 81ZM54 30L34 72M65 30L45 72" /></>;
    case "lamp": return <><path d="M15 25L119 18L148 53L130 84L22 93Z" /><path d="M24 35L111 28L130 53L116 74L30 81Z" /><circle cx="54" cy="56" r="17" /><circle cx="100" cy="52" r="13" /><path d="M34 85L126 77" /></>;
    case "sensor": return <><rect x="38" y="20" width="83" height="63" rx="14" /><circle cx="80" cy="51" r="23" /><circle cx="80" cy="51" r="11" /><path d="M121 39H143V64H121M56 83V96H103V83" /></>;
    case "seal": return <><path d="M25 17H123Q145 17 145 40V82Q145 99 125 99H24Q9 99 9 82V36Q9 17 25 17ZM31 31H116Q129 31 129 43V76Q129 85 116 85H32Q23 85 23 75V45Q23 31 31 31Z" /><path d="M35 24H111M16 44V73M136 43V74" /></>;
    case "wheel": return <><circle cx="80" cy="55" r="43" /><circle cx="80" cy="55" r="28" /><circle cx="80" cy="55" r="9" /><path d="M80 27V46M80 64V83M52 55H71M89 55H108M60 35L74 49M86 61L100 75M100 35L86 49M74 61L60 75" /></>;
    case "rail": return <><path d="M15 24H57L69 43H145V76H49L35 57H15Z" /><path d="M26 32H51L63 52H135V65H55L42 47H26Z" /><path d="M76 44V75M113 44V75" /></>;
    case "seat": return <><path d="M48 12Q80 2 112 12L117 63H43Z" /><path d="M33 62H126L142 87Q80 109 18 87Z" /><path d="M59 20H101L106 55H54ZM46 70H114M37 94V103M124 94V103" /></>;
    case "battery": return <><path d="M12 28L127 12L149 32V85L33 103L12 83Z" /><path d="M12 28L33 48L149 32M33 48V103M60 44V97M89 40V92M117 36V88" /><path d="M72 14V3H89V11M109 9V2H123V7" /></>;
    case "tube": return <><path d="M17 23H106V40H63V78H144V96H45V40H17Z" /><path d="M67 14H130V70H79V40M85 23H120M85 34H120M85 45H120M85 56H120" /></>;
    case "finish": return <><path d="M15 20H140V92H15Z" /><path d="M26 30H66V81H26M77 30H128V81H77M26 43H66M26 56H66M26 69H66" /><path d="M86 73L120 38M86 56L105 36" /></>;
    case "document": return <><path d="M35 8H105L131 34V103H35Z" /><path d="M105 8V34H131M48 48H115M48 63H115M48 78H95M48 91H106" /></>;
    default: return <><path d="M12 28L113 12L148 39L129 98L25 86Z" /><path d="M26 36L105 25L132 45L118 83L35 74ZM39 45L96 38M38 57L94 51" /></>;
  }
}

const detailLayers: Record<Geometry, [string, Geometry][]> = {
  cover: [["Outer cover", "cover"], ["Absorber example", "beam"], ["Reinforcement example", "rail"]],
  beam: [["Impact member", "beam"], ["Attachment support", "rail"], ["Adjacent outer cover", "cover"]],
  door: [["Outer panel", "door"], ["Glass / opening", "glass"], ["Interior trim", "panel"]],
  hood: [["Outer surface", "hood"], ["Inner support example", "rail"], ["Closure equipment", "sensor"]],
  panel: [["Outer surface", "panel"], ["Adjacent panel", "panel"], ["Trim / sealing", "seal"]],
  glass: [["Glass surface", "glass"], ["Surrounding seal", "seal"], ["Adjacent equipment", "sensor"]],
  lamp: [["Lens outline", "lamp"], ["Housing example", "panel"], ["Connector example", "sensor"]],
  sensor: [["Device outline", "sensor"], ["Supporting bracket", "rail"], ["Adjacent trim", "panel"]],
  seal: [["Sealing perimeter", "seal"], ["Adjacent surface", "panel"], ["Opening example", "glass"]],
  wheel: [["Wheel area", "wheel"], ["Suspension access", "rail"], ["Adjacent liner", "panel"]],
  rail: [["Member outline", "rail"], ["Adjacent assembly", "beam"], ["Surface protection", "finish"]],
  seat: [["Seat outline", "seat"], ["Trim access", "panel"], ["Equipment location", "sensor"]],
  battery: [["Enclosure outline", "battery"], ["Underbody protection", "panel"], ["Equipment location", "sensor"]],
  tube: [["Assembly outline", "tube"], ["Adjacent support", "rail"], ["Connection area", "sensor"]],
  finish: [["Selected finish area", "finish"], ["Adjacent blend area", "panel"], ["Trim to review", "seal"]],
  document: [["Scope record", "document"], ["Related evidence", "document"], ["Verification record", "document"]]
};

export function VehicleAreaMap({ selected, onSelect }: { selected: Zone; onSelect: (zone: Zone) => void }) {
  const zones: [Zone, string, number, number, number, number][] = [["front", "Front", 88, 6, 104, 40], ["rear", "Rear", 88, 210, 104, 40], ["left", "Vehicle left", 30, 63, 65, 130], ["right", "Vehicle right", 185, 63, 65, 130], ["roof", "Roof", 108, 60, 64, 75], ["interior", "Interior", 108, 145, 64, 50]];
  return <svg viewBox="0 0 280 260" className={styles.areaMap} aria-label="Vehicle damage areas"><path d="M99 20Q140 0 181 20L208 80V193L185 239Q140 255 95 239L72 193V80Z" fill="#edf2fa" stroke="#7890b0" strokeWidth="2" />{zones.map(([zone, label, x, y, width, height]) => <g key={zone} role="button" tabIndex={0} aria-label={`Choose ${label}`} onClick={() => onSelect(zone)} onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect(zone); } }}><rect x={x} y={y} width={width} height={height} rx="9" fill={selected === zone ? "#dce7ff" : "#ffffff"} stroke={selected === zone ? "#3159d6" : "#c5d0e2"} strokeWidth="2" /><text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fontSize="11" fill="#172c50">{label}</text></g>)}</svg>;
}

export function BodyDiagramViewer({ componentId, onSelect, initialIllustration = "generic", initialGroupId = "sedan", onGroupChange, onIllustrationChange }: { componentId: string; onSelect: (componentId: string) => void; initialIllustration?: string; initialGroupId?: string; onGroupChange?: (id: string) => void; onIllustrationChange?: (profile: string) => void }) {
  const [profile, setProfile] = useState(initialIllustration === "camry-2025-se" || initialIllustration === "vehicle-groups" ? initialIllustration : "generic");
  const [groupId, setGroupId] = useState(vehicleGroup(initialGroupId).id), [groupView, setGroupView] = useState<GroupView>("left"), [assemblyPage, setAssemblyPage] = useState<{ owner: string; page: number } | null>(null);
  function chooseProfile(value: string) { setProfile(value); onIllustrationChange?.(value); }
  const [camryView, setCamryView] = useState<CamryView>("front");
  const component = componentFor(componentId) ?? COMPONENTS[0];
  const [view, setView] = useState<"assembly" | "component" | "detail">("assembly"), [expanded, setExpanded] = useState(false), [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
  const [drillRoot, setDrillRoot] = useState<string | null>(null);
  const lastPanelTap = useRef<{ id: string; time: number; pointerType: string } | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLButtonElement>(null), pointers = useRef(new Map<number, { x: number; y: number }>()), gesture = useRef<{ distance: number; zoom: number } | null>(null);
  const tap = useRef<{ id: string | null; x: number; y: number; moved: boolean } | null>(null);
  const grouped = profile === "vehicle-groups" && view !== "detail", group = vehicleGroup(groupId);
  const exteriorId = assemblyPath(componentId)[0];
  const camry = profile === "camry-2025-se" && view !== "detail";
  const matchedCamryViews = CAMRY_VIEWS.filter(direction => CAMRY_VISIBLE_COMPONENTS[direction].includes(exteriorId));
  const displayedCamryView = matchedCamryViews.includes(camryView) || !matchedCamryViews.length ? camryView : matchedCamryViews[0];
  const family = COMPONENTS.filter(item => item.familyId === component.familyId);
  const page = Math.min(assemblyPage?.owner === componentId ? assemblyPage.page : Math.floor(Math.max(0, family.findIndex(item => item.id === componentId)) / 9), Math.floor((family.length - 1) / 9));
  const operationFocusPending = useRef(false);
  function focusOperations() { const target = document.getElementById("collision-component-operations"); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: "center" }); }
  useEffect(() => {
    if (expanded) dialog.current?.showModal();
    else {
      if (dialog.current?.open) { dialog.current.close(); if (!operationFocusPending.current) opener.current?.focus(); }
      if (operationFocusPending.current) { operationFocusPending.current = false; focusOperations(); }
    }
  }, [expanded]);
  function scale(next: number) { setZoom(Math.max(0.5, Math.min(5, next))); }
  function reset() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function pointerDown(event: React.PointerEvent<SVGSVGElement>) { const target = (event.target as Element).closest("[data-component]"); tap.current = pointers.current.size === 0 ? { id: target?.getAttribute("data-component") ?? null, x: event.clientX, y: event.clientY, moved: false } : null; event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; gesture.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }; } }
  function pointerMove(event: React.PointerEvent<SVGSVGElement>) { const last = pointers.current.get(event.pointerId); if (!last) return; if (tap.current && Math.hypot(event.clientX - tap.current.x, event.clientY - tap.current.y) > 4) tap.current.moved = true; pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.current.size === 2 && gesture.current) { const [a, b] = [...pointers.current.values()]; scale(gesture.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(gesture.current.distance, 1)); } else { const ratio = 900 / event.currentTarget.getBoundingClientRect().width; setPan(value => ({ x: value.x + (event.clientX - last.x) * ratio, y: value.y + (event.clientY - last.y) * ratio })); } }
  function openPanel(id: string) {
    if (!componentFor(id)) return;
    onSelect(id); setDrillRoot(id); setExpanded(true);
    pointers.current.clear(); tap.current = null; gesture.current = null;
  }
  function pointerEnd(event: React.PointerEvent<SVGSVGElement>) {
    if (event.type !== "pointercancel" && tap.current?.id && !tap.current.moved && pointers.current.size === 1) {
      const id = tap.current.id, item = componentFor(id), previous = lastPanelTap.current;
      if (item) {
        select(item);
        if (event.pointerType === "touch" && previous?.pointerType === "touch" && previous.id === id && event.timeStamp - previous.time < 350) openPanel(id);
        lastPanelTap.current = { id, time: event.timeStamp, pointerType: event.pointerType };
      }
    } else lastPanelTap.current = null;
    tap.current = null; pointers.current.delete(event.pointerId); gesture.current = null;
  }
  function select(item: Component) { onSelect(item.id); }
  function closeDiagram() { setExpanded(false); setDrillRoot(null); }
  function showOperations() { if (expanded) { operationFocusPending.current = true; closeDiagram(); } else focusOperations(); }
  const controls = <div className={styles.viewerControls}><button type="button" onClick={() => scale(zoom + 0.25)} aria-label="Zoom in">+</button><span aria-live="polite">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => scale(zoom - 0.25)} aria-label="Zoom out">−</button><button type="button" onClick={reset}>Fit / reset</button>{(["assembly", "component", "detail"] as const).map(mode => <button type="button" key={mode} aria-pressed={view === mode} onClick={() => { setView(mode); reset(); }}>{mode === "assembly" ? "Assembly" : mode === "component" ? "Panel / component" : "Detail inset"}</button>)}</div>;
  const illustration = <svg viewBox="0 0 900 490" className={styles.illustration} tabIndex={0} aria-label={grouped ? `${group.label} ${groupView} body-group diagram. Generic illustration, not verified repair instructions.` : camry ? `2025 Toyota Camry SE ${displayedCamryView} exterior illustration. Visual reference, not verified repair instructions.` : `${component.label} ${view} diagram. Generic illustration, not vehicle-specific repair instructions.`} onDoubleClick={event => {
    const target = (event.target as Element).closest("[data-component]"), recent = lastPanelTap.current;
    const id = target?.getAttribute("data-component") ?? (recent && event.timeStamp - recent.time < 500 ? recent.id : null);
    if (id) { event.preventDefault(); openPanel(id); }
  }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onKeyDown={event => { if (["+", "=", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault(); if (["+", "="].includes(event.key)) scale(zoom + 0.25); if (event.key === "-") scale(zoom - 0.25); if (event.key === "0") reset(); if (event.key.startsWith("Arrow")) setPan(value => ({ x: value.x + (event.key === "ArrowLeft" ? 20 : event.key === "ArrowRight" ? -20 : 0), y: value.y + (event.key === "ArrowUp" ? 20 : event.key === "ArrowDown" ? -20 : 0) })); }}>
    <rect width="900" height="490" fill="#f7f9fd" /><g transform={`translate(${pan.x} ${pan.y}) translate(450 245) scale(${zoom}) translate(-450 -245)`}>
      {grouped ? <GroupIllustration group={group} view={groupView} selectedId={exteriorId} onSelect={id => { const item = componentFor(id); if (item) select(item); }} /> : camry ? <CamryIllustration view={displayedCamryView} selectedId={exteriorId} onSelect={id => { const item = componentFor(id); if (item) select(item); }} /> : view === "assembly" ? family.slice(page * 9, page * 9 + 9).map((item, index) => <g key={item.id} data-component={item.id} transform={`translate(${40 + index % 3 * 295} ${30 + Math.floor(index / 3) * 155})`} role="button" tabIndex={0} aria-label={`Select ${item.label}`} onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(item); } }}><rect x="-8" y="-8" width="276" height="145" rx="12" fill={item.id === component.id ? "#dfe9ff" : "white"} stroke={item.id === component.id ? "#3159d6" : "#cad5e7"} /><g transform="translate(45 0) scale(1)" fill="#e3eaf5" stroke="#3c587d" strokeWidth="2" strokeLinejoin="round"><ComponentArtwork item={item} /></g><text x="8" y="128" fontSize="12" fill="#192f53">{index + 1}. {item.label}</text></g>) : view === "detail" ? <><text x="35" y="35" fontSize="17" fill="#243e65">{component.label} · generic relationship layers</text>{detailLayers[component.geometry].map(([label, geometry], index) => hiddenLayers.includes(`${component.geometry}:${label}`) ? null : <g key={label} transform={`translate(${50 + index * 280} ${90 + index * 40})`}><g transform="scale(1.4)" fill={index === 0 ? "#dbe7ff" : "#edf2f8"} stroke="#35577c" strokeWidth="1.6" strokeLinejoin="round"><Shape kind={geometry} /></g><path d="M80 155V180H30" stroke="#6486b3" fill="none" /><text x="0" y="205" fontSize="14" fill="#243e65">{index + 1}. {label}</text></g>)}<text x="35" y="455" fontSize="14" fill="#243e65">Illustrative relationships only; assembly construction varies by vehicle.</text></> : <><g data-component={component.id} role="button" tabIndex={0} aria-label={`Select ${component.label}`} onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(component); } }} transform="translate(140 30) scale(3.6)" fill="#e0e9f6" stroke="#35577c" strokeWidth="1.3" strokeLinejoin="round"><ComponentArtwork item={component} /></g><text x="35" y="455" fontSize="15" fill="#243e65">{component.label} · {component.zone} area</text></>}
    </g></svg>;
  const content = <><label className={styles.visualProfile}>Diagram type<select value={profile === "generic" ? "generic" : "vehicle-groups"} onChange={event => { chooseProfile(event.target.value); reset(); }}><option value="vehicle-groups">Vehicle groups / body styles</option><option value="generic">Generic component diagrams</option></select></label><p className={styles.generic}>{profile === "camry-2025-se" ? "Original Camry SE exterior study for visual selection only. This does not select or change the RO vehicle, certify fitment or supply OEM procedures or labor times. Detail inset remains generic." : "Original generic navigation - verify the actual vehicle and applicable procedure."}</p>{controls}{profile !== "generic" && <><h3>{group.label} estimating</h3><p className={styles.generic}>Select a panel, explore its components, then choose an estimating operation.</p><label>Vehicle group<select value={groupId} onChange={event => { const next = vehicleGroup(event.target.value); setGroupId(next.id); onGroupChange?.(next.id); chooseProfile("vehicle-groups"); onSelect(groupComponents(next, groupView)[0]); reset(); }}>{VEHICLE_GROUPS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{group.id === "sedan" && <label>Sedan illustration<select value={profile === "camry-2025-se" ? "camry-2025-se" : "vehicle-groups"} onChange={event => { chooseProfile(event.target.value); reset(); }}><option value="vehicle-groups">General sedan</option><option value="camry-2025-se">2025 Toyota Camry SE - exterior study</option></select></label>}{grouped && <div className={styles.viewerControls} aria-label="Body-group view">{GROUP_VIEWS.map(direction => <button type="button" key={direction} aria-pressed={groupView === direction} onClick={() => { setGroupView(direction); const visible = groupComponents(group, direction); if (!visible.includes(componentId)) onSelect(visible[0]); reset(); }}>{direction === "top" ? "Upper panels" : `${direction[0].toUpperCase()}${direction.slice(1)}`}</button>)}</div>}</>}{!camry && !grouped && view === "assembly" && family.length > 9 && <div className={styles.viewerControls}><button type="button" disabled={page === 0} onClick={() => setAssemblyPage({ owner: componentId, page: page - 1 })}>Previous components</button><span>Page {page + 1} / {Math.ceil(family.length / 9)}</span><button type="button" disabled={(page + 1) * 9 >= family.length} onClick={() => setAssemblyPage({ owner: componentId, page: page + 1 })}>More components</button></div>}{camry && <div className={styles.viewerControls} aria-label="Camry exterior view">{CAMRY_VIEWS.map(direction => <button type="button" key={direction} aria-pressed={displayedCamryView === direction} onClick={() => { setCamryView(direction); const candidate = CAMRY_VISIBLE_COMPONENTS[direction]; if (!candidate.includes(componentId)) onSelect(candidate[0]); reset(); }}>{direction === "top" ? "Upper panels" : `${direction[0].toUpperCase()}${direction.slice(1)}`}</button>)}</div>}{view === "detail" && <fieldset className={styles.actions}><legend>Visible relationship layers</legend>{detailLayers[component.geometry].map(([label]) => { const key = `${component.geometry}:${label}`; return <label key={key} className={styles.check}><input type="checkbox" checked={!hiddenLayers.includes(key)} onChange={event => setHiddenLayers(current => event.target.checked ? current.filter(item => item !== key) : [...current, key])} />{label}</label>; })}</fieldset>}{illustration}{grouped && !groupComponents(group, groupView).includes(componentId) && <p className={styles.generic}>This component is inside an assembly or not shown in this exterior. Explore its breakdown below or choose Generic component diagrams.</p>}{camry && !CAMRY_VISIBLE_COMPONENTS[displayedCamryView].includes(componentId) && <p role="status" className={styles.generic}>The selected component is not depicted in this exterior view. Use Generic component diagrams for its schematic.</p>}<div className={styles.diagramDetails}><strong>{component.label}</strong><span>Selected area: {component.zone}. {camry ? "Visible exterior regions are approximate, not removal or joining boundaries." : "Assembly layers show separate component candidates; their placement is schematic."}</span>{view === "detail" && <span>Separate relationship layers add component context. Model-specific attachment, joining and measurement detail is unavailable without an applicable reviewed source.</span>}<span>Click to select · double-click or double-tap a panel to open its components. Drag to pan · pinch to zoom · keyboard + / −, arrows, 0 to reset.</span></div><ComponentExplorer componentId={componentId} onSelect={onSelect} /><div className={styles.actions}><button type="button" onClick={() => openPanel(componentId)}>Open selected panel components</button><button type="button" onClick={showOperations}>Show selected component operations</button></div></>;
  return <section aria-label="Collision diagram viewer" className={styles.viewer}><div className={styles.sectionTitle}><h2>Find it visually</h2><button ref={opener} type="button" onClick={() => { setDrillRoot(null); setExpanded(true); }}>Expand diagram</button></div>{!expanded && content}<dialog ref={dialog} className={styles.expanded} onCancel={event => { event.preventDefault(); closeDiagram(); }}><header><h2>{component.label}</h2><button type="button" onClick={closeDiagram}>Close diagram</button></header>{expanded && (drillRoot ? <section aria-label="Isolated panel components" className={styles.isolatedPanel}><div className={styles.actions}><button type="button" onClick={() => { onSelect(drillRoot); setDrillRoot(null); }}>Back to vehicle diagram</button><button type="button" onClick={showOperations}>Show selected component operations</button></div><p className={styles.generic}>Select a component below, then open its estimating operations.</p><ComponentExplorer key={drillRoot} componentId={componentId} onSelect={onSelect} forceOpen /></section> : content)}</dialog></section>;
}
