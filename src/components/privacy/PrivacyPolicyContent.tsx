"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { POLICY, type PolicyLocale } from "./policy-text";

/**
 * Privacy policy page. The text lives in policy-text.ts (English and Arabic); this file only lays it out.
 * Single light theme, tokens from the Khargny design system.
 */
export function PrivacyPolicyContent({ locale = "en" }: { locale?: PolicyLocale }) {
  const t = POLICY[locale];
  const rtl = locale === "ar";
  const ink = "var(--text-primary, #241C16)";
  const soft = "var(--text-secondary, #4A3F37)";
  const display = "var(--font-display, 'Cairo', sans-serif)";
  const body = "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)";

  return (
    <div dir={rtl ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "var(--surface-app, #FCFAF7)", color: ink, fontFamily: body }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", height: 56 }}>
        <Link href={rtl ? "/ar/" : "/"} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-link, #D9622A)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
          <ArrowLeft size={16} aria-hidden style={rtl ? { transform: "scaleX(-1)" } : undefined} />
          {t.back}
        </Link>
        <span style={{ fontFamily: display, fontSize: 20, fontWeight: 600, color: "var(--text-link, #D9622A)" }}>{rtl ? "خرجني" : "Khargny"}</span>
      </div>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1 style={{ fontFamily: display, fontSize: 34, fontWeight: 700, lineHeight: 1.15, margin: "0 0 8px" }}>{t.title}</h1>
        <p style={{ fontSize: 12, color: "var(--text-tertiary, #8A7C71)", margin: "0 0 32px" }}>{t.updated}</p>
        {t.sections.map((s) => (
          <section key={s.h} style={{ marginBlockEnd: 28 }}>
            <h2 style={{ fontFamily: display, fontSize: 22, fontWeight: 600, lineHeight: 1.3, margin: "0 0 12px" }}>{s.h}</h2>
            {s.p?.map((x) => <p key={x} style={{ fontSize: 16, lineHeight: 1.65, color: soft, margin: "0 0 12px" }}>{x}</p>)}
            {s.ul ? (
              <ul style={{ listStyle: "disc", paddingInlineStart: 24, display: "flex", flexDirection: "column", gap: 10, color: soft, fontSize: 16, lineHeight: 1.5, margin: 0 }}>
                {s.ul.map((x) => <li key={x}>{x}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </main>
    </div>
  );
}
