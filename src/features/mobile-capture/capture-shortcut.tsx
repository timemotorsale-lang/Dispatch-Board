import { Camera } from "lucide-react";
import styles from "./capture-shortcut.module.css";

export function CaptureShortcut({ href, className, newTab = false }: { href: string; className?: string; newTab?: boolean }) {
  // Start a fresh camera session at the record boundary.
  return <a className={[styles.shortcut, className].filter(Boolean).join(" ")} href={href}
    target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined}>
    <Camera size={20} aria-hidden="true" /><span>Capture</span>{newTab && <span className="sr-only"> (new tab)</span>}
  </a>;
}
