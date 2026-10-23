import type { WebsiteDestinations } from "./destinations";
import styles from "./website-console.module.css";

export function WebsiteLaunchLinks({ destinations }: { destinations: WebsiteDestinations }) {
  return (
    <div className={styles.launchLinks}>
      {destinations.publicUrl ? (
        <a className={styles.primary} href={destinations.publicUrl} target="_blank" rel="noopener noreferrer">View Website <span className={styles.srOnly}>(opens in a new tab)</span></a>
      ) : <span className={styles.unavailable}>View Website — domain not configured</span>}
      {!destinations.publicUrl && destinations.previewUrl ? (
        <a className={styles.secondary} href={destinations.previewUrl} target="_blank" rel="noopener noreferrer">Open Website Preview <span className={styles.srOnly}>({destinations.previewUrl === "/website-review" ? "private hosted review" : "this computer only"}; opens in a new tab)</span></a>
      ) : null}
    </div>
  );
}
