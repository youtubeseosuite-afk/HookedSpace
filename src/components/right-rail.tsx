// src/components/right-rail.tsx
// NY FIL. Højre sidebar på tablet og desktop (fra 768 px). Skjules på mobil og på GrejAuktionens egne sider.
// Indholdet (fx de nyeste auktioner) hentes på serveren og sendes ind som "rail".

"use client";

import { usePathname } from "next/navigation";

export default function RightRail({
  rail,
  topOffset = false,
  children,
}: {
  rail: React.ReactNode;
  topOffset?: boolean; // true når der er en fast topbar (gæster)
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const show = Boolean(rail) && !pathname.startsWith("/auktioner");

  if (!show) return <>{children}</>;

  return (
    <>
      <div className="md:pr-60 lg:pr-72">{children}</div>
      <aside
        aria-label="Nyeste auktioner"
        className={`fixed bottom-0 right-0 z-30 hidden w-60 overflow-y-auto border-l border-mist-100 bg-white md:block lg:w-72 ${
          topOffset ? "top-14 pb-24" : "top-0"
        }`}
      >
        {rail}
      </aside>
    </>
  );
}
