"""
Denial-specific appeal templates for common insurance denial codes.
Each template provides targeted arguments based on the denial reason.
"""

DENIAL_TEMPLATES = {
    # Lack of Medical Necessity
    'CO-50': {
        'name': 'Lack of Medical Necessity',
        'template': """This appeal addresses the denial based on lack of medical necessity. The service(s) rendered meet established medical necessity criteria and are supported by clinical documentation.

Medical Necessity Justification:
The patient's documented diagnosis and clinical presentation support the medical necessity for the service(s) provided. The treatment rendered aligns with evidence-based clinical guidelines and accepted standards of care within the medical community.

Clinical Documentation:
The medical record contains comprehensive documentation supporting the medical necessity of this service, including patient history, physical examination findings, diagnostic results, and clinical rationale for the treatment plan. The service was not experimental, investigational, or for convenience, but rather medically appropriate and necessary for the patient's condition.

Policy Compliance:
This service meets the payer's own medical policy criteria for coverage. We request a thorough review of the complete medical record and reconsideration of this denial based on the documented medical necessity."""
    },
    
    # Prior Authorization Required
    'CO-16': {
        'name': 'Prior Authorization/Notification Required',
        'template': """This appeal addresses the denial for lack of prior authorization. We respectfully request reconsideration based on the following circumstances.

Authorization Status:
{auth_context}

Timely and Appropriate Care:
The service was medically necessary and provided in accordance with the standard of care. Any delay in obtaining authorization would have been detrimental to the patient's health and wellbeing.

Regulatory Considerations:
Under applicable state and federal regulations, including emergency care provisions, the service rendered was appropriate and should be covered despite authorization timing issues. We request retroactive authorization based on the documented medical necessity.

Good Faith Effort:
Our practice made reasonable efforts to comply with authorization requirements. We request the payer work with us to resolve this administrative matter and approve payment for this medically necessary service."""
    },
    
    # Duplicate Claim
    'CO-18': {
        'name': 'Duplicate Claim/Service',
        'template': """This appeal addresses the denial for duplicate claim submission. Upon review, this is not a duplicate claim but rather a distinct service.

Claim Differentiation:
This claim is for services rendered on {date_of_service}, which is separate and distinct from any previously submitted claims. Each service was medically necessary and separately identifiable.

Documentation Review:
The medical record clearly documents that this was a separate encounter/service with its own clinical indication, examination, and treatment plan. The CPT codes billed accurately reflect distinct services provided.

Billing Accuracy:
Our billing records confirm this is not a duplicate submission. We have reviewed our claim submission history and verified that this represents unique services that have not been previously paid.

Request for Reconsideration:
We request a detailed review of the claim submission dates, service dates, and procedure codes to confirm this is not a duplicate and warrants separate payment."""
    },
    
    # Coordination of Benefits
    'CO-22': {
        'name': 'Coordination of Benefits',
        'template': """This appeal addresses the denial related to coordination of benefits (COB). We have reviewed the patient's coverage and provide the following information.

Primary Coverage Status:
Based on our records and patient information, this plan is the primary payer for this patient. {cob_details}

COB Compliance:
We have followed proper coordination of benefits procedures and submitted this claim to the appropriate primary payer. Any secondary coverage has been properly coordinated.

Patient Coverage Verification:
At the time of service, we verified the patient's insurance coverage and confirmed the payer responsibility. The patient has provided updated insurance information as needed.

Request for Payment:
We request reconsideration and payment as the primary payer, or guidance on proper COB procedures if additional information is required."""
    },
    
    # Timely Filing
    'CO-29': {
        'name': 'Time Limit for Filing',
        'template': """This appeal addresses the denial for untimely filing. We respectfully request reconsideration based on the following circumstances.

Filing Timeline:
The claim was submitted within a reasonable timeframe given the circumstances. {filing_context}

Good Cause for Delay:
Any delay in claim submission was due to circumstances beyond our control, including: {delay_reason}

Regulatory Protections:
Under applicable state prompt pay laws and insurance regulations, we request consideration of good cause exceptions to timely filing requirements.

Supporting Documentation:
We have attached documentation supporting the timeline of events and demonstrating our good faith efforts to submit this claim promptly.

Request for Exception:
We respectfully request a timely filing exception and reconsideration of this claim based on the documented circumstances."""
    },
    
    # Non-Covered Charge
    'CO-96': {
        'name': 'Non-Covered Charge',
        'template': """This appeal addresses the denial for non-covered charges. We believe this service should be covered based on the following.

Coverage Review:
Upon review of the patient's benefit plan, this service should be covered under {coverage_category}. The service is not excluded under the plan documents.

Medical Necessity:
This service was medically necessary for the diagnosis and treatment of the patient's condition. It was not cosmetic, experimental, or otherwise excluded from coverage.

Policy Interpretation:
We believe the denial represents a misinterpretation of the coverage policy. The service falls within covered benefits and meets all policy requirements.

Benefit Plan Language:
The plan documents do not explicitly exclude this service. We request a detailed explanation of the specific policy exclusion being applied and reconsideration based on the benefit language.

Request for Coverage:
We request reconsideration and approval of this medically necessary service under the patient's benefit plan."""
    },
    
    # Benefit Maximum Reached
    'CO-97': {
        'name': 'Benefit Maximum/Limitation',
        'template': """This appeal addresses the denial based on benefit maximum or limitation. We request reconsideration based on the following.

Benefit Review:
We have reviewed the patient's benefit utilization and believe the benefit maximum has not been reached, or that this service should be covered under a different benefit category.

Service Classification:
This service may have been incorrectly classified. It should be covered under {correct_benefit_category}, which has remaining benefits available.

Medical Necessity Exception:
Given the medical necessity of this service and the patient's clinical condition, we request consideration of an exception to benefit limitations.

Benefit Period:
We request verification of the benefit period and utilization calculations. There may be an error in the benefit maximum determination.

Request for Reconsideration:
We request a detailed review of benefit utilization and reconsideration of coverage for this medically necessary service."""
    },
    
    # Procedure Code Inconsistency
    'CO-4': {
        'name': 'Procedure Code Inconsistency',
        'template': """This appeal addresses the denial for procedure code inconsistency. We have reviewed the coding and provide the following clarification.

Coding Accuracy:
The CPT/HCPCS codes billed accurately reflect the services provided and are supported by the medical record documentation. The codes are consistent with the diagnosis and clinical findings.

Documentation Support:
The medical record contains complete documentation supporting the procedure codes billed, including operative reports, procedure notes, and clinical findings.

Coding Guidelines:
The codes submitted follow current CPT coding guidelines and payer-specific coding policies. There is no inconsistency between the diagnosis codes and procedure codes.

Clarification:
If there is a specific coding concern, we request detailed information so we can provide additional clarification or corrected coding if appropriate.

Request for Reconsideration:
We request review by a certified coding specialist and reconsideration based on the accurate coding of services rendered."""
    },
    
    # Services Not Covered
    'CO-109': {
        'name': 'Service Not Covered for This Patient',
        'template': """This appeal addresses the denial stating the service is not covered for this patient. We believe this determination is incorrect.

Patient Eligibility:
The patient was eligible for coverage at the time of service. We verified benefits prior to rendering services and confirmed coverage for this type of service.

Clinical Appropriateness:
The service was clinically appropriate for this patient's age, gender, and medical condition. There are no patient-specific contraindications or exclusions that should apply.

Coverage Criteria:
The service meets all coverage criteria outlined in the benefit plan. The patient's clinical condition supports the medical necessity of this service.

Policy Review:
We request a detailed explanation of why this service is not covered for this specific patient, as it appears to meet all coverage requirements.

Request for Reconsideration:
We request reconsideration and approval of this medically appropriate and necessary service for this patient."""
    },
    
    # Precertification Absent
    'CO-197': {
        'name': 'Precertification/Authorization Absent',
        'template': """This appeal addresses the denial for absent precertification. We request reconsideration based on the following circumstances.

Authorization Circumstances:
{precert_context}

Emergency/Urgent Care:
The service was provided under circumstances that did not allow for prior authorization, including emergency or urgent medical necessity.

Notification Compliance:
We provided timely notification to the payer as required by the plan. Any delay was due to the urgent nature of the medical condition.

Retrospective Authorization:
We request retrospective authorization based on the documented medical necessity and urgent nature of the service provided.

Regulatory Protections:
Under applicable regulations, including prudent layperson standards for emergency care, this service should be covered despite precertification timing.

Request for Payment:
We request approval of retrospective authorization and payment for this medically necessary service."""
    },
    
    # Patient Responsibility - Deductible
    'PR-1': {
        'name': 'Patient Deductible',
        'template': """This appeal addresses the application of patient deductible. We request review of the deductible calculation and application.

Deductible Status:
We believe the patient's deductible has been met, or this service should be exempt from deductible under the plan provisions.

Benefit Plan Review:
Under the patient's benefit plan, certain services are covered without application of the deductible. This service may qualify for such an exception.

Calculation Verification:
We request verification of the deductible calculation and confirmation of the patient's year-to-date deductible payments.

Service Classification:
This service may have been incorrectly classified. Proper classification may result in deductible exemption or different cost-sharing.

Request for Review:
We request a detailed review of deductible application and reconsideration if this service qualifies for deductible exemption."""
    },
    
    # Patient Responsibility - Coinsurance
    'PR-2': {
        'name': 'Patient Coinsurance',
        'template': """This appeal addresses the coinsurance amount applied. We request review of the coinsurance calculation.

Coinsurance Calculation:
We believe the coinsurance percentage or amount applied is incorrect based on the patient's benefit plan.

Benefit Level:
This service may qualify for a different benefit level with lower coinsurance. We request review of the service classification.

Allowed Amount:
The allowed amount used to calculate coinsurance may be incorrect. We request verification of the fee schedule or contracted rate.

Out-of-Pocket Maximum:
The patient may have reached their out-of-pocket maximum. We request verification of year-to-date cost-sharing payments.

Request for Recalculation:
We request recalculation of the coinsurance amount and adjustment if an error has been identified."""
    },
    
    # Missing Information
    'CO-16': {
        'name': 'Missing Information',
        'template': """This appeal addresses the denial for missing information. We are providing the requested information with this appeal.

Information Provided:
We have reviewed the denial notice and are providing all requested information, including: {missing_info_list}

Complete Documentation:
The attached documentation provides comprehensive information supporting the medical necessity and appropriateness of the service rendered.

Timely Response:
We are responding promptly to provide the requested information and request reconsideration of this claim.

Additional Information:
If any additional information is needed, please contact our office directly and we will provide it immediately.

Request for Reconsideration:
We request prompt reconsideration now that the complete information has been provided."""
    },
    
    # Experimental/Investigational
    'CO-180': {
        'name': 'Experimental/Investigational Service',
        'template': """This appeal addresses the denial for experimental or investigational service. This service is not experimental.

Established Treatment:
This service represents an established, evidence-based treatment that is widely accepted in the medical community and supported by peer-reviewed literature.

FDA Approval:
The treatment/device used has FDA approval for this indication and is not experimental or investigational.

Clinical Guidelines:
This service is supported by clinical practice guidelines from recognized medical specialty societies and is considered standard of care.

Medical Literature:
We have attached relevant medical literature and clinical studies demonstrating the efficacy and safety of this treatment for the patient's condition.

Coverage Policy:
This service should be covered under the plan's medical policy. We request review by the payer's medical director and reconsideration based on the established evidence base.

Request for Approval:
We request reconsideration and approval of this medically necessary, evidence-based treatment."""
    },
    
    # No Referral
    'CO-24': {
        'name': 'Insurance Coverage Inactive',
        'template': """This appeal addresses the denial for inactive insurance coverage. The patient had active coverage at the time of service.

Coverage Verification:
We verified the patient's insurance coverage prior to rendering services. The patient's coverage was active on the date of service: {date_of_service}.

Eligibility Documentation:
We have attached documentation confirming the patient's active coverage, including eligibility verification and insurance card copies.

Premium Payment:
The patient's coverage premiums were current at the time of service. Any lapse in coverage did not affect this service date.

Coverage Period:
The service was rendered within the patient's coverage period. We request verification of the coverage dates and correction of any errors.

Request for Reconsideration:
We request confirmation of active coverage and reconsideration of this claim for payment."""
    },
    
    # Bundled/Included Service
    'CO-97': {
        'name': 'Bundled/Included in Other Service',
        'template': """This appeal addresses the denial for bundled or included services. These services should be separately payable.

Separate Service:
The service billed was separate and distinct from other services provided. It was not bundled or included in any other procedure.

Modifier Usage:
We have applied appropriate modifiers (if applicable) to indicate the distinct nature of this service and override bundling edits.

Clinical Documentation:
The medical record clearly documents that this was a separately identifiable service with its own medical necessity and clinical indication.

NCCI Edits:
This service is not subject to National Correct Coding Initiative (NCCI) bundling edits with other services provided, or an appropriate modifier has been applied.

Separate Payment:
This service warrants separate payment based on the distinct nature of the service and the clinical circumstances documented.

Request for Reconsideration:
We request review of the bundling determination and separate payment for this distinct service."""
    },
    
    # Medical Records Request
    'CO-252': {
        'name': 'Additional Medical Documentation Required',
        'template': """This appeal includes the requested additional medical documentation to support the medical necessity of services rendered.

Documentation Provided:
We have attached comprehensive medical documentation including: {documentation_list}

Medical Necessity:
The attached records clearly demonstrate the medical necessity for the service(s) provided, including clinical findings, diagnostic results, and treatment rationale.

Complete Record:
This documentation represents the complete medical record for the encounter/service in question and supports the appropriateness of care provided.

Clinical Review:
We request review by a qualified healthcare professional who can assess the clinical appropriateness based on the complete medical documentation.

Timely Submission:
We are providing this documentation promptly in response to the request and ask for expedited reconsideration.

Request for Approval:
Based on the comprehensive medical documentation provided, we request approval and payment for this medically necessary service."""
    },
    
    # Incorrect Patient Information
    'CO-11': {
        'name': 'Incorrect Patient Information',
        'template': """This appeal addresses the denial for incorrect patient information. We are providing corrected information.

Corrected Information:
The correct patient information is as follows: {corrected_info}

Verification:
We have verified this information with the patient and the insurance carrier. The corrected information matches the payer's eligibility records.

Administrative Error:
The incorrect information was due to an administrative error that has been corrected in our system.

Coverage Confirmation:
With the corrected information, the patient's coverage and eligibility for this service is confirmed.

Request for Reprocessing:
We request reprocessing of this claim with the corrected patient information and approval for payment."""
    },
    
    # Incorrect Provider Information  
    'CO-12': {
        'name': 'Incorrect Provider Information',
        'template': """This appeal addresses the denial for incorrect provider information. We are providing corrected information.

Corrected Provider Information:
The correct provider information is as follows:
Provider Name: {provider_name}
NPI: {provider_npi}
Tax ID: {tax_id}

Network Status:
This provider is an in-network, contracted provider with the payer. We have verified the provider's network participation status.

Credentialing:
The provider is properly credentialed with the payer and authorized to provide and bill for these services.

Administrative Correction:
The incorrect information was due to an administrative error that has been corrected.

Request for Reprocessing:
We request reprocessing of this claim with the corrected provider information and approval for payment."""
    },
    
    # Out of Network
    'CO-27': {
        'name': 'Out of Network Provider',
        'template': """This appeal addresses the denial or reduced payment for out-of-network services. We request reconsideration based on the following.

Network Adequacy:
At the time of service, there were no in-network providers available with the appropriate specialty or expertise to treat the patient's condition within a reasonable geographic area.

Emergency Services:
This service was provided on an emergency basis, and the patient had no ability to choose an in-network provider. Under federal and state law, emergency services must be covered at in-network rates.

Prior Authorization:
The payer authorized or referred the patient to this out-of-network provider, creating an expectation of in-network coverage.

Gap Exception:
We request a gap exception or single case agreement based on the unique circumstances and lack of in-network alternatives.

Balance Billing Protection:
Under applicable balance billing protection laws, the patient should not be responsible for out-of-network cost-sharing differences.

Request for In-Network Payment:
We request payment at in-network rates based on the circumstances and applicable regulatory protections."""
    },
    
    # Incorrect Date of Service
    'CO-15': {
        'name': 'Incorrect Date of Service',
        'template': """This appeal addresses the denial for incorrect date of service. We are providing the corrected date.

Corrected Date of Service:
The correct date of service is: {corrected_date}

Documentation Support:
The medical record clearly documents the actual date of service, including appointment records, medical notes, and sign-in sheets.

Administrative Error:
The incorrect date was due to a data entry error that has been corrected.

Coverage Verification:
The patient had active coverage on the correct date of service, and all services were medically necessary and appropriate.

Request for Reprocessing:
We request reprocessing of this claim with the corrected date of service and approval for payment."""
    },
    
    # Incorrect Procedure Code
    'CO-4': {
        'name': 'Incorrect Procedure Code',
        'template': """This appeal addresses the denial for incorrect procedure code. We are providing corrected coding.

Corrected Procedure Code:
The correct CPT/HCPCS code is: {corrected_code}

Coding Rationale:
This code accurately reflects the service provided and is supported by the medical record documentation. The code selection follows current CPT guidelines and coding conventions.

Documentation Support:
The medical record contains complete documentation supporting the corrected procedure code, including procedure notes and clinical findings.

Coding Review:
This corrected coding has been reviewed by a certified coder to ensure accuracy and compliance with coding guidelines.

Request for Reprocessing:
We request reprocessing of this claim with the corrected procedure code and approval for payment at the appropriate rate."""
    },
    
    # Incorrect Diagnosis Code
    'CO-5': {
        'name': 'Incorrect Diagnosis Code',
        'template': """This appeal addresses the denial for incorrect diagnosis code. We are providing corrected diagnosis coding.

Corrected Diagnosis Code(s):
The correct ICD-10 diagnosis code(s): {corrected_diagnosis_codes}

Clinical Documentation:
The medical record supports these diagnosis codes, which accurately reflect the patient's documented conditions and clinical findings.

Medical Necessity:
The corrected diagnosis coding demonstrates the medical necessity for the service(s) provided and supports coverage under the plan.

Coding Compliance:
The corrected codes follow ICD-10 coding guidelines and accurately represent the patient's condition to the highest level of specificity.

Request for Reprocessing:
We request reprocessing of this claim with the corrected diagnosis coding and approval for payment."""
    },
    
    # Incorrect Modifier
    'CO-4': {
        'name': 'Incorrect Modifier Usage',
        'template': """This appeal addresses the denial related to modifier usage. We are providing clarification or corrected modifiers.

Modifier Clarification:
The modifier(s) used: {modifiers} - accurately reflect the circumstances of the service provided.

Modifier Rationale:
{modifier_rationale}

Documentation Support:
The medical record documentation supports the use of these modifiers and demonstrates the distinct nature or special circumstances of the service.

Coding Guidelines:
The modifier usage follows CPT and payer-specific modifier guidelines and is appropriate for the service rendered.

Request for Reconsideration:
We request reconsideration based on the appropriate modifier usage, or reprocessing with corrected modifiers if an error has been identified."""
    },
    
    # Incorrect Place of Service
    'CO-14': {
        'name': 'Incorrect Place of Service',
        'template': """This appeal addresses the denial for incorrect place of service. We are providing the corrected information.

Corrected Place of Service:
The correct place of service code is: {correct_pos} - {pos_description}

Service Location:
The service was provided at: {service_location}

Documentation Support:
The medical record and facility documentation confirm the actual location where services were rendered.

Coverage Verification:
Services provided at this location are covered under the patient's benefit plan and meet medical necessity criteria.

Request for Reprocessing:
We request reprocessing of this claim with the corrected place of service and approval for payment at the appropriate rate."""
    },
    
    # Incorrect Units
    'CO-4': {
        'name': 'Incorrect Units of Service',
        'template': """This appeal addresses the denial for incorrect units of service. We are providing clarification or correction.

Units Billed:
The units billed accurately reflect the service provided: {units} units

Documentation Support:
The medical record clearly documents the quantity/duration of service provided, supporting the units billed.

Unit Calculation:
The units were calculated according to CPT guidelines and payer-specific unit calculation policies: {unit_calculation_explanation}

Medical Necessity:
Each unit billed was medically necessary and separately documented in the medical record.

Request for Reconsideration:
We request reconsideration and payment for the documented units of service provided."""
    },
    
    # Default/Generic Template
    'GENERIC': {
        'name': 'General Appeal',
        'template': """This appeal is submitted to request reconsideration of the claim denial.

Basis for Appeal:
The service(s) provided were medically necessary, appropriately documented, and meet coverage criteria under the patient's benefit plan.

Medical Necessity:
The medical record contains comprehensive documentation supporting the medical necessity of the service(s), including clinical findings, diagnostic results, and treatment rationale.

Coverage Review:
We have reviewed the patient's benefit plan and believe this service should be covered. The service is not excluded and meets all policy requirements.

Documentation:
We have attached all relevant medical documentation and supporting information for your review.

Regulatory Compliance:
This appeal is submitted pursuant to applicable plan terms, state insurance regulations, and federal law including ERISA provisions.

Request for Reconsideration:
We respectfully request a thorough review of the complete medical record and reconsideration of this denial. We request that payment be issued in accordance with the plan's fee schedule or contracted rate.

If additional information is needed, please contact our office directly and we will provide it promptly."""
    }
}

def get_denial_template(denial_code):
    """
    Get the appropriate template for a denial code.
    Returns the template text or a generic template if code not found.
    """
    # Normalize the denial code
    code = denial_code.upper().strip() if denial_code else 'GENERIC'
    
    # Try exact match first
    if code in DENIAL_TEMPLATES:
        return DENIAL_TEMPLATES[code]
    
    # Try without prefix (e.g., "50" matches "CO-50")
    for template_code in DENIAL_TEMPLATES:
        if template_code.endswith(f"-{code}") or template_code == code:
            return DENIAL_TEMPLATES[template_code]
    
    # Return generic template
    return DENIAL_TEMPLATES['GENERIC']

def get_all_denial_codes():
    """Return list of all supported denial codes"""
    return [code for code in DENIAL_TEMPLATES.keys() if code != 'GENERIC']
