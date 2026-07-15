"use client";
/**
 * HoursTable — restyled against the Khargny Design System (TASK-0008).
 * Renders the place's opening hours as a 7-row table. Empty-state renders a "—" in
 * each cell when the hours array is empty (per `Modules/places/decisions.md` — the
 * real backend's `GET /v1/places/{slug}` does NOT return hours today; this is a
 * known gap carried forward, not fixed in TASK-0008).
 */
import * as React from "react";

type HoursRow = {
  day: string;
  open: string;
  close: string;
  closed?: boolean;
};

type HoursTableProps = {
  hours: HoursRow[];
};

const DEFAULT_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

export function HoursTable({ hours }: HoursTableProps) {
  const rows: HoursRow[] = DEFAULT_DAYS.map((day) => {
    const found = hours.find((h) => h.day === day);
    return (
      found ?? { day, open: "—", close: "—" }
    );
  });

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
      }}
    >
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.day}
            style={{
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <td
              style={{
                padding: "12px 0",
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {r.day}
            </td>
            <td
              style={{
                padding: "12px 0",
                textAlign: "end",
                color: r.closed ? "var(--text-tertiary)" : "var(--text-secondary)",
              }}
            >
              {r.closed ? "Closed" : r.open === "—" ? "—" : `${r.open} – ${r.close}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
