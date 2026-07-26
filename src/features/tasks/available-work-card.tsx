"use client";

import { ArrowRight, BriefcaseBusiness, CircleHelp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Recommendation = {
  id: string;
  rank: number;
  score: number;
  explanation: string;
  task: { id: string; title: string; description: string; dueAt: string; priority: string; workflowArea: string };
};

export function AvailableWorkCard({ boardDate }: { boardDate: string }) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadRecommendations() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/my-day/available-work?date=${encodeURIComponent(boardDate)}`);
      const result = await response.json().catch(() => null) as { recommendations?: Recommendation[]; error?: string } | null;
      if (!response.ok || !result?.recommendations) return setMessage(result?.error ?? "Unable to find available work.");
      setRecommendations(result.recommendations);
      setMessage(result.recommendations.length ? null : "No eligible work is available right now. Your manager can see that direction may be needed.");
    });
  }

  function claim(recommendation: Recommendation) {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/my-day/available-work/${encodeURIComponent(recommendation.id)}`, { method: "POST" });
      const result = await response.json().catch(() => null) as { claim?: { destination?: string }; error?: string } | null;
      if (!response.ok) return setMessage(result?.error ?? "This work is no longer available.");
      setRecommendations((current) => current.filter((item) => item.id !== recommendation.id));
      setMessage(`${recommendation.task.title} is now assigned to you.`);
      if (result?.claim?.destination) {
        router.push(result.claim.destination);
      } else {
        router.refresh();
      }
    });
  }

  function dismiss(recommendation: Recommendation, reasonCode: string) {
    if (!reasonCode) return;
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/my-day/available-work/${encodeURIComponent(recommendation.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonCode })
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) return setMessage(result?.error ?? "Unable to update this recommendation.");
      setRecommendations((current) => current.filter((item) => item.id !== recommendation.id));
      setMessage("Recommendation declined. Your manager can use this context to provide a better fit or direction.");
    });
  }

  return <section className="available-work-card" aria-label="Recommended next work">
    <header><div><span className="eyebrow">Available work</span><h2><BriefcaseBusiness size={18} /> Recommended Next Work</h2><p>Request eligible work when you are ready for another assignment.</p></div><button className="pill pill-secondary" disabled={pending} onClick={loadRecommendations} type="button">{pending ? "Checking..." : "Find next work"}</button></header>
    {recommendations.length ? <div className="available-work-list">{recommendations.map((recommendation) => <article key={recommendation.id}><div className="available-work-rank">{recommendation.rank}</div><div><strong>{recommendation.task.title}</strong><p>{recommendation.explanation}</p><small>{recommendation.task.priority} · {recommendation.task.workflowArea.replaceAll("_", " ")} · due {new Date(recommendation.task.dueAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div><div className="available-work-actions"><button disabled={pending} onClick={() => claim(recommendation)} type="button">Claim <ArrowRight size={13} /></button><label><CircleHelp size={13} /><select aria-label={`Decline ${recommendation.task.title}`} defaultValue="" disabled={pending} onChange={(event) => dismiss(recommendation, event.target.value)}><option value="">Not a fit</option><option value="NEED_MANAGER_DIRECTION">Need manager direction</option><option value="LACK_CONTEXT">Need more context</option><option value="NOT_AVAILABLE">Not available</option><option value="OTHER">Other</option></select></label></div></article>)}</div> : null}
    {message ? <p className="available-work-message" role="status">{message}</p> : null}
  </section>;
}
