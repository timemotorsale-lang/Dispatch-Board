"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { filterListings, replaceListingFilters, type Listing } from "../lib/domain";
import { catalogValue, industryOptions } from "../lib/industry-options";
import { useIndustryCatalog } from "./use-industry-catalog";

type Props = {
  listings: Listing[];
  search: string;
  mobile?: boolean;
  onUpdate: (params: URLSearchParams) => void;
  onClear: () => void;
  onClose: () => void;
};

export function InventoryFilters({ listings, search, mobile = false, onUpdate, onClear, onClose }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ownSearch = useRef(search);
  const [optionSearch, setOptionSearch] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const current = new URLSearchParams(search);
  const pending = current;
  useEffect(() => {
    const values = new URLSearchParams(search);
    const ownUpdate = ownSearch.current === search;
    for (const element of Array.from(formRef.current?.elements || [])) {
      if (!(element instanceof HTMLInputElement) || !element.name) continue;
      if (element.type === "checkbox") element.checked = values.getAll(element.name).some(value => catalogValue(value) === catalogValue(element.value));
      else if (!ownUpdate || document.activeElement !== element) element.value = values.get(element.name) || "";
    }
    return () => clearTimeout(timer.current);
  }, [search]);
  const catalog = useIndustryCatalog(pending.getAll("make"));
  const inventory = listings.filter(vehicle => vehicle.availability !== "SOLD");
  const matching = filterListings(listings, pending).length;
  const read = (form: HTMLFormElement) => replaceListingFilters(current, Array.from(new FormData(form), ([field, value]) => [field, String(value)] as [string, string])).toString();
  const update = (form: HTMLFormElement) => {
    clearTimeout(timer.current);
    if (!form.checkValidity()) return;
    const next = read(form);
    ownSearch.current = next;
    onUpdate(new URLSearchParams(next));
  };
  const clearAll = () => {
    clearTimeout(timer.current);
    for (const element of Array.from(formRef.current?.elements || [])) {
      if (!(element instanceof HTMLInputElement) || !element.name) continue;
      if (element.type === "checkbox") element.checked = false; else element.value = "";
    }
    ownSearch.current = "";
    setOptionSearch({});
    onClear();
  };
  const clearSection = (button: HTMLButtonElement, fields: string[]) => {
    const form = button.form;
    if (!form) return;
    for (const element of Array.from(form.elements)) {
      if (element instanceof HTMLInputElement && fields.includes(element.name)) {
        if (element.type === "checkbox") element.checked = false; else element.value = "";
      }
      if (element instanceof HTMLSelectElement && fields.includes(element.name)) element.value = "";
    }
    update(form);
  };
  const section = (title: string, fields: string[], children: ReactNode, expanded = false) => {
    const selected = fields.reduce((count, field) => count + pending.getAll(field).filter(Boolean).length, 0);
    return <details className="facet-section" key={title} open={expandedSections[title] ?? (expanded || fields.some(field => current.has(field)))} onToggle={event => {
      const open = event.currentTarget.open;
      setExpandedSections(previous => previous[title] === open ? previous : { ...previous, [title]: open });
    }}><summary><span>{title}</span>{selected > 0 && <span className="facet-selected" aria-label={`${selected} selected`}>{selected}</span>}<ChevronDown size={18} /></summary><div className="facet-content">{children}{selected > 0 && <button className="text-link facet-reset" type="button" onClick={event => clearSection(event.currentTarget, fields)}>Reset {title.toLowerCase()}</button>}</div></details>;
  };
  const values = (field: keyof Listing) => [...inventory.flatMap(vehicle => {
    const value = vehicle[field];
    return Array.isArray(value) ? value : typeof value === "string" || typeof value === "number" ? [String(value)] : [];
  }), ...(field in industryOptions ? industryOptions[field as keyof typeof industryOptions] : []), ...(field === "make" ? catalog.makes.map(make => make.name) : field === "model" ? catalog.models.map(model => model.name) : [])].filter(Boolean).sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));
  const choices = (field: string, items: string[], source: keyof Listing, description: string) => {
    const available = Array.from(new Map([...items, ...current.getAll(field), ...pending.getAll(field)].map(value => [catalogValue(value), value])).values()).sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));
    if (!available.length) return <p className="facet-empty">{description}</p>;
    const others = new URLSearchParams(pending.toString());
    if (field !== "feature") others.delete(field);
    const candidates = filterListings(listings, others);
    return <><label className="facet-option-search">Find {field === "make" ? "a make" : field === "model" ? "a model" : "an option"}<input type="search" value={optionSearch[field] || ""} onChange={event => setOptionSearch(previous => ({ ...previous, [field]: event.target.value }))} placeholder={`Search ${field === "make" ? "makes" : field === "model" ? "models" : "options"}…`} /></label><div className="facet-options">{available.map(value => {
      const count = candidates.filter(vehicle => {
        const fact = vehicle[source];
        if (Array.isArray(fact)) return fact.some(item => catalogValue(item) === catalogValue(value));
        return field === "fuel" ? catalogValue(String(fact ?? "")).includes(catalogValue(value)) : catalogValue(String(fact ?? "")) === catalogValue(value);
      }).length;
      const supportsValue = inventory.some(vehicle => Array.isArray(vehicle[source]) ? (vehicle[source] as string[]).some(item => catalogValue(item) === catalogValue(value)) : catalogValue(String(vehicle[source] ?? "")) === catalogValue(value));
      return <label hidden={!value.toLowerCase().includes((optionSearch[field] || "").toLowerCase())} className="facet-option" key={value}><input type="checkbox" name={field} value={value} defaultChecked={current.getAll(field).some(selected => catalogValue(selected) === catalogValue(value))} /><span>{value}{!supportsValue && <small>No matching stock</small>}</span><span className="facet-count" aria-label={`${count} matching vehicles`}>{count}</span></label>;
    })}</div>{!available.some(value => value.toLowerCase().includes((optionSearch[field] || "").toLowerCase())) && <p className="facet-empty">No options match this text.</p>}</>;
  };
  const numberInput = (field: string, title: string, placeholder: string, min = 0, max?: number) => <label>{title}<input name={field} aria-label={title} type="number" min={min} max={max} placeholder={placeholder} defaultValue={current.get(field) || ""} /></label>;

  return <form ref={formRef} onSubmit={event => { event.preventDefault(); update(event.currentTarget); }} className="discovery-filter-form expanded-filter-form" onChange={event => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement) || !field.name) return;
    clearTimeout(timer.current);
    const form = event.currentTarget;
    if (field.type === "number") timer.current = setTimeout(() => update(form), 400);
    else update(form);
  }}>
    <div className="filter-heading"><div><h2 id={mobile ? "mobile-filters-heading" : undefined}>Refine your search</h2><p>Selections update results automatically.</p><p className="filter-match-count" role="status">{matching} matching {matching === 1 ? "vehicle" : "vehicles"}</p><button className="text-link filter-clear-all" type="button" onClick={clearAll}>Clear all filters</button></div>{mobile && <button className="icon-button" type="button" aria-label="Close filters" onClick={onClose}><X /></button>}</div>
    <label className="availability-toggle"><span>Available now<small>Hide reserved and coming soon</small></span><input name="available" type="checkbox" role="switch" value="1" defaultChecked={current.get("available") === "1"} /></label>
    {section("Price & budget", ["min", "max"], <><div className="form-grid">{numberInput("min", "Minimum cash price", "$ Min")}{numberInput("max", "Maximum cash price", "$ Max")}</div><p className="facet-note">Cash price only. Monthly payments depend on financing terms.</p></>, true)}
    {section("Make & model", ["make", "model"], <><p className="facet-note">US-focused NHTSA industry catalog, including historical makes and models. Not limited to dealership stock.</p>{catalog.makeLoading && <p className="facet-note" role="status">Loading industry makes…</p>}{catalog.makeError && <div className="facet-unconnected"><p role="status">{catalog.makeError}</p><button type="button" className="text-link" onClick={catalog.retry}>Retry industry catalog</button></div>}<h3>Make</h3>{choices("make", values("make"), "make", "Industry makes are loading. Please retry if unavailable.")}<h3>Model</h3>{pending.getAll("make").length === 0 && <p className="facet-note">Select a make to browse its industry models.</p>}{catalog.modelLoading && <p className="facet-note" role="status">Loading models for your selected makes…</p>}{catalog.modelError && <div className="facet-unconnected"><p role="status">{catalog.modelError}</p><button className="text-link" type="button" onClick={catalog.retry}>Retry industry models</button></div>}{choices("model", values("model"), "model", "Select a make to load models.")}</>)}
    {section("Body type", ["body"], choices("body", values("body"), "body", "Body styles have not been published yet."))}
    {section("Year & mileage", ["year", "yearMax", "mileageMin", "mileage"], <><div className="form-grid">{numberInput("year", "Minimum year", "From", 1886, new Date().getFullYear() + 2)}{numberInput("yearMax", "Maximum year", "To", 1886, new Date().getFullYear() + 2)}</div><div className="form-grid">{numberInput("mileageMin", "Minimum mileage", "From")}{numberInput("mileage", "Maximum mileage", "To")}</div></>)}
    {section("Delivery & deals", ["priceDrop"], <><label className="facet-option"><input type="checkbox" name="priceDrop" value="1" defaultChecked={current.get("priceDrop") === "1"} /><span>Price drops</span></label><p className="facet-note">Matches only vehicles with a published previous price above today’s price.</p><div className="facet-unconnected"><strong>Delivery terms pending</strong><p>Free shipping is not offered or inferred. Delivery filters need confirmed dealership terms.</p></div></>)}
    {section("Fuel type", ["fuel"], choices("fuel", values("fuel"), "fuel", "Fuel types have not been published yet."))}
    {section("MPG", ["mpg"], <>{numberInput("mpg", "Minimum combined MPG", "Any MPG", 0, 300)}<p className="facet-note">Uses published combined MPG, not an estimate or MPGe. Vehicles without a rating do not match.</p></>)}
    {section("Features", ["feature"], <>{choices("feature", values("features"), "features", "No feature options available.")}<p className="facet-note">Matches all selected features. A choice here does not imply a vehicle has that feature; only published specifications match.</p></>)}
    {section("Exterior color", ["exterior"], choices("exterior", values("exteriorColor"), "exteriorColor", "Exterior colors have not been published yet."))}
    {section("Interior color", ["interior"], choices("interior", values("interiorColor"), "interiorColor", "Interior colors have not been published yet."))}
    {section("Seating capacity", ["seats"], <>{numberInput("seats", "Minimum seats", "Any capacity", 1, 30)}<p className="facet-note">Uses published seating capacity only.</p></>)}
    {section("Drivetrain", ["drive"], choices("drive", values("drivetrain"), "drivetrain", "Drivetrains have not been published yet."))}
    {section("Transmission", ["transmission"], choices("transmission", values("transmission"), "transmission", "Transmissions have not been published yet."))}
    {section("Cylinders", ["cylinders"], choices("cylinders", values("cylinders"), "cylinders", "Engine cylinder counts have not been published yet. No count is inferred from make or model."))}
  </form>;
}
