import Link from "next/link";
import { HomepageTemplatePreview } from "./homepage-template-preview";
import review from "./homepage-review.json";
import styles from "../website-console.module.css";

export function DesignStudio() {
  return (
    <section aria-labelledby="website-design-studio">
      <h2 id="website-design-studio">Design Studio</h2>
      <p className={styles.intro}>Homepage templates · Review pack v{review.version} · Design review only</p>
      <div className={styles.summary}>
        <h3>Homepage templates</h3>
        <p>Compare Search First, Premium Showroom, Guided Shopping, Signature Showroom, and Simple Hybrid. The two new options blend your current dealership identity with simpler discovery and a rotating vehicle showcase.</p>
        <p>Use the Concept selector inside the review to see all five. Switch desktop/mobile and explore search suggestions, selections, loading, no matches, and a returning shopper. Shared components and the comparison scorecard follow the selected page.</p>
        <p>Signature Showroom and Simple Hybrid rotate six illustrative vehicles every six seconds: SUV, sedan, pickup, sport coupe, minivan, and electric crossover. Pause or browse manually; autoplay stops on hover, keyboard focus, reduced-motion preference, or when the showcase is not visible. These are sample visuals, not advertised inventory.</p>
        <p>Scroll within the preview or expand it for a larger review space. Template selection here is for staff review, not a customer-facing switch or a publishing action.</p>
        <p>This saved review works independently of the customer preview server or public domain. Selections are temporary; there is no approval, publication, or live customer-data connection. The current customer homepage stays unchanged.</p>
        <Link className={styles.toolLink} href="/website-console">Return to Website Console overview</Link>
      </div>
      <HomepageTemplatePreview document={review.document} />
    </section>
  );
}
