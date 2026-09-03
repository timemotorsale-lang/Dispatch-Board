import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategoryBadge, categoryAppearance, categoryRowStyle } from "@/features/appointments/category-badge";

describe("appointment category colors", () => {
  it("gives each Quick Update category a distinct color", () => {
    const categories = ["CUSTOMER", "VENDOR", "FACILITY", "STAFF", "SALES_OPPORTUNITY", "FINANCE", "INVENTORY_PARTS", "SAFETY", "TRAINING", "OTHER"];
    expect(new Set(categories.map(category => categoryAppearance(category).color)).size).toBe(categories.length);
  });
  it("shares colors between appointment categories and reminders", () => {
    expect(categoryAppearance("sales")).toEqual(categoryAppearance("SALES_OPPORTUNITY"));
    expect(categoryAppearance("inventory")).toEqual(categoryAppearance("INVENTORY_PARTS"));
  });
  it("keeps a readable category label and a safe fallback", () => {
    expect(renderToStaticMarkup(<CategoryBadge category="SAFETY" />)).toContain("Safety");
    expect(categoryAppearance(null)).toEqual(categoryAppearance("UNKNOWN"));
    expect(categoryRowStyle("CUSTOMER").borderInlineStart).toContain(categoryAppearance("CUSTOMER").color);
  });
});
