import { notFound } from "next/navigation";
import { getListings } from "../../server/listings";
import { Dealership } from "../../components/dealership";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const segments = (await params).path ?? [];
  const route = segments.join("/");
  if (route && !["shop", "garage", "garage/add", "garage/saved", "garage/messages", "garage/documents", "garage/appointments", "garage/history", "purchase", "sell", "service", "finance", "budget", "how-it-works", "contact", "more"].includes(route) && !/^vehicles\/[a-z0-9-]+$/.test(route)) notFound();
  const snapshot = await getListings();
  if (segments[0] === "vehicles" && !snapshot.listings.some(vehicle => vehicle.id === segments[1])) notFound();
  return <Dealership route={route} snapshot={snapshot} />;
}
