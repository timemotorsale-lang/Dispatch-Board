const storageKey = "dispatch-board.mobile-return-position";
type MobilePosition = { route: string; top: number; timestamp: number };

function readPositions(): MobilePosition[] {
  const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
  return Array.isArray(stored) ? stored : [];
}

function routeKey(href: string) {
  const url = new URL(href, window.location.origin);
  url.searchParams.delete("workspaceContext");
  url.searchParams.delete("managerMode");
  url.searchParams.delete("returnTo");
  url.searchParams.sort();
  return url.pathname + url.search;
}

export function rememberMobileScroll(returnTo: string) {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  try {
    const route = routeKey(returnTo);
    const previous = readPositions().filter(position => position.route !== route).slice(0, 5);
    sessionStorage.setItem(storageKey, JSON.stringify([{ route, top: window.scrollY, timestamp: Date.now() }, ...previous]));
  } catch {
    return;
  }
}

export function restoreMobileScroll(href: string) {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  let frame = requestAnimationFrame(() => {
    try {
      const route = routeKey(href);
      const position = readPositions().find(candidate => candidate.route === route);
      if (!position || !Number.isFinite(position.top)) return;
      frame = requestAnimationFrame(() => {
        try { sessionStorage.setItem(storageKey, JSON.stringify(readPositions().filter(candidate => candidate.route !== route))); } catch { /* Browser storage is optional. */ }
        if (Date.now() - position.timestamp <= 30 * 60 * 1000) window.scrollTo({ top: position.top, behavior: "instant" });
      });
    } catch {
      return;
    }
  });
  return () => cancelAnimationFrame(frame);
}
