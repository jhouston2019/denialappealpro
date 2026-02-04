from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY
from datetime import datetime
import os
from denial_templates import get_denial_template

class AppealGenerator:
    def __init__(self, output_dir):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_appeal(self, appeal):
        """Generate appeal letter with strict assembly order"""
        filename = f"appeal_{appeal.appeal_id}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=letter,
                               topMargin=0.75*inch, bottomMargin=0.75*inch,
                               leftMargin=1*inch, rightMargin=1*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Add justified paragraph style for appeal body
        justified_style = ParagraphStyle(
            'Justified',
            parent=styles['Normal'],
            alignment=TA_JUSTIFY,
            spaceAfter=12
        )
        
        # STRICT ASSEMBLY ORDER
        
        # 1. Header (payer + provider)
        story.append(Paragraph(f"<b>{appeal.provider_name}</b>", styles['Normal']))
        story.append(Paragraph(f"NPI: {appeal.provider_npi}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(datetime.now().strftime('%B %d, %Y'), styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(f"<b>To: {appeal.payer_name}</b>", styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # 2. Claim reference block
        story.append(Paragraph("<b>RE: Appeal of Claim Denial</b>", styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(f"Claim Number: {appeal.claim_number}", styles['Normal']))
        story.append(Paragraph(f"Patient ID: {appeal.patient_id}", styles['Normal']))
        story.append(Paragraph(f"Date of Service: {appeal.date_of_service.strftime('%m/%d/%Y')}", styles['Normal']))
        if appeal.cpt_codes:
            story.append(Paragraph(f"CPT Codes: {appeal.cpt_codes}", styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # 3. Denial reason restatement
        story.append(Paragraph("<b>Denial Reason:</b>", styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(appeal.denial_reason, styles['Normal']))
        if appeal.denial_code:
            story.append(Paragraph(f"Code: {appeal.denial_code}", styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # 4. Get denial-specific template and generate appeal argument
        denial_template = get_denial_template(appeal.denial_code)
        
        story.append(Paragraph("<b>Basis for Appeal:</b>", styles['Normal']))
        story.append(Spacer(1, 0.15*inch))
        
        # Format the template text with available data
        template_text = denial_template['template']
        
        # Replace placeholders with actual data where available
        replacements = {
            '{date_of_service}': appeal.date_of_service.strftime('%m/%d/%Y'),
            '{provider_name}': appeal.provider_name,
            '{provider_npi}': appeal.provider_npi,
            '{claim_number}': appeal.claim_number,
            '{patient_id}': appeal.patient_id,
            '{payer_name}': appeal.payer_name,
            '{cpt_codes}': appeal.cpt_codes or 'as documented',
            '{denial_code}': appeal.denial_code or 'as stated',
            # Placeholders that need context-specific info
            '{auth_context}': 'Authorization was not obtained prior to service due to the urgent nature of care.',
            '{cob_details}': 'This plan is listed as primary coverage on file.',
            '{filing_context}': 'The claim was submitted as soon as administratively possible.',
            '{delay_reason}': 'administrative processing delays and coordination with the patient.',
            '{coverage_category}': 'medically necessary services',
            '{correct_benefit_category}': 'the appropriate benefit category',
            '{precert_context}': 'The service was provided under urgent circumstances.',
            '{missing_info_list}': 'all requested documentation and information',
            '{documentation_list}': 'medical records, clinical notes, and supporting documentation',
            '{corrected_info}': 'as listed above in the claim reference section',
            '{tax_id}': 'on file with the payer',
            '{corrected_date}': appeal.date_of_service.strftime('%m/%d/%Y'),
            '{corrected_code}': appeal.cpt_codes or 'as documented',
            '{corrected_diagnosis_codes}': 'as documented in the medical record',
            '{modifiers}': 'as billed',
            '{modifier_rationale}': 'The modifiers indicate the appropriate circumstances of service.',
            '{correct_pos}': '11',
            '{pos_description}': 'Office',
            '{service_location}': appeal.provider_name,
            '{units}': '1',
            '{unit_calculation_explanation}': 'per CPT guidelines'
        }
        
        for placeholder, value in replacements.items():
            template_text = template_text.replace(placeholder, value)
        
        # Split template into paragraphs and add to story
        paragraphs = template_text.split('\n\n')
        for para_text in paragraphs:
            if para_text.strip():
                story.append(Paragraph(para_text.strip(), justified_style))
                story.append(Spacer(1, 0.1*inch))
        
        story.append(Spacer(1, 0.2*inch))
        
        # 6. Closing + provider signature block
        story.append(Paragraph("Respectfully submitted,", styles['Normal']))
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(f"<b>{appeal.provider_name}</b>", styles['Normal']))
        story.append(Paragraph(f"NPI: {appeal.provider_npi}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(f"Appeal ID: {appeal.appeal_id}", styles['Normal']))
        
        doc.build(story)
        return filepath
