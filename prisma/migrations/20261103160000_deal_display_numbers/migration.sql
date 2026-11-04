-- Stable staff-facing numbers; UUIDs and existing document versions remain unchanged.
BEGIN;
CREATE SEQUENCE "DealDeskDraft_dealNumber_seq" START WITH 1000;
ALTER TABLE "DealDeskDraft" ADD COLUMN "dealNumber" INTEGER;
WITH numbered AS (
  SELECT "id", (999 + ROW_NUMBER() OVER (ORDER BY "createdAt", "id"))::INTEGER AS number
  FROM "DealDeskDraft"
)
UPDATE "DealDeskDraft" d SET "dealNumber" = numbered.number FROM numbered WHERE d."id" = numbered."id";
SELECT setval('"DealDeskDraft_dealNumber_seq"', COALESCE((SELECT MAX("dealNumber") FROM "DealDeskDraft"),999) + 1, false);
ALTER TABLE "DealDeskDraft" ALTER COLUMN "dealNumber" SET DEFAULT nextval('"DealDeskDraft_dealNumber_seq"');
ALTER TABLE "DealDeskDraft" ALTER COLUMN "dealNumber" SET NOT NULL;
ALTER SEQUENCE "DealDeskDraft_dealNumber_seq" OWNED BY "DealDeskDraft"."dealNumber";
CREATE UNIQUE INDEX "DealDeskDraft_dealNumber_key" ON "DealDeskDraft"("dealNumber");
COMMIT;
