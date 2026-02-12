"""
Timely Filing Calculator
Calculates timely filing windows based on payer and provides strategic recommendations
"""

from datetime import datetime, timedelta
from typing import Dict, Optional

# Payer-specific timely filing windows (in days from date of service)
PAYER_TIMELY_FILING_WINDOWS = {
    # Major Commercial Payers
    "AETNA": 180,
    "ANTHEM": 180,
    "BLUE CROSS": 365,
    "BLUE SHIELD": 365,
    "BCBS": 365,
    "CIGNA": 180,
    "HUMANA": 365,
    "UNITED HEALTHCARE": 365,
    "UNITEDHEALTH": 365,
    "UHC": 365,
    
    # Medicare
    "MEDICARE": 365,
    "CMS": 365,
    
    # Medicaid (varies by state, using common default)
    "MEDICAID": 365,
    
    # Other Major Payers
    "TRICARE": 365,
    "KAISER": 180,
    "MOLINA": 365,
    "CENTENE": 365,
    "WELLCARE": 365,
    
    # Default
    "DEFAULT": 365
}

# Appeal filing windows (in days from denial date)
APPEAL_TIMELY_FILING_WINDOWS = {
    "LEVEL_1": 180,  # First level appeal
    "LEVEL_2": 60,   # Second level appeal (from Level 1 decision)
    "EXTERNAL_REVIEW": 120  # External review
}

def normalize_payer_name(payer_name: str) -> str:
    """Normalize payer name for lookup"""
    if not payer_name:
        return "DEFAULT"
    
    payer_upper = payer_name.upper().strip()
    
    # Check for exact match
    if payer_upper in PAYER_TIMELY_FILING_WINDOWS:
        return payer_upper
    
    # Check for partial matches
    for known_payer in PAYER_TIMELY_FILING_WINDOWS.keys():
        if known_payer in payer_upper or payer_upper in known_payer:
            return known_payer
    
    return "DEFAULT"

def calculate_timely_filing(
    denial_date: datetime,
    service_date: datetime,
    payer: str,
    appeal_level: str = "LEVEL_1"
) -> Dict:
    """
    Calculate timely filing status and provide recommendations
    
    Args:
        denial_date: Date the denial was received
        service_date: Date of service
        payer: Payer name
        appeal_level: Appeal level (level_1, level_2, external_review)
    
    Returns:
        dict: Timely filing analysis with recommendations
    """
    today = datetime.now().date()
    
    # Convert to date objects if datetime
    if isinstance(denial_date, datetime):
        denial_date = denial_date.date()
    if isinstance(service_date, datetime):
        service_date = service_date.date()
    
    # Normalize payer name
    normalized_payer = normalize_payer_name(payer)
    filing_window_days = PAYER_TIMELY_FILING_WINDOWS.get(normalized_payer, 365)
    
    # Calculate appeal deadline based on denial date
    appeal_level_upper = appeal_level.upper().replace("_", " ").strip()
    if "LEVEL 1" in appeal_level_upper or appeal_level_upper == "LEVEL1":
        appeal_window = APPEAL_TIMELY_FILING_WINDOWS["LEVEL_1"]
    elif "LEVEL 2" in appeal_level_upper or appeal_level_upper == "LEVEL2":
        appeal_window = APPEAL_TIMELY_FILING_WINDOWS["LEVEL_2"]
    elif "EXTERNAL" in appeal_level_upper:
        appeal_window = APPEAL_TIMELY_FILING_WINDOWS["EXTERNAL_REVIEW"]
    else:
        appeal_window = APPEAL_TIMELY_FILING_WINDOWS["LEVEL_1"]
    
    appeal_deadline = denial_date + timedelta(days=appeal_window)
    days_until_deadline = (appeal_deadline - today).days
    
    # Calculate original filing deadline (from service date)
    original_filing_deadline = service_date + timedelta(days=filing_window_days)
    days_since_service = (today - service_date).days
    
    # Determine status
    within_window = days_until_deadline > 0
    urgency = "low"
    
    if days_until_deadline <= 0:
        urgency = "critical"
        status = "EXPIRED"
    elif days_until_deadline <= 7:
        urgency = "critical"
        status = "URGENT"
    elif days_until_deadline <= 30:
        urgency = "high"
        status = "APPROACHING"
    elif days_until_deadline <= 60:
        urgency = "medium"
        status = "ACTIVE"
    else:
        urgency = "low"
        status = "ACTIVE"
    
    # Generate strategy recommendation
    if not within_window:
        strategy = "reconsideration"
        recommendation = (
            "Timely filing deadline has passed. Focus appeal on:\n"
            "1. Good cause for late filing (system errors, payer delays, etc.)\n"
            "2. Request for reconsideration based on extenuating circumstances\n"
            "3. Documentation of timely submission attempts if applicable\n"
            "4. Reference to payer's own processing delays if relevant"
        )
    elif urgency == "critical":
        strategy = "expedited"
        recommendation = (
            "URGENT: File immediately. Consider:\n"
            "1. Expedited review request if available\n"
            "2. Fax submission with certified mail backup\n"
            "3. Follow-up call to confirm receipt\n"
            "4. Document all submission attempts"
        )
    else:
        strategy = "standard"
        recommendation = (
            "File within normal timeframe. Ensure:\n"
            "1. Complete documentation is attached\n"
            "2. All required sections are included\n"
            "3. Clear reference to denial date and claim number\n"
            "4. Proper submission method per payer requirements"
        )
    
    return {
        "within_window": within_window,
        "days_remaining": days_until_deadline,
        "appeal_deadline": appeal_deadline.isoformat(),
        "original_filing_deadline": original_filing_deadline.isoformat(),
        "filing_window_days": filing_window_days,
        "appeal_window_days": appeal_window,
        "status": status,
        "urgency": urgency,
        "recommended_strategy": strategy,
        "recommendation": recommendation,
        "payer": payer,
        "normalized_payer": normalized_payer,
        "days_since_service": days_since_service,
        "denial_date": denial_date.isoformat(),
        "service_date": service_date.isoformat()
    }

def get_payer_filing_window(payer: str) -> int:
    """Get the timely filing window for a specific payer"""
    normalized_payer = normalize_payer_name(payer)
    return PAYER_TIMELY_FILING_WINDOWS.get(normalized_payer, 365)

def is_within_filing_window(denial_date: datetime, payer: str, appeal_level: str = "LEVEL_1") -> bool:
    """Quick check if appeal is within filing window"""
    result = calculate_timely_filing(
        denial_date=denial_date,
        service_date=denial_date,  # Use denial date as fallback
        payer=payer,
        appeal_level=appeal_level
    )
    return result["within_window"]
