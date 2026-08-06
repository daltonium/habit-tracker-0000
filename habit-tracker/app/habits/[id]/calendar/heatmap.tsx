"use client";

import HeatMap from "@uiw/react-heat-map";

type Props = {
  startDate: Date;
  endDate: Date;
  completionDates: string[]; // "YYYY-MM-DD"
};

export default function HabitHeatMap({
  startDate,
  endDate,
  completionDates,
}: Props) {
  const data = completionDates.map((d) => ({
    date: d,
    count: 1,
  }));

  return (
    <div className="mt-4">
      <HeatMap
        value={data}
        startDate={startDate}
        endDate={endDate}
        weekLabels={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
        panelColors={{
          0: "#111827",
          1: "#16a34a",
        }}
      />
      <p className="text-xs text-gray-400 mt-2">
        Green days = completed; dark = missed.
      </p>
    </div>
  );
}