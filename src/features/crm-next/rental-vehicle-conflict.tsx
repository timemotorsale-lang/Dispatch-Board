"use client";

export type ConflictingRentalAssignment = { status: string; dealHref: string | null; canCancel: boolean };

export function isTemporaryVehicleConflict(message: string) {
  return /another assignment|already (?:out|reserved|checked out)|overlapping reservation|pending return review|out on (?:rental|loaner)/i.test(message);
}

export function RentalVehicleConflictActions({ conflict, onChooseVehicle }: {
  conflict?: ConflictingRentalAssignment | null;
  onChooseVehicle: () => void;
}) {
  return <div>
    {conflict?.status === "RESERVED" && <p>The existing reservation overlaps this checkout window.</p>}
    <button type="button" onClick={onChooseVehicle}>Choose a different vehicle</button>
    {conflict?.dealHref ? <a href={conflict.dealHref} target="_blank" rel="noopener noreferrer">
      {conflict.canCancel ? "Review and cancel reservation" : conflict.status === "CHECKED_OUT" ? "Open other assignment to review return" : "Review other assignment"}
    </a> : <p>Ask the assignment owner or a manager to review the existing vehicle hold.</p>}
    {conflict?.canCancel && <p>Cancel only after confirming the vehicle never left.</p>}
    {conflict?.status === "CHECKED_OUT" && <p>If checkout was recorded by mistake, ask a manager to reconcile the custody record.</p>}
  </div>;
}
