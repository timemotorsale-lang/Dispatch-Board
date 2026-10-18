import type { Buffer } from "node:buffer";

export function evidencePath(root: string, relative: unknown): string;
export function readEvidenceArtifact(root: string, relative: unknown): Buffer;
export function assertEvidenceRun(run: unknown, revision: string, repository: string): void;
