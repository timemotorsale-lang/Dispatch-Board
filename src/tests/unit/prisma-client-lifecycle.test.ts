import { describe, expect, it, vi } from "vitest";

import { reusePrismaClient } from "@/server/db/prisma-client-lifecycle";

describe("Prisma client lifecycle", () => {
  it("reuses the existing development client across hot reloads", () => {
    const existing = { id: "existing-client" };
    const create = vi.fn(() => ({ id: "replacement-client" }));

    expect(reusePrismaClient(existing, create)).toBe(existing);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates exactly one client when no existing client is present", () => {
    const created = { id: "created-client" };
    const create = vi.fn(() => created);

    expect(reusePrismaClient(undefined, create)).toBe(created);
    expect(create).toHaveBeenCalledOnce();
  });
});
