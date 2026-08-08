// app/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Today" },
  { href: "/habits", label: "Habits" },
  { href: "/analytics", label: "Analytics" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar (< md) */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 md:hidden">
        <span className="text-sm font-semibold text-gray-200">
          Habit Tracker
        </span>
        <nav className="flex gap-1.5">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap ${
                  isActive
                    ? "bg-[#F43B47] text-white"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Desktop sidebar (>= md) */}
      <aside className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:w-52 md:flex-col gap-6 bg-black/40 border-r border-white/10 px-4 py-6">
        <div className="text-sm font-semibold text-gray-200 tracking-wide">
          Habit Tracker
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded transition-colors ${
                  isActive
                    ? "bg-[#F43B47] text-white"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}