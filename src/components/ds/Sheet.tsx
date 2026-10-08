"use client";
/**
 * Sheet — the one modal surface for choosing and filtering, the same pattern as the app's
 * SlideUpSheet: a grip, a title row with an optional action and a close button, a scrolling
 * body, and an optional footer that stays put (the "Show N places" button).
 *
 * It is a bottom sheet at every width. On a phone it spans the screen where the thumb is; on a
 * wide screen it holds a readable column and sits centred, and still rises from below.
 *
 * It stays mounted through its closing animation. Previously the panel unmounted the
 * instant `open` went false, so it flew in on a spring that overshot and then vanished
 * mid-air — the enter was animated and the exit was a cut, which is what made it feel
 * broken rather than merely fast.
 *
 * Backdrop click and Escape close it; the page behind does not scroll while it is open; focus
 * moves into it and returns to whatever opened it.
 */
import * as React from "react";
import { X } from "lucide-react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** A quiet control beside the title, e.g. Reset. */
  headerAction?: React.ReactNode;
  /** Stays at the bottom of the sheet while the body scrolls. */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

const DURATION = 320;

export function Sheet({ open, onClose, title, closeLabel = "Close", headerAction, footer, children }: SheetProps) {
  // `mounted` lags `open` on the way out so the exit animation has something to play on.
  const [mounted, setMounted] = React.useState(open);
  const [state, setState] = React.useState<"open" | "closed">(open ? "open" : "closed");
  const panelRef = React.useRef<HTMLDivElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMounted(true);
      // Two frames, not one. A single rAF can still land in the same paint as the mount,
      // and the browser then has no "before" to interpolate from — the very first open
      // would snap into place while every later one animated. The second frame guarantees
      // the closed position has been painted before the state flips.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setState("open"));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setState("closed");
    const timer = setTimeout(() => {
      setMounted(false);
      // Back to the control that opened it, so a keyboard user is not dropped at the top.
      openerRef.current?.focus({ preventScroll: true });
    }, DURATION);
    return () => clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      // Keep Tab inside the sheet: the page behind is inert to the eye, so it must be to the keys.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
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
    if (state === "open") panelRef.current?.focus({ preventScroll: true });
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
        <div className="khg-sheet-head">
          <div className="khg-sheet-grip" aria-hidden />
          <div className="khg-sheet-titlebar">
            {title ? <h2 className="khg-sheet-title">{title}</h2> : <span className="khg-sheet-title" />}
            {headerAction}
            <button type="button" className="khg-sheet-close" onClick={onClose} aria-label={closeLabel}>
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>
        <div className="khg-sheet-body">{children}</div>
        {footer && <div className="khg-sheet-foot">{footer}</div>}
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
          display: flex; flex-direction: column;
          background: var(--white);
          border-start-start-radius: var(--radius-2xl);
          border-start-end-radius: var(--radius-2xl);
          max-height: 85dvh;
          overflow: hidden;
          outline: none;
          transform: translateY(100%);
          /* Exponential ease-out: fast departure, long settle, no overshoot. The old spring
             overshot past its resting position, which reads as a wobble on a large surface. */
          transition: transform ${DURATION}ms cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 -12px 32px -12px rgba(36, 28, 22, 0.28);
        }
        .khg-sheet[data-state="open"] .khg-sheet-panel { transform: translateY(0); }

        .khg-sheet-head { flex: none; padding: 10px 8px 4px 20px; padding-inline: 20px 8px; }
        .khg-sheet-grip {
          width: 40px; height: 4px; border-radius: 999px;
          background: var(--gray-300);
          margin: 0 auto 6px;
        }
        .khg-sheet-titlebar { display: flex; align-items: center; gap: 4px; min-height: 48px; }
        .khg-sheet-title {
          flex: 1; min-width: 0;
          font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600;
          line-height: 1.3; color: var(--text-primary); margin: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .khg-sheet-close {
          flex: none; width: 44px; height: 44px;
          display: inline-flex; align-items: center; justify-content: center;
          border: none; border-radius: var(--radius-full);
          background: transparent; color: var(--text-secondary);
          cursor: pointer; transition: var(--motion-color);
        }
        .khg-sheet-close:hover { background: var(--surface-sunken); color: var(--text-primary); }
        .khg-sheet-close:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }

        .khg-sheet-body {
          flex: 1 1 auto; min-height: 0;
          overflow-y: auto; overscroll-behavior: contain;
          padding: 4px 20px calc(20px + env(safe-area-inset-bottom));
        }
        .khg-sheet-foot {
          flex: none;
          padding: 12px 20px calc(16px + env(safe-area-inset-bottom));
          background: var(--white);
          border-top: 1px solid var(--border-default);
        }
        /* With a footer, the safe-area inset belongs to the footer, not the body. */
        .khg-sheet-panel:has(.khg-sheet-foot) .khg-sheet-body { padding-bottom: 20px; }

        @media (min-width: 768px) {
          .khg-sheet { align-items: center; }
          .khg-sheet-panel {
            width: min(560px, calc(100% - 32px));
            margin: 0 auto 16px;
            border-radius: var(--radius-2xl);
            max-height: 82dvh;
            /* It rests 16px above the edge, so it has to travel that bit further to be
               fully out of sight before it rises. */
            transform: translateY(calc(100% + 16px));
          }
          .khg-sheet-head { padding-inline: 24px 12px; padding-top: 12px; }
          .khg-sheet-body { padding-inline: 24px; }
          .khg-sheet-foot { padding-inline: 24px; padding-bottom: 20px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .khg-sheet-panel, .khg-sheet-backdrop { transition-duration: 1ms; }
        }
      `}</style>
    </div>
  );
}
