import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmQuoteRecordScope } from "@/server/unified-crm/quote-contract";

type QuoteDatabase = Pick<
  PrismaClient,
  "$transaction" | "customer" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage" | "unifiedCrmOpportunityRecord" | "unifiedCrmQuoteRecord" | "unifiedCrmQuoteVersion"
>;

type QuoteDraftCommandRecord = {
  actorUserId: string;
  correlationId: string;
  customerId: string | null;
  discountCents: number;
  domain: string;
  expectedVersion: number;
  idempotencyKey: string;
  lineItems: {
    description: string;
    quantity: number;
    taxable: boolean;
    unitPriceCents: number;
  }[];
  opportunityId: string | null;
  organizationId: string;
  priceSource: string;
  quoteId: string | null;
  reason: string;
  requestHash: string;
  taxRateBasisPoints: number;
  termsSummary: string;
};

export type UnifiedCrmQuoteDraftWorkspaceRecord = {
  customerId: string | null;
  customerLabel: string;
  latestDraftSnapshot: {
    discountCents: number;
    lineItems: {
      description: string;
      quantity: number;
      taxable: boolean;
      unitPriceCents: number;
    }[];
    priceSource: string;
    taxRateBasisPoints: number;
    termsSummary: string;
    totalCents: number;
  };
  latestVersionNumber: number;
  opportunityId: string | null;
  opportunityLabel: string;
  quoteId: string;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  updatedAt: Date;
};

export type UnifiedCrmQuoteVersionReviewRecord = {
  customerLabel: string;
  opportunityLabel: string;
  presentedVersionNumber: number | null;
  quoteId: string;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  updatedAt: Date;
  versions: {
    createdAt: Date;
    lineItemCount: number;
    presentedAt: Date | null;
    state: "DRAFT" | "PRESENTED" | "SUPERSEDED";
    subtotalCents: number;
    totalCents: number;
    versionId: string;
    versionNumber: number;
  }[];
};

export type UnifiedCrmQuoteDraftRepository = {
  getDraftWorkspace(input: {
    organizationId: string;
    quoteId: string | null;
    recordScope: UnifiedCrmQuoteRecordScope;
  }): Promise<{
    editableQuote: UnifiedCrmQuoteDraftWorkspaceRecord | null;
    visibleDrafts: UnifiedCrmQuoteDraftWorkspaceRecord[];
  }>;
  getVersionReview(input: {
    organizationId: string;
    quoteId: string;
    recordScope: UnifiedCrmQuoteRecordScope;
  }): Promise<UnifiedCrmQuoteVersionReviewRecord | null>;
  saveDraft(input: {
    command: QuoteDraftCommandRecord;
    recordScope: UnifiedCrmQuoteRecordScope;
  }): Promise<{
    duplicate: boolean;
    latestVersionNumber: number;
    quoteId: string;
    quoteNumber: string;
    version: number;
  }>;
};

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function scopeWhere(recordScope: UnifiedCrmQuoteRecordScope) {
  return recordScope.kind === "OWNER"
    ? {
        OR: [
          { createdByUserId: recordScope.ownerUserId },
          { opportunity: { ownerUserId: recordScope.ownerUserId } }
        ]
      }
    : {};
}

function customerScopeWhere(recordScope: UnifiedCrmQuoteRecordScope) {
  return recordScope.kind === "OWNER" ? { ownerUserId: recordScope.ownerUserId } : {};
}

