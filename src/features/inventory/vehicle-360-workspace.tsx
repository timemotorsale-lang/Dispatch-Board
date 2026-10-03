"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Camera,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  FileText,
  Gauge,
  History,
  Link2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import type { VehicleDecode } from "@/server/vehicle-identification/nhtsa";
import type { NhtsaSafetyIntelligence } from "@/server/vehicle-identification/nhtsa-safety";

import styles from "./vehicle-360-workspace.module.css";

type RecordItem = Record<string, unknown>;
type TimelineItem = { id: string; occurredAt: string; source: string; type: string; title: string; detail: string | null; subjectType: string; subjectId: string };
type GraphNode = { id: string; type: string; label: string; href: string | null; status: string | null };
type GraphEdge = { id: string; from: string; to: string; type: string; label: string };
type EvidenceItem = { id: string; category: string; relationship: string; subjectType: string; subjectId: string; createdAt: string; evidenceObjectId: string; downloadUrl: string | null; evidenceObject: { id: string; fileName: string; contentType: string; byteSize: number; checksumSha256: string; malwareStatus: string; accessLevel: string; retentionUntil: string; legalHold: boolean; status: string; version: number; createdAt: string; uploadedByUser: { id: string; name: string } } };
type SpecificationView = { available: boolean; addMode: string | null; canonical: RecordItem; canonicalOrigins: RecordItem; decodedAt: string | null; fieldOrigins: RecordItem; mappingVersion: number | null; provider: string | null; specifications: RecordItem; warnings: string[] };
export type Vehicle360View = {
  summary: { vehicle: { id: string; vehicleNumber: string; vin: string | null; vinState: string; stockNumber: string | null; year: number | null; make: string | null; model: string | null; color: string | null; licensePlate: string | null; licensePlateState: string | null; status: string; version: number }; owner: RecordItem | null; location: { id: string; name: string } | null; stage: string; operatingState: string; nextAction: string | null; targetAt: string | null; latestOdometer: RecordItem | null; risks: string[] };
  timeline: TimelineItem[];
  tabAccess: Record<string, boolean>;
  tabs: { overview: { vehicle: RecordItem }; specifications: SpecificationView; inventory: { allowed: boolean; items: RecordItem[] }; service: { allowed: boolean; repairOrders: RecordItem[] }; parts: { allowed: boolean; demands: RecordItem[]; custody: RecordItem[] }; appointments: { allowed: boolean; items: RecordItem[] }; documents: { allowed: boolean; items: EvidenceItem[] }; warranty: { allowed: boolean; items: RecordItem[] }; communications: { allowed: boolean; items: RecordItem[] }; costs: { allowed: boolean; items: RecordItem[] }; decisions: { allowed: boolean; items: RecordItem[] }; audit: { allowed: boolean; items: RecordItem[] } };
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
};

const sections = ["overview", "photos", "identity", "work", "safety", "evidence"] as const;
type Section = (typeof sections)[number];

const walkaroundAngles = [
  { code: "front", label: "Front", hint: "Front bumper, grille, hood, and windshield." },
  { code: "front_left", label: "Front left", hint: "Driver front corner, wheel, fender, and headlamp." },
  { code: "driver_side", label: "Driver side", hint: "Full left side profile with doors and rocker panels." },
  { code: "rear_left", label: "Rear left", hint: "Driver rear corner, quarter panel, and tail lamp." },
  { code: "rear", label: "Rear", hint: "Rear bumper, trunk or hatch, plate area, and glass." },
  { code: "rear_right", label: "Rear right", hint: "Passenger rear corner, quarter panel, and tail lamp." },
  { code: "passenger_side", label: "Passenger side", hint: "Full right side profile with doors and rocker panels." },
  { code: "front_right", label: "Front right", hint: "Passenger front corner, wheel, fender, and headlamp." },
  { code: "interior_dash", label: "Interior / dash", hint: "Dash, controls, warning lights, and cabin condition." },
  { code: "odometer", label: "Odometer", hint: "Mileage reading and cluster warning lights." },
  { code: "damage_closeup", label: "Damage close-up", hint: "Known scratches, dents, broken trim, or issue evidence." },
] as const;
type WalkaroundAngleCode = (typeof walkaroundAngles)[number]["code"];
const requiredWalkaroundAngles = walkaroundAngles.filter(angle => angle.code !== "damage_closeup");

const specificationGroups = [
  { title: "Identity and configuration", fields: ["trim", "series", "bodyClass", "vehicleType", "doors", "cabType"] },
  { title: "Powertrain and energy", fields: ["engineConfiguration", "engineCylinders", "displacementLiters", "transmissionStyle", "driveType", "fuelTypePrimary", "fuelTypeSecondary"] },
  { title: "Capacity and manufacturing", fields: ["gvwr", "manufacturer", "plantCountry"] },
  { title: "Intake observations", fields: ["runningStatus", "drivableStatus", "arrivalMethod", "keyCount", "warningLights", "existingDamage", "detailedNotes"] },
] as const;

