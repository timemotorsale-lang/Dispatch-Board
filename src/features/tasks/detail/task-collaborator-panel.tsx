"use client";

import { UserPlus, UsersRound, X } from "lucide-react";
import { useState, useTransition } from "react";

import type { ActiveUserSummary } from "@/server/services/user-summary";
import type { TaskReadModel } from "@/server/services/task-read";

export function TaskCollaboratorPanel({ canManage, staff, task }: { canManage: boolean; staff: ActiveUserSummary[]; task: TaskReadModel }) {
  const [collaborators, setCollaborators] = useState(task.collaborators ?? []);
  const [candidate, setCandidate] = useState("");
  const [scope, setScope] = useState("");
  const [capacity, setCapacity] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function toRequests(nextCollaborators: typeof collaborators) {
    return nextCollaborators.map((collaborator) => ({
      userId: collaborator.id,
      collaborationScope: collaborator.collaborationScope ?? "",
      capacityRequested: collaborator.capacityRequested ?? undefined
    }));
  }

  function save(nextCollaborators: typeof collaborators) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/tasks/${task.id}/collaborators`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collaboratorRequests: toRequests(nextCollaborators) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(payload.error ?? "Unable to update collaborators."); return; }
      setCollaborators(payload.collaborators);
      setCandidate("");
      setScope("");
      setCapacity("");
      setMessage("Collaborators updated.");
    });
  }

  function addCollaborator() {
    const selected = available.find((user) => user.id === candidate);
    if (!selected || !scope.trim()) {
      setMessage("Choose a collaborator and describe what you need from them.");
      return;
    }
    save([
      ...collaborators,
      {
        id: selected.id,
        name: selected.name,
        email: selected.email,
        isActive: true,
        addedAt: new Date().toISOString(),
        addedBy: null,
        collaborationScope: scope.trim(),
        capacityRequested: capacity.trim() || null
      }
    ]);
  }

  const available = staff.filter((user) => user.id !== task.assignedUser.id && !collaborators.some((item) => item.id === user.id));
  return <section className="etw-card etw-collaborator-card"><h2><UsersRound size={16} /> Collaborators <span>{collaborators.length}</span></h2><p>Contributors receive visibility and updates while the owner remains accountable.</p><div className="etw-collaborator-list">{collaborators.map((item) => <article key={item.id}><b>{item.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</b><span><strong>{item.name}</strong><small>{item.isActive ? "Active collaborator" : "Inactive"}</small>{item.collaborationScope ? <em>{item.collaborationScope}</em> : null}{item.capacityRequested ? <small>Capacity: {item.capacityRequested}</small> : null}</span>{canManage ? <button aria-label={`Remove ${item.name}`} disabled={pending} onClick={() => save(collaborators.filter((entry) => entry.id !== item.id))} type="button"><X size={13}/></button> : null}</article>)}{!collaborators.length ? <em>No collaborators assigned.</em> : null}</div>{canManage ? <div className="etw-collaborator-add"><select aria-label="Add task collaborator" onChange={(event) => setCandidate(event.target.value)} value={candidate}><option value="">Choose active staff</option>{available.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><textarea aria-label="Collaboration scope" onChange={(event) => setScope(event.target.value)} placeholder="What should this person help with?" rows={2} value={scope} /><input aria-label="Capacity requested" onChange={(event) => setCapacity(event.target.value)} placeholder="Capacity or timing requested, optional" value={capacity} /><button disabled={!candidate || !scope.trim() || pending} onClick={addCollaborator} type="button"><UserPlus size={13}/>Add</button></div> : null}{message ? <output>{message}</output> : null}</section>;
}
