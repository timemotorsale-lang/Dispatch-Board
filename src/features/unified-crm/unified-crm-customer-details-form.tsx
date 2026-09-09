"use client";

import { startTransition, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import styles from "./unified-crm-customer-360.module.css";
import { currentCustomerPageHref } from "./unified-crm-customer-page-context";

type Props = {
  available: boolean;
  customerDisplayName: string;
  customerId: string;
  expectedVersion: number;
  fallbackHref: string;
};

function createIdempotencyKey(customerId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-details-${customerId}-${Date.now()}`;
}

export function UnifiedCrmCustomerDetailsForm({
  available,
  customerDisplayName,
  customerId,
  expectedVersion,
  fallbackHref
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [displayName, setDisplayName] = useState(customerDisplayName);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("");
  const [reason, setReason] = useState("Add customer details from Quick Update.");
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey(customerId));
  const currentHref = currentCustomerPageHref(pathname, searchParams.toString(), "customer-details-form-heading");

  const hasChanges = useMemo(() => {
    return Boolean(
      displayName.trim() !== customerDisplayName.trim()
      || phoneNumber.trim()
      || email.trim()
      || address.trim()
      || preferredContactMethod.trim()
    );
  }, [address, customerDisplayName, displayName, email, phoneNumber, preferredContactMethod]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setMessageHref(null);
    setTone("idle");

    const body: Record<string, unknown> = {
      expectedVersion,
      idempotencyKey,
      reason
    };
    if (displayName.trim() !== customerDisplayName.trim()) body.displayName = displayName;
    if (phoneNumber.trim()) body.phoneNumber = phoneNumber;
    if (email.trim()) body.email = email;
    if (address.trim()) body.address = address;
    if (preferredContactMethod.trim()) body.preferredContactMethod = preferredContactMethod;

    try {
      const response = await fetch(`/api/crm/v1/customers/${encodeURIComponent(customerId)}/edit`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => null) as { changedFields?: string[]; duplicate?: boolean; error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Customer details could not be saved right now.");
      }
      setTone("success");
      setMessage(payload?.duplicate ? "These customer details were already saved. The customer view has been refreshed." : "Customer details saved. Refreshing this customer view...");
      setMessageHref(currentHref);
      setPhoneNumber("");
      setEmail("");
      setAddress("");
      setPreferredContactMethod("");
      setReason("Add customer details from Quick Update.");
      setIdempotencyKey(createIdempotencyKey(customerId));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
      setMessageHref(null);
      setMessage(error instanceof Error ? error.message : "Customer details could not be saved right now.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.interactionCard} aria-labelledby="customer-details-form-heading">
      <header className={styles.interactionHeader}>
        <div>
          <span className={styles.eyebrow}>Customer details</span>
          <h2 id="customer-details-form-heading">Add or correct source details here</h2>
          <p>
            {available
              ? "Save missing details from a Quick Update without leaving Customer 360. The source customer record is updated through the protected edit path."
              : "Customer detail edits are unavailable from this page right now. Open the existing source record to make changes."}
          </p>
        </div>
        {available ? (
          <button
            aria-controls="customer-details-form-panel"
            aria-expanded={open}
            className={styles.interactionToggle}
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? "Close" : "Edit details"}
          </button>
        ) : (
          <Link className={styles.secondaryActionLink} href={fallbackHref}>Open source record</Link>
        )}
      </header>
      {message ? <p className={tone === "error" ? styles.formError : styles.formSuccess} role={tone === "error" ? "alert" : "status"}>{message} {messageHref ? <Link href={messageHref}>Review details</Link> : null}</p> : null}
      {available && open ? (
        <form className={styles.interactionForm} id="customer-details-form-panel" onSubmit={(event) => void submit(event)}>
          <p className={styles.interactionHelper}>
            Fill only what needs to change. Blank phone, email, address, and preferred method fields are left alone.
          </p>
          <fieldset className={styles.interactionFieldset} disabled={pending}>
            <label>
              <span>Name</span>
              <input autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
            </label>
            <label>
              <span>Phone</span>
              <input autoComplete="tel" onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Add phone number" value={phoneNumber} />
            </label>
            <label>
              <span>Email</span>
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="Add email address" type="email" value={email} />
            </label>
            <label className={styles.interactionWide}>
              <span>Address</span>
              <input autoComplete="street-address" onChange={(event) => setAddress(event.target.value)} placeholder="Street, city, state, ZIP" value={address} />
            </label>
            <label>
              <span>Preferred contact</span>
              <select onChange={(event) => setPreferredContactMethod(event.target.value)} value={preferredContactMethod}>
                <option value="">Leave unchanged</option>
                <option value="PHONE">Phone</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">Text</option>
              </select>
            </label>
            <label className={styles.interactionWide}>
              <span>Reason</span>
              <input onChange={(event) => setReason(event.target.value)} required value={reason} />
            </label>
            <div className={styles.interactionActions}>
              <button disabled={pending || !hasChanges || !reason.trim()} type="submit">{pending ? "Saving details..." : "Save details"}</button>
              <span className={styles.interactionActionNote}>This updates the existing customer record and refreshes this page.</span>
            </div>
          </fieldset>
        </form>
      ) : null}
    </section>
  );
}
