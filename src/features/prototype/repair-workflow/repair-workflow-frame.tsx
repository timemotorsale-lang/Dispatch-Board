"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { repairReviewHref, repairWorkflowLabels, repairWorkflowSteps, type RepairWorkflowStep } from "@/lib/repair-workflow-review";
import styles from "./repair-workflow.module.css";

export function RepairWorkflowFrame({ repairOrderId, number, vehicle, stock, location, current, selected, closed, recordedWork, stepStatus, children }: { recordedWork?: ReactNode; stepStatus?: Record<RepairWorkflowStep, string>; repairOrderId: string; number: string; vehicle: string; stock: string; location: string; current: RepairWorkflowStep; selected: RepairWorkflowStep; closed: boolean; children: ReactNode }) {
  const router = useRouter();
  const dirty = useRef(false);
  const mayLeave = () => !dirty.current || window.confirm("Leave this task without saving your entered changes?");
  useEffect(() => {
    const saved = (event: Event) => { if ((event as CustomEvent).detail?.repairOrderId === repairOrderId) { dirty.current = false; router.push(repairReviewHref(repairOrderId)); router.refresh(); } };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("repair-workflow-saved", saved);
    return () => { window.removeEventListener("repair-workflow-saved", saved); window.removeEventListener("beforeunload", beforeUnload); };
  }, [repairOrderId, router]);
  return <main className={styles.workspace} onChangeCapture={() => { dirty.current = true; }} onClickCapture={event => { const link = (event.target as HTMLElement).closest("a"); if (link && !link.getAttribute("href")?.startsWith("#") && !mayLeave()) { event.preventDefault(); event.stopPropagation(); } }}><header className={styles.header}><div><small>Review workflow · not adopted</small><h1>Repair Workbench</h1><strong>{stock} · {vehicle}</strong><p>{number} · {location}</p></div><nav><Link href="/prototype/repair-workflow">Find another vehicle</Link><Link href={`/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId })}`}>Open existing workbench</Link></nav></header><p className={styles.notice}>Save actions update real records under existing permissions. Opening this review does not adopt it or authorize repairs.</p>{recordedWork}<nav className={styles.steps} aria-label="Repair workflow">{repairWorkflowSteps.map((step, index) => <Link key={step} aria-current={selected === step ? "step" : undefined} href={repairReviewHref(repairOrderId, step)}><span>{index + 1}. {repairWorkflowLabels[step]}</span>{stepStatus && <small>{stepStatus[step]}</small>}</Link>)}</nav><section className={styles.task}><h2>{closed ? "Repair closed · handoff recorded" : repairWorkflowLabels[selected]}</h2>{!closed && <p>Current task: {repairWorkflowLabels[current]}. Opening a later tool does not bypass its prerequisites.</p>}<button type="button" onClick={() => { if (mayLeave()) { dirty.current = false; router.push(repairReviewHref(repairOrderId)); router.refresh(); } }}>Refresh / continue current task</button></section><div className={styles.tool} data-repair-workflow-tool>{children}</div></main>;
}
