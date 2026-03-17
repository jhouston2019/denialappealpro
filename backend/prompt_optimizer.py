"""
Prompt Optimization Engine - Uses outcome data to continuously improve AI prompts

This system analyzes which prompt variations lead to successful appeals
and automatically optimizes the generation strategy over time.
"""
import logging
from datetime import datetime, timedelta
from models import Appeal, db
from sqlalchemy import func

logger = logging.getLogger(__name__)

class PromptOptimizer:
    """
    Analyzes appeal outcomes to identify optimal prompt strategies
    """
    
    def __init__(self):
        self.min_sample_size = 20  # Minimum appeals needed for statistical significance
        
    def get_optimization_insights(self) -> dict:
        """
        Analyze outcome data to identify what works
        
        Returns insights on:
        - Which generation methods have higher success rates
        - Optimal quality score thresholds
        - Citation count correlation with success
        - Word count sweet spot
        """
        # Get appeals with both quality metrics and outcomes
        appeals = Appeal.query.filter(
            Appeal.outcome_status.isnot(None),
            Appeal.ai_quality_score.isnot(None)
        ).all()
        
        if len(appeals) < self.min_sample_size:
            return {
                'status': 'insufficient_data',
                'message': f'Need {self.min_sample_size - len(appeals)} more appeals with outcomes',
                'current_sample_size': len(appeals)
            }
        
        # Separate successful vs unsuccessful
        successful = [a for a in appeals if a.outcome_status in ['approved', 'partially_approved']]
        unsuccessful = [a for a in appeals if a.outcome_status == 'denied']
        
        if not successful or not unsuccessful:
            return {
                'status': 'insufficient_variance',
                'message': 'Need both successful and unsuccessful appeals for comparison'
            }
        
        # Calculate insights
        insights = {
            'status': 'ready',
            'sample_size': len(appeals),
            'success_rate': len(successful) / len(appeals),
            
            # Quality score analysis
            'quality_scores': {
                'successful_avg': sum(a.ai_quality_score for a in successful) / len(successful),
                'unsuccessful_avg': sum(a.ai_quality_score for a in unsuccessful) / len(unsuccessful),
                'optimal_threshold': self._calculate_optimal_threshold(successful, unsuccessful, 'ai_quality_score')
            },
            
            # Citation count analysis
            'citation_counts': {
                'successful_avg': sum(a.ai_citation_count or 0 for a in successful) / len(successful),
                'unsuccessful_avg': sum(a.ai_citation_count or 0 for a in unsuccessful) / len(unsuccessful),
                'optimal_minimum': self._calculate_optimal_threshold(successful, unsuccessful, 'ai_citation_count')
            },
            
            # Word count analysis
            'word_counts': {
                'successful_avg': sum(a.ai_word_count or 0 for a in successful) / len(successful),
                'unsuccessful_avg': sum(a.ai_word_count or 0 for a in unsuccessful) / len(unsuccessful),
                'optimal_range': self._calculate_optimal_range(successful, 'ai_word_count')
            },
            
            # Generation method comparison
            'generation_methods': self._compare_generation_methods(appeals),
            
            # Recommendations
            'recommendations': []
        }
        
        # Generate recommendations
        insights['recommendations'] = self._generate_recommendations(insights)
        
        return insights
    
    def _calculate_optimal_threshold(self, successful_appeals, unsuccessful_appeals, field_name):
        """
        Calculate the optimal threshold value that maximizes success rate
        
        For example, if appeals with quality_score >= 85 have 95% success rate,
        but appeals with quality_score >= 90 only have 92% success rate (due to smaller sample),
        then 85 is the optimal threshold.
        """
        successful_values = [getattr(a, field_name) for a in successful_appeals if getattr(a, field_name) is not None]
        unsuccessful_values = [getattr(a, field_name) for a in unsuccessful_appeals if getattr(a, field_name) is not None]
        
        if not successful_values or not unsuccessful_values:
            return None
        
        # Find threshold that best separates successful from unsuccessful
        all_values = sorted(set(successful_values + unsuccessful_values))
        
        best_threshold = None
        best_separation = 0
        
        for threshold in all_values:
            successful_above = sum(1 for v in successful_values if v >= threshold)
            unsuccessful_below = sum(1 for v in unsuccessful_values if v < threshold)
            
            separation = successful_above + unsuccessful_below
            
            if separation > best_separation:
                best_separation = separation
                best_threshold = threshold
        
        return best_threshold
    
    def _calculate_optimal_range(self, successful_appeals, field_name):
        """
        Calculate the optimal range for a metric (e.g., word count)
        Returns the 25th-75th percentile range of successful appeals
        """
        values = sorted([getattr(a, field_name) for a in successful_appeals if getattr(a, field_name) is not None])
        
        if len(values) < 4:
            return None
        
        q1_index = len(values) // 4
        q3_index = (3 * len(values)) // 4
        
        return {
            'min': values[q1_index],
            'max': values[q3_index],
            'median': values[len(values) // 2]
        }
    
    def _compare_generation_methods(self, appeals):
        """
        Compare success rates between direct and chain-of-thought generation
        """
        methods = {}
        
        for method in ['direct', 'chain_of_thought']:
            method_appeals = [a for a in appeals if a.ai_generation_method == method]
            
            if not method_appeals:
                continue
            
            successful = sum(1 for a in method_appeals if a.outcome_status in ['approved', 'partially_approved'])
            
            methods[method] = {
                'total': len(method_appeals),
                'successful': successful,
                'success_rate': successful / len(method_appeals) if method_appeals else 0,
                'avg_quality_score': sum(a.ai_quality_score for a in method_appeals) / len(method_appeals)
            }
        
        return methods
    
    def _generate_recommendations(self, insights):
        """
        Generate actionable recommendations based on insights
        """
        recommendations = []
        
        # Quality score recommendation
        quality_diff = insights['quality_scores']['successful_avg'] - insights['quality_scores']['unsuccessful_avg']
        if quality_diff > 10:
            optimal = insights['quality_scores']['optimal_threshold']
            recommendations.append({
                'priority': 'high',
                'category': 'quality_threshold',
                'recommendation': f"Aim for quality scores >= {optimal:.0f}",
                'rationale': f"Appeals with scores >= {optimal:.0f} have significantly higher success rates",
                'impact': f"+{quality_diff:.1f} points average difference"
            })
        
        # Citation count recommendation
        citation_diff = insights['citation_counts']['successful_avg'] - insights['citation_counts']['unsuccessful_avg']
        if citation_diff > 1:
            optimal = insights['citation_counts']['optimal_minimum']
            recommendations.append({
                'priority': 'high',
                'category': 'citation_count',
                'recommendation': f"Include at least {optimal:.0f} regulatory/clinical citations",
                'rationale': f"Successful appeals average {insights['citation_counts']['successful_avg']:.1f} citations",
                'impact': f"+{citation_diff:.1f} citations average difference"
            })
        
        # Word count recommendation
        if insights['word_counts']['optimal_range']:
            word_range = insights['word_counts']['optimal_range']
            recommendations.append({
                'priority': 'medium',
                'category': 'word_count',
                'recommendation': f"Target {word_range['min']:.0f}-{word_range['max']:.0f} words",
                'rationale': f"Successful appeals cluster around {word_range['median']:.0f} words",
                'impact': "Optimal length for reviewer attention"
            })
        
        # Generation method recommendation
        methods = insights['generation_methods']
        if 'chain_of_thought' in methods and 'direct' in methods:
            cot_rate = methods['chain_of_thought']['success_rate']
            direct_rate = methods['direct']['success_rate']
            
            if cot_rate > direct_rate + 0.1:  # 10% higher
                recommendations.append({
                    'priority': 'high',
                    'category': 'generation_method',
                    'recommendation': "Use chain-of-thought for more appeals",
                    'rationale': f"Chain-of-thought has {cot_rate:.1%} success vs {direct_rate:.1%} for direct",
                    'impact': f"+{(cot_rate - direct_rate) * 100:.1f}% success rate"
                })
        
        return recommendations
    
    def should_use_chain_of_thought(self, appeal) -> dict:
        """
        Enhanced decision logic for when to use chain-of-thought reasoning
        
        Uses outcome data to make smarter decisions about generation method
        """
        insights = self.get_optimization_insights()
        
        # Default logic (existing)
        default_decision = (
            appeal.billed_amount > 5000 or
            appeal.appeal_level in ['level_2', 'level_3'] or
            appeal.denial_code in ['CO-50', 'CO-96']
        )
        
        # If we don't have enough data, use default logic
        if insights.get('status') != 'ready':
            return {
                'use_chain_of_thought': default_decision,
                'reason': 'default_logic',
                'confidence': 'medium'
            }
        
        # Data-driven decision
        methods = insights.get('generation_methods', {})
        
        if 'chain_of_thought' in methods and 'direct' in methods:
            cot_rate = methods['chain_of_thought']['success_rate']
            direct_rate = methods['direct']['success_rate']
            
            # If chain-of-thought is significantly better, use it more often
            if cot_rate > direct_rate + 0.15:  # 15% higher
                return {
                    'use_chain_of_thought': True,
                    'reason': 'data_driven_high_performance',
                    'confidence': 'high',
                    'expected_success_rate': cot_rate
                }
            
            # If direct is better, use it more often
            elif direct_rate > cot_rate + 0.15:
                return {
                    'use_chain_of_thought': False,
                    'reason': 'data_driven_efficiency',
                    'confidence': 'high',
                    'expected_success_rate': direct_rate
                }
        
        # Fall back to default logic with medium confidence
        return {
            'use_chain_of_thought': default_decision,
            'reason': 'default_logic_with_data',
            'confidence': 'medium'
        }
    
    def get_prompt_adjustments(self, appeal) -> dict:
        """
        Get data-driven prompt adjustments based on outcome analysis
        
        Returns specific adjustments to make to the prompt for this appeal
        """
        insights = self.get_optimization_insights()
        
        if insights.get('status') != 'ready':
            return {'adjustments': [], 'confidence': 'low'}
        
        adjustments = []
        
        # Citation count adjustment
        optimal_citations = insights['citation_counts'].get('optimal_minimum')
        if optimal_citations:
            adjustments.append({
                'type': 'citation_emphasis',
                'instruction': f"Include at least {optimal_citations:.0f} specific regulatory or clinical citations",
                'priority': 'high'
            })
        
        # Quality threshold adjustment
        optimal_quality = insights['quality_scores'].get('optimal_threshold')
        if optimal_quality and optimal_quality > 85:
            adjustments.append({
                'type': 'quality_emphasis',
                'instruction': f"Aim for professional language and specific citations to achieve quality score >= {optimal_quality:.0f}",
                'priority': 'high'
            })
        
        # Word count adjustment
        word_range = insights['word_counts'].get('optimal_range')
        if word_range:
            adjustments.append({
                'type': 'length_guidance',
                'instruction': f"Target {word_range['min']:.0f}-{word_range['max']:.0f} words (median: {word_range['median']:.0f})",
                'priority': 'medium'
            })
        
        return {
            'adjustments': adjustments,
            'confidence': 'high' if len(adjustments) >= 2 else 'medium'
        }

# Singleton instance
prompt_optimizer = PromptOptimizer()
