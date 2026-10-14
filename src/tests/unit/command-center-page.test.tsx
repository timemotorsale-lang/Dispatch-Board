import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getDefaultLandingRoute } from "@/server/auth/navigation";
import CommandCenterHomePage from "@/app/(app)/command-center/page";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.currentUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/brand/time-motor-sales-logo", () => ({ TimeMotorSalesLogo: () => null }));
const manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };

describe("Command Center launcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue(manager);
    mocks.redirect.mockImplementation(() => { throw new Error("Redirected to permitted workspace"); });
  });
  it("opens reporting from a live tile without offering a self-linked console", async () => {
    const html = renderToStaticMarkup(await CommandCenterHomePage());
    expect(html).toContain('href="/reports"');
    expect(html).toContain("<strong>Reports</strong>");
    expect(html).not.toContain('href="/command-center"');
    expect(html).toContain('href="/manager-workspace"');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("retains the management-workspace access boundary", async () => {
    const staff = { ...manager, roles: ["Sales"] };
    mocks.currentUser.mockResolvedValue(staff);
    await expect(CommandCenterHomePage()).rejects.toThrow("Redirected to permitted workspace");
    expect(mocks.redirect).toHaveBeenCalledWith(getDefaultLandingRoute(staff));
  });
});
