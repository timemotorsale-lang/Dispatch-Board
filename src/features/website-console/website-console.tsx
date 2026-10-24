import Link from "next/link";
import { ArrowRight, ArrowUpRight, Globe, House } from "lucide-react";
import type { WebsiteDestinations } from "./destinations";
import { WebsiteLaunchLinks } from "./launch-links";
import { DesignStudio } from "./design-studio/design-studio";
import { PaymentEstimates } from "./payment-estimates";
import { ProviderSetup } from "./provider-setup";
import { PaperworkSetup } from "./paperwork";
import { websiteConsoleNavigationItems, websiteSections, type WebsiteSection } from "./navigation";
import styles from "./website-console.module.css";

type Tool = { title: string; description: string; href: string; label: string };

const inventoryTools: Tool[] = [
  { title: "Inventory source of truth", description: "Manage vehicles, pricing, ownership, and readiness in Inventory Console. Existing permissions and operating gates still apply.", href: "/vehicles", label: "Open Inventory Console" },
  { title: "Merchandising preparation", description: "Use the existing frontline workflow for vehicle preparation and merchandising. Website publication is not connected to this workflow yet.", href: "/vehicles/inventory-to-frontline", label: "Open frontline workflow" }
];

const contentTools: Tool[] = [
  { title: "Content and campaign work", description: "Coordinate approved messaging and creative work in Growth Console. This does not publish changes to the public website.", href: "/growth", label: "Open Growth Console" },
  { title: "Approved supporting documents", description: "Use the controlled Document Library for internal source materials. Internal documents are never automatically made public.", href: "/documents", label: "Open Document Library" }
];

const requestTools: Tool[] = [
  { title: "Shared sales team", description: "Continue existing customer follow-up in Sales Console. Public website requests are not being delivered here yet.", href: "/sales", label: "Open Sales Console" },
  { title: "Service team", description: "Continue service coordination in the existing advisor workspace. A website request is not an accepted appointment or repair authorization.", href: "/vehicles/advisor", label: "Open Advisor workspace" }
];

function ToolCards({ tools }: { tools: Tool[] }) {
  return <div className={styles.grid}>{tools.map((tool) => (
    <article className={styles.card} key={tool.href}>
      <h3>{tool.title}</h3><p>{tool.description}</p>
      <Link className={styles.toolLink} href={tool.href}>{tool.label}<ArrowUpRight size={16} aria-hidden="true" /></Link>
    </article>
  ))}</div>;
}

