import type { Metadata } from "next";
import type { ReactNode } from "react";

import { APP_NAME } from "./config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Project foundation scaffold for the Time Motor Sales Dispatch Board."
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

