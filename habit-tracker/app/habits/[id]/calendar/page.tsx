import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import HeatMap from "./heatmap";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function HabitCalendarPage(
  props: { params: Promise<{ id: string }> }
) {
  const { params } = props;
  const { id: habitId } = await params;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id, name")
    .eq("id", habitId)
    .single();

  if (habitError || !habit) {
    return (
      <div className="p-6">
        <p>Error: {habitError?.message ?? "no habit found"}</p>
      </div>
    );
  }

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 364);

  const { data: completions, error: compError } = await supabase
    .from("habit_completions")
    .select("completed_date")
    .eq("habit_id", habitId)
    .gte("completed_date", toISODate(start))
    .lte("completed_date", toISODate(end));

  if (compError) {
    return (
      <div className="p-6">
        <p>Error loading completions: {compError.message}</p>
      </div>
    );
  }

  const dates = (completions || []).map((c: any) => c.completed_date as string);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        {habit.name} – calendar
      </h1>
      <p className="text-sm text-gray-400">
        Showing the last 365 days of completions.
      </p>

      <HeatMap
        startDate={start}
        endDate={end}
        completionDates={dates}
      />
    </div>
  );
}