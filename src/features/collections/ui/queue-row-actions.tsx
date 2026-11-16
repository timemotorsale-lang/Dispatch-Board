"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "./collections.module.css";

/** Call opens the phone dialer, then the account page with the contact log ready. */
export function QueueRowActions({ accountId, phone, frozen }: { accountId: string; phone: string | null; frozen: boolean }) {
  const router = useRouter();
  const base = `/collections/accounts/${accountId}`;
  return (
    <div className={styles.actions}>
      {phone && !frozen ? (
        <a className={styles.button} href={`tel:${phone}`} onClick={() => setTimeout(() => router.push(`${base}?log=CALL_OUT#log`), 400)}>Call</a>
      ) : null}
      {!frozen ? <Link className={styles.button} href={`${base}#message`}>Text</Link> : null}
      <Link className={styles.button} href={`${base}?log=1#log`}>Log contact</Link>
      {!frozen ? <Link className={styles.button} href={`${base}#promise`}>Promise</Link> : null}
    </div>
  );
}
