import Link from "next/link";
import { PartsQuoteWorkbook } from "@/features/inventory/parts-quote-workbook";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { PartsQuoteError } from "@/server/repair-parts-quotes/domain";
import { getRepairPartsQuotes } from "@/server/repair-parts-quotes/service";

export default async function PartsWorkbookPage({ searchParams }: {
  searchParams: Promise<{ repairOrderId?: string; returnTo?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const id = typeof params.repairOrderId === "string" ? params.repairOrderId : "";
  const back = safeLaborGuideReturnTo(typeof params.returnTo === "string" ? params.returnTo : undefined)
    ?? (id ? repairReviewHref(id, undefined, { tool: "partsOperations" }) : "/vehicles/repair-workbench?view=all");

  const result = await getRepairPartsQuotes(user, id).catch((error: unknown) => {
    if (!(error instanceof PartsQuoteError)) console.error("Parts quote workbook failed to load", error);
    return error instanceof PartsQuoteError ? error.message : "Quotes couldn’t be loaded. Reload this page to try again.";
  });
  if (typeof result === "string") return <section className="page-copy">
    <h1>Parts search workbook</h1>
    <p role="alert">{result}</p>
    <Link href={back}>Back to repair parts tools</Link>
  </section>;

  const { order, canWrite, quotes } = result;
  const source = new URL(back, "https://workspace.invalid");
  const fromParts = source.pathname === "/vehicles/service-close-parts" && source.searchParams.get("repairOrderId") === id;
  const partsHref = fromParts ? `${source.pathname}${source.search}#saved-parts-records` : `/vehicles/service-close-parts?${new URLSearchParams({ repairOrderId: id, view: "recon-task", returnTo: back, returnLabel: "Back to repair parts tools" })}#saved-parts-records`;
  const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ");
  return <PartsQuoteWorkbook key={id} repairOrderId={id} context={[order.repairOrderNumber, vehicle, order.vehicle.stockNumber && `Stock ${order.vehicle.stockNumber}`].filter(Boolean).join(" · ")} vin={order.vehicle.vin} canWrite={canWrite} closed={Boolean(order.closedAt)} quotes={quotes} backHref={back} backLabel={fromParts ? "Back to Parts Operations" : undefined} partsHref={partsHref} />;
}
