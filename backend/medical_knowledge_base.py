"""
Medical Billing & Insurance Knowledge Base
Contains expert-level information for generating superior appeal letters
"""

# Regulatory Framework Database
REGULATORY_REFERENCES = {
    'ERISA': {
        'section_503': 'ERISA Section 503 requires plans to provide a reasonable opportunity to appeal adverse benefit determinations',
        'section_502': 'ERISA Section 502(a) provides for civil enforcement of benefit claims',
        'full_and_fair_review': 'ERISA requires a "full and fair review" of denied claims with access to all relevant documents',
        'timeframes': '180 days for internal appeals, must respond within 60 days for non-urgent pre-service claims'
    },
    'ACA': {
        'essential_health_benefits': 'ACA requires coverage of Essential Health Benefits including emergency services, hospitalization, and preventive care',
        'medical_necessity': 'ACA Section 2713 requires coverage of preventive services without cost-sharing',
        'external_review': 'ACA guarantees right to external independent review for adverse determinations'
    },
    'state_laws': {
        'prompt_pay': 'State prompt pay laws typically require payment within 30-45 days of clean claim receipt',
        'timely_filing': 'Most states require minimum 90-180 day timely filing limits for in-network providers',
        'balance_billing': 'Many states prohibit balance billing for emergency services and out-of-network care'
    },
    'medicare': {
        'lcd_ncd': 'Local and National Coverage Determinations define Medicare coverage criteria',
        'reasonable_necessary': '42 CFR 411.15 defines reasonable and necessary under Medicare',
        'appeal_rights': 'Medicare Appeals Process includes 5 levels of appeal'
    }
}

# Medical Necessity Criteria by Common Conditions
MEDICAL_NECESSITY_CRITERIA = {
    'emergency_services': {
        'prudent_layperson': 'Emergency Medical Treatment and Labor Act (EMTALA) and prudent layperson standard',
        'criteria': 'Acute symptoms of sufficient severity that absence of immediate medical attention could result in serious jeopardy to health',
        'case_law': 'Prudent layperson standard requires coverage if a reasonable person would seek emergency care'
    },
    'diagnostic_testing': {
        'indications': 'Testing must be reasonable and necessary for diagnosis or treatment of illness or injury',
        'frequency': 'Frequency based on clinical guidelines and evidence-based protocols',
        'alternatives': 'Should consider less invasive/costly alternatives when clinically appropriate'
    },
    'surgical_procedures': {
        'medical_vs_cosmetic': 'Must be for treatment of medical condition, not purely cosmetic',
        'conservative_treatment': 'Documentation of failed conservative treatment when applicable',
        'functional_impairment': 'Documentation of significant functional impairment'
    },
    'mental_health': {
        'parity': 'Mental Health Parity and Addiction Equity Act requires equal treatment limitations',
        'level_of_care': 'ASAM criteria or equivalent for substance use disorder treatment levels',
        'medical_necessity': 'Evidence-based treatment protocols and clinical guidelines'
    },
    'durable_medical_equipment': {
        'medical_necessity': 'Must be medically necessary for treatment of illness/injury',
        'prescription': 'Requires physician prescription and clinical justification',
        'alternatives': 'Less costly alternatives must be clinically inadequate'
    }
}

# Clinical Guidelines Database
CLINICAL_GUIDELINES = {
    'cardiology': {
        'organizations': ['American College of Cardiology', 'American Heart Association'],
        'key_guidelines': 'ACC/AHA guidelines for cardiac intervention, stress testing, echocardiography'
    },
    'radiology': {
        'organizations': ['American College of Radiology'],
        'key_guidelines': 'ACR Appropriateness Criteria for imaging studies'
    },
    'oncology': {
        'organizations': ['National Comprehensive Cancer Network', 'American Society of Clinical Oncology'],
        'key_guidelines': 'NCCN Guidelines and ASCO treatment recommendations'
    },
    'orthopedics': {
        'organizations': ['American Academy of Orthopaedic Surgeons'],
        'key_guidelines': 'AAOS clinical practice guidelines for musculoskeletal conditions'
    },
    'preventive': {
        'organizations': ['US Preventive Services Task Force', 'CDC'],
        'key_guidelines': 'USPSTF recommendations for preventive services'
    }
}

