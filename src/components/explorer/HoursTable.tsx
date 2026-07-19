"use client";
/**
 * HoursTable — restyled against the Khargny Design System (TASK-0008).
 * Renders a place's opening hours as a 7-row table. The caller builds the rows
 * (already ordered + localized) from the backend `placeHours` aggregation and
 * passes them in; this component is a dumb renderer. An empty `hours` array
 * renders nothing — the caller decides whether to show a "not available" note.
 */
import * as React from "react";

export type HoursRow = {
  /** Display label for the day (already localized by the caller). */
  day: string;
  /** Formatted open time, e.g. "9:00 AM". Ignored when `closed`. */
  open: string;
  /** Formatted close time, e.g. "10:00 PM". Ignored when `closed`. */
  close: string;
  /** Closed all day. */
  closed?: boolean;
  /** Closed-label text (localized by the caller). Defaults to "Closed". */
  closedLabel?: string;
};

type HoursTableProps = {
  hours: HoursRow[];
};

export function HoursTable({ hours }: HoursTableProps) {
  if (!hours.length) return null;

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
        {hours.map((r) => (
          <tr key={r.day} style={{ borderBottom: "1px solid var(--border-default)" }}>
            <td style={{ padding: "12px 0", color: "var(--text-primary)", fontWeight: 500 }}>
              {r.day}
            </td>
            <td
              style={{
                padding: "12px 0",
                textAlign: "end",
                color: r.closed ? "var(--text-tertiary)" : "var(--text-secondary)",
              }}
            >
              {r.closed ? r.closedLabel ?? "Closed" : `${r.open} – ${r.close}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
