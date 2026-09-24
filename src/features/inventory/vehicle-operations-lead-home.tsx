"use client";

import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Gauge,
  Inbox,
  MapPinned,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";
import type { BoardReadTask } from "@/server/services/board-read";
import type { InventoryHomeData } from "./inventory-console-home";

type Hat = "ADVISOR" | "ALL" | "DETAIL" | "INVENTORY" | "LOT" | "PARTS" | "TECHNICIAN";
type Density = "CALM" | "HIGH_VOLUME";
type WorkItem = {
  action: string;
  dueAt: string;
  hat: Exclude<Hat, "ALL">;
  href: string;
  id: string;
  overdue: boolean;
  reason: string;
  score: number;
  subject: string;
  title: string;
};

const hats: Array<{ id: Hat; label: string }> = [
  { id: "ALL", label: "All work" },
  { id: "ADVISOR", label: "Service Advisor" },
  { id: "INVENTORY", label: "Inventory" },
  { id: "TECHNICIAN", label: "Technician" },
  { id: "LOT", label: "Lot" },
  { id: "PARTS", label: "Parts" },
  { id: "DETAIL", label: "Detail" },
];

function hatForTask(task: BoardReadTask): Exclude<Hat, "ALL"> {
  const text = `${task.title} ${task.description ?? ""} ${task.workflowArea}`.toLocaleLowerCase();
  if (/customer|appointment|advisor|authorization|call|handoff/.test(text)) return "ADVISOR";
  if (/part|pickup|pick up|return|vendor/.test(text)) return "PARTS";
  if (/detail|wash|clean|photo|merchandis/.test(text)) return "DETAIL";
  if (/lot|move|movement|key|transport|park/.test(text)) return "LOT";
  if (/technician|mechanic|repair|diagnos|inspect/.test(text)) return "TECHNICIAN";
  return "INVENTORY";
}

function hatIcon(hat: Exclude<Hat, "ALL">) {
  if (hat === "ADVISOR") return <MessageSquareText />;
  if (hat === "TECHNICIAN") return <Wrench />;
  if (hat === "LOT") return <MapPinned />;
  if (hat === "PARTS") return <Boxes />;
  if (hat === "DETAIL") return <Sparkles />;
  return <CarFront />;
}

function hatLabel(hat: Exclude<Hat, "ALL">) {
  return hats.find((item) => item.id === hat)?.label ?? hat;
}

