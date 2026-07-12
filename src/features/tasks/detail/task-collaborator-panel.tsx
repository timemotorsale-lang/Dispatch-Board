"use client";

import { UserPlus, UsersRound, X } from "lucide-react";
import { useState, useTransition } from "react";

import type { ActiveUserSummary } from "@/server/services/user-summary";
import type { TaskReadModel } from "@/server/services/task-read";

export function TaskCollaboratorPanel({ canManage, staff, task }: { canManage: boolean; staff: ActiveUserSummary[]; task: TaskReadModel }) {
  const [collaborators, setCollaborators] = useState(task.collaborators ?? []);
  const [candidate, setCandidate] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function save(nextIds: string[]) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/tasks/${task.id}/collaborators`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collaboratorIds: nextIds }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(payload.error ?? "Unable to update collaborators."); return; }
      setCollaborators(payload.collaborators);
      setCandidate("");
      setMessage("Collaborators updated.");
    });
  }

  const available = staff.filter((user) => user.id !== task.assignedUser.id && !collaborators.some((item) => item.id === user.id));
  return <section className="etw-card etw-collaborator-card"><h2><UsersRound size={16} /> Collaborators <span>{collaborators.length}</span></h2><p>Contributors receive visibility and updates while the owner remains accountable.</p><div className="etw-collaborator-list">{collaborators.map((item) => <article key={item.id}><b>{item.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</b><span><strong>{item.name}</strong><small>{item.isActive ? "Active collaborator" : "Inactive"}</small></span>{canManage ? <button aria-label={`Remove ${item.name}`} disabled={pending} onClick={() => save(collaborators.filter((entry) => entry.id !== item.id).map((entry) => entry.id))} type="button"><X size={13}/></button> : null}</article>)}{!collaborators.length ? <em>No collaborators assigned.</em> : null}</div>{canManage ? <div className="etw-collaborator-add"><select aria-label="Add task collaborator" onChange={(event) => setCandidate(event.target.value)} value={candidate}><option value="">Choose active staff</option>{available.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><button disabled={!candidate || pending} onClick={() => save([...collaborators.map((item) => item.id), candidate])} type="button"><UserPlus size={13}/>Add</button></div> : null}{message ? <output>{message}</output> : null}</section>;
}
