"""
Denial Taxonomy Map - Structured rules for denial codes
Maps CARC (Claim Adjustment Reason Codes) and RARC codes to required sections and documentation
"""

DENIAL_RULES = {
    "CARC_50": {
        "code": "50",
        "description": "Medical Necessity - These are non-covered services because this is not deemed a 'medical necessity' by the payer",
        "required_sections": [
            "Clinical Summary",
            "Treatment Rationale",
            "Policy Citation",
            "Supporting Literature",
            "Request for Reconsideration"
        ],
        "required_docs": ["Progress Notes", "Physician Order", "Clinical Documentation"],
        "strategy": "medical_necessity"
    },
    "CARC_29": {
        "code": "29",
        "description": "Timely Filing - The time limit for filing has expired",
        "required_sections": [
            "Timely Filing Explanation",
            "Submission Proof",
            "Policy Reference",
            "Good Cause Statement"
        ],
        "required_docs": ["Proof of Timely Submission", "Correspondence Records"],
        "strategy": "timely_filing"
    },
    "CARC_16": {
        "code": "16",
        "description": "Prior Authorization - Claim/service lacks information or has submission/billing error(s)",
        "required_sections": [
            "Authorization Status",
            "Clinical Justification",
            "Policy Compliance Statement",
            "Request for Retroactive Authorization"
        ],
        "required_docs": ["Clinical Notes", "Authorization Request Documentation"],
        "strategy": "prior_authorization"
    },
    "CARC_18": {
        "code": "18",
        "description": "Duplicate Claim/Service - Exact duplicate claim/service",
        "required_sections": [
            "Claim Differentiation",
            "Service Date Clarification",
            "Documentation of Separate Service"
        ],
        "required_docs": ["Original Claim Documentation", "Service Records"],
        "strategy": "duplicate_claim"
    },
    "CARC_22": {
        "code": "22",
        "description": "Coordination of Benefits - This care may be covered by another payer per coordination of benefits",
        "required_sections": [
            "Primary Insurance Verification",
            "EOB from Primary Payer",
            "Secondary Payer Responsibility Statement"
        ],
        "required_docs": ["Primary Insurance EOB", "Coverage Verification"],
        "strategy": "coordination_benefits"
    },
    "CARC_96": {
        "code": "96",
        "description": "Non-Covered Charge - Non-covered charge(s)",
        "required_sections": [
            "Coverage Policy Review",
            "Clinical Necessity Justification",
            "Alternative Coverage Argument",
            "Request for Exception"
        ],
        "required_docs": ["Policy Documentation", "Clinical Records"],
        "strategy": "non_covered"
    },
    "CARC_97": {
        "code": "97",
        "description": "Benefit Maximum/Limitation - The benefit for this service is included in the payment/allowance for another service/procedure",
        "required_sections": [
            "Benefit Limit Review",
            "Service Differentiation",
            "Medical Necessity for Additional Service"
        ],
        "required_docs": ["Benefit Summary", "Service Documentation"],
        "strategy": "benefit_maximum"
    },
    "CARC_4": {
        "code": "4",
        "description": "Procedure Code Inconsistency - The procedure code is inconsistent with the modifier used or a required modifier is missing",
        "required_sections": [
            "Coding Correction",
            "Modifier Justification",
            "Service Description Clarification"
        ],
        "required_docs": ["Corrected Claim Form", "Coding Documentation"],
        "strategy": "coding_error"
    },
    "CARC_109": {
        "code": "109",
        "description": "Not Covered for This Patient - Claim/service not covered by this payer/contractor",
        "required_sections": [
            "Coverage Verification",
            "Eligibility Documentation",
            "Exception Request"
        ],
        "required_docs": ["Eligibility Verification", "Coverage Documents"],
        "strategy": "not_covered_patient"
    },
    "CARC_197": {
        "code": "197",
        "description": "Precertification Absent - Precertification/authorization/notification absent",
        "required_sections": [
            "Emergency Service Justification",
            "Retroactive Authorization Request",
            "Clinical Necessity Statement"
        ],
        "required_docs": ["Clinical Documentation", "Emergency Records if applicable"],
        "strategy": "precertification"
    },
    "CARC_180": {
        "code": "180",
        "description": "Experimental/Investigational - The procedure/service is experimental/investigational",
        "required_sections": [
            "FDA Approval Status",
            "Clinical Evidence Review",
            "Standard of Care Argument",
            "Medical Necessity Justification"
        ],
        "required_docs": ["Clinical Studies", "FDA Documentation", "Medical Literature"],
        "strategy": "experimental"
    },
    "CARC_24": {
        "code": "24",
        "description": "Insurance Coverage Inactive - Charges are covered under a capitation agreement/managed care plan",
        "required_sections": [
            "Coverage Period Verification",
            "Eligibility Documentation",
            "Service Date Confirmation"
        ],
        "required_docs": ["Insurance Card Copy", "Eligibility Verification"],
        "strategy": "coverage_inactive"
    },
    "CARC_27": {
        "code": "27",
        "description": "Out of Network Provider - Expenses incurred after coverage terminated",
        "required_sections": [
            "Network Status Verification",
            "Out-of-Network Benefit Review",
            "Exception Request"
        ],
        "required_docs": ["Provider Network Documentation", "Benefit Summary"],
        "strategy": "out_of_network"
    },
    "CARC_15": {
        "code": "15",
        "description": "Incorrect Date of Service - The authorization number is missing, invalid, or does not apply to the billed services",
        "required_sections": [
            "Date Correction",
            "Service Date Documentation",
            "Claim Correction Request"
        ],
        "required_docs": ["Corrected Claim", "Service Records"],
        "strategy": "date_error"
    },
    "CARC_5": {
        "code": "5",
        "description": "Incorrect Diagnosis Code - The procedure code/bill type is inconsistent with the place of service",
        "required_sections": [
            "Diagnosis Code Correction",
            "Clinical Documentation Review",
            "Corrected Claim Submission"
        ],
        "required_docs": ["Medical Records", "Corrected Claim Form"],
        "strategy": "diagnosis_error"
    },
    "CARC_11": {
        "code": "11",
        "description": "Incorrect Patient Information - The diagnosis is inconsistent with the procedure",
        "required_sections": [
            "Patient Information Correction",
            "Verification Documentation",
            "Corrected Claim"
        ],
        "required_docs": ["Patient Demographics", "Insurance Verification"],
        "strategy": "patient_info_error"
    },
    "CARC_252": {
        "code": "252",
        "description": "Additional Documentation Required - An attachment/other documentation is required",
        "required_sections": [
            "Documentation Index",
            "Clinical Records Summary",
            "Compliance Statement"
        ],
        "required_docs": ["All Requested Documentation", "Medical Records"],
        "strategy": "additional_documentation"
    }
}

