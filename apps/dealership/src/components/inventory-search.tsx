"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CarFront, ChevronDown, Heart, Search, Settings2, ShieldCheck, Truck, X, Zap } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { filterListings, money, type Listing, type PublicSnapshot } from "../lib/domain";

const styles = [
  { label: "SUVs", field: "body", value: "SUV", icon: CarFront },
  { label: "Sedans", field: "body", value: "Sedan", icon: CarFront },
  { label: "Trucks", field: "body", value: "Truck", icon: Truck },
  { label: "Electric", field: "fuel", value: "Electric", icon: Zap },
  { label: "Hybrids", field: "fuel", value: "Hybrid", icon: Zap },
  { label: "Coupes", field: "body", value: "Coupe", icon: CarFront },
  { label: "Hatchbacks", field: "body", value: "Hatchback", icon: CarFront },
  { label: "Vans", field: "body", value: "Van", icon: Truck }
];
const labels: Record<string, string> = { q: "Search", min: "Min price", max: "Max price", body: "Body type", make: "Make", model: "Model", year: "Year from", mileage: "Max miles", drive: "Drivetrain", fuel: "Fuel", transmission: "Transmission", available: "Available now" };

export function InventorySearch({ snapshot, renderCard }: { snapshot: PublicSnapshot; renderCard: (listing: Listing) => ReactNode }) {
  const search = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchSurface = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchOptions = useRef<HTMLDivElement>(null);
  const restoringFocus = useRef(false);
  const filtersDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!searchOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchSurface.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [searchOpen]);
  const closeSearch = (restoreFocus = false) => {
    setSearchOpen(false);
    if (restoreFocus) {
      restoringFocus.current = true;
      searchInput.current?.focus();
      restoringFocus.current = false;
    }
  };
  const results = filterListings(snapshot.listings, new URLSearchParams(search.toString()));
  const criteria = Array.from(search.entries()).filter(([field, value]) => value && field in labels);
  const options = (field: "body" | "make" | "model" | "drivetrain" | "fuel" | "transmission") => Array.from(new Set(snapshot.listings.filter(vehicle => vehicle.availability !== "SOLD").map(vehicle => vehicle[field]))).filter(Boolean).sort();
  const href = (changes: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(search.toString());
    for (const [field, value] of Object.entries(changes)) if (value) next.set(field, value); else next.delete(field);
    return `/shop${next.size ? `?${next}` : ""}`;
  };
  const navigate = (destination: string) => {
    sessionStorage.removeItem("tms:inventory-position");
    closeSearch();
    if (searchInput.current) searchInput.current.value = new URL(destination, window.location.origin).searchParams.get("q") || "";
    filtersDialog.current?.close();
    setFiltersOpen(false);
    router.push(destination);
  };
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next = new URLSearchParams(search.toString());
    for (const field of ["min", "max", "body", "make", "model", "year", "mileage", "drive", "fuel", "transmission", "available"]) next.delete(field);
    for (const [field, value] of values) if (String(value)) next.set(field, String(value));
    navigate(`/shop?${next}`);
  };
  const searchForm = () => <form className="discovery-search" key={search.get("q")} onSubmit={event => {
    event.preventDefault();
    navigate(href({ q: String(new FormData(event.currentTarget).get("q") || "").trim() }));
  }}><label className="search-input"><Search size={22} aria-hidden="true" /><span className="sr-only">Search inventory</span><input ref={searchInput} name="q" defaultValue={search.get("q") || ""} placeholder="Search make, model, or keyword" aria-controls="vehicle-search-options" aria-describedby="vehicle-search-hint" autoComplete="off" onClick={() => setSearchOpen(true)} onFocus={() => { if (!restoringFocus.current) setSearchOpen(true); }} onKeyDown={event => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!searchOpen) setSearchOpen(true);
      requestAnimationFrame(() => searchOptions.current?.querySelector<HTMLButtonElement>(".suggested-make, .vehicle-style")?.focus());
    }
  }} /></label><button className="button primary" type="submit" aria-expanded={searchOpen} aria-controls="vehicle-search-options" onClick={event => {
    if (!searchOpen) { event.preventDefault(); setSearchOpen(true); searchInput.current?.focus(); }
  }}>Search</button></form>;
  const filterForm = (mobile = false) => <form onSubmit={apply} key={`${search}-${mobile}`} className="discovery-filter-form">
    <div className="filter-heading"><h2 id={mobile ? "mobile-filters-heading" : undefined}>Refine your search</h2>{mobile && <button className="icon-button" type="button" aria-label="Close filters" onClick={() => filtersDialog.current?.close()}><X /></button>}</div>
    <label className="availability-toggle"><span>Available now<small>Hide reserved and coming soon</small></span><input name="available" type="checkbox" value="1" defaultChecked={search.get("available") === "1"} /></label>
    <details open><summary>Price <ChevronDown size={17} /></summary><div className="form-grid"><label>Minimum<input name="min" type="number" min="0" placeholder="$ Min" defaultValue={search.get("min") || ""} /></label><label>Maximum<input name="max" type="number" min="0" placeholder="$ Max" defaultValue={search.get("max") || ""} /></label></div><p className="small muted">Cash prices. No financing approval implied.</p></details>
    <details open={Boolean(search.get("make") || search.get("model"))}><summary>Make & model <ChevronDown size={17} /></summary><label>Make<select name="make" defaultValue={search.get("make") || ""}><option value="">Any make</option>{options("make").map(value => <option key={value}>{value}</option>)}</select></label><label>Model<select name="model" defaultValue={search.get("model") || ""}><option value="">Any model</option>{options("model").map(value => <option key={value}>{value}</option>)}</select></label></details>
    <details open={Boolean(search.get("body"))}><summary>Body type <ChevronDown size={17} /></summary><label>Vehicle type<select name="body" defaultValue={search.get("body") || ""}><option value="">Any type</option>{Array.from(new Set([...options("body"), search.get("body") || ""])).filter(Boolean).map(value => <option key={value}>{value}</option>)}</select></label></details>
    <details open={Boolean(search.get("year") || search.get("mileage"))}><summary>Year & mileage <ChevronDown size={17} /></summary><label>Minimum year<input name="year" type="number" min="1886" max={new Date().getFullYear() + 2} placeholder="Any year" defaultValue={search.get("year") || ""} /></label><label>Maximum mileage<input name="mileage" type="number" min="0" placeholder="Any mileage" defaultValue={search.get("mileage") || ""} /></label></details>
    <details open={Boolean(search.get("drive") || search.get("fuel") || search.get("transmission"))}><summary>Fuel & drivetrain <ChevronDown size={17} /></summary>{([["drive", "Drivetrain", "drivetrain"], ["fuel", "Fuel type", "fuel"], ["transmission", "Transmission", "transmission"]] as const).map(([field, label, source]) => <label key={field}>{label}<select name={field} defaultValue={search.get(field) || ""}><option value="">Any {label.toLowerCase()}</option>{Array.from(new Set([...options(source), search.get(field) || ""])).filter(Boolean).map(value => <option key={value}>{value}</option>)}</select></label>)}</details>
    <div className="filter-actions"><button className="button primary" type="submit">Apply filters</button><button className="text-link" type="button" onClick={() => navigate("/shop")}>Clear all filters</button></div>
  </form>;

  return <section className="container inventory-discovery section">
    <div className="discovery-heading"><div><p className="eyebrow">A better fit starts here</p><h1>Find your next vehicle.</h1><p className="muted">{snapshot.source === "PREVIEW" ? "Explore sample vehicles in our private design preview." : "Browse at your pace. We’re here when you need us."}</p></div><Link className="button" href="/garage/saved"><Heart size={18} />Saved vehicles</Link></div>
    <div className="discovery-layout"><aside className="discovery-filters" aria-label="Inventory filters">{filterForm()}</aside><div className="discovery-results">
      <div className={`discovery-search-surface ${searchOpen ? "search-is-open" : ""}`} ref={searchSurface} onBlur={event => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) closeSearch();
      }} onKeyDown={event => {
        if (event.key === "Escape" && searchOpen) { event.preventDefault(); closeSearch(true); }
      }}>{searchForm()}<p className="search-hint" id="vehicle-search-hint">Search by keyword or explore vehicle styles below.</p>
        <div hidden={!searchOpen} className="search-options-dropdown" id="vehicle-search-options" ref={searchOptions} role="region" aria-label="Vehicle search options">
          <div className="search-options-heading"><h2>Explore your options</h2><button className="icon-button" type="button" aria-label="Close search options" onClick={() => closeSearch(true)}><X size={20} /></button></div>
          {options("make").length > 0 && <div className="suggested-makes"><h3>Shop by make</h3><div className="quick-searches">{options("make").slice(0, 8).map(make => <button className="quick-search suggested-make" key={make} onClick={() => navigate(href({ q: make }))}>{make}</button>)}</div></div>}
          <h3>Vehicle styles</h3><div className="vehicle-styles">{styles.map(style => {
            const count = filterListings(snapshot.listings, new URLSearchParams({ [style.field]: style.value })).length;
            return <button className="vehicle-style" key={style.label} onClick={() => navigate(href({ q: searchInput.current?.value.trim() || null, body: null, fuel: null, [style.field]: style.value }))}><style.icon size={48} /><strong>{style.label}</strong><span>{count} {snapshot.source === "PREVIEW" ? "sample " : ""}{count === 1 ? "vehicle" : "vehicles"}</span></button>;
          })}</div><p className="small muted">Style counts show the whole inventory. Your keywords and other filters stay in place when you choose a style.</p>
        </div>
      </div>
      <div className="quick-searches" aria-label="Quick searches">{[{ label: "Under $20,000", changes: { max: "20000" } }, { label: "Under 50,000 miles", changes: { mileage: "50000" } }, { label: "2020 or newer", changes: { year: "2020" } }, { label: "AWD", changes: { drive: "AWD" } }].map(item => <button key={item.label} className="quick-search" onClick={() => navigate(href(item.changes))}>{item.label}</button>)}</div>
      <div className="discovery-toolbar"><p role="status">{snapshot.source === "UNAVAILABLE" ? "Inventory unavailable" : `${results.length} ${snapshot.source === "PREVIEW" ? "sample " : ""}${results.length === 1 ? "vehicle" : "vehicles"}`}</p><button className="button show-filters" aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={() => { setFiltersOpen(true); filtersDialog.current?.showModal(); }}><Settings2 size={18} />Filters{criteria.length ? ` (${criteria.length})` : ""}</button><label className="sort">Sort by<select value={search.get("sort") || "newest"} onChange={event => navigate(href({ sort: event.target.value }))}><option value="newest">Newest listed</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="mileage">Lowest mileage</option></select></label></div>
      {criteria.length > 0 && <div className="active-criteria" aria-label="Active search filters">{criteria.map(([field, value]) => <button className="chip" key={field} aria-label={`Remove ${labels[field]}: ${value}`} onClick={() => navigate(href({ [field]: null }))}>{labels[field]}: {["min", "max"].includes(field) ? money(Number(value)) : field === "available" ? "Yes" : value}<X size={14} /></button>)}<button className="text-link" onClick={() => navigate("/shop")}>Clear all</button></div>}
      <div className="shopping-reassurance"><ShieldCheck size={21} /><div><strong>Your search. Your pace.</strong><span>Browse without an account. Vehicle details and availability stay clear.</span></div><Link className="text-link" href="/budget">Explore your budget</Link></div>
      {snapshot.error ? <div className="notice" role="alert">{snapshot.error}<button className="text-link" onClick={() => router.refresh()}>Retry loading</button></div> : results.length ? <div className="vehicle-grid">{results.map(renderCard)}</div> : <div className="empty panel"><CarFront size={40} /><h2>{snapshot.source === "UNCONFIGURED" ? "No published feed is connected" : "No matching vehicles"}</h2><p>Your search has not been changed. Try removing a filter, or browse all vehicles.</p><button className="button primary" onClick={() => navigate("/shop")}>Browse all vehicles</button><Link className="text-link" href="/contact">Ask sales for help</Link></div>}
    </div></div>
    <dialog className="filters-dialog" ref={filtersDialog} aria-labelledby="mobile-filters-heading" onClose={() => setFiltersOpen(false)}>{filterForm(true)}</dialog>
  </section>;
}
