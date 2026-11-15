import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ documents: vi.fn(), user: vi.fn(), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.user }));
vi.mock("@/server/repair-order/document-service", () => ({ getRepairDocuments: mocks.documents }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/features/inventory/service-document", () => ({ ServiceDocument: () => null }));
vi.mock("@/features/inventory/service-document-workflow", () => ({ ServiceDocumentWorkflow: () => null }));
import Page from "@/app/service-documents/page";
import NotFound from "@/app/service-documents/not-found";

const oldDocument = { id: "old-doc", sourceId: "estimate-1", kind: "ESTIMATE", content: { title: "Estimate", number: "RO-1 v1" }, sha256: "old-hash", templateVersion: "v4", createdAt: new Date("2020-01-01"), createdByName: "Staff" };
const newDocument = { ...oldDocument, id: "new-doc", sha256: "new-hash", createdAt: new Date("2021-01-01") };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "staff" });
  mocks.documents.mockResolvedValue({ order: { id: "ro-1", repairOrderNumber: "RO-1" }, documents: [newDocument, oldDocument] });
});

describe("service document history opening", () => {
  it("maps a missing repair order to the not-found boundary", async () => {
    mocks.documents.mockRejectedValue(new Error("Repair order was not found."));
    await expect(Page({ searchParams: Promise.resolve({ repairOrderId: "gone", documentId: "old-doc" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.documents).toHaveBeenCalledWith({ id: "staff" }, "gone");
  });
  it.each(["Vehicle capability required: REPAIR_ORDER_VIEW", "Document integrity verification failed. Do not issue this document.", "Database connection failed"])("does not swallow %s", async message => {
    const error = new Error(message);
    mocks.documents.mockRejectedValue(error);
    await expect(Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1" }) })).rejects.toBe(error);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
  it("keeps an explicitly requested historical document instead of the latest source revision", async () => {
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1", documentId: "old-doc", sourceId: "estimate-1", workspace: "1" }) });
    expect(page.props.selectedId).toBe("old-doc");
    expect(page.props.documents.find((document: { id: string }) => document.id === "old-doc").sha256).toBe("old-hash");
  });
  it.each([{ documentId: "missing", sourceId: "estimate-1" }, { sourceId: "missing" }])("does not fall back to a different saved document for %j", async selection => {
    await expect(Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1", workspace: "1", ...selection }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("retains newest-source selection when no exact document is requested", async () => {
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1", sourceId: "estimate-1" }) });
    expect(page.props.selectedId).toBe("new-doc");
  });
  it("retains the empty legacy history instead of inventing a document", async () => {
    mocks.documents.mockResolvedValue({ order: { id: "ro-1", repairOrderNumber: "RO-1" }, documents: [] });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1" }) }));
    expect(html).toContain("No frozen documents have been issued for this legacy RO.");
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
  it("offers recovery without exposing record identifiers or creating replacement work", () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('href="/vehicles/repair-workbench"');
    expect(html).toContain("Service document unavailable");
    expect(html).not.toContain("old-doc");
  });
});
