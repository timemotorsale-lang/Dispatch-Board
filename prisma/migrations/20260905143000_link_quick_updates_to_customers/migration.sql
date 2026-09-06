ALTER TABLE "WorkdayQuickUpdate"
ADD COLUMN "relatedCustomerId" TEXT;

ALTER TABLE "WorkdayQuickUpdate"
ADD COLUMN "identityKey" TEXT NOT NULL DEFAULT '';

UPDATE "WorkdayQuickUpdate"
SET "identityKey" = CASE
  WHEN regexp_replace("phoneNumber", '\\D', '', 'g') <> ''
    THEN 'phone:' || right(regexp_replace("phoneNumber", '\\D', '', 'g'), 10)
  WHEN trim("person") <> ''
    THEN 'name:' || lower(regexp_replace(trim("person"), '\\s+', ' ', 'g')) || '|company:' || lower(regexp_replace(trim("company"), '\\s+', ' ', 'g'))
  ELSE ''
END;

CREATE INDEX "WorkdayQuickUpdate_relatedCustomerId_createdAt_idx"
ON "WorkdayQuickUpdate"("relatedCustomerId", "createdAt");

CREATE INDEX "WorkdayQuickUpdate_identityKey_createdAt_idx"
ON "WorkdayQuickUpdate"("identityKey", "createdAt");

ALTER TABLE "WorkdayQuickUpdate"
ADD CONSTRAINT "WorkdayQuickUpdate_relatedCustomerId_fkey"
FOREIGN KEY ("relatedCustomerId") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
