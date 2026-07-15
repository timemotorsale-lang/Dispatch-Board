import { describe, expect, it } from "vitest";

import {
  ENTERPRISE_CONCEPT_CODES,
  ENTERPRISE_CONCEPT_REGISTRY,
  ENTERPRISE_CONSOLE_CODES,
  ENTERPRISE_CONSOLE_REGISTRY,
  ENTERPRISE_EVENT_TYPE_REGISTRY,
  ENTERPRISE_EVENT_TRANSLATIONS,
  ENTERPRISE_REASON_CODE_REGISTRY,
  ENTERPRISE_REASON_TRANSLATIONS,
  ENTERPRISE_SOURCE_MAPPINGS,
  enterpriseRecordKey,
  findEnterpriseEventType,
  findEnterpriseReasonCode,
  findEnterpriseSourceMapping,
  mappingsForConsole
} from "@/server/enterprise-optimization";

function expectUnique(values: readonly string[]) {
  expect(new Set(values).size).toBe(values.length);
}

describe("enterprise optimization Phase 1 registries", () => {
  it("defines every constitutional concept exactly once", () => {
    expectUnique(ENTERPRISE_CONCEPT_CODES);
    expectUnique(ENTERPRISE_CONCEPT_REGISTRY.map(({ code }) => code));
    expect(ENTERPRISE_CONCEPT_REGISTRY.map(({ code }) => code)).toEqual(ENTERPRISE_CONCEPT_CODES);

    for (const concept of ENTERPRISE_CONCEPT_REGISTRY) {
      expect(concept.definition.trim()).not.toBe("");
      expect(concept.identityRule.trim()).not.toBe("");
    }
  });

  it("keeps CCC console identities stable and distinguishes implementation state", () => {
    expectUnique(ENTERPRISE_CONSOLE_CODES);
    expectUnique(ENTERPRISE_CONSOLE_REGISTRY.map(({ code }) => code));
    expect(ENTERPRISE_CONSOLE_REGISTRY.map(({ code }) => code)).toEqual(ENTERPRISE_CONSOLE_CODES);
    expect(ENTERPRISE_CONSOLE_REGISTRY.find(({ code }) => code === "DISPATCH")?.implementationState).toBe("LIVE");
    expect(ENTERPRISE_CONSOLE_REGISTRY.find(({ code }) => code === "TIME_ATTENDANCE")?.implementationState).toBe("PLANNED");
  });

  it("creates deterministic cross-console record references", () => {
    expect(enterpriseRecordKey({
      organizationId: " tms-001 ",
      console: "DISPATCH",
      domain: " tasks ",
      recordType: " Task ",
      recordId: " task-1 "
    })).toBe("tms-001:DISPATCH:tasks:Task:task-1");

    expect(() => enterpriseRecordKey({
      organizationId: "tms-001",
      console: "DISPATCH",
      domain: "tasks",
      recordType: "Task",
      recordId: " "
    })).toThrow("Record id is required.");

    expect(() => enterpriseRecordKey({
      organizationId: "tms-001",
      console: "DISPATCH",
      domain: "tasks:archive",
      recordType: "Task",
      recordId: "task-1"
    })).toThrow("Domain cannot contain a colon.");
  });

  it("keeps reason codes unique, namespaced, meaningful, and resolvable", () => {
    const codes = ENTERPRISE_REASON_CODE_REGISTRY.map(({ code }) => code);
    expectUnique(codes);

    for (const record of ENTERPRISE_REASON_CODE_REGISTRY) {
      expect(record.code).toMatch(/^[A-Z]+\.[A-Z_]+$/);
      expect(record.meaning.trim()).not.toBe("");
      if (record.lifecycle === "DEPRECATED") {
        expect(record.replacementCode).toBeTruthy();
        expect(codes).toContain(record.replacementCode);
      }
    }

    expect(findEnterpriseReasonCode("DATA.STALE_INPUT")?.category).toBe("DATA");
    expect(findEnterpriseReasonCode("UNKNOWN.CODE")).toBeNull();
  });

  it("keeps event types unique, versioned, meaningful, and resolvable", () => {
    const codes = ENTERPRISE_EVENT_TYPE_REGISTRY.map(({ code }) => code);
    expectUnique(codes);

    for (const record of ENTERPRISE_EVENT_TYPE_REGISTRY) {
      expect(record.code).toMatch(/^enterprise(?:\.[a-z]+(?:-[a-z]+)*){2,}$/);
      expect(record.schemaVersion).toBe(1);
      expect(record.meaning.trim()).not.toBe("");
    }

    expect(findEnterpriseEventType("enterprise.decision.evaluated")?.category).toBe("DECISION");
    expect(findEnterpriseEventType("enterprise.decision.executed")?.meaning).toContain("outcome verification");
  });

  it("maps current and planned domains without claiming false authority", () => {
    expectUnique(ENTERPRISE_SOURCE_MAPPINGS.map(({ mappingId }) => mappingId));

    for (const mapping of ENTERPRISE_SOURCE_MAPPINGS) {
      expect(ENTERPRISE_CONSOLE_CODES).toContain(mapping.console);
      expect(mapping.concepts.length).toBeGreaterThan(0);
      for (const concept of mapping.concepts) expect(ENTERPRISE_CONCEPT_CODES).toContain(concept);

      if (mapping.domainRecord === "Not implemented") {
        expect(mapping.authority).toBe("PLANNED");
      } else {
        expect(mapping.authority).not.toBe("PLANNED");
      }
    }

    expect(findEnterpriseSourceMapping("dispatch.project-projection")?.authority).toBe("DERIVED");
    expect(mappingsForConsole("COMPLIANCE")).toHaveLength(1);
    expect(mappingsForConsole("COMPLIANCE")[0]?.authority).toBe("PLANNED");
    for (const console of ENTERPRISE_CONSOLE_CODES) {
      expect(mappingsForConsole(console).length).toBeGreaterThan(0);
    }
  });

  it("translates domain codes only when a shared meaning is valid", () => {
    const eventCodes = ENTERPRISE_EVENT_TYPE_REGISTRY.map(({ code }) => code);
    const reasonCodes = ENTERPRISE_REASON_CODE_REGISTRY.map(({ code }) => code);

    for (const translations of [ENTERPRISE_EVENT_TRANSLATIONS, ENTERPRISE_REASON_TRANSLATIONS]) {
      expectUnique(translations.map(({ sourceDomain, sourceCode }) => `${sourceDomain}:${sourceCode}`));
      for (const translation of translations) {
        if (translation.disposition === "DOMAIN_ONLY") expect(translation.enterpriseCode).toBeNull();
        if (translation.disposition === "DIRECT") expect(translation.enterpriseCode).not.toBeNull();
      }
    }

    for (const translation of ENTERPRISE_EVENT_TRANSLATIONS) {
      if (translation.enterpriseCode) expect(eventCodes).toContain(translation.enterpriseCode);
    }
    for (const translation of ENTERPRISE_REASON_TRANSLATIONS) {
      if (translation.enterpriseCode) expect(reasonCodes).toContain(translation.enterpriseCode);
    }
  });
});
