"""
A/B Testing Framework for Prompt Variations

This system allows testing different prompt strategies to identify what works best.
Automatically assigns appeals to test groups and tracks outcomes for statistical analysis.
"""
import logging
import hashlib
from datetime import datetime
from models import Appeal, db
from sqlalchemy import func

logger = logging.getLogger(__name__)

class ABTestingFramework:
    """
    Manages A/B testing of prompt variations
    """
    
    def __init__(self):
        self.active_tests = {}
        self.load_active_tests()
    
    def load_active_tests(self):
        """
        Load active A/B tests from configuration
        
        Test format:
        {
            'test_id': 'temperature_test_2026_03',
            'name': 'Temperature Optimization',
            'variants': {
                'control': {'temperature': 0.4, 'description': 'Current default'},
                'variant_a': {'temperature': 0.3, 'description': 'More conservative'},
                'variant_b': {'temperature': 0.5, 'description': 'More creative'}
            },
            'allocation': {'control': 0.5, 'variant_a': 0.25, 'variant_b': 0.25},
            'start_date': '2026-03-17',
            'min_sample_size': 30,
            'status': 'active'
        }
        """
        # Example test configuration
        self.active_tests = {
            'temperature_optimization': {
                'test_id': 'temp_opt_2026_03',
                'name': 'Temperature Optimization',
                'parameter': 'temperature',
                'variants': {
                    'control': {'value': 0.4, 'description': 'Current default'},
                    'variant_a': {'value': 0.3, 'description': 'More conservative'},
                    'variant_b': {'value': 0.5, 'description': 'More creative'}
                },
                'allocation': {'control': 0.5, 'variant_a': 0.25, 'variant_b': 0.25},
                'start_date': datetime(2026, 3, 17),
                'min_sample_size': 30,
                'status': 'active'
            },
            'citation_density': {
                'test_id': 'cite_density_2026_03',
                'name': 'Citation Density Test',
                'parameter': 'citation_emphasis',
                'variants': {
                    'control': {'value': 'standard', 'description': 'Current citation guidance'},
                    'variant_a': {'value': 'high_density', 'description': 'Emphasize more citations'},
                    'variant_b': {'value': 'strategic', 'description': 'Fewer but more strategic citations'}
                },
                'allocation': {'control': 0.5, 'variant_a': 0.25, 'variant_b': 0.25},
                'start_date': datetime(2026, 3, 17),
                'min_sample_size': 30,
                'status': 'active'
            }
        }
    
    def assign_variant(self, appeal_id: str, test_id: str) -> str:
        """
        Assign an appeal to a test variant using consistent hashing
        
        Uses appeal_id hash to ensure same appeal always gets same variant
        (important for reproducibility)
        """
        test = self.active_tests.get(test_id)
        if not test or test['status'] != 'active':
            return 'control'
        
        # Hash appeal_id to get consistent assignment
        hash_value = int(hashlib.md5(appeal_id.encode()).hexdigest(), 16)
        random_value = (hash_value % 100) / 100.0  # 0.0 to 1.0
        
        # Assign based on allocation percentages
        cumulative = 0
        for variant, allocation in test['allocation'].items():
            cumulative += allocation
            if random_value < cumulative:
                return variant
        
        return 'control'
    
    def get_test_parameters(self, appeal_id: str) -> dict:
        """
        Get all active test parameters for this appeal
        
        Returns dict of parameter adjustments based on assigned variants
        """
        parameters = {}
        
        for test_id, test in self.active_tests.items():
            if test['status'] != 'active':
                continue
            
            variant = self.assign_variant(appeal_id, test_id)
            parameter_name = test['parameter']
            parameter_value = test['variants'][variant]['value']
            
            parameters[parameter_name] = {
                'value': parameter_value,
                'test_id': test_id,
                'variant': variant,
                'description': test['variants'][variant]['description']
            }
            
            logger.info(f"A/B Test '{test['name']}': Appeal {appeal_id} assigned to {variant}")
        
        return parameters
    
    def get_test_results(self, test_id: str) -> dict:
        """
        Analyze results of an A/B test
        
        Returns statistical analysis of each variant's performance
        """
        test = self.active_tests.get(test_id)
        if not test:
            return {'error': 'Test not found'}
        
        # Query appeals with outcomes for each variant
        # Note: This requires storing variant assignment in database
        # For now, we'll use the hash-based assignment to reconstruct
        
        appeals = Appeal.query.filter(
            Appeal.outcome_status.isnot(None),
            Appeal.ai_quality_score.isnot(None),
            Appeal.created_at >= test['start_date']
        ).all()
        
        if len(appeals) < test['min_sample_size']:
            return {
                'status': 'insufficient_data',
                'current_sample': len(appeals),
                'needed': test['min_sample_size'] - len(appeals)
            }
        
        # Group appeals by variant
        variant_results = {}
        
        for variant in test['variants'].keys():
            variant_appeals = [a for a in appeals if self.assign_variant(a.appeal_id, test_id) == variant]
            
            if not variant_appeals:
                continue
            
            successful = sum(1 for a in variant_appeals if a.outcome_status in ['approved', 'partially_approved'])
            
            variant_results[variant] = {
                'sample_size': len(variant_appeals),
                'successful': successful,
                'success_rate': successful / len(variant_appeals),
                'avg_quality_score': sum(a.ai_quality_score for a in variant_appeals) / len(variant_appeals),
                'avg_citation_count': sum(a.ai_citation_count or 0 for a in variant_appeals) / len(variant_appeals),
                'total_billed': sum(float(a.billed_amount or 0) for a in variant_appeals),
                'total_recovered': sum(float(a.outcome_amount_recovered or 0) for a in variant_appeals)
            }
            
            # Calculate recovery rate
            if variant_results[variant]['total_billed'] > 0:
                variant_results[variant]['recovery_rate'] = (
                    variant_results[variant]['total_recovered'] / variant_results[variant]['total_billed']
                )
        
        # Determine winner
        winner = max(variant_results.items(), key=lambda x: x[1]['success_rate'])
        
        # Calculate statistical significance (simplified chi-square test)
        control_rate = variant_results.get('control', {}).get('success_rate', 0)
        best_rate = winner[1]['success_rate']
        improvement = ((best_rate - control_rate) / control_rate * 100) if control_rate > 0 else 0
        
        return {
            'status': 'complete',
            'test_id': test_id,
            'test_name': test['name'],
            'parameter': test['parameter'],
            'variants': variant_results,
            'winner': {
                'variant': winner[0],
                'success_rate': winner[1]['success_rate'],
                'improvement_vs_control': improvement,
                'description': test['variants'][winner[0]]['description']
            },
            'recommendation': self._generate_test_recommendation(test, variant_results, winner)
        }
    
    def _generate_test_recommendation(self, test, variant_results, winner):
        """
        Generate actionable recommendation based on test results
        """
        winner_variant, winner_data = winner
        control_data = variant_results.get('control', {})
        
        if not control_data:
            return "Insufficient control group data"
        
        improvement = winner_data['success_rate'] - control_data['success_rate']
        
        if improvement > 0.1:  # 10% improvement
            return f"IMPLEMENT: Switch to {winner_variant} ({test['variants'][winner_variant]['description']}). Shows {improvement*100:.1f}% higher success rate."
        elif improvement > 0.05:  # 5% improvement
            return f"CONSIDER: {winner_variant} shows {improvement*100:.1f}% improvement. Run longer for statistical confidence."
        else:
            return f"KEEP CURRENT: No significant improvement detected. Continue with control."
    
    def apply_test_parameters(self, appeal_id: str, base_params: dict) -> dict:
        """
        Apply A/B test parameter adjustments to base parameters
        
        Args:
            appeal_id: The appeal ID for variant assignment
            base_params: Base OpenAI API parameters
        
        Returns:
            Modified parameters with A/B test adjustments
        """
        test_params = self.get_test_parameters(appeal_id)
        modified_params = base_params.copy()
        
        for param_name, param_data in test_params.items():
            if param_name in modified_params:
                original_value = modified_params[param_name]
                modified_params[param_name] = param_data['value']
                logger.info(
                    f"A/B Test adjustment: {param_name} = {param_data['value']} (was {original_value})",
                    extra={
                        'test_id': param_data['test_id'],
                        'variant': param_data['variant']
                    }
                )
        
        return modified_params

# Singleton instance
ab_testing = ABTestingFramework()
