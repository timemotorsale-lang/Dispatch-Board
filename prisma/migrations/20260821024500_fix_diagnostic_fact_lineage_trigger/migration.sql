CREATE OR REPLACE FUNCTION validate_diagnostic_fact_lineage() RETURNS trigger AS $$
DECLARE
  prior_case TEXT;
  prior_org TEXT;
BEGIN
  IF TG_TABLE_NAME = 'DiagnosticObservation' THEN
    IF NEW."correctsId" IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT "diagnosticCaseId", "organizationId"
      INTO prior_case, prior_org
      FROM "DiagnosticObservation"
      WHERE "id" = NEW."correctsId";
  ELSIF TG_TABLE_NAME = 'DiagnosticMeasurement' THEN
    IF NEW."supersedesId" IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT "diagnosticCaseId", "organizationId"
      INTO prior_case, prior_org
      FROM "DiagnosticMeasurement"
      WHERE "id" = NEW."supersedesId";
  ELSE
    RETURN NEW;
  END IF;

  IF prior_case IS NULL OR prior_case <> NEW."diagnosticCaseId" OR prior_org <> NEW."organizationId" THEN
    RAISE EXCEPTION 'diagnostic fact correction lineage must remain within one tenant and case';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
