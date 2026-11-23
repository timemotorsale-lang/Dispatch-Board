import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VehicleWorkToolkit } from "@/features/inventory/vehicle-work-actions";
import { pilotRepairOrderHref, vehiclePilotHref } from "@/lib/vehicle-pilot";

const mocks = vi.hoisted(() => ({
  loadOrder: vi.fn(),
  mode: vi.fn(),
  loadVehicle: vi.fn(),
}));

vi.mock("@/server/auth/current-user", () => ({
  requireCurrentUser: async () => ({ id: "staff", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => { throw new Error(`redirect:${href}`); },
}));
vi.mock("@/server/enterprise-command/service", () => ({ getVehiclePilotMode: mocks.mode }));
vi.mock("@/server/shop-planning/service", () => ({ getShopPlanningDetail: mocks.loadOrder }));
vi.mock("@/server/inventory-execution/workbench-service", () => ({ getVehicleExecutionWorkbench: mocks.loadVehicle }));
vi.mock("@/server/repair-order/resume-service", () => ({ listVehicleWorkActions: async () => ({}) }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderCreateOptions: async () => ({ users: [] }) }));
vi.mock("@/server/db/client", () => ({
  prisma: { taskRepairHandoff: { findMany: async () => [] }, inventoryWorkPacket: { findFirst: async () => null } },
}));
vi.mock("@/server/diagnostics/service", () => ({ getRepairOrderDiagnosticsBridge: async () => ({ state: "READY" }) }));
vi.mock("@/server/service-close-parts/service", () => ({ getServiceClosePartsWorkspace: vi.fn() }));
vi.mock("@/server/services/task-execution-readiness", () => ({ getTaskCompletionReadiness: vi.fn() }));
vi.mock("@/server/services/task-read", () => ({ getTaskReadModelById: vi.fn() }));
vi.mock("@/server/repair-order/task-handoff", () => ({ listPendingServiceHandoffs: vi.fn() }));
vi.mock("@/features/advisor/advisor-repair-order-status-view", () => ({ AdvisorRepairOrderStatusView: () => null }));
vi.mock("@/features/advisor/advisor-return-link", () => ({ BackToServiceAdvisorWorkspace: () => null }));
vi.mock("@/features/inventory/repair-order-enterprise-workbench", () => ({
  RepairOrderEnterpriseWorkbench: ({ order, fullDetailMode, recordTool }: { order: typeof savedOrder; fullDetailMode?: boolean; recordTool?: string }) =>
    <div data-record-tool={recordTool}>{fullDetailMode ? "Existing full details" : "Existing"} {order.id} {order.stage}</div>,
}));
vi.mock("@/features/prototype/repair-workflow/repair-workflow-workbench", () => ({
  RepairWorkflowWorkbench: ({ order, returnTo, sharedStepOnly }: { order: typeof savedOrder; returnTo?: string; sharedStepOnly?: boolean }) => (
    <div data-return-to={returnTo}>{sharedStepOnly ? "Shared tool" : "Guided"} {order.id} {order.stage}</div>
  ),
}));
vi.mock("@/features/prototype/repair-workflow/repair-recorded-work", () => ({ RepairRecordedWork: () => null }));
vi.mock("@/features/inventory/vehicle-execution-workbench", () => ({
  VehicleExecutionWorkbench: ({ pilotReturnTo }: { pilotReturnTo?: string }) => <div data-return-to={pilotReturnTo} />,
}));

import RepairWorkbenchPage from "@/app/(app)/vehicles/repair-workbench/page";
import VehicleWorkbenchPage from "@/app/(app)/vehicles/[id]/workbench/page";

const savedOrder = { id: "ro-10", vehicle: { id: "vehicle-10" }, stage: "PARTS" };
const exactOrder = { repairOrderId: savedOrder.id, vehicleId: savedOrder.vehicle.id };

describe("Vehicle Pilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mode.mockResolvedValue("side-by-side");
    mocks.loadOrder.mockResolvedValue(savedOrder);
    mocks.loadVehicle.mockResolvedValue({ identity: { id: savedOrder.vehicle.id } });
  });

  it("offers the same vehicle in both entry points and promotes the pilot link in new-only mode", () => {
    const vehicleId = savedOrder.vehicle.id;
    const sideBySide = renderToStaticMarkup(<VehicleWorkToolkit vehicleId={vehicleId} pilotMode="side-by-side" />);
    expect(sideBySide).toContain(`/vehicles/360/${vehicleId}`);
    expect(sideBySide).toContain(vehiclePilotHref(vehicleId));
    expect(sideBySide).toContain("Open Vehicle Pilot");
    const promoted = renderToStaticMarkup(<VehicleWorkToolkit vehicleId={vehicleId} pilotMode="new" />);
    expect(promoted).not.toContain(`/vehicles/360/${vehicleId}`);
    expect(promoted).not.toContain("Open Vehicle Pilot");
    expect(promoted).toContain(vehiclePilotHref(vehicleId));
  });

  it("loads the same order and its latest saved stage when staff switch workspaces", async () => {
    const classic = renderToStaticMarkup(await RepairWorkbenchPage({ searchParams: Promise.resolve(exactOrder) }));
    expect(classic).toContain("Existing ro-10 PARTS");
    expect(classic).toContain("Open Vehicle Pilot");

    mocks.loadOrder.mockResolvedValue({ ...savedOrder, stage: "QC" });
    const guided = renderToStaticMarkup(await RepairWorkbenchPage({ searchParams: Promise.resolve({ ...exactOrder, pilot: "1" }) }));
    expect(guided).toContain("Guided ro-10 QC");
    expect(guided).toContain("Open existing repair workspace");
    expect(guided).toContain(vehiclePilotHref(savedOrder.vehicle.id));

    const reopened = renderToStaticMarkup(await RepairWorkbenchPage({ searchParams: Promise.resolve(exactOrder) }));
    expect(reopened).toContain("Existing ro-10 QC");
    expect(mocks.loadOrder.mock.calls.map(([, id]) => id)).toEqual(["ro-10", "ro-10", "ro-10"]);
  });

  it("rejects a stale pilot link and preserves the established workspace", async () => {
    mocks.mode.mockResolvedValue("existing");
    await expect(RepairWorkbenchPage({ searchParams: Promise.resolve({ ...exactOrder, pilot: "1" }) }))
      .rejects.toThrow(`redirect:${pilotRepairOrderHref(savedOrder.id, savedOrder.vehicle.id, false)}`);
    await expect(VehicleWorkbenchPage({ params: Promise.resolve({ id: savedOrder.vehicle.id }), searchParams: Promise.resolve({ pilot: "1" }) }))
      .rejects.toThrow("redirect:/vehicles/360/vehicle-10");
    expect(mocks.loadVehicle).not.toHaveBeenCalled();
    const shared = renderToStaticMarkup(await RepairWorkbenchPage({ searchParams: Promise.resolve({ ...exactOrder, step: "parts" }) }));
    expect(shared).toContain("Shared tool ro-10 PARTS");
    expect(shared).not.toContain("Open Vehicle Pilot");
  });

  it("reopens the guided workspace via the exact vehicle context and uses it by default after adoption", async () => {
    const returnTo = vehiclePilotHref(savedOrder.vehicle.id);
    const restored = renderToStaticMarkup(await RepairWorkbenchPage({ searchParams: Promise.resolve({ ...exactOrder, returnTo, step: "parts" }) }));
    expect(restored).toContain("Guided ro-10 PARTS");

    mocks.mode.mockResolvedValue("new");
    const adopted = renderToStaticMarkup(await RepairWorkbenchPage({ searchParams: Promise.resolve(exactOrder) }));
    expect(adopted).toContain("Guided ro-10 PARTS");
    expect(adopted).not.toContain("Open existing repair workspace");
  });

  it("does not open a repair order under a different vehicle ID", async () => {
    await expect(RepairWorkbenchPage({ searchParams: Promise.resolve({ ...exactOrder, vehicleId: "vehicle-other", pilot: "1" }) }))
      .rejects.toThrow(/REPAIR_ORDER_VEHICLE_MISMATCH.*vehicle-other/);
  });

  it("preserves the existing full-details entry point during the side-by-side rollout", async () => {
    const detail = renderToStaticMarkup(await RepairWorkbenchPage({ searchParams: Promise.resolve({ ...exactOrder, fullDetails: "1" }) }));
    expect(detail).toContain("Existing full details ro-10 PARTS");
    expect(detail).not.toContain("data-record-tool");
  });
});
