from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch
from datetime import datetime
import os

class AppealGenerator:
    def __init__(self, output_dir):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_appeal(self, appeal):
        """Generate appeal letter with strict assembly order"""
        filename = f"appeal_{appeal.appeal_id}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
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
        
        # 4. Medical necessity / policy reference placeholder
        story.append(Paragraph("<b>Basis for Appeal:</b>", styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(
            "This appeal is submitted pursuant to the applicable plan terms and federal/state regulations. "
            "Supporting documentation is provided for review.",
            styles['Normal']
        ))
        story.append(Spacer(1, 0.3*inch))
        
        # 5. Formal appeal request statement
        story.append(Paragraph("<b>Request:</b>", styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(
            "We respectfully request reconsideration of the denial and request that payment be issued "
            "in accordance with the plan's fee schedule.",
            styles['Normal']
        ))
        story.append(Spacer(1, 0.3*inch))
        
        # 6. Closing + provider signature block
        story.append(Paragraph("Respectfully submitted,", styles['Normal']))
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(f"<b>{appeal.provider_name}</b>", styles['Normal']))
        story.append(Paragraph(f"NPI: {appeal.provider_npi}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(f"Appeal ID: {appeal.appeal_id}", styles['Normal']))
        
        doc.build(story)
        return filepath
