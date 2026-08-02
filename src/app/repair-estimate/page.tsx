import { OfficialRepairEstimateDocument } from "@/features/diagnostics/official-repair-estimate-document";
import { requireCurrentUser } from "@/server/auth/current-user";

type SearchParams = Promise<{
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
  await requireCurrentUser();
  const params = await searchParams;
  const returnTo = safeRoute(first(params.returnTo), "/diagnostics/labor-guide");

  return <OfficialRepairEstimateDocument
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