# Denial-Specific Strategic Arguments
DENIAL_STRATEGIES = {
    'CO-50': {  # Medical Necessity
        'primary_arguments': [
            'Evidence-based clinical guidelines support medical necessity',
            'Patient-specific factors and comorbidities justify treatment',
            'Conservative/alternative treatments failed or contraindicated',
            'Service prevents future complications and reduces overall costs',
            'Meets MCG, Milliman, or InterQual criteria'
        ],
        'common_weaknesses': 'Payer often relies on generic policies without patient-specific review',
        'escalation': 'Request peer-to-peer review with board-certified specialist in same specialty'
    },
    'CO-16': {  # Prior Auth
        'primary_arguments': [
            'Emergency circumstances requiring immediate treatment',
            'Prior authorization obtained (if applicable) - provide reference number',
            'Service rendered before authorization requirement implemented',
            'Payer failed to respond to authorization request timely',
            'Good faith effort to comply with authorization requirements'
        ],
        'common_weaknesses': 'Administrative denial, not clinical - service was medically necessary',
        'escalation': 'Request retroactive authorization based on medical necessity'
    },
    'CO-18': {  # Duplicate
        'primary_arguments': [
            'Different date of service than previous claim',
            'Separate and distinct service/procedure',
            'Bilateral procedures with appropriate modifiers',
            'Multiple units justified by service duration or complexity',
            'Corrected claim submission, not duplicate'
        ],
        'common_weaknesses': 'Often automated system error, requires manual review',
        'escalation': 'Provide detailed claim comparison showing distinct services'
    },
    'CO-22': {  # COB
        'primary_arguments': [
            'Verify primary payer status per patient and employer',
            'Medicare Secondary Payer rules if applicable',
            'COB completed per payer coordination agreements',
            'Patient has confirmed coverage hierarchy',
            'Payer has correct COB information on file'
        ],
        'common_weaknesses': 'Often due to outdated payer information',
        'escalation': 'Submit updated COB information and request reprocessing'
    },
    'CO-29': {  # Timely Filing
        'primary_arguments': [
            'Good cause exception due to circumstances beyond provider control',
            'Payer error or delay in initial processing',
            'Coordination of benefits delayed filing',
            'State law exceptions to timely filing',
            'Claim filed within contract or regulatory timeframe'
        ],
        'common_weaknesses': 'Technical denial - service was rendered and medically necessary',
        'escalation': 'Cite specific state laws and contractual provisions for exceptions'
    },
    'CO-96': {  # Non-Covered
        'primary_arguments': [
            'Service is covered benefit under plan documents',
            'Meets definition of covered service per policy',
            'Essential Health Benefit under ACA if applicable',
            'State mandate requires coverage',
            'Emergency services covered regardless of plan exclusions'
        ],
        'common_weaknesses': 'May misapply policy exclusions',
        'escalation': 'Request specific policy language and external review if applicable'
    },
    'PR-1': {  # Patient Responsibility
        'primary_arguments': [
            'Service should be covered by insurance, not patient responsibility',
            'In-network provider, contracted rates apply',
            'Preventive service with no cost-sharing under ACA',
            'Emergency service, no patient responsibility for out-of-network',
            'Balance billing protections apply'
        ],
        'common_weaknesses': 'May incorrectly shift cost to patient',
        'escalation': 'Cite specific plan provisions and state/federal protections'
    }
}

# CPT-Specific Documentation Requirements
CPT_DOCUMENTATION_REQUIREMENTS = {
    'E&M_codes': {
        '99213-99215': 'History, exam, and medical decision making documentation',
        'time_based': 'Total time spent if billing based on time (>50% counseling/coordination)',
        'modifiers': 'Modifier 25 requires separately identifiable E&M service'
    },
    'surgical': {
        'operative_report': 'Detailed operative report with procedure description',
        'medical_necessity': 'Pre-operative evaluation and indication for surgery',
        'modifiers': 'Modifier 59 for distinct procedural service, 51 for multiple procedures'
    },
    'diagnostic_imaging': {
        'clinical_indication': 'Clear clinical indication for imaging study',
        'report': 'Complete radiologist interpretation report',
        'acr_criteria': 'Alignment with ACR Appropriateness Criteria'
    }
}

# Payer-Specific Common Practices (anonymized)
PAYER_TACTICS = {
    'medical_necessity_denials': {
        'common_issue': 'Payers may use overly restrictive internal policies',
        'counter': 'Cite evidence-based guidelines from recognized medical societies',
        'reference': 'Request specific medical policy and criteria used'
    },
    'prior_auth_denials': {
        'common_issue': 'Retroactive application of authorization requirements',
        'counter': 'Document authorization status at time of service',
        'reference': 'Cite contract provisions regarding authorization timeframes'
    },
    'timely_filing_denials': {
        'common_issue': 'Strict application without considering good cause',
        'counter': 'Document reasons for delay and good faith efforts',
        'reference': 'Cite state laws requiring good cause exceptions'
    }
}

def get_regulatory_reference(category, key):
    """Get specific regulatory reference"""
    return REGULATORY_REFERENCES.get(category, {}).get(key, '')

def get_medical_necessity_criteria(category):
    """Get medical necessity criteria for specific type of service"""
    return MEDICAL_NECESSITY_CRITERIA.get(category, {})

def get_denial_strategy(denial_code):
    """Get strategic arguments for specific denial code"""
    return DENIAL_STRATEGIES.get(denial_code, {
        'primary_arguments': ['Service was medically necessary and properly documented'],
        'common_weaknesses': 'Review complete medical record',
        'escalation': 'Request detailed review and reconsideration'
    })

def get_clinical_guideline_reference(specialty):
    """Get clinical guideline references for medical specialty"""
    return CLINICAL_GUIDELINES.get(specialty, {
        'organizations': ['Relevant Medical Society'],
        'key_guidelines': 'Evidence-based clinical practice guidelines'
    })
