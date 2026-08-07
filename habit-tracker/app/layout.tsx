// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Track habits, streaks, and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Sidebar />

          <main className="min-h-screen ml-52">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}