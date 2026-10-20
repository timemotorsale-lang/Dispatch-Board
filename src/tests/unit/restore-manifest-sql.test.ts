import { describe, expect, it } from "vitest";
import { restoreManifestSql } from "../../../scripts/lib/restore-manifest-sql.mjs";

describe("restore manifest SQL", () => {
  it("serializes the complete explicit row, not a same-named JSON column", () => {
    const sql = restoreManifestSql(["MoneyAudit", "ComplianceTaxPeriod"]);
    expect(sql).toContain("row_to_json(ROW(restore_manifest_row.*))");
    expect(sql).toContain('FROM "labor_staging_ci"."MoneyAudit"');
    expect(sql).toContain('FROM "labor_staging_ci"."ComplianceTaxPeriod"');
    expect(sql).not.toContain("row_to_json(snapshot)");
    expect(sql.match(/SELECT /g)).toHaveLength(2);
  });
  it("rejects empty manifests and interpolated SQL identifiers", () => {
    expect(() => restoreManifestSql([])).toThrow();
    expect(() => restoreManifestSql(['Customer"; DROP TABLE "Vehicle'])).toThrow();
    expect(() => restoreManifestSql(["Customer"], "public;--")).toThrow();
  });
});
