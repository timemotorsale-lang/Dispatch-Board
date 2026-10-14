import { resolvePacket, type DocumentRecord, type PacketStatus } from "./domain";
import type { DocumentLibraryState } from "./repository";

export const DOCUMENT_LIBRARY_INTELLIGENCE_VERSION = "document-library.intelligence/v1";

export type DocumentIntelligencePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type DocumentIntelligenceKind =
  | "LEGAL_HOLD_BLOCKER"
  | "MISSING_REQUIREMENT"
  | "CORRECTION_REQUIRED"
  | "PROVIDER_REFERENCE_STALE"
  | "DUPLICATE_CANDIDATE"
  | "ARCHIVE_READY"
  | "PACKET_HANDOFF_READY";

export type DocumentIntelligenceRecommendation = {
  actionLabel: string;
  confidence: number;
  evidence: string[];
  id: string;
  kind: DocumentIntelligenceKind;
  priority: DocumentIntelligencePriority;
  rationale: string;
  targetDocumentId: string | null;
  targetPacketId: string | null;
  title: string;
};

export type DocumentIntelligenceRiskFlag = {
  count: number;
  label: string;
  priority: DocumentIntelligencePriority;
};

export type DocumentLibraryIntelligence = {
  confidence: number;
  generatedBy: typeof DOCUMENT_LIBRARY_INTELLIGENCE_VERSION;
  recommendations: DocumentIntelligenceRecommendation[];
  riskFlags: DocumentIntelligenceRiskFlag[];
  score: number;
  summary: string;
};

const priorityWeight: Record<DocumentIntelligencePriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

function byPriority(left: DocumentIntelligenceRecommendation, right: DocumentIntelligenceRecommendation) {
  return priorityWeight[right.priority] - priorityWeight[left.priority] || right.confidence - left.confidence;
}

function activePacketCount(document: DocumentRecord, state: DocumentLibraryState) {
  return state.packets.filter((packet) => packet.documents.includes(document.id)).length;
}

function duplicateGroups(documents: DocumentRecord[]) {
  const groups = new Map<string, DocumentRecord[]>();
  for (const document of documents) {
    const key = `${document.owner.type}:${document.owner.id}:${document.documentType}`;
    groups.set(key, [...(groups.get(key) ?? []), document]);
  }
  return Array.from(groups.values()).filter((group) => group.length > 1);
}

function scorePacketStatus(status: PacketStatus) {
  if (status === "COMPLETE") return 100;
  if (status === "PENDING_REVIEW") return 72;
  if (status === "MISSING") return 42;
  if (status === "NEEDS_CORRECTION") return 35;
  return 22;
}

