import { RepairPriorityQueue } from "@/features/board/repair-priority-queue";
import { INITIAL_MINNEAPOLIS_LOCATION } from "@/server/appointments/location-foundation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

export default async function RepairPrioritiesPage({ searchParams }: {
  searchParams?: Promise<{ date?: string; linkRow?: string; linkAppointment?: string }>;
}) {
  await requireCurrentUser();
  const params = await searchParams;
  const today = getBoardDateInTimeZone(new Date(), INITIAL_MINNEAPOLIS_LOCATION.timezone);
  let date = today;
  if (params?.date) {
    try {
      date = normalizeBoardDate(params.date);
    } catch {
      return <p>The plan date is invalid. Open Daily Priorities from the Dispatch Board.</p>;
    }
  }
  return <RepairPriorityQueue
    key={`${params?.date ?? "today"}:${params?.linkRow ?? ""}:${params?.linkAppointment ?? ""}`}
    fixedDate={Boolean(params?.date)}
    initialDate={date}
    initialToday={today}
    linkRow={params?.linkRow}
    linkAppointment={params?.linkAppointment}
  />;
}
