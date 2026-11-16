import { describe, expect, it, vi } from "vitest";

import { buildSeedTemplates, SMS_MAX_LENGTH } from "@/features/collections/domain/default-templates";
import { DEFAULT_COLLECTIONS_SETTINGS, MESSAGE_RULE_KEYS, parseCollectionsSettings } from "@/features/collections/domain/settings";
import { seedCollectionsForOrganization } from "@/features/collections/server/seed";

describe("collections settings", () => {
  it("uses the owner's defaults", () => {
    const s = parseCollectionsSettings(undefined);
    expect(s).toEqual(DEFAULT_COLLECTIONS_SETTINGS);
    expect(s.graceDays).toBe(5);
    expect(s.lateFeeDisplayCents).toBe(1000);
    expect(s.thresholds).toEqual({ disableReview: 7, followUp: 14, review30: 30, repoReview: 60 });
    expect(s.businessHours.sun).toBeNull();
    expect(s.businessHours.sat).toEqual({ open: "10:00", close: "15:00" });
    expect(s.weeklyAutomaticMessageCap).toBe(3);
  });

  it("ignores bad values and keeps the time zone fixed", () => {
    const s = parseCollectionsSettings({ graceDays: -3, timeZone: "Europe/Paris", thresholds: { disableReview: "abc" }, dealership: { payOnlineUrl: "javascript:alert(1)" } });
    expect(s.graceDays).toBe(5);
    expect(s.timeZone).toBe("America/Chicago");
    expect(s.thresholds.disableReview).toBe(7);
    expect(s.dealership.payOnlineUrl).toBe("");
  });

  it("never allows the disable warning to become automatic", () => {
    expect(parseCollectionsSettings({ messageRules: { DISABLE_WARNING: { enabled: true } } }).messageRules.DISABLE_WARNING.enabled).toBe(false);
  });

  it("always keeps English enabled", () => {
    expect(parseCollectionsSettings({ languagesEnabled: ["ES"] }).languagesEnabled).toEqual(["EN", "ES"]);
  });
});

describe("seed templates", () => {
  const templates = buildSeedTemplates();

  it("has an approved English SMS and a draft in each other language for every rule", () => {
    for (const key of MESSAGE_RULE_KEYS) {
      const forKey = templates.filter(t => t.key === key && t.channel === "SMS");
      expect(forKey.find(t => t.language === "EN")?.status).toBe("APPROVED");
      for (const language of ["ES", "SO", "SW"] as const) {
        const draft = forKey.find(t => t.language === language);
        expect(draft?.status).toBe("DRAFT");
        expect(draft?.reviewNote).toMatch(/fluent speaker/);
      }
    }
  });

  it("keeps SMS bodies within 320 characters and includes STOP", () => {
    for (const t of templates.filter(item => item.channel === "SMS")) {
      expect(t.body.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
      expect(t.body).toContain("STOP");
      if (t.language === "EN") expect(t.body.endsWith("Reply STOP to opt out.")).toBe(true);
    }
  });

  it("never shows full balances in SMS bodies", () => {
    for (const t of templates) expect(t.body).not.toMatch(/balance/i);
  });
});

describe("collections seed is idempotent", () => {
  it("creates settings and templates once, then nothing", async () => {
    const store = { setting: null as null | { id: string }, templates: [] as Array<{ key: string; channel: string; language: string }> };
    const db = {
      collectionsSetting: {
        findUnique: vi.fn(async () => store.setting),
        create: vi.fn(async () => { store.setting = { id: "s1" }; return store.setting; })
      },
      collectionsSettingHistory: { create: vi.fn(async () => ({})) },
      messageTemplate: {
        findFirst: vi.fn(async ({ where }: { where: { key: string; channel: string; language: string } }) =>
          store.templates.find(t => t.key === where.key && t.channel === where.channel && t.language === where.language) ?? null),
        create: vi.fn(async ({ data }: { data: { key: string; channel: string; language: string } }) => { store.templates.push(data); return data; })
      }
    };
    const first = await seedCollectionsForOrganization(db as never, "org-1");
    const second = await seedCollectionsForOrganization(db as never, "org-1");
    expect(first.settingsCreated).toBe(1);
    expect(first.templatesCreated).toBe(buildSeedTemplates().length);
    expect(second).toEqual({ organizationId: "org-1", settingsCreated: 0, templatesCreated: 0 });
  });
});
