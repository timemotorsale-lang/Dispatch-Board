export function repairPrioritySources(item: { text: string; update: string }) {
  const lines = item.update.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [{ source: "", text: item.text }];

  return lines.map((source) => {
    const match = /^\d{4}-\d{2}-\d{2}T[^|]+\|\s*(.+)$/.exec(source);
    return { source, text: match?.[1] ?? source };
  });
}
