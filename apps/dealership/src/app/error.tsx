"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="container narrow"><h1>We could not load this page.</h1><p>This is a loading problem, not an empty inventory or a completed request.</p><button onClick={reset} className="button primary">Try again</button><Link href="/" className="button">Return Home</Link></main>;
}
