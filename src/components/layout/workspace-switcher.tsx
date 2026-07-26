"use client";

import { Check, ChevronDown, Layers3 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  getPermittedWorkspaces,
  resolveWorkspaceForPath,
  type WorkspaceKey
} from "@/server/auth/navigation";
import type { AuthenticatedUser } from "@/server/auth/store";

export function WorkspaceSwitcher({
  preferredWorkspace,
  user
}: {
  preferredWorkspace?: WorkspaceKey | null;
  user: AuthenticatedUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const workspaces = getPermittedWorkspaces(user);
  const activeKey = resolveWorkspaceForPath(user, pathname, preferredWorkspace);
  const active = workspaces.find((workspace) => workspace.key === activeKey) ?? workspaces[0];

  if (workspaces.length < 2 || !active) return null;

  function selectWorkspace(workspace: WorkspaceKey) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/workspace", {
          body: JSON.stringify({ workspace }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        const payload = await response.json().catch(() => null) as { error?: string; redirectTo?: string } | null;
        if (!response.ok || !payload?.redirectTo) {
          throw new Error(payload?.error ?? "The workspace could not be opened.");
        }
        setOpen(false);
        router.push(payload.redirectTo);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The workspace could not be opened.");
      }
    });
  }

  return (
    <div className="workspace-switcher">
      <button
        aria-label={`Active workspace: ${active.label}. Switch workspace`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="workspace-switcher-trigger"
        disabled={isPending}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Layers3 aria-hidden="true" size={15} />
        <span>{active.label}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </button>
      {open ? (
        <div aria-label="Choose active workspace" className="workspace-switcher-menu" role="menu">
          <header>
            <strong>Switch workspace</strong>
            <span>Navigation changes. Your identity and permissions do not.</span>
          </header>
          {workspaces.map((workspace) => (
            <button
              className={workspace.key === active.key ? "active" : ""}
              disabled={isPending}
              key={workspace.key}
              onClick={() => selectWorkspace(workspace.key)}
              role="menuitem"
              type="button"
            >
              <span><strong>{workspace.label}</strong><small>{workspace.description}</small></span>
              {workspace.key === active.key ? <Check aria-hidden="true" size={16} /> : null}
            </button>
          ))}
          {error ? <p role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
