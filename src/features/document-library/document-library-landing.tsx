import {
  Archive,
  AlertTriangle,
  BadgeDollarSign,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  FileSearch,
  FileSignature,
  FileText,
  FolderPlus,
  Link2,
  MailCheck,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Wrench
} from "lucide-react";

import { buildAdvisorySuggestions, documentLibraryDemoPacket, evaluatePacket } from "@/server/document-library/read-model";

import styles from "./document-library-landing.module.css";

type StatusTone = "success" | "warning" | "danger" | "info";

type Packet = {
  age: string;
  customer: string;
  date: string;
  nextAction: string;
  id: string;
  packetType: string;
  status: string;
  tone: StatusTone;
};

type Requirement = {
  description: string;
  name: string;
  status: string;
  tone: StatusTone;
};

const categories = [
  { icon: FileText, label: "Customer" },
  { icon: Car, label: "Vehicle" },
  { icon: ClipboardCheck, label: "Repair Order" },
  { icon: ShieldCheck, label: "Claim" },
  { icon: Archive, label: "Title" },
  { icon: BadgeDollarSign, label: "Sale / Finance" },
  { icon: FileSearch, label: "Purchase / Appraisal" },
  { icon: Wrench, label: "Warranty" },
  { icon: Truck, label: "Vendor" },
  { icon: FolderPlus, label: "Parts" },
  { icon: Camera, label: "Photos" },
  { icon: FileSignature, label: "Signed Forms" }
];

const packets: Packet[] = [
  { age: "52m", customer: "Gada Ahmed Jamal", date: "Oct 14, 2024", id: "#CLM-10421", nextAction: "Request damage photos", packetType: "Claim Packet", status: "Missing", tone: "warning" },
  { age: "1h", customer: "Michael Torres", date: "Oct 13, 2024", id: "#RO-88317", nextAction: "Review signed estimate", packetType: "Repair Order Packet", status: "Received", tone: "info" },
  { age: "3h", customer: "Sarah Kim", date: "Oct 12, 2024", id: "#TTL-55091", nextAction: "Resolve lienholder name mismatch", packetType: "Vehicle Title Packet", status: "In Review", tone: "warning" },
  { age: "5h", customer: "David Kim", date: "Oct 11, 2024", id: "#FIN-77102", nextAction: "Archive funding approval", packetType: "Sale / Finance Packet", status: "Accepted", tone: "success" },
  { age: "1d", customer: "Renee Carter", date: "Oct 10, 2024", id: "#PUR-66120", nextAction: "Link appraisal photos", packetType: "Purchase / Appraisal Packet", status: "Received", tone: "info" },
  { age: "1d", customer: "James Peterson", date: "Oct 10, 2024", id: "#WAR-33418", nextAction: "Send provider authorization", packetType: "Warranty Packet", status: "In Review", tone: "warning" }
];

const requirements: Requirement[] = [
  { description: "Completed insurance claim intake form.", name: "Insurance claim intake form", status: "Received", tone: "success" },
  { description: "Signed authorization to release information.", name: "Customer authorization", status: "Received", tone: "success" },
  { description: "Photos of all vehicle damage, multiple angles.", name: "Damage photos", status: "Missing", tone: "warning" },
  { description: "Tow and storage authorization form, if applicable.", name: "Tow / storage form", status: "Missing", tone: "warning" }
];

const statusFilters = [
  ["Accepted", "28", "success"],
  ["In Review", "12", "warning"],
  ["Missing", "18", "danger"],
  ["Needs Correction", "6", "danger"],
  ["Received", "20", "info"]
] as const;

const queueMetrics = [
  { detail: "Workable by staff", label: "Ready for review", tone: "info", value: "14" },
  { detail: "Missing or rejected", label: "Blocked packets", tone: "danger", value: "8" },
  { detail: "Carrier, lender, warranty", label: "Provider waiting", tone: "warning", value: "11" },
  { detail: "Accepted this week", label: "Archived", tone: "success", value: "32" }
] as const;

