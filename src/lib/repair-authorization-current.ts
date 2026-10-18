export function assertCurrentRepairAuthorization(input: { authorizationId: string; authorizedLineKey: string }, latest: { id: string; disposition: string; authorizedLineKeys: unknown } | null) {
  if (!latest || latest.id !== input.authorizationId || !["ACCEPTED", "PARTIAL"].includes(latest.disposition) || !Array.isArray(latest.authorizedLineKeys) || !latest.authorizedLineKeys.includes(input.authorizedLineKey)) throw new Error("Repair authorization was revoked, superseded or does not cover this line. Review the current exact-version approval.");
}

export function assertLaborChronology(occurredAt: Date, latestAt: Date | null, accumulatedMinutes: number, correctionMinutes: number | null) {
  if (latestAt && occurredAt < latestAt) throw new Error("Labor events must not precede the latest recorded event.");
  if (correctionMinutes !== null && accumulatedMinutes + correctionMinutes < 0) throw new Error("Labor correction would make actual minutes negative.");
}
