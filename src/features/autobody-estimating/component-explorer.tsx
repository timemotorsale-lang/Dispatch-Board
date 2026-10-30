"use client";

import { useState } from "react";
import { ASSEMBLY_TREES, assemblyPath, componentFor } from "@/lib/autobody-estimating/catalog";
import type { AssemblyItem } from "@/lib/autobody-estimating/assemblies";
import styles from "./workspace.module.css";
import { ComponentArtwork } from "./component-artwork";

function descendants(node: AssemblyItem): AssemblyItem[] { return [node, ...(node.children ?? []).flatMap(descendants)]; }

export function ComponentExplorer({ componentId, onSelect, forceOpen = false }: { componentId: string; onSelect: (id: string) => void; forceOpen?: boolean }) {
  const [query, setQuery] = useState(""), [expandAll, setExpandAll] = useState(false), [zoom, setZoom] = useState(1), [showNames, setShowNames] = useState(true);
  const path = assemblyPath(componentId), root = ASSEMBLY_TREES[path[0]];
  if (!root) return <section className={styles.componentExplorer}><h3>Component breakdown</h3><p className={styles.generic}>A detailed breakdown for this selection is not cataloged yet. Use its current operation and record the actual parts and procedure references. Uncataloged parts are not assumed absent.</p></section>;
  const nodes = descendants(root), current = nodes.find(node => node.id === componentId) ?? root, shown = current.children?.length ? current.children : [current];
  const single = shown.length === 1, columns = single ? 1 : 3, canvasWidth = single ? 440 : 780, rowHeight = single ? 310 : 220;
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
    <div className={styles.viewerControls}><button type="button" aria-label="Enlarge component breakdown" onClick={() => setZoom(value => Math.min(3, value + .25))}>+</button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="Reduce component breakdown" onClick={() => setZoom(value => Math.max(.75, value - .25))}>−</button><button type="button" onClick={() => setZoom(1)}>Fit parts</button><label className={styles.check}><input type="checkbox" checked={showNames} onChange={event => setShowNames(event.target.checked)} />Show part names</label></div>
    <div className={styles.partsCanvas} tabIndex={0} role="region" aria-label="Scrollable component breakdown">
      <svg viewBox={`0 0 ${canvasWidth} ${Math.ceil(shown.length / columns) * rowHeight + 44}`} width={`${zoom * 100}%`} style={{ minWidth: single ? undefined : `${zoom * 580}px` }} aria-label={`${current.label} separated component schematic`}>
        <text x="16" y="25" fontSize="16" fill="#233e60">{current.label} · separate schematic parts, not mounting positions</text>
        {shown.map((node, index) => <g key={node.id} transform={`translate(${single ? 12 : 22 + index % 3 * 258} ${48 + Math.floor(index / columns) * rowHeight})`} data-component={node.id} role="button" tabIndex={0} aria-label={`Explore ${node.label}`} onClick={() => onSelect(node.id)} onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect(node.id); } }}>
          <title>{node.label}</title><rect x="0" y="0" width={single ? 416 : 240} height={single ? 290 : 204} rx="10" fill={node.id === componentId ? "#e1ebff" : "#f5f8fc"} stroke="#b7c9e1" /><g transform={single ? "translate(28 10) scale(2.25)" : "translate(26 12) scale(1.18)"}><ComponentArtwork item={node} /></g>{showNames && <text x="12" y={single ? 265 : 171} fontSize={single ? 15 : 12} fontWeight="600" fill="#233e60">{node.label.length > (single ? 48 : 33) ? `${node.label.slice(0, single ? 46 : 31)}…` : node.label}</text>}<text x="12" y={single ? 284 : 192} fontSize="11" fill="#526e8d">{node.children?.length ? `${descendants(node).length - 1} components · open` : "Select part"}</text>
        </g>)}
      </svg>
    </div>
    <div className={styles.actions}><label>Find a component<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Motor, clip, glass, latch…" /></label><button type="button" onClick={() => setExpandAll(value => !value)}>{expandAll ? "Collapse branches" : "Expand all branches"}</button></div>
    {term && !matches(root) ? <p role="status">No cataloged component matches. Confirm the supplier parts list before concluding that a part is absent.</p> : <ul key={`${root.id}:${expandAll}`} className={styles.assemblyTree}>{root.children?.map(tree)}</ul>}
    <p className={styles.generic}>Selecting a component opens its operations below the diagram. It adds no charge automatically. Check included work before charging for both an assembly and its components.</p>
  </Container>;
}
