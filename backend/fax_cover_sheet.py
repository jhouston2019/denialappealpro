"""
Fax cover sheet PDF generation (carrier submission workflow).
"""
import io
import re
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

from payer_formatting import detect_payer_profile


def _esc(s) -> str:
    if s is None:
        return ""
    return escape(str(s), {'"': "&quot;", "'": "&apos;"})


def _sanitize_claim(claim_number: str) -> str:
    return re.sub(r"[^\w\-.]+", "_", str(claim_number or "claim").strip())[:120]


def build_fax_cover_filename(appeal) -> str:
    claim = getattr(appeal, "claim_number", None) or getattr(appeal, "appeal_id", "fax")
    return f"fax_{_sanitize_claim(claim)}.pdf"


def _default_fax_number(payer_name: str) -> str:
    """Placeholder until payer directory / user-supplied fax is wired."""
    profile = detect_payer_profile(payer_name)
    placeholders = {
        "unitedhealthcare": "(877) 842-3210 — verify on payer portal",
        "blue_cross_blue_shield": "See member ID card / portal for appeals fax",
        "aetna": "(866) 678-1216 — confirm on EOB or portal",
        "medicare": "See Medicare contractor / MAC directory for fax",
        "general": "___________________________",
    }
    return placeholders.get(profile, placeholders["general"])


def generate_fax_cover_pdf_bytes(appeal) -> bytes:
    """
    generateFaxCoverSheet equivalent — returns a single-page fax cover PDF.

    appeal may include optional payer_fax for the To: fax line.
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
    styles.add(
        ParagraphStyle(
            name="FaxTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            alignment=TA_CENTER,
            spaceAfter=16,
        )
    )
    styles.add(
        ParagraphStyle(
            name="FaxBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=14,
            alignment=TA_LEFT,
        )
    )

    payer = getattr(appeal, "payer", None) or getattr(appeal, "payer_name", "Insurance Carrier")
    provider = getattr(appeal, "provider_name", "Provider")
    claim = getattr(appeal, "claim_number", "")
    custom_fax = getattr(appeal, "payer_fax", None)
    fax_line = (str(custom_fax).strip() if custom_fax else "") or _default_fax_number(payer)

    story = []
    story.append(Paragraph("FAX COVER SHEET", styles["FaxTitle"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("—" * 42, styles["FaxBody"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph(f"<b>To:</b> {_esc(payer)} — Claims Department", styles["FaxBody"]))
    story.append(Paragraph(f"<b>Fax:</b> {_esc(fax_line)}", styles["FaxBody"]))
    story.append(Spacer(1, 0.12 * inch))
    story.append(Paragraph(f"<b>From:</b> {_esc(provider)}", styles["FaxBody"]))
    story.append(
        Paragraph(f"<b>Date:</b> {_esc(datetime.now().strftime('%B %d, %Y'))}", styles["FaxBody"])
    )
    story.append(Paragraph("<b>Pages:</b> [See attached — appeal PDF follows cover]", styles["FaxBody"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph(f"<b>Subject:</b> Claim Appeal – Claim #{_esc(claim)}", styles["FaxBody"]))
    story.append(Spacer(1, 0.18 * inch))

    msg = (
        "Please find attached an appeal regarding the above referenced claim. "
        "Supporting documentation is available upon request."
    )
    story.append(Paragraph(f"<b>Message:</b><br/>{_esc(msg)}", styles["FaxBody"]))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def generateFaxCoverSheet(appealData):
    """Public alias (product spec)."""
    return generate_fax_cover_pdf_bytes(appealData)