const dash = "—";
const money = (value: unknown) => typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100) : dash;
const dateTime = (value: unknown) => typeof value === "string" && value ? new Date(value).toLocaleString() : dash;
const sentence = (entry: unknown) => String(entry ?? dash).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const rawLabel = (entry: unknown) => String(entry ?? dash).replaceAll("_", " ");
function nested(item: RecordItem, key: string) { const result = item[key]; return result && typeof result === "object" && !Array.isArray(result) ? result as RecordItem : {}; }
function present(value: unknown) { return value != null && value !== "" && (!Array.isArray(value) || value.length > 0); }
function sourceLabel(value: unknown) { const origin = nested({ origin: value }, "origin"); const source = String(origin.source ?? ""); if (source === "NHTSA_VPIC") return "NHTSA vPIC · manufacturer-submitted VIN data"; if (source === "STAFF_OBSERVED") return "Staff observation"; if (source === "STAFF_CONFIRMED") return "Staff confirmation"; if (source === "DOCUMENTED_NON_VIN_EXCEPTION") return "Documented non-VIN exception"; return source ? sentence(source) : "Source not recorded"; }
function recordTitle(item: RecordItem) { return sentence(item.repairOrderNumber ?? item.inventoryNumber ?? item.title ?? item.type ?? item.eventType ?? item.id); }
function ownerName(owner: RecordItem | null) { return owner ? String(owner.name ?? owner.displayName ?? owner.customerNumber ?? owner.id ?? "Assigned") : "Not assigned"; }
function withReturn(path: string, returnTo: string) { const url = new URL(path, "http://vehicle360.local"); if (returnTo) url.searchParams.set("returnTo", returnTo); return `${url.pathname}${url.search}`; }
function validReturnTo(value: string | null) { return value?.startsWith("/") && !value.startsWith("//") ? value : ""; }
function relationship(view: Vehicle360View) { if (view.tabs.inventory.items.length) return "Dealership inventory"; if (view.summary.owner && (view.summary.owner.displayName || view.summary.owner.customerNumber)) return "Customer vehicle"; return "Ownership unconfirmed"; }
function sourceIcon(source: string) { if (source === "SERVICE") return Wrench; if (source === "EVIDENCE") return FileText; if (source === "APPOINTMENT") return CalendarClock; if (source === "INVENTORY") return ClipboardCheck; return History; }
function normalizeEvidenceText(item: EvidenceItem) { return `${item.evidenceObject.fileName} ${item.category} ${item.relationship} ${item.subjectType} ${item.subjectId}`.toLowerCase().replaceAll(/[_-]+/g, " "); }
function inferWalkaroundAngle(item: EvidenceItem): WalkaroundAngleCode | null {
  const text = normalizeEvidenceText(item);
  if (text.includes("odometer") || text.includes("mileage") || text.includes("cluster")) return "odometer";
  if (text.includes("interior") || text.includes("dash") || text.includes("cabin")) return "interior_dash";
  if (text.includes("damage") || text.includes("dent") || text.includes("scratch") || text.includes("close up") || text.includes("closeup")) return "damage_closeup";
  if (text.includes("front left") || text.includes("driver front")) return "front_left";
  if (text.includes("front right") || text.includes("passenger front")) return "front_right";
  if (text.includes("rear left") || text.includes("driver rear")) return "rear_left";
  if (text.includes("rear right") || text.includes("passenger rear")) return "rear_right";
  if (text.includes("driver side") || text.includes("left side")) return "driver_side";
  if (text.includes("passenger side") || text.includes("right side")) return "passenger_side";
  if (text.includes("rear") || text.includes("back")) return "rear";
  if (text.includes("front")) return "front";
  return null;
}
function walkaroundPhotoItems(items: EvidenceItem[]) {
  return items.filter(item => item.category === "PHOTO" && item.evidenceObject.status === "AVAILABLE" && item.evidenceObject.contentType.toLowerCase().startsWith("image/"));
}
function walkaroundCoverage(items: EvidenceItem[]) {
  const photos = walkaroundPhotoItems(items);
  const byAngle = new Map<WalkaroundAngleCode, EvidenceItem>();
  for (const item of photos) {
    const angle = inferWalkaroundAngle(item);
    if (angle && !byAngle.has(angle)) byAngle.set(angle, item);
  }
  return { photos, byAngle, capturedRequired: requiredWalkaroundAngles.filter(angle => byAngle.has(angle.code)).length, missingRequired: requiredWalkaroundAngles.filter(angle => !byAngle.has(angle.code)) };
}
function itemText(item: RecordItem) { return Object.values(item).filter(value => ["string", "number", "boolean"].includes(typeof value)).join(" ").toLowerCase(); }
function matchingRecords(items: RecordItem[], pattern: RegExp) { return items.filter(item => pattern.test(itemText(item))); }

function AccessEmpty({ allowed, labelText }: { allowed: boolean; labelText: string }) {
  return <div className={styles.empty}><AlertTriangle /><div><strong>{allowed ? `No ${labelText.toLowerCase()} records` : `${labelText} restricted`}</strong><p>{allowed ? "Nothing is connected to this canonical vehicle yet." : `Your current role does not include access to ${labelText.toLowerCase()}.`}</p></div></div>;
}

function OperationalBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "attention" | "good" | "neutral" }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

function SpecificationFacts({ fields, view }: { fields: readonly string[]; view: SpecificationView }) {
  const visible = fields.filter(field => present(view.specifications[field]));
  if (!visible.length) return <AccessEmpty allowed labelText="Specification details" />;
  return <dl className={styles.factList}>{visible.map(field => <div key={field}><dt>{sentence(field)}</dt><dd>{rawLabel(view.specifications[field])}</dd><small>{sourceLabel(view.fieldOrigins[field])}</small></div>)}</dl>;
}

function GenericCards({ items, kind }: { items: RecordItem[]; kind: string }) {
  if (!items.length) return <AccessEmpty allowed labelText={kind} />;
  return <div className={styles.recordGrid}>{items.map((item, index) => <article className={styles.recordCard} key={String(item.id ?? index)}><small>{kind}</small><h3>{recordTitle(item)}</h3><dl>{Object.entries(item).filter(([key, entry]) => !["id", "organizationId", "content", "metadata", "priorValue", "newValue"].includes(key) && ["string", "number", "boolean"].includes(typeof entry)).slice(0, 6).map(([key, entry]) => <div key={key}><dt>{sentence(key)}</dt><dd>{key.toLowerCase().includes("at") && typeof entry === "string" ? dateTime(entry) : rawLabel(entry)}</dd></div>)}</dl></article>)}</div>;
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <header className={styles.sectionHeading}><div><small>{eyebrow}</small><h2>{title}</h2>{detail ? <p>{detail}</p> : null}</div>{action}</header>;
}

function VehicleSpecifications({ view }: { view: SpecificationView }) {
  const canonicalFields = ["vin", "year", "make", "model", "color", "licensePlate", "licensePlateState"].filter(field => present(view.canonical[field]));
  return <div className={styles.sectionStack}>
    <section className={styles.panel}><SectionHeading eyebrow="Canonical vehicle data" title="Specifications and source history" detail="Canonical identity and decoded specifications remain attributable to their original source." action={<div className={styles.badgeRow}>{view.provider ? <OperationalBadge tone="good">{sourceLabel({ source: view.provider })}</OperationalBadge> : null}{view.decodedAt ? <OperationalBadge>Decoded {dateTime(view.decodedAt)}</OperationalBadge> : null}</div>} />{view.warnings.map(warning => <div className={styles.warning} key={warning}><AlertTriangle /><p>{warning}</p></div>)}<div className={styles.specificationGrid}>{specificationGroups.map(group => <article key={group.title}><h3>{group.title}</h3><SpecificationFacts fields={group.fields} view={view} /></article>)}</div></section>
    <section className={styles.panel}><SectionHeading eyebrow="Canonical origins" title="Identity provenance" detail="Every identity value shows the authority and time used when it became canonical." /><dl className={styles.originGrid}>{canonicalFields.map(field => { const origin = nested({ origin: view.canonicalOrigins[field] }, "origin"); return <div key={field}><dt>{sentence(field)}</dt><dd>{rawLabel(view.canonical[field])}</dd><small>{sourceLabel(origin)}{origin.confirmedAt ? ` · ${dateTime(origin.confirmedAt)}` : ""}</small></div>; })}</dl>{!view.available ? <div className={styles.warning}><AlertTriangle /><p>This legacy vehicle does not yet have a detailed specification snapshot. Its canonical identity remains available.</p></div> : null}</section>
  </div>;
}

