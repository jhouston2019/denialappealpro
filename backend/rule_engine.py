"""Deterministic rule engine - no AI reasoning allowed."""
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import json
from models import db, PayerRule, DenialCode, Appeal


class RuleEngineException(Exception):
    """Exception raised when rules prevent appeal execution."""
    pass


class RuleEngine:
    """Non-AI authority layer for deterministic rule enforcement."""
    
    @staticmethod
    def validate_and_execute(intake_data: Dict) -> Tuple[bool, Optional[str], Dict]:
        """
        Validate intake data against deterministic rules.
        
        Returns:
            Tuple of (is_valid, error_message, rules_applied)
        """
        rules_applied = {}
        
        # Step 1: Timely filing calculation
        try:
            deadline_valid, deadline, deadline_msg = RuleEngine._check_timely_filing(
                intake_data['payer_name'],
                intake_data['plan_type'],
                intake_data['denial_date']
            )
            rules_applied['timely_filing'] = {
                'deadline': deadline.isoformat() if deadline else None,
                'compliant': deadline_valid,
                'message': deadline_msg
            }
            
            if not deadline_valid:
                return False, deadline_msg, rules_applied
                
        except Exception as e:
            return False, f"Timely filing check failed: {str(e)}", rules_applied
        
        # Step 2: Appeal level eligibility
        try:
            level_valid, level_msg = RuleEngine._check_appeal_level(
                intake_data['payer_name'],
                intake_data['plan_type'],
                intake_data.get('appeal_level', '1'),
                intake_data['claim_number']
            )
            rules_applied['appeal_level'] = {
                'valid': level_valid,
                'message': level_msg
            }
            
            if not level_valid:
                return False, level_msg, rules_applied
                
        except Exception as e:
            return False, f"Appeal level check failed: {str(e)}", rules_applied
        
        # Step 3: Duplicate detection
        try:
            duplicate_valid, duplicate_msg = RuleEngine._check_duplicate(
                intake_data['claim_number'],
                intake_data['payer_name']
            )
            rules_applied['duplicate_check'] = {
                'valid': duplicate_valid,
                'message': duplicate_msg
            }
            
            if not duplicate_valid:
                return False, duplicate_msg, rules_applied
                
        except Exception as e:
            return False, f"Duplicate check failed: {str(e)}", rules_applied
        
        # Step 4: Resubmission vs appeal branching
        try:
            requires_resubmission = RuleEngine._check_resubmission_requirement(
                intake_data['payer_name'],
                intake_data['plan_type']
            )
            rules_applied['submission_type'] = {
                'requires_resubmission': requires_resubmission,
                'message': 'Resubmission required' if requires_resubmission else 'Appeal process'
            }
            
        except Exception as e:
            return False, f"Submission type check failed: {str(e)}", rules_applied
        
        # Step 5: Validate submission channel
        try:
            channel_valid, channel_msg = RuleEngine._validate_submission_channel(
                intake_data['payer_name'],
                intake_data['plan_type'],
                intake_data['submission_channel']
            )
            rules_applied['submission_channel'] = {
                'valid': channel_valid,
                'message': channel_msg
            }
            
            if not channel_valid:
                return False, channel_msg, rules_applied
                
        except Exception as e:
            return False, f"Submission channel validation failed: {str(e)}", rules_applied
        
        return True, None, rules_applied
    
    @staticmethod
    def _check_timely_filing(payer_name: str, plan_type: str, denial_date: str) -> Tuple[bool, Optional[datetime], str]:
        """Calculate appeal deadline and check compliance."""
        payer_rule = PayerRule.query.filter_by(
            payer_name=payer_name,
            plan_type=plan_type
        ).first()
        
        if not payer_rule:
            # Default to 180 days if no specific rule
            deadline_days = 180
        else:
            deadline_days = payer_rule.appeal_deadline_days
        
        # Parse denial date
        if isinstance(denial_date, str):
            denial_date_obj = datetime.strptime(denial_date, '%Y-%m-%d').date()
        else:
            denial_date_obj = denial_date
        
        # Calculate deadline
        deadline = denial_date_obj + timedelta(days=deadline_days)
        today = datetime.now().date()
        
        if today > deadline:
            return False, deadline, f"HARD STOP: Appeal deadline ({deadline.isoformat()}) has passed"
        
        return True, deadline, f"Deadline: {deadline.isoformat()} ({deadline_days} days from denial)"
    
    @staticmethod
    def _check_appeal_level(payer_name: str, plan_type: str, appeal_level: str, claim_number: str) -> Tuple[bool, str]:
        """Check if appeal level is within allowed limits."""
        payer_rule = PayerRule.query.filter_by(
            payer_name=payer_name,
            plan_type=plan_type
        ).first()
        
        max_levels = payer_rule.max_appeal_levels if payer_rule else 2
        
        try:
            current_level = int(appeal_level) if appeal_level else 1
        except ValueError:
            current_level = 1
        
        if current_level > max_levels:
            return False, f"HARD STOP: Appeal levels exhausted (max: {max_levels})"
        
        # Check historical appeals for this claim
        prior_appeals = Appeal.query.filter_by(
            claim_number=claim_number,
            payer_name=payer_name
        ).count()
        
        if prior_appeals >= max_levels:
            return False, f"HARD STOP: Maximum appeal attempts ({max_levels}) reached for this claim"
        
        return True, f"Appeal level {current_level} of {max_levels} allowed"
    
    @staticmethod
    def _check_duplicate(claim_number: str, payer_name: str) -> Tuple[bool, str]:
        """Prevent duplicate appeal submissions."""
        existing = Appeal.query.filter_by(
            claim_number=claim_number,
            payer_name=payer_name,
            submission_status='submitted'
        ).first()
        
        if existing:
            # Check if submitted within last 30 days
            if existing.submission_timestamp:
                days_since = (datetime.utcnow() - existing.submission_timestamp).days
                if days_since < 30:
                    return False, f"HARD STOP: Duplicate appeal detected (submitted {days_since} days ago)"
        
        return True, "No duplicate detected"
    
    @staticmethod
    def _check_resubmission_requirement(payer_name: str, plan_type: str) -> bool:
        """Determine if payer requires resubmission instead of appeal."""
        payer_rule = PayerRule.query.filter_by(
            payer_name=payer_name,
            plan_type=plan_type
        ).first()
        
        if payer_rule:
            return payer_rule.requires_resubmission
        
        return False
    
    @staticmethod
    def _validate_submission_channel(payer_name: str, plan_type: str, channel: str) -> Tuple[bool, str]:
        """Validate that submission channel is supported by payer."""
        payer_rule = PayerRule.query.filter_by(
            payer_name=payer_name,
            plan_type=plan_type
        ).first()
        
        if not payer_rule:
            # If no rule, allow fax and mail by default
            if channel in ['fax', 'mail']:
                return True, f"Channel '{channel}' allowed (default)"
            return False, f"Channel '{channel}' not supported (use fax or mail)"
        
        channel_map = {
            'portal': payer_rule.supports_portal,
            'fax': payer_rule.supports_fax,
            'mail': payer_rule.supports_mail
        }
        
        if channel not in channel_map:
            return False, f"Invalid channel: {channel}"
        
        if not channel_map[channel]:
            supported = [k for k, v in channel_map.items() if v]
            return False, f"Channel '{channel}' not supported. Use: {', '.join(supported)}"
        
        return True, f"Channel '{channel}' supported"
    
    @staticmethod
    def classify_denial(denial_codes: List[str]) -> str:
        """
        Classify denial based on reason codes.
        This is classification only, not judgment.
        """
        categories = []
        
        for code in denial_codes:
            denial_code = DenialCode.query.filter_by(code=code).first()
            if denial_code:
                categories.append(denial_code.category)
        
        if not categories:
            return 'unclassified'
        
        # Return primary category (first found)
        return categories[0]
    
    @staticmethod
    def get_required_documents(payer_name: str, plan_type: str) -> List[str]:
        """Get list of required documents for payer."""
        payer_rule = PayerRule.query.filter_by(
            payer_name=payer_name,
            plan_type=plan_type
        ).first()
        
        if payer_rule and payer_rule.required_documents:
            try:
                return json.loads(payer_rule.required_documents)
            except json.JSONDecodeError:
                return []
        
        # Default required documents
        return [
            'Original denial letter',
            'Claim form',
            'Medical records (if applicable)',
            'Itemized bill'
        ]
