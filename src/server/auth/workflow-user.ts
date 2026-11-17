import { getCurrentUser } from "./current-user";

export async function getCalendarUser() {
  const user = await getCurrentUser();
  return user?.calendarRestricted ? null : user;
}

export async function getDealsUser() {
  const user = await getCurrentUser();
  return user?.dealsRestricted ? null : user;
}
