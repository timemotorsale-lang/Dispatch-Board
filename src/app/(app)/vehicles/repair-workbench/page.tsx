import { ClipboardList, Search, Wrench } from "lucide-react";
import Link from "next/link";

import { AdvisorRepairOrderStatusView } from "@/features/advisor/advisor-repair-order-status-view";
import { RepairOrderEnterpriseWorkbench } from "@/features/inventory/repair-order-enterprise-workbench";
import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import { BackToVehicleOperationsWorkspace } from "@/features/inventory/workspace-return-link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey } from "@/server/auth/navigation";
import { getRepairOrderDiagnosticsBridge } from "@/server/diagnostics/service";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";
import { getShopPlanningDetail } from "@/server/shop-planning/service";

import styles from "./repair-workbench.module.css";

type PageProps = {
  searchParams?: Promise<{ query?: string; repairOrderId?: string; view?: string }>;
};

function vehicleLabel(order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]) {
  return [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
}

async function diagnosticsBridge(user: Awaited<ReturnType<typeof requireCurrentUser>>, repairOrderId: string) {
  try { return await getRepairOrderDiagnosticsBridge(user, repairOrderId); }
  catch (error) { return { state: "UNAVAILABLE" as const, repairOrderId, reason: error instanceof Error ? error.message : "Diagnostics could not be loaded." }; }
}

export default async function RepairWorkbenchPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const showWorkspaceReturn = getPermittedWorkspaces(user).some((workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD");
  const showAdvisorReturn = getWorkspaceKey(user) === "ADVISOR";

  if (params.repairOrderId) {
    const [order, options, diagnostics] = await Promise.all([
      getShopPlanningDetail(user, params.repairOrderId),
      getRepairOrderCreateOptions(user),
      diagnosticsBridge(user, params.repairOrderId)
    ]);

    if (showAdvisorReturn) {
      return <AdvisorRepairOrderStatusView order={JSON.parse(JSON.stringify(order))} />;
    }

    return (
      <RepairOrderEnterpriseWorkbench
        diagnostics={JSON.parse(JSON.stringify(diagnostics))}
        options={{ users: JSON.parse(JSON.stringify(options.users)) }}
        order={JSON.parse(JSON.stringify(order))}
        showAdvisorReturn={showAdvisorReturn}
        showWorkspaceReturn={showWorkspaceReturn}
      />
    );
  }

  const query = params.query?.trim().slice(0, 100) ?? "";
  const orders = await listRepairOrders(user, { page: 1, pageSize: 50, query });

  if (params.view !== "all" && orders.items[0]) {
    const [order, options, diagnostics] = await Promise.all([
      getShopPlanningDetail(user, orders.items[0].id),
      getRepairOrderCreateOptions(user),
      diagnosticsBridge(user, orders.items[0].id)
    ]);

    if (showAdvisorReturn) {
      return <AdvisorRepairOrderStatusView order={JSON.parse(JSON.stringify(order))} />;
    }

    return (
      <RepairOrderEnterpriseWorkbench
        diagnostics={JSON.parse(JSON.stringify(diagnostics))}
        options={{ users: JSON.parse(JSON.stringify(options.users)) }}
        order={JSON.parse(JSON.stringify(order))}
        showAdvisorReturn={showAdvisorReturn}
        showWorkspaceReturn={showWorkspaceReturn}
      />
    );
  }

  return (
    <section className={`page-stack ${styles.directory}`}>
      <header className="page-copy">
        {showAdvisorReturn ? <BackToServiceAdvisorWorkspace /> : showWorkspaceReturn ? <BackToVehicleOperationsWorkspace /> : null}
        <span className="eyebrow">Shop &amp; Recon</span>
        <h1>Repair Workbench</h1>
        <p>Find an open repair order, then enter its enterprise workbench for concern, diagnosis, estimate, jobs, quality, and timeline context.</p>
        <div className="form-actions">
          <Link className="pill pill-secondary" href="/vehicles/shop-recon">← Shop &amp; Recon</Link>
          <Link className="pill pill-primary" href="/vehicles/repair-orders?intakeSource=WALK_IN">Check In Vehicle</Link>
          <Link className="pill pill-secondary" href="/vehicles/repair-orders">Repair Order Administration</Link>
        </div>
      </header>

      <section className="panel-card">
        <form className="form-actions" method="get">
          <input name="view" type="hidden" value="all" />
          <label className="form-field">
            <span>Search repair order, customer, vehicle, VIN, inventory number, owner, or next action</span>
            <input defaultValue={query} name="query" placeholder="Search open repair orders…" />
          </label>
          <button className="button button-primary" type="submit"><Search size={15} /> Search</button>
          {query ? <Link className="button button-secondary" href="/vehicles/repair-workbench?view=all">Clear</Link> : null}
        </form>
        <p>{orders.total} open repair {orders.total === 1 ? "order" : "orders"}{query ? ` matching “${query}”` : ""}</p>
      </section>

      <section className="panel-card page-stack">
        <div className="page-copy">
          <span className="eyebrow">Open work</span>
          <h2>Select a repair order</h2>
          <p>The selected repair order opens with its authoritative customer concern and current governed stage.</p>
        </div>
        {orders.items.length ? (
          <div className={styles.orderList}>
            {orders.items.map((order) => (
              <Link className={`settings-callout-card ${styles.order}`} href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`} key={order.id}>
                <ClipboardList aria-hidden="true" size={20} />
                <span>
                  <strong>{order.repairOrderNumber} · {vehicleLabel(order)}</strong>
                  <small>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle"} · {order.location.name}</small>
                  <small>{order.serviceVisit.concernSummary}</small>
                </span>
                <span>
                  <b>{order.stage.replaceAll("_", " ")}</b>
                  <small>{order.ownerUser.name} · {order.age.overdue ? "Overdue" : order.nextAction}</small>
                </span>
                <em><Wrench aria-hidden="true" size={15} /> Open Workbench</em>
              </Link>
            ))}
          </div>
        ) : (
          <div className="notice notice-info">
            <p>No open repair orders match this search. Clear the search or check in a vehicle to create one.</p>
          </div>
        )}
      </section>
    </section>
  );
}
