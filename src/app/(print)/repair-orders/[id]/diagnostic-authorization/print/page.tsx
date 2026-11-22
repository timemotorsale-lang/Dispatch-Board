import { notFound } from "next/navigation";

import { DiagnosticAuthorizationPrintButton } from "@/features/inventory/diagnostic-authorization-print-button";
import { diagnosticAuthorizationScope, diagnosticFeeError, formatDiagnosticFee, parseDiagnosticFee } from "@/lib/diagnostic-authorization-form";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { readDiagnosticConsent } from "@/server/repair-order/diagnostic-authorization";
import { getRepairResume } from "@/server/repair-order/resume-service";
import { getRepairOrderDetail } from "@/server/repair-order/service";
import styles from "./print.module.css";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fee?: string | string[]; version?: string | string[] }>;
};

export default async function DiagnosticAuthorizationPrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const order = await getRepairOrderDetail(user, id).catch((error: unknown) => {
    if (error instanceof Error && (error.message === "Repair order was not found." || error.message.startsWith("Vehicle capability required:"))) notFound();
    throw error;
  });
  if (order.origin !== "CUSTOMER_REPAIR" || !order.customer) notFound();

  const { fee, version } = await searchParams;
  const consent = await readDiagnosticConsent(prisma, order.organizationId, order.id);
  const recorded = consent?.feeCents != null;
  if (!recorded) {
    const resume = await getRepairResume(user, order.id, true);
    if (!resume?.summary.canAct || order.serviceVisit.consentStatus === "DOCUMENTED") notFound();
  }
  const feeCents = consent?.feeCents ?? (typeof fee === "string" ? parseDiagnosticFee(fee) : null);
  const back = repairReviewHref(order.id, "authorization");
  const unavailable = recorded ? null
    : order.closedAt || order.stage === "HANDOFF" ? "This repair order no longer accepts diagnostic authorization."
      : feeCents == null ? diagnosticFeeError
        : version !== String(order.version) ? "This repair order changed. Return to authorization and review the current concern and fee before printing."
          : null;
  if (unavailable || feeCents == null) {
    return <main className={styles.sheet}>
      <h1>Diagnostic authorization unavailable</h1>
      <p>{unavailable}</p>
      <a href={back}>Return to diagnostic authorization</a>
    </main>;
  }

  const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
  return <main className={styles.sheet}>
    <nav className={styles.actions} aria-label="Document actions">
      <a href={back}>Return to diagnostic authorization</a>
      <DiagnosticAuthorizationPrintButton />
    </nav>
    <header>
      <p><strong>Time Motor Sales</strong> · {order.location.name}</p>
      <h1>Customer diagnostic authorization</h1>
      <p>{recorded ? "Recorded authorization summary" : "Pending customer signature"}</p>
    </header>
    <dl className={styles.facts}>
      <div><dt>Repair order</dt><dd>{order.repairOrderNumber}</dd></div>
      <div><dt>Customer</dt><dd>{order.customer.displayName}</dd></div>
      <div><dt>Vehicle</dt><dd>{vehicle}</dd></div>
      <div><dt>VIN / vehicle ID</dt><dd>{order.vehicle.vin ?? order.vehicle.vehicleNumber}</dd></div>
    </dl>
    <section className={styles.scope}>
      <h2>Customer concern</h2>
      <p>{recorded ? consent.concern ?? order.serviceVisit.concernSummary : order.serviceVisit.concernSummary}</p>
    </section>
    <p className={styles.fee}><strong>Flat diagnostic fee</strong> {formatDiagnosticFee(feeCents)}</p>
    <p>{diagnosticAuthorizationScope}</p>
    {recorded ? <dl className={styles.facts}>
      <div><dt>Authorized by</dt><dd>{consent.customerName}</dd></div>
      <div><dt>Evidence reference</dt><dd>{consent.reference}</dd></div>
      {consent.consentedAt && <div><dt>Authorization date</dt><dd>{new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago",
      }).format(new Date(consent.consentedAt))} CT</dd></div>}
    </dl> : <div className={styles.signature}>
      <span>Customer or authorized representative signature</span>
      <span>Date and time</span>
    </div>}
  </main>;
}
