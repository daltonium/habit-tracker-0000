"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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

const COLOR_OPTIONS = ["#F43B47", "#453A94", "#22c55e", "#f97316"];
const ICON_OPTIONS = ["🔥", "📚", "💻", "🏃‍♂️"];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // form state for creating
  const [name, setName] = useState("");
  const [targetPerDay, setTargetPerDay] = useState(1);

  // inline edit state
  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editTarget, setEditTarget] = useState<Record<string, number>>({});
  const [editColor, setEditColor] = useState<Record<string, string>>({});
  const [editIcon, setEditIcon] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();

    async function loadHabits() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        const list = data as Habit[];
        setHabits(list);

        // initialise edit state
        const names: Record<string, string> = {};
        const targets: Record<string, number> = {};
        const colors: Record<string, string> = {};
        const icons: Record<string, string> = {};

        for (const h of list) {
          names[h.id] = h.name;
          targets[h.id] = h.target_per_day;
          colors[h.id] = h.color ?? COLOR_OPTIONS[0];
          icons[h.id] = h.icon ?? ICON_OPTIONS[0];
        }

        setEditName(names);
        setEditTarget(targets);
        setEditColor(colors);
        setEditIcon(icons);
      }

      setLoading(false);
    }

    loadHabits();
  }, []);

  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();

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

    const newHabit = data as Habit;
    setHabits((prev) => [...prev, newHabit]);

    setEditName((prev) => ({ ...prev, [newHabit.id]: newHabit.name }));
    setEditTarget((prev) => ({
      ...prev,
      [newHabit.id]: newHabit.target_per_day,
    }));
    setEditColor((prev) => ({
      ...prev,
      [newHabit.id]: newHabit.color ?? COLOR_OPTIONS[0],
    }));
    setEditIcon((prev) => ({
      ...prev,
      [newHabit.id]: newHabit.icon ?? ICON_OPTIONS[0],
    }));

    setName("");
    setTargetPerDay(1);
  }

  async function handleSaveHabit(habitId: string) {
    const supabase = createClient();
    setError(null);
    setSavingId(habitId);

    const nameValue = editName[habitId]?.trim();
    const targetValue = editTarget[habitId] ?? 1;
    const colorValue = editColor[habitId] ?? COLOR_OPTIONS[0];
    const iconValue = editIcon[habitId] ?? ICON_OPTIONS[0];

    try {
      const { data, error } = await supabase
        .from("habits")
        .update({
          name: nameValue,
          target_per_day: targetValue,
          color: colorValue,
          icon: iconValue,
        })
        .eq("id", habitId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const updated = data as Habit;
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? updated : h)),
      );
    } catch (err: any) {
      setError(err?.message || "Failed to save habit");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteHabit(habitId: string) {
    const supabase = createClient();
    setError(null);
    setSavingId(habitId);

    try {
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", habitId);

      if (error) {
        throw error;
      }

      setHabits((prev) => prev.filter((h) => h.id !== habitId));
    } catch (err: any) {
      setError(err?.message || "Failed to delete habit");
    } finally {
      setSavingId(null);
    }
  }

  async function handleArchiveHabit(habitId: string, archived: boolean) {
    const supabase = createClient();
    setError(null);
    setSavingId(habitId);

    try {
      const { data, error } = await supabase
        .from("habits")
        .update({ is_archived: archived })
        .eq("id", habitId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const updated = data as Habit;
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? updated : h)),
      );
    } catch (err: any) {
      setError(err?.message || "Failed to update archive state");
    } finally {
      setSavingId(null);
    }
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
          className="px-4 py-2 rounded bg-[#F43B47] text-white text-sm"
        >
          Add habit
        </button>

        {error && (
          <p className="text-sm text-red-500 mt-2">
            {error}
          </p>
        )}
      </form>

      {loading && (
        <p className="text-sm text-gray-400">Loading habits…</p>
      )}

      {!loading && habits.length === 0 && (
        <p className="text-sm text-gray-400">
          No habits yet. Add one above.
        </p>
      )}

      <section className="space-y-3">
        {habits.map((habit) => {
          const isSaving = savingId === habit.id;

          return (
            <div
              key={habit.id}
              className="border rounded px-4 py-3 bg-black/40 space-y-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span>Color:</span>
                    <div className="flex gap-1">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            setEditColor((prev) => ({
                              ...prev,
                              [habit.id]: c,
                            }))
                          }
                          className={`w-4 h-4 rounded-full border ${
                            (editColor[habit.id] ?? habit.color) === c
                              ? "border-white"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span className="ml-3">Icon:</span>
                    <select
                      className="bg-black/40 rounded px-1 py-0.5 text-xs"
                      value={
                        editIcon[habit.id] ?? habit.icon ?? ICON_OPTIONS[0]
                      }
                      onChange={(e) =>
                        setEditIcon((prev) => ({
                          ...prev,
                          [habit.id]: e.target.value,
                        }))
                      }
                    >
                      {ICON_OPTIONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    className="w-full bg-transparent font-medium text-sm outline-none border-b border-gray-700 focus:border-[#F43B47]"
                    value={editName[habit.id] ?? habit.name}
                    onChange={(e) =>
                      setEditName((prev) => ({
                        ...prev,
                        [habit.id]: e.target.value,
                      }))
                    }
                  />

                  <div className="text-xs text_gray-400">
                    Target:{" "}
                    <input
                      type="number"
                      min={1}
                      className="w-16 bg-transparent border-b border-gray-700 focus:border-[#F43B47] text-xs"
                      value={editTarget[habit.id] ?? habit.target_per_day}
                      onChange={(e) =>
                        setEditTarget((prev) => ({
                          ...prev,
                          [habit.id]: Number(e.target.value),
                        }))
                      }
                    />{" "}
                    / day
                  </div>

                  <div className="text-xs text-gray-500">
                    Status: {habit.is_archived ? "Archived" : "Active"}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleSaveHabit(habit.id)}
                    disabled={isSaving}
                    className={`px-3 py-1 rounded text-xs ${
                      isSaving
                        ? "bg-gray-700 text-gray-300 cursor-not-allowed opacity-70"
                        : "bg-[#F43B47] text-white"
                    }`}
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>

                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    disabled={isSaving}
                    className="px-3 py-1 rounded text-xs bg-red-700 text_white"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() =>
                      handleArchiveHabit(habit.id, !habit.is_archived)
                    }
                    disabled={isSaving}
                    className={`px-3 py-1 rounded text-xs ${
                      habit.is_archived
                        ? "bg-gray-700 text_gray-200"
                        : "bg-indigo-700 text-white"
                    }`}
                  >
                    {habit.is_archived ? "Unarchive" : "Archive"}
                  </button>

                  <Link
                    href={`/habits/${habit.id}/calendar`}
                    className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-200 text-center"
                  >
                    View calendar
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}