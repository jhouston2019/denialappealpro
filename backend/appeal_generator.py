from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY
from datetime import datetime
import os
import io
from denial_templates import get_denial_template
from supabase_storage import storage
from config import Config
from ai_generator import ai_generator

class AppealGenerator:
    def __init__(self, output_dir):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_appeal(self, appeal):
        """Generate appeal letter with strict assembly order"""
        filename = f"appeal_{appeal.appeal_id}.pdf"
        
        # Generate PDF to memory buffer if using Supabase, otherwise to file
        if Config.USE_SUPABASE_STORAGE:
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter,
                                   topMargin=0.75*inch, bottomMargin=0.75*inch,
                                   leftMargin=1*inch, rightMargin=1*inch)
        else:
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
        
        # 4. Generate AI-powered appeal content
        story.append(Paragraph("<b>Basis for Appeal:</b>", styles['Normal']))
        story.append(Spacer(1, 0.15*inch))
        
        # Use AI to generate custom appeal content
        appeal_content = ai_generator.generate_appeal_content(appeal)
        
        # Split into paragraphs and add to story
        paragraphs = appeal_content.split('\n\n')
        for para_text in paragraphs:
            if para_text.strip():
                story.append(Paragraph(para_text.strip(), justified_style))
                story.append(Spacer(1, 0.15*inch))
        
        story.append(Spacer(1, 0.2*inch))
        
        # 6. Closing + provider signature block
        story.append(Paragraph("Respectfully submitted,", styles['Normal']))
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(f"<b>{appeal.provider_name}</b>", styles['Normal']))
        story.append(Paragraph(f"NPI: {appeal.provider_npi}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(f"Appeal ID: {appeal.appeal_id}", styles['Normal']))
        
        # Build the PDF
        doc.build(story)
        
        # Upload to Supabase Storage or return local filepath
        if Config.USE_SUPABASE_STORAGE:
            buffer.seek(0)
            remote_path = f"appeals/{filename}"
            result = storage.upload_file(remote_path, buffer.read(), 'application/pdf')
            if result:
                return remote_path  # Return Supabase path
            else:
                # Fallback to local storage if Supabase upload fails
                print("Supabase upload failed, falling back to local storage")
                filepath = os.path.join(self.output_dir, filename)
                with open(filepath, 'wb') as f:
                    buffer.seek(0)
                    f.write(buffer.read())
                return filepath
        else:
            return filepath
