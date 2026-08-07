// app/Navbar.tsx
"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <nav className="flex gap-4 px-6 py-3 text-sm text-gray-200">
      <Link href="/dashboard">Today</Link>
      <Link href="/habits">Habits</Link>
      <Link href="/analytics">Analytics</Link>
    </nav>
  );
}