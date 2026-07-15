"use client";
/**
 * CategoryChip — port of `design/builds/Khargny Design System/components/navigation/CategoryChip.jsx`.
 * Used in the homepage's category rail and the explorer's category filter.
 *
 * The chip is a `<button>` with a 2px solid var(--gray-900) border-bottom when active.
 * Default opacity 0.65; hover/active bumps to 1.0. Lucide icon (22×22 on the homepage)
 * sits above the label. The label uses --text-xs.
 */
import * as React from "react";

type CategoryChipProps = {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
};

export function CategoryChip({ label, icon, active = false, onClick }: CategoryChipProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "8px 4px",
        minWidth: 64,
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--gray-900)" : "transparent"}`,
        opacity: active || hover ? 1 : 0.65,
        color: "var(--text-primary)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-xs)",
        cursor: "pointer",
        transition: "var(--motion-color)",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  );
}
