CREATE TABLE "PersonalCalendar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "PersonalCalendar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonalCalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarId" TEXT,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonalCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonalCalendar_id_userId_key" ON "PersonalCalendar"("id", "userId");
CREATE UNIQUE INDEX "PersonalCalendar_userId_name_key" ON "PersonalCalendar"("userId", "name");
CREATE INDEX "PersonalCalendarEvent_userId_startsAt_idx" ON "PersonalCalendarEvent"("userId", "startsAt");

ALTER TABLE "PersonalCalendar" ADD CONSTRAINT "PersonalCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalCalendarEvent" ADD CONSTRAINT "PersonalCalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalCalendarEvent" ADD CONSTRAINT "PersonalCalendarEvent_calendarId_userId_fkey" FOREIGN KEY ("calendarId", "userId") REFERENCES "PersonalCalendar"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
