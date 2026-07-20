import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeReceiptToReconLaunch, RECEIPT_TO_RECON_STEPS } from "@/server/inventory-execution/receipt-to-recon-domain";
import { launchReceiptToRecon } from "@/server/inventory-execution/receipt-to-recon-service";
import { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";

const manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } }, staff = { ...manager, id: "staff", roles: ["Inventory Manager"] }, now = new Date("2026-07-19T18:00:00Z");
const input = { expectedInventoryVersion: 4, idempotencyKey: "receipt-slice-1", reason: "Launch approved receipt-to-recon execution slice.", owners: { receipt: "receipt-owner", inspection: "inspection-owner", recon: "recon-owner" }, vehiclePresent: true, keysPresent: true, custodySourceConfirmed: true, targets: Object.fromEntries(RECEIPT_TO_RECON_STEPS.map((step, index) => [step.code, new Date(now.getTime() + (index + 1) * 3_600_000).toISOString()])) };

describe("Inventory EOS receipt-to-recon vertical slice", () => {
  it("normalizes five ordered commitments and explicit readiness", () => {
    const normalized = normalizeReceiptToReconLaunch(input);
    expect(Object.keys(normalized.targets)).toEqual(RECEIPT_TO_RECON_STEPS.map(step => step.code));
    expect(normalized.readiness).toEqual({ vehiclePresent: true, keysPresent: true, custodySourceConfirmed: true });
  });

  it("rejects unordered targets and stale version inputs", () => {
    expect(() => normalizeReceiptToReconLaunch({ ...input, expectedInventoryVersion: 0 })).toThrow("positive whole number");
    expect(() => normalizeReceiptToReconLaunch({ ...input, targets: { ...input.targets, INSPECTION: input.targets.RECEIPT_IDENTITY_CUSTODY } })).toThrow("must increase");
  });

  it("requires manager authority and emits exactly five Task-backed packet identities", async () => {
    const repository = { launch: vi.fn(async (_command, data) => ({ duplicate: false, result: { steps: data.ids }, version: 1 })) };
    await expect(launchReceiptToRecon(staff, "unit-1", input, { organizationId: "org", repository: repository as never })).rejects.toThrow("Manager authority");
    const result = await launchReceiptToRecon(manager, "unit-1", input, { now: () => now, organizationId: "org", repository: repository as never });
    expect(result.result.steps).toHaveLength(5);
    expect(new Set(result.result.steps.flatMap((item: { packetId: string; taskId: string }) => [item.packetId, item.taskId])).size).toBe(10);
    expect(repository.launch).toHaveBeenCalledWith(expect.objectContaining({ commandType: "LAUNCH_RECEIPT_TO_RECON_SLICE", expectedVersion: 0, subjectId: "unit-1" }), expect.objectContaining({ actorUserId: "manager", inventoryUnitId: "unit-1" }));
  });

  it("exposes the slice only with exact InventoryUnit context in Start Workflow", () => {
    const without = getInventoryWorkflowLauncher(manager, {}).cards.find(card => card.id === "WL-02A"), withContext = getInventoryWorkflowLauncher(manager, { inventoryUnitId: "unit-1", version: "4" }).cards.find(card => card.id === "WL-02A");
    expect(without).toMatchObject({ enabled: false, href: null });
    expect(withContext).toMatchObject({ enabled: true });
    expect(withContext?.href).toContain("inventoryUnitId=unit-1"); expect(withContext?.href).toContain("expectedVersion=4");
  });
});
