import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProviderSetup } from "@/features/website-console/provider-setup";
import { filterProviderRegister, providerRegister, providerRegisterVersion } from "@/features/website-console/provider-register";
import { resolveWebsiteSection, websiteConsoleNavigationItems, websiteSections } from "@/features/website-console/navigation";
import { WebsiteConsole } from "@/features/website-console/website-console";

describe("permanent Website Console provider directory", () => {
  it("is discoverable and preserves section/navigation alignment", () => {
    expect(resolveWebsiteSection("providers")).toBe("providers");
    expect(websiteConsoleNavigationItems[websiteSections.indexOf("providers")]).toMatchObject({ title: "Providers & Setup", href: "/website-console?section=providers" });
    const markup = renderToStaticMarkup(<WebsiteConsole section="overview" destinations={{ publicUrl: null, previewUrl: null }} />);
    expect(markup).toContain("Providers &amp; Setup");
    expect(markup).toContain('href="/website-console?section=providers"');
  });
  it("retains every capability and only points to safe official external resources", () => {
    expect(providerRegisterVersion).toBe("1.1");
    expect(providerRegister).toHaveLength(22);
    const ids = providerRegister.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of providerRegister) {
      expect(entry.why.length).toBeGreaterThan(30);
      expect(entry.setup.length).toBeGreaterThanOrEqual(3);
      expect(entry.acceptance.length).toBeGreaterThan(30);
      for (const dependency of entry.dependencies) expect(ids).toContain(dependency);
      for (const link of entry.links) {
        const url = new URL(link.href);
        expect(url.protocol).toBe("https:");
        expect(url.username + url.password + url.search + url.hash).toBe("");
      }
    }
  });
  it("filters by all query words and separates required capabilities from optional subscriptions", () => {
    expect(filterProviderRegister("Stripe", "All").map(entry => entry.id)).toEqual(["payments"]);
    expect(filterProviderRegister("licensed VIN", "Optional").map(entry => entry.id)).toContain("imagery");
    expect(filterProviderRegister("", "Foundation").every(entry => entry.requirement === "Foundation")).toBe(true);
    expect(filterProviderRegister("nonexistent-vendor", "All")).toEqual([]);
    expect(filterProviderRegister("", "Deferred").map(entry => entry.id)).toEqual(["ai"]);
    expect(filterProviderRegister("", "All")).toHaveLength(providerRegister.length);
  });
  it("shows truthful planning states, setup evidence and no credential or activation form", () => {
    const markup = renderToStaticMarkup(<ProviderSetup />);
    expect(markup).toContain("Planning register—not a live connection audit");
    expect(markup).toContain("No commercial decoder subscription is required");
    expect(markup).toContain("Download full setup checklist");
    expect(markup).toContain("What proves it is ready?");
    expect(markup).not.toContain("Notes added to the exported");
    expect(markup).not.toContain('type="password"');
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain(">Activate<");
    expect(markup).not.toContain(">Subscribe<");
    expect(markup).toContain('target="_blank" rel="noopener noreferrer"');
    expect(markup).toContain("exported notes do not sync back");
  });
});
