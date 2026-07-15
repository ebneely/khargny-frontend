"use client";
/**
 * NotFoundState — restyled against the Khargny Design System (TASK-0008).
 * Centered "Not found" + body text + a "Back" link button.
 */
import * as React from "react";
import Link from "next/link";

type NotFoundStateProps = {
  backHref: string;
  backLabel?: string;
};

export function NotFoundState({ backHref, backLabel = "Back" }: NotFoundStateProps) {
  return (
    <div
      role="status"
      style={{
        padding: "var(--space-12) var(--space-4)",
        textAlign: "center",
        fontFamily: "var(--font-body)",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          lineHeight: 1.3,
          color: "var(--text-primary)",
          margin: "0 0 var(--space-2)",
        }}
      >
        Not found
      </h1>
      <p
        style={{
          fontSize: "var(--text-base)",
          lineHeight: 1.5,
          color: "var(--text-tertiary)",
          margin: "0 0 var(--space-6)",
        }}
      >
        This place isn&apos;t available — it may have been removed, or the link is from an older URL.
      </p>
      <Link
        href={backHref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 44,
          padding: "0 20px",
          background: "var(--brand-600)",
          color: "var(--white)",
          border: "1px solid transparent",
          borderRadius: "var(--radius-xl)",
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-base)",
          fontWeight: 600,
          textDecoration: "none",
          transition: "var(--motion-color), var(--motion-shadow)",
        }}
      >
        {backLabel}
      </Link>
    </div>
  );
}
