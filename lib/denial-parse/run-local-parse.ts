import { buildParseApiResponse } from "./build-parse-response";
import { extractWithOpenAI } from "./extract-with-openai";
import { extractTextFromPdfBuffer } from "./pdf-text";
import { forwardToInternalEngine } from "@/lib/engine/forward-internal";

export async function runParseDenialTextLocal(text: string): Promise<
  | { ok: true; data: Record<string, unknown>; status: number }
  | { ok: false; data: Record<string, unknown>; status: number }
> {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { ok: false, data: { success: false, error: "Empty text" }, status: 400 };
  }
  if (trimmed.length > 100_000) {
    return { ok: false, data: { success: false, error: "Text exceeds maximum length" }, status: 400 };
  }

  const forward = await forwardToInternalEngine("/api/parse/denial-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: trimmed }),
  });
  if (forward && forward.ok) {
    const data = (await forward.json()) as Record<string, unknown>;
    return { ok: true, data, status: 200 };
  }

  const { fields, error } = await extractWithOpenAI(trimmed);
  if (fields) {
    return {
      ok: true,
      data: buildParseApiResponse(fields, trimmed, true, error),
      status: 200,
    };
  }

  return {
    ok: false,
    data: {
      success: false,
      error: "parse_failed",
      allow_manual: true,
      message:
        error === "no_openai"
          ? "Set OPENAI_API_KEY or INTERNAL_ENGINE_BASE_URL for automatic extraction."
          : "Could not parse pasted text. Enter details manually.",
    },
    status: 400,
  };
}

export async function runParseDenialLetterLocal(file: File): Promise<
  | { ok: true; data: Record<string, unknown>; status: number }
  | { ok: false; data: Record<string, unknown>; status: number }
> {
  const forwardForm = new FormData();
  forwardForm.append("file", file, file.name);
  const forward = await forwardToInternalEngine("/api/parse/denial-letter", {
    method: "POST",
    body: forwardForm,
  });
  if (forward && forward.ok) {
    const data = (await forward.json()) as Record<string, unknown>;
    return { ok: true, data, status: 200 };
  }

  const buf = await file.arrayBuffer();
  let text: string;
  try {
    text = await extractTextFromPdfBuffer(buf);
  } catch {
    return {
      ok: false,
      data: {
        success: false,
        error: "pdf_read",
        allow_manual: true,
        message: "Could not extract text from PDF.",
      },
      status: 400,
    };
  }
  if (!text) {
    return {
      ok: false,
      data: {
        success: false,
        error: "empty_pdf",
        allow_manual: true,
        message: "Could not extract text from PDF.",
      },
      status: 400,
    };
  }

  const { fields, error } = await extractWithOpenAI(text);
  if (fields) {
    return {
      ok: true,
      data: buildParseApiResponse(fields, text, true, error),
      status: 200,
    };
  }

  return {
    ok: false,
    data: {
      success: false,
      error: "parse_failed",
      allow_manual: true,
      message:
        error === "no_openai"
          ? "Set OPENAI_API_KEY or INTERNAL_ENGINE_BASE_URL for automatic extraction."
          : "Could not parse PDF. Enter details manually.",
    },
    status: 400,
  };
}
