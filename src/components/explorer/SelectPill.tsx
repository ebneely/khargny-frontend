"use client";
/**
 * SelectPill — the one pill-shaped picker used by every scope selector (city, area).
 *
 * The pill names what is chosen; tapping it opens a sheet with the choices, exactly as the
 * app does. It used to open a small popover under the pill: fine with a mouse, cramped under
 * a thumb, and a different idea from the app's city sheet for the same job.
 *
 * In the sheet: one row per choice, the chosen one marked; an optional leading "everything"
 * row (All areas); a search field once the list is long enough to need one; arrow keys, Home,
 * End and Enter work; choosing closes the sheet and returns focus to the pill.
 */
import * as React from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { Sheet } from "@/components/ds/Sheet";

export type SelectPillOption = {
  /** Stable value handed back to onChange. */
  value: string;
  /** Localized label shown to the reader. */
  label: string;
  /** Optional quiet detail at the end of the row, e.g. a count. */
  detail?: string;
};

type SelectPillProps = {
  options: SelectPillOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder: string;
  /** Accessible name of the control and the sheet's title. */
  label: string;
  /** Shown in place of the list when there are no options. */
  emptyLabel?: string;
  /** Optional leading "everything" row (e.g. All areas). Selected when value is null. */
  allLabel?: string;
  /** Leading icon on the pill, e.g. a map pin for the city. */
  icon?: React.ReactNode;
  /** Placeholder of the sheet's search field. */
  searchPlaceholder?: string;
  /** Said when the search matches nothing. */
  noMatchLabel?: string;
  /** Accessible name of the sheet's close button. */
  closeLabel?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** A search field earns its place once the list no longer fits in one look. */
const SEARCH_FROM = 9;

const fold = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

export function SelectPill({
  options,
  value,
  onChange,
  placeholder,
  label,
  emptyLabel,
  allLabel,
  icon,
  searchPlaceholder,
  noMatchLabel,
  closeLabel,
  disabled,
  open: controlledOpen,
  onOpenChange,
}: SelectPillProps) {
  const [localOpen, setLocalOpen] = React.useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    onOpenChange?.(next);
  };
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);

  // A null value means "all" when an allLabel is offered, so the two share one index space:
  // row 0 is All, and the real options follow.
  const rows: SelectPillOption[] = React.useMemo(
    () => (allLabel ? [{ value: "", label: allLabel }, ...options] : options),
    [allLabel, options],
  );
  const current = rows.find((r) => r.value === (value ?? ""));
  React.useEffect(() => {
    if (!controlledOpen) return;
    setQuery("");
    setActiveIndex(Math.max(0, rows.findIndex((row) => row.value === (value ?? ""))));
  }, [controlledOpen, rows, value]);
  const triggerLabel = value ? current?.label ?? placeholder : allLabel ?? placeholder;

  const searchable = options.length >= SEARCH_FROM;
  const visible = React.useMemo(() => {
    const q = fold(query.trim());
    if (!q) return rows;
    return rows.filter((r) => fold(r.label).includes(q));
  }, [rows, query]);

  const isEmpty = options.length === 0;
  const isDisabled = disabled || isEmpty;

  const openSheet = () => {
    if (isDisabled) return;
    setQuery("");
    setActiveIndex(Math.max(0, rows.findIndex((r) => r.value === (value ?? ""))));
    setOpen(true);
  };

  const commit = (row: SelectPillOption) => {
    onChange(row.value);
    setOpen(false);
  };

  // Keep the highlighted row in view: the list opens on the chosen row, not at the top.
  React.useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const onKeys = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(visible.length - 1);
    } else if (e.key === "Enter") {
      const row = visible[activeIndex];
      if (row) {
        e.preventDefault();
        commit(row);
      }
    }
  };

  return (
    <>
      <style>{`
        .khg-pill {
          display: inline-flex; align-items: center; gap: 8px;
          min-width: 0; max-width: 100%;
          padding: 0 14px; min-height: 44px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-default);
          background: var(--white); color: var(--text-primary);
          font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500;
          cursor: pointer; transition: var(--motion-color);
        }
        .khg-pill:hover:not(:disabled) { background: var(--surface-sunken); }
        .khg-pill[data-open="true"] { background: var(--surface-sunken); border-color: var(--brand-400); }
        .khg-pill[data-chosen="true"] { border-color: var(--brand-400); background: var(--brand-50); color: var(--brand-700); }
        .khg-pill:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
        .khg-pill:disabled { opacity: 0.55; cursor: not-allowed; }
        .khg-pill-icon { flex: none; display: inline-flex; color: var(--brand-600); }
        .khg-pill-text { flex: 1; min-width: 0; text-align: start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .khg-pill-chev { flex: none; color: var(--text-tertiary); }

        .khg-pick-search {
          display: flex; align-items: center; gap: 8px;
          height: 44px; padding: 0 14px; margin-bottom: 8px;
          border: 1px solid var(--border-default); border-radius: var(--radius-full);
          background: var(--surface-sunken); color: var(--text-tertiary);
        }
        .khg-pick-search:focus-within { border-color: var(--brand-400); background: var(--white); }
        .khg-pick-search input {
          flex: 1; min-width: 0; border: none; outline: none; background: transparent;
          font-family: var(--font-body); font-size: var(--text-base); color: var(--text-primary);
        }
        .khg-pick-search input::placeholder { color: var(--text-tertiary); }
        .khg-pick-list { list-style: none; margin: 0; padding: 0; outline: none; }
        .khg-pick-row {
          display: flex; align-items: center; gap: 12px;
          width: 100%; min-height: 48px; padding: 8px 12px;
          border: none; border-radius: var(--radius-md);
          background: transparent; color: var(--text-primary); text-align: start;
          font-family: var(--font-body); font-size: var(--text-base);
          cursor: pointer;
        }
        .khg-pick-row[data-active="true"] { background: var(--surface-sunken); }
        .khg-pick-row[data-selected="true"] { font-weight: 600; color: var(--brand-700); }
        .khg-pick-row:focus-visible { outline: 2px solid var(--brand-600); outline-offset: -2px; }
        .khg-pick-label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
        .khg-pick-detail { flex: none; color: var(--text-tertiary); font-size: var(--text-sm); font-weight: 400; font-variant-numeric: tabular-nums; }
        .khg-pick-check { flex: none; width: 18px; color: var(--brand-600); }
        .khg-pick-empty { padding: 20px 12px; color: var(--text-secondary); font-family: var(--font-body); font-size: var(--text-sm); }
      `}</style>

      <button
        type="button"
        className="khg-pill"
        data-open={open ? "true" : undefined}
        data-chosen={allLabel && value ? "true" : undefined}
        disabled={isDisabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${isEmpty ? emptyLabel ?? placeholder : triggerLabel}`}
        onClick={openSheet}
      >
        {icon && <span className="khg-pill-icon" aria-hidden>{icon}</span>}
        <span className="khg-pill-text">{isEmpty ? emptyLabel ?? placeholder : triggerLabel}</span>
        <ChevronDown className="khg-pill-chev" size={16} aria-hidden="true" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={label} closeLabel={closeLabel}>
        <div onKeyDown={onKeys}>
          {searchable && (
            <label className="khg-pick-search">
              <Search size={18} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={searchPlaceholder ?? label}
                aria-label={searchPlaceholder ?? label}
                autoComplete="off"
                enterKeyHint="search"
              />
            </label>
          )}
          {visible.length === 0 ? (
            <p className="khg-pick-empty" role="status">{noMatchLabel ?? emptyLabel}</p>
          ) : (
            <ul ref={listRef} role="listbox" aria-label={label} className="khg-pick-list">
              {visible.map((row, i) => {
                const selected = row.value === (value ?? "");
                return (
                  <li key={row.value || "__all"} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      data-idx={i}
                      data-active={i === activeIndex ? "true" : undefined}
                      data-selected={selected ? "true" : undefined}
                      className="khg-pick-row"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => commit(row)}
                    >
                      <span className="khg-pick-label">{row.label}</span>
                      {row.detail && <span className="khg-pick-detail">{row.detail}</span>}
                      <span className="khg-pick-check" aria-hidden>{selected && <Check size={18} />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Sheet>
    </>
  );
}
