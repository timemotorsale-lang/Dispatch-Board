import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn().mockResolvedValue({ id: "manager-1", name: "Test Manager", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } }) }));
import HomePage from "@/app/page";

describe("explicit mobile icon home", () => {
  it("lets a manager open the icon launcher without changing their role landing preference", async () => {
    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({ view: "mobile" }) }));
    expect(markup).toContain('data-mobile-home="true"');
    expect(markup).toContain('aria-label="Mobile operational launcher"');
    expect(markup).toContain("Scan &amp; Capture");
    expect(markup).toContain('href="/capture?returnTo=%2F%3Fview%3Dmobile"');
    expect(markup).toContain("Scan Document");
    expect(markup).toContain("Scan ID");
    expect(markup).toContain('aria-label="Open scan and capture tools"');
    expect(markup).toContain("Manager Review");
  });
  it("keeps the normal responsive home when no explicit mobile view is requested", async () => {
    const markup = renderToStaticMarkup(await HomePage());
    expect(markup).not.toContain('data-mobile-home="true"');
  });
});
