import { afterEach, describe, expect, it, vi } from "vitest";
import { readBrowserPreference, writeBrowserPreference } from "@/lib/browser-preferences";

afterEach(() => vi.unstubAllGlobals());
describe("optional browser preferences", () => {
  it("uses safe defaults during server rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(readBrowserPreference("sidebar")).toBeNull();
    expect(writeBrowserPreference("sidebar", "collapsed")).toBe(false);
  });
  it("survives browsers denying storage access", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("Storage denied"); } });
    expect(readBrowserPreference("sidebar")).toBeNull();
    expect(writeBrowserPreference("sidebar", "collapsed")).toBe(false);
  });
  it("survives read and quota failures", () => {
    vi.stubGlobal("window", { localStorage: {
      getItem() { throw new Error("Read blocked"); }, setItem() { throw new Error("Quota exceeded"); }
    } });
    expect(readBrowserPreference("theme")).toBeNull();
    expect(writeBrowserPreference("theme", "dark")).toBe(false);
  });
  it("persists and reads permitted preferences", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    } });
    expect(writeBrowserPreference("sidebar", "expanded")).toBe(true);
    expect(readBrowserPreference("sidebar")).toBe("expanded");
  });
});
