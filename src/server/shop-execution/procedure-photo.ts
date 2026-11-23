import { createHash } from "node:crypto";

export const repairProcedurePhotoSubjectType = "REPAIR_JOB_PROCEDURE_PHOTO";

export function repairProcedurePhotoSubject(jobId: string, requirement: string) {
  const itemKey = createHash("sha256").update(requirement).digest("hex").slice(0, 32);
  return { subjectType: repairProcedurePhotoSubjectType, subjectId: `${jobId}:${itemKey}` };
}
