import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { previewEnabled, validateRequest } from "../lib/domain";
import { serviceHandoff } from "../lib/service-intake";

type StoredRecord = { id: string; kind: string; data: Record<string, unknown>; createdAt: string };
export type PreviewCommand = { operation: "REQUEST" | "SAVE" | "UNSAVE" | "VEHICLE" | "MESSAGE"; key: string; value: unknown };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
let connection: DatabaseSync | undefined;

export function openStore(location = path.join(process.cwd(), ".data", "preview.sqlite")) {
  if (location !== ":memory:" && !previewEnabled(process.env)) throw new Error("Sample storage is disabled in this environment.");
  if (location !== ":memory:") mkdirSync(path.dirname(location), { recursive: true });
  const database = new DatabaseSync(location);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, session_hash TEXT NOT NULL REFERENCES sessions(token_hash), kind TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS commands (session_hash TEXT NOT NULL REFERENCES sessions(token_hash), command_key TEXT NOT NULL, payload_hash TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY (session_hash, command_key));
    CREATE INDEX IF NOT EXISTS records_session ON records(session_hash, created_at);
  `);
  return database;
}

export function store() {
  if (!previewEnabled(process.env)) throw new Error("Sample storage is disabled in this environment.");
  connection ??= openStore();
  return connection;
}

export function session(database: DatabaseSync, token: string | undefined) {
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const found = database.prepare("SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?").get(hash(token), Date.now());
    if (found) return { token, identifier: hash(token), created: false };
  }
  const issued = randomBytes(32).toString("hex");
  const identifier = hash(issued);
  database.prepare("INSERT INTO sessions(token_hash, expires_at) VALUES (?, ?)").run(identifier, Date.now() + 86_400_000);
  return { token: issued, identifier, created: true };
}

export function existingSession(database: DatabaseSync, token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const found = database.prepare("SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?").get(hash(token), Date.now());
  return found ? hash(token) : null;
}

export function records(database: DatabaseSync, identifier: string): StoredRecord[] {
  const rows = database.prepare("SELECT id, kind, data, created_at FROM records WHERE session_hash = ? ORDER BY created_at DESC LIMIT 200").all(identifier);
  return rows.map(row => ({ id: String(row.id), kind: String(row.kind), data: JSON.parse(String(row.data)), createdAt: String(row.created_at) }));
}

export function execute(database: DatabaseSync, identifier: string, command: PreviewCommand) {
  if (!command || !/^[a-f0-9-]{16,80}$/i.test(command.key)) throw new Error("Invalid request identifier.");
  const payloadHash = hash(JSON.stringify({ operation: command.operation, value: command.value }));
  database.exec("BEGIN IMMEDIATE");
  try {
    const previous = database.prepare("SELECT payload_hash, result FROM commands WHERE session_hash = ? AND command_key = ?").get(identifier, command.key);
    if (previous) {
      if (previous.payload_hash !== payloadHash) throw new Error("This submission changed. Review it before sending again.");
      database.exec("COMMIT");
      return JSON.parse(String(previous.result)) as { reference: string };
    }
    const count = database.prepare("SELECT COUNT(*) AS total FROM records WHERE session_hash = ?").get(identifier);
    if (Number(count?.total) >= 200) throw new Error("This preview has reached its record limit.");
    let data: unknown;
    let kind: string;
    if (command.operation === "REQUEST") {
      const validated = validateRequest(command.value);
      data = { ...validated, status: "PREVIEW_RECEIVED", team: validated.kind === "SERVICE" ? "SERVICE" : "SALES", ...(validated.kind === "SERVICE" && validated.details.serviceVersion ? { serviceHandoff: serviceHandoff(validated.details) } : {}) };
      kind = "REQUEST";
    } else if (command.operation === "SAVE" || command.operation === "UNSAVE") {
      if (typeof command.value !== "string" || !/^[a-z0-9-]{1,100}$/.test(command.value)) throw new Error("Invalid vehicle.");
      database.prepare("DELETE FROM records WHERE session_hash = ? AND kind = 'SAVED' AND json_extract(data, '$.vehicleId') = ?").run(identifier, command.value);
      kind = "SAVED";
      data = { vehicleId: command.value };
    } else if (command.operation === "VEHICLE") {
      const input = command.value as Record<string, unknown>;
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Review the vehicle details.");
      const fields: Record<string, string> = {};
      for (const key of ["vin", "year", "make", "model", "mileage"]) {
        if (typeof input[key] !== "string" || String(input[key]).length > 100) throw new Error("Review the vehicle details.");
        fields[key] = String(input[key]).trim();
      }
      if (!fields.make || !fields.model || !/^\d{4}$/.test(fields.year)) throw new Error("Enter the year, make and model.");
      if (fields.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(fields.vin)) throw new Error("Review the 17-character VIN or leave it blank for manual entry.");
      if (fields.vin) {
        const duplicate = database.prepare("SELECT id FROM records WHERE session_hash = ? AND kind = 'VEHICLE' AND json_extract(data, '$.vin') = ?").get(identifier, fields.vin);
        if (duplicate) throw new Error("This vehicle is already in your preview Garage.");
      }
      data = { ...fields, source: "CUSTOMER_ENTERED", linkedHistory: false };
      kind = "VEHICLE";
    } else if (command.operation === "MESSAGE") {
      const input = command.value as { reference?: string; text?: string };
      if (!input || typeof input.reference !== "string" || typeof input.text !== "string" || !input.text.trim() || input.text.length > 2000) throw new Error("Enter a message up to 2,000 characters.");
      const request = database.prepare("SELECT id FROM records WHERE id = ? AND session_hash = ? AND kind = 'REQUEST'").get(input.reference, identifier);
      if (!request) throw new Error("The request is not available to this preview session.");
      kind = "MESSAGE";
      data = { reference: input.reference, text: input.text.trim(), status: "PREVIEW_ONLY" };
    } else throw new Error("Unsupported operation.");
    const reference = randomUUID();
    if (command.operation !== "UNSAVE") database.prepare("INSERT INTO records VALUES (?, ?, ?, ?, ?)").run(reference, identifier, kind, JSON.stringify(data), new Date().toISOString());
    const result = { reference };
    database.prepare("INSERT INTO commands VALUES (?, ?, ?, ?)").run(identifier, command.key, payloadHash, JSON.stringify(result));
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
