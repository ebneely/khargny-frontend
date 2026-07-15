"use client";
/**
 * BottomNav — port of `design/builds/Khargny Design System/ui_kits/marketing-home/BottomNav.jsx`.
 * Shared between the homepage (Discover tab) and the /plan page (My Plan tab).
 * 4 items: Discover / Saved / My Plan / Profile.
 *
 * The active item is rendered in var(--brand-600) with a CSS filter that maps the
 * Lucide icon to brand-orange. Inactive items are var(--text-tertiary) at 0.55 opacity.
 * The container is pinned to the screen bottom with safe-area-inset-bottom padding.
 */
import * as React from "react";
import { useRouter } from "next/navigation";

type Tab = "discover" | "saved" | "plan" | "profile";

const ITEMS: { key: Tab; label: string; icon: string; href: string }[] = [
  { key: "discover", label: "Discover", icon: "compass", href: "/" },
  { key: "saved", label: "Saved", icon: "heart", href: "/saved" },
  { key: "plan", label: "My Plan", icon: "bookmark", href: "/plan" },
  { key: "profile", label: "Profile", icon: "user", href: "/profile" },
];

// CSS filter that maps a neutral Lucide icon to the brand orange, matching the
// design system's BottomNav.jsx line 39.
const BRAND_ICON_FILTER =
  "invert(38%) sepia(64%) saturate(1657%) hue-rotate(346deg) brightness(97%) contrast(93%)";

export function BottomNav({ active }: { active: Tab }) {
  const router = useRouter();
  return (
    <nav
      aria-label="Primary"
      style={{
        display: "flex",
        borderTop: "1px solid var(--gray-200)",
        background: "var(--white)",
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom))",
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      {ITEMS.map((it) => {
        const isActive = it.key === active;
        return (
          <button
            type="button"
            key={it.key}
            onClick={() => {
              if (!isActive) router.push(it.href);
            }}
            aria-current={isActive ? "page" : undefined}
            aria-label={isActive ? `${it.label} (current)` : it.label}
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
              transition: "var(--motion-color)",
              fontFamily: "var(--font-body)",
            }}
          >
            <img
              src={`https://unpkg.com/lucide-static@0.462.0/icons/${it.icon}.svg`}
              width={22}
              height={22}
              alt=""
              style={{
                opacity: isActive ? 1 : 0.55,
                filter: isActive ? BRAND_ICON_FILTER : "none",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
