/**
 * Port of backend/coding_intelligence.py — coding validation, modifiers, denial risk.
 * Keep behavior aligned with Flask for intake /api/intelligence/analyze.
 */

export type JsonRecord = Record<string, unknown>;

const EM_RANGE = /^99[2-4]\d{2}$/;
const HIGH_OFFICE_EM = /^992(0[4-5]|1[3-5])$/;
const PROCEDURE_SURGICAL = /^(1\d{4}|2\d{4}|3\d{4}|4\d{4}|5\d{4}|6\d{4})$/;
const IMAGING = /^(7\d{4})$/;

function splitCodes(raw: unknown): string[] {
  if (raw == null) return [];
  const parts = Array.isArray(raw) ? raw : String(raw).trim().split(/[\s,;]+/);
  const out: string[] = [];
  for (const p0 of parts) {
    let p = String(p0).trim().toUpperCase().replace(/\./g, "");
    if (!p) continue;
    const base = p.match(/^(\d{5})/);
    if (base) out.push(base[1]!);
    else if (/^\d{5}$/.test(p)) out.push(p);
  }
  return [...new Set(out)].slice(0, 40);
}

function splitIcd(raw: unknown): string[] {
  if (raw == null) return [];
  const parts = Array.isArray(raw) ? raw : String(raw).trim().split(/[\s,;]+/);
  const out: string[] = [];
  for (const p0 of parts) {
    const p = String(p0).replace(/[^A-Z0-9.]/gi, "").toUpperCase();
    if (p.length >= 3) out.push(p);
  }
  return [...new Set(out)].slice(0, 24);
}

function icdSpecificity(icd: string): "unspecified" | "general_z" | "specific" | "moderate" {
  const core = icd.replace(/\./g, "");
  if (core.length <= 3) return "unspecified";
  if (core.startsWith("Z") && core.length <= 5) return "general_z";
  if (/^[A-Z]\d{2}\d{3}$/.test(core) || /^[A-Z]\d{2}\.\d/.test(icd)) return "specific";
  return "moderate";
}

function normalizeValidatePair(cpt_codes: unknown, icd_codes: unknown, kwargs: JsonRecord): [unknown, unknown] {
  if (cpt_codes != null && typeof cpt_codes === "object" && !Array.isArray(cpt_codes)) {
    const d = cpt_codes as JsonRecord;
    return [
      d.cptCodes ?? d.cpt_codes,
      d.icdCodes ?? d.icd10_codes ?? d.icd_codes,
    ];
  }
  const cpt = kwargs.cptCodes != null ? kwargs.cptCodes : cpt_codes;
  const icd = kwargs.icdCodes != null ? kwargs.icdCodes : icd_codes;
  return [cpt, icd];
}

