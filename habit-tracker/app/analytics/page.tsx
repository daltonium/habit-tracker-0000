"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type HabitRow = {
  id: string;
  name: string;
};

type CompletionRow = {
  habit_id: string;
  completed_date: string;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// compute current and longest streak from completion dates
function computeStreaks(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const days = dates
    .map((d) => new Date(d + "T00:00:00"))
    .sort((a, b) => a.getTime() - b.getTime());

  let longest = 1;
  let current = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1];
    const curr = days[i];

    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  // recompute current streak backwards from today
  const today = new Date();
  let curStreak = 0;
  let cursor = new Date(today);
  const set = new Set(dates);

  while (set.has(toISODate(cursor))) {
    curStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current: curStreak, longest };
}

// completion rate over last N days
function completionRate(dates: string[], windowDays: number): number {
  if (windowDays <= 0) return 0;

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (windowDays - 1));

  const set = new Set(dates);
  let count = 0;

  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (set.has(toISODate(d))) count += 1;
  }

  return (count / windowDays) * 100;
}

export default function AnalyticsPage() {
  const supabase = createClient();

  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [byHabit, setByHabit] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [insights, setInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      // load habits
      const { data: habitData, error: habitsError } = await supabase
        .from("habits")
        .select<HabitRow>("id, name")
        .eq("is_archived", false);

      if (habitsError) {
        setError(habitsError.message);
        setLoading(false);
        return;
      }

      const habits = habitData || [];
      setHabits(habits);

      if (habits.length === 0) {
        setByHabit({});
        setLoading(false);
        return;
      }

      // load completions for last 90 days
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 89);

      const { data: completionData, error: compError } = await supabase
        .from("habit_completions")
        .select<CompletionRow>("habit_id, completed_date")
        .gte("completed_date", toISODate(start))
        .lte("completed_date", toISODate(end));

      if (compError) {
        setError(compError.message);
        setLoading(false);
        return;
      }

      const map: Record<string, string[]> = {};
      for (const row of completionData || []) {
        if (!map[row.habit_id]) map[row.habit_id] = [];
        map[row.habit_id].push(row.completed_date);
      }

      setByHabit(map);
      setLoading(false);
    }

    load();
  }, [supabase]);

  // build weekly totals (any habit) for last 4 weeks
  const weeks: { label: string; completed: number }[] = (() => {
    const allDates = Object.values(byHabit).flat();
    const set = new Set(allDates);
    const today = new Date();
    const res: { label: string; completed: number }[] = [];

    for (let w = 3; w >= 0; w--) {
      const start = new Date(today);
      start.setDate(today.getDate() - w * 7);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;

      let completed = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (set.has(toISODate(d))) completed += 1;
      }

      res.push({ label, completed });
    }

    return res;
  })();

  const summary = habits.map((habit) => {
    const dates = byHabit[habit.id] || [];
    const streaks = computeStreaks(dates);
    const rate30 = completionRate(dates, 30);
    return {
      name: habit.name,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      completion30: rate30,
    };
  });

  async function handleGetInsights() {
    setAiLoading(true);
    setAiError(null);
    setInsights(null);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are analyzing a user's habit tracking data. Here is JSON: ${JSON.stringify(
            summary,
          )}. In 3-5 sentences, describe their overall consistency, when they are strongest or weakest, and give one concrete suggestion to improve.`,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setAiError(data.error || "AI error");
      } else {
        setInsights(data.text);
      }
    } catch (err: any) {
      setAiError(err?.message || "Request failed");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Analytics</h1>
        <p className="text-sm text-gray-400">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Analytics</h1>
        <p className="text-sm text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Analytics</h1>
        <p className="text-sm text-gray-400">
          No habits yet. Create some first.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="text-sm text-gray-400">
        Streaks and completion rates based on the last 90 days.
      </p>

      {/* AI insights */}
      <div className="space-y-2">
        <button
          onClick={handleGetInsights}
          className="px-4 py-2 rounded bg-emerald-600 text-white text-sm"
        >
          {aiLoading ? "Generating insights..." : "Ask AI for insights"}
        </button>
        {aiError && (
          <p className="text-xs text-red-500">{aiError}</p>
        )}
        {insights && (
          <div className="mt-2 border rounded px-4 py-3 text-sm whitespace-pre-wrap">
            {insights}
          </div>
        )}
      </div>

      {/* Weekly chart */}
      <div className="h-64 border rounded px-4 py-3">
        <div className="text-sm text-gray-300 mb-2">
          Total completions per week (last 4 weeks)
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks}>
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="completed" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-habit cards */}
      <div className="space-y-3">
        {habits.map((habit) => {
          const dates = byHabit[habit.id] || [];
          const streaks = computeStreaks(dates);
          const rate30 = completionRate(dates, 30);

          return (
            <div
              key={habit.id}
              className="border rounded px-4 py-3 flex flex-col gap-1"
            >
              <div className="font-medium">{habit.name}</div>
              <div className="text-xs text-gray-400">
                Current streak: {streaks.current} days · Longest streak:{" "}
                {streaks.longest} days
              </div>
              <div className="text-xs text-gray-400">
                Last 30 days completion: {rate30.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}