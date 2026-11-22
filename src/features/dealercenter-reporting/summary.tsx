import Link from "next/link";
import { formatCents } from "@/features/collections/domain/money-dates";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getDealerCenterReport } from "@/server/dealercenter-reporting/service";
import type { DealerCenterKind } from "./import-format";
import styles from "./reporting.module.css";

export async function DealerCenterSummary({ user, kind, locationId }: { user: AuthenticatedUser; kind: DealerCenterKind; locationId?: string }) {
  let report: Awaited<ReturnType<typeof getDealerCenterReport>> = null;
  try {
    report = await getDealerCenterReport(user, kind, locationId);
  } catch (error) {
    console.error("Could not load DealerCenter dashboard summary", kind, error instanceof Error ? error.name : "UnknownError");
    return <section className={"panel-card " + styles.panel} aria-label="DealerCenter reports unavailable">
      <p>DealerCenter reporting is temporarily unavailable.</p>
    </section>;
  }
  if (!report) return null;
  const query = new URLSearchParams({ kind, locationId: report.location.id });
  const inventory = report.kind === "INVENTORY";
  const caption = report.kind === "INVENTORY"
    ? report.report ? report.rows.length + " vehicles as of " + report.report.dataAsOf : "No inventory report confirmed"
    : report.latest ? report.total + " completed sales · " + formatCents(report.amountCents) + " across all imported dates" : "No sales report confirmed";
  return <section className={"panel-card " + styles.panel + " " + styles.summary} aria-label={inventory ? "DealerCenter inventory summary" : "DealerCenter sales summary"}>
    <div><h2>{inventory ? "DealerCenter inventory" : "DealerCenter completed sales"}</h2><p>{report.location.name} · {caption}</p></div>
    <div className="form-actions">
      <Link className="button button-secondary" href={"/dealercenter-reports?" + query + "&view=report"}>View DealerCenter report</Link>
      <Link className="button button-secondary" href={"/dealercenter-reports?" + query}>Import DealerCenter report</Link>
    </div>
  </section>;
}
