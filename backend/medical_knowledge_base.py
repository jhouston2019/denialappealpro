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

# Clinical Guidelines Database - Specific Citations for Maximum Impact
CLINICAL_GUIDELINES = {
    'cardiology': {
        'organizations': ['American College of Cardiology', 'American Heart Association'],
        'key_guidelines': 'ACC/AHA guidelines for cardiac intervention, stress testing, echocardiography',
        'specific_citations': {
            'chest_pain': '2021 ACC/AHA Chest Pain Guidelines - Class I recommendation for stress testing in intermediate-risk patients',
            'heart_failure': '2022 AHA/ACC/HFSA Heart Failure Guidelines - GDMT (Guideline-Directed Medical Therapy) requirements',
            'coronary_intervention': 'ACC Appropriate Use Criteria for Coronary Revascularization',
            'echocardiography': '2019 ASE/EACVI Guidelines for Chamber Quantification'
        }
    },
    'radiology': {
        'organizations': ['American College of Radiology'],
        'key_guidelines': 'ACR Appropriateness Criteria for imaging studies',
        'specific_citations': {
            'mri_brain': 'ACR Appropriateness Criteria: Headache - MRI usually appropriate for red flag symptoms',
            'ct_abdomen': 'ACR AC: Acute Abdominal Pain - CT abdomen/pelvis with contrast usually appropriate',
            'mri_spine': 'ACR AC: Low Back Pain - MRI lumbar spine usually appropriate with radiculopathy',
            'advanced_imaging': 'Image Gently/Image Wisely campaigns for radiation safety and appropriateness'
        }
    },
    'oncology': {
        'organizations': ['National Comprehensive Cancer Network', 'American Society of Clinical Oncology'],
        'key_guidelines': 'NCCN Guidelines and ASCO treatment recommendations',
        'specific_citations': {
            'breast_cancer': 'NCCN Breast Cancer Guidelines v2.2024 - Category 1 evidence for treatment protocol',
            'lung_cancer': 'NCCN NSCLC Guidelines - PD-L1 testing and immunotherapy indications',
            'genetic_testing': 'ASCO Policy Statement on Genetic and Genomic Testing',
            'supportive_care': 'NCCN Antiemesis Guidelines for chemotherapy-induced nausea'
        }
    },
    'orthopedics': {
        'organizations': ['American Academy of Orthopaedic Surgeons'],
        'key_guidelines': 'AAOS clinical practice guidelines for musculoskeletal conditions',
        'specific_citations': {
            'knee_replacement': 'AAOS Appropriate Use Criteria for Total Knee Arthroplasty',
            'spine_surgery': 'North American Spine Society Evidence-Based Guidelines',
            'physical_therapy': 'AAOS guidelines for conservative management prior to surgical intervention',
            'joint_injection': 'AAOS guidelines for intra-articular injections'
        }
    },
    'preventive': {
        'organizations': ['US Preventive Services Task Force', 'CDC'],
        'key_guidelines': 'USPSTF recommendations for preventive services',
        'specific_citations': {
            'cancer_screening': 'USPSTF Grade A/B recommendations require coverage without cost-sharing per ACA Section 2713',
            'immunizations': 'CDC ACIP recommendations - covered preventive services',
            'wellness_visits': 'Annual wellness visit covered under Medicare and ACA',
            'behavioral_health': 'USPSTF recommendations for depression and alcohol screening'
        }
    },
    'emergency_medicine': {
        'organizations': ['American College of Emergency Physicians'],
        'key_guidelines': 'ACEP Clinical Policies and Prudent Layperson Standard',
        'specific_citations': {
            'chest_pain': 'ACEP Clinical Policy: Evaluation of chest pain - cardiac workup indicated',
            'abdominal_pain': 'ACEP guidelines for acute abdominal pain evaluation',
            'prudent_layperson': '42 CFR 489.24 EMTALA and prudent layperson standard for emergency coverage',
            'observation_status': 'CMS guidelines for observation vs inpatient admission'
        }
    },
    'mental_health': {
        'organizations': ['American Psychiatric Association', 'ASAM'],
        'key_guidelines': 'APA Practice Guidelines and ASAM Criteria for substance use treatment',
        'specific_citations': {
            'depression': 'APA Practice Guideline for Treatment of Major Depressive Disorder',
            'substance_use': 'ASAM Criteria 4th Edition - Level of care placement',
            'parity': 'Mental Health Parity and Addiction Equity Act - equal treatment limitations',
            'residential_treatment': 'ASAM Level 3 criteria for residential treatment medical necessity'
        }
    },
    'physical_therapy': {
        'organizations': ['American Physical Therapy Association'],
        'key_guidelines': 'APTA Clinical Practice Guidelines',
        'specific_citations': {
            'post_surgical': 'Evidence-based protocols for post-surgical rehabilitation',
            'frequency': 'Clinical guidelines support 2-3x weekly for 6-8 weeks for functional restoration',
            'maintenance': 'Distinction between restorative vs maintenance therapy per Medicare guidelines',
            'skilled_service': 'Criteria for skilled therapy services vs maintenance'
        }
    }
}

