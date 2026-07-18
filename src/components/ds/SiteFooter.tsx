"use client";
/**
 * SiteFooter — the shared footer for every visitor page. Brand (logo + name + tagline),
 * a small nav column, and a bottom copyright bar. Replaces the bare one-line footer.
 */
import * as React from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/LocaleProvider";

const MAXW = 1120;

export function SiteFooter() {
  const { t } = useI18n();
  const links = [
    { href: "/", label: t("common.home") },
    { href: "/explorer", label: t("common.explore") },
    { href: "/plan", label: t("common.plan") },
  ];
  return (
    <footer
      style={{
        marginTop: "auto",
        borderTop: "1px solid var(--gray-200)",
        background: "var(--gray-50)",
      }}
    >
      <div
        style={{
          maxWidth: MAXW,
          margin: "0 auto",
          padding: "40px 32px 20px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-en.png" alt="Khargny" style={{ height: 38, width: "auto" }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--brand-700)" }}>
              Khargny
            </span>
          </Link>
          <p style={{ margin: "12px 0 0", color: "var(--text-tertiary)", fontSize: "var(--text-sm)", maxWidth: "36ch", lineHeight: 1.6 }}>
            {t("home.subtitle")}
          </p>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8, justifySelf: "end" }} aria-label="Footer">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", textDecoration: "none" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div
        style={{
          borderTop: "1px solid var(--gray-200)",
          padding: "14px 32px",
        }}
      >
        <div style={{ maxWidth: MAXW, margin: "0 auto", color: "var(--text-tertiary)", fontSize: "var(--text-xs)" }}>
          © {"2026"} Khargny · {t("home.subtitle")}
        </div>
      </div>
    </footer>
  );
}
