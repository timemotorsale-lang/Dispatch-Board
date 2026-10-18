import { runInNewContext } from "node:vm";
import { Children, isValidElement } from "react";
import Script from "next/script";
import { describe, expect, it } from "vitest";
import RootLayout from "@/app/layout";
import { appearanceInitializationScript } from "@/components/layout/appearance-config";

describe("root layout appearance initialization", () => {
  it("uses the framework-managed script before hydration and preserves page content", () => {
    const layout = RootLayout({ children: "Guide content" });
    const body = layout.props.children;
    const [script, content] = Children.toArray(body.props.children);
    expect(isValidElement(script)).toBe(true);
    if (!isValidElement<{ id: string; strategy: string; dangerouslySetInnerHTML: { __html: string } }>(script)) throw new Error("Missing appearance script");
    expect(script.type).toBe(Script);
    expect(script.props.id).toBe("app-appearance-initialization");
    expect(script.props.strategy).toBe("beforeInteractive");
    expect(script.props.dangerouslySetInnerHTML.__html).toBe(appearanceInitializationScript);
    expect(content).toBe("Guide content");
  });

  it.each(["dark", "light", null, "invalid"])("retains the saved appearance or defaults to light: %s", saved => {
    const documentElement = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
    runInNewContext(appearanceInitializationScript, { document: { documentElement }, localStorage: { getItem: () => saved } });
    const expected = saved === "dark" ? "dark" : "light";
    expect(documentElement.dataset.appTheme).toBe(expected);
    expect(documentElement.style.colorScheme).toBe(expected);
  });

  it("falls back to light when browser storage is unavailable", () => {
    const documentElement = { dataset: {} as Record<string, string>, style: {} };
    runInNewContext(appearanceInitializationScript, { document: { documentElement }, localStorage: { getItem: () => { throw new Error("Storage unavailable"); } } });
    expect(documentElement.dataset.appTheme).toBe("light");
  });
});
