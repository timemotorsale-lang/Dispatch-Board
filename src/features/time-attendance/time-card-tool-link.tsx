"use client";

import Link from "next/link";

import styles from "./time-attendance-console.module.css";

export function TimeCardToolLink({ href, label, section }: { href: string; label: string; section: string }) {
  return <Link
    className={styles.ghostAction}
    href={href}
    onClick={(event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = document.getElementById(section);
      if (target instanceof HTMLDetailsElement) target.open = true;
    }}
  >
    {label}
  </Link>;
}
