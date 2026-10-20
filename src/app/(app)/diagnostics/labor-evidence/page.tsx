import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getActualLaborEvidence } from "@/server/diagnostics/actual-labor-evidence";
import { isManager } from "@/server/policies/access";

export const metadata = { title: "Actual labor evidence | Dispatch Board" };
export const dynamic = "force-dynamic";

export default async function ActualLaborEvidencePage() {
  const actor = await requireCurrentUser("/diagnostics/labor-evidence");
  if (!isManager(actor)) return <main><h1>Manager access required</h1><Link href="/diagnostics/labor-guide">Return to Labor Guide</Link></main>;
  const rows = await getActualLaborEvidence(actor);
  return <main><h1>Actual technician labor evidence</h1><p>Central repair-job clocks, not browser reports or book-time assumptions. Latest 200 jobs; technician minutes include recorded rework. Eligibility is for manual study only—not an approved labor standard.</p><nav><Link href="/diagnostics/labor-guide?experience=explorer">Connected Repair Explorer</Link> · <Link href="/vehicles/shop-execution">Technician execution</Link></nav>
    {!rows.length ? <p>No persisted jobs are available. Create reviewed, authorized work and record real labor through the existing technician workflow; do not enter fabricated observations.</p> : <div style={{ overflowX: "auto" }}><table><caption>Recorded job evidence and study exclusions</caption><thead><tr><th>Job</th><th>Operation/version</th><th>Configuration/scope</th><th>Planned minutes</th><th>Measured technician minutes</th><th>Study status</th></tr></thead><tbody>{rows.map(row => <tr key={row.jobId}><td><Link href={`/vehicles/shop-planning?repairOrderId=${encodeURIComponent(row.repairOrderId)}`}>{row.jobNumber}</Link><p>{row.description}</p></td><td>{row.operationId ?? "Unmapped"}<p>{row.catalogVersion ?? "No catalog snapshot"}</p></td><td>{row.vehicleConfiguration || "Configuration evidence missing"}</td><td>{row.plannedMinutes}</td><td>{row.measuredTechnicianMinutes}</td><td>{row.eligibleForStudy ? "Eligible for manual study; not validated" : row.reasonCodes.join(", ")}</td></tr>)}</tbody></table></div>}
  </main>;
}
