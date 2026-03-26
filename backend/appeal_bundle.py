"""
Merge appeal PDF + fax cover; build ZIP bundles. Used for provider export workflow.
"""
import io
import zipfile

from PyPDF2 import PdfReader, PdfWriter

from appeal_pdf_builder import build_professional_pdf_bytes, build_appeal_pdf_filename
from fax_cover_sheet import build_fax_cover_filename, generate_fax_cover_pdf_bytes


def merge_fax_then_appeal(fax_pdf_bytes: bytes, appeal_pdf_bytes: bytes) -> bytes:
    """Single downloadable PDF: fax cover first, then appeal letter."""
    writer = PdfWriter()
    for part in (fax_pdf_bytes, appeal_pdf_bytes):
        reader = PdfReader(io.BytesIO(part))
        for page in reader.pages:
            writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    return out.read()


def build_export_zip_bytes(appeal, appeal_pdf_bytes: bytes, fax_pdf_bytes: bytes) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(build_appeal_pdf_filename(appeal), appeal_pdf_bytes)
        zf.writestr(build_fax_cover_filename(appeal), fax_pdf_bytes)
    buf.seek(0)
    return buf.read()


def get_appeal_pdf_bytes_from_model(appeal) -> bytes:
    """Regenerate appeal PDF from current draft text (consistent with rebuild-pdf)."""
    return build_professional_pdf_bytes(appeal)
