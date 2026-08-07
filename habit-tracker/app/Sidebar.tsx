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
    <aside className="fixed left-0 top-0 h-full w-52 bg-black/40 border-r border-white/10 px-4 py-6 flex flex-col gap-6">
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
  );
}