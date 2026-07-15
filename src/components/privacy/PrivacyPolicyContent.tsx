"use client";
import Link from "next/link";

/**
 * Privacy policy — restyled against `design/builds/Khargny Design System`
 * foundations (TASK-0012, SPRINT-2). Visual tokens are documented in
 * `khargny-obsidian/UI_UX/privacy/styling.md` and
 * `beauty/privacy-policy-content/spec.md`.
 *
 * Single light theme — no `dark:` classes (TASK-0007 sweep deletes
 * `theme-provider.tsx`).
 */
export function PrivacyPolicyContent() {
  const lastUpdated = new Date().toLocaleDateString();
  const year = new Date().getFullYear();

  // Design tokens (single source of truth: design/builds/Khargny Design System/tokens/).
  const colorSurfaceApp = "var(--surface-app, #FCFAF7)";
  const colorSurfaceSunken = "var(--surface-sunken, #F7F2EC)";
  const colorTextPrimary = "var(--text-primary, #241C16)";
  const colorTextSecondary = "var(--text-secondary, #4A3F37)";
  const colorTextTertiary = "var(--text-tertiary, #8A7C71)";
  const colorTextLink = "var(--text-link, #D9622A)";
  const colorBorderDefault = "var(--border-default, #EAE3DA)";

  const sectionStyle: React.CSSProperties = {
    marginBlockEnd: 32,
  };

  const h2Style: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Cairo', sans-serif)",
    fontSize: "var(--text-2xl, 22px)",
    fontWeight: 600,
    lineHeight: 1.3,
    color: colorTextPrimary,
    margin: "0 0 16px",
  };

  const h3Style: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Cairo', sans-serif)",
    fontSize: "var(--text-xl, 20px)",
    fontWeight: 600,
    lineHeight: 1.3,
    color: colorTextPrimary,
    margin: "0 0 8px",
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
    fontSize: "var(--text-md, 16px)",
    lineHeight: 1.65, // --leading-relaxed
    color: colorTextSecondary,
    margin: 0,
  };

  const ulStyle: React.CSSProperties = {
    listStyle: "disc",
    paddingInlineStart: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    color: colorTextSecondary,
    fontSize: "var(--text-md, 16px)",
    lineHeight: 1.5,
    margin: 0,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colorSurfaceApp,
        color: colorTextPrimary,
        fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          height: 56,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: colorTextLink,
            fontSize: "var(--text-sm, 13px)",
            fontWeight: 500,
            textDecoration: "none",
            transition: "transform 100ms var(--ease-standard, cubic-bezier(0.2, 0, 0, 1))",
          }}
        >
          <img
            src="https://unpkg.com/lucide-static@0.462.0/icons/arrow-left.svg"
            width={16}
            height={16}
            alt=""
            style={{ filter: "invert(48%) sepia(64%) saturate(1657%) hue-rotate(346deg)" }}
          />
          Back to home
        </Link>
        <span
          style={{
            fontFamily: "var(--font-display, 'Cairo', sans-serif)",
            fontSize: "var(--text-xl, 20px)",
            fontWeight: 600,
            lineHeight: 1.3,
            color: colorTextLink,
          }}
        >
          Khargny
        </span>
      </div>

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "40px 16px 64px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display, 'Cairo', sans-serif)",
            fontSize: "var(--text-4xl, 34px)",
            fontWeight: 700,
            lineHeight: 1.15,
            color: colorTextPrimary,
            margin: "0 0 12px",
          }}
        >
          Privacy policy
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
            fontSize: "var(--text-2xs, 11px)",
            fontWeight: 500,
            lineHeight: 1.5,
            color: colorTextTertiary,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 8px",
          }}
        >
          Khargny — your outing platform
        </p>
        <p
          style={{
            fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
            fontSize: "var(--text-xs, 12px)",
            lineHeight: 1.5,
            color: colorTextTertiary,
            margin: 0,
          }}
        >
          Last updated: {lastUpdated}
        </p>
      </div>

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 16px 64px",
          textAlign: "left",
        }}
      >
        <section style={sectionStyle}>
          <h2 style={h2Style}>Introduction</h2>
          <p style={bodyStyle}>
            Welcome to Khargny, your trusted outing platform and guidebook for expertly chosen
            places. We are committed to protecting your privacy and ensuring the security of your
            information. This Privacy Policy explains how we collect, use, and safeguard your
            information when you use our platform and services.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Information we collect</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 style={h3Style}>Usage information</h3>
              <ul style={ulStyle}>
                <li>Places you search for and visit</li>
                <li>Your interactions with our platform</li>
                <li>Device information and browser type</li>
                <li>IP address and general location information</li>
                <li>Location data when you use our mapping features</li>
              </ul>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>How we use your information</h2>
          <ul style={ulStyle}>
            <li>Provide and improve our outing platform services</li>
            <li>Personalize your experience with expertly chosen places</li>
            <li>Integrate with Google Maps to show location information</li>
            <li>Ensure platform security and prevent fraud</li>
            <li>Analyze usage patterns to enhance our services</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Google Maps integration</h2>
          <p style={{ ...bodyStyle, marginBlockEnd: 16 }}>
            Our platform integrates with Google Maps to provide location services and navigation
            features. When you use these features:
          </p>
          <ul style={ulStyle}>
            <li>Your location data may be shared with Google Maps services</li>
            <li>Google&apos;s Privacy Policy also applies to map-related features</li>
            <li>You can control location sharing through your device settings</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Data sharing and disclosure</h2>
          <p style={{ ...bodyStyle, marginBlockEnd: 16 }}>
            We do not sell your personal information. We may share your information only in these
            circumstances:
          </p>
          <ul style={ulStyle}>
            <li>With your explicit consent</li>
            <li>With service providers who help us operate our platform</li>
            <li>When required by law or to protect our legal rights</li>
            <li>In connection with a business transfer or merger</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Data security</h2>
          <p style={bodyStyle}>
            We implement appropriate security measures to protect your information against
            unauthorized access, alteration, disclosure, or destruction. However, no internet
            transmission is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Your rights and choices</h2>
          <p style={{ ...bodyStyle, marginBlockEnd: 16 }}>You have the right to:</p>
          <ul style={ulStyle}>
            <li>Control location sharing settings</li>
            <li>Opt out of promotional communications if we add them in the future</li>
            <li>Contact us about any privacy concerns</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Cookies and tracking</h2>
          <p style={bodyStyle}>
            We use cookies and similar technologies to enhance your experience, remember your
            preferences, and analyze how our platform is used. You can control cookie settings
            through your browser, though some features may not work properly if cookies are
            disabled.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Changes to this policy</h2>
          <p style={bodyStyle}>
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes by posting the new policy on this page and updating the &quot;Last
            updated&quot; date. Your continued use of our platform after changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Contact us</h2>
          <p style={{ ...bodyStyle, marginBlockEnd: 16 }}>
            If you have any questions about this Privacy Policy or our data practices, please
            contact us:
          </p>
          <div
            style={{
              padding: 24,
              background: colorSurfaceSunken,
              borderRadius: "var(--radius-lg, 16px)",
            }}
          >
            <p style={{ ...bodyStyle, margin: 0 }}>
              <strong style={{ color: colorTextPrimary }}>Khargny Privacy Team</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:5argny.eg@gmail.com"
                style={{ color: colorTextLink, textDecoration: "underline" }}
              >
                5argny.eg@gmail.com
              </a>
              <br />
              Website:{" "}
              <a
                href="https://www.5argny.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: colorTextLink, textDecoration: "underline" }}
              >
                www.5argny.com
              </a>
            </p>
          </div>
        </section>

        {/* Footer rule */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 32,
            borderTop: `1px solid ${colorBorderDefault}`,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
              fontSize: "var(--text-xs, 12px)",
              lineHeight: 1.5,
              color: colorTextTertiary,
              margin: 0,
            }}
          >
            © {year} Khargny. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
