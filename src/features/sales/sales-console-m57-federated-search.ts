import type { SalesConsoleStaffRole } from "./sales-console-operational-domain";

export const salesFederatedSearchCategories = [
  "customer",
  "phone-email",
  "stock-vin",
  "appointment",
  "task-promise",
  "revenue-opportunity",
  "manager-review",
  "evidence"
] as const;

export type SalesFederatedSearchCategory = (typeof salesFederatedSearchCategories)[number];

export type SalesFederatedSearchState = "idle" | "loading" | "ready" | "empty" | "error" | "unavailable";

export type SalesFederatedSearchRecord = {
  id: string;
  category: SalesFederatedSearchCategory;
  title: string;
  detail: string;
  sourceOwner: string;
  sourceLink: string;
  tokens: string[];
  visibleToRoles: SalesConsoleStaffRole[];
};

export type SalesFederatedSearchResult = SalesFederatedSearchRecord & {
  matchScore: number;
  openBehavior: "open-in-console-context";
  writeEnabled: false;
};

export function searchFederatedSalesRecords(
  query: string,
  records: SalesFederatedSearchRecord[],
  role: SalesConsoleStaffRole
): { state: SalesFederatedSearchState; results: SalesFederatedSearchResult[] } {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return { state: "idle", results: [] };
  }

  const visible = records.filter((record) => record.visibleToRoles.includes(role));
  const results = visible
    .map((record) => {
      const tokenScore = record.tokens.reduce((score, token) => {
        const normalizedToken = token.toLowerCase();
        if (normalizedToken === normalized) return score + 10;
        if (normalizedToken.startsWith(normalized)) return score + 6;
        if (normalizedToken.includes(normalized)) return score + 3;
        return score;
      }, 0);

      return {
        ...record,
        matchScore: tokenScore,
        openBehavior: "open-in-console-context" as const,
        writeEnabled: false as const
      };
    })
    .filter((record) => record.matchScore > 0)
    .sort((first, second) => second.matchScore - first.matchScore || first.title.localeCompare(second.title));

  return { state: results.length > 0 ? "ready" : "empty", results };
}

export function salesFederatedSearchCoversRequiredCategories(records: SalesFederatedSearchRecord[]) {
  const categories = new Set(records.map((record) => record.category));

  return salesFederatedSearchCategories.every((category) => categories.has(category));
}

export function salesFederatedSearchIsReadOnly(results: SalesFederatedSearchResult[]) {
  return results.every((result) => result.writeEnabled === false && result.openBehavior === "open-in-console-context");
}
