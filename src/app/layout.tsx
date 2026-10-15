// src/app/layout.tsx
// NY FIL. Rodlayout for hele appen: sprog, metadata og global CSS.

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HookedSpace – Det sociale netværk for lystfiskere",
    template: "%s · HookedSpace",
  },
  description:
    "Del dine fangster, følg andre lystfiskere og byg din trofævæg. Et fællesskab for danske lystfiskere.",
  metadataBase: new URL("https://hookedspace.com"),
};

export const viewport: Viewport = {
  themeColor: "#0b2230",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