# Payer-Specific Tactical Intelligence
PAYER_TACTICS = {
    'UNITED HEALTHCARE': {
        'known_tactics': [
            'Aggressive medical necessity denials using Optum guidelines',
            'Frequent "not medically necessary" for high-cost imaging',
            'Strict prior authorization enforcement',
            'Often denies based on "experimental" classification'
        ],
        'winning_strategies': [
            'Cite specific Optum guideline version and patient-specific exceptions',
            'Reference UHC Medical Policy number and effective date',
            'Emphasize failed conservative treatment documented in records',
            'Request peer-to-peer with UHC medical director in same specialty',
            'Cite 29 CFR 2560.503-1 requirement for specific clinical rationale'
        ],
        'escalation_leverage': 'UHC settles quickly when faced with DOL complaints or external review'
    },
    'ANTHEM': {
        'known_tactics': [
            'Denies based on "not covered benefit" even when clearly covered',
            'Strict interpretation of policy exclusions',
            'Coordination of benefits delays',
            'Prior auth denials for routine procedures'
        ],
        'winning_strategies': [
            'Quote exact policy language showing coverage',
            'Reference Anthem Clinical UM Guideline number',
            'Cite state insurance code requirements for coverage',
            'Emphasize ACA Essential Health Benefit mandates',
            'Request copy of specific exclusion language cited'
        ],
        'escalation_leverage': 'Anthem responds to state DOI complaints and bad faith threats'
    },
    'AETNA': {
        'known_tactics': [
            'Uses Aetna Clinical Policy Bulletins (CPBs) strictly',
            'Denies experimental/investigational aggressively',
            'Strict timely filing enforcement',
            'Medical necessity denials based on Milliman criteria'
        ],
        'winning_strategies': [
            'Cite specific CPB number and exceptions section',
            'Reference FDA approval status and peer-reviewed literature',
            'Challenge Milliman application with patient-specific factors',
            'Cite ERISA requirement for individualized review',
            'Request identification of specific CPB provision violated'
        ],
        'escalation_leverage': 'Aetna settles when faced with ERISA litigation threats'
    },
    'CIGNA': {
        'known_tactics': [
            'Denies based on "lack of information" to delay',
            'Strict prior authorization requirements',
            'Coordination of benefits technicalities',
            'Medical necessity using eviCore criteria for imaging'
        ],
        'winning_strategies': [
            'Provide comprehensive documentation upfront',
            'Reference Cigna Medical Coverage Policy number',
            'Challenge eviCore criteria with specialty society guidelines',
            'Cite specific information requested and provided',
            'Emphasize timely submission and payer delay tactics'
        ],
        'escalation_leverage': 'Cigna vulnerable to prompt pay law violations'
    },
    'BLUE CROSS': {
        'known_tactics': [
            'State-specific policies vary widely',
            'Medical necessity using MCG or proprietary criteria',
            'Experimental exclusions for new treatments',
            'Prior authorization denials'
        ],
        'winning_strategies': [
            'Cite state-specific BCBS medical policy',
            'Reference Technology Assessment Committee decisions',
            'Challenge MCG criteria with patient-specific exceptions',
            'Cite state insurance mandates for coverage',
            'Request peer review with BCBS medical director'
        ],
        'escalation_leverage': 'BCBS responds to state insurance commissioner complaints'
    },
    'MEDICARE': {
        'known_tactics': [
            'LCD/NCD strict interpretation',
            'Reasonable and necessary standard (42 CFR 411.15)',
            'Frequency limitations on services',
            'ABN requirements for non-covered services'
        ],
        'winning_strategies': [
            'Cite specific LCD/NCD provision and exceptions',
            'Reference CMS Pub 100-02 (Benefits Policy Manual)',
            'Challenge MAC interpretation with CMS guidance',
            'Cite Medicare Appeals Council precedent',
            'Reference Jimmo v. Sebelius for improvement standard'
        ],
        'escalation_leverage': 'Medicare ALJ hearings have high overturn rates'
    }
}

