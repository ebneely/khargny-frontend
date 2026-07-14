'use client';

interface HoursEntry {
  day: string;
  open: string;
  close: string;
}

interface HoursTableProps {
  hours: HoursEntry[];
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function HoursTable({ hours }: HoursTableProps) {
  if (hours.length === 0) return null;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const sorted = [...hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day),
  );

  return (
    <div className="space-y-1">
      {sorted.map((entry) => {
        const isToday = entry.day === today;
        return (
          <div
            key={entry.day}
            className={`flex justify-between py-1 px-2 rounded ${
              isToday ? 'bg-orange-50 font-medium' : ''
            }`}
          >
            <span className="text-sm text-foreground">{entry.day}</span>
            <span className="text-sm text-muted-foreground">
              {entry.open} – {entry.close}
            </span>
          </div>
        );
      })}
    </div>
  );
}
