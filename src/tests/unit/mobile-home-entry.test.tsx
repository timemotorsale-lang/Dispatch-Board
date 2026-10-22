import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn().mockResolvedValue({ id: "manager-1", name: "Test Manager", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } }) }));
import HomePage from "@/app/page";
import { getCurrentUser } from "@/server/auth/current-user";

const manager: AuthenticatedUser = { id: "manager-1", name: "Test Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

beforeEach(() => { vi.mocked(getCurrentUser).mockResolvedValue(manager); });

describe("explicit mobile icon home", () => {
  it.each([{ roles: ["General Manager"] }, { roles: ["Service Advisor"] }, { roles: ["Technician"] }, { roles: [] }])("opens the signed-in user's personal workbook from My Day for roles $roles", async ({ roles }) => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...manager, roles });
    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({ view: "mobile" }) }));
    const myDay = markup.slice(markup.indexOf("<h2>My Day</h2>"));
    expect(myDay.slice(0, myDay.indexOf("</section>"))).toContain("My Workbook");
    const workbookLinks = [...markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].filter((match) => match[2].includes("My Workbook"));
    expect(workbookLinks).toHaveLength(1);
    const destination = new URL(workbookLinks[0][1].replaceAll("&amp;", "&"), "https://app.example");
    expect(destination.pathname).toBe("/vehicles/coo-workbook");
    expect([...destination.searchParams]).toEqual([["workbookScope", "MY"], ["returnTo", "/?view=mobile"]]);
    expect(workbookLinks[0][2]).toContain("lucide-book-open");
  });
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