# Alternative code format mappings (CO-50, PR-1, etc.)
CODE_ALIASES = {
    "CO-50": "CARC_50",
    "CO-29": "CARC_29",
    "CO-16": "CARC_16",
    "CO-18": "CARC_18",
    "CO-22": "CARC_22",
    "CO-96": "CARC_96",
    "CO-97": "CARC_97",
    "CO-4": "CARC_4",
    "CO-109": "CARC_109",
    "CO-197": "CARC_197",
    "CO-180": "CARC_180",
    "CO-24": "CARC_24",
    "CO-27": "CARC_27",
    "CO-15": "CARC_15",
    "CO-5": "CARC_5",
    "CO-11": "CARC_11",
    "CO-252": "CARC_252",
    "50": "CARC_50",
    "29": "CARC_29",
    "16": "CARC_16",
    "18": "CARC_18",
    "22": "CARC_22",
    "96": "CARC_96",
    "97": "CARC_97",
    "4": "CARC_4",
    "109": "CARC_109",
    "197": "CARC_197",
    "180": "CARC_180",
    "24": "CARC_24",
    "27": "CARC_27",
    "15": "CARC_15",
    "5": "CARC_5",
    "11": "CARC_11",
    "252": "CARC_252"
}

def get_denial_rule(denial_code):
    """
    Get the denial rule for a given code
    
    Args:
        denial_code: The denial code (can be CARC_50, CO-50, or 50)
    
    Returns:
        dict: The denial rule or None if not found
    """
    if not denial_code:
        return None
    
    # Normalize the code
    normalized_code = denial_code.upper().strip()
    
    # Check if it's already in CARC_ format
    if normalized_code in DENIAL_RULES:
        return DENIAL_RULES[normalized_code]
    
    # Check aliases
    if normalized_code in CODE_ALIASES:
        return DENIAL_RULES[CODE_ALIASES[normalized_code]]
    
    return None

def get_required_sections(denial_code):
    """Get required sections for a denial code"""
    rule = get_denial_rule(denial_code)
    return rule["required_sections"] if rule else []

def get_required_docs(denial_code):
    """Get required documentation for a denial code"""
    rule = get_denial_rule(denial_code)
    return rule["required_docs"] if rule else []

def get_strategy(denial_code):
    """Get the appeal strategy for a denial code"""
    rule = get_denial_rule(denial_code)
    return rule["strategy"] if rule else "general"

def get_all_denial_codes():
    """Get all available denial codes"""
    return list(DENIAL_RULES.keys())
