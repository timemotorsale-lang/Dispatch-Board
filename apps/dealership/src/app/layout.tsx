import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";
import { publicPath } from "../lib/paths";

export const metadata: Metadata = {
  title: { default: "Time Motor Sales | Your next vehicle", template: "%s | Time Motor Sales" },
  description: "Simple shopping. Real people. Explore Time Motor Sales vehicles and prepare your next steps.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: publicPath("/brand/favicon-64.png"), type: "image/png", sizes: "64x64" }],
    apple: [{ url: publicPath("/brand/apple-touch-icon.png") }]
  }
};

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><a className="skip" href="#main">Skip to content</a>{children}</body></html>;
}
