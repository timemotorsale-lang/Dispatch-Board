import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CrmModeSwitch } from "@/features/crm/crm-mode-switch";

describe("CRM mode switch", () => {
  it("presents CRM Next as the default and tucks older CRM routes behind fallback language", () => {
    const markup = renderToStaticMarkup(<CrmModeSwitch />);

    expect(markup).toContain("Default CRM");
    expect(markup).toContain("CRM Next");
    expect(markup).toContain("Legacy fallbacks");
    expect(markup).toContain("Legacy customer archive");
    expect(markup).toContain("Legacy CRM fallback");
    expect(markup).toContain('href="/crm-next"');
    expect(markup).toContain('href="/customers"');
    expect(markup).toContain('href="/crm"');
  });
});
