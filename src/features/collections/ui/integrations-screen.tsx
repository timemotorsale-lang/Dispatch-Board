"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { getIntegrationsHealth } from "../server/integrations/registry";
import { callCollections, formatWhen } from "./client-api";
import styles from "./collections.module.css";

type Row = Awaited<ReturnType<typeof getIntegrationsHealth>>[number];
const MODE_BADGE: Record<string, string> = { OFF: "", TEST: "badgeWarn", LIVE: "badgeGood" };

export function IntegrationsScreen({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<{ key: string; ok: boolean; text: string } | null>(null);

  async function test(key: string) {
    setBusy(key); setResult(null);
    try { const r = await callCollections<{ message: string }>("/api/collections/integrations", { key }); setResult({ key, ok: true, text: r.message }); router.refresh(); }
    catch (e) { setResult({ key, ok: false, text: e instanceof Error ? e.message : String(e) }); router.refresh(); }
    finally { setBusy(""); }
  }

  return (
    <>
      <p className={styles.notice}>Each switch is set in the server&apos;s <code>.env</code> file (OFF, TEST or LIVE). In Release 1, LIVE is held at TEST. When an integration is OFF, use the manual way shown on its card. Money, starter, mail and skip-trace calls always need a person&apos;s decision.</p>
      <div className={styles.cards} style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {rows.map(r => (
          <section key={r.key} className={styles.card} aria-labelledby={`int-${r.key}`}>
            <h2 id={`int-${r.key}`} style={{ fontSize: 17 }}>{r.name}</h2>
            <p><span className={`${styles.badge} ${MODE_BADGE[r.mode] ? styles[MODE_BADGE[r.mode]] : ""}`}>{r.mode}</span>{r.requested === "LIVE" && r.mode === "TEST" ? <span className={styles.muted}> (LIVE requested; held at TEST in Release 1)</span> : null} · {r.release}</p>
            <p>{r.purpose}</p>
            <p className={styles.muted}><strong>Manual way:</strong> {r.fallback}</p>
            <p className={styles.muted}>Switch: <code>{r.envVar}</code></p>
            <p className={styles.muted}>Last 30 days: {r.calls30} call{r.calls30 === 1 ? "" : "s"}, {r.failures30} failed{r.lastSuccessAt ? ` · last success ${formatWhen(r.lastSuccessAt)}` : ""}{r.lastFailureAt ? ` · last failure ${formatWhen(r.lastFailureAt)}` : ""}</p>
            {r.lastError ? <p className={styles.warning}>Last error: {r.lastError}</p> : null}
            <div className={styles.actions}>
              <button type="button" disabled={Boolean(busy) || r.mode !== "TEST"} title={r.mode !== "TEST" ? "Turn it to TEST first" : undefined} onClick={() => void test(r.key)}>{busy === r.key ? "Testing…" : r.sample}</button>
            </div>
            {result?.key === r.key ? <p className={result.ok ? styles.notice : styles.error} role={result.ok ? "status" : "alert"}>{result.text}</p> : null}
          </section>
        ))}
      </div>
    </>
  );
}
