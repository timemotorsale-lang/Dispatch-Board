"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, Building2, Camera, CarFront, Check, CheckCircle2, Circle, ClipboardCheck, Clock3, FileText, LockKeyhole, MapPin, ShieldCheck, UserRound, Wrench } from "lucide-react";
import Link from "next/link";

import { SHOP_RECON_STAGES, type ShopReconStageCode } from "@/server/shop-recon/foundation";
import { getShopReconStageWorkspace, type ShopReconFormField } from "@/server/shop-recon/stage-workspace";

export type ShopReconVehicleCardModel = {
  id: string;
  vehicleId: string | null;
  vin: string | null;
  repairOrderNumber: string;
  workLane: "INVENTORY_RECON" | "CUSTOMER_REPAIR";
  workLaneLabel: string;
  commitmentLabel: string;
  authorizationPath: string;
  completionHandoff: string;
  inventoryLifecycleStage: string | null;
  shopLifecycleStage: ShopReconStageCode;
  shopLifecycleLabel: string;
  shopLifecycleOrder: number;
  shopZoneCode: string;
  stageTargetBand: string;
  stageElapsedMinutes: number;
  priorityScore: number;
  priorityBand: string;
  priorityReasons: ReadonlyArray<{ code: string; points: number }>;
  operatingState: string;
  targetAt: string;
  nextAction: string;
  blocker: string | null;
  owner: string;
  location: string;
  vehicle: string;
  subject: string;
  concern: string;
  technician: string | null;
  bay: string | null;
  waitingParts: boolean;
  approvalPending: boolean;
  qcPending: number;
};