export function WebsiteConsole({ section, destinations }: { section: WebsiteSection; destinations: WebsiteDestinations }) {
  return (
    <div className={styles.console}>
      <header className={styles.hero}>
        <Link className={styles.back} href="/command-center"><House size={16} aria-hidden="true" />CCC Home</Link>
        <div className={styles.heroRow}>
          <div><span className={styles.eyebrow}><Globe size={16} aria-hidden="true" />Digital dealership</span><h1>Website Console</h1><p>One staff launchpad. A separate customer website. Shared operating records.</p></div>
          <span className={styles.badge}>Foundation · not launched</span>
        </div>
        <WebsiteLaunchLinks destinations={destinations} />
      </header>
      <nav className={styles.tabs} aria-label="Website Console sections">
        {!destinations.publicUrl && destinations.previewUrl ? <a href={destinations.previewUrl} target="_blank" rel="noopener noreferrer">Open Website Preview ↗<span className={styles.srOnly}> ({destinations.previewUrl === "/website-review" ? "private hosted review" : "this computer only"}; opens in a new tab)</span></a> : null}
        {websiteConsoleNavigationItems.map((item, index) => (
          <Link href={item.href} key={item.href} aria-current={section === websiteSections[index] ? "page" : undefined}>{item.title}</Link>
        ))}
      </nav>
      <aside className={styles.notice} aria-label="Website integration status"><strong>Separate console, not a second database.</strong> These tools open existing staff workflows. Website publishing, live customer accounts, uploads, and request delivery are not connected. Local preview requests stay local.</aside>

      {section === "overview" ? <section aria-labelledby="website-overview">
        <h2 id="website-overview">Your website workspace</h2><p className={styles.intro}>Choose the work you need. No public changes are made by opening this console.</p>
        <div className={styles.grid}>{websiteConsoleNavigationItems.slice(1).map((item) => {
          const Icon = item.icon;
          return <Link className={styles.cardLink} href={item.href} key={item.href}><Icon size={24} aria-hidden="true" /><h3>{item.title}</h3><p>{item.description}</p><span>Open workspace <ArrowRight size={16} aria-hidden="true" /></span></Link>;
        })}</div>
        {!destinations.publicUrl && destinations.previewUrl ? <div className={styles.summary}><h3>Review and refine your website</h3><p>Use the Open Website Preview tab above whenever the preview is running. It opens the customer website in a new browser tab, leaving this console open.</p>{destinations.previewUrl !== "/website-review" ? <p>If the preview stops or this computer restarts, use the saved Open Time Motor Sales Website Preview launcher. Keep its window open while reviewing, then return to this console to reopen the website as needed.</p> : <p>The hosted preview uses your manager sign-in and runs separately from the staff app. It is available from devices with authorized access to the private staff site.</p>}<p>{destinations.previewUrl === "/website-review" ? "Private hosted design review." : "This preview works on this computer only."} Use fictitious information; requests are not delivered to staff. The preview link disappears automatically when the approved public website address is configured.</p></div> : null}
        <div className={styles.summary}><h3>Public website destination</h3><p>{destinations.publicUrl ? `Configured link: ${destinations.publicUrl}. A configured address is not proof of deployment or availability.` : "No approved public website address is configured. The View Website link will become available when an approved address is set."}</p><p>Local preview is a separate app. It is not a public or phone-accessible deployment.</p></div>
      </section> : null}

      {section === "inventory" ? <section aria-labelledby="website-inventory"><h2 id="website-inventory">Inventory & publication</h2><p className={styles.intro}>Prepare inventory in the existing operating system; publish only an approved public projection.</p><ToolCards tools={inventoryTools} /><div className={styles.summary}><h3>Publication bridge: not connected</h3><p>No public listing counts or publication-success claims are available. Publishing, withdrawal, sold-unit updates, freshness monitoring, and reconciliation must be connected and verified before launch. Opening the frontline workflow does not publish a vehicle.</p></div></section> : null}

      {section === "design-studio" ? <DesignStudio /> : null}

      {section === "payment-estimates" ? <PaymentEstimates previewUrl={destinations.previewUrl} /> : null}

      {section === "providers" ? <ProviderSetup /> : null}
      {section === "paperwork" ? <PaperworkSetup /> : null}

      {section === "readiness" ? <div className={styles.summary}><h3>Keep provider decisions in one place</h3><p>The permanent directory explains required capabilities, candidate services, dependencies and the evidence needed before activation.</p><Link className={styles.toolLink} href="/website-console?section=providers">Open Providers &amp; Setup<ArrowRight size={16} aria-hidden="true" /></Link></div> : null}

      {section === "content" ? <section aria-labelledby="website-content"><h2 id="website-content">Content & media</h2><p className={styles.intro}>Coordinate brand content without exposing private staff documents or customer information.</p><ToolCards tools={contentTools} /><div className={styles.summary}><h3>Website editor: not connected</h3><p>The customer website currently uses the reviewed implementation content. A dedicated draft, approval, preview, and publication workflow still needs implementation. This console does not offer a fake Save or Publish button.</p><ul><li>Sales and service hours remain separate and require approved values.</li><li>Only approved photos and claims may be published.</li><li>Public BHPH, rentals, and license-plate lookup remain deferred.</li></ul></div></section> : null}

      {section === "requests" ? <section aria-labelledby="website-requests"><h2 id="website-requests">Customer requests & handoffs</h2><p className={styles.intro}>Sales and service remain the accountable teams in their existing workspaces.</p><ToolCards tools={requestTools} /><div className={styles.summary}><h3>Website intake bridge: not connected</h3><p>This is not an empty live inbox. Website requests have not been imported or delivered to staff. The local synthetic-data preview is deliberately separate; its records are not read by this console.</p><p>Before activation: verified intake, duplicate handling, team routing, delivery acknowledgements, retries, authorization, and audit history must pass end-to-end acceptance.</p></div></section> : null}

      {section === "readiness" ? <section aria-labelledby="website-readiness"><h2 id="website-readiness">Launch readiness</h2><p className={styles.intro}>A visible console is not a public launch. No provider or financial capability is activated here.</p><div className={styles.summary}><h3>Release gates still open</h3><ul><li>Installed framework security warning requires remediation and revalidation.</li><li>Public domain, hosting, media storage, backups, and capacity plan require review.</li><li>Inventory publication and staff request delivery require verified integrations.</li><li>Production accounts, customer authorization, and secure uploads require implementation.</li><li>Financing, deposits, holds, and e-signature providers remain undecided and disabled.</li><li>Physical-phone camera testing, accessibility review, and launch approval remain outstanding.</li></ul></div><ToolCards tools={[{ title: "Existing integrations", description: "Review configured dealership integrations without creating subscriptions or activating providers.", href: "/integrations", label: "Open Integrations" }]} /></section> : null}
    </div>
  );
}
