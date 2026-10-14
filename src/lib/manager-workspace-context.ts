export const MANAGER_WORKSPACE_MODES = ["CEO", "COO", "WORK"] as const;

export type ManagerWorkspaceMode = (typeof MANAGER_WORKSPACE_MODES)[number];

type SearchParamsReader = Pick<URLSearchParams, "get">;

export type ManagerWorkspaceContext = {
  mode: ManagerWorkspaceMode;
  returnHref: string;
  returnLabel: string;
};

export function normalizeManagerWorkspaceMode(value: unknown): ManagerWorkspaceMode {
  const normalized = String(value ?? "CEO").toUpperCase();
  return normalized === "COO" || normalized === "WORK" ? normalized : "CEO";
}

export function getManagerWorkspaceHref(mode: ManagerWorkspaceMode) {
  return `/manager-workspace?mode=${mode.toLowerCase()}`;
}

export function getManagerWorkspaceModeLabel(mode: ManagerWorkspaceMode) {
  return mode === "WORK" ? "My Work" : mode;
}

export function readManagerWorkspaceContext(searchParams: SearchParamsReader): ManagerWorkspaceContext | null {
  if (searchParams.get("workspaceContext")?.toUpperCase() !== "MANAGEMENT") return null;

  const rawMode = searchParams.get("managerMode");
  if (!rawMode || !MANAGER_WORKSPACE_MODES.includes(rawMode.toUpperCase() as ManagerWorkspaceMode)) return null;

  const mode = normalizeManagerWorkspaceMode(rawMode);
  return {
    mode,
    returnHref: getManagerWorkspaceHref(mode),
    returnLabel: `Return to My Workspace · ${getManagerWorkspaceModeLabel(mode)}`
  };
}

export function withManagerWorkspaceContext(
  href: string,
  mode: ManagerWorkspaceMode,
  options: { launch?: "advisor" } = {}
) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const url = new URL(href, "https://workspace.local");
  url.searchParams.set("workspaceContext", "MANAGEMENT");
  url.searchParams.set("managerMode", mode);
  url.searchParams.set("returnTo", getManagerWorkspaceHref(mode));
  if (options.launch) url.searchParams.set("launch", options.launch);
  return `${url.pathname}${url.search}${url.hash}`;
}
