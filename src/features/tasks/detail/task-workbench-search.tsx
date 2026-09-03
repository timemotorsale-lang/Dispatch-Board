"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type TaskSearchResult = {
  assignedUserName: string;
  dueAt: string;
  id: string;
  matchedOn: string;
  priority: string;
  sourceType: string;
  status: string;
  title: string;
  workflowArea: string;
};

type TaskWorkbenchSearchProps = {
  currentTaskId: string;
  returnTo: string;
  view: "simple" | "workbench";
};

function formatTaskDisplayNumber(taskId: string) {
  const compactTaskId = taskId.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return compactTaskId ? `TMS-${compactTaskId.slice(-6)}` : "TMS-0000";
}

function formatLabel(value: string) {
  return value.toLocaleLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Due date needs review";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function taskHref(taskId: string, view: "simple" | "workbench", returnTo: string) {
  const params = new URLSearchParams({ view });
  if (returnTo && returnTo !== "/tasks") params.set("returnTo", returnTo);
  return `/tasks/${encodeURIComponent(taskId)}?${params.toString()}`;
}

export function TaskWorkbenchSearch({ currentTaskId, returnTo, view }: TaskWorkbenchSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaskSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchAbort = useRef<AbortController | null>(null);
  const trimmedQuery = query.trim();
  const open = trimmedQuery.length > 1;
  const currentFilteredResults = useMemo(() => results.filter((item) => item.id !== currentTaskId), [currentTaskId, results]);

  useEffect(() => {
    searchAbort.current?.abort();

    if (!open) {
      setResults([]);
      setStatus("idle");
      setActiveIndex(0);
      return;
    }

    const controller = new AbortController();
    searchAbort.current = controller;
    setStatus("loading");

    const timeout = window.setTimeout(() => {
      fetch(`/api/tasks/search?query=${encodeURIComponent(trimmedQuery)}&limit=10`, {
        cache: "no-store",
        signal: controller.signal
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error ?? "Task search is temporarily unavailable.");
          const nextResults = Array.isArray(payload.results) ? payload.results as TaskSearchResult[] : [];
          setResults(nextResults);
          setStatus(nextResults.length ? "ready" : "empty");
          setActiveIndex(0);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResults([]);
          setStatus("error");
        });
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, trimmedQuery]);

  function openTask(taskId: string) {
    router.push(taskHref(taskId, view, returnTo));
  }

  function submitSearch() {
    const target = currentFilteredResults[activeIndex] ?? currentFilteredResults[0];
    if (target) openTask(target.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(0, currentFilteredResults.length - 1)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    }
    if (event.key === "Escape") {
      setQuery("");
    }
  }

  return (
    <div className="etw-search-shell">
      <label className="etw-search">
        <span aria-hidden="true">/</span>
        <input
          aria-autocomplete="list"
          aria-controls="etw-task-search-results"
          aria-expanded={open}
          aria-label="Search tasks by status, customer, vehicle, VIN, or task number"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search status, customer, vehicle, task, VIN..."
          type="search"
          value={query}
        />
      </label>
      {open ? (
        <div className="etw-search-results" id="etw-task-search-results" role="listbox">
          <header>
            <strong>{status === "loading" ? "Searching..." : status === "ready" ? `${currentFilteredResults.length} task match${currentFilteredResults.length === 1 ? "" : "es"}` : "Task search"}</strong>
            <span>Status words work here</span>
          </header>
          {status === "empty" || status === "ready" && currentFilteredResults.length === 0 ? <p>No matching task found. Try completed, in progress, blocked, customer, VIN, or task number.</p> : null}
          {status === "error" ? <p>Task search is temporarily unavailable.</p> : null}
          {currentFilteredResults.map((result, index) => (
            <button
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "active" : undefined}
              key={result.id}
              onClick={() => openTask(result.id)}
              role="option"
              type="button"
            >
              <Search size={15} />
              <span>
                <strong>{result.title}</strong>
                <small>{formatTaskDisplayNumber(result.id)} · {formatLabel(result.status)} · {result.assignedUserName} · Due {formatDue(result.dueAt)}</small>
                <em>{result.matchedOn || `${formatLabel(result.workflowArea)} · ${formatLabel(result.sourceType)}`}</em>
              </span>
              <b>{formatLabel(result.priority)}</b>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
