import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderCreateOptions } from "@/server/repair-order/service";

function includes(value: unknown, query: string) {
  return String(value ?? "").toLocaleLowerCase().includes(query);
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("query")?.trim().toLocaleLowerCase() ?? "";
    const options = await getRepairOrderCreateOptions(await getCurrentUser());

    if (!query) {
      return NextResponse.json({
        customers: options.customers.slice(0, 8),
        vehicles: options.vehicles.slice(0, 8)
      });
    }

    return NextResponse.json({
      customers: options.customers
        .filter((customer) =>
          includes(customer.displayName, query) ||
          includes(customer.customerNumber, query) ||
          includes(customer.phoneNumber, query) ||
          includes(customer.email, query)
        )
        .slice(0, 8),
      vehicles: options.vehicles
        .filter((vehicle) =>
          includes(vehicle.vehicleNumber, query) ||
          includes(vehicle.vin, query) ||
          includes(vehicle.stockNumber, query) ||
          includes(vehicle.licensePlate, query) ||
          includes([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" "), query)
        )
        .slice(0, 8)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Appointment identity search failed.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
