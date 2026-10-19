"use client";
import { useEffect, useState } from "react";
import { PurchasePdfPreview } from "./purchase-pdf-preview";
import styles from "./inventory-transfer-workspace.module.css";

export function PurchaseSourcePreview({ file }: { file: File }) {
  const [preview, setPreview] = useState<{ file: File; url: string; text: string } | null>(null);
  const url = preview?.file === file ? preview.url : "";
  const text = preview?.file === file ? preview.text : "";
  useEffect(() => {
    let active = true;
    const source = URL.createObjectURL(file);
    void Promise.resolve(/\.(?:txt|csv)$/i.test(file.name) ? file.text() : "").then(text => { if (active) setPreview({ file, url: source, text }); }).catch(() => { if (active) setPreview({ file, url: source, text: "Original text could not be displayed." }); });
    return () => { active = false; URL.revokeObjectURL(source); };
  }, [file]);
  return <aside className={styles.sourcePreview} aria-label="Original purchase document">
    <div className={styles.toolbar}><strong>Original document</strong><span className={styles.meta}>{file.name}</span></div>
    {url && file.type === "application/pdf" ? <><a href={url} target="_blank" rel="noopener noreferrer">Open original PDF</a><PurchasePdfPreview key={url} file={file} /></> : url && ["image/jpeg", "image/png", "image/webp"].includes(file.type) ?
      // Original local images are not served through the application's image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="Original purchase document" /> : <pre className={styles.originalText}>{text || "Original preview unavailable."}</pre>}
  </aside>;
}
