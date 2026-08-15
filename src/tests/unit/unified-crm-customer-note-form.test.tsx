import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { UnifiedCrmCustomerNoteForm } from "@/features/unified-crm/unified-crm-customer-note-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

describe("Unified CRM customer note form", () => {
  it("renders the honest note-only language in the default closed state", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerNoteForm allowRestricted={false} customerId="customer-1" />);

    expect(markup).toContain("Add an internal customer note");
    expect(markup).toContain("It does not notify the customer");
    expect(markup).toContain("share outside the permitted team");
    expect(markup).toContain("Add note");
    expect(markup).toContain("aria-expanded=\"false\"");
    expect(markup).not.toContain("Save note");
  });
});
