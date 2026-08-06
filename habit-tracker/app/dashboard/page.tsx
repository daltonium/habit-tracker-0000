"use client";

import { useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      setLoading(true);
      setError(null);
      const today = todayDateString();

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

      // 2) load today's completions for these habits
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
  }, []);

  async function toggleCompletion(habitId: string, done: boolean) {
    const supabase = createClient();
    const today = todayDateString();

    setError(null);

    if (!done) {
      // mark as done: upsert row
      const { error } = await supabase
        .from("habit_completions")
        .upsert(
          {
            habit_id: habitId,
            completed_date: today,
          },
          { onConflict: "habit_id,completed_date" }
        );

      if (error) {
        setError(error.message);
        return;
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
        setError(error.message);
        return;
      }

      setCompleted((prev) => {
        const copy = { ...prev };
        delete copy[habitId];
        return copy;
      });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-2">Today</h1>
      <p className="text-sm text-gray-400 mb-4">
        {todayDateString()}
      </p>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {loading && <p>Loading habits...</p>}

      {!loading && habits.length === 0 && (
        <p className="text-sm text-gray-400">
          No habits yet. Create one on the Habits page.
        </p>
      )}

      <div className="space-y-3">
        {habits.map((habit) => {
          const isDone = !!completed[habit.id];
          return (
            <div
              key={habit.id}
              className="flex items-center justify-between border rounded px-4 py-3"
            >
              <div>
                <div className="font-medium">{habit.name}</div>
                <div className="text-xs text-gray-400">
                  Target: {habit.target_per_day} / day
                </div>
              </div>
              <button
                onClick={() => toggleCompletion(habit.id, isDone)}
                className={`px-3 py-1 rounded text-sm ${
                  isDone
                    ? "bg-emerald-700 text-white"
                    : "bg-gray-700 text-gray-100"
                }`}
              >
                {isDone ? "Done" : "Mark done"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}