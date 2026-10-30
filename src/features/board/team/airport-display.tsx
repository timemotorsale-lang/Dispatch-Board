"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DispatchTeam } from "@/lib/dispatch-team";
import { displayPageSize, sourceDelayed, teamBlockers } from "@/lib/dispatch-display";
import { TeamOperationsRows } from "./team-now";
import { SourceFreshness } from "./source-freshness";
import styles from "./team-now.module.css";

export function AirportDisplay({ data, now, error, filtered, onClose }: { data: DispatchTeam; now: string; error: string; filtered: boolean; onClose: () => void }) {
  const [page, setPage] = useState(0), [size, setSize] = useState(() => displayPageSize(window.innerHeight));
  const panel = useRef<HTMLElement | null>(null), close = useEffectEvent(onClose);
  const count = Math.max(1, Math.ceil(data.rows.length / size)), current = page % count;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const resize = () => setSize(displayPageSize(window.innerHeight));
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const timer = window.setInterval(() => setPage(value => value + 1), 20000);
    window.addEventListener("resize", resize); document.addEventListener("keydown", keydown);
    return () => { window.clearInterval(timer); window.removeEventListener("resize", resize); document.removeEventListener("keydown", keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const pageData = { ...data, rows: data.rows.slice(current * size, (current + 1) * size) };
  return createPortal(<section ref={panel} role="dialog" aria-modal="true" aria-label="Live operations display" className={styles.display}>
    <header className={styles.header}><div><span>Time Motor Sales · {data.date}{data.historical ? " · Historical view" : " · Live operations"}</span><h1>Team operations</h1></div><button onClick={onClose}>Exit display mode</button></header>
    <div className={styles.displaySummary}><span>{data.rows.length} people{filtered ? " · Filtered view" : ""}</span><span>{data.rows.filter(row => row.state === "WORKING").length} working</span><span>{data.rows.filter(row => teamBlockers(row).length > 0).length} people need help</span><SourceFreshness label="Team" at={data.syncedAt} now={now} error={error} timezone={data.timezone} /></div>
    {sourceDelayed(data.syncedAt, now, error) ? <p role="status" className={styles.error}>Updates delayed. Showing the last successfully received records.</p> : null}
    <div className={styles.displayRows}><TeamOperationsRows data={pageData} now={now} /></div>
    <footer className={styles.displayFooter}><span>Page {current + 1} of {count} · Automatic page change every 20 seconds · Esc to exit</span><div><button aria-label="Previous display page" disabled={count === 1} onClick={() => setPage(value => (value % count + count - 1) % count)}>Previous</button><button aria-label="Next display page" disabled={count === 1} onClick={() => setPage(value => value + 1)}>Next</button></div></footer>
  </section>, document.body);
}
