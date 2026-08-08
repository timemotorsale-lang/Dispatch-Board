import { describe, expect, it } from "vitest";

import {
  getManagerWorkspaceHref,
  normalizeManagerWorkspaceMode,
  readManagerWorkspaceContext,
  withManagerWorkspaceContext
} from "@/lib/manager-workspace-context";

describe("manager workspace context", () => {
  it("creates a canonical return target for every manager mode", () => {
    expect(getManagerWorkspaceHref("CEO")).toBe("/manager-workspace?mode=ceo");
    expect(getManagerWorkspaceHref("COO")).toBe("/manager-workspace?mode=coo");
    expect(getManagerWorkspaceHref("WORK")).toBe("/manager-workspace?mode=work");
  });

  it("contains focused tools inside the selected mode", () => {
    const href = withManagerWorkspaceContext("/appointments?inbox=1", "WORK", { launch: "advisor" });
    const url = new URL(href, "https://workspace.test");

    expect(url.pathname).toBe("/appointments");
    expect(url.searchParams.get("inbox")).toBe("1");
    expect(url.searchParams.get("workspaceContext")).toBe("MANAGEMENT");
    expect(url.searchParams.get("managerMode")).toBe("WORK");
    expect(url.searchParams.get("returnTo")).toBe("/manager-workspace?mode=work");
    expect(url.searchParams.get("launch")).toBe("advisor");
  });

  it("ignores untrusted or incomplete workspace context", () => {
    expect(readManagerWorkspaceContext(new URLSearchParams("workspaceContext=ADVISOR&managerMode=WORK"))).toBeNull();
    expect(readManagerWorkspaceContext(new URLSearchParams("workspaceContext=MANAGEMENT&managerMode=OWNER"))).toBeNull();
    expect(normalizeManagerWorkspaceMode("unknown")).toBe("CEO");
  });

  it("never rewrites external navigation", () => {
    expect(withManagerWorkspaceContext("https://outside.example", "COO")).toBe("https://outside.example");
    expect(withManagerWorkspaceContext("//outside.example", "COO")).toBe("//outside.example");
  });
});
