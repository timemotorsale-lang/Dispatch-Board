import Link from "next/link";

export default function NotFound() {
  return <main className="container narrow"><p className="eyebrow">Time Motor Sales</p><h1>This page is not available.</h1><p>The vehicle may no longer be published. No other vehicle has been substituted.</p><Link className="button primary" href="/shop">Return to inventory</Link></main>;
}