export function buildDocumentLibraryIntelligence(state: DocumentLibraryState): DocumentLibraryIntelligence {
  const resolvedPackets = state.packets.map((packet) => resolvePacket(packet, state.documents));
  const recommendations: DocumentIntelligenceRecommendation[] = [];

  for (const packet of resolvedPackets) {
    if (packet.status === "COMPLETE") {
      recommendations.push({
        actionLabel: "Preview export",
        confidence: 94,
        evidence: [
          `${packet.completion.accepted} of ${packet.completion.required} required requirements are accepted or waived.`,
          "No packet blockers remain."
        ],
        id: `handoff-${packet.id}`,
        kind: "PACKET_HANDOFF_READY",
        priority: "LOW",
        rationale: "This packet can move to provider handoff or final review.",
        targetDocumentId: null,
        targetPacketId: packet.id,
        title: `Prepare ${packet.title} for handoff`
      });
    }

    for (const requirement of packet.requirements) {
      if (requirement.state === "LEGAL_HOLD" && requirement.documentId) {
        recommendations.push({
          actionLabel: "Open hold",
          confidence: 98,
          evidence: [
            `${requirement.label} is linked but under legal hold.`,
            "Held documents cannot satisfy packet requirements."
          ],
          id: `legal-hold-${packet.id}-${requirement.id}`,
          kind: "LEGAL_HOLD_BLOCKER",
          priority: "CRITICAL",
          rationale: "Release or resolve the legal hold before the packet can progress.",
          targetDocumentId: requirement.documentId,
          targetPacketId: packet.id,
          title: `Resolve legal hold for ${requirement.label}`
        });
      }

      if (requirement.state === "MISSING") {
        recommendations.push({
          actionLabel: "Add document",
          confidence: 92,
          evidence: [
            `${requirement.label} is required for ${packet.title}.`,
            "No active matching document is linked to the packet."
          ],
          id: `missing-${packet.id}-${requirement.id}`,
          kind: "MISSING_REQUIREMENT",
          priority: "HIGH",
          rationale: "Adding or linking this document has the highest readiness impact.",
          targetDocumentId: null,
          targetPacketId: packet.id,
          title: `Collect ${requirement.label}`
        });
      }

      if ((requirement.state === "NEEDS_CORRECTION" || requirement.state === "REJECTED") && requirement.documentId) {
        recommendations.push({
          actionLabel: "Review correction",
          confidence: 89,
          evidence: [
            `${requirement.label} is currently ${requirement.state.toLowerCase().replaceAll("_", " ")}.`,
            "Corrected documents must be reviewed before they count toward readiness."
          ],
          id: `correction-${packet.id}-${requirement.id}`,
          kind: "CORRECTION_REQUIRED",
          priority: "HIGH",
          rationale: "Correction work is blocking packet completion.",
          targetDocumentId: requirement.documentId,
          targetPacketId: packet.id,
          title: `Correct ${requirement.label}`
        });
      }
    }
  }

  for (const document of state.documents) {
    const linkedPackets = activePacketCount(document, state);
    if (!document.legalHold && linkedPackets === 0 && document.status !== "ARCHIVED") {
      recommendations.push({
        actionLabel: "Review archive",
        confidence: 83,
        evidence: [
          "Document is not linked to active packet work.",
          `Retention category is ${document.retentionCategory}.`
        ],
        id: `archive-${document.id}`,
        kind: "ARCHIVE_READY",
        priority: "MEDIUM",
        rationale: "This document can be reviewed for archive or retention cleanup.",
        targetDocumentId: document.id,
        targetPacketId: null,
        title: `Archive review for ${document.fileName}`
      });
    }

    for (const reference of document.providerReferences) {
      if (!reference.lastVerifiedAt && reference.health !== "HELD") {
        recommendations.push({
          actionLabel: "Reconcile",
          confidence: 76,
          evidence: [
            `${reference.provider} has no last verification timestamp.`,
            `Provider health is ${reference.health.toLowerCase().replaceAll("_", " ")}.`
          ],
          id: `provider-${document.id}-${reference.provider}-${reference.externalId}`,
          kind: "PROVIDER_REFERENCE_STALE",
          priority: "MEDIUM",
          rationale: "Provider references should be reconciled before handoff or release.",
          targetDocumentId: document.id,
          targetPacketId: null,
          title: `Verify ${reference.provider} reference`
        });
      }
    }
  }

  for (const group of duplicateGroups(state.documents)) {
    const [first] = group;
    recommendations.push({
      actionLabel: "Compare",
      confidence: 71,
      evidence: [
        `${group.length} documents share ${first.owner.label} and ${first.documentType}.`,
        "Duplicate candidates can cause staff to link or export the wrong version."
      ],
      id: `duplicate-${first.owner.type}-${first.owner.id}-${first.documentType}`,
      kind: "DUPLICATE_CANDIDATE",
      priority: "LOW",
      rationale: "Compare duplicate candidates and keep the accepted current version clear.",
      targetDocumentId: first.id,
      targetPacketId: null,
      title: `Review duplicate ${first.documentType.toLowerCase().replaceAll("_", " ")} documents`
    });
  }

  const sortedRecommendations = recommendations.sort(byPriority).slice(0, 8);
  const legalHoldCount = state.documents.filter((document) => document.legalHold).length;
  const missingRequirementCount = resolvedPackets.flatMap((packet) => packet.requirements).filter((requirement) => requirement.state === "MISSING").length;
  const correctionCount = state.documents.filter((document) => document.status === "NEEDS_CORRECTION" || document.status === "REJECTED").length;
  const archiveReadyCount = state.documents.filter((document) => !document.legalHold && activePacketCount(document, state) === 0 && document.status !== "ARCHIVED").length;
  const packetScore = resolvedPackets.length > 0
    ? Math.round(resolvedPackets.reduce((total, packet) => total + scorePacketStatus(packet.status), 0) / resolvedPackets.length)
    : 100;
  const score = Math.max(0, Math.min(100, packetScore - legalHoldCount * 12 - correctionCount * 8 - missingRequirementCount * 4));

  return {
    confidence: sortedRecommendations.length > 0 ? Math.round(sortedRecommendations.reduce((total, item) => total + item.confidence, 0) / sortedRecommendations.length) : 95,
    generatedBy: DOCUMENT_LIBRARY_INTELLIGENCE_VERSION,
    recommendations: sortedRecommendations,
    riskFlags: [
      { count: legalHoldCount, label: "Legal holds", priority: legalHoldCount > 0 ? "CRITICAL" : "LOW" },
      { count: missingRequirementCount, label: "Missing requirements", priority: missingRequirementCount > 0 ? "HIGH" : "LOW" },
      { count: correctionCount, label: "Corrections", priority: correctionCount > 0 ? "HIGH" : "LOW" },
      { count: archiveReadyCount, label: "Archive candidates", priority: archiveReadyCount > 0 ? "MEDIUM" : "LOW" }
    ],
    score,
    summary: score >= 85
      ? "Document operations are release-ready with only routine cleanup."
      : score >= 60
        ? "Document operations are usable but need targeted packet cleanup."
        : "Document operations need focused intervention before rollout."
  };
}
