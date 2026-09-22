import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { DocumentLibraryLanding } from "@/features/document-library/document-library-landing";
import { getDocumentLibrary, resetDocumentLibraryDemoState } from "@/server/document-library/service";

const manager = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "manager@example.test",
  id: "manager-1",
  isActive: true,
  name: "Manager",
  roles: ["General Manager"]
};

async function renderLoadedLibrary() {
  const library = await getDocumentLibrary(manager);
  return renderToStaticMarkup(<DocumentLibraryLanding initialLibrary={library} />);
}

describe("document library landing", () => {
  beforeEach(() => {
    resetDocumentLibraryDemoState();
  });

  it("renders the document console shell, search, filters, and category scope", async () => {
    const markup = await renderLoadedLibrary();

    expect(markup).toContain("Document Library");
    expect(markup).toContain("Ingest, classify, link, review, preview, and govern documents");
    expect(markup).toContain("Search file, customer, VIN, RO, claim, type, owner");
    expect(markup).toContain("Filters");
    expect(markup).toContain("Customer");
    expect(markup).toContain("Vehicle");
    expect(markup).toContain("Repair Order");
    expect(markup).toContain("Purchase / Appraisal");
    expect(markup).toContain("Signed Forms");
  });

  it("renders preset document worklists with row reason labels", async () => {
    const markup = await renderLoadedLibrary();

    expect(markup).toContain("Worklists");
    expect(markup).toContain("Needs review");
    expect(markup).toContain("Legal holds");
    expect(markup).toContain("Provider refs");
    expect(markup).toContain("Archive candidates");
    expect(markup).toContain("1 provider reference");
    expect(markup).toContain("Legal hold active");
    expect(markup).toContain("1 linked packet");
  });

  it("renders governed intake, selected document controls, and audit provenance", async () => {
    const markup = await renderLoadedLibrary();

    expect(markup).toContain("Add or link document");
    expect(markup).toContain("Document intake");
    expect(markup).toContain("Action reason");
    expect(markup).toContain("Review decision");
    expect(markup).toContain("Recommended next actions");
    expect(markup).toContain("Clear next packet blocker");
    expect(markup).toContain("Needs correction");
    expect(markup).toContain("Governance");
    expect(markup).toContain("Set hold");
    expect(markup).toContain("Archive eligibility");
    expect(markup).toContain("Audit &amp; source");
    expect(markup).toContain("Customer portal upload.");
  });

  it("renders packet linking and waiver controls with requirement progress", async () => {
    const markup = await renderLoadedLibrary();

    expect(markup).toContain("Claim Packet: Gada Ahmed Jamal");
    expect(markup).toContain("2 of 4 required accepted.");
    expect(markup).toContain("50% packet ready");
    expect(markup).toContain("2 open blockers");
    expect(markup).toContain("Next requirement");
    expect(markup).toContain("Insurance claim intake form");
    expect(markup).toContain("Customer authorization");
    expect(markup).toContain("Damage photos");
    expect(markup).toContain("Tow / storage form");
    expect(markup).toContain("Link selected");
    expect(markup).toContain("Waive");
  });

  it("renders a live review queue for packet blockers", async () => {
    const markup = await renderLoadedLibrary();

    expect(markup).toContain("Document command intelligence");
    expect(markup).toContain("Intelligence");
    expect(markup).toContain("Legal holds");
    expect(markup).toContain("Missing requirements");
    expect(markup).toContain("Resolve legal hold");
    expect(markup).toContain("Collect Damage photos");
    expect(markup).toContain("Review queue");
    expect(markup).toContain("Prioritize missing, blocked, legal-hold, and correction items");
    expect(markup).toContain("Queue filter");
    expect(markup).toContain("All blockers");
    expect(markup).toContain("Damage photos is missing.");
    expect(markup).toContain("Title document is under legal hold");
    expect(markup.match(/Open/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("renders provider references and governed handoff previews", async () => {
    const markup = await renderLoadedLibrary();

    expect(markup).toContain("Provider exchange");
    expect(markup).toContain("Preview external handoffs with audit, permission, and rollback posture");
    expect(markup).toContain("Selected source references");
    expect(markup).toContain("External storage placeholder");
    expect(markup).toContain("Governed handoffs");
    expect(markup).toContain("Export packet");
    expect(markup).toContain("Request e-sign");
    expect(markup).toContain("Upload copy");
    expect(markup).toContain("Reconcile status");
    expect(markup).toContain("Live provider writes remain disabled");
  });

  it("renders a direct unavailable state when the document model is not available", () => {
    const markup = renderToStaticMarkup(
      <DocumentLibraryLanding error="Document Library is temporarily unavailable." initialLibrary={null} />
    );

    expect(markup).toContain("Document Library");
    expect(markup).toContain("Document Library is temporarily unavailable.");
  });
});
