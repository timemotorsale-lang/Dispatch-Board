import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CAMRY_VIEWS, CAMRY_VISIBLE_COMPONENTS, CamryIllustration } from "@/features/autobody-estimating/camry-illustration";
import { OPERATIONS, componentFor } from "@/lib/autobody-estimating/catalog";

describe("Camry exterior illustration scope", () => {
  it.each(CAMRY_VIEWS)("connects every visible %s panel to real catalog work without inventing components", view => {
    const markup = renderToStaticMarkup(<svg><CamryIllustration view={view} selectedId="hood" onSelect={() => {}} /></svg>);
    const drawn = [...markup.matchAll(/data-component="([^"]+)"/g)].map(match => match[1]);
    expect(drawn.sort()).toEqual([...CAMRY_VISIBLE_COMPONENTS[view]].sort());
    for (const id of drawn) {
      expect(componentFor(id)).toBeDefined();
      expect(OPERATIONS.some(operation => operation.componentId === id)).toBe(true);
    }
    expect(markup).toContain("not a repair procedure");
    expect(markup).not.toContain("Select Liftgate");
    expect(markup).not.toContain("Select Pickup tailgate");
  });
  it("distinguishes the side-specific doors and fenders", () => {
    expect(CAMRY_VISIBLE_COMPONENTS.left).toContain("left-front-door");
    expect(CAMRY_VISIBLE_COMPONENTS.right).toContain("right-front-door");
    expect(CAMRY_VISIBLE_COMPONENTS.right).not.toContain("left-fender");
  });
});
