/** Nonessential browser preferences must never prevent staff from opening work. */
export function readBrowserPreference(key: string): string | null {
  try { return typeof window === "undefined" ? null : window.localStorage.getItem(key); }
  catch { return null; }
}
export function writeBrowserPreference(key: string, value: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(key, value);
    return true;
  } catch { return false; }
}
