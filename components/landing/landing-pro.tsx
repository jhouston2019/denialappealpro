"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import MarketingNav from "./marketing-nav";

const BG = "#1e293b";
const BG_ALT = "#0f172a";
const WHITE = "#ffffff";
const GREEN = "#22c55e";
const TEXT_DARK = "#1e293b";
const TEXT_MUTED = "#94a3b8";
const TEXT_ON_DARK = "#f1f5f9";
const SLATE_500 = "#64748b";
const SLATE_600 = "#475569";

const INK = "#1e293b";
const CHECK = "#22c55e";

const BASE_FEATURES = [
  "AI-powered denial letter generation",
  "Automatic claim detail extraction (PDF, EOB, paste)",
  "CARC / RARC code-specific rebuttals",
  "Regulatory citations (NCCI, CMS, ERISA, ACA)",
  "PDF and Word export",
  "Appeal history dashboard",
];

const section = (bg: string, padding: string) =>
  ({
    background: bg,
    padding,
    color: TEXT_ON_DARK,
  }) as const;

const whiteCard: CSSProperties = {
  background: WHITE,
  color: TEXT_DARK,
  borderRadius: 12,
  padding: 32,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
};

const primaryCta: CSSProperties = {
  display: "inline-block",
  background: GREEN,
  color: WHITE,
  fontWeight: 700,
  fontSize: 17,
  padding: "16px 28px",
  borderRadius: 10,
  textDecoration: "none",
  border: "2px solid " + GREEN,
  textAlign: "center",
};

const micro = (c: string): CSSProperties => ({
  fontSize: 14,
  color: c,
  marginTop: 12,
  textAlign: "center",
  lineHeight: 1.5,
});