const queueLanes = [
  { count: "9", label: "Intake queue", text: "New uploads, portal submissions, scanned forms, and unlinked files." },
  { count: "12", label: "Review queue", text: "Packets with every required item present and ready for staff decision." },
  { count: "8", label: "Blocker queue", text: "Missing, conflicted, expired, or provider-held packets needing ownership." }
];

const packetFacts = [
  ["Owner", "Maria Lopez"],
  ["Department", "Service / Claims"],
  ["Promise impact", "Customer update due today"],
  ["Retention", "Claim evidence + 7 years"]
] as const;

const linkedDocuments = [
  { name: "Claim intake form.pdf", source: "Customer Portal", status: "Accepted", tone: "success" },
  { name: "Signed authorization.pdf", source: "Front desk scan", status: "Accepted", tone: "success" },
  { name: "damage-photos.zip", source: "Provider link", status: "Missing", tone: "warning" }
] as const;

const blockers = [
  "Damage photos are missing from the customer portal upload.",
  "Tow / storage form is required before supplement submission.",
  "Provider claim number is not yet linked to the repair order."
];

const archiveItems = [
  { label: "Retention status", value: "Hold until claim closes" },
  { label: "Archive folder", value: "Claims / 2024 / CLM-10421" },
  { label: "Export set", value: "Customer, provider, repair order" }
] as const;

const providerActions = [
  { icon: MailCheck, label: "Request e-signature", text: "Human-confirmed only; requires permission, audit, idempotency key, purpose, and rollback posture." },
  { icon: Link2, label: "Upload to provider", text: "Held until user confirmation and legal-hold checks pass; provider never owns document meaning." },
  { icon: RefreshCw, label: "Reconcile provider status", text: "Read provider status without changing packet decisions or bypassing review authority." }
];

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`${styles.statusBadge} ${styles[tone]}`}><CheckCircle2 size={13} />{label}</span>;
}

