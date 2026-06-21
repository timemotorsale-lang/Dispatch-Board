export function normalizeBoardDate(boardDate: string) {
  const normalizedBoardDate = boardDate.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBoardDate)) {
    throw new Error("Board date must use YYYY-MM-DD format.");
  }

  const parsedBoardDate = new Date(`${normalizedBoardDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedBoardDate.getTime()) ||
    parsedBoardDate.toISOString().slice(0, 10) !== normalizedBoardDate
  ) {
    throw new Error("Board date must be a valid calendar date.");
  }

  return normalizedBoardDate;
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: "year" | "month" | "day") {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getBoardDateInTimeZone(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(now);

  return `${getDatePart(parts, "year")}-${getDatePart(parts, "month")}-${getDatePart(parts, "day")}`;
}
