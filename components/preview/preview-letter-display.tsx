"use client";

import Link from "next/link";
import { useCallback, useState, useMemo, type CSSProperties } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const MUTED = "#94a3b8";
const GREEN = "#22c55e";
const NAVY = "#0f172a";
const CARD = "#ffffff";
const BORDER = "#e2e8f0";
const UNLOCK_TIP = "Unlock your appeal to download";

const blurLocked: CSSProperties = {
  filter: "blur(4px)",
  userSelect: "none",
  pointerEvents: "none",
};

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

const SALUTATION_RE = /^(dear|to whom it may concern|greetings|hello)\b/i;

/**
 * Splits the letter for preview lock UI:
 * - letterhead: through the "Re:" line, or the first block if there is no Re: line
 * - salutation: e.g. "Dear Payer", when a following body paragraph exists
 * - firstBody: first substantive paragraph after the letterhead
 * - rest: everything after the first body paragraph
 */
function splitPreviewLetterForLock(letterText: string): {
  letterhead: string;
  salutation: string;
  firstBody: string;
  rest: string;
} {
  const t = (letterText || "").replace(/\r\n/g, "\n");
  if (!t.trim()) {
    return { letterhead: "", salutation: "", firstBody: "", rest: "" };
  }

  const lines = t.split("\n");
  let reIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*re:\s*/i.test(line) || /^\s*re\s*[\-–—:]\s*/i.test(line.trimStart())) {
      reIdx = i;
      break;
    }
  }

  let letterhead: string;
  let afterHead: string;
  if (reIdx >= 0) {
    letterhead = lines.slice(0, reIdx + 1).join("\n").trimEnd();
    afterHead = lines.slice(reIdx + 1).join("\n");
  } else {
    const paras = t
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paras.length >= 1) {
      letterhead = paras[0] ?? "";
      afterHead = paras.slice(1).join("\n\n");
    } else {
      letterhead = t;
      afterHead = "";
    }
  }

  afterHead = afterHead.replace(/^\n+/, "").trimStart();
  if (!afterHead) {
    return { letterhead, salutation: "", firstBody: "", rest: "" };
  }

  const bodyParts = afterHead
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (bodyParts.length === 0) {
    return { letterhead, salutation: "", firstBody: "", rest: "" };
  }

  if (bodyParts.length === 1) {
    return { letterhead, salutation: "", firstBody: bodyParts[0] ?? "", rest: "" };
  }

  const first = bodyParts[0] ?? "";
  const second = bodyParts[1] ?? "";
  const isSal = SALUTATION_RE.test(first);

  if (isSal) {
    const firstBody = second;
    const rest = bodyParts.slice(2).join("\n\n");
    return { letterhead, salutation: first, firstBody, rest };
  }

  return {
    letterhead,
    salutation: "",
    firstBody: first,
    rest: bodyParts.slice(1).join("\n\n"),
  };
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

const preWrap: CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
};

function UnlockOverlay({ href }: { href: string }) {
  return (
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
        <p style={{ margin: "0 0 14px", color: NAVY, fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>Your full appeal letter is ready.</p>
        <Link
          href={href}
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
  );
}

export type PreviewLetterDisplayProps = {
  letterText: string;
  /** When true: blur after letterhead (salutation + all but first body para), lock buttons */
  locked: boolean;
  /** CTA: signed-out → `/login?next=/pricing`; signed-in → `/pricing` (from preview flow) */
  unlockHref?: string;
};

export function PreviewLetterDisplay({ letterText, locked, unlockHref = "/pricing" }: PreviewLetterDisplayProps) {
  const [copyBusy, setCopyBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [docxBusy, setDocxBusy] = useState(false);

  const split = useMemo(() => splitPreviewLetterForLock(letterText), [letterText]);

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

  const hasLetter = (letterText || "").trim().length > 0;
  const { letterhead, salutation, firstBody, rest } = split;

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
          color: NAVY,
        }}
      >
        {!hasLetter ? (
          <p style={{ margin: 0, color: MUTED }}>No letter text yet.</p>
        ) : !locked ? (
          <div style={preWrap}>{letterText.replace(/\r\n/g, "\n")}</div>
        ) : (
          <>
            {letterhead ? (
              <div style={{ marginBottom: salutation || firstBody || rest ? 20 : 0 }}>
                <p style={preWrap}>{letterhead}</p>
              </div>
            ) : null}

            {locked && salutation ? (
              <div
                style={{
                  position: "relative",
                  marginBottom: firstBody || rest ? 16 : 0,
                  minHeight: rest ? undefined : 80,
                }}
              >
                <div style={blurLocked}>
                  <p style={preWrap}>{salutation}</p>
                </div>
                {!rest && <UnlockOverlay href={unlockHref} />}
              </div>
            ) : null}

            {firstBody ? (
              <div
                style={{
                  marginBottom: rest ? 20 : 0,
                  position: "relative",
                  zIndex: 1,
                  background: "#fafafa",
                }}
              >
                <p style={preWrap}>{firstBody}</p>
              </div>
            ) : null}

            {locked && rest ? (
              <div style={{ position: "relative", margin: 0, minHeight: 120 }}>
                <div style={blurLocked}>
                  <p style={preWrap}>{rest}</p>
                </div>
                <UnlockOverlay href={unlockHref} />
              </div>
            ) : null}
          </>
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
