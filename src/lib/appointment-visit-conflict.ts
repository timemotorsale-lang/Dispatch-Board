export function isSameAppointmentVisit(
  first: { purpose?: string | null; vehicleId?: string | null },
  second: { purpose?: string | null; vehicleId?: string | null }
) {
  const differentVehicle = first.vehicleId && second.vehicleId && first.vehicleId !== second.vehicleId;
  const differentPurpose = first.purpose && second.purpose && first.purpose !== second.purpose;
  return !differentVehicle && !differentPurpose;
}
