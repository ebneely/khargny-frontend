"use client";
/**
 * SiteFooter — the shared footer for every visitor page.
 *
 * Centered brand + tagline, a horizontal nav, a row of social icons, and a copyright line.
 * The social links and contact come from the dashboard (GET /v1/site-settings), so the brand
 * edits them in one place and they appear here and in the app. A blank link hides its icon.
 *
 * One column, centered, at every width — reads the same on a phone as on desktop.
 */
import * as React from "react";
import Link from "next/link";
import { Instagram, Facebook, Youtube, MessageCircle, Mail, Phone, Music2 } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";
import { useSiteSettings } from "@/lib/api/hooks/use-site-settings";

const MAXW = 1120;

export function SiteFooter() {
  const { t } = useI18n();
  const { data: settings } = useSiteSettings();

  const links = [
    { href: "/", label: t("common.home") },
    { href: "/explorer", label: t("common.explore") },
    { href: "/plan", label: t("common.plan") },
  ];

  // Each social entry only renders when its link is set. WhatsApp/phone/email get the right
  // URL scheme; the rest open as-is.
  const socials = [
    { key: "instagram", href: settings?.instagram, Icon: Instagram, label: "Instagram" },
    { key: "facebook", href: settings?.facebook, Icon: Facebook, label: "Facebook" },
    { key: "tiktok", href: settings?.tiktok, Icon: Music2, label: "TikTok" },
    { key: "youtube", href: settings?.youtube, Icon: Youtube, label: "YouTube" },
    {
      key: "whatsapp",
      href: settings?.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}` : null,
      Icon: MessageCircle,
      label: "WhatsApp",
    },
    { key: "email", href: settings?.email ? `mailto:${settings.email}` : null, Icon: Mail, label: "Email" },
    { key: "phone", href: settings?.phone ? `tel:${settings.phone}` : null, Icon: Phone, label: "Phone" },
  ].filter((s) => s.href);

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
          padding: "clamp(28px, 6vw, 44px) 24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 18,
        }}
      >
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-en.png" alt="Khargny" style={{ height: 40, width: "auto" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--brand-700)" }}>
            Khargny
          </span>
        </Link>

        <p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: "var(--text-sm)", maxWidth: "48ch", lineHeight: 1.6 }}>
          {t("home.subtitle")}
        </p>

        <nav
          aria-label="Footer"
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 24px" }}
        >
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

        {socials.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            {socials.map(({ key, href, Icon, label }) => (
              <a
                key={key}
                href={href as string}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="khg-social"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--gray-200)",
                  background: "var(--white)",
                  color: "var(--text-secondary)",
                  transition: "var(--motion-color), var(--motion-transform)",
                }}
              >
                <Icon size={18} aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--gray-200)", padding: "14px 24px" }}>
        <div
          style={{
            maxWidth: MAXW,
            margin: "0 auto",
            color: "var(--text-tertiary)",
            fontSize: "var(--text-xs)",
            textAlign: "center",
          }}
        >
          © 2026 Khargny · {t("home.subtitle")}
        </div>
      </div>

      <style>{`
        .khg-social:hover { color: var(--brand-600); border-color: var(--brand-100); transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) { .khg-social:hover { transform: none; } }
      `}</style>
    </footer>
  );
}
