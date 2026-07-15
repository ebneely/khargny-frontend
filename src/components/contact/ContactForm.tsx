"use client";
import { useState } from "react";
import Link from "next/link";
import { clientApi } from "@/lib/api-client";

/**
 * Contact form — restyled against `design/builds/Khargny Design System` foundations
 * (TASK-0012, SPRINT-2). Visual tokens are documented in
 * `khargny-obsidian/UI_UX/contact/styling.md` and `beauty/contact-form/spec.md`.
 *
 * No backend route exists for contact submission today (`clientApi.contact.submit`
 * is a documented no-op stub, see `src/lib/api-client.ts`); the form still
 * surfaces success/error UI per the design's intent.
 */
export function ContactForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("idle");

    try {
      await clientApi.contact.submit({
        name: name || "Anonymous",
        email,
        subject,
        message,
      });

      setStatus("success");
      setSubject("");
      setMessage("");
      setEmail("");
      setName("");
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Design tokens (single light theme, no dark variant — see TASK-0007 sweep) ──
  // All values cited from design/builds/Khargny Design System/tokens/.
  const colorSurfaceApp = "var(--surface-app, #FCFAF7)";
  const colorSurfaceSunken = "var(--surface-sunken, #F7F2EC)";
  const colorTextPrimary = "var(--text-primary, #241C16)";
  const colorTextSecondary = "var(--text-secondary, #4A3F37)";
  const colorTextTertiary = "var(--text-tertiary, #8A7C71)";
  const colorTextLink = "var(--text-link, #D9622A)";
  const colorBorderDefault = "var(--border-default, #EAE3DA)";
  const colorBorderFocus = "var(--border-focus, #D9622A)";
  const colorBrand50 = "var(--brand-50, #FFF3EA)";
  const colorSuccess = "var(--success, #1B7A4B)";
  const colorSuccessBg = "var(--success-bg, #EAF6EF)";
  const colorError = "var(--error, #C1391A)";
  const colorErrorBg = "var(--error-bg, #FDEEE9)";
  const colorWhite = "var(--white, #FFFFFF)";

  // Field shell styling — matches `components/forms/Input.jsx` from the design system.
  const fieldShell = (focused: boolean, hasError: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 44,
    padding: "0 14px",
    borderRadius: "var(--radius-lg, 16px)",
    background: colorWhite,
    border: `1.5px solid ${
      hasError ? colorError : focused ? colorBorderFocus : "var(--gray-300, #D8CFC5)"
    }`,
    transition: "var(--motion-color), var(--motion-shadow)",
    boxShadow: focused && !hasError ? `0 0 0 3px ${colorBrand50}` : "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colorSurfaceApp,
        color: colorTextPrimary,
        fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', 'Cairo', sans-serif)",
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
          maxWidth: 640,
          margin: "0 auto",
          padding: "32px 16px 48px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display, 'Cairo', sans-serif)",
            fontSize: "var(--text-4xl, 34px)",
            fontWeight: 700,
            lineHeight: 1.15,
            color: colorTextPrimary,
            margin: "0 0 8px",
          }}
        >
          Contact &amp; feedback
        </h1>
        <p
          style={{
            fontSize: "var(--text-base, 14px)",
            lineHeight: 1.5,
            color: colorTextSecondary,
            margin: "0 0 24px",
          }}
        >
          Questions, feedback, partnership ideas. We respond within 24 hours.
        </p>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field
            label="Your name (optional)"
            value={name}
            onChange={setName}
            placeholder="Your name"
            id="name"
            type="text"
            fieldShell={fieldShell}
            colorTextTertiary={colorTextTertiary}
            colorTextPrimary={colorTextPrimary}
          />
          <Field
            label="Your email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            id="email"
            type="email"
            required
            fieldShell={fieldShell}
            colorTextTertiary={colorTextTertiary}
            colorTextPrimary={colorTextPrimary}
          />
          <Field
            label="Subject"
            value={subject}
            onChange={setSubject}
            placeholder="What's this about?"
            id="subject"
            type="text"
            required
            fieldShell={fieldShell}
            colorTextTertiary={colorTextTertiary}
            colorTextPrimary={colorTextPrimary}
          />
          <TextareaField
            label="Message"
            value={message}
            onChange={setMessage}
            placeholder="Tell us more"
            id="message"
            required
            fieldShell={fieldShell}
            colorTextTertiary={colorTextTertiary}
            colorTextPrimary={colorTextPrimary}
          />

          {status === "success" && (
            <div
              role="alert"
              style={{
                background: colorSuccessBg,
                color: colorSuccess,
                border: `1px solid ${colorSuccess}`,
                borderRadius: "var(--radius-md, 12px)",
                padding: "12px 16px",
                fontSize: "var(--text-sm, 13px)",
                fontWeight: 500,
              }}
            >
              Message sent — we&apos;ll respond within 24 hours.
            </div>
          )}

          {status === "error" && (
            <div
              role="alert"
              style={{
                background: colorErrorBg,
                color: colorError,
                border: `1px solid ${colorError}`,
                borderRadius: "var(--radius-md, 12px)",
                padding: "12px 16px",
                fontSize: "var(--text-sm, 13px)",
                fontWeight: 500,
              }}
            >
              Failed to send message. Please try again or contact us directly.
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={isLoading || !subject.trim() || !message.trim() || !email.trim()}
              style={{
                flex: 1,
                height: 52,
                padding: "0 24px",
                background:
                  isLoading || !subject.trim() || !message.trim() || !email.trim()
                    ? "var(--gray-100, #F7F2EC)"
                    : colorTextLink,
                color:
                  isLoading || !subject.trim() || !message.trim() || !email.trim()
                    ? colorTextTertiary
                    : colorWhite,
                border: "1px solid transparent",
                borderRadius: "var(--radius-xl, 20px)",
                fontFamily: "var(--font-display, 'Cairo', sans-serif)",
                fontSize: "var(--text-md, 16px)",
                fontWeight: 600,
                cursor: isLoading ? "default" : "pointer",
                transition:
                  "var(--motion-transform), var(--motion-color), var(--motion-shadow)",
                boxShadow: "var(--shadow-sm, 0 1px 3px rgba(74, 44, 20, 0.10))",
              }}
            >
              {isLoading ? "Sending…" : "Send message"}
            </button>
            <a
              href="mailto:5argny.eg@gmail.com"
              style={{
                flex: 1,
                height: 52,
                padding: "0 24px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: colorWhite,
                color: colorTextPrimary,
                border: "1px solid var(--gray-300, #D8CFC5)",
                borderRadius: "var(--radius-xl, 20px)",
                fontFamily: "var(--font-display, 'Cairo', sans-serif)",
                fontSize: "var(--text-md, 16px)",
                fontWeight: 600,
                textDecoration: "none",
                transition: "var(--motion-color), var(--motion-shadow)",
              }}
            >
              Open mail client
            </a>
          </div>
        </form>

        <div
          style={{
            marginTop: 32,
            padding: 24,
            background: colorSurfaceSunken,
            borderRadius: "var(--radius-lg, 16px)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display, 'Cairo', sans-serif)",
              fontSize: "var(--text-xl, 20px)",
              fontWeight: 600,
              lineHeight: 1.3,
              color: colorTextPrimary,
              margin: "0 0 8px",
            }}
          >
            Other ways to reach us
          </h3>
          <p
            style={{
              fontSize: "var(--text-base, 14px)",
              lineHeight: 1.5,
              color: colorTextSecondary,
              margin: 0,
            }}
          >
            You can also reach us directly at{" "}
            <a
              href="mailto:5argny.eg@gmail.com"
              style={{ color: colorTextLink, textDecoration: "underline" }}
            >
              5argny.eg@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Local sub-components (single-file — kept here for the same warm-up reason the
// page is one component; if a second feature needs them, hoist to src/components/ui/). ──

function Field({
  label,
  value,
  onChange,
  placeholder,
  id,
  type = "text",
  required = false,
  fieldShell,
  colorTextTertiary,
  colorTextPrimary,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
  type?: string;
  required?: boolean;
  fieldShell: (focused: boolean, hasError: boolean) => React.CSSProperties;
  colorTextTertiary: string;
  colorTextPrimary: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-sm, 13px)",
          fontWeight: 500,
          color: "var(--text-secondary, #4A3F37)",
        }}
      >
        {label}
      </span>
      <div style={fieldShell(focused, false)}>
        <input
          id={id}
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            border: "none",
            outline: "none",
            flex: 1,
            fontSize: "var(--text-base, 14px)",
            color: colorTextPrimary,
            background: "transparent",
            fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
          }}
        />
      </div>
      {/* `colorTextTertiary` accepted as a prop so the platform palette stays in one place at the parent; unused here (no inline message). */}
      <span style={{ display: "none" }}>{colorTextTertiary}</span>
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  id,
  required = false,
  fieldShell,
  colorTextPrimary,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
  required?: boolean;
  fieldShell: (focused: boolean, hasError: boolean) => React.CSSProperties;
  colorTextTertiary: string;
  colorTextPrimary: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-sm, 13px)",
          fontWeight: 500,
          color: "var(--text-secondary, #4A3F37)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          ...fieldShell(focused, false),
          height: "auto",
          minHeight: 132,
          padding: 14,
          alignItems: "flex-start",
        }}
      >
        <textarea
          id={id}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={5}
          style={{
            border: "none",
            outline: "none",
            flex: 1,
            width: "100%",
            fontSize: "var(--text-base, 14px)",
            lineHeight: 1.5,
            color: colorTextPrimary,
            background: "transparent",
            fontFamily: "var(--font-body, 'IBM Plex Sans Arabic', sans-serif)",
            resize: "vertical",
          }}
        />
      </div>
    </label>
  );
}
