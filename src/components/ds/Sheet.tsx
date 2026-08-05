"use client";
/**
 * Sheet — modal sheet. A bottom sheet on phones, where the thumb is; an edge panel from
 * 768px up, where a full-width bottom sheet would be a very wide, very short strip.
 *
 * It stays mounted through its closing animation. Previously the panel unmounted the
 * instant `open` went false, so it flew in on a spring that overshot and then vanished
 * mid-air — the enter was animated and the exit was a cut, which is what made it feel
 * broken rather than merely fast.
 *
 * Backdrop click and Escape close it; the page behind does not scroll while it is open.
 */
import * as React from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

const DURATION = 320;

export function Sheet({ open, onClose, title, children }: SheetProps) {
  // `mounted` lags `open` on the way out so the exit animation has something to play on.
  const [mounted, setMounted] = React.useState(open);
  const [state, setState] = React.useState<"open" | "closed">(open ? "open" : "closed");
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      // Paint once at the closed position, then flip — otherwise the browser coalesces
      // mount and state change into one frame and there is nothing to animate from.
      const raf = requestAnimationFrame(() => setState("open"));
      return () => cancelAnimationFrame(raf);
    }
    setState("closed");
    const timer = setTimeout(() => setMounted(false), DURATION);
    return () => clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // Hold the page still. Without this the body scrolls under the sheet on iOS.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Move focus into the panel so the keyboard follows the eye.
  React.useEffect(() => {
    if (state === "open") panelRef.current?.focus();
  }, [state]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-state={state}
      className="khg-sheet"
    >
      <div onClick={onClose} aria-hidden className="khg-sheet-backdrop" />

      <div ref={panelRef} tabIndex={-1} className="khg-sheet-panel">
        <div className="khg-sheet-grip" aria-hidden />
        {title && <h2 className="khg-sheet-title">{title}</h2>}
        {children}
      </div>

      <style>{`
        .khg-sheet {
          position: fixed; inset: 0; z-index: 50;
          display: flex; flex-direction: column; justify-content: flex-end;
        }
        .khg-sheet-backdrop {
          position: absolute; inset: 0;
          background: rgba(36, 28, 22, 0.42);
          opacity: 0;
          transition: opacity ${DURATION}ms var(--ease-standard);
        }
        .khg-sheet[data-state="open"] .khg-sheet-backdrop { opacity: 1; }

        .khg-sheet-panel {
          position: relative;
          background: var(--white);
          border-start-start-radius: var(--radius-2xl);
          border-start-end-radius: var(--radius-2xl);
          padding: 12px 16px calc(20px + env(safe-area-inset-bottom));
          max-height: 85dvh;
          overflow-y: auto;
          outline: none;
          transform: translateY(100%);
          /* Exponential ease-out: fast departure, long settle, no overshoot. The old spring
             overshot past its resting position, which reads as a wobble on a large surface. */
          transition: transform ${DURATION}ms cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 -12px 32px -12px rgba(36, 28, 22, 0.28);
        }
        .khg-sheet[data-state="open"] .khg-sheet-panel { transform: translateY(0); }

        .khg-sheet-grip {
          width: 40px; height: 4px; border-radius: 999px;
          background: var(--gray-300);
          margin: 0 auto 14px;
        }
        .khg-sheet-title {
          font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600;
          line-height: 1.3; color: var(--text-primary); margin: 0 0 16px;
        }

        /* From tablet up the sheet comes in from the page's outer edge as a column, which
           suits a filter list far better than a wide, short tray at the bottom. */
        @media (min-width: 768px) {
          .khg-sheet { flex-direction: row; justify-content: flex-end; }
          .khg-sheet-panel {
            width: min(420px, 100%);
            max-height: none;
            height: 100dvh;
            padding: 20px 24px calc(24px + env(safe-area-inset-bottom));
            border-radius: 0;
            border-start-start-radius: var(--radius-2xl);
            border-end-start-radius: var(--radius-2xl);
            transform: translateX(100%);
            box-shadow: -16px 0 40px -16px rgba(36, 28, 22, 0.28);
          }
          /* In RTL the inline-end edge is the left one, so it must travel the other way. */
          [dir="rtl"] .khg-sheet-panel { transform: translateX(-100%); }
          .khg-sheet[data-state="open"] .khg-sheet-panel,
          [dir="rtl"] .khg-sheet[data-state="open"] .khg-sheet-panel { transform: translateX(0); }
          .khg-sheet-grip { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .khg-sheet-panel, .khg-sheet-backdrop { transition-duration: 1ms; }
        }
      `}</style>
    </div>
  );
}
