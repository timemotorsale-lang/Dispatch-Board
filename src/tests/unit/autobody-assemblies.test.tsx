import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ASSEMBLY_PARENTS, ASSEMBLY_TREES, COMPONENTS, OPERATIONS, assemblyPath, componentFor } from "@/lib/autobody-estimating/catalog";
import { emptyBodyDraft, newBodyLine, normalizeBodyDraft, calculateBodyDraft } from "@/lib/autobody-estimating/domain";
import { VEHICLE_GROUPS, GROUP_VIEWS, groupComponents } from "@/lib/autobody-estimating/vehicle-groups";
import { GroupIllustration } from "@/features/autobody-estimating/group-illustration";
import type { AssemblyItem } from "@/lib/autobody-estimating/assemblies";

describe("body group diagrams", () => {
  for (const group of VEHICLE_GROUPS) for (const view of GROUP_VIEWS) {
    it(`${group.id} / ${view} binds every selectable region to catalog work`, () => {
      const markup = renderToStaticMarkup(<svg><GroupIllustration group={group} view={view} selectedId="left-front-door" onSelect={() => {}} /></svg>);
      const drawn = [...markup.matchAll(/data-component="([^"]+)"/g)].map(match => match[1]);
      expect(drawn.sort()).toEqual([...groupComponents(group, view)].sort());
      for (const id of drawn) {
        expect(componentFor(id)).toBeDefined();
        expect(OPERATIONS.some(operation => operation.componentId === id)).toBe(true);
      }
    });
  }
  it("keeps incompatible closure styles out of the exterior selection", () => {
    const pickup = VEHICLE_GROUPS.find(group => group.id === "pickup")!;
    const van = VEHICLE_GROUPS.find(group => group.id === "van")!;
    const coupe = VEHICLE_GROUPS.find(group => group.id === "coupe")!;
    expect(groupComponents(pickup, "rear")).toContain("tailgate");
    expect(groupComponents(pickup, "rear")).not.toContain("liftgate");
    expect(groupComponents(van, "rear")).toEqual(expect.arrayContaining(["left-cargo-door", "right-cargo-door"]));
    expect(groupComponents(coupe, "left")).not.toContain("left-rear-door");
  });
});

describe("nested assembly catalog integrity", () => {
  it("has unique stable identities with real operations and bounded line keys", () => {
    expect(new Set(COMPONENTS.map(item => item.id)).size).toBe(COMPONENTS.length);
    expect(new Set(OPERATIONS.map(item => item.id)).size).toBe(OPERATIONS.length);
    for (const operation of OPERATIONS) {
      const draft = { ...emptyBodyDraft(), lines: [newBodyLine(operation.id)] };
      expect(() => normalizeBodyDraft(draft)).not.toThrow();
    }
  });
  it("preserves ancestry without cycles and reaches individual door hardware", () => {
    const walk = (node: AssemblyItem, path: string[]) => {
      expect(path).not.toContain(node.id);
      expect(componentFor(node.id)).toBeDefined();
      for (const child of node.children ?? []) {
        expect(ASSEMBLY_PARENTS[child.id]).toBe(node.id);
        expect(assemblyPath(child.id)).toEqual([...path, node.id, child.id]);
        walk(child, [...path, node.id]);
      }
    };
    Object.values(ASSEMBLY_TREES).forEach(root => walk(root, []));
    expect(assemblyPath("p-lfd-window-regulator-motor")).toEqual(["left-front-door", "p-lfd-window", "p-lfd-window-regulator", "p-lfd-window-regulator-motor"]);
    expect(assemblyPath("p-lfd-lock-latch-clip")).toHaveLength(4);
    expect(componentFor("p-rsd-slide-drive-motor")).toBeDefined();
  });
  it("keeps safety-sensitive children in assessment / sublet mode", () => {
    for (const component of COMPONENTS.filter(item => item.caution)) expect(component.methods.every(method => ["INSPECT", "SUBLET"].includes(method))).toBe(true);
  });
  it("does not silently charge both an assembly and its included child work", () => {
    const draft = emptyBodyDraft(15000);
    draft.taxBasisPoints = 0; draft.taxReference = "Synthetic zero-tax review";
    draft.lines = [newBodyLine("body:left-front-door:replace"), newBodyLine("body:p-lfd-window-regulator-motor:replace")].map(line => ({ ...line, minutes: 60, basis: "Synthetic assessment", applicability: "Synthetic applicability" }));
    expect(calculateBodyDraft(draft).issues.join(" ")).toContain("Assembly and subcomponent work overlap");
    draft.lines[1].note = "Separate motor fault; reviewed transfer scope is excluded from the assembly allowance.";
    expect(calculateBodyDraft(draft).ready).toBe(true);
    expect(calculateBodyDraft(draft).totalCents).toBe(30000);
  });
});
