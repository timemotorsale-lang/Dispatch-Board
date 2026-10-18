import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { findAdvisorWork } from "@/server/advisor-workspace/find-work";
import styles from "@/features/prototype/repair-workflow/repair-workflow.module.css";
export default async function RepairWorkflowReviewPage({ searchParams }: { searchParams?: Promise<{ search?: string }> }) {
  const actor = await requireCurrentUser(), params = searchParams ? await searchParams : {};
  const search = typeof params.search === "string" ? params.search.slice(0, 120) : "";
  const result = search ? await findAdvisorWork(actor, search, { reviewWorkflow: true }).catch(() => ({ matches: [], message: "Vehicle search could not load. Check access or connectivity and retry; no records were created." })) : null;
  if (result?.matches.length === 1) redirect(result.matches[0].href);
  return <main className={styles.workspace}><header className={styles.header}><div><small>Complete repair workflow · review before adoption</small><h1>Find vehicle · start work</h1><p>Reuse the vehicle and its open RO. Intake appears only when a repair order needs to be established.</p></div><Link href="/vehicles/recon-repair-advisor">Return to existing advisor</Link></header><form className={styles.form}><label>VIN, stock number, vehicle or RO<input autoFocus required name="search" type="search" maxLength={120} defaultValue={search} /></label><button type="submit">Find work</button></form>{result && <><p role="status">{result.message}</p><ul>{result.matches.map(match => <li key={match.href}><Link href={match.href}>{match.label} → Continue</Link></li>)}</ul></>}<p><Link href="/prototype/inventory-intake?advisor=1&reviewWorkbench=1">New vehicle / compact intake</Link></p><p>Intake → inspection / scope → estimate → authorization → parts / assignment → repair → QC → closeout / handoff. Review saves are real records; approval of this design remains separate.</p></main>;
}
