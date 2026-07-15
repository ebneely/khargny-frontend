"use client";
/**
 * SearchBar (explorer version) — restyled against the Khargny Design System (TASK-0008).
 * Compact, real `<input type="search">` (not a button — the explorer's search is a real
 * keyword input, not the homepage's region picker). Visual tokens from
 * `UI_UX/explorer/styling.md`.
 */
import * as React from "react";
import { Search, X } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = "Search places..." }: SearchBarProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 44,
        padding: "0 14px 0 14px",
        borderRadius: "var(--radius-full)",
        background: "var(--white)",
        border: "1.5px solid var(--gray-300)",
        transition: "var(--motion-color), var(--motion-shadow)",
        fontFamily: "var(--font-body)",
        width: "100%",
      }}
    >
      <Search
        size={16}
        style={{
          flexShrink: 0,
          color: "var(--text-tertiary)",
        }}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: "none",
          outline: "none",
          flex: 1,
          fontSize: "var(--text-base)",
          color: "var(--text-primary)",
          background: "transparent",
          fontFamily: "var(--font-body)",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
