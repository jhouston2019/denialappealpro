"""
Test real AI appeal generation with actual GPT-4 call
This validates that the AI system produces professional-grade appeals
"""
import os
import sys
from datetime import date, datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from advanced_ai_generator import advanced_ai_generator

# Create a mock appeal object
class MockAppeal:
    def __init__(self):
        self.appeal_id = 'TEST-AI-001'
        self.denial_code = 'CO-50'
        self.denial_reason = 'Service not medically necessary per plan guidelines'
        self.payer_name = 'UnitedHealthcare'
        self.payer = 'UnitedHealthcare'
        self.cpt_codes = '72148'  # MRI Lumbar Spine
        self.billed_amount = 1200.00
        self.appeal_level = 'level_1'
        self.date_of_service = date(2026, 1, 15)
        self.created_at = datetime(2026, 2, 1)
        self.claim_number = 'CLM-2026-001234'
        self.patient_id = 'PT-789456'
        self.provider_name = 'Dr. Sarah Johnson, MD'
        self.provider_npi = '1234567890'

print("=" * 70)
print("REAL AI APPEAL GENERATION TEST")
print("=" * 70)
print()

# Check AI status
print(f"AI System Status: {'ENABLED' if advanced_ai_generator.enabled else 'DISABLED'}")
print(f"OpenAI API Key: {advanced_ai_generator.api_key[:20]}..." if advanced_ai_generator.api_key else "None")
print()

if not advanced_ai_generator.enabled:
    print("[ERROR] AI system is not enabled!")
    print("Check that OPENAI_API_KEY is set in .env")
    sys.exit(1)

print("Generating appeal for:")
print(f"  - Denial Code: CO-50 (Medical Necessity)")
print(f"  - Payer: UnitedHealthcare")
print(f"  - CPT: 72148 (MRI Lumbar Spine)")
print(f"  - Amount: $1,200.00")
print(f"  - Appeal Level: Level 1")
print()
print("This should trigger:")
print("  - Payer-specific UnitedHealthcare tactics")
print("  - CPT-specific imaging guidance")
print("  - ACR Appropriateness Criteria citations")
print("  - ERISA/CFR regulatory citations")
print()
print("Generating... (this will take 10-20 seconds)")
print()

# Generate appeal
appeal = MockAppeal()
try:
    content = advanced_ai_generator.generate_appeal_content(appeal)
    
    print("=" * 70)
    print("GENERATED APPEAL CONTENT")
    print("=" * 70)
    print()
    print(content)
    print()
    print("=" * 70)
    print("QUALITY ANALYSIS")
    print("=" * 70)
    
    # Validate quality
    quality = advanced_ai_generator._validate_appeal_quality(content)
    print(f"Quality Score: {quality['score']}/100")
    print(f"Status: {'PASS' if quality['passed'] else 'FAIL'}")
    
    if quality['issues']:
        print(f"Issues Found: {len(quality['issues'])}")
        for issue in quality['issues']:
            print(f"  - {issue}")
    else:
        print("No issues found - EXCELLENT quality!")
    
    print()
    
    # Check for key indicators
    print("=" * 70)
    print("PROFESSIONAL INDICATORS CHECK")
    print("=" * 70)
    
    indicators = {
        'CFR Citations': 'CFR' in content,
        'ERISA Citations': 'ERISA' in content,
        'Clinical Guidelines': any(x in content for x in ['ACC/AHA', 'ACR', 'NCCN', 'AAOS', 'Guidelines']),
        'Payer Intelligence': 'UnitedHealthcare' in content or 'Optum' in content,
        'Professional Opening': content.startswith('This appeal contests') or content.startswith('We respectfully appeal'),
        'Specific Payment Request': '$' in content,
        'Word Count 300+': len(content.split()) >= 300,
        'No Generic Phrases': not any(phrase in content.lower() for phrase in ['i am writing to', 'thank you for', 'please consider'])
    }
    
    for indicator, present in indicators.items():
        status = '[OK]' if present else '[MISSING]'
        print(f"{status} {indicator}")
    
    print()
    word_count = len(content.split())
    print(f"Word Count: {word_count}")
    
    # Count citations
    cfr_count = content.count('CFR')
    erisa_count = content.count('ERISA')
    section_count = content.count('Section')
    
    print(f"CFR Citations: {cfr_count}")
    print(f"ERISA Citations: {erisa_count}")
    print(f"Section References: {section_count}")
    
    print()
    print("=" * 70)
    if quality['passed'] and all(indicators.values()):
        print("RESULT: PROFESSIONAL-GRADE APPEAL GENERATED")
        print("This appeal is significantly superior to generic AI output.")
    else:
        print("RESULT: NEEDS IMPROVEMENT")
        print("Appeal does not meet all professional standards.")
    print("=" * 70)

except Exception as e:
    print(f"[ERROR] Failed to generate appeal: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
