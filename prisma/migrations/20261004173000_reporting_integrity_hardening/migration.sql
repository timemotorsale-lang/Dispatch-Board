ALTER TABLE "ReportingSeries" ADD CONSTRAINT "ReportingSeries_acceptedRevisionId_fkey"
  FOREIGN KEY ("acceptedRevisionId") REFERENCES "ReportingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE FUNCTION reporting_reject_revision_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Submitted reporting evidence and reviews are immutable';
END;
$$;
CREATE TRIGGER reporting_revision_immutable BEFORE UPDATE ON "ReportingRevision"
  FOR EACH ROW EXECUTE FUNCTION reporting_reject_revision_update();
CREATE TRIGGER reporting_review_immutable BEFORE UPDATE ON "ReportingReview"
  FOR EACH ROW EXECUTE FUNCTION reporting_reject_revision_update();

CREATE FUNCTION reporting_guard_legacy_snapshot_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ReportingRevision" WHERE "legacyDailyId" = OLD.id) THEN
    RAISE EXCEPTION 'Linked daily reporting evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reporting_legacy_snapshot_immutable BEFORE UPDATE ON "StaffDailyReport"
  FOR EACH ROW EXECUTE FUNCTION reporting_guard_legacy_snapshot_update();

CREATE FUNCTION reporting_guard_accepted_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."acceptedRevisionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ReportingRevision" r JOIN "ReportingReview" v ON v."revisionId" = r.id
    WHERE r.id = NEW."acceptedRevisionId" AND r."seriesId" = NEW.id AND v.action = 'APPROVE'
      AND v."actorUserId" <> r."submittedByUserId" AND v."actorUserId" <> NEW."subjectUserId"
  ) THEN
    RAISE EXCEPTION 'Accepted revision must belong to this series and have an independent approval';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reporting_accepted_revision_guard BEFORE INSERT OR UPDATE OF "acceptedRevisionId" ON "ReportingSeries"
  FOR EACH ROW EXECUTE FUNCTION reporting_guard_accepted_revision();
