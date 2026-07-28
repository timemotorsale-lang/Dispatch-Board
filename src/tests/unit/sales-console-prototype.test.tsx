import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SalesConsolePrototype } from "@/features/sales/sales-console-prototype";

describe("Sales Console prototype", () => {
  it("renders the first sales console slice with the required operating surfaces", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Enterprise Sales Console prototype");
    expect(markup).toContain("Salesperson Today");
    expect(markup).toContain("Deal Desk");
    expect(markup).toContain("Inventory Intelligence");
    expect(markup).toContain("Manager Command Center");
    expect(markup).toContain("Lead Operations");
  });

  it("keeps the first slice non-destructive and prototype-scoped", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Prototype only");
    expect(markup).toContain("does not send customer messages");
    expect(markup).toContain("reserve vehicles");
    expect(markup).toContain("approve discounts");
    expect(markup).toContain("write production records");
  });
});
