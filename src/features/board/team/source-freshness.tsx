"use client";
import { useEffect, useState } from "react";
import { fullTimestamp, relativeTime, sourceDelayed } from "@/lib/dispatch-display";
import styles from "./team-now.module.css";

export function useBoardClock() {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const update = () => setNow(new Date().toISOString());
    const timer = window.setInterval(update, 15000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  return now;
}
export function SourceFreshness({ label, at, now, error, timezone }: { label: string; at: string | null; now: string; error?: string; timezone?: string }) {
  const delayed = sourceDelayed(at, now, error);
  return <span role={delayed ? "status" : undefined} className={delayed ? styles.sourceDelayed : styles.sourceCurrent}>
    <strong>{label}: </strong>{delayed ? "Updates delayed · " : ""}{at ? <time dateTime={at} title={fullTimestamp(at, timezone)}>refreshed {relativeTime(at, now).toLocaleLowerCase()}</time> : error ? "Unavailable" : "Loading"}
    {error ? <span> · {error}</span> : null}
  </span>;
}
