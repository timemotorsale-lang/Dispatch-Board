import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  buildWorkspacePreferenceCookie,
  resolveWorkspacePreference,
  WORKSPACE_COOKIE_NAME
} from "@/server/auth/workspace-preference";

function user(roles: string[]): AuthenticatedUser {
  return {
    id: "user-1",
    name: "Multi Role",
    email: "multi@example.test",
    isActive: true,
    roles,
    duties: { all: [], direct: [], roleDefaults: [] }
  };
}

describe("workspace preference", () => {
  it("accepts only a workspace currently assigned to the user", () => {
    const actor = user(["Office Manager", "Marketing/Advertisement Manager"]);

    expect(resolveWorkspacePreference(actor, "OFFICE")).toBe("OFFICE");
    expect(resolveWorkspacePreference(actor, "MARKETING")).toBe("MARKETING");
    expect(resolveWorkspacePreference(actor, "MANAGEMENT")).toBeNull();
    expect(resolveWorkspacePreference(actor, "NOT_A_WORKSPACE")).toBeNull();
  });

  it("allows the current vehicle operations lead to pick a narrower owned workspace", () => {
    const actor = user(["Vehicle Operations Lead", "Inventory Manager", "Service Department Manager"]);

    expect(resolveWorkspacePreference(actor, "VEHICLE_OPERATIONS_LEAD")).toBe("VEHICLE_OPERATIONS_LEAD");
    expect(resolveWorkspacePreference(actor, "INVENTORY")).toBe("INVENTORY");
    expect(resolveWorkspacePreference(actor, "SERVICE")).toBe("SERVICE");
    expect(resolveWorkspacePreference(actor, "TECHNICIAN")).toBeNull();
  });

  it("stores a non-authoritative, server-only preference cookie", () => {
    const cookie = buildWorkspacePreferenceCookie("OFFICE");

    expect(cookie.name).toBe(WORKSPACE_COOKIE_NAME);
    expect(cookie.value).toBe("OFFICE");
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.sameSite).toBe("lax");
    expect(cookie.options.path).toBe("/");
  });
});