const words = (value: string | null) => value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) : "Not applicable";
const date = (value: string) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function ShopReconVehicleCard({ item, returnTo = "/vehicles/shop-recon" }: { item: ShopReconVehicleCardModel; returnTo?: string }) {
  const [selectedStage, setSelectedStage] = useState<ShopReconStageCode>(item.shopLifecycleStage);
  const selectedDefinition = SHOP_RECON_STAGES.find(stage => stage.code === selectedStage)!;
  const workspace = getShopReconStageWorkspace(selectedStage);
  const laneClass = item.workLane === "INVENTORY_RECON" ? "inventory" : "customer";
  const overallLifecycle = item.workLane === "INVENTORY_RECON" ? words(item.inventoryLifecycleStage ?? "RECONDITIONING") : "Customer Repair";

  return <section className={`srv-card lane-${laneClass}`} aria-label={`Unified vehicle card for ${item.vehicle}`}>
    <header className="srv-card-header">
      <Link href={returnTo}><ArrowLeft /> Shop &amp; Recon</Link>
      <div className="srv-card-identity">
        <span><CarFront /></span>
        <div>
          <small><LaneIcon lane={item.workLane} /> {item.workLaneLabel}</small>
          <h1>{item.vehicle}</h1>
          <p>{item.vin ?? "VIN unavailable"} · {item.repairOrderNumber} · {item.subject}</p>
        </div>
      </div>
      <div className="srv-card-now">
        <small>Do This Now · Stage {item.shopLifecycleOrder} of 16</small>
        <strong>{item.nextAction}</strong>
        <span>{item.shopLifecycleLabel} · {item.shopZoneCode}</span>
      </div>
      <div className="srv-card-status">
        <small><i /> Viewing Stage {selectedDefinition.order} of 16</small>
        <strong>{selectedDefinition.label}</strong>
        <span>{selectedStage === item.shopLifecycleStage ? "Current operational stage" : "Preview selection only"}</span>
      </div>
    </header>

    <section className="srv-context-strip" aria-label="Vehicle lifecycle context">
      <p><span>Overall lifecycle</span><strong>{overallLifecycle}</strong></p>
      <p><span>Shop stage</span><strong>{item.shopLifecycleOrder}. {item.shopLifecycleLabel}</strong></p>
      <p><span>Operating state</span><strong>{words(item.operatingState)}</strong></p>
      <p><span>Physical zone</span><strong>{item.shopZoneCode}</strong></p>
      <p><span>Owner</span><strong>{item.owner}</strong></p>
      <p><span>{item.commitmentLabel}</span><strong>{date(item.targetAt)}</strong></p>
    </section>

    <div className="srv-design-notice"><ShieldCheck /><span><strong>Visual design preview</strong> Review all sixteen workspaces below. Forms and stage-advance controls are intentionally disabled; no operational record will be changed.</span></div>

    <section className="srv-stage-control" aria-label="Shop stage selector">
      <div><span><i /> Current Shop Stage</span><strong>{item.shopLifecycleOrder}. {item.shopLifecycleLabel}</strong><small>Select a stage below to review its workspace. Selecting does not move the operational vehicle.</small></div>
      <b>{item.priorityBand} · {item.priorityScore}<small>{words(item.stageTargetBand)} · {item.stageElapsedMinutes} staffed min</small></b>
    </section>

    <nav className="srv-stage-nav" aria-label="Sixteen Shop and Recon stages">
      {SHOP_RECON_STAGES.map(stage => {
        const state = stage.order < item.shopLifecycleOrder ? "complete" : stage.order === item.shopLifecycleOrder ? "current" : "upcoming";
        return <button aria-current={selectedStage === stage.code ? "step" : undefined} className={`${state} ${selectedStage === stage.code ? "selected" : ""}`} key={stage.code} onClick={() => setSelectedStage(stage.code)} type="button">
          <i>{selectedStage === stage.code ? <em /> : state === "complete" ? <Check /> : stage.order}</i>
          <span>{stage.label}<small>{state === "current" ? "Current work" : state === "complete" ? "Prior stage" : "Upcoming"}</small></span>
        </button>;
      })}
    </nav>

    <main className="srv-workspace">
      <section className="srv-workspace-main">
        <header>
          <span>Stage {selectedDefinition.order}</span>
          <div><small>{selectedStage === item.shopLifecycleStage ? "Current operational workspace" : "Workspace design preview"}</small><h2>{selectedDefinition.label}</h2><p>{workspace.purpose}</p></div>
          <b>{selectedStage === item.shopLifecycleStage ? "CURRENT" : selectedDefinition.order < item.shopLifecycleOrder ? "HISTORY" : "UPCOMING"}</b>
        </header>

        <div className="srv-work-grid">
          <section className="srv-checklist">
            <header><ClipboardCheck /><div><h3>Stage Checklist</h3><p>Required before the card can advance.</p></div><span>0 / {workspace.checklist.length}</span></header>
            {workspace.checklist.map((item, index) => <label key={item}><input disabled type="checkbox" /><i><Circle /></i><span><strong>{item}</strong><small>Required gate {index + 1}</small></span></label>)}
          </section>

          <section className="srv-form-preview">
            <header><FileText /><div><h3>{workspace.formTitle}</h3><p>Stage-specific operational form preview.</p></div><span>Draft</span></header>
            <div>{workspace.fields.map(field => <PreviewField field={field} key={field.key} />)}</div>
          </section>
        </div>

        <section className="srv-evidence">
          <header><Camera /><div><h3>Required Evidence</h3><p>Evidence remains attached to this vehicle card and stage history.</p></div></header>
          <div>{workspace.evidence.map(item => <p key={item}><span><Camera /></span><strong>{item}</strong><small>Not attached in design preview</small><button disabled type="button">Attach</button></p>)}</div>
        </section>
      </section>

      <aside className="srv-workspace-rail">
        <section className="srv-current-context"><h2>Current Vehicle Context</h2><Fact icon={MapPin} label="Location" value={item.location} /><Fact icon={UserRound} label="Accountable owner" value={item.owner} /><Fact icon={Wrench} label="Technician / bay" value={[item.technician, item.bay].filter(Boolean).join(" · ") || "Not assigned"} /><Fact icon={Clock3} label={item.commitmentLabel} value={date(item.targetAt)} /></section>
        <section><h2>Decision Authority</h2><p className="srv-authority"><LockKeyhole />{workspace.authority}</p><small>{item.authorizationPath}</small></section>
        <section><h2>Constraint &amp; Priority</h2>{item.blocker ? <p className="srv-blocker"><AlertTriangle />{item.blocker}</p> : <p className="srv-clear"><CheckCircle2 />No controlling blocker recorded.</p>}<dl><div><dt>Priority</dt><dd>{item.priorityBand} · {item.priorityScore}</dd></div><div><dt>Timing</dt><dd>{words(item.stageTargetBand)}</dd></div><div><dt>Parts</dt><dd>{item.waitingParts ? "Constrained" : "No constraint"}</dd></div></dl></section>
        <section><h2>Completion Path</h2><p>{item.completionHandoff}</p><small>The same card and history continue through handoff.</small></section>
        <section className="srv-preview-actions"><button disabled type="button">Save stage draft</button><button disabled type="button">Complete stage &amp; advance</button><small>Controls activate only after workflow behavior is approved and implemented.</small></section>
      </aside>
    </main>
  </section>;
}

function LaneIcon({ lane }: { lane: ShopReconVehicleCardModel["workLane"] }) { return lane === "INVENTORY_RECON" ? <Building2 /> : <UserRound />; }
function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) { return <p className="srv-fact"><Icon /><span>{label}<strong>{value}</strong></span></p>; }
function PreviewField({ field }: { field: ShopReconFormField }) {
  if (field.type === "textarea") return <label className="wide"><span>{field.label}</span><textarea disabled placeholder={field.placeholder ?? "Stage notes"} /></label>;
  if (field.type === "select") return <label><span>{field.label}</span><select disabled defaultValue=""><option value="">Select…</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "checkbox") return <label className="checkbox"><input disabled type="checkbox" /><span>{field.label}</span></label>;
  return <label><span>{field.label}</span><input disabled placeholder={field.placeholder} type={field.type} /></label>;
}
