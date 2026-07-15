"use client";
/**
 * Sheet — port of `design/builds/Khargny Design System/components/feedback/Sheet.jsx`.
 * Mobile-first modal sheet that slides in from the bottom. Backdrop dims the page;
 * tapping the backdrop or pressing Escape closes the sheet. Focus is trapped within
 * the sheet while open (light trap, no full focus-management library).
 *
 * The DS kit's Sheet is a generic wrapper; the homepage's "Where to?" region picker
 * and the explorer's category filter both use this same primitive.
 */
import * as React from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function Sheet({ open, onClose, title, children }: SheetProps) {
  // Escape-to-close.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(36, 28, 22, 0.40)",
          animation: "khargny-fade-in 200ms var(--ease-standard)",
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "relative",
          background: "var(--white)",
          borderTopLeftRadius: "var(--radius-2xl)",
          borderTopRightRadius: "var(--radius-2xl)",
          padding: "20px 16px calc(20px + env(safe-area-inset-bottom))",
          maxHeight: "85vh",
          overflowY: "auto",
          animation: "khargny-sheet-in 450ms var(--ease-spring)",
        }}
      >
        {title && (
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--text-primary)",
              margin: "0 0 16px",
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
      <style>{`@keyframes khargny-fade-in { from { opacity: 0; } to { opacity: 1; } } @keyframes khargny-sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
