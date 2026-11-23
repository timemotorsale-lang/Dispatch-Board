import Link from "next/link";
import { notFound } from "next/navigation";
import { RepairExplorer } from "@/features/prototype/repair-explorer/repair-explorer";
import { courtesyFindingLabel } from "@/lib/courtesy-vehicle-check";
import { repairExplorerStorageKey, type RepairExplorerContext } from "@/lib/repair-explorer-context";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { prisma } from "@/server/db/client";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getCourtesyCheck } from "@/server/repair-order/courtesy-vehicle-check";

export default async function CourtesyEstimatePage({ searchParams }: {
  searchParams: Promise<{ repairOrderId?: string; items?: string; followUpId?: string }>;
}) {
  const params = await searchParams;
  if (typeof params.repairOrderId !== "string" || typeof params.items !== "string") notFound();
  const user = await requireCurrentUser();
  const model = await getCourtesyCheck(user, params.repairOrderId).catch(() => null);
  if (!model?.check || !model.canManage) notFound();
  const requested = new Set(params.items.split(","));
  const findings = model.check.findings.filter(finding => requested.has(finding.code) && finding.result !== "PASS");
  if (!findings.length) notFound();
  const query = new URLSearchParams({ repairOrderId: model.order.id, items: findings.map(item => item.code).join(",") });
  const returnTo = repairReviewHref(model.order.id, "handoff");
  const estimateHref = `/prototype/courtesy-estimate?${query}`;
  const searches = findings.map(item => {
    const label = courtesyFindingLabel(item.code);
    const firstTopic = label.split(/condition|operation|\/| and /i)[0].trim();
    return { code: item.code, label, query: firstTopic || label };
  });
  const draftKey = repairExplorerStorageKey(user.id);
  const source = model.order;
  const candidate = await prisma.repairOrder.findFirst({
    where: {
      organizationId: source.organizationId, vehicleId: source.vehicleId, customerId: source.customerId,
      id: { not: source.id }, origin: "CUSTOMER_REPAIR", closedAt: null, stage: { notIn: ["CLOSED", "CANCELLED", "HANDOFF"] },
    },
    orderBy: { openedAt: "desc" },
    select: { id: true },
  });
  const followUp = candidate ? await getCourtesyCheck(user, candidate.id).catch(() => null) : null;
  const availableFollowUp = followUp?.canManage ? followUp.order : null;
  const confirmedFollowUp = availableFollowUp && params.followUpId === availableFollowUp.id ? availableFollowUp : null;
  const rate = confirmedFollowUp ? await getActiveLaborRate(user).catch(() => null) : null;
  const target = rate ? confirmedFollowUp : null;
  const confirmedEstimateHref = availableFollowUp
    ? `${estimateHref}&${new URLSearchParams({ followUpId: availableFollowUp.id })}` : estimateHref;
  const context: RepairExplorerContext | undefined = target && rate ? {
    reviewWorkflow: true, repairOrderId: target.id, repairOrderNumber: target.repairOrderNumber,
    vehicleId: target.vehicle.id, vehicleLabel: [target.vehicle.year, target.vehicle.make, target.vehicle.model].filter(Boolean).join(" ") || target.vehicle.vehicleNumber,
    vin: target.vehicle.vin, origin: target.origin, inventoryUnitId: null, inventoryNumber: null,
    concern: target.serviceVisit.concernSummary, laborRate: rate.laborRate,
  } : undefined;
  const intakeHref = `/vehicles/repair-orders?${new URLSearchParams({
    intakeSource: "WALK_IN", vehicleId: source.vehicleId, customerId: source.customerId ?? "",
    concernSummary: `Courtesy check follow-up: ${findings.map(item => courtesyFindingLabel(item.code)).join("; ")}`,
    returnTo: estimateHref, returnLabel: "Courtesy estimate",
  })}`;
  return <>
    <section className="panel-card" aria-labelledby="courtesy-estimate">
      <Link href={returnTo}>Back to repair order</Link>
      <h1 id="courtesy-estimate">Estimate courtesy recommendations</h1>
      <p>{model.order.repairOrderNumber} · {model.order.customer?.displayName}</p>
      {target
        ? <p>Building this estimate on follow-up order {target.repairOrderNumber} for the same vehicle and customer.</p>
        : <p>Save your proposed work as a draft. Confirm the follow-up repair order for this vehicle before official estimate review.</p>}
      {!confirmedFollowUp && availableFollowUp && <Link className="pill" href={confirmedEstimateHref}>
        Use {availableFollowUp.repairOrderNumber} for this follow-up
      </Link>}
      {confirmedFollowUp && !rate && <p role="alert">The shop labor rate could not be loaded. Check shop pricing before continuing.</p>}
      {!availableFollowUp && source.closedAt && <Link className="pill" href={intakeHref}>Start follow-up repair order</Link>}
      <ul>{findings.map(item => <li key={item.code}>
        <strong>{courtesyFindingLabel(item.code)}</strong> · {item.note}
      </li>)}</ul>
    </section>
    <RepairExplorer initialQuery={searches[0].query} courtesySearches={searches} sourceReturnTo={returnTo} transferReturnTo={target ? confirmedEstimateHref : estimateHref}
      context={context} courtesySourceId={source.id}
      storageKey={`${draftKey}.courtesy.${source.id}`} transferStorageKey={repairExplorerStorageKey(user.id, target?.id)} />
  </>;
}
