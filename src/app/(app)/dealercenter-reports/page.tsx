import Link from "next/link";
import { chicagoToday, formatCents } from "@/features/collections/domain/money-dates";
import { DealerCenterImportForm } from "@/features/dealercenter-reporting/import-form";
import styles from "@/features/dealercenter-reporting/reporting.module.css";
import { requireCurrentUser } from "@/server/auth/current-user";
import { dealerCenterLocations, DealerCenterReportError, getDealerCenterReport } from "@/server/dealercenter-reporting/service";

type Search = { kind?: string; locationId?: string; view?: string; month?: string; page?: string };

export default async function DealerCenterReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [query, user] = await Promise.all([searchParams, requireCurrentUser()]);
  const kind = query.kind === "INVENTORY" ? "INVENTORY" : "SALES";
  const inventory = kind === "INVENTORY";
  const title = inventory ? "DealerCenter inventory" : "DealerCenter completed sales";
  const back = inventory ? "/vehicles/inventory" : "/sales";
  const locations = await dealerCenterLocations(user);
  const locationId = query.locationId || locations[0]?.id || "";
  const location = locations.find(item => item.id === locationId);
  const isReport = query.view === "report";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month ?? "") ? query.month : undefined;
  const page = /^\d{1,5}$/.test(query.page ?? "") ? Math.max(1, Number(query.page)) : 1;
  const url = (view: string, extra: Record<string, string> = {}) =>
    "/dealercenter-reports?" + new URLSearchParams({ kind, locationId, view, ...extra });

  if (!location) return <section className="panel-card page-stack">
    <h1>{title}</h1>
    <p role="status">A manager assigned to this location can open its DealerCenter reports.</p>
    <Link href={back}>Return to {inventory ? "Inventory" : "Sales"}</Link>
  </section>;

  let report: Awaited<ReturnType<typeof getDealerCenterReport>> = null;
  let error = "";
  if (isReport) try {
    report = await getDealerCenterReport(user, kind, locationId, month, page);
  } catch (failure) {
    if (!(failure instanceof DealerCenterReportError)) throw failure;
    error = failure.message;
  }

  return <main className="page-stack">
    <header className="page-copy">
      <p><Link href={back}>← Back to {inventory ? "Inventory" : "Sales"}</Link></p>
      <h1>{title}</h1>
      <p>{inventory ? "Review stock, status, and cost from the latest complete inventory export for a location." : "Review sales counts and sale prices by location and sold date."}</p>
      <div className="form-actions">
        <Link className={"button " + (isReport ? "button-secondary" : "button-primary")} aria-current={isReport ? undefined : "page"} href={url("import")}>Import report</Link>
        <Link className={"button " + (isReport ? "button-primary" : "button-secondary")} aria-current={isReport ? "page" : undefined} href={url("report")}>View report</Link>
      </div>
    </header>

    {!isReport ? <DealerCenterImportForm kind={kind} initialLocationId={locationId} locations={locations} today={chicagoToday()} /> : <>
      <form method="get" className={"panel-card " + styles.panel + " " + styles.fields}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="view" value="report" />
        <label className="form-field">Location
          <select name="locationId" defaultValue={locationId}>{locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>
        {!inventory && <label className="form-field">Sold month
          <input type="month" name="month" defaultValue={month} />
        </label>}
        <button type="submit" className="button button-secondary">Apply filters</button>
      </form>
      {error && <p className="notice notice-danger" role="alert">{error}</p>}
      {report?.kind === "INVENTORY" && <section className={"panel-card " + styles.panel + " " + styles.stack} aria-label="Imported inventory snapshot">
        <h2>{report.location.name} inventory</h2>
        {!report.report ? <p>No inventory report confirmed for this location.</p> : <>
          <p>As of {report.report.dataAsOf} · {report.report.fileName} · {report.rows.length} vehicles in the export</p>
          <p>Reported cost {formatCents(report.rows.reduce((sum, row) => sum + (row.costCents ?? 0), 0))} across {report.rows.filter(row => row.costCents !== null).length} vehicles with a cost</p>
          <div className={styles.table}><table>
            <thead><tr><th>VIN</th><th>Stock</th><th>Reported status</th><th>Cost</th><th>Asking price</th></tr></thead>
            <tbody>{report.rows.map(row => <tr key={row.vin}><th scope="row">{row.vin}</th><td>{row.stock || "—"}</td><td>{row.status}</td><td>{formatCents(row.costCents)}</td><td>{formatCents(row.priceCents)}</td></tr>)}</tbody>
          </table></div>
        </>}
      </section>}
      {report?.kind === "SALES" && <section className={"panel-card " + styles.panel + " " + styles.stack} aria-label="Imported completed sales">
        <h2>{report.location.name} sales</h2>
        <p>{report.total} completed sales · {formatCents(report.amountCents)} in reported sale prices · {month ?? "All imported dates"}</p>
        {report.latest && <p>Latest confirmed source · {report.latest.fileName} · Report as of {report.latest.dataAsOf}</p>}
        {report.sales.length === 0 ? <p>No imported sales in this selection.</p> : <div className={styles.table}><table>
          <thead><tr><th>Deal</th><th>Sold date</th><th>VIN / stock</th><th>Sale price</th></tr></thead>
          <tbody>{report.sales.map(row => <tr key={row.id}><th scope="row">{row.dealNumber}</th><td>{row.soldDate}</td><td>{[row.vin, row.stock].filter(Boolean).join(" · ") || "—"}</td><td>{formatCents(row.amountCents)}</td></tr>)}</tbody>
        </table></div>}
        {report.total > 50 && <nav className="form-actions" aria-label="Sales report pages">
          {page > 1 && <Link href={url("report", { month: month ?? "", page: String(page - 1) })}>Previous page</Link>}
          {report.total > page * 50 && <Link href={url("report", { month: month ?? "", page: String(page + 1) })}>Next page</Link>}
        </nav>}
      </section>}
    </>}
  </main>;
}
