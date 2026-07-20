"use client";
/**
 * BottomNav — port of `design/builds/Khargny Design System/ui_kits/marketing-home/BottomNav.jsx`.
 * Shared between the homepage (Discover tab) and the /plan page (My Plan tab).
 * 4 items: Discover / Saved / My Plan / Profile.
 *
 * A fixed overlay below 1024px and hidden above it (SiteHeader owns navigation at desktop
 * widths) — see .khg-bottomnav in globals.css. Pages that render it add .khg-has-bottomnav
 * so their last row isn't covered. Safe-area inset is honoured for notched phones.
 *
 * Icons are bundled via lucide-react. They used to be <img> tags pointing at unpkg.com,
 * which put four blocking third-party requests in front of the primary navigation and
 * broke it entirely offline or under a strict CSP.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Compass, Heart, Bookmark, User } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";

type Tab = "discover" | "saved" | "plan" | "profile";

const ITEMS: {
  key: Tab;
  labelKey: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  href: string;
}[] = [
  { key: "discover", labelKey: "nav.discover", Icon: Compass, href: "/" },
  { key: "saved", labelKey: "nav.saved", Icon: Heart, href: "/saved" },
  { key: "plan", labelKey: "nav.plan", Icon: Bookmark, href: "/plan" },
  { key: "profile", labelKey: "nav.profile", Icon: User, href: "/profile" },
];

export function BottomNav({ active }: { active: Tab }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <nav
      // SiteHeader is the "Primary" landmark; this one needs its own name so screen
      // readers don't announce two identically-labelled navs on the same page.
      aria-label="Quick navigation"
      className="khg-bottomnav"
      style={{
        display: "flex",
        borderTop: "1px solid var(--gray-200)",
        background: "var(--white)",
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom))",
      }}
    >
      {ITEMS.map((it) => {
        const isActive = it.key === active;
        const { Icon } = it;
        return (
          <button
            type="button"
            key={it.key}
            onClick={() => {
              if (!isActive) router.push(it.href);
            }}
            aria-current={isActive ? "page" : undefined}
            aria-label={isActive ? `${t(it.labelKey)} (current)` : t(it.labelKey)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "6px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isActive ? "var(--brand-600)" : "var(--text-tertiary)",
              opacity: isActive ? 1 : 0.65,
              transition: "var(--motion-color)",
              fontFamily: "var(--font-body)",
            }}
          >
            <Icon size={22} aria-hidden={true} />
            <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>{t(it.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
