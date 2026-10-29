import { OfficialRepairEstimateDocument } from "@/features/diagnostics/official-repair-estimate-document";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopPlanningDetail } from "@/server/shop-planning/service";
import { getRepairOrderDetail } from "@/server/repair-order/service";
import { getRepairDocuments } from "@/server/repair-order/document-service";
import { ServiceDocument } from "@/features/inventory/service-document";
import { ServiceDocumentWorkflow } from "@/features/inventory/service-document-workflow";
import { notFound } from "next/navigation";

type SearchParams = Promise<{
  workspace?: string | string[];
  workflow?: string | string[];
  estimateId?: string | string[];
  concern?: string | string[];
  createdAt?: string | string[];
  customer?: string | string[];
  estimateNumber?: string | string[];
  lines?: string | string[];
  repairOrderId?: string | string[];
  repairOrderNumber?: string | string[];
  returnTo?: string | string[];
  summary?: string | string[];
  vehicle?: string | string[];
}>;

type EstimateLine = {
  amountLabel: string;
  detail: string;
  kind: "Labor" | "Part";
  quantityLabel: string;
  title: string;
};

type SummaryItem = {
  label: string;
  value: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeRoute(value: string | undefined, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function parseLines(raw: string | undefined) {
  if (!raw) return [] as EstimateLine[];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as EstimateLine[];
    return parsed.map((item, index) => ({
      amountLabel: typeof item?.amountLabel === "string" ? item.amountLabel : "$0.00",
      detail: typeof item?.detail === "string" ? item.detail : "Estimate detail pending",
      kind: (item?.kind === "Part" ? "Part" : "Labor") as EstimateLine["kind"],
      quantityLabel: typeof item?.quantityLabel === "string" ? item.quantityLabel : `Line ${index + 1}`,
      title: typeof item?.title === "string" ? item.title : `Estimate line ${index + 1}`,
    }));
  } catch {
    return [] as EstimateLine[];
  }
}

function parseSummary(raw: string | undefined) {
  if (!raw) return [] as SummaryItem[];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as SummaryItem[];
    return parsed.map((item) => ({
      label: typeof item?.label === "string" ? item.label : "Summary",
      value: typeof item?.value === "string" ? item.value : "-",
    }));
  } catch {
    return [] as SummaryItem[];
  }
}

export default async function OfficialRepairEstimatePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const returnTo = safeRoute(first(params.returnTo), "/diagnostics/labor-guide");
  const estimateId = first(params.estimateId);
  if (estimateId) {
    const roId = first(params.repairOrderId);
    if (!roId) notFound();
    await getRepairOrderDetail(user, roId);
    const ro = await getShopPlanningDetail(user, roId);
    const estimate = ro.estimateVersions.find(item => item.id === estimateId);
    if (!estimate) notFound();
    const documents = (await getRepairDocuments(user, ro.id)).documents;
    const frozen = documents.find(document => document.kind === "ESTIMATE" && document.sourceId === estimate.id);
    if (frozen && first(params.workspace) === "1") return <ServiceDocumentWorkflow key={frozen.id} repairOrderId={ro.id} selectedId={frozen.id} documents={documents.map(({ id, sourceId, kind, content, sha256, templateVersion }) => ({ id, sourceId, kind, content, sha256, templateVersion }))} />;
    if (frozen) return <ServiceDocument reviewWorkflow={first(params.workflow) === "review"} repairOrderId={ro.id} content={frozen.content} sha256={frozen.sha256} templateVersion={frozen.templateVersion} />;
    const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
    const persistedLines = estimate.lineItems as Array<{ description: string; quantity: number; unitPriceCents: number; type: string }>;
    return <OfficialRepairEstimateDocument
      isDraft={false}
      reviewNotes={`Legacy document: identity is current, not frozen at issue. Reissue a reviewed estimate before new authorization. ${estimate.assumptions ?? ""}`}
      concern={ro.serviceVisit.concernSummary}
      createdAt={estimate.presentedAt?.toISOString() ?? estimate.createdAt.toISOString()}
      customer={ro.customer?.displayName ?? "Internal vehicle"}
      estimateNumber={`${ro.repairOrderNumber} / v${estimate.version}`}
      repairOrderId={ro.id}
      repairOrderNumber={ro.repairOrderNumber}
      returnTo={returnTo}
      vehicle={[ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" ")}
      lines={persistedLines.map(line => ({
        title: line.description,
        detail: `Recorded estimate version ${estimate.version}`,
        kind: line.type === "PART" ? "Part" : line.type === "FEE" ? "Fee" : "Labor",
        quantityLabel: String(line.quantity),
        amountLabel: money(line.quantity * line.unitPriceCents),
      }))}
      summary={[
        { label: "Labor", value: money(estimate.laborSubtotalCents) },
        { label: "Parts", value: money(estimate.partsSubtotalCents) },
        { label: "Fees", value: money(estimate.feeSubtotalCents) },
        { label: "Discount", value: money(estimate.discountCents) },
        { label: "Tax", value: money(estimate.taxCents) },
        { label: "Total", value: money(estimate.totalCents) },
      ]}
    />;
  }

  return <OfficialRepairEstimateDocument
    isDraft
    concern={first(params.concern) ?? "Repair estimate review"}
    createdAt={first(params.createdAt) ?? new Date().toISOString()}
    customer={first(params.customer) ?? "Internal vehicle"}
    estimateNumber={first(params.estimateNumber) ?? "EST-DRAFT"}
    lines={parseLines(first(params.lines))}
    repairOrderId={first(params.repairOrderId)}
    repairOrderNumber={first(params.repairOrderNumber) ?? "RO-DRAFT"}
    returnTo={returnTo}
    summary={parseSummary(first(params.summary))}
    vehicle={first(params.vehicle) ?? "Vehicle pending"}
  />;
}
