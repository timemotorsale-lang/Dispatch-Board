import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/layout/app-sidebar";
import type { AuthenticatedUser } from "@/server/auth/store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/board",
  useSearchParams: () => new URLSearchParams("view=live&date=2026-11-14"),
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

    expect(markup).toContain("time-motor-sales-mark");
    expect(markup).toContain('aria-label="Collapse navigation"');
    expect(markup).toContain("TIME MOTOR SALES");
  });

  it("uses the official mark and icon-only navigation when collapsed", () => {
    const markup = renderToStaticMarkup(
      <AppSidebar compact isOpen={false} onClose={() => undefined} onToggleCompact={() => undefined} user={user} />
    );

    expect(markup).toContain("time-motor-sales-mark");
    expect(markup).toContain('aria-label="Expand navigation"');
    expect(markup).toContain('title="Time Motor Sales"');
    expect(markup).toContain('aria-label="Dispatch Board"');
    expect(markup).toMatch(/aria-current="page" aria-label="Dispatch Board"[^>]+href="\/board"/);
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
  });
});
