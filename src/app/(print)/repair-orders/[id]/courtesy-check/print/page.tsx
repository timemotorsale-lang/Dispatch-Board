import Link from "next/link";
import { notFound } from "next/navigation";
import { DiagnosticAuthorizationPrintButton } from "@/features/inventory/diagnostic-authorization-print-button";
import { frontlineQcSections, isCourtesySafetyFlag } from "@/lib/courtesy-vehicle-check";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getCourtesyCheck } from "@/server/repair-order/courtesy-vehicle-check";
import styles from "./print.module.css";

export default async function CourtesyCheckPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const model = await getCourtesyCheck(user, id).catch(() => null);
  if (!model?.check?.findings.length) notFound();
  const { order, check } = model;
  const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
  const findings = new Map(check.findings.map(item => [item.code, item]));
  return <main className={styles.page}>
    <nav className={styles.controls} aria-label="Print actions">
      <Link href={repairReviewHref(order.id, "handoff")}>Back to repair order</Link>
      <DiagnosticAuthorizationPrintButton />
    </nav>
    <header>
      <p>{order.location.name} · {order.repairOrderNumber}</p>
      <h1>Courtesy vehicle check</h1>
      <p>{order.customer?.displayName} · {vehicle}</p>
      <p>Inspected by {check.inspectorName} on {check.inspectedAt.slice(0, 10)} · {check.findings.length} items checked</p>
    </header>
    {frontlineQcSections.map(section => <section className={styles.group} key={section.title}>
      <h2>{section.title}</h2>
      <table><thead><tr><th scope="col">Item</th><th scope="col">Result</th><th scope="col">Finding</th></tr></thead>
        <tbody>{section.items.map(item => {
          const finding = findings.get(item.code);
          const label = !finding ? "Not inspected" : finding.result === "PASS" ? "Pass" : finding.result === "REVIEW" ? "Review" : "Fail";
          return <tr key={item.code}><th scope="row">{item.label}</th><td>{label}{finding && isCourtesySafetyFlag(finding) ? " · Urgent" : ""}</td>
            <td>{finding?.note || ""}{finding?.evidence && <><br />{finding.evidence}</>}</td></tr>;
        })}</tbody>
      </table>
    </section>)}
  </main>;
}