export default function LandingPro() {
  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <MarketingNav transparent />
      <style>{`
        .dap-landing-hero h1 { margin: 0; text-align: center; }
        .dap-landing-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .dap-landing-2x2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .dap-landing-4p { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        @media (max-width: 900px) {
          .dap-landing-3 { grid-template-columns: 1fr; }
          .dap-landing-2x2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 1200px) {
          .dap-landing-4p { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .dap-landing-4p { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* SECTION 1 — HERO */}
      <section
        className="dap-landing-hero"
        style={{
          ...section(BG, "120px 24px 80px"),
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            fontWeight: 800,
            color: WHITE,
            lineHeight: 1.15,
            maxWidth: 900,
            margin: "0 auto 20px",
          }}
        >
          Denied Claims Don&apos;t Have to Stay Denied.
        </h1>
        <p
          style={{
            fontSize: 20,
            color: "#94a3b8",
            maxWidth: 600,
            margin: "0 auto 28px",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          Upload your denial letter. We extract the codes, identify the failure point, and generate a submission-ready
          appeal with full regulatory citations — in under 60 seconds.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link href="/start" style={primaryCta}>
            Upload Your Denial — Free Preview →
          </Link>
        </div>
        <p style={micro(SLATE_500)}>No subscription required. See your appeal before you pay anything.</p>
      </section>

      {/* SECTION 2 — PAYER LOGOS BAR */}
      <section
        style={{
          ...section(BG_ALT, "14px 24px"),
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: SLATE_500, lineHeight: 1.5 }}>
          Works with CIGNA · BCBS · Aetna · UnitedHealth · Humana · Medicare · Medicaid · and 200+ payers
        </p>
      </section>

      {/* SECTION 3 — HOW IT WORKS */}
      <section style={{ ...section(BG_ALT, "72px 24px 80px") }}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 800,
            color: WHITE,
            textAlign: "center",
            margin: "0 0 40px",
          }}
        >
          Three Steps. Under 60 Seconds.
        </h2>
        <div className="dap-landing-3" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={whiteCard}>
            <div style={{ fontSize: 48, fontWeight: 800, color: GREEN, lineHeight: 1 }}>1</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: "12px 0 8px" }}>Upload Your Denial</h3>
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 700,
                color: GREEN,
                background: "rgba(34, 197, 94, 0.12)",
                padding: "4px 10px",
                borderRadius: 6,
                marginBottom: 12,
              }}
            >
              5 seconds
            </span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#334155" }}>
              Drop your EOB, denial letter, or paste text directly. PDF, PNG, or text — we handle all formats.
            </p>
          </div>
          <div style={whiteCard}>
            <div style={{ fontSize: 48, fontWeight: 800, color: GREEN, lineHeight: 1 }}>2</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: "12px 0 8px" }}>We Extract and Analyze</h3>
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 700,
                color: GREEN,
                background: "rgba(34, 197, 94, 0.12)",
                padding: "4px 10px",
                borderRadius: 6,
                marginBottom: 12,
              }}
            >
              15 seconds
            </span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#334155" }}>
              Our engine reads CARC/RARC codes, identifies the exact failure point, and maps applicable regulations —
              NCCI, CMS, ERISA, ACA, EMTALA.
            </p>
          </div>
          <div style={whiteCard}>
            <div style={{ fontSize: 48, fontWeight: 800, color: GREEN, lineHeight: 1 }}>3</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: "12px 0 8px" }}>Your Appeal Is Ready</h3>
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 700,
                color: GREEN,
                background: "rgba(34, 197, 94, 0.12)",
                padding: "4px 10px",
                borderRadius: 6,
                marginBottom: 12,
              }}
            >
              30 seconds
            </span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#334155" }}>
              A professionally written, legally grounded appeal letter structured for first-level submission. Download as
              PDF or Word. Ready to sign and send.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4 — SPECIFICITY / DENIAL CODES */}
      <section style={{ ...section(BG, "72px 24px 80px") }}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 800,
            color: WHITE,
            textAlign: "center",
            margin: "0 0 12px",
          }}
        >
          We Know Why Your Claims Are Being Denied.
        </h2>
        <p
          style={{
            textAlign: "center",
            color: TEXT_MUTED,
            fontSize: 18,
            maxWidth: 640,
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          Every appeal is built around the specific denial reason — not a generic template.
        </p>
        <div className="dap-landing-2x2" style={{ maxWidth: 900, margin: "0 auto" }}>
          {[
            {
              tag: "CARC 97",
              title: "Bundling & Unbundling",
              body: "NCCI editing conflicts addressed with procedure-specific rebuttal arguments and CPT guideline citations.",
            },
            {
              tag: "CARC 50",
              title: "Medical Necessity",
              body: "Clinical justification arguments built around payer-specific LCD/NCD criteria and AMA CPT guidelines.",
            },
            {
              tag: "CARC 18",
              title: "Duplicate Claims",
              body: "Facility, date, and clinical context distinctions clearly established to counter erroneous duplicate flags.",
            },
            {
              tag: "CARC 22",
              title: "Coordination of Benefits",
              body: "Primary/secondary payer obligations addressed with CMS COB regulations and plan-specific requirements.",
            },
          ].map((c) => (
            <div key={c.tag} style={whiteCard}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 800,
                  color: GREEN,
                  background: "rgba(34, 197, 94, 0.12)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                {c.tag}
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: "0 0 8px" }}>{c.title}</h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#334155" }}>{c.body}</p>
            </div>
          ))}
        </div>
        <p style={{ ...micro(TEXT_MUTED), marginTop: 32, maxWidth: 800, marginLeft: "auto", marginRight: "auto" }}>
          Also handles: Prior authorization denials · Timely filing · Coverage exclusions · Modifier disputes · Place of
          service errors · and 50+ additional CARC codes
        </p>
      </section>

      {/* SECTION 5 — FREE PREVIEW CTA */}
      <section style={{ ...section(BG_ALT, "80px 24px") }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(1.4rem, 2.5vw, 1.75rem)",
              fontWeight: 800,
              color: WHITE,
              textAlign: "center",
              margin: "0 0 28px",
            }}
          >
            Your Appeal, Before You Commit.
          </h2>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              color: WHITE,
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            {[
              "The denial type and why it was flagged",
              "Your appeal strength (Strong / Moderate / Weak)",
              "The specific strategy we'd use",
              "Which regulations apply to your case",
            ].map((line) => (
              <li key={line} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <span style={{ color: GREEN, fontWeight: 800, flexShrink: 0 }} aria-hidden>
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
            <Link href="/start" style={primaryCta}>
              See My Free Preview →
            </Link>
          </div>
          <p style={micro(SLATE_500)}>No account required to preview. Takes 30 seconds.</p>
        </div>
      </section>

      {/* SECTION 6 — SOCIAL PROOF */}
      <section style={{ ...section(BG, "72px 24px 80px") }}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 800,
            color: WHITE,
            textAlign: "center",
            margin: "0 0 40px",
          }}
        >
          Built for Revenue Cycle Teams
        </h2>
        <div className="dap-landing-3" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={whiteCard}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: TEXT_DARK }}>
              We were leaving $40K/month on the table in unbundling denials alone. DAP pays for itself in one appeal.
            </p>
            <p style={{ margin: "20px 0 0", fontSize: 14, color: "#64748b", fontWeight: 500 }}>
              — Billing Manager, Orthopedic Group, Atlanta GA
            </p>
          </div>
          <div style={whiteCard}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: TEXT_DARK }}>
              I process 30+ appeals a week. This cut my time per appeal from 45 minutes to under 5.
            </p>
            <p style={{ margin: "20px 0 0", fontSize: 14, color: "#64748b", fontWeight: 500 }}>
              — Revenue Cycle Coordinator, Multi-Specialty Practice
            </p>
          </div>
          <div style={whiteCard}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: TEXT_DARK }}>
              The letters cite the actual NCCI chapters and CMS policy numbers. Payers can&apos;t just ignore them.
            </p>
            <p style={{ margin: "20px 0 0", fontSize: 14, color: "#64748b", fontWeight: 500 }}>
              — Practice Administrator, Radiology Group
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 7 — PRICING SUMMARY */}
      <section style={{ ...section(BG_ALT, "72px 24px 80px") }}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 800,
            color: WHITE,
            textAlign: "center",
            margin: "0 0 40px",
          }}
        >
          Simple Pricing. No Surprises.
        </h2>
        <div className="dap-landing-4p" style={{ maxWidth: 1320, margin: "0 auto" }}>
          {/* Single */}
          <article style={whiteCard}>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: INK }}>Single</h3>
            <p style={{ margin: "8px 0 20px" }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: INK }}>$59</span>
              <span style={{ display: "block", fontSize: 15, color: SLATE_500, fontWeight: 600, marginTop: 4 }}>
                (one-time)
              </span>
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 14, lineHeight: 1.5, color: INK, flex: 1 }}>
              {["1 appeal", ...BASE_FEATURES, "No subscription required"].map((line) => (
                <li key={line} style={{ position: "relative", paddingLeft: 22, marginBottom: 8 }}>
                  <span style={{ position: "absolute", left: 0, top: 2, color: CHECK, fontWeight: 800 }}>✓</span>
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/start"
              style={{ ...primaryCta, width: "100%", marginTop: 20, fontSize: 15, padding: "12px 16px" }}
            >
              Start Single Appeal
            </Link>
          </article>
          {/* Essential */}
          <article style={whiteCard}>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: INK }}>Essential</h3>
            <p style={{ margin: "8px 0 20px" }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: INK }}>$399</span>
              <span style={{ display: "block", fontSize: 15, color: SLATE_500, fontWeight: 600, marginTop: 4 }}>
                /month — 10 appeals
              </span>
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 14, lineHeight: 1.5, color: INK, flex: 1 }}>
              {["10 appeals per month", "Unused appeals roll over (up to 1 month)", ...BASE_FEATURES, "Priority processing"].map(
                (line) => (
                  <li key={line} style={{ position: "relative", paddingLeft: 22, marginBottom: 8 }}>
                    <span style={{ position: "absolute", left: 0, top: 2, color: CHECK, fontWeight: 800 }}>✓</span>
                    {line}
                  </li>
                ),
              )}
            </ul>
            <Link
              href="/start"
              style={{ ...primaryCta, width: "100%", marginTop: 20, fontSize: 15, padding: "12px 16px" }}
            >
              Start Essential Plan
            </Link>
          </article>
          {/* Professional — featured */}
          <article
            style={{
              ...whiteCard,
              position: "relative",
              border: "2px solid " + GREEN,
              boxShadow: "0 4px 20px rgba(34, 197, 94, 0.2), 0 12px 40px rgba(15, 23, 42, 0.1)",
              paddingTop: 36,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 14,
                left: "50%",
                transform: "translateX(-50%)",
                background: GREEN,
                color: WHITE,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                padding: "6px 14px",
                borderRadius: 999,
                whiteSpace: "nowrap" as const,
              }}
            >
              Most Popular
            </div>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: INK }}>Professional</h3>
            <p style={{ margin: "8px 0 20px" }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: INK }}>$699</span>
              <span style={{ display: "block", fontSize: 15, color: SLATE_500, fontWeight: 600, marginTop: 4 }}>
                /month — 25 appeals
              </span>
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 14, lineHeight: 1.5, color: INK, flex: 1 }}>
              {[
                "25 appeals per month",
                "Unused appeals roll over (up to 1 month)",
                ...BASE_FEATURES,
                "Priority processing",
                "Bulk PDF upload (up to 100 files)",
                "CSV / Excel batch processing",
              ].map((line) => (
                <li key={line} style={{ position: "relative", paddingLeft: 22, marginBottom: 8 }}>
                  <span style={{ position: "absolute", left: 0, top: 2, color: CHECK, fontWeight: 800 }}>✓</span>
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/start"
              style={{ ...primaryCta, width: "100%", marginTop: 20, fontSize: 15, padding: "12px 16px" }}
            >
              Start Professional Plan
            </Link>
          </article>
          {/* Enterprise */}
          <article style={whiteCard}>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: INK }}>Enterprise</h3>
            <p style={{ margin: "8px 0 20px" }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: INK }}>$1,499</span>
              <span style={{ display: "block", fontSize: 15, color: SLATE_500, fontWeight: 600, marginTop: 4 }}>
                /month — 75 appeals
              </span>
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 14, lineHeight: 1.5, color: INK, flex: 1 }}>
              {[
                "75 appeals per month",
                "Unused appeals roll over (up to 1 month)",
                ...BASE_FEATURES,
                "Priority processing",
                "Bulk PDF upload (up to 100 files)",
                "CSV / Excel batch processing",
                "Dedicated account support",
                "Custom payer templates",
              ].map((line) => (
                <li key={line} style={{ position: "relative", paddingLeft: 22, marginBottom: 8 }}>
                  <span style={{ position: "absolute", left: 0, top: 2, color: CHECK, fontWeight: 800 }}>✓</span>
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/start"
              style={{
                marginTop: 20,
                display: "block",
                width: "100%",
                textAlign: "center",
                background: "#7c3aed",
                color: WHITE,
                fontWeight: 700,
                fontSize: 15,
                padding: "12px 16px",
                borderRadius: 8,
                textDecoration: "none",
                border: "2px solid #7c3aed",
              }}
            >
              Start Enterprise Plan
            </Link>
          </article>
        </div>
        <p style={{ ...micro(SLATE_500), marginTop: 32 }}>Unused appeals roll over. Cancel anytime. No setup fees.</p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <Link href="/start" style={primaryCta}>
            Start with a Free Preview →
          </Link>
        </div>
      </section>

      {/* SECTION 8 — FINAL CTA */}
      <section
        style={{
          background: GREEN,
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
            fontWeight: 800,
            color: BG_ALT,
            margin: "0 0 16px",
            lineHeight: 1.2,
          }}
        >
          Stop Letting Denials Sit Unworked.
        </h2>
        <p
          style={{
            fontSize: 18,
            color: BG_ALT,
            maxWidth: 640,
            margin: "0 auto 28px",
            lineHeight: 1.6,
          }}
        >
          Every day a denied claim sits unworked is revenue you&apos;re not recovering. Upload your first denial now —
          free, no account required.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link
            href="/start"
            style={{
              display: "inline-block",
              background: WHITE,
              color: BG_ALT,
              fontWeight: 700,
              fontSize: 17,
              padding: "16px 28px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Upload Your Denial — Free Preview →
          </Link>
        </div>
        <p style={{ fontSize: 13, color: "#064e3b", marginTop: 16, lineHeight: 1.5 }}>
          Submission-ready appeal in under 60 seconds. PDF and Word export included.
        </p>
      </section>

      {/* FOOTER */}
      <footer style={{ background: BG_ALT, padding: "40px 24px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 14, color: SLATE_500, lineHeight: 1.7 }}>
          © 2026 Denial Appeal Pro ·{" "}
          <Link href="/privacy" style={{ color: SLATE_500, textDecoration: "underline" }}>
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" style={{ color: SLATE_500, textDecoration: "underline" }}>
            Terms
          </Link>{" "}
          ·{" "}
          <a href="mailto:privacy@denialappealpro.com" style={{ color: SLATE_500, textDecoration: "underline" }}>
            Contact
          </a>{" "}
          -{" "}
          <Link href="/admin/login" style={{ color: SLATE_500, textDecoration: "underline" }}>
            Admin
          </Link>
        </p>
        <p style={{ margin: "20px 0 0", fontSize: 12, color: SLATE_600, lineHeight: 1.6, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
          This tool generates appeal letters for provider review. Not legal advice.
        </p>
      </footer>
    </div>
  );
}
