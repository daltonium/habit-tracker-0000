// app/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type HabitRow = {
  id: string;
  name: string;
  target_per_day: number;
};

type CompletionRow = {
  habit_id: string;
  completed_date: string; // YYYY-MM-DD
};

type HabitStats = {
  habit: HabitRow;
  totalCompletionsLast30Days: number;
  currentStreak: number;
  longestStreak: number;
};

export default function AnalyticsPage() {
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [stats, setStats] = useState<HabitStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // 1) Load habits
        const { data: habitData, error: habitError } = await supabase
          .from("habits")
          .select("id, name, target_per_day")
          .eq("is_archived", false);

        if (habitError) {
          throw habitError;
        }

        const habitRows = (habitData ?? []) as HabitRow[];
        setHabits(habitRows);

        if (habitRows.length === 0) {
          setCompletions([]);
          setStats([]);
          setLoading(false);
          return;
        }

        // 2) Load completions for last 30 days
        const today = new Date();
        const from = new Date();
        from.setDate(today.getDate() - 29);

        const fromStr = from.toISOString().slice(0, 10); // YYYY-MM-DD
        const todayStr = today.toISOString().slice(0, 10);

        const { data: completionData, error: completionError } = await supabase
          .from("habit_completions")
          .select("habit_id, completed_date")
          .gte("completed_date", fromStr)
          .lte("completed_date", todayStr);

        if (completionError) {
          throw completionError;
        }

        const completionRows = (completionData ?? []) as CompletionRow[];
        setCompletions(completionRows);

        // 3) Compute stats
        const stats: HabitStats[] = habitRows.map((habit) => {
          const habitCompletions = completionRows.filter(
            (c) => c.habit_id === habit.id,
          );

          const totalCompletionsLast30Days = habitCompletions.length;

          // compute streaks
          const { currentStreak, longestStreak } =
            computeStreaks(habitCompletions);

          return {
            habit,
            totalCompletionsLast30Days,
            currentStreak,
            longestStreak,
          };
        });

        setStats(stats);
      } catch (err: any) {
        setError(err?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-gray-400">
          Streaks and completions for the last 30 days.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {loading && (
        <p className="text-sm text-gray-400">Loading analytics…</p>
      )}

      {!loading && stats.length === 0 && (
        <p className="text-sm text-gray-400">
          No habits or completions yet. Track some habits to see analytics.
        </p>
      )}

      <section className="space-y-3">
        {stats.map((row) => (
          <div
            key={row.habit.id}
            className="border rounded px-4 py-3 bg-black/40 space-y-1"
          >
            <div className="font-medium text-sm text-gray-100">
              {row.habit.name}
            </div>
            <div className="text-xs text-gray-400">
              Target: {row.habit.target_per_day} / day
            </div>
            <div className="text-xs text-gray-300 mt-2">
              <span className="mr-4">
                Last 30 days:{" "}
                <span className="font-semibold">
                  {row.totalCompletionsLast30Days}
                </span>{" "}
                completions
              </span>
              <span className="mr-4">
                Current streak:{" "}
                <span className="font-semibold">
                  {row.currentStreak} days
                </span>
              </span>
              <span>
                Longest streak:{" "}
                <span className="font-semibold">
                  {row.longestStreak} days
                </span>
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/**
 * Compute current and longest streaks from completion rows.
 * Assumes completed_date in YYYY-MM-DD.
 */
function computeStreaks(completions: CompletionRow[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // sort dates ascending
  const dates = completions
    .map((c) => c.completed_date)
    .sort();

  // convert to Date objects
  const dateObjs = dates.map((d) => new Date(d + "T00:00:00"));

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dateObjs.length; i++) {
    const prev = dateObjs[i - 1];
    const curr = dateObjs[i];

    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  // current streak: check how many consecutive days up to today
  const today = new Date();
  let currentStreak = 0;
  let dayCursor = new Date(today);

  const dateSet = new Set(dates); // YYYY-MM-DD strings

  while (true) {
    const key = dayCursor.toISOString().slice(0, 10);
    if (!dateSet.has(key)) break;
    currentStreak += 1;
    dayCursor.setDate(dayCursor.getDate() - 1);
  }

  return {
    currentStreak,
    longestStreak: longest,
  };
}