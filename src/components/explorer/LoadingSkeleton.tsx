"use client";
/**
 * LoadingSkeleton — restyled against the Khargny Design System (TASK-0008).
 * Pulsing var(--gray-100) placeholders. Two variants: rail (default) and detail.
 */
import * as React from "react";

type LoadingSkeletonProps = {
  count?: number;
  variant?: "rail" | "detail";
};

export function LoadingSkeleton({ count = 6, variant = "rail" }: LoadingSkeletonProps) {
  if (variant === "detail") {
    return (
      <div
        style={{
          padding: "var(--space-6) var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            height: 240,
            borderRadius: "var(--radius-xl)",
            background: "var(--gray-100)",
            animation: "khargny-pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 32,
            width: "60%",
            borderRadius: "var(--radius-md)",
            background: "var(--gray-100)",
            animation: "khargny-pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 16,
            width: "40%",
            borderRadius: "var(--radius-md)",
            background: "var(--gray-100)",
            animation: "khargny-pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 120,
            borderRadius: "var(--radius-md)",
            background: "var(--gray-100)",
            animation: "khargny-pulse 1.5s ease-in-out infinite",
          }}
        />
        <style>{`@keyframes khargny-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-4)",
        overflowX: "auto",
        padding: "0 var(--space-4) var(--space-4)",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 168,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              width: 168,
              height: 168,
              borderRadius: "var(--radius-xl)",
              background: "var(--gray-100)",
              animation: "khargny-pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: "70%",
              height: 14,
              borderRadius: "var(--radius-sm)",
              background: "var(--gray-100)",
              animation: "khargny-pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: "50%",
              height: 12,
              borderRadius: "var(--radius-sm)",
              background: "var(--gray-100)",
              animation: "khargny-pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      ))}
      <style>{`@keyframes khargny-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
