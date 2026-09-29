import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getGenerationSettings: vi.fn(),
  listActiveUserSummaries: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  requireCurrentUser: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/features/board/board-screen", () => ({
  BoardScreen: ({ initialView, isManager }: { initialView: string; isManager: boolean }) => (
    <section data-initial-view={initialView} data-manager={String(isManager)}>
      Dispatch Board page
    </section>
  )
}));

vi.mock("@/server/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser
}));

vi.mock("@/server/services/app-settings-service", () => ({
  getGenerationSettings: mocks.getGenerationSettings
}));

vi.mock("@/server/services/user-summary", () => ({
  listActiveUserSummaries: mocks.listActiveUserSummaries
}));

import BoardPage from "@/app/(app)/board/page";

function user(roles: string[]): AuthenticatedUser {
  return {
    id: "user-1",
    name: "Test User",
    email: "user@example.test",
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] }
  };
}

describe("board page access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGenerationSettings.mockResolvedValue({ timezone: "America/Chicago" });
    mocks.listActiveUserSummaries.mockResolvedValue([]);
  });

  it("lets an Operations Coordinator open the Dispatch Board from the workspace sidebar", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["Operations Coordinator"]));

    const markup = renderToStaticMarkup(await BoardPage({
      searchParams: Promise.resolve({ view: "live" })
    }));

    expect(markup).toContain("Dispatch Board page");
    expect(markup).toContain('data-initial-view="live"');
    expect(markup).toContain('data-manager="false"');
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.listActiveUserSummaries).not.toHaveBeenCalled();
  });

  it("keeps technician-only users out of the full Dispatch Board", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["Mechanic"]));

    await expect(BoardPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/my-tasks");
    expect(mocks.redirect).toHaveBeenCalledWith("/my-tasks");
  });
});
