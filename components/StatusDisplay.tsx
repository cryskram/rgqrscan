"use client";

interface StatusProps {
  attendance: boolean;
  entry: boolean;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export default function StatusDisplay({
  attendance,
  entry,
  breakfast,
  lunch,
  dinner,
}: StatusProps) {
  const render = (label: string, value: boolean) => (
    <div className="flex justify-between py-1 text-lg">
      <span className="font-medium">{label}:</span>
      <span className={value ? "text-green-500" : "text-red-500"}>
        {value ? "✔️" : "❌"}
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-xl shadow p-4 space-y-1">
      {render("Attendance", attendance)}
      {render("Entry", entry)}
      {render("Breakfast", breakfast)}
      {render("Lunch", lunch)}
      {render("Dinner", dinner)}
    </div>
  );
}
