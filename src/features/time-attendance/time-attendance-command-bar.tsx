"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import styles from "./time-attendance-console.module.css";

export type TimeAttendanceCommandItem = {
  detail: string;
  href: string;
  label: string;
  scope: string;
};

type TimeAttendanceCommandBarProps = {
  items: TimeAttendanceCommandItem[];
};

export function TimeAttendanceCommandBar({ items }: TimeAttendanceCommandBarProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!normalizedQuery) return items.slice(0, 5);
    return items
      .filter((item) => `${item.label} ${item.detail} ${item.scope}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [items, normalizedQuery]);

  return (
    <section className={styles.commandSearch} aria-label="Time card command bar">
      <label>
        <Search size={16} aria-hidden="true" />
        <input
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search staff, actions, exceptions, or payroll work"
          type="search"
          value={query}
        />
      </label>
      <div className={styles.commandSearchResults} aria-label="Suggested commands">
        {matches.map((item) => (
          <a href={item.href} key={`${item.scope}-${item.href}-${item.label}`}>
            <span>{item.scope}</span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </a>
        ))}
        {!matches.length ? <p>No matching action found.</p> : null}
      </div>
    </section>
  );
}
