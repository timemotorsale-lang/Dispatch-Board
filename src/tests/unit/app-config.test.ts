import { describe, expect, it } from "vitest";

import { APP_NAME, placeholderRoutes } from "../../app/config";

describe("app foundation config", () => {
  it("exposes the expected app name", () => {
    expect(APP_NAME).toBe("Time Motor Sales Dispatch Board");
  });

  it("keeps the placeholder route set in place", () => {
    expect(placeholderRoutes.map((route) => route.href)).toEqual(
      expect.arrayContaining(["/login", "/board", "/my-tasks", "/tasks", "/settings"])
    );
  });
});
