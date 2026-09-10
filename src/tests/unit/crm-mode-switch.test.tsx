import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CrmModeSwitch } from "@/features/crm/crm-mode-switch";

describe("CRM mode switch", () => {
  it("presents CRM Next as the default and tucks older CRM routes behind fallback language", () => {
    const markup = renderToStaticMarkup(<CrmModeSwitch />);

    expect(markup).toContain("Default CRM");
    expect(markup).toContain("CRM Next");
    expect(markup).toContain("Older tools");
    expect(markup).toContain("Customer Archive");
    expect(markup).toContain("Current CRM Fallback");
    expect(markup).toContain('href="/crm-next"');
    expect(markup).toContain('href="/customers"');
    expect(markup).toContain('href="/crm"');
  });
});
