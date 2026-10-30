"use client";

import { useState } from "react";
import { ASSEMBLY_TREES, assemblyPath, componentFor } from "@/lib/autobody-estimating/catalog";
import type { AssemblyItem } from "@/lib/autobody-estimating/assemblies";
import styles from "./workspace.module.css";

function descendants(node: AssemblyItem): AssemblyItem[] { return [node, ...(node.children ?? []).flatMap(descendants)]; }
function PartShape({ item }: { item: AssemblyItem }) {
  if (/clip|fastener|mount|striker|terminal|plug/.test(item.label.toLowerCase())) return <><path d="M36 36H91V71H36Z" /><circle cx="50" cy="52" r="7" /><circle cx="78" cy="52" r="7" /><path d="M110 27V86M100 40H120M100 72H120" /></>;
  if (/regulator/.test(item.label.toLowerCase())) return <><path d="M25 24H133M25 91H133M39 29L113 85M115 29L41 85" /><circle cx="78" cy="57" r="12" /><path d="M25 24V91M133 24V91" /></>;
  if (item.geometry === "sensor" || /motor|actuator|switch|latch|sensor|speaker/.test(item.label.toLowerCase())) return <><rect x="43" y="23" width="69" height="62" rx="12" /><circle cx="76" cy="54" r="21" /><circle cx="76" cy="54" r="6" /><path d="M112 42H138V66H112M54 85V98M98 85V98" /></>;
  if (item.geometry === "glass") return <><path d="M27 24H111L141 77H18Z" /><path d="M44 32L32 66M60 32L48 66" /></>;
  if (item.geometry === "tube") return <><path d="M20 27H60V75H125V31H143M25 33H54V81H131V36" /><path d="M13 18H30V40H13M133 20H152V42H133" /></>;
  if (item.geometry === "seal") return <><path d="M20 20H130V90H20ZM32 32H118V78H32Z" /><path d="M19 55H33M118 55H132" /></>;
  if (item.geometry === "rail" || item.geometry === "beam") return <><path d="M17 37H135V68H17ZM27 44H125V61H27Z" /><circle cx="40" cy="52" r="5" /><circle cx="112" cy="52" r="5" /></>;
  return <><path d="M18 21H111L140 52V92H16Z" /><path d="M29 30H103L123 51H28ZM31 65H122V80H31Z" /><path d="M43 90V96M114 90V96" /></>;
}

export function ComponentExplorer({ componentId, onSelect, forceOpen = false }: { componentId: string; onSelect: (id: string) => void; forceOpen?: boolean }) {
  const [query, setQuery] = useState(""), [expandAll, setExpandAll] = useState(false), [zoom, setZoom] = useState(1);
  const path = assemblyPath(componentId), root = ASSEMBLY_TREES[path[0]];
  if (!root) return <section className={styles.componentExplorer}><h3>Component breakdown</h3><p className={styles.generic}>A detailed breakdown for this selection is not cataloged yet. Use its current operation and record the actual parts and procedure references. Uncataloged parts are not assumed absent.</p></section>;
  const nodes = descendants(root), current = nodes.find(node => node.id === componentId) ?? root, shown = current.children?.length ? current.children : [current];
  const term = query.trim().toLowerCase(), matches = (node: AssemblyItem): boolean => !term || node.label.toLowerCase().includes(term) || (node.children ?? []).some(matches);
  function tree(node: AssemblyItem) {
    if (!matches(node)) return null;
    return <li key={node.id}>{node.children?.length ? <details open={expandAll || path.includes(node.id)}><summary>{node.label} <small>({descendants(node).length - 1})</small></summary><button type="button" aria-pressed={componentId === node.id} onClick={() => onSelect(node.id)}>Select {node.label}</button><ul>{node.children.map(tree)}</ul></details> : <button type="button" aria-pressed={componentId === node.id} onClick={() => onSelect(node.id)}>{node.label}{node.assessment ? " · technical review" : ""}</button>}</li>;
  }
  const Container = forceOpen ? "section" : "details";
  return <Container className={styles.componentExplorer} aria-label="Assembly component explorer">
    {forceOpen ? <h3>{root.label} components ({nodes.length - 1})</h3> : <summary>Explore {root.label.toLowerCase()} components ({nodes.length - 1})</summary>}
    <p className={styles.generic}>Select a part or expand a branch. Generic component map; confirm actual fitment and serviceability.</p>
    <nav className={styles.componentBreadcrumbs} aria-label="Component path">{path.map((id, index) => <button type="button" key={id} aria-current={id === componentId ? "location" : undefined} onClick={() => onSelect(id)}>{index ? "› " : ""}{nodes.find(node => node.id === id)?.label ?? componentFor(id)?.label}</button>)}</nav>
    <div className={styles.viewerControls}><button type="button" aria-label="Enlarge component breakdown" onClick={() => setZoom(value => Math.min(3, value + .25))}>+</button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="Reduce component breakdown" onClick={() => setZoom(value => Math.max(.75, value - .25))}>−</button><button type="button" onClick={() => setZoom(1)}>Fit parts</button></div>
    <div className={styles.partsCanvas} tabIndex={0} role="region" aria-label="Scrollable component breakdown">
      <svg viewBox={`0 0 780 ${Math.ceil(shown.length / 3) * 170 + 44}`} width={`${zoom * 100}%`} style={{ minWidth: `${zoom * 580}px` }} aria-label={`${current.label} separated component schematic`}>
        <text x="16" y="25" fontSize="16" fill="#233e60">{current.label} · separate schematic parts, not mounting positions</text>
        {shown.map((node, index) => <g key={node.id} transform={`translate(${22 + index % 3 * 258} ${48 + Math.floor(index / 3) * 170})`} data-component={node.id} role="button" tabIndex={0} aria-label={`Explore ${node.label}`} onClick={() => onSelect(node.id)} onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect(node.id); } }}>
          <title>{node.label}</title><rect x="0" y="0" width="240" height="156" rx="9" fill={node.id === componentId ? "#dce8ff" : "#f5f8fc"} stroke="#b7c9e1" /><g transform="translate(42 7)" fill="#dce6f3" stroke="#48698e" strokeWidth="2"><PartShape item={node} /></g><text x="10" y="124" fontSize="12" fill="#233e60">{node.label.length > 33 ? `${node.label.slice(0, 31)}…` : node.label}</text><text x="10" y="144" fontSize="11" fill="#526e8d">{node.children?.length ? `${descendants(node).length - 1} components · open` : "Select operation / confirm serviceability"}</text>
        </g>)}
      </svg>
    </div>
    <div className={styles.actions}><label>Find a component<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Motor, clip, glass, latch…" /></label><button type="button" onClick={() => setExpandAll(value => !value)}>{expandAll ? "Collapse branches" : "Expand all branches"}</button></div>
    {term && !matches(root) ? <p role="status">No cataloged component matches. Confirm the supplier parts list before concluding that a part is absent.</p> : <ul key={`${root.id}:${expandAll}`} className={styles.assemblyTree}>{root.children?.map(tree)}</ul>}
    <p className={styles.generic}>Selecting a component opens its operations below the diagram. It adds no charge automatically. Check included work before charging for both an assembly and its components.</p>
  </Container>;
}
