import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";

const { intake, options, user } = vi.hoisted(() => ({
  intake: vi.fn(), options: vi.fn().mockResolvedValue({ locations: [{ id: "location-1", name: "Main lot" }], users: [{ id: "staff-1", name: "Staff member" }] }),
  user: vi.fn().mockResolvedValue({ id: "reviewer" }),
}));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: user }));
vi.mock("@/server/inventory-unit/compact-intake-service", () => ({ getCompactIntake: async (actor: unknown, query: { vehicleId?: string }) => ({ intake: query.vehicleId ? await intake(actor, query.vehicleId) : null, options: await options() }) }));
import Page from "@/app/(repair-preview)/prototype/inventory-intake/page";

describe("separate compact intake entry", () => {
  it("requires authentication and loads actual selectable locations and staff for a new form", async () => {
    const page = await Page();
    expect(user).toHaveBeenCalledWith("/prototype/inventory-intake");
    expect(page.props.context).toBeUndefined();
    expect(page.props.options.locations[0].id).toBe("location-1");
    expect(page.props.options.users[0].id).toBe("staff-1");
  });

  it("preserves the authorized vehicle and exact intake/unit versions", async () => {
    intake.mockResolvedValueOnce({ vehicleId: "vehicle-1", vehicleNumber: "VEH-1", vin: "3FA6P0K91HR406095", year: 2017, make: "Ford", model: "Fusion", inventoryNumber: "INV-1", unitVersion: 4, intakeVersion: 2, canPrice: false, details: { seller: "Actual source" } });
    const page = await Page({ searchParams: Promise.resolve({ vehicleId: "vehicle-1" }) });
    expect(page.props.context).toMatchObject({ vehicleId: "vehicle-1", intakeVersion: 2, unitVersion: 4, canPrice: false, inventoryNumber: "INV-1" });
    expect(intake).toHaveBeenCalledWith({ id: "reviewer" }, "vehicle-1");
  });

  it("does not substitute a sample vehicle or expose internal errors after a denied lookup", async () => {
    intake.mockRejectedValueOnce(new Error("Private acquisition details"));
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ vehicleId: "denied" }) }));
    expect(html).toContain("Vehicle intake unavailable");
    expect(html).not.toContain("Private acquisition details");
    expect(html).not.toContain("Save Inventory");
  });
});
