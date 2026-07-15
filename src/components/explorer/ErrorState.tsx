"use client";
/**
 * ErrorState — restyled against the Khargny Design System (TASK-0008).
 * Single line of body text + an optional "Try again" Button.
 * Visual tokens cited from `UI_UX/explorer/styling.md`.
 */
import * as React from "react";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        padding: "var(--space-8) var(--space-4)",
        textAlign: "center",
        color: "var(--text-tertiary)",
        fontFamily: "var(--font-body)",
      }}
    >
      <p
        style={{
          margin: "0 0 var(--space-4)",
          fontSize: "var(--text-base)",
          lineHeight: 1.5,
          color: "var(--text-secondary)",
        }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            height: 44,
            padding: "0 20px",
            background: "var(--white)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-xl)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "var(--motion-color), var(--motion-shadow)",
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