export function validateCoding(cpt_codes?: unknown, icd_codes?: unknown, kwargs: JsonRecord = {}): JsonRecord {
  const [cpt_in, icd_in] = normalizeValidatePair(cpt_codes, icd_codes, kwargs);
  const cpts = splitCodes(cpt_in);
  const icds = splitIcd(icd_in);
  const issues: string[] = [];
  const suggestions: string[] = [];
  const weakIcd: string[] = [];

  if (!cpts.length) {
    issues.push("No CPT/HCPCS codes provided — cannot validate medical necessity pairing.");
    suggestions.push("Enter at least one procedure or visit code.");
  }
  if (!icds.length) {
    issues.push("No ICD-10 diagnosis codes provided — missing diagnosis linkage.");
    suggestions.push("Add diagnosis codes that support medical necessity for each service line.");
  }

  const emCodes = cpts.filter((c) => EM_RANGE.test(c));
  const procCodes = cpts.filter((c) => PROCEDURE_SURGICAL.test(c));
  const imgCodes = cpts.filter((c) => IMAGING.test(c));

  for (const icd of icds) {
    const spec = icdSpecificity(icd);
    if (spec === "unspecified" || spec === "general_z") weakIcd.push(icd);
  }

  for (const em of emCodes) {
    if (icds.length) {
      const onlyZ = icds.every((i) => i.startsWith("Z"));
      if (onlyZ && HIGH_OFFICE_EM.test(em)) {
        issues.push(
          `ICD-10 pattern may not support CPT ${em} (high-level E/M with only Z-series diagnoses).`
        );
        suggestions.push("Add active diagnoses documented for this visit or align E/M level with payer policy.");
      }
      if (onlyZ && em >= "99204" && !HIGH_OFFICE_EM.test(em)) {
        issues.push(
          `ICD-10 may not fully support CPT ${em} for medical necessity if only screening codes apply.`
        );
        suggestions.push("Ensure visit diagnosis matches the work performed.");
      }
    }
  }

  if (emCodes.length && icds.length) {
    const onlyZScreening = icds.every((i) => i.startsWith("Z"));
    if (onlyZScreening && emCodes.some((c) => c >= "99204")) {
      if (!issues.some((x) => x.includes("ICD-10 pattern may not support CPT"))) {
        issues.push("Diagnosis is too general or screening-only for the service complexity reported.");
        suggestions.push("Use diagnoses that support medical necessity for the E/M level billed.");
      }
    }
  }

  if (emCodes.length && procCodes.length) {
    issues.push("E/M and procedure on the same encounter often require modifier -25 on the E/M when distinct.");
    suggestions.push("Confirm separate E/M service from procedure; consider modifier -25 if payer rules allow.");
  }

  for (const icd of icds) {
    if (icdSpecificity(icd) === "unspecified") {
      issues.push(`ICD-10 ${icd} appears truncated or unspecified — may lack specificity for the service.`);
      suggestions.push("Use the most specific billable ICD-10 supported by documentation.");
    }
  }

  if (procCodes.length && !emCodes.length && icds.length === 1) {
    const s = icdSpecificity(icds[0]!);
    if (s === "general_z" || s === "unspecified") {
      issues.push("Procedure coding with a single broad or Z-code diagnosis may indicate incomplete linkage.");
      suggestions.push("Link complications, anatomy, or active conditions as documented.");
    }
  }

  if (imgCodes.length && icds.length) {
    if (icds.every((i) => ["unspecified", "general_z", "moderate"].includes(icdSpecificity(i)))) {
      issues.push("Imaging CPT with broadly stated diagnoses — payer may question medical necessity specificity.");
      suggestions.push("Tighten ICD-10 to findings or symptoms that justify the study.");
    }
  }

  if (imgCodes.length) {
    issues.push("Imaging CPT codes often require prior authorization by payer and policy.");
    suggestions.push("Verify authorization on file for the DOS and modality.");
  }

  const valid = issues.length === 0;
  return {
    valid,
    issues: issues.slice(0, 14),
    suggestions: suggestions.slice(0, 14),
    weakIcdCodes: [...new Set(weakIcd)].slice(0, 24),
    cpt_parsed: cpts,
    icd_parsed: icds,
  };
}

function parseCarcFromText(blob: string): number[] {
  const out: number[] = [];
  const re = /(?:CO|PR|PI|OA)?[-\s]?(\d{1,3})/g;
  let m: RegExpExecArray | null;
  const u = (blob || "").toUpperCase();
  while ((m = re.exec(u)) != null) {
    const n = parseInt(m[1]!, 10);
    if (n > 0 && n <= 999) out.push(n);
  }
  return [...new Set(out)].slice(0, 24);
}

function carcFromAny(carc_codes: unknown, denialBlob: string): number[] {
  let nums = parseCarcFromText(denialBlob);
  if (Array.isArray(carc_codes)) {
    for (const x of carc_codes) nums = nums.concat(parseCarcFromText(String(x)));
  } else if (carc_codes) {
    nums = nums.concat(parseCarcFromText(String(carc_codes)));
  }
  return [...new Set(nums)].slice(0, 24);
}

function normalizeSuggestArgs(
  cpt_codes: unknown,
  denial_codes: unknown,
  context: JsonRecord | null | undefined
): [string[], number[], JsonRecord, string] {
  let ctx: JsonRecord = { ...(context || {}) };
  let cpts: string[] = [];
  let blob = "";
  let carcs: number[] = [];

  if (cpt_codes != null && typeof cpt_codes === "object" && !Array.isArray(cpt_codes)) {
    const d = cpt_codes as JsonRecord;
    const cptRaw = d.cptCodes ?? d.cpt_codes;
    const carcRaw = d.carcCodes ?? d.carc_codes;
    ctx = { ...ctx, ...((d.context as JsonRecord) || {}) };
    cpts = splitCodes(cptRaw);
    blob = Array.isArray(carcRaw) ? carcRaw.map((x) => String(x)).join(" ") : String(carcRaw || "");
    carcs = carcFromAny(carcRaw, blob);
    if (denial_codes != null && denial_codes !== "") {
      const extra = Array.isArray(denial_codes) ? denial_codes.map((x) => String(x)).join(" ") : String(denial_codes);
      blob = `${blob} ${extra}`.trim();
    }
  } else {
    cpts = splitCodes(cpt_codes);
    blob = Array.isArray(denial_codes) ? denial_codes.map((x) => String(x)).join(" ") : String(denial_codes || "");
    carcs = carcFromAny(null, blob);
  }
  blob = `${blob} ${String(ctx.denial_reason || "")}`.trim();
  carcs = [...new Set([...carcs, ...parseCarcFromText(blob)])].slice(0, 24);
  return [cpts, carcs, ctx, blob];
}

