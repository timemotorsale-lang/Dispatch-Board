import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { DealDocumentWorkspace } from "@/features/sales-documents/deal-document-workspace";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";

describe("prepared sales forms", () => {
  it.each(["WORKING", "CLOSED"])("keeps forms collapsed and preserves preview and download for %s jackets", state => {
    const jacket = {
      id: "deal", state, requirements: [], checklist: [], history: [], documents: [
        { id: "form", type: "sales-agreement", source: "GENERATED", fileName: "agreement.pdf", reviewed: false }
      ]
    } as unknown as SalesDocumentJacketView;
    const markup = renderToStaticMarkup(<DealDocumentWorkspace jacket={jacket} canManage={false} onSaved={vi.fn()} onBusyChange={vi.fn()} />);
    expect(markup).toContain("Prepared forms · 1 — expand to review");
    const drawer = markup.slice(markup.indexOf("<details"), markup.indexOf("</details>") + 10);
    expect(drawer.split(">")[0]).not.toContain("open");
    expect(drawer).toContain("Review form");
    expect(drawer).toContain("?download=1");
    expect(drawer.includes(">Replace</button>")).toBe(state === "WORKING");
  });
});
