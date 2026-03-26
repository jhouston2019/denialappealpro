import os
import io
from denial_templates import get_denial_template
from supabase_storage import storage
from config import Config
from advanced_ai_generator import advanced_ai_generator
from appeal_pdf_builder import build_professional_pdf_bytes, build_appeal_pdf_filename


class AppealGenerator:
    def __init__(self, output_dir):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_appeal(self, appeal):
        """Generate carrier-ready PDF (professional layout) and upload or save locally."""
        filename = build_appeal_pdf_filename(appeal)

        draft = getattr(appeal, 'generated_letter_text', None)
        if not draft or not str(draft).strip():
            appeal_content = advanced_ai_generator.generate_appeal_content(appeal)
            appeal.generated_letter_text = appeal_content

        pdf_bytes = build_professional_pdf_bytes(appeal)

        if Config.USE_SUPABASE_STORAGE:
            buffer = io.BytesIO(pdf_bytes)
            buffer.seek(0)
            remote_path = f"appeals/{filename}"
            result = storage.upload_file(remote_path, buffer.read(), 'application/pdf')
            if result:
                return remote_path
            print("Supabase upload failed, falling back to local storage")
            filepath = os.path.join(self.output_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(pdf_bytes)
            return filepath

        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(pdf_bytes)
        return filepath
