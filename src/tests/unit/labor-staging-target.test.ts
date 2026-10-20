import { describe, expect, it } from "vitest";
import { assertLaborStagingTarget } from "../../../scripts/lib/labor-staging-target.mjs";

describe("labor staging isolation", () => {
  it("requires a dedicated local PostgreSQL schema and rejects ordinary application targets", () => {
    expect(assertLaborStagingTarget("postgresql://local:local@127.0.0.1/test?schema=labor_staging_ci").searchParams.get("schema")).toBe("labor_staging_ci");
    for (const value of ["postgresql://user:password@production/test?schema=labor_staging_ci", "postgresql://local:local@localhost/dispatch_board?schema=public", "postgresql://local:local@localhost/dispatch_board", "https://localhost/test?schema=labor_staging_ci", "postgresql://local:local@localhost/test?schema=labor_staging_ci&schema=public", "postgresql://local:local@localhost/test?schema=labor_staging_ci&host=production"]) expect(() => assertLaborStagingTarget(value)).toThrow();
  });
});
