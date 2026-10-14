export type ReportingHistoryCursor = { version: 1; scope: string; series: string | null; legacy: string | null; seriesDone: boolean; legacyDone: boolean };

export function encodeReportingHistoryCursor(value: ReportingHistoryCursor) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
export function decodeReportingHistoryCursor(value: string | undefined, scope: string): ReportingHistoryCursor | null {
  if (!value) return null;
  if (value.length > 1200 || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error("Report archive cursor is invalid.");
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); }
  catch { throw new Error("Report archive cursor is invalid."); }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("Report archive cursor is invalid.");
  const cursor = decoded as ReportingHistoryCursor;
  const validId = (id: unknown) => id === null || (typeof id === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(id));
  if (cursor.version !== 1 || cursor.scope !== scope || typeof cursor.seriesDone !== "boolean" || typeof cursor.legacyDone !== "boolean" || !validId(cursor.series) || !validId(cursor.legacy)) throw new Error("Report archive cursor is invalid for these filters.");
  return cursor;
}