export function suggestModifiers(
  cpt_codes?: unknown,
  denial_codes?: unknown,
  context?: JsonRecord | null
): JsonRecord {
  const [cpts, carcs, ctx, blob] = normalizeSuggestArgs(cpt_codes, denial_codes, context);
  const recommended: string[] = [];
  const reasoningLines: string[] = [];
  const U = blob.toUpperCase();

  const emCodes = cpts.filter((c) => EM_RANGE.test(c));
  const procCodes = cpts.filter((c) => PROCEDURE_SURGICAL.test(c));
  const imgCodes = cpts.filter((c) => IMAGING.test(c));
  const procLike = procCodes.concat(imgCodes);

  if (emCodes.length && procLike.length) {
    recommended.push("-25");
    reasoningLines.push("Separate E/M service performed with procedure — distinct service when documented.");
  }
  if (carcs.includes(97) || U.includes("BUNDL")) {
    if (!recommended.includes("-59") && !recommended.includes("-XS")) recommended.push("-59");
    reasoningLines.push("CARC 97 (bundling / inclusive payment) — distinct procedural service may require -59 or -XS.");
  }
  if (carcs.includes(4) || U.includes("MODIFIER")) {
    if (!recommended.includes("-59")) recommended.push("-59");
    reasoningLines.push("CARC 4 or modifier-related denial — review NCCI and append -59 or appropriate modifier when distinct.");
  }
  if (ctx.global_period_unrelated || U.includes("GLOBAL")) {
    recommended.push("-24");
    reasoningLines.push("Unrelated E/M during postoperative global period — use -24 when policy criteria are met.");
  }
  if (U.includes("REPEAT") || carcs.includes(76)) {
    recommended.push("-76");
    reasoningLines.push("Repeat procedure by same physician — -76 when the same procedure is repeated.");
  }
  if (U.includes("DIFFERENT") && U.includes("PHYSICIAN")) {
    recommended.push("-77");
    reasoningLines.push("Repeat procedure, different physician — consider -77.");
  }
  const nProc = cpts.filter((c) => PROCEDURE_SURGICAL.test(c) || IMAGING.test(c)).length;
  if (nProc >= 2) {
    if (!recommended.includes("-59") && !recommended.includes("-XS")) recommended.push("-59");
    reasoningLines.push("Multiple procedures — evaluate distinct services; -59 or -XS when separately reportable.");
  }

  const seen = new Set<string>();
  const mods: string[] = [];
  for (const m of recommended) {
    if (!seen.has(m)) {
      seen.add(m);
      mods.push(m);
    }
  }
  if (!reasoningLines.length) {
    reasoningLines.push("No automatic modifier rules triggered — verify payer policy and NCCI edits.");
  }
  return {
    recommendedModifiers: mods.slice(0, 8),
    reasoning: reasoningLines.slice(0, 12),
    matched_carcs: carcs,
  };
}

