"use client";
/**
 * SearchBar — port of `design/builds/Khargny Design System/components/discovery/SearchBar.jsx`.
 * Two modes: compact (a single pill button that opens a Sheet on click) and expanded
 * (a 3-section bar used at the explorer for structured filters).
 *
 * This port renders the compact mode only (the homepage uses compact; the explorer's
 * SearchBar stays as a separate file for now). The compact mode is a single `<button>`
 * with the design system's exact visual: 52px height, full pill, var(--white) bg,
 * var(--shadow-md) shadow, the trailing search-icon circle in var(--brand-600).
 */
import * as React from "react";

type SearchBarProps = {
  area?: string;
  when?: string;
  group?: string;
  onOpen: () => void;
  ariaLabel?: string;
};

export function SearchBar({ area, when, onOpen, ariaLabel = "Open search filters" }: SearchBarProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        height: 52,
        padding: "0 8px 0 18px",
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--border-default)",
        background: "var(--white)",
        boxShadow: "var(--shadow-md)",
        fontFamily: "var(--font-body)",
        cursor: "pointer",
        transition: "var(--motion-shadow)",
      }}
    >
      <span
        style={{
          flex: 1,
          textAlign: "start",
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          fontWeight: "var(--weight-medium)",
        }}
      >
        {area || "Anywhere in Egypt"}
        <span style={{ color: "var(--gray-300)", margin: "0 6px" }}>|</span>
        <span style={{ color: "var(--text-tertiary)", fontWeight: "var(--weight-regular)" }}>
          {when || "Any day"}
        </span>
      </span>
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--brand-600)",
          color: "var(--white)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <img
          src="https://unpkg.com/lucide-static@0.462.0/icons/search.svg"
          alt=""
          width={16}
          height={16}
          style={{ filter: "invert(1)" }}
        />
      </span>
    </button>
  );
}
