export const APPOINTMENT_FIELD_CLASSIFICATION = {
  customerNumber: "OPERATIONAL",
  customerDisplayName: "LIMITED",
  customerPhoneNumber: "LIMITED",
  customerEmail: "LIMITED",
  customerDuplicateKey: "RESTRICTED",
  vehicleNumber: "OPERATIONAL",
  vehicleStockNumber: "OPERATIONAL",
  vehicleYearMakeModel: "OPERATIONAL",
  vehicleVin: "LIMITED",
  vehicleLicensePlate: "LIMITED",
  vehicleDuplicateKey: "RESTRICTED",
  participantContactSnapshot: "RESTRICTED"
} as const;

export type AppointmentDataAccessLevel = "SCHEDULE_SUMMARY" | "LIMITED_DETAIL";

function maskPersonalName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "Customer";
  }

  if (parts.length === 1) {
    return `${parts[0].charAt(0)}.`;
  }

  return `${parts[0]} ${parts.at(-1)?.charAt(0) ?? ""}.`;
}

export type CustomerPrivacyRecord = {
  customerNumber: string;
  displayName: string;
  phoneNumber: string | null;
  email: string | null;
};

export function projectCustomerForAppointment(
  customer: CustomerPrivacyRecord,
  accessLevel: AppointmentDataAccessLevel
) {
  if (accessLevel === "LIMITED_DETAIL") {
    return { ...customer };
  }

  return {
    customerNumber: customer.customerNumber,
    displayName: maskPersonalName(customer.displayName),
    phoneNumber: null,
    email: null
  };
}

export type VehiclePrivacyRecord = {
  vehicleNumber: string;
  stockNumber: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  licensePlate: string | null;
};

export function projectVehicleForAppointment(
  vehicle: VehiclePrivacyRecord,
  accessLevel: AppointmentDataAccessLevel
) {
  if (accessLevel === "LIMITED_DETAIL") {
    return { ...vehicle };
  }

  return {
    vehicleNumber: vehicle.vehicleNumber,
    stockNumber: vehicle.stockNumber,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    vin: null,
    licensePlate: null
  };
}
