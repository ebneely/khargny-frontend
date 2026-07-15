"use client";
/**
 * Toast — port of `design/builds/Khargny Design System/components/feedback/Toast.jsx`.
 * A transient success/error message anchored to the lower-left of the screen.
 * Used by TASK-0009 to confirm a save (success) or report a save failure (error).
 *
 * The toast self-dismisses after 2.5s (matches the kit's pattern). Tapping anywhere
 * on the toast dismisses it early.
 */
import * as React from "react";

type ToastProps = {
  message: string;
  tone?: "success" | "error";
  onDismiss?: () => void;
};

export function Toast({ message, tone = "success", onDismiss }: ToastProps) {
  React.useEffect(() => {
    const t = setTimeout(() => onDismiss?.(), 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const bg = tone === "success" ? "var(--success-bg)" : "var(--error-bg)";
  const fg = tone === "success" ? "var(--success)" : "var(--error)";
  const border = tone === "success" ? "var(--success)" : "var(--error)";

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      style={{
        position: "fixed",
        left: 16,
        bottom: "calc(80px + env(safe-area-inset-bottom))",
        zIndex: 40,
        maxWidth: 360,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        boxShadow: "var(--shadow-md)",
        cursor: "pointer",
      }}
    >
      {message}
    </div>
  );
}