function parseDraftSnapshot(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      discountCents: 0,
      lineItems: [],
      priceSource: "",
      taxRateBasisPoints: 0,
      termsSummary: "",
      totalCents: 0
    };
  }
  const candidate = value as Record<string, unknown>;
  const lineItems = Array.isArray(candidate.lineItems)
    ? candidate.lineItems
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const record = item as Record<string, unknown>;
        return {
          description: typeof record.description === "string" ? record.description : "",
          quantity: typeof record.quantity === "number" ? record.quantity : 1,
          taxable: Boolean(record.taxable),
          unitPriceCents: typeof record.unitPriceCents === "number" ? record.unitPriceCents : 0
        };
      })
    : [];

  return {
    discountCents: typeof candidate.discountCents === "number" ? candidate.discountCents : 0,
    lineItems,
    priceSource: typeof candidate.priceSource === "string" ? candidate.priceSource : "",
    taxRateBasisPoints: typeof candidate.taxRateBasisPoints === "number" ? candidate.taxRateBasisPoints : 0,
    termsSummary: typeof candidate.termsSummary === "string" ? candidate.termsSummary : "",
    totalCents: typeof candidate.totalCents === "number" ? candidate.totalCents : 0
  };
}

function parseTotalsSnapshot(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { subtotalCents: 0, totalCents: 0 };
  const candidate = value as Record<string, unknown>;
  return {
    subtotalCents: typeof candidate.subtotalCents === "number" ? candidate.subtotalCents : 0,
    totalCents: typeof candidate.totalCents === "number" ? candidate.totalCents : 0
  };
}

function parseLineItemsSnapshotCount(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.length : 0;
}

function quoteNumber(now: Date) {
  return `Q-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}-${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}${String(now.getUTCMilliseconds()).padStart(3, "0")}`;
}

function buildDraftSnapshot(command: QuoteDraftCommandRecord, totals: { subtotalCents: number; taxableSubtotalCents: number; taxCents: number; totalCents: number }) {
  return {
    customerId: command.customerId,
    discountCents: command.discountCents,
    lineItems: command.lineItems,
    opportunityId: command.opportunityId,
    priceSource: command.priceSource,
    taxRateBasisPoints: command.taxRateBasisPoints,
    termsSummary: command.termsSummary,
    totalCents: totals.totalCents,
    totals
  };
}

function calculateTotals(command: QuoteDraftCommandRecord) {
  const subtotalCents = command.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const taxableSubtotalCents = command.lineItems.reduce((sum, item) => sum + (item.taxable ? item.quantity * item.unitPriceCents : 0), 0);
  const taxCents = Math.round((taxableSubtotalCents * command.taxRateBasisPoints) / 10000);
  const totalCents = Math.max(0, subtotalCents - command.discountCents + taxCents);
  return { subtotalCents, taxableSubtotalCents, taxCents, totalCents };
}

