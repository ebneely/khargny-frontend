"use client";
/**
 * SearchBar (explorer version) — restyled against the Khargny Design System (TASK-0008).
 * Compact, real `<input type="search">` (not a button — the explorer's search is a real
 * keyword input, not the homepage's region picker). Visual tokens from
 * `UI_UX/explorer/styling.md`.
 */
import * as React from "react";
import { Search, X } from "lucide-react";
import { useI18n } from '@/i18n/LocaleProvider';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = "Search places..." }: SearchBarProps) {
  const { t } = useI18n();
  const inputRef = React.useRef<HTMLInputElement>(null);
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
      {/* type=search keeps the semantics (and the Escape-to-clear behaviour), but Chrome
          and Safari draw their own grey clear button on top of ours — two crosses, only one
          of which matches the design. Hide theirs, keep ours. */}
      <style>{`
        .khg-searchbar-input::-webkit-search-cancel-button,
        .khg-searchbar-input::-webkit-search-decoration { -webkit-appearance: none; appearance: none; }
        .khg-searchbar-input::-ms-clear { display: none; width: 0; height: 0; }
      `}</style>
      <input
        ref={inputRef}
        className="khg-searchbar-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
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
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          aria-label={t('explorer.clearSearch')}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            padding: 0,
            minWidth: 32,
            minHeight: 40,
            justifyContent: 'center',
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
