import { expect, it, vi } from "vitest";
import Page from "@/app/(app)/diagnostics/labor-guide/page";
import { laborGuideInvoiceHref } from "@/lib/service-billing-workflow";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/features/inventory/service-billing-workspace", () => ({ ServiceBillingWorkspace: () => null }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

it("opens invoice review on the requested repair order and retains the exact estimate and handoff through sign-in", async () => {
  const repairOrderId = "ro-123";
  const estimateId = "estimate-456";
  const estimateDocument = { documentId: "document-789", documentHash: "a".repeat(64) };
  const returnTo = "/vehicles/repair-workbench?repairOrderId=ro-123&step=handoff";
  const page = await Page({ searchParams: Promise.resolve({ mode: "invoice", repairOrderId, estimateId, ...estimateDocument, returnTo }) });
  expect(page?.props).toMatchObject({ invoiceOnly: true, repairOrderId, estimateId, estimateDocument, returnTo });
  expect(mocks.requireCurrentUser).toHaveBeenCalledWith(laborGuideInvoiceHref(repairOrderId, { estimateId, estimateDocument, returnTo }));
});

it("still opens the Labor Guide catalog for ordinary navigation", async () => {
  await Page({ searchParams: Promise.resolve({ repairOrderId: "ro-123" }) });
  expect(mocks.redirect).toHaveBeenCalledWith("/prototype/repair-explorer?repairOrderId=ro-123");
});
