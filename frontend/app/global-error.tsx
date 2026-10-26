"use client";

import { useEffect, useRef } from "react";

import { LEGAL_CONFIG } from "@/content/legal/config";

/**
 * Fallback when the root layout itself throws. Must render its own <html> and
 * <body> and stay independent of app providers / layout chrome (LEGAL-04).
 *
 * Never display error.message or a stack — only the digest reference.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    if (error.digest) {
      console.error("Global error digest:", error.digest);
    } else {
      console.error("Global error (no digest)");
    }
  }, [error.digest]);

  const contact = LEGAL_CONFIG.CONTACT_EMAIL;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1.25rem",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background:
            "radial-gradient(110% 75% at 50% -8%, rgba(186, 26, 26, 0.16), transparent 58%), linear-gradient(180deg, #fff8f7, #ffefed)",
          color: "#0b1c30",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "42rem",
            textAlign: "center",
          }}
        >
          <a
            href="/"
            style={{
              margin: "0 auto 1.5rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
              color: "#ba1a1a",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "3rem",
                height: "3rem",
                borderRadius: "1rem",
                background: "linear-gradient(135deg, #ba1a1a, #93000a)",
                boxShadow: "0 1px 2px rgba(186, 26, 26, 0.25)",
                color: "#fff",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v3" />
                <path d="M6 6v11" />
                <path d="M10 3v18" />
                <path d="M14 8v7" />
                <path d="M18 5v13" />
                <path d="M22 10v3" />
              </svg>
            </span>
            <span style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              VoiceFlow
            </span>
          </a>

          <svg
            viewBox="0 0 320 180"
            width="260"
            height="146"
            style={{ margin: "0 auto 1.25rem", display: "block", maxWidth: "100%" }}
            aria-hidden="true"
          >
            <ellipse cx="160" cy="154" rx="100" ry="13" fill="rgba(186, 26, 26, 0.12)" />
            <path
              d="M32 100 C52 72, 72 128, 92 100 S132 72, 148 96"
              stroke="rgba(186, 26, 26, 0.35)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M176 96 C192 120, 212 72, 232 100 S272 128, 292 100"
              stroke="rgba(186, 26, 26, 0.35)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="162" cy="78" r="32" fill="#ffdad6" stroke="rgba(186, 26, 26, 0.4)" strokeWidth="2.5" />
            <path d="M162 60v22" stroke="#ba1a1a" strokeWidth="3.75" strokeLinecap="round" />
            <circle cx="162" cy="94" r="3" fill="#ba1a1a" />
            <path
              d="M118 48l6-10M206 48l-6-10M108 82h-12M216 82h12"
              stroke="rgba(186, 26, 26, 0.45)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          <h1
            ref={headingRef}
            tabIndex={-1}
            style={{
              margin: 0,
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              outline: "none",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0.85rem auto 0",
              maxWidth: "36rem",
              fontSize: "1.0625rem",
              lineHeight: 1.6,
              color: "#424754",
            }}
          >
            This page couldn’t finish loading. Your other work is fine — try again, or go
            back to the dashboard.
          </p>

          <div
            style={{
              margin: "2rem auto 0",
              width: "100%",
              maxWidth: "20rem",
              display: "grid",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                height: "2.5rem",
                border: "none",
                borderRadius: "8px",
                padding: "0 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
                background: "#ba1a1a",
                boxShadow: "0 1px 2px rgba(186, 26, 26, 0.2), 0 4px 12px -2px rgba(147, 0, 10, 0.28)",
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                display: "block",
                textAlign: "center",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#ba1a1a",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              Back to Dashboard
            </a>
          </div>

          <div
            style={{
              marginTop: "2.25rem",
              paddingTop: "1.35rem",
              borderTop: "1px solid rgba(186, 26, 26, 0.18)",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              color: "#424754",
            }}
          >
            {/* Revise once Sentry is wired (OBS-01): then we can say the team was notified. */}
            <p style={{ margin: 0 }}>
              If this keeps happening, contact{" "}
              <a href={`mailto:${contact}`} style={{ color: "#ba1a1a", fontWeight: 500 }}>
                {contact}
              </a>{" "}
              and include the reference below.
            </p>
            {error.digest ? (
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#424754",
                }}
              >
                Reference: {error.digest}
              </p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
