// src/components/app-shell.tsx
// NY FIL. App-rammen: smal sidebar på tablet/desktop (ikoner, tekst ved hover) og topbar med burger-menu på mobil.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fish, Home, PlusCircle, Search, User, Settings, LogOut, Menu, X, type LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-reed-500 text-sm font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function AppShell({
  username,
  displayName,
  avatarUrl,
  children,
}: {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav: NavItem[] = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/fangst/ny", label: "Ny fangst", icon: PlusCircle },
    { href: "/opdag", label: "Find fiskere", icon: Search },
    { href: `/u/${username}`, label: "Min profil", icon: User },
    { href: "/indstillinger", label: "Indstillinger", icon: Settings },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Luk mobilmenuen når man skifter side
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh">
      {/* ---------- Mobil: topbar ---------- */}
      <header className="sticky top-0 z-40 border-b border-deep-800 bg-deep-900 text-mist-50 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/feed" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lure-400 text-deep-950">
              <Fish className="h-5 w-5" aria-hidden />
            </span>
            HookedSpace
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Luk menu" : "Åbn menu"}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-deep-800"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-menu" className="border-t border-deep-800 px-2 pb-3 pt-2">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base ${
                  isActive(href) ? "bg-deep-800 text-lure-400" : "text-mist-100 hover:bg-deep-800"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            ))}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base text-mist-100 hover:bg-deep-800"
              >
                <LogOut className="h-5 w-5" aria-hidden />
                Log ud
              </button>
            </form>
          </nav>
        )}
      </header>

      {/* ---------- Tablet/desktop: sidebar ---------- */}
      <aside
        className="group fixed inset-y-0 left-0 z-40 hidden w-16 flex-col overflow-hidden bg-deep-900 text-mist-50 transition-[width] duration-200 ease-out hover:w-56 hover:shadow-2xl md:flex"
        aria-label="Hovedmenu"
      >
        <Link href="/feed" className="flex h-16 items-center px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lure-400 text-deep-950 group-hover:hidden">
            <Fish className="h-5 w-5" aria-hidden />
          </span>
          <span className="sr-only whitespace-nowrap text-lg font-bold group-hover:not-sr-only">
            HookedSpace
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex h-11 items-center rounded-lg px-3 ${
                isActive(href) ? "bg-deep-800 text-lure-400" : "text-mist-100 hover:bg-deep-800"
              }`}
            >
              <Icon className="h-6 w-6 shrink-0 group-hover:hidden" aria-hidden />
              <span className="sr-only whitespace-nowrap text-sm font-medium group-hover:not-sr-only">
                {label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-deep-800 px-2 py-3">
          <div className="flex h-11 items-center px-2">
            <span className="group-hover:hidden">
              <Avatar name={displayName} url={avatarUrl} />
            </span>
            <span className="sr-only truncate text-sm group-hover:not-sr-only">
              {displayName}
            </span>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Log ud"
              className="flex h-11 w-full items-center rounded-lg px-3 text-mist-100 hover:bg-deep-800"
            >
              <LogOut className="h-6 w-6 shrink-0 group-hover:hidden" aria-hidden />
              <span className="sr-only whitespace-nowrap text-sm font-medium group-hover:not-sr-only">
                Log ud
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* ---------- Indhold ---------- */}
      <div className="md:pl-16">{children}</div>
    </div>
  );
}
