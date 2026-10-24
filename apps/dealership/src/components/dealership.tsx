"use client";

import Image from "next/image";
import { publicPath } from "../lib/paths";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, CarFront, ChevronRight, FileText, Heart, House, Menu, MessageSquare, Plus, Search, Settings2, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { availabilityLabel, mayStartPurchase, money, type Listing, type PublicSnapshot, type RequestKind } from "../lib/domain";
import { command, RequestFlow, UnavailableStep, VehicleEntry } from "./request-flow";
import { InventorySearch } from "./inventory-search";
import { AppraisalFlow, SavedAppraisal } from "./appraisal-flow";

type AccountRecord = { id: string; kind: string; data: Record<string, unknown>; createdAt: string };
function WebsiteLogo({ priority = false }: { priority?: boolean }) {
  return <Image src={publicPath("/brand/time-motor-sales-horizontal.png")} alt="Time Motor Sales" width={1200} height={225} className="brand-logo" sizes="(max-width: 760px) 200px, 240px" priority={priority} unoptimized />;
}

const quickLinks = [
  { href: "/garage/saved", label: "Saved vehicles", icon: Heart },
  { href: "/garage/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/garage/documents", label: "Documents", icon: FileText },
  { href: "/garage/messages", label: "Messages", icon: MessageSquare },
  { href: "/garage/history", label: "Service history", icon: Wrench }
];

