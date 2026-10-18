import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getLaborPilotReadiness } from "@/server/diagnostics/labor-pilot-readiness";

export const dynamic = "force-dynamic";
export const metadata = { title: "Labor pilot readiness | Dispatch Board" };
export default async function LaborReadinessPage() {
  const user = await requireCurrentUser("/diagnostics/labor-readiness");
  if (!isManager(user)) return <main><h1>Manager access required</h1><Link href="/diagnostics/labor-guide">Return to Labor Guide</Link></main>;
  const result = await getLaborPilotReadiness(user);
  return <main><h1>Labor Guide pilot readiness</h1><p>Deployment status: <strong>{result.status}</strong>. Live checks are read-only. No policy, rollout flag, customer authorization or deployment is activated here.</p><nav><Link href="/diagnostics/labor-guide?experience=explorer">Connected Repair Explorer</Link> · <Link href="/diagnostics/labor-evidence">Actual labor evidence</Link> · <Link href="/prototype/repair-coverage">Review expanded catalog</Link></nav><ul>{result.checks.map(check => <li key={check.code}><h2>{check.code.replaceAll("_", " ")} · {check.status}</h2><p>{check.detail}</p>{check.href && <Link href={check.href}>Review settings</Link>}</li>)}</ul><h2>Catalog coverage boundary</h2><p>{result.auditedSystems.join("; ")} are connected for staff-reviewed pilot work. {result.pendingSystemApprovals} other system catalogs have expanded definitions awaiting shop approval; review them in the coverage preview. No verified vehicle-specific labor standard or OEM fitment integration is implied.</p></main>;
}
