import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getWebsiteDestinations } from "@/features/website-console/destinations";
import { canOpenWebsiteConsole } from "@/features/website-console/policy";
import { resolveWebsiteSection, websiteSections } from "@/features/website-console/navigation";
import { WebsiteConsole } from "@/features/website-console/website-console";
import { getConsoleNavigation } from "@/components/layout/console-navigation";
import { getNavigationGroups } from "@/components/layout/navigation";
import { isRoutePermittedForUser, resolvePostLoginRoute } from "@/server/auth/navigation";

const { requireUser } = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: requireUser }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
import WebsiteConsolePage from "@/app/(app)/website-console/page";

function actor(roles: string[] = ["General Manager"], duties: string[] = []): AuthenticatedUser {
  return { id: "website-manager", name: "Test Manager", email: "manager@example.test", isActive: true, roles, duties: { direct: duties, roleDefaults: [], all: duties } };
}

describe("Website Console destinations", () => {
  it("does not invent a public domain or a preview address", () => {
    expect(getWebsiteDestinations({})).toEqual({ publicUrl: null, previewUrl: null });
  });
  it("accepts an explicit HTTPS public origin", () => {
    expect(getWebsiteDestinations({ DEALERSHIP_PUBLIC_URL: "https://cars.example.com/" }).publicUrl).toBe("https://cars.example.com");
  });
  it("offers the known local review server by default in development", () => {
    expect(getWebsiteDestinations({ NODE_ENV: "development" })).toEqual({ publicUrl: null, previewUrl: "http://127.0.0.1:3100" });
  });
  it("hides preview once the public domain is configured or review is disabled", () => {
    expect(getWebsiteDestinations({ NODE_ENV: "development", DEALERSHIP_PUBLIC_URL: "https://cars.example.com", DEALERSHIP_PREVIEW_URL: "http://localhost:3100" }).previewUrl).toBeNull();
    expect(getWebsiteDestinations({ NODE_ENV: "development", DEALERSHIP_PREVIEW_ENABLED: "false" }).previewUrl).toBeNull();
    expect(getWebsiteDestinations({ NODE_ENV: "production" }).previewUrl).toBeNull();
  });
  it.each(["javascript:alert(1)", "https://user:pass@example.com", "https://example.com/staff", "https://example.com/?token=secret", "https://example.com/#token", "http://example.com", "https://localhost", "not a url"])("rejects unsafe public destination %s", (value) => {
    expect(getWebsiteDestinations({ DEALERSHIP_PUBLIC_URL: value }).publicUrl).toBeNull();
  });
  it("permits only explicit loopback HTTP previews, never in production", () => {
    expect(getWebsiteDestinations({ NODE_ENV: "development", DEALERSHIP_PREVIEW_URL: "http://127.0.0.1:3100" }).previewUrl).toBe("http://127.0.0.1:3100");
    expect(getWebsiteDestinations({ NODE_ENV: "production", DEALERSHIP_PREVIEW_URL: "http://localhost:3100" }).previewUrl).toBeNull();
    expect(getWebsiteDestinations({ DEALERSHIP_PREVIEW_URL: "http://external.example.com" }).previewUrl).toBeNull();
  });
});

