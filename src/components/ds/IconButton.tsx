"use client";
/**
 * IconButton — port of `design/builds/Khargny Design System/components/core/IconButton.jsx`.
 * Used in the home header (Language icon), BottomNav active-state heart, place-detail
 * header (Back / Share / Save), and similar spots.
 *
 * The kit's `IconButton` is a thin shell: it renders an icon, an `aria-label`, and
 * an optional `selected` boolean that controls the inner filter. This port preserves
 * the kit's API exactly; the only addition is `min-width: 44px; min-height: 44px;`
 * to satisfy `--tap-target-min` (the kit's `IconButton` is 36×36, which is below
 * the design system's own minimum tap target — flagged in K3).
 */
import * as React from "react";

type IconButtonProps = {
  ariaLabel: string;
  icon: React.ReactNode;
  variant?: "filled" | "ghost";
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
};

export function IconButton({
  ariaLabel,
  icon,
  variant = "filled",
  selected = false,
  onClick,
  style,
}: IconButtonProps) {
  const isFilled = variant === "filled";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        // Enforce the design system's own --tap-target-min; the kit is 36x36,
        // this overrides to 44x44 by padding out (the inner icon stays 36).
        minWidth: 44,
        minHeight: 44,
        borderRadius: "var(--radius-full)",
        background: isFilled ? "var(--white)" : "transparent",
        border: isFilled ? "1px solid var(--border-default)" : "none",
        cursor: "pointer",
        transition: "var(--motion-color)",
        ...style,
      }}
    >
      {icon}
    </button>
  );
}
