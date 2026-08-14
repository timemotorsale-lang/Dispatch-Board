import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser
}));

import CrmPage from "@/app/(app)/crm/page";
import { isRoutePermittedForUser } from "@/server/auth/navigation";

const originalShellMode = process.env.UNIFIED_CRM_SHELL_MODE;

function user(roles: string[]): AuthenticatedUser {
  return {
    id: `user-${roles.join("-").toLowerCase()}`,
    name: "CRM Page User",
    email: "crm-page@example.test",
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] }
  };
}

async function renderPage(view?: string) {
  return renderToStaticMarkup(
    await CrmPage({ searchParams: Promise.resolve(view ? { view } : {}) })
  );
}

describe("Unified CRM page access and fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UNIFIED_CRM_SHELL_MODE = "REVIEW";
  });

  afterEach(() => {
    if (originalShellMode === undefined) delete process.env.UNIFIED_CRM_SHELL_MODE;
    else process.env.UNIFIED_CRM_SHELL_MODE = originalShellMode;
  });

  it("renders only the safe role fallback for an ineligible authenticated user", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["Mechanic"]));

    const markup = await renderPage();

    expect(markup).toContain("Experience review is not available");
    expect(markup).toContain("not enabled for your current workspace");
    expect(markup).toContain('href="/my-tasks"');
    expect(markup).not.toContain("Do this next");
    expect(markup).not.toContain("synthetic scenarios");
  });

  it("fails explicit feature-off closed with the existing manager workspace fallback", async () => {
    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = await renderPage("pipeline");

    expect(markup).toContain("Unified CRM is turned off");
    expect(markup).toContain('href="/manager-workspace"');
    expect(markup).not.toContain("Synthetic pipeline review");
    expect(markup).not.toContain("Do this next");
  });

  it("uses the unchanged Sales landing when a seller is outside the active shell", async () => {
    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    const salesperson = user(["Salesperson"]);
    mocks.requireCurrentUser.mockResolvedValue(salesperson);

    const markup = await renderPage();

    expect(markup).toContain('href="/tasks?department=SALES"');
    expect(isRoutePermittedForUser(salesperson, "/customers")).toBe(true);
    expect(isRoutePermittedForUser(salesperson, "/sales")).toBe(true);
  });

  it("simulates rollback from REVIEW to OFF without removing existing console routes", async () => {
    const manager = user(["General Manager"]);
    mocks.requireCurrentUser.mockResolvedValue(manager);

    const reviewMarkup = await renderPage();
    expect(reviewMarkup).toContain("Do this next");

    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    const rolledBackMarkup = await renderPage();

    expect(rolledBackMarkup).toContain("Experience review is not available");
    expect(rolledBackMarkup).toContain('href="/manager-workspace"');
    expect(rolledBackMarkup).not.toContain("Do this next");
    expect(isRoutePermittedForUser(manager, "/customers")).toBe(true);
    expect(isRoutePermittedForUser(manager, "/sales")).toBe(true);
  });
});
