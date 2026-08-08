"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Habit = {
  id: string;
  name: string;
  target_per_day: number;
};

type CompletionMap = Record<string, boolean>;

function todayDateString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completed, setCompleted] = useState<CompletionMap>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = todayDateString();

  const summary = useMemo(() => {
    const total = habits.length;
    const done = habits.filter((h) => completed[h.id]).length;
    return { total, done };
  }, [habits, completed]);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      setLoading(true);
      setError(null);

      // 1) load non-archived habits
      const { data: habitData, error: habitError } = await supabase
        .from("habits")
        .select("id, name, target_per_day")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });

      if (habitError) {
        setError(habitError.message);
        setLoading(false);
        return;
      }

      const habits = habitData as Habit[];
      setHabits(habits);

      if (habits.length === 0) {
        setCompleted({});
        setLoading(false);
        return;
      }

      // 2) load today's completions
      const habitIds = habits.map((h) => h.id);

      const { data: compData, error: compError } = await supabase
        .from("habit_completions")
        .select("habit_id")
        .eq("completed_date", today)
        .in("habit_id", habitIds);

      if (compError) {
        setError(compError.message);
        setLoading(false);
        return;
      }

      const compMap: CompletionMap = {};
      for (const row of compData || []) {
        compMap[row.habit_id] = true;
      }
      setCompleted(compMap);
      setLoading(false);
    }

    loadData();
  }, [today]);

  async function toggleCompletion(habitId: string, isDone: boolean) {
    const supabase = createClient();
    setError(null);
    setSavingId(habitId);

    try {
      if (!isDone) {
        // mark as done: upsert row
        const { error } = await supabase
          .from("habit_completions")
          .upsert(
            {
              habit_id: habitId,
              completed_date: today,
            },
            { onConflict: "habit_id,completed_date" },
          );

        if (error) {
          throw error;
        }

        setCompleted((prev) => ({ ...prev, [habitId]: true }));
      } else {
        // unmark: delete row
        const { error } = await supabase
          .from("habit_completions")
          .delete()
          .eq("habit_id", habitId)
          .eq("completed_date", today);

        if (error) {
          throw error;
        }

        setCompleted((prev) => {
          const copy = { ...prev };
          delete copy[habitId];
          return copy;
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update completion");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold">Today</h1>
        <p className="text-sm text-gray-400">{today}</p>
        {summary.total > 0 && (
          <p className="text-sm text-gray-300">
            {summary.done} of {summary.total} habits done
          </p>
        )}
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading && (
        <p className="text-sm text-gray-400">Loading habits…</p>
      )}

      {!loading && habits.length === 0 && (
        <div className="border rounded px-4 py-3 bg-black/40">
          <p className="text-sm text-gray-300 mb-2">
            No habits for today yet.
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Create a habit to start tracking your streaks.
          </p>
          <Link
            href="/habits"
            className="inline-flex items-center px-3 py-1 rounded bg-emerald-600 text-sm text-white"
          >
            Go to Habits
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {habits.map((habit) => {
          const isDone = !!completed[habit.id];
          const isSaving = savingId === habit.id;

          return (
            <div
              key={habit.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border rounded px-4 py-3 bg-black/40"
            >
              <div className="min-w-0">
                <div
                  className={`font-medium truncate ${
                    isDone ? "line-through text-gray-300" : ""
                  }`}
                >
                  {habit.name}
                </div>
                <div className="text-xs text-gray-400">
                  Target: {habit.target_per_day} / day
                </div>
              </div>
              <button
                onClick={() => toggleCompletion(habit.id, isDone)}
                disabled={isSaving}
                className={`self-start sm:self-auto px-3 py-1 rounded text-sm min-w-[84px] ${
                  isDone
                    ? "bg-[#F43B47] text-white"
                    : "bg-gray-700 text-gray-100"
                } ${isSaving ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSaving ? "Saving…" : isDone ? "Done" : "Mark done"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}