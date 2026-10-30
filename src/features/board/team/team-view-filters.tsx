"use client";
import type { DispatchTeam } from "@/lib/dispatch-team";
import { formatBoardEnumLabel, type BoardFilters } from "../board-grouping";
import styles from "./team-now.module.css";
export function TeamViewFilters({ data, filters, onChange }: { data: DispatchTeam; filters: BoardFilters; onChange: (next: BoardFilters) => void }) {
  const areas = [...new Set(data.rows.flatMap(row => row.tasks.map(task => task.workflowArea)).filter((area): area is string => Boolean(area)))].sort();
  if (filters.workflowArea && !areas.includes(filters.workflowArea)) areas.push(filters.workflowArea);
  const update = (key: keyof BoardFilters, value: string) => onChange({ ...filters, [key]: value, ...(key === "status" ? { metricFilter: "" } : {}) });
  return <div className={styles.filters} aria-label="Shared operations filters">
    <label>Person<select aria-label="Filter assignee" value={filters.assigneeId} onChange={event => update("assigneeId", event.target.value)}><option value="">All team members</option>{data.people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
    <label>Work area<select aria-label="Filter workflow" value={filters.workflowArea} onChange={event => update("workflowArea", event.target.value)}><option value="">All work areas</option>{areas.map(area => <option key={area} value={area}>{formatBoardEnumLabel(area)}</option>)}</select></label>
    <label>Work status<select aria-label="Filter status" value={filters.status} onChange={event => update("status", event.target.value)}><option value="">All statuses</option>{["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "WAITING_ON_PARTS", "WAITING_ON_APPROVAL", "READY_FOR_REVIEW", "COMPLETED"].map(status => <option key={status} value={status}>{formatBoardEnumLabel(status)}</option>)}</select></label>
    <label className={styles.search}>Find team or work<input type="search" aria-label="Search board" placeholder="Person, work or workbook focus" value={filters.searchText} onChange={event => update("searchText", event.target.value)} /></label>
    <button disabled={!Object.values(filters).some(Boolean)} onClick={() => onChange({ metricFilter: "", status: "", assigneeId: "", workflowArea: "", searchText: "" })}>Clear filters</button>
  </div>;
}
