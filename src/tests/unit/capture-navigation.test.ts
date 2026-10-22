import { describe, expect, it } from "vitest";
import { captureToolFromQuery, captureToolHref, captureTools, MOBILE_HOME_HREF } from "@/features/mobile-capture/capture-navigation";

describe("mobile home and capture shortcuts", () => {
  it("opens the icon launcher explicitly at any viewport width", () => {
    expect(MOBILE_HOME_HREF).toBe("/?view=mobile");
  });
  it("preserves the exact manager page and selects the requested tool", () => {
    const source = "/manager-workspace?mode=coo&section=queue";
    const url = new URL(captureToolHref("id-front", source), "https://app.example");
    expect(url.pathname).toBe("/capture");
    expect(url.searchParams.get("returnTo")).toBe(source);
    expect(url.searchParams.get("tool")).toBe("id-front");
    expect(url.searchParams.get("kind")).toBe("ID");
    expect(url.searchParams.get("destination")).toBe("CUSTOMER");
  });
  it("offers all five tools without a role gate", () => {
    expect(captureTools.map((tool) => tool.key)).toEqual(["photo", "barcode", "id-front", "id-barcode", "document"]);
    for (const tool of captureTools) expect(captureToolFromQuery(tool.key)).toBe(tool);
    expect(captureToolFromQuery("unrecognized")).toBeNull();
  });
  it.each(["https://untrusted.example", "//untrusted.example", "/\\untrusted.example", "/bad\npath"])("rejects unsafe return paths: %s", (source) => {
    const url = new URL(captureToolHref(null, source), "https://app.example");
    expect(url.searchParams.get("returnTo")).toBe(MOBILE_HOME_HREF);
  });
});