export function detectDenialRisk(inputData: JsonRecord): JsonRecord {
  const risks: string[] = [];
  const recs: string[] = [];
  let score = 0;

  const cpts = splitCodes(inputData.cpt_codes ?? inputData.cptCodes);
  const icds = splitIcd(
    inputData.icd10_codes ?? inputData.icd_codes ?? inputData.diagnosis_code ?? inputData.icdCodes
  );
  const mods = String(inputData.modifiers || "").toUpperCase();
  const payer = String(inputData.payer || "");
  const plan = String(inputData.planType || inputData.plan_type || "");

  let carcBlob = [inputData.denial_code, inputData.carc_codes, inputData.carcCodes].map((x) => String(x ?? "")).join(" ");
  if (Array.isArray(inputData.carcCodes)) {
    carcBlob += " " + inputData.carcCodes.map((x) => String(x)).join(" ");
  }
  const denialBlob = [carcBlob, inputData.denial_reason, inputData.rarc_codes].map((x) => String(x ?? "")).join(" ");
  const carcNums = parseCarcFromText(denialBlob);

  if (!cpts.length) {
    score += 15;
    risks.push("Missing procedure codes — high scrubber / medical necessity exposure.");
    recs.push("Enter all line-item CPT/HCPCS codes.");
  }
  if (!icds.length) {
    score += 22;
    risks.push("Missing diagnosis codes — high likelihood of medical necessity denial.");
    recs.push("Add ICD-10 codes tied to documentation.");
  }
  for (const icd of icds) {
    if ((icdSpecificity(icd) === "unspecified" || icdSpecificity(icd) === "general_z") && cpts.length) {
      score += 12;
      risks.push("Weak ICD-10 specificity relative to billed services.");
      recs.push("Use specific, billable diagnoses supported by the record.");
      break;
    }
  }

  const emCodes = cpts.filter((c) => EM_RANGE.test(c));
  const procCodes = cpts.filter((c) => PROCEDURE_SURGICAL.test(c));
  if (emCodes.length && procCodes.length && !mods.includes("-25") && !mods.includes("25")) {
    score += 18;
    risks.push("HIGH RISK: E/M plus procedure same day without modifier -25 — likely bundling or denial.");
    recs.push("Add modifier -25 to the E/M when separately identifiable.");
  }
  if (carcNums.includes(197) || carcNums.includes(16)) {
    score += 14;
    risks.push("Authorization / precertification cited on claim (CARC pattern).");
    recs.push("Secure authorization or retro-auth documentation before resubmission.");
  }
  if (carcNums.includes(252)) {
    score += 8;
    risks.push("Additional documentation or authorization gap (CARC 252 pattern).");
    recs.push("Submit complete clinical packet or auth proof.");
  }
  if (cpts.some((c) => IMAGING.test(c))) {
    score += 8;
    risks.push("Authorization-sensitive CPT: advanced imaging often requires precert.");
    recs.push("Confirm precertification and medical necessity narrative.");
  }
  if (plan.toUpperCase() === "MEDICAID" || plan.toUpperCase() === "MEDICARE") {
    score += 5;
    risks.push(`${plan} plans often apply strict LCD / NCD medical necessity rules.`);
    recs.push("Align diagnoses and modifiers with program coverage policies.");
  }
  if (payer.toUpperCase().includes("UNITED") || payer.toUpperCase().includes("UHC")) {
    score += 6;
    risks.push("Known payer pattern: strict policy-driven medical necessity reviews.");
    recs.push("Cite applicable clinical policy in documentation.");
  }
  if (emCodes.length && icds.length && icds.every((i) => i.startsWith("Z")) && emCodes.some((c) => c >= "99204")) {
    score += 14;
    risks.push("HIGH RISK: high-complexity E/M without active diagnosis codes on claim.");
    recs.push("Strengthen clinical documentation and diagnosis linkage.");
  }

  if (!risks.length) {
    risks.push("Properly matched coding — continue routine documentation review.");
  }
  if (!recs.length) {
    recs.push("Maintain complete chart and timely filing.");
  }
  const level = score >= 38 ? "High" : score >= 20 ? "Medium" : "Low";
  return {
    riskLevel: level,
    riskScore: Math.min(100, score),
    risks: risks.slice(0, 12),
    recommendations: recs.slice(0, 12),
  };
}

export function runIntelligenceAnalysis(payload: JsonRecord): JsonRecord {
  const cpt = payload.cpt_codes ?? payload.cptCodes ?? "";
  const icd =
    payload.icd10_codes ?? payload.icd_codes ?? payload.icdCodes ?? payload.diagnosis_code ?? "";
  let carcList: unknown = payload.carcCodes ?? payload.carc_codes;
  if (carcList == null && payload.carc_codes) carcList = payload.carc_codes;
  let denial = String(payload.denial_codes || payload.denial_code || "");
  denial += ` ${String(payload.carc_codes || "")} ${String(payload.rarc_codes || "")}`;
  if (Array.isArray(carcList)) {
    denial += " " + carcList.map((x) => String(x)).join(" ");
  }
  const coding = validateCoding({ cptCodes: cpt, icdCodes: icd });
  const modifiers = suggestModifiers(
    {
      cptCodes: cpt,
      carcCodes: carcList != null ? carcList : payload.carc_codes,
      context: {
        denial_reason: payload.denial_reason,
        global_period_unrelated: payload.global_period_unrelated,
      },
    },
    denial,
    undefined
  );
  const risk = detectDenialRisk(payload);
  return { coding, modifiers, risk };
}
