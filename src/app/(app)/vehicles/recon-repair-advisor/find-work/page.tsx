import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { findAdvisorWork } from "@/server/advisor-workspace/find-work";

export default async function FindAdvisorWorkPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.slice(0, 120) : "";
  const result = await findAdvisorWork(user, search);
  if (result.matches.length === 1) redirect(result.matches[0].href);
  return <section className="page-stack"><h1>Find work</h1><form className="rra-search" action="/vehicles/recon-repair-advisor/find-work"><label>VIN, stock, vehicle or RO<input name="search" type="search" defaultValue={search} required maxLength={120} /></label><button type="submit">Find work</button></form><p role="status">{result.message}</p><ul>{result.matches.map(match => <li key={match.href}><Link href={match.href}>{match.label} → Continue</Link></li>)}</ul><Link href="/prototype/inventory-intake?advisor=1">Start vehicle intake</Link><Link href="/vehicles/recon-repair-advisor">Return to advisor</Link></section>;
}
