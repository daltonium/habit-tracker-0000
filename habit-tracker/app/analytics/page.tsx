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
  completed_date: string;
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

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const { data: habitData, error: habitError } = await supabase
          .from("habits")
          .select("id, name, target_per_day")
          .eq("is_archived", false);

        if (habitError) throw habitError;

        const habitRows = (habitData ?? []) as HabitRow[];
        setHabits(habitRows);

        if (habitRows.length === 0) {
          setCompletions([]);
          setStats([]);
          setLoading(false);
          return;
        }

        const today = new Date();
        const from = new Date();
        from.setDate(today.getDate() - 29);

        const fromStr = from.toISOString().slice(0, 10);
        const todayStr = today.toISOString().slice(0, 10);

        const { data: completionData, error: completionError } = await supabase
          .from("habit_completions")
          .select("habit_id, completed_date")
          .gte("completed_date", fromStr)
          .lte("completed_date", todayStr);

        if (completionError) throw completionError;

        const completionRows = (completionData ?? []) as CompletionRow[];
        setCompletions(completionRows);

        const computedStats: HabitStats[] = habitRows.map((habit) => {
          const habitCompletions = completionRows.filter(
            (c) => c.habit_id === habit.id,
          );

          const { currentStreak, longestStreak } = computeStreaks(habitCompletions);

          return {
            habit,
            totalCompletionsLast30Days: habitCompletions.length,
            currentStreak,
            longestStreak,
          };
        });

        setStats(computedStats);
      } catch (err: any) {
        setError(err?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleGenerateInsights() {
    setAiLoading(true);
    setAiError(null);
    setAiInsight(null);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stats: stats.map((s) => ({
            name: s.habit.name,
            target_per_day: s.habit.target_per_day,
            totalCompletionsLast30Days: s.totalCompletionsLast30Days,
            currentStreak: s.currentStreak,
            longestStreak: s.longestStreak,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Insights request failed (${res.status})`);
      }

      const data = await res.json();
      const text =
        data.insight ?? data.text ?? data.message ?? JSON.stringify(data);

      setAiInsight(text);
    } catch (err: any) {
      setAiError(err?.message || "Failed to generate insights");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-gray-400">
          Streaks and completions for the last 30 days.
        </p>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading && <p className="text-sm text-gray-400">Loading analytics…</p>}

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
            <div className="text-xs text-gray-300 mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Last 30 days:{" "}
                <span className="font-semibold">
                  {row.totalCompletionsLast30Days}
                </span>{" "}
                completions
              </span>
              <span>
                Current streak:{" "}
                <span className="font-semibold">{row.currentStreak} days</span>
              </span>
              <span>
                Longest streak:{" "}
                <span className="font-semibold">{row.longestStreak} days</span>
              </span>
            </div>
          </div>
        ))}
      </section>

      {stats.length > 0 && (
        <section className="border rounded px-4 py-4 bg-black/40 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-100">
              AI Insights
            </h2>
            <button
              onClick={handleGenerateInsights}
              disabled={aiLoading}
              className={`px-3 py-1.5 rounded text-xs ${
                aiLoading
                  ? "bg-gray-700 text-gray-300 cursor-not-allowed opacity-70"
                  : "bg-[#F43B47] text-white"
              }`}
            >
              {aiLoading ? "Generating…" : "Generate AI insights"}
            </button>
          </div>

          {aiError && <p className="text-sm text-red-500">{aiError}</p>}

          {aiInsight && (
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
              {aiInsight}
            </p>
          )}

          {!aiInsight && !aiError && !aiLoading && (
            <p className="text-xs text-gray-500">
              Click the button to get an AI-generated summary of your
              consistency and suggestions.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function computeStreaks(completions: CompletionRow[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dates = completions.map((c) => c.completed_date).sort();
  const dateObjs = dates.map((d) => new Date(d + "T00:00:00"));

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dateObjs.length; i++) {
    const diffDays =
      (dateObjs[i].getTime() - dateObjs[i - 1].getTime()) /
      (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  const today = new Date();
  let currentStreak = 0;
  let dayCursor = new Date(today);
  const dateSet = new Set(dates);

  while (true) {
    const key = dayCursor.toISOString().slice(0, 10);
    if (!dateSet.has(key)) break;
    currentStreak += 1;
    dayCursor.setDate(dayCursor.getDate() - 1);
  }

  return { currentStreak, longestStreak: longest };
}