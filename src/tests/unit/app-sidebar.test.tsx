import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/layout/app-sidebar";
import type { AuthenticatedUser } from "@/server/auth/store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks/intake",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

const user: AuthenticatedUser = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "manager@example.com",
  id: "user-1",
  isActive: true,
  name: "Test Manager",
  roles: ["Manager"]
};

describe("AppSidebar", () => {
  it("uses the official logo and exposes the collapse action when expanded", () => {
    const markup = renderToStaticMarkup(
      <AppSidebar compact={false} isOpen={false} onClose={() => undefined} onToggleCompact={() => undefined} user={user} />
    );

    expect(markup).toContain("time-motor-sales-horizontal-reversed");
    expect(markup).toContain('aria-label="Collapse navigation"');
    expect(markup).toContain("Task Intake");
  });

  it("uses the official mark and icon-only navigation when collapsed", () => {
    const markup = renderToStaticMarkup(
      <AppSidebar compact isOpen={false} onClose={() => undefined} onToggleCompact={() => undefined} user={user} />
    );

    expect(markup).toContain("time-motor-sales-mark");
    expect(markup).toContain('aria-label="Expand navigation"');
    expect(markup).toContain('title="Task Intake"');
  });
});
