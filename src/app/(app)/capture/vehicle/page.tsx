import Link from "next/link";
import { MobileVehicleIntake } from "@/features/mobile-capture/mobile-vehicle-intake";
import { MOBILE_HOME_HREF } from "@/features/mobile-capture/capture-navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getCompactIntake } from "@/server/inventory-unit/compact-intake-service";

export default async function MobileVehiclePage({ searchParams }: { searchParams?: Promise<{ vin?: string }> }) {
  const user = await requireCurrentUser("/capture/vehicle");
  const params = searchParams ? await searchParams : {};
  const data = await getCompactIntake(user).catch(() => null);
  if (!data) return <main><h1>Vehicle intake unavailable</h1><p role="alert">Check your acquisition-intake access or retry. Nothing has been changed.</p><Link href={MOBILE_HOME_HREF}>Return to mobile home</Link></main>;
  const users = [...data.options.users].sort((first, second) => Number(second.id === user.id) - Number(first.id === user.id));
  return <MobileVehicleIntake initialVin={/^[A-HJ-NPR-Z0-9]{17}$/.test(params.vin?.toUpperCase() ?? "") ? params.vin!.toUpperCase() : ""} options={{ locations: data.options.locations, users }} />;
}