function date(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function taskScore(task: BoardReadTask, now: number) {
  const priority = task.priority.toLocaleUpperCase();
  const overdue = new Date(task.dueAt).getTime() < now;
  return (overdue ? 500 : 0) + (priority === "URGENT" || priority === "CRITICAL" ? 400 : priority === "HIGH" ? 300 : priority === "MEDIUM" ? 200 : 100);
}

function advisorCompose(kind: ServiceAdvisorWorkspaceModel["actionQueue"][number]["actionKind"]) {
  return ["PARTS_DELAY", "TECHNICIAN_CLARIFICATION", "FOLLOW_UP_SCHEDULED"].includes(kind) ? "team" : "customer";
}

function advisorActionLabel(kind: ServiceAdvisorWorkspaceModel["actionQueue"][number]["actionKind"]) {
  if (kind === "AUTHORIZATION") return "Record decision";
  if (kind === "PROMISE_RISK") return "Protect promise";
  if (kind === "PARTS_DELAY") return "Check ETA";
  if (kind === "HANDOFF") return "Prepare handoff";
  if (kind === "TECHNICIAN_CLARIFICATION") return "Get clarification";
  return "Update customer";
}

export function VehicleOperationsLeadHome({ advisor, data, tasks, userName }: { advisor: ServiceAdvisorWorkspaceModel | null; data: InventoryHomeData; tasks: BoardReadTask[]; userName: string }) {
  const [activeHat, setActiveHat] = useState<Hat>("ALL");
  const [density, setDensity] = useState<Density>("CALM");
  const returnTo = "/vehicles?workspace=vehicle-operations-lead";
  const referenceNow = data.generatedAt ? new Date(data.generatedAt).getTime() : 0;
  const advisorItems: WorkItem[] = (advisor?.actionQueue ?? []).map((item) => ({
    action: advisorActionLabel(item.actionKind),
    dueAt: item.targetAt,
    hat: "ADVISOR",
    href: `/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId: item.id, workspace: "advisor", compose: advisorCompose(item.actionKind), returnTo })}`,
    id: `advisor:${item.id}`,
    overdue: item.overdue,
    reason: item.actionReason,
    score: (item.overdue ? 1000 : 500) + (["AUTHORIZATION", "PROMISE_RISK"].includes(item.actionKind) ? 300 : 100),
    subject: `${item.customerName} · ${item.repairOrderNumber}`,
    title: item.actionLabel,
  }));
  const inventoryItems: WorkItem[] = data.priorityWork.map((item) => ({
    action: item.nextAction,
    dueAt: item.dueAt,
    hat: "INVENTORY",
    href: `/vehicles/control-tower?inventoryUnitId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(returnTo)}`,
    id: `inventory:${item.id}`,
    overdue: item.overdue,
    reason: item.issue,
    score: (item.overdue ? 900 : 400) + (item.tier === "P0" ? 400 : item.tier === "P1" ? 300 : 100),
    subject: `${item.vehicle} · ${item.inventoryNumber}`,
    title: item.state.replaceAll("_", " "),
  }));
  const boardItems: WorkItem[] = tasks.filter((task) => !["DONE", "COMPLETED", "CANCELLED"].includes(task.status.toLocaleUpperCase())).map((task) => ({
    action: task.status === "READY_FOR_REVIEW" ? "Review task" : "Open task",
    dueAt: task.dueAt,
    hat: hatForTask(task),
    href: `/tasks/${encodeURIComponent(task.id)}`,
    id: `task:${task.id}`,
    overdue: referenceNow > 0 && new Date(task.dueAt).getTime() < referenceNow,
    reason: task.blockerReason ?? task.description ?? "Complete the assigned next action.",
    score: taskScore(task, referenceNow),
    subject: task.vehicleReference ?? task.customerReference ?? task.workflowArea.replaceAll("_", " "),
    title: task.title,
  }));
  const allWork = [...advisorItems, ...inventoryItems, ...boardItems].sort((left, right) => right.score - left.score || new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
  const filtered = activeHat === "ALL" ? allWork : allWork.filter((item) => item.hat === activeHat);
  const visible = filtered.slice(0, density === "CALM" ? 7 : 24);
  const dueToday = referenceNow > 0 ? allWork.filter((item) => new Date(item.dueAt).toDateString() === new Date(referenceNow).toDateString()).length : 0;
  const attention = data.totals.blocked + data.totals.overdue + data.totals.waiting;
  const inbox = (advisor?.inbox ?? []).filter((item) => item.needsResponse).slice(0, 4);

  return <section className="personal-operations-home">
    <header className="poh-hero">
      <div><p>Personal Operations Workspace</p><h1>Good morning, {userName}. Execute the next task.</h1><span>Customer commitments, inventory flow, repair support, parts, lot, and detail—one prioritized workday.</span></div>
      <nav aria-label="Personal operations workspace navigation"><Link aria-current="page" href={returnTo}>My Workday</Link><Link href="/vehicles/coo-workbook">Vehicle Operations Lead Workbook</Link><Link href="/vehicles/advisor?inbox=1">Inbox</Link><Link href="/vehicles/advisor">Service Advisor</Link><Link href="/vehicles?workspace=inventory">Inventory Manager</Link><Link href="/vehicles/outside-vendors">Outside Vendors</Link><Link href="/manager-review?scope=inventory">Approvals</Link><Link href="/vehicles/inventory-to-frontline">Frontline</Link><Link href="/vehicles/recon-repair-advisor">Recon / Repair Advisor</Link></nav>
    </header>

    <form action="/vehicles/registry" className="poh-search" role="search"><Search /><label><strong>Find anything</strong><span>Vehicle, VIN, stock number, customer, repair order, or key tag</span><input aria-label="Find vehicle, customer, repair order, or task" name="query" /></label><button type="submit">Search</button></form>

    <div className="poh-controls"><nav aria-label="Work hats">{hats.map((hat) => <button aria-pressed={activeHat === hat.id} key={hat.id} onClick={() => setActiveHat(hat.id)} type="button">{hat.label}<span>{hat.id === "ALL" ? allWork.length : allWork.filter((item) => item.hat === hat.id).length}</span></button>)}</nav><div><span>Density</span><button aria-pressed={density === "CALM"} onClick={() => setDensity("CALM")} type="button">Calm</button><button aria-pressed={density === "HIGH_VOLUME"} onClick={() => setDensity("HIGH_VOLUME")} type="button">High volume</button></div></div>

    <section aria-label="My Workday summary" className="poh-metrics"><article><ClipboardList /><span>My active tasks<strong>{allWork.length}</strong><small>Across authorized hats</small></span></article><article className={advisor?.counts.needsAttention ? "attention" : ""}><MessageSquareText /><span>Customer commitments<strong>{advisor?.counts.needsAttention ?? 0}</strong><small>Advisor action required</small></span></article><article className={attention ? "attention" : ""}><AlertTriangle /><span>Flow blocked<strong>{attention}</strong><small>Inventory intervention</small></span></article><article><Clock3 /><span>Due today<strong>{dueToday}</strong><small>Current workday</small></span></article></section>

    <div className="poh-layout"><main className="poh-queue"><header><span><Gauge /><span><strong>What I should do next</strong><small>Ranked by safety, customer promise, blocked work, deadline, and financial exposure.</small></span></span><b>{visible.length} shown</b></header>{visible.map((item, index) => <article key={item.id}><b>{index + 1}</b><i className={item.hat.toLocaleLowerCase()}>{hatIcon(item.hat)}</i><div><span>{hatLabel(item.hat)}</span><strong>{item.title}</strong><small>{item.subject}</small></div><p>{item.reason}</p><time className={item.overdue ? "overdue" : ""}>{item.overdue ? "Overdue" : date(item.dueAt)}</time><Link href={item.href}><small>Acting as {hatLabel(item.hat)}</small>{item.action}<ArrowRight /></Link></article>)}{!visible.length ? <div className="poh-empty"><CheckCircle2 /> No active work in this hat.</div> : null}</main>

      <aside className="poh-rail"><section><header><strong>Workday brief</strong><small>Fast routes to unblock today</small></header><Link href="/vehicles/coo-workbook"><ClipboardList /><span><strong>Vehicle Operations Lead Workbook</strong><small>Checklist, action plan, and daily report draft</small></span><ArrowRight /></Link><Link href="/vehicles/advisor"><MessageSquareText /><span><strong>{advisor?.counts.needsAttention ?? 0} advisor actions</strong><small>Promises, approvals, and handoffs</small></span><ArrowRight /></Link><Link href="/vehicles/outside-vendors"><Building2 /><span><strong>Outside Vendors</strong><small>Vendor jobs, billing, invoices, and QC accountability</small></span><ArrowRight /></Link><Link href="/vehicles/parts-operations"><Boxes /><span><strong>{data.operational?.parts.waitingDemands ?? 0} parts constraints</strong><small>Pickup, receiving, and ETA</small></span><ArrowRight /></Link><Link href="/vehicles/recon-repair-advisor"><Wrench /><span><strong>{data.operational?.shop.blocked ?? 0} repair blockers</strong><small>Use the prototype advisor workspace</small></span><ArrowRight /></Link><Link href="/vehicles/inventory?stage=PHOTOGRAPHY_MERCHANDISING"><Sparkles /><span><strong>Detail and merchandising</strong><small>Prepare the next frontline unit</small></span><ArrowRight /></Link></section>
        <section className="poh-inbox"><header><strong>Inbox</strong><Link href="/vehicles/advisor?inbox=1">Open all</Link></header>{inbox.map((item) => <Link href={`/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId: item.repairOrderId, workspace: "advisor", compose: item.audience.toLocaleLowerCase() === "team" ? "team" : item.audience.toLocaleLowerCase(), returnTo })}`} key={item.id}><i className={item.audience.toLocaleLowerCase()}><Inbox /></i><span><strong>{item.subject}</strong><small>{item.customerName} · {item.repairOrderNumber}</small><p>{item.preview}</p></span></Link>)}{!inbox.length ? <p><CheckCircle2 /> No communication needs a response.</p> : null}</section>
        <section className="poh-boundary"><ShieldCheck /><span><strong>Role protection stays active</strong><small>The selected task activates its hat. Customer authorization, internal approval, technician evidence, QC, and frontline release remain separately governed.</small></span></section>
      </aside>
    </div>

    <details className="poh-specialists"><summary><span><strong>Open a focused workspace</strong><small>Use specialist views when the task needs deeper context.</small></span><b>Show workspaces</b></summary><div><Link href="/vehicles/coo-workbook"><ClipboardList />Vehicle Operations Lead Workbook</Link><Link href="/vehicles/advisor"><UserRound />Service Advisor</Link><Link href="/vehicles?workspace=inventory"><CarFront />Inventory Manager</Link><Link href="/vehicles/outside-vendors"><Building2 />Outside Vendors</Link><Link href="/my-tasks"><Wrench />Technician / assigned work</Link><Link href="/vehicles/parts-operations"><Boxes />Parts Operations</Link><Link href="/vehicles/workflows/add-vehicle"><MapPinned />Receive and Lot</Link><Link href="/vehicles/inventory?stage=PHOTOGRAPHY_MERCHANDISING"><Sparkles />Detail and merchandising</Link></div></details>
  </section>;
}
