import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai/server-client";
import { checkIpHourLimit, getClientIp } from "@/lib/rate-limit/ip-hour";
import { DAP_TEASER_LINES, type DapPreviewAnalysisResult } from "@/lib/dap/preview-flow";

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 10;

const SYSTEM =
  "You are a medical billing denial analyst. Analyze the denial and return ONLY a JSON object with these exact keys: denial_type, confidence, summary, key_issues (array of 3), appeal_strength, strategy, carc_codes (array). No other text.";

function parseJsonFromContent(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asNonEmptyString(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  return fallback;
}

function normalizeConfidence(v: unknown): "High" | "Moderate" | "Low" {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "high") return "High";
  if (s === "low") return "Low";
  return "Moderate";
}

function normalizeStrength(v: unknown): "Strong" | "Moderate" | "Weak" {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "strong") return "Strong";
  if (s === "weak") return "Weak";
  return "Moderate";
}

function asStringArray(v: unknown, len: number, fill: string): string[] {
  if (!Array.isArray(v)) return Array.from({ length: len }, (_, i) => `${fill} ${i + 1}`);
  const out = v.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
  while (out.length < len) out.push(`${fill} ${out.length + 1}`);
  return out.slice(0, len);
}

function asCarcArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : String(x)))
    .filter(Boolean)
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = checkIpHourLimit(ip, MAX_PER_IP, WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many preview requests. Try again later.", retry_after_sec: limited.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  let body: { extracted_text?: string; claim_data?: unknown };
  try {
    body = (await request.json()) as { extracted_text?: string; claim_data?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const extracted_text = typeof body.extracted_text === "string" ? body.extracted_text.trim() : "";
  if (!extracted_text || extracted_text.length < 10) {
    return NextResponse.json({ error: "extracted_text is required" }, { status: 400 });
  }

  const oa = getOpenAI();
  if (!oa) {
    return NextResponse.json({ error: "Preview analysis is not configured" }, { status: 503 });
  }

  const userMsg = `Denial data: ${extracted_text.slice(0, 24000)}`;

  const completion = await oa.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    temperature: 0.1,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim() || "";
  const parsed = parseJsonFromContent(content);
  if (!parsed) {
    return NextResponse.json({ error: "Could not parse analysis" }, { status: 502 });
  }

  const keyIssues = asStringArray(parsed.key_issues, 3, "Review issue");
  const carc_codes = asCarcArray(parsed.carc_codes);

  const result: DapPreviewAnalysisResult = {
    denial_type: asNonEmptyString(parsed.denial_type, "General denial"),
    confidence: normalizeConfidence(parsed.confidence),
    summary: asNonEmptyString(parsed.summary, "We identified a payer denial to address in your appeal."),
    key_issues: keyIssues,
    appeal_strength: normalizeStrength(parsed.appeal_strength),
    strategy: asNonEmptyString(
      parsed.strategy,
      "Gather clinical documentation and payer policy references that support medical necessity."
    ),
    carc_codes,
    teaser: [...DAP_TEASER_LINES],
  };

  return NextResponse.json(result, { status: 200 });
}
