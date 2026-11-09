"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./calendar-workspace.module.css";

export type CalendarGridEvent = {
  id: string;
  title: string;
  timeLabel: string;
  startMinute: number;
  endMinute: number;
  style: CSSProperties;
  onOpen: () => void;
};

export function placeCalendarEvents(events: CalendarGridEvent[]) {
  const sorted = [...events].sort((left, right) => left.startMinute - right.startMinute || right.endMinute - left.endMinute);
  const placed: Array<CalendarGridEvent & { lane: number; laneCount: number }> = [];
  let groupStart = 0;
  let laneEnds: number[] = [];
  for (const event of sorted) {
    if (laneEnds.length && event.startMinute >= Math.max(...laneEnds)) {
      for (let index = groupStart; index < placed.length; index++) placed[index].laneCount = laneEnds.length;
      groupStart = placed.length;
      laneEnds = [];
    }
    const available = laneEnds.findIndex(end => end <= event.startMinute);
    const lane = available < 0 ? laneEnds.length : available;
    laneEnds[lane] = Math.max(event.startMinute + 30, event.endMinute);
    placed.push({ ...event, lane, laneCount: 1 });
  }
  for (let index = groupStart; index < placed.length; index++) placed[index].laneCount = laneEnds.length;
  return placed;
}

const hourLabels = Array.from({ length: 24 }, (_, hour) => `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`);
const gridSlots = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);

export function CalendarTimeGrid({ days, today, selectedDate, selectedTime, onDate, onSlot }: {
  days: Array<{ date: string; weekday: string; dayNumber: string; events: CalendarGridEvent[] }>;
  today: string;
  selectedDate: string;
  selectedTime: string;
  onDate: (date: string) => void;
  onSlot: (date: string, time: string) => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 8 * 64; }, []);
  return <div className={styles.timeScroll} ref={scroll} aria-label={days.length === 1 ? "Day time grid" : "Week time grid"}>
    <div className={styles.timeGrid} style={{ "--day-count": days.length } as CSSProperties}>
      <div className={styles.zone}>Central</div>
      {days.map(day => <button className={styles.dayHeading} key={day.date} type="button" onClick={() => onDate(day.date)} aria-current={day.date === today ? "date" : undefined}>
        <span>{day.weekday}</span><strong>{day.dayNumber}</strong>
      </button>)}
      <div className={styles.hours} aria-hidden="true">{hourLabels.map(hour => <span key={hour}>{hour}</span>)}</div>
      {days.map(day => <div className={styles.timeColumn} key={day.date}>
        {gridSlots.map((slot, index) => <button className={styles.slot} key={slot} type="button" tabIndex={-1} aria-label={`Create appointment on ${day.date} at ${hourLabels[Math.floor(index / 2)].replace(" ", index % 2 ? ":30 " : ":00 ")}`} aria-pressed={selectedDate === day.date && selectedTime === slot} onClick={() => onSlot(day.date, slot)} />)}
        {placeCalendarEvents(day.events).map(event => <button
          className={styles.event} key={event.id} type="button" onClick={event.onOpen} title={`${event.title} · ${event.timeLabel}`}
          style={{ ...event.style, top: `${event.startMinute / 14.4}%`, height: `${(Math.max(event.startMinute + 30, event.endMinute) - event.startMinute) / 14.4}%`, left: `calc(${event.lane * 100 / event.laneCount}% + 2px)`, width: `calc(${100 / event.laneCount}% - 4px)` }}
        ><strong>{event.title}</strong><span>{event.timeLabel}</span></button>)}
      </div>)}
    </div>
  </div>;
}
