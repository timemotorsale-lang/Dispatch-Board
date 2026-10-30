import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComponentArtwork, componentArtworkKind } from "@/features/autobody-estimating/component-artwork";
import { ComponentExplorer } from "@/features/autobody-estimating/component-explorer";
import { ASSEMBLY_TREES } from "@/lib/autobody-estimating/catalog";
import type { AssemblyItem } from "@/lib/autobody-estimating/assemblies";

function all(node: AssemblyItem): AssemblyItem[] { return [node, ...(node.children ?? []).flatMap(all)]; }
const door = all(ASSEMBLY_TREES["left-front-door"]);
describe("recognizable component artwork", () => {
  it.each([
    ["p-lfd-trim-speaker", "speaker"], ["p-lfd-trim-card", "door-trim"],
    ["p-lfd-window-regulator", "regulator"], ["p-lfd-window-regulator-motor", "motor"],
    ["p-lfd-lock-latch", "latch"], ["p-lfd-lock-latch-actuator", "actuator"],
    ["p-lfd-trim-clips", "hardware"], ["p-lfd-wire-connector", "connector"],
    ["p-lfd-wire-boot", "boot"], ["p-lfd-wire-harness", "harness"],
  ])("renders %s with its own physical visual rather than a shared symbol", (id, kind) => {
    const item = door.find(node => node.id === id)!;
    expect(item).toBeDefined();
    expect(componentArtworkKind(item)).toBe(kind);
    expect(renderToStaticMarkup(<svg><ComponentArtwork item={item} /></svg>)).toContain(`data-artwork="${kind}"`);
  });
  it("does not reuse material gradient identities between simultaneously visible parts", () => {
    const markup = renderToStaticMarkup(<svg>{door.map(item => <ComponentArtwork key={item.id} item={item} />)}</svg>);
    const ids = [...markup.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const match of markup.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(match[1]);
  });
  it("keeps a drilled-in part accessible and enlarges its drawing without adding work", () => {
    const markup = renderToStaticMarkup(<ComponentExplorer componentId="p-lfd-trim-speaker" onSelect={() => { throw new Error("Rendering must not select work"); }} forceOpen />);
    expect(markup).toContain('aria-label="Explore Speaker / grille"');
    expect(markup).toContain('viewBox="0 0 440 354"');
    expect(markup).toContain('data-artwork="speaker"');
  });
});
