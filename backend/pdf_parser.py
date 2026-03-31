"""
PDF Parser for Denial Letters
Extracts key information from denial letters and EOBs
"""

import re
from datetime import datetime
from typing import Dict, Optional, List
import PyPDF2

class DenialLetterParser:
    """Parse denial letters and EOBs to extract key information"""
    
    # Common CARC code patterns
    CARC_PATTERN = re.compile(r'\b(?:CARC[:\s-]*)?(\d{1,3})\b', re.IGNORECASE)
    CO_PATTERN = re.compile(r'\b(CO|PR|OA)[:\s-]*(\d{1,3})\b', re.IGNORECASE)
    
    # Date patterns
    DATE_PATTERNS = [
        re.compile(r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b'),  # MM/DD/YYYY or MM-DD-YYYY
        re.compile(r'\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b'),     # YYYY-MM-DD
        re.compile(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b', re.IGNORECASE)
    ]
    
    # Claim number patterns
    CLAIM_PATTERNS = [
        re.compile(r'(?:claim|claim\s+number|claim\s+#|icn)[:\s]*([A-Z0-9-]{5,30})', re.IGNORECASE),
        re.compile(r'\b([A-Z]{2,4}\d{8,15})\b'),  # Common claim number format
    ]
    
    # Payer name patterns (common insurance companies)
    PAYER_PATTERNS = [
        re.compile(r'\b(Aetna|Anthem|Blue\s+Cross|Blue\s+Shield|BCBS|Cigna|Humana|United\s*Health\s*care|UHC|Medicare|Medicaid|Tricare|Kaiser)\b', re.IGNORECASE),
    ]
    
    # Amount patterns
    AMOUNT_PATTERN = re.compile(r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)')
    PAID_LINE_PATTERN = re.compile(
        r'(?:paid|payment\s+amount|amount\s+paid|payer\s+paid)[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
        re.IGNORECASE,
    )
    # RARC / remark (N-codes, M-codes)
    RARC_PATTERN = re.compile(r'\b(N\d{1,4}|M\d{1,3}|MA\d{2,4})\b', re.IGNORECASE)
    # CPT / HCPCS (5-digit or letter + 4 digits)
    CPT_PATTERN = re.compile(r'\b(\d{5}|[A-V]\d{4})\b')
    # ICD-10-CM (simplified)
    ICD10_PATTERN = re.compile(r'\b([A-TV-Z][0-9][A-Z0-9](?:\.[A-Z0-9]{1,4})?)\b')
    
    # NPI pattern
    NPI_PATTERN = re.compile(r'\b(\d{10})\b')
    
    def __init__(self):
        pass
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract text from PDF (PyPDF2). Preserves line breaks from the content stream.
        Scanned/image-only PDFs are not OCR'd here — integrate Tesseract/pdf2image if needed.
        """
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                
                # CHECK IF PDF IS ENCRYPTED
                if reader.is_encrypted:
                    try:
                        reader.decrypt('')  # Try empty password
                    except:
                        raise ValueError("PDF is password protected. Please provide an unencrypted version.")
                
                # CHECK IF PDF HAS PAGES
                if len(reader.pages) == 0:
                    raise ValueError("PDF has no pages")
                
                text = ""
                empty_pages = 0
                
                for i, page in enumerate(reader.pages):
                    try:
                        page_text = page.extract_text()
                        if not page_text or len(page_text.strip()) < 10:
                            empty_pages += 1
                        text += page_text + "\n"
                    except Exception as e:
                        print(f"⚠️  Warning: Could not extract text from page {i+1}: {e}")
                        empty_pages += 1
                
                # VALIDATE MINIMUM TEXT LENGTH
                if len(text.strip()) < 50:
                    raise ValueError(
                        "PDF contains insufficient text. This may be an image-based PDF. "
                        "Please use a text-based PDF or enter information manually."
                    )
                
                return text
                
        except ValueError as e:
            # Re-raise ValueError with user-friendly message
            raise
        except Exception as e:
            # Catch all other errors
            raise ValueError(f"Failed to read PDF: {str(e)}")
    
    def extract_denial_codes(self, text: str) -> List[str]:
        """Extract CARC/RARC denial codes from text"""
        codes = set()
        
        # Find CO/PR/OA codes
        for match in self.CO_PATTERN.finditer(text):
            prefix = match.group(1).upper()
            code = match.group(2)
            codes.add(f"{prefix}-{code}")
        
        # Find standalone CARC codes
        for match in self.CARC_PATTERN.finditer(text):
            code = match.group(1)
            if code and len(code) <= 3:
                codes.add(f"CARC-{code}")
        
        return sorted(list(codes))
    
    def extract_dates(self, text: str) -> Dict[str, Optional[str]]:
        """Extract relevant dates from text"""
        dates = {
            "denial_date": None,
            "service_date": None,
            "received_date": None
        }
        
        all_dates = []
        
        # Extract all dates from text
        for pattern in self.DATE_PATTERNS:
            for match in pattern.finditer(text):
                try:
                    if len(match.groups()) == 3:
                        if match.group(1).isalpha():  # Month name format
                            month_name = match.group(1)
                            day = int(match.group(2))
                            year = int(match.group(3))
                            date_str = f"{month_name} {day}, {year}"
                            date_obj = datetime.strptime(date_str, "%b %d, %Y")
                        else:
                            parts = match.groups()
                            if int(parts[0]) > 1900:  # YYYY-MM-DD format
                                date_obj = datetime(int(parts[0]), int(parts[1]), int(parts[2]))
                            else:  # MM/DD/YYYY format
                                year = int(parts[2])
                                if year < 100:
                                    year += 2000
                                date_obj = datetime(year, int(parts[0]), int(parts[1]))
                        
                        all_dates.append(date_obj)
                except (ValueError, IndexError):
                    continue
        
        # Sort dates and make educated guesses
        if all_dates:
            all_dates.sort()
            
            # Most recent date is likely the denial date
            if len(all_dates) > 0:
                dates["denial_date"] = all_dates[-1].strftime("%Y-%m-%d")
            
            # Oldest date might be service date
            if len(all_dates) > 1:
                dates["service_date"] = all_dates[0].strftime("%Y-%m-%d")
        
        return dates
    
    def extract_claim_number(self, text: str) -> Optional[str]:
        """Extract claim number from text"""
        for pattern in self.CLAIM_PATTERNS:
            match = pattern.search(text)
            if match:
                claim_num = match.group(1).strip()
                if len(claim_num) >= 5:
                    return claim_num
        return None
    
    def extract_payer_name(self, text: str) -> Optional[str]:
        """Extract payer name from text"""
        for pattern in self.PAYER_PATTERNS:
            match = pattern.search(text)
            if match:
                return match.group(1).strip()
        
        # If no match, try to find it in the first few lines
        lines = text.split('\n')[:10]
        for line in lines:
            line = line.strip()
            if len(line) > 3 and len(line) < 50 and any(word in line.lower() for word in ['insurance', 'health', 'care', 'plan']):
                return line
        
        return None
    
    def extract_amounts(self, text: str) -> Dict[str, Optional[float]]:
        """Extract monetary amounts from text"""
        amounts = {
            "billed_amount": None,
            "allowed_amount": None,
            "denied_amount": None,
            "paid_amount": None,
        }

        paid_m = self.PAID_LINE_PATTERN.search(text)
        if paid_m:
            try:
                amounts["paid_amount"] = float(paid_m.group(1).replace(',', ''))
            except ValueError:
                pass

        all_amounts = []
        for match in self.AMOUNT_PATTERN.finditer(text):
            amount_str = match.group(1).replace(',', '')
            try:
                amount = float(amount_str)
                all_amounts.append(amount)
            except ValueError:
                continue

        if all_amounts:
            amounts["billed_amount"] = max(all_amounts)
            if len(all_amounts) > 1:
                amounts["denied_amount"] = sorted(all_amounts)[-1]
            if amounts["paid_amount"] is None and len(all_amounts) > 1:
                amounts["paid_amount"] = sorted(all_amounts)[0]

        return amounts

    def extract_rarc_codes(self, text: str) -> List[str]:
        seen = []
        for m in self.RARC_PATTERN.finditer(text):
            code = m.group(1).upper()
            if code not in seen:
                seen.append(code)
        return seen[:20]

    def extract_cpt_codes(self, text: str) -> List[str]:
        seen = []
        for m in self.CPT_PATTERN.finditer(text):
            code = m.group(1).upper()
            if code in seen:
                continue
            if code.isdigit() and code.startswith(('19', '20')):
                continue
            seen.append(code)
        return seen[:25]

    def extract_icd_codes(self, text: str) -> List[str]:
        seen = []
        for m in self.ICD10_PATTERN.finditer(text):
            code = m.group(1).upper()
            if code not in seen:
                seen.append(code)
        return seen[:25]
    
    def extract_npi(self, text: str) -> Optional[str]:
        """Extract NPI number from text"""
        # Look for 10-digit numbers (NPI format)
        matches = self.NPI_PATTERN.findall(text)
        for match in matches:
            # Validate it's likely an NPI (not a phone number, etc.)
            if not match.startswith('1'):  # Phone numbers often start with 1
                return match
        return None
    
    def _regex_extract_dict(self, text: str) -> Dict:
        """Structured fields from regex/heuristics (layer merged with LLM when available)."""
        denial_codes = self.extract_denial_codes(text)
        dates = self.extract_dates(text)
        claim_number = self.extract_claim_number(text)
        payer_name = self.extract_payer_name(text)
        amounts = self.extract_amounts(text)
        npi = self.extract_npi(text)
        rarc_codes = self.extract_rarc_codes(text)
        cpt_codes = self.extract_cpt_codes(text)
        icd_codes = self.extract_icd_codes(text)

        def fnum(x):
            if x is None:
                return None
            try:
                return float(x)
            except (TypeError, ValueError):
                return None

        return {
            "payer_name": payer_name,
            "claim_number": claim_number,
            "patient_name": None,
            "service_date": dates.get("service_date"),
            "denial_date": dates.get("denial_date"),
            "cpt_codes": list(cpt_codes or []),
            "icd_codes": list(icd_codes or []),
            "rarc_codes": list(rarc_codes or []),
            "denial_codes": list(denial_codes or []),
            "billed_amount": fnum(amounts.get("billed_amount")),
            "paid_amount": fnum(amounts.get("paid_amount")),
            "denied_amount": fnum(amounts.get("denied_amount")),
            "provider_npi": npi,
            "modifiers": [],
            "denial_reason_text": None,
        }

    def parse_denial_from_text(self, text: str) -> Dict:
        """
        Extract structured fields from raw denial / EOB text (PDF or paste).
        Uses OpenAI JSON extraction when configured, merged with regex; never returns total failure.
        """
        from denial_llm_extraction import (
            build_api_response_dict,
            extract_with_openai,
            llm_result_to_merged_fields,
            merge_extraction_layers,
        )

        raw = text or ""
        stripped = raw.strip()
        if len(stripped) < 20:
            empty = {
                "payer_name": None,
                "claim_number": None,
                "patient_name": None,
                "service_date": None,
                "denial_date": None,
                "cpt_codes": [],
                "icd_codes": [],
                "rarc_codes": [],
                "denial_codes": [],
                "billed_amount": None,
                "paid_amount": None,
                "denied_amount": None,
                "provider_npi": None,
                "modifiers": [],
                "denial_reason_text": None,
            }
            return build_api_response_dict(empty, raw, llm_used=False, llm_error="insufficient_text")

        rx = self._regex_extract_dict(raw)
        llm_proc, llm_err = extract_with_openai(raw)
        llm_fields = None
        llm_used = False
        if llm_proc:
            llm_used = True
            llm_fields = llm_result_to_merged_fields(llm_proc)
        merged = merge_extraction_layers(llm_fields, rx)
        return build_api_response_dict(merged, raw, llm_used=llm_used, llm_error=llm_err)

    def parse_denial_letter(self, pdf_path: str) -> Dict:
        """
        Parse a denial letter PDF and extract all relevant information

        Args:
            pdf_path: Path to the PDF file

        Returns:
            dict: Extracted information
        """
        text = self.extract_text_from_pdf(pdf_path)

        if not text:
            return {
                "success": False,
                "error": "Could not extract text from PDF"
            }

        result = self.parse_denial_from_text(text)
        if not result.get("success"):
            return result
        result["raw_text"] = text[:500]
        return result
    
    def _calculate_confidence(
        self,
        denial_codes,
        claim_number,
        payer_name,
        dates,
        rarc_codes=None,
        cpt_codes=None,
        icd_codes=None,
    ) -> str:
        """Calculate confidence level of extraction"""
        score = 0
        if denial_codes:
            score += 20
        if rarc_codes:
            score += 10
        if claim_number:
            score += 20
        if payer_name:
            score += 20
        if dates.get("denial_date") or dates.get("service_date"):
            score += 15
        if cpt_codes:
            score += 8
        if icd_codes:
            score += 7

        if score >= 70:
            return "high"
        elif score >= 45:
            return "medium"
        else:
            return "low"

# Convenience functions
def parse_denial_pdf(pdf_path: str) -> Dict:
    """Parse a denial letter PDF"""
    parser = DenialLetterParser()
    return parser.parse_denial_letter(pdf_path)


def parse_denial_text(raw_text: str) -> Dict:
    """Parse pasted or plain-text denial / EOB content."""
    parser = DenialLetterParser()
    return parser.parse_denial_from_text(raw_text)
