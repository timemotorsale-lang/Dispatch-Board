"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { packetCorrection } from "@/lib/deal-packet-feedback";
import styles from "./crm-next-shell.module.css";

export function goToDealBlocker(message: string, source: HTMLElement, closeDrawer?: () => void) {
  const correction = packetCorrection(message);
  if (!correction) return;
  const scope = source.closest("section")?.parentElement ?? document.querySelector('[aria-label="Revenue execution desk"]') ?? document;
  const editable = 'input:not([readonly]):not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';
  const labels = Array.from(scope.querySelectorAll("label"));
  let target: HTMLElement | null = null;
  for (const field of correction.fields) {
    const label = labels.find((item) => item.querySelector("span")?.textContent?.trim() === field);
    target = label?.querySelector<HTMLElement>(editable) ?? null;
    if (target) break;
  }
  if (!target && /customer selected|select the driver|driver selected/i.test(message)) {
    const customerLabel = Array.from(document.querySelectorAll('[aria-label="Revenue execution desk"] label')).find((label) => /^(Customer|Driver|Buyer|Renter)$/.test(label.querySelector("span")?.textContent?.trim() ?? "") && label.querySelector("select"));
    target = customerLabel?.querySelector<HTMLElement>("select") ?? null;
  }
  if (!target) {
    const sections = Array.from(scope.querySelectorAll<HTMLElement>("section[id]"));
    const section = correction.sections.map((token) => sections.find((item) => item.id.includes(token))).find(Boolean);
    target = section?.querySelector<HTMLElement>(editable) ?? section ?? null;
  }
  if (!target) return;
  if (!target.closest("aside")) closeDrawer?.();
  const destination = target;
  requestAnimationFrame(() => {
    if (!destination.matches(editable)) destination.tabIndex = -1;
    destination.focus({ preventScroll: true });
    destination.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function PacketFeedback({ status, closeDrawer, children }: { status: { kind: string; message: string }; closeDrawer?: () => void; children?: ReactNode }) {
  if (status.kind === "idle") return null;
  const correction = status.kind === "error" ? packetCorrection(status.message) : null;
  const storage = /sales documents|document storage|database|save outcome|could not be saved|saving the packet/i.test(status.message);
  return <div role={status.kind === "error" ? "alert" : "status"} className={status.kind === "error" ? styles.retailPacketError : styles.retailPacketStatus}>
    <p>{status.message}</p>
    {correction && !storage ? <button type="button" onClick={(event) => goToDealBlocker(status.message, event.currentTarget, closeDrawer)}>Go to blocker <ArrowRight size={16} /></button> : null}
    {storage ? <Link href="/sales-documents">Open Sales Documents</Link> : null}
    {/sign in/i.test(status.message) ? <Link href="/login">Sign in</Link> : null}
    {children}
  </div>;
}
