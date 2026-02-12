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
    
    # NPI pattern
    NPI_PATTERN = re.compile(r'\b(\d{10})\b')
    
    def __init__(self):
        pass
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF file"""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            return ""
    
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
            "denied_amount": None
        }
        
        all_amounts = []
        for match in self.AMOUNT_PATTERN.finditer(text):
            amount_str = match.group(1).replace(',', '')
            try:
                amount = float(amount_str)
                all_amounts.append(amount)
            except ValueError:
                continue
        
        # Make educated guesses based on context
        if all_amounts:
            # Largest amount is likely billed amount
            amounts["billed_amount"] = max(all_amounts)
            
            if len(all_amounts) > 1:
                amounts["denied_amount"] = sorted(all_amounts)[-1]
        
        return amounts
    
    def extract_npi(self, text: str) -> Optional[str]:
        """Extract NPI number from text"""
        # Look for 10-digit numbers (NPI format)
        matches = self.NPI_PATTERN.findall(text)
        for match in matches:
            # Validate it's likely an NPI (not a phone number, etc.)
            if not match.startswith('1'):  # Phone numbers often start with 1
                return match
        return None
    
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
        
        # Extract all information
        denial_codes = self.extract_denial_codes(text)
        dates = self.extract_dates(text)
        claim_number = self.extract_claim_number(text)
        payer_name = self.extract_payer_name(text)
        amounts = self.extract_amounts(text)
        npi = self.extract_npi(text)
        
        return {
            "success": True,
            "denial_codes": denial_codes,
            "primary_denial_code": denial_codes[0] if denial_codes else None,
            "claim_number": claim_number,
            "payer_name": payer_name,
            "denial_date": dates.get("denial_date"),
            "service_date": dates.get("service_date"),
            "billed_amount": amounts.get("billed_amount"),
            "denied_amount": amounts.get("denied_amount"),
            "provider_npi": npi,
            "raw_text": text[:500],  # First 500 chars for reference
            "confidence": self._calculate_confidence(
                denial_codes, claim_number, payer_name, dates
            )
        }
    
    def _calculate_confidence(self, denial_codes, claim_number, payer_name, dates) -> str:
        """Calculate confidence level of extraction"""
        score = 0
        if denial_codes:
            score += 25
        if claim_number:
            score += 25
        if payer_name:
            score += 25
        if dates.get("denial_date") or dates.get("service_date"):
            score += 25
        
        if score >= 75:
            return "high"
        elif score >= 50:
            return "medium"
        else:
            return "low"

# Convenience function
def parse_denial_pdf(pdf_path: str) -> Dict:
    """Parse a denial letter PDF"""
    parser = DenialLetterParser()
    return parser.parse_denial_letter(pdf_path)
