"use client";
/**
 * SiteHeader — the shared top nav for every visitor page (home, explorer, plan).
 * One place owns navigation so it can't drift or go missing per-page:
 *   - the logo is a real home button (→ "/")
 *   - Home / Explore / Your plan links, with the current page marked active
 *   - a single, WIRED language switch (globe → toggleLocale)
 *
 * RESPONSIVE at every width — from the smallest phone up to desktop — so pages
 * render one component instead of a mobile/desktop pair. Icons are bundled
 * (lucide-react), never fetched from a CDN.
 */
import * as React from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";

const MAXW = 1120;

type Active = "home" | "explore" | "plan";

const LINKS: { key: Active; href: string; tkey: string }[] = [
  { key: "home", href: "/", tkey: "common.home" },
  { key: "explore", href: "/explorer", tkey: "common.explore" },
  { key: "plan", href: "/plan", tkey: "common.plan" },
];

export function SiteHeader({ active }: { active?: Active }) {
  const { toggleLocale, dict, t } = useI18n();
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
        .khg-siteheader-inner { padding: 12px 16px; gap: 16px; }
        @media (min-width: 640px) { .khg-siteheader-inner { padding: 14px 24px; gap: 24px; } }
        @media (min-width: 1024px) { .khg-siteheader-inner { padding: 14px 32px; gap: 32px; } }
      `}</style>
      <div
        className="khg-siteheader-inner"
        style={{
          maxWidth: MAXW,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Link
          href="/"
          aria-label="Khargny — home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-en.png" alt="Khargny" width={34} height={44} style={{ height: 40, width: "auto", display: "block" }} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              color: "var(--brand-700)",
              letterSpacing: "-0.01em",
            }}
          >
            Khargny
          </span>
        </Link>
        <nav
          aria-label="Primary"
          style={{ display: "flex", gap: 4, marginInlineStart: 8 }}
        >
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
        <button
          type="button"
          onClick={toggleLocale}
          aria-label="Switch language"
          data-trace-id="language-toggle-desktop"
          style={{
            marginInlineStart: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            padding: "0 14px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--gray-300)",
            background: "var(--white)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            cursor: "pointer",
            transition: "var(--motion-color)",
          }}
        >
          <Globe size={16} aria-hidden="true" />
          <span>{dict.common.switchLang}</span>
        </button>
      </div>
    </header>
  );
}
