import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai/server-client";
import { checkIpHourLimit, getClientIp } from "@/lib/rate-limit/ip-hour";
import {
  DAP_TEASER_LINES,
  type DapClaimDataForPreview,
  type DapIntakeSnapshot,
  type DapPreviewAnalysisResult,
} from "@/lib/dap/preview-flow";
import {
  buildPreviewLetterContextFromPreviewPayload,
  generateAppealPreviewLetter,
} from "@/lib/appeal/generate-preview-letter";
import { normalizeUserEmail } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 10;

const SYSTEM =
  "You are a medical billing denial analyst. Analyze the denial and return ONLY a JSON object with these exact keys: denial_type, confidence, summary, key_issues (array of 3), appeal_strength, strategy, carc_codes (array). No other text.";

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

/**
 * Model output may be raw JSON or prose with a JSON object; try direct parse, then {…} slice.
 */
function parseAiJsonObject(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No parseable JSON object in AI output");
    }
    parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI output JSON is not an object");
  }
  return parsed;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = checkIpHourLimit(ip, MAX_PER_IP, WINDOW_MS);
  if (!limited.ok) {
    console.error("[preview/analyze] rate limit exceeded", { ip, retry_after_sec: limited.retryAfterSec });
    return NextResponse.json(
      { error: "Too many preview requests. Try again later.", retry_after_sec: limited.retryAfterSec },
      {
        status: 429,
        headers: { ...JSON_HEADERS, "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  let body: { extracted_text?: string; claim_data?: unknown; intake_snapshot?: unknown };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[preview/analyze] Invalid JSON body", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: JSON_HEADERS });
  }

  const extracted_text = typeof body.extracted_text === "string" ? body.extracted_text.trim() : "";
  if (!extracted_text || extracted_text.length < 10) {
    console.error("[preview/analyze] missing or short extracted_text", { length: extracted_text.length });
    return NextResponse.json({ error: "extracted_text is required" }, { status: 400, headers: JSON_HEADERS });
  }

  const oa = getOpenAI();
  if (!oa) {
    console.error("[preview/analyze] OpenAI not configured (missing API key or client)");
    return NextResponse.json({ error: "Preview analysis is not configured" }, { status: 503, headers: JSON_HEADERS });
  }

  const userMsg = `Denial data: ${extracted_text.slice(0, 24000)}`;

  let profile = { provider_name: "", provider_npi: "", provider_address: "" };
  let isAnonymous = true;
  try {
    const supa = await createClient();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supa.auth.getUser();
    const profileEmail = normalizeUserEmail(authUser?.email);
    if (!authErr && authUser?.id && profileEmail) {
      isAnonymous = false;
      const svc = createServiceRoleClient();
      const { data: urow, error: profErr } = await svc
        .from("users")
        .select("provider_name, provider_npi, provider_address")
        .eq("email", profileEmail)
        .maybeSingle();
      if (profErr) {
        console.error("[preview/analyze] profile fetch warning", profErr);
      } else if (urow) {
        const r = urow as {
          provider_name: string | null;
          provider_npi: string | null;
          provider_address: string | null;
        };
        profile = {
          provider_name: String(r.provider_name || "").trim(),
          provider_npi: String(r.provider_npi || "").trim(),
          provider_address: String(r.provider_address || "").trim(),
        };
      }
    }
  } catch (err) {
    console.error("[preview/analyze] auth/profile section failed (continuing as anonymous if applicable)", err);
  }

  const claimData =
    body.claim_data && typeof body.claim_data === "object"
      ? (body.claim_data as DapClaimDataForPreview)
      : null;
  const intakeSnapshot =
    body.intake_snapshot && typeof body.intake_snapshot === "object"
      ? (body.intake_snapshot as DapIntakeSnapshot)
      : null;

  const letterCtx = buildPreviewLetterContextFromPreviewPayload({
    claim_data: claimData,
    intake_snapshot: intakeSnapshot,
    profile,
    isAnonymous,
  });
  const letterPromise = letterCtx
    ? generateAppealPreviewLetter(letterCtx)
    : Promise.resolve("");

  let completion: Awaited<ReturnType<typeof oa.chat.completions.create>>;
  let appeal_letter: string;
  try {
    [completion, appeal_letter] = await Promise.all([
      oa.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 500,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      }),
      letterPromise,
    ]);
  } catch (err) {
    console.error("[preview/analyze] OpenAI or letter generation failed", err);
    return NextResponse.json(
      { error: "Analysis request failed" },
      { status: 502, headers: JSON_HEADERS }
    );
  }

  const content = completion.choices[0]?.message?.content?.trim() || "";
  let parsed: Record<string, unknown>;
  try {
    parsed = parseAiJsonObject(content);
  } catch (err) {
    console.error("[preview/analyze] Failed to parse AI response", err, { contentPreview: content.slice(0, 500) });
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500, headers: JSON_HEADERS });
  }

  const keyIssues = asStringArray(parsed.key_issues, 3, "Review issue");
  const carc_codes = asCarcArray(parsed.carc_codes);

  const result: DapPreviewAnalysisResult = {
    denial_type: asNonEmptyString(parsed.denial_type, "General denial"),
    confidence: normalizeConfidence(parsed.confidence),
    summary: asNonEmptyString(
      parsed.summary,
      "We identified a payer denial to address in your appeal."
    ),
    key_issues: keyIssues,
    appeal_strength: normalizeStrength(parsed.appeal_strength),
    strategy: asNonEmptyString(
      parsed.strategy,
      "Gather clinical documentation and payer policy references that support medical necessity."
    ),
    carc_codes,
    teaser: [...DAP_TEASER_LINES],
    appeal_letter:
      appeal_letter ||
      "Appeal letter could not be generated. Return to the wizard and ensure payer and denial details are filled in.",
  };

  return NextResponse.json(result, { status: 200, headers: JSON_HEADERS });
}
