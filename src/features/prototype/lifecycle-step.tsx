"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { shopReconLifecycleHref } from "@/lib/vehicle-lifecycle-links";
import { ChevronRight } from "lucide-react";
import styles from "./inventory-lifecycle-prototype.module.css";

export const CompactLifecycleTools = createContext<{ repairOrderId?: string; returnTo?: string } | null>(null);

export function LifecycleStep({ children, className, defaultOpen = false, status, step, title }: {
  children: ReactNode;
  className: string;
  defaultOpen?: boolean;
  status: ReactNode;
  step: string;
  title: string;
}) {
  if (!useContext(CompactLifecycleTools)) return <section className={className}>
    <header><div><span>{step}</span><h4>{title}</h4></div>{status}</header>
    {children}
  </section>;

  return <details className={`${className} ${styles.previewStep}`} open={defaultOpen}>
    <summary>
      <ChevronRight aria-hidden="true" size={16} />
      <span className={styles.previewStepNumber}>{step.startsWith("Step ") ? step.slice(5) : step}</span>
      <strong>{title}</strong>
      {status}
    </summary>
    {children}
  </details>;
}

export function LifecycleToolDetails({ children, label }: { children: ReactNode; label: string }) {
  return useContext(CompactLifecycleTools)
    ? <details className={styles.previewDetails}><summary>{label}</summary>{children}</details>
    : children;
}


export function LifecycleToolLink({ children, className, href, forRepairOrder = false }: {
  children: ReactNode;
  className: string;
  href: string;
  forRepairOrder?: boolean;
}) {
  const preview = useContext(CompactLifecycleTools);
  if (preview?.returnTo) {
    const target = new URL(href, "https://lifecycle.invalid");
    target.searchParams.set("returnTo", preview.returnTo);
    if (forRepairOrder && preview.repairOrderId) {
      if (target.pathname === "/vehicles/shop-recon") {
        return <Link className={className} href={shopReconLifecycleHref(preview.repairOrderId, preview.returnTo)}>{children}</Link>;
      }
      target.searchParams.set("repairOrderId", preview.repairOrderId);
      if (target.pathname === "/vehicles/repair-workbench") target.searchParams.delete("view");
    }
    if (target.pathname === "/vehicles/quality-control" || target.pathname === "/vehicles/repair-workbench") target.searchParams.set("returnLabel", "Return to Inventory Lifecycle Preview");
    href = target.pathname + target.search + target.hash;
  }
  return <Link className={className} href={href}>{children}</Link>;
}
