/** Keep a purchase contact snapshot with its existing auditable business note. */
export function compactPurchaseNote(note: string, phone: string, contact: string) {
  if (phone.length > 45 || contact.length > 90 || /[\r\n]/.test(phone + contact)) throw new Error("Enter a shorter supplier phone or contact.");
  if (!phone && !contact) return note;
  const reason = ["Record purchased repair parts.", phone && `Supplier phone: ${phone}`, contact && `Supplier contact: ${contact}`, "Purchase note:", note].filter(Boolean).join("\n");
  if (reason.length > 430) throw new Error("Shorten the note or supplier contact before saving.");
  return reason;
}

export function compactPurchaseContact(reason?: string) {
  const lines = reason?.split("\n") ?? [];
  if (lines[0] !== "Record purchased repair parts.") return [];
  return lines.slice(1, lines.indexOf("Purchase note:") === -1 ? undefined : lines.indexOf("Purchase note:"))
    .filter(line => line.startsWith("Supplier phone: ") || line.startsWith("Supplier contact: "));
}
