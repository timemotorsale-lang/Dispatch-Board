export type AppointmentVersionConflict = {
  appointmentId: string;
  expectedAppointmentVersion: number;
  currentAppointmentVersion: number | null;
};

export class AppointmentVersionConflictError extends Error {
  readonly conflict: AppointmentVersionConflict;

  constructor(conflict: AppointmentVersionConflict) {
    super("Appointment version is stale.");
    this.name = "AppointmentVersionConflictError";
    this.conflict = conflict;
  }
}

export function getAppointmentVersionConflict(
  error: unknown
): AppointmentVersionConflict | null {
  return error instanceof AppointmentVersionConflictError ? error.conflict : null;
}
