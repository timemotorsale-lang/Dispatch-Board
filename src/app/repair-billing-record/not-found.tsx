import Link from "next/link";
export default function BillingRecordNotFound() {
  return <main><h1>Billing record unavailable</h1><p>The exact requested record could not be opened. Check the original history link.</p><Link href="/vehicles/repair-workbench">Repair workbench</Link></main>;
}