function SafetyIntelligence({ intelligence, loading, error, onRefresh, vehicle }: { intelligence: NhtsaSafetyIntelligence | null; loading: boolean; error: string; onRefresh: () => void; vehicle: Vehicle360View["summary"]["vehicle"] }) {
  const discovery = (intent: string) => `/vehicles/discovery?intent=${intent}&vehicleId=${encodeURIComponent(vehicle.id)}`;
  return <div className={styles.sectionStack}>
    <section className={styles.panel}><SectionHeading eyebrow="Safety intelligence" title="Recall campaigns and safety signals" detail="Model-level results guide review. They never become open VIN-specific recalls without verification." action={<button className={styles.secondaryButton} disabled={loading} onClick={onRefresh} type="button"><RefreshCw />{loading ? "Checking NHTSA…" : "Refresh source"}</button>} />
      <div className={styles.safetyBoundary}><ShieldCheck /><div><strong>VIN-specific verification remains required</strong><p>Campaigns below are potentially applicable model-level results—not confirmation of an unrepaired recall for this VIN.</p></div><a href="https://www.nhtsa.gov/recalls" rel="noreferrer" target="_blank">Verify VIN with NHTSA</a></div>
      {error ? <div className={styles.warning}><AlertTriangle /><p>{error}</p></div> : null}
      {!intelligence && !error ? <div className={styles.loading}><RefreshCw /><p>{loading ? "Retrieving NHTSA model-level campaigns and complaint background…" : "Safety intelligence is ready to be checked."}</p></div> : null}
      {intelligence ? <div className={styles.safetyGrid}>
        <div><h3>Model-level recall campaigns</h3>{intelligence.recalls.length ? intelligence.recalls.map(recall => <article className={styles.recallCard} key={recall.campaignNumber}><header><OperationalBadge tone="attention">{recall.verificationLabel}</OperationalBadge><small>Campaign {recall.campaignNumber}</small></header><h4>{recall.component}</h4><p>{recall.summary}</p>{recall.parkIt || recall.parkOutside ? <strong className={styles.parkWarning}>{recall.parkIt ? "Park-it guidance reported" : "Park-outside guidance reported"}</strong> : null}<details><summary>Consequence and remedy</summary><p>{recall.consequence ?? "Consequence not reported."}</p><p>{recall.remedy ?? "Remedy not reported."}</p></details></article>) : <AccessEmpty allowed labelText="Model-level campaigns" />}</div>
        <aside><h3>Diagnostic context</h3><div className={styles.intelligenceNote}><FileSearch /><div><strong>{intelligence.manufacturerCommunications.label}</strong><p>{intelligence.manufacturerCommunications.message}</p><Link href={discovery("service-bulletins")}>Open bulletin review</Link></div></div><div className={styles.intelligenceNote}><History /><div><strong>Complaint patterns</strong><p>{intelligence.sourcePolicy.complaints}</p><span>{intelligence.complaints.length} background pattern{intelligence.complaints.length === 1 ? "" : "s"}</span></div></div>{intelligence.warnings.map(warning => <div className={styles.warning} key={warning}><AlertTriangle /><p>{warning}</p></div>)}</aside>
      </div> : null}
    </section>
  </div>;
}

