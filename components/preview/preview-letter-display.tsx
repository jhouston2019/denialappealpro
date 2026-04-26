"use client";

import Link from "next/link";
import { useCallback, useState, type CSSProperties } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const MUTED = "#94a3b8";
const GREEN = "#22c55e";
const NAVY = "#0f172a";
const CARD = "#ffffff";
const BORDER = "#e2e8f0";
const UNLOCK_TIP = "Unlock your appeal to download";

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Splits on blank lines; single block stays one paragraph. */
export function splitAppealLetterParagraphs(text: string): string[] {
  const t = (text || "").trim();
  if (!t) return [];
  const byDouble = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (byDouble.length > 0) return byDouble;
  return [t];
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const out: string[] = [];
  for (let i = 0; i < line.length; i += maxChars) {
    out.push(line.slice(i, i + maxChars));
  }
  return out;
}

async function buildLetterPdfBytes(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const lineHeight = fontSize * 1.25;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const charsPerLine = 92;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  for (const rawLine of lines) {
    for (const wline of wrapLine(rawLine, charsPerLine)) {
      if (y < margin + lineHeight) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(wline, {
        x: margin,
        y: y - fontSize,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  }
  return doc.save();
}

const btnPrimary: CSSProperties = {
  padding: "12px 20px",
  fontWeight: 700,
  fontSize: 14,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: GREEN,
  color: "#fff",
};

const btnDisabled: CSSProperties = {
  padding: "12px 20px",
  fontWeight: 600,
  fontSize: 14,
  borderRadius: 8,
  border: "none",
  cursor: "not-allowed",
  background: MUTED,
  color: "#fff",
  opacity: 0.9,
};

export type PreviewLetterDisplayProps = {
  letterText: string;
  /** When true: blur tail paragraphs, lock downloads, show overlay CTA */
  locked: boolean;
};

export function PreviewLetterDisplay({ letterText, locked }: PreviewLetterDisplayProps) {
  const [copyBusy, setCopyBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [docxBusy, setDocxBusy] = useState(false);

  const parts = splitAppealLetterParagraphs(letterText);
  const head = parts.slice(0, 3);
  const tail = parts.slice(3);
  const hasTail = tail.length > 0;
  const showBlurBlock = hasTail;

  const doCopy = useCallback(async () => {
    if (locked) return;
    setCopyBusy(true);
    try {
      await navigator.clipboard.writeText((letterText || "").replace(/\r\n/g, "\n").trim());
    } finally {
      setCopyBusy(false);
    }
  }, [letterText, locked]);

  const doPdf = useCallback(async () => {
    if (locked) return;
    setPdfBusy(true);
    try {
      const bytes = await buildLetterPdfBytes((letterText || "").replace(/\r\n/g, "\n"));
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "appeal_letter_preview.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  }, [letterText, locked]);

  const doDocx = useCallback(() => {
    if (locked) return;
    setDocxBusy(true);
    try {
      const text = (letterText || "").replace(/\r\n/g, "\n");
      const safe = escapeHtml(text).replace(/\n/g, "<br/>");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;white-space:pre-wrap">${safe}</div></body></html>`;
      const blob = new Blob(["\ufeff", html], { type: "application/msword" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "appeal_letter_preview.doc";
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setDocxBusy(false);
    }
  }, [letterText, locked]);

  return (
    <div
      style={{
        background: CARD,
        borderRadius: 16,
        padding: "28px 24px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        marginBottom: 24,
        border: `1px solid ${BORDER}`,
      }}
    >
      <h2
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#64748b",
          margin: "0 0 16px",
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
        }}
      >
        Your appeal letter
      </h2>

      <div
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          background: "#fafafa",
          padding: "24px 28px",
          fontSize: 15,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap" as const,
          color: NAVY,
        }}
      >
        {head.length > 0 ? (
          <div>
            {head.map((p, i) => (
              <p key={i} style={{ margin: i === 0 ? "0 0 16px" : "0 0 16px" }}>
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: MUTED }}>No letter text yet.</p>
        )}

        {showBlurBlock && (
          <div style={{ position: "relative", marginTop: head.length ? 0 : 0 }}>
            <div
              style={
                locked
                  ? {
                      filter: "blur(4px)",
                      userSelect: "none" as const,
                      pointerEvents: "none" as const,
                      margin: 0,
                    }
                  : { margin: 0 }
              }
            >
              {tail.map((p, i) => (
                <p key={i} style={{ margin: "0 0 16px" }}>
                  {p}
                </p>
              ))}
            </div>
            {locked && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  pointerEvents: "auto" as const,
                }}
              >
                <div
                  style={{
                    textAlign: "center" as const,
                    maxWidth: 360,
                    background: "rgba(255,255,255,0.92)",
                    padding: "20px 24px",
                    borderRadius: 12,
                    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.12)",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <p style={{ margin: "0 0 14px", color: NAVY, fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
                    Your full appeal letter is ready.
                  </p>
                  <Link
                    href="/pricing"
                    style={{
                      display: "inline-block",
                      background: GREEN,
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 15,
                      padding: "12px 22px",
                      borderRadius: 10,
                      textDecoration: "none",
                    }}
                  >
                    Unlock My Appeal →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, marginTop: 20, alignItems: "center" }}>
        <button
          type="button"
          title={locked ? UNLOCK_TIP : undefined}
          disabled={locked || copyBusy}
          onClick={() => void doCopy()}
          style={locked || copyBusy ? { ...btnDisabled, cursor: locked ? "not-allowed" : "wait" } : { ...btnPrimary, cursor: copyBusy ? "wait" : "pointer" }}
        >
          {copyBusy ? "Copying…" : "Copy letter"}
        </button>
        <button
          type="button"
          title={locked ? UNLOCK_TIP : undefined}
          disabled={locked || pdfBusy}
          onClick={() => void doPdf()}
          style={locked || pdfBusy ? { ...btnDisabled, cursor: locked ? "not-allowed" : "wait" } : { ...btnPrimary, cursor: pdfBusy ? "wait" : "pointer" }}
        >
          {pdfBusy ? "Preparing…" : "Download PDF"}
        </button>
        <button
          type="button"
          title={locked ? UNLOCK_TIP : undefined}
          disabled={locked || docxBusy}
          onClick={doDocx}
          style={locked || docxBusy ? { ...btnDisabled, cursor: locked ? "not-allowed" : "wait" } : { ...btnPrimary, cursor: docxBusy ? "wait" : "pointer" }}
        >
          {docxBusy ? "Preparing…" : "Download DOCX"}
        </button>
      </div>
    </div>
  );
}
