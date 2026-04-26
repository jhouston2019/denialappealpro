/**
 * Session keys and shared types for anonymous preview → pay → resume flow.
 */

export const DAP_PREVIEW_PAYLOAD_KEY = "dap_preview_payload";
export const DAP_RESUME_AFTER_PAYMENT_KEY = "dap_resume_after_payment";
/** Wizard resume after payment when intake preview API needs missing fields. */
export const DAP_WIZARD_RESUME_KEY = "dap_wizard_resume";

export const DAP_TEASER_LINES = [
  "Full appeal letter with regulatory citations",
  "CARC/RARC-specific rebuttal arguments",
  "Submission-ready PDF and Word export",
] as const;

export type DapIntakeMode = "upload" | "paste" | "csv";

/** Stored when leaving Step 2 (review) for anonymous preview. */
export type DapPreviewPayloadStored = {
  extracted_text: string;
  claim_data: DapClaimDataForPreview;
  intake_snapshot: DapIntakeSnapshot;
  mode: DapIntakeMode;
};

export type DapClaimDataForPreview = {
  intake_mode: string;
  payer: string;
  denial_reason: string;
  billed_amount: string;
  paste_details: string;
  claim_number: string;
  patient_name: string;
  provider_name: string;
  provider_npi: string;
  date_of_service: string;
  cpt_codes: string;
  diagnosis_code: string;
  icd10_codes: string;
  denial_code: string;
};

/** Subset of wizard intake we persist for wizard resume (JSON-serializable). */
export type DapIntakeSnapshot = {
  claimNumber: string;
  dateOfService: string;
  payer: string;
  patientName: string;
  carcCodes: string[];
  rarcCodes: string[];
  cptCodes: string[];
  icdCodes: string[];
  billedAmount: string;
  paidAmount: string;
  treatmentProvided: string;
  medicalNecessity: string;
  modifiers: string;
  specialCircumstances: string;
  planType: string;
  providerName: string;
  providerNpi: string;
  providerAddress: string;
  providerPhone: string;
  providerFax: string;
};

export type DapWizardResumeStored = {
  intake: DapIntakeSnapshot;
  mode: DapIntakeMode;
};

export type DapResumeAfterPaymentPayload = {
  extracted_text: string;
  claim_data: DapClaimDataForPreview;
  intake_snapshot: DapIntakeSnapshot;
  preview_data: DapPreviewAnalysisResult;
  mode: DapIntakeMode;
};

export type DapPreviewAnalysisResult = {
  denial_type: string;
  confidence: "High" | "Moderate" | "Low";
  summary: string;
  key_issues: string[];
  appeal_strength: "Strong" | "Moderate" | "Weak";
  strategy: string;
  carc_codes: string[];
  teaser: readonly string[] | string[];
};

export function snapshotIntakeFromWizard(intake: {
  claimNumber: string;
  dateOfService: string;
  payer: string;
  patientName: string;
  carcCodes: string[];
  rarcCodes: string[];
  cptCodes: string[];
  icdCodes: string[];
  billedAmount: string;
  paidAmount: string;
  treatmentProvided: string;
  medicalNecessity: string;
  modifiers: string;
  specialCircumstances: string;
  planType: string;
  providerName: string;
  providerNpi: string;
  providerAddress?: string;
  providerPhone?: string;
  providerFax?: string;
}): DapIntakeSnapshot {
  return {
    claimNumber: intake.claimNumber,
    dateOfService: intake.dateOfService,
    payer: intake.payer,
    patientName: intake.patientName,
    carcCodes: [...(intake.carcCodes || [])],
    rarcCodes: [...(intake.rarcCodes || [])],
    cptCodes: [...(intake.cptCodes || [])],
    icdCodes: [...(intake.icdCodes || [])],
    billedAmount: intake.billedAmount,
    paidAmount: intake.paidAmount,
    treatmentProvided: intake.treatmentProvided,
    medicalNecessity: intake.medicalNecessity,
    modifiers: intake.modifiers,
    specialCircumstances: intake.specialCircumstances,
    planType: intake.planType,
    providerName: intake.providerName,
    providerNpi: intake.providerNpi,
    providerAddress: intake.providerAddress ?? "",
    providerPhone: intake.providerPhone ?? "",
    providerFax: intake.providerFax ?? "",
  };
}
