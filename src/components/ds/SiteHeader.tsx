"use client";
/**
 * SiteHeader — the shared top nav for every visitor page (home, explorer, plan).
 * One place owns navigation so it can't drift or go missing per-page:
 *   - the logo is a real home button (→ "/")
 *   - Home / Explore / Your plan links, with the current page marked active
 *   - a single, WIRED language switch (globe → toggleLocale)
 *
 * Responsive: on desktop the nav links sit inline. On mobile (< 768px) they collapse into a
 * menu button that opens a pill-expanding panel — animated with anime.js on an ease-out
 * curve (fast start, slow settle, iOS-style) with the links staggering in. Icons are bundled
 * (lucide-react), never fetched from a CDN. The language switch is a compact globe on mobile,
 * a labelled button on desktop; it is the ONLY language control (the old floating toggle that
 * duplicated it on mobile is gone).
 */
import * as React from "react";
import Link from "next/link";
import { Globe, Menu, X } from "lucide-react";
import { animate, stagger } from "animejs";
import { useI18n } from "@/i18n/LocaleProvider";

const MAXW = 1120;

type Active = "home" | "explore" | "plan";

const LINKS: { key: Active; href: string; tkey: string }[] = [
  { key: "home", href: "/", tkey: "common.home" },
  { key: "explore", href: "/explorer", tkey: "common.explore" },
  { key: "plan", href: "/plan", tkey: "common.plan" },
];

export function SiteHeader({ active, extra }: { active?: Active; extra?: React.ReactNode }) {
  const { toggleLocale, dict, t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Open animation: the panel expands from a pill (scaled-down, faded, nudged up) to full
  // size on easeOutExpo — quick to start, slow to settle, the iOS feel — and the links
  // stagger in just behind it. Closing is a short reverse fade so it doesn't linger.
  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (open) {
      panel.style.display = "block";
      animate(panel, {
        opacity: [0, 1],
        translateY: [-10, 0],
        scaleY: [0.82, 1],
        transformOrigin: "top",
        duration: 440,
        ease: "outExpo",
      });
      animate(panel.querySelectorAll("[data-menu-item]"), {
        opacity: [0, 1],
        translateX: [-12, 0],
        delay: stagger(55, { start: 90 }),
        duration: 380,
        ease: "outQuint",
      });
    } else {
      animate(panel, {
        opacity: [1, 0],
        translateY: [0, -8],
        duration: 200,
        ease: "outQuad",
        onComplete: () => {
          if (panelRef.current) panelRef.current.style.display = "none";
        },
      });
    }
  }, [open]);

  // Close the menu when the route changes (a link tap) or Escape is pressed.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "color-mix(in srgb, var(--surface-app) 88%, transparent)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--gray-200)",
      }}
    >
      <style>{`
        .khg-siteheader-inner { padding: 12px 16px; gap: 12px; }
        @media (min-width: 640px) { .khg-siteheader-inner { padding: 14px 24px; gap: 20px; } }
        @media (min-width: 1024px) { .khg-siteheader-inner { padding: 14px 32px; gap: 28px; } }
        /* Inline nav + labelled language: desktop only. */
        .khg-nav-inline { display: none; }
        .khg-lang-label { display: none; }
        .khg-iconbtn.khg-menu-btn { display: inline-flex; }
        /* NOTE: the desktop overrides at the bottom of this block are written with the same
           two-class specificity as this rule, and declared AFTER the .khg-iconbtn base
           below. A media query adds NO specificity, so a one-class .khg-menu-btn display:none
           lost to the later one-class .khg-iconbtn display:inline-flex and the hamburger
           stayed visible on desktop. Specificity and source order both have to win. */
        .khg-iconbtn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          min-width: 44px; height: 44px; padding: 0 12px;
          border-radius: var(--radius-full); border: 1px solid var(--gray-300);
          background: var(--white); color: var(--text-primary);
          font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500;
          cursor: pointer; transition: var(--motion-color);
        }
        .khg-iconbtn:active { transform: scale(0.96); }
        .khg-menu-panel {
          position: absolute; inset-inline: 8px; top: calc(100% + 6px);
          background: var(--white); border: 1px solid var(--gray-200);
          border-radius: var(--radius-2xl); box-shadow: var(--shadow-lg);
          padding: 8px; display: none; will-change: transform, opacity;
        }
        .khg-menu-link {
          display: flex; align-items: center; min-height: 48px; padding: 0 16px;
          border-radius: var(--radius-xl); font-family: var(--font-body);
          font-size: var(--text-md); font-weight: 500; color: var(--text-secondary);
          text-decoration: none;
        }
        .khg-menu-link[data-active="true"] { color: var(--brand-700); background: var(--brand-50); font-weight: 600; }
        .khg-menu-link:active { background: var(--gray-100); }
        @media (prefers-reduced-motion: reduce) {
          .khg-iconbtn:active { transform: none; }
        }
        /* Desktop (>= 768px): inline nav shows, hamburger + its panel are gone. Declared
           last, at matching specificity, so nothing later can re-show the menu button. */
        @media (min-width: 768px) {
          .khg-nav-inline { display: flex; }
          .khg-lang-label { display: inline; }
          .khg-iconbtn.khg-menu-btn { display: none; }
          .khg-menu-panel { display: none !important; }
        }
      `}</style>
      <div
        className="khg-siteheader-inner"
        style={{ maxWidth: MAXW, margin: "0 auto", display: "flex", alignItems: "center", position: "relative" }}
      >
        <Link href="/" aria-label="Khargny — home" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-en.png" alt="Khargny" width={34} height={44} style={{ height: 40, width: "auto", display: "block" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--brand-700)", letterSpacing: "-0.01em" }}>
            Khargny
          </span>
        </Link>

        {/* Desktop inline nav */}
        <nav aria-label="Primary" className="khg-nav-inline" style={{ gap: 4, marginInlineStart: 8 }}>
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              aria-current={active === l.key ? "page" : undefined}
              className="khg-navlink"
              data-active={active === l.key ? "true" : undefined}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                fontWeight: active === l.key ? 600 : 500,
                color: active === l.key ? "var(--brand-700)" : "var(--text-secondary)",
                textDecoration: "none",
                transition: "var(--motion-color)",
              }}
            >
              {t(l.tkey)}
            </Link>
          ))}
        </nav>

        {extra && (
          <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", minWidth: 0 }}>
            {extra}
          </div>
        )}

        {/* Language — compact globe on mobile, labelled on desktop */}
        <button
          type="button"
          onClick={toggleLocale}
          aria-label="Switch language"
          data-trace-id="language-toggle"
          className="khg-iconbtn"
          style={{ marginInlineStart: extra ? "var(--space-2)" : "auto" }}
        >
          <Globe size={16} aria-hidden="true" />
          <span className="khg-lang-label">{dict.common.switchLang}</span>
        </button>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          data-trace-id="mobile-menu-toggle"
          className="khg-iconbtn khg-menu-btn"
          style={{ marginInlineStart: "var(--space-2)", padding: 0 }}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        {/* Mobile menu panel (animated) */}
        <div ref={panelRef} className="khg-menu-panel" role="menu" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              role="menuitem"
              data-menu-item
              data-active={active === l.key ? "true" : undefined}
              className="khg-menu-link"
              onClick={() => setOpen(false)}
            >
              {t(l.tkey)}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
