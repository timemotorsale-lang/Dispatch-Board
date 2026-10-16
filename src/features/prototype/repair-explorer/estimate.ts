export type EstimateLine = {
  id: string;
  label: string;
  hours: number;
  parts: number;
  conflictGroup?: string;
};

export type PreviewDraft = { version: 1; rate: number; lines: EstimateLine[] };

export function isValidAmount(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum;
}

export function estimateTotals(lines: EstimateLine[], rate: number) {
  const laborCents = lines.reduce((total, line) => total + Math.round(line.hours * rate * 100), 0);
  const partsCents = lines.reduce((total, line) => total + Math.round(line.parts * 100), 0);
  return {
    hours: lines.reduce((total, line) => total + line.hours, 0),
    labor: laborCents / 100,
    parts: partsCents / 100,
    subtotal: (laborCents + partsCents) / 100
  };
}

export function parsePreviewDraft(raw: string): PreviewDraft | null {
  try {
    const draft = JSON.parse(raw) as PreviewDraft;
    if (!draft || draft.version !== 1 || !isValidAmount(draft.rate, 1000) || !Array.isArray(draft.lines) || draft.lines.length > 100) return null;
    const identifiers = new Set<string>();
    const conflicts = new Set<string>();
    for (const line of draft.lines) {
      if (!line || typeof line.id !== "string" || !line.id || line.id.length > 200 || identifiers.has(line.id)
        || typeof line.label !== "string" || !line.label.trim() || line.label.length > 200
        || !isValidAmount(line.hours, 100) || !isValidAmount(line.parts, 100000)
        || (line.conflictGroup !== undefined && (typeof line.conflictGroup !== "string" || !line.conflictGroup || conflicts.has(line.conflictGroup)))) return null;
      identifiers.add(line.id);
      if (line.conflictGroup) conflicts.add(line.conflictGroup);
    }
    return draft;
  } catch {
    return null;
  }
}
