import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { exportAccountsCsv, listAccounts } from "@/features/collections/server/account-service";
import { assertModuleOn, collectionsErrorResponse, collectionsJson } from "@/features/collections/server/http";

export async function GET(request: Request) {
  try {
    assertModuleOn();
    const p = new URL(request.url).searchParams;
    const query = { q: p.get("q") ?? "", sort: p.get("sort") ?? "", dir: p.get("dir") ?? "", page: Number(p.get("page") ?? 1) || 1, type: p.get("type") ?? "", status: p.get("status") ?? "", includeClosed: p.get("closed") === "1" };
    const user = await getCurrentUser();
    if (p.get("format") === "csv") {
      return new NextResponse(await exportAccountsCsv(user, query), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=collections-accounts.csv", "cache-control": "no-store" } });
    }
    return collectionsJson(await listAccounts(user, query));
  } catch (error) { return collectionsErrorResponse(error); }
}