export function createUnifiedCrmQuoteDraftRepository(
  database: QuoteDatabase = prisma
): UnifiedCrmQuoteDraftRepository {
  return {
    async getDraftWorkspace(input) {
      const [visibleDrafts, editableQuote] = await Promise.all([
        database.unifiedCrmQuoteRecord.findMany({
          where: {
            organizationId: input.organizationId,
            archivedAt: null,
            ...scopeWhere(input.recordScope)
          },
          orderBy: [{ updatedAt: "desc" }, { quoteNumber: "asc" }],
          take: 5,
          select: {
            id: true,
            quoteNumber: true,
            state: true,
            latestVersionNumber: true,
            updatedAt: true,
            customerId: true,
            latestDraftSnapshot: true,
            opportunityId: true,
            customer: { select: { customerNumber: true, displayName: true } },
            opportunity: { select: { opportunityNumber: true } }
          }
        }),
        input.quoteId
          ? database.unifiedCrmQuoteRecord.findFirst({
              where: {
                id: input.quoteId,
                organizationId: input.organizationId,
                archivedAt: null,
                ...scopeWhere(input.recordScope)
              },
              select: {
                id: true,
                quoteNumber: true,
                state: true,
                latestVersionNumber: true,
                updatedAt: true,
                customerId: true,
                latestDraftSnapshot: true,
                opportunityId: true,
                customer: { select: { customerNumber: true, displayName: true } },
                opportunity: { select: { opportunityNumber: true } }
              }
            })
          : Promise.resolve(null)
      ]);

      const mapRecord = (record: NonNullable<(typeof visibleDrafts)[number]>): UnifiedCrmQuoteDraftWorkspaceRecord => ({
        customerId: record.customerId,
        customerLabel: record.customer?.displayName && record.customer.customerNumber
          ? `${record.customer.displayName} · ${record.customer.customerNumber}`
          : "Customer link not yet attached",
        latestDraftSnapshot: parseDraftSnapshot(record.latestDraftSnapshot),
        latestVersionNumber: record.latestVersionNumber,
        opportunityId: record.opportunityId,
        opportunityLabel: record.opportunity?.opportunityNumber ?? "Opportunity link not yet attached",
        quoteId: record.id,
        quoteNumber: record.quoteNumber,
        state: record.state === "PRESENTED" ? "PRESENTED" : "DRAFT",
        updatedAt: record.updatedAt
      });

      return {
        editableQuote: editableQuote ? mapRecord(editableQuote) : null,
        visibleDrafts: visibleDrafts.map(mapRecord)
      };
    },

    async getVersionReview(input) {
      const quote = await database.unifiedCrmQuoteRecord.findFirst({
        where: {
          id: input.quoteId,
          organizationId: input.organizationId,
          archivedAt: null,
          ...scopeWhere(input.recordScope)
        },
        select: {
          id: true,
          quoteNumber: true,
          state: true,
          updatedAt: true,
          latestVersionNumber: true,
          presentedVersion: { select: { versionNumber: true } },
          customer: { select: { customerNumber: true, displayName: true } },
          opportunity: { select: { opportunityNumber: true } },
          versions: {
            orderBy: [{ versionNumber: "desc" }],
            select: {
              id: true,
              versionNumber: true,
              state: true,
              createdAt: true,
              presentedAt: true,
              totalsSnapshot: true,
              lineItemsSnapshot: true
            }
          }
        }
      });
      if (!quote) return null;
      return {
        customerLabel: quote.customer?.displayName && quote.customer.customerNumber
          ? `${quote.customer.displayName} · ${quote.customer.customerNumber}`
          : "Customer link not yet attached",
        opportunityLabel: quote.opportunity?.opportunityNumber ?? "Opportunity link not yet attached",
        presentedVersionNumber: quote.presentedVersion?.versionNumber ?? null,
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        state: quote.state === "PRESENTED" ? "PRESENTED" : "DRAFT",
        updatedAt: quote.updatedAt,
        versions: quote.versions.map((version) => {
          const totals = parseTotalsSnapshot(version.totalsSnapshot);
          return {
            createdAt: version.createdAt,
            lineItemCount: parseLineItemsSnapshotCount(version.lineItemsSnapshot),
            presentedAt: version.presentedAt,
            state: version.state,
            subtotalCents: totals.subtotalCents,
            totalCents: totals.totalCents,
            versionId: version.id,
            versionNumber: version.versionNumber
          };
        })
      };
    },

    saveDraft(input) {
      return database.$transaction(async (tx) => {
        const now = new Date();
        const existingLedger = await tx.enterpriseCommandLedger.findUnique({
          where: {
            organizationId_domain_commandType_idempotencyKey: {
              organizationId: input.command.organizationId,
              domain: input.command.domain,
              commandType: "SAVE_QUOTE_DRAFT",
              idempotencyKey: input.command.idempotencyKey
            }
          }
        });

        if (existingLedger) {
          if (existingLedger.subjectType !== "QUOTE") {
            throw new Error("Quote draft idempotency scope is unavailable.");
          }
          if (existingLedger.requestHash !== input.command.requestHash) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different quote draft.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = existingLedger.resultSnapshot as Record<string, unknown> | null;
          if (!snapshot || typeof snapshot.quoteId !== "string" || typeof snapshot.quoteNumber !== "string") {
            throw new Error("Stored quote draft replay is invalid.");
          }
          return {
            duplicate: true,
            latestVersionNumber: typeof snapshot.latestVersionNumber === "number" ? snapshot.latestVersionNumber : 0,
            quoteId: snapshot.quoteId,
            quoteNumber: snapshot.quoteNumber,
            version: existingLedger.resultingVersion ?? 0
          };
        }

        let customerId: string | null = null;
        if (input.command.customerId) {
          const customer = await tx.customer.findFirst({
            where: {
              id: input.command.customerId,
              organizationId: input.command.organizationId,
              archivedAt: null,
              mergedIntoCustomerId: null,
              ...customerScopeWhere(input.recordScope)
            },
            select: { id: true }
          });
          if (!customer) throw new Error("Customer not available.");
          customerId = customer.id;
        }

        let opportunityId: string | null = null;
        if (input.command.opportunityId) {
          const opportunity = await tx.unifiedCrmOpportunityRecord.findFirst({
            where: {
              id: input.command.opportunityId,
              organizationId: input.command.organizationId,
              archivedAt: null,
              ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {})
            },
            select: { id: true }
          });
          if (!opportunity) throw new Error("Opportunity not available.");
          opportunityId = opportunity.id;
        }

        if (!customerId && !opportunityId) {
          throw new Error("Quote draft requires a visible customer or opportunity.");
        }

        const totals = calculateTotals(input.command);
        const draftSnapshot = buildDraftSnapshot(input.command, totals);

        let quoteId: string;
        let quoteNumberValue: string;
        let previousVersion = 0;
        let aggregateVersion = 0;
        let latestVersionNumber = 0;

        if (input.command.quoteId) {
          const existingQuote = await tx.unifiedCrmQuoteRecord.findFirst({
            where: {
              id: input.command.quoteId,
              organizationId: input.command.organizationId,
              archivedAt: null,
              ...scopeWhere(input.recordScope)
            },
            select: {
              id: true,
              quoteNumber: true,
              state: true,
              latestVersionNumber: true
            }
          });
          if (!existingQuote) throw new Error("Quote not available.");
          if (existingQuote.state !== "DRAFT") {
            throw new Error("Presented quotes cannot be revised from the draft workflow.");
          }
          const aggregate = await tx.enterpriseAggregateVersion.findUnique({
            where: {
              organizationId_domain_subjectType_subjectId: {
                organizationId: input.command.organizationId,
                domain: input.command.domain,
                subjectType: "QUOTE",
                subjectId: existingQuote.id
              }
            }
          });
          aggregateVersion = aggregate?.version ?? 0;
          if (aggregateVersion !== input.command.expectedVersion) {
            throw new EnterpriseCommandConflictError("Quote draft is stale. Refresh before saving again.", "VERSION_CONFLICT");
          }
          latestVersionNumber = existingQuote.latestVersionNumber + 1;
          await tx.unifiedCrmQuoteRecord.update({
            where: { id: existingQuote.id },
            data: {
              customerId,
              currency: "USD",
              latestDraftSnapshot: json(draftSnapshot),
              latestVersionNumber,
              opportunityId,
              priceSource: input.command.priceSource,
              termsSnapshot: json({ termsSummary: input.command.termsSummary, taxRateBasisPoints: input.command.taxRateBasisPoints }),
              updatedAt: now
            }
          });
          quoteId = existingQuote.id;
          quoteNumberValue = existingQuote.quoteNumber;
          previousVersion = aggregateVersion;
        } else {
          quoteNumberValue = quoteNumber(now);
          const created = await tx.unifiedCrmQuoteRecord.create({
            data: {
              createdByUserId: input.command.actorUserId,
              currency: "USD",
              customerId,
              latestDraftSnapshot: json(draftSnapshot),
              latestVersionNumber: 1,
              opportunityId,
              organizationId: input.command.organizationId,
              priceSource: input.command.priceSource,
              quoteNumber: quoteNumberValue,
              state: "DRAFT",
              termsSnapshot: json({ termsSummary: input.command.termsSummary, taxRateBasisPoints: input.command.taxRateBasisPoints })
            },
            select: { id: true }
          });
          quoteId = created.id;
          latestVersionNumber = 1;
          previousVersion = 0;
        }

        await tx.unifiedCrmQuoteVersion.create({
          data: {
            createdByUserId: input.command.actorUserId,
            currency: "USD",
            lineItemsSnapshot: json(input.command.lineItems),
            organizationId: input.command.organizationId,
            priceSource: input.command.priceSource,
            presentedAt: null,
            quoteId,
            state: "DRAFT",
            termsSnapshot: json({ discountCents: input.command.discountCents, taxRateBasisPoints: input.command.taxRateBasisPoints, termsSummary: input.command.termsSummary }),
            totalsSnapshot: json(totals),
            versionNumber: latestVersionNumber
          }
        });

        const nextAggregateVersion = previousVersion + 1;
        const aggregateKey = {
          organizationId_domain_subjectType_subjectId: {
            organizationId: input.command.organizationId,
            domain: input.command.domain,
            subjectType: "QUOTE",
            subjectId: quoteId
          }
        } as const;
        const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: aggregateKey });
        if (aggregate) {
          await tx.enterpriseAggregateVersion.update({
            where: { id: aggregate.id },
            data: { locationId: null, version: nextAggregateVersion }
          });
        } else {
          await tx.enterpriseAggregateVersion.create({
            data: {
              domain: input.command.domain,
              locationId: null,
              organizationId: input.command.organizationId,
              subjectId: quoteId,
              subjectType: "QUOTE",
              version: nextAggregateVersion
            }
          });
        }

        const resultSnapshot = {
          latestVersionNumber,
          quoteId,
          quoteNumber: quoteNumberValue,
          state: "DRAFT"
        };

        const ledger = await tx.enterpriseCommandLedger.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandType: "SAVE_QUOTE_DRAFT",
            completedAt: now,
            correlationId: input.command.correlationId,
            domain: input.command.domain,
            expectedVersion: previousVersion,
            idempotencyKey: input.command.idempotencyKey,
            locationId: null,
            organizationId: input.command.organizationId,
            requestHash: input.command.requestHash,
            resultingVersion: nextAggregateVersion,
            resultSnapshot: json(resultSnapshot),
            status: "SUCCEEDED",
            subjectId: quoteId,
            subjectType: "QUOTE"
          }
        });
        const eventType = "SAVE_QUOTE_DRAFT_COMPLETED";
        const event = await tx.enterpriseDomainEvent.create({
          data: {
            aggregateId: quoteId,
            aggregateType: "QUOTE",
            aggregateVersion: nextAggregateVersion,
            commandId: ledger.id,
            domain: input.command.domain,
            eventType,
            locationId: null,
            organizationId: input.command.organizationId,
            payload: json({
              latestVersionNumber,
              quoteNumber: quoteNumberValue,
              reason: input.command.reason,
              totalCents: totals.totalCents
            })
          }
        });
        await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandId: ledger.id,
            correlationId: input.command.correlationId,
            domain: input.command.domain,
            eventType,
            locationId: null,
            metadata: json({ requestHash: input.command.requestHash }),
            newValue: json(resultSnapshot),
            organizationId: input.command.organizationId,
            reason: input.command.reason,
            subjectId: quoteId,
            subjectType: "QUOTE"
          }
        });
        await tx.enterpriseOutboxMessage.create({
          data: {
            domainEventId: event.id,
            locationId: null,
            messageKey: quoteId,
            organizationId: input.command.organizationId,
            payload: json({
              aggregateId: quoteId,
              aggregateVersion: nextAggregateVersion,
              correlationId: input.command.correlationId,
              eventId: event.id,
              eventType
            }),
            topic: "vehicle-operations.unified_crm"
          }
        });

        return {
          duplicate: false,
          latestVersionNumber,
          quoteId,
          quoteNumber: quoteNumberValue,
          version: nextAggregateVersion
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
