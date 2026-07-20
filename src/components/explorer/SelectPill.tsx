"use client";
/**
 * SelectPill — the one pill-shaped listbox used by every header selector (city, area).
 *
 * Extracted because the city and area selectors are the same control with different data:
 * shipping two hand-rolled popovers guarantees they drift, and a user who learns one should
 * already know the other. Everything below is the shared behaviour those two were missing:
 *
 *   - full state set: default, hover, focus-visible, open, disabled, empty
 *   - roving keyboard support (↑ ↓ Home End Enter Esc) over a real listbox
 *   - closes on Escape and on outside pointerdown, and restores focus to the trigger
 *   - the open panel is scrolled to the selected option, so a long list doesn't open blind
 *   - `position: fixed` panel, so an ancestor with overflow can never clip it
 *
 * Icons are bundled (lucide-react). The previous selector fetched its chevron from
 * unpkg.com on every render: a third-party request on the critical path that fails offline,
 * behind a strict CSP, or when the CDN is slow, and shifts layout when it lands.
 */
import * as React from "react";
import { ChevronDown, Check } from "lucide-react";

export type SelectPillOption = {
  /** Stable value handed back to onChange. */
  value: string;
  /** Localized label shown to the reader. */
  label: string;
};

type SelectPillProps = {
  options: SelectPillOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder: string;
  /** Accessible name for the listbox. */
  label: string;
  /** Shown in place of the list when there are no options. */
  emptyLabel?: string;
  /** Optional leading "everything" row (e.g. All areas). Selected when value is null. */
  allLabel?: string;
  disabled?: boolean;
};

export function SelectPill({
  options,
  value,
  onChange,
  placeholder,
  label,
  emptyLabel,
  allLabel,
  disabled,
}: SelectPillProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const [anchor, setAnchor] = React.useState<{ top: number; left: number; width: number } | null>(null);

  // A null value means "all" when an allLabel is offered, so the two share one index space:
  // row 0 is All, and the real options follow.
  const rows: SelectPillOption[] = React.useMemo(
    () => (allLabel ? [{ value: "", label: allLabel }, ...options] : options),
    [allLabel, options],
  );
  const selectedIndex = React.useMemo(
    () => Math.max(0, rows.findIndex((r) => r.value === (value ?? ""))),
    [rows, value],
  );
  const current = rows.find((r) => r.value === (value ?? ""));
  const triggerLabel = value ? current?.label ?? placeholder : allLabel ?? placeholder;

  const isEmpty = options.length === 0;
  const isDisabled = disabled || isEmpty;

  // Measure the trigger so the fixed panel sits under it. Fixed positioning is what keeps
  // the panel out of any ancestor's overflow, which is the usual reason a dropdown is clipped.
  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 220) });
  }, []);

  const close = React.useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    setActiveIndex(selectedIndex);
    const onDocDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if (listRef.current?.contains(e.target as Node)) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    // Reposition rather than reopen: a scroll or resize while open must not leave the
    // panel floating away from its trigger.
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place, selectedIndex, close]);

  // Bring the active row into view for keyboard users and for long lists.
  React.useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // Move focus into the list as it opens, so the arrow keys drive it immediately rather
  // than requiring an extra Tab.
  React.useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const commit = (row: SelectPillOption) => {
    onChange(row.value);
    close();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(rows.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) commit(row);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <style>{`
        .khg-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; min-height: 36px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-default);
          background: var(--white); color: var(--text-primary);
          font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500;
          cursor: pointer; transition: var(--motion-color);
          max-width: 200px;
        }
        .khg-pill:hover:not(:disabled) { background: var(--surface-sunken); }
        .khg-pill[data-open="true"] { background: var(--surface-sunken); border-color: var(--brand-400); }
        .khg-pill:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
        .khg-pill:disabled { opacity: 0.55; cursor: not-allowed; }
        .khg-pill-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .khg-pill-chev { flex: none; transition: transform var(--duration-fast) var(--ease-standard); }
        .khg-pill[data-open="true"] .khg-pill-chev { transform: rotate(180deg); }
        .khg-pill-panel {
          position: fixed; z-index: 60;
          max-height: min(320px, 60vh); overflow-y: auto;
          background: var(--white); border: 1px solid var(--border-default);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
          padding: var(--space-1); margin: 0; list-style: none;
          animation: khg-pill-in var(--duration-fast) var(--ease-standard);
        }
        @keyframes khg-pill-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .khg-pill-row {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          width: 100%; text-align: start; padding: 8px 12px;
          border: none; background: transparent; color: var(--text-primary);
          font-family: var(--font-body); font-size: var(--text-sm);
          border-radius: var(--radius-md); cursor: pointer;
        }
        .khg-pill-row[data-active="true"] { background: var(--surface-sunken); }
        .khg-pill-row[data-selected="true"] { font-weight: 600; color: var(--brand-700); }
        .khg-pill-empty {
          padding: 10px 12px; color: var(--text-secondary);
          font-family: var(--font-body); font-size: var(--text-sm);
        }
        @media (prefers-reduced-motion: reduce) {
          .khg-pill-panel { animation: none; }
          .khg-pill-chev { transition: none; }
        }
      `}</style>

      <button
        ref={triggerRef}
        type="button"
        className="khg-pill"
        data-open={open ? "true" : undefined}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => !isDisabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
      >
        <span className="khg-pill-text">{isEmpty ? emptyLabel ?? placeholder : triggerLabel}</span>
        <ChevronDown className="khg-pill-chev" size={14} aria-hidden="true" />
      </button>

      {open && anchor && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onListKey}
          className="khg-pill-panel"
          style={{ top: anchor.top, left: anchor.left, minWidth: anchor.width }}
        >
          {rows.length === 0 ? (
            <li className="khg-pill-empty">{emptyLabel}</li>
          ) : (
            rows.map((row, i) => {
              const selected = row.value === (value ?? "");
              return (
                <li key={row.value || "__all"} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    data-idx={i}
                    data-active={i === activeIndex ? "true" : undefined}
                    data-selected={selected ? "true" : undefined}
                    className="khg-pill-row"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(row)}
                  >
                    <span>{row.label}</span>
                    {selected && <Check size={14} aria-hidden="true" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
