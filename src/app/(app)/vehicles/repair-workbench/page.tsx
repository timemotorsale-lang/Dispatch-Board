import { Search, Wrench } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdvisorRepairOrderStatusView } from "@/features/advisor/advisor-repair-order-status-view";
import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import { RepairOrderEnterpriseWorkbench } from "@/features/inventory/repair-order-enterprise-workbench";
import { BackToVehicleOperationsWorkspace } from "@/features/inventory/workspace-return-link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey } from "@/server/auth/navigation";
import { getRepairOrderDiagnosticsBridge } from "@/server/diagnostics/service";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";
import { getShopPlanningDetail } from "@/server/shop-planning/service";
import { readManagerWorkspaceContext } from "@/lib/manager-workspace-context";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";

import styles from "./repair-workbench.module.css";

type PageProps = {
  searchParams?: Promise<{
    contextError?: string;
    compose?: string;
    query?: string;
    repairOrderId?: string;
    returnLabel?: string;
    returnTo?: string;
    fullDetails?: string;
    tab?: string;
    vehicleId?: string;
    view?: string;
    workspace?: string;
    workspaceContext?: string;
    managerMode?: string;
  }>;
};

function preserveManagerContext(query: URLSearchParams, mode: "CEO" | "COO" | "WORK") {
  query.set("workspaceContext", "MANAGEMENT");
  query.set("managerMode", mode);
}

function vehicleLabel(order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]) {
  return [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
}

function activeVendorWork(order: {
  vendorWorks?: Array<{ status: string; currentLocation: string; nextAction: string }> | null;
}) {
  const works = order.vendorWorks ?? [];
  return works.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status)) ?? works[0] ?? null;
}

async function diagnosticsBridge(
  user: Awaited<ReturnType<typeof requireCurrentUser>>,
  repairOrderId: string,
) {
  try {
    return await getRepairOrderDiagnosticsBridge(user, repairOrderId);
  } catch (error) {
    return {
      state: "UNAVAILABLE" as const,
      repairOrderId,
      reason: error instanceof Error ? error.message : "Diagnostics could not be loaded.",
    };
  }
}

