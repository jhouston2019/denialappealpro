"""
Carrier-ready PDF layout for appeal letters (8.5x11, 1\" margins, professional typography).
"""
import io
import re
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from appeal_output_structure import extract_carc_rarc_from_intake, patient_initials


def _esc(s) -> str:
    if s is None:
        return ''
    return escape(str(s), {'"': '&quot;', "'": '&apos;'})


def _sanitize_filename_claim(claim_number: str) -> str:
    s = re.sub(r'[^\w\-.]+', '_', str(claim_number or 'claim').strip())
    return (s or 'claim')[:120]


def build_appeal_pdf_filename(appeal) -> str:
    claim = _sanitize_filename_claim(getattr(appeal, 'claim_number', None) or getattr(appeal, 'appeal_id', 'export'))
    if (getattr(appeal, 'appeal_generation_kind', None) or '').lower() == 'follow_up':
        return f"appeal_L2_{claim}.pdf"
    return f"appeal_{claim}.pdf"


def _body_paragraphs_from_text(text: str):
    """Split appeal body into flow paragraphs; preserve structure."""
    if not text or not str(text).strip():
        return ['[Appeal text not available]']
    parts = re.split(r'\n\s*\n+', str(text).strip())
    out = []
    for p in parts:
        p = p.strip()
        if p:
            out.append(p)
    return out if out else [str(text).strip()]


def _style_bold_heading_line(line: str) -> str:
    """Emphasize known section headers."""
    u = line.strip().upper()
    if u in (
        'STRATEGY LAYER',
        'HEADER SECTION',
        'DENIAL SUMMARY',
        'APPEAL ARGUMENT SECTIONS',
        'DOCUMENTATION STATEMENT',
        'REPROCESSING REQUEST',
        'SIGNATURE',
    ) or (u.startswith('STRATEGY') and 'LAYER' in u):
        return f'<b>{_esc(line.strip())}</b>'
    if line.strip().startswith('STRATEGY LAYER') or 'Appeal Strategy' in line:
        return f'<b>{_esc(line.strip())}</b>'
    return _esc(line)


def generateAppealPDF(appealData):
    """Public alias for carrier-ready PDF bytes (per product spec)."""
    return build_professional_pdf_bytes(appealData)


def build_professional_pdf_bytes(appeal, pdf_document_title=None, pdf_re_line=None) -> bytes:
    """
    generateAppealPDF equivalent — returns PDF bytes with carrier-ready formatting.
    Optional pdf_document_title (e.g. Second-Level Appeal) and pdf_re_line override RE: line.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
        topMargin=1 * inch,
        bottomMargin=1 * inch,
    )

    styles = getSampleStyleSheet()
    body_font = 'Times-Roman'
    styles.add(
        ParagraphStyle(
            name='Body11',
            parent=styles['Normal'],
            fontName=body_font,
            fontSize=11,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name='Body11Left',
            parent=styles['Normal'],
            fontName=body_font,
            fontSize=11,
            leading=14,
            alignment=TA_LEFT,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name='HdrRight',
            parent=styles['Normal'],
            fontName=body_font,
            fontSize=11,
            leading=14,
            alignment=TA_RIGHT,
        )
    )

    payer = getattr(appeal, 'payer', None) or getattr(appeal, 'payer_name', 'Insurance Carrier')
    provider = getattr(appeal, 'provider_name', 'Provider')
    npi = getattr(appeal, 'provider_npi', '') or ''
    claim = getattr(appeal, 'claim_number', '')
    if (getattr(appeal, 'appeal_generation_kind', None) or '').lower() == 'follow_up':
        pdf_document_title = pdf_document_title or 'Second-Level Appeal'
        pdf_re_line = pdf_re_line or f'RE: Second-Level Appeal – Claim #{claim}'
    dos = appeal.date_of_service.strftime('%m/%d/%Y') if getattr(appeal, 'date_of_service', None) else ''
    cpt = getattr(appeal, 'cpt_codes', None) or '—'
    icd = getattr(appeal, 'diagnosis_code', None) or '—'
    carc, rarc = extract_carc_rarc_from_intake(appeal)
    denial_codes_line = f'CARC: {carc} | RARC: {rarc}'
    initials = patient_initials(appeal)

    addr = getattr(appeal, 'provider_address', None) or 'Address on file'

    left_block = (
        f'<b>{_esc(provider)}</b><br/>'
        f'{_esc(addr)}<br/>'
        f'NPI: {_esc(npi) if npi else "On file"}'
    )
    date_str = datetime.now().strftime('%B %d, %Y')
    right_block = f'<b>{_esc(date_str)}</b>'

    t = Table(
        [[Paragraph(left_block, styles['Body11Left']), Paragraph(right_block, styles['HdrRight'])]],
        colWidths=[4.2 * inch, 2.3 * inch],
    )
    t.setStyle(
        TableStyle(
            [
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]
        )
    )

    story = [t, Spacer(1, 0.22 * inch)]
    story.append(Paragraph(f'<b>To:</b> {_esc(payer)}<br/><b>Claims Department</b>', styles['Body11Left']))
    story.append(Spacer(1, 0.18 * inch))
    doc_title = pdf_document_title or getattr(appeal, 'pdf_document_title', None)
    if doc_title:
        story.append(Paragraph(f'<b>{_esc(doc_title)}</b>', styles['Body11Left']))
        story.append(Spacer(1, 0.1 * inch))
    re_line = pdf_re_line or getattr(appeal, 'pdf_re_line', None) or f'RE: Claim Appeal – Claim #{claim}'
    story.append(Paragraph(f'<b>{_esc(re_line)}</b>', styles['Body11Left']))
    story.append(Spacer(1, 0.16 * inch))

    # Claim summary block (ruled)
    summary_html = (
        f'<b>Claim Summary</b><br/><br/>'
        f'Patient: {_esc(initials)}<br/>'
        f'Claim Number: {_esc(claim)}<br/>'
        f'Date of Service: {_esc(dos)}<br/>'
        f'CPT Code(s): {_esc(cpt)}<br/>'
        f'ICD-10 Code(s): {_esc(icd)}<br/>'
        f'Denial Code(s): {_esc(denial_codes_line)}'
    )
    sum_table = Table([[Paragraph(summary_html, styles['Body11Left'])]], colWidths=[6.5 * inch])
    sum_table.setStyle(
        TableStyle(
            [
                ('BOX', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(sum_table)
    story.append(Spacer(1, 0.2 * inch))

    draft = getattr(appeal, 'generated_letter_text', None)
    body_text = str(draft).strip() if draft else ''

    for block in _body_paragraphs_from_text(body_text):
        lines = block.split('\n')
        if len(lines) == 1:
            story.append(Paragraph(_style_bold_heading_line(block), styles['Body11']))
        else:
            for ln in lines:
                ln = ln.strip()
                if not ln:
                    continue
                story.append(Paragraph(_style_bold_heading_line(ln), styles['Body11']))

    tail = body_text[-900:].lower() if body_text else ''
    if 'sincerely' not in tail:
        story.append(Spacer(1, 0.25 * inch))
        story.append(Paragraph('Sincerely,', styles['Body11Left']))
        story.append(Spacer(1, 0.35 * inch))
        story.append(
            Paragraph(
                f'<b>{_esc(provider)}</b><br/>Billing / Appeals Department',
                styles['Body11Left'],
            )
        )

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