# Denial-Specific Strategic Arguments
DENIAL_STRATEGIES = {
    'CO-50': {  # Medical Necessity
        'primary_arguments': [
            'Service meets 42 CFR 411.15 reasonable and necessary standard with clinical evidence',
            'Aligns with [Specialty] Society Class I/Grade A clinical guideline recommendations',
            'Patient-specific contraindications to alternative treatments documented in clinical record',
            'Payer failed to provide specific clinical rationale per ERISA Section 503 requirements',
            'Denial based on generic policy, not individualized patient review - violates 29 CFR 2560.503-1',
            'Service prevents progression and reduces long-term costs (cite specific complications avoided)'
        ],
        'common_weaknesses': 'Payer uses boilerplate denial language without patient-specific clinical analysis. Often fails to identify which specific clinical criteria were not met. Vulnerable to ERISA procedural challenges.',
        'escalation': 'Demand peer-to-peer review with board-certified physician in same specialty. If denied, cite ERISA requirement for full and fair review and request external independent review. Reference state insurance code for additional appeal rights.',
        'regulatory_citations': [
            '42 CFR 411.15(k) - Medicare reasonable and necessary standard',
            '29 CFR 2560.503-1(g)(1)(iii) - ERISA requirement for specific denial rationale',
            'ACA Section 2719(b)(2) - Internal appeals process requirements'
        ]
    },
    'CO-16': {  # Prior Auth
        'primary_arguments': [
            'Emergency services exempt from prior authorization per 42 CFR 489.24 EMTALA and state law',
            'Prior authorization obtained - reference number [X] - payer system error in linking',
            'Service rendered before policy change implementing auth requirement (cite effective date)',
            'Payer failed to respond within contractual/regulatory timeframe (cite specific days)',
            'Payer representative verbally approved - document date, time, representative name',
            'Retroactive authorization warranted - service was medically necessary and emergent'
        ],
        'common_weaknesses': 'Administrative technicality unrelated to medical necessity or appropriateness. Payer cannot deny medically necessary emergency services for lack of prior auth. Often payer system failures in tracking authorizations.',
        'escalation': 'Cite state prompt pay law violations if claim otherwise clean. Reference state insurance code prohibiting denial of emergency services for lack of auth. Demand retroactive authorization review. Cite ACA Section 2719 requirement that authorization denials be subject to full appeal rights.',
        'regulatory_citations': [
            '42 CFR 489.24 - EMTALA emergency service requirements',
            '29 CFR 2560.503-1(m)(4) - ERISA prohibits strict adherence to auth requirements in urgent situations',
            'State Insurance Code Section [X] - Emergency services coverage mandates'
        ]
    },
    'CO-18': {  # Duplicate
        'primary_arguments': [
            'Claims have different dates of service - [Date 1] vs [Date 2] - not duplicates',
            'Separate anatomical sites with CPT modifier 59/XS/XU documentation',
            'Bilateral procedures correctly coded with RT/LT or 50 modifiers',
            'Multiple units justified per CPT descriptor (cite time or complexity requirements)',
            'Corrected claim with different information - not a duplicate submission',
            'Payer system error - provide claim comparison showing distinct services'
        ],
        'common_weaknesses': 'Automated claim processing error without manual review. Payer systems flag similar CPT codes without analyzing modifiers or dates. Often resolved with simple claim comparison.',
        'escalation': 'Provide side-by-side claim comparison with highlighted differences. Reference CPT modifier definitions. Cite state prompt pay law if claim is otherwise clean. Request manual review by claims examiner, not automated system.',
        'regulatory_citations': [
            'CPT Modifier Appendix A - Definitions of modifiers 59, XS, XU, RT, LT, 50',
            'CMS NCCI Policy Manual - Appropriate use of modifiers to indicate distinct services',
            'State Prompt Pay Law - Timely payment required for clean claims'
        ]
    },
    'CO-22': {  # COB
        'primary_arguments': [
            'This payer IS primary per patient eligibility verification on [date]',
            'Medicare Secondary Payer Act does not apply - patient under age 65 with group coverage',
            'Other payer has confirmed they are NOT primary (provide EOB or correspondence)',
            'COB completed per NAIC Model Act coordination provisions',
            'Payer has correct COB information on file per eligibility verification',
            'Claim should process as primary with patient responsibility, not COB denial'
        ],
        'common_weaknesses': 'Often based on outdated eligibility data or incorrect assumptions about coverage hierarchy. Payers use COB denials to delay payment. Vulnerable to state insurance code requirements for timely eligibility verification.',
        'escalation': 'Provide eligibility verification showing primary status. Reference NAIC Model Coordination of Benefits Act. Cite state insurance code requiring payers to maintain accurate eligibility data. If payer disputes, demand specific evidence of other coverage. Reference prompt pay law violations for improper COB denials.',
        'regulatory_citations': [
            'NAIC Model Coordination of Benefits Act - Primary payer determination rules',
            'Medicare Secondary Payer Act (42 USC 1395y) - When Medicare is secondary',
            'State Insurance Code Section [X] - Payer obligation to verify eligibility'
        ]
    },
    'CO-29': {  # Timely Filing
        'primary_arguments': [
            'Good cause exception: [payer delay/COB delay/system outage/natural disaster] beyond provider control',
            'Claim filed within contractual timely filing limit of [X] days per provider agreement',
            'State law mandates minimum [90/180/365] day filing limit - payer policy violates state law',
            'Payer failed to notify provider of missing information within reasonable timeframe',
            'Initial claim submission on [date] - payer error or delay caused late resubmission',
            'Coordination of benefits delayed filing - other payer processing time should not prejudice this claim',
            'Claim filed within Medicare timely filing (1 year) or state mandate timeframe'
        ],
        'common_weaknesses': 'Technical administrative denial unrelated to medical necessity or claim validity. Service was rendered, medically necessary, and properly documented. Payer received economic benefit of service. Timely filing is a procedural defense, not a substantive coverage determination.',
        'escalation': 'Cite specific state insurance code provisions requiring minimum filing limits or good cause exceptions. Reference provider contract timely filing section. Demand documentation of payer receipt date. Cite case law on equitable tolling and payer estoppel. Reference state prompt pay law - timely filing cannot be used to avoid prompt pay obligations. Threaten DOI complaint for unfair claims practices.',
        'regulatory_citations': [
            'State Insurance Code Section [X] - Minimum timely filing limits and exceptions',
            'Provider Contract Section [Y] - Timely filing provisions',
            'State Prompt Pay Law - Payer obligations for clean claims',
            'Case law: [State] courts recognize equitable tolling for payer-caused delays'
        ]
    },
    'CO-96': {  # Non-Covered
        'primary_arguments': [
            'Service IS covered benefit - cite specific EOC/SPD section and page number',
            'Payer misapplied exclusion - exclusion applies to [X], not this service',
            'ACA Essential Health Benefit - [emergency/hospitalization/maternity/mental health/preventive] must be covered',
            'State insurance mandate requires coverage per [State] Insurance Code Section [X]',
            'Emergency services covered regardless of plan exclusions per EMTALA and state law',
            'Exclusion language is ambiguous - construe ambiguity against drafter (contra proferentem)',
            'Service meets policy definition of [medical necessity/covered benefit/eligible expense]'
        ],
        'common_weaknesses': 'Payer often cites vague exclusion without explaining how it applies to this specific service. May contradict other policy provisions. Vulnerable to ACA EHB requirements and state mandates. Exclusions must be clear and conspicuous - ambiguous language construed in favor of coverage.',
        'escalation': 'Demand specific policy language cited and explanation of how it applies. Request full EOC/SPD and any amendments. Cite ACA Section 2719 right to external review. Reference state insurance code requiring clear exclusion language. If self-funded ERISA plan, cite Section 503 requirement for specific rationale. Threaten bad faith claim if exclusion misapplied.',
        'regulatory_citations': [
            'ACA Section 1302 - Essential Health Benefits requirements',
            'State Insurance Code Section [X] - Mandated benefits',
            '42 CFR 489.24 - EMTALA emergency services coverage',
            'ERISA Section 503 - Specific rationale required for denials'
        ]
    },
    'PR-1': {  # Patient Responsibility
        'primary_arguments': [
            'Service is covered benefit - payer obligation to pay per EOC Section [X], not patient responsibility',
            'In-network provider - contracted rate applies, cannot shift to patient per provider agreement',
            'Preventive service with USPSTF Grade A/B - zero cost-sharing required per ACA Section 2713',
            'Emergency service - patient cannot be balance billed per [State] balance billing law',
            'Out-of-network emergency - payer must pay at in-network rate per state law and No Surprises Act',
            'Deductible/copay already met - provide documentation of prior payments',
            'Service not subject to cost-sharing per plan terms'
        ],
        'common_weaknesses': 'Payer attempting to shift financial responsibility to patient in violation of contract or regulation. Often misapplies deductible or incorrectly processes as out-of-network. May violate No Surprises Act for emergency/non-network care. Balance billing protections frequently ignored.',
        'escalation': 'Cite provider contract prohibition on balance billing. Reference No Surprises Act (45 CFR 149.410) for emergency services. Cite state balance billing law. Reference ACA Section 2713 for preventive services. Demand corrected claim processing. Cite state insurance code prohibiting improper patient responsibility. Threaten DOI complaint for unfair claims practices.',
        'regulatory_citations': [
            'ACA Section 2713 - Preventive services without cost-sharing',
            '45 CFR 149.410 - No Surprises Act patient protections',
            'State Balance Billing Law Section [X]',
            'Provider Contract Section [Y] - Prohibition on balance billing'
        ]
    }
}

