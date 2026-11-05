"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Camera, ChevronDown, FileText, House, IdCard, ScanBarcode } from "lucide-react";
import { captureIntakeHref, captureToolHref, captureTools, MOBILE_HOME_HREF } from "@/features/mobile-capture/capture-navigation";
import { rememberMobileScroll } from "./mobile-scroll";
import styles from "./mobile-tools-navigation.module.css";

const toolIcons = { photo: Camera, barcode: ScanBarcode, "id-front": IdCard, "id-barcode": IdCard, document: FileText };

export function MobileToolsNavigation({ standalone = false }: { standalone?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target) && detailsRef.current) detailsRef.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) { detailsRef.current.open = false; detailsRef.current.querySelector("summary")?.focus(); }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);

  if (pathname === "/capture" || pathname.startsWith("/capture/")) return null;
  function openCapture() {
    rememberMobileScroll(returnTo);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return <nav className={`${styles.toolbar} ${standalone ? styles.standalone : ""}`} aria-label="Mobile home and capture tools">
    <Link aria-label="Mobile home" className={styles.home} href={MOBILE_HOME_HREF} prefetch={false}><House aria-hidden="true" size={19} /><span>Home</span></Link>
    <details className={styles.launcher} ref={detailsRef}>
      <summary aria-label="Scan and capture"><Camera aria-hidden="true" size={19} /><span>Capture</span><ChevronDown aria-hidden="true" size={16} /></summary>
      <div className={styles.panel}>
        <strong>Choose a tool</strong><span>Return to this page when finished.</span>
        <Link href={captureIntakeHref("vehicle", returnTo)} prefetch={false} onNavigate={openCapture}>Add vehicle · scan VIN</Link>
        <Link href={captureIntakeHref("customer", returnTo)} prefetch={false} onNavigate={openCapture}>Add customer · scan ID</Link>
        {captureTools.map((tool) => { const Icon = toolIcons[tool.key]; return <Link href={captureToolHref(tool.key, returnTo)} key={tool.key} prefetch={false} onNavigate={openCapture}><Icon aria-hidden="true" size={22} /><span><b>{tool.label}</b><small>{tool.detail}</small></span></Link>; })}
        <Link href={captureToolHref(null, returnTo)} prefetch={false} onNavigate={openCapture}>All capture tools</Link>
      </div>
    </details>
  </nav>;
}
