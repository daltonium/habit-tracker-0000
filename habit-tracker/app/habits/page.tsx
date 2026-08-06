"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; // adjust if starter uses different path

type Habit = {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  target_per_day: number;
  color: string | null;
  icon: string | null;
  is_archived: boolean;
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [targetPerDay, setTargetPerDay] = useState(1);

    useEffect(() => {
    const supabase = createClient();

    async function loadHabits() {
        setLoading(true);
        const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });

        if (error) setError(error.message);
        else setHabits(data as Habit[]);
        setLoading(false);
    }

    loadHabits();
    }, []);

    async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();

    // get current user (from Supabase auth)
    const { data: userRes, error: userError } = await supabase.auth.getUser();
    if (userError || !userRes?.user) {
        setError("Not logged in or user not found");
        return;
    }

    const user = userRes.user;

    const { data, error } = await supabase
        .from("habits")
        .insert({
        user_id: user.id,
        name,
        target_per_day: targetPerDay,
        })
        .select("*")
        .single();

    if (error) {
        setError(error.message);
        return;
    }

    setHabits((prev) => [...prev, data as Habit]);
    setName("");
    setTargetPerDay(1);
    }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Habits</h1>

      <form onSubmit={handleAddHabit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm mb-1">Habit name</label>
          <input
            className="w-full rounded border px-3 py-2 bg-black/40"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Target per day</label>
          <input
            type="number"
            min={1}
            className="w-full rounded border px-3 py-2 bg-black/40"
            value={targetPerDay}
            onChange={(e) => setTargetPerDay(Number(e.target.value))}
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded bg-emerald-600 text-white"
        >
          Add habit
        </button>

        {error && (
          <p className="text-sm text-red-500 mt-2">
            {error}
          </p>
        )}
      </form>

      <section className="space-y-2">
        {loading && <p>Loading habits...</p>}
        {!loading && habits.length === 0 && (
          <p className="text-sm text-gray-400">No habits yet. Add one above.</p>
        )}
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="border rounded px-4 py-3 flex items-center justify-between"
          >
            <div>
              <div className="font-medium">{habit.name}</div>
              <div className="text-xs text-gray-400">
                Target: {habit.target_per_day} / day
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}