# CPT-Specific Documentation Requirements and Appeal Arguments
CPT_DOCUMENTATION_REQUIREMENTS = {
    'E&M_codes': {
        '99213-99215': 'History, exam, and medical decision making documentation',
        'time_based': 'Total time spent if billing based on time (>50% counseling/coordination)',
        'modifiers': 'Modifier 25 requires separately identifiable E&M service',
        'appeal_arguments': [
            'Cite 2021/2023 E&M documentation guidelines (MDM-based or time-based)',
            'Reference CPT definition and descriptor for level billed',
            'Document complexity of medical decision making (number of diagnoses, data reviewed, risk)',
            'For modifier 25: emphasize separately identifiable service with distinct documentation'
        ]
    },
    'surgical': {
        'operative_report': 'Detailed operative report with procedure description',
        'medical_necessity': 'Pre-operative evaluation and indication for surgery',
        'modifiers': 'Modifier 59 for distinct procedural service, 51 for multiple procedures',
        'appeal_arguments': [
            'Reference CPT surgical package definition and what is/is not included',
            'Cite NCCI edits and bundling rules if applicable',
            'For modifier 59/XU: document anatomically distinct site or separate session',
            'Reference specialty society guidelines supporting surgical indication'
        ]
    },
    'diagnostic_imaging': {
        'clinical_indication': 'Clear clinical indication for imaging study',
        'report': 'Complete radiologist interpretation report',
        'acr_criteria': 'Alignment with ACR Appropriateness Criteria',
        'appeal_arguments': [
            'Cite specific ACR Appropriateness Criteria rating (Usually Appropriate = 7-9)',
            'Reference clinical indication and red flag symptoms requiring imaging',
            'Document failed conservative management or clinical progression',
            'Cite specialty guidelines supporting imaging in this clinical scenario'
        ]
    },
    'laboratory': {
        'clinical_indication': 'Medical necessity for lab testing',
        'frequency': 'Clinical rationale for frequency of testing',
        'panel_vs_individual': 'Justification for panel vs individual tests',
        'appeal_arguments': [
            'Reference clinical guidelines for monitoring frequency (e.g., diabetes management)',
            'Cite FDA labeling for medication monitoring requirements',
            'Document clinical decision-making based on test results',
            'Reference Medicare LCD for laboratory coverage if applicable'
        ]
    },
    'durable_medical_equipment': {
        'prescription': 'Physician prescription and clinical justification',
        'medical_necessity': 'Documentation of medical condition requiring DME',
        'alternatives': 'Less costly alternatives inadequate',
        'appeal_arguments': [
            'Cite Medicare DME MAC LCD for coverage criteria',
            'Document functional limitation and how DME addresses it',
            'Reference physician evaluation and prescription',
            'Emphasize patient-specific factors making alternatives inadequate'
        ]
    },
    'physical_therapy': {
        'evaluation': 'Initial PT evaluation with functional baseline',
        'plan_of_care': 'Treatment plan with goals and expected duration',
        'progress_notes': 'Documented functional improvement',
        'skilled_service': 'Distinction from maintenance therapy',
        'appeal_arguments': [
            'Reference Medicare guidelines: skilled therapy vs maintenance (Jimmo settlement)',
            'Document objective functional improvements (ROM, strength, gait, ADLs)',
            'Cite APTA guidelines for frequency and duration',
            'Emphasize restorative potential and skilled intervention requirements'
        ]
    },
    'behavioral_health': {
        'diagnosis': 'DSM-5 diagnosis with clinical justification',
        'level_of_care': 'ASAM criteria or equivalent for LOC determination',
        'treatment_plan': 'Individualized treatment plan with measurable goals',
        'medical_necessity': 'Clinical documentation supporting intensity of services',
        'appeal_arguments': [
            'Cite ASAM Criteria 4th Edition for level of care placement',
            'Reference Mental Health Parity Act - equal treatment limitations',
            'Document clinical indicators for intensity of service',
            'Cite APA Practice Guidelines for evidence-based treatment'
        ]
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

# Case Law and Precedent Database
CASE_LAW_PRECEDENTS = {
    'medical_necessity': {
        'Rush Prudential HMO v. Moran': 'ERISA does not preempt state independent review laws for medical necessity determinations',
        'Pegram v. Herdrich': 'ERISA fiduciary duty applies to medical necessity decisions with financial incentives',
        'Black & Decker v. Nord': 'ERISA requires individualized review, not blanket policy application',
        'Wit v. United Behavioral Health': 'Payer guidelines more restrictive than generally accepted standards violate Mental Health Parity Act'
    },
    'timely_filing': {
        'equitable_tolling': 'Federal courts recognize equitable tolling when payer actions prevent timely filing',
        'payer_estoppel': 'Payer cannot deny for late filing if payer delay or misinformation caused lateness',
        'good_cause_exceptions': 'State laws typically recognize good cause exceptions for circumstances beyond provider control'
    },
    'emergency_services': {
        'prudent_layperson_standard': 'Emergency services must be covered if reasonable person would seek emergency care based on presenting symptoms',
        'EMTALA_coverage': 'EMTALA requires emergency screening and stabilization regardless of insurance status or pre-authorization',
        'no_surprises_act': 'Federal law prohibits balance billing for emergency services and certain non-emergency services at in-network facilities'
    },
    'ERISA_procedural': {
        'full_and_fair_review': 'ERISA Section 503 requires full and fair review with access to all claim files and medical criteria',
        'specific_rationale': '29 CFR 2560.503-1 requires specific clinical rationale, not boilerplate language',
        'conflict_of_interest': 'Metropolitan Life v. Glenn establishes conflict of interest when payer both evaluates and pays claims'
    },
    'bad_faith': {
        'state_bad_faith_claims': 'Many states recognize bad faith tort claims for unreasonable denial or delay of valid claims',
        'punitive_damages': 'Bad faith denials may support punitive damages in addition to benefits owed',
        'unfair_claims_practices': 'State insurance codes prohibit unfair claims settlement practices'
    }
}

# Regulatory Violation Checklists - Use to Identify Payer Procedural Failures
REGULATORY_VIOLATION_CHECKLIST = {
    'ERISA_503_violations': [
        'Denial letter lacks specific reason for denial (29 CFR 2560.503-1(g)(1)(i))',
        'Denial letter does not reference specific plan provisions (29 CFR 2560.503-1(g)(1)(ii))',
        'Denial letter fails to describe appeal procedures (29 CFR 2560.503-1(g)(1)(iv))',
        'Payer failed to provide full and fair review with access to claim files',
        'Payer did not respond within required timeframes (60 days pre-service, 30 days post-service)',
        'Medical necessity denial without clinical rationale or peer review',
        'Denial based on internal guidelines not disclosed to provider or patient'
    ],
    'ACA_violations': [
        'Denial of Essential Health Benefit without proper justification',
        'Preventive service denial in violation of ACA Section 2713',
        'Failure to provide internal appeal rights per ACA Section 2719',
        'Failure to provide external review rights for adverse determinations',
        'Lifetime or annual dollar limits on Essential Health Benefits',
        'Discriminatory benefit design targeting specific conditions'
    ],
    'state_law_violations': [
        'Timely filing limit shorter than state-mandated minimum (typically 90-180 days)',
        'Prompt pay law violation - failure to pay or deny within statutory timeframe (typically 30-45 days)',
        'Balance billing in violation of state consumer protections',
        'Failure to comply with state mandated benefit laws',
        'Unfair claims practices per state insurance code (e.g., misrepresenting policy provisions)',
        'Failure to conduct reasonable investigation before denying claim'
    ],
    'Medicare_violations': [
        'Denial inconsistent with LCD/NCD provisions',
        'Failure to provide Medicare appeal rights (CMS-10003 notice)',
        'Incorrect application of reasonable and necessary standard',
        'Frequency limitations applied without clinical justification',
        'Failure to provide detailed denial rationale per Medicare requirements'
    ]
}

def get_regulatory_reference(category: str, key: str) -> str:
    """Get specific regulatory reference"""
    return REGULATORY_REFERENCES.get(category, {}).get(key, '')
