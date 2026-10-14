import { DiagnosticsPartsOrderingWorkspace } from "@/features/diagnostics/diagnostics-parts-ordering-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";

type SearchParams = Promise<{
  parts?: string | string[];
  repairOrderId?: string | string[];
  repairOrderNumber?: string | string[];
  returnLabel?: string | string[];
  returnTo?: string | string[];
  vehicle?: string | string[];
}>;

type PartsDemandLine = {
  id: string;
  name: string;
  number: string;
  quantity: number;
  sourceLabel: string;
  totalLabel: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DiagnosticsPartsOrderingPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCurrentUser();
  const params = await searchParams;
  const rawReturnTo = first(params.returnTo);
  const returnTo = rawReturnTo?.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "/diagnostics/labor-guide";
  const partsParam = first(params.parts);
  let parts: PartsDemandLine[] = [];

  try {
    const parsed = partsParam ? JSON.parse(partsParam) : [];
    if (Array.isArray(parsed)) {
      parts = parsed.map((item, index) => ({
        id: typeof item?.id === "string" ? item.id : `part-${index + 1}`,
        name: typeof item?.name === "string" ? item.name : "Part",
        number: typeof item?.number === "string" ? item.number : "Unknown",
        quantity: typeof item?.quantity === "number" ? item.quantity : 1,
        sourceLabel: typeof item?.sourceLabel === "string" ? item.sourceLabel : "Source pending",
        totalLabel: typeof item?.totalLabel === "string" ? item.totalLabel : "Quote needed",
      }));
    }
  } catch {
    parts = [];
  }

  return <DiagnosticsPartsOrderingWorkspace
    parts={parts}
    repairOrderId={first(params.repairOrderId)}
    repairOrderNumber={first(params.repairOrderNumber)}
    returnLabel={first(params.returnLabel)?.slice(0, 120)}
    returnTo={returnTo}
    vehicleLabel={first(params.vehicle)}
  />;
}
