import { addReportDays, isReportWorkingDay, resolveReportPeriod, validReportDate, type ReportCadence, type ReportCalendar } from "./calendar";

export type ExpectationAssignment = { id: string; subjectUserId: string; reviewerUserId: string; cadence: ReportCadence; validFrom: string; validTo: string | null; dailyDueMinute: number | null };
export type ExpectationPerson = { id: string; name: string; isActive: boolean };
export type ReportingTimeOff = { requesterUserId: string; startsAt: Date; endsAt: Date };

export function projectReportingExpectations(calendar: ReportCalendar, assignments: ExpectationAssignment[], people: ExpectationPerson[], from: string, to: string, approvedTimeOff: ReportingTimeOff[] = []) {
  validReportDate(from); validReportDate(to);
  if (from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000) throw new Error("Expectation preview range is invalid.");
  if (assignments.length > 1000) throw new Error("Expectation preview requires a smaller assignment scope.");
  const candidates = new Map<string, { subjectUserId: string; subject: string; reviewerUserId: string; reviewer: string; cadence: ReportCadence; periodStart: string; periodEnd: string; dueAt: string; reviewBy: string; calendarVersion: string; coveredDates: Set<string>; assignmentIds: Set<string>; warnings: Set<string>; conflicting: boolean }>();
  const byId = new Map(people.map(person => [person.id, person]));
  for (const assignment of [...assignments].sort((a, b) => a.validFrom.localeCompare(b.validFrom) || a.id.localeCompare(b.id))) {
    validReportDate(assignment.validFrom); if (assignment.validTo) validReportDate(assignment.validTo);
    const person = byId.get(assignment.subjectUserId), reviewer = byId.get(assignment.reviewerUserId);
    if (!person?.isActive) continue;
    const applicable = { ...calendar, dailyDueMinute: assignment.dailyDueMinute ?? calendar.dailyDueMinute };
    for (let date = from; date <= to; date = addReportDays(date, 1)) {
      if (date < assignment.validFrom || (assignment.validTo && date > assignment.validTo) || !isReportWorkingDay(date, applicable)) continue;
      const period = resolveReportPeriod(date, assignment.cadence, applicable);
      const key = `${person.id}:${assignment.cadence}:${period.startDate}`;
      let candidate = candidates.get(key);
      if (!candidate) {
        candidate = { subjectUserId: person.id, subject: person.name, reviewerUserId: assignment.reviewerUserId, reviewer: reviewer?.name ?? "Unavailable reviewer", cadence: assignment.cadence, periodStart: period.startDate, periodEnd: period.endDate, dueAt: period.dueAt.toISOString(), reviewBy: period.reviewBy.toISOString(), calendarVersion: period.calendarVersion, coveredDates: new Set(), assignmentIds: new Set(), warnings: new Set(), conflicting: false };
        candidates.set(key, candidate);
        if (candidates.size > 10000) throw new Error("Expectation preview requires a smaller period scope.");
      }
      if (candidate.reviewerUserId !== assignment.reviewerUserId || candidate.dueAt !== period.dueAt.toISOString()) {
        candidate.conflicting = true;
        candidate.warnings.add("Assignments conflict within this covered period.");
      }
      if (!reviewer?.isActive) candidate.warnings.add("The assigned reviewer is unavailable.");
      if (assignment.subjectUserId === assignment.reviewerUserId) candidate.warnings.add("Independent reviewer required.");
      candidate.coveredDates.add(date); candidate.assignmentIds.add(assignment.id);
    }
  }
  return [...candidates.values()].sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.subjectUserId.localeCompare(b.subjectUserId) || a.cadence.localeCompare(b.cadence)).map(candidate => {
    let eligibleDays = 0;
    for (let date = candidate.periodStart; date < candidate.periodEnd; date = addReportDays(date, 1)) if (isReportWorkingDay(date, calendar)) eligibleDays++;
    const partial = candidate.coveredDates.size < eligibleDays;
    if (partial) candidate.warnings.add("Only part of the covered period is included.");
    const leaveDates = [...candidate.coveredDates].filter(date => {
      const day = resolveReportPeriod(date, "DAILY", calendar);
      return approvedTimeOff.some(leave => leave.requesterUserId === candidate.subjectUserId && leave.startsAt < day.endsAt && leave.endsAt > day.startsAt);
    }).sort();
    const reviewerAbsent = approvedTimeOff.some(leave => leave.requesterUserId === candidate.reviewerUserId && leave.startsAt < new Date(candidate.reviewBy) && leave.endsAt > new Date(candidate.dueAt));
    if (leaveDates.length) candidate.warnings.add("Approved time off overlaps coverage; applicability requires review.");
    if (reviewerAbsent) candidate.warnings.add("Approved reviewer time off overlaps the review window.");
    return { ...candidate, leaveDates, reviewerAbsent, coveredDates: [...candidate.coveredDates].sort(), assignmentIds: [...candidate.assignmentIds].sort(), warnings: [...candidate.warnings].sort(), partial, eligibleDays, canGenerate: !candidate.conflicting && !leaveDates.length && !reviewerAbsent && byId.get(candidate.reviewerUserId)?.isActive === true && candidate.reviewerUserId !== candidate.subjectUserId };
  });
}