export function Dealership({ route, snapshot, paymentPreview }: { route: string; snapshot: PublicSnapshot; paymentPreview?: ReactNode }) {
  const pathname = usePathname().replace(/^\/website-review(?=\/|$)/, "") || "/";
  const search = useSearchParams();
  const router = useRouter();
  const preview = snapshot.source === "PREVIEW";
  const [account, setAccount] = useState<AccountRecord[]>([]);
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(preview);
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const refresh = () => { setAccountLoading(true); setRevision(current => current + 1); };

  useEffect(() => {
    if (route === "shop") {
      const previous = sessionStorage.getItem("tms:inventory-position");
      if (previous) requestAnimationFrame(() => window.scrollTo(0, Number(previous)));
    }
  }, [pathname, route]);

  useEffect(() => {
    if (!preview) return;
    let active = true;
    fetch(publicPath("/api/preview"), { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("We could not load your preview records. This is not an empty account.");
      return response.json();
    }).then(result => { if (active) { setAccount(result.records); setAccountError(""); } }).catch(problem => { if (active) setAccountError(problem.message); }).finally(() => { if (active) setAccountLoading(false); });
    return () => { active = false; };
  }, [preview, revision]);

  const saved = account.filter(record => record.kind === "SAVED").map(record => String(record.data.vehicleId));
  const requests = account.filter(record => record.kind === "REQUEST");
  const owned = account.filter(record => record.kind === "VEHICLE");
  const knownVehicle = owned.find(record => record.id === search.get("owned"));
  const initialVehicle = knownVehicle ? Object.fromEntries(Object.entries(knownVehicle.data).filter(([field, value]) => ["vin", "year", "make", "model", "mileage"].includes(field) && typeof value === "string")) as Record<string, string> : undefined;
  const listing = snapshot.listings.find(vehicle => vehicle.id === (route.startsWith("vehicles/") ? route.split("/")[1] : search.get("vehicle")));

  async function save(vehicle: Listing) {
    if (saving) return;
    setSaving(true);
    try { await command(saved.includes(vehicle.id) ? "UNSAVE" : "SAVE", vehicle.id); refresh(); setFeedback(saved.includes(vehicle.id) ? "Removed from this preview's saved vehicles." : "Saved in this browser's preview. Cross-device account access is not connected."); }
    catch (problem) { setFeedback(problem instanceof Error ? problem.message : "Could not save. Please retry."); }
    finally { setSaving(false); }
  }

  function picture(vehicle: Listing, large = false) {
    return vehicle.photo ? <Image src={publicPath(vehicle.photo)} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}${preview ? " — illustrative preview image" : ""}`} width={1536} height={1024} priority={large} unoptimized={preview} sizes={large ? "(max-width: 760px) 100vw, 65vw" : "(max-width: 760px) 100vw, 33vw"} className="vehicle-photo" /> : <div className="photo-placeholder"><CarFront size={48} /><span>Approved photos pending</span></div>;
  }

  function card(vehicle: Listing) {
    const href = `/vehicles/${vehicle.id}?from=${encodeURIComponent(`/shop${search.size ? `?${search}` : ""}`)}`;
    return <article className="vehicle-card" key={vehicle.id}><div className="photo-wrap"><Link href={href} onClick={() => { if (route === "shop") sessionStorage.setItem("tms:inventory-position", String(window.scrollY)); }} tabIndex={-1} aria-hidden="true">{picture(vehicle)}</Link><button type="button" className={`save ${saved.includes(vehicle.id) ? "selected" : ""}`} aria-label={`${saved.includes(vehicle.id) ? "Unsave" : "Save"} ${vehicle.year} ${vehicle.make} ${vehicle.model}`} aria-pressed={saved.includes(vehicle.id)} onClick={() => void save(vehicle)} disabled={!preview || saving} title={!preview ? "Secure account saving is not connected" : undefined}><Heart size={19} />{saved.includes(vehicle.id) ? "Saved" : "Save"}</button></div><div className="vehicle-card-body"><h3>{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="muted">{vehicle.trim} · {vehicle.mileage.toLocaleString()} miles</p><div className="row between"><strong className="price">{money(vehicle.price)}</strong><span className={`pill ${vehicle.availability === "AVAILABLE" ? "available" : "neutral"}`}>{availabilityLabel[vehicle.availability]}</span></div><Link className="text-link" href={href} onClick={() => { if (route === "shop") sessionStorage.setItem("tms:inventory-position", String(window.scrollY)); }}>View vehicle<ArrowRight size={17} /></Link></div></article>;
  }

  function empty(title: string, description: string, action?: ReactNode) {
    return <div className="empty panel"><CarFront size={36} /><h2>{title}</h2><p>{description}</p>{action}</div>;
  }

  function accountGuard(content: ReactNode) {
    if (!preview) return <section className="container narrow stack"><p className="eyebrow">My Garage</p><h1>Your private space.</h1><UnavailableStep title="Secure account access is not connected yet" description="Email sign-in, cross-device saving and private dealership records need verified identity, email delivery and account-linking controls. No account has been created." /><p>You can still browse public listings. Live customer-request delivery also remains unconfigured.</p><Link href="/shop" className="button primary">Browse vehicles<ArrowRight size={18} /></Link></section>;
    if (accountLoading) return <section className="container narrow" aria-live="polite"><h1>Loading your preview Garage…</h1><p>Checking this browser&apos;s records.</p></section>;
    if (accountError) return <section className="container narrow stack"><h1>We could not load your Garage.</h1><p role="alert">{accountError}</p><button className="button primary" onClick={refresh}>Retry loading</button></section>;
    return content;
  }

  let content: ReactNode;
  if (!route) {
    content = <><section className="container hero"><div className="hero-copy"><p className="eyebrow">Time Motor Sales · Minnesota</p><h1>Find your<br className="desktop-break" /> next vehicle.</h1><p className="lead">Simple shopping. Real people.</p><form action={publicPath("/shop")} className="hero-search"><label className="search-input"><Search aria-hidden size={22} /><span className="sr-only">Search make, model or keyword</span><input name="q" placeholder="Make, model or keyword" /></label><button className="button primary" type="submit">Shop vehicles<ArrowRight size={20} /></button></form><Link href="/budget" className="text-link">Shop by Payment<ArrowRight size={17} /></Link></div><div className="hero-image">{preview ? <Image src={publicPath("/api/sample-media/rav4")} width={1536} height={1024} alt="Illustrative Toyota crossover beside the Minneapolis riverfront" priority unoptimized={preview} sizes="(max-width: 760px) 100vw, 55vw" /> : <div className="brand-surface"><CarFront size={96} /><span>Your next chapter starts here.</span></div>}{preview && <span className="image-note">Illustrative photography</span>}</div></section><section className="container secondary-actions"><Link className="panel row" href="/sell"><CarFront size={30} /><span><strong>Sell / Trade</strong><small>Submit your vehicle for staff review.</small></span><ChevronRight className="push" /></Link><Link className="panel row" href="/service"><Wrench size={30} /><span><strong>Request Service</strong><small>Request a visit with our service team.</small></span><ChevronRight className="push" /></Link></section><section className="container section"><div className="section-heading"><h2>Featured vehicles</h2><Link href="/shop" className="text-link">See all<ArrowRight size={17} /></Link></div>{snapshot.error ? <div role="alert" className="notice">{snapshot.error}</div> : snapshot.listings.length ? <div className="vehicle-grid">{snapshot.listings.filter(vehicle => vehicle.availability !== "SOLD").slice(0, 3).map(card)}</div> : empty("Inventory is not connected yet", "Only approved published vehicles will appear here. No example vehicle is being presented as live inventory.", <Link className="button" href="/how-it-works">How buying works</Link>)}</section><section className="container calm-section"><ShieldCheck size={28} /><h2>At your pace.<br />With people when you need them.</h2><p>Explore a vehicle, prepare your next steps, and keep the details together.</p><Link href="/how-it-works" className="text-link">How buying works<ArrowRight size={17} /></Link></section></>;
  } else if (route === "shop") {
    content = <InventorySearch snapshot={snapshot} renderCard={card} />;
  } else if (route.startsWith("vehicles/") && listing) {
    const back = search.get("from")?.startsWith("/shop?") ? search.get("from")! : "/shop";
    content = <section className="container section stack"><Link className="text-link" href={back}><ArrowLeft size={17} />Back to results</Link><div><h1>{listing.year} {listing.make} {listing.model}</h1><p className="lead">{listing.trim} · {listing.mileage.toLocaleString()} miles{preview ? " · Sample vehicle" : ""}</p></div><div className="detail-grid"><div className="gallery">{picture(listing, true)}<div className="facts"><span><CarFront />{listing.drivetrain}</span><span><Settings2 />{listing.transmission}</span><span>{listing.mileage.toLocaleString()}<small>miles</small></span></div><details className="panel"><summary>Vehicle details</summary><dl className="review-list">{["body", "drivetrain", "transmission", "fuel"].map(field => <div key={field}><dt>{field}</dt><dd>{String(listing[field as keyof Listing])}</dd></div>)}</dl></details><details className="panel"><summary>Condition and history</summary><p>No customer-publishable inspection or history summary is connected to this listing yet. No clean-title, accident or inspection claim is inferred.</p></details></div><aside className="purchase-panel panel stack"><div className="row between"><strong className="detail-price">{money(listing.price)}</strong><span className={`pill ${listing.availability === "AVAILABLE" ? "available" : "neutral"}`}>{availabilityLabel[listing.availability]}</span></div><p className="muted small">Cash price. Tax and fee estimates are not configured.</p>{mayStartPurchase(listing) ? <Link href={`/purchase?vehicle=${listing.id}`} className="button primary">Start purchase<ArrowRight size={18} /></Link> : <div className="notice">This vehicle cannot start a purchase in its current state. You can ask the sales team for information.</div>}<p className="small muted">Begin preparation. No charge or reservation.</p><Link href={`/purchase?vehicle=${listing.id}&kind=QUESTION`} className="button"><MessageSquare size={19} />Ask a question</Link><Link href={`/purchase?vehicle=${listing.id}&kind=TEST_DRIVE`} className="button"><CalendarDays size={19} />Request a test drive</Link><button className="text-link" onClick={() => void save(listing)} disabled={!preview || saving}><Heart size={18} />{saved.includes(listing.id) ? "Remove saved vehicle" : "Save vehicle"}</button><Link href="/budget" className="text-link">Shop by Payment<ArrowRight size={17} /></Link></aside></div></section>;
  } else if (route === "sell") {
    content = <AppraisalFlow key={`appraisal:${knownVehicle?.id || ""}`} initialVehicle={initialVehicle} preview={preview} onSaved={refresh} />;
  } else if (route === "service" || route === "purchase" && listing) {
    const kind: RequestKind = route === "service" ? "SERVICE" : search.get("kind") === "QUESTION" ? "QUESTION" : search.get("kind") === "TEST_DRIVE" ? "TEST_DRIVE" : "PURCHASE";
    content = <RequestFlow key={`${route}:${kind}:${listing?.id || ""}:${knownVehicle?.id || ""}`} kind={kind} listing={route === "purchase" ? listing : undefined} initialVehicle={initialVehicle} preview={preview} onSaved={refresh} />;
  } else if (route === "garage/add") {
    content = accountGuard(<section className="container narrow stack"><Link href="/garage" className="text-link"><ArrowLeft size={17} />My Garage</Link><h1>Add a vehicle.</h1><VehicleEntry onReview={async details => { try { await command("VEHICLE", details); refresh(); router.push("/garage"); } catch (problem) { setFeedback(problem instanceof Error ? problem.message : "Could not save the vehicle."); } }} /></section>);
  } else if (route === "garage") {
    content = accountGuard(<section className="container section stack"><div className="section-heading"><div><p className="eyebrow">Your private preview</p><h1>My Garage.</h1><p className="lead">Your vehicles. Your next steps.</p></div><button className="text-link" onClick={async () => { await fetch(publicPath("/api/preview"), { method: "DELETE" }); refresh(); }}>End preview session</button></div><div className="garage-grid"><div className="stack"><div className="notice"><ShieldCheck size={23} /><strong>No action needed.</strong><p>There are no verified staff tasks. Preview requests below have not been delivered to the dealership.</p></div><section className="panel stack"><h2>My Purchase & requests</h2>{requests.length ? requests.map(record => <Link key={record.id} className="request-card" href={`/purchase?reference=${record.id}`}><span><strong>{String(record.data.kind).replaceAll("_", " ")}</strong><small>Saved in preview · Not delivered to staff</small></span><ChevronRight /></Link>) : <><p>No purchase or request saved yet.</p><Link className="text-link" href="/shop">Find your next vehicle<ArrowRight size={17} /></Link></>}</section><section className="panel stack"><div className="section-heading"><h2>My vehicles</h2><Link className="text-link" href="/garage/add"><Plus size={18} />Add a vehicle</Link></div>{owned.length ? owned.map(record => <div className="vehicle-summary" key={record.id}><strong>{String(record.data.year)} {String(record.data.make)} {String(record.data.model)}</strong><small>Entered by you · No dealership records linked</small><div className="row"><Link href={`/service?owned=${record.id}`} className="text-link">Request Service</Link><Link href={`/sell?owned=${record.id}`} className="text-link">Sell / Trade</Link></div></div>) : <><CarFront size={32} /><p>Add a vehicle with VIN scan or manual details. No ownership upload required.</p></>}</section></div><aside className="panel stack"><h2>Quick access</h2>{quickLinks.map(item => <Link key={item.href} href={item.href} className="quick-link"><item.icon size={25} /><span>{item.label}</span><ChevronRight size={18} className="push" /></Link>)}</aside></div></section>);
  } else if (route === "garage/saved") {
    content = accountGuard(<section className="container section stack"><Link href="/garage" className="text-link"><ArrowLeft size={17} />My Garage</Link><h1>Saved vehicles.</h1><p className="lead">Saved is not Reserved. Price and availability can change.</p>{saved.length ? <div className="vehicle-grid">{snapshot.listings.filter(vehicle => saved.includes(vehicle.id)).map(card)}</div> : empty("No saved vehicles yet", "Save a sample listing to try the private preview.", <Link href="/shop" className="button primary">Browse vehicles</Link>)}</section>);
  } else if (route === "purchase") {
    const request = requests.find(record => record.id === search.get("reference"));
    content = accountGuard(<section className="container narrow stack"><Link href="/garage" className="text-link"><ArrowLeft size={17} />My Garage</Link><h1>{request ? "Your request." : "My Purchase."}</h1>{request ? <><div className="notice"><strong>Saved in private preview</strong><p>Not delivered to staff. No verified appointment, hold, finance or sale state exists.</p></div><div className="panel"><strong>Reference</strong><p className="break">{request.id}</p><p>Intended team: {String(request.data.team)}</p></div></> : <p>Select a public vehicle to begin, or open an existing request in My Garage.</p>}<UnavailableStep title="Documents, holds and deposit" description="Secure uploads, record linking, staff approvals, payment amount/refund rules and provider reconciliation must be connected before this step can operate. No files or money are collected." /><UnavailableStep title="Signing & handoff" description="Verified signing support, funding/title/safety checks, approved delivery arrangements and authorized release are required. No sale is marked complete." />{request && <MessageForm reference={request.id} onSaved={refresh} preview={preview} />}<Link className="button" href="/shop">Return to vehicles</Link></section>);
    if (request?.data.kind === "SELL") content = accountGuard(<SavedAppraisal reference={request.id} details={(request.data.details || {}) as Record<string, unknown>} />);
  } else if (route.startsWith("garage/")) {
    const name = quickLinks.find(item => item.href === `/${route}`)?.label ?? "Account tools";
    const messages = account.filter(record => record.kind === "MESSAGE");
    content = accountGuard(<section className="container narrow stack"><Link href="/garage" className="text-link"><ArrowLeft size={17} />My Garage</Link><h1>{name}.</h1>{route === "garage/messages" && messages.length ? messages.map(record => <div key={record.id} className="panel"><p>{String(record.data.text)}</p><small>Preview only · Not sent to staff</small></div>) : <UnavailableStep title={route === "garage/history" ? "No linked history available" : `${name} are not connected`} description={route === "garage/history" ? "Adding a VIN does not unlock dealership history. Missing linked records do not mean a vehicle has never been serviced." : "Private record permissions and actual staff/provider connections are required. No appointment, document or delivery status is fabricated."} />}<Link className="button" href={route === "garage/appointments" ? "/service" : "/garage"}>{route === "garage/appointments" ? "Request a service visit" : "Back to My Garage"}</Link></section>);
  } else if (route === "budget") {
    content = <section className={paymentPreview ? "container section stack" : "container narrow stack"}><Link className="text-link" href="/shop"><ArrowLeft size={17} />Browse vehicles</Link><p className="eyebrow">Optional · No account or credit check</p><h1>Shop by Payment.</h1><p className="lead">Understand the assumptions. Keep the cash price in view.</p>{paymentPreview || <UnavailableStep title="Payment estimates are not configured yet" description="Approved APR, loan term, down-payment, tax and fee assumptions are required. We will not calculate an estimate using guessed terms or present a lender approval." />}<Link className="button primary" href="/shop">Browse by cash price<ArrowRight size={18} /></Link></section>;
  } else if (route === "finance") {
    content = <section className={paymentPreview ? "container section stack" : "container narrow stack"}><p className="eyebrow">Your purchase, your path</p><h1>Explore your options.</h1><p className="lead">Cash, dealership partner financing, or your own bank or credit union.</p>{paymentPreview}{["Cash purchase", "Dealership partner financing", "Your bank or credit union"].map(title => <div key={title} className="panel"><h2>{title}</h2><p>{title === "Dealership partner financing" ? "Partner agreements and the secure application process are not connected. No credit inquiry or application is submitted here." : "Prepare your preferences and discuss the verified funding steps with the sales team once the handoff is connected."}</p></div>)}<Link className="button primary" href="/shop">Find a vehicle<ArrowRight size={18} /></Link><p className="small muted">No guaranteed approval, invented rate or credit-impact promise.</p></section>;
  } else if (route === "how-it-works") {
    content = <section className="container narrow stack"><p className="eyebrow">Clear steps. No surprises.</p><h1>How buying works.</h1>{[["01", "Find your vehicle", "Browse approved inventory, compare the facts and choose a starting point."], ["02", "Prepare your purchase", "Choose a payment path, share your request and review the actual next steps."], ["03", "Work with our team", "Staff confirm availability, terms and any required documents, hold or deposit."], ["04", "Sign and arrange handoff", "Supported signing, verified funding, originals and readiness checks come before vehicle release."]].map(([number, title, description]) => <div key={number} className="panel"><span className="eyebrow">{number}</span><h2>{title}</h2><p>{description}</p></div>)}<div className="notice">This foundation is not ready for live transactions. Providers, customer accounts, staff exchange and financial/operating policies remain release blockers.</div><Link className="button primary" href="/shop">Shop vehicles<ArrowRight size={18} /></Link></section>;
  } else {
    content = <section className="container narrow stack"><p className="eyebrow">Time Motor Sales</p><h1>{route === "contact" ? "Let’s find your next step." : "More ways to get started."}</h1>{[["/shop", "Shop vehicles"], ["/finance", "Finance options"], ["/sell", "Sell / Trade"], ["/service", "Request Service"], ["/how-it-works", "How buying works"], ["/garage", "My Garage"]].map(([href, title]) => <Link className="quick-link panel" key={href} href={href}><span>{title}</span><ArrowRight size={20} className="push" /></Link>)}{route === "contact" && <div className="notice"><strong>Contact details and separate hours need publication approval.</strong><p>We have not invented a phone number, address, service schedule or response promise. Live email, SMS and AI assistance are not connected.</p></div>}</section>;
  }

  return <><div className={`environment-banner ${preview ? "preview" : ""}`}>{preview ? "PRIVATE DESIGN PREVIEW · Sample vehicles and preview-only requests · Not a live dealership service" : "PRE-LAUNCH · Customer services and live transactions are not enabled"}</div><header className="site-header"><Link className="brand-home" href="/" aria-label="Time Motor Sales Home"><WebsiteLogo priority /></Link><nav className="desktop-nav" aria-label="Main navigation">{[["/shop", "Shop"], ["/finance", "Finance"], ["/sell", "Sell / Trade"], ["/how-it-works", "How buying works"], ["/contact", "Contact / Visit"]].map(([href, title]) => <Link href={href} className={pathname === href ? "current" : ""} key={href}>{title}</Link>)}</nav><div className="header-tools"><Link href="/service" className="desktop-service"><Wrench size={18} />Service</Link><Link href="/garage" className="desktop-garage"><CarFront size={20} />My Garage</Link><button className="icon-button mobile-only" aria-expanded={menuOpen} aria-controls="site-menu" aria-label="Open menu" onClick={() => setMenuOpen(current => !current)}><Menu /></button></div></header>{menuOpen && <nav id="site-menu" className="mobile-menu" aria-label="More destinations">{[["/shop", "Shop vehicles"], ["/finance", "Finance"], ["/sell", "Sell / Trade"], ["/service", "Request Service"], ["/how-it-works", "How buying works"], ["/contact", "Contact / Visit"]].map(([href, title]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{title}<ChevronRight size={18} /></Link>)}</nav>}<main id="main">{content}</main><div className={`feedback ${feedback ? "visible" : ""}`} role="status">{feedback}</div><footer className="site-footer"><Link className="brand-home" href="/" aria-label="Time Motor Sales Home"><WebsiteLogo /></Link><p>Simple shopping. Real people.</p><div className="row"><Link href="/how-it-works">Buying process</Link><Link href="/contact">Contact & hours</Link><Link href="/service">Service</Link></div><p className="small muted">{preview ? "Illustrative local design preview. No live inventory or staff delivery." : "Pre-launch implementation. Live capabilities require verified activation."}</p></footer><nav className="bottom-nav" aria-label="Mobile navigation">{[{ href: "/", title: "Home", icon: House, active: !route }, { href: "/shop", title: "Shop", icon: Search, active: route === "shop" || route.startsWith("vehicles/") }, { href: "/garage", title: "Garage", icon: CarFront, active: route.startsWith("garage") || route === "purchase" }, { href: "/more", title: "More", icon: Menu, active: ["more", "contact", "finance", "how-it-works", "sell", "service", "budget"].includes(route) }].map(item => <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={item.active ? "active" : ""}><item.icon size={22} /><span>{item.title}</span></Link>)}</nav></>;
}

function MessageForm({ reference, onSaved, preview }: { reference: string; onSaved: () => void; preview: boolean }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  return <form className="panel stack" onSubmit={async event => {
    event.preventDefault(); setBusy(true); const identifier = key || crypto.randomUUID(); setKey(identifier);
    try { await command("MESSAGE", { reference, text }, identifier); setStatus("Message saved in the local preview only. Not sent to staff."); setText(""); setKey(""); onSaved(); }
    catch (problem) { setStatus(problem instanceof Error ? problem.message : "Could not confirm the message. Your draft has been kept."); }
    finally { setBusy(false); }
  }}><h2>Message preview</h2><label>Your message<textarea value={text} onChange={event => { setText(event.target.value); setKey(""); }} required maxLength={2000} /></label><p className="small muted">Do not include identity documents, bank details or sensitive financial information.</p><button className="button primary" disabled={!preview || busy} type="submit">{busy ? "Saving…" : "Save preview message"}</button><p role="status">{status}</p></form>;
}
