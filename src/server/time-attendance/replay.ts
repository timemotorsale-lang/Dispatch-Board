import { createHash } from "node:crypto";

import {
  calculateTimeCardProjection,
  type TimeCardProjection,
  type TimeCardProjectionInput
} from "./time-card";

export type TimeCardReplayResult = {
  checksum: string;
  inputChecksum: string;
  projection: TimeCardProjection;
  projectionChecksum: string;
  replayedAt: string;
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonical(entry)).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
    .join(",")}}`;
}

export function hashTimeCardReplay(value: unknown) {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}

export function replayTimeCardProjection(
  input: TimeCardProjectionInput,
  replayedAt = new Date()
): TimeCardReplayResult {
  const projection = calculateTimeCardProjection(input);
  const inputChecksum = hashTimeCardReplay(input);
  const projectionChecksum = hashTimeCardReplay(projection);

  return {
    checksum: hashTimeCardReplay({ inputChecksum, projectionChecksum }),
    inputChecksum,
    projection,
    projectionChecksum,
    replayedAt: replayedAt.toISOString()
  };
}
