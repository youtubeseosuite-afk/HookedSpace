// src/app/admin/admin-nav.tsx
// NY FIL. Menu i admin-siden. Fremhæver den side, du står på.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Flag, Ban } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Overblik", icon: LayoutDashboard, exact: true },
  { href: "/admin/medlemmer", label: "Medlemmer", icon: Users },
  { href: "/admin/rapporter", label: "Rapporter", icon: Flag },
  { href: "/admin/bans", label: "Bans og blokeringer", icon: Ban },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="border-t border-deep-800" aria-label="Admin">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${
                active ? "border-red-500 text-mist-50" : "border-transparent text-reed-300 hover:text-mist-50"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
