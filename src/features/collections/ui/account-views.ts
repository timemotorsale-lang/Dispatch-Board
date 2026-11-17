/** The account page tabs. Shared by the server page and the client shell (so it must not be a "use client" module). */
export const ACCOUNT_VIEWS = [
  ["overview", "Overview"], ["contact", "Contact and texts"], ["promises", "Promises and payments"], ["insurance", "Insurance"],
  ["recovery", "Starter and repo"], ["ledger", "Ledger"], ["details", "Flags and details"], ["history", "History"]
] as const;
export type AccountView = (typeof ACCOUNT_VIEWS)[number][0];
