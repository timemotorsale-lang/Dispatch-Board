"use client";

import {
  ArrowLeft,
  CarFront,
  ClipboardList,
  Building2,
  House,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";

type Tab = { activePaths?: string[]; href: string; label: string; matchExact?: boolean; icon: typeof House };

const globalTabs: Tab[] = [
  { href: "/vehicles", label: "Home", icon: House, matchExact: true },
  { href: "/vehicles/inventory", label: "Inventory Lifecycle", icon: RefreshCw, activePaths: ["/vehicles/control-tower", "/vehicles/acquisition-appraisal", "/vehicles/inventory-to-frontline", "/vehicles/disposition-wholesale", "/vehicles/retail-completion", "/vehicles/workflow-operations"] },
  { href: "/vehicles/registry", label: "Find Vehicle", icon: Search },
  { href: "/vehicles/workflows/add-vehicle", label: "Add Vehicle", icon: Plus },
  { href: "/vehicles/coo-workbook", label: "Inventory Workbook", icon: ClipboardList },
  { href: "/vehicles/outside-vendors", label: "Outside Vendors", icon: Building2 },
  { href: "/vehicles/shop-recon", label: "Shop & Recon", icon: Wrench },
  { href: "/vehicles/repair-workbench", label: "Repair Workbench", icon: ClipboardList, activePaths: ["/vehicles/repair-orders"] },
  { href: "/vehicles/parts-operations", label: "Parts", icon: PackageOpen, activePaths: ["/vehicles/parts", "/vehicles/parts-counter", "/vehicles/parts-receiving"] },
  { href: "/vehicles/quality-control", label: "Quality Control", icon: ShieldCheck },
];

function safeReturnTo(value: string | null) { return value?.startsWith("/") && !value.startsWith("//") ? value : ""; }
function withReturnTo(href: string, returnTo: string) { const url = new URL(href, "http://inventory-console.local"); url.searchParams.set("returnTo", returnTo); return `${url.pathname}${url.search}`; }
function vehicleIdFrom(pathname: string, searchParams: URLSearchParams) {
  const vehicle360 = pathname.match(/^\/vehicles\/360\/([^/]+)/)?.[1];
  const vehicleWorkspace = pathname.match(/^\/vehicles\/([^/]+)\/(?:inventory-planning|workbench)$/)?.[1];
  return vehicle360 ?? vehicleWorkspace ?? searchParams.get("vehicleId") ?? "";
}
function currentHref(pathname: string, searchParams: URLSearchParams) { const safeParams = new URLSearchParams(searchParams); if (safeParams.has("returnTo") && !safeReturnTo(safeParams.get("returnTo"))) safeParams.delete("returnTo"); const query = safeParams.toString(); return `${pathname}${query ? `?${query}` : ""}`; }
function isActive(tab: Tab, pathname: string) {
  if (tab.matchExact) return pathname === tab.href;
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`) || Boolean(tab.activePaths?.some(path => pathname === path || pathname.startsWith(`${path}/`)));
}

export function InventoryConsoleRouteTabs({ allowedHrefs = [], pathname, searchParams, showFullNavigation = false, showReturn = true }: { allowedHrefs?: string[]; pathname: string; searchParams: URLSearchParams; showFullNavigation?: boolean; showReturn?: boolean }) {
  const sourceReturn = safeReturnTo(searchParams.get("returnTo"));
  const here = currentHref(pathname, searchParams);
  const vehicleId = vehicleIdFrom(pathname, searchParams);
  const vehicleTabs: Tab[] = vehicleId ? [
    { href: withReturnTo(`/vehicles/360/${encodeURIComponent(vehicleId)}`, sourceReturn || here), label: "Vehicle 360", icon: CarFront, matchExact: true },
    ...(showFullNavigation ? [{ href: `/vehicles/${encodeURIComponent(vehicleId)}/inventory-planning`, label: "Inventory Planning", icon: ClipboardList, matchExact: true }] : []),
    { href: `/vehicles/${encodeURIComponent(vehicleId)}/workbench`, label: "Vehicle Workbench", icon: Wrench, matchExact: true },
  ] : [];
  const permittedPaths = allowedHrefs.map(href => href.split("?")[0]);
  const visibleGlobalTabs = showFullNavigation ? globalTabs : globalTabs.filter(tab => permittedPaths.some(path => path === tab.href || tab.activePaths?.includes(path)));
  const returnHref = sourceReturn && sourceReturn !== here ? sourceReturn : pathname === "/vehicles" ? "" : "/vehicles";

  return <nav className="inventory-console-route-tabs" aria-label="Inventory Console page navigation">
    {showReturn && returnHref ? <Link className="inventory-console-route-return" href={returnHref}><ArrowLeft />{sourceReturn ? "Return to previous page" : "Return to Inventory Console"}</Link> : null}
    <div>{visibleGlobalTabs.map(tab => { const Icon = tab.icon; const href = tab.label === "Add Vehicle" ? withReturnTo(tab.href, here) : tab.label === "Repair Workbench" && vehicleId ? withReturnTo(`/vehicles/repair-workbench?vehicleId=${encodeURIComponent(vehicleId)}`, here) : tab.href; return <Link aria-current={isActive(tab, pathname) ? "page" : undefined} className={isActive(tab, pathname) ? "active" : ""} href={href} key={tab.label}><Icon />{tab.label}</Link>; })}{visibleGlobalTabs.length && vehicleTabs.length ? <span className="inventory-console-route-divider" aria-hidden="true" /> : null}{vehicleTabs.map(tab => { const Icon = tab.icon; const active = tab.label === "Vehicle 360" ? pathname.startsWith("/vehicles/360/") : pathname === tab.href; return <Link aria-current={active ? "page" : undefined} className={active ? "active context" : "context"} href={tab.href} key={tab.label}><Icon />{tab.label}</Link>; })}</div>
  </nav>;
}
