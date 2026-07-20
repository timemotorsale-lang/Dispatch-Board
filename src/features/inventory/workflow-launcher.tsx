"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPlus,
  Grid2X2,
  List,
  ListChecks,
  Search,
  ShieldCheck,
  Star,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { InventoryOrchestrationProjection } from "@/server/inventory-execution/orchestration-service";
import type { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";

import { WorkflowDecisionGuide } from "./workflow-decision-guide";

type Model = ReturnType<typeof getInventoryWorkflowLauncher>;
type Card = Model["cards"][number];
type Collection = "RECOMMENDED" | "RECENT" | "FAVORITES" | "ALL" | "DRAFTS" | "ATTENTION";
type ViewMode = "CARDS" | "LIST";

const icons: Record<Card["icon"], LucideIcon> = {
  alert: AlertTriangle,
  car: CarFront,
  operations: ListChecks,
  parts: Boxes,
  search: ClipboardCheck,
  shield: CheckCircle2,
  task: ClipboardPlus,
  wrench: Wrench,
};

const recommendedIds = ["WL-01", "WL-02A", "WL-03", "WL-C01", "WL-05", "WL-09"];

const displayMetadata: Record<string, { description?: string; tags: string[] }> = {
  "WL-01": { description: "Create a vehicle and begin inventory intake.", tags: ["5–8 min", "No approval"] },
  "WL-02A": { description: "Move a received vehicle into governed recon work.", tags: ["Vehicle required", "Manager plan"] },
  "WL-03": { description: "Open an inspection with required checks and evidence.", tags: ["Vehicle required", "10–15 min"] },
  "WL-C01": { description: "Create parts demand linked to vehicle or repair work.", tags: ["Context required", "Approval may apply"] },
  "WL-05": { description: "Launch governed repair intake and planning.", tags: ["Vehicle required", "5 min"] },
  "WL-09": { description: "Run final sale, readiness, and release checks.", tags: ["Manager access", "Approval required"] },
};

const collectionTabs: Array<{ id: Exclude<Collection, "ATTENTION">; label: string }> = [
  { id: "RECOMMENDED", label: "Recommended" },
  { id: "RECENT", label: "Recent" },
  { id: "FAVORITES", label: "Favorites" },
  { id: "ALL", label: "All Workflows" },
  { id: "DRAFTS", label: "My Drafts" },
];

const defaultOrchestration: InventoryOrchestrationProjection = {
  status: "UNAVAILABLE",
  generatedAt: new Date(0).toISOString(),
  mode: "ADVISORY",
  policy: "No recommendation is produced without its authoritative work source.",
  ranked: [],
  reason: "Orchestration projection was not supplied.",
};

function searchText(card: Card) {
  return [card.id, card.title, card.description, card.state, ...card.creates].join(" ").toLocaleLowerCase();
}

function metadata(card: Card) {
  const configured = displayMetadata[card.id];
  if (configured) return configured;
  const contextTag = card.context === "NONE" ? "Ready to start" : card.enabled ? "Context attached" : "Context required";
  const approvalTag = card.approval.toLocaleLowerCase().includes("manager") ? "Manager governed" : "Domain governed";
  return { tags: [contextTag, approvalTag] };
}

function collectionCopy(collection: Collection, query: string) {
  if (query) return { title: "Search results", subtitle: "Matching the current Inventory workflow catalog." };
  if (collection === "ALL") return { title: "All Inventory workflows", subtitle: "Every workflow visible for your role and current context." };
  if (collection === "RECENT") return { title: "Recent workflows", subtitle: "Workflows opened during this launcher session." };
  if (collection === "FAVORITES") return { title: "Favorite workflows", subtitle: "Your selected shortcuts for this launcher session." };
  if (collection === "DRAFTS") return { title: "My drafts", subtitle: "Saved workflow intakes will appear here when draft support is released." };
  if (collection === "ATTENTION") return { title: "Needs attention", subtitle: "Visible workflows waiting for required operating context." };
  return { title: "Recommended for you", subtitle: "Based on your console, role, and current inventory priorities." };
}

function emptyCopy(collection: Collection, query: string) {
  if (query) return { title: "No matching workflows", detail: "Try a workflow name, outcome, VIN, stock number, customer, or repair-order term." };
  if (collection === "RECENT") return { title: "No recent workflows yet", detail: "A workflow will appear here after you open it from this page." };
  if (collection === "FAVORITES") return { title: "No favorites yet", detail: "Select the star on a workflow to keep it close during this session." };
  if (collection === "DRAFTS") return { title: "No workflow drafts", detail: "Draft persistence is not released yet; no draft work is being implied." };
  return { title: "No workflows in this view", detail: "Change the collection or clear the current search." };
}

export function WorkflowLauncher({ model, orchestration = defaultOrchestration }: { model: Model; orchestration?: InventoryOrchestrationProjection }) {
  const [collection, setCollection] = useState<Collection>("RECOMMENDED");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("CARDS");

  const cards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    let source = model.cards;

    if (normalizedQuery) source = source.filter(card => searchText(card).includes(normalizedQuery));
    else if (collection === "RECOMMENDED") source = recommendedIds.map(id => source.find(card => card.id === id)).filter((card): card is Card => Boolean(card));
    else if (collection === "RECENT") source = recent.map(id => source.find(card => card.id === id)).filter((card): card is Card => Boolean(card));
    else if (collection === "FAVORITES") source = source.filter(card => favorites.includes(card.id));
    else if (collection === "DRAFTS") source = [];
    else if (collection === "ATTENTION") source = source.filter(card => !card.enabled);

    return source;
  }, [collection, favorites, model.cards, query, recent]);

  const copy = collectionCopy(collection, query.trim());
  const empty = emptyCopy(collection, query.trim());
  const roleLabel = model.actor.roles.length ? model.actor.roles.join(", ") : "Staff";

  function chooseCollection(next: Collection) {
    setCollection(next);
    setQuery("");
  }

  function remember(cardId: string) {
    setRecent(current => [cardId, ...current.filter(id => id !== cardId)].slice(0, 8));
  }

  function toggleFavorite(cardId: string) {
    setFavorites(current => current.includes(cardId) ? current.filter(id => id !== cardId) : [...current, cardId]);
  }

  return (
    <section className="enterprise-workflow-launcher">
      <header className="ewl-hero">
        <div>
          <p>Inventory Console</p>
          <h1>Start Workflow</h1>
          <span>Choose the right workflow and get work moving.</span>
        </div>
        <Link href="/vehicles"><ArrowLeft size={16} />Back to Inventory</Link>
      </header>

      <div className="ewl-controls">
        <label className="ewl-search">
          <Search size={20} />
          <span className="sr-only">Search workflows</span>
          <input
            onChange={event => setQuery(event.target.value)}
            placeholder="Search workflows, VIN, stock #, customer, or repair order…"
            type="search"
            value={query}
          />
        </label>
        <div aria-label="Workflow scope" className="ewl-segmented">
          <button aria-pressed="true" type="button">This Console</button>
          <button aria-disabled="true" disabled title="All CCC becomes available after enterprise registry onboarding." type="button">All CCC</button>
        </div>
        <div aria-label="Presentation" className="ewl-segmented ewl-view-toggle">
          <button aria-pressed={view === "CARDS"} onClick={() => setView("CARDS")} type="button"><Grid2X2 size={17} />Cards</button>
          <button aria-pressed={view === "LIST"} onClick={() => setView("LIST")} type="button"><List size={17} />List</button>
        </div>
      </div>

      <div className="ewl-collections">
        <div aria-label="Workflow collections" role="tablist">
          {collectionTabs.map(tab => (
            <button
              aria-selected={!query && collection === tab.id}
              key={tab.id}
              onClick={() => chooseCollection(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="ewl-attention" onClick={() => chooseCollection("ATTENTION")} type="button">
          Needs Attention <b>{model.totals.unavailable}</b><ArrowRight size={16} />
        </button>
      </div>

      <div className="ewl-context" role="status">
        <ShieldCheck size={18} />
        <span><strong>{roleLabel} access</strong><i>·</i>{model.totals.visible} Inventory workflows<i>·</i>{model.totals.available} available now</span>
      </div>

      <div className="ewl-catalog-heading">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>

      {cards.length ? view === "CARDS" ? (
        <div className="ewl-card-grid">
          {cards.map(card => (
            <WorkflowCard
              card={card}
              favorite={favorites.includes(card.id)}
              key={card.id}
              onFavorite={() => toggleFavorite(card.id)}
              onOpen={() => remember(card.id)}
            />
          ))}
        </div>
      ) : (
        <WorkflowList cards={cards} favorites={favorites} onFavorite={toggleFavorite} onOpen={remember} />
      ) : (
        <div className="ewl-empty"><Search size={22} /><div><h3>{empty.title}</h3><p>{empty.detail}</p></div></div>
      )}

      <details className="ewl-recommendation">
        <summary><span><span className="ewl-help">?</span>Not sure what to start? <strong>Get a recommendation</strong></span><ArrowRight size={18} /></summary>
        <WorkflowDecisionGuide model={orchestration} />
      </details>
    </section>
  );
}

function WorkflowCard({ card, favorite, onFavorite, onOpen }: { card: Card; favorite: boolean; onFavorite: () => void; onOpen: () => void }) {
  const Icon = icons[card.icon];
  const presentation = metadata(card);
  return (
    <article className={`ewl-card${card.enabled ? "" : " is-disabled"}`}>
      <div className="ewl-card-main">
        <span className="ewl-card-icon"><Icon size={29} /></span>
        <div>
          <h3>{card.title}</h3>
          <p>{presentation.description ?? card.description}</p>
          <div className="ewl-tags">{presentation.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        </div>
        <button aria-label={`${favorite ? "Remove" : "Add"} ${card.title} ${favorite ? "from" : "to"} favorites`} aria-pressed={favorite} className="ewl-favorite" onClick={onFavorite} type="button"><Star fill={favorite ? "currentColor" : "none"} size={19} /></button>
      </div>
      <div className="ewl-card-footer">
        <span>Inventory</span>
        {card.href ? <Link href={card.href} onClick={onOpen}>Start</Link> : <button disabled type="button">Add context</button>}
      </div>
      <details className="ewl-card-details">
        <summary>View details</summary>
        <div><p><strong>Intake contract:</strong> {card.creates.join(" · ")}</p><p><strong>Validation:</strong> {card.validation}</p><p><strong>Confirmation:</strong> {card.confirmation}</p><p><strong>Approval:</strong> {card.approval}</p><p><strong>Recovery:</strong> {card.recovery}</p><small>{card.id} · {card.state}</small></div>
      </details>
    </article>
  );
}

function WorkflowList({ cards, favorites, onFavorite, onOpen }: { cards: Card[]; favorites: string[]; onFavorite: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div className="ewl-list-wrap">
      <table className="ewl-list">
        <thead><tr><th>Workflow</th><th>Category</th><th>Context</th><th>Availability</th><th>Approval</th><th><span className="sr-only">Action</span></th></tr></thead>
        <tbody>{cards.map(card => {
          const Icon = icons[card.icon];
          const presentation = metadata(card);
          return <tr key={card.id}>
            <td><span className="ewl-list-title"><Icon size={19} /><span><strong>{card.title}</strong><small>{presentation.description ?? card.description}</small></span></span></td>
            <td>Inventory</td>
            <td>{presentation.tags[0]}</td>
            <td><span className={`ewl-state ${card.enabled ? "available" : "context"}`}>{card.enabled ? "Available" : "Context required"}</span></td>
            <td>{presentation.tags[1]}</td>
            <td><div className="ewl-list-actions"><button aria-label={`${favorites.includes(card.id) ? "Remove" : "Add"} ${card.title} favorite`} onClick={() => onFavorite(card.id)} type="button"><Star fill={favorites.includes(card.id) ? "currentColor" : "none"} size={17} /></button>{card.href ? <Link href={card.href} onClick={() => onOpen(card.id)}>Start</Link> : <button disabled type="button">Add context</button>}</div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}
