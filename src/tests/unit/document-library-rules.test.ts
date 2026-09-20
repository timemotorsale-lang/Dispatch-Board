import { describe, expect, it } from "vitest";

type DocumentAction = "ARCHIVE" | "DELETE" | "DOWNLOAD" | "PROVIDER_SEND" | "REVIEW";
type DocumentRole = "ADMIN" | "LEGAL" | "MANAGER" | "STAFF" | "VIEWER";
type RequirementStatus = "ACCEPTED" | "MISSING" | "NEEDS_CORRECTION" | "RECEIVED";

type DocumentRecord = {
  archivedAt: string | null;
  legalHold: boolean;
  retentionUntil: string;
};

type Requirement = {
  id: string;
  required: boolean;
  status: RequirementStatus;
};

type ProviderAction = {
  channel: "EMAIL" | "PORTAL" | "SMS";
  idempotencyKey: string;
  packetId: string;
  recipientId: string;
};

type ProviderReplay = {
  action: ProviderAction;
  result: "CREATED" | "DUPLICATE" | "IDEMPOTENCY_CONFLICT";
};

const actionPermissions: Record<DocumentRole, DocumentAction[]> = {
  ADMIN: ["ARCHIVE", "DELETE", "DOWNLOAD", "PROVIDER_SEND", "REVIEW"],
  LEGAL: ["ARCHIVE", "DOWNLOAD", "REVIEW"],
  MANAGER: ["ARCHIVE", "DOWNLOAD", "PROVIDER_SEND", "REVIEW"],
  STAFF: ["DOWNLOAD", "PROVIDER_SEND", "REVIEW"],
  VIEWER: ["DOWNLOAD"]
};

function canPerform(role: DocumentRole, action: DocumentAction, document: DocumentRecord) {
  if (!actionPermissions[role].includes(action)) return false;
  if (document.archivedAt && action !== "DOWNLOAD") return false;
  if (document.legalHold && ["ARCHIVE", "DELETE", "PROVIDER_SEND"].includes(action)) return false;
  return true;
}

function dispositionFor(document: DocumentRecord, now = new Date("2026-09-20T12:00:00.000Z")) {
  if (document.legalHold) return "LEGAL_HOLD_BLOCKED";
  if (document.archivedAt) return "ARCHIVED_LOCKED";
  if (new Date(document.retentionUntil) > now) return "RETENTION_ACTIVE";
  return "READY_FOR_DISPOSITION";
}

function packetBlockers(requirements: Requirement[]) {
  return requirements
    .filter((requirement) => requirement.required && requirement.status !== "ACCEPTED")
    .map((requirement) => ({ id: requirement.id, status: requirement.status }));
}

function replayProviderAction(existing: ProviderAction[], next: ProviderAction): ProviderReplay {
  const match = existing.find((action) => action.idempotencyKey === next.idempotencyKey);
  if (!match) return { action: next, result: "CREATED" };
  if (match.packetId === next.packetId && match.recipientId === next.recipientId && match.channel === next.channel) {
    return { action: match, result: "DUPLICATE" };
  }
  return { action: match, result: "IDEMPOTENCY_CONFLICT" };
}

describe("document library milestone rules", () => {
  const activeDocument: DocumentRecord = {
    archivedAt: null,
    legalHold: false,
    retentionUntil: "2026-09-01T00:00:00.000Z"
  };

  it("gates document actions by role and by immutable document state", () => {
    expect(canPerform("VIEWER", "REVIEW", activeDocument)).toBe(false);
    expect(canPerform("STAFF", "PROVIDER_SEND", activeDocument)).toBe(true);
    expect(canPerform("MANAGER", "ARCHIVE", activeDocument)).toBe(true);
    expect(canPerform("STAFF", "DELETE", activeDocument)).toBe(false);

    const archived = { ...activeDocument, archivedAt: "2026-09-19T10:00:00.000Z" };
    expect(canPerform("ADMIN", "DOWNLOAD", archived)).toBe(true);
    expect(canPerform("ADMIN", "REVIEW", archived)).toBe(false);
    expect(canPerform("ADMIN", "DELETE", archived)).toBe(false);

    const held = { ...activeDocument, legalHold: true };
    expect(canPerform("ADMIN", "DELETE", held)).toBe(false);
    expect(canPerform("MANAGER", "PROVIDER_SEND", held)).toBe(false);
    expect(canPerform("LEGAL", "REVIEW", held)).toBe(true);
  });

  it("keeps archive, retention, and legal-hold disposition mutually explicit", () => {
    expect(dispositionFor(activeDocument)).toBe("READY_FOR_DISPOSITION");
    expect(dispositionFor({ ...activeDocument, retentionUntil: "2026-12-01T00:00:00.000Z" })).toBe("RETENTION_ACTIVE");
    expect(dispositionFor({ ...activeDocument, archivedAt: "2026-09-19T10:00:00.000Z" })).toBe("ARCHIVED_LOCKED");
    expect(dispositionFor({ ...activeDocument, legalHold: true })).toBe("LEGAL_HOLD_BLOCKED");
    expect(dispositionFor({ ...activeDocument, archivedAt: "2026-09-19T10:00:00.000Z", legalHold: true })).toBe("LEGAL_HOLD_BLOCKED");
  });

  it("deduplicates provider actions only inside the exact packet, recipient, and channel scope", () => {
    const existing: ProviderAction[] = [{ channel: "EMAIL", idempotencyKey: "send-1", packetId: "packet-1", recipientId: "customer-1" }];

    expect(replayProviderAction(existing, { channel: "SMS", idempotencyKey: "send-2", packetId: "packet-1", recipientId: "customer-1" }).result).toBe("CREATED");
    expect(replayProviderAction(existing, { channel: "EMAIL", idempotencyKey: "send-1", packetId: "packet-1", recipientId: "customer-1" }).result).toBe("DUPLICATE");
    expect(replayProviderAction(existing, { channel: "EMAIL", idempotencyKey: "send-1", packetId: "packet-2", recipientId: "customer-1" }).result).toBe("IDEMPOTENCY_CONFLICT");
    expect(replayProviderAction(existing, { channel: "PORTAL", idempotencyKey: "send-1", packetId: "packet-1", recipientId: "customer-1" }).result).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("blocks packet completion until every required document is accepted", () => {
    const requirements: Requirement[] = [
      { id: "claim-intake", required: true, status: "ACCEPTED" },
      { id: "damage-photos", required: true, status: "MISSING" },
      { id: "tow-storage", required: true, status: "NEEDS_CORRECTION" },
      { id: "internal-note", required: false, status: "MISSING" }
    ];

    expect(packetBlockers(requirements)).toEqual([
      { id: "damage-photos", status: "MISSING" },
      { id: "tow-storage", status: "NEEDS_CORRECTION" }
    ]);
    expect(packetBlockers(requirements.map((requirement) => ({ ...requirement, status: "ACCEPTED" })))).toEqual([]);
  });
});
