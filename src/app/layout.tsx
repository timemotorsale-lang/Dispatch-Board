import type { Metadata } from "next";
import type { ReactNode } from "react";

import { APP_NAME } from "./config";
import { appearanceInitializationScript } from "@/components/layout/appearance-config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Time Motor Sales Command Control Center and Dispatch Board.",
  icons: {
    icon: "/brand/favicon-64.png",
    apple: "/brand/apple-touch-icon.png"
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: appearanceInitializationScript }} /></head>
      <body>{children}</body>
    </html>
  );
}

