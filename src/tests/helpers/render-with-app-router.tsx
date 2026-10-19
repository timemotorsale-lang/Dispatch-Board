import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

// Standalone screen fixtures need the context supplied by Next in the running app.
export function renderToStaticMarkup(...[node, options]: Parameters<typeof renderMarkup>) {
  const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "test-fixture" };
  return renderMarkup(<AppRouterContext.Provider value={router}>{node}</AppRouterContext.Provider>, options);
}
