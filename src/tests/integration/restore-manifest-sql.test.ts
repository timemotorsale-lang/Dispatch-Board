import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { restoreManifestSql } from "../../../scripts/lib/restore-manifest-sql.mjs";

describe.skipIf(process.env.RUN_RESTORE_MANIFEST_DB_TESTS !== "1")("isolated PostgreSQL restore manifest", () => {
  it("compares all fields despite JSON alias collisions and detects non-JSON data changes", async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.startsWith("/compliance_review_")) throw new Error("Disposable compliance_review database required.");
    await prisma.$transaction(async database => {
      await database.$executeRawUnsafe('CREATE TEMP TABLE "RestoreCollision" (id integer, snapshot jsonb, restore_manifest_row jsonb, amount integer) ON COMMIT DROP');
      await database.$executeRawUnsafe('INSERT INTO "RestoreCollision" VALUES (1, \'{"key":"same"}\', \'{"nested":true}\', 100), (2, null, null, 200)');
      await database.$executeRawUnsafe('CREATE TEMP TABLE "RestoreEmpty" (snapshot jsonb) ON COMMIT DROP');
      const sql = restoreManifestSql(["RestoreCollision"], "pg_temp");
      const original = await database.$queryRawUnsafe<Array<{ count: bigint; md5: string }>>(sql);
      expect(original[0].count).toBe(2n);
      await database.$executeRawUnsafe('UPDATE "RestoreCollision" SET amount = 101 WHERE id = 1');
      const changed = await database.$queryRawUnsafe<Array<{ md5: string }>>(sql);
      expect(changed[0].md5).not.toBe(original[0].md5);
      await database.$executeRawUnsafe('UPDATE "RestoreCollision" SET amount = 100 WHERE id = 1');
      expect((await database.$queryRawUnsafe<Array<{ md5: string }>>(sql))[0].md5).toBe(original[0].md5);
      const empty = await database.$queryRawUnsafe<Array<{ count: bigint; md5: string }>>(restoreManifestSql(["RestoreEmpty"], "pg_temp"));
      expect(empty[0].count).toBe(0n); expect(empty[0].md5).toBe("d41d8cd98f00b204e9800998ecf8427e");
    });
  });
});
