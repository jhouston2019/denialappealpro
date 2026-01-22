"""Appeal document generation - neutral, procedural language only."""
from datetime import datetime
from typing import Dict, List
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER


class LanguageFilter:
    """Prevent medical or legal claims in generated content."""
    
    FORBIDDEN_PHRASES = [
        'medical necessity',
        'medically necessary',
        'patient rights',
        'legal obligation',
        'entitled to',
        'must cover',
        'should cover',
        'required to pay',
        'owe',
        'guarantee',
        'will result in',
        'expect approval',
        'deserve',
        'unfair',
        'wrongful'
    ]
    
    @staticmethod
    def validate_text(text: str) -> bool:
        """Check if text contains forbidden phrases."""
        text_lower = text.lower()
        for phrase in LanguageFilter.FORBIDDEN_PHRASES:
            if phrase in text_lower:
                return False
        return True


class AppealGenerator:
    """Generate appeal documents with fixed structure and neutral language."""
    
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_appeal_letter(self, appeal_data: Dict, appeal_id: str) -> str:
        """
        Generate appeal letter PDF.
        
        Returns:
            Path to generated PDF
        """
        filename = f"appeal_letter_{appeal_id}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            textColor=colors.black,
            spaceAfter=12,
            alignment=TA_CENTER
        )
        
        normal_style = styles['Normal']
        normal_style.alignment = TA_LEFT
        
        # Header
        story.append(Paragraph("APPEAL SUBMISSION", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Disclaimer
        disclaimer = """
        <b>EXECUTION ONLY. NO ADVISORY FUNCTION.</b><br/>
        This appeal submission is prepared for procedural compliance only.
        No medical judgment, legal interpretation, or outcome guarantee is provided.
        """
        story.append(Paragraph(disclaimer, normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Date
        today = datetime.now().strftime('%B %d, %Y')
        story.append(Paragraph(f"Date: {today}", normal_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Payer information
        payer_info = f"""
        <b>To:</b> {appeal_data['payer_name']}<br/>
        <b>Plan Type:</b> {appeal_data['plan_type']}<br/>
        <b>Claim Number:</b> {appeal_data['claim_number']}<br/>
        <b>Patient ID:</b> {appeal_data['patient_id']}<br/>
        <b>Provider NPI:</b> {appeal_data['provider_npi']}<br/>
        <b>Date of Service:</b> {appeal_data['date_of_service']}<br/>
        <b>Denial Date:</b> {appeal_data['denial_date']}
        """
        story.append(Paragraph(payer_info, normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Subject line
        subject = f"<b>RE: Appeal of Claim Denial - Claim #{appeal_data['claim_number']}</b>"
        story.append(Paragraph(subject, normal_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Body - neutral, procedural language only
        body = self._generate_appeal_body(appeal_data)
        
        # Validate language
        if not LanguageFilter.validate_text(body):
            raise ValueError("Generated text contains forbidden phrases")
        
        for paragraph in body.split('\n\n'):
            if paragraph.strip():
                story.append(Paragraph(paragraph.strip(), normal_style))
                story.append(Spacer(1, 0.15*inch))
        
        # Closing
        story.append(Spacer(1, 0.2*inch))
        closing = """
        This appeal is submitted in accordance with plan terms and applicable regulations.
        <br/><br/>
        Respectfully submitted,<br/>
        <br/>
        Provider: {provider_npi}<br/>
        Appeal ID: {appeal_id}
        """.format(provider_npi=appeal_data['provider_npi'], appeal_id=appeal_id)
        story.append(Paragraph(closing, normal_style))
        
        # Build PDF
        doc.build(story)
        
        return filepath
    
    def _generate_appeal_body(self, appeal_data: Dict) -> str:
        """Generate appeal body with neutral, procedural language."""
        
        body = f"""
This submission constitutes a formal appeal of the claim denial referenced above.

<b>Denial Information:</b>
The claim was denied on {appeal_data['denial_date']} with the following reason code(s): {appeal_data['denial_reason_codes']}.

<b>Basis for Appeal:</b>
This appeal is filed to request reconsideration of the denial determination. The enclosed documentation is provided for review in accordance with plan procedures.

<b>Procedural Request:</b>
This appeal requests that the claim be reviewed according to the plan's standard appeal process. All required documentation is attached as specified by plan requirements.

<b>Timely Filing:</b>
This appeal is submitted within the timeframe specified in the plan documents and applicable regulations.

<b>Documentation:</b>
The following documents are included with this submission:
- Original denial letter
- Claim documentation
- Supporting records as required by plan

<b>Requested Action:</b>
Review of the denial determination in accordance with plan appeal procedures.
"""
        
        return body
    
    def generate_attachment_checklist(self, appeal_data: Dict, appeal_id: str, required_docs: List[str]) -> str:
        """
        Generate attachment checklist PDF.
        
        Returns:
            Path to generated PDF
        """
        filename = f"attachment_checklist_{appeal_id}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            textColor=colors.black,
            spaceAfter=12,
            alignment=TA_CENTER
        )
        
        # Header
        story.append(Paragraph("ATTACHMENT CHECKLIST", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Appeal info
        info = f"""
        <b>Appeal ID:</b> {appeal_id}<br/>
        <b>Claim Number:</b> {appeal_data['claim_number']}<br/>
        <b>Payer:</b> {appeal_data['payer_name']}<br/>
        <b>Date Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """
        story.append(Paragraph(info, styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # Checklist table
        story.append(Paragraph("<b>Required Documents:</b>", styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
        
        table_data = [['☐', 'Document', 'Status']]
        for doc in required_docs:
            table_data.append(['☐', doc, 'Required'])
        
        table = Table(table_data, colWidths=[0.5*inch, 4*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        story.append(Spacer(1, 0.3*inch))
        
        # Instructions
        instructions = """
        <b>Instructions:</b><br/>
        1. Check each box as documents are prepared<br/>
        2. Ensure all required documents are included<br/>
        3. Verify document completeness before submission<br/>
        4. Retain copy of complete package for records
        """
        story.append(Paragraph(instructions, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        return filepath
    
    def generate_submission_cover_sheet(self, appeal_data: Dict, appeal_id: str, submission_channel: str) -> str:
        """
        Generate channel-specific submission cover sheet.
        
        Returns:
            Path to generated PDF
        """
        filename = f"cover_sheet_{appeal_id}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.black,
            spaceAfter=12,
            alignment=TA_CENTER
        )
        
        # Header
        story.append(Paragraph("APPEAL SUBMISSION COVER SHEET", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Submission info
        info = f"""
        <b>Appeal ID:</b> {appeal_id}<br/>
        <b>Submission Method:</b> {submission_channel.upper()}<br/>
        <b>Submission Date:</b> {datetime.now().strftime('%Y-%m-%d')}<br/>
        <b>Claim Number:</b> {appeal_data['claim_number']}<br/>
        <b>Payer:</b> {appeal_data['payer_name']}<br/>
        <b>Plan Type:</b> {appeal_data['plan_type']}<br/>
        <b>Patient ID:</b> {appeal_data['patient_id']}<br/>
        <b>Provider NPI:</b> {appeal_data['provider_npi']}
        """
        story.append(Paragraph(info, styles['Normal']))
        story.append(Spacer(1, 0.4*inch))
        
        # Channel-specific instructions
        if submission_channel == 'fax':
            instructions = """
            <b>FAX SUBMISSION INSTRUCTIONS:</b><br/>
            1. Include this cover sheet as page 1<br/>
            2. Verify fax number with payer<br/>
            3. Confirm successful transmission<br/>
            4. Retain fax confirmation for records
            """
        elif submission_channel == 'mail':
            instructions = """
            <b>MAIL SUBMISSION INSTRUCTIONS:</b><br/>
            1. Include this cover sheet as page 1<br/>
            2. Use certified mail with return receipt<br/>
            3. Verify mailing address with payer<br/>
            4. Retain mailing receipt and tracking number
            """
        else:  # portal
            instructions = """
            <b>PORTAL SUBMISSION INSTRUCTIONS:</b><br/>
            1. Log into payer portal<br/>
            2. Navigate to appeals section<br/>
            3. Upload all documents in order<br/>
            4. Save confirmation number
            """
        
        story.append(Paragraph(instructions, styles['Normal']))
        story.append(Spacer(1, 0.4*inch))
        
        # Package contents
        contents = """
        <b>PACKAGE CONTENTS:</b><br/>
        1. This cover sheet<br/>
        2. Appeal letter<br/>
        3. Attachment checklist<br/>
        4. Required supporting documents
        """
        story.append(Paragraph(contents, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        return filepath
