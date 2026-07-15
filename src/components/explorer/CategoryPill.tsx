"use client";
/**
 * CategoryPill — restyled against the Khargny Design System (TASK-0008).
 * Renders a single category as a pill in the explorer's category rail.
 * Visual tokens from `UI_UX/explorer/styling.md` + `beauty/category-chip/spec.md`.
 */
import * as React from "react";

type CategoryPillProps = {
  label: string;
  icon?: string;
  active?: boolean;
  onClick: () => void;
};

export function CategoryPill({ label, icon, active = false, onClick }: CategoryPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: "var(--radius-full)",
        background: active ? "var(--brand-50)" : "var(--white)",
        border: `1px solid ${active ? "var(--brand-100)" : "var(--border-default)"}`,
        color: active ? "var(--brand-700)" : "var(--text-primary)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
        fontWeight: active ? 600 : 500,
        whiteSpace: "nowrap",
        cursor: "pointer",
        transition: "var(--motion-color)",
      }}
    >
      {icon && (
        <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>
          {icon}
        </span>
      )}
      {label}
    </button>
  );
}
