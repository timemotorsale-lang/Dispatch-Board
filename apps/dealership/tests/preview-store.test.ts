import { afterEach, describe, expect, it } from "vitest";
import { execute, existingSession, openStore, records, session } from "../src/server/preview-store";
import { randomUUID } from "node:crypto";

const databases: ReturnType<typeof openStore>[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });
const setup = () => { const database = openStore(":memory:"); databases.push(database); return database; };
const request = { kind: "SERVICE", vehicleId: "", name: "Sample", email: "", phone: "612-555-0142", notes: "Sample concern", details: {} };

describe("private local preview persistence", () => {
  it("isolates records and hashes the session credential", () => {
    const database = setup(); const first = session(database, undefined); const second = session(database, undefined);
    execute(database, first.identifier, { operation: "REQUEST", key: randomUUID(), value: request });
    expect(records(database, first.identifier)).toHaveLength(1); expect(records(database, second.identifier)).toHaveLength(0);
    expect(first.identifier).not.toBe(first.token); expect(existingSession(database, "not-a-token")).toBeNull();
  });
  it("deduplicates a repeated submission and rejects changed payload reuse", () => {
    const database = setup(); const current = session(database, undefined); const key = randomUUID();
    const first = execute(database, current.identifier, { operation: "REQUEST", key, value: request });
    expect(execute(database, current.identifier, { operation: "REQUEST", key, value: request })).toEqual(first);
    expect(records(database, current.identifier)).toHaveLength(1);
    expect(() => execute(database, current.identifier, { operation: "REQUEST", key, value: { ...request, notes: "Changed" } })).toThrow("changed");
  });
  it("marks requests as preview only, not acknowledged appointments", () => {
    const database = setup(); const current = session(database, undefined);
    execute(database, current.identifier, { operation: "REQUEST", key: randomUUID(), value: request });
    expect(records(database, current.identifier)[0].data).toMatchObject({ status: "PREVIEW_RECEIVED", team: "SERVICE" });
  });
  it("does not allow messages to another session's request", () => {
    const database = setup(); const first = session(database, undefined); const other = session(database, undefined);
    const created = execute(database, first.identifier, { operation: "REQUEST", key: randomUUID(), value: request });
    expect(() => execute(database, other.identifier, { operation: "MESSAGE", key: randomUUID(), value: { reference: created.reference, text: "Unauthorized" } })).toThrow("not available");
  });
  it("does not grant history on adding a vehicle, and catches duplicate VIN", () => {
    const database = setup(); const current = session(database, undefined);
    const vehicle = { vin: "1ABCDEFGH23456789", year: "2021", make: "Example", model: "Vehicle", mileage: "" };
    execute(database, current.identifier, { operation: "VEHICLE", key: randomUUID(), value: vehicle });
    expect(records(database, current.identifier)[0].data.linkedHistory).toBe(false);
    expect(() => execute(database, current.identifier, { operation: "VEHICLE", key: randomUUID(), value: vehicle })).toThrow("already");
  });
  it("expires sign-out sessions", () => {
    const database = setup(); const current = session(database, undefined);
    database.prepare("UPDATE sessions SET expires_at = 0 WHERE token_hash = ?").run(current.identifier);
    expect(existingSession(database, current.token)).toBeNull();
  });
});
