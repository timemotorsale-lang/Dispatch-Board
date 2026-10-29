import { notFound } from "next/navigation";
import { getListings } from "../../server/listings";
import { Dealership } from "../../components/dealership";
import { PaymentCalculator } from "../../../../../packages/payment-estimates/calculator";
import { proposedPaymentPolicy } from "../../../../../packages/payment-estimates/policy";
import { publicPath } from "../../lib/paths";
import { readBuyingPlan } from "../../lib/buying-plan";
import { mayStartPurchase } from "../../lib/domain";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const segments = (await params).path ?? [];
  const route = segments.join("/");
  if (route && !["shop", "garage", "garage/add", "garage/saved", "garage/messages", "garage/documents", "garage/appointments", "garage/history", "purchase", "sell", "service", "appointments", "finance", "budget", "how-it-works", "contact", "more"].includes(route) && !/^vehicles\/[a-z0-9-]+$/.test(route)) notFound();
  const snapshot = await getListings();
  if (segments[0] === "vehicles" && !snapshot.listings.some(vehicle => vehicle.id === segments[1])) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams || {})) for (const item of typeof value === "string" ? [value] : value || []) query.append(key, item);
  const plan = readBuyingPlan(query);
  const selected = query.get("from") === "buying-guide" ? snapshot.listings.find(vehicle => vehicle.id === plan.vehicleId && mayStartPurchase(vehicle)) : undefined;
  const initialSelection = selected ? { priceCents: selected.price * 100, mode: plan.paymentPath === "cash" ? "cash" as const : "vehicle" as const } : undefined;
  const paymentPreview = ["budget", "finance"].includes(route) && snapshot.source === "PREVIEW" ? <PaymentCalculator key={`${selected?.id || "none"}:${plan.paymentPath}`} policy={proposedPaymentPolicy} initialSelection={initialSelection} imageSrc={publicPath("/api/sample-media/rav4")} inventoryHref={publicPath("/shop")} /> : undefined;
  return <Dealership key={route} route={route} snapshot={snapshot} paymentPreview={paymentPreview} />;
}
