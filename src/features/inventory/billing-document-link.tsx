import Link from "next/link";

export function BillingDocumentLink({ repairOrderId, sourceId, receipt = false, onOpen }: { repairOrderId: string; sourceId: string; receipt?: boolean; onOpen?: (sourceId: string) => void }) {
  return <><Link onClick={event => { if (onOpen) { event.preventDefault(); onOpen(sourceId); } }} href={`/service-documents?${new URLSearchParams({ repairOrderId, sourceId })}`}>{receipt ? "Open / Print Receipt" : "Open / Print Final Invoice"}</Link>{receipt && <small> · Receipt ID: {sourceId}</small>}</>;
}
