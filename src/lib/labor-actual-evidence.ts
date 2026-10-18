export type ActualLaborJob = {
  id: string; operationId: string | null; catalogVersion: string | null; vehicleConfiguration: string;
  plannedMinutes: number; qcPassedAt: string | null; latestQcPassed: boolean; rework: boolean;
  clocks: { state: string; accumulatedMinutes: number; finishedAt: string | null; technicianUserId: string }[];
  events: { eventType: string; occurredAt: string; technicianUserId: string }[];
};

export function actualLaborEvidence(job: ActualLaborJob) {
  const reasons: string[] = [];
  if (!job.operationId || !job.catalogVersion) reasons.push("CATALOG_UNMAPPED");
  if (!job.vehicleConfiguration.trim()) reasons.push("CONFIGURATION_MISSING");
  if (!job.latestQcPassed || !job.qcPassedAt) reasons.push("QC_NOT_PASSED");
  if (!job.clocks.length) reasons.push("NO_MEASURED_CLOCK");
  if (new Set(job.clocks.map(clock => clock.technicianUserId)).size !== job.clocks.length) reasons.push("DUPLICATE_CLOCK");
  for (const clock of job.clocks) {
    if (clock.state !== "FINISHED" || !clock.finishedAt) reasons.push("CLOCK_NOT_FINISHED");
    if (!Number.isFinite(clock.accumulatedMinutes) || clock.accumulatedMinutes <= 0) reasons.push("INVALID_MEASURED_MINUTES");
    if (!job.events.some(event => event.technicianUserId === clock.technicianUserId && event.eventType === "FINISH" && event.occurredAt === clock.finishedAt)) reasons.push("FINISH_EVENT_MISSING");
  }
  if (job.qcPassedAt && job.events.some(event => event.eventType === "CORRECTION" && event.occurredAt >= job.qcPassedAt!)) reasons.push("CORRECTION_AFTER_QC");
  if (job.qcPassedAt && job.clocks.some(clock => clock.finishedAt && clock.finishedAt > job.qcPassedAt!)) reasons.push("FINISH_AFTER_QC");
  if (job.rework) reasons.push("REWORK_SAMPLE_REVIEW");
  return { jobId: job.id, operationId: job.operationId, catalogVersion: job.catalogVersion, vehicleConfiguration: job.vehicleConfiguration, plannedMinutes: job.plannedMinutes,
    measuredTechnicianMinutes: job.clocks.reduce((sum, clock) => sum + (Number.isFinite(clock.accumulatedMinutes) ? clock.accumulatedMinutes : 0), 0),
    eligibleForStudy: reasons.length === 0, reasonCodes: [...new Set(reasons)], source: "PERSISTED_JOB_CLOCKS" as const, validatedStandard: false as const };
}
