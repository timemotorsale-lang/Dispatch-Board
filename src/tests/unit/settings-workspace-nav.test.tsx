import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";

const destinations = [
  "/settings/team/company-access",
  "/settings/labor-catalog",
  "/settings/labor-rate",
  "/settings/vehicle-operations",
  "/settings",
  "/settings/appointments",
  "/settings/appointments/catalog",
  "/settings/appointments/automation",
  "/settings/team",
];

describe("SettingsWorkspaceNav", () => {
  const markup = renderToStaticMarkup(
    <SettingsWorkspaceNav active="appointment-catalog" counts={{ users: 7, roles: 3, duties: 5 }} />,
  );
  const desktop = markup.match(/<aside\b[^>]*>(.*?)<\/aside>/)?.[1];
  const mobile = markup.match(/<details\b[^>]*>(.*?)<\/details>/)?.[1];

  it("renders a labeled native disclosure closed by default", () => {
    expect(markup).toMatch(/<details class="[^"]+"><summary>Settings directory<\/summary>/);
  });

  it("preserves every destination and marks the current page in both layouts", () => {
    for (const directory of [desktop, mobile]) {
      expect(directory).toBeDefined();
      expect(directory).toContain('<nav aria-label="Settings directory"');
      expect(Array.from(directory!.matchAll(/href="([^"]+)"/g), ([, href]) => href)).toEqual(destinations);
      expect(directory).toContain('aria-current="page" href="/settings/appointments/catalog"');
      expect(directory!.match(/aria-current="page"/g)).toHaveLength(1);
      expect(directory).toContain("<strong>7</strong><span>staff accounts</span>");
    }
  });
});