export function DocumentLibraryLanding() {
  const packetEvaluation = evaluatePacket(documentLibraryDemoPacket);
  const advisorySuggestions = buildAdvisorySuggestions(documentLibraryDemoPacket);

  return (
    <section className={styles.page} aria-labelledby="document-library-title">
      <header className={styles.hero}>
        <div>
          <h1 id="document-library-title">Document Library</h1>
          <p>Store, review, and organize operational documents.</p>
        </div>
        <form className={styles.searchBar} role="search">
          <Search size={18} />
          <input aria-label="Search documents" placeholder="Search customer, VIN, RO, claim, document..." type="search" />
        </form>
        <div className={styles.heroActions}>
          <button className={styles.primaryAction} type="button"><FilePlus2 size={18} />Add Document</button>
          <button className={styles.secondaryAction} type="button"><FolderPlus size={18} />Create Packet</button>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.filters} aria-label="Document filters">
          <div className={styles.filterHeader}><strong>Filters</strong><button type="button">Reset</button></div>
          <div className={styles.filterGroup}>
            <span>Status</span>
            {statusFilters.map(([label, count, tone]) => (
              <label key={label}>
                <input type="checkbox" />
                <i className={styles[tone]} />
                <b>{label}</b>
                <em>{count}</em>
              </label>
            ))}
          </div>
          <label className={styles.selectField}>Packet Type<select defaultValue="all"><option value="all">All Packet Types</option></select></label>
          <label className={styles.selectField}>Owner<select defaultValue="all"><option value="all">All Owners</option></select></label>
          <label className={styles.selectField}>Date Range<select defaultValue="30"><option value="30">Last 30 days</option></select></label>
        </aside>

        <main className={styles.workspace}>
          <section className={styles.dashboardPanel} aria-labelledby="document-dashboard-title">
            <header>
              <div>
                <span className={styles.sectionEyebrow}>Staff queue</span>
                <h2 id="document-dashboard-title">Document work dashboard</h2>
              </div>
              <button type="button"><RefreshCw size={16} />Refresh</button>
            </header>
            <div className={styles.metricGrid}>
              {queueMetrics.map((metric) => (
                <article key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small className={styles[metric.tone]}>{metric.detail}</small>
                </article>
              ))}
            </div>
            <div className={styles.queueGrid}>
              {queueLanes.map((lane) => (
                <article key={lane.label}>
                  <strong>{lane.count}</strong>
                  <div><span>{lane.label}</span><p>{lane.text}</p></div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.categoryPanel} aria-labelledby="document-categories">
            <header><h2 id="document-categories">Document Categories</h2><span>12 Categories</span><button type="button">View All</button></header>
            <div className={styles.categoryGrid}>
              {categories.map(({ icon: Icon, label }) => (
                <button key={label} type="button"><Icon size={25} /><span>{label}</span></button>
              ))}
            </div>
          </section>

          <div className={styles.contentGrid}>
            <section className={styles.intakePanel} aria-labelledby="document-intake-title">
              <header>
                <div>
                  <span className={styles.sectionEyebrow}>Add / link</span>
                  <h2 id="document-intake-title">Add or link document</h2>
                </div>
                <StatusBadge label="Draft" tone="info" />
              </header>
              <div className={styles.formGrid}>
                <label>Packet<select defaultValue="claim"><option value="claim">Claim Packet #CLM-10421</option></select></label>
                <label>Document type<select defaultValue="photos"><option value="photos">Damage photos</option></select></label>
                <label>Source<select defaultValue="portal"><option value="portal">Customer Portal</option><option value="provider">Provider Link</option><option value="scan">Front desk scan</option></select></label>
                <label>Reference<input placeholder="Paste URL, file name, scan batch, or provider ID" /></label>
              </div>
              <footer>
                <button className={styles.primaryAction} type="button"><FilePlus2 size={16} />Add to packet</button>
                <button className={styles.secondaryAction} type="button"><Link2 size={16} />Link existing</button>
              </footer>
            </section>

            <section className={styles.packetList} aria-labelledby="packet-list-title">
              <header><h2 id="packet-list-title">Packets (24)</h2><button type="button">Sort by: Last Updated</button></header>
              <div>
                {packets.map((packet, index) => (
                  <article className={index === 0 ? styles.selectedPacket : undefined} key={packet.id}>
                    <FileText size={22} />
                    <div><strong>{packet.packetType}</strong><span>{packet.id} - {packet.age}</span><small>{packet.customer}</small><small>{packet.nextAction}</small></div>
                    <StatusBadge label={packet.status} tone={packet.tone} />
                    <time>{packet.date}</time>
                    <span aria-hidden="true">›</span>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.packetDetail} aria-labelledby="selected-packet-title">
              <header>
                <div>
                  <h2 id="selected-packet-title">Claim Packet: Gada Ahmed Jamal</h2>
                  <p>Claim # CLM-10421 <span /> Customer # CUS-77834 <span /> VIN 1FTEW1EP8KFA39217</p>
                </div>
                <StatusBadge label="Missing" tone="warning" />
              </header>
              <nav aria-label="Packet sections"><a href="#requirements">Requirements</a><a href="#documents">Documents (2)</a><a href="#details">Details</a></nav>
              <section className={styles.overviewPanel} aria-labelledby="packet-overview-title">
                <h3 id="packet-overview-title">Packet overview</h3>
                <dl>
                  {packetFacts.map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  ))}
                </dl>
              </section>
              <div className={styles.requirementHeader}><h3 id="requirements">Required Documents</h3><span>2 of 4 received</span></div>
              <div className={styles.requirements}>
                {requirements.map((requirement) => (
                  <article key={requirement.name}>
                    <FileCheck2 size={23} />
                    <div><strong>{requirement.name}</strong><span>{requirement.description}</span></div>
                    <StatusBadge label={requirement.status} tone={requirement.tone} />
                    <button aria-label={`More actions for ${requirement.name}`} type="button"><MoreHorizontal size={17} /></button>
                  </article>
                ))}
              </div>
              <section className={styles.documentsPanel} aria-labelledby="documents">
                <h3 id="documents">Linked documents</h3>
                {linkedDocuments.map((document) => (
                  <article key={document.name}>
                    <FileText size={18} />
                    <div><strong>{document.name}</strong><span>{document.source}</span></div>
                    <StatusBadge label={document.status} tone={document.tone} />
                    <button aria-label={`Open ${document.name}`} type="button"><ExternalLink size={15} /></button>
                  </article>
                ))}
              </section>
            </section>

            <aside className={styles.reviewPanel} aria-label="Packet review">
              <header><h2>Review</h2><p>Review documents and update packet status.</p></header>
              <button className={styles.acceptAction} type="button"><CheckCircle2 size={16} />Accept packet</button>
              <button className={styles.correctionAction} type="button"><AlertTriangle size={16} />Needs correction</button>
              <button className={styles.requestAction} type="button"><FilePlus2 size={16} />Request document</button>
              <button className={styles.archiveAction} type="button"><Archive size={16} />Send to archive</button>
              <label>Notes (optional)<textarea placeholder="Add a note about this packet..." /></label>
            </aside>

            <section className={styles.bottomRail} aria-label="Packet controls and source details">
              <section className={styles.blockerPanel} aria-labelledby="blocker-title">
                <h3 id="blocker-title"><AlertTriangle size={16} />Blockers</h3>
                {blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}
              </section>
              <section className={styles.advisoryPanel} aria-labelledby="advisory-title">
                <h3 id="advisory-title"><ShieldCheck size={16} />Advisory</h3>
                <p>Do not mark this claim packet accepted until damage photos and tow/storage authorization are present or waived by a manager.</p>
                {advisorySuggestions.map((suggestion) => (
                  <p key={`${suggestion.kind}-${suggestion.evidence}`}>{suggestion.label}: {suggestion.reviewRequired ? "review required before acceptance" : "accepted"}</p>
                ))}
              </section>
              <section className={styles.providerPanel} aria-labelledby="provider-title">
                <h3 id="provider-title"><Clock3 size={16} />Provider status</h3>
                <dl>
                  <div><dt>Carrier</dt><dd>Northstar Mutual</dd></div>
                  <div><dt>Provider action</dt><dd>Awaiting adjuster upload</dd></div>
                  <div><dt>SLA</dt><dd>4 business hours left</dd></div>
                  <div><dt>Safety gate</dt><dd>{packetEvaluation.status}</dd></div>
                </dl>
              </section>
              <section className={styles.providerActions} aria-labelledby="provider-actions-title">
                <h3 id="provider-actions-title">Provider actions</h3>
                {providerActions.map(({ icon: Icon, label, text }) => (
                  <button key={label} type="button"><Icon size={16} /><span>{label}</span><small>{text}</small></button>
                ))}
              </section>
              <div className={styles.auditBox}>
                <strong>Audit &amp; Source</strong>
                <dl>
                  <div><dt>Uploaded by</dt><dd>Maria Lopez</dd></div>
                  <div><dt>Upload date</dt><dd>Oct 14, 2024 9:32 AM</dd></div>
                  <div><dt>Source</dt><dd>Customer Portal</dd></div>
                  <div><dt>Last updated</dt><dd>Oct 14, 2024 10:15 AM</dd></div>
                  <div><dt>Access</dt><dd>Deny by default</dd></div>
                  <div><dt>Actions</dt><dd>Permission + audit</dd></div>
                </dl>
                <a href="#audit">View audit history</a>
              </div>
              <section className={styles.archivePanel} aria-labelledby="archive-title">
                <h3 id="archive-title"><Archive size={16} />Archive controls</h3>
                <dl>
                  {archiveItems.map((item) => (
                    <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
                  ))}
                  <div><dt>Legal hold</dt><dd>Blocks destructive cleanup</dd></div>
                  <div><dt>Delete</dt><dd>Disabled in milestones 1-8</dd></div>
                </dl>
              </section>
            </section>
          </div>
        </main>
      </div>
    </section>
  );
}
