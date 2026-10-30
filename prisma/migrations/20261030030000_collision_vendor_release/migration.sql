ALTER TABLE "RepairOrderReleaseAuthorization"
  ADD COLUMN "vendorReturnReviewIds" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "RepairOrderReleaseAuthorization"
  DROP CONSTRAINT "RepairOrderReleaseAuthorization_gate_check";

ALTER TABLE "RepairOrderReleaseAuthorization"
  ADD CONSTRAINT "RepairOrderReleaseAuthorization_gate_check" CHECK (
    "keysVerified" = TRUE
    AND jsonb_typeof("qcInspectionIds") = 'array'
    AND jsonb_typeof("vendorReturnReviewIds") = 'array'
    AND (jsonb_array_length("qcInspectionIds") > 0 OR jsonb_array_length("vendorReturnReviewIds") > 0)
    AND jsonb_typeof("releaseEvidence") = 'array'
    AND jsonb_array_length("releaseEvidence") > 0
    AND jsonb_typeof("openExceptions") = 'array'
    AND jsonb_array_length("openExceptions") = 0
    AND length(trim("reason")) >= 10
  );

CREATE FUNCTION validate_collision_vendor_release() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF jsonb_array_length(NEW."vendorReturnReviewIds") > 0 AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(NEW."vendorReturnReviewIds") review(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM "EnterpriseAuditEvent" a
      JOIN "RepairVendorWork" w ON w.id = a."subjectId"
      WHERE a.id = review.id AND a."organizationId" = NEW."organizationId"
        AND a."eventType" = 'ACCEPT_VENDOR_RETURN_COMPLETED'
        AND a."subjectType" = 'VENDOR_RETURN_ACCEPTANCE'
        AND w."repairOrderId" = NEW."repairOrderId" AND w."status" = 'COMPLETED'
        AND (a."newValue"->>'vendorVersion')::integer = w."version"
        AND a."newValue"->>'estimateId' = (
          SELECT e.id FROM "RepairEstimateVersion" e WHERE e."repairOrderId" = NEW."repairOrderId" ORDER BY e.version DESC LIMIT 1
        )
        AND a."newValue"->>'authorizationId' = (
          SELECT r.id FROM "RepairAuthorization" r WHERE r."repairOrderId" = NEW."repairOrderId" ORDER BY r."createdAt" DESC, r.id DESC LIMIT 1
        )
    )
  ) THEN RAISE EXCEPTION 'Vendor release requires current attributable return acceptance'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER collision_vendor_release_check BEFORE INSERT ON "RepairOrderReleaseAuthorization"
  FOR EACH ROW EXECUTE FUNCTION validate_collision_vendor_release();
