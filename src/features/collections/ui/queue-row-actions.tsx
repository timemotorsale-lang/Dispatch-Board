"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "./collections.module.css";

/** Call opens the phone dialer, then the account page with the contact log ready; Text opens the texts tab. */
export function QueueRowActions({ accountId, phone, frozen, from = "PAST_DUE" }: { accountId: string; phone: string | null; frozen: boolean; from?: string }) {
  const router = useRouter();
  const base = `/collections/accounts/${accountId}?from=${encodeURIComponent(from)}`;
  if (frozen) return <div className={styles.iconButtons}><Link className={`${styles.button} ${styles.iconButton}`} href={base}>Open</Link></div>;
  return (
    <div className={styles.iconButtons}>
      {phone ? (
        <a className={`${styles.button} ${styles.iconButton}`} href={`tel:${phone}`} aria-label="Call" onClick={() => setTimeout(() => router.push(`${base}&view=contact&log=CALL_OUT`), 400)}>Call</a>
      ) : <Link className={`${styles.button} ${styles.iconButton}`} href={`${base}&view=contact&log=CALL_OUT`} aria-label="Log a call">Log</Link>}
      <Link className={`${styles.button} ${styles.iconButton}`} href={`${base}&view=contact`} aria-label="Text">Text</Link>
    </div>
  );
}
