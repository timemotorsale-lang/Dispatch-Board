import { RepairPriorityQueue } from "@/features/board/repair-priority-queue";
import { INITIAL_MINNEAPOLIS_LOCATION } from "@/server/appointments/location-foundation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

export default async function RepairPrioritiesPage({ searchParams }: {
  searchParams?: Promise<{ date?: string; linkRow?: string; linkAppointment?: string }>;
}) {
  await requireCurrentUser();
  const params = await searchParams;
  let date = getBoardDateInTimeZone(new Date(), INITIAL_MINNEAPOLIS_LOCATION.timezone);
  if (params?.date) {
    try {
      date = normalizeBoardDate(params.date);
    } catch {
      return <p>The repair plan date is invalid. Open Repair Priorities from the Dispatch Board.</p>;
    }
  }
  return <RepairPriorityQueue initialDate={date} linkRow={params?.linkRow} linkAppointment={params?.linkAppointment} />;
}