describe("Website Console access and navigation", () => {
  it("allows active managers and delegated managers only", () => {
    expect(canOpenWebsiteConsole(actor())).toBe(true);
    expect(canOpenWebsiteConsole(actor(["Staff"], ["Delegated manager capabilities"]))).toBe(true);
    expect(canOpenWebsiteConsole(actor(["Sales Manager"]))).toBe(false);
    expect(canOpenWebsiteConsole(actor(["Marketing/Advertisement Manager"]))).toBe(false);
    expect(canOpenWebsiteConsole({ ...actor(), isActive: false })).toBe(false);
    expect(canOpenWebsiteConsole(null)).toBe(false);
  });
  it("adds the CCC launch tile only for authorized users", () => {
    const links = (user: AuthenticatedUser) => getNavigationGroups(user).flatMap((group) => group.items);
    expect(links(actor()).find((item) => item.href === "/website-console")).toMatchObject({ title: "Website Console", badge: "Foundation" });
    expect(links(actor(["Staff"])).find((item) => item.href === "/website-console")).toBeUndefined();
  });
  it("supports protected route returns without granting general staff access", () => {
    expect(isRoutePermittedForUser(actor(), "/website-console?section=inventory")).toBe(true);
    expect(isRoutePermittedForUser(actor(["Staff"]), "/website-console")).toBe(false);
    expect(resolvePostLoginRoute(actor(), "/website-console?section=requests")).toBe("/website-console?section=requests");
  });
  it("gives the console its own shell rather than inheriting inventory context", () => {
    expect(getConsoleNavigation("/website-console", actor(), "MANAGEMENT", "INVENTORY")).toMatchObject({ title: "Website Console", homeHref: "/website-console" });
    expect(getConsoleNavigation("/website-console", actor(["Staff"]))).toBeNull();
    expect(getConsoleNavigation("/website-console-other", actor())).toBeNull();
  });
  it("rejects unauthorized direct page access on the server", async () => {
    requireUser.mockResolvedValue(actor(["Staff"]));
    await expect(WebsiteConsolePage({ searchParams: Promise.resolve({ section: "requests" }) })).rejects.toThrow("NOT_FOUND");
    await expect(WebsiteConsolePage({ searchParams: Promise.resolve({ section: "design-studio" }) })).rejects.toThrow("NOT_FOUND");
    await expect(WebsiteConsolePage({ searchParams: Promise.resolve({ section: "payment-estimates" }) })).rejects.toThrow("NOT_FOUND");
    await expect(WebsiteConsolePage({ searchParams: Promise.resolve({ section: "providers" }) })).rejects.toThrow("NOT_FOUND");
    await expect(WebsiteConsolePage({ searchParams: Promise.resolve({ section: "paperwork" }) })).rejects.toThrow("NOT_FOUND");
    await expect(WebsiteConsolePage({ searchParams: Promise.resolve({ section: "appointments" }) })).rejects.toThrow("NOT_FOUND");
  });
  it("requires authentication before rendering the console", async () => {
    requireUser.mockRejectedValue(new Error("LOGIN_REQUIRED"));
    await expect(WebsiteConsolePage({ searchParams: Promise.resolve({}) })).rejects.toThrow("LOGIN_REQUIRED");
    expect(requireUser).toHaveBeenCalledWith("/website-console");
  });
  it("renders an authorized section and handles invalid section input safely", async () => {
    requireUser.mockResolvedValue(actor());
    const element = await WebsiteConsolePage({ searchParams: Promise.resolve({ section: ["requests", "content"] }) });
    expect(renderToStaticMarkup(element)).toContain("Your website workspace");
    expect(resolveWebsiteSection("unknown")).toBe("overview");
  });
});

describe("Website Console truthful states", () => {
  it.each(websiteSections)("renders %s with a persistent CCC return and no fake publication", (section) => {
    const markup = renderToStaticMarkup(<WebsiteConsole section={section} destinations={{ publicUrl: null, previewUrl: null }} />);
    expect(markup).toContain('href="/command-center"');
    expect(markup).toContain("Foundation · not launched");
    expect(markup).toContain("View Website — domain not configured");
    expect(markup).toContain("Local preview requests stay local");
    expect(markup).not.toContain("http://localhost");
    if (section !== "payment-estimates") expect(markup).not.toContain("<form");
  });
  it("keeps public and preview destinations separate and protects new tabs", () => {
    const markup = renderToStaticMarkup(<WebsiteConsole section="overview" destinations={{ publicUrl: "https://cars.example.com", previewUrl: "http://127.0.0.1:3100" }} />);
    expect(markup).toContain('href="https://cars.example.com" target="_blank" rel="noopener noreferrer"');
    expect(markup).not.toContain("Open Website Preview");
    expect(markup).not.toContain('href="http://127.0.0.1:3100"');
    expect(markup).toContain("not proof of deployment");
  });
  it("provides a direct preview tab without replacing console navigation", () => {
    const markup = renderToStaticMarkup(<WebsiteConsole section="overview" destinations={getWebsiteDestinations({ NODE_ENV: "development" })} />);
    expect(markup).toContain('href="http://127.0.0.1:3100" target="_blank" rel="noopener noreferrer">Open Website Preview ↗');
    expect(markup).toContain('href="/website-console?section=inventory"');
    expect(markup).toContain("Keep its window open while reviewing");
    expect(markup).toContain("link disappears automatically");
  });
  it("distinguishes unconnected intake from an empty real inbox", () => {
    const markup = renderToStaticMarkup(<WebsiteConsole section="requests" destinations={{ publicUrl: null, previewUrl: null }} />);
    expect(markup).toContain("This is not an empty live inbox");
    expect(markup).toContain('href="/sales"');
    expect(markup).toContain('href="/vehicles/advisor"');
  });
});
