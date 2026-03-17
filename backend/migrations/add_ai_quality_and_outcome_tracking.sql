-- Migration: Add AI Quality Metrics and Outcome Tracking
-- Created: 2026-03-17
-- Purpose: Track AI generation quality and appeal outcomes for continuous improvement

-- Add AI Quality Metrics columns
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS ai_quality_score INTEGER;
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS ai_citation_count INTEGER;
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS ai_word_count INTEGER;
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS ai_model_used VARCHAR(50);
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS ai_generation_method VARCHAR(50);

-- Add Outcome Tracking columns
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS outcome_status VARCHAR(50);
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS outcome_date DATE;
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS outcome_amount_recovered NUMERIC(10, 2);
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS outcome_updated_at TIMESTAMP;

-- Create index for outcome reporting
CREATE INDEX IF NOT EXISTS idx_appeals_outcome_status ON appeals(outcome_status);
CREATE INDEX IF NOT EXISTS idx_appeals_outcome_date ON appeals(outcome_date);

-- Add comments for documentation
COMMENT ON COLUMN appeals.ai_quality_score IS 'Automated quality score (0-100) from validation system';
COMMENT ON COLUMN appeals.ai_citation_count IS 'Number of regulatory/clinical citations in generated appeal';
COMMENT ON COLUMN appeals.ai_word_count IS 'Word count of generated appeal content';
COMMENT ON COLUMN appeals.ai_model_used IS 'OpenAI model used (e.g., gpt-4-turbo-preview)';
COMMENT ON COLUMN appeals.ai_generation_method IS 'Generation method: chain_of_thought or direct';
COMMENT ON COLUMN appeals.outcome_status IS 'Final outcome: approved, partially_approved, denied, pending_review, withdrawn';
COMMENT ON COLUMN appeals.outcome_date IS 'Date of final outcome determination';
COMMENT ON COLUMN appeals.outcome_amount_recovered IS 'Dollar amount recovered if approved/partially approved';
COMMENT ON COLUMN appeals.outcome_notes IS 'Additional outcome details or reviewer feedback';
COMMENT ON COLUMN appeals.outcome_updated_at IS 'Timestamp of last outcome update';
