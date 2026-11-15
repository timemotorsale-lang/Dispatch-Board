import Link from "next/link";

export function BillingDocumentLink({ repairOrderId, sourceId, receipt = false, disabled = false, onOpen }: { repairOrderId: string; sourceId: string; receipt?: boolean; disabled?: boolean; onOpen?: (sourceId: string) => void }) {
  return <><Link aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : undefined} title={disabled ? "Wait for the current request to finish or retry its unchanged request." : undefined} onClick={event => { if (disabled) { event.preventDefault(); return; } if (onOpen) { event.preventDefault(); onOpen(sourceId); } }} href={`/service-documents?${new URLSearchParams({ repairOrderId, sourceId })}`}>{receipt ? "Open / Print Receipt" : "Open / Print Final Invoice"}</Link>{receipt && <small> · Receipt ID: {sourceId}</small>}</>;
}
