import Link from "next/link";

export default function ServiceDocumentNotFound() {
  return <main style={{ maxWidth: 720, margin: "32px auto", padding: 24 }}>
    <h1>Service document unavailable</h1>
    <p>The requested repair order or saved document could not be found in the records available to you.</p>
    <p>Return to the repair workbench to find the record and open its document history.</p>
    <Link href="/vehicles/repair-workbench">Return to repair workbench</Link>
  </main>;
}