export default async function RepairWorkbenchPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const returnTo =
    params.returnTo?.startsWith("/") && !params.returnTo.startsWith("//")
      ? params.returnTo
      : undefined;
  const returnLabel = params.returnLabel?.slice(0, 120);
  const permittedWorkspaces = getPermittedWorkspaces(user);
  const managerContext = permittedWorkspaces.some((workspace) => workspace.key === "MANAGEMENT")
    ? readManagerWorkspaceContext(new URLSearchParams({
        workspaceContext: params.workspaceContext ?? "",
        managerMode: params.managerMode ?? ""
      }))
    : null;
  const showWorkspaceReturn = permittedWorkspaces.some(
    (workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD",
  );
  const showAdvisorReturn =
    getWorkspaceKey(user) === "ADVISOR" ||
    (params.workspace === "advisor" &&
      getPermittedWorkspaces(user).some((workspace) => workspace.key === "ADVISOR"));

  if (params.repairOrderId) {
    const order = await getShopPlanningDetail(user, params.repairOrderId);
    if (params.vehicleId && order.vehicle.id !== params.vehicleId) {
      const mismatch = new URLSearchParams({
        contextError: "REPAIR_ORDER_VEHICLE_MISMATCH",
        vehicleId: params.vehicleId,
        view: "all",
      });
      if (params.workspace === "advisor") mismatch.set("workspace", "advisor");
      if (returnTo) mismatch.set("returnTo", returnTo);
      if (managerContext) preserveManagerContext(mismatch, managerContext.mode);
      redirect(`/vehicles/repair-workbench?${mismatch}`);
    }
    if (!params.vehicleId) {
      const canonical = new URLSearchParams({
        repairOrderId: params.repairOrderId,
        vehicleId: order.vehicle.id,
      });
      if (params.compose === "customer" || params.compose === "management" || params.compose === "team") canonical.set("compose", params.compose);
      if (params.fullDetails === "1") canonical.set("fullDetails", "1");
      if (params.tab === "repair") canonical.set("tab", "repair");
      if (params.workspace === "advisor") canonical.set("workspace", "advisor");
      if (returnTo) canonical.set("returnTo", returnTo);
      if (managerContext) preserveManagerContext(canonical, managerContext.mode);
      redirect(`/vehicles/repair-workbench?${canonical}`);
    }
    const [options, diagnostics] = await Promise.all([
      getRepairOrderCreateOptions(user),
      diagnosticsBridge(user, params.repairOrderId),
    ]);
    const partsWorkspace = (activeVendorWork(order) || order.partDemands?.length)
      ? await getServiceClosePartsWorkspace(user).catch(() => null)
      : null;
    const relatedPurchaseOrders = (partsWorkspace?.purchaseOrders ?? []).filter((item) =>
      item.requisition?.demand?.repairOrder?.id === order.id,
    );

    if (showAdvisorReturn) {
      const compose = params.compose === "customer" || params.compose === "management" || params.compose === "team" ? params.compose : undefined;
      return <AdvisorRepairOrderStatusView compose={compose} initialTab={params.tab === "repair" ? "REPAIR" : undefined} order={JSON.parse(JSON.stringify(order))} returnTo={returnTo} />;
    }

    return (
      <RepairOrderEnterpriseWorkbench
        diagnostics={JSON.parse(JSON.stringify(diagnostics))}
        options={{ users: JSON.parse(JSON.stringify(options.users)) }}
        order={JSON.parse(JSON.stringify(order))}
        relatedPurchaseOrders={JSON.parse(JSON.stringify(relatedPurchaseOrders))}
        fullDetailMode={params.fullDetails === "1"}
        returnLabel={returnLabel}
        returnTo={returnTo}
        showAdvisorReturn={showAdvisorReturn}
        showWorkspaceReturn={showWorkspaceReturn}
      />
    );
  }

  const query = params.query?.trim().slice(0, 100) ?? "";
  const [orders, contextOptions] = await Promise.all([
    listRepairOrders(user, { page: 1, pageSize: 50, query, vehicleId: params.vehicleId }),
    params.vehicleId ? getRepairOrderCreateOptions(user) : Promise.resolve(null),
  ]);
  const contextVehicle =
    contextOptions?.vehicles.find((vehicle) => vehicle.id === params.vehicleId) ?? null;

  if (params.vehicleId && params.view !== "all" && orders.items.length === 1) {
    const exact = new URLSearchParams({
      repairOrderId: orders.items[0].id,
      vehicleId: params.vehicleId,
    });
    if (params.workspace === "advisor") exact.set("workspace", "advisor");
    if (returnTo) exact.set("returnTo", returnTo);
    if (managerContext) preserveManagerContext(exact, managerContext.mode);
    redirect(`/vehicles/repair-workbench?${exact}`);
  }

  const contextName = contextVehicle
    ? [contextVehicle.year, contextVehicle.make, contextVehicle.model].filter(Boolean).join(" ") ||
      contextVehicle.vehicleNumber
    : "the selected vehicle";
  const intakeHref = params.vehicleId
    ? `/vehicles/repair-orders?${new URLSearchParams({
        intakeSource: "INVENTORY_RECON",
        vehicleId: params.vehicleId,
        ...(returnTo ? { returnTo } : {}),
      })}`
    : "/vehicles/repair-orders?intakeSource=WALK_IN";

  return (
    <section className={`page-stack ${styles.directory}`}>
      <header className={`page-copy ${styles.hero}`}>
        {showAdvisorReturn ? (
          <BackToServiceAdvisorWorkspace />
        ) : showWorkspaceReturn ? (
          <BackToVehicleOperationsWorkspace />
        ) : null}
        <span className="eyebrow">Shop &amp; Recon</span>
        <h1>{params.vehicleId ? `Repair Workbench · ${contextName}` : "Repair Workbench"}</h1>
        <p>
          {params.vehicleId
            ? `Only repair orders linked to ${contextName} are shown. The console will not substitute another vehicle.`
            : "Find an open repair order, then enter its enterprise workbench for concern, diagnosis, estimate, jobs, quality, and timeline context."}
        </p>
        <div className={styles.heroActions}>
          <Link className="pill pill-secondary" href={returnTo ?? "/vehicles/inventory"}>
            Inventory Lifecycle
          </Link>
          <Link className="pill pill-secondary" href="/vehicles/shop-recon">
            ← Shop &amp; Recon
          </Link>
          <Link className="pill pill-primary" href={intakeHref}>
            {params.vehicleId ? `Create repair order for ${contextName}` : "Check In Vehicle"}
          </Link>
          <Link className="pill pill-secondary" href="/vehicles/repair-orders">
            Repair Order Administration
          </Link>
        </div>
      </header>

      {params.contextError === "REPAIR_ORDER_VEHICLE_MISMATCH" ? (
        <div className="notice notice-warning">
          <p>
            The requested repair order belongs to a different vehicle and was not opened. Select
            or create a repair order for {contextName}.
          </p>
        </div>
      ) : null}

      <section className={`panel-card ${styles.searchCard}`}>
        <div className={styles.searchCardHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Queue search</span>
            <h2>Open repair-order queue</h2>
          </div>
          <b>
            {orders.total} open repair {orders.total === 1 ? "order" : "orders"}
            {query ? ` matching “${query}”` : ""}
          </b>
        </div>
        <form className={`form-actions ${styles.searchForm}`} method="get">
          <input name="view" type="hidden" value="all" />
          {params.vehicleId ? <input name="vehicleId" type="hidden" value={params.vehicleId} /> : null}
          {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
          <label className={`form-field ${styles.searchField}`}>
            <span>Search repair order, customer, vehicle, VIN, inventory number, owner, or next action</span>
            <input defaultValue={query} name="query" placeholder="Search open repair orders..." />
          </label>
          <button className="button button-primary" type="submit">
            <Search size={15} /> Search
          </button>
          {query ? (
            <Link
              className="button button-secondary"
              href={
                params.vehicleId
                  ? `/vehicles/repair-workbench?${new URLSearchParams({
                      vehicleId: params.vehicleId,
                      view: "all",
                      ...(returnTo ? { returnTo } : {}),
                    })}`
                  : "/vehicles/repair-workbench?view=all"
              }
            >
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      <section className={`panel-card page-stack ${styles.queueCard}`}>
        <div className={styles.queueHeader}>
          <span className={styles.sectionEyebrow}>Open work</span>
          <h2>Select a repair order</h2>
          <p>
            The selected repair order opens with its authoritative customer concern and current
            governed stage.
          </p>
        </div>
        {orders.items.length ? (
          <div className={styles.orderList}>
            <div aria-hidden="true" className={styles.orderListHeader}>
              <span>RO / vehicle</span><span>Stage / owner</span><span>Concern / location</span><span>Action</span>
            </div>
            {orders.items.map((order) => {
              const offsiteWork = activeVendorWork(order);
              const orderHref = `/vehicles/repair-workbench?${new URLSearchParams({
                repairOrderId: order.id,
                vehicleId: order.vehicle.id,
                ...(returnTo ? { returnTo } : {}),
              })}`;
              return <Link aria-label={`Open ${order.repairOrderNumber} for ${vehicleLabel(order)}`} className={`settings-callout-card ${styles.order}`} href={orderHref} key={order.id}>
                <span className={styles.orderIdentity}>
                  <strong>
                    {order.repairOrderNumber} · {vehicleLabel(order)}
                  </strong>
                  <small>
                    {order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle"}
                  </small>
                </span>
                <span className={styles.orderMeta}>
                  <b>{order.stage.replaceAll("_", " ")}</b>
                  <small>{order.ownerUser.name}</small>
                </span>
                <span className={styles.orderConcern}>
                  <b title={order.serviceVisit.concernSummary}>{order.serviceVisit.concernSummary}</b>
                  <small>{offsiteWork ? offsiteWork.currentLocation : order.location.name}{order.age.overdue ? " · Overdue" : ""}</small>
                </span>
                <div className={styles.orderActions}>
                  <span>
                    <Wrench aria-hidden="true" size={15} /> Open
                  </span>
                </div>
              </Link>;
            })}
          </div>
        ) : (
          <div className="notice notice-info">
            <p>
              {params.vehicleId
                ? `No open repair order is linked to ${contextName}. Create one for this vehicle before opening repair work.`
                : "No open repair orders match this search. Clear the search or check in a vehicle to create one."}
            </p>
            {params.vehicleId ? (
              <Link className="button button-primary" href={intakeHref}>
                Create repair order for this vehicle
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}
