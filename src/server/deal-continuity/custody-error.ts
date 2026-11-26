const custodyBlockers = [
  "Complete the vehicle return review before reserving, selling, or delivering this vehicle.",
  "Record the actual vehicle return and resolve any return hold before reserving, selling, or delivering this vehicle.",
  "Cancel or resolve the temporary vehicle reservation before reserving, selling, or delivering this vehicle.",
  "Complete the prior vehicle return review before assigning this vehicle.",
  "This vehicle has a sale or retail reservation. Resolve it in the sales workflow before assigning temporary use.",
  "Link one canonical vehicle before marking this deal sold."
];

export function vehicleCustodyBlocker(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const details = error as Error & { meta?: { database_error?: unknown } };
  const message = `${error.message} ${typeof details.meta?.database_error === "string" ? details.meta.database_error : ""}`;
  return custodyBlockers.find(blocker => message.includes(blocker));
}