export function Vehicle360Workspace({ initial }: { initial: Vehicle360View }) {
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const returnTo = validReturnTo(searchParams.get("returnTo"));
  const initialSection: Section = requestedSection === "documents" ? "evidence" : requestedSection === "walkaround" || requestedSection === "photo" ? "photos" : requestedSection === "intelligence" ? "safety" : sections.includes(requestedSection as Section) ? requestedSection as Section : "overview";
  const [view, setView] = useState(initial);
  const [active, setActive] = useState<Section>(initialSection);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState(() => searchParams.get("category") || "PHOTO");
  const [accessLevel, setAccessLevel] = useState("INTERNAL");
  const [retention, setRetention] = useState(() => { const next = new Date(); next.setUTCFullYear(next.getUTCFullYear() + 3); return next.toISOString().slice(0, 10); });
  const [safety, setSafety] = useState<NhtsaSafetyIntelligence | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState("");
  const [liveDecode, setLiveDecode] = useState<VehicleDecode | null>(null);
  const [liveDecodeAt, setLiveDecodeAt] = useState<string | null>(null);
  const [decodeLoading, setDecodeLoading] = useState(false);
  const [decodeError, setDecodeError] = useState("");
  const vehicle = view.summary.vehicle;
  const specifications = liveDecode ?? view.tabs.specifications.specifications;
  const specificationView = useMemo<SpecificationView>(() => liveDecode ? {
    ...view.tabs.specifications,
    available: true,
    decodedAt: liveDecodeAt,
    provider: "NHTSA_VPIC",
    specifications: liveDecode as unknown as RecordItem,
    fieldOrigins: Object.fromEntries(Object.keys(liveDecode).map(key => [key, { source: "NHTSA_VPIC" }])),
    warnings: ["Displayed from a live NHTSA VIN refresh. The canonical specification snapshot has not yet been reconciled."],
  } : view.tabs.specifications, [liveDecode, liveDecodeAt, view.tabs.specifications]);
  const nodes = useMemo(() => new Map(view.graph.nodes.map(node => [node.id, node])), [view.graph.nodes]);
  const identityName = [specifications.modelYear ?? vehicle.year, specifications.make ?? vehicle.make, specifications.model ?? vehicle.model, specifications.trim].filter(Boolean).join(" ") || vehicle.vehicleNumber;
  const mileage = view.summary.latestOdometer ? view.summary.latestOdometer.reading : null;
  const missingCanonical = [["Plate", vehicle.licensePlate], ["Color", vehicle.color], ["Year", vehicle.year], ["Make", vehicle.make], ["Model", vehicle.model]].filter(([, value]) => !present(value));
  const primaryHref = returnTo || (view.tabs.inventory.items.length ? `/vehicles/${vehicle.id}/inventory-planning` : `/vehicles/${vehicle.id}/workbench`);
  const vehicle360Return = withReturn(`/vehicles/360/${vehicle.id}`, returnTo);
  const primaryLabel = returnTo ? "Return to current workflow" : view.summary.nextAction ? "Continue current work" : "Open vehicle workbench";

  async function request(url: string, init?: RequestInit) { const response = await fetch(url, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? "Vehicle 360 request failed."); return body; }
  async function refresh() { setView(await request(`/api/vehicles/${vehicle.id}/360`) as Vehicle360View); }
  function base64(selected: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Unable to read the selected file.")); reader.onload = () => { const result = String(reader.result ?? ""), comma = result.indexOf(","); resolve(comma >= 0 ? result.slice(comma + 1) : result); }; reader.readAsDataURL(selected); }); }
  async function upload(event: FormEvent) { event.preventDefault(); if (!file) return; setBusy(true); setNotice(""); try { const result = await request("/api/vehicle-evidence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vehicleId: vehicle.id, fileName: file.name, contentType: file.type || "application/octet-stream", contentBase64: await base64(file), category, accessLevel, retentionUntil: new Date(`${retention}T23:59:59.999Z`).toISOString(), subjectType: "VEHICLE", subjectId: vehicle.id, relationship: "SUPPORTS", idempotencyKey: crypto.randomUUID(), reason: "Attach governed operational evidence to Vehicle 360." }) }); setNotice(result.evidence?.status === "QUARANTINED" ? "The file was stored in quarantine and is not available for download." : "Evidence uploaded, verified, and linked to Vehicle 360."); setFile(null); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Evidence upload failed."); } finally { setBusy(false); } }
  async function govern(item: EvidenceItem, changes: Record<string, unknown>, reason: string) { setBusy(true); try { await request(`/api/vehicle-evidence/${item.evidenceObjectId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: item.evidenceObject.version, idempotencyKey: crypto.randomUUID(), reason, ...changes }) }); setNotice("Evidence governance updated with an audit record."); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Evidence governance update failed."); } finally { setBusy(false); } }
  const safetyYear = Number(specifications.modelYear ?? vehicle.year);
  const safetyMake = String(specifications.make ?? vehicle.make ?? "").trim();
  const safetyModel = String(specifications.model ?? vehicle.model ?? "").trim();
  const loadSafety = useCallback(async () => { if (!safetyYear || !safetyMake || !safetyModel) { setSafety(null); setSafetyError("Year, make, and model are required before NHTSA safety intelligence can be checked."); return; } setSafetyLoading(true); setSafetyError(""); try { const response = await fetch("/api/service-intake/safety-intelligence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ concern: "", make: safetyMake, model: safetyModel, year: safetyYear }) }); const body = await response.json().catch(() => ({})) as { error?: string; safetyIntelligence?: NhtsaSafetyIntelligence }; if (!response.ok || !body.safetyIntelligence) throw new Error(body.error ?? "Vehicle safety intelligence is unavailable."); setSafety(body.safetyIntelligence); } catch (error) { setSafety(null); setSafetyError(error instanceof Error ? error.message : "Vehicle safety intelligence is unavailable."); } finally { setSafetyLoading(false); } }, [safetyMake, safetyModel, safetyYear]);

  useEffect(() => {
    if (view.tabs.specifications.available || !vehicle.vin) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDecodeLoading(true);
      setDecodeError("");
      try {
        const response = await fetch("/api/inventory-console/workflows/add-vehicle/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lookupType: "VIN", vin: vehicle.vin }), signal: controller.signal });
        const body = await response.json().catch(() => ({})) as { error?: string; decode?: { decoded?: VehicleDecode; provider?: string; retrievedAt?: string } };
        if (!response.ok || !body.decode?.decoded) throw new Error(body.error ?? "Decoded vehicle information is unavailable.");
        setLiveDecode(body.decode.decoded);
        setLiveDecodeAt(body.decode.retrievedAt ?? new Date().toISOString());
      } catch (error) {
        if (!controller.signal.aborted) setDecodeError(error instanceof Error ? error.message : "Decoded vehicle information is unavailable.");
      } finally {
        if (!controller.signal.aborted) setDecodeLoading(false);
      }
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [vehicle.vin, view.tabs.specifications.available]);

  useEffect(() => { const timer = window.setTimeout(() => void loadSafety(), 0); return () => window.clearTimeout(timer); }, [loadSafety]);

  return <section className={styles.workspace} aria-label={`Vehicle 360 for ${identityName}`}>
    <header className={styles.hero}>
      <div className={styles.breadcrumb}><Link href="/vehicles/registry">Vehicle registry</Link><span>/</span><span>Vehicle 360</span><span>/</span><strong>{vehicle.vehicleNumber}</strong></div>
      <div className={styles.identityRow}>
        <div className={styles.vehicleIcon}><CarFront /></div>
        <div className={styles.identityCopy}><small>Canonical vehicle command center</small><h1>{identityName}</h1><p>VIN {vehicle.vin ?? vehicle.vinState} · Stock {vehicle.stockNumber ?? "not recorded"} · Plate {vehicle.licensePlate ?? "not recorded"} · {typeof mileage === "number" ? `${mileage.toLocaleString()} mi` : "Mileage not recorded"}</p><div className={styles.badgeRow}><OperationalBadge tone={vehicle.vinState === "VERIFIED" ? "good" : "attention"}><BadgeCheck />VIN {sentence(vehicle.vinState)}</OperationalBadge><OperationalBadge>{relationship(view)}</OperationalBadge>{view.summary.risks.length ? <OperationalBadge tone="attention"><AlertTriangle />{view.summary.risks.length} operational signal{view.summary.risks.length === 1 ? "" : "s"}</OperationalBadge> : <OperationalBadge tone="good"><CheckCircle2 />No active operating risks</OperationalBadge>}</div></div>
        <div className={styles.heroActions}><button className={styles.secondaryButton} onClick={() => setActive("photos")} type="button"><Camera />360 photos</button><button className={styles.secondaryButton} onClick={() => setActive("evidence")} type="button"><FileText />Add evidence</button><Link className={styles.secondaryButton} href={withReturn(`/vehicles/repair-workbench?vehicleId=${encodeURIComponent(vehicle.id)}`, vehicle360Return)}><Wrench />Start repair order</Link><Link className={styles.primaryButton} href={primaryHref}>{primaryLabel}<ArrowRight /></Link></div>
      </div>
      <nav className={styles.tabs} aria-label="Vehicle 360 sections">{sections.map(section => <button aria-current={active === section ? "page" : undefined} className={active === section ? styles.activeTab : ""} key={section} onClick={() => setActive(section)} type="button">{section === "photos" ? "360 Photos" : section === "identity" ? "Identity & specifications" : section === "work" ? "Work & service history" : section === "safety" ? "Safety intelligence" : section === "evidence" ? "Evidence & documents" : "Overview"}</button>)}</nav>
    </header>

    {notice ? <div className={notice.toLowerCase().includes("failed") || notice.toLowerCase().includes("quarantine") || notice.toLowerCase().includes("required") ? styles.warning : styles.success}><ShieldCheck /><p>{notice}</p></div> : null}

    {decodeError ? <div className={styles.warning}><AlertTriangle /><p>{decodeError}</p></div> : null}
    {active === "evidence" && view.tabs.documents.allowed ? <Link className={styles.secondaryButton} href={`/sales-documents?q=${encodeURIComponent(vehicle.vin || vehicle.stockNumber || identityName)}`}><FileText />Saved sales packets</Link> : null}
    {active === "overview" ? <Overview view={view} specifications={specifications} specificationAvailable={specificationView.available} specificationStatus={decodeLoading ? "Retrieving live NHTSA decode" : liveDecode ? "Live NHTSA refresh" : view.tabs.specifications.available ? "Canonical snapshot" : "Missing"} safety={safety} safetyError={safetyError} safetyLoading={safetyLoading} nodes={nodes} missingCanonical={missingCanonical.map(([name]) => String(name))} onOpenEvidence={() => setActive("evidence")} onOpenIdentity={() => setActive("identity")} onOpenPhotos={() => setActive("photos")} onOpenSafety={() => setActive("safety")} onOpenWork={() => setActive("work")} primaryHref={primaryHref} vehicle360Return={vehicle360Return} /> : null}
    {active === "photos" ? <PhotoWalkaround allowed={view.tabs.documents.allowed} items={view.tabs.documents.items} vehicle={vehicle} onAddPhoto={() => { setCategory("PHOTO"); setActive("evidence"); setNotice("Choose a vehicle photo file, label the angle in the file name, then store it as governed evidence."); }} /> : null}
    {active === "identity" ? <VehicleSpecifications view={specificationView} /> : null}
    {active === "work" ? <WorkHistory view={view} /> : null}
    {active === "safety" ? <SafetyIntelligence intelligence={safety} loading={safetyLoading} error={safetyError} onRefresh={() => void loadSafety()} vehicle={vehicle} /> : null}
    {active === "evidence" ? <EvidenceWorkspace accessLevel={accessLevel} busy={busy} category={category} file={file} items={view.tabs.documents.items} allowed={view.tabs.documents.allowed} retention={retention} onAccessLevel={setAccessLevel} onCategory={setCategory} onFile={setFile} onGovern={govern} onRetention={setRetention} onUpload={upload} /> : null}
  </section>;
}

function Overview({ view, specifications, specificationAvailable, specificationStatus, safety, safetyError, safetyLoading, nodes, missingCanonical, onOpenEvidence, onOpenIdentity, onOpenPhotos, onOpenSafety, onOpenWork, primaryHref, vehicle360Return }: { view: Vehicle360View; specifications: RecordItem; specificationAvailable: boolean; specificationStatus: string; safety: NhtsaSafetyIntelligence | null; safetyError: string; safetyLoading: boolean; nodes: Map<string, GraphNode>; missingCanonical: string[]; onOpenEvidence: () => void; onOpenIdentity: () => void; onOpenPhotos: () => void; onOpenSafety: () => void; onOpenWork: () => void; primaryHref: string; vehicle360Return: string }) {
  const vehicle = view.summary.vehicle;
  const recallCount = safety?.recalls.length ?? 0;
  const nextAction = view.summary.nextAction ?? (view.tabs.inventory.items.length ? "Continue receiving and inventory planning" : "Review vehicle record and establish the next workflow");
  return <main className={styles.overviewLayout}>
    <div className={styles.sectionStack}>
      <section className={styles.panel}><SectionHeading eyebrow="Current operational state" title={sentence(view.summary.stage)} detail={`${sentence(view.summary.operatingState)} · ${view.summary.location?.name ?? "No active location"}${view.summary.targetAt ? ` · target ${dateTime(view.summary.targetAt)}` : ""}`} action={<Link className={styles.secondaryButton} href={primaryHref}>Continue work<ArrowRight /></Link>} /><div className={styles.nextAction}><Gauge /><div><small>Do this next</small><strong>{nextAction}</strong><p>The command center preserves context while the authoritative work remains in its governed workflow.</p></div></div></section>
      <VehicleTruthMap view={view} missingCanonical={missingCanonical} onOpenEvidence={onOpenEvidence} onOpenIdentity={onOpenIdentity} onOpenPhotos={onOpenPhotos} onOpenWork={onOpenWork} primaryHref={primaryHref} vehicle360Return={vehicle360Return} />
      <section className={styles.panel}><SectionHeading eyebrow="Safety intelligence" title={safetyLoading ? "Checking NHTSA sources" : safetyError ? "Safety source needs attention" : recallCount ? `${recallCount} model-level campaign${recallCount === 1 ? "" : "s"} found` : safety ? "No model-level campaigns returned" : "Safety intelligence pending"} detail="Potential campaigns require VIN-specific verification before they can be treated as an open recall." action={<button className={styles.textButton} onClick={onOpenSafety} type="button">Open safety review<ArrowRight /></button>} />{safetyError ? <div className={styles.warning}><AlertTriangle /><p>{safetyError}</p></div> : recallCount ? <div className={styles.safetyPreview}><ShieldAlert /><div><OperationalBadge tone="attention">Potentially applicable—verify by VIN</OperationalBadge><strong>{safety?.recalls[0]?.component}</strong><p>{safety?.recalls[0]?.summary}</p></div></div> : <div className={styles.safetyPreview}><ShieldCheck /><div><strong>{safetyLoading ? "Retrieving current model-level results" : safety ? "No model-level campaign returned" : "VIN verification policy remains active"}</strong><p>A model-level search does not replace the NHTSA or manufacturer VIN-specific lookup.</p></div></div>}</section>
      <section className={styles.panel}><SectionHeading eyebrow="Vehicle facts" title="Canonical identity and decoded specifications" detail={`The most useful identity and technical facts are visible here. Decode status: ${specificationStatus}.`} action={<button className={styles.textButton} onClick={onOpenIdentity} type="button">View all specifications<ArrowRight /></button>} /><dl className={styles.factGrid}><div><dt>Year / make / model</dt><dd>{[specifications.modelYear ?? vehicle.year, specifications.make ?? vehicle.make, specifications.model ?? vehicle.model].filter(Boolean).join(" ") || dash}</dd></div><div><dt>Trim / series</dt><dd>{rawLabel(specifications.trim ?? specifications.series)}</dd></div><div><dt>Engine</dt><dd>{[specifications.displacementLiters ? `${specifications.displacementLiters}L` : null, specifications.engineCylinders ? `${specifications.engineCylinders} cylinder` : null, specifications.engineConfiguration].filter(Boolean).join(" · ") || dash}</dd></div><div><dt>Drive / transmission</dt><dd>{[specifications.driveType, specifications.transmissionStyle].filter(Boolean).map(rawLabel).join(" · ") || dash}</dd></div><div><dt>Body / doors</dt><dd>{[specifications.bodyClass, specifications.doors ? `${specifications.doors} door` : null].filter(Boolean).map(rawLabel).join(" · ") || dash}</dd></div><div><dt>Manufactured</dt><dd>{[specifications.manufacturer, specifications.plantCountry].filter(Boolean).map(rawLabel).join(" · ") || dash}</dd></div></dl></section>
      <section className={styles.panel}><SectionHeading eyebrow="Connected activity" title="Work, service, and evidence timeline" detail="Events from durable source records are presented in one vehicle history." /><div className={styles.timeline}>{view.timeline.length ? view.timeline.slice(0, 8).map(item => { const Icon = sourceIcon(item.source); return <article key={item.id}><Icon /><div><small>{sentence(item.source)} · {sentence(item.type)}</small><strong>{item.title}</strong><p>{item.detail ?? `${item.subjectType} ${item.subjectId}`}</p></div><time>{dateTime(item.occurredAt)}</time></article>; }) : <AccessEmpty allowed labelText="Timeline" />}</div></section>
    </div>
    <aside className={styles.sideRail}>
      <section className={`${styles.panel} ${styles.nextPanel}`}><small>Next best action</small><h2>{nextAction}</h2><p>Resume the authoritative workflow without losing this vehicle context.</p><Link className={styles.primaryButton} href={primaryHref}>Continue current task<ArrowRight /></Link></section>
      <section className={styles.panel}><SectionHeading eyebrow="Custody & assignment" title="Current responsibility" /><dl className={styles.sideFacts}><div><dt>Relationship</dt><dd>{relationship(view)}</dd></div><div><dt>Location</dt><dd>{view.summary.location?.name ?? "Not recorded"}</dd></div><div><dt>Accountable owner</dt><dd>{ownerName(view.summary.owner)}</dd></div><div><dt>Operating state</dt><dd>{sentence(view.summary.operatingState)}</dd></div></dl></section>
      <section className={styles.panel}><SectionHeading eyebrow="Canonical data health" title={missingCanonical.length ? `${missingCanonical.length} field${missingCanonical.length === 1 ? "" : "s"} need attention` : "Core identity complete"} /><dl className={styles.sourceList}><div><dt>VIN identity</dt><dd className={vehicle.vinState === "VERIFIED" ? styles.positive : ""}>{sentence(vehicle.vinState)}</dd></div><div><dt>NHTSA decode</dt><dd className={specificationAvailable ? styles.positive : ""}>{specificationStatus}</dd></div>{missingCanonical.map(field => <div key={field}><dt>{field}</dt><dd>Missing in canonical record</dd></div>)}</dl><button className={styles.textButton} onClick={onOpenIdentity} type="button">Review origins and details<ArrowRight /></button></section>
      <section className={styles.panel}><SectionHeading eyebrow="Connected records" title="Authoritative links" /><dl className={styles.sourceList}><div><dt>Evidence</dt><dd>{view.tabs.documents.allowed ? view.tabs.documents.items.length : "Restricted"}</dd></div><div><dt>Repair orders</dt><dd>{view.tabs.service.allowed ? view.tabs.service.repairOrders.length : "Restricted"}</dd></div><div><dt>Inventory units</dt><dd>{view.tabs.inventory.allowed ? view.tabs.inventory.items.length : "Restricted"}</dd></div><div><dt>Parts demands</dt><dd>{view.tabs.parts.allowed ? view.tabs.parts.demands.length : "Restricted"}</dd></div></dl><button className={styles.textButton} onClick={onOpenEvidence} type="button">Open evidence records<ArrowRight /></button></section>
      <section className={styles.panel}><SectionHeading eyebrow="Relationships" title={`${view.graph.edges.length} durable connection${view.graph.edges.length === 1 ? "" : "s"}`} /><div className={styles.relationships}>{view.graph.edges.slice(0, 5).map(edge => <div key={edge.id}><Link2 /><span>{nodes.get(edge.to)?.label ?? edge.to}</span><small>{sentence(edge.type)}</small></div>)}</div></section>
    </aside>
  </main>;
}

function VehicleTruthMap({ view, missingCanonical, onOpenEvidence, onOpenIdentity, onOpenPhotos, onOpenWork, primaryHref, vehicle360Return }: { view: Vehicle360View; missingCanonical: string[]; onOpenEvidence: () => void; onOpenIdentity: () => void; onOpenPhotos: () => void; onOpenWork: () => void; primaryHref: string; vehicle360Return: string }) {
  const { capturedRequired } = walkaroundCoverage(view.tabs.documents.items);
  const warrantyCount = view.tabs.warranty.allowed ? view.tabs.warranty.items.length : null;
  const partsCount = view.tabs.parts.allowed ? view.tabs.parts.demands.length + view.tabs.parts.custody.length : null;
  const towingCount = matchingRecords([...view.timeline, ...view.tabs.communications.items, ...view.tabs.service.repairOrders], /tow|towing|transport|pickup|drop off|dropped off/).length;
  const documentCount = view.tabs.documents.allowed ? view.tabs.documents.items.length : null;
  const titleRecords = view.tabs.documents.allowed ? view.tabs.documents.items.filter(item => item.category === "TITLE").length : null;
  const costPackages = view.tabs.costs.allowed ? view.tabs.costs.items.length : null;
  const cards = [
    { action: "Review identity", detail: missingCanonical.length ? `${missingCanonical.length} identity field${missingCanonical.length === 1 ? "" : "s"} need attention` : "VIN and core identity are available", icon: BadgeCheck, label: "Identity", onClick: onOpenIdentity, value: view.summary.vehicle.vinState === "VERIFIED" ? "Verified" : sentence(view.summary.vehicle.vinState) },
    { action: "Open photos", detail: "Arrival, damage, odometer, and report proof", icon: Camera, label: "360 photos", onClick: onOpenPhotos, value: `${capturedRequired}/${requiredWalkaroundAngles.length}` },
    { action: "Open lifecycle", detail: sentence(view.summary.stage), icon: ClipboardCheck, label: "Inventory lifecycle", onClick: onOpenWork, value: view.tabs.inventory.allowed ? view.tabs.inventory.items.length : "Restricted" },
    { action: "Open repair", detail: "Workbench and RO source records", icon: Wrench, label: "Repair orders", onClick: onOpenWork, value: view.tabs.service.allowed ? view.tabs.service.repairOrders.length : "Restricted" },
    { action: "Open parts", detail: "Demand, custody, and receiving context", href: withReturn(`/vehicles/parts-operations?vehicleId=${encodeURIComponent(view.summary.vehicle.id)}`, vehicle360Return), icon: ClipboardList, label: "Parts", value: partsCount ?? "Restricted" },
    { action: "Open documents", detail: `Plate ${view.summary.vehicle.licensePlate ?? "not recorded"}`, icon: FileText, label: "Title / licensing", onClick: onOpenEvidence, value: titleRecords ?? "Restricted" },
    { action: "Review towing", detail: "Pickup, drop-off, and custody signals", icon: Truck, label: "Towing", onClick: onOpenWork, value: towingCount },
    { action: "Open warranty", detail: "Coverage, claims, and approval proof", icon: ShieldCheck, label: "Warranty", onClick: onOpenWork, value: warrantyCount ?? "Restricted" },
    { action: "Review costs", detail: "Estimates and invoice packages", icon: Gauge, label: "Costs", onClick: onOpenWork, value: costPackages ?? "Restricted" },
    { action: "Open evidence", detail: "Governed photos, approvals, and files", icon: FileSearch, label: "Documents", onClick: onOpenEvidence, value: documentCount ?? "Restricted" },
    { action: "View timeline", detail: "Durable vehicle event history", icon: History, label: "Timeline", onClick: onOpenWork, value: view.timeline.length },
    { action: "Continue", detail: view.summary.risks[0] ? sentence(view.summary.risks[0]) : "No active blocker recorded", href: primaryHref, icon: AlertTriangle, label: "Current blocker", value: view.summary.risks.length || "Clear" },
  ];
  return <section className={`${styles.panel} ${styles.truthCenter}`}>
    <SectionHeading eyebrow="Vehicle truth center" title="Everything important about this vehicle, one jump away" detail="Open only the part of the record needed for the next decision or task." action={<Link className={styles.primaryButton} href={primaryHref}>Next best action<ArrowRight /></Link>} />
    <div className={styles.truthGrid}>{cards.map(card => {
      const Icon = card.icon;
      const body = <><Icon /><div><small>{card.label}</small><strong>{card.value}</strong><p>{card.detail}</p></div><b>{card.action}<ArrowRight /></b></>;
      return card.href ? <Link className={styles.truthCard} href={card.href} key={card.label}>{body}</Link> : <button className={styles.truthCard} key={card.label} onClick={card.onClick} type="button">{body}</button>;
    })}</div>
  </section>;
}

function WorkHistory({ view }: { view: Vehicle360View }) {
  return <div className={styles.sectionStack}>
    <section className={styles.panel}><SectionHeading eyebrow="Work & service history" title="One vehicle record across intake, recon, repair, and release" detail="Operational records stay grouped by their source while remaining connected to this canonical vehicle." /></section>
    <RecordSection title="Inventory lifecycle" allowed={view.tabs.inventory.allowed} items={view.tabs.inventory.items} kind="Inventory unit" />
    <RecordSection title="Repair orders" allowed={view.tabs.service.allowed} items={view.tabs.service.repairOrders} kind="Repair order" />
    <RecordSection title="Parts demand and custody" allowed={view.tabs.parts.allowed} items={[...view.tabs.parts.demands, ...view.tabs.parts.custody]} kind="Parts record" />
    <RecordSection title="Appointments" allowed items={view.tabs.appointments.items.map(item => nested(item, "appointment"))} kind="Appointment" />
    <RecordSection title="Warranty" allowed={view.tabs.warranty.allowed} items={view.tabs.warranty.items} kind="Warranty coverage or claim" />
    <RecordSection title="Customer communications" allowed={view.tabs.communications.allowed} items={view.tabs.communications.items} kind="Communication" />
    <RecordSection title="Authorization decisions" allowed={view.tabs.decisions.allowed} items={view.tabs.decisions.items} kind="Authorization decision" />
    <section className={styles.panel}><SectionHeading eyebrow="Costs" title="Service estimates and invoice packages" />{view.tabs.costs.allowed ? view.tabs.costs.items.length ? <div className={styles.recordGrid}>{view.tabs.costs.items.map((item, index) => <article className={styles.recordCard} key={String(item.repairOrderId ?? index)}><small>Service cost</small><h3>{sentence(item.repairOrderNumber)}</h3>{Array.isArray(item.estimates) ? (item.estimates as RecordItem[]).map(estimate => <p key={String(estimate.id)}>Estimate v{rawLabel(estimate.version)} · {money(estimate.totalCents)} · {sentence(estimate.status)}</p>) : null}</article>)}</div> : <AccessEmpty allowed labelText="Costs" /> : <AccessEmpty allowed={false} labelText="Costs" />}</section>
    <RecordSection title="Audit history" allowed={view.tabs.audit.allowed} items={view.tabs.audit.items} kind="Audit event" />
  </div>;
}

function RecordSection({ title, allowed, items, kind }: { title: string; allowed: boolean; items: RecordItem[]; kind: string }) {
  return <section className={styles.panel}><SectionHeading eyebrow="Connected source records" title={title} action={<OperationalBadge>{allowed ? `${items.length} record${items.length === 1 ? "" : "s"}` : "Restricted"}</OperationalBadge>} />{allowed ? <GenericCards items={items} kind={kind} /> : <AccessEmpty allowed={false} labelText={title} />}</section>;
}

function PhotoWalkaround({ allowed, items, onAddPhoto, vehicle }: { allowed: boolean; items: EvidenceItem[]; onAddPhoto: () => void; vehicle: Vehicle360View["summary"]["vehicle"] }) {
  const { photos, byAngle, capturedRequired, missingRequired } = walkaroundCoverage(items);
  const firstCaptured = walkaroundAngles.find(angle => byAngle.has(angle.code))?.code;
  const [selectedCode, setSelectedCode] = useState<WalkaroundAngleCode>(firstCaptured ?? "front");
  const selected = walkaroundAngles.find(angle => angle.code === selectedCode) ?? walkaroundAngles[0];
  const selectedItem = byAngle.get(selected.code);
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
  return <div className={styles.sectionStack}>
    <section className={styles.panel}>
      <SectionHeading
        eyebrow="360 photo walkaround"
        title="Vehicle photo coverage"
        detail="Use normal phone photos. Vehicle 360 organizes the evidence by required angle so intake, recon, sales, warranty, and reports can reuse the same governed source."
        action={<button className={styles.primaryButton} disabled={!allowed} onClick={onAddPhoto} type="button"><Camera />Add photo evidence</button>}
      />
      <div className={styles.photoStats}>
        <div><small>Required coverage</small><strong>{capturedRequired}/{requiredWalkaroundAngles.length}</strong><span>{capturedRequired === requiredWalkaroundAngles.length ? "Ready for review" : "More angles needed"}</span></div>
        <div><small>Missing angles</small><strong>{missingRequired.length}</strong><span>{missingRequired.slice(0, 2).map(angle => angle.label).join(", ") || "None"}</span></div>
        <div><small>Available photos</small><strong>{photos.length}</strong><span>Governed evidence</span></div>
        <div><small>Vehicle</small><strong>{title}</strong><span>Stock {vehicle.stockNumber ?? "not recorded"}</span></div>
      </div>
    </section>

    <main className={styles.walkaroundLayout}>
      <section className={`${styles.panel} ${styles.walkaroundViewer}`}>
        <div className={styles.photoFrame}>
          {selectedItem?.downloadUrl ? <div aria-label={`${selected.label} vehicle photo`} className={styles.photoImage} role="img" style={{ backgroundImage: `url("${selectedItem.downloadUrl}")` }} /> : <div className={styles.photoPlaceholder}><Camera /><strong>{selectedItem ? selectedItem.evidenceObject.fileName : `${selected.label} photo missing`}</strong><p>{selected.hint}</p></div>}
        </div>
        <div className={styles.angleRail} aria-label="Walkaround photo angles">
          {walkaroundAngles.map(angle => {
            const captured = byAngle.has(angle.code);
            return <button aria-current={selectedCode === angle.code ? "true" : undefined} className={`${styles.angleButton} ${selectedCode === angle.code ? styles.angleButtonActive : ""}`} key={angle.code} onClick={() => setSelectedCode(angle.code)} type="button"><span>{angle.label}</span><small>{captured ? "Captured" : "Needed"}</small></button>;
          })}
        </div>
      </section>

      <aside className={styles.sectionStack}>
        <section className={styles.panel}>
          <SectionHeading eyebrow="Selected angle" title={selected.label} detail={selected.hint} />
          {selectedItem ? <dl className={styles.photoMeta}>
            <div><dt>File</dt><dd>{selectedItem.evidenceObject.fileName}</dd></div>
            <div><dt>Uploaded by</dt><dd>{selectedItem.evidenceObject.uploadedByUser.name}</dd></div>
            <div><dt>Uploaded</dt><dd>{dateTime(selectedItem.evidenceObject.createdAt)}</dd></div>
            <div><dt>Access</dt><dd>{sentence(selectedItem.evidenceObject.accessLevel)}</dd></div>
            <div><dt>Malware result</dt><dd>{sentence(selectedItem.evidenceObject.malwareStatus)}</dd></div>
          </dl> : <div className={styles.empty}><AlertTriangle /><div><strong>Photo needed</strong><p>Add a photo for this angle and include the angle name in the file name, such as front-left or odometer.</p></div></div>}
          <div className={styles.cardActions}>{selectedItem?.downloadUrl ? <a className={styles.secondaryButton} href={selectedItem.downloadUrl}>Open photo</a> : null}<button className={styles.secondaryButton} disabled={!allowed} onClick={onAddPhoto} type="button">{selectedItem ? "Add another angle" : "Add this angle"}</button></div>
        </section>

        <section className={styles.panel}>
          <SectionHeading eyebrow="Workflow use" title="Where these photos help" detail="One captured photo set should support the workbench instead of being re-uploaded in multiple places." />
          <div className={styles.workflowChips}><span>Delivery readiness</span><span>Repair progress</span><span>Appraisal proof</span><span>Customer issue</span><span>Warranty</span><span>Towing / intake</span><span>Report evidence</span></div>
        </section>
      </aside>
    </main>

    <section className={styles.panel}>
      <SectionHeading eyebrow="Walkaround checklist" title="Required and optional angles" detail="Captured angles show as ready. Missing angles become the next photo work for staff." />
      {allowed ? <div className={styles.angleChecklist}>{walkaroundAngles.map(angle => {
        const item = byAngle.get(angle.code);
        return <article key={angle.code}><div><CheckCircle2 className={item ? styles.positiveIcon : styles.mutedIcon} /><strong>{angle.label}</strong><p>{item ? item.evidenceObject.fileName : angle.hint}</p></div><button className={styles.textButton} onClick={() => item ? setSelectedCode(angle.code) : onAddPhoto()} type="button">{item ? "Inspect" : "Add photo"}<ArrowRight /></button></article>;
      })}</div> : <AccessEmpty allowed={false} labelText="Vehicle photos" />}
    </section>
  </div>;
}

function EvidenceWorkspace({ accessLevel, allowed, busy, category, file, items, retention, onAccessLevel, onCategory, onFile, onGovern, onRetention, onUpload }: { accessLevel: string; allowed: boolean; busy: boolean; category: string; file: File | null; items: EvidenceItem[]; retention: string; onAccessLevel: (value: string) => void; onCategory: (value: string) => void; onFile: (value: File | null) => void; onGovern: (item: EvidenceItem, changes: Record<string, unknown>, reason: string) => Promise<void>; onRetention: (value: string) => void; onUpload: (event: FormEvent) => Promise<void> }) {
  return <div className={styles.sectionStack}><form className={styles.panel} onSubmit={onUpload}><SectionHeading eyebrow="Evidence & documents" title="Upload governed evidence" detail="Attach evidence once, preserve its origin, and reuse it across receiving, recon, repair, QC, and future diagnosis." /><div className={styles.uploadGrid}><label><span>File</span><input accept="application/pdf,image/jpeg,image/png,image/webp,text/plain" disabled={busy || !allowed} onChange={event => onFile(event.target.files?.[0] ?? null)} required type="file" /></label><label><span>Category</span><select onChange={event => onCategory(event.target.value)} value={category}>{["PHOTO", "INSPECTION", "REPAIR", "TITLE", "WARRANTY", "CUSTOMER_APPROVAL", "DELIVERY", "OTHER"].map(item => <option key={item}>{item}</option>)}</select></label><label><span>Access</span><select onChange={event => onAccessLevel(event.target.value)} value={accessLevel}><option>INTERNAL</option><option>RESTRICTED</option></select></label><label><span>Retain through</span><input onChange={event => onRetention(event.target.value)} required type="date" value={retention} /></label></div><button className={styles.primaryButton} disabled={busy || !file || !allowed} type="submit">Verify and store evidence<ArrowRight /></button></form>
    <section className={styles.panel}><SectionHeading eyebrow="Connected evidence" title={`${items.length} governed object${items.length === 1 ? "" : "s"}`} detail="Integrity, access classification, retention, legal hold, and uploader attribution remain visible." />{allowed ? items.length ? <div className={styles.evidenceGrid}>{items.map(item => <article className={styles.evidenceCard} key={item.id}><header><FileText /><div><small>{sentence(item.category)} · {sentence(item.evidenceObject.status)}</small><h3>{item.evidenceObject.fileName}</h3></div></header><dl><div><dt>Integrity</dt><dd>{item.evidenceObject.checksumSha256.slice(0, 16)}…</dd></div><div><dt>Malware result</dt><dd>{sentence(item.evidenceObject.malwareStatus)}</dd></div><div><dt>Access</dt><dd>{sentence(item.evidenceObject.accessLevel)}</dd></div><div><dt>Retention</dt><dd>{dateTime(item.evidenceObject.retentionUntil)}</dd></div><div><dt>Legal hold</dt><dd>{item.evidenceObject.legalHold ? "Active" : "Not active"}</dd></div><div><dt>Uploaded by</dt><dd>{item.evidenceObject.uploadedByUser.name}</dd></div></dl><div className={styles.cardActions}>{item.downloadUrl ? <a className={styles.secondaryButton} href={item.downloadUrl}>Download</a> : null}<button className={styles.secondaryButton} disabled={busy} onClick={() => void onGovern(item, { legalHold: !item.evidenceObject.legalHold }, `${item.evidenceObject.legalHold ? "Release" : "Apply"} evidence legal hold after governance review.`)} type="button">{item.evidenceObject.legalHold ? "Release hold" : "Apply legal hold"}</button><button className={styles.secondaryButton} disabled={busy} onClick={() => void onGovern(item, { accessLevel: item.evidenceObject.accessLevel === "INTERNAL" ? "RESTRICTED" : "INTERNAL" }, "Change evidence access classification after governance review.")} type="button">Set {item.evidenceObject.accessLevel === "INTERNAL" ? "restricted" : "internal"}</button></div></article>)}</div> : <AccessEmpty allowed labelText="Evidence" /> : <AccessEmpty allowed={false} labelText="Evidence" />}</section>
  </div>;
}